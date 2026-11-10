/*
 * havoc-air.js — trouble on the apron at Vicehaven International: airliners
 * that take bullets, smoke, catch fire and evacuate down their slides; fuel
 * bowsers that leak and go up; the airport fire service racing out to put it
 * all out; planes that are solid to cars; the airside vehicles Jay can take.
 * The apron's part of game.airportHavoc (havoc.js): VH.AirportHavoc.Air.
 *
 *   new Air(havoc)     havoc.air: update / reset / stop / stats / serialize /
 *                      load, called by havoc.js. Uses its .damage() (the bill
 *                      on screen) and .hold() (a ground stop while anything
 *                      burns), and airside.js's API (planes(), disabled,
 *                      removePlane(), abortTakeoff(), groundVehicles(),
 *                      takeGse(), blockStand()).
 *
 * Airliners: Jay's bullets (combat:ray) are tested against a few boxes per
 * plane (the fuselage as the real loft, the engines, the wings, the fin), and
 * leave sparks and holes. An engine takes about a magazine: it smokes, then
 * burns. Enough damage (or an engine fire) and the plane is disabled: it
 * brakes to a stop, the slides inflate (yellow ramps from the doors) and the
 * passengers and crew slide down and run for it. A fire grows, spreads from
 * an engine to the wing and body, and only once everyone is off can it get
 * big enough to burn the plane out: a fireball and a blackened wreck, cleared
 * a few minutes later when nobody's looking (or when Jay leaves the airport).
 * A plane shot on its takeoff roll aborts. In the air it just diverts.
 * Rockets and grenades hurt them too. One that's been put out (or never
 * caught) sits there, its flight Cancelled, until it's towed away.
 *
 * The fire service: a fire station east of the hangars with two crash
 * tenders (vehicles/airsidecars.js). For each fire one or two race out,
 * sirens going, along the airside road, pull up beside it and play their
 * monitors on it until it's out, then go home and back into their bays.
 * They drive along paths, with no physics, until Jay takes one; then it's
 * his. A new one turns up in the empty bay when nobody's looking.
 *
 * Fuel bowsers: shot, they leak (a jet of fuel, a spreading puddle) and a
 * few seconds later go up, and set off anything near them.
 *
 * Cars: every airliner on the ground, every wreck and every ground vehicle
 * is a few boxes in vehicles.movers, so a car hitting one stops (and a hard
 * hit dents the plane).
 *
 * Ground vehicles Jay can take: the baggage tug (its carts stay), the
 * catering truck and the follow-me car. Walk up to one and a real one stands
 * in its place (its driver in it if it was at work); walk off and it goes
 * back to work.
 *
 * Response: shooting an airliner is a crime (two stars), a burning one three;
 * a ground stop while anything burns; the boards show the flights Cancelled.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, dampAngle, wrapAngle } = VH.math;
  const PI = Math.PI;
  const HALF = PI / 2;

  // ------------------------------------------------------------ tuning
  const APRON = { x: -230, z: -1320 };
  const NEAR = 900; //        Jay this close to the apron: the apron's havoc is live
  const ENG_HP = 260; //      an engine: smoking at half this, burning at it (a pistol: eight shots)
  const BODY_HP = 520; //     shot this much (or an engine burning), a plane is disabled
  const BODY_FIRE = 1300; //  ... and this much, the body catches
  const SPREAD = 18; //       seconds an engine burns hard before the wing catches
  const BURN_OUT = 12; //     seconds a big body fire burns, everyone off, before the fireball
  const WRECK_T = 210; //     a wreck is cleared this long after, when nobody's looking
  const TOW_T = 150; //       a disabled plane, cold and empty, is towed away this long after
  const EVAC_CAP = 16; //     evacuees running about at once (the rest go unseen)
  const WATER = 0.055; //     how fast one fire engine puts out a fire (intensity a second)
  const PRICE = { hit: 850, engine: 1250000, slides: 60000, airliner: 48000000, bowser: 180000, dent: 5000 };

  // The fire station, east of Hangar 2 on the GA apron: two bays, doors north.
  const STATION = { x0: 288, x1: 326, z0: -1262, z1: -1226, h: 7.6 };
  const BAYS = [{ x: 297.5, z: -1244 }, { x: 316.5, z: -1244 }];
  const LANE = -1309; //      the fire engines' way along the apron: just north of the airside road (z -1300)

  // An Albatross in its own frame (nose +z, port +x, the ground at y 0): the fuselage loft (as
  // models/albatross.js), and the boxes a bullet or a car can hit.
  const LOFT = [
    { z: 19.05, w: 0.04, h: 0.04, y: 3.22 },
    { z: 18.7, w: 0.6, h: 0.68, y: 3.28 },
    { z: 18.0, w: 1.14, h: 1.28, y: 3.4 },
    { z: 17.0, w: 1.58, h: 1.74, y: 3.5 },
    { z: 15.5, w: 1.94, h: 2.04, y: 3.57 },
    { z: 13.5, w: 2.08, h: 2.15, y: 3.6 },
    { z: -9.0, w: 2.08, h: 2.15, y: 3.6 },
    { z: -12.0, w: 1.98, h: 1.94, y: 3.76 },
    { z: -14.5, w: 1.6, h: 1.48, y: 4.16 },
    { z: -16.6, w: 1.06, h: 0.94, y: 4.56 },
    { z: -18.3, w: 0.5, h: 0.44, y: 4.86 },
    { z: -19.0, w: 0.24, h: 0.22, y: 4.96 },
  ];
  const PARTS = [
    { part: 'body', x0: -2.1, x1: 2.1, y0: 1.4, y1: 5.8, z0: -19.1, z1: 19.1, loft: true },
    { part: 'eng', i: 0, x0: 5.9, x1: 7.3, y0: 0.78, y1: 2.12, z0: 0.5, z1: 6.1, cyl: 6.6 },
    { part: 'eng', i: 1, x0: -7.3, x1: -5.9, y0: 0.78, y1: 2.12, z0: 0.5, z1: 6.1, cyl: -6.6 },
    { part: 'wing', x0: 2.0, x1: 6.6, y0: 2.2, y1: 2.85, z0: -3.2, z1: 5.2 },
    { part: 'wing', x0: -6.6, x1: -2.0, y0: 2.2, y1: 2.85, z0: -3.2, z1: 5.2 },
    { part: 'wing', x0: 6.6, x1: 11.8, y0: 2.5, y1: 3.2, z0: -5.7, z1: 2.4 },
    { part: 'wing', x0: -11.8, x1: -6.6, y0: 2.5, y1: 3.2, z0: -5.7, z1: 2.4 },
    { part: 'wing', x0: 11.8, x1: 17.3, y0: 2.9, y1: 3.7, z0: -8.2, z1: -1.9 },
    { part: 'wing', x0: -17.3, x1: -11.8, y0: 2.9, y1: 3.7, z0: -8.2, z1: -1.9 },
    { part: 'tail', x0: -0.45, x1: 0.45, y0: 4.9, y1: 11.4, z0: -19.3, z1: -12.4 },
    { part: 'tail', x0: -6.6, x1: 6.6, y0: 4.65, y1: 5.35, z0: -18.4, z1: -14.3 },
    { part: 'gear', x0: 2.6, x1: 3.4, y0: 0, y1: 2.0, z0: -1.4, z1: 1.0 },
    { part: 'gear', x0: -3.4, x1: -2.6, y0: 0, y1: 2.0, z0: -1.4, z1: 1.0 },
  ];
  // The colliders a car meets (the body down low, so nothing squeezes under the belly).
  const SOLID = [
    { x: 0, z: 2.0, hx: 2.05, hz: 16.6, y0: 1.0, y1: 5.8 },
    { x: 0, z: -15.6, hx: 1.3, hz: 3.3, y0: 3.0, y1: 5.6 },
    { x: 6.6, z: 3.3, hx: 0.68, hz: 2.8, y0: 0.78, y1: 2.12 },
    { x: -6.6, z: 3.3, hx: 0.68, hz: 2.8, y0: 0.78, y1: 2.12 },
    { x: 3.0, z: -0.2, hx: 0.5, hz: 1.2, y0: 0, y1: 2.0 },
    { x: -3.0, z: -0.2, hx: 0.5, hz: 1.2, y0: 0, y1: 2.0 },
    { x: 4.3, z: 1.0, hx: 2.3, hz: 4.2, y0: 2.2, y1: 2.9 },
    { x: -4.3, z: 1.0, hx: 2.3, hz: 4.2, y0: 2.2, y1: 2.9 },
    { x: 9.2, z: -1.6, hx: 2.6, hz: 4.0, y0: 2.5, y1: 3.2 },
    { x: -9.2, z: -1.6, hx: 2.6, hz: 4.0, y0: 2.5, y1: 3.2 },
    { x: 14.5, z: -5.0, hx: 2.8, hz: 3.2, y0: 2.9, y1: 3.7 },
    { x: -14.5, z: -5.0, hx: 2.8, hz: 3.2, y0: 2.9, y1: 3.7 },
  ];
  // The doors with slides (z, side, sill). The front port one is the bridge's (or the stairs').
  const DOORS = [
    { z: 15.0, s: -1, y: 3.0 },
    { z: -11.9, s: 1, y: 3.25 },
    { z: -11.9, s: -1, y: 3.25 },
    { z: 15.0, s: 1, y: 3.0 },
  ];
  const SLIDE_RUN = 5.6; //   how far out a slide reaches
  // Where the fire is, by part: [x, y, z] in the plane's frame.
  const FIRE_AT = [[6.6, 1.6, 2.2], [-6.6, 1.6, 2.2], [0, 3.8, 2.5]];
  // Half widths of the ground vehicles (airside.js KINDS has their lengths and heights).
  const GSE_W = { tug: 1.37, train: 0.72, bagtug: 0.72, belt: 0.87, cater: 1.2, fuel: 1.15, stairs: 1.15, followme: 1.0, van: 1.0 };
  // The ones Jay can take, and what they become.
  const TAKE = { train: 'bagtug', cater: 'caterer', followme: 'followme' };

  const rnd = (a, b) => a + Math.random() * (b - a);
  const money = (n) => '$' + Math.round(n).toLocaleString('en-GB');
  const _o = { x: 0, z: 0, h: 0 };
  const _w = { x: 0, z: 0 };
  const _l = { x: 0, z: 0 };

  /** A point in a plane's frame (toLocal) under its body or wings, give or take m metres? */
  function planeFoot(L, m) {
    if (Math.abs(L.z) < 19 + m && Math.abs(L.x) < 2.2 + m) return true;
    return L.z > -8.5 - m && L.z < 6 + m && Math.abs(L.x) < 17.3 + m && L.z < 5.5 - Math.abs(L.x) * 0.55 + m;
  }

  /** The plane's frame: a world point to local (x left/port, z forward). */
  function toLocal(px, pz, yaw, x, z, out) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const dx = x - px;
    const dz = z - pz;
    out.x = dx * c - dz * s;
    out.z = dx * s + dz * c;
    return out;
  }
  /** ... and back. */
  function toWorld(px, pz, yaw, lx, lz, out) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    out.x = px + lx * c + lz * s;
    out.z = pz - lx * s + lz * c;
    return out;
  }

  /** A ray against an axis-aligned box: the distance in (0 if it starts inside), or -1. */
  function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1, maxT) {
    let t0 = 0;
    let t1 = maxT;
    const slab = (o, d, lo, hi) => {
      if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
      let a = (lo - o) / d;
      let b = (hi - o) / d;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
      return t0 <= t1;
    };
    if (!slab(ox, dx, x0, x1) || !slab(oy, dy, y0, y1) || !slab(oz, dz, z0, z1)) return -1;
    return t0;
  }

  /** The fuselage's cross-section at z: { w, h, y } (half width, half height, centre). */
  function loftAt(z) {
    if (z >= LOFT[0].z || z <= LOFT[LOFT.length - 1].z) return null;
    for (let i = 1; i < LOFT.length; i++) {
      const a = LOFT[i - 1];
      const b = LOFT[i];
      if (z <= a.z && z >= b.z) {
        const k = (a.z - z) / (a.z - b.z || 1);
        return { w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k), y: lerp(a.y, b.y, k) };
      }
    }
    return null;
  }

  // ------------------------------------------------------- the evacuees
  /** A passenger (or one of the crew) off the slide: run from the plane, then mill about and go. */
  class EvacBrain {
    constructor(dx, dz, crew) {
      this.dx = dx;
      this.dz = dz;
      this.crew = crew;
      this.t = 0;
      this.runT = rnd(5, 9);
      this.life = rnd(26, 38);
      this.gone = false;
      this.witness = true; // (they tell the police what they saw)
      this.ph = Math.random() * 6;
    }

    update(a, dt) {
      this.t += dt;
      const an = a.anim;
      an.handsUp = an.talk = an.cower = an.aim = an.crouch = 0;
      an.phone = 0;
      const want = Math.atan2(this.dx, this.dz) + Math.sin(this.t * 0.7 + this.ph) * 0.35;
      a.heading = dampAngle(a.heading, want, 5, dt);
      if (this.t < this.runT) {
        a.moveSpeed = 4.4 + (a.id % 4) * 0.25;
        an.sprint = true;
        // (Arms up for the first second or two, as they run from it.)
        if (this.t < 1.6 && !this.crew) an.handsUp = 0.5;
      } else {
        an.sprint = false;
        a.moveSpeed = this.t < this.runT + 8 ? 1.6 : 0.9;
        if (!this.crew && (a.id % 3 === 0)) an.phone = 1; // filming it, or phoning home
        if (this.crew && this.t > this.runT + 2) an.handsUp = 0.55 + 0.45 * Math.sin(this.t * 5); // waving everyone back
      }
      if (this.t > this.life) this.gone = true;
    }

    expired(a, d) {
      return this.gone || d > 220;
    }
  }

  // ======================================================== the apron's part
  class Air {
    constructor(havoc) {
      this.h = havoc;
      const g = (this.game = havoc.game);
      this.ok = !!(g.airside && g.airside.ok && typeof g.airside.planes === 'function' && g.scene);
      this.n = { planes: 0, burnt: 0, slid: 0, out: 0, bowsers: 0, taken: 0 };
      this.S = new Map(); //    Airliner → its damage (see _st)
      this.wrecks = []; //      burnt-out planes taken off airside's books (a wreck on a stand)
      this.bowsers = new Map(); // Gse → { hits, leak, ... }
      this.junk = []; //        burnt-out bowsers { mesh, t, x, z }
      this.fires = []; //       { kind: 'plane'|'ground', S, x, y, z, i, wet, ... } for the fire service
      this.swaps = []; //       { g, v, t }: a ground vehicle with a real one standing in for it
      this.sliders = []; //     { a, S, d, t }: evacuees on their way down a slide
      this.evacuees = []; //    the agents (to count them)
      this.engines = BAYS.map((b, i) => ({ i, bay: b, v: null, state: 'none', path: null, legs: [], s: 0, spd: 0, target: null }));
      this.movers = []; //      vehicles.movers (rebuilt each frame)
      this._mv = new Map(); //  pooled mover records
      this._t = 0;
      this._awayT = 0;
      this._live = false;
      this._blasts = []; //     delayed explosions (bowsers going up one after another)
      this._paT = -999;
      this._held = false;
      this._shot = new Set(); // planes Jay has been seen shooting (the crime once each)
      if (!this.ok) return;
      this._mats();
      this._buildHoles();
      this._buildStation();
      this._bind();
    }

    // ------------------------------------------------------------ set up
    _mats() {
      this.M = {
        // (The plane's own colours, scorched almost black: the paint bands still just show.)
        char: new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x5a544e, roughness: 1, metalness: 0, emissive: 0x1c0700, emissiveIntensity: 1 }),
        charGse: new THREE.MeshStandardMaterial({ color: 0x24211e, roughness: 0.95, metalness: 0.1 }),
        slide: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0 }),
        puddle: new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.75, depthWrite: false }),
        hole: new THREE.MeshBasicMaterial({ color: 0x0b0b0b, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      };
      // A slide: the inflated bed, its two side tubes and the run-out at the foot, from the sill
      // (the origin) outward along +z and down (sill height 3.1).
      const k = new VH.AircraftKit();
      const Y = 0xf2c61f;
      const drop = 3.1;
      const len = Math.hypot(SLIDE_RUN, drop);
      const ang = Math.atan2(drop, SLIDE_RUN);
      k.box(1.7, 0.22, len, 0, -drop / 2, SLIDE_RUN / 2, Y, ang);
      for (const s of [1, -1]) k.cyl(0.24, 0.24, len, 10, s * 0.92, -drop / 2 + 0.16, SLIDE_RUN / 2, 0xf0b81a, ang);
      k.box(2.3, 0.4, 1.4, 0, -drop + 0.2, SLIDE_RUN + 0.6, 0xf0b81a);
      k.box(2.2, 0.5, 0.5, 0, 0.1, 0.15, 0xf0b81a); // the girt at the door
      this.slideGeo = k.geometry();
    }

    _buildHoles() {
      const m = (this.holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.075, 8), this.M.hole, 320));
      m.name = 'airliner bullet holes';
      m.count = 0;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.game.scene.add(m);
      this.holeList = []; // { S, x, y, z, nx, ny, nz } in the plane's frame
      this._hm = new THREE.Matrix4();
      this._hq = new THREE.Quaternion();
      this._hv = new THREE.Vector3();
      this._hn = new THREE.Vector3();
      this._hs = new THREE.Vector3(1, 1, 1);
      this._zAxis = new THREE.Vector3(0, 0, 1);
      this._yAxis = new THREE.Vector3(0, 1, 0);
      this._hq2 = new THREE.Quaternion();
    }

    /** The fire station: two bays with their doors rolled up, a red band, a sign; walls are solid. */
    _buildStation() {
      const g = this.game;
      const w = g.world;
      if (!w || !w.airfield || !VH.AircraftKit) return;
      const S = STATION;
      const k = new VH.AircraftKit();
      const WALL = 0xe4dfd4;
      const RED = 0xc8202a;
      const DARK = 0x3a3d42;
      const H = S.h;
      const midX = (S.x0 + S.x1) / 2;
      const midZ = (S.z0 + S.z1) / 2;
      const L = (x0, y0, z0, x1, y1, z1, c) => k.box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2 - midX, (y0 + y1) / 2, (z0 + z1) / 2 - midZ, c);
      const solid = (x0, y0, z0, x1, y1, z1, c) => {
        L(x0, y0, z0, x1, y1, z1, c);
        w.physics.addBox(x0, Math.min(0, y0), z0, x1, y1, z1, 'building', VH.COLLIDE.ALL);
      };
      L(S.x0, 0, S.z0, S.x1, 0.06, S.z1, 0xa9a7a0); //           the floor
      solid(S.x0, 0, S.z1 - 0.5, S.x1, H, S.z1, WALL); //        back wall
      solid(S.x0, 0, S.z0, S.x0 + 0.6, H, S.z1, WALL); //        side walls
      solid(S.x1 - 0.6, 0, S.z0, S.x1, H, S.z1, WALL);
      solid(306.6, 0, S.z0 + 6, 307.4, H, S.z1, WALL); //        between the bays
      for (const [x0, x1] of [[S.x0, 290.2], [305.6, 308.4], [323.8, S.x1]]) solid(x0, 0, S.z0, x1, H, S.z0 + 0.8, WALL); // the piers
      L(S.x0, 6.2, S.z0, S.x1, H, S.z0 + 0.8, WALL); //          over the doors
      L(S.x0 - 0.1, 6.5, S.z0 - 0.12, S.x1 + 0.1, 7.2, S.z0 + 0.2, RED); // the red band
      for (const [x0, x1] of [[290.2, 305.6], [308.4, 323.8]]) {
        L(x0, 5.75, S.z0 + 0.5, x1, 6.2, S.z0 + 1.2, 0x9aa1a8); //  the doors, rolled up
        L(x0, 0.02, S.z0 + 0.8, x1, 0.07, S.z0 + 1.0, 0xe0b12e); // a yellow line at the threshold
      }
      L(S.x0 - 0.3, H, S.z0 - 0.3, S.x1 + 0.3, H + 0.45, S.z1 + 0.3, 0xcfcac0); // the roof
      w.physics.addBox(S.x0, H, S.z0, S.x1, H + 0.45, S.z1, 'building', VH.COLLIDE.ALL);
      L(S.x0 + 0.6, H - 0.15, S.z0 + 0.8, S.x1 - 0.6, H, S.z1 - 0.5, 0xe9e6df); // ceiling
      // Inside: lockers along the back, hose racks, a bench.
      for (let x = S.x0 + 2; x < S.x1 - 2; x += 2.4) if (Math.abs(x - 307) > 1.6) L(x - 1, 0, S.z1 - 1.3, x + 1, 2.1, S.z1 - 0.5, x % 4.8 < 2.4 ? RED : DARK);
      // The tower lamp on the roof (a red light).
      L(S.x1 - 4, H + 0.45, S.z0 + 3, S.x1 - 3, H + 2.6, S.z0 + 4, DARK);
      const mesh = new THREE.Mesh(k.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05 }));
      mesh.position.set(midX, 0, midZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = 'airport fire station';
      g.scene.add(mesh);
      // The name over the doors.
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = '#c8202a';
      x.fillRect(0, 0, 512, 64);
      x.fillStyle = '#ffffff';
      x.font = 'bold 38px Arial, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('AIRPORT FIRE & RESCUE', 256, 34);
      const tex = new THREE.CanvasTexture(c);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.75), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(midX, 6.85, S.z0 - 0.14);
      sign.rotation.y = PI;
      sign.name = 'fire station sign';
      g.scene.add(sign);
      this.station = { mesh, sign };
    }

    _bind() {
      const E = VH.events;
      E.on('combat:ray', (e) => this._ray(e));
      E.on('explosion', (e) => this._blast(e));
      E.on('vehicle:enter', (e) => this._entered(e && e.v));
    }

    /** Where Jay is (his car when he's driving). */
    jay() {
      return this.h.jay();
    }

    get airside() {
      return this.game.airside;
    }

    /** By Jay? (a blast's source, a car's driver) */
    _byJay(src) {
      return src === 'player' || !!(src && (src.driver === 'player' || src.lastHitBy === 'player'));
    }

    // ============================================================ airliners
    /** This plane's damage record, made the first time it's hurt. */
    _st(p) {
      const pl = p.plane;
      let S = this.S.get(pl);
      if (!S) {
        S = {
          pl, api: p, eng: [0, 0], body: 0, fire: [0, 0, 0], fireT: [0, 0, 0], wet: 0, disabled: false,
          evac: null, empty: false, burnT: 0, burnt: false, jay: false, t0: this._t, disT: 0, coldT: 0, rec: null,
          group: null, slides: [], pose: { x: pl.x, y: pl.y, z: pl.z, yaw: pl.yaw }, voice: null, stand: null, wreck: null,
          gone: false, smoked: false,
        };
        this.S.set(pl, S);
      }
      return S;
    }

    _onGround(pl) {
      return pl.y < 2 && pl.phase !== 'approach' && pl.phase !== 'climb' && pl.phase !== 'goaround';
    }

    /**
     * A bullet (combat:ray): the nearest plane part along it that it reached (it went on
     * through the plane, as far as the physics let it: planes aren't in the physics).
     */
    _ray(e) {
      if (!this._live || !e) return;
      const { ox, oy, oz, dx, dy, dz } = e;
      const dist = Math.max(0, e.dist || 0) + 0.6;
      const g = this.game;
      if (g.cabin && g.cabin.aboard) return; // (shots inside a cabin are cabin.js's)
      const best = this._rayPlanes(ox, oy, oz, dx, dy, dz, dist);
      // (A ground vehicle in front of it takes the bullet instead.)
      if (this._rayGse(e, best ? best.t : dist) || !best) return;
      this._hitPlane(best, { x: ox + dx * best.t, y: oy + dy * best.t, z: oz + dz * best.t, dx, dy, dz });
    }

    /**
     * For combat.js's rockets and grenades (and their aim): how far along a ray (unit d) the
     * first airliner is, within dist, or -1. They go off on it, and _blast does the rest.
     */
    rayPlanes(ox, oy, oz, dx, dy, dz, dist) {
      if (!this._live) return -1;
      const best = this._rayPlanes(ox, oy, oz, dx, dy, dz, dist);
      return best ? best.t : -1;
    }

    /** The nearest plane part along a ray, within dist: { p, P, t, lx, ly, lz, nx, ny, nz } or null. */
    _rayPlanes(ox, oy, oz, dx, dy, dz, dist) {
      const A = this.airside;
      let best = null;
      let bestT = dist;
      const L = { x: 0, z: 0 };
      for (const p of A.planes()) {
        const pl = p.plane;
        if (pl.disabled && this.S.get(pl) && this.S.get(pl).burnt) continue;
        // Quick: is the ray anywhere near it?
        const cx = pl.x;
        const cz = pl.z;
        const tc = (cx - ox) * dx + (pl.y + 4 - oy) * dy + (cz - oz) * dz;
        if (tc < -25 || tc > bestT + 25) continue;
        const qx = ox + dx * tc - cx;
        const qy = oy + dy * tc - pl.y - 4;
        const qz = oz + dz * tc - cz;
        if (qx * qx + qy * qy + qz * qz > 26 * 26) continue;
        // Into its frame.
        toLocal(cx, cz, pl.yaw, ox, oz, L);
        const lox = L.x;
        const loz = L.z;
        const c = Math.cos(pl.yaw);
        const s = Math.sin(pl.yaw);
        const ldx = dx * c - dz * s;
        const ldz = dx * s + dz * c;
        const loy = oy - pl.y;
        for (const P of PARTS) {
          let t = rayBox(lox, loy, loz, ldx, dy, ldz, P.x0, P.y0, P.z0, P.x1, P.y1, P.z1, bestT);
          if (t < 0) continue;
          let nx = -ldx;
          let ny = -dy;
          let nz = -ldz;
          if (P.loft) {
            // The real skin: step on through the box to where it meets the loft's ellipse.
            const hit = this._loftHit(lox, loy, loz, ldx, dy, ldz, t, Math.min(bestT, t + 6));
            if (!hit) continue;
            t = hit.t;
            nx = hit.nx;
            ny = hit.ny;
            nz = 0;
          } else if (P.cyl !== undefined) {
            // A nacelle: round, about its axis.
            const hit = this._cylHit(lox, loy, loz, ldx, dy, ldz, t, Math.min(bestT, t + 2), P.cyl, 1.45, 0.66);
            if (!hit) continue;
            t = hit.t;
            nx = hit.nx;
            ny = hit.ny;
            nz = 0;
          }
          if (t < bestT) {
            bestT = t;
            best = { p, P, t, lx: lox + ldx * t, ly: loy + dy * t, lz: loz + ldz * t, nx, ny, nz };
          }
        }
      }
      return best;
    }

    /** Along a ray in the plane's frame from t0, where it first meets the fuselage skin (or null). */
    _loftHit(ox, oy, oz, dx, dy, dz, t0, t1) {
      const step = 0.12;
      let prev = null;
      for (let t = t0; t <= t1; t += step) {
        const x = ox + dx * t;
        const y = oy + dy * t;
        const z = oz + dz * t;
        const L = loftAt(z);
        const f = L ? (x * x) / (L.w * L.w) + ((y - L.y) * (y - L.y)) / (L.h * L.h) : 9;
        if (f <= 1) {
          if (prev === null) return null; // (it starts inside the plane)
          // Refine between the last step and this one.
          let a = prev === null ? t : t - step;
          let b = t;
          for (let k = 0; k < 6; k++) {
            const m = (a + b) / 2;
            const zz = oz + dz * m;
            const LL = loftAt(zz);
            const xx = ox + dx * m;
            const yy = oy + dy * m;
            const ff = LL ? (xx * xx) / (LL.w * LL.w) + ((yy - LL.y) * (yy - LL.y)) / (LL.h * LL.h) : 9;
            if (ff <= 1) b = m;
            else a = m;
          }
          const xx = ox + dx * b;
          const yy = oy + dy * b;
          const LL = loftAt(oz + dz * b) || L;
          let nx = xx / (LL.w * LL.w);
          let ny = (yy - LL.y) / (LL.h * LL.h);
          const l = Math.hypot(nx, ny) || 1;
          nx /= l;
          ny /= l;
          return { t: b, nx, ny };
        }
        prev = t;
      }
      return null;
    }

    /** ... and a nacelle (a cylinder along z at (cx, cy), radius r). */
    _cylHit(ox, oy, oz, dx, dy, dz, t0, t1, cx, cy, r) {
      for (let t = t0; t <= t1; t += 0.06) {
        const x = ox + dx * t - cx;
        const y = oy + dy * t - cy;
        if (x * x + y * y <= r * r) {
          const l = Math.hypot(x, y) || 1;
          return { t, nx: x / l, ny: y / l };
        }
      }
      return null;
    }

    /** A bullet in a plane: sparks, a hole, the damage. */
    _hitPlane(b, w) {
      const g = this.game;
      const fx = g.fx;
      const p = b.p;
      const pl = p.plane;
      const S = this._st(p);
      S.jay = true;
      // Sparks off the skin, and a hole in it.
      const nw = toWorld(0, 0, pl.yaw, b.nx, b.nz, _w);
      if (fx) {
        fx.sparks(w.x, w.y, w.z, nw.x, nw.z, 9, 5);
        if (fx.impact) fx.impact(w.x, w.y, w.z, nw.x, b.ny, nw.z, 'metal');
      }
      this._hole(S, b.lx, b.ly, b.lz, b.nx, b.ny, b.nz);
      this._ping(w.x, w.z);
      const wpn = g.combat && g.combat.weapon;
      const dmg = (wpn && wpn.damage) || 25;
      this._hurt(S, b.P.part === 'eng' ? b.P.i : -1, dmg * (b.P.part === 'eng' ? 1 : b.P.part === 'body' ? 1 : 0.6), 'player');
      // More bullets into a fire: it burns harder.
      const fi = b.P.part === 'eng' ? b.P.i : 2;
      if (S.fire[fi] > 0) S.fire[fi] = Math.min(fi === 2 && !S.empty ? 0.62 : 1, S.fire[fi] + dmg * 0.0015);
      this.h.damage(PRICE.hit, w.x, w.z);
      // Shot at on the takeoff roll: it aborts.
      if (pl.phase === 'takeoff' && this.airside.abortTakeoff) this.airside.abortTakeoff(p);
      if (!this._shot.has(pl)) {
        this._shot.add(pl);
        this._crime('shootPlane', w.x, w.z, 2);
      }
    }

    /** Damage to a plane: engine i (or the body: -1). by: 'player' or null. */
    _hurt(S, i, dmg, by) {
      const pl = S.pl;
      if (S.burnt || pl.gone) return;
      if (by === 'player') S.jay = true;
      const ground = this._onGround(pl);
      if (i >= 0) {
        S.eng[i] += dmg;
        if (S.eng[i] >= ENG_HP * 0.5) S.smoked = true;
        if (S.eng[i] >= ENG_HP) {
          if (ground) this._ignite(S, i, 0.3);
          this._disable(S);
        }
      } else {
        S.body += dmg;
        if (S.body >= BODY_HP) this._disable(S);
        if (S.body >= BODY_FIRE && ground) this._ignite(S, 2, 0.25);
      }
    }

    /** Stop it where it is (in the air: it gives up and diverts). */
    _disable(S) {
      if (S.disabled) return;
      S.disabled = true;
      S.disT = this._t;
      S.api.disabled = true;
      this.n.planes++;
    }

    /** Fire at part i (0, 1 the engines, 2 the body). */
    _ignite(S, i, k) {
      if (S.burnt || !this._onGround(S.pl)) return;
      const first = !S.fire.some((f) => f > 0);
      if (S.fire[i] <= 0) {
        S.fireT[i] = 0;
        if (i < 2) this.h.damage(PRICE.engine, S.pl.x, S.pl.z);
      }
      S.fire[i] = Math.max(S.fire[i], k);
      S.coldT = 0;
      this._disable(S);
      if (first) {
        if (S.jay) this._crime('planeFire', S.pl.x, S.pl.z, 3);
        // (Not "stay inside" while the terminal's own alert is telling everyone to get out.)
        this._announce('Attention please. Due to an incident on the airfield, all flights are suspended.' + (this.h.alert ? '' : ' Please remain inside the terminal.'));
      }
    }

    // ------------------------------------------------------------ the slides
    /** Out with the slides (the doors that aren't on a bridge or the stairs). */
    _slidesOut(S) {
      const g = this.game;
      const pl = S.pl;
      const grp = (S.group = new THREE.Group());
      grp.name = 'evacuation slides';
      g.scene.add(grp);
      const parked = pl.phase === 'parked';
      S.slides = [];
      for (const d of DOORS) {
        if (parked && d.s === 1 && d.z > 0) continue; // the bridge (or the stairs) is at that one
        const m = new THREE.Mesh(this.slideGeo, this.M.slide);
        m.position.set(d.s * 2.0, d.y, d.z);
        m.rotation.y = d.s * HALF;
        m.scale.set(0.2, 0.05, 0.05);
        m.castShadow = true;
        m.receiveShadow = true;
        grp.add(m);
        S.slides.push({ d, m, k: 0, next: rnd(1.4, 2.2) });
      }
      this._poseGroup(S);
      this._whoosh(pl.x, pl.z);
      this.h.damage(PRICE.slides, pl.x, pl.z);
    }

    _poseGroup(S) {
      if (!S.group) return;
      const q = S.pose;
      S.group.position.set(q.x, q.y, q.z);
      S.group.rotation.set(0, q.yaw, 0);
    }

    _dropSlides(S) {
      if (S.group) S.group.removeFromParent();
      S.group = null;
      S.slides = [];
    }

    /** Down the slides, two or so a second from each, till everyone's off. */
    _evacTick(S, dt) {
      const E = S.evac;
      E.t += dt;
      for (const sl of S.slides) {
        // Inflating: out, then fat.
        if (sl.k < 1) {
          sl.k = Math.min(1, sl.k + dt / 1.3);
          const a = Math.min(1, sl.k * 1.6);
          const b = clamp((sl.k - 0.3) / 0.7, 0, 1);
          sl.m.scale.set(lerp(0.3, 1, b), lerp(0.08, 1, b), lerp(0.08, 1, a));
          continue;
        }
        if (E.left <= 0) continue;
        sl.next -= dt;
        if (sl.next > 0) continue;
        sl.next = rnd(0.35, 0.6);
        E.left--;
        this.n.slid++;
        this._slideDown(S, sl.d, E.left < 6);
      }
      if (E.left <= 0 && !S.empty) {
        S.empty = true;
        S.emptyT = this._t;
        S.pl.emptied = true;
      }
    }

    /** One person down a slide (a real one if there's room and Jay's near enough to see). */
    _slideDown(S, d, crew) {
      const g = this.game;
      if (!g.crowd || this.evacuees.length >= EVAC_CAP) return;
      const q = S.pose;
      const j = this.jay();
      if (Math.hypot(j.x - q.x, j.z - q.z) > 170) return;
      const top = toWorld(q.x, q.z, q.yaw, d.s * 2.3, d.z, {});
      const L = VH.Crowd && VH.Crowd.randomLook ? VH.Crowd.randomLook() : {};
      if (crew) Object.assign(L, { top: 0x1d2a44, shirt: 0xf4f4f1, bottom: 0x1d2a44, trim: 0xf2c61f, cap: false });
      const out = toWorld(0, 0, q.yaw, d.s, rnd(-0.3, 0.3), {});
      const a = g.crowd.spawn(top.x, top.z, { look: L, persistent: true, role: 'evacuee', name: crew ? 'Cabin crew' : 'Passenger', heading: Math.atan2(out.x, out.z), y: q.y + d.y });
      a.brain = new EvacBrain(out.x, out.z, crew);
      a.held = { x: top.x, y: q.y + d.y + 0.15, z: top.z, heading: a.heading };
      this.sliders.push({ a, S, d, t: 0 });
      this.evacuees.push(a);
    }

    _slidersTick(dt) {
      for (let i = this.sliders.length - 1; i >= 0; i--) {
        const s = this.sliders[i];
        const a = s.a;
        s.t += dt;
        if (a.removed || a.dead) {
          a.held = null;
          this.sliders.splice(i, 1);
          continue;
        }
        const q = s.S.pose;
        const k = Math.min(1, s.t / 1.05);
        const e = k * k * (1.6 - 0.6 * k); // (slow off the sill, then away)
        const lx = s.d.s * (2.3 + (SLIDE_RUN + 0.6) * e);
        const y = q.y + lerp(s.d.y + 0.15, 0.25, e);
        const w = toWorld(q.x, q.z, q.yaw, lx, s.d.z, _w);
        a.held = { x: w.x, y, z: w.z, heading: a.heading };
        a.anim.crouch = 0.75;
        if (k >= 1) {
          a.held = null;
          a.pos.y = this.game.physics.groundHeight(w.x, w.z, y + 1);
          a.anim.crouch = 0;
          this.sliders.splice(i, 1);
        }
      }
      for (let i = this.evacuees.length - 1; i >= 0; i--) if (this.evacuees[i].removed || this.evacuees[i].dead) this.evacuees.splice(i, 1);
    }

    // ------------------------------------------------------------- burning
    _planesTick(dt) {
      const A = this.airside;
      const fx = this.game.fx;
      for (const [pl, S] of this.S) {
        if (S.wreck) {
          this._wreckTick(S, dt);
          continue;
        }
        if (pl.gone) {
          this._forget(S);
          continue;
        }
        const q = S.pose;
        q.x = pl.x;
        q.y = pl.y;
        q.z = pl.z;
        q.yaw = pl.yaw;
        this._poseGroup(S);
        const ground = this._onGround(pl);
        // Smoke from a hurt engine (on the ground or trailing behind in the air).
        if (fx && pl.model) {
          for (let i = 0; i < 2; i++) {
            if (S.eng[i] < ENG_HP * 0.5 || S.fire[i] > 0) continue;
            if (Math.random() < dt * 14) {
              const w = toWorld(q.x, q.z, q.yaw, FIRE_AT[i][0], 0.4, _w);
              fx.engineSmoke(w.x, q.y + 1.6, w.z, clamp(S.eng[i] / ENG_HP, 0.3, 1), -Math.sin(q.yaw) * pl.v * 0.5, -Math.cos(q.yaw) * pl.v * 0.5);
            }
          }
        }
        if (!ground) continue;
        // Disabled and stopped: out with the slides, everyone off.
        if (S.disabled && !S.evac && pl.v < 0.4) {
          const pax = pl.pax || 0;
          if (pax > 0 || !pl.rot.cargo) {
            S.evac = { left: pax + 6, t: 0 };
            this._slidesOut(S);
          } else {
            // (A freighter: two crew, down the stairs and off.)
            S.evac = { left: 0, t: 0 };
            S.empty = true;
            S.emptyT = this._t;
          }
        }
        if (S.evac) this._evacTick(S, dt);
        this._fireTick(S, dt);
        // Cold and empty a while: towed away (out of sight).
        const burning = S.fire.some((f) => f > 0);
        if (!burning && S.disabled && S.empty) {
          S.coldT += dt;
          if ((S.coldT > TOW_T && this._unseen(q.x, q.z, 30)) || S.coldT > TOW_T * 3) this._tow(S);
        } else S.coldT = 0;
      }
    }

    /** The fires on a plane: they grow, spread, get put out; a big one with everyone off burns it out. */
    _fireTick(S, dt) {
      const f = S.fire;
      const fx = this.game.fx;
      const q = S.pose;
      const wet = S.wet;
      S.wet = 0;
      let any = false;
      for (let i = 0; i < 3; i++) {
        if (f[i] <= 0) continue;
        S.fireT[i] += dt;
        // (Till everyone's off, the body fire is held back: they always get out first.)
        const cap = i === 2 && !S.empty ? 0.62 : 1;
        const grow = i < 2 ? 0.03 : S.empty && f[i] > 0.55 ? 0.04 : 0.024;
        f[i] = Math.min(cap, f[i] + grow * dt) - wet;
        if (f[i] <= (wet > 0 ? 0.04 : 0)) {
          f[i] = 0;
          if (wet > 0) this._steam(S, i);
          continue;
        }
        any = true;
        // An engine burning hard a while: the wing, then the body, catch.
        if (i < 2 && f[i] > 0.55 && S.fireT[i] > SPREAD && f[2] <= 0) this._ignite(S, 2, 0.2);
      }
      if (any && fx) this._fireFx(S, dt);
      // Burned out: everyone's off, the body's well alight and has been a while.
      if (f[2] >= 0.95 && S.empty) {
        S.burnT += dt;
        if (S.burnT > BURN_OUT) this._burnOut(S);
      } else S.burnT = Math.max(0, S.burnT - dt);
      // The fire's roar.
      const g = this.game;
      const top = Math.max(f[0], f[1], f[2]);
      if (top > 0 && !S.voice && g.audio && g.audio.ready && g.audio.createFire) S.voice = g.audio.createFire();
      if (S.voice) {
        if (top <= 0) {
          S.voice.stop();
          S.voice = null;
        } else {
          const fb = g.vehicleFeedback;
          S.voice.update({ gain: Math.min(1, top * 1.4) * (fb ? fb._gain(q.x, q.z, 30) : 0.3), pan: fb ? fb._pan(q.x, q.z) : 0 });
        }
      }
      void dt;
    }

    _fireFx(S, dt) {
      const fx = this.game.fx;
      const q = S.pose;
      const f = S.fire;
      for (let i = 0; i < 2; i++) {
        if (f[i] <= 0) continue;
        const n = Math.random() < dt * 40 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const w = toWorld(q.x, q.z, q.yaw, FIRE_AT[i][0] + rnd(-0.6, 0.6), rnd(0.6, 5.5), _w);
          fx.flame(w.x, q.y + rnd(1.0, 2.2), w.z, 0.8 + f[i] * 1.6);
        }
        if (f[i] > 0.5) {
          const w = toWorld(q.x, q.z, q.yaw, FIRE_AT[i][0] * rnd(0.7, 1.3), rnd(-3, 3), _w);
          fx.flame(w.x, q.y + 2.6, w.z, 0.6 + f[i]);
        }
        if (Math.random() < dt * 8) this._smoke(q.x + rnd(-2, 2), q.y + 3, q.z + rnd(-2, 2), 0.8 + f[i]);
      }
      if (f[2] > 0) {
        const n = 1 + Math.round(f[2] * 4);
        for (let k = 0; k < n; k++) {
          const z = rnd(-6, 8 + 6 * f[2]);
          const x = rnd(-1, 1) * (f[2] > 0.4 ? 9 : 4);
          const w = toWorld(q.x, q.z, q.yaw, x, z, _w);
          fx.flame(w.x, q.y + rnd(2.4, 3.6 + 2 * f[2]), w.z, 1 + f[2] * 2.4);
        }
        if (Math.random() < dt * (6 + f[2] * 10)) {
          const w = toWorld(q.x, q.z, q.yaw, rnd(-3, 3), rnd(-4, 8), _w);
          this._smoke(w.x, q.y + 5, w.z, 1.4 + f[2] * 2.2);
        }
      }
    }

    /** A puff of thick black smoke rising (s: how big). */
    _smoke(x, y, z, s) {
      const fx = this.game.fx;
      if (!fx || !fx.soft) return;
      fx.soft.emit({
        x, y, z, vx: rnd(-0.6, 0.6) + 1.2, vy: 3 + Math.random() * 2, vz: rnd(-0.6, 0.6),
        life: 5 + Math.random() * 3, size: 2 * s, size1: 9 * s, r: 0.07, g: 0.065, b: 0.06, a: 0.55, drag: 0.3, grav: -0.25,
      });
    }

    /**
     * A big bang that looks and sounds the part (scale) but, everyone being well clear by now,
     * only knocks over whoever's within r (cars nearby get it properly). by: 'player' or null.
     */
    _bang(x, y, z, scale, by, r) {
      const g = this.game;
      const fx = g.fx;
      if (fx) fx.explosion(x, y, z, scale);
      const fb = g.vehicleFeedback;
      if (fb && g.audio && g.audio.explosion) g.audio.explosion(1, fb._pan(x, z), fb._gain(x, z, 60));
      const cp = g.renderer.camera.position;
      if (g.cameraRig && g.cameraRig.addShake) g.cameraRig.addShake(clamp(1.4 - Math.hypot(x - cp.x, z - cp.z) / 90, 0, 1));
      for (const v of g.vehicles.list) {
        const d = Math.hypot(v.pos.x - x, v.pos.z - z);
        if (d > r * 1.6 || v.removed) continue;
        const k = 1 - d / (r * 1.6);
        v.wake();
        v.damage(500 * k, by, 'blast');
        v.vel.x += ((v.pos.x - x) / (d || 1)) * 7 * k;
        v.vel.z += ((v.pos.z - z) / (d || 1)) * 7 * k;
        v.vel.y += 3 * k;
        v.grounded = false;
      }
      VH.events.emit('explosion', { x, y, z, radius: r, power: scale, source: by, damage: 30 });
      if (g.combat && g.combat.blastDamage) g.combat.blastDamage(x, y, z, r, 60, by);
    }

    /** White steam where a fire's been put out. */
    _steam(S, i) {
      const fx = this.game.fx;
      if (!fx || !fx.soft) return;
      const q = S.pose;
      const w = toWorld(q.x, q.z, q.yaw, FIRE_AT[i][0], FIRE_AT[i][2], _w);
      for (let k = 0; k < 14; k++) {
        fx.soft.emit({
          x: w.x + rnd(-2, 2), y: q.y + FIRE_AT[i][1] + rnd(0, 2), z: w.z + rnd(-2, 2), vx: rnd(-1, 1), vy: 2 + Math.random() * 2, vz: rnd(-1, 1),
          life: 3 + Math.random() * 2, size: 1.5, size1: 6, r: 0.85, g: 0.86, b: 0.88, a: 0.4, drag: 0.6, grav: -0.3,
        });
      }
    }

    /** The fireball: the fuel goes up, and it's a blackened wreck. */
    _burnOut(S) {
      const g = this.game;
      const pl = S.pl;
      const q = S.pose;
      const by = S.jay ? 'player' : null;
      this._bang(q.x, q.y + 2.5, q.z, 3, by, 13);
      const fx = g.fx;
      if (fx) {
        for (const [lx, lz] of [[6.6, 3], [-6.6, 3], [0, -8], [0, 10]]) {
          const w = toWorld(q.x, q.z, q.yaw, lx, lz, _w);
          fx.explosion(w.x, q.y + 2, w.z, 1.6);
        }
        for (let k = 0; k < 7; k++) {
          const w = toWorld(q.x, q.z, q.yaw, rnd(-8, 8), rnd(-14, 14), _w);
          fx.fireAt(w.x, q.y + 1.2, w.z, rnd(25, 45), 2.2);
        }
      }
      for (let i = 0; i < 3; i++) S.fire[i] = 0;
      if (S.voice) {
        S.voice.stop();
        S.voice = null;
      }
      S.burnt = true;
      this.n.burnt++;
      this.h.damage(PRICE.airliner, q.x, q.z);
      this._dropSlides(S);
      // The wreck: the plane in charcoal, down on its belly (its gear's gone).
      const m = VH.AircraftModels.build(pl.rot && pl.rot.cargo ? 'albatrossFreighter' : 'albatross', 0x202020);
      m.root.traverse((o) => {
        if (o.isMesh) {
          o.material = o.geometry.attributes.color ? this.M.char : this.M.charGse;
          o.castShadow = true;
        } else if (o.isSprite || o.isPoints || o.isLight) o.visible = false;
      });
      m.root.position.set(q.x, q.y - 1.15, q.z);
      m.root.rotation.set(0, q.yaw, 0);
      m.body.rotation.set(0.02, 0, 0.05);
      g.scene.add(m.root);
      S.wreck = { m, t: this._t, smoulder: 1 };
      // A smouldering wreck is a fire too (till the fire service has damped it down).
      S.fire[2] = 0;
      // Off airside's books if it's on a stand (the stand kept clear while the wreck's there);
      // anywhere else it stays a disabled plane, hidden under the wreck, so nothing taxis into it.
      const A = this.airside;
      if (pl.phase === 'parked') {
        const out = A.removePlane(S.api);
        if (out) {
          S.stand = out.stand;
          A.blockStand(out.stand, true);
        }
        S.gone = true;
      }
    }

    /** A wreck: smouldering, then cold; cleared away a few minutes on, while nobody's looking. */
    _wreckTick(S, dt) {
      const W = S.wreck;
      const q = S.pose;
      const pl = S.pl;
      // (Still on airside's books: keep its own model out of sight under the wreck.)
      if (!S.gone && pl.model) pl.model.root.visible = false;
      W.smoulder = Math.max(0, W.smoulder - dt / 120 - S.wet);
      S.wet = 0;
      this.M.char.emissiveIntensity = W.smoulder * W.smoulder;
      if (W.smoulder > 0 && Math.random() < dt * (2 + W.smoulder * 6)) {
        const w = toWorld(q.x, q.z, q.yaw, rnd(-3, 3), rnd(-12, 12), _w);
        this._smoke(w.x, q.y + 2.5, w.z, 0.7 + W.smoulder * 1.5);
      }
      if ((this._t - W.t > WRECK_T && this._unseen(q.x, q.z, 35)) || this._t - W.t > WRECK_T * 3) this._clearWreck(S);
    }

    _clearWreck(S) {
      const A = this.airside;
      if (S.wreck) {
        S.wreck.m.root.removeFromParent();
        if (S.wreck.m.dispose) S.wreck.m.dispose();
        S.wreck = null;
      }
      if (!S.gone && A) A.removePlane(S.api);
      if (S.stand !== null && A) A.blockStand(S.stand, false);
      this._forget(S);
    }

    /** A disabled plane, cold and empty, towed away (off the books, its flight Cancelled). */
    _tow(S) {
      const A = this.airside;
      A.removePlane(S.api);
      this._forget(S);
    }

    /** Done with this plane: its slides, holes, voice. */
    _forget(S) {
      this._dropSlides(S);
      if (S.voice) {
        S.voice.stop();
        S.voice = null;
      }
      if (S.wreck) {
        S.wreck.m.root.removeFromParent();
        S.wreck = null;
      }
      this.holeList = this.holeList.filter((h) => h.S !== S);
      this._holesDirty = true;
      this.S.delete(S.pl);
    }

    // --------------------------------------------------------------- holes
    _hole(S, x, y, z, nx, ny, nz) {
      const L = this.holeList;
      if (L.length >= 320) L.shift();
      L.push({ S, x, y, z, nx, ny, nz });
      this._holesDirty = true;
    }

    _holesTick() {
      const m = this.holes;
      const L = this.holeList;
      let moved = this._holesDirty;
      for (const h of L) {
        const q = h.S.pose;
        if (h.px !== q.x || h.pz !== q.z || h.pyaw !== q.yaw) {
          moved = true;
          break;
        }
      }
      if (!moved) return;
      this._holesDirty = false;
      let n = 0;
      for (const h of L) {
        const q = h.S.pose;
        h.px = q.x;
        h.pz = q.z;
        h.pyaw = q.yaw;
        if (h.S.burnt) continue;
        const w = toWorld(q.x, q.z, q.yaw, h.x + h.nx * 0.03, h.z + h.nz * 0.03, _w);
        const nw = toWorld(0, 0, q.yaw, h.nx, h.nz, { x: 0, z: 0 });
        this._hn.set(nw.x, h.ny, nw.z).normalize();
        this._hq.setFromUnitVectors(this._zAxis, this._hn);
        this._hv.set(w.x, q.y + h.y + h.ny * 0.03, w.z);
        this._hm.compose(this._hv, this._hq, this._hs);
        m.setMatrixAt(n++, this._hm);
      }
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
    }

    // ============================================================ explosions
    /** A blast near the apron: planes, bowsers. */
    _blast(e) {
      if (!this._live || !e) return;
      const r = Math.max(4, e.radius || 8);
      const by = this._byJay(e.source) ? 'player' : null;
      const L = { x: 0, z: 0 };
      for (const p of this.airside.planes()) {
        const pl = p.plane;
        if (Math.abs(pl.x - e.x) > r + 25 || Math.abs(pl.z - e.z) > r + 25) continue;
        toLocal(pl.x, pl.z, pl.yaw, e.x, e.z, L);
        const ly = (e.y || 0) - pl.y;
        // How near the body (a line down the middle) and each engine.
        const bz = clamp(L.z, -17, 17);
        const dBody = Math.hypot(L.x, ly - 3.6, L.z - bz) - 2;
        const S = this._st(p);
        if (by) S.jay = true;
        if (dBody < r) this._hurt(S, -1, (1 - Math.max(0, dBody) / r) * 900 * (e.power || 1), by);
        for (let i = 0; i < 2; i++) {
          const dE = Math.hypot(L.x - FIRE_AT[i][0], ly - 1.45, L.z - 3.3);
          if (dE < r * 0.9) this._hurt(S, i, ENG_HP * 1.2, by);
        }
        if (dBody < r * 0.5 && this._onGround(pl)) {
          this._ignite(S, 2, 0.35);
          // (Another one into a fire: it burns all the harder.)
          if (S.fire[2] > 0) S.fire[2] = Math.min(S.empty ? 1 : 0.62, S.fire[2] + 0.3);
        }
        if (!S.disabled && S.body <= 0 && !S.eng[0] && !S.eng[1]) this.S.delete(pl);
        else if (by && !this._shot.has(pl)) {
          this._shot.add(pl);
          this._crime('shootPlane', pl.x, pl.z, 2);
        }
      }
      // Bowsers near it go up a moment later.
      for (const v of this.airside.groundVehicles()) {
        if (v.kind !== 'fuel' || v.taken || !v.root.visible) continue;
        const d = Math.hypot(v.x - e.x, v.z - e.z);
        if (d > r * 1.1) continue;
        const B = this._bowser(v);
        if (by) B.jay = true;
        if (!B.fuse) B.fuse = rnd(0.35, 0.9);
      }
    }

    // ================================================================ bowsers
    _bowser(v) {
      let B = this.bowsers.get(v);
      if (!B) {
        B = { g: v, hits: 0, leak: null, leakT: 0, fuse: 0, jay: false, puddle: null, r: 0 };
        this.bowsers.set(v, B);
      }
      return B;
    }

    /** Bullets into the ground vehicles (nearer than maxT): a bowser leaks; the rest spark. True if one was hit. */
    _rayGse(e, maxT) {
      const { ox, oy, oz, dx, dy, dz } = e;
      const dist = Math.min(maxT, Math.max(0, e.dist || 0) + 0.4);
      const L = { x: 0, z: 0 };
      let best = null;
      let bestT = dist;
      for (const v of this.airside.groundVehicles()) {
        if (v.taken || !v.root.visible) continue;
        const tc = (v.x - ox) * dx + (v.z - oz) * dz;
        if (tc < -6 || tc > bestT + 6) continue;
        toLocal(v.x, v.z, v.yaw, ox, oz, L);
        const c = Math.cos(v.yaw);
        const s = Math.sin(v.yaw);
        const hw = GSE_W[v.kind] || 1;
        const hl = (v.k && v.k.len ? v.k.len : 5) / 2;
        const t = rayBox(L.x, oy, L.z, dx * c - dz * s, dy, dx * s + dz * c, -hw, 0.2, -hl, hw, (v.k && v.k.h) || 2.5, hl, bestT);
        if (t > 0 && t < bestT) {
          bestT = t;
          best = { v, t, lx: L.x + (dx * c - dz * s) * t, ly: oy + dy * t, lz: L.z + (dx * s + dz * c) * t };
        }
      }
      if (!best) return false;
      const fx = this.game.fx;
      const x = ox + dx * best.t;
      const y = oy + dy * best.t;
      const z = oz + dz * best.t;
      if (fx) fx.sparks(x, y, z, -dx, -dz, 7, 4);
      this._ping(x, z);
      if (best.v.kind !== 'fuel') return true;
      const B = this._bowser(best.v);
      B.jay = true;
      B.hits++;
      if (!B.leak) {
        // A hole in the tank: fuel pours out of it from now on.
        B.leak = { x: clamp(best.lx, -1.1, 1.1), y: clamp(best.ly, 1.0, 2.9), z: clamp(best.lz, -3.4, 1.7) };
        B.leakT = 0;
        this._crime('shots', x, z, 1);
      }
      if (B.hits >= 5 && !B.fuse) B.fuse = rnd(0.2, 0.5);
      return true;
    }

    _bowsersTick(dt) {
      const fx = this.game.fx;
      for (const [v, B] of this.bowsers) {
        if (B.boom) continue;
        if (!v.root.parent || v.taken) {
          // (Gone with its stand's vehicles, out of sight.)
          this._dropPuddle(B);
          this.bowsers.delete(v);
          continue;
        }
        if (B.leak) {
          B.leakT += dt;
          // A jet of fuel from the hole, and the puddle spreading under it.
          const w = toWorld(v.x, v.z, v.yaw, B.leak.x, B.leak.z, _w);
          const out = toWorld(0, 0, v.yaw, Math.sign(B.leak.x || 1), 0, { x: 0, z: 0 });
          if (fx && fx.soft) {
            for (let k = 0; k < 2; k++) {
              fx.soft.emit({
                x: w.x, y: B.leak.y, z: w.z, vx: out.x * rnd(1.5, 2.6), vy: rnd(-0.2, 0.6), vz: out.z * rnd(1.5, 2.6),
                life: 0.7, size: 0.1, size1: 0.22, r: 0.75, g: 0.62, b: 0.32, a: 0.6, drag: 0.1, grav: 9.8,
              });
            }
          }
          B.r = Math.min(3.6, 0.4 + B.leakT * 0.45);
          if (!B.puddle) {
            B.puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20), this.M.puddle);
            B.puddle.rotation.x = -HALF;
            B.puddle.renderOrder = 2;
            this.game.scene.add(B.puddle);
          }
          const pw = toWorld(v.x, v.z, v.yaw, B.leak.x + Math.sign(B.leak.x || 1) * 1.2, B.leak.z, _w);
          B.puddle.position.set(pw.x, 0.035, pw.z);
          B.puddle.scale.set(B.r, B.r * 0.8, 1);
          // A few seconds of that and it goes up.
          if (B.leakT > 7.5 && !B.fuse) B.fuse = 0.01;
        }
        if (B.fuse) {
          B.fuse -= dt;
          if (B.fuse <= 0) this._bowserBoom(v, B);
        }
      }
    }

    _dropPuddle(B) {
      if (B.puddle) {
        B.puddle.removeFromParent();
        B.puddle.geometry.dispose();
        B.puddle = null;
      }
    }

    /** It goes up: a big blast, a fire, and a burnt-out shell where it stood. */
    _bowserBoom(v, B) {
      const g = this.game;
      B.boom = true;
      const by = B.jay ? 'player' : null;
      const x = v.x;
      const z = v.z;
      this.airside.takeGse(v, true);
      const fb = g.vehicleFeedback;
      if (fb && fb.explosion) fb.explosion(x, 1.6, z, 1.7, by);
      if (g.fx) {
        g.fx.explosion(x + rnd(-2, 2), 2.5, z + rnd(-2, 2), 1.4);
        g.fx.fireAt(x, 0.6, z, 38, 2.4);
        if (B.puddle) g.fx.fireAt(B.puddle.position.x, 0.1, B.puddle.position.z, 30, 1.6);
      }
      this._dropPuddle(B);
      const m = new THREE.Mesh(VH.Airside.gseGeometry('fuel'), this.M.charGse);
      m.position.set(x, -0.18, z);
      m.rotation.set(0.03, v.yaw, 0.06);
      m.castShadow = true;
      g.scene.add(m);
      this.junk.push({ mesh: m, t: this._t, x, z, yaw: v.yaw, kind: 'fuel' });
      // A fire for the fire service.
      this.fires.push({ kind: 'ground', x, y: 1.2, z, i: 1, wet: 0, t: 0, dur: 70, jay: !!by });
      this.n.bowsers++;
      this.h.damage(PRICE.bowser, x, z);
      if (by) this._crime('explosion', x, z, 2);
      this.bowsers.delete(v);
    }

    _junkTick() {
      for (let i = this.junk.length - 1; i >= 0; i--) {
        const J = this.junk[i];
        if (this._t - J.t > WRECK_T && this._unseen(J.x, J.z, 25)) {
          J.mesh.removeFromParent();
          this.junk.splice(i, 1);
        }
      }
    }

    /** Ground fires (a bowser's): they burn down on their own, faster with water on them. */
    _groundFiresTick(dt) {
      const fx = this.game.fx;
      for (let i = this.fires.length - 1; i >= 0; i--) {
        const F = this.fires[i];
        F.t += dt;
        F.i = Math.max(0, F.i - dt / F.dur - F.wet);
        if (F.wet > 0 && F.i <= 0 && fx) for (let k = 0; k < 10; k++) fx.soft.emit({ x: F.x + rnd(-2, 2), y: 1, z: F.z + rnd(-2, 2), vy: 2.5, life: 3, size: 1.2, size1: 5, r: 0.85, g: 0.86, b: 0.88, a: 0.4, drag: 0.6, grav: -0.3 });
        F.wet = 0;
        if (F.i <= 0) {
          this.fires.splice(i, 1);
          continue;
        }
        if (fx && Math.random() < dt * 30 * F.i) fx.flame(F.x + rnd(-2, 2), 0.3, F.z + rnd(-2, 2), 1 + F.i * 1.5);
        if (fx && Math.random() < dt * 5 * F.i) this._smoke(F.x, 2, F.z, 0.8 + F.i);
      }
    }

    // ===================================================== taking their vehicles
    /**
     * Jay walking up to the baggage tug, the catering truck or the follow-me: a real one in its
     * place (with its driver at the wheel if it was at work), and back again if he walks off.
     */
    _swapsTick(dt) {
      const g = this.game;
      const pl = g.player;
      const A = this.airside;
      const onFoot = !pl.inVehicle && !pl.isDead && !(g.cabin && g.cabin.aboard) && pl.pos.y < 1.5;
      if (onFoot && !g.vehicles.entering) {
        for (const v of A.groundVehicles()) {
          const type = TAKE[v.kind];
          if (!type || v.taken || !v.root.visible || v.attached || Math.abs(v.v) > 1.2) continue;
          if (v.kind === 'cater' && v.lift > 0.03) continue; // (its box is up at a door)
          if (v.state === 'lead' || v.state === 'out') continue; // (the follow-me, busy leading one in)
          const d = Math.hypot(v.x - pl.pos.x, v.z - pl.pos.z);
          if (d > (v.k ? v.k.len / 2 : 2) + 3.2) continue;
          this._swap(v, type);
        }
      }
      for (let i = this.swaps.length - 1; i >= 0; i--) {
        const W = this.swaps[i];
        const car = W.v;
        W.t += dt;
        if (car.driver === 'player' || car.removed || car.wrecked) {
          // His now (or gone): the scenery one stays out of the work till the stand's vehicles are put away.
          if (car.driver === 'player') {
            this.n.taken++;
            if (car.type === 'bagtug' && g.achievements) g.achievements.unlock('ground_crew');
          }
          this.swaps.splice(i, 1);
          continue;
        }
        const j = this.jay();
        const moved = Math.hypot(car.pos.x - W.x, car.pos.z - W.z) > 1.2 || car.health < 990;
        const far = Math.hypot(j.x - car.pos.x, j.z - car.pos.z) > 22 || pl.inVehicle;
        // (Knocked about by a bullet, a blast or a bump, but not his: back to work once nobody's looking.)
        if ((far && (!moved || this._unseen(car.pos.x, car.pos.z, 40)) && !g.vehicles.entering) || !W.g.root.parent) {
          // Back to work (or its stand's vehicles were put away).
          g.vehicles.remove(car);
          if (W.g.root.parent) A.takeGse(W.g, false);
          this.swaps.splice(i, 1);
        }
      }
    }

    _swap(gv, type) {
      const g = this.game;
      if (!VH.Vehicle.typeSpec(type)) return;
      const A = this.airside;
      const busy = gv.busy || gv.post === 'spot' || gv.post === 'going' || gv.post === 'leaving' || (gv.state && gv.state !== 'home');
      let car;
      try {
        car = g.vehicles.spawn(type, gv.x, gv.z, gv.yaw, { role: 'parked', persistent: true, sleeping: true });
      } catch (err) {
        return;
      }
      if (!car) return;
      A.takeGse(gv, true);
      car.role = 'parked';
      car.persistent = true;
      car.airsideFrom = gv.kind;
      if (busy) {
        // Someone's at the wheel: Jay pulls them out (they run off).
        car.driver = 'ai';
        car.controller = { update(v) { v.input.accel = 0; v.input.handbrake = 1; }, onJacked: () => null };
        car.beaconOn = true;
      }
      this.swaps.push({ g: gv, v: car, t: 0, x: gv.x, z: gv.z });
    }

    _entered(v) {
      if (!v) return;
      const g = this.game;
      if (v.type === 'bagtug' && g.achievements) g.achievements.unlock('ground_crew');
      if (v.type === 'firetruck') {
        for (const E of this.engines) {
          if (E.v === v) this._engineLost(E);
        }
        if (g.hud && g.hud.notify && g.input) g.hud.notify({ title: 'Crash tender', text: 'Hold ' + g.input.labelFor('fire') + ' for the water cannon; ' + g.input.labelFor('lights') + ' for the siren.', icon: '🚒' });
      }
    }

    /** Jay at the water cannon: it puts out whatever it lands on and bowls people over. */
    _cannonTick(dt) {
      const g = this.game;
      const pl = g.player;
      const v = pl.inVehicle && pl.vehicle;
      const jet = v && v.type === 'firetruck' && v.jet;
      if (!jet || !jet.length) return;
      const near = (x, y, z, r) => jet.some((q) => Math.abs(q.x - x) < r && Math.abs(q.z - z) < r && Math.abs(q.y - y) < r + 2);
      const p = { x: 0, y: 0, z: 0 };
      for (const S of this.S.values()) {
        if (S.wreck) {
          if (near(S.pose.x, 2, S.pose.z, 12)) S.wet += WATER * 1.5 * dt;
          continue;
        }
        for (let i = 0; i < 3; i++) {
          if (S.fire[i] <= 0) continue;
          const a = FIRE_AT[i];
          toWorld(S.pose.x, S.pose.z, S.pose.yaw, a[0], a[2], p);
          if (near(p.x, S.pose.y + a[1], p.z, i === 2 ? 9 : 5)) S.wet += WATER * 1.5 * dt;
        }
      }
      for (const F of this.fires) if (near(F.x, F.y, F.z, 5)) F.wet += WATER * 1.5 * dt;
      // People in the way go over (no harm in it).
      const end = jet[jet.length - 1];
      if (g.crowd && Math.random() < dt * 8) {
        g.crowd.near(end.x, end.z, 2.5, (a) => {
          if (a.dead || a.state === 'down' || Math.abs(a.pos.y - end.y) > 2.5) return;
          const l = Math.hypot(a.pos.x - v.pos.x, a.pos.z - v.pos.z) || 1;
          a.knock(((a.pos.x - v.pos.x) / l) * 4, 2, ((a.pos.z - v.pos.z) / l) * 4, 0, 'player');
        });
      }
    }

    // ========================================================= the fire service
    /** Everything on fire the engines should go to, with where to aim. */
    _fireList() {
      const out = [];
      for (const S of this.S.values()) {
        if (S.wreck) {
          if (S.wreck.smoulder > 0.25) out.push({ S, kind: 'wreck', i: S.wreck.smoulder });
        } else if (!S.wreck && S.fire.some((f) => f > 0)) out.push({ S, kind: 'plane', i: Math.max(...S.fire) });
      }
      for (const F of this.fires) out.push({ F, kind: 'ground', i: F.i });
      return out;
    }

    /** Where a fire is: the hottest part of a plane, or the ground fire. */
    _firePoint(t, out) {
      if (t.F) {
        out.x = t.F.x;
        out.y = t.F.y;
        out.z = t.F.z;
        return out;
      }
      const S = t.S;
      const q = S.pose;
      let i = 2;
      if (t.kind === 'plane') {
        i = S.fire[0] >= S.fire[1] ? 0 : 1;
        if (S.fire[2] > Math.max(S.fire[0], S.fire[1]) * 0.8) i = 2;
      }
      const a = FIRE_AT[i];
      toWorld(q.x, q.z, q.yaw, a[0], a[2], out);
      out.y = q.y + (t.kind === 'wreck' ? 1.6 : a[1]);
      return out;
    }

    _key(t) {
      return t.F || t.S;
    }

    _engineSpawn(E) {
      const g = this.game;
      const b = E.bay;
      if (!VH.Vehicle.typeSpec('firetruck')) return;
      const j = this.jay();
      if (Math.hypot(j.x - b.x, j.z - b.z) < 30 || (g.isVisible && g.isVisible(b.x, 2, b.z, 6) && Math.hypot(j.x - b.x, j.z - b.z) < 260)) return;
      if (g.vehicles.list.some((o) => !o.removed && Math.hypot(o.pos.x - b.x, o.pos.z - b.z) < 5)) return;
      let v;
      try {
        v = g.vehicles.spawn('firetruck', b.x, b.z, PI, { role: 'parked', persistent: true, sleeping: true });
      } catch (err) {
        return;
      }
      v.role = 'parked';
      v.persistent = true;
      v.fireEngine = true;
      E.v = v;
      E.state = 'home';
      E.path = null;
      E.legs = [];
      E.target = null;
    }

    _engineLost(E) {
      const v = E.v;
      if (v) {
        v.script = null;
        v.fireEngine = false;
        if (v.driver === 'ai') v.driver = null;
        v.controller = null;
        if (v.driver !== 'player') v.siren = false;
        v.persistent = v.driver === 'player';
        v.role = v.driver === 'player' ? 'player' : 'abandoned';
      }
      E.v = null;
      E.state = 'none';
      E.target = null;
      E.path = null;
    }

    /** One fire engine: its job from the station to a fire and back. */
    _engineTick(E, fires, dt) {
      const g = this.game;
      const v = E.v;
      if (!v || v.removed || v.wrecked || v.driver === 'player') {
        if (v || E.state !== 'none') this._engineLost(E);
        this._engineSpawn(E);
        return;
      }
      if (E.state === 'home') {
        v.siren = false;
        // A fire wanting engines: off we go.
        const t = fires.find((f) => f.want > 0);
        if (t) {
          t.want--;
          this._dispatch(E, t);
        }
        return;
      }
      const tg = E.target;
      const still = tg && fires.find((f) => this._key(f) === this._key(tg) && f.i > 0);
      if (E.state === 'out') {
        if (!still) this._goHome(E);
        else if (!E.path && !E.legs.length) {
          E.state = 'spray';
          E.sprayT = 0;
          E.doneT = 0;
        }
        return;
      }
      if (E.state === 'spray') {
        E.sprayT += dt;
        const p = this._firePoint(still || tg, { x: 0, y: 0, z: 0 });
        // Turn to face it (a crash tender's monitor turns, but it looks right this way).
        const want = Math.atan2(p.x - v.pos.x, p.z - v.pos.z);
        if (Math.abs(wrapAngle(want - v.yaw)) > 0.6) v.yaw = dampAngle(v.yaw, want, 0.8, dt);
        if (still) {
          this._spray(v, p, dt);
          if (E.sprayT > 1.2) {
            if (still.F) still.F.wet += WATER * dt;
            else still.S.wet += WATER * dt;
          }
          E.doneT = 0;
        } else {
          // Out: a few seconds more on it to be sure, then home.
          E.doneT += dt;
          if (E.doneT < 3.5) this._spray(v, p, dt);
          else {
            if (tg.S && !tg.S.counted) {
              tg.S.counted = true;
              this.n.out++;
            }
            this._goHome(E);
          }
        }
        return;
      }
      if (E.state === 'back' && !E.path && !E.legs.length) {
        // In the bay: parked, engine off, ready.
        v.script = null;
        v.driver = null;
        v.controller = null;
        v.siren = false;
        v.place(E.bay.x, E.bay.z, PI);
        v.sleeping = true;
        E.state = 'home';
        E.target = null;
        // (Called out again on the way home? It goes from here next time.)
      }
      void g;
    }

    /** Send engine E to fire t: out of the bay, along the airside road, up beside it. */
    _dispatch(E, t) {
      const v = E.v;
      const b = E.bay;
      const p = this._firePoint(t, { x: 0, y: 0, z: 0 });
      const stop = this._stopFor(E, t, p);
      if (!stop) return;
      E.target = t;
      E.stop = stop;
      // Out of the bay, across the GA apron (between the Skylarks), and along the apron just
      // north of the airside road (z -1309), clear of the stands' vehicles.
      const pts = [[b.x, b.z], [b.x, -1270], [84, -1306], [70, LANE]];
      E.road = pts.slice(2);
      const ax = stop.ax;
      const az = stop.az;
      if (ax >= -440) {
        if (Math.abs(az - LANE) > 3) pts.push([clamp(ax, -440, 66), LANE]);
      } else {
        pts.push([-445, LANE], [-445, -1345], [ax, -1345]);
      }
      E.road = E.road.concat(pts.slice(4));
      E.app = [ax, az];
      pts.push([ax, az], [stop.x, stop.z]);
      E.legs = [{ path: this._route(pts, 24, 13), rev: false }];
      this._nextLeg(E);
      E.state = 'out';
      E.s = 0;
      E.spd = 0;
      E.blockT = 0;
      E.ghostT = 0;
      v.sleeping = false;
      v.driver = 'ai';
      v.siren = true;
      v.sirenTime = Math.random();
      v.role = 'service';
      v.controller = { update() {}, onJacked: () => { this._engineLost(E); return null; } };
      v.script = (veh, dt) => this._drive(E, veh, dt);
    }

    /**
     * Where an engine pulls up for fire t (at p): beside it, clear of the plane, the other
     * engine and the ground vehicles, with an approach from further out ({ x, z, ax, az }).
     */
    _stopFor(E, t, p) {
      const other = this.engines.find((o) => o !== E && o.target && this._key(o.target) === this._key(t));
      const taken = other && other.stop ? other.stop : null;
      const cands = [];
      if (t.S) {
        const S = t.S;
        const q = S.pose;
        const side = t.kind === 'plane' && S.fire[1] > S.fire[0] ? -1 : 1;
        const local = [[13, 9], [22, 1], [14, 21], [12, -16], [24, -14], [10, 28]];
        for (const sd of [side, -side]) for (const [lx, lz] of local) cands.push([sd * lx, lz, sd * (lx + 16), lz, q]);
      } else {
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * PI * 2 + 0.4;
          cands.push([Math.sin(a) * 15, Math.cos(a) * 15, Math.sin(a) * 30, Math.cos(a) * 30, { x: p.x, z: p.z, yaw: 0 }]);
        }
      }
      const gse = this.airside.groundVehicles();
      for (const [lx, lz, alx, alz, q] of cands) {
        const s = toWorld(q.x, q.z, q.yaw, lx, lz, {});
        const a = toWorld(q.x, q.z, q.yaw, alx, alz, {});
        if (taken && Math.hypot(taken.x - s.x, taken.z - s.z) < 9) continue;
        if (gse.some((w) => w.root.visible && Math.hypot(w.x - s.x, w.z - s.z) < 6.5)) continue;
        if (this._inPlane(s.x, s.z, 4) || this._inPlane(a.x, a.z, 4)) continue; // (nor the way up to it under a neighbour's wing)
        if (this.game.vehicles.list.some((o) => !o.removed && o !== E.v && Math.hypot(o.pos.x - s.x, o.pos.z - s.z) < 5.5)) continue;
        return { x: s.x, z: s.z, ax: a.x, az: a.z };
      }
      const c = cands[0];
      const s = toWorld(c[4].x, c[4].z, c[4].yaw, c[0], c[1], {});
      const a = toWorld(c[4].x, c[4].z, c[4].yaw, c[2], c[3], {});
      return { x: s.x, z: s.z, ax: a.x, az: a.z };
    }

    /** Is (x, z) under (or within m of) any airliner? */
    _inPlane(x, z, m) {
      const L = { x: 0, z: 0 };
      for (const p of this.airside.planes()) {
        toLocal(p.x, p.z, p.yaw, x, z, L);
        if (planeFoot(L, m)) return true;
      }
      return false;
    }

    _goHome(E) {
      const v = E.v;
      const b = E.bay;
      E.state = 'back';
      E.target = null;
      v.siren = false;
      // Back off a little first, then the way it came, and back into the bay.
      const fx = Math.sin(v.yaw);
      const fz = Math.cos(v.yaw);
      const bx = v.pos.x - fx * 9;
      const bz = v.pos.z - fz * 9;
      const road = (E.road || [[84, -1306], [70, LANE]]).slice().reverse();
      const pts = [[bx, bz]].concat(E.app ? [E.app] : [], road, [[b.x + 11, -1272]]);
      E.legs = [
        { path: this._route([[v.pos.x, v.pos.z], [bx, bz]], 10), rev: true },
        { path: this._route(pts, 14, 12), rev: false },
        { path: this._route([[b.x + 11, -1272], [b.x + 1.5, -1265], [b.x, -1258], [b.x, b.z]], 3.5), rev: true },
      ];
      this._nextLeg(E);
      v.script = (veh, dt) => this._drive(E, veh, dt);
    }

    _route(pts, vmax, r) {
      const clean = [];
      for (const p of pts) {
        const q = clean[clean.length - 1];
        if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1) clean.push(p);
      }
      if (clean.length < 2) clean.push([clean[0][0] + 0.5, clean[0][1]]);
      const P = VH.Airside.route(clean, r || 9, vmax);
      // (A crash tender takes the corners faster and brakes harder for them than an airliner.)
      for (let i = 0; i < P.A.length; i++) {
        P.A[i] = 4.2;
        P.V[i] = Math.min(vmax, P.V[i] * 1.5);
      }
      return P.end(0);
    }

    _nextLeg(E) {
      const L = E.legs.shift();
      E.path = L ? L.path : null;
      E.rev = L ? L.rev : false;
      E.s = 0;
      E.backs = 0;
      E.backS = 0;
      E.holdT = 0;
    }

    /** Along its path (no physics): it slows for anything in the way and never waits for ever. */
    _drive(E, v, dt) {
      const P = E.path;
      if (!P) {
        v.vF = 0;
        v.vel.set(0, 0, 0);
        return;
      }
      // Backing off from an airliner that's waiting on it as it waits on the airliner, then a
      // pause to let it by.
      if (E.backS > 0 || E.holdT > 0) {
        let vF = 0;
        if (E.backS > 0) {
          const ds = Math.min(E.backS, 2.5 * dt, E.s);
          E.backS = ds > 1e-4 ? E.backS - ds : 0;
          E.s -= ds;
          vF = -ds / Math.max(dt, 1e-3);
          P.at(E.s, _o);
          v.pos.x = _o.x;
          v.pos.z = _o.z;
        } else E.holdT -= dt;
        E.spd = 0;
        v.vF = vF;
        v.vel.set(Math.sin(v.yaw) * vF, 0, Math.cos(v.yaw) * vF);
        v.braking = vF === 0;
        return;
      }
      let vt = P.cap(E.s);
      if (E.rev) vt = Math.min(vt, 3);
      if (E.ghostT > 0) E.ghostT -= dt;
      const blk = E.ghostT > 0 ? Infinity : this._ahead(E, v);
      // (To a stop with it at the nearest look, 3 m on: it used to creep on into it at 3 m/s.)
      if (blk < Infinity) vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 3.5 * (blk - 3))));
      // (An airliner going by isn't in the way for long: no clock on that.)
      const passing = E.blkPl && Math.abs(E.blkPl.v || 0) > 0.3;
      E.blockT = blk < 4 && E.spd < 0.5 && !passing ? (E.blockT || 0) + dt : 0;
      if (E.blockT > 7) {
        E.blockT = 0;
        if (E.blkPl && !E.rev && E.s > 3 && E.backs < 2) {
          E.backs++;
          E.backS = 10;
          E.holdT = 8;
        } else E.ghostT = 3; // (never through a plane but as a last resort)
      }
      E.spd = E.spd < vt ? Math.min(vt, E.spd + 3.6 * dt) : Math.max(vt, E.spd - 6 * dt);
      E.s = Math.min(P.len, E.s + E.spd * dt);
      P.at(E.s, _o);
      v.pos.x = _o.x;
      v.pos.z = _o.z;
      v.pos.y = 0;
      v.yaw = dampAngle(v.yaw, E.rev ? _o.h + PI : _o.h, 7, dt);
      v.vF = E.rev ? -E.spd : E.spd;
      v.vel.x = Math.sin(v.yaw) * v.vF;
      v.vel.z = Math.cos(v.yaw) * v.vF;
      v.vel.y = 0;
      v.braking = blk < 12;
      if (E.s >= P.len - 0.05) {
        this._nextLeg(E);
        if (!E.path) {
          E.spd = 0;
          v.vF = 0;
          v.vel.set(0, 0, 0);
        }
      }
    }

    /** Anything in the engine's way along its path: Jay, a car, a ground vehicle (how far). */
    _ahead(E, v) {
      const P = E.path;
      const g = this.game;
      const reach = 6 + (E.spd * E.spd) / 5;
      const pp = g.player;
      const pl = pp && !pp.inVehicle && !pp.isDead ? pp.pos : null;
      const gse = this.airside.groundVehicles();
      // Airliners on the ground (bar the one it's going to put out): their wings reach over the lane.
      const tgt = E.target && E.target.S ? E.target.S.pl : null;
      const planes = this.airside.planes().filter((q) => q.plane !== tgt && this._onGround(q.plane));
      const L = _l;
      E.blkPl = null;
      for (let d = 3; d <= reach; d += 2) {
        P.at(Math.min(P.len, E.s + (E.rev ? -0 : 0) + d), _o);
        if (E.s + d > P.len + 1) break;
        const x = _o.x;
        const z = _o.z;
        if (pl && Math.hypot(pl.x - x, pl.z - z) < 2.2) return d;
        for (const o of g.vehicles.list) {
          if (o === v || o.removed) continue;
          if (Math.abs(o.pos.x - x) < 3.2 && Math.abs(o.pos.z - z) < 3.2 && Math.hypot(o.pos.x - x, o.pos.z - z) < 1.6 + Math.max(o.hx || 1, Math.min(o.hz || 2, 3))) return d;
        }
        for (const w of gse) {
          if (!w.root.visible) continue;
          if (Math.abs(w.x - x) < 4 && Math.abs(w.z - z) < 4) return d;
        }
        for (const q of planes) {
          if (Math.abs(q.x - x) > 40 || Math.abs(q.z - z) > 40) continue;
          toLocal(q.x, q.z, q.yaw, x, z, L);
          if (planeFoot(L, 4)) { // (its own 4.7 m to the bumper, and a little more)
            E.blkPl = q.plane;
            return d;
          }
        }
      }
      return Infinity;
    }

    /** The monitor's jet: an arc of water from the roof to the fire, and spray where it lands. */
    _spray(v, p, dt) {
      const fx = this.game.fx;
      if (!fx || !fx.soft) return;
      const m = v.model && v.model.nozzle;
      const n0 = v.localToWorld(0, m ? m.z : 2.7, {});
      const ny = v.pos.y + (m ? m.y : 3.8);
      const dx = p.x - n0.x;
      const dy = p.y - ny;
      const dz = p.z - n0.z;
      const d = Math.hypot(dx, dz);
      const T = d / 20 + 0.35;
      // (Two or three a frame: a solid-looking jet.)
      this._sprayAcc = (this._sprayAcc || 0) + dt * 130;
      const n = Math.floor(this._sprayAcc);
      this._sprayAcc -= n;
      for (let k = 0; k < n; k++) {
        const j = 0.05;
        const u = Math.random();
        fx.soft.emit({
          x: n0.x + dx * u * 0.04, y: ny, z: n0.z + dz * u * 0.04,
          vx: (dx / T) * rnd(1 - j, 1 + j), vy: (dy + 0.5 * 9.8 * T * T) / T + rnd(-0.35, 0.35), vz: (dz / T) * rnd(1 - j, 1 + j),
          life: T * rnd(0.95, 1.1), size: 0.32, size1: 1.5, r: 0.78, g: 0.88, b: 1.0, a: 0.7, drag: 0.02, grav: 9.8,
        });
      }
      if (Math.random() < dt * 8) {
        fx.soft.emit({ x: p.x + rnd(-1, 1), y: p.y, z: p.z + rnd(-1, 1), vx: rnd(-1, 1), vy: 1.5, vz: rnd(-1, 1), life: 1.6, size: 1, size1: 3.5, r: 0.9, g: 0.92, b: 0.95, a: 0.35, drag: 1, grav: -0.2 });
      }
    }

    _fireServiceTick(dt) {
      const fires = this._fireList();
      // How many engines each fire wants (and doesn't have yet).
      for (const f of fires) {
        const want = f.kind === 'plane' && (f.S.fire[2] > 0 || f.S.fire[0] + f.S.fire[1] > 1) ? 2 : 1;
        const have = this.engines.filter((E) => E.target && this._key(E.target) === this._key(f)).length;
        f.want = Math.max(0, want - have);
      }
      for (const E of this.engines) this._engineTick(E, fires, dt);
    }

    // ================================================================ movers
    /** Every airliner on the ground, every wreck and ground vehicle near Jay as boxes for the cars. */
    _moversTick() {
      const g = this.game;
      const V = g.vehicles;
      if (!V) return;
      const out = this.movers;
      out.length = 0;
      const j = this.jay();
      const used = this._mvUsed || (this._mvUsed = new Set());
      used.clear();
      const rec = (key, n) => {
        let m = this._mv.get(key);
        if (!m) {
          m = { x: 0, z: 0, r: 0, cols: [] };
          for (let i = 0; i < n; i++) m.cols.push({ type: 0, cx: 0, cz: 0, hx: 1, hz: 1, cos: 1, sin: 0, minY: 0, maxY: 1, flags: VH.COLLIDE.SOLID, tag: 'airside', onHit: null });
          this._mv.set(key, m);
        }
        used.add(key);
        out.push(m);
        return m;
      };
      const planeCols = (key, x, y, z, yaw, lower, S) => {
        const m = rec(key, SOLID.length);
        m.x = x;
        m.z = z;
        m.r = 20;
        const c = Math.cos(yaw);
        const s = Math.sin(yaw);
        for (let i = 0; i < SOLID.length; i++) {
          const B = SOLID[i];
          const col = m.cols[i];
          col.cx = x + B.x * c + B.z * s;
          col.cz = z - B.x * s + B.z * c;
          col.hx = B.hx;
          col.hz = B.hz;
          col.cos = c;
          col.sin = s;
          col.minY = y + Math.max(0, B.y0 - lower);
          col.maxY = y + B.y1 - lower;
          col.part = i === 2 ? 0 : i === 3 ? 1 : -1;
          col.S = S;
          col.key = key;
          if (!col.onHit) col.onHit = (v, r) => this._carHit(col, v, r);
        }
      };
      for (const p of this.airside.planes()) {
        const pl = p.plane;
        if (pl.y > 6 || Math.abs(pl.x - j.x) > 420 || Math.abs(pl.z - j.z) > 420) continue;
        const S = this.S.get(pl);
        planeCols(pl, pl.x, pl.y, pl.z, pl.yaw, S && S.wreck ? 1.15 : 0, S || null);
      }
      for (const S of this.S.values()) {
        if (!S.gone || !S.wreck) continue;
        const q = S.pose;
        planeCols(S, q.x, q.y, q.z, q.yaw, 1.15, S);
      }
      // The ground vehicles (and the baggage carts).
      for (const w of this.airside.groundVehicles()) {
        if (!w.root.visible || Math.abs(w.x - j.x) > 160 || Math.abs(w.z - j.z) > 160) continue;
        const n = 1 + (w.carts ? w.carts.length : 0);
        const m = rec(w, n);
        m.x = w.x;
        m.z = w.z;
        m.r = 4 + n * 3.5;
        const put = (col, x, z, yaw, hw, hl, h) => {
          col.cx = x;
          col.cz = z;
          col.cos = Math.cos(yaw);
          col.sin = Math.sin(yaw);
          col.hx = hw;
          col.hz = hl;
          col.minY = 0;
          col.maxY = h;
          col.gse = w;
          if (!col.onHit) col.onHit = (v, r) => this._carHitGse(col, v, r);
        };
        put(m.cols[0], w.x, w.z, w.yaw, GSE_W[w.kind] || 1, ((w.k && w.k.len) || 4) / 2, (w.k && w.k.h) || 2);
        if (w.carts) w.carts.forEach((c, i) => put(m.cols[i + 1], c.x, c.z, c.yaw, 0.76, 1.45, 1.9));
      }
      for (const J of this.junk) {
        const m = rec(J, 1);
        m.x = J.x;
        m.z = J.z;
        m.r = 5;
        const col = m.cols[0];
        Object.assign(col, { cx: J.x, cz: J.z, cos: Math.cos(J.yaw), sin: Math.sin(J.yaw), hx: 1.15, hz: 3.8, minY: 0, maxY: 3, onHit: null });
      }
      for (const key of this._mv.keys()) if (!used.has(key)) this._mv.delete(key);
      V.movers = out;
    }

    /** A car into a plane: hard enough, it dents it (and an engine can catch). */
    _carHit(col, v, r) {
      const sp = Math.abs(v.vel.x * r.nx + v.vel.z * r.nz);
      if (sp < 7) return;
      const now = this._t;
      if (v._planeHitT && now - v._planeHitT < 0.5) return;
      v._planeHitT = now;
      const pl = col.key; // (the Airliner; a wreck off airside's books has its record here instead)
      if (!pl || !pl.api || pl.gone) return;
      const S = this._st(pl.api);
      const by = v.driver === 'player' ? 'player' : null;
      if (by) S.jay = true;
      this._hurt(S, col.part, (sp - 6) * (col.part >= 0 ? 14 : 28), by);
      this.h.damage(PRICE.dent * (sp / 10), v.pos.x, v.pos.z);
      if (by && !this._shot.has(pl)) {
        this._shot.add(pl);
        this._crime('shootPlane', pl.x, pl.z, 2);
      }
    }

    /** A car into a ground vehicle: a bowser hit hard enough springs a leak. */
    _carHitGse(col, v, r) {
      const w = col.gse;
      if (!w || w.kind !== 'fuel') return;
      const sp = Math.abs(v.vel.x * r.nx + v.vel.z * r.nz);
      if (sp < 9) return;
      const B = this._bowser(w);
      if (B.leak) {
        if (sp > 16 && !B.fuse) B.fuse = rnd(0.3, 0.8);
        return;
      }
      B.jay = v.driver === 'player';
      const L = toLocal(w.x, w.z, w.yaw, r.px, r.pz, { x: 0, z: 0 });
      B.leak = { x: clamp(L.x, -1.1, 1.1), y: 1.2, z: clamp(L.z, -3.4, 1.7) };
      B.leakT = sp > 16 ? 5 : 0;
    }

    // ============================================================== response
    /** A crime (shooting at an airliner, a burning one ...) with at least `stars`. */
    _crime(kind, x, z, stars) {
      const g = this.game;
      const pol = g.police;
      if (!pol || pol.enabled === false || (g.missions && g.missions.suppressHeat) || g.state !== 'playing') return;
      if (pol.crime) pol.crime(kind, x, z);
      // The tower and the apron crews see everything: it's called in.
      if (pol.level < stars && pol.setLevel) {
        pol.setLevel(stars, kind);
        if (pol._sawPlayer) pol._sawPlayer();
      }
    }

    _announce(text) {
      const L = this.game.airportLife;
      if (this._t - this._paT < 90 || !L || typeof L._pa !== 'function') return;
      const j = this.jay();
      if (Math.hypot(j.x - APRON.x, j.z - APRON.z) > 600) return;
      this._paT = this._t;
      try {
        L._pa(text, true);
      } catch (err) {
        /* no PA then */
      }
    }

    /** A ground stop while anything's burning on the airfield (havoc.hold: the boards say why). */
    _holdTick() {
      let burning = this.fires.length > 0;
      let jay = false; // (an airliner Jay set alight: a bowser's fire alone isn't Grounded)
      for (const S of this.S.values()) {
        if (S.fire.some((f) => f > 0) || (S.wreck && S.wreck.smoulder > 0.3)) {
          burning = true;
          if (S.jay) jay = true;
        }
      }
      if (jay && !this._jayFire && this.game.achievements) this.game.achievements.unlock('grounded');
      this._jayFire = jay;
      if (burning === this._held) return;
      this._held = burning;
      this.h.hold('fire', burning, 'Fire on the airfield');
    }

    // ------------------------------------------------------------- sounds
    _ping(x, z) {
      const g = this.game;
      const au = g.audio;
      const fb = g.vehicleFeedback;
      if (!au || !au.ready || !au.ctx || !au._wBus || !fb) return;
      if (this._t - (this._pingT || -1) < 0.04) return;
      this._pingT = this._t;
      try {
        const gain = fb._gain(x, z, 18);
        if (gain < 0.03) return;
        const bus = au._wBus({ pan: fb._pan(x, z), gain, verb: 0.2, life: 1.2 });
        const t = au.ctx.currentTime;
        au._wTone({ t, freq: rnd(1700, 2300), wave: 'triangle', peak: 0.06, attack: 0.001, decay: 0.12, bus });
        au._wHit({ t, type: 'bandpass', freq: 3200, q: 1.5, peak: 0.12, attack: 0.001, decay: 0.05, bus });
      } catch (err) {
        /* no sound */
      }
    }

    _whoosh(x, z) {
      const g = this.game;
      const au = g.audio;
      const fb = g.vehicleFeedback;
      if (!au || !au.ready || !au.ctx || !au._wBus || !fb) return;
      try {
        const gain = fb._gain(x, z, 30);
        if (gain < 0.03) return;
        const bus = au._wBus({ pan: fb._pan(x, z), gain, verb: 0.15, life: 2.5 });
        au._wHit({ t: au.ctx.currentTime, type: 'lowpass', freq: 700, peak: 0.3, attack: 0.08, decay: 1.2, bus });
      } catch (err) {
        /* no sound */
      }
    }

    // ---------------------------------------------------------------- misc
    /** Out of Jay's sight (and at least m away). */
    _unseen(x, z, m) {
      const j = this.jay();
      const g = this.game;
      return Math.hypot(j.x - x, j.z - z) > m && !(g.isVisible && g.isVisible(x, 3, z, 18));
    }

    /** Everything as it was: wrecks cleared, fires out, the engines home (Jay's left; a new game). */
    mendAll(hard) {
      const A = this.airside;
      for (const S of Array.from(this.S.values())) {
        if (S.wreck || S.burnt) this._clearWreck(S);
        else {
          if (S.disabled && A && !S.pl.gone) A.removePlane(S.api);
          this._forget(S);
        }
      }
      this.S.clear();
      for (const B of this.bowsers.values()) this._dropPuddle(B);
      this.bowsers.clear();
      for (const J of this.junk) J.mesh.removeFromParent();
      this.junk.length = 0;
      this.fires.length = 0;
      this.holeList.length = 0;
      this._holesDirty = true;
      this._holesTick();
      for (const s of this.sliders) s.a.held = null;
      this.sliders.length = 0;
      const g = this.game;
      for (const W of this.swaps) {
        if (W.v.driver !== 'player' && !W.v.removed) g.vehicles.remove(W.v);
        if (A && W.g.root.parent) A.takeGse(W.g, false);
      }
      this.swaps.length = 0;
      for (const E of this.engines) {
        const v = E.v;
        if (v && !v.removed && v.driver !== 'player' && (hard || E.state !== 'home')) {
          g.vehicles.remove(v);
          E.v = null;
          E.state = 'none';
        }
        E.target = null;
        E.path = null;
        E.legs = [];
      }
      this._shot.clear();
      if (this._held) {
        this._held = false;
        this.h.hold('fire', false);
      }
      if (g.vehicles) g.vehicles.movers = [];
      this.movers.length = 0;
      this._mv.clear();
    }

    // ============================================================== system
    update(dt) {
      if (!this.ok) return;
      dt = Math.min(dt, 0.1);
      this._t += dt;
      const A = this.airside;
      const j = this.jay();
      const live = A.inited && Math.hypot(j.x - APRON.x, j.z - APRON.z) < NEAR;
      this._live = live;
      this._cannonTick(dt);
      if (!live) {
        this._awayT += dt;
        if (this._awayT > 4 && (this.S.size || this.junk.length || this.fires.length || this.swaps.length || this.movers.length || this.engines.some((E) => E.v))) this.mendAll(true);
        return;
      }
      this._awayT = 0;
      // Delayed blasts (one bowser setting off the next).
      this._planesTick(dt);
      this._slidersTick(dt);
      this._bowsersTick(dt);
      this._junkTick();
      this._groundFiresTick(dt);
      this._swapsTick(dt);
      this._fireServiceTick(dt);
      this._moversTick();
      this._holesTick();
      this._holdTick();
    }

    reset() {
      if (!this.ok) return;
      this.mendAll(true);
      this.n = { planes: 0, burnt: 0, slid: 0, out: 0, bowsers: 0, taken: 0 };
    }

    stop() {
      if (!this.ok) return;
      this.mendAll(true);
    }

    stats() {
      const n = this.n;
      const out = [];
      if (n.planes) out.push(['Airliners shot up', String(n.planes)]);
      if (n.burnt) out.push(['Airliners burnt out', String(n.burnt)]);
      if (n.slid) out.push(['Passengers down the slides', n.slid.toLocaleString('en-GB')]);
      if (n.out) out.push(['Fires put out by the airport fire service', String(n.out)]);
      if (n.bowsers) out.push(['Fuel bowsers blown up', String(n.bowsers)]);
      if (n.taken) out.push(['Airside vehicles taken', String(n.taken)]);
      return out;
    }

    serialize() {
      return Object.assign({}, this.n);
    }

    load(d) {
      const n = d || {};
      this.n = { planes: n.planes || 0, burnt: n.burnt || 0, slid: n.slid || 0, out: n.out || 0, bowsers: n.bowsers || 0, taken: n.taken || 0 };
    }
  }

  Air.money = money;
  if (VH.AirportHavoc) VH.AirportHavoc.Air = Air;
  VH.AirportHavocAir = Air;
})();
