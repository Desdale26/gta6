/*
 * airside.js — the living airside at Vicehaven International: the flights,
 * the airliners and everything else that moves behind the terminal.
 *
 *   new VH.Airside(game)     game.airside: a rolling schedule of flights, the
 *                            four contact stands (A1-A4) and their full
 *                            turnarounds, the runway, the ground vehicles and
 *                            crew, a Skylark doing circuits and a visiting
 *                            helicopter now and then
 *   airside.flights()        [{ id, code, airline, city, kind 'dep'|'arr',
 *                            time (game hours), gate, stand, status, est, pax }]
 *   airside.stands()         [{ id, gate, x, z, yaw, door, state, flight, ... }]
 *   events                   airside:landed {flight}, airside:arrived {flight,
 *                            stand, gate}, airside:boarding {flight, stand,
 *                            gate}, airside:closed {flight, stand},
 *                            airside:pushback {flight, stand}, airside:takeoff
 *                            {flight}   (stand = the stand's id, 1..4)
 *   VH.Airside.markings()    the paint for the taxilane, stands and roads
 *                            (airfield.js draws it into the apron)
 *
 * It is all scenery: no physics bodies. A plane or a tug stops for Jay (or a
 * car) in its way; a departure holds and an arrival goes around while he is
 * on the runway. Models are built when they come into view and reused.
 *
 * ------------------------------------------------------------- the plan
 * From airfield.js: runway 09/27 along z -1450 (x -1000..300, 60 m wide), the
 * parallel taxiway along z -1365, links L1..L5 at x -950, -600, -250, 100,
 * 250, the apron x -520..60 by z -1352..-1250 and stands A1..A4 at x -390,
 * -300, -210, -120, z -1276, nose in towards the terminal.
 *
 * Everyone uses runway 09 (the wind is off the bay): arrivals come in from
 * the west over the approach lights, touch down by the aiming point (x -720)
 * and turn off at L4; departures line up at the west end from L1 and take
 * off east over the bay. Taxiing is one way, so nothing ever meets nose to
 * nose:
 *
 *   arrivals    L4 south → taxiway west (x 70..3) → an S-bend onto the
 *               apron taxilane (z -1322) → west along it → a left turn into
 *               the stand (radius 25) → nose in to the stop bar.
 *               Holding point H-IN: on the taxiway, nose wheel at x 10,
 *               until the stand is free and the end of the taxilane clear.
 *   departures  pushed back from the stand with the tail swinging east, onto
 *               the taxilane facing west (stand x + 30) → west along it →
 *               an S-bend onto the taxiway (x -443) → west to L1 → north to
 *               holding point H-OUT (nose wheel at z -1408, short of the
 *               yellow bars) → lines up east → takeoff roll → over the bay.
 *
 * The nose wheel follows the yellow line and the main gear trails it, so a
 * plane cuts its corners like a real one. The taxilane is 46 m behind the
 * parked planes: a taxiing Albatross's wingtips (17 m) clear the parked
 * tails (z -1295) by 10 m and a plane on the taxiway by 9 m. A pushback only
 * starts while nothing on the taxilane is near; a plane keeps 46 m from the
 * one ahead; the runway takes one plane at a time.
 *
 * The airside road (z -1300, a lane each way) runs between the tails and the
 * taxilane, from the depot east of A4 (fuel bowsers, catering trucks, the
 * follow-me car, the service vans) to the west end. Each stand's own
 * equipment waits on two pads by the terminal (west and east of its bridge).
 * Ground vehicles give way to any plane that is moving near them.
 *
 * The Skylark keeps off the airliners' taxi routes: it taxis west along the
 * taxiway to L3, flies right-hand circuits south of the field with
 * touch-and-goes, and after a full-stop landing rolls on to L5 and its spot
 * on the GA apron. The helicopter uses its own pad, H2, on the GA apron (the
 * big pad is the flyable Sparrow's).
 *
 * Time: the sim runs on its own clock (seconds since the game started); the
 * board times are game hours, one game hour to the real minute.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, smoothstep, wrapAngle, dampAngle, moveTowards } = VH.math;
  const PI = Math.PI;
  const HALF = PI / 2;

  // ---------------------------------------------------------------- plan
  const RWY = { x0: -1000, x1: 300, z: -1450, w: 60 }; // as airfield.js
  const TWY_Z = -1365;
  const LANE_Z = -1322; //   the apron taxilane behind the stands
  const ROAD_Z = -1300; //   the airside road (centre line)
  const ROAD_W = ROAD_Z - 1.5; // westbound lane (they keep right)
  const ROAD_E = ROAD_Z + 1.5; // eastbound lane
  const STAND_Z = -1276;
  const STAND_X = [-390, -300, -210, -120]; // as airfield.js STANDS (A1..A4)
  const NOSE = 15.2; //      Albatross: nose wheel ahead of the main gear
  const TD_X = -720; //      the touchdown point (the aiming-point bars)
  const GLIDE = Math.tan((3 * PI) / 180);
  const L1 = -950;
  const L3 = -250;
  const L5 = 250;
  const HOLD_OUT = -1408; // nose wheel z at the departure holding point on L1
  const HOLD_IN = 10; //     nose wheel x at the arrival holding point on the taxiway
  const SEP = 46; //         centre to centre, one taxiing airliner to the next
  const G1 = { x: 190, z: -1318 }; // the Skylark's spot (not the two Jay can take)
  const H2 = { x: 300, z: -1336 }; // the visiting helicopter's pad
  const REMOTE = { x: -470, z: -1300 }; // the flyable Albatross, nose north (airfield.js)
  const DEPOT = { x0: 2, x1: 75, z0: -1292, z1: -1251 };
  const DEPOT_IN_X = 72; //   vehicles come back in down the east side of the depot ...
  const DEPOT_IN_Z = -1254; // ... and along its south side, then turn north into their slot
  const FM_SLOT = [58, -1263];
  const VAN_SLOT = [64, -1270];
  const APRON_C = { x: -230, z: -1320 };

  // Turnaround (seconds from on-block, or from off-block when negative).
  const T_BRIDGE = 12; //    the bridge is on: passengers come off
  const T_DEPLANED = 95;
  const T_MIN = 300; //      the shortest turnaround
  const T_TURN = 355; //     the planned one
  const B_BOARD = -150;
  const B_FINAL = -65;
  const B_CLOSE = -25;
  const PLAN_AHEAD = 1800; // flights planned this far ahead (s)

  // Original airlines and places only.
  const AIRLINES = [
    { name: 'Sunbird', code: 'SB', color: 0xf2a516 },
    { name: 'Coralway', code: 'CW', color: 0xff4f8b },
    { name: 'Bayline', code: 'BL', color: 0x1fa3a3 },
    { name: 'Azurline', code: 'AZ', color: 0x1d4fb8 },
    { name: 'Palmetto Air', code: 'PM', color: 0x2f8f4e },
    { name: 'Kestrel Airways', code: 'KS', color: 0xc8202a },
  ];
  const CITIES = ['Port Elmira', 'San Coralo', 'Bellhaven', 'Marisol Bay', 'Lake Ardea', 'Carver City', 'Isla Brava', 'New Albion',
    'Ravenmoor', 'Sandcastle Key', 'Fort Larkin', 'Esperanza Bay', 'Glenmorrow', 'Calder Springs', 'Saint Aubrey', 'Halverton'];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // --------------------------------------------------------------- paths
  /**
   * A route sampled about every metre: position, heading (yaw: 0 faces +Z,
   * the way models face), the speed limit and the braking to use there.
   * end() works out the fastest speed at each point that can still slow for
   * every limit ahead; at(s) and cap(s) read it back by distance.
   */
  class Path {
    constructor(x, z, h) {
      this.X = [x];
      this.Z = [z];
      this.H = [h];
      this.S = [0];
      this.V = [99];
      this.A = [1];
      this.C = null;
      this.len = 0;
      this._x = x;
      this._z = z;
      this._h = h;
    }

    _add(x, z, h, v, a) {
      this.len += Math.hypot(x - this._x, z - this._z);
      this.X.push(x);
      this.Z.push(z);
      this.H.push(wrapAngle(h));
      this.S.push(this.len);
      this.V.push(v === undefined ? 99 : v);
      this.A.push(a === undefined ? 1 : a);
      this._x = x;
      this._z = z;
      this._h = h;
    }

    line(x1, z1, v, a) {
      const dx = x1 - this._x;
      const dz = z1 - this._z;
      const L = Math.hypot(dx, dz);
      if (L < 0.01) return this;
      const h = Math.atan2(dx, dz);
      const x0 = this._x;
      const z0 = this._z;
      const n = Math.max(1, Math.ceil(L / 1.5));
      for (let i = 1; i <= n; i++) this._add(x0 + (dx * i) / n, z0 + (dz * i) / n, h, v, a);
      return this;
    }

    /** Turn through `ang` (positive left, negative right) on radius r. */
    turn(ang, r, v, a) {
      const sg = ang > 0 ? 1 : -1;
      const y0 = this._h;
      const cx = this._x + sg * r * Math.cos(y0);
      const cz = this._z - sg * r * Math.sin(y0);
      const n = Math.max(2, Math.ceil((Math.abs(ang) * r) / 1.2));
      for (let i = 1; i <= n; i++) {
        const y = y0 + (ang * i) / n;
        this._add(cx - sg * r * Math.cos(y), cz + sg * r * Math.sin(y), y, v, a);
      }
      this._h = y0 + ang;
      return this;
    }

    end(vEnd) {
      const n = this.X.length;
      const C = (this.C = new Float32Array(n));
      C[n - 1] = Math.min(this.V[n - 1], vEnd === undefined ? 0 : vEnd);
      for (let i = n - 2; i >= 0; i--) {
        const ds = this.S[i + 1] - this.S[i];
        C[i] = Math.min(this.V[i], Math.sqrt(C[i + 1] * C[i + 1] + 2 * this.A[i] * ds));
      }
      return this;
    }

    _i(s) {
      const S = this.S;
      let lo = 0;
      let hi = S.length - 1;
      if (s <= 0 || hi < 1) return 0;
      if (s >= this.len) return hi - 1;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (S[m] <= s) lo = m;
        else hi = m;
      }
      return lo;
    }

    at(s, o) {
      const i = this._i(s);
      const j = Math.min(i + 1, this.X.length - 1);
      const span = this.S[j] - this.S[i];
      const k = span > 1e-6 ? clamp((s - this.S[i]) / span, 0, 1) : 0;
      o.x = this.X[i] + (this.X[j] - this.X[i]) * k;
      o.z = this.Z[i] + (this.Z[j] - this.Z[i]) * k;
      o.h = this.H[i] + wrapAngle(this.H[j] - this.H[i]) * k;
      return o;
    }

    /** The speed allowed here (it creeps the last bit rather than stopping short). */
    cap(s) {
      const i = this._i(s);
      const j = Math.min(i + 1, this.C.length - 1);
      const span = this.S[j] - this.S[i];
      const k = span > 1e-6 ? clamp((s - this.S[i]) / span, 0, 1) : 0;
      const c = this.C[i] + (this.C[j] - this.C[i]) * k;
      return s < this.len - 0.01 ? Math.max(c, 0.3) : c;
    }

    points() {
      const out = [];
      for (let i = 0; i < this.X.length; i++) out.push([this.X[i], this.Z[i]]);
      return out;
    }
  }

  /** A route through waypoints ([x, z] pairs) with each corner rounded to radius r. */
  function route(pts, r, v, vEnd) {
    const p0 = pts[0];
    const p1 = pts[1];
    const path = new Path(p0[0], p0[1], Math.atan2(p1[0] - p0[0], p1[1] - p0[1]));
    let used = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (i === pts.length - 1) {
        path.line(b[0], b[1], v, 1.6);
        break;
      }
      const c = pts[i + 1];
      const h1 = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const h2 = Math.atan2(c[0] - b[0], c[1] - b[1]);
      const th = wrapAngle(h2 - h1);
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      let rr = r;
      let t = Math.abs(th) > 1e-3 ? rr * Math.tan(Math.abs(th) / 2) : 0;
      const maxT = Math.max(0, Math.min(l1 - used, l2 / 2));
      if (t > maxT) {
        t = maxT;
        rr = t / Math.tan(Math.abs(th) / 2);
      }
      path.line(b[0] - Math.sin(h1) * t, b[1] - Math.cos(h1) * t, v, 1.6);
      if (Math.abs(th) > 1e-3 && rr > 0.05) path.turn(th, rr, Math.min(v, 1.2 + Math.sqrt(1.4 * rr)), 1.6);
      used = t;
    }
    return path.end(vEnd === undefined ? 0 : vEnd);
  }

  /** Nose-wheel route from touchdown to the stand's stop bar (an arrival). */
  function arrivalPath(st) {
    const p = new Path(TD_X + NOSE, RWY.z, HALF);
    p.line(70, RWY.z, 75, 2.75); //            the landing roll
    p.turn(-HALF, 30, 9, 1.0); //              right onto L4
    p.line(100, -1395, 9, 1.0);
    p.turn(-HALF, 30, 7, 1.0); //              right onto the taxiway, westbound
    p.line(HOLD_IN, TWY_Z, 8, 1.0);
    p.sHoldIn = p.len; //                      H-IN
    p.line(3, TWY_Z, 6, 1.0);
    p.turn(HALF, 21.5, 5, 1.0); //             the S-bend onto the taxilane
    p.turn(-HALF, 21.5, 5, 1.0);
    p.line(st.x + 25, LANE_Z, 8, 1.0);
    p.sTurnIn = p.len;
    p.turn(HALF, 25, 4, 1.0); //               left into the stand
    p.line(st.x, STAND_Z - 12, 3, 0.6);
    p.line(st.x, STAND_Z + NOSE, 1.4, 0.45); // up to the stop bar
    p.sVacate = 0;
    // Off the runway once the nose wheel is past the hold bars on L4.
    for (let i = 0; i < p.Z.length; i++) {
      if (p.X[i] > 90 && p.Z[i] > -1400) {
        p.sVacate = p.S[i];
        break;
      }
    }
    return p.end(0);
  }

  /** Nose-wheel route from the end of the pushback to the far end of the runway (a departure). */
  function departurePath(nx, nz) {
    const p = new Path(nx, nz, -HALF);
    p.line(-400, LANE_Z, 8, 1.0);
    p.turn(-HALF, 21.5, 5, 1.0); //            the S-bend onto the taxiway
    p.turn(HALF, 21.5, 5, 1.0);
    p.line(-920, TWY_Z, 9, 1.0);
    p.turn(-HALF, 30, 5, 1.0); //              right onto L1
    p.line(L1, HOLD_OUT, 4, 1.0);
    p.sHold = p.len; //                        H-OUT
    p.line(L1, RWY.z + RWY.w / 2, 4, 1.0);
    p.turn(-HALF, 30, 4, 1.0); //              right onto the runway, lined up east
    p.line(-905, RWY.z, 4, 1.0);
    p.sLine = p.len;
    p.line(RWY.x1 + 700, RWY.z, 99, 2);
    return p.end(99);
  }

  /** Main-gear route of a pushback: straight back, then the tail swings east onto the taxilane. */
  function pushPath(st) {
    const p = new Path(st.x, STAND_Z, PI);
    p.line(st.x, STAND_Z - 16, 1.5, 0.3);
    p.turn(-HALF, 30, 1.5, 0.3);
    return p.end(0);
  }

  /** A stand-local point (x east of the stand's centre, z south of it) in the world. */
  const W = (st, lx, lz) => [st.x + lx, st.z + lz];

  /** How far (px, pz) is to one side of a plane's centre line. */
  function across(px, pz, x, z, yaw) {
    return Math.abs((px - x) * Math.cos(yaw) - (pz - z) * Math.sin(yaw));
  }

  /**
   * Is (px, pz) under an Albatross with its main gear at (x, z), facing yaw, give or take
   * m metres? Its fuselage, wings and tailplane as three boxes.
   */
  function underPlane(px, pz, x, z, yaw, m) {
    const dx = px - x;
    const dz = pz - z;
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const ax = Math.abs(dx * c - dz * sn); // across
    const lz = dx * sn + dz * c; //          along, + forwards
    if (ax < 2.1 + m && lz > -20 - m && lz < 19.2 + m) return true;
    if (ax < 17.4 + m && lz > -8.3 - m && lz < 5.3 + m - ax * 0.25) return true;
    return ax < 6.7 + m && lz > -20 - m && lz < -14.2 + m;
  }

  // -------------------------------------------------------------- models
  let MAT = null;

  /** A soft round spot of light, for the pool a taxi light throws on the ground. */
  function poolTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function mats() {
    if (MAT) return MAT;
    const hdr = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
    MAT = {
      gse: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.12 }),
      amber: hdr(6, 2.7, 0.35),
      white: hdr(6, 6, 5.4),
      wand: hdr(5, 1.1, 0.25),
      logo: new THREE.MeshBasicMaterial({ color: 0xffe2b8, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      pool: new THREE.MeshBasicMaterial({ map: poolTexture(), color: 0xfff0d4, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
      beam: new THREE.MeshBasicMaterial({ color: 0xfff4dc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    };
    return MAT;
  }

  const C = {
    yellow: 0xe8b417, white: 0xeceae4, grey: 0x8a9097, dark: 0x2a2d31, rubber: 0x161616, glass: 0x22303c,
    orange: 0xf06a1a, blue: 0x2a4f8a, red: 0xc8202a, steel: 0xb4b9bf, belt: 0x1b1c1e,
  };

  const GEO = {};
  /** Merged, vertex-coloured geometry for each kind of ground vehicle (built once). */
  function gseGeometry(kind) {
    if (GEO[kind]) return GEO[kind];
    const K = VH.AircraftKit;
    const k = new K();
    const wheels = (r, w, x, zs, y) => {
      for (const z of zs) for (const s of [1, -1]) k.tyre(r, w, s * x, y === undefined ? r : y, z, C.rubber, 12);
    };
    switch (kind) {
      case 'tug': {
        // A pushback tug: a low, wide slab on four big wheels, the cab sunk in at the back.
        k.box(2.7, 0.85, 5.6, 0, 0.78, 0, C.yellow);
        k.box(2.74, 0.14, 5.64, 0, 0.42, 0, C.dark);
        k.box(1.25, 0.75, 1.5, 0.6, 1.58, -1.75, C.yellow);
        k.box(1.1, 0.5, 0.05, 0.6, 1.62, -0.99, C.glass);
        k.box(0.05, 0.5, 1.2, 1.24, 1.62, -1.75, C.glass);
        k.box(1.35, 0.08, 1.6, 0.6, 1.98, -1.75, C.dark);
        k.box(0.5, 0.25, 0.5, -0.7, 1.32, -2.3, C.dark); // exhaust housing
        k.box(0.16, 0.16, 1.7, 0, 0.5, 3.6, C.grey); //   the towbar
        k.box(0.5, 0.22, 0.3, 0, 0.5, 4.4, C.dark);
        wheels(0.58, 0.46, 1.12, [1.9, -1.9]);
        break;
      }
      case 'bagtug': {
        k.box(1.4, 0.7, 2.6, 0, 0.62, 0, C.white);
        k.box(1.44, 0.12, 2.64, 0, 0.3, 0, C.dark);
        for (const [x, z] of [[0.62, 0.35], [-0.62, 0.35], [0.62, -1.1], [-0.62, -1.1]]) k.box(0.06, 1.0, 0.06, x, 1.45, z, C.dark);
        k.box(1.44, 0.08, 1.6, 0, 1.97, -0.38, C.blue);
        k.box(1.3, 0.55, 0.05, 0, 1.45, 0.36, C.glass);
        k.box(0.6, 0.4, 0.5, 0, 1.15, -0.5, C.dark); // seat
        k.box(0.12, 0.12, 0.5, 0, 0.45, -1.5, C.grey);
        wheels(0.34, 0.25, 0.62, [0.85, -0.85]);
        break;
      }
      case 'cart': {
        k.box(1.5, 0.1, 2.8, 0, 0.55, 0, C.grey);
        for (const [x, z] of [[0.7, 1.35], [-0.7, 1.35], [0.7, -1.35], [-0.7, -1.35]]) k.box(0.05, 1.3, 0.05, x, 1.25, z, C.dark);
        k.box(1.56, 0.07, 2.9, 0, 1.92, 0, C.blue);
        k.box(0.03, 1.1, 2.7, -0.73, 1.2, 0, 0x22345a); // a curtain down one side
        // Bags.
        const bags = [0x2b2b2b, 0xc8202a, 0x2a4f8a, 0x5a3a24, 0x6b6f4a, 0x1d1f24, 0x8a2a5a];
        let n = 0;
        for (let z = -1.0; z <= 1.01; z += 0.68) {
          for (const x of [-0.35, 0.35]) {
            const c = bags[(n++ * 3 + 1) % bags.length];
            k.box(0.55, 0.45 + (n % 3) * 0.06, 0.6, x, 0.84, z, c);
          }
        }
        k.box(0.1, 0.1, 0.9, 0, 0.42, 1.85, C.grey); //   drawbar
        wheels(0.22, 0.14, 0.6, [1.0, -1.0]);
        break;
      }
      case 'belt': {
        k.box(1.7, 0.6, 5.0, 0, 0.62, -0.7, C.white);
        k.box(1.74, 0.12, 5.04, 0, 0.3, -0.7, C.dark);
        k.box(0.95, 1.0, 1.2, 0.38, 1.42, -2.5, C.white);
        k.box(0.8, 0.45, 0.05, 0.38, 1.6, -1.88, C.glass);
        k.box(1.0, 0.07, 1.3, 0.38, 1.95, -2.5, C.dark);
        // The conveyor, rising to the hold door ahead.
        const len = Math.hypot(7.0, 1.1);
        const ang = Math.atan2(1.1, 7.0);
        k.box(0.9, 0.16, len, -0.15, 1.5, 0.95, C.belt, -ang);
        for (const s of [1, -1]) k.box(0.06, 0.28, len, -0.15 + s * 0.48, 1.62, 0.95, C.grey, -ang);
        k.box(0.12, 0.9, 0.12, -0.15, 1.15, 3.0, C.grey);
        wheels(0.36, 0.24, 0.72, [1.2, -2.4]);
        break;
      }
      case 'cater': {
        k.box(2.3, 2.0, 1.9, 0, 1.45, 2.9, C.white);
        k.box(2.1, 0.9, 0.05, 0, 1.9, 3.86, C.glass);
        k.box(2.2, 0.45, 7.4, 0, 0.75, 0, C.grey);
        k.box(2.32, 0.18, 1.92, 0, 0.52, 2.9, C.dark);
        wheels(0.48, 0.32, 0.92, [2.6, -1.4, -2.6]);
        break;
      }
      case 'caterbox': {
        k.box(2.4, 2.45, 4.8, 0, 1.22, 0, C.white);
        k.box(2.42, 0.38, 4.82, 0, 1.75, 0, C.blue);
        k.box(1.6, 0.08, 1.3, 1.85, 0.04, 0.6, C.grey); // the platform to the door (on the left)
        for (const z of [0.0, 1.2]) k.box(0.04, 0.9, 0.04, 2.6, 0.5, z, C.grey);
        break;
      }
      case 'scissor': {
        // Crossed arms, 1 m tall (scaled with the lift).
        for (const s of [1, -1]) {
          k.strut([s * 0.9, 0, -1.8], [s * 0.9, 1, 1.0], 0.06, C.grey);
          k.strut([s * 0.9, 1, -1.8], [s * 0.9, 0, 1.0], 0.06, C.grey);
        }
        break;
      }
      case 'fuel': {
        k.box(2.3, 2.1, 1.8, 0, 1.5, 3.1, C.white);
        k.box(2.1, 0.85, 0.05, 0, 1.95, 4.01, C.glass);
        k.box(2.2, 0.45, 7.6, 0, 0.75, 0, C.grey);
        k.cyl(1.12, 1.12, 5.4, 18, 0, 1.95, -0.85, C.white);
        k.sphere(1.12, 1, 1, 0.3, 0, 1.95, 1.85, C.white, 14, 8);
        k.sphere(1.12, 1, 1, 0.3, 0, 1.95, -3.55, C.white, 14, 8);
        k.cyl(1.14, 1.14, 0.45, 18, 0, 1.95, -0.85, C.red);
        k.box(0.5, 0.12, 4.6, 0, 3.08, -0.85, C.grey); //  walkway on top
        k.cyl(0.38, 0.38, 0.7, 12, 0, 1.0, -3.75, C.dark, 0, HALF); // hose reel
        wheels(0.5, 0.34, 0.92, [2.7, -1.6, -2.8]);
        break;
      }
      case 'hose': {
        k.cyl(0.06, 0.06, 1, 6, 0, 0, 0.5, C.dark);
        break;
      }
      case 'stairs': {
        k.box(2.3, 0.55, 7.0, 0, 0.75, 0, C.grey);
        k.box(2.1, 1.7, 1.6, 0, 1.75, 2.55, C.white);
        k.box(1.9, 0.6, 0.05, 0, 2.05, 3.36, C.glass);
        // The flight of steps from the back up to a platform over the cab.
        const steps = 12;
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          k.box(1.3, 0.08, 0.36, 0, 1.15 + t * 1.75, -3.0 + t * 4.4, C.steel);
        }
        for (const s of [1, -1]) {
          k.strut([s * 0.68, 1.1, -3.2], [s * 0.68, 2.9, 1.5], 0.06, C.white);
          k.strut([s * 0.7, 2.1, -3.2], [s * 0.7, 3.9, 1.5], 0.035, C.steel);
          k.strut([s * 0.7, 3.9, 1.5], [s * 0.7, 3.9, 3.5], 0.035, C.steel);
          k.strut([s * 0.7, 2.95, 3.5], [s * 0.7, 3.9, 3.5], 0.035, C.steel);
        }
        k.box(1.5, 0.1, 2.1, 0, 2.95, 2.5, C.steel);
        k.box(1.6, 0.25, 2.2, 0, 2.8, 2.5, C.blue);
        wheels(0.46, 0.3, 0.92, [2.4, -2.2]);
        break;
      }
      case 'cone': {
        k.cyl(0.03, 0.17, 0.55, 10, 0, 0.3, 0, C.orange, -HALF);
        k.cyl(0.13, 0.14, 0.08, 10, 0, 0.32, 0, 0xf4f4ef, -HALF);
        k.box(0.4, 0.04, 0.4, 0, 0.02, 0, C.orange);
        break;
      }
      case 'sign': {
        // The chequered FOLLOW ME board for the roof of the follow-me car.
        for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) k.box(0.05, 0.19, 0.19, 0, 0.1 + j * 0.19, -0.7 + i * 0.19 + 0.095, (i + j) % 2 ? 0x111214 : 0xf2c61f);
        k.box(0.06, 0.06, 1.6, 0, 0.0, 0.03, C.dark);
        break;
      }
      case 'wand': {
        k.cyl(0.035, 0.035, 0.42, 6, 0, 0, 0, 0xffffff, HALF);
        break;
      }
      case 'beacon': {
        k.sphere(0.13, 1, 0.8, 1, 0, 0.08, 0, 0xffffff, 8, 6);
        break;
      }
      case 'light': {
        k.sphere(0.22, 1, 1, 1, 0, 0, 0, 0xffffff, 8, 6);
        break;
      }
      default:
        break;
    }
    GEO[kind] = k.geometry();
    return GEO[kind];
  }

  // Each kind: its body length (for keeping apart) and where its beacon sits.
  const KINDS = {
    tug: { len: 5.6, beacon: [0.6, 2.05, -1.75] },
    bagtug: { len: 2.6, beacon: [0, 2.03, -0.4] },
    belt: { len: 5.0, beacon: [0.38, 2.0, -2.5] },
    cater: { len: 7.4, beacon: [0, 2.55, 3.4] },
    fuel: { len: 7.6, beacon: [0, 2.62, 3.4] },
    stairs: { len: 7.0, beacon: [0, 2.68, 2.9] },
    followme: { len: 5.2, beacon: null },
    van: { len: 5.2, beacon: null },
  };

  function gseMesh(kind) {
    const m = new THREE.Mesh(gseGeometry(kind), mats().gse);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // ---------------------------------------------------------- airliners
  const _a = { x: 0, z: 0, h: 0 };
  const _b = { x: 0, z: 0, h: 0 };
  const _c = { x: 0, z: 0, h: 0 };

  /** One airliner from the moment it is on approach (or parked) until it is gone. */
  class Airliner {
    constructor(sys, rot) {
      this.sys = sys;
      this.rot = rot;
      this.color = rot.airline.color;
      this.model = null;
      this.phase = 'new';
      this.t = 0;
      this.navT = Math.random() * 5;
      this.x = 0;
      this.y = 0;
      this.z = RWY.z;
      this.yaw = HALF;
      this.pitch = 0;
      this.roll = 0;
      this.nx = 0;
      this.nz = 0;
      this.v = 0;
      this.path = null;
      this.s = 0;
      this.stopS = Infinity;
      this.eng = 1;
      this.engTarget = 1;
      this.thrust = 0.3;
      this.cleared = false;
      this.released = false;
      this.align = null;
      this.voice = null;
      this.gone = false;
      this.blockT = 0;
      this.blocker = null;
      this.outYaw = HALF + rand(-0.35, 0.3);
      this.reject = false;
    }

    get onGround() {
      return this.phase === 'rollout' || this.phase === 'taxiin' || this.phase === 'taxiout' || this.phase === 'pushback' || this.phase === 'lineup' || this.phase === 'takeoff' || this.phase === 'parked' || this.phase === 'tugoff';
    }

    get moving() {
      return this.phase === 'pushback' || ((this.phase === 'rollout' || this.phase === 'taxiin' || this.phase === 'taxiout' || this.phase === 'takeoff') && this.v > 0.15);
    }

    placeParked(st) {
      this.phase = 'parked';
      this.x = st.x;
      this.z = STAND_Z;
      this.y = 0;
      this.yaw = 0;
      this.nx = st.x;
      this.nz = STAND_Z + NOSE;
      this.v = 0;
      this.eng = this.engTarget = 0;
    }

    startApproach(eta) {
      this.phase = 'approach';
      this.t = 0;
      this.x = TD_X - eta * 68.5;
      this.z = RWY.z;
      this.y = (TD_X - this.x) * GLIDE;
      this.v = 68;
      this.yaw = HALF;
      this.pitch = 0.045;
      this.eng = this.engTarget = 1;
    }

    eta() {
      return this.phase === 'approach' ? Math.max(0, (TD_X - this.x) / Math.max(30, this.v)) : Infinity;
    }

    update(dt) {
      this.t += dt;
      this.navT += dt;
      switch (this.phase) {
        case 'approach':
          this._approach(dt);
          break;
        case 'goaround':
        case 'climb':
          this._climb(dt);
          break;
        case 'rollout':
        case 'taxiin':
        case 'taxiout':
          this._ground(dt);
          break;
        case 'lineup':
          if (this.t > 3.5 && !this.sys._jayRwy) {
            this.phase = 'takeoff';
            this.t = 0;
          }
          break;
        case 'takeoff':
          this._takeoff(dt);
          break;
        case 'pushback':
          this._push(dt);
          break;
        case 'tugoff':
          if (this.t > 7) this.sys._beginTaxiOut(this);
          break;
        default:
          break;
      }
      this.eng = moveTowards(this.eng, this.engTarget, dt / (this.engTarget > this.eng ? 28 : 14));
      this._thrust();
    }

    _thrust() {
      const p = this.phase;
      let th = 0.25;
      if (p === 'approach') th = this.y < 12 ? 0.18 : 0.42;
      else if (p === 'rollout') th = this.t < 9 && this.v > 25 ? 0.85 : 0.28; // reverse thrust, then idle
      else if (p === 'takeoff') th = this.reject ? 0.3 : 0.97;
      else if (p === 'climb' || p === 'goaround') th = this.y > 350 ? 0.78 : 0.95;
      else if (p === 'taxiin' || p === 'taxiout') th = 0.24 + Math.min(0.12, this.v * 0.012);
      else if (p === 'lineup') th = 0.4 + Math.min(0.4, this.t * 0.12);
      else th = 0.16;
      this.thrust = th;
    }

    _approach(dt) {
      const d = TD_X - this.x;
      this.v = lerp(66, 70, clamp(d / 4000, 0, 1));
      this.x += this.v * dt;
      const D = 280;
      if (d > D) {
        this.y = d * GLIDE;
        this.pitch = 0.045;
      } else {
        // The flare: round out from the glide slope to touch down gently.
        const u = Math.max(0, d) / D;
        const s0 = 0.012;
        this.y = D * (GLIDE * (2 * u * u - u * u * u) + s0 * (u - 2 * u * u + u * u * u));
        this.pitch = lerp(0.088, 0.045, u);
      }
      this.roll = Math.sin(this.t * 0.35) * 0.012 * smoothstep(300, 1200, d);
      if (d <= 0) this.sys._touchdown(this);
    }

    _climb(dt) {
      const ga = this.phase === 'goaround';
      this.v = Math.min(ga ? 84 : 96, this.v + 1.4 * dt);
      this.pitch = Math.min(ga ? 0.14 : 0.16, this.pitch + 0.04 * dt);
      const gam = Math.max(0, this.pitch - 0.05) * (this.y > 500 ? 0.5 : 1);
      if (this.x > 1300 && !ga) {
        const want = this.outYaw;
        const dy = wrapAngle(want - this.yaw);
        this.yaw += clamp(dy, -0.05 * dt, 0.05 * dt);
        this.roll = dampAngle(this.roll, clamp(-dy * 1.4, -0.32, 0.32), 1.5, dt);
      } else this.roll = dampAngle(this.roll, 0, 2, dt);
      const hv = Math.cos(gam) * this.v;
      this.x += Math.sin(this.yaw) * hv * dt;
      this.z += Math.cos(this.yaw) * hv * dt;
      this.y += Math.sin(gam) * this.v * dt;
      if (this.y > 40) this.sys._rwyRelease(this);
      if (this.x > RWY.x1 + 4200 || this.y > 1100) this.sys._planeGone(this);
    }

    _ground(dt) {
      const P = this.path;
      let vt = P.cap(this.s);
      let stop = this.stopS;
      const blk = this.sys._lookAhead(this);
      if (blk < Infinity) stop = Math.min(stop, this.s + blk);
      this.blockT = this.blocker ? this.blockT + dt : 0;
      if (stop < Infinity) vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 1.0 * (stop - this.s - 0.25))));
      const dec = this.phase === 'rollout' && this.v > 12 ? 2.9 : blk < 25 ? 3.2 : 1.3;
      this.v = this.v < vt ? Math.min(vt, this.v + 0.75 * dt) : Math.max(vt, this.v - dec * dt);
      this.s = Math.min(P.len, this.s + this.v * dt);
      this._follow(dt);
      if (this.phase === 'rollout') {
        this.pitch = Math.max(0, this.pitch - 0.035 * dt);
        if (this.s > P.sVacate && P.sVacate > 0) {
          this.phase = 'taxiin';
          this.sys._rwyRelease(this);
        }
      }
      if (this.phase === 'taxiin' && this.s >= P.len - 0.03) this.sys._onBlock(this);
      if (this.phase === 'taxiout' && this.cleared && this.s >= P.sLine - 0.3 && this.v < 0.2) {
        this.phase = 'lineup';
        this.t = 0;
      }
    }

    /** Nose wheel on the line; the main gear trails it at the wheelbase. */
    _follow(dt) {
      this.path.at(this.s, _a);
      this.nx = _a.x;
      this.nz = _a.z;
      const dx = this.nx - this.x;
      const dz = this.nz - this.z;
      const d = Math.hypot(dx, dz) || 1;
      this.x = this.nx - (dx / d) * NOSE;
      this.z = this.nz - (dz / d) * NOSE;
      if (this.align) {
        // The last stretch to the stop bar: square up on the stand's centre line.
        const k = smoothstep(this.path.len - 34, this.path.len - 4, this.s);
        if (k > 0) {
          this.x = lerp(this.x, this.align.x, k * Math.min(1, dt * 2.2));
          this.z = this.nz - Math.sqrt(Math.max(1, NOSE * NOSE - (this.nx - this.x) * (this.nx - this.x)));
        }
      }
      this.yaw = Math.atan2(this.nx - this.x, this.nz - this.z);
    }

    _takeoff(dt) {
      const jay = this.sys._jayRwy;
      const blk = this.sys._lookAhead(this);
      if (jay && this.v < 32) this.reject = true;
      if (this.reject || blk < Infinity) {
        this.v = Math.max(0, this.v - 3.6 * dt);
        if (this.v === 0 && !jay && blk === Infinity) this.reject = false;
      } else this.v += (this.v > 70 ? 1.6 : 2.5) * dt;
      this.s += this.v * dt;
      this._follow(dt);
      if (this.v > 70) this.pitch = Math.min(0.155, this.pitch + 0.06 * dt);
      if (this.pitch > 0.1) {
        this.phase = 'climb';
        this.t = 0;
        this.sys._liftoff(this);
      }
    }

    _push(dt) {
      const P = this.path;
      let vt = P.cap(this.s);
      const blk = this.sys._lookBehind(this);
      if (blk < Infinity) vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 0.6 * blk)));
      this.v = this.v < vt ? Math.min(vt, this.v + 0.3 * dt) : Math.max(vt, this.v - 0.6 * dt);
      this.s = Math.min(P.len, this.s + this.v * dt);
      P.at(this.s, _a);
      this.x = _a.x;
      this.z = _a.z;
      this.yaw = wrapAngle(_a.h + PI);
      this.nx = this.x + Math.sin(this.yaw) * NOSE;
      this.nz = this.z + Math.cos(this.yaw) * NOSE;
      if (this.s >= P.len - 0.02) this.sys._pushDone(this);
    }

    // ------------------------------------------------------------ looks
    attach() {
      if (this.model || !VH.AircraftModels) return;
      this.model = this.sys._takeModel('albatross', this.color);
      this.sys.game.scene.add(this.model.root);
      this._pose(0);
    }

    detach() {
      if (!this.model) return;
      this.sys.game.scene.remove(this.model.root);
      this.sys._putModel(this.model);
      this.model = null;
    }

    _pose() {
      const m = this.model;
      if (!m) return;
      m.root.position.set(this.x, this.y, this.z);
      m.root.rotation.set(0, this.yaw, 0);
      m.body.rotation.set(-this.pitch, 0, this.roll);
      const night = this.sys.night;
      const p = this.phase;
      m.setNav(true, this.navT);
      const air = p === 'approach' || p === 'climb' || p === 'goaround' || p === 'takeoff' || p === 'lineup' || (p === 'rollout' && this.v > 25);
      const powered = this.eng > 0.04 || this.rot.flags.closed;
      if (m.strobe) m.strobe.visible = air && this.navT % 1.2 < 0.08;
      if (m.beacon) m.beacon.visible = powered && this.navT % 1.0 < 0.5;
      for (const n of m.navs) n.visible = night > 0.12 || powered;
      const x = m._air;
      if (x) {
        x.logo.visible = night > 0.25;
        const land = night > 0.12 && (air || (p === 'approach' && this.y < 400));
        for (const l of x.land) l.visible = land;
        x.beam.visible = land && this.y < 250;
        x.taxi.visible = night > 0.12 && (p === 'taxiin' || p === 'taxiout' || p === 'rollout' || p === 'lineup' || p === 'pushback') && this.eng > 0.3;
        x.pool.visible = night > 0.12 && this.y < 3 && (x.taxi.visible || p === 'takeoff') && p !== 'pushback';
      }
    }
  }

  /** The bits an airliner model gets on top of aircraft.js's: logo lights on the fin, landing and taxi lights. */
  function dressAirliner(m) {
    const M = mats();
    const g = new THREE.BufferGeometry();
    // A soft wash of light up both sides of the fin.
    const v = [];
    for (const s of [0.42, -0.42]) {
      const q = [[-13.2, 5.2], [-19.0, 5.2], [-19.9, 10.2], [-17.6, 10.2]];
      v.push(s, q[0][1], q[0][0], s, q[1][1], q[1][0], s, q[2][1], q[2][0]);
      v.push(s, q[0][1], q[0][0], s, q[2][1], q[2][0], s, q[3][1], q[3][0]);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const logo = new THREE.Mesh(g, M.logo);
    logo.visible = false;
    m.body.add(logo);
    const lg = gseGeometry('light');
    const land = [];
    for (const [x, y, z] of [[2.6, 2.3, 4.6], [-2.6, 2.3, 4.6]]) {
      const l = new THREE.Mesh(lg, M.white);
      l.position.set(x, y, z);
      l.visible = false;
      m.body.add(l);
      land.push(l);
    }
    const taxi = new THREE.Mesh(lg, M.white);
    taxi.position.set(0, 1.55, 15.4);
    taxi.scale.setScalar(0.7);
    taxi.visible = false;
    m.body.add(taxi);
    // A faint beam ahead of the landing lights (it reads at night from a long way off).
    const bg = new THREE.ConeGeometry(7, 70, 12, 1, true);
    bg.rotateX(-HALF);
    bg.translate(0, 0, 40);
    const beam = new THREE.Mesh(bg, M.beam);
    beam.position.set(0, 2.2, 4.6);
    beam.rotation.x = 0.06;
    beam.visible = false;
    m.body.add(beam);
    // The pool of light the taxi and landing lights throw on the ground ahead.
    const pg = new THREE.PlaneGeometry(1, 1);
    pg.rotateX(-HALF);
    const pool = new THREE.Mesh(pg, M.pool);
    pool.position.set(0, 0.07, 30);
    pool.scale.set(11, 1, 30);
    pool.visible = false;
    pool.renderOrder = 2;
    m.root.add(pool);
    m._air = { logo, land, taxi, beam, pool };
  }

  // ------------------------------------------------------ ground vehicles
  /**
   * One ground vehicle (a tug, a belt loader, a bowser ...): it drives legs
   * of path (forwards or in reverse), gives way, and parks. The baggage tug
   * pulls a train of carts that follow its track.
   */
  class Gse {
    constructor(sys, kind, x, z, yaw, opts) {
      this.sys = sys;
      this.id = ++Gse.seq;
      this.kind = kind;
      this.x = x;
      this.z = z;
      this.yaw = yaw;
      this.v = 0;
      this.legs = [];
      this.path = null;
      this.rev = false;
      this.s = 0;
      this.onDone = null;
      this.blockT = 0;
      this.lift = 0; //     catering box: 0 down .. 1 at the door
      this.liftTo = 0;
      this.hose = false;
      this.post = 'home';
      this.k = KINDS[kind] || KINDS.tug;
      this.beaconPhase = Math.random() * 3;
      this.attached = null; // the airliner it is pushing
      this.root = new THREE.Group();
      this.parts = {};
      this.carts = null;
      if (opts && opts.model) this.root.add(opts.model.root || opts.model);
      this.car = opts && opts.car ? opts.car : null;
      this._build();
      sys.game.scene.add(this.root);
      this.place(x, z, yaw);
    }

    _build() {
      const k = this.kind;
      if (this.car) return;
      if (k === 'train') {
        this.root.add(gseMesh('bagtug'));
        this.carts = [];
        this.hist = [];
        for (let i = 0; i < 3; i++) {
          const m = gseMesh('cart');
          this.sys.game.scene.add(m);
          this.carts.push({ m, x: this.x, z: this.z, yaw: this.yaw });
        }
        this.k = KINDS.bagtug;
        return;
      }
      this.root.add(gseMesh(k));
      if (k === 'cater') {
        this.parts.box = gseMesh('caterbox');
        this.parts.box.position.set(0, 1.0, -1.25);
        this.root.add(this.parts.box);
        this.parts.scissor = gseMesh('scissor');
        this.parts.scissor.position.set(0, 0.98, -0.6);
        this.parts.scissor.scale.y = 0.02;
        this.root.add(this.parts.scissor);
      }
      if (k === 'fuel') {
        this.parts.hose = gseMesh('hose');
        this.parts.hose.visible = false;
        this.root.add(this.parts.hose);
      }
    }

    place(x, z, yaw) {
      this.x = x;
      this.z = z;
      this.yaw = yaw;
      this.path = null;
      this.legs.length = 0;
      this.v = 0;
      if (this.carts) {
        this.hist.length = 0;
        for (let i = 0; i < this.carts.length; i++) {
          const c = this.carts[i];
          const d = 3.45 * (i + 1);
          c.x = x - Math.sin(yaw) * d;
          c.z = z - Math.cos(yaw) * d;
          c.yaw = yaw;
        }
      }
      this._pose(0);
    }

    /** legs: [{ path, rev }]. */
    go(legs, onDone) {
      this.legs = legs.slice();
      this.onDone = onDone || null;
      this._next();
    }

    _next() {
      const L = this.legs.shift();
      if (!L) {
        this.path = null;
        this.v = 0;
        return false;
      }
      this.path = L.path;
      this.rev = !!L.rev;
      this.s = 0;
      return true;
    }

    get busy() {
      return !!this.path;
    }

    update(dt) {
      if (this.attached) return;
      if (this.path) {
        const P = this.path;
        let vt = P.cap(this.s);
        const blk = this.sys._gseBlocked(this);
        if (blk < Infinity) {
          vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 2.2 * (blk - 0.4))));
          this.blockT += dt;
        } else this.blockT = 0;
        this.gseBlockT = this._blkKind === 'gse' ? (this.gseBlockT || 0) + dt : 0;
        if (this.rev && this.gseBlockT > 3 && this.onStuck) this.onStuck(this);
        if (this.rev) vt = Math.min(vt, 2.2);
        this.v = this.v < vt ? Math.min(vt, this.v + 1.4 * dt) : Math.max(vt, this.v - 3 * dt);
        this.s = Math.min(P.len, this.s + this.v * dt);
        P.at(this.s, _b);
        this.x = _b.x;
        this.z = _b.z;
        const h = this.rev ? _b.h + PI : _b.h;
        this.yaw = dampAngle(this.yaw, h, 9, dt);
        if (this.carts) this._trail();
        if (this.s >= P.len - 0.02) {
          if (!this._next()) {
            const f = this.onDone;
            this.onDone = null;
            if (f) f(this);
          }
        }
      }
      if (this.parts.box) {
        this.lift = moveTowards(this.lift, this.liftTo, dt / 12);
        const y = 1.0 + smoothstep(0, 1, this.lift) * 1.98;
        this.parts.box.position.y = y;
        this.parts.scissor.scale.y = Math.max(0.02, y - 0.98);
      }
      this._pose(dt);
    }

    _trail() {
      // The carts follow the tug's track (a breadcrumb trail every 0.3 m).
      const H = this.hist;
      const last = H.length ? H[H.length - 1] : null;
      if (!last || Math.hypot(this.x - last.x, this.z - last.z) > 0.3) {
        H.push({ x: this.x, z: this.z });
        if (H.length > 80) H.shift();
      }
      let need = 3.45;
      let ci = 0;
      let acc = 0;
      let px = this.x;
      let pz = this.z;
      for (let i = H.length - 1; i >= 0 && ci < this.carts.length; i--) {
        const q = H[i];
        const d = Math.hypot(px - q.x, pz - q.z);
        while (ci < this.carts.length && acc + d >= need) {
          const k = d > 1e-6 ? (need - acc) / d : 0;
          const c = this.carts[ci];
          const nx = px + (q.x - px) * k;
          const nz = pz + (q.z - pz) * k;
          // A cart's drawbar points at whatever pulls it.
          const fx = ci === 0 ? this.x : this.carts[ci - 1].x;
          const fz = ci === 0 ? this.z : this.carts[ci - 1].z;
          c.yaw = Math.atan2(fx - nx, fz - nz);
          c.x = nx;
          c.z = nz;
          ci++;
          need += 3.45;
        }
        acc += d;
        px = q.x;
        pz = q.z;
      }
    }

    _pose() {
      this.root.position.set(this.x, 0, this.z);
      this.root.rotation.set(0, this.yaw, 0);
      if (this.carts) {
        for (const c of this.carts) {
          c.m.position.set(c.x, 0, c.z);
          c.m.rotation.set(0, c.yaw, 0);
        }
      }
      if (this.car) {
        for (const w of this.car.wheels) w.spin.rotation.x += (this.v * (this.rev ? -1 : 1) * 0.016) / (w.radius || 0.35);
      }
    }

    setVisible(v) {
      this.root.visible = v;
      if (this.carts) for (const c of this.carts) c.m.visible = v;
    }

    dispose() {
      this.root.removeFromParent();
      if (this.carts) for (const c of this.carts) c.m.removeFromParent();
      if (this.car) this.car = null;
    }
  }

  Gse.seq = 0;

  // ------------------------------------------------------------ the crew
  const HIVIS = [0xff9b1a, 0xd8f21a, 0xffb000];

  /** Ground crew: walk to a spot, face a way, wave the wands, run from trouble. */
  class CrewBrain {
    constructor(role) {
      this.role = role;
      this.goal = null;
      this.face = null;
      this.t = Math.random() * 10;
      this.wave = 0; // 1 come ahead, 2 stop
      this.leave = false;
      this.gone = false;
      this.fear = null;
    }

    update(a, dt) {
      this.t += dt;
      const an = a.anim;
      an.handsUp = 0;
      an.talk = 0;
      an.sprint = false;
      an.cower = 0;
      an.phone = 0;
      an.aim = 0;
      an.crouch = 0;
      if (this.fear) {
        const dx = a.pos.x - this.fear.x;
        const dz = a.pos.z - this.fear.z;
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 6, dt);
        a.moveSpeed = 4.8;
        an.sprint = true;
        this.fear.t -= dt;
        if (this.fear.t <= 0) this.gone = true;
        return;
      }
      if (this.goal) {
        const dx = this.goal.x - a.pos.x;
        const dz = this.goal.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.35) {
          a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 7, dt);
          a.moveSpeed = Math.min(this.goal.run ? 3.4 : 1.45, d * 1.6 + 0.25);
        } else {
          a.moveSpeed = 0;
          this.goal = null;
          if (this.leave) this.gone = true;
        }
      } else a.moveSpeed = 0;
      if (!this.goal && this.face !== null) a.heading = dampAngle(a.heading, this.face, 5, dt);
      if (this.wave === 1) an.handsUp = 0.62 + 0.38 * Math.sin(this.t * 6.2);
      else if (this.wave === 2) an.handsUp = 1;
      if (this.role === 'handler' && !this.goal && Math.sin(this.t * 0.5) > 0.75) an.talk = 0.6;
    }

    expired() {
      return this.gone;
    }
  }

  // ------------------------------------------------------------- airside
  class Airside {
    constructor(game) {
      this.game = game;
      const a = game.layout && game.layout.airport;
      this.ok = !!(a && game.world && game.world.airfield && a.stands && a.stands.length && VH.AircraftModels);
      this.saveKey = 'airside';
      this.seenOff = 0;
      if (!this.ok) return;
      this.standList = a.stands.map((s, i) => ({
        id: s.id, gate: s.gate, x: s.x, z: s.z, yaw: s.yaw || 0, door: s.door, i,
        state: 'empty', cur: null, queue: [], gse: null, crew: [], cones: false,
      }));
      this.planes = [];
      this.rots = [];
      this.rwy = new Set();
      this._obs = [];
      this._obsPool = [];
      this.pool = new Map();
      this.inited = false;
      this.t = 0;
      this.night = 0;
      this._lodT = 0;
      this._statusT = 0;
      this._voiceT = 0;
      this._jayRwy = false;
      this.crew = [];
      this.voices = [];
      this._clock = { h0: 0, t0: 0, set: false };
      this.extras = null;
      this._buildShared();
      this._warmup();
      VH.events.on('crowd:threat', (e) => this._threat(e));
      VH.events.on('agent:died', (e) => this._crewDied(e && e.agent));
    }

    // ----------------------------------------------------------- shared
    _buildShared() {
      const M = mats();
      const scene = this.game.scene;
      // Every beacon and cone in one draw call each.
      this.beacons = new THREE.InstancedMesh(gseGeometry('beacon'), M.amber, 96);
      this.beacons.count = 0;
      this.beacons.frustumCulled = false;
      scene.add(this.beacons);
      this.cones = new THREE.InstancedMesh(gseGeometry('cone'), M.gse, 32);
      this.cones.count = 0;
      this.cones.frustumCulled = false;
      this.cones.castShadow = false;
      scene.add(this.cones);
      this._m4 = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this._v3 = new THREE.Vector3();
      this._s3 = new THREE.Vector3(1, 1, 1);
      this._y = new THREE.Vector3(0, 1, 0);
      this._zAxis = new THREE.Vector3(0, 0, 1);
    }

    /** One of each model, out of sight, so the loading screen compiles their shaders. */
    _warmup() {
      try {
        const g = (this._warm = new THREE.Group());
        g.position.set(0, -3000, 0);
        const al = VH.AircraftModels.build('albatross', AIRLINES[0].color);
        dressAirliner(al);
        for (const k of Object.keys(al._air)) {
          const o = al._air[k];
          for (const q of Array.isArray(o) ? o : [o]) q.visible = true;
        }
        g.add(al.root);
        this._warmModel = al;
        for (const k of ['tug', 'cater', 'cone', 'beacon']) g.add(gseMesh(k));
        g.add(new THREE.Mesh(gseGeometry('light'), mats().amber));
        g.add(new THREE.Mesh(gseGeometry('wand'), mats().wand));
        this._warmSmall = [];
        for (const [type, col] of [['skylark', 0xf2f2ee], ['sparrow', 0x1d4fb8]]) {
          if (!VH.AircraftModels.spec(type)) continue;
          const m = VH.AircraftModels.build(type, col);
          g.add(m.root);
          this._warmSmall.push(m);
        }
        this.game.scene.add(g);
        // Build each airline's geometry now (it's cached per colour), not mid-game.
        for (const al2 of AIRLINES.slice(1)) {
          const m = VH.AircraftModels.build('albatross', al2.color);
          dressAirliner(m);
          this._putModel(m);
        }
      } catch (err) {
        console.warn('[airside] warm-up failed', err);
      }
    }

    _dropWarm() {
      const g = this._warm;
      if (!g) return;
      this._warm = null;
      g.removeFromParent();
      if (this._warmModel) {
        g.remove(this._warmModel.root);
        for (const k of Object.keys(this._warmModel._air)) {
          const o = this._warmModel._air[k];
          for (const q of Array.isArray(o) ? o : [o]) q.visible = false;
        }
        this._putModel(this._warmModel);
        this._warmModel = null;
      }
      for (const m of this._warmSmall || []) this._putModel(m);
      this._warmSmall = null;
    }

    _takeModel(type, color) {
      const key = type + '|' + color;
      const list = this.pool.get(key);
      let m = list && list.length ? list.pop() : null;
      if (!m) {
        m = VH.AircraftModels.build(type, color);
        if (type === 'albatross') dressAirliner(m);
      }
      m.root.visible = true;
      return m;
    }

    _putModel(m) {
      if (!m) return;
      m.root.removeFromParent();
      const key = m.type + '|' + m.color;
      if (!this.pool.has(key)) this.pool.set(key, []);
      const list = this.pool.get(key);
      if (list.length < 6) list.push(m);
      else m.dispose();
    }

    // ------------------------------------------------------- lifecycle
    _init() {
      this.inited = true;
      this.t = 0;
      this._serial = 0;
      this._num = new Map();
      this.rots = [];
      this.planes = [];
      this.rwy.clear();
      this._clock.set = false;
      for (const st of this.standList) {
        st.state = 'empty';
        st.cur = null;
        st.queue = [];
        st.cones = false;
      }
      // Two or three stands busy, each at a different point of its turnaround.
      const busy = Math.random() < 0.5 ? 2 : 3;
      const order = shuffle([0, 1, 2, 3]);
      const ages = shuffle([70, 180, 310]);
      for (let k = 0; k < busy; k++) {
        const st = this.standList[order[k]];
        const age = ages[k] + rand(-25, 15);
        const rot = this._newRot(st, -age - this._taxiIn(st));
        rot.onBlock = -age;
        rot.off = rot.planOff;
        rot.state = 'atStand';
        st.cur = rot;
        const pl = new Airliner(this, rot);
        pl.placeParked(st);
        rot.plane = pl;
        this.planes.push(pl);
        const f = rot.flags;
        f.bridge = age > T_BRIDGE;
        f.deplaned = age > T_DEPLANED;
        const to = this.t - rot.off;
        f.boarding = to >= B_BOARD;
        f.final = to >= B_FINAL;
        f.closed = to >= B_CLOSE;
        st.state = f.closed ? 'closed' : f.boarding ? 'boarding' : f.deplaned ? 'parked' : f.bridge ? 'deplaning' : 'parked';
        rot.arr.status = 'At gate';
        st.cones = f.cones = f.bridge && !f.closed;
        if (f.closed) pl.engTarget = 0;
      }
      this.lastLand = -400; // the first arrival is on its way in already
      this._plan();
      // Light aircraft.
      this.sky = { phase: 'parked', timer: rand(70, 200), x: G1.x, z: G1.z, y: 0, yaw: PI, pitch: 0, roll: 0, v: 0, model: null, voice: null, circuits: 0, prop: 0 };
      this.heli = { phase: 'away', timer: rand(60, 200), x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, v: 0, rpm: 0, model: null, voice: null };
      this._updateStatuses();
    }

    _clear() {
      for (const pl of this.planes) {
        pl.detach();
        if (pl.voice) pl.voice.stop();
        pl.voice = null;
      }
      this.planes = [];
      for (const st of this.standList || []) this._dropStandGse(st);
      this._dropCrew(true);
      this._dropExtras();
      for (const c of [this.sky, this.heli]) {
        if (!c) continue;
        if (c.model) {
          c.model.root.removeFromParent();
          this._putModel(c.model);
          c.model = null;
        }
        if (c.voice) c.voice.stop();
        c.voice = null;
      }
      if (this.beacons) this.beacons.count = 0;
      if (this.cones) this.cones.count = 0;
      this._stopVoices();
      this.rwy.clear();
    }

    reset() {
      if (!this.ok) return;
      this._dropWarm();
      this._clear();
      this._init();
    }

    stop() {
      if (!this.ok) return;
      this._dropWarm();
      this._clear();
      this.inited = false;
    }

    serialize() {
      return { seen: this.seenOff };
    }

    load(d) {
      this.seenOff = d && typeof d.seen === 'number' ? d.seen : 0;
    }

    stats() {
      if (!this.ok) return [];
      return [['Airliners seen off', String(this.seenOff)]];
    }

    // ----------------------------------------------------- the schedule
    _taxiIn(st) {
      return 92 + Math.max(0, -65 - st.x) / 7;
    }

    _freeAt(st) {
      const q = st.queue;
      if (!q.length) return this.t;
      return q[q.length - 1].off + 60;
    }

    _hours(t) {
      const c = this._clock;
      const env = this.game.environment;
      if (!c.set) {
        c.h0 = env ? env.hours : 12;
        c.t0 = this.t;
        c.set = true;
      }
      return (((c.h0 + (t - c.t0) / 60) % 24) + 24) % 24;
    }

    _newRot(st, landAt) {
      const al = pick(AIRLINES);
      const city = pick(CITIES);
      let n = this._num.get(al.code);
      if (!n) n = 101 + Math.floor(Math.random() * 380) * 2;
      this._num.set(al.code, n + 2 + 2 * Math.floor(Math.random() * 3));
      const id = ++this._serial;
      const onBlock = landAt + this._taxiIn(st);
      const planOff = onBlock + T_TURN;
      const rot = {
        id, st, airline: al, landAt, planLand: landAt, onBlock, planOff, off: planOff, state: 'planned', plane: null, flags: {}, gone: 0,
      };
      const back = Math.random() < 0.7 ? city : pick(CITIES);
      rot.arr = { id: al.code + n + '-' + id, code: al.code + ' ' + n, airline: al.name, city, kind: 'arr', time: this._hours(landAt), gate: st.gate, stand: st.id, status: 'Scheduled', est: null, pax: 90 + Math.floor(Math.random() * 90) };
      rot.dep = { id: al.code + (n + 1) + '-' + id, code: al.code + ' ' + (n + 1), airline: al.name, city: back, kind: 'dep', time: this._hours(planOff), gate: st.gate, stand: st.id, status: 'Scheduled', est: null, pax: 90 + Math.floor(Math.random() * 90) };
      st.queue.push(rot);
      this.rots.push(rot);
      return rot;
    }

    /** Keep the arrivals planned half an hour ahead, each to the stand that frees up first. */
    _plan() {
      let guard = 0;
      while (this.lastLand < this.t + PLAN_AHEAD && guard++ < 30) {
        let t = Math.max(this.t + (this.t < 1 && guard === 1 ? 42 : 80), this.lastLand + rand(140, 215));
        let best = null;
        let bestFree = Infinity;
        for (const st of shuffle(this.standList.slice())) {
          const f = this._freeAt(st);
          if (f < bestFree) {
            best = st;
            bestFree = f;
          }
        }
        t = Math.max(t, bestFree + 25 - this._taxiIn(best));
        this._newRot(best, t);
        this.lastLand = t;
      }
    }

    /** Move a flight that couldn't land (a go-around) to the next free slot. */
    _resequence(rot) {
      let t = this.t + 150;
      for (let tries = 0; tries < 20; tries++) {
        const clash = this.rots.some((r) => r !== rot && (r.state === 'planned' || r.state === 'inbound') && Math.abs(r.landAt - t) < 100);
        if (!clash) break;
        t += 60;
      }
      rot.landAt = t;
      rot.state = 'planned';
      rot.plane = null;
      rot.onBlock = t + this._taxiIn(rot.st);
      rot.off = Math.max(rot.planOff, rot.onBlock + T_MIN);
      if (t > this.lastLand) this.lastLand = t;
    }

    _clockCheck() {
      // The game clock jumped (a cutscene, "always day", a loaded save): re-time the boards.
      const env = this.game.environment;
      const c = this._clock;
      if (!env || !c.set) return;
      const want = this._hours(this.t);
      let d = env.hours - want;
      d = ((d + 36) % 24) - 12;
      if (Math.abs(d) > 0.08) {
        c.h0 = env.hours;
        c.t0 = this.t;
        for (const r of this.rots) {
          r.arr.time = this._hours(r.planLand);
          r.dep.time = this._hours(r.planOff);
        }
      }
    }

    // ------------------------------------------------------------- update
    update(dt) {
      if (!this.ok) return;
      if (this._warm) this._dropWarm();
      if (!this.inited) this._init();
      dt = Math.min(dt, 0.1);
      this.t += dt;
      const env = this.game.environment;
      this.night = env && env.shared ? env.shared.uWindowGlow.value : 0;
      this._gather();
      this._plan();
      this._spawnDue();
      this._runway();
      for (let i = 0; i < this.planes.length; i++) this.planes[i].update(dt);
      if (this.planes.some((p) => p.gone)) this.planes = this.planes.filter((p) => !p.gone);
      this._arrivalsIn();
      for (const st of this.standList) this._standTick(st, dt);
      this._gseTick(dt);
      this._crewTick(dt);
      this._skylark(dt);
      this._heli(dt);
      this._extrasTick(dt);
      this._lodT -= dt;
      if (this._lodT <= 0) {
        this._lodT = 0.5;
        this._lod();
        this._clockCheck();
      }
      for (const pl of this.planes) if (pl.model) pl._pose();
      this._instances();
      this._sound(dt);
      this._statusT -= dt;
      if (this._statusT <= 0) {
        this._statusT = 0.5;
        this._updateStatuses();
        this._trim();
      }
    }

    /** Jay and every car near the airfield, as things to stop for. */
    _gather() {
      const g = this.game;
      const out = this._obs;
      out.length = 0;
      let n = 0;
      const add = (x, y, z, r, big) => {
        const o = this._obsPool[n] || (this._obsPool[n] = { x: 0, y: 0, z: 0, r: 0, big: false });
        n++;
        o.x = x;
        o.y = y;
        o.z = z;
        o.r = r;
        o.big = big;
        out.push(o);
      };
      const p = g.player;
      if (p && !p.inVehicle && !p.isDead) add(p.pos.x, p.pos.y, p.pos.z, 0.6, false);
      const inBox = (x, z) => x > -1120 && x < 420 && z > -1560 && z < -1180;
      for (const v of g.vehicles.list) {
        if (v.removed || !inBox(v.pos.x, v.pos.z) || v.pos.y > 25) continue;
        add(v.pos.x, v.pos.y, v.pos.z, Math.max(v.hx || 1, v.hz || 2), (v.hz || 0) > 6);
      }
      let rwy = false;
      for (const o of out) {
        if (o.x > RWY.x0 - 80 && o.x < RWY.x1 + 80 && Math.abs(o.z - RWY.z) < RWY.w / 2 + 12 && o.y < 30) rwy = true;
      }
      this._jayRwy = rwy;
      const pp = p ? (p.inVehicle && p.vehicle ? p.vehicle.pos : p.pos) : null;
      this.jay = pp;
    }

    _spawnDue() {
      for (const r of this.rots) {
        if (r.state !== 'planned' || r.landAt - this.t > 75) continue;
        // Keep a minute between arrivals on the approach.
        let ok = true;
        for (const q of this.planes) if (q.phase === 'approach' && q.eta() > Math.max(35, r.landAt - this.t) - 60) ok = false;
        if (!ok) {
          r.landAt += 20;
          continue;
        }
        const pl = new Airliner(this, r);
        pl.startApproach(clamp(r.landAt - this.t, 40, 75));
        r.plane = pl;
        r.state = 'inbound';
        this.planes.push(pl);
      }
    }

    // ------------------------------------------------------------ runway
    _arrivalWithin(sec) {
      for (const q of this.planes) if (q.phase === 'approach' && q.eta() < sec) return true;
      const s = this.sky;
      if (s && s.slot && s.eta < sec) return true;
      return false;
    }

    /** May a departure line up and go? (It's past 32 m/s by the time the next arrival, 48 s out, needs clearing.) */
    _rwyFree() {
      return this.rwy.size === 0 && !this._jayRwy && !this._arrivalWithin(48);
    }

    _rwyRelease(pl) {
      this.rwy.delete(pl);
    }

    _runway() {
      for (const pl of this.planes) {
        if (pl.phase === 'approach') {
          const eta = pl.eta();
          if (!pl.cleared && eta < 25) {
            let ok = !this._jayRwy && this._queueIn() < 2;
            for (const u of this.rwy) if (u !== pl && !(u.phase === 'climb' || (u.phase === 'takeoff' && u.v > 32))) ok = false;
            if (ok) {
              pl.cleared = true;
              this.rwy.add(pl);
            } else this._goAround(pl);
          } else if (pl.cleared && this._jayRwy && pl.y > 4) this._goAround(pl);
        } else if (pl.phase === 'taxiout' && !pl.cleared && pl.s > pl.path.sHold - 60) {
          pl.stopS = pl.path.sHold;
          if (pl.s >= pl.path.sHold - 1.5 && this._rwyFree()) {
            pl.cleared = true;
            this.rwy.add(pl);
            pl.stopS = pl.path.sLine;
          }
        }
      }
    }

    _queueIn() {
      let n = 0;
      for (const q of this.planes) if ((q.phase === 'rollout' || q.phase === 'taxiin') && !q.released) n++;
      return n;
    }

    _goAround(pl) {
      pl.phase = 'goaround';
      pl.cleared = false;
      pl.t = 0;
      this.rwy.delete(pl);
      pl.rot.arr.status = 'Delayed';
      pl.rot.goArounds = (pl.rot.goArounds || 0) + 1;
      if (this.onLog) this.onLog('goaround', pl);
    }

    _touchdown(pl) {
      const r = pl.rot;
      pl.phase = 'rollout';
      pl.t = 0;
      pl.y = 0;
      pl.z = RWY.z;
      pl.yaw = HALF;
      pl.path = arrivalPath(r.st);
      pl.s = Math.max(0, pl.x - TD_X);
      pl.nx = pl.x + NOSE;
      pl.nz = RWY.z;
      pl.align = { x: r.st.x };
      r.state = 'landed';
      r.arr.status = 'Landed';
      r.landed = this.t;
      VH.events.emit('airside:landed', { flight: r.arr });
      if (this.game.fx && this._near(pl.x, pl.z, 500)) {
        for (const s of [1, -1]) for (let i = 0; i < 3; i++) this.game.fx.tyreSmoke(pl.x + s * 3, 0.1, pl.z - 1 + i, 1.2, pl.v, 0, 'road');
      }
      if (this.onLog) this.onLog('landed', pl);
    }

    _liftoff(pl) {
      const r = pl.rot;
      r.dep.status = 'Departed';
      r.tookOff = this.t;
      r.state = 'gone';
      VH.events.emit('airside:takeoff', { flight: r.dep });
      if (this.jay && Math.hypot(this.jay.x - pl.x, this.jay.z - pl.z) < 900) this.seenOff++;
      if (this.onLog) this.onLog('takeoff', pl);
    }

    _planeGone(pl) {
      pl.gone = true;
      pl.detach();
      if (pl.voice) pl.voice.stop();
      pl.voice = null;
      this.rwy.delete(pl);
      if (pl.phase === 'goaround') {
        // It flew a wide circuit out of sight: back in the queue for another go.
        this._resequence(pl.rot);
      }
    }

    // --------------------------------------------------------- the stands
    /** Arrivals on the ground: hold at H-IN until the stand is free and the taxilane end is clear. */
    _arrivalsIn() {
      for (const pl of this.planes) {
        if ((pl.phase !== 'rollout' && pl.phase !== 'taxiin') || pl.released) continue;
        const st = pl.rot.st;
        const free = !st.cur || st.cur === pl.rot;
        let clear = true;
        for (const q of this.planes) {
          if (q === pl || !q.onGround || q.phase === 'parked') continue;
          if (Math.hypot(q.x - -55, q.z - LANE_Z) < 52) clear = false;
        }
        // Not while a plane is being pushed back across the lane it would take.
        for (const s2 of this.standList) if (s2.state === 'pushback' && s2.x > st.x) clear = false;
        if (free && clear) {
          pl.released = true;
          pl.stopS = Infinity;
          st.cur = pl.rot;
          st.state = 'arriving';
          pl.rot.state = 'taxiing';
        } else pl.stopS = pl.path.sHoldIn;
      }
    }

    _onBlock(pl) {
      const r = pl.rot;
      const st = r.st;
      pl.phase = 'parked';
      pl.x = st.x;
      pl.z = STAND_Z;
      pl.yaw = 0;
      pl.nx = st.x;
      pl.nz = STAND_Z + NOSE;
      pl.v = 0;
      pl.align = null;
      pl.engTarget = 0;
      r.onBlock = this.t;
      r.off = Math.max(r.planOff, this.t + T_MIN);
      r.state = 'atStand';
      r.arr.status = 'At gate';
      st.state = 'parked';
      if (this.onLog) this.onLog('onblock', pl);
    }

    _standTick(st) {
      const r = st.cur;
      if (!r || r.state !== 'atStand') return;
      const f = r.flags;
      const tr = this.t - r.onBlock;
      const to = this.t - r.off;
      const ev = { flight: r.arr, stand: st.id, gate: st.gate };
      if (!f.bridge && tr >= T_BRIDGE) {
        f.bridge = true;
        st.state = 'deplaning';
        VH.events.emit('airside:arrived', ev);
      }
      if (!f.cones && tr >= 20 && !f.closed) st.cones = f.cones = true;
      if (!f.deplaned && tr >= T_DEPLANED) {
        f.deplaned = true;
        if (st.state === 'deplaning') st.state = 'parked';
      }
      if (!f.boarding && to >= B_BOARD) {
        f.boarding = true;
        st.state = 'boarding';
        VH.events.emit('airside:boarding', { flight: r.dep, stand: st.id, gate: st.gate });
      }
      if (!f.final && to >= B_FINAL) f.final = true;
      if (!f.closed && to >= B_CLOSE) {
        f.closed = true;
        st.state = 'closed';
        st.cones = false;
        VH.events.emit('airside:closed', { flight: r.dep, stand: st.id });
      }
      if (f.closed && !f.push && to >= 0 && this._pushClear(st)) {
        f.push = true;
        st.state = 'pushback';
        const pl = r.plane;
        pl.phase = 'pushback';
        pl.t = 0;
        pl.path = pushPath(st);
        pl.s = 0;
        pl.v = 0;
        pl.engTarget = 1;
        r.pushed = this.t;
        const tug = st.gse && st.gse.tug;
        if (tug) tug.attached = pl;
        VH.events.emit('airside:pushback', { flight: r.dep, stand: st.id });
        if (this.onLog) this.onLog('pushback', pl);
      }
    }

    /**
     * May the plane at this stand push back now? Nothing on the taxilane near it, no arrival
     * on its way along the lane to a stand further west (it would meet the tail swinging
     * out), nobody and no car behind it.
     */
    _pushClear(st) {
      for (const q of this.planes) {
        if (q.rot === st.cur || !q.onGround || q.phase === 'parked') continue;
        if (q.x > st.x - 45 && q.x < st.x + 130 && q.z > -1348 && q.z < -1283) return false;
        if (q.released && (q.phase === 'taxiin' || q.phase === 'rollout') && q.s < q.path.sTurnIn + 5 && q.rot.st.x < st.x + 20) return false;
      }
      for (const o of this._obs) if (o.x > st.x - 24 && o.x < st.x + 58 && o.z > -1342 && o.z < -1262 && o.y < 6) return false;
      // No vehicle (but this stand's own) on the road behind it or about to pass.
      for (const v of this._allGse || []) {
        if (v.st === st || !v.root.visible || (this.extras && v === this.extras.stairs)) continue;
        if (v.x > st.x - (v.busy ? 40 : 16) && v.x < st.x + 58 && v.z > -1342 && v.z < -1282) return false;
      }
      const g = st.gse;
      if (g) {
        if (g.tug && (g.tug.busy || g.tug.post !== 'spot')) return false;
        for (const key of Object.keys(g.spec)) if (key !== 'tug' && g[key].post !== 'home') return false;
      }
      return true;
    }

    _pushDone(pl) {
      const r = pl.rot;
      const st = r.st;
      pl.phase = 'tugoff';
      pl.t = 0;
      pl.v = 0;
      st.cur = null;
      st.state = 'empty';
      st.queue = st.queue.filter((q) => q !== r);
      r.state = 'outbound';
      const tug = st.gse && st.gse.tug;
      if (tug && tug.attached === pl) {
        tug.attached = null;
        this._tugHome(st, tug);
      }
    }

    _beginTaxiOut(pl) {
      pl.phase = 'taxiout';
      pl.t = 0;
      pl.path = departurePath(pl.nx, pl.nz);
      pl.s = 0;
      pl.v = 0;
      pl.stopS = pl.path.sHold;
      pl.cleared = false;
      if (this.onLog) this.onLog('taxiout', pl);
    }

    // -------------------------------------------------------- looking out
    /** How far ahead (along its path) an airliner must stop, or Infinity. */
    _lookAhead(pl) {
      const P = pl.path;
      const fast = pl.phase === 'takeoff' || pl.phase === 'rollout';
      const reach = Math.min(fast ? 420 : 140, (pl.v * pl.v) / (fast ? 5 : 2) + 34);
      for (let d = 6; d <= reach; d += fast ? 8 : 5) {
        const s = pl.s + d;
        if (s > P.len + 30) break;
        const sc = Math.min(s, P.len);
        P.at(sc, _b);
        if (!fast || pl.v < 15) {
          P.at(Math.max(0, sc - NOSE), _c);
          const d0x = pl.x;
          const d0z = pl.z;
          for (const q of this.planes) {
            if (q === pl || q.gone || !q.onGround || q.phase === 'parked') continue;
            const dq = Math.hypot(_c.x - q.x, _c.z - q.z);
            if (dq < SEP && dq < Math.hypot(d0x - q.x, d0z - q.z) - 0.3) {
              if (pl.blocker !== q) {
                pl.blocker = q;
                pl.blockT = 0;
              }
              // Two planes waiting on each other (it shouldn't happen): after a while one goes.
              if (pl.blockT > 40 && q.blocker === pl && pl.rot.id > q.rot.id) continue;
              return Math.max(0, d - 12);
            }
          }
          const sk = this.sky;
          if (sk && sk.onGround && Math.hypot(_c.x - sk.x, _c.z - sk.z) < 28) return Math.max(0, d - 10);
        }
        for (const o of this._obs) {
          const r = o.r + (o.big ? 18 : 8.5);
          const dx = o.x - _b.x;
          const dz = o.z - _b.z;
          if (dx * dx + dz * dz < r * r && o.y < 12) return Math.max(0, d - 8);
        }
      }
      pl.blocker = null;
      if (!fast && pl.z > -1362) {
        const gd = this._gseAhead(pl, P, pl.s, Math.min(60, reach), false);
        if (gd < Infinity) return Math.max(0, gd - 7);
      }
      return Infinity;
    }

    /**
     * A ground vehicle under where this plane is about to go (it gives way to them, as they
     * do to it: one caught out in the open drives clear and then the plane carries on).
     * How far along its path the plane may go, or Infinity.
     */
    _gseAhead(pl, P, s0, reach, push) {
      const list = this._allGse;
      if (!list || !list.length) return Infinity;
      let any = false;
      for (const w of list) {
        if (w.root.visible && Math.abs(w.x - pl.x) < reach + 45 && Math.abs(w.z - pl.z) < reach + 45) {
          any = true;
          break;
        }
      }
      if (!any) return Infinity;
      for (let d = 4; d <= reach; d += 4) {
        let mx;
        let mz;
        let yaw;
        if (push) {
          P.at(Math.min(P.len, s0 + d), _c);
          mx = _c.x;
          mz = _c.z;
          yaw = _c.h + PI;
        } else {
          const sn = Math.min(P.len, s0 + d);
          P.at(sn, _c);
          const nx = _c.x;
          const nz = _c.z;
          P.at(Math.max(0, sn - NOSE), _c);
          mx = _c.x;
          mz = _c.z;
          yaw = Math.atan2(nx - mx, nz - mz);
        }
        for (const w of list) {
          if (!w.root.visible || w.attached || w.plane === pl || w.waitPl === pl || (w.role === 'tug' && w.st === pl.rot.st)) continue;
          if (Math.abs(w.x - mx) > 30 || Math.abs(w.z - mz) > 30) continue;
          // Under it here (one already under a wing, out on the road, is fine: the wing's above it).
          const m = Math.min(2.5, w.k.len * 0.35);
          if (underPlane(w.x, w.z, mx, mz, yaw, m) && !(underPlane(w.x, w.z, pl.x, pl.z, pl.yaw, m) && across(w.x, w.z, pl.x, pl.z, pl.yaw) > 7)) return d;
        }
      }
      return Infinity;
    }

    /** During a pushback: anyone behind the tail? */
    _lookBehind(pl) {
      const P = pl.path;
      for (let d = 0; d <= 30; d += 3) {
        P.at(Math.min(P.len, pl.s + d), _b);
        const hx = -Math.sin(pl.yaw);
        const hz = -Math.cos(pl.yaw);
        const tx = _b.x + hx * 19;
        const tz = _b.z + hz * 19;
        for (const o of this._obs) {
          const r = o.r + (o.big ? 16 : 7);
          if ((Math.hypot(o.x - tx, o.z - tz) < r || Math.hypot(o.x - _b.x, o.z - _b.z) < r) && o.y < 12) return Math.max(0, d - 2);
        }
      }
      const gd = this._gseAhead(pl, P, pl.s, 24, true);
      return gd < Infinity ? Math.max(0, gd - 3) : Infinity;
    }

    /** A plane on the ground: where its main gear is now and will be in 3 and 6 s, and which way it faces. */
    _poses(q) {
      const P = this._posesBuf || (this._posesBuf = [{ x: 0, z: 0, yaw: 0 }, { x: 0, z: 0, yaw: 0 }, { x: 0, z: 0, yaw: 0 }]);
      P[0].x = q.x;
      P[0].z = q.z;
      P[0].yaw = q.yaw;
      P.n = 1;
      if (!q.path || q.v < 0.15 || q.phase === 'takeoff' || q.phase === 'rollout') return P;
      for (const k of [3, 6]) {
        const o = P[P.n++];
        if (q.phase === 'pushback') {
          // A pushback's path is the main gear's, and the plane faces back along it.
          q.path.at(Math.min(q.path.len, q.s + Math.max(q.v, 1) * k), _a);
          o.x = _a.x;
          o.z = _a.z;
          o.yaw = _a.h + PI;
        } else {
          // Otherwise it's the nose wheel's, with the main gear trailing.
          const sn = Math.min(q.path.len, q.s + q.v * k);
          q.path.at(sn, _a);
          const nx = _a.x;
          const nz = _a.z;
          q.path.at(Math.max(0, sn - NOSE), _a);
          o.x = _a.x;
          o.z = _a.z;
          o.yaw = Math.atan2(nx - o.x, nz - o.z);
        }
      }
      return P;
    }

    /** A ground vehicle: how far it may go before it has to stop. */
    _gseBlocked(v) {
      const P = v.path;
      v._blkKind = null;
      // Two points ahead along the way it's going: just in front, and its stopping distance on.
      const half0 = v.k.len / 2;
      P.at(Math.min(P.len, v.s + half0 + 3 + (v.v * v.v) / 5), _c);
      P.at(Math.min(P.len, v.s + half0 + 1.5), _b);
      const frontX = _b.x;
      const frontZ = _b.z;
      // Planes on the ground (not parked): keep out from under each one, where it is now and
      // where it will be in three and six seconds. Already under one of those: carry on, out
      // of the way. (The follow-me never waits for the plane it's leading.)
      for (const q of this.planes) {
        if (!q.onGround || q.phase === 'parked' || q.gone || q === v.plane || q === v.waitPl) continue;
        if (v.role === 'tug' && q.rot.st === v.st) continue;
        if (Math.abs(q.x - v.x) > 90 || Math.abs(q.z - v.z) > 90) continue;
        const poses = this._poses(q);
        // Under it now, or where it's about to be: drive clear (the plane waits for us).
        let inside = false;
        for (let i = 0; i < poses.n && !inside; i++) inside = underPlane(v.x, v.z, poses[i].x, poses[i].z, poses[i].yaw, 2.5);
        if (inside) continue;
        for (let i = 0; i < poses.n; i++) {
          const p = poses[i];
          if (underPlane(_c.x, _c.z, p.x, p.z, p.yaw, 2.5) || underPlane(frontX, frontZ, p.x, p.z, p.yaw, 2.5)) {
            v._blkKind = 'plane';
            return 0;
          }
        }
      }
      const sk = this.sky;
      if (sk && sk.onGround && sk.v > 0.3 && Math.hypot(_c.x - sk.x, _c.z - sk.z) < 18) return 0;
      const fx = Math.sin(v.yaw) * (v.rev ? -1 : 1);
      const fz = Math.cos(v.yaw) * (v.rev ? -1 : 1);
      const fz0 = fz;
      const half = v.k.len / 2;
      for (const o of this._obs) {
        const dx = o.x - v.x;
        const dz = o.z - v.z;
        const along = dx * fx + dz * fz;
        const side = Math.abs(-dx * fz + dz * fx);
        if (along > 0 && along < half + 6 + o.r && side < 1.6 + o.r && o.y < 5) return Math.max(0, along - half - 1.5 - o.r);
      }
      // Pulling out onto (or across) the airside road: wait for anything coming along a lane
      // still to be crossed.
      if (Math.abs(fz0) > 0.6 && Math.min(v.z, _c.z) < ROAD_Z + 4.5 && Math.max(v.z, _c.z) > ROAD_Z - 4.5) {
        for (const w of this._allGse) {
          if (w === v || !w.busy || Math.abs(w.z - ROAD_Z) > 3.5 || w._blk === v) continue;
          const wdx = Math.sin(w.yaw) * (w.rev ? -1 : 1);
          if (Math.abs(wdx) < 0.7 || (w.z - v.z) * fz0 < -1.5) continue;
          const gap = (v.x - w.x) * Math.sign(wdx); // how far it has to come to reach us
          if (gap > -5 && gap < (v.rev ? 70 : 45)) {
            v._blkKind = 'gse';
            v._blk = w;
            return 0;
          }
        }
      }
      // Never wait on each other for ever: two stuck on each other (or behind one that's not
      // going anywhere) for a quarter of a minute, or anything for three quarters of one.
      if (v.gseBlockT > 45 || (v.gseBlockT > 15 && v._blk && (v._blk._blk === v || !v._blk.busy))) return Infinity;
      // Other vehicles (and the baggage carts): the middle or either end of one in the lane
      // just ahead. Two waiting on each other (at a crossing): the one already across the
      // other's way goes first, to clear it.
      let best = Infinity;
      let by = null;
      const look = (w, x, z) => {
        const dx = x - v.x;
        const dz = z - v.z;
        const along = dx * fx + dz * fz;
        const side = Math.abs(-dx * fz + dz * fx);
        if (along > 0 && along < half + 6 + v.v * 1.6 && side < 2.1 && along - half - 1.2 < best) {
          best = along - half - 1.2;
          by = w;
        }
      };
      for (const w of this._allGse) {
        if (w === v || !w.root.visible || w.attached) continue;
        if (Math.abs(w.x - v.x) > 22 || Math.abs(w.z - v.z) > 22) continue;
        if (w._blk === v) {
          const wfx = Math.sin(w.yaw);
          const wfz = Math.cos(w.yaw);
          const inMine = Math.abs(-(w.x - v.x) * fz + (w.z - v.z) * fx); //   w off my line
          const inTheirs = Math.abs(-(v.x - w.x) * wfz + (v.z - w.z) * wfx); // me off w's line
          const headOn = fx * wfx * (w.rev ? -1 : 1) + fz * wfz * (w.rev ? -1 : 1) < -0.5;
          if (!(headOn && v.rev) && (inTheirs < inMine - 0.3 || (Math.abs(inTheirs - inMine) <= 0.3 && v.id > w.id))) continue;
        }
        const wh = w.k.len / 2;
        const sx = Math.sin(w.yaw) * wh;
        const sz = Math.cos(w.yaw) * wh;
        look(w, w.x, w.z);
        look(w, w.x + sx, w.z + sz);
        look(w, w.x - sx, w.z - sz);
        if (w.carts) for (const c of w.carts) look(w, c.x, c.z);
      }
      v._blk = by;
      if (by) v._blkKind = 'gse';
      return best === Infinity ? Infinity : Math.max(0, best);
    }

    // ------------------------------------------------- ground equipment
    /** The world position of a stand-local point ([x, z] relative to the stand, z south). */
    _standGseSpec(st) {
      const i = st.i;
      // This stand's bowser and catering truck in the depot (staggered, so each can drive straight out north).
      const fuelSlot = [8 + 12 * i, -1263];
      const caterSlot = [14 + 12 * i, -1281];
      const depotOut = (slot, x, lane) => [[slot[0], slot[1]], [slot[0], ROAD_W], [x, lane]];
      const depotIn = (slot) => [[DEPOT_IN_X, ROAD_E], [DEPOT_IN_X, DEPOT_IN_Z], [slot[0], DEPOT_IN_Z], [slot[0], slot[1]]];
      const L = (lx, lz) => W(st, lx, lz);
      return {
        tug: { kind: 'tug', home: [...L(-30, 25), HALF], spot: [...L(0, 19.6), PI], tin: -62 },
        // (The jet bridge's rotunda stands at x +11.5..+16.5, z +12.5..+17.5 and its tunnel
        // runs south from it to the terminal: everything keeps east or north of them.)
        belt1: {
          kind: 'belt', home: [...L(21, 21), PI], spot: [...L(6.3, 9.5), -HALF], tin: 25, tout: -40,
          legIn: () => [{ path: route([L(21, 21), L(21, 9.5), L(6.3, 9.5)], 4, 5) }],
          legOut: () => [{ path: route([L(6.3, 9.5), L(21, 9.5), L(21, 21)], 4, 5), rev: true }],
        },
        belt2: {
          kind: 'belt', home: [...L(26, 23), PI], spot: [...L(6.3, -8), -HALF], tin: 29, tout: -36,
          legIn: () => [{ path: route([L(26, 23), L(26, -4), L(22, -8), L(6.3, -8)], 4, 5) }],
          legOut: () => [{ path: route([L(6.3, -8), L(22, -8), L(26, -4), L(26, 23)], 4, 5), rev: true }],
        },
        train: {
          kind: 'train', home: [...L(30, 22), -HALF], spot: [...L(13, -8), PI], tin: 44, tout: -52,
          legIn: () => [{ path: route([L(30, 22), L(23.5, 22), L(23.5, 3), L(13, 3), L(13, -8)], 5, 5) }],
          legOut: () => [{ path: route([L(13, -8), L(13, -22.5), L(40, -22.5), L(40, 22), L(30, 22)], 5, 6) }],
        },
        cater: {
          kind: 'cater', home: [...caterSlot, PI], spot: [...L(-4.6, -9), 0], tin: 58, tout: -160,
          legIn: () => [{ path: route(depotOut(caterSlot, st.x + 1.4, ROAD_W).concat([L(-4.6, -18.5), L(-4.6, -9)]), 6, 7) }],
          legOut: () => [
            { path: route([L(-4.6, -9), L(-4.6, -22.5), L(-12, -22.5)], 6, 3), rev: true },
            { path: route([L(-12, -22.5)].concat(depotIn(caterSlot)), 5, 8) },
          ],
          depotIn: depotIn(caterSlot),
        },
        fuel: {
          kind: 'fuel', home: [...fuelSlot, PI], spot: [...L(-13, 10), 0], tin: 38, tout: -108,
          legIn: () => [{ path: route(depotOut(fuelSlot, st.x - 24, ROAD_W).concat([L(-24, 0), L(-13, 6), L(-13, 10)]), 6, 7) }],
          legOut: () => [{ path: route([L(-13, 10), L(-13, 16), L(-24, 18), L(-24, -22.5)].concat(depotIn(fuelSlot)), 6, 7) }],
        },
      };
    }

    _makeStandGse(st) {
      if (!VH.AircraftKit) return;
      const spec = this._standGseSpec(st);
      const set = { spec };
      for (const key of Object.keys(spec)) {
        const s = spec[key];
        const v = new Gse(this, s.kind, s.home[0], s.home[1], s.home[2]);
        v.st = st;
        v.role = key;
        set[key] = v;
      }
      st.gse = set;
      // Where should each be, this far into the turnaround? (Jay was too far away to see.)
      const r = st.cur;
      if (r && r.state === 'atStand') {
        const tr = this.t - r.onBlock;
        const to = this.t - r.off;
        for (const key of Object.keys(spec)) {
          const s = spec[key];
          const v = set[key];
          if (key === 'tug') {
            if (to >= s.tin) this._toSpot(v, s);
            continue;
          }
          if (tr >= s.tin + 12 && to < s.tout) this._toSpot(v, s);
          else if (tr >= s.tin && to < s.tout) {
            v.post = 'going';
            v.go(s.legIn(), () => this._arrivedSpot(v));
          }
        }
      }
      const pushing = r && r.plane && r.plane.phase === 'pushback';
      if (pushing) set.tug.attached = r.plane;
    }

    _toSpot(v, s) {
      v.place(s.spot[0], s.spot[1], s.spot[2]);
      v.post = 'spot';
      this._arrivedSpot(v);
    }

    _arrivedSpot(v) {
      v.post = 'spot';
      if (v.kind === 'cater') v.liftTo = 1;
      if (v.kind === 'fuel') v.hose = true;
    }

    _dropStandGse(st) {
      const set = st.gse;
      if (!set) return;
      for (const key of Object.keys(set)) if (set[key] instanceof Gse) set[key].dispose();
      st.gse = null;
    }

    _tugHome(st, tug) {
      // After a pushback: back off, swing out of the way and drive home round the airside road.
      const s = st.gse.spec.tug;
      const a = tug.yaw;
      const bx = tug.x - Math.sin(a) * 4;
      const bz = tug.z - Math.cos(a) * 4;
      const L = (lx, lz) => W(st, lx, lz);
      tug.post = 'going';
      tug.go([
        { path: route([[tug.x, tug.z], [bx, bz]], 3, 1.5), rev: true },
        { path: route([[bx, bz], [bx + 4, bz + 5], [st.x + 11, ROAD_W], [st.x - 36, ROAD_W], L(-36, 25), L(-30, 25)], 4, 6) },
      ], () => {
        tug.post = 'home';
        tug.place(s.home[0], s.home[1], s.home[2]);
      });
    }

    _gseTick(dt) {
      const all = (this._allGse = this._allGse || []);
      all.length = 0;
      for (const st of this.standList) {
        const set = st.gse;
        if (!set) continue;
        const r = st.cur;
        const atStand = r && r.state === 'atStand';
        const tr = atStand ? this.t - r.onBlock : -1;
        const to = atStand ? this.t - r.off : -1e9;
        for (const key of Object.keys(set.spec)) {
          const s = set.spec[key];
          const v = set[key];
          all.push(v);
          if (key === 'tug') {
            if (atStand && to >= s.tin && v.post === 'home' && !v.busy) {
              const L = (lx, lz) => W(st, lx, lz);
              v.post = 'going';
              v.go([{ path: route([L(-30, 25), L(-12, 27), L(-5, 27), L(0, 21.5), L(0, 19.6)], 4, 4) }], () => {
                v.post = 'spot';
              });
            }
            if (v.attached) {
              const pl = v.attached;
              const hx = Math.sin(pl.yaw);
              const hz = Math.cos(pl.yaw);
              v.x = pl.nx + hx * 4.4;
              v.z = pl.nz + hz * 4.4;
              v.yaw = wrapAngle(pl.yaw + PI);
              v.v = pl.v;
              v._pose();
            }
            v.update(dt);
            continue;
          }
          if (atStand && v.post === 'home' && !v.busy && tr >= s.tin && to < s.tout) {
            v.post = 'going';
            v.go(s.legIn(), () => this._arrivedSpot(v));
          } else if (v.post === 'spot' && (!atStand || to >= s.tout)) {
            if (v.kind === 'cater' && v.lift > 0.02) {
              v.liftTo = 0;
            } else {
              v.hose = false;
              v.post = 'leaving';
              const home = () => {
                v.post = 'home';
                v.onStuck = null;
                v.place(s.home[0], s.home[1], s.home[2]);
              };
              v.go(s.legOut(), home);
              // Backing out onto the road with someone coming up behind: once it's facing
              // along the road, give up backing and drive off forwards instead.
              v.onStuck = s.depotIn
                ? () => {
                  if (Math.abs(v.z - ROAD_E) > 2.5 || Math.sin(v.yaw) < 0.5) return;
                  v.onStuck = null;
                  v.go([{ path: route([[v.x, v.z], [v.x + 6, ROAD_E]].concat(s.depotIn), 5, 8) }], home);
                }
                : null;
            }
          }
          if (v.parts.hose) {
            const h = v.parts.hose;
            h.visible = v.hose && v.post === 'spot';
            if (h.visible) {
              // From the reel at the back up to the fuel point under the wing (in the truck's frame).
              const wx = st.x - 11.2 - v.x;
              const wz = st.z - 2.2 - v.z;
              const c = Math.cos(v.yaw);
              const sn = Math.sin(v.yaw);
              const d = this._v3.set(wx * c - wz * sn - 0, 2.75 - 1.0, wx * sn + wz * c + 3.8);
              const len = d.length();
              h.position.set(0, 1.0, -3.8);
              h.scale.set(1, 1, len);
              h.quaternion.setFromUnitVectors(this._zAxis, d.multiplyScalar(1 / len));
            }
          }
          v.update(dt);
        }
      }
      if (this.extras) for (const v of this.extras.list) all.push(v);
    }

    // ------------------------------------------------------------ crew
    _crewTick(dt) {
      const g = this.game;
      if (!g.crowd) return;
      const jay = this.jay;
      for (const st of this.standList) {
        const near = jay && Math.hypot(jay.x - st.x, jay.z - (st.z + 10)) < 170;
        const r = st.cur;
        if (!near || !r) {
          for (const c of this.crew) if (c.st === st) this._crewLeave(c.a);
          continue;
        }
        const pl = r.plane;
        const L = (lx, lz) => W(st, lx, lz);
        // The marshaller waves the arrival in, then crosses the wands and goes.
        if (pl && (pl.phase === 'taxiin' || pl.phase === 'rollout') && pl.released && !r.flags.marshal && this.crew.length < 8) {
          r.flags.marshal = true;
          const at = L(-2.5, 27.5);
          const from = L(-30, 24);
          const a = this._crewSpawn(from[0], from[1], 'marshal', st);
          if (a) {
            a.brain.goal = { x: at[0], z: at[1], run: true };
            a.brain.face = PI;
            st.marshal = a;
          }
        }
        const m = st.marshal;
        if (m && !m.removed && m.brain && !m.brain.fear) {
          const b = m.brain;
          if (pl && pl.phase === 'taxiin' && pl.path && pl.s > pl.path.sTurnIn - 40) b.wave = pl.path.len - pl.s < 1.5 ? 2 : 1;
          else if (pl && pl.phase === 'parked' && r.state === 'atStand') {
            const tr = this.t - r.onBlock;
            b.wave = tr < 4 ? 2 : 0;
            if (tr > 6 && !b.leave) {
              const h = L(-30, 22);
              b.goal = { x: h[0], z: h[1] };
              b.leave = true;
              b.wave = 0;
            }
          }
        }
        // Two baggage handlers at the forward hold while the belt loader is there.
        const tr = r.state === 'atStand' ? this.t - r.onBlock : -1;
        const to = r.state === 'atStand' ? this.t - r.off : -1e9;
        if (tr > 40 && to < -42 && !r.flags.handlers && this.crew.length < 7) {
          r.flags.handlers = true;
          for (const [lx, lz, face] of [[10.6, 11.3, -2.3], [9.4, 7.6, -0.9]]) {
            const p = L(lx, lz);
            const a = this._crewSpawn(st.x + 24, st.z + 20, 'handler', st);
            if (a) {
              a.brain.goal = { x: p[0], z: p[1] };
              a.brain.face = face;
              (st.handlers || (st.handlers = [])).push(a);
            }
          }
        }
        if (to >= -42 && st.handlers) {
          for (const a of st.handlers) {
            if (a.removed || !a.brain || a.brain.leave) continue;
            const h = L(24, 22);
            a.brain.goal = { x: h[0], z: h[1] };
            a.brain.leave = true;
          }
          st.handlers = null;
        }
        // The pushback: someone with a headset walks by the nose.
        if (r.state === 'atStand' && to > -45 && !r.flags.headset && this.crew.length < 8) {
          r.flags.headset = true;
          const p = L(-4.5, 22);
          const a = this._crewSpawn(st.x - 24, st.z + 24, 'headset', st);
          if (a) {
            a.brain.goal = { x: p[0], z: p[1] };
            a.brain.face = PI;
            st.headset = a;
          }
        }
        const hs = st.headset;
        if (hs && !hs.removed && hs.brain && !hs.brain.fear && pl) {
          if (pl.phase === 'pushback') {
            const rx = -Math.cos(pl.yaw);
            const rz = Math.sin(pl.yaw);
            hs.brain.goal = { x: pl.nx + rx * 4 + Math.sin(pl.yaw) * 2, z: pl.nz + rz * 4 + Math.cos(pl.yaw) * 2 };
            hs.brain.face = wrapAngle(pl.yaw + PI);
          } else if (pl.phase === 'tugoff' || pl.phase === 'taxiout') {
            if (!hs.brain.leave) {
              const h = L(-30, 22);
              hs.brain.goal = { x: h[0], z: h[1] };
              hs.brain.leave = true;
              hs.brain.face = null;
            }
          }
        }
      }
      // Wands follow the marshallers' hands; the gone are tidied away.
      for (let i = this.crew.length - 1; i >= 0; i--) {
        const c = this.crew[i];
        const a = c.a;
        const far = !jay || Math.hypot(jay.x - a.pos.x, jay.z - a.pos.z) > 210;
        if (a.removed || !a.brain || a.dead || a.brain.gone || far) {
          if (!a.removed && a.brain && (a.brain.gone || far)) g.crowd.remove(a);
          this._crewForget(i);
          continue;
        }
        if (c.wands) {
          const show = a.visible && !a.brain.fear;
          for (let k = 0; k < 2; k++) {
            const w = c.wands[k];
            w.visible = show;
            if (!show) continue;
            const j = a.rig.joints[k ? 'elbowR' : 'elbowL'];
            if (!j) continue;
            w.matrix.multiplyMatrices(j.matrixWorld, this._wandM || (this._wandM = new THREE.Matrix4().makeTranslation(0, -0.5, 0.03)));
            w.matrixWorldNeedsUpdate = true;
          }
        }
      }
    }

    _crewSpawn(x, z, role, st) {
      const g = this.game;
      if (!g.crowd || this.crew.length >= 8) return null;
      const L = VH.Crowd && VH.Crowd.randomLook ? VH.Crowd.randomLook() : {};
      const hv = pick(HIVIS);
      Object.assign(L, { top: hv, trim: 0xdfe2dc, shirt: hv, bottom: 0x232a36, shoes: 0x1c1c1c, cap: Math.random() < 0.45 });
      const a = g.crowd.spawn(x, z, { look: L, persistent: true, role: 'airside', heading: PI, name: 'Ground crew', health: 80 });
      a.brain = new CrewBrain(role);
      const c = { a, st, role, wands: null };
      if (role === 'marshal') {
        c.wands = [0, 1].map(() => {
          const w = new THREE.Mesh(gseGeometry('wand'), mats().wand);
          w.matrixAutoUpdate = false;
          w.visible = false;
          g.scene.add(w);
          return w;
        });
      }
      this.crew.push(c);
      return a;
    }

    _crewLeave(a) {
      if (!a || a.removed || !a.brain || a.brain.leave) return;
      a.brain.goal = { x: a.pos.x + (a.pos.x > -250 ? 30 : -30), z: -1252 };
      a.brain.leave = true;
      a.brain.wave = 0;
    }

    _crewForget(i) {
      const c = this.crew[i];
      if (c.wands) for (const w of c.wands) w.removeFromParent();
      this.crew.splice(i, 1);
      const st = c.st;
      if (st.marshal === c.a) st.marshal = null;
      if (st.headset === c.a) st.headset = null;
    }

    _dropCrew(all) {
      const g = this.game;
      for (let i = this.crew.length - 1; i >= 0; i--) {
        const c = this.crew[i];
        if (!c.a.removed && g.crowd) g.crowd.remove(c.a);
        this._crewForget(i);
      }
      for (const st of this.standList || []) {
        st.crew = [];
        st.handlers = null;
        st.marshal = null;
        st.headset = null;
      }
      if (all) this.crew = [];
    }

    _threat(e) {
      if (!this.crew) return;
      for (const c of this.crew) {
        const a = c.a;
        if (!a.brain || a.removed) continue;
        if (Math.hypot(a.pos.x - e.x, a.pos.z - e.z) < (e.radius || 30) * 1.3) a.brain.fear = { x: e.x, z: e.z, t: 7 + Math.random() * 3 };
      }
    }

    _crewDied(a) {
      if (!a || !this.crew) return;
      const i = this.crew.findIndex((c) => c.a === a);
      if (i < 0) return;
      a.brain = null;
      a.persistent = false;
      this._crewForget(i);
    }

    // ------------------------------------------------------ the extras
    /** The follow-me car, two service vans and the stair truck at the remote stand. */
    _makeExtras() {
      if (!VH.AircraftKit) return;
      const list = [];
      const ex = { list };
      const car = (type, color, x, z, yaw) => {
        if (!VH.CarModels || !VH.CarModels.TYPES[type]) return null;
        const m = VH.CarModels.build(type, { color });
        const v = new Gse(this, type === 'mesa' ? 'followme' : 'van', x, z, yaw, { model: m, car: m });
        v.carModel = m;
        list.push(v);
        return v;
      };
      ex.fm = car('mesa', 0xf2c61f, FM_SLOT[0], FM_SLOT[1], PI);
      if (ex.fm) {
        const sign = gseMesh('sign');
        sign.position.set(0, VH.CarModels.TYPES.mesa.height + 0.05, -0.4);
        sign.rotation.y = HALF;
        ex.fm.root.add(sign);
        ex.fm.bar = [[0.45, VH.CarModels.TYPES.mesa.height + 0.02, 0.4], [-0.45, VH.CarModels.TYPES.mesa.height + 0.02, 0.4]];
        ex.fm.state = 'home';
        ex.fm.home = [FM_SLOT[0], FM_SLOT[1], PI];
      }
      ex.vanA = car('porter', 0xf1f1ee, VAN_SLOT[0], VAN_SLOT[1], PI);
      ex.vanB = car('porter', 0xf1f1ee, 84, -1290, PI);
      for (const v of [ex.vanA, ex.vanB]) {
        if (!v) continue;
        v.k = { len: 5.2, beacon: [0, VH.CarModels.TYPES.porter.height + 0.02, 0.2] };
        v.wait = rand(5, 40);
        v.home = [v.x, v.z, v.yaw];
      }
      // The stair truck at the flyable Albatross's front door (it faces north; the door is on its west side).
      ex.stairs = new Gse(this, 'stairs', REMOTE.x - 5.9, REMOTE.z - 15.0, HALF);
      ex.stairs.home = [REMOTE.x - 5.9, REMOTE.z - 15.0, HALF];
      ex.stairs.state = 'door';
      list.push(ex.stairs);
      this.extras = ex;
    }

    _dropExtras() {
      const ex = this.extras;
      if (!ex) return;
      for (const v of ex.list) {
        v.dispose();
        if (v.carModel && v.carModel.dispose) v.carModel.dispose();
      }
      this.extras = null;
    }

    _extrasTick(dt) {
      const ex = this.extras;
      if (!ex) return;
      const night = this.night > 0.2;
      // Follow-me: out to meet each arrival as it turns off the runway, ahead of it to the stand.
      const fm = ex.fm;
      if (fm) {
        if (fm.carModel.setHeadlights) fm.carModel.setHeadlights(night);
        if (fm.state === 'home') {
          const pl = this.planes.find((p) => p.phase === 'rollout' && !p.followed && p.v < 45);
          if (pl) {
            pl.followed = true;
            fm.plane = pl;
            fm.state = 'out';
            fm.go([{ path: route([[fm.x, fm.z], [FM_SLOT[0], -1300], [57, -1340], [46, -1360], [32, TWY_Z]], 6, 11) }], () => {
              fm.state = 'wait';
            });
          }
        } else if (fm.state === 'wait' || fm.state === 'lead') {
          const pl = fm.plane;
          if (!pl || pl.gone || (pl.phase !== 'rollout' && pl.phase !== 'taxiin')) this._fmBack(fm, null);
          else {
            const P = pl.path;
            const s = pl.s + 34;
            if (fm.state === 'wait') {
              P.at(s, _c);
              if (_c.x < 36 && _c.z > TWY_Z - 3 && pl.phase === 'taxiin') fm.state = 'lead';
            }
            if (fm.state === 'lead') {
              if (s >= P.sTurnIn) this._fmBack(fm, pl);
              else {
                P.at(s, _c);
                fm.v = Math.hypot(_c.x - fm.x, _c.z - fm.z) / Math.max(dt, 1e-3);
                fm.x = _c.x;
                fm.z = _c.z;
                fm.yaw = dampAngle(fm.yaw, _c.h, 8, dt);
                fm._pose();
              }
            }
          }
        }
        if (fm.state === 'park') this._fmPark(fm, dt);
        if (fm.state !== 'lead') fm.update(dt);
      }
      for (const v of [ex.vanA, ex.vanB]) {
        if (!v) continue;
        if (v.carModel.setHeadlights) v.carModel.setHeadlights(night);
        if (!v.busy) {
          v.wait -= dt;
          if (v.wait <= 0) {
            v.wait = rand(25, 90);
            // A lap of the airside road (turning at the west end), or of the GA apron.
            const pts = v === ex.vanA
              ? [VAN_SLOT, [VAN_SLOT[0], ROAD_W], [-446, ROAD_W], [-446, -1290], [-437, -1290], [-437, ROAD_E], [DEPOT_IN_X, ROAD_E], [DEPOT_IN_X, DEPOT_IN_Z], [VAN_SLOT[0], DEPOT_IN_Z], VAN_SLOT]
              : [[84, -1290], [84, -1314], [285, -1314], [285, -1272], [90, -1272], [84, -1278], [84, -1290]];
            v.go([{ path: route(pts, 4, 7.5) }], () => v.place(v.home[0], v.home[1], v.home[2]));
          }
        }
        v.update(dt);
      }
      // Stair truck: at the door while the flyable Albatross waits there; it backs off when Jay climbs in.
      const st = ex.stairs;
      const spot = this._remoteSpot();
      const pv = spot && spot.v;
      const parked = pv && !pv.removed && !pv.wrecked && Math.hypot(pv.pos.x - REMOTE.x, pv.pos.z - REMOTE.z) < 2;
      if (st.state === 'door' && (!parked || pv.driver)) {
        st.state = 'away';
        st.go([{ path: route([[st.x, st.z], [st.x - 24, st.z]], 3, 2.2), rev: true }]);
      } else if (st.state === 'away' && !st.busy && parked && !pv.driver && !this._near(REMOTE.x, REMOTE.z, 60) && !this.game.isVisible(REMOTE.x, 3, REMOTE.z, 25)) {
        st.state = 'door';
        st.place(st.home[0], st.home[1], st.home[2]);
      }
      st.setVisible(!!pv || st.state === 'away');
      st.update(dt);
    }

    /**
     * The follow-me's way home. Having led a plane to its turn-in, it pulls ahead along the
     * taxilane, well clear of the stand, and waits there ('park') until the plane is on its
     * stand and off the airside road; then home round the road. Called back before it got
     * to lead (a go-around), it goes home the way it came.
     */
    _fmBack(fm, pl) {
      fm.state = 'back';
      const x = fm.x;
      const home = () => {
        fm.state = 'home';
        fm.place(fm.home[0], fm.home[1], fm.home[2]);
      };
      if (pl && Math.abs(fm.z - LANE_Z) < 3) {
        const sx = pl.rot.st.x;
        fm.go([{ path: route([[x, fm.z], [Math.max(-424, Math.min(x - 4, sx - 33)), LANE_Z]], 5, 7) }], () => {
          fm.state = 'park';
          fm.waitPl = pl;
          fm.waitT = 0;
        });
        return;
      }
      if (fm.z < ROAD_Z - 30) {
        fm.go([{ path: route([[x, fm.z], [46, -1360], [57, -1340], [FM_SLOT[0], -1300], FM_SLOT], 6, 9) }], home);
        return;
      }
      fm.go([{ path: route([[x, fm.z], [x, ROAD_E], [DEPOT_IN_X, ROAD_E], [DEPOT_IN_X, DEPOT_IN_Z], [FM_SLOT[0], DEPOT_IN_Z], FM_SLOT], 5, 9) }], home);
    }

    /** Waiting on the taxilane: off home once its plane is parked (or a plane comes along the lane). */
    _fmPark(fm, dt) {
      fm.waitT += dt;
      const pl = fm.waitPl;
      const done = !pl || pl.gone || pl.phase !== 'taxiin' || pl.z > STAND_Z - 3;
      let crowded = false;
      for (const q of this.planes) {
        if (q !== pl && q.moving && Math.abs(q.z - LANE_Z) < 30 && q.x > fm.x - 20 && q.x < fm.x + 140) crowded = true;
      }
      // A plane about to push back from the stand west of us (we're behind its tail).
      for (const st of this.standList) {
        if (st.cur && st.cur.flags.closed && fm.x > st.x - 4 && fm.x < st.x + 58) crowded = true;
      }
      if (!done && !crowded && fm.waitT < 90) return;
      fm.state = 'back';
      fm.waitPl = null;
      fm.plane = null;
      const x = fm.x;
      fm.go([{ path: route([[x, LANE_Z], [x - 6, LANE_Z], [x - 6, ROAD_E], [DEPOT_IN_X, ROAD_E], [DEPOT_IN_X, DEPOT_IN_Z], [FM_SLOT[0], DEPOT_IN_Z], FM_SLOT], 5, 9) }], () => {
        fm.state = 'home';
        fm.place(fm.home[0], fm.home[1], fm.home[2]);
      });
    }

    _remoteSpot() {
      const af = this.game.airfield;
      if (!af || !af.spots) return null;
      return af.spots.find((s) => s.type === 'albatross') || null;
    }

    // ---------------------------------------------------- light aircraft
    _skyPath(kind, x) {
      // kind 'out': G1 → the taxiway → L3 hold. 'line': hold → lined up east → the take-off run.
      if (kind === 'out') return route([[G1.x, G1.z], [G1.x, TWY_Z], [L3, TWY_Z], [L3, -1404]], 14, 7);
      if (kind === 'line') return route([[L3, -1404], [L3, RWY.z], [RWY.x1 + 300, RWY.z]], 15, 99, 99);
      if (kind === 'in') return route([[x, RWY.z], [L5, RWY.z], [L5, -1305], [G1.x, -1305], [G1.x, G1.z]], 14, 12);
      return null;
    }

    /** The circuit: upwind, a right turn to the downwind leg south of the field, round onto final. */
    _skyCircuit(x0, full) {
      const p = new Path(x0, RWY.z, HALF);
      p.line(500, RWY.z);
      p.turn(-PI, 300);
      p.line(-1250, RWY.z + 600);
      p.sDecide = p.len - 300;
      p.turn(-PI, 300);
      p.sFinal = p.len;
      const td = full ? -260 : -560;
      p.line(td, RWY.z);
      p.td = td;
      return p.end(99);
    }

    _skylark(dt) {
      const k = this.sky;
      if (!k) return;
      k.onGround = k.phase === 'parked' || k.phase === 'taxi' || k.phase === 'hold' || k.phase === 'roll' || k.phase === 'landroll' || k.phase === 'taxiin';
      switch (k.phase) {
        case 'parked':
          k.v = 0;
          k.prop = Math.max(0, k.prop - dt * 0.4);
          k.timer -= dt;
          if (k.timer <= 0) {
            k.phase = 'taxi';
            k.path = this._skyPath('out');
            k.s = 0;
            k.circuits = 2 + Math.floor(Math.random() * 2);
          }
          break;
        case 'taxi':
        case 'taxiin': {
          k.prop = Math.min(0.45, k.prop + dt * 0.3);
          let vt = k.path.cap(k.s);
          // Give way to airliners.
          k.path.at(Math.min(k.path.len, k.s + 14), _c);
          for (const q of this.planes) if (q.onGround && q.phase !== 'parked' && Math.hypot(_c.x - q.x, _c.z - q.z) < 32) vt = 0;
          for (const o of this._obs) if (Math.hypot(o.x - _c.x, o.z - _c.z) < 6 + o.r) vt = 0;
          k.v = k.v < vt ? Math.min(vt, k.v + 1.2 * dt) : Math.max(vt, k.v - 3 * dt);
          k.s = Math.min(k.path.len, k.s + k.v * dt);
          k.path.at(k.s, _c);
          k.x = _c.x;
          k.z = _c.z;
          k.yaw = dampAngle(k.yaw, _c.h, 8, dt);
          if (k.s >= k.path.len - 0.05) {
            if (k.phase === 'taxi') k.phase = 'hold';
            else {
              k.phase = 'parked';
              k.timer = rand(300, 560);
              k.yaw = PI;
            }
          }
          break;
        }
        case 'hold':
          k.v = 0;
          if (this._rwyFree() && !this.planes.some((q) => q.phase === 'taxiout' && q.cleared)) {
            this.rwy.add(k);
            k.phase = 'roll';
            k.path = this._skyPath('line');
            k.s = 0;
          }
          break;
        case 'roll': {
          // Lined up: full power, off at about 28 m/s.
          k.prop = Math.min(1, k.prop + dt);
          const lined = k.s > 60;
          if (!lined) k.v = Math.min(k.path.cap(k.s), k.v + 1.5 * dt);
          else k.v += 2.6 * dt;
          if (this._jayRwy && k.v < 18) k.v = Math.max(0, k.v - 5 * dt);
          k.s += k.v * dt;
          k.path.at(k.s, _c);
          k.x = _c.x;
          k.z = _c.z;
          k.yaw = dampAngle(k.yaw, _c.h, 8, dt);
          if (k.v > 27) {
            k.phase = 'circuit';
            k.path = this._skyCircuit(k.x, k.circuits <= 1);
            k.s = 0;
            k.y = 0;
          }
          break;
        }
        case 'circuit':
        case 'orbit': {
          k.prop = 1;
          k.v = moveTowards(k.v, k.phase === 'circuit' && k.s > (k.path.sFinal || 1e9) ? 34 : 42, dt * 2);
          const prevH = k.yaw;
          k.s += k.v * dt;
          k.path.at(Math.min(k.s, k.path.len), _c);
          k.x = _c.x;
          k.z = _c.z;
          k.yaw = _c.h;
          const yr = wrapAngle(k.yaw - prevH) / Math.max(dt, 1e-3);
          k.roll = dampAngle(k.roll, clamp(-yr * k.v / 9.8, -0.5, 0.5), 3, dt);
          const P = k.path;
          if (k.phase === 'orbit') {
            k.y = moveTowards(k.y, 180, dt * 3);
            k.pitch = 0;
            if (k.s >= P.len) {
              k.phase = 'circuit';
              k.path = k.main;
              k.s = k.mainS + 1;
            }
            break;
          }
          // Height: climb out to 150 m, 180 m downwind, down through the turn to final, then the runway.
          const sTurn = P.sDecide + 300;
          let y;
          if (k.s < 900) y = smoothstep(0, 900, k.s) * 150;
          else if (k.s < sTurn) y = lerp(150, 180, smoothstep(900, 1600, k.s));
          else if (k.s < P.sFinal) y = lerp(180, 85, (k.s - sTurn) / (P.sFinal - sTurn));
          else y = 85 * clamp((P.len - k.s) / (P.len - P.sFinal), 0, 1);
          k.pitch = k.s < 700 ? 0.12 : k.s > P.sFinal ? 0.05 : 0;
          k.y = y;
          if (!k.slot && k.s >= P.sDecide && k.s < P.sDecide + 40) {
            // Ask for the runway: no airliner landing in the minute before us (it needs half a
            // minute to roll out and turn off), or soon after (we need to be off it, or climbing
            // away from a touch-and-go); nobody on it. (Anything still on it when we're on short
            // final sends us round again.)
            k.eta = (P.len - k.s) / 38;
            const tdAt = this.t + k.eta;
            const after = k.circuits <= 1 ? 70 : 48;
            // Airliners waiting to go out come first.
            const busy = this._jayRwy || this.planes.some((q) => q.phase === 'approach' && q.eta() > k.eta - 62 && q.eta() < k.eta + after) ||
              this.planes.some((q) => q.phase === 'taxiout' && q.path && q.s > q.path.sHold - 120) ||
              this.rots.some((r) => r.state === 'planned' && r.landAt > tdAt - 62 && r.landAt < tdAt + after);
            if (busy) {
              // Hold off: a full turn away from the field and ask again.
              k.main = P;
              k.mainS = k.s;
              const o = new Path(k.x, k.z, k.yaw).turn(2 * PI, 220).end(99);
              k.phase = 'orbit';
              k.path = o;
              k.s = 0;
            } else k.slot = true;
          }
          if (k.slot) k.eta = Math.max(0, (P.len - k.s) / 36);
          if (k.slot && k.s > P.sFinal && !this.rwy.has(k) && k.eta < 30) {
            if (this._jayRwy || this.rwy.size > 0) {
              // Something on the runway: go round again.
              k.slot = false;
              k.path = this._skyCircuit(k.x, k.circuits <= 1);
              k.s = 0;
            } else this.rwy.add(k);
          }
          if (k.s >= P.len) {
            k.slot = false;
            k.y = 0;
            k.circuits--;
            if (k.circuits <= 0) {
              k.phase = 'landroll';
              k.path = this._skyPath('in', k.x);
              k.s = 0;
            } else {
              k.phase = 'tng';
              k.t = 0;
            }
          }
          break;
        }
        case 'tng':
          // Touch and go: a moment on the wheels, then full power again.
          k.t += dt;
          k.y = 0;
          k.pitch = Math.max(0, k.pitch - dt * 0.1);
          k.v = k.t < 3 ? Math.max(26, k.v - dt * 3) : k.v + dt * 2.4;
          k.x += k.v * dt;
          if (k.t > 3 && k.v > 29) {
            k.phase = 'circuit';
            k.path = this._skyCircuit(k.x, k.circuits <= 1);
            k.s = 0;
          }
          break;
        case 'landroll': {
          k.y = 0;
          k.pitch = Math.max(0, k.pitch - dt * 0.1);
          let vt = k.path.cap(k.s);
          if (k.v > vt) k.v = Math.max(vt, k.v - 1.3 * dt);
          else k.v = Math.min(vt, k.v + 0.8 * dt);
          k.s = Math.min(k.path.len, k.s + k.v * dt);
          k.path.at(k.s, _c);
          k.x = _c.x;
          k.z = _c.z;
          k.yaw = dampAngle(k.yaw, _c.h, 8, dt);
          k.prop = 0.4;
          if (k.z > RWY.z + RWY.w / 2 + 8) this.rwy.delete(k);
          if (k.z > TWY_Z + 20) {
            this.rwy.delete(k);
            const s = k.s;
            k.phase = 'taxiin';
            k.s = s;
          }
          break;
        }
        default:
          break;
      }
      if (k.phase !== 'roll' && k.phase !== 'tng' && k.phase !== 'circuit' && k.phase !== 'landroll' && k.phase !== 'orbit') this.rwy.delete(k);
      if (k.phase === 'circuit' && k.y > 25 && !k.slot) this.rwy.delete(k);
      if (k.model) {
        const m = k.model;
        m.root.position.set(k.x, k.y, k.z);
        m.root.rotation.set(0, k.yaw, 0);
        m.body.rotation.set(-k.pitch, 0, k.roll);
        m.setNav(k.phase !== 'parked', this.t);
        if (m.prop) {
          m.prop.rotation.z += k.prop * 60 * dt;
          if (m.propDisc) m.propDisc.visible = k.prop > 0.3;
          if (m.prop.children[0]) m.prop.children[0].visible = k.prop < 0.6;
        }
      }
    }

    _heli(dt) {
      const h = this.heli;
      if (!h) return;
      const from = { x: H2.x + 1400, y: 240, z: H2.z - 900 };
      const to = { x: H2.x - 1500, y: 260, z: H2.z + 1300 };
      switch (h.phase) {
        case 'away':
          h.timer -= dt;
          h.rpm = 0;
          if (h.timer <= 0) {
            h.phase = 'in';
            h.x = from.x;
            h.y = from.y;
            h.z = from.z;
            h.v = 40;
            h.rpm = 1;
            h.t = 0;
          }
          break;
        case 'in': {
          // Straight in, slowing down over the last few hundred metres, to a hover above the pad.
          const dx = H2.x - h.x;
          const dz = H2.z - h.z;
          const d = Math.hypot(dx, dz);
          if (d > 6) h.yaw = dampAngle(h.yaw, Math.atan2(dx, dz), 1.5, dt);
          const want = d > 500 ? 40 : Math.max(1.2, d * 0.08);
          // Nose down to speed up, nose up to slow (rotation x > 0 is nose down).
          h.pitch = dampAngle(h.pitch, clamp((want - h.v) * 0.04, -0.16, 0.12) + 0.05 * smoothstep(10, 40, h.v), 2, dt);
          h.v = moveTowards(h.v, want, dt * 3.5);
          const step = Math.min(d, h.v * dt);
          if (d > 0.01) {
            h.x += (dx / d) * step;
            h.z += (dz / d) * step;
          }
          const hy = d > 400 ? lerp(60, from.y, clamp((d - 400) / 1100, 0, 1)) : lerp(14, 60, d / 400);
          h.y = moveTowards(h.y, hy, dt * 8);
          if (d < 0.6 && h.y < 14.5) {
            h.phase = 'descend';
            h.t = 0;
          }
          break;
        }
        case 'descend': {
          h.pitch = dampAngle(h.pitch, 0, 2, dt);
          const blocked = this._obs.some((o) => Math.hypot(o.x - H2.x, o.z - H2.z) < 13);
          h.t += dt;
          if (blocked) {
            h.y = moveTowards(h.y, 22, dt * 2);
            if (h.t > 25) {
              h.phase = 'out';
              h.t = 0;
            }
          } else h.y = moveTowards(h.y, 0, dt * (h.y > 4 ? 2.2 : 0.9));
          if (h.y <= 0) {
            h.phase = 'down';
            h.t = 0;
            h.wait = rand(70, 150);
          }
          break;
        }
        case 'down':
          h.t += dt;
          h.rpm = h.t < 18 ? Math.max(0.15, 1 - h.t / 18) : h.t > h.wait - 14 ? Math.min(1, (h.t - (h.wait - 14)) / 12) : 0.15;
          if (h.t > h.wait) {
            h.phase = 'out';
            h.t = 0;
          }
          break;
        case 'out': {
          h.t += dt;
          h.rpm = 1;
          if (h.t < 4) h.y = moveTowards(h.y, 10, dt * 3);
          else {
            const dx = to.x - h.x;
            const dz = to.z - h.z;
            const d = Math.hypot(dx, dz);
            h.yaw = dampAngle(h.yaw, Math.atan2(dx, dz), 1.2, dt);
            h.v = moveTowards(h.v, 42, dt * 3);
            h.pitch = dampAngle(h.pitch, 0.1 * smoothstep(0, 20, h.v) * (h.v < 41 ? 1.4 : 0.7), 1.5, dt);
            h.x += Math.sin(h.yaw) * h.v * dt;
            h.z += Math.cos(h.yaw) * h.v * dt;
            h.y = moveTowards(h.y, to.y, dt * 6);
            if (d < 60 || h.t > 120) {
              h.phase = 'away';
              h.timer = rand(280, 520);
              h.v = 0;
            }
          }
          break;
        }
        default:
          break;
      }
      if (h.model) {
        const m = h.model;
        m.root.position.set(h.x, h.y, h.z);
        m.root.rotation.set(0, h.yaw, 0);
        m.body.rotation.set(h.pitch, 0, 0);
        m.setNav(h.phase !== 'away', this.t);
        if (m.rotor) {
          m.rotor.rotation.y += h.rpm * 28 * dt;
          if (m.rotorDisc) m.rotorDisc.visible = h.rpm > 0.6;
        }
        if (m.tailRotor) m.tailRotor.rotation.x += h.rpm * 60 * dt;
        m.root.visible = h.phase !== 'away';
      }
    }

    // ----------------------------------------------------------- LOD
    _near(x, z, r) {
      const j = this.jay;
      return !!j && Math.abs(j.x - x) < r && Math.abs(j.z - z) < r && Math.hypot(j.x - x, j.z - z) < r;
    }

    _lod() {
      const cam = this.game.renderer.camera;
      const cp = cam.position;
      const view = (cam.far || 900) + 250;
      for (const pl of this.planes) {
        const d = Math.hypot(pl.x - cp.x, pl.z - cp.z, pl.y - cp.y);
        if (d < view && !pl.model) pl.attach();
        else if (d > view + 80 && pl.model) pl.detach();
      }
      for (const k of [this.sky, this.heli]) {
        if (!k) continue;
        const type = k === this.sky ? 'skylark' : 'sparrow';
        if (!VH.AircraftModels.spec(type)) continue;
        const d = Math.hypot(k.x - cp.x, k.z - cp.z, k.y - cp.y);
        const want = d < Math.min(view, 1500) && !(k === this.heli && k.phase === 'away');
        if (want && !k.model) {
          k.model = this._takeModel(type, k === this.sky ? 0xf2f2ee : 0x1d4fb8);
          this.game.scene.add(k.model.root);
        } else if (!want && k.model) {
          k.model.root.removeFromParent();
          this._putModel(k.model);
          k.model = null;
        }
      }
      // Ground equipment only near Jay.
      for (const st of this.standList) {
        const near = this._near(st.x, st.z, 650);
        if (near && !st.gse) this._makeStandGse(st);
        else if (!this._near(st.x, st.z, 760) && st.gse) this._dropStandGse(st);
      }
      const nearApron = this._near(APRON_C.x, APRON_C.z, 820);
      if (nearApron && !this.extras) this._makeExtras();
      else if (!this._near(APRON_C.x, APRON_C.z, 900) && this.extras) this._dropExtras();
    }

    /** Beacons and cones, all in two instanced meshes. */
    _instances() {
      const M = this._m4;
      const q = this._q;
      const p = this._v3;
      const s = this._s3;
      let n = 0;
      const cap = this.beacons.instanceMatrix.count;
      const night = this.night;
      const beacon = (v, lx, ly, lz, phase) => {
        if (n >= cap || !v.root.visible) return;
        const on = (this.t * 1.6 + phase) % 1 < (night > 0.2 ? 0.45 : 0.3);
        const c = Math.cos(v.yaw);
        const sn = Math.sin(v.yaw);
        p.set(v.x + lx * c + lz * sn, ly, v.z - lx * sn + lz * c);
        q.identity();
        s.setScalar(on ? 1 : 0.001);
        M.compose(p, q, s);
        this.beacons.setMatrixAt(n++, M);
      };
      for (const v of this._allGse || []) {
        const b = v.k && v.k.beacon;
        const working = v.v > 0.1 || v.attached || v.post === 'spot' || v.post === 'going' || v.post === 'leaving';
        if (b && working) beacon(v, b[0], b[1], b[2], v.beaconPhase);
        if (v.bar && (v.state === 'out' || v.state === 'wait' || v.state === 'lead' || v.state === 'back' || v.state === 'park')) {
          beacon(v, v.bar[0][0], v.bar[0][1], v.bar[0][2], 0);
          beacon(v, v.bar[1][0], v.bar[1][1], v.bar[1][2], 0.5);
        }
      }
      this.beacons.count = n;
      this.beacons.instanceMatrix.needsUpdate = true;
      let c = 0;
      const ccap = this.cones.instanceMatrix.count;
      for (const st of this.standList) {
        if (!st.cones || !this._near(st.x, st.z, 400) || !st.cur || st.cur.state !== 'atStand') continue;
        for (const [lx, lz] of [[0, 21.2], [17.6, -6.5], [-17.6, -6.5], [0, -21]]) {
          if (c >= ccap) break;
          p.set(st.x + lx, 0, st.z + lz);
          q.identity();
          s.setScalar(1);
          M.compose(p, q, s);
          this.cones.setMatrixAt(c++, M);
        }
      }
      this.cones.count = c;
      this.cones.instanceMatrix.needsUpdate = true;
    }

    // ---------------------------------------------------------- sound
    _sound(dt) {
      const g = this.game;
      const audio = g.audio;
      const fb = g.vehicleFeedback;
      if (!audio || !audio.ready || !fb || !audio.createJet) return;
      this._voiceT -= dt;
      if (this._voiceT <= 0) {
        this._voiceT = 0.3;
        // The three loudest airliners get a voice.
        const ranked = this.planes
          .filter((p) => !p.gone && p.eng > 0.02)
          .map((p) => [fb._gain(p.x, p.z, 70, p.y) * p.eng, p])
          .filter((e) => e[0] > 0.012)
          .sort((a, b) => b[0] - a[0]);
        const want = new Set(ranked.slice(0, 3).map((e) => e[1]));
        for (const p of this.planes) {
          if (want.has(p) && !p.voice) p.voice = audio.createJet();
          else if (!want.has(p) && p.voice) {
            p.voice.stop();
            p.voice = null;
          }
        }
      }
      for (const p of this.planes) {
        if (!p.voice) continue;
        p.voice.update({ gain: fb._gain(p.x, p.z, 70, p.y) * 0.85 * p.eng, pan: fb._pan(p.x, p.z), thrust: p.thrust, burner: 0 });
      }
      // The Skylark's engine and the helicopter.
      const k = this.sky;
      if (k && audio.createEngine) {
        const gain = k.prop > 0.05 ? fb._gain(k.x, k.z, 25, k.y) * Math.min(1, k.prop * 1.6) : 0;
        if (gain > 0.01 && !k.voice) k.voice = audio.createEngine({ kind: 'prop' });
        if (k.voice) {
          k.voice.update({ rpm: 0.25 + k.prop * 0.7, throttle: k.prop, load: 0.5, gain: gain * 0.8, pan: fb._pan(k.x, k.z) });
          if (gain <= 0.004) {
            k.voice.stop();
            k.voice = null;
          }
        }
      }
      const h = this.heli;
      if (h && audio.createHelicopter) {
        const gain = h.rpm > 0.05 && h.phase !== 'away' ? fb._gain(h.x, h.z, 32, h.y) * Math.min(1, h.rpm * 1.3) : 0;
        if (gain > 0.01 && !h.voice) h.voice = audio.createHelicopter();
        if (h.voice) {
          h.voice.update({ gain: gain * 0.9, pan: fb._pan(h.x, h.z), rate: 0.5 + h.rpm * 0.5 });
          if (gain <= 0.004) {
            h.voice.stop();
            h.voice = null;
          }
        }
      }
      // The nearest working tug or truck.
      if (audio.createEngine) {
        let best = null;
        let bg = 0.02;
        for (const v of this._allGse || []) {
          if (!v.root.visible || (v.v < 0.3 && !v.attached)) continue;
          const gn = fb._gain(v.x, v.z, 9);
          if (gn > bg) {
            bg = gn;
            best = v;
          }
        }
        if (best && !this._tugVoice) this._tugVoice = audio.createEngine({ kind: 'van' });
        if (this._tugVoice) {
          this._tugVoice.update({ rpm: best ? 0.15 + Math.min(0.5, best.v * 0.08) : 0, throttle: best ? 0.4 : 0, load: 0.6, gain: best ? bg * 0.7 : 0, pan: best ? fb._pan(best.x, best.z) : 0 });
          if (!best) {
            this._tugVoice.stop();
            this._tugVoice = null;
          }
        }
      }
    }

    _stopVoices() {
      for (const p of this.planes) {
        if (p.voice) p.voice.stop();
        p.voice = null;
      }
      for (const k of [this.sky, this.heli]) {
        if (k && k.voice) {
          k.voice.stop();
          k.voice = null;
        }
      }
      if (this._tugVoice) {
        this._tugVoice.stop();
        this._tugVoice = null;
      }
    }

    // --------------------------------------------------- boards and API
    _updateStatuses() {
      for (const r of this.rots) {
        const a = r.arr;
        const d = r.dep;
        const st = r.state;
        if (st === 'planned' || st === 'inbound') {
          const late = r.landAt > r.planLand + 60;
          a.status = st === 'inbound' && r.plane && r.plane.phase === 'approach' ? (late ? 'Delayed' : 'Landing') : late ? 'Delayed' : 'Scheduled';
          a.est = late ? this._hours(r.landAt) : null;
          const expOff = Math.max(r.planOff, r.landAt + this._taxiIn(r.st) + T_MIN);
          d.status = expOff > r.planOff + 60 ? 'Delayed' : 'Scheduled';
          d.est = expOff > r.planOff + 60 ? this._hours(expOff) : null;
        } else if (st === 'landed' || st === 'taxiing') {
          a.status = 'Landed';
          const expOff = Math.max(r.planOff, this.t + 60 + T_MIN);
          d.status = expOff > r.planOff + 60 ? 'Delayed' : 'Scheduled';
          d.est = d.status === 'Delayed' ? this._hours(expOff) : null;
        } else if (st === 'atStand') {
          a.status = 'At gate';
          const f = r.flags;
          const late = r.off > r.planOff + 60;
          d.status = f.closed ? 'Gate closed' : f.final ? 'Final call' : f.boarding ? 'Boarding' : f.deplaned ? (late ? 'Delayed' : 'Go to gate') : late ? 'Delayed' : 'Scheduled';
          d.est = late ? this._hours(r.off) : null;
        } else if (st === 'outbound') {
          d.status = 'Gate closed';
        } else if (st === 'gone') {
          d.status = 'Departed';
        }
      }
    }

    _trim() {
      // Done with: departed more than five minutes ago.
      if (this.rots.length > 40 || this.rots.some((r) => r.tookOff && this.t - r.tookOff > 300)) {
        this.rots = this.rots.filter((r) => !(r.tookOff && this.t - r.tookOff > 300));
      }
    }

    /** The boards: every flight from about ten minutes ago to half an hour ahead, soonest first. */
    flights() {
      if (!this.ok) return [];
      if (!this.inited) this._init();
      const out = [];
      for (const r of this.rots) {
        const arrGone = r.onBlock < this.t - 600 && r.state !== 'planned' && r.state !== 'inbound' && r.state !== 'landed' && r.state !== 'taxiing';
        if (!arrGone) out.push([r.planLand, r.arr]);
        out.push([r.planOff, r.dep]);
      }
      out.sort((a, b) => a[0] - b[0]);
      return out.map((e) => e[1]);
    }

    stands() {
      if (!this.ok) return [];
      if (!this.inited) this._init();
      return this.standList.map((st) => {
        const r = st.cur;
        let flight = null;
        if (r) flight = st.state === 'arriving' || st.state === 'deplaning' || (st.state === 'parked' && !r.flags.deplaned) ? r.arr : r.dep;
        return { id: st.id, gate: st.gate, x: st.x, z: st.z, yaw: st.yaw, door: st.door, state: st.state, flight, arrival: r ? r.arr : null, departure: r ? r.dep : null };
      });
    }

    blips(out, missionRunning) {
      if (!this.ok || missionRunning || !this.jay) return;
      for (const pl of this.planes) {
        if (pl.phase === 'parked' || pl.gone || !this._near(pl.x, pl.z, 2500)) continue;
        out.push({ x: pl.x, z: pl.z, type: 'plane', heading: pl.yaw, noRim: true, label: pl.rot.dep && pl.phase !== 'approach' && pl.phase !== 'rollout' && pl.phase !== 'taxiin' ? pl.rot.dep.code : pl.rot.arr.code });
      }
      const h = this.heli;
      if (h && h.phase !== 'away' && this._near(h.x, h.z, 2500)) out.push({ x: h.x, z: h.z, type: 'heli', heading: h.yaw, noRim: true, label: 'Charter helicopter' });
    }
  }

  // ------------------------------------------------------------ the paint
  /**
   * The apron paint for airfield.js: the taxilane and its S-bends, each
   * stand's turn-in, lead-in line and stop bar, the airside road, the
   * equipment pads and the depot, the Skylark's spot and the H2 pad; plus
   * where the floodlight masts and the spare equipment go (off the routes).
   */
  Airside.markings = function () {
    const Y = 0xe0b12e;
    const Wt = 0xf4f4ef;
    const R = 0xd8262e;
    const lines = [];
    const rects = [];
    const pts = (p) => p.points();
    lines.push({ pts: [[-400, LANE_Z], [-40, LANE_Z]], w: 0.3, color: Y });
    lines.push({ pts: pts(new Path(3, TWY_Z, -HALF).turn(HALF, 21.5).turn(-HALF, 21.5)), w: 0.3, color: Y });
    lines.push({ pts: pts(new Path(-400, LANE_Z, -HALF).turn(-HALF, 21.5).turn(HALF, 21.5)), w: 0.3, color: Y });
    for (const x of STAND_X) {
      lines.push({ pts: pts(new Path(x + 25, LANE_Z, -HALF).turn(HALF, 25).line(x, STAND_Z + NOSE)), w: 0.3, color: Y });
      rects.push([x - 3, STAND_Z + NOSE + 0.6, x + 3, STAND_Z + NOSE + 1.1, Y]); // stop bar
      rects.push([x - 0.25, STAND_Z + NOSE + 1.1, x + 0.25, STAND_Z + NOSE + 6, Y]);
      // The pushback line (white, dashed) round to the taxilane.
      lines.push({ pts: pts(new Path(x, STAND_Z - 2, PI).line(x, STAND_Z - 16).turn(-HALF, 30)), w: 0.2, color: Wt, dash: [2, 2] });
      // Equipment pads (red outlines) either side of the bridge.
      for (const [x0, x1] of [[x - 44, x - 22], [x + 16, x + 40]]) {
        const z0 = STAND_Z + 15;
        const z1 = STAND_Z + 29;
        rects.push([x0, z0, x1, z0 + 0.2, R], [x0, z1 - 0.2, x1, z1, R], [x0, z0, x0 + 0.2, z1, R], [x1 - 0.2, z0, x1, z1, R]);
      }
    }
    // The airside road: two lanes, white edges, a dashed centre line.
    lines.push({ pts: [[-440, ROAD_Z - 3.2], [74, ROAD_Z - 3.2]], w: 0.2, color: Wt });
    lines.push({ pts: [[-440, ROAD_Z + 3.2], [74, ROAD_Z + 3.2]], w: 0.2, color: Wt });
    lines.push({ pts: [[-440, ROAD_Z], [74, ROAD_Z]], w: 0.15, color: Wt, dash: [3, 3] });
    // The depot.
    const D = DEPOT;
    rects.push([D.x0, D.z0, D.x1, D.z0 + 0.25, R], [D.x0, D.z1 - 0.25, D.x1, D.z1, R], [D.x0, D.z0, D.x0 + 0.25, D.z1, R], [D.x1 - 0.25, D.z0, D.x1, D.z1, R]);
    // The Skylark's spot (a T) and the H2 pad.
    rects.push([G1.x - 3, G1.z - 4.6, G1.x + 3, G1.z - 4.2, Y], [G1.x - 0.2, G1.z - 4.2, G1.x + 0.2, G1.z + 3, Y]);
    const h = H2;
    rects.push([h.x - 7, h.z - 7, h.x + 7, h.z - 6.6, Wt], [h.x - 7, h.z + 6.6, h.x + 7, h.z + 7, Wt], [h.x - 7, h.z - 6.6, h.x - 6.6, h.z + 6.6, Wt], [h.x + 6.6, h.z - 6.6, h.x + 7, h.z + 6.6, Wt]);
    rects.push([h.x - 2.6, h.z - 3.4, h.x - 1.7, h.z + 3.4, Wt], [h.x + 1.7, h.z - 3.4, h.x + 2.6, h.z + 3.4, Wt], [h.x - 1.7, h.z - 0.45, h.x + 1.7, h.z + 0.45, Wt]);
    // Masts between the stands by the terminal, one by the remote stand, one by the depot.
    const masts = [[-347, -1252], [-257, -1252], [-167, -1252], [-506, -1262], [76, -1302], [180, -1330]];
    // The old static equipment (solid boxes), parked between the hangars out of the way.
    const spares = [[178, -1250, 2.4, 7, 0xd7dbe0], [183.5, -1250, 1.6, 3, 0xe0b12e], [185.7, -1250, 1.6, 3, 0xe0b12e], [187.9, -1250, 1.6, 3, 0xe0b12e]];
    return { lines, rects, masts, spares };
  };

  VH.Airside = Airside;
  VH.Airside.Path = Path; // for tests
})();
