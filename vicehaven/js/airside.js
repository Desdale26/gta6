/*
 * airside.js — the living airside at Vicehaven International: the flights,
 * the airliners and everything else that moves behind the terminal.
 *
 *   new VH.Airside(game)     game.airside: a rolling schedule of flights (an
 *                            arrival every minute and a half or so), the four
 *                            contact stands (A1-A4) and their turnarounds
 *                            (three minutes), three remote stands (R1-R3) for
 *                            the freighters (the cargo Albatross, without
 *                            windows: models/albatross.js) (and now and then an airliner
 *                            towed off its gate to leave from there later,
 *                            empty), the runway, the ground vehicles
 *                            and crew, a Skylark doing circuits and another
 *                            off on sightseeing trips, a visiting helicopter,
 *                            and jets crossing high over the city
 *   airside.flights()        [{ id, code, airline, city, kind 'dep'|'arr',
 *                            time (game hours), gate, stand, status, est, pax,
 *                            note }]   (passenger flights only; note: why it's
 *                            delayed in a ground stop, or null)
 *   airside.stands()         [{ id, gate, x, z, yaw, door, state, flight, ... }]
 *   airside.remoteStands()   the same for R1-R3 (gate null)
 *   events                   airside:landed {flight}, airside:arrived {flight,
 *                            stand, gate}, airside:boarding {flight, stand,
 *                            gate}, airside:closed {flight, stand},
 *                            airside:pushback {flight, stand, tow}, airside:
 *                            takeoff {flight}, airside:gatechange {flight,
 *                            arrival, from, gate, stand}   (stand = the stand's
 *                            id, 1..4; the freighters (flight.cargo) only send
 *                            landed and takeoff; tow: pushed back to be towed
 *                            away, nobody aboard; it boarded nobody)
 *   VH.Airside.markings()    the paint for the taxilane, stands and roads, and
 *                            the remote stands' paving (airfield.js draws it)
 *
 * ------------------------------------------------- the API for havoc.js
 *   airside.planes()         every live airliner, as a live view (read it each
 *                            time, don't copy it): { id, x, y, z, yaw, state
 *                            (the phase: 'approach' 'rollout' 'taxiin' 'parked'
 *                            'pushback' 'tugoff' 'taxiout' 'lineup' 'takeoff'
 *                            'climb' 'goaround', or for a tow 'towready'
 *                            'tow'), flight (the board entry it is
 *                            now), stand (1..4, or 'R1'..'R3'), model (its
 *                            THREE.Object3D, or null while out of sight), speed
 *                            (m/s), pax (passengers aboard now, about), cargo,
 *                            airline, color, gone, disabled, plane (the
 *                            Airliner itself) }
 *   plane.disabled = true    it brakes to a stop where it is, engines off, and
 *                            stays there: the others hold behind it (or, if it
 *                            sits on their stand, go to another); on the
 *                            runway it shuts the runway (arrivals go round,
 *                            departures hold) until it's removed. Its stand's
 *                            turnaround stops. In the air it diverts (flies
 *                            off and is gone, flight Diverted). false again:
 *                            it carries on.
 *   airside.removePlane(p)   clear it away for good (a wreck, one Jay took):
 *                            off the runway and the apron, stand freed, flight
 *                            Cancelled (any tug on it lets go); returns { x, y,
 *                            z, yaw, color, airline, flight, stand } or null
 *   airside.groundStop(on, reason)
 *                            on: no pushbacks, nobody lines up or rolls (one
 *                            already rolling goes), every arrival not yet down
 *                            goes round and away and none comes in; the boards
 *                            say Delayed with flight.note = reason. off: the
 *                            arrivals come back a minute and a half apart.
 *                            airside.stopped: the reason while on, else null.
 *   airside.abortTakeoff(p)  one on its takeoff roll (under 60 m/s) brakes to a
 *                            stop, waits half a minute and (from well down the
 *                            runway, after backtracking to the end) goes again;
 *                            false if it's too fast to stop
 *   airside.groundVehicles() the ground vehicles out now (live Gse objects)
 *   airside.takeGse(v, on)   one out of the work (Jay has it, or it's a wreck):
 *                            hidden, stopped, nothing waits for it; off: back
 *   airside.blockStand(id, on)   no arrivals onto a stand (a wreck on it)
 *   A disabled plane on the ground shows its departure Cancelled.
 *   (the live airliners are this.fleet inside this file; planes() is the way in)
 *
 * It is all scenery: no physics bodies. A plane or a tug stops for Jay (or a
 * car) in its way; a departure holds and an arrival goes around while he is
 * on the runway. Models are built when they come into view and reused.
 *
 * ------------------------------------------------------------- the plan
 * From airfield.js: runway 09/27 along z -1450 (x -1000..300, 60 m wide), the
 * parallel taxiway along z -1365, links L1..L5 at x -950, -600, -250, 100,
 * 250, the apron x -520..60 by z -1352..-1250 and stands A1..A4 at x -390,
 * -300, -210, -120, z -1276, nose in towards the terminal. The remote stands
 * R1..R3 (x -585, -645, -705) are on their own paving west of the apron, nose
 * in towards the fence straight off the taxiway.
 *
 * Everyone uses runway 09 (the wind is off the bay): arrivals come in from
 * the west over the approach lights, touch down by the aiming point (x -720)
 * and turn off at L4; departures line up at the west end from L1 and take
 * off east over the bay. Taxiing is one way, so nothing ever meets nose to
 * nose:
 *
 *   arrivals    L4 south → taxiway west (x 70..3) → an S-bend onto the
 *               apron taxilane (z -1322) → west along it → a left turn into
 *               the stand (radius 25) → nose in to the stop bar. To a remote
 *               stand: on along the taxiway, through the merge, and left in.
 *               Holding point H-IN: on the taxiway, nose wheel at x 10,
 *               until the stand is free and the end of the taxilane clear.
 *   departures  pushed back from the stand with the tail swinging east, onto
 *               the taxilane facing west (stand x + 30) → west along it →
 *               an S-bend onto the taxiway (x -443, the merge) → west to L1
 *               → north to holding point H-OUT (nose wheel at z -1408, short
 *               of the yellow bars) → lines up east → takeoff roll → over the
 *               bay. From a remote stand the push ends on the taxiway.
 *   the merge   where the S-bend meets the taxiway: one plane through it at
 *               a time (a departure, or an arrival for a remote stand).
 *   tows        pushed back as a departure, then the tug turns round and
 *               pulls it the departures' way down the S-bend and along the
 *               taxiway, and into a remote stand as an arrival would.
 *
 * The runway runs like a busy single runway: an arrival is cleared to land
 * 25 s out if the runway is clear or the only thing on it is a departure
 * already rolling (otherwise it goes round); a departure lines up and waits
 * behind an arrival that has touched down (or a departure that's rolling) if
 * it will be rolling itself before the next arrival needs clearing, and rolls
 * as soon as the runway ahead is clear. Arrivals come in threes, 82-100 s
 * apart (one departure goes between each two), then a gap of two and a half
 * to three minutes that three or four departures go in one after another; one
 * is held back a little while three departures queue for the runway.
 *
 * The nose wheel follows the yellow line and the main gear trails it, so a
 * plane cuts its corners like a real one. The taxilane is 46 m behind the
 * parked planes: a taxiing Albatross's wingtips (17 m) clear the parked
 * tails (z -1295) by 10 m and a plane on the taxiway by 9 m (the same
 * behind the remote stands). A pushback only starts while nothing on the
 * taxilane is near; a plane keeps 46 m from the one ahead.
 *
 * The airside road (z -1300, a lane each way) runs between the tails and the
 * taxilane, from the depot east of A4 (fuel bowsers, catering trucks, the
 * follow-me car, the service vans) to the west end. Each stand's own
 * equipment waits on two pads by the terminal (west and east of its bridge);
 * the remote stands' (air stairs, a high-loader, a belt loader, a tug) on
 * pads by the fence. Ground vehicles give way to any plane moving near them.
 *
 * The Skylark keeps off the airliners' taxi routes: it taxis west along the
 * taxiway to L3, flies right-hand circuits south of the field with
 * touch-and-goes, and after a full-stop landing rolls on to L5 and its spot
 * on the GA apron. The second one (yellow) flies out over the bay and away,
 * and comes back along the downwind leg for a full stop; only one of them is
 * in the circuit, or taxiing, at a time. The helicopter uses its own pad, H2,
 * on the GA apron (the big pad is the flyable Sparrow's).
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
  const G2 = { x: 232, z: -1318 }; // the second one's (it takes people on sightseeing trips)
  const H2 = { x: 300, z: -1336 }; // the visiting helicopter's pad
  const REMOTE = { x: -470, z: -1300 }; // the flyable Albatross, nose north (airfield.js)
  const DEPOT = { x0: 2, x1: 75, z0: -1292, z1: -1251 };
  const DEPOT_IN_X = 72; //   vehicles come back in down the east side of the depot ...
  const DEPOT_IN_Z = -1254; // ... and along its south side, then turn north into their slot
  const FM_SLOT = [58, -1263];
  const VAN_SLOT = [64, -1270];
  const APRON_C = { x: -230, z: -1320 };

  // The remote stands R1..R3, west of the apron: nose in towards the fence, straight off the
  // taxiway (which is their taxilane: a plane on it clears their tails by 9 m, as on the apron).
  const REMOTE_X = [-585, -645, -705];
  const REMOTE_Z = TWY_Z + 46;
  const CARGO_PAD = { x0: -742, x1: -520, z0: -1353, z1: -1266 }; // their paving (airfield.js)
  const MERGE_X = -443; //   where the departures' S-bend joins the taxiway

  // Turnaround (seconds from on-block, or from off-block when negative).
  const T_BRIDGE = 8; //     the bridge is on: passengers come off
  const T_DEPLANED = 58;
  const T_MIN = 150; //      the shortest turnaround
  const T_TURN = 178; //     the planned one
  const B_BOARD = -100;
  const B_FINAL = -48;
  const B_CLOSE = -18;
  const T_CARGO = [330, 520]; // a freighter's turnaround on a remote stand
  // Now and then an arrival isn't turned round at its gate: once its passengers are off it is
  // towed away to a remote stand (freeing the gate), and later leaves from there empty, a
  // positioning flight (not on the boards).
  const TOW_EVERY = 7; //     about one arrival in this many (when a remote stand is free)
  const T_TOWOFF = 112; //    on-block to the tow
  const T_FERRY = [210, 360]; // on the remote stand, from the tow in to off-block
  const PLAN_AHEAD = 1500; // flights planned this far ahead (s)
  // The runway: arrivals in threes a minute and a half apart (three in a line on the
  // approach), then a longer gap for the departures that have queued up, the Skylark and the
  // freighters; each arrival is on the approach (and in sight, its landing lights at least)
  // for over three minutes.
  const ARR_GAP = [82, 100];
  const BIG_GAP = [70, 95]; //  added to every third gap
  const ARR_SEP = 74; //       the closest two arrivals ever touch down
  const SPAWN_LEAD = 192; //   seconds out on the approach when an arrival appears (a bank of three all in sight)
  const LINE_T = 19; //        hold to lined up and rolling, for a departure

  // Original airlines and places only.
  const AIRLINES = [
    { name: 'Sunbird', code: 'SB', color: 0xf2a516 },
    { name: 'Coralway', code: 'CW', color: 0xff4f8b },
    { name: 'Bayline', code: 'BL', color: 0x1fa3a3 },
    { name: 'Azurline', code: 'AZ', color: 0x1d4fb8 },
    { name: 'Palmetto Air', code: 'PM', color: 0x2f8f4e },
    { name: 'Kestrel Airways', code: 'KS', color: 0xc8202a },
  ];
  // The freighters on the remote stands (not on the passenger boards).
  const CARGO_LINES = [
    { name: 'Pelican Freight', code: 'PX', color: 0x8a5a2b, cargo: true },
    { name: 'Bayhaul Cargo', code: 'BH', color: 0x4b3f8f, cargo: true },
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

  /** The distance along a path where (x, z) first passes test, or `none`. */
  function sWhere(p, test, none) {
    for (let i = 0; i < p.X.length; i++) if (test(p.X[i], p.Z[i])) return p.S[i];
    return none;
  }

  /**
   * Nose-wheel route from touchdown to the stand's stop bar (an arrival). To a remote stand
   * it carries on west along the taxiway, past the end of the departures' S-bend (the merge:
   * sMerge where it would enter it, sMergeOut once the main gear is clear of it).
   */
  function arrivalPath(st) {
    const p = new Path(TD_X + NOSE, RWY.z, HALF);
    p.line(70, RWY.z, 75, 2.75); //            the landing roll
    p.turn(-HALF, 30, 9, 1.0); //              right onto L4
    p.line(100, -1395, 9, 1.0);
    p.turn(-HALF, 30, 7, 1.0); //              right onto the taxiway, westbound
    p.line(HOLD_IN, TWY_Z, 8, 1.0);
    p.sHoldIn = p.len; //                      H-IN
    if (st.remote) {
      p.line(MERGE_X + 80, TWY_Z, 9, 1.0);
      p.sMerge = p.len;
      p.line(st.x + 25, TWY_Z, 8, 1.0);
    } else {
      p.line(3, TWY_Z, 6, 1.0);
      p.turn(HALF, 21.5, 5, 1.0); //           the S-bend onto the taxilane
      p.turn(-HALF, 21.5, 5, 1.0);
      p.line(st.x + 25, LANE_Z, 8, 1.0);
    }
    p.sTurnIn = p.len;
    p.turn(HALF, 25, 4, 1.0); //               left into the stand
    p.line(st.x, st.z - 12, 3, 0.6);
    p.line(st.x, st.z + NOSE, 1.4, 0.45); //   up to the stop bar
    // Off the runway once the nose wheel is past the hold bars on L4.
    p.sVacate = sWhere(p, (x, z) => x > 90 && z > -1400, 0);
    if (st.remote) p.sMergeOut = sWhere(p, (x, z) => x < MERGE_X - 42, p.sTurnIn);
    return p.end(0);
  }

  /**
   * Nose-wheel route from the end of the pushback to the far end of the runway (a departure):
   * from a contact stand along the taxilane and down the S-bend onto the taxiway (sMerge,
   * sMergeOut as arrivalPath's); from a remote stand it's on the taxiway already.
   */
  function departurePath(nx, nz, remote) {
    const p = new Path(nx, nz, -HALF);
    if (!remote) {
      p.line(-385, LANE_Z, 8, 1.0);
      p.sMerge = p.len;
      p.line(-400, LANE_Z, 6, 1.0);
      p.turn(-HALF, 21.5, 5, 1.0); //          the S-bend onto the taxiway
      p.turn(HALF, 21.5, 5, 1.0);
    }
    p.line(-920, TWY_Z, 9, 1.0);
    if (!remote) p.sMergeOut = sWhere(p, (x, z) => z < TWY_Z + 1 && x < MERGE_X - 42, p.sMerge + 60);
    p.turn(-HALF, 30, 5, 1.0); //              right onto L1
    p.line(L1, HOLD_OUT, 4, 1.0);
    p.sHold = p.len; //                        H-OUT
    p.line(L1, RWY.z + RWY.w / 2, 6, 1.0); //  (briskly: the next one's waiting)
    p.turn(-HALF, 30, 5.5, 1.0); //            right onto the runway, lined up east
    p.line(-905, RWY.z, 6, 1.0);
    p.sLine = p.len;
    p.line(RWY.x1 + 700, RWY.z, 99, 2);
    return p.end(99);
  }

  /**
   * Nose-wheel route of a tow from the end of a pushback (on the taxilane, facing west) to a
   * remote stand: the departures' way down the S-bend (sMerge, sMergeOut as theirs), along
   * the taxiway and in as an arrival would (sTurnIn), at a walking pace.
   */
  function towPath(nx, nz, st) {
    const p = new Path(nx, nz, -HALF);
    p.line(-385, LANE_Z, 4.2, 0.6);
    p.sMerge = p.len;
    p.line(-400, LANE_Z, 3.6, 0.6);
    p.turn(-HALF, 21.5, 3.2, 0.6);
    p.turn(HALF, 21.5, 3.2, 0.6);
    p.line(st.x + 25, TWY_Z, 4.5, 0.6);
    p.sMergeOut = sWhere(p, (x, z) => z < TWY_Z + 1 && x < MERGE_X - 42, p.sMerge + 60);
    p.sTurnIn = p.len;
    p.turn(HALF, 25, 2.8, 0.6);
    p.line(st.x, st.z - 12, 2.4, 0.5);
    p.line(st.x, st.z + NOSE, 1.2, 0.4);
    return p.end(0);
  }

  /**
   * Main-gear route of a pushback: straight back, then the tail swings east onto the taxilane
   * (or, from a remote stand, onto the taxiway).
   */
  function pushPath(st) {
    const p = new Path(st.x, st.z, PI);
    p.line(st.x, st.z - 16, 1.5, 0.3);
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
      glow: new THREE.SpriteMaterial({ map: poolTexture(), color: 0xfff6e8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      beam: new THREE.MeshBasicMaterial({ color: 0xfff4dc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      doorway: new THREE.MeshBasicMaterial({ vertexColors: true }),
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

  // Each kind: its body length (for keeping apart), its height and where its beacon sits.
  const KINDS = {
    tug: { len: 5.6, h: 2.1, beacon: [0.6, 2.05, -1.75] },
    bagtug: { len: 2.6, h: 2.1, beacon: [0, 2.03, -0.4] },
    belt: { len: 5.0, h: 2.6, beacon: [0.38, 2.0, -2.5] },
    cater: { len: 7.4, h: 3.5, beacon: [0, 2.55, 3.4] },
    fuel: { len: 7.6, h: 3.2, beacon: [0, 2.62, 3.4] },
    stairs: { len: 7.0, h: 3.0, beacon: [0, 2.68, 2.9] },
    followme: { len: 5.2, h: 1.7, beacon: null },
    van: { len: 5.2, h: 2.1, beacon: null },
  };

  /**
   * How far from an Albatross's centre line a vehicle this tall has to be for a wing to
   * pass over it: outboard of the engines for the low ones, out near the tip (which rises
   * to 3.5 m) for a bowser, never for a catering truck.
   */
  function wingClear(h) {
    return Math.max(9.2, 1.5 + (h + 0.15 - 2.25) / 0.084 + 1.2);
  }

  function gseMesh(kind) {
    const m = new THREE.Mesh(gseGeometry(kind), mats().gse);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  const LOOK_AT = [1, 0.5, -0.5, -1];
  const STUCK_T = 12; // a ground vehicle held up at a standstill this long (s) stops waiting

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
      this.disabled = false; // (see the notes at the top: it stops where it is and stays there)
      this.api = this._makeApi();
    }

    /** What airside.planes() hands out: a live view of this plane (see the notes at the top). */
    _makeApi() {
      const pl = this;
      return {
        plane: pl,
        get id() { return pl.rot.id; },
        get x() { return pl.x; },
        get y() { return pl.y; },
        get z() { return pl.z; },
        get yaw() { return pl.yaw; },
        get state() { return pl.phase; },
        get flight() { return pl.flight; },
        get stand() { return pl.rot.st.id; },
        get model() { return pl.model ? pl.model.root : null; },
        get speed() { return pl.v; },
        get pax() { return pl.pax; },
        get cargo() { return !!pl.rot.cargo; },
        get airline() { return pl.rot.airline.name; },
        get color() { return pl.color; },
        get gone() { return pl.gone; },
        get disabled() { return pl.disabled; },
        set disabled(v) { pl.disabled = !!v; },
      };
    }

    /** The flight it is now: the arrival until its passengers are off, then the departure. */
    get flight() {
      const p = this.phase;
      const f = this.rot.flags;
      const arriving = p === 'approach' || p === 'goaround' || p === 'rollout' || p === 'taxiin' || p === 'new' || (p === 'parked' && !f.deplaned);
      // (One being towed away is still the flight it came in as: it has no departure from here.)
      return arriving || this.rot.towOff ? this.rot.arr : this.rot.dep;
    }

    /** How many passengers are aboard, near enough (freighters: none). */
    get pax() {
      const r = this.rot;
      if (r.cargo || this.emptied) return 0; // (emptied: everyone's down the slides, havoc-air.js)
      const p = this.phase;
      if (p === 'tow' || p === 'towready') return 0;
      if (p !== 'parked') return p === 'approach' || p === 'goaround' || p === 'rollout' || p === 'taxiin' ? r.arr.pax : r.dep.pax;
      const f = r.flags;
      const t = this.sys.t;
      if (!f.bridge) return r.arr.pax;
      if (!f.deplaned) return Math.round(r.arr.pax * clamp(1 - (t - r.onBlock - T_BRIDGE) / (T_DEPLANED - T_BRIDGE), 0, 1));
      if (!f.boarding) return 0;
      if (f.closed) return r.dep.pax;
      return Math.round(r.dep.pax * clamp((t - r.off - B_BOARD) / (B_CLOSE - B_BOARD), 0, 1));
    }

    get onGround() {
      const p = this.phase;
      return p === 'rollout' || p === 'taxiin' || p === 'taxiout' || p === 'pushback' || p === 'lineup' || p === 'takeoff' || p === 'parked' || p === 'tugoff' || p === 'tow' || p === 'towready';
    }

    get moving() {
      const p = this.phase;
      return p === 'pushback' || ((p === 'rollout' || p === 'taxiin' || p === 'taxiout' || p === 'takeoff' || p === 'tow') && this.v > 0.15);
    }

    placeParked(st) {
      this.phase = 'parked';
      this.x = st.x;
      this.z = st.z;
      this.y = 0;
      this.yaw = 0;
      this.nx = st.x;
      this.nz = st.z + NOSE;
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
      if (this.disabled) this._disabledTick(dt);
      else switch (this.phase) {
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
        case 'tow':
          this._ground(dt);
          break;
        case 'lineup':
          // Lined up: rolling as soon as the runway ahead is clear (an arrival turned off).
          if (this.t > 3.5 && this.sys._mayRoll(this)) {
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
        case 'towready':
          // Pushed back for a tow: the tug turns round to pull, and off we go.
          if (this.t > 6) this.sys._beginTow(this);
          break;
        default:
          break;
      }
      this.eng = moveTowards(this.eng, this.engTarget, dt / (this.engTarget > this.eng ? 28 : 14));
      this._thrust();
    }

    /**
     * Disabled (airside.planes()[i].disabled): on the ground it brakes to a stop where it is,
     * engines off, and stays put (still in the way of everyone else, who hold behind it; on
     * the runway it shuts the runway). In the air it gives up and flies away (a diversion).
     */
    _disabledTick(dt) {
      const p = this.phase;
      if (p === 'approach' || p === 'goaround' || p === 'climb') {
        if (p === 'approach') this.sys._goAround(this);
        this.rot.diverted = true;
        this._climb(dt);
        return;
      }
      this.engTarget = 0;
      this.v = Math.max(0, this.v - (p === 'takeoff' || p === 'rollout' ? 3.4 : 2.2) * dt);
      this.pitch = Math.max(0, this.pitch - 0.08 * dt);
      if (!this.path || this.v <= 0) return;
      if (p === 'pushback') {
        this.s = Math.min(this.path.len - 0.05, this.s + this.v * dt);
        this.path.at(this.s, _a);
        this.x = _a.x;
        this.z = _a.z;
        this.yaw = wrapAngle(_a.h + PI);
        this.nx = this.x + Math.sin(this.yaw) * NOSE;
        this.nz = this.z + Math.cos(this.yaw) * NOSE;
      } else if (p === 'rollout' || p === 'taxiin' || p === 'taxiout' || p === 'takeoff' || p === 'tow') {
        this.s = Math.min(this.path.len, this.s + this.v * dt);
        this._follow(dt);
      }
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
      let stop = Math.min(this.stopS, this.sys._mergeHold(this));
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
      if (this.phase === 'tow' && this.s >= P.len - 0.03) this.sys._towDone(this);
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
        // Stopped: off again once it's clear (after an abort, a pause first, and from well down
        // the runway it backtracks to the end to start again: see Airside._backtrack).
        this.rejT = this.v === 0 ? (this.rejT || 0) + dt : 0;
        if (this.v === 0 && !jay && blk === Infinity && this.rejT > (this.aborted ? 25 : 0)) {
          this.reject = false;
          this.rejT = 0;
          if (this.aborted) {
            this.aborted = false;
            if (this.x > -800) {
              this.sys._backtrack(this);
              return;
            }
          }
        }
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
      // (A freighter is the cargo version: no windows, a big cargo door. One towed off its gate
      // is still the airliner it came in as.)
      this.model = this.sys._takeModel(this.rot.airline.cargo ? 'albatrossFreighter' : 'albatross', this.color);
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
        // The front door stands open while the bridge is on (from deplaning until the doors close).
        x.door.visible = p === 'parked' && !!this.rot.flags.bridge && !this.rot.flags.closed;
        const land = night > 0.12 && (air || (p === 'approach' && this.y < 400));
        for (const l of x.land) l.visible = land;
        x.beam.visible = land && this.y < 250;
        // The landing lights as one bright point that keeps its size on screen however far off
        // (an arrival reads as a star on the approach long before the plane does).
        x.glow.visible = land && (p === 'approach' || p === 'goaround' || p === 'climb' || p === 'takeoff');
        if (x.glow.visible) {
          const cp = this.sys.game.renderer.camera.position;
          x.glow.scale.setScalar(clamp(Math.hypot(this.x - cp.x, this.y - cp.y, this.z - cp.z) * 0.009, 1.6, 60));
        }
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
    // (Out at the nose tip, so the nose itself doesn't blot out the middle of it head on.)
    const glow = new THREE.Sprite(M.glow);
    glow.position.set(0, 2.8, 19.8);
    glow.visible = false;
    m.body.add(glow);
    // The pool of light the taxi and landing lights throw on the ground ahead.
    const pg = new THREE.PlaneGeometry(1, 1);
    pg.rotateX(-HALF);
    const pool = new THREE.Mesh(pg, M.pool);
    pool.position.set(0, 0.07, 30);
    pool.scale.set(11, 1, 30);
    pool.visible = false;
    pool.renderOrder = 2;
    m.root.add(pool);
    // The front door on the bridge side, open while the bridge is on (see Airliner._pose).
    const dg = doorGeometry();
    const door = new THREE.Mesh(dg || new THREE.BufferGeometry(), M.doorway);
    door.visible = false;
    m.body.add(door);
    m._air = { logo, land, taxi, beam, pool, glow, door };
  }

  // The Albatross's fuselage (as js/vehicles/models/albatross.js), for fitting the open door to it.
  const ALB_BODY = [
    { z: 19.05, w: 0.04, h: 0.04, y: 3.22 },
    { z: 18.7, w: 0.6, h: 0.68, y: 3.28 },
    { z: 18.0, w: 1.14, h: 1.28, y: 3.4 },
    { z: 17.0, w: 1.58, h: 1.74, y: 3.5 },
    { z: 15.5, w: 1.94, h: 2.04, y: 3.57 },
    { z: 13.5, w: 2.08, h: 2.15, y: 3.6 },
    { z: -9.0, w: 2.08, h: 2.15, y: 3.6 },
    { z: -12.0, w: 1.98, h: 1.94, y: 3.76 },
  ];
  let DOOR_GEO = null;
  /**
   * The open front door, port side (+x, where the jet bridge meets it): a dark doorway over
   * the painted door panel (model z 15.0, 0.84 m wide, 1.8 m tall), the cabin floor at its sill.
   */
  function doorGeometry() {
    if (DOOR_GEO !== null) return DOOR_GEO;
    DOOR_GEO = false;
    const K = VH.AircraftKit;
    if (!K || !VH.AircraftDefs || !VH.AircraftDefs.albatross) return DOOR_GEO;
    const body = new K().loft(ALB_BODY, 0xffffff, { seg: 36, steps: 4 });
    const k = new K();
    const s = 1.42;
    const ds = 0.9 / 2.1;
    const z0 = 15.0 - 0.42;
    const z1 = 15.0 + 0.42;
    k.patch(body, z0, z1, [s - ds, s + ds - 0.07], [s - ds, s + ds - 0.07], 1, 0x0c0e11, { lift: 0.022, ns: 6, nz: 2 });
    k.patch(body, z0, z1, [s + ds - 0.07, s + ds], [s + ds - 0.07, s + ds], 1, 0x5b554e, { lift: 0.022, ns: 1, nz: 2 });
    DOOR_GEO = k.geometry();
    return DOOR_GEO;
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
      this.stuckT = 0; //  held up at a standstill this long
      this.ghostT = 0; //  given up waiting on the other vehicles: drives on through them for this long
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
      this.stuckT = 0;
      this.ghostT = 0;
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
      if (this.attached || this.taken) return; // (taken: Jay has it, see Airside.takeGse)
      if (this.path) {
        const P = this.path;
        let vt = P.cap(this.s);
        const blk = this.sys._gseBlocked(this);
        if (blk < Infinity) {
          vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 2.2 * (blk - 0.4))));
          this.blockT += dt;
        } else this.blockT = 0;
        this.gseBlockT = this._blkKind === 'gse' ? (this.gseBlockT || 0) + dt : 0;
        if (this.ghostT > 0) this.ghostT -= dt;
        if (this.rev && this.gseBlockT > 3 && this.onStuck) this.onStuck(this);
        // Stopped by something for a good while (a knot of trucks, a car left on the road):
        // never wait for ever (see Airside._unstick).
        if (blk < 0.6 && this.v < 0.3) this.stuckT += dt;
        else if (this.v > 0.8) this.stuckT = 0;
        if (this.stuckT > STUCK_T && this.sys._unstick(this)) {
          this._pose(dt);
          return;
        }
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

  // ------------------------------------------------------- far and high
  /** A soft blob a few times wider than it is tall: a far-off aircraft against the sky. */
  function speckTexture() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 32;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 16, 0, 32, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.setTransform(2, 0, 0, 0.55, -32, 7.2);
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 32);
    return new THREE.CanvasTexture(c);
  }

  /** Along a contrail: thick and white just behind the jet, thinning out to nothing. */
  function trailTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 8;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.04, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 8);
    const v = x.createLinearGradient(0, 0, 0, 8);
    v.addColorStop(0, 'rgba(0,0,0,1)');
    v.addColorStop(0.5, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = v;
    x.fillRect(0, 0, 128, 8);
    return new THREE.CanvasTexture(c);
  }

  const TRAIL_N = 24; //   points along a contrail
  const TRAIL_STEP = 420; // metres between them

  /**
   * What's too far off to draw for real: the arrivals queued out on the approach (a speck by
   * day, their landing lights at night) and the departures climbing away, beyond the draw
   * distance; and now and then an airliner crossing high over the city with a contrail. All
   * drawn on a shell just inside the far plane, without fog, at the size they'd look.
   */
  class SkyTraffic {
    constructor(sys) {
      this.sys = sys;
      const scene = sys.game.scene;
      const tex = speckTexture();
      this.mLight = new THREE.SpriteMaterial({ map: poolTexture(), color: 0xfff3dc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      this.mNav = new THREE.SpriteMaterial({ map: poolTexture(), color: 0xff5040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      this.mSpeck = new THREE.SpriteMaterial({ map: tex, color: 0x6c7580, transparent: true, depthWrite: false, fog: false });
      this.mTrail = new THREE.MeshBasicMaterial({ map: trailTexture(), color: 0xffffff, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
      const sprite = (m) => {
        const o = new THREE.Sprite(m.clone()); // (each its own opacity)
        o.visible = false;
        o.frustumCulled = false;
        o.renderOrder = -900;
        scene.add(o);
        return o;
      };
      this.far = [];
      for (let i = 0; i < 10; i++) this.far.push({ light: sprite(this.mLight), speck: sprite(this.mSpeck) });
      this.jets = [];
      for (let i = 0; i < 2; i++) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 2 * 3), 3));
        const uv = new Float32Array(TRAIL_N * 2 * 2);
        const idx = [];
        for (let k = 0; k < TRAIL_N; k++) {
          uv.set([k / (TRAIL_N - 1), 0, k / (TRAIL_N - 1), 1], k * 4);
          if (k < TRAIL_N - 1) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
        }
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex(idx);
        const trail = new THREE.Mesh(geo, this.mTrail.clone());
        trail.frustumCulled = false;
        trail.visible = false;
        trail.renderOrder = -950;
        scene.add(trail);
        this.jets.push({ on: false, x: 0, y: 0, z: 0, hx: 0, hz: 1, v: 0, t: 0, trail, speck: sprite(this.mSpeck), nav: sprite(this.mNav) });
      }
      this.nextJet = rand(15, 70);
      this._p = new THREE.Vector3();
      this._q = new THREE.Vector3();
      this._d = new THREE.Vector3();
    }

    /** Where (x, y, z) shows on the shell, and how much a metre there counts for (R / distance). */
    _onShell(x, y, z, out) {
      const cam = this.sys.game.renderer.camera;
      const c = cam.position;
      const d = Math.hypot(x - c.x, y - c.y, z - c.z) || 1;
      const k = this.R / d;
      out.set(c.x + (x - c.x) * k, c.y + (y - c.y) * k, c.z + (z - c.z) * k);
      return k;
    }

    update(dt, on) {
      const cam = this.sys.game.renderer.camera;
      this.R = (cam.far || 900) * 0.9;
      const night = this.sys.night;
      const day = 1 - smoothstep(0.1, 0.5, night);
      const c = cam.position;
      // Airliners on the approach or climbing out, beyond the far plane.
      let n = 0;
      if (on) {
        for (const pl of this.sys.fleet) {
          if (n >= this.far.length) break;
          const ph = pl.phase;
          if (ph !== 'approach' && ph !== 'climb' && ph !== 'goaround') continue;
          const d = Math.hypot(pl.x - c.x, pl.y - c.y, pl.z - c.z);
          const fade = smoothstep(cam.far * 0.86, cam.far * 1.02, d) * (1 - smoothstep(16000, 22000, d));
          if (fade <= 0.01) continue;
          const f = this.far[n++];
          const k = this._onShell(pl.x, pl.y + 3, pl.z, this._p);
          f.speck.position.copy(this._p);
          f.speck.scale.set(Math.max(2.4, 44 * k), Math.max(1.2, 13 * k), 1);
          f.speck.visible = day > 0.02;
          // The landing lights (on for the approach and the climb out) read as a star at night.
          f.light.position.copy(this._p);
          f.light.scale.setScalar(Math.max(3.2, clamp(d * 0.009, 1.6, 70) * k) * (0.65 + 0.35 * (1 - day)));
          f.light.visible = true;
          f.light.material.opacity = fade * (0.35 + 0.65 * (1 - day));
          f.speck.material.opacity = fade * 0.8 * day;
        }
      }
      for (let i = n; i < this.far.length; i++) {
        this.far[i].speck.visible = false;
        this.far[i].light.visible = false;
      }
      // High overflights: one every few minutes, about 10 km up, straight across the sky.
      this.nextJet -= dt;
      if (on && this.nextJet <= 0) {
        const j = this.jets.find((q) => !q.on);
        this.nextJet = rand(110, 230);
        if (j) this._launch(j, c);
      }
      for (const j of this.jets) this._jet(j, dt, on, day);
    }

    _launch(j, c) {
      // From 32 km off on one side, passing within 12 km of Jay, to 32 km off the other side.
      const a = Math.random() * PI * 2;
      const off = rand(-12000, 12000);
      const hx = Math.sin(a);
      const hz = Math.cos(a);
      j.on = true;
      j.t = 0;
      j.v = rand(220, 250);
      j.hx = hx;
      j.hz = hz;
      j.x = c.x - hx * 32000 + hz * off;
      j.z = c.z - hz * 32000 - hx * off;
      j.y = rand(9000, 11500);
      j.len = rand(0.6, 1); // how long its contrail lasts (it depends on the air up there)
    }

    _jet(j, dt, on, day) {
      if (!j.on || !on) {
        j.trail.visible = j.speck.visible = j.nav.visible = false;
        if (!on) j.on = false;
        return;
      }
      j.t += dt;
      j.x += j.hx * j.v * dt;
      j.z += j.hz * j.v * dt;
      const c = this.sys.game.renderer.camera.position;
      if (j.t * j.v > 64000 + TRAIL_STEP * TRAIL_N) {
        j.on = false;
        return;
      }
      const k = this._onShell(j.x, j.y, j.z, this._p);
      j.speck.position.copy(this._p);
      j.speck.scale.set(Math.max(1.6, 50 * k), Math.max(0.8, 14 * k), 1);
      j.speck.material.opacity = 0.8 * day;
      j.speck.visible = day > 0.02;
      j.nav.position.copy(this._p);
      j.nav.scale.setScalar(Math.max(2.2, 60 * k));
      j.nav.visible = day < 0.6 && j.t % 1.4 < 0.12;
      // The contrail: a ribbon along the track behind it, built on the shell each frame.
      const pos = j.trail.geometry.attributes.position;
      const A = pos.array;
      const P = this._p;
      const Q = this._q;
      const D = this._d;
      const L = TRAIL_STEP * j.len;
      for (let i = 0; i < TRAIL_N; i++) {
        const back = Math.min(i * L, j.t * j.v);
        const wx = j.x - j.hx * back;
        const wz = j.z - j.hz * back;
        const kk = this._onShell(wx, j.y - i * 6, wz, P);
        this._onShell(wx - j.hx * 60, j.y - i * 6, wz - j.hz * 60, Q);
        // Across the trail, in the plane facing the camera.
        D.subVectors(Q, P).cross(this._q.copy(P).sub(c)).normalize();
        const w = (24 + i * 9) * kk;
        A[i * 6] = P.x + D.x * w;
        A[i * 6 + 1] = P.y + D.y * w;
        A[i * 6 + 2] = P.z + D.z * w;
        A[i * 6 + 3] = P.x - D.x * w;
        A[i * 6 + 4] = P.y - D.y * w;
        A[i * 6 + 5] = P.z - D.z * w;
      }
      pos.needsUpdate = true;
      j.trail.visible = true;
      j.trail.material.opacity = 0.2 + 0.7 * day;
    }

    hide() {
      for (const f of this.far) f.speck.visible = f.light.visible = false;
      for (const j of this.jets) {
        j.on = false;
        j.trail.visible = j.speck.visible = j.nav.visible = false;
      }
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
      // The remote stands (freighters, with air stairs; no bridge, no gate).
      this.remoteList = REMOTE_X.map((x, i) => ({
        id: 'R' + (i + 1), gate: null, x, z: REMOTE_Z, yaw: 0, door: { x: x + 2.1, y: 3.0, z: REMOTE_Z + 15.0 }, i, remote: true,
        state: 'empty', cur: null, queue: [], gse: null, crew: [], cones: false,
      }));
      this.allStands = this.standList.concat(this.remoteList);
      this.fleet = []; //  every live airliner (an Airliner); planes() hands out their .api views
      this.gstop = { on: false, reason: '', t: 0 }; // groundStop()
      this._merge = null; // the plane through the merge (see _mergeHold)
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
      this.skies = []; // the two Skylarks (this.sky, this.sky2), from _init
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
      this.skyFx = new SkyTraffic(this);
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
        for (const al2 of AIRLINES.slice(1).concat(CARGO_LINES)) {
          const m = VH.AircraftModels.build(al2.cargo ? 'albatrossFreighter' : 'albatross', al2.color);
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
        if (type === 'albatross' || type === 'albatrossFreighter') dressAirliner(m);
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
      this.fleet = [];
      this.rwy.clear();
      this._clock.set = false;
      this._slot = 0;
      this._merge = null;
      this.gstop.on = false;
      for (const st of this.allStands) {
        st.state = 'empty';
        st.cur = null;
        st.queue = [];
        st.cones = false;
      }
      // Three or four stands busy, each at a different point of its turnaround; a freighter
      // or two on the remote stands.
      const busy = Math.random() < 0.5 ? 3 : 4;
      const order = shuffle([0, 1, 2, 3]);
      const ages = shuffle([28, 72, 118, 160]);
      const parked = [];
      for (let k = 0; k < busy; k++) parked.push([this.standList[order[k]], ages[k] + rand(-12, 10)]);
      const ro = shuffle([0, 1, 2]);
      for (let k = 0; k < (Math.random() < 0.5 ? 1 : 2); k++) parked.push([this.remoteList[ro[k]], rand(40, 300)]);
      for (const [st, age] of parked) {
        const rot = this._newRot(st, -age - this._taxiIn(st));
        rot.onBlock = -age;
        rot.off = rot.planOff;
        rot.state = 'atStand';
        st.cur = rot;
        const pl = new Airliner(this, rot);
        pl.placeParked(st);
        rot.plane = pl;
        this.fleet.push(pl);
        const f = rot.flags;
        f.bridge = age > T_BRIDGE;
        f.deplaned = age > T_DEPLANED;
        const to = this.t - rot.off;
        f.boarding = to >= B_BOARD;
        f.final = to >= B_FINAL;
        f.closed = to >= B_CLOSE;
        if (st.remote) st.state = f.closed ? 'closed' : 'parked';
        else st.state = f.closed ? 'closed' : f.boarding ? 'boarding' : f.deplaned ? 'parked' : f.bridge ? 'deplaning' : 'parked';
        rot.arr.status = 'At gate';
        st.cones = f.cones = f.bridge && !f.closed;
        if (f.closed) pl.engTarget = 0;
      }
      this.lastLand = -400; // the first arrival is on its way in already
      this._plan();
      // Light aircraft.
      const lark = (spot, color, tour, timer) => ({ phase: 'parked', timer, x: spot.x, z: spot.z, y: 0, yaw: PI, pitch: 0, roll: 0, v: 0, model: null, voice: null, circuits: 0, prop: 0, spot, color, tour });
      this.sky = lark(G1, 0xf2f2ee, false, rand(30, 110)); //  circuits and touch-and-goes
      this.sky2 = lark(G2, 0xf6d23c, true, rand(120, 260)); // a sightseeing trip over the city
      this.skies = [this.sky, this.sky2];
      this.heli = { phase: 'away', timer: rand(25, 110), x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, v: 0, rpm: 0, model: null, voice: null };
      this._updateStatuses();
    }

    _clear() {
      for (const pl of this.fleet) {
        pl.detach();
        if (pl.voice) pl.voice.stop();
        pl.voice = null;
      }
      this.fleet = [];
      for (const st of this.allStands || []) this._dropStandGse(st);
      this._dropCrew(true);
      this._dropExtras();
      for (const c of (this.skies || []).concat([this.heli])) {
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
      if (this.skyFx) this.skyFx.hide();
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
      // (The takeoffs Jay watches are counted on the stats page by airportlife.js, as "Flights
      // you've watched leave"; seenOff is still kept in the save, for old saves' sake.)
      return [];
    }

    // ----------------------------------------------------- the schedule
    /** Touchdown to on-block (about). */
    _taxiIn(st) {
      if (st.remote) return 128 + Math.max(0, REMOTE_X[0] - st.x) / 8;
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
      const cargo = !!st.remote;
      const al = pick(cargo ? CARGO_LINES : AIRLINES);
      const city = pick(CITIES);
      let n = this._num.get(al.code);
      if (!n) n = (cargo ? 701 : 101) + Math.floor(Math.random() * (cargo ? 90 : 380)) * 2;
      this._num.set(al.code, n + 2 + 2 * Math.floor(Math.random() * 3));
      const id = ++this._serial;
      const onBlock = landAt + this._taxiIn(st);
      const planOff = onBlock + (cargo ? rand(T_CARGO[0], T_CARGO[1]) : T_TURN);
      const rot = {
        id, st, airline: al, cargo, landAt, planLand: landAt, onBlock, planOff, off: planOff, state: 'planned', plane: null, flags: {}, gone: 0,
      };
      const back = Math.random() < 0.7 ? city : pick(CITIES);
      const pax = () => (cargo ? 0 : 90 + Math.floor(Math.random() * 90));
      rot.arr = { id: al.code + n + '-' + id, code: al.code + ' ' + n, airline: al.name, city, kind: 'arr', time: this._hours(landAt), gate: st.gate, stand: st.id, status: 'Scheduled', est: null, pax: pax(), cargo };
      rot.dep = { id: al.code + (n + 1) + '-' + id, code: al.code + ' ' + (n + 1), airline: al.name, city: back, kind: 'dep', time: this._hours(planOff), gate: st.gate, stand: st.id, status: 'Scheduled', est: null, pax: pax(), cargo };
      st.queue.push(rot);
      this.rots.push(rot);
      return rot;
    }

    /**
     * Keep the arrivals planned (25 minutes ahead), each to the stand that frees up first: a
     * minute and a half apart, every third gap a longer one, and every sixth arrival a
     * freighter for a remote stand.
     */
    _plan() {
      let guard = 0;
      while (this.lastLand < this.t + PLAN_AHEAD && guard++ < 40) {
        const k = this._slot++;
        let gap = rand(ARR_GAP[0], ARR_GAP[1]);
        if (k % 3 === 2) gap += rand(BIG_GAP[0], BIG_GAP[1]);
        let t = Math.max(this.t + (this.t < 1 && guard === 1 ? 42 : 60), this.lastLand + gap);
        const pickStand = (list) => {
          let best = null;
          let bestFree = Infinity;
          for (const st of shuffle(list.slice())) {
            if (st.blocked) continue;
            const f = this._freeAt(st);
            if (f < bestFree) {
              best = st;
              bestFree = f;
            }
          }
          return best ? [best, Math.max(t, bestFree + 25 - this._taxiIn(best))] : null;
        };
        let got = k % 6 === 2 ? pickStand(this.remoteList) : null;
        if (!got || got[1] > t + 120) got = pickStand(this.standList) || got;
        if (!got) break;
        t = got[1];
        const rot = this._newRot(got[0], t);
        if (!rot.cargo && k % TOW_EVERY === 5) this._planTow(rot);
        this.lastLand = t;
      }
    }

    /**
     * Make this arrival one that's towed off its gate to a remote stand once its passengers
     * are off (if a remote stand will be free for it then; one at a time), and plan the
     * positioning flight it leaves on from there.
     */
    _planTow(rot) {
      if (this.rots.some((r) => r.ferry && !r.cancelled && r.state !== 'gone')) return;
      const at = rot.onBlock + T_TOWOFF + 150; // (about when it'll be on the remote stand)
      let best = null;
      let bestFree = Infinity;
      for (const st of shuffle(this.remoteList.slice())) {
        if (st.blocked) continue;
        const f = this._freeAt(st);
        if (f < bestFree) {
          best = st;
          bestFree = f;
        }
      }
      if (!best || bestFree > at - 40) return;
      rot.towOff = true;
      rot.planOff = rot.off = rot.onBlock + T_TOWOFF;
      rot.dep.time = this._hours(rot.planOff);
      const al = rot.airline;
      const n = this._num.get(al.code) || 101;
      this._num.set(al.code, n + 2);
      const id = ++this._serial;
      const planOff = at + rand(T_FERRY[0], T_FERRY[1]);
      const fr = {
        id, st: best, airline: al, cargo: true, ferry: true, landAt: at, planLand: at, onBlock: at, planOff, off: planOff, state: 'towplanned', plane: null, flags: {}, gone: 0, from: rot,
      };
      // (Not on the boards: no passengers either way.)
      fr.arr = { id: rot.arr.id + '-T', code: rot.arr.code, airline: al.name, city: rot.arr.city, kind: 'arr', time: rot.arr.time, gate: null, stand: best.id, status: 'At gate', est: null, pax: 0, cargo: true };
      fr.dep = { id: al.code + n + '-' + id, code: al.code + ' ' + n, airline: al.name, city: pick(CITIES), kind: 'dep', time: this._hours(planOff), gate: null, stand: best.id, status: 'Scheduled', est: null, pax: 0, cargo: true, ferry: true };
      best.queue.push(fr);
      this.rots.push(fr);
      rot.towTo = fr;
    }

    /**
     * The remote stand for a tow about to start: the planned one if it's free, else any free
     * one with nothing due there soon; the stand is then held for it. Null: wait.
     */
    _towStand(r) {
      const fr = r.towTo;
      if (!fr || fr.cancelled) return null;
      const ok = (st) => !st.blocked && (!st.cur || st.cur === fr) && (st === fr.st || !st.queue.some((q) => q !== fr && q.landAt < this.t + 420));
      let st = ok(fr.st) ? fr.st : null;
      if (!st) st = this.remoteList.find(ok) || null;
      if (!st) return null;
      if (st !== fr.st) {
        fr.st.queue = fr.st.queue.filter((q) => q !== fr);
        st.queue.unshift(fr);
        fr.st = st;
        fr.arr.stand = fr.dep.stand = st.id;
      }
      return st;
    }

    /**
     * Move a flight that couldn't land (a go-around, a ground stop) to the next slot: the
     * first that's far enough from the others, or else the ones planned after it wait.
     */
    _resequence(rot, after) {
      const t0 = Math.max(this.t + 150, after || 0);
      const clash = (t) => this.rots.some((r) => r !== rot && (r.state === 'planned' || r.state === 'inbound') && Math.abs(r.landAt - t) < ARR_SEP + 4) ||
        this.skies.some((k) => k.slotT && t > k.slotT - 42 && t < k.slotT + 48); // (a gap booked for a Skylark)
      let t = t0;
      while (t < t0 + 420 && clash(t)) t += 10;
      if (clash(t)) {
        t = t0;
        for (const r of this.rots) if (r !== rot && r.state === 'planned' && r.landAt > t - ARR_SEP) r.landAt += ARR_GAP[0];
      }
      rot.landAt = t;
      rot.state = 'planned';
      rot.plane = null;
      rot.onBlock = t + this._taxiIn(rot.st);
      rot.off = Math.max(rot.planOff, rot.onBlock + (rot.towOff ? T_TOWOFF : T_MIN));
      this.lastLand = Math.max(this.lastLand, ...this.rots.filter((r) => r.state === 'planned').map((r) => r.landAt));
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
      for (let i = 0; i < this.fleet.length; i++) this.fleet[i].update(dt);
      if (this.fleet.some((p) => p.gone)) this.fleet = this.fleet.filter((p) => !p.gone);
      this._arrivalsIn();
      for (const st of this.allStands) this._standTick(st, dt);
      this._shutTick();
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
      for (const pl of this.fleet) if (pl.model) pl._pose();
      this.skyFx.update(dt, true);
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
      // (still: Jay on foot, or a car standing still: see _pushClear.)
      const add = (x, y, z, r, big, still) => {
        const o = this._obsPool[n] || (this._obsPool[n] = { x: 0, y: 0, z: 0, r: 0, big: false, still: false });
        n++;
        o.x = x;
        o.y = y;
        o.z = z;
        o.r = r;
        o.big = big;
        o.still = still;
        out.push(o);
      };
      const p = g.player;
      if (p && !p.inVehicle && !p.isDead && !this._cabinUp(p)) add(p.pos.x, p.pos.y, p.pos.z, 0.6, false, true);
      const inBox = (x, z) => x > -1120 && x < 420 && z > -1560 && z < -1180;
      for (const v of g.vehicles.list) {
        if (v.removed || !inBox(v.pos.x, v.pos.z) || v.pos.y > 25) continue;
        add(v.pos.x, v.pos.y, v.pos.z, Math.max(v.hx || 1, v.hz || 2), (v.hz || 0) > 6, Math.abs(v.speed || 0) < 0.3);
      }
      let rwy = false;
      for (const o of out) {
        if (o.x > RWY.x0 - 80 && o.x < RWY.x1 + 80 && Math.abs(o.z - RWY.z) < RWY.w / 2 + 12 && o.y < 30) rwy = true;
      }
      this._jayRwy = rwy;
      const pp = p ? (p.inVehicle && p.vehicle ? p.vehicle.pos : p.pos) : null;
      this.jay = pp;
    }

    /**
     * Arrivals onto the approach, SPAWN_LEAD out, at least ARR_SEP behind the one ahead. While
     * three or more departures are queued for the runway, each arrival is held back a little
     * (once) to let them go; in a ground stop none come in.
     */
    _spawnDue() {
      const queued = this._depQueue();
      for (const r of this.rots) {
        if (r.state !== 'planned' || r.landAt - this.t > SPAWN_LEAD) continue;
        if (this.gstop.on) {
          r.landAt = Math.max(r.landAt, this.t + SPAWN_LEAD + 1);
          continue;
        }
        const eta = Math.max(40, r.landAt - this.t);
        if (queued >= 3 && !r.held && eta > 100) {
          r.held = true;
          r.landAt += 45;
          continue;
        }
        let ok = true;
        for (const q of this.fleet) if (q.phase === 'approach' && Math.abs(q.eta() - eta) < ARR_SEP) ok = false;
        for (const k of this.skies) {
          if (k.slotT && this.t + eta > k.slotT - 42 && this.t + eta < k.slotT + 48) {
            r.landAt = k.slotT + 48; // (not into a gap booked for a Skylark)
            ok = false;
          }
        }
        if (!ok && r.landAt - this.t > SPAWN_LEAD) continue;
        if (!ok) {
          r.landAt += 10;
          continue;
        }
        const pl = new Airliner(this, r);
        pl.startApproach(eta);
        r.plane = pl;
        r.state = 'inbound';
        this.fleet.push(pl);
      }
    }

    /**
     * Make sure no arrival touches down between t0 and t1 (for the Skylark): the ones planned
     * then, and any still far out on the approach (out of sight), wait until after it, and
     * the ones behind them keep their distance. (One too close in to hold back still comes.)
     */
    _delayArrivals(t0, t1) {
      const list = [];
      for (const q of this.fleet) if (q.phase === 'approach' && !q.cleared && !q.disabled) list.push({ q, t: this.t + q.eta(), fixed: q.eta() < 95 });
      for (const r of this.rots) if (r.state === 'planned') list.push({ r, t: r.landAt, fixed: false });
      list.sort((a, b) => a.t - b.t);
      let last = -Infinity;
      for (const e of list) {
        let t = e.t;
        if (!e.fixed) {
          if (t > t0 - 1 && t < t1) t = t1;
          t = Math.max(t, last + ARR_SEP + 2);
        }
        if (t > e.t + 0.5) {
          if (e.q) e.q.x -= (t - e.t) * e.q.v;
          (e.q ? e.q.rot : e.r).landAt = t;
        }
        last = t;
      }
      this.lastLand = Math.max(this.lastLand, last);
    }

    /** Departures taxiing out that are at (or queued for) the holding point. */
    _depQueue() {
      let n = 0;
      for (const q of this.fleet) if (q.phase === 'taxiout' && !q.cleared && q.path && q.s > q.path.sHold - 170) n++;
      return n;
    }

    // ------------------------------------------------------------ runway
    _arrivalWithin(sec) {
      for (const q of this.fleet) if (q.phase === 'approach' && q.eta() < sec) return true;
      for (const s of this.skies) if ((s.slot && s.eta < sec) || (s.slotT && s.slotT - this.t < sec)) return true;
      return false;
    }

    /**
     * May the Skylark go? Nothing on the runway, no ground stop, and no arrival within half a
     * minute (it's rolling well before the next one needs clearing to land, and climbing away
     * long before that one touches down).
     */
    _rwyFree() {
      return this.rwy.size === 0 && !this._jayRwy && !this.gstop.on && !this._rwyBlocked() && !this._arrivalWithin(34);
    }

    _rwyRelease(pl) {
      this.rwy.delete(pl);
    }

    /** A disabled airliner on the runway shuts it (until airside.removePlane clears it). */
    _rwyBlocked() {
      for (const q of this.fleet) {
        if (q.disabled && q.y < 5 && (this.rwy.has(q) || (Math.abs(q.z - RWY.z) < RWY.w / 2 + 14 && q.x > RWY.x0 - 70 && q.x < RWY.x1 + 70))) return true;
      }
      return false;
    }

    /** Something in this.rwy that's a departure already rolling, or off the ground (it's no bother to an arrival). */
    _rollingAway(u) {
      if (u.rot) return !u.disabled && (u.phase === 'climb' || (u.phase === 'takeoff' && !u.reject && u.v > 3));
      return (u.phase === 'roll' && u.v > 3) || (u.phase === 'circuit' && !u.slot);
    }

    /** Seconds until the next arrival (an airliner, or the Skylark with its slot) not yet cleared to land touches down. */
    _nextArrival() {
      let e = Infinity;
      for (const q of this.fleet) if (q.phase === 'approach' && !q.cleared && !q.disabled) e = Math.min(e, q.eta());
      for (const r of this.rots) if (r.state === 'planned') e = Math.min(e, Math.max(0, r.landAt - this.t));
      for (const k of this.skies) {
        if (this.rwy.has(k)) continue;
        if (k.slot) e = Math.min(e, k.eta);
        if (k.slotT) e = Math.min(e, Math.max(0, k.slotT - this.t)); // (a departure just has to be rolling well before it lands)
      }
      return e;
    }

    /**
     * May the departure at the holding point line up? ("Line up and wait": behind an arrival
     * that has touched down, or a departure that's rolling.) Only if it will itself be rolling
     * before the next arrival needs clearing to land (25 s out), and never under one that's
     * about to cross the threshold.
     */
    _mayLineUp(pl) {
      if (this.skies.some((k) => k.phase === 'hold' && k.pri)) return false; // (its turn: see _skylark)
      let vacate = 0; // seconds until the runway ahead of it is clear (about)
      for (const u of this.rwy) {
        if (u === pl) continue;
        if (u.rot && !u.disabled && u.phase === 'rollout') vacate = Math.max(vacate, Math.max(4, 30 - u.t));
        else if (this._rollingAway(u)) vacate = Math.max(vacate, u.rot && u.phase === 'takeoff' ? Math.max(6, 34 - u.t) : 4);
        else return false; // one cleared to land, one lined up already, the Skylark on it ...
      }
      return this._nextArrival() > Math.max(LINE_T, vacate) + 31;
    }

    /** May the departure lined up roll? Once the runway ahead is clear (the arrival turned off, the one before airborne). */
    _mayRoll(pl) {
      if (this._jayRwy || this.gstop.on || this._rwyBlocked()) return false;
      for (const u of this.rwy) {
        if (u === pl) continue;
        if (u.rot ? u.phase !== 'climb' : u.phase === 'roll' || u.phase === 'tng' || u.phase === 'landroll') return false;
      }
      return true;
    }

    /**
     * The runway, run like a busy single runway in mixed mode. An arrival is cleared to land
     * 25 s out if the runway is clear, or the only thing on it is a departure already rolling
     * (it's long gone by touchdown); otherwise it goes round. A departure at the holding point
     * lines up when _mayLineUp says so and rolls when _mayRoll does.
     */
    _runway() {
      const shut = this._jayRwy || this.gstop.on || this._rwyBlocked();
      for (const pl of this.fleet) {
        if (pl.disabled) continue;
        if (pl.phase === 'approach') {
          const eta = pl.eta();
          if (!pl.cleared && eta < 25) {
            let ok = !shut && this._queueIn() < 2;
            for (const u of this.rwy) if (u !== pl && !this._rollingAway(u)) ok = false;
            if (ok) {
              pl.cleared = true;
              this.rwy.add(pl);
            } else this._goAround(pl);
          } else if (pl.cleared && (this._jayRwy || this._rwyBlocked()) && pl.y > 4) this._goAround(pl);
        } else if (pl.phase === 'taxiout' && !pl.cleared && pl.s > pl.path.sHold - 60) {
          pl.stopS = pl.path.sHold;
          if (pl.s >= pl.path.sHold - 1.5 && !shut && this._mayLineUp(pl)) {
            pl.cleared = true;
            this.rwy.add(pl);
            pl.stopS = pl.path.sLine;
            if (this.onLog) this.onLog('lineup', pl);
          }
        }
      }
    }

    _queueIn() {
      let n = 0;
      for (const q of this.fleet) if ((q.phase === 'rollout' || q.phase === 'taxiin') && !q.released) n++;
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
      if (pl.phase === 'goaround' && !pl.rot.diverted && !pl.rot.cancelled) {
        // It flew a wide circuit out of sight: back in the queue for another go.
        this._resequence(pl.rot, this.gstop.on ? this.t + 400 : 0);
      } else if (pl.phase === 'goaround') this._cancelRot(pl.rot, 'Diverted');
    }

    /** A rotation that won't happen (a diversion, a wreck cleared away): off the boards as Cancelled. */
    _cancelRot(r, why) {
      r.cancelled = true;
      r.endT = this.t;
      const done = r.state === 'gone';
      r.state = 'cancelled';
      if (!/landed|at gate/i.test(r.arr.status) && !r.landed) r.arr.status = why === 'Diverted' ? 'Diverted' : 'Cancelled';
      if (!done) r.dep.status = 'Cancelled';
      r.arr.est = r.dep.est = null;
      const st = r.st;
      st.queue = st.queue.filter((q) => q !== r);
      if (st.cur === r) {
        st.cur = null;
        st.state = 'empty';
        st.cones = false;
        const tug = st.gse && st.gse.tug;
        if (tug && tug.attached) {
          tug.attached = null;
          tug.towing = false;
          this._tugHome(st, tug);
        }
      }
      // (One that was to be towed off: its positioning flight from the remote stand won't happen either.)
      const fr = r.towTo;
      if (fr && !fr.cancelled && (fr.state === 'towplanned' || fr.state === 'towing')) this._cancelRot(fr, why);
    }

    /**
     * Another stand for an arrival whose own is blocked (a disabled plane on it): the free one
     * with the longest until its next flight. The gate changes on the boards.
     */
    _restand(pl, soon) {
      const r = pl.rot;
      const old = r.st;
      let best = null;
      let bestT = -Infinity;
      if (soon === undefined) soon = old.remote ? 240 : -Infinity;
      for (const st of old.remote ? this.remoteList : this.standList) {
        if (st === old || st.cur || st.blocked) continue;
        const next = st.queue.length ? st.queue[0].landAt : Infinity;
        if (next < this.t + soon) continue; // (not one wanted again soon)
        if (next > bestT) {
          best = st;
          bestT = next;
        }
      }
      if (!best) return null;
      old.queue = old.queue.filter((q) => q !== r);
      best.queue.unshift(r);
      r.st = best;
      for (const f of [r.arr, r.dep]) {
        f.gate = best.gate;
        f.stand = best.id;
      }
      pl.path = arrivalPath(best);
      pl.align = { x: best.x };
      if (!r.cargo) VH.events.emit('airside:gatechange', { flight: r.dep, arrival: r.arr, from: old.gate, gate: best.gate, stand: best.id });
      return best;
    }

    // --------------------------------------------------------- the stands
    /**
     * Arrivals on the ground: hold at H-IN until the stand is free and the taxilane end is
     * clear (for a remote stand: no pushback onto the taxiway it will take). One whose stand
     * is blocked (a disabled plane on it) goes to another.
     */
    _arrivalsIn() {
      for (const pl of this.fleet) {
        if ((pl.phase !== 'rollout' && pl.phase !== 'taxiin') || pl.released || pl.disabled) continue;
        let st = pl.rot.st;
        // (A freighter's stand still taken as it nears H-IN, its last one late away: another.)
        const taken = st.cur && st.cur !== pl.rot && pl.s < pl.path.sHoldIn + 2;
        if (taken && ((st.cur.plane && st.cur.plane.disabled) || (st.remote && pl.s > pl.path.sHoldIn - 60))) st = this._restand(pl) || st;
        if (st.blocked && pl.s < pl.path.sHoldIn + 2) st = this._restand(pl) || st; // (cabin.js: Jay's taken the plane off it)
        // Its gate still busy (the one on it running late) as it nears H-IN, and another gate
        // free with nothing due there for five minutes: a gate change rather than a wait.
        if (taken && !st.remote && st === pl.rot.st && pl.s > pl.path.sHoldIn - 120 && st.cur.off - this.t > 40) st = this._restand(pl, 300) || st;
        const free = (!st.cur || st.cur === pl.rot) && !st.blocked;
        let clear = true;
        for (const q of this.fleet) {
          if (q === pl || !q.onGround || q.phase === 'parked') continue;
          if (!st.remote && Math.hypot(q.x - -55, q.z - LANE_Z) < 52) clear = false;
        }
        // Not while a plane is being pushed back across the lane (or the taxiway) it would take.
        for (const s2 of st.remote ? this.remoteList : this.standList) if (s2.state === 'pushback' && s2.x > st.x) clear = false;
        // First come, first served: never past one still waiting at H-IN (or on its way to it)
        // ahead on the same way in. (Released, this one would hold the gates' pushbacks while it
        // sat stuck behind that one, whose own gate is waiting for one of those pushbacks.)
        for (const q of this.fleet) {
          if (q !== pl && (q.phase === 'rollout' || q.phase === 'taxiin') && !q.released && q.s > pl.s) clear = false;
        }
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
      pl.z = st.z;
      pl.yaw = 0;
      pl.nx = st.x;
      pl.nz = st.z + NOSE;
      pl.v = 0;
      pl.align = null;
      pl.engTarget = 0;
      r.onBlock = this.t;
      r.off = Math.max(r.planOff, this.t + (r.towOff ? T_TOWOFF : T_MIN));
      r.state = 'atStand';
      r.arr.status = 'At gate';
      st.state = 'parked';
      if (this.onLog) this.onLog('onblock', pl);
    }

    _standTick(st) {
      const r = st.cur;
      if (!r || r.state !== 'atStand' || (r.plane && r.plane.disabled)) return;
      const f = r.flags;
      const tr = this.t - r.onBlock;
      const to = this.t - r.off;
      const ev = { flight: r.arr, stand: st.id, gate: st.gate };
      if (r.towOff && (!r.towTo || r.towTo.cancelled)) r.towOff = false; // (no tow after all: turned round here)
      if (st.remote) {
        // A freighter: the stairs on, the loading, the doors shut; no boarding calls.
        if (!f.bridge && tr >= T_BRIDGE) f.bridge = true;
        if (!f.closed && to >= B_CLOSE) {
          f.closed = f.boarding = f.final = f.deplaned = true;
          st.state = 'closed';
        }
      } else if (!f.bridge && tr >= T_BRIDGE) {
        f.bridge = true;
        st.state = 'deplaning';
        VH.events.emit('airside:arrived', ev);
      }
      if (!f.cones && tr >= 14 && !f.closed) st.cones = f.cones = true;
      if (!f.deplaned && tr >= T_DEPLANED) {
        f.deplaned = true;
        if (st.state === 'deplaning') st.state = 'parked';
      }
      // (One to be towed away boards nobody; nor does a freighter.)
      if (!f.boarding && to >= B_BOARD && !r.towOff && !st.remote) {
        f.boarding = true;
        st.state = 'boarding';
        VH.events.emit('airside:boarding', { flight: r.dep, stand: st.id, gate: st.gate });
      }
      if (!f.final && to >= B_FINAL && !r.towOff && !st.remote) f.final = true;
      if (!f.closed && to >= B_CLOSE && !this._cabinHeld(st)) {
        f.closed = true;
        st.state = 'closed';
        st.cones = false;
        VH.events.emit('airside:closed', { flight: r.dep, stand: st.id });
      }
      // Doors shut a minute and more and still not away, for want of this stand's own vehicles
      // (held up somewhere): they're done here. Out of sight they're simply put away; after a
      // few minutes, any not right by Jay too.
      if (f.closed && !f.push && to > 60 && st.gse) this._standGseHome(st, to > 180);
      if (f.closed && !f.push && to >= 0 && !this.gstop.on && this._pushClear(st) && (!r.towOff || this._towStand(r)) && !this._cabinHeld(st)) {
        f.push = true;
        st.state = 'pushback';
        const pl = r.plane;
        if (r.towOff) {
          // Its remote stand is held for it from now.
          const fr = r.towTo;
          fr.state = 'towing';
          fr.st.cur = fr;
          fr.st.state = 'arriving';
        }
        pl.phase = 'pushback';
        pl.t = 0;
        pl.path = pushPath(st);
        pl.s = 0;
        pl.v = 0;
        pl.engTarget = r.towOff ? 0 : 1; // (a tow: engines off)
        r.pushed = this.t;
        const tug = st.gse && st.gse.tug;
        if (tug) tug.attached = pl;
        if (!st.remote) VH.events.emit('airside:pushback', { flight: r.dep, stand: st.id, tow: !!r.towOff });
        if (this.onLog) this.onLog('pushback', pl);
      }
    }

    /**
     * May the plane at this stand push back now? Nothing on the taxilane near it, no arrival
     * on its way along the lane to a stand further west (it would meet the tail swinging
     * out), nobody and no car behind it. (Jay, or a car standing, behind it but clear of where
     * the plane will go is waited for half a minute, not for ever: once it's moving, the push
     * still stops for anything that comes into its way, _lookBehind.)
     */
    _pushClear(st) {
      if (st.remote) return this._pushClearRemote(st);
      const held = st.cur ? this.t - st.cur.off : 0;
      for (const q of this.fleet) {
        if (q.rot === st.cur || !q.onGround || q.phase === 'parked') continue;
        // (One taxiing out from a stand further east will come past behind us.)
        const east = q.phase === 'taxiout' || q.phase === 'tugoff' || q.phase === 'pushback' || q.phase === 'tow' || q.phase === 'towready' ? 330 : 130;
        if (q.x > st.x - 45 && q.x < st.x + east && q.z > -1348 && q.z < -1283) return false;
        if (q.released && (q.phase === 'taxiin' || q.phase === 'rollout') && !q.rot.st.remote && q.s < q.path.sTurnIn + 5 && q.rot.st.x < st.x + 20) return false;
      }
      for (const o of this._obs) {
        if (o.x > st.x - 24 && o.x < st.x + 58 && o.z > -1342 && o.z < -1262 && o.y < 6) {
          if (o.still && held > 30 && !this._inPushSweep(st, o)) continue;
          return false;
        }
      }
      // No vehicle (but this stand's own) on the road behind it or about to pass.
      for (const v of this._allGse || []) {
        if (v.st === st || !v.root.visible || (this.extras && v === this.extras.stairs)) continue;
        if (v.x > st.x - (v.busy ? 40 : 16) && v.x < st.x + 58 && v.z > -1342 && v.z < -1282) return false;
      }
      return this._ownGseReady(st, (v) => v.x > st.x - 40 && v.x < st.x + 58 && v.z > -1342 && v.z < -1262);
    }

    /**
     * This stand's own vehicles ready for the pushback: the tug on its spot, the rest home or
     * on their way there and out of the way (`inWay` says what's in the way).
     */
    _ownGseReady(st, inWay) {
      const g = st.gse;
      if (!g) return true;
      if (g.tug && (g.tug.busy || g.tug.post !== 'spot')) return false;
      for (const key of g.keys) {
        const v = g[key];
        if (key === 'tug' || v.post === 'home') continue;
        if (v.post !== 'leaving' || inWay(v)) return false;
      }
      return true;
    }

    /**
     * May the freighter on this remote stand push back onto the taxiway? Nothing on the
     * taxiway from just west of it to well east, nothing coming through the merge or about to,
     * no arrival on its way past to a remote stand further west, nobody behind it.
     */
    _pushClearRemote(st) {
      const me = st.cur && st.cur.plane;
      const held = st.cur ? this.t - st.cur.off : 0;
      if (this._merge && this._merge !== me) return false;
      for (const q of this.fleet) {
        if (q === me || !q.onGround || q.phase === 'parked') continue;
        if (q.z < TWY_Z + 26 && q.z > TWY_Z - 30 && q.x > st.x - 55 && q.x < st.x + 270) return false;
        if (q.phase === 'pushback' && q.rot.st.remote) return false;
        if (q.path && q.path.sMerge !== undefined && q.s > q.path.sMerge - 90 && q.s < q.path.sMergeOut && (q.phase === 'taxiout' || q.phase === 'taxiin' || q.phase === 'tow')) return false;
        if (q.released && (q.phase === 'taxiin' || q.phase === 'rollout') && q.rot.st.remote && q.s < q.path.sTurnIn + 5 && q.rot.st.x < st.x) return false;
        if ((q.phase === 'tow' || q.phase === 'towready') && q.rot.towTo && q.rot.towTo.st.x < st.x && (q.phase === 'towready' || q.s < q.path.sTurnIn + 5)) return false;
      }
      for (const o of this._obs) {
        if (o.x > st.x - 24 && o.x < st.x + 70 && o.z > TWY_Z - 16 && o.z < st.z + 14 && o.y < 6) {
          if (o.still && held > 30 && !this._inPushSweep(st, o)) continue;
          return false;
        }
      }
      return this._ownGseReady(st, (v) => v.x > st.x - 30 && v.x < st.x + 70 && v.z < st.z + 18);
    }

    /**
     * The merge, where the departures' S-bend meets the taxiway: one plane through it at a
     * time (a departure coming down the S-bend, or an arrival for a remote stand coming along
     * the taxiway). How far along its path this plane may go, or Infinity.
     */
    _mergeHold(pl) {
      const P = pl.path;
      if (!P || P.sMerge === undefined || (pl.phase !== 'taxiout' && pl.phase !== 'taxiin' && pl.phase !== 'tow')) return Infinity;
      if (this._merge === pl) {
        if (pl.s > P.sMergeOut) this._merge = null;
        return Infinity;
      }
      if (pl.s > P.sMerge + 0.5) return Infinity; // (went through before the merge was watched)
      if (pl.s < P.sMerge - 70) return Infinity;
      const m = this._merge;
      if (m && (m.gone || !this.fleet.includes(m) || m.disabled || (m.phase !== 'taxiout' && m.phase !== 'taxiin' && m.phase !== 'tow'))) this._merge = null;
      // A remote pushback onto the taxiway in progress holds it too.
      const pushing = this.remoteList.some((r) => r.state === 'pushback');
      if (!this._merge && !pushing && pl.s > P.sMerge - 12) this._merge = pl;
      return this._merge === pl ? Infinity : P.sMerge;
    }

    /** Put away this stand's vehicles that aren't where a pushback needs them (see _standTick). */
    _standGseHome(st, late) {
      const set = st.gse;
      const j = this.jay;
      for (const key of set.keys) {
        const v = set[key];
        const s = set.spec[key];
        const ready = key === 'tug' ? v.post === 'spot' && !v.busy : v.post === 'home';
        if (ready || v.attached || (key === 'tug' && v.post === 'home')) continue;
        if (this._seen(v.x, v.z) && !(late && j && Math.hypot(j.x - v.x, j.z - v.z) > 40)) continue;
        v.onDone = null;
        v.onStuck = null;
        v.hose = false;
        v.lift = v.liftTo = 0;
        if (key === 'tug') this._toSpot(v, s);
        else {
          v.place(s.home[0], s.home[1], s.home[2]);
          v.post = 'home';
        }
      }
    }

    /** Would the plane pushing back from this stand come near this obstacle (main gear, tail or wingtips)? */
    _inPushSweep(st, o) {
      const P = st.pushP || (st.pushP = pushPath(st));
      const r = o.r + (o.big ? 16 : 7) + 5; // (wider than _lookBehind's, so it never stops halfway)
      const rw = o.r + 5;
      for (let s = 0; s <= P.len + 0.1; s += 3) {
        P.at(Math.min(P.len, s), _a);
        // (The path is the main gear's, tail first: the tail is 19 m further along it, the
        // wingtips 17 m out either side and a little aft.)
        const fx = Math.sin(_a.h);
        const fz = Math.cos(_a.h);
        if (Math.hypot(o.x - _a.x, o.z - _a.z) < r || Math.hypot(o.x - _a.x - fx * 19, o.z - _a.z - fz * 19) < r) return true;
        for (const sd of [-1, 1]) {
          if (Math.hypot(o.x - _a.x - fx * 6 - fz * 17 * sd, o.z - _a.z - fz * 6 + fx * 17 * sd) < rw) return true;
        }
      }
      return false;
    }

    _pushDone(pl) {
      const r = pl.rot;
      const st = r.st;
      pl.phase = r.towOff ? 'towready' : 'tugoff';
      pl.t = 0;
      pl.v = 0;
      st.cur = null;
      st.state = 'empty';
      st.queue = st.queue.filter((q) => q !== r);
      r.state = r.towOff ? 'towing' : 'outbound';
      const tug = st.gse && st.gse.tug;
      if (tug && tug.attached === pl) {
        if (r.towOff) tug.towing = true; // (it stays on, turns round and pulls)
        else {
          tug.attached = null;
          this._tugHome(st, tug);
        }
      }
    }

    /** Pushed back for a tow: off along the taxilane and taxiway to the remote stand held for it. */
    _beginTow(pl) {
      const fr = pl.rot.towTo;
      pl.phase = 'tow';
      pl.t = 0;
      pl.path = towPath(pl.nx, pl.nz, fr.st);
      pl.s = 0;
      pl.v = 0;
      pl.stopS = Infinity;
      pl.align = { x: fr.st.x };
      if (this.onLog) this.onLog('tow', pl);
    }

    /**
     * On the remote stand: from here on it's the positioning flight (its own turnaround with
     * the stairs, then away like a freighter); the tug unhitches and goes.
     */
    _towDone(pl) {
      const r = pl.rot;
      const fr = r.towTo;
      const st = fr.st;
      pl.phase = 'parked';
      pl.x = st.x;
      pl.z = st.z;
      pl.yaw = 0;
      pl.nx = st.x;
      pl.nz = st.z + NOSE;
      pl.v = 0;
      pl.align = null;
      pl.engTarget = 0;
      r.state = 'towed';
      r.towedT = this.t;
      r.plane = null;
      pl.rot = fr;
      fr.plane = pl;
      fr.onBlock = this.t;
      fr.off = Math.max(fr.planOff, this.t + T_FERRY[0]);
      fr.state = 'atStand';
      st.cur = fr;
      st.state = 'parked';
      this._unhitch(pl);
      if (this.onLog) this.onLog('onblock', pl);
    }

    /**
     * Any tug on this plane lets go: one pushing it goes home as after a pushback; one that
     * towed it pulls forward clear and waits there ('away': it's back home later, see
     * _gseTick).
     */
    _unhitch(pl) {
      for (const st of this.standList) {
        const tug = st.gse && st.gse.tug;
        if (!tug || tug.attached !== pl) continue;
        tug.attached = null;
        if (!tug.towing) {
          this._tugHome(st, tug);
          continue;
        }
        tug.towing = false;
        tug.post = 'away';
        const fx = Math.sin(tug.yaw);
        const fz = Math.cos(tug.yaw);
        const p1 = [tug.x + fx * 5, tug.z + fz * 5];
        tug.go([{ path: route([[tug.x, tug.z], p1, [p1[0] + fx * 3 + fz * 9, p1[1] + fz * 3 - fx * 9]], 4, 3) }]);
      }
    }

    _beginTaxiOut(pl) {
      pl.phase = 'taxiout';
      pl.t = 0;
      pl.path = departurePath(pl.nx, pl.nz, pl.rot.st.remote);
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
      pl._gseBlk = null;
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
          for (const q of this.fleet) {
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
          // The Skylark taxiing: wait while it's on the move nearby, or standing right in the
          // way (it waits for us otherwise, see _skylark: one of the two always goes).
          for (const sk of this.skies) {
            if (!sk.onGround || sk.phase === 'parked') continue;
            const ds = Math.hypot(_c.x - sk.x, _c.z - sk.z);
            if (ds < 28 && (sk.v > 0.3 || ds < 12)) return Math.max(0, d - 10);
          }
        }
        for (const o of this._obs) {
          const r = o.r + (o.big ? 18 : 8.5);
          const dx = o.x - _b.x;
          const dz = o.z - _b.z;
          if (dx * dx + dz * dz < r * r && o.y < 12) return Math.max(0, d - 8);
        }
      }
      pl.blocker = null;
      // (The follow-me comes out onto the taxiway east of the apron; the remote stands' tugs onto it in the west.)
      if (!fast && (pl.z > -1362 || (pl.x > -10 && pl.x < 130) || (pl.x < CARGO_PAD.x1 + 10 && pl.x > CARGO_PAD.x0 - 30))) {
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
      pl._gseBlk = null;
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
          if (!w.root.visible || w.attached || (w.plane === pl && w.state !== 'out') || w.waitPl === pl || (w.role === 'tug' && w.st === pl.rot.st)) continue;
          if (Math.abs(w.x - mx) > 30 || Math.abs(w.z - mz) > 30) continue;
          // Under it here? (One already under a wing, out on the road, is fine while it is low
          // enough for the wing to pass over it and isn't heading in under the body.)
          const m = Math.min(2.5, w.k.len * 0.35);
          if (!underPlane(w.x, w.z, mx, mz, yaw, m)) continue;
          if (underPlane(w.x, w.z, pl.x, pl.z, pl.yaw, m)) {
            const ac = across(w.x, w.z, pl.x, pl.z, pl.yaw);
            const sg = w.rev ? -2 : 2;
            const ac2 = across(w.x + Math.sin(w.yaw) * sg, w.z + Math.cos(w.yaw) * sg, pl.x, pl.z, pl.yaw);
            if (ac > wingClear(w.k.h || 2.1) && (w.v < 0.3 || ac2 >= ac)) continue;
          }
          pl._gseBlk = w;
          return d;
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

    /**
     * The airside road past a stand is shut, like a level crossing, while a plane turns in
     * to it (from 70 m before the turn until it's on the stand) or is pushed back from it.
     */
    _shutTick() {
      for (const st of this.standList) st.shut = false;
      for (const pl of this.fleet) {
        const st = pl.rot.st;
        if (pl.phase === 'pushback' || (pl.phase === 'taxiin' && pl.path && pl.path.sTurnIn && pl.s > pl.path.sTurnIn - 70)) st.shut = true;
      }
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
      // Wait short of a shut stretch of the road (one already on it drives on, clear).
      if (Math.abs(v.z - ROAD_Z) < 12 || Math.abs(_c.z - ROAD_Z) < 12) {
        for (const st of this.standList) {
          if (!st.shut || v.st === st) continue;
          const x0 = st.x - 24;
          const x1 = st.x + 54;
          if (v.x > x0 && v.x < x1 && Math.abs(v.z - ROAD_Z) < 5) continue;
          if ((_c.x > x0 && _c.x < x1 && Math.abs(_c.z - ROAD_Z) < 5) || (frontX > x0 && frontX < x1 && Math.abs(frontZ - ROAD_Z) < 5)) {
            v._blkKind = 'plane';
            return 0;
          }
        }
      }
      // Planes on the ground (not parked): keep out from under each one, where it is now and
      // where it will be in three and six seconds. Already under one of those: carry on, out
      // of the way. (The follow-me never waits for the plane it's leading.)
      for (const q of this.fleet) {
        if (!q.onGround || q.phase === 'parked' || q.gone || (q === v.plane && v.state !== 'out') || q === v.waitPl) continue;
        if (v.role === 'tug' && q.rot.st === v.st) continue;
        if (q._gseBlk === v && q.v < 0.5) continue; // it's waiting for us: go
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
      for (const sk of this.skies) if (sk.onGround && sk.v > 0.3 && Math.hypot(_c.x - sk.x, _c.z - sk.z) < 18) return 0;
      const fx = Math.sin(v.yaw) * (v.rev ? -1 : 1);
      const fz = Math.cos(v.yaw) * (v.rev ? -1 : 1);
      // (Turning across the road just ahead counts as crossing it.)
      const fz0 = Math.abs(fz) > 0.3 ? fz : Math.cos(_c.h);
      const sx0 = Math.sign(fx);
      const half = v.k.len / 2;
      for (const o of this._obs) {
        const dx = o.x - v.x;
        const dz = o.z - v.z;
        const along = dx * fx + dz * fz;
        const side = Math.abs(-dx * fz + dz * fx);
        if (along > 0 && along < half + 6 + o.r && side < 1.6 + o.r && o.y < 5) {
          v._blkKind = 'obs';
          return Math.max(0, along - half - 1.5 - o.r);
        }
      }
      // Given up waiting on the other vehicles (Airside._unstick): on through them.
      if (v.ghostT > 0) {
        v._blk = null;
        return Infinity;
      }
      // Pulling out onto (or across) the airside road: wait for anything coming along a lane
      // still to be crossed.
      if (Math.abs(fz0) > 0.3 && Math.min(v.z, _c.z) < ROAD_Z + 9 && Math.max(v.z, _c.z) > ROAD_Z - 4.5) {
        for (const w of this._allGse) {
          if (w === v || !w.busy || Math.abs(w.z - ROAD_Z) > 3.5 || (w._blk === v && w.v < 1.5)) continue;
          const wdx = Math.sin(w.yaw) * (w.rev ? -1 : 1);
          if (Math.abs(w.z - v.z) < 1.2 && Math.sign(wdx) === sx0) continue; // behind us in our own lane
          if (Math.abs(wdx) < 0.7 || (w.z - v.z) * fz0 < -1.5) continue;
          const gap = (v.x - w.x) * Math.sign(wdx); // how far it has to come to reach us
          if (gap > -5 && gap < Math.max(v.rev ? 70 : 45, w.v * 7)) {
            v._blkKind = 'gse';
            v._blk = w;
            return 0;
          }
        }
      }
      // Never wait on each other for ever: two stuck on each other (or behind one that's not
      // going anywhere) for a quarter of a minute, or anything for three quarters of one, drive
      // on through for a few seconds. (Queued behind one that's waiting for a plane or Jay, it
      // waits too.)
      if (v._blk && ((v.gseBlockT > 45 && v._blk.gseBlockT > 30) || (v.gseBlockT > 15 && (v._blk._blk === v || !v._blk.busy)))) {
        v.ghostT = 4;
        v._blk = null;
        return Infinity;
      }
      // Other vehicles (and the baggage carts): the middle or either end of one in the lane
      // just ahead. Two waiting on each other (at a crossing): the one already across the
      // other's way goes first, to clear it.
      const L = this._lk || (this._lk = { vx: 0, vz: 0, fx: 0, fz: 0, half: 0, reach: 0, best: Infinity, by: null });
      L.vx = v.x;
      L.vz = v.z;
      L.fx = fx;
      L.fz = fz;
      L.half = half;
      L.reach = half + 6 + v.v * 1.6;
      L.best = Infinity;
      L.by = null;
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
        // (Its middle: keep clear of however much of it sticks out towards us, crossing at a slant.
        // One pulling out across us and turning our way swings its tail in: leave it room.)
        const cd = fx * Math.sin(w.yaw) + fz * Math.cos(w.yaw);
        const ca = Math.abs(cd);
        const room = w.busy && (w.rev ? -cd : cd) < -0.2 && ca < 0.9 ? 2.5 : 0;
        this._look(w, w.x, w.z, Math.max(1.2, ca * wh + Math.sqrt(Math.max(0, 1 - ca * ca)) * 1.2 + 0.4) + room);
        for (const k of LOOK_AT) this._look(w, w.x + sx * k, w.z + sz * k, 1.2 + room); // and along it
        if (w.carts) for (const c of w.carts) this._look(w, c.x, c.z, 1.2);
      }
      const by = L.by;
      L.by = null;
      v._blk = by;
      if (by) v._blkKind = 'gse';
      return L.best === Infinity ? Infinity : Math.max(0, L.best);
    }

    /** _gseBlocked: is this point of vehicle w in the lane just ahead (and the nearest so far)? */
    _look(w, x, z, m) {
      const L = this._lk;
      const dx = x - L.vx;
      const dz = z - L.vz;
      const along = dx * L.fx + dz * L.fz;
      const side = Math.abs(-dx * L.fz + dz * L.fx);
      if (along > 0 && along < L.reach && side < 2.3 && along - L.half - m < L.best) {
        L.best = along - L.half - m;
        L.by = w;
      }
    }

    /**
     * A ground vehicle held up at a standstill for a while (Gse.update). Out of Jay's sight it
     * simply gets where it was going, as the people inside do; in sight, one stuck on the other
     * vehicles (a knot of them at a crossing) drives on through them after a while longer.
     * Behind Jay, or a car he left on the road, it waits while he watches. True if it moved.
     */
    _unstick(v) {
      if (v.attached || !v.path) return false;
      if (!this._seen(v.x, v.z)) {
        this._finishLegs(v);
        return true;
      }
      if (v.stuckT > STUCK_T * 2 && v._blkKind === 'gse' && v.ghostT <= 0) v.ghostT = 5;
      return false;
    }

    /** Could Jay see this spot on the apron (near enough, and on screen)? */
    _seen(x, z) {
      const j = this.jay;
      if (!j) return false;
      const dx = j.x - x;
      const dz = j.z - z;
      return dx * dx + dz * dz < 120 * 120 && this.game.isVisible(x, 1.5, z, 4);
    }

    /** Straight to the end of the vehicle's last leg, and whatever it was to do there. */
    _finishLegs(v) {
      const L = v.legs.length ? v.legs[v.legs.length - 1] : { path: v.path, rev: v.rev };
      L.path.at(L.path.len, _b);
      const f = v.onDone;
      v.onDone = null;
      v.onStuck = null;
      v.place(_b.x, _b.z, L.rev ? wrapAngle(_b.h + PI) : _b.h);
      if (f) f(v);
    }

    // ------------------------------------------------- ground equipment
    /** The world position of a stand-local point ([x, z] relative to the stand, z south). */
    _standGseSpec(st) {
      if (st.remote) return this._remoteGseSpec(st);
      const i = st.i;
      // This stand's bowser and catering truck in the depot (staggered, so each can drive straight out north).
      const fuelSlot = [8 + 12 * i, -1263];
      const caterSlot = [14 + 12 * i, -1281];
      const depotOut = (slot, x, lane) => [[slot[0], slot[1]], [slot[0], ROAD_W], [x, lane]];
      const depotIn = (slot) => [[DEPOT_IN_X, ROAD_E], [DEPOT_IN_X, DEPOT_IN_Z], [slot[0], DEPOT_IN_Z], [slot[0], slot[1]]];
      const L = (lx, lz) => W(st, lx, lz);
      return {
        tug: { kind: 'tug', home: [...L(-30, 25), HALF], spot: [...L(0, 19.6), PI], tin: -48 },
        // (The jet bridge's rotunda stands at x +11.5..+16.5, z +12.5..+17.5 and its tunnel
        // runs south from it to the terminal: everything keeps east or north of them.)
        belt1: {
          kind: 'belt', home: [...L(21, 21), PI], spot: [...L(6.3, 9.5), -HALF], tin: 14, tout: -27,
          legIn: () => [{ path: route([L(21, 21), L(21, 9.5), L(6.3, 9.5)], 4, 5) }],
          legOut: () => [{ path: route([L(6.3, 9.5), L(21, 9.5), L(21, 21)], 4, 5), rev: true }],
        },
        belt2: {
          kind: 'belt', home: [...L(26, 23), PI], spot: [...L(6.3, -8), -HALF], tin: 17, tout: -29,
          legIn: () => [{ path: route([L(26, 23), L(26, -4), L(22, -8), L(6.3, -8)], 4, 5) }],
          legOut: () => [{ path: route([L(6.3, -8), L(22, -8), L(26, -4), L(26, 23)], 4, 5), rev: true }],
        },
        train: {
          kind: 'train', home: [...L(30, 22), -HALF], spot: [...L(13, -8), PI], tin: 22, tout: -45,
          legIn: () => [{ path: route([L(30, 22), L(23.5, 22), L(23.5, 3), L(13, 3), L(13, -8)], 5, 5) }],
          legOut: () => [{ path: route([L(13, -8), L(13, -22.5), L(40, -22.5), L(40, 22), L(30, 22)], 5, 6) }],
        },
        cater: {
          kind: 'cater', home: [...caterSlot, PI], spot: [...L(-4.6, -9), 0], tin: 18, tout: -74,
          legIn: () => [{ path: route(depotOut(caterSlot, st.x + 1.4, ROAD_W).concat([L(-4.6, -18.5), L(-4.6, -9)]), 6, 7) }],
          legOut: () => [
            { path: route([L(-4.6, -9), L(-4.6, -22.5), L(-12, -22.5)], 6, 3), rev: true },
            { path: route([L(-12, -22.5)].concat(depotIn(caterSlot)), 5, 8) },
          ],
          depotIn: depotIn(caterSlot),
        },
        fuel: {
          kind: 'fuel', home: [...fuelSlot, PI], spot: [...L(-13, 10), 0], tin: 14, tout: -64,
          legIn: () => [{ path: route(depotOut(fuelSlot, st.x - 24, ROAD_W).concat([L(-24, 0), L(-13, 6), L(-13, 10)]), 6, 7) }],
          legOut: () => [{ path: route([L(-13, 10), L(-13, 16), L(-24, 18), L(-24, -22.5)].concat(depotIn(fuelSlot)), 6, 7) }],
        },
      };
    }

    /**
     * A remote stand's own: the air stairs at the front door, a high-loader (the catering
     * truck's lift) at the freighter's main-deck door, a belt loader at the aft hold and a
     * tug. Their pads are south of the stand, by the fence; the taxiway is the other way.
     */
    _remoteGseSpec(st) {
      const L = (lx, lz) => W(st, lx, lz);
      return {
        tug: {
          kind: 'tug', home: [...L(-26, 26), HALF], spot: [...L(0, 19.6), PI], tin: -50,
          legIn: () => [{ path: route([L(-26, 26), L(-8, 26), L(0, 21.5), L(0, 19.6)], 4, 4) }],
          legHome: (bx, bz) => [{ path: route([[bx, bz], [bx + 4, bz + 5], L(11, -4), L(11, 22), L(-34, 30), L(-34, 26), L(-26, 26)], 4, 6) }],
        },
        stairs: {
          kind: 'stairs', home: [...L(18, 33), PI], spot: [...L(5.9, 15), -HALF], tin: 10, tout: -40,
          legIn: () => [{ path: route([L(18, 33), L(18, 15), L(5.9, 15)], 5, 4) }],
          legOut: () => [{ path: route([L(5.9, 15), L(18, 15), L(18, 33)], 5, 2.2), rev: true }],
        },
        loader: {
          kind: 'cater', home: [...L(-4.6, 40), 0], spot: [...L(-4.6, 10.5), 0], tin: 20, tout: -85,
          legIn: () => [{ path: route([L(-4.6, 40), L(-4.6, 10.5)], 4, 2.2), rev: true }],
          legOut: () => [{ path: route([L(-4.6, 10.5), L(-4.6, 40)], 4, 4) }],
        },
        belt: {
          kind: 'belt', home: [...L(24, 40), PI], spot: [...L(6.3, -8), -HALF], tin: 26, tout: -55,
          legIn: () => [{ path: route([L(24, 40), L(24, -4), L(20, -8), L(6.3, -8)], 4, 5) }],
          legOut: () => [{ path: route([L(6.3, -8), L(20, -8), L(24, -4), L(24, 40)], 4, 5), rev: true }],
        },
      };
    }

    _makeStandGse(st) {
      if (!VH.AircraftKit) return;
      const spec = this._standGseSpec(st);
      const set = { spec, keys: Object.keys(spec) };
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
      // (Or out towing a plane from here.)
      const towed = this.fleet.find((q) => q.rot.st === st && (q.phase === 'tow' || q.phase === 'towready'));
      if (towed && set.tug) {
        set.tug.attached = towed;
        set.tug.towing = true;
        set.tug.yaw = towed.yaw;
      }
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
        ...(s.legHome ? s.legHome(bx, bz) : [{ path: route([[bx, bz], [bx + 4, bz + 5], [st.x + 11, ROAD_W], [st.x - 36, ROAD_W], L(-36, 25), L(-30, 25)], 4, 6) }]),
      ], () => {
        tug.post = 'home';
        tug.place(s.home[0], s.home[1], s.home[2]);
      });
    }

    /** A tug waiting at the nose for a plane that won't now be pushed back: backs off home. */
    _tugBack(st, v, s) {
      const home = () => {
        v.post = 'home';
        v.place(s.home[0], s.home[1], s.home[2]);
      };
      if (!this._seen(v.x, v.z)) {
        home();
        return;
      }
      const L = (lx, lz) => W(st, lx, lz);
      const pts = st.remote ? [L(0, 19.6), L(0, 21.5), L(-8, 26), L(-26, 26)] : [L(0, 19.6), L(0, 21.5), L(-5, 27), L(-12, 27), L(-30, 25)];
      v.post = 'going';
      v.go([{ path: route(pts, 4, 2.2), rev: true }], home);
    }

    _gseTick(dt) {
      // Everyone first, so each vehicle can see all the others as it moves.
      const all = (this._allGse = this._allGse || []);
      all.length = 0;
      for (const st of this.allStands) {
        if (!st.gse) continue;
        for (const key of st.gse.keys) all.push(st.gse[key]);
      }
      if (this.extras) for (const v of this.extras.list) all.push(v);
      for (const st of this.allStands) {
        const set = st.gse;
        if (!set) continue;
        const r = st.cur;
        const atStand = r && r.state === 'atStand';
        const tr = atStand ? this.t - r.onBlock : -1;
        const to = atStand ? this.t - r.off : -1e9;
        for (const key of set.keys) {
          const s = set.spec[key];
          const v = set[key];
          if (v.taken) continue; // (Jay has it, or it's a wreck: havoc-air.js)
          if (key === 'tug') {
            if (atStand && to >= s.tin && v.post === 'home' && !v.busy) {
              const L = (lx, lz) => W(st, lx, lz);
              v.post = 'going';
              v.go(s.legIn ? s.legIn() : [{ path: route([L(-30, 25), L(-12, 27), L(-5, 27), L(0, 21.5), L(0, 19.6)], 4, 4) }], () => {
                v.post = 'spot';
              });
            }
            if (v.attached) {
              const pl = v.attached;
              const hx = Math.sin(pl.yaw);
              const hz = Math.cos(pl.yaw);
              v.x = pl.nx + hx * 4.4;
              v.z = pl.nz + hz * 4.4;
              // (Towing, it turns round to face the way they're going: see _pushDone.)
              v.yaw = v.towing ? dampAngle(v.yaw, pl.yaw, 1.4, dt) : wrapAngle(pl.yaw + PI);
              v.v = pl.v;
              v._pose();
            } else if (v.post === 'away' && !v.busy && !this._seen(v.x, v.z) && !this._seen(s.home[0], s.home[1])) {
              // Left where a tow ended: back home once nobody's looking.
              v.post = 'home';
              v.place(s.home[0], s.home[1], s.home[2]);
            } else if (v.post === 'spot' && !v.busy && !atStand) this._tugBack(st, v, s); // (its plane's gone)
            v.update(dt);
            continue;
          }
          if (atStand && v.post === 'home' && !v.busy && tr >= s.tin && to < s.tout && !(r.towOff && (key === 'cater' || key === 'fuel'))) {
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
          } else if (pl.phase === 'tugoff' || pl.phase === 'taxiout' || pl.phase === 'towready' || pl.phase === 'tow') {
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
        v.k = { len: 5.2, h: VH.CarModels.TYPES.porter.height, beacon: [0, VH.CarModels.TYPES.porter.height + 0.02, 0.2] };
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
      if (fm && !fm.taken) {
        if (fm.carModel.setHeadlights) fm.carModel.setHeadlights(night);
        if (fm.state === 'home') {
          // (Only one still well up the runway: it has to be there first.)
          // (Not for a freighter: it goes on along the taxiway to the remote stands.)
          const pl = this.fleet.find((p) => p.phase === 'rollout' && !p.followed && !p.rot.st.remote && p.v < 45 && p.x < -200);
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
              if (_c.x < fm.x + 0.5 && _c.z > TWY_Z - 3 && pl.phase === 'taxiin') {
                // Off ahead of it, from where it waits (it pulls away to its 34 m lead).
                if (pl.nx > fm.x + 12) {
                  fm.state = 'lead';
                  fm.ls = s - Math.max(0, fm.x - _c.x);
                } else this._fmBack(fm, null); // it's on top of us (held up on the way out)
              }
            }
            if (fm.state === 'lead') {
              fm.ls = Math.min(s, fm.ls + (pl.v + 3) * dt);
              if (fm.ls >= P.sTurnIn) this._fmBack(fm, pl);
              else {
                P.at(fm.ls, _c);
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
              : [[84, -1290], [84, -1306], [285, -1306], [285, -1272], [90, -1272], [84, -1278], [84, -1290]];
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
      if (!pl) fm.plane = null;
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
      for (const q of this.fleet) {
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
    _skyPath(kind, x, g) {
      // kind 'out': its spot g → the taxiway → L3 hold. 'line': hold → lined up east → the take-off run.
      if (kind === 'out') return route([[g.x, g.z], [g.x, TWY_Z], [L3, TWY_Z], [L3, -1404]], 14, 7);
      if (kind === 'line') return route([[L3, -1404], [L3, RWY.z], [RWY.x1 + 300, RWY.z]], 15, 99, 99);
      if (kind === 'in') return route([[x, RWY.z], [L5, RWY.z], [L5, -1305], [g.x, -1305], [g.x, g.z]], 14, 12);
      return null;
    }

    /** A sightseeing trip: climbing out east, a left turn out over the bay and away. */
    _skyTour(x0) {
      return new Path(x0, RWY.z, HALF).line(900, RWY.z).turn(HALF, 500).line(1400, RWY.z - 4200).end(99);
    }

    /** Back from one: in from the east along the downwind leg, round onto final, a full stop. */
    _skyJoin() {
      const p = new Path(3200, RWY.z + 600, -HALF);
      p.line(-1250, RWY.z + 600);
      p.sDecide = p.len - 300;
      p.turn(-PI, 300);
      p.sFinal = p.len;
      p.td = -60;
      p.line(p.td, RWY.z);
      return p.end(99);
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
      const td = full ? -60 : -560; // (a full stop lands long: it's off at L5 the sooner)
      p.line(td, RWY.z);
      p.td = td;
      return p.end(99);
    }

    _skylark(dt) {
      if (!this.skies) return;
      for (const k of this.skies) this._lark(k, dt);
    }

    /**
     * One Skylark: the first flies circuits with touch-and-goes, the second (k.tour) takes
     * people on a trip out over the bay and back. They keep apart: only one taxis at a time,
     * and only one is ever in the circuit (the second comes back to it once the first is
     * down, and the first waits at the hold while it does).
     */
    _lark(k, dt) {
      const mate = k === this.sky ? this.sky2 : this.sky;
      const taxiing = (q) => q.phase === 'taxi' || q.phase === 'hold' || q.phase === 'roll' || q.phase === 'landroll' || q.phase === 'taxiin' || q.phase === 'tng';
      const inCircuit = (q) => q.phase === 'roll' || q.phase === 'circuit' || q.phase === 'orbit' || q.phase === 'tng';
      k.onGround = k.phase === 'parked' || k.phase === 'taxi' || k.phase === 'hold' || k.phase === 'roll' || k.phase === 'landroll' || k.phase === 'taxiin';
      switch (k.phase) {
        case 'parked':
          k.v = 0;
          k.prop = Math.max(0, k.prop - dt * 0.4);
          k.timer -= dt;
          if (k.timer <= 0 && !taxiing(mate) && !(mate.join && inCircuit(mate))) {
            k.phase = 'taxi';
            k.path = this._skyPath('out', 0, k.spot);
            k.s = 0;
            k.circuits = k.tour || Math.random() < 0.65 ? 1 : 2; // (now and then a touch-and-go first)
          }
          break;
        case 'taxi':
        case 'taxiin': {
          k.prop = Math.min(0.45, k.prop + dt * 0.3);
          let vt = k.path.cap(k.s);
          // Give way to airliners: any on the move near where we're going, or one standing
          // there (one standing to the side, waiting for us, waits while we go by).
          k.path.at(Math.min(k.path.len, k.s + 14), _c);
          for (const q of this.fleet) {
            if (!q.onGround || q.phase === 'parked' || Math.hypot(_c.x - q.x, _c.z - q.z) > 34) continue;
            if (q.v > 0.3 || underPlane(_c.x, _c.z, q.x, q.z, q.yaw, 7)) vt = 0;
          }
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
              k.timer = k.tour ? rand(220, 380) : rand(190, 330);
              k.yaw = PI;
            }
          }
          break;
        }
        case 'hold':
          k.v = 0;
          // Kept waiting a while: the tower makes a gap (the arrivals are held back a little,
          // the departures wait) and we go in it.
          k.wait = (k.wait || 0) + dt;
          if (k.wait > 50 && (!k.pri || k.wait - k.priT > 60)) {
            k.pri = true;
            k.priT = k.wait;
            this._delayArrivals(this.t + 10, this.t + 70);
          }
          if (this._rwyFree() && !this.fleet.some((q) => q.phase === 'taxiout' && q.cleared) && !(mate.join && inCircuit(mate))) {
            this.rwy.add(k);
            k.phase = 'roll';
            k.path = this._skyPath('line', 0, k.spot);
            k.s = 0;
            k.wait = 0;
            k.pri = false;
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
            k.phase = k.tour ? 'tour' : 'circuit';
            k.path = k.tour ? this._skyTour(k.x) : this._skyCircuit(k.x, k.circuits <= 1);
            k.s = 0;
            k.y = 0;
          }
          break;
        }
        case 'tour': {
          // Out over the bay, climbing to 300 m, until it's well out of sight.
          k.prop = 1;
          k.v = moveTowards(k.v, 44, dt * 2);
          const prevH = k.yaw;
          k.s += k.v * dt;
          k.path.at(Math.min(k.s, k.path.len), _c);
          k.x = _c.x;
          k.z = _c.z;
          k.yaw = _c.h;
          const yr = wrapAngle(k.yaw - prevH) / Math.max(dt, 1e-3);
          k.roll = dampAngle(k.roll, clamp(-yr * k.v / 9.8, -0.5, 0.5), 3, dt);
          k.y = smoothstep(0, 1600, k.s) * 300;
          k.pitch = k.s < 1200 ? 0.12 : 0.02;
          if (k.s >= k.path.len || (k.s > 2500 && !this._near(k.x, k.z, 1900))) {
            k.phase = 'away';
            k.timer = rand(100, 220);
          }
          break;
        }
        case 'away':
          // Back in the circuit (once the other one's out of it), in from well out of sight.
          k.timer -= dt;
          if (k.timer <= 0 && !inCircuit(mate) && mate.phase !== 'hold' && !this._near(3200, RWY.z + 600, 1700) && !this.gstop.on) {
            k.phase = 'circuit';
            k.join = true;
            k.circuits = 1;
            k.path = this._skyJoin();
            k.s = 0;
            k.slot = false;
            k.orbits = 0;
            k.v = 42;
            k.y = 180;
            k.pitch = 0;
            k.roll = 0;
            k.path.at(0, _c);
            k.x = _c.x;
            k.z = _c.z;
            k.yaw = _c.h;
          }
          break;
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
          if (k.join && k.s < sTurn) y = 180; // (back from a trip: in along the downwind leg)
          else if (k.s < 900) y = Math.max(smoothstep(0, 900, k.s) * 150, k.goY || 0);
          else if (k.s < sTurn) y = lerp(150, 180, smoothstep(900, 1600, k.s));
          else if (k.s < P.sFinal) y = lerp(180, 85, (k.s - sTurn) / (P.sFinal - sTurn));
          else y = 85 * clamp((P.len - k.s) / (P.len - P.sFinal), 0, 1);
          k.pitch = k.s < 700 && !k.join ? 0.12 : k.s > P.sFinal ? 0.05 : 0;
          k.y = y;
          if (!k.slot && k.s >= P.sDecide && k.s < P.sDecide + 40) {
            // Ask for the runway. The tower books us a gap: no airliner landing in the 40 s
            // before us (it needs half a minute to roll out and turn off) or soon after (we
            // need to be off it, or climbing away from a touch-and-go). Those still far out are
            // held back to make it; if one too close in to hold is in the way, the gap is a
            // turn or two later and we orbit till then (the departures keep clear of it too,
            // see _nextArrival). Anything still on the runway when we're on short final sends
            // us round again.
            k.eta = (P.len - k.s) / 38;
            const before = 40;
            const after = k.circuits <= 1 ? 46 : 34;
            let turns = 0;
            if (k.slotT) turns = k.turnsLeft; // (booked already: on round until it's time)
            else if (this._jayRwy || this.gstop.on || this._rwyBlocked()) turns = 1; // (nothing to book: round and ask again)
            else {
              const lap = (2 * PI * 220) / 42;
              let T = this.t + k.eta;
              const fixed = [];
              for (const q of this.fleet) if (q.phase === 'approach' && !q.disabled && (q.cleared || q.eta() < 95)) fixed.push(this.t + q.eta());
              // (The first time, with a queue of airliners waiting to go out, they go first.)
              if (!k.orbits && this._depQueue() >= 3) {
                turns = 1;
                T += lap;
              }
              for (let n = 0; n < 6 && fixed.some((f) => f > T - before - 3 && f < T + after + 3); n++) {
                turns++;
                T += lap;
              }
              k.slotT = T;
              this._delayArrivals(T - before, T + after);
            }
            if (turns > 0) {
              // A full turn away from the field, then on round the circuit.
              k.turnsLeft = turns - 1;
              k.orbits = (k.orbits || 0) + 1;
              k.main = P;
              k.mainS = k.s;
              k.phase = 'orbit';
              k.path = new Path(k.x, k.z, k.yaw).turn(2 * PI, 220).end(99);
              k.s = 0;
            } else {
              k.slot = true;
              k.orbits = 0;
            }
          }
          if (k.slot) k.eta = Math.max(0, (P.len - k.s) / 36);
          if (k.slot && k.s > P.sFinal && !this.rwy.has(k) && k.eta < 30) {
            if (this._jayRwy || this.gstop.on || this._rwyBlocked() || [...this.rwy].some((u) => !this._rollingAway(u))) {
              // Something on the runway: go round again (climbing away from where it is).
              k.slot = false;
              k.slotT = 0;
              k.join = false;
              k.goY = k.y;
              k.path = this._skyCircuit(k.x, k.circuits <= 1);
              k.s = 0;
            } else this.rwy.add(k);
          }
          if (k.s >= P.len) {
            k.slot = false;
            k.slotT = 0;
            k.join = false;
            k.goY = 0;
            k.y = 0;
            k.circuits--;
            if (k.circuits <= 0) {
              k.phase = 'landroll';
              k.path = this._skyPath('in', k.x, k.spot);
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
          if (k.v > vt) k.v = Math.max(vt, k.v - 2.4 * dt);
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
              h.timer = rand(150, 300);
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
      for (const pl of this.fleet) {
        const d = Math.hypot(pl.x - cp.x, pl.z - cp.z, pl.y - cp.y);
        if (d < view && !pl.model) pl.attach();
        else if (d > view + 80 && pl.model) pl.detach();
      }
      for (const k of this.skies.concat([this.heli])) {
        if (!k) continue;
        const type = k === this.heli ? 'sparrow' : 'skylark';
        if (!VH.AircraftModels.spec(type)) continue;
        const d = Math.hypot(k.x - cp.x, k.z - cp.z, k.y - cp.y);
        const want = d < Math.min(view, 1500) && k.phase !== 'away';
        if (want && !k.model) {
          k.model = this._takeModel(type, k === this.heli ? 0x1d4fb8 : k.color);
          this.game.scene.add(k.model.root);
        } else if (!want && k.model) {
          k.model.root.removeFromParent();
          this._putModel(k.model);
          k.model = null;
        }
      }
      // Ground equipment only near Jay.
      for (const st of this.allStands) {
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
        const ranked = this.fleet
          .filter((p) => !p.gone && p.eng > 0.02)
          .map((p) => [fb._gain(p.x, p.z, 70, p.y) * p.eng, p])
          .filter((e) => e[0] > 0.012)
          .sort((a, b) => b[0] - a[0]);
        const want = new Set(ranked.slice(0, 3).map((e) => e[1]));
        for (const p of this.fleet) {
          if (want.has(p) && !p.voice) p.voice = audio.createJet();
          else if (!want.has(p) && p.voice) {
            p.voice.stop();
            p.voice = null;
          }
        }
      }
      for (const p of this.fleet) {
        if (!p.voice) continue;
        p.voice.update({ gain: fb._gain(p.x, p.z, 70, p.y) * 0.85 * p.eng, pan: fb._pan(p.x, p.z), thrust: p.thrust, burner: 0 });
      }
      // The Skylark's engine and the helicopter.
      for (const k of this.skies) {
        if (!audio.createEngine) break;
        const gain = k.prop > 0.05 && k.phase !== 'away' ? fb._gain(k.x, k.z, 25, k.y) * Math.min(1, k.prop * 1.6) : 0;
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
      for (const p of this.fleet) {
        if (p.voice) p.voice.stop();
        p.voice = null;
      }
      for (const k of this.skies.concat([this.heli])) {
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
      const stop = this.gstop.on ? this.gstop.reason || 'Ground stop' : null;
      for (const r of this.rots) {
        const a = r.arr;
        const d = r.dep;
        const st = r.state;
        if (r.cancelled) continue;
        a.note = d.note = null;
        // Disabled on the ground (shot up, on fire: havoc-air.js), it isn't going anywhere.
        if (r.plane && r.plane.disabled && r.plane.onGround && !r.plane.gone) {
          if (st === 'planned' || st === 'inbound' || st === 'landed' || st === 'taxiing') a.status = 'Landed';
          d.status = 'Cancelled';
          d.est = a.est = null;
          continue;
        }
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
          if (r.cargo) d.status = f.closed ? 'Loaded' : late ? 'Delayed' : 'Loading';
          else d.status = f.closed ? 'Gate closed' : f.final ? 'Final call' : f.boarding ? 'Boarding' : f.deplaned ? (late ? 'Delayed' : 'Go to gate') : late ? 'Delayed' : 'Scheduled';
          d.est = late ? this._hours(r.off) : null;
        } else if (st === 'outbound') {
          d.status = 'Gate closed';
        } else if (st === 'gone') {
          d.status = 'Departed';
        }
        // A ground stop: everything not yet away (or down) waits, and the boards say why.
        if (stop) {
          if (st === 'planned' || st === 'inbound') {
            a.status = 'Delayed';
            a.note = stop;
          }
          if (st !== 'gone' && !(st === 'outbound' && r.plane && r.plane.phase === 'takeoff')) {
            d.status = 'Delayed';
            d.note = stop;
          }
        }
      }
    }

    _trim() {
      // Done with: departed (or cancelled) more than five minutes ago.
      const old = (r) => (r.tookOff && this.t - r.tookOff > 300) || (r.cancelled && this.t - r.endT > 300) || (r.towedT && this.t - r.towedT > 600);
      if (this.rots.length > 60 || this.rots.some(old)) this.rots = this.rots.filter((r) => !old(r));
    }

    /** The boards: every flight from about ten minutes ago to half an hour ahead, soonest first. */
    flights() {
      if (!this.ok) return [];
      if (!this.inited) this._init();
      const out = [];
      for (const r of this.rots) {
        if (r.cargo) continue; // (the freighters aren't on the passenger boards)
        const arrGone = r.onBlock < this.t - 600 && r.state !== 'planned' && r.state !== 'inbound' && r.state !== 'landed' && r.state !== 'taxiing';
        if (!arrGone) out.push([r.planLand, r.arr]);
        if (!r.towOff) out.push([r.planOff, r.dep]); // (one towed away leaves from a remote stand, empty)
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
        if (r) flight = st.state === 'arriving' || st.state === 'deplaning' || (st.state === 'parked' && !r.flags.deplaned) || r.towOff ? r.arr : r.dep;
        return { id: st.id, gate: st.gate, x: st.x, z: st.z, yaw: st.yaw, door: st.door, state: st.state, flight, arrival: r ? r.arr : null, departure: r && !r.towOff ? r.dep : null, tow: !!(r && r.towOff) };
      });
    }

    /** The remote stands (freighters): as stands(), with no gate. */
    remoteStands() {
      if (!this.ok) return [];
      return this.remoteList.map((st) => ({ id: st.id, gate: null, x: st.x, z: st.z, yaw: st.yaw, door: st.door, state: st.state, flight: st.cur ? st.cur.dep : null, remote: true }));
    }

    // ------------------------------------------------- the API for havoc
    /** Every live airliner, as a live view (see the notes at the top). */
    planes() {
      if (!this.ok) return [];
      const out = [];
      for (const pl of this.fleet) if (!pl.gone) out.push(pl.api);
      return out;
    }

    _planeOf(p) {
      if (!p) return null;
      const pl = p.plane || p;
      return this.fleet.includes(pl) ? pl : null;
    }

    /**
     * Hold every departure (no pushbacks, nobody lines up or rolls) and send the arrivals
     * round and away (they come back, re-sequenced, after it lifts); the boards say "Delayed"
     * with flight.note = reason. groundStop(false) lifts it.
     */
    groundStop(on, reason) {
      if (!this.ok) return;
      const g = this.gstop;
      if (on) {
        if (!g.on) g.t = this.t;
        g.on = true;
        g.reason = reason || g.reason || 'Ground stop';
        for (const pl of this.fleet) if (pl.phase === 'approach' && !pl.disabled && (!pl.cleared || pl.y > 30)) this._goAround(pl);
        // A departure lined up (not rolling) and one on its way from the holding point wait there.
      } else if (g.on) {
        g.on = false;
        // The ones held back come in a minute and a half apart from now.
        let t = this.t + 60;
        for (const r of this.rots.filter((q) => q.state === 'planned').sort((a, b) => a.landAt - b.landAt)) {
          r.landAt = Math.max(r.landAt, t);
          t = r.landAt + rand(ARR_GAP[0], ARR_GAP[1]);
        }
        this.lastLand = Math.max(this.lastLand, t);
      }
      this._updateStatuses();
    }

    /** Is there a ground stop on (and why)? */
    get stopped() {
      return this.gstop.on ? this.gstop.reason : null;
    }

    /** A plane on its takeoff roll (below about 60 m/s) brakes to a stop (it tries again once clear). */
    abortTakeoff(p) {
      const pl = this._planeOf(p);
      if (!pl || pl.phase !== 'takeoff' || pl.v > 60) return false;
      pl.reject = true;
      pl.aborted = true;
      return true;
    }

    /**
     * After an aborted takeoff well down the runway: round on the spot (onto the south half of
     * the runway), back along it to the far end, round again and line up. It keeps the runway
     * the whole time (arrivals go round).
     */
    _backtrack(pl) {
      const p = new Path(pl.nx, pl.nz, HALF);
      p.turn(PI, 14, 3, 0.6);
      p.line(-960, RWY.z - 28, 9, 1.0);
      p.turn(PI, 14, 3, 0.6);
      p.line(-905, RWY.z, 4, 1.0);
      p.sLine = p.len;
      p.line(RWY.x1 + 700, RWY.z, 99, 2);
      p.end(99);
      pl.phase = 'taxiout';
      pl.t = 0;
      pl.path = p;
      pl.s = 0;
      pl.v = 0;
      pl.pitch = 0;
      pl.cleared = true;
      pl.stopS = p.sLine;
      this.rwy.add(pl);
      if (this.onLog) this.onLog('backtrack', pl);
    }

    /**
     * Clear a plane away for good (a burnt-out wreck, or one Jay has taken over): gone from
     * the apron and the runway, its stand freed, its flight Cancelled on the boards. Returns
     * where it was and how it looked ({ x, y, z, yaw, color, airline, flight, stand }), or null.
     */
    removePlane(p) {
      const pl = this._planeOf(p);
      if (!pl) return null;
      const r = pl.rot;
      const out = { x: pl.x, y: pl.y, z: pl.z, yaw: pl.yaw, color: pl.color, airline: r.airline.name, flight: pl.flight, stand: r.st.id };
      pl.gone = true;
      pl.detach();
      if (pl.voice) pl.voice.stop();
      pl.voice = null;
      this.rwy.delete(pl);
      if (this._merge === pl) this._merge = null;
      this._unhitch(pl);
      this._cancelRot(r, 'Cancelled');
      for (const q of this.fleet) if (q.blocker === pl) q.blocker = null;
      const fm = this.extras && this.extras.fm;
      if (fm && (fm.plane === pl || fm.waitPl === pl)) {
        fm.plane = null;
        fm.waitPl = null;
      }
      this.fleet = this.fleet.filter((q) => q !== pl);
      return out;
    }

    /**
     * The ground vehicles out on the apron now (each stand's own while Jay is near, the
     * follow-me, the vans, the stair truck), live: { id, kind ('tug' 'train' 'belt' 'cater'
     * 'fuel' 'stairs' 'followme' 'van'), x, z, yaw, v (speed), rev, k: { len, h }, root,
     * carts, taken, st (its stand) }. Read it each time.
     */
    groundVehicles() {
      return this.ok && this._allGse ? this._allGse : [];
    }

    /**
     * Take a ground vehicle out of the work, or give it back (havoc-air.js: Jay has it now,
     * with a real car in its place, or it's a burnt-out wreck). Taken, it is hidden and stops
     * where it is (a baggage tug's carts stay put) and counts as home, so no pushback waits for
     * it. Given back, it carries on from where it was.
     */
    takeGse(v, on) {
      if (!this.ok || !v || !!v.taken === !!on) return;
      if (on) {
        v._was = { post: v.post, state: v.state, legs: v.legs.slice(), path: v.path, s: v.s, rev: v.rev, onDone: v.onDone, onStuck: v.onStuck };
        v.taken = true;
        v.legs.length = 0;
        v.path = null;
        v.v = 0;
        v.onDone = v.onStuck = null;
        v.hose = false;
        if (v.parts.hose) v.parts.hose.visible = false;
        if (v.st) v.post = 'home';
        v.root.visible = false;
      } else {
        const w = v._was || {};
        v.taken = false;
        v._was = null;
        Object.assign(v, { post: w.post || v.post, legs: w.legs || [], path: w.path || null, s: w.s || 0, rev: !!w.rev, onDone: w.onDone || null, onStuck: w.onStuck || null });
        if (w.state !== undefined) v.state = w.state;
        v.root.visible = true;
      }
    }

    /** Keep arrivals off a stand (1..4 or 'R1'..'R3': a wreck on it, havoc-air.js), or let them back. */
    blockStand(id, on) {
      const st = this.ok && this.allStands.find((s) => s.id === id);
      if (!st) return;
      if (on) {
        if (!st.blocked) st.wreckBlock = true;
        st.blocked = true;
      } else if (st.wreckBlock) {
        st.blocked = false;
        st.wreckBlock = false;
      }
    }

    // ------------------------------------------------ cabin hooks (cabin.js)
    /**
     * The airliner parked on contact stand `id` (1..4), for its cabin: { plane (the planes()
     * view), model, x, z, yaw, color, airline, rot (the rotation's id), bridge, deplaned,
     * boarding, closed, push (its turnaround so far), disabled, arr, dep, pax, held (seconds
     * the doors have waited for Jay, or 0) }, or null while there's none there standing still.
     */
    cabinPlane(id) {
      if (!this.ok || !this.inited) return null;
      const st = this.standList.find((s) => s.id === id);
      const r = st && st.cur;
      const pl = r && r.plane;
      if (!pl || pl.gone || pl.phase !== 'parked' || r.state !== 'atStand' || r.cargo) return null;
      const f = r.flags;
      return {
        plane: pl.api, model: pl.model, x: pl.x, z: pl.z, yaw: pl.yaw, color: pl.color, airline: r.airline.name, rot: r.id,
        bridge: !!f.bridge, deplaned: !!f.deplaned, boarding: !!f.boarding, closed: !!f.closed, push: !!f.push, disabled: pl.disabled,
        arr: r.arr, dep: r.dep, pax: pl.pax, held: st.cabinHold && st.cabinHoldT ? this.t - st.cabinHoldT : 0,
      };
    }

    /** Jay is aboard the plane on stand `id`: its doors (and so its pushback) wait for him. */
    cabinHold(id, on) {
      const st = this.ok && this.standList.find((s) => s.id === id);
      if (!st) return;
      st.cabinHold = !!on;
      if (!on) st.cabinHoldT = 0;
    }

    /** Held for Jay? Asked only when the doors are due to shut (or the push to start): 42 s at most from then. */
    _cabinHeld(st) {
      if (!st.cabinHold) return false;
      if (!st.cabinHoldT) st.cabinHoldT = this.t;
      return this.t - st.cabinHoldT < 42;
    }

    /**
     * Jay has taken the plane on stand `id`: off the stand for good (as removePlane: the flight
     * Cancelled, the stand free) and the stand kept clear of arrivals (cabinBlock) until he's
     * taken it away. Returns removePlane's pose and livery, or null.
     */
    cabinTake(id) {
      const st = this.ok && this.standList.find((s) => s.id === id);
      const pl = st && st.cur && st.cur.plane;
      if (!pl) return null;
      st.cabinHold = false;
      st.cabinHoldT = 0;
      const out = this.removePlane(pl);
      if (out) this.cabinBlock(id, true);
      this._updateStatuses();
      return out;
    }

    /** Keep arrivals off stand `id` (they go to another, or wait), or let them back. */
    cabinBlock(id, on) {
      const st = this.ok && this.standList.find((s) => s.id === id);
      if (st) st.blocked = !!on;
    }

    /** Jay up in a jet bridge or aboard a parked plane: not in anyone's way on the apron. */
    _cabinUp(p) {
      if (p.pos.y < 1.6) return false;
      const T = this.game.terminal;
      return !!((this.game.cabin && this.game.cabin.aboard) || (T && T.isInside && T.isInside(p.pos.x, p.pos.z, p.pos.y)));
    }

    blips(out, missionRunning) {
      if (!this.ok || missionRunning || !this.jay) return;
      for (const pl of this.fleet) {
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
    // The remote stands: a lead-in straight off the taxiway, the stop bar, the pushback line,
    // the safety lines either side and a red line across the nose that the vehicles wait behind.
    for (const x of REMOTE_X) {
      const z = REMOTE_Z;
      lines.push({ pts: pts(new Path(x + 25, TWY_Z, -HALF).turn(HALF, 25).line(x, z + NOSE)), w: 0.3, color: Y });
      rects.push([x - 3, z + NOSE + 0.6, x + 3, z + NOSE + 1.1, Y], [x - 0.25, z + NOSE + 1.1, x + 0.25, z + NOSE + 6, Y]);
      lines.push({ pts: pts(new Path(x, z - 2, PI).line(x, z - 16).turn(-HALF, 30)), w: 0.2, color: Wt, dash: [2, 2] });
      for (const k of [-1, 1]) rects.push([x + k * 21, z - 14, x + k * 21 + 0.4 * k, z + 21, Wt]);
      rects.push([x - 28, z + 22.4, x + 28, z + 22.8, R]);
      // The equipment pads by the fence (red outlines).
      for (const [x0, z0, x1, z1] of [[x - 31, z + 23, x - 20, z + 30], [x + 15, z + 28, x + 21, z + 38], [x - 7, z + 35, x - 2, z + 45], [x + 21, z + 35, x + 27, z + 45]]) {
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
    // The Skylarks' spots (a T each) and the H2 pad.
    for (const g of [G1, G2]) rects.push([g.x - 3, g.z - 4.6, g.x + 3, g.z - 4.2, Y], [g.x - 0.2, g.z - 4.2, g.x + 0.2, g.z + 3, Y]);
    const h = H2;
    rects.push([h.x - 7, h.z - 7, h.x + 7, h.z - 6.6, Wt], [h.x - 7, h.z + 6.6, h.x + 7, h.z + 7, Wt], [h.x - 7, h.z - 6.6, h.x - 6.6, h.z + 6.6, Wt], [h.x + 6.6, h.z - 6.6, h.x + 7, h.z + 6.6, Wt]);
    rects.push([h.x - 2.6, h.z - 3.4, h.x - 1.7, h.z + 3.4, Wt], [h.x + 1.7, h.z - 3.4, h.x + 2.6, h.z + 3.4, Wt], [h.x - 1.7, h.z - 0.45, h.x + 1.7, h.z + 0.45, Wt]);
    // Masts between the stands by the terminal, one by the remote stand, one by the depot, two
    // by the fence behind the remote stands.
    const masts = [[-347, -1252], [-257, -1252], [-167, -1252], [-506, -1262], [76, -1302], [180, -1330], [-615, -1269], [-675, -1269]];
    // The old static equipment (solid boxes), parked between the hangars out of the way.
    const spares = [[178, -1250, 2.4, 7, 0xd7dbe0], [183.5, -1250, 1.6, 3, 0xe0b12e], [185.7, -1250, 1.6, 3, 0xe0b12e], [187.9, -1250, 1.6, 3, 0xe0b12e]];
    return { lines, rects, masts, spares, pads: [CARGO_PAD] };
  };

  VH.Airside = Airside;
  VH.Airside.Path = Path; // for tests (and havoc-air.js's fire engines)
  VH.Airside.route = route;
  VH.Airside.gseGeometry = gseGeometry; // (vehicles/airsidecars.js builds the ones Jay can drive from these)
  VH.Airside.KINDS = KINDS;
  VH.Airside.CARGO_PAD = CARGO_PAD; // the remote stands' paving (airfield.js lays it and puts it on the map)
  // The airlines that fly from here, for the check-in desks (terminal.js wants CSS colours:
  // a gradient from the livery colour to a darker shade of it).
  const css = (c) => '#' + c.toString(16).padStart(6, '0');
  const shade = (c, k) => (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k);
  VH.Airside.AIRLINES = AIRLINES.map((a) => ({ name: a.name, code: a.code, bg: [css(a.color), css(shade(a.color, 0.7))], fg: '#ffffff' }));
})();
