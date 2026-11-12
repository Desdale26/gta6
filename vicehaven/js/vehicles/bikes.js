/*
 * vehicles/bikes.js — motorbikes, a scooter and a quad bike:
 *
 *   kestrel    Kobo Kestrel RR: a sports bike, fast and twitchy
 *   roadhog    Dunmore Roadhog: a cruiser, long and low, slow to turn, loud
 *   gravelrat  Kobo Gravel Rat: a dirt bike, light, happy off-road and off ramps
 *   nippy      Bellamy Nippy 50: a scooter, slow and silly
 *   mudpup     Hask Mud Pup: a quad bike, four fat tyres and an open seat
 *
 * Each is a Vehicle (vehicle.js does the physics: a narrow body, its own
 * handling) with a model built here from kit shapes, and these on top:
 *
 *   lean       a two-wheeler leans into corners with speed and steering,
 *              and onto its stand when it's parked (it never falls over
 *              standing still)
 *   wheelie    handbrake (Space / A) with the throttle on lifts the front;
 *              stand hard on the brakes at speed for a stoppie
 *   rider      Jay sits astride, hands on the bars, and leans with the bike
 *              (player.js asks poseRider); an AI rider (helmet on) and a
 *              pillion passenger are one kit figure each, part of the model
 *   mounting   entry.js's 'astride' style: a leg swung over (mount() here)
 *   coming off a hard knock (a wall, a car at speed) throws the rider: Jay
 *              tumbles as a ragdoll (player.js), takes damage in proportion
 *              and gets up; the bike goes down on its side and slides to a
 *              stop. Gentle bumps don't.
 *   the world  AI riders in traffic, bikes parked at the kerb (both mixed in
 *              here, by district), engine voices (audio-drive.js takes a cfg)
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, smoothstep } = VH.math;
  const HALF = Math.PI / 2;

  // Riding positions in the bike's frame (+Z forward, +Y up, ground at 0):
  // where the rider sits, the grips (bars), the footpegs and how far forward he leans.
  // pil: the pillion seat. Jay's joint angles and the kit riders both come from these.
  const SPECS = {
    kestrel: {
      name: 'Kestrel RR', make: 'Kobo', cls: 'sports', length: 2.05, width: 0.72, height: 1.15, mass: 290, topSpeed: 64,
      accel: 1.0, grip: 0.85, seats: 2, wheelbase: 1.4, trackWidth: 0.24, wheelRadius: 0.31,
      palette: [0xd8202a, 0x1d4fb8, 0xf2f2ee, 0x16171a, 0xf2c500, 0x22a35a],
      tune: { rear: 0.95, steer: 1.18, assist: 0.5, down: 0.4, h: 0.62, brake: 1.3 },
      maxLean: 0.8, wheelie: 0.5, voice: 'sport', throwAt: 9.5, float: 0.3,
      seat: { y: 0.86, z: -0.2 }, bars: { x: 0.3, y: 0.9, z: 0.4 }, peg: { x: 0.17, y: 0.38, z: -0.24 }, lean: 0.62, pil: { y: 0.94, z: -0.52 },
    },
    roadhog: {
      name: 'Roadhog', make: 'Dunmore', cls: 'muscle', length: 2.4, width: 0.9, height: 1.2, mass: 360, topSpeed: 50,
      accel: 0.72, grip: 0.62, seats: 2, wheelbase: 1.66, trackWidth: 0.26, wheelRadius: 0.33,
      palette: [0x111214, 0x6e1018, 0x1f3a26, 0xb8862a, 0xe8e6e0],
      tune: { rear: 1.0, steer: 0.72, assist: 0.75, down: 0.2, h: 0.55, brake: 1.0 },
      maxLean: 0.55, wheelie: 0.3, voice: 'vtwin', throwAt: 10, float: 0.15,
      seat: { y: 0.68, z: -0.28 }, bars: { x: 0.4, y: 1.1, z: 0.36 }, peg: { x: 0.24, y: 0.36, z: 0.42 }, lean: -0.06, pil: { y: 0.8, z: -0.62 },
    },
    gravelrat: {
      name: 'Gravel Rat', make: 'Kobo', cls: 'compact', length: 2.12, width: 0.82, height: 1.25, mass: 230, topSpeed: 48,
      accel: 0.85, grip: 0.72, seats: 1, wheelbase: 1.45, trackWidth: 0.22, wheelRadius: 0.36,
      palette: [0xf26a1a, 0x2a55d8, 0xd4ff1e, 0xf2f2ee, 0x22a35a],
      tune: { rear: 1.0, steer: 1.08, assist: 0.6, down: 0.15, h: 0.7, brake: 1.1 },
      maxLean: 0.72, wheelie: 0.72, voice: 'twostroke', throwAt: 11, offroad: true, pop: 1.22, float: 0.42, hardLand: 24,
      seat: { y: 0.95, z: -0.15 }, bars: { x: 0.4, y: 1.08, z: 0.4 }, peg: { x: 0.18, y: 0.42, z: -0.1 }, lean: 0.3, pil: null,
    },
    nippy: {
      name: 'Nippy 50', make: 'Bellamy', cls: 'compact', length: 1.8, width: 0.7, height: 1.15, mass: 190, topSpeed: 28, top: 17,
      accel: 0.45, grip: 0.55, seats: 2, wheelbase: 1.22, trackWidth: 0.2, wheelRadius: 0.22,
      palette: [0x9fe0c4, 0xf2c61f, 0xff9cc0, 0xf2f2ee, 0x78b8e8, 0xc8202a],
      tune: { rear: 1.0, steer: 1.05, assist: 0.75, down: 0.05, h: 0.6, brake: 0.9 },
      maxLean: 0.5, wheelie: 0.35, voice: 'scooter', throwAt: 8, float: 0.3,
      seat: { y: 0.8, z: -0.28 }, bars: { x: 0.33, y: 1.02, z: 0.32 }, peg: { x: 0.12, y: 0.3, z: 0.12 }, lean: 0.05, pil: { y: 0.84, z: -0.56 },
    },
    mudpup: {
      name: 'Mud Pup', make: 'Hask', cls: 'compact', length: 1.95, width: 1.18, height: 1.15, mass: 330, topSpeed: 36,
      accel: 0.62, grip: 0.7, seats: 2, wheelbase: 1.24, trackWidth: 0.92, wheelRadius: 0.3,
      palette: [0x4b5320, 0xc8202a, 0xf2c61f, 0x1d4fb8, 0x16171a],
      tune: { rear: 0.85, steer: 0.95, assist: 0.8, down: 0.1, h: 0.62, brake: 1.0 },
      maxLean: 0, wheelie: 0.32, voice: 'quad', throwAt: 13, offroad: true, quad: true, float: 0.25, hardLand: 22,
      seat: { y: 0.86, z: -0.12 }, bars: { x: 0.38, y: 1.0, z: 0.36 }, peg: { x: 0.25, y: 0.36, z: 0.0 }, lean: 0.22, pil: { y: 0.9, z: -0.48 },
    },
  };
  const TYPES = Object.keys(SPECS);

  // Engine voices for audio-drive.js (its KINDS table's fields): higher-pitched than
  // the cars; a two-stroke buzz for the dirt bike and the scooter.
  const VOICES = {
    sport: { idle: 52, red: 430, osc: [[1, 'sawtooth', 0.5], [2, 'square', 0.28], [4, 'sawtooth', 0.12]], drive: 3.6, lp: 1.6, q: 2.0, flutter: 0.5, fdepth: 0.12, noise: 0.9, nf: 3.8, gain: 0.9 },
    vtwin: { idle: 21, red: 125, osc: [[1, 'sawtooth', 0.5], [0.5, 'square', 0.45], [2, 'sawtooth', 0.22]], drive: 4.0, lp: 0.75, q: 2.8, flutter: 0.5, fdepth: 0.5, noise: 1.5, nf: 1.6, gain: 1.1 },
    twostroke: { idle: 62, red: 390, osc: [[1, 'square', 0.5], [2, 'sawtooth', 0.3], [3, 'square', 0.15]], drive: 4.6, lp: 1.8, q: 3.2, flutter: 1, fdepth: 0.2, noise: 0.9, nf: 5, gain: 0.82 },
    scooter: { idle: 72, red: 290, osc: [[1, 'square', 0.5], [2, 'sawtooth', 0.3], [3, 'square', 0.12]], drive: 3.0, lp: 1.4, q: 3.6, flutter: 1, fdepth: 0.22, noise: 0.7, nf: 5.5, gain: 0.62 },
    quad: { idle: 40, red: 260, osc: [[1, 'square', 0.45], [2, 'sawtooth', 0.3], [0.5, 'sine', 0.3]], drive: 3.4, lp: 1.2, q: 2.4, flutter: 0.5, fdepth: 0.2, noise: 1.0, nf: 3.2, gain: 0.85 },
  };

  // How many of a district's traffic and kerbside spots are bikes, and which.
  const TRAFFIC_SHARE = { sandpiper: 0.2, halcyon: 0.22, downtown: 0.14, oldmarket: 0.16, oldpaloma: 0.14, neonstrand: 0.12, ironside: 0.06, airport: 0.03, fort: 0, bay: 0 };
  const TRAFFIC_BIKES = [['kestrel', 30], ['roadhog', 22], ['nippy', 34], ['gravelrat', 9], ['mudpup', 5]];
  const PARKED_BIKES = [['nippy', 34], ['kestrel', 26], ['roadhog', 22], ['gravelrat', 11], ['mudpup', 7]];
  const PARKED_SHARE = 0.1;
  const HELMETS = [0x16171a, 0xf2f2ee, 0xc8202a, 0x1d4fb8, 0xf2c500];
  const JACKETS = [0x2b2f35, 0x5c3a24, 0x1d2e52, 0x6e1a1a, 0x3a3d42];

  // ------------------------------------------------------------ materials
  let M = null;
  function mats() {
    if (M) return M;
    const hdr = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
    M = {
      headOn: hdr(5, 4.8, 4.2),
      headOff: new THREE.MeshStandardMaterial({ color: 0xd8dcdf, roughness: 0.2, metalness: 0.5 }),
      tailOn: hdr(5, 0.15, 0.08),
      tailRun: hdr(1.4, 0.04, 0.02),
      tailOff: new THREE.MeshStandardMaterial({ color: 0x5a0d0b, roughness: 0.3 }),
      frame: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.45 }),
      tyre: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 }),
      rider: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 }),
    };
    return M;
  }

  const BLACK = 0x18191b;
  const DARK = 0x2a2c30;
  const ALLOY = 0x9aa0a6;
  const CHROME = 0xd6dade;
  const SEAT = 0x141416;

  // ------------------------------------------------------------- geometry
  const WHEELS = new Map();
  /** A wheel on its axle along X: tyre, rim and five spokes (so it reads as turning), cached per size. */
  function wheelGeo(r, w, rim, knobbly) {
    const key = r + '|' + w + '|' + rim + '|' + (knobbly ? 1 : 0);
    if (WHEELS.has(key)) return WHEELS.get(key);
    const k = new VH.AircraftKit();
    k.tyre(r, w, 0, 0, 0, 0x161616, 18);
    if (knobbly) for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      k.box(w * 1.05, 0.035, 0.05, 0, Math.cos(a) * (r - 0.01), Math.sin(a) * (r - 0.01), 0x1c1c1c, a);
    }
    k.cyl(r * 0.6, r * 0.6, w * 0.5, 14, 0, 0, 0, rim, 0, HALF);
    k.cyl(r * 0.16, r * 0.16, w * 0.9, 10, 0, 0, 0, 0x6c7178, 0, HALF);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.box(0.03, r * 0.5, 0.035, 0, Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, rim, a);
    }
    const g = k.geometry();
    WHEELS.set(key, g);
    return g;
  }

  const GEO = {};
  /**
   * Each type's shapes, built once: frame (dark metal, chrome, the seat), paint
   * (white here: the material carries the colour), front (forks and bars: they
   * steer), stand, and where the lamps and wheels go.
   */
  function bikeGeo(type) {
    if (GEO[type]) return GEO[type];
    const s = SPECS[type];
    const f = new VH.AircraftKit();
    const p = new VH.AircraftKit();
    const fr = new VH.AircraftKit();
    const R = s.wheelRadius;
    const zF = s.wheelbase / 2;
    const zR = -zF;
    const W = 0xffffff;
    const out = { head: null, tail: null, wheels: null, stand: null };
    if (type === 'kestrel') {
      // A sports bike: a full fairing, a tall tank, a high tail, clip-on bars.
      f.box(0.28, 0.3, 0.42, 0, 0.45, 0.08, DARK); //                       engine
      f.box(0.24, 0.15, 0.22, 0, 0.64, 0.2, 0x3a3d42, -0.4); //             cylinder head
      for (const x of [0.1, -0.1]) {
        f.strut([x, R, zR], [x, 0.44, -0.12], 0.03, DARK); //               swingarm
        f.strut([x * 1.25, 0.8, 0.5], [x * 1.25, 0.52, -0.14], 0.035, ALLOY); // beam frame
      }
      f.strut([0, 0.45, -0.26], [0, 0.76, -0.2], 0.03, 0xd8a01c); //        shock
      f.strut([-0.08, 0.3, 0.28], [-0.12, 0.3, -0.28], 0.04, ALLOY); //      header
      f.cyl(0.06, 0.075, 0.48, 10, -0.15, 0.48, -0.5, ALLOY, -0.38); //     silencer
      f.box(0.5, 0.03, 0.04, 0, 0.38, -0.24, ALLOY); //                     footpegs
      f.box(0.24, 0.07, 0.4, 0, 0.87, -0.2, SEAT); //                       seat
      f.box(0.2, 0.05, 0.22, 0, 0.94, -0.52, SEAT); //                      pillion pad
      f.box(0.2, 0.16, 0.02, 0, 0.98, 0.7, 0x22303c, -0.95); //             screen
      f.box(0.16, 0.12, 0.02, 0, 0.62, -0.84, BLACK, 0.4); //               number plate
      f.strut([0, 0.7, -0.6], [0, 0.6, -0.82], 0.015, BLACK);
      p.loft([{ z: 0.46, w: 0.1, h: 0.07, y: 0.86 }, { z: 0.32, w: 0.17, h: 0.11, y: 0.88 }, { z: 0.08, w: 0.16, h: 0.09, y: 0.88 }, { z: -0.04, w: 0.1, h: 0.05, y: 0.86 }], W); // tank
      p.loft([{ z: -0.1, w: 0.12, h: 0.05, y: 0.82 }, { z: -0.42, w: 0.11, h: 0.08, y: 0.88 }, { z: -0.78, w: 0.04, h: 0.04, y: 0.95 }], W); // tail
      p.loft([{ z: 0.97, w: 0.05, h: 0.05, y: 0.86 }, { z: 0.86, w: 0.12, h: 0.1, y: 0.83, n: 2.4 }, { z: 0.62, w: 0.17, h: 0.15, y: 0.79, n: 2.4 }, { z: 0.36, w: 0.17, h: 0.22, y: 0.64, n: 2.4 }, { z: 0.15, w: 0.15, h: 0.2, y: 0.55, n: 2.4 }], W); // fairing
      p.loft([{ z: 0.32, w: 0.15, h: 0.08, y: 0.3 }, { z: -0.08, w: 0.11, h: 0.05, y: 0.3 }], W); // belly pan
      // Forks (gold), the yoke and clip-on bars, the front mudguard.
      for (const x of [0.085, -0.085]) fr.strut([x, R, 0], [x, 0.9, -0.27], 0.028, 0xc89a2a);
      fr.box(0.22, 0.04, 0.08, 0, 0.9, -0.27, ALLOY);
      fr.box(0.62, 0.03, 0.03, 0, 0.9, -0.3, BLACK);
      fr.box(0.12, 0.03, 0.4, 0, R + 0.08, 0.02, BLACK, 0.1);
      out.head = [[0, 0.85, 0.96]];
      out.headSize = [0.16, 0.06];
      out.tail = [[0, 0.93, -0.79]];
      out.wheels = [[R, 0.13, zF, true, 0x2a2c30], [R, 0.18, zR, false, 0x2a2c30]];
    } else if (type === 'roadhog') {
      // A cruiser: long and low, raked forks, a teardrop tank, chrome pipes, high bars.
      f.box(0.26, 0.22, 0.4, 0, 0.36, 0.05, 0x3a3d42); //                   crankcase
      for (const [z, a] of [[0.2, -0.55], [-0.1, 0.55]]) {
        f.cyl(0.085, 0.1, 0.34, 12, 0, 0.58, z, 0x5a5e64, a); //            the V-twin's cylinders
        for (let i = 0; i < 4; i++) f.cyl(0.125, 0.125, 0.025, 12, 0, 0.5 + i * 0.06, z - Math.sin(a) * i * 0.06, 0x9aa0a6, a); // fins
      }
      for (const x of [0.1, -0.1]) {
        f.strut([x, R, zR], [x, 0.36, -0.2], 0.035, BLACK);
        f.strut([x, 0.28, 0.42], [x, 0.28, -0.3], 0.03, BLACK); //         lower frame
      }
      f.strut([0, 0.82, 0.42], [0, 0.66, -0.4], 0.04, BLACK); //            backbone
      f.strut([0, 0.82, 0.42], [0, 0.3, 0.42], 0.035, BLACK); //            down tube
      for (const [y, z] of [[0.3, 0.0], [0.42, -0.04]]) f.strut([-0.15, y, 0.3 + z], [-0.18, y + 0.02, -1.0 + z], 0.04, CHROME); // twin pipes
      f.box(0.3, 0.09, 0.42, 0, 0.67, -0.28, SEAT); //                      saddle
      f.box(0.22, 0.07, 0.24, 0, 0.8, -0.62, SEAT); //                      pillion seat
      f.strut([0.1, 0.8, -0.72], [0.1, 1.15, -0.8], 0.018, CHROME); //      sissy bar
      f.strut([-0.1, 0.8, -0.72], [-0.1, 1.15, -0.8], 0.018, CHROME);
      f.box(0.24, 0.12, 0.05, 0, 1.12, -0.81, SEAT);
      f.box(0.6, 0.03, 0.05, 0, 0.3, 0.42, CHROME); //                      forward pegs
      p.loft([{ z: 0.44, w: 0.08, h: 0.06, y: 0.86 }, { z: 0.3, w: 0.15, h: 0.11, y: 0.86 }, { z: 0.0, w: 0.13, h: 0.08, y: 0.8 }, { z: -0.12, w: 0.06, h: 0.04, y: 0.74 }], W); // tank
      p.loft([{ z: -0.4, w: 0.15, h: 0.06, y: 0.62 }, { z: -0.7, w: 0.16, h: 0.08, y: 0.66 }, { z: -1.05, w: 0.15, h: 0.06, y: 0.5 }, { z: -1.18, w: 0.1, h: 0.04, y: 0.36 }], W); // rear mudguard
      for (const x of [0.07, -0.07]) fr.strut([x, R, 0], [x, 1.0, -0.42], 0.03, CHROME);
      fr.box(0.2, 0.05, 0.1, 0, 1.0, -0.42, CHROME);
      fr.strut([0.4, 1.12, -0.48], [0, 1.0, -0.42], 0.018, CHROME); //      apehanger bars
      fr.strut([-0.4, 1.12, -0.48], [0, 1.0, -0.42], 0.018, CHROME);
      fr.box(0.1, 0.05, 0.05, 0.4, 1.12, -0.48, BLACK);
      fr.box(0.1, 0.05, 0.05, -0.4, 1.12, -0.48, BLACK);
      fr.sphere(0.095, 1, 1, 0.8, 0, 0.88, -0.3, CHROME); //                headlamp shell
      fr.box(0.12, 0.03, 0.36, 0, R + 0.09, 0.0, CHROME, 0.1);
      out.headFront = true; // the lamp's on the forks: it steers
      out.head = [[0, 0.88, -0.21]];
      out.headSize = [0.16, 0.16];
      out.tail = [[0, 0.56, -1.12]];
      out.wheels = [[R, 0.12, zF, true, CHROME], [R, 0.2, zR, false, CHROME]];
    } else if (type === 'gravelrat') {
      // A dirt bike: tall, thin, long flat seat, a high front mudguard, a number board.
      f.box(0.2, 0.26, 0.3, 0, 0.5, 0.05, 0x3a3d42);
      for (const x of [0.08, -0.08]) {
        f.strut([x, R, zR], [x, 0.5, -0.1], 0.025, ALLOY);
        f.strut([x, 0.92, 0.45], [x, 0.42, 0.1], 0.025, BLACK);
      }
      f.strut([0, 0.5, -0.2], [0, 0.88, -0.25], 0.03, 0xd8a01c);
      f.strut([-0.12, 0.62, 0.0], [-0.14, 0.86, -0.6], 0.045, DARK); //     high pipe
      f.box(0.44, 0.03, 0.05, 0, 0.42, -0.1, ALLOY);
      f.box(0.2, 0.07, 0.72, 0, 0.95, -0.2, SEAT); //                       long seat
      p.loft([{ z: 0.4, w: 0.1, h: 0.08, y: 0.9 }, { z: 0.2, w: 0.15, h: 0.1, y: 0.92 }, { z: 0.06, w: 0.13, h: 0.06, y: 0.93 }], W); // tank
      for (const sx of [1, -1]) p.box(0.02, 0.22, 0.36, sx * 0.12, 0.84, -0.4, W, 0.25); // side plates
      p.loft([{ z: -0.5, w: 0.09, h: 0.03, y: 0.93 }, { z: -0.95, w: 0.07, h: 0.03, y: 1.02 }], W); // rear mudguard
      for (const x of [0.07, -0.07]) fr.strut([x, R, 0], [x, 1.02, -0.32], 0.03, 0xc89a2a);
      fr.box(0.2, 0.05, 0.08, 0, 1.0, -0.32, ALLOY);
      fr.box(0.82, 0.03, 0.03, 0, 1.08, -0.36, ALLOY); //                   wide bars
      fr.box(0.22, 0.2, 0.03, 0, 0.98, -0.18, 0xf2f2ee, -0.3); //            number board
      fr.box(0.12, 0.025, 0.5, 0, 0.8, 0.08, 0xf2f2ee, 0.12); //            high mudguard
      out.headFront = true;
      out.head = [[0, 0.96, -0.15]];
      out.headSize = [0.1, 0.07];
      out.tail = [[0, 1.02, -0.96]];
      out.wheels = [[R, 0.1, zF, true, ALLOY, true], [R, 0.13, zR, false, ALLOY, true]];
    } else if (type === 'nippy') {
      // A scooter: small wheels, a step-through floor, a shield up front, a round rump.
      f.box(0.3, 0.05, 0.5, 0, 0.3, 0.12, 0x3a3d42); //                     floorboard
      f.box(0.24, 0.08, 0.5, 0, 0.82, -0.32, SEAT); //                      seat
      f.strut([-0.1, 0.25, -0.2], [-0.12, 0.28, -0.72], 0.04, ALLOY); //    little exhaust
      f.box(0.1, 0.18, 0.18, 0.08, 0.3, zR, 0x3a3d42); //                   engine and swingarm
      p.loft([{ z: -0.02, w: 0.12, h: 0.12, y: 0.48 }, { z: -0.25, w: 0.2, h: 0.24, y: 0.55, n: 2.2 }, { z: -0.6, w: 0.19, h: 0.22, y: 0.56, n: 2.2 }, { z: -0.82, w: 0.08, h: 0.1, y: 0.62 }], W); // rump
      p.loft([{ z: 0.36, w: 0.04, h: 0.36, y: 0.62, n: 3 }, { z: 0.44, w: 0.2, h: 0.36, y: 0.64, n: 3 }, { z: 0.52, w: 0.22, h: 0.32, y: 0.66, n: 3 }, { z: 0.56, w: 0.12, h: 0.25, y: 0.68, n: 3 }], W); // leg shield
      fr.strut([0, R + 0.05, -0.04], [0, 1.02, -0.2], 0.04, ALLOY); //      steering column
      fr.box(0.62, 0.03, 0.03, 0, 1.02, -0.22, BLACK);
      fr.box(0.26, 0.12, 0.14, 0, 1.03, -0.18, W === 0 ? 0 : 0xf2f2ee); //   headset
      fr.box(0.12, 0.03, 0.3, 0, R + 0.06, 0.0, 0xf2f2ee, 0.1);
      out.headFront = true;
      out.head = [[0, 1.04, -0.11]];
      out.headSize = [0.12, 0.08];
      out.tail = [[0, 0.62, -0.85]];
      out.wheels = [[R, 0.11, zF, true, ALLOY], [R, 0.12, zR, false, ALLOY]];
    } else {
      // The quad: four fat tyres, mudguards over each pair, racks fore and aft, a bar to hold.
      f.box(0.36, 0.28, 0.6, 0, 0.5, 0.0, DARK); //                         engine, chassis
      f.box(0.28, 0.1, 0.62, 0, 0.86, -0.15, SEAT); //                      seat
      f.box(0.98, 0.04, 0.05, 0, 0.36, 0.0, ALLOY); //                      footboards' rail
      for (const z of [0.68, -0.72]) {
        f.box(0.75, 0.03, 0.03, 0, 0.98, z, BLACK); //                      racks
        for (const x of [0.36, -0.36]) f.box(0.03, 0.03, 0.34, x, 0.98, z, BLACK);
        f.box(0.03, 0.03, 0.34, 0, 0.98, z, BLACK);
      }
      f.box(0.74, 0.08, 0.06, 0, 0.42, 0.94, BLACK); //                     front bumper
      for (const z of [0.62, -0.62]) f.box(0.85, 0.05, 0.05, 0, 0.34, z, BLACK); // axles
      p.loft([{ z: 1.0, w: 0.3, h: 0.08, y: 0.68, n: 3 }, { z: 0.75, w: 0.58, h: 0.12, y: 0.8, n: 3.5 }, { z: 0.4, w: 0.6, h: 0.12, y: 0.8, n: 3.5 }, { z: 0.18, w: 0.24, h: 0.15, y: 0.78, n: 3 }], W); // front
      p.loft([{ z: -0.2, w: 0.2, h: 0.12, y: 0.8, n: 3 }, { z: -0.45, w: 0.6, h: 0.12, y: 0.82, n: 3.5 }, { z: -0.88, w: 0.6, h: 0.12, y: 0.82, n: 3.5 }, { z: -1.0, w: 0.4, h: 0.08, y: 0.72, n: 3 }], W); // rear
      fr.strut([0, 0.7, 0.05], [0, 1.0, -0.02], 0.035, ALLOY);
      fr.box(0.82, 0.035, 0.035, 0, 1.0, 0.0, BLACK);
      out.head = [[0.2, 0.8, 0.98], [-0.2, 0.8, 0.98]];
      out.headSize = [0.14, 0.08];
      out.tail = [[0.2, 0.78, -1.0], [-0.2, 0.78, -1.0]];
      const tx = s.trackWidth / 2;
      out.wheels = [[R, 0.25, zF, true, 0xd8d8d0, true, tx], [R, 0.25, zF, true, 0xd8d8d0, true, -tx], [R, 0.27, zR, false, 0xd8d8d0, true, tx], [R, 0.27, zR, false, 0xd8d8d0, true, -tx]];
      out.barsZ = 0.36; // the bars turn about a column of their own
    }
    // The side stand (left: the bike leans that way when parked).
    if (!s.quad) {
      const st = new VH.AircraftKit();
      st.strut([0.12, 0.4, -0.05], [0.3, 0.02, -0.14], 0.018, BLACK);
      st.box(0.06, 0.02, 0.06, 0.3, 0.01, -0.14, BLACK);
      out.stand = st.geometry();
    }
    out.frame = f.geometry();
    out.paint = p.geometry();
    out.front = fr.geometry();
    GEO[type] = out;
    return out;
  }

  // ------------------------------------------------------- riding position
  /** Two bones from a to b (in z, y), knee/elbow bent toward `bend` (+1 forward, -1 back). */
  function ik2(az, ay, bz, by, l1, l2, bend) {
    let dz = bz - az;
    let dy = by - ay;
    let d = Math.hypot(dz, dy) || 1e-3;
    const max = (l1 + l2) * 0.999;
    if (d > max) {
      dz *= max / d;
      dy *= max / d;
      d = max;
    }
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const base = Math.atan2(dz, -dy); // angle forward from straight down
    const t1 = base + bend * a;
    const mz = az + Math.sin(t1) * l1;
    const my = ay - Math.cos(t1) * l1;
    const t2 = Math.atan2(bz - mz, -(by - my));
    return { mz, my, t1, t2 };
  }

  const POSE = {};
  /**
   * The riding position for a type: Jay's joint angles (humanoid.js pose
   * fields) and the points the kit rider is built from. Jay's hip joint is
   * 0.94 above his feet, the spine pivots 0.11 above that, the shoulders 0.45
   * further up it; thigh 0.45, shin 0.44, upper arm 0.29, forearm 0.3.
   */
  function ridePose(type, pillion) {
    const key = type + (pillion ? ':p' : '');
    if (POSE[key]) return POSE[key];
    const s = SPECS[type];
    const seat = pillion ? s.pil : s.seat;
    const lean = pillion ? Math.max(0.1, s.lean * 0.6) : s.lean;
    const hipY = seat.y + 0.07;
    const hipZ = seat.z;
    const peg = pillion ? { x: s.peg.x, y: s.peg.y + 0.06, z: Math.min(s.peg.z, seat.z + 0.05) - 0.12 } : s.peg;
    const leg = ik2(hipZ, hipY, peg.z, peg.y, 0.45, 0.44, 1);
    const spY = hipY + 0.11;
    const shY = spY + Math.cos(lean) * 0.45;
    const shZ = hipZ + Math.sin(lean) * 0.45;
    // A pillion holds the rider's waist; the rider the grips.
    const g = pillion ? { x: 0.17, y: s.seat.y + 0.3, z: s.seat.z - 0.05 } : s.bars;
    const arm = ik2(shZ, shY, g.z, g.y, 0.29, 0.3, -1);
    const o = {
      root: { y: hipY - 0.94, z: hipZ },
      pts: { hipY, hipZ, kneeY: leg.my, kneeZ: leg.mz, peg, shY, shZ, elY: arm.my, elZ: arm.mz, grip: g, lean },
      jay: {
        w: 1,
        hipL: leg.t1, hipR: leg.t1, kneeL: leg.t1 - leg.t2, kneeR: leg.t1 - leg.t2,
        ankleL: -0.25, ankleR: -0.25,
        shoulderL: arm.t1 + lean, shoulderR: arm.t1 + lean, elbowL: arm.t2 - arm.t1, elbowR: arm.t2 - arm.t1,
        splayL: clamp((g.x - 0.2) * 0.9, 0, 0.5), splayR: clamp((g.x - 0.2) * 0.9, 0, 0.5),
        lean, twist: 0, pelvisY: 0.97, headPitch: -lean * 0.6, crouch: 0, speed: 0,
      },
    };
    POSE[key] = o;
    return o;
  }

  const RIDERS = new Map();
  /** A seated figure (a rider in a helmet, or a pillion) as one kit mesh, cached per type, seat and colours. */
  function riderGeo(type, pillion, helmet, jacket) {
    const key = type + '|' + (pillion ? 1 : 0) + '|' + helmet + '|' + jacket;
    if (RIDERS.has(key)) return RIDERS.get(key);
    const P = ridePose(type, pillion).pts;
    const k = new VH.AircraftKit();
    const JEANS = 0x2b3a55;
    const SKIN = 0xc68a62;
    for (const sx of [1, -1]) {
      const hx = sx * 0.1;
      const kx = sx * Math.max(0.12, P.peg.x * 0.9);
      const fx = sx * P.peg.x;
      k.strut([hx, P.hipY, P.hipZ], [kx, P.kneeY, P.kneeZ], 0.075, JEANS);
      k.strut([kx, P.kneeY, P.kneeZ], [fx, P.peg.y + 0.05, P.peg.z], 0.06, JEANS);
      k.box(0.1, 0.08, 0.24, fx, P.peg.y + 0.03, P.peg.z + 0.06, 0x1a1a1a); // boot
      const shx = sx * 0.2;
      const gx = sx * P.grip.x;
      const ex = (shx + gx) / 2 + sx * 0.06;
      k.strut([shx, P.shY, P.shZ], [ex, P.elY, P.elZ], 0.055, jacket);
      k.strut([ex, P.elY, P.elZ], [gx, P.grip.y, P.grip.z], 0.045, jacket);
      k.sphere(0.045, 1, 1, 1, gx, P.grip.y, P.grip.z, pillion ? SKIN : 0x1a1a1a, 8, 6); // hand / glove
    }
    k.sphere(0.15, 1.15, 0.8, 0.9, 0, P.hipY, P.hipZ - 0.03, JEANS, 10, 8); // hips
    const ty = (P.hipY + P.shY) / 2 + 0.02;
    const tz = (P.hipZ + P.shZ) / 2;
    k.cyl(0.19, 0.16, 0.56, 10, 0, ty, tz, jacket, -HALF + P.lean); //       torso
    const hy = P.shY + Math.cos(P.lean) * 0.22;
    const hz = P.shZ + Math.sin(P.lean) * 0.22 + 0.02;
    k.cyl(0.05, 0.05, 0.1, 8, 0, P.shY + 0.06, P.shZ + 0.02, SKIN, -HALF);
    if (helmet !== null && helmet !== undefined) {
      k.sphere(0.145, 1, 1.02, 1.08, 0, hy, hz, helmet, 14, 10);
      k.box(0.2, 0.07, 0.05, 0, hy - 0.005, hz + 0.135, 0x15191e, -0.15); //   visor
    } else {
      k.sphere(0.115, 0.9, 1.08, 1, 0, hy, hz, SKIN, 12, 9);
      k.sphere(0.12, 0.95, 0.75, 1.05, 0, hy + 0.04, hz - 0.01, 0x2a1a12, 12, 8); // hair
    }
    const g = k.geometry();
    RIDERS.set(key, g);
    return g;
  }

  // --------------------------------------------------------------- model
  class BikeModel {
    constructor(type, spec, opts) {
      const G = bikeGeo(type);
      this.id = type;
      this.spec = spec;
      this.color = opts && opts.color !== undefined && opts.color !== null ? opts.color : spec.palette[((opts && opts.seed) || 0) % spec.palette.length];
      this.livery = false; // the spray shops can paint it
      this.root = new THREE.Group();
      this.root.name = 'bike-' + type;
      this.body = new THREE.Group();
      this.root.add(this.body);
      this.meshes = [];
      this.wheels = [];
      this.paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.25, color: this.color });
      this.anchors = { driverSeat: new THREE.Vector3(0, spec.seat.y, spec.seat.z), headlights: [], taillights: [], exhaust: [], siren: null };
      this.state = { head: false, brake: false, damage: 0 };
      const mm = mats();
      this.mesh(G.frame, mm.frame);
      this.paintMesh = this.mesh(G.paint, this.paint);
      // The front end: forks and bars (and on some the lamp) turn with the front wheel.
      const zF = spec.wheelbase / 2;
      this.steerPivot = new THREE.Group();
      this.steerPivot.position.set(0, 0, spec.quad ? G.barsZ : zF);
      this.body.add(this.steerPivot);
      const fm = this.mesh(G.front, mm.frame, this.steerPivot);
      if (spec.quad) fm.position.z = -G.barsZ;
      for (const [r, w, z, front, rim, knob, x] of G.wheels) this.wheel(r, w, x || 0, z, front, rim, knob);
      const lamp = (list, size, mat, parent, dz) => {
        const k = new VH.AircraftKit();
        for (const [x, y, z] of list) k.box(size[0], size[1], 0.05, x, y, z - (dz || 0), 0xffffff);
        const m = this.mesh(k.geometry(), mat, parent);
        m.castShadow = false;
        return m;
      };
      this.head = G.headFront ? lamp(G.head, G.headSize, mm.headOff, this.steerPivot, zF) : lamp(G.head, G.headSize, mm.headOff);
      this.tail = lamp(G.tail, [0.12, 0.06], mm.tailOff);
      this.stand = G.stand ? this.mesh(G.stand, mm.frame) : null;
      // Where Jay's feet go when he sits astride (player.js puts his root here).
      this.seatAnchor = new THREE.Object3D();
      const rp = ridePose(type, false).root;
      this.seatAnchor.position.set(0, rp.y, rp.z);
      this.body.add(this.seatAnchor);
      this.rider = null; //   the AI's rider (kit figure)
      this.pillion = null; // a passenger on the back
      this._riderOn = false;
      this._pillionOn = false;
      this._look = ((opts && opts.seed) || 0) >>> 0;
    }

    mesh(geo, mat, parent) {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      (parent || this.body).add(m);
      this.meshes.push(m);
      return m;
    }

    wheel(r, w, x, z, front, rim, knob) {
      const pivot = new THREE.Group();
      // A bike's front wheel hangs off the steering pivot; a quad's turn on their own.
      const onFork = front && !this.spec.quad;
      pivot.position.set(onFork ? 0 : x, r, onFork ? 0 : z);
      const spin = new THREE.Object3D();
      pivot.add(spin);
      const m = new THREE.Mesh(wheelGeo(r, w, rim, knob), mats().tyre);
      m.castShadow = true;
      spin.add(m);
      this.meshes.push(m);
      (onFork ? this.steerPivot : this.body).add(pivot);
      // (front: false on the fork, so vehicle.js doesn't turn it twice.)
      this.wheels.push({ pivot, spin, mesh: m, x, z, radius: r, width: w, front: front && !onFork });
    }

    /** Show the AI's rider (in a helmet) or not. */
    setRider(on) {
      if (on === this._riderOn) return;
      this._riderOn = on;
      if (on && !this.rider) {
        const n = this._look;
        this.rider = this.mesh(riderGeo(this.id, false, HELMETS[n % HELMETS.length], JACKETS[(n >> 3) % JACKETS.length]), mats().rider);
      }
      if (this.rider) this.rider.visible = on;
    }

    /** A passenger on the back (crew riding along with Jay). */
    setPillion(on) {
      if (on === this._pillionOn || !this.spec.pil) return;
      this._pillionOn = on;
      if (on && !this.pillion) this.pillion = this.mesh(riderGeo(this.id, true, null, JACKETS[(this._look >> 5) % JACKETS.length]), mats().rider);
      if (this.pillion) this.pillion.visible = on;
    }

    setHeadlights(on) {
      on = !!on;
      if (on === this.state.head) return;
      this.state.head = on;
      this.head.material = on ? mats().headOn : mats().headOff;
      this._tail();
    }

    setBrake(on) {
      on = !!on;
      if (on === this.state.brake) return;
      this.state.brake = on;
      this._tail();
    }

    _tail() {
      this.tail.material = this.state.brake ? mats().tailOn : this.state.head ? mats().tailRun : mats().tailOff;
    }

    setReverse() {}

    setSiren() {
      return null;
    }

    setDamage(k) {
      k = clamp(+k || 0, 0, 1);
      this.state.damage = k;
      this.paint.color.setHex(this.color).multiplyScalar(1 - k * 0.55);
      this.paint.roughness = 0.35 + k * 0.5;
    }

    /** A respray (sprayshops.js). */
    setColor(hex) {
      this.color = hex;
      this.setDamage(this.state.damage);
      return true;
    }

    setVisible(v) {
      this.root.visible = !!v;
    }

    setShadows(cast) {
      for (const m of this.meshes) if (m !== this.head && m !== this.tail) m.castShadow = !!cast;
    }

    dispose() {
      if (this.root.parent) this.root.parent.remove(this.root);
      this.paint.dispose();
      for (const m of [this.head, this.tail]) if (m) m.geometry.dispose();
    }
  }

  // ----------------------------------------------------------- the vehicle
  const _s = new THREE.Vector3();
  const _w = { x: 0, z: 0 };
  let game = null;

  function register() {
    if (!VH.Vehicle || !VH.CarModels) return;
    const T = VH.CarModels.TYPES;
    for (const id of TYPES) T[id] = Object.assign({ id, kind: 'bike', siren: null }, SPECS[id]);

    class Bike extends VH.Vehicle {
      constructor(system, typeId, opts) {
        super(system, typeId, opts);
        game = system.game;
        this.kind = 'car'; // (it drives, and counts, like any car: chop shops, police, the radar)
        this.isBike = true;
        const s = this.spec;
        this.twoWheeler = !s.quad;
        if (s.top) this.topSpeed = s.top;
        this.tune = s.tune;
        this.lean = 0; //      rad, + = leaning left
        this.wheelie = 0; //   rad, front up
        this.stoppie = 0; //   rad, rear up
        this.fallen = 0; //    0 upright .. 1 on its side (after a crash)
        this._fallSide = 1;
        this._stand = this.twoWheeler ? 1 : 0; // 1 = parked on the side stand
        this._wasGrounded = true;
        this._v0x = 0;
        this._v0z = 0;
        this._riderGone = false; // the AI's rider was pulled or thrown off
        this._crewT = 0;
        this.voiceRange = 60;
        this._mu0 = this.mu;
      }

      _buildModel(typeId, opts) {
        return new BikeModel(typeId, this.spec, opts || {});
      }

      createEngineVoice(audio) {
        return audio.createEngine({ kind: 'compact', cfg: VOICES[this.spec.voice], player: this.driver === 'player' });
      }

      fixedUpdate(dt) {
        const inp = this.input;
        const s = this.spec;
        const player = this.driver === 'player';
        this._v0x = this.vel.x;
        this._v0z = this.vel.z;
        // Lying on its side: nothing drives it, it scrapes to a stop.
        if (this.fallen > 0.5 && !this.driver) {
          inp.accel = 0;
          inp.steer = 0;
          inp.handbrake = 1;
          const f = Math.exp(-2.2 * dt);
          this.vel.x *= f;
          this.vel.z *= f;
          this.omega *= f;
          if (this.speed > 2) this.skid[2] = this.skid[3] = 1;
        }
        // Wheelie: handbrake with the throttle on (or the stick pulled back on a pad).
        const hb = inp.handbrake;
        const steer = inp.steer;
        let wantW = false;
        if (player && this.grounded && this.vF > 1.5 && inp.accel > 0.3) {
          const pad = game && game.input && game.input.pad;
          wantW = hb > 0 || !!(pad && pad.connected && pad.move && pad.move.y < -0.6);
        }
        if (wantW) inp.handbrake = 0; // (not the rear brake, then)
        if (this.wheelie > 0.25) inp.steer *= 0.4; //  front light: little bite
        if (this.fallen > 0.05 && this.driver) this.fallen = Math.max(0, this.fallen - dt * 3); // picked up
        // Knobbly tyres: the dirt bike and the quad lose little grip on grass and gravel.
        if (s.offroad) this.mu = this._mu0 * (this.surface === 'grass' ? 1.35 : this.surface === 'gravel' ? 1.2 : 1);
        super.fixedUpdate(dt);
        inp.handbrake = hb;
        inp.steer = steer;
        // The dirt bike springs off ramp lips, and a bike hangs in the air longer than a car.
        if (this._wasGrounded && !this.grounded && this.vel.y > 1 && s.pop) this.vel.y *= s.pop;
        if (!this.grounded && s.float) this.vel.y += 9.81 * 1.45 * s.float * dt;
        this._wasGrounded = this.grounded;

        // Lean into the turn (the lean a real bike needs: tan = v·ω / g).
        const sp = this.vF;
        let target = 0;
        if (this.twoWheeler) {
          if (!this.driver && Math.abs(sp) < 0.4 && this.fallen < 0.5) target = 0.14 * this._stand; // on its stand
          else if (this.grounded) target = clamp(Math.atan((sp * this.omega) / 9.81), -s.maxLean, s.maxLean) * smoothstep(0.5, 4, Math.abs(sp));
          if (this.driver && Math.abs(sp) < 1.2) target = 0.06; // a foot down
        }
        const rate = this.grounded ? 4.5 : 1.5;
        this.lean += clamp(target - this.lean, -rate * dt, rate * dt);
        // The stand: down when parked, up as soon as someone's on.
        this._stand = clamp(this._stand + (this.driver ? -4 : Math.abs(sp) < 0.5 ? 2.5 : -4) * dt, 0, 1);
        // Wheelie and stoppie angles.
        let wt = 0;
        if (wantW) wt = s.wheelie * (0.88 + 0.12 * Math.sin(this.sys.time * 2.3)) * smoothstep(1.5, 5, sp);
        else if (!this.grounded) wt = this.wheelie * 0.97;
        this.wheelie += clamp(wt - this.wheelie, -2.6 * dt, 1.5 * dt);
        let st = 0;
        if (player && this.twoWheeler && this.grounded && inp.accel < -0.7 && sp > 8 && !hb) st = 0.2 * smoothstep(8, 20, sp);
        this.stoppie += clamp(st - this.stoppie, -1.8 * dt, 1.2 * dt);
        if (this.wheelie > 0.25 && player) this._wheelieT = (this._wheelieT || 0) + dt;
        else if (this._wheelieT) {
          if (this._wheelieT > 2) VH.events.emit('bike:wheelie', { v: this, time: this._wheelieT });
          this._wheelieT = 0;
        }
      }

      _land(g) {
        const impact = -this.vel.y;
        super._land(g);
        // A landing hard enough throws the rider; the dirt bike and the quad take more.
        if (impact > (this.spec.hardLand || 17)) this.crash(impact * 0.8, null);
      }

      /** A knock at `speed` (m/s into whatever it hit): hard enough, the rider comes off. */
      crash(speed, other) {
        if (this.wrecked || this.removed) return;
        if (speed < this.spec.throwAt) return;
        if (this.driver === 'player') throwJay(this, speed, other);
        else if (this.driver === 'ai' && !this._riderGone) throwRider(this, speed);
        else return;
        if (this.twoWheeler) {
          this.fallen = 1;
          this._fallSide = this.lean >= 0 ? 1 : -1;
        }
      }

      updateVisual(dt, alpha, night) {
        super.updateVisual(dt, alpha, night);
        if (this._dis) this._dismountStep(dt);
        const m = this.model;
        // Being pulled off: the real person takes the kit rider's place.
        const e = this.sys.entering;
        if (e && e.v === this && e.jacked && e.phase !== 'walk') this._riderGone = true;
        m.setRider(this.driver === 'ai' && !this._riderGone);
        if (m.stand) m.stand.visible = this._stand > 0.5;
        // A crew member riding with Jay sits on the back (missions.js: crew inCar).
        this._crewT -= dt;
        if (this._crewT <= 0) {
          this._crewT = 0.5;
          let on = false;
          const crowd = this.driver === 'player' && game && game.crowd;
          if (crowd) for (const a of crowd.agents) if (a.inCar === this && !a.dead) { on = true; break; }
          m.setPillion(on);
        }
      }

      _syncModel(alpha) {
        super._syncModel(alpha);
        const m = this.model;
        const b = m.body;
        const bounce = b.position.y;
        // Pitch: the ground, a little of the suspension, and a wheelie (about the
        // back wheel) or a stoppie (about the front).
        const base = this.pitch + this._visPitch * 0.5;
        let th = base;
        let py = bounce;
        let pz = 0;
        if (this.wheelie > 0.005 || this.stoppie > 0.005) {
          const up = this.wheelie >= this.stoppie;
          const a = up ? -this.wheelie : this.stoppie;
          const piv = up ? -this.b : this.a;
          th = base + a;
          // Rotate about (0, 0, piv): the body's origin moves to piv - R·piv.
          py += piv * Math.sin(a);
          pz += piv - piv * Math.cos(a);
        }
        b.rotation.x = th;
        b.position.z = pz;
        if (this.twoWheeler) {
          // Lean (left down for a left turn: a negative turn about +Z), or lying on its side.
          let r = -this.lean;
          if (this.fallen > 0) r = lerp(r, -this._fallSide * 1.32, smoothstep(0, 1, this.fallen));
          b.rotation.z = r;
          py += 0.16 * this.fallen;
        }
        b.position.y = py;
        m.steerPivot.rotation.y = this.steer;
      }

      /** Getting off (vehicles.js has put him beside it): a leg back over, then he's on his feet. */
      startDismount() {
        const p = game.player;
        const l = this.worldToLocal(p.pos.x, p.pos.z, {});
        this._dis = { t: 0, side: l.x >= 0 ? 1 : -1, x: p.pos.x, z: p.pos.z, h: p.heading, pose: {} };
        p.frozen = true;
      }

      _dismountStep(dt) {
        const d = this._dis;
        const p = game.player;
        d.t += dt;
        const k = clamp(d.t / 0.55, 0, 1);
        if (k >= 1 || p.state !== 'ground' || p.vehicle) {
          this._dis = null;
          p.enterPose = null;
          p.enterLift = 0;
          p.frozen = false;
          return;
        }
        const R = ridePose(this.type, false);
        const on = 1 - smoothstep(0.15, 0.8, k);
        const swing = Math.sin(Math.PI * smoothstep(0.15, 0.7, k));
        const seat = this.localToWorld(0, R.root.z, _w);
        p.pos.x = lerp(d.x, seat.x, on);
        p.pos.z = lerp(d.z, seat.z, on);
        p.prevPos.x = p.pos.x;
        p.prevPos.z = p.pos.z;
        const dh = Math.atan2(Math.sin(d.h - this.yaw), Math.cos(d.h - this.yaw));
        p.heading = p.prevHeading = this.yaw + dh * smoothstep(0.2, 0.9, k);
        p.enterLift = Math.max(0.001, R.root.y * on + 0.1 * swing);
        const J = R.jay;
        const pose = d.pose;
        for (const key in J) pose[key] = lerp(key === 'pelvisY' ? 0.97 : 0, J[key], on);
        const back = d.side > 0 ? 'R' : 'L';
        pose['hip' + back] = lerp(pose['hip' + back], 1.8, swing);
        pose['knee' + back] = lerp(pose['knee' + back], 1.0, swing);
        pose.w = 1;
        p.enterPose = pose;
      }

      dispose() {
        if (this._dis && game) {
          const p = game.player;
          p.enterPose = null;
          p.enterLift = 0;
          p.frozen = false;
        }
        super.dispose();
      }

      /** Jay astride (player.js, every frame while he's riding): his feet on the pegs, hands on the bars. */
      poseRider(p, dt, lookPitch) {
        const m = this.model;
        const root = p.model.root;
        m.root.updateMatrixWorld(true);
        m.seatAnchor.matrixWorld.decompose(root.position, root.quaternion, _s);
        root.visible = true;
        const P = this._pose || (this._pose = Object.assign({}, ridePose(this.type, false).jay));
        const R = ridePose(this.type, false).jay;
        // Steering: a lean of the shoulders and head into the turn; a foot down when stopped.
        const st = clamp(this.steer * 1.6, -0.6, 0.6);
        P.twist = -st * 0.35;
        P.headYaw = st * 0.4;
        const stop = this.twoWheeler && this.speed < 1.2 && this.grounded ? 1 : 0;
        this._foot = (this._foot || 0) + (stop - (this._foot || 0)) * Math.min(1, dt * 8);
        P.hipL = lerp(R.hipL, 0.32, this._foot);
        P.kneeL = lerp(R.kneeL, 0.12, this._foot);
        // Hunched over the tank in a wheelie, up on the pegs in the air.
        P.lean = R.lean + (this.grounded ? 0 : 0.12) - this.wheelie * 0.3;
        // A drive-by: the gun arm comes off the bars and points with the camera.
        const aim = p.aiming ? 1 : 0;
        P.shoulderR = lerp(R.shoulderR, 1.5 + (lookPitch || 0) * 0.8, aim);
        P.elbowR = lerp(R.elbowR, 0.05, aim);
        P.w = 1;
        const anim = this._anim || (this._anim = { speed: 0, grounded: true, vy: 0, crouch: 0, aim: 0, reload: 0, climb: -1, pose: null, sprint: false, backwards: false, land: 0, lookPitch: 0, weaponPose: null });
        anim.pose = P;
        anim.aim = aim;
        anim.lookPitch = lookPitch || 0;
        anim.weaponPose = p.weaponPose;
        anim.recoil = p._recoil || 0;
        p.model.animate(dt, anim);
        if (p._recoil > 0) p._recoil = Math.max(0, p._recoil - dt * 9);
      }
    }

    VH.VehicleKinds = Object.assign(VH.VehicleKinds || {}, { bike: Bike });
    VH.Bike = Bike;

    // How Jay gets on (vehicles/entry.js): a leg over, the way he takes a rider off is a shove.
    const PR = VH.VehicleEntry && VH.VehicleEntry.PROFILES;
    if (PR) for (const id of TYPES) PR[id] = { door: 'astride', climb: 0, low: 0, jack: 'shove', openT: 0.12, inT: id === 'nippy' ? 0.55 : 0.75 };
  }

  // ----------------------------------------------------------- getting on
  /**
   * entry.js's 'in' phase for a bike: from beside it, a hand to the bars, the
   * leg nearest the back swung up and over the seat, down astride, facing
   * forward. Returns true once he's on.
   */
  function mount(entry, e, face) {
    const p = entry.game.player;
    const v = e.v;
    const T = e.pr.inT;
    const k = clamp(e.t / T, 0, 1);
    const s = e.side;
    const R = ridePose(v.type, false);
    const over = smoothstep(0.15, 0.75, k);
    const swing = Math.sin(Math.PI * smoothstep(0.1, 0.7, k));
    const sit = smoothstep(0.55, 1, k);
    const lx = lerp(s * (v.hx + 0.42), 0, over);
    const lz = lerp(e.L.midZ, R.root.z, smoothstep(0, 0.8, k));
    e.lift = lerp(0, R.root.y, over) + 0.12 * swing;
    const w = v.localToWorld(lx, lz, _w);
    p.pos.x = w.x;
    p.pos.z = w.z;
    const turn = smoothstep(0.1, 0.65, k);
    const dh = Math.atan2(Math.sin(v.yaw - face), Math.cos(v.yaw - face));
    p.heading = face + dh * turn;
    // The leg toward the back of the bike is the one that goes over.
    const back = s > 0 ? 'R' : 'L';
    const J = R.jay;
    const pose = e._mountPose || (e._mountPose = {});
    for (const key in J) pose[key] = J[key];
    for (const side of ['L', 'R']) {
      const lift = side === back ? swing : 0;
      pose['hip' + side] = lerp(lerp(0, J['hip' + side], sit), 1.9, lift);
      pose['knee' + side] = lerp(lerp(0.1, J['knee' + side], sit), 1.1, lift);
    }
    pose.lean = lerp(0.15, J.lean, sit);
    pose.w = 1;
    entry._pose(pose);
    return k >= 1;
  }

  // --------------------------------------------------------- coming off
  /** Jay comes off: out of the saddle with the bike's speed, a tumble (a ragdoll), damage, back up. */
  function throwJay(v, speed, other) {
    const g = game;
    const p = g.player;
    if (p.vehicle !== v || p.state !== 'vehicle') return;
    const sys = g.vehicles;
    const vx = v._v0x;
    const vz = v._v0z;
    const at = v.localToWorld(0, v.spec.seat.z + 0.3, {});
    p.vehicle = null;
    v.driver = null;
    v.input.accel = 0;
    v.input.steer = 0;
    v.input.boost = 0;
    v.input.handbrake = 0;
    v.horn = false;
    v.role = 'abandoned';
    v.persistent = !!(v.missionOwned || v.keep);
    p.state = 'ground';
    p.model.setVisible(true);
    p.teleport(at.x, at.z, v.yaw, v.pos.y + v.spec.seat.y);
    const k = 0.75;
    p.vel.x = vx * k;
    p.vel.z = vz * k;
    p.vel.y = 3 + Math.min(4, speed * 0.15);
    p.grounded = false;
    p.throwNext = true; // player.js: a ragdoll tumble rather than the usual knock-down
    // Over the bars: the upper body is flung on ahead of the legs.
    const l = Math.hypot(vx, vz) || 1;
    p.throwHit = { x: vx / l, y: 0.25, z: vz / l, power: clamp(speed * 0.12, 1.5, 4.5) };
    p.knock(clamp((speed - 7) * 2.3, 6, 65), other && other.driver === 'ai' ? other : 'crash');
    VH.events.emit('vehicle:exit', { v, bail: true, thrown: true });
    VH.events.emit('bike:thrown', { v, speed, player: true });
    void sys;
  }

  /** An AI rider comes off: a person on the road (crowd.js), knocked flying. */
  function throwRider(v, speed) {
    const crowd = game && game.crowd;
    v._riderGone = true;
    v.driver = null;
    v.controller = null;
    v.role = 'abandoned';
    v.input.accel = 0;
    v.input.handbrake = 1;
    if (!crowd) return;
    const at = v.localToWorld(0, v.spec.seat.z, {});
    const a = crowd.spawn(at.x, at.z, { y: v.pos.y, heading: v.yaw });
    a.pos.y = v.pos.y + 0.5;
    a.knock(v._v0x * 0.7, 3 + speed * 0.12, v._v0z * 0.7, clamp((speed - 6) * 3, 5, 60), 'crash', 2);
    VH.events.emit('bike:thrown', { v, speed, player: false, agent: a });
  }

  // ------------------------------------------------------------- hooks
  function install() {
    if (!VH.events) return;
    // Hard knocks (vehicles.js: walls, cars) throw riders off.
    VH.events.on('vehicle:exit', (e) => {
      if (e.v && e.v.isBike && !e.bail && !e.thrown) e.v.startDismount();
    });
    VH.events.on('vehicle:impact', (e) => {
      if (e.v && e.v.isBike) e.v.crash(e.speed, e.other);
      if (e.other && e.other.isBike) e.other.crash(e.speed, e.v);
    });
    // AI riders in traffic: a share of each district's traffic is bikes.
    const TS = VH.TrafficSystem;
    if (TS && !TS.prototype._bikeWrap) {
      const spawnAt = TS.prototype.spawnAt;
      TS.prototype.spawnAt = function (lp, type) {
        if (!type) {
          const d = this.world && this.world.districtAt && this.world.districtAt(lp.x, lp.z);
          const share = d && TRAFFIC_SHARE[d.id] !== undefined ? TRAFFIC_SHARE[d.id] : 0.08;
          if (Math.random() < share) type = pick(TRAFFIC_BIKES, Math.random());
        }
        return spawnAt.call(this, lp, type);
      };
      TS.prototype._bikeWrap = true;
    }
    // Parked bikes at the kerb: some of the parking spots hold a bike instead of a car.
    const VS = VH.VehicleSystem;
    if (VS && !VS.prototype._bikeWrap) {
      const build = VS.prototype._buildParkingSpots;
      VS.prototype._buildParkingSpots = function () {
        build.call(this);
        for (const s of this.spots) {
          const h = VH.math.hash2(Math.round(s.x * 7), Math.round(s.z * 7) + 4111);
          if (h < PARKED_SHARE) s.type = pick(PARKED_BIKES, h / PARKED_SHARE);
        }
      };
      VS.prototype._bikeWrap = true;
    }
  }

  function pick(list, r) {
    let total = 0;
    for (const [, w] of list) total += w;
    let x = r * total;
    for (const [id, w] of list) {
      x -= w;
      if (x <= 0) return id;
    }
    return list[0][0];
  }

  register();
  install();
  VH.Bikes = { SPECS, TYPES, VOICES, mount, ridePose };
})();
