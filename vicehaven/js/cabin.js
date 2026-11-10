/*
 * cabin.js — inside the airliners at Vicehaven International: walk off the
 * jet bridge into the cabin, down the aisle past the seated passengers, and
 * up to the flight deck, where Jay can take the controls.
 *
 *   new VH.Cabin(game)       game.cabin, a world system
 *
 * Every Albatross parked on a contact stand (A1-A4) has a cabin. Its front
 * port door stands open whenever the plane is on the stand with the bridge
 * on and not pushing back (deplaning, servicing, boarding; once the doors
 * have shut the crew open up again for Jay when he comes down the bridge).
 * The fuselage skin round the door is cut away on that model (a copy of its
 * geometry, cached per livery), so the opening is real: the bridge's rubber
 * collar round it, the threshold, the cabin beyond.
 *
 * The cabin is drawn inside the model's one-sided shell (which is invisible
 * from inside, so the window and windscreen openings look straight out): a
 * front galley and a lavatory by the door, 28 rows of 3+3 seats in the
 * airline's colour, overhead bins with cove lights, window reveals (some
 * shades down), two lavatories and the aft galley, and through the open
 * flight-deck door two pilots' seats, sidesticks, the pedestal, the glare
 * shield and six lit screens under the windscreen. Two merged meshes and one
 * instanced mesh of seated passengers per cabin, built only for the planes
 * Jay is near (two at most); geometry is cached per airline colour.
 *
 * Colliders (floor, walls, ceiling, seat blocks, galleys, the flight deck)
 * are made once per stand the first time a cabin is wanted there, and parked
 * out of the way (far below the ground) whenever that cabin is down, always
 * before the plane moves. The bridge's sill across its mouth is parked while
 * the door is open and two jambs either side of the door take its place.
 *
 * People: the seats fill as the flight boards (back rows first) and empty
 * front first as it deplanes, from airside's passenger count. Boarding
 * travellers from airportlife.js walk on through the door and down the
 * aisle to their row (boardPath), and arrivals stand up in the aisle and
 * walk off (exitPath). Two cabin crew: one greets at the door, one works the
 * galley, and they have a word with Jay.
 *
 * Jay aboard when the doors are due to shut: airside holds them (and the
 * pushback) while the crew and the PA ask him to get off; after about half a
 * minute the crew walk him back to the gate lounge (a fade) and the flight
 * goes. airside.js caps the hold at 42 s whatever happens here.
 *
 * At the captain's seat: "E  Take the controls". Everyone runs for it (up
 * the bridge and out through the terminal), the scripted airliner comes off
 * the stand (its flight Cancelled) and a flyable Albatross in the same
 * livery takes its place, turned round to face the taxilane, with Jay at the
 * controls and the engines running; three stars at least. The stand takes no
 * arrivals until he's taken it away.
 *
 *   cabin.aboard             true while Jay is inside a cabin
 *   cabin.boardPath(stand)   for airportlife.js: { pts, seat } on from the
 *                            bridge mouth to a row, or null (no cabin there)
 *   cabin.seated(stand, seat)   ...and that traveller has sat down
 *   cabin.exitPath(stand)    { start, pts } from a seat to the bridge mouth,
 *                            or null
 *   events                   cabin:aboard {stand, gate}, cabin:hijack {stand,
 *                            gate, flight, x, z, v}
 *   stats                    "Airliners boarded", "Airliners taken from the gate"
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, dampAngle } = VH.math;
  const PI = Math.PI;

  // ------------------------------------------------------------ the plan
  // In the Albatross's own frame (js/vehicles/models/albatross.js): nose +z, port (the
  // bridge side) +x, the ground at y 0. Parked on a stand the plane sits at the stand's
  // centre facing north (yaw 0), so this frame is the world's shifted by (stand.x, stand.z).
  const STATIONS = [ // its fuselage loft, as albatross.js
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
  const FL = 3.0; //       the cabin floor: the door sill, and the bridge floor at its mouth
  const WALL = 0.07; //    the skin to the inside of the lining
  const CEIL = 5.3; //     the ceiling between the bins
  // The front port door (z: along the body; s: round it from the crown, as the loft) and the
  // skin cut away round it: whole quads of the loft (its rings at z 14.5 / 15.5, its columns
  // every 10°), so nothing of the old skin is left in the opening.
  const DOOR = { z0: 14.58, z1: 15.42, s0: 0.991, s1: 1.849, zc: 15.0 };
  const CUT = { z0: 14.5, z1: 15.5, s0: (5 * PI) / 18, s1: (11 * PI) / 18 };
  const AFT = -11.4; //    the aft bulkhead (galley)
  const LAV_A = -10.85; // aft lavatories, between here ...
  const LAV_F = -9.72; //  ... and here
  const FWD = 13.12; //    the front galley and lavatory start here
  const LAV_D = 14.28; //  ... and the lavatory ends here, a little short of the door (room for the camera)
  const DECK = 15.62; //   the flight-deck bulkhead
  const PANEL = 17.35; //  the instrument panel's foot
  const NOSE = 18.36; //   the end of the flight deck
  const ROWS = 28;
  const ROW0 = 12.45; //   row 1 (the seat's reference point: where the back meets the cushion)
  const PITCH = 0.79;
  const SEAT_X = [0.565, 1.035, 1.505]; // aisle, middle, window seat centres (port; starboard mirrored)
  const SEATS = ROWS * 6;
  const BINS = { z0: -9.55, z1: 12.95 };
  const BIN_X = 0.86; //   the bins' inner edge, either side of the aisle
  const WIN_S = 1.3; //    the windows round the body (albatross.js), and their reveals' half size
  const WIN_HS = 0.095;
  const WIN_HZ = 0.14;
  const WIN_Z = [];
  for (let z = 13.7; z > -11.3; z -= 0.53) if (!((z < 1.45 && z > 0.05) || z > 14.1) && z - WIN_HZ > BINS.z0 && z + WIN_HZ < BINS.z1) WIN_Z.push(+z.toFixed(3));
  const CAPT = { x: 0.62, z: 16.55 }; // the captain's seat (port, as aircraft go)
  const DS = { x: 0.45, h: 2.0 }; // the flight-deck doorway's half width and height
  // The windscreen and side panes (albatross.js's glazing): [z0, z1, [top, bottom] at z0, at z1].
  const GLAZE = [[16.62, 17.06, [0.7, 1.06], [0.64, 1.04]], [17.18, 17.66, [0.58, 1.0], [0.52, 0.95]], [17.78, 18.36, [0.1, 0.84], [0.1, 0.62]]];

  const NEAR = 78; //      a cabin is built while Jay is this close to its door ...
  const FAR = 96; //       ... and dropped beyond this
  const LIVE_MAX = 2;
  const HOLD_WALK = 34; // Jay aboard this long after the doors were due to shut: walked off
  const OPEN_NEAR = 6; //  doors shut, Jay this close to the door on the bridge: they open up again

  const WHITE = 0xf3f4f2; // the livery (albatross.js), for the skin round the cut-out door
  const SHADE = (hex, k) => {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
    const b = Math.min(255, Math.round((hex & 255) * k));
    return (r << 16) | (g << 8) | b;
  };

  const LINES = {
    welcome: ['Welcome aboard!', 'Good to have you with us. Welcome aboard.', 'Hello! Welcome aboard.', 'Hi there, welcome aboard.'],
    pass: ['Sir, can I see your boarding pass?', 'Excuse me, sir, your boarding pass?', 'Sir? Sir! Boarding pass, please.'],
    deplane: ["Sorry, sir, we're still letting people off.", 'Hang on, sir, everyone needs to get off first.'],
    empty: ["Sir, we're not boarding yet. You'll need to wait at the gate.", "We're just getting the cabin ready. Back to the gate, please."],
    deck: ["Sir, you can't go in there!", "That's the flight deck, sir. Passengers aren't allowed in there.", 'Whoa, whoa. Not in there, please.'],
    hold1: ["We're about to close the doors, sir. I'll need you to return to the gate.", "Sir, we need to close up. Can you go back to the gate, please?"],
    hold2: ["Sir, you're delaying the flight. Off the plane, please.", "Everyone's waiting, sir. Please leave the aircraft now."],
    hold3: ["Right. I'm calling the captain.", "That's it. Security's on their way."],
    walked: ['Come on, sir. This way.', 'Let\'s get you back to the gate.'],
    flee: ['He\'s in the flight deck! Everybody off!', 'Get off the plane! Go, go, go!', 'Evacuate! Everybody out!'],
    shots: ['Everybody off! Leave your bags!', 'Get down! No, get off! Off the plane!', 'Evacuate! Evacuate!'],
  };

  // ---------------------------------------------------------- the shape
  let SURF = null;
  /** The fuselage's own loft (for its width, height and centre at any z, and its frames). */
  function surf() {
    if (!SURF) SURF = new VH.AircraftKit().loft(STATIONS, 0xffffff, { seg: 8, steps: 1 });
    return SURF;
  }
  /**
   * A point on the cabin's lining: z along the body, s round it from the crown (0) to the keel
   * (π), side +1 port / -1 starboard; lift moves it in towards the middle (negative: out
   * towards the skin, -WALL on it).
   */
  function wallPt(z, s, side, lift) {
    const S = surf();
    const d = WALL + (lift || 0);
    return [side * (S.width(z) - d) * Math.sin(s), S.centre(z) + (S.height(z) - d) * Math.cos(s), z];
  }
  /** s at height y on the lining (or, lift -WALL, the skin). */
  function sAt(z, y, lift) {
    const S = surf();
    const h = S.height(z) - WALL - (lift || 0);
    return Math.acos(clamp((y - S.centre(z)) / h, -1, 1));
  }
  /** Half the cabin's width at height y. */
  function halfW(z, y, lift) {
    return wallPt(z, sAt(z, y, lift), 1, lift)[0];
  }

  // ------------------------------------------------------- the geometry
  /** Flat-shaded triangles with vertex colours (the cabin's, and the lights'). */
  class Geo {
    constructor() {
      this.p = [];
      this.c = [];
    }

    tri(a, b, c, ca, cb, cc) {
      const p = this.p;
      const q = this.c;
      cb = cb || ca;
      cc = cc || ca;
      p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      q.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
    }

    quad(a, b, c, d, ca, cb, cc, cd) {
      this.tri(a, b, c, ca, cb, cc);
      this.tri(a, c, d, ca, cc || ca, cd || ca);
    }

    /** An axis-aligned box; skip: faces left out ('top', 'bottom', 'px', 'nx', 'pz', 'nz'). */
    box(x0, y0, z0, x1, y1, z1, col, skip, colTop) {
      const s = skip || '';
      const ct = colTop || col;
      const dim = VH.colMul(col, 0.82);
      if (s.indexOf('top') < 0) this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], ct);
      if (s.indexOf('bottom') < 0) this.quad([x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], dim);
      if (s.indexOf('px') < 0) this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], col);
      if (s.indexOf('nx') < 0) this.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], col);
      if (s.indexOf('pz') < 0) this.quad([x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], col);
      if (s.indexOf('nz') < 0) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], col);
    }

    /** A slab between two quads (eight corners: the near face a..d, the far face e..h). */
    slab(a, b, c, d, e, f, g, h, col, colBack) {
      const cb = colBack || col;
      this.quad(a, b, c, d, col);
      this.quad(e, h, g, f, cb);
      this.quad(a, e, f, b, col);
      this.quad(b, f, g, c, col);
      this.quad(c, g, h, d, col);
      this.quad(d, h, e, a, col);
    }

    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      return g;
    }
  }

  const col = (hex, k) => VH.col(hex, k);

  /** A small deterministic random (per flight, per seat). */
  function rng(seed) {
    let a = (seed * 2654435761) >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Where seat j is: row j/6 from the front, then aisle, middle, window port, the same starboard. */
  function seatPos(j) {
    const row = Math.floor(j / 6);
    const k = j % 6;
    const side = k < 3 ? 1 : -1;
    return { x: side * SEAT_X[k % 3], z: ROW0 - row * PITCH, row, side };
  }

  /**
   * The lining: walls with the window reveals cut through (the shell outside is one-sided,
   * so they look out), the ceiling, the floor and both bulkheads, for z from AFT to DECK.
   */
  function buildLining(G, L, c) {
    const cream = col(0xd8d4cb);
    const panel = col(0xcac5bb);
    const dado = col(0x6f747d);
    const reveal = col(0xbdb9b0);
    const shade = col(0xd6cfbd);
    const ceil = col(0xe0ddd5);
    // The rings: every window's edges, the door's, and the ends of the galleys and lavatories.
    const base = [AFT, -11.0, LAV_A, -10.3, LAV_F, -9.3, BINS.z0, BINS.z1, FWD, 13.5, 14.0, CUT.z0, DOOR.z0, DOOR.zc, DOOR.z1, CUT.z1, DECK];
    for (let z = -8; z < 12.5; z += 2) base.push(z);
    for (const z of WIN_Z) base.push(z - WIN_HZ, z + WIN_HZ);
    const zs = [...new Set(base.map((z) => +z.toFixed(4)))].sort((a, b) => a - b);
    const isWin = (za, zb) => WIN_Z.find((z) => Math.abs(za - (z - WIN_HZ)) < 1e-3 && Math.abs(zb - (z + WIN_HZ)) < 1e-3);
    const s1 = WIN_S - WIN_HS;
    const s2 = WIN_S + WIN_HS;
    const s3 = 1.62;
    let wi = 0;
    for (let i = 0; i < zs.length - 1; i++) {
      const za = zs[i];
      const zb = zs[i + 1];
      const tA = sAt(za, CEIL);
      const tB = sAt(zb, CEIL);
      const fA = sAt(za, FL);
      const fB = sAt(zb, FL);
      const strip = (side, sa0, sa1, sb0, sb1, cc) => {
        G.quad(wallPt(za, sa0, side), wallPt(zb, sb0, side), wallPt(zb, sb1, side), wallPt(za, sa1, side), cc);
      };
      const win = isWin(za, zb);
      for (const side of [1, -1]) {
        const door = side > 0 && za >= DOOR.z0 - 1e-3 && zb <= DOOR.z1 + 1e-3;
        if (door) {
          // Over the door only: below it is the opening.
          strip(side, tA, DOOR.s0, tB, DOOR.s0, cream);
          continue;
        }
        const mA = (tA + s1) / 2;
        const mB = (tB + s1) / 2;
        strip(side, tA, mA, tB, mB, cream);
        strip(side, mA, s1, mB, s1, cream);
        if (!win) strip(side, s1, s2, s1, s2, panel);
        strip(side, s2, s3, s2, s3, panel);
        strip(side, s3, fA, s3, fB, dado);
        if (win) {
          // The reveal, out to the skin.
          const o = -WALL + 0.004;
          for (const [sa, sb] of [[s1, s1], [s2, s2]]) G.quad(wallPt(za, sa, side), wallPt(zb, sb, side), wallPt(zb, sb, side, o), wallPt(za, sa, side, o), reveal);
          for (const z of [za, zb]) G.quad(wallPt(z, s1, side), wallPt(z, s2, side), wallPt(z, s2, side, o), wallPt(z, s1, side, o), reveal);
          // Some shades down, some half down.
          const h = Math.abs(Math.sin(wi * 12.9898 + side * 78.233) * 43758.5453) % 1;
          wi++;
          if (h < 0.3) {
            const sm = h < 0.18 ? s2 : WIN_S;
            const l = -0.02;
            G.quad(wallPt(za, s1, side, l), wallPt(zb, s1, side, l), wallPt(zb, sm, side, l), wallPt(za, sm, side, l), shade);
          }
        }
      }
      // The ceiling, a shallow arch.
      const xa = halfW(za, CEIL);
      const xb = halfW(zb, CEIL);
      G.quad([-xa, CEIL, za], [-0.5, CEIL + 0.05, za], [-0.5, CEIL + 0.05, zb], [-xb, CEIL, zb], ceil);
      G.quad([-0.5, CEIL + 0.05, za], [0.5, CEIL + 0.05, za], [0.5, CEIL + 0.05, zb], [-0.5, CEIL + 0.05, zb], ceil);
      G.quad([0.5, CEIL + 0.05, za], [xa, CEIL, za], [xb, CEIL, zb], [0.5, CEIL + 0.05, zb], ceil);
      // The centre light strip down the cabin.
      if (za >= BINS.z0 - 1e-3 && zb <= BINS.z1 + 1e-3) L.quad([-0.05, CEIL + 0.045, za], [0.05, CEIL + 0.045, za], [0.05, CEIL + 0.045, zb], [-0.05, CEIL + 0.045, zb], col(0xfff4e0, 1.0));
    }
    // The floor: carpet with a runner up the aisle, vinyl by the doors and in the galleys.
    const carpet = col(0x3d4555);
    const runner = VH.colMix(col(c), col(0x1d2129), 0.62);
    const vinyl = col(0x9a9ea6);
    const fz = [AFT, LAV_A, LAV_F, -9.0, -6, -3, 0, 3, 6, 9, 12, FWD, 13.6, 14.1, CUT.z0, DOOR.zc, CUT.z1, DECK, 16.0, 16.5, 17.0, PANEL, 17.7];
    for (let i = 0; i < fz.length - 1; i++) {
      const za = fz[i];
      const zb = fz[i + 1];
      const xa = halfW(za, FL);
      const xb = halfW(zb, FL);
      const y = FL + 0.002;
      const galley = za >= FWD - 1e-3 && zb <= DECK + 1e-3;
      const aft = zb <= LAV_F + 1e-3;
      const deck = za >= DECK - 1e-3;
      const side = deck ? col(0x2e3238) : galley || aft ? vinyl : carpet;
      const mid = deck ? side : galley || aft ? vinyl : runner;
      G.quad([-xa, y, za], [-0.34, y, za], [-0.34, y, zb], [-xb, y, zb], side);
      G.quad([-0.34, y, za], [0.34, y, za], [0.34, y, zb], [-0.34, y, zb], mid);
      G.quad([0.34, y, za], [xa, y, za], [xb, y, zb], [0.34, y, zb], side);
    }
    // The aft bulkhead, behind the galley.
    const fan = (z, cc) => {
      const pts = [];
      const sTop = sAt(z, CEIL);
      const sF = sAt(z, FL);
      for (let k = 0; k <= 6; k++) pts.push(wallPt(z, sTop + ((sF - sTop) * k) / 6, 1));
      const ring = pts.concat(pts.slice().reverse().map((p) => [-p[0], p[1], p[2]]));
      const ctr = [0, (FL + CEIL) / 2, z];
      for (let k = 0; k < ring.length; k++) G.tri(ctr, ring[k], ring[(k + 1) % ring.length], cc);
    };
    fan(AFT, col(0xc4c7cc));
    // The flight-deck bulkhead, its doorway open.
    const bulk = col(0xe2ded6);
    const frame = col(0x7a7f87);
    const ys = [FL, FL + 0.6, FL + 1.2, FL + DS.h, FL + 2.15, CEIL];
    for (const side of [1, -1]) {
      for (let k = 0; k < ys.length - 1; k++) {
        const y0 = ys[k];
        const y1 = ys[k + 1];
        G.quad([side * DS.x, y0, DECK], [side * halfW(DECK, y0), y0, DECK], [side * halfW(DECK, y1), y1, DECK], [side * DS.x, y1, DECK], bulk);
      }
      G.quad([side * DS.x, FL, DECK - 0.005], [side * (DS.x + 0.05), FL, DECK - 0.005], [side * (DS.x + 0.05), FL + DS.h, DECK - 0.005], [side * DS.x, FL + DS.h, DECK - 0.005], frame);
    }
    G.quad([-DS.x, FL + DS.h, DECK], [DS.x, FL + DS.h, DECK], [DS.x, CEIL + 0.05, DECK], [-DS.x, CEIL + 0.05, DECK], bulk);
    G.quad([-DS.x - 0.05, FL + DS.h, DECK - 0.005], [DS.x + 0.05, FL + DS.h, DECK - 0.005], [DS.x + 0.05, FL + DS.h + 0.05, DECK - 0.005], [-DS.x - 0.05, FL + DS.h + 0.05, DECK - 0.005], frame);
    // The doorway's reveal (the bulkhead is 10 cm thick).
    for (const side of [1, -1]) G.quad([side * DS.x, FL, DECK], [side * DS.x, FL, DECK + 0.1], [side * DS.x, FL + DS.h, DECK + 0.1], [side * DS.x, FL + DS.h, DECK], frame);
    G.quad([-DS.x, FL + DS.h, DECK], [DS.x, FL + DS.h, DECK], [DS.x, FL + DS.h, DECK + 0.1], [-DS.x, FL + DS.h, DECK + 0.1], frame);
    // Exit signs over the front door and at the back.
    L.box(1.2, FL + 1.95, DOOR.zc - 0.16, 1.24, FL + 2.07, DOOR.zc + 0.16, col(0x2bd96b, 1.1));
    L.box(-0.16, CEIL - 0.16, LAV_F + 0.3, 0.16, CEIL - 0.04, LAV_F + 0.34, col(0x2bd96b, 1.1));
  }

  /** The overhead bins down both sides, with the cove lights over them. */
  function buildBins(G, L) {
    const door = col(0xe2dfd8);
    const psu = col(0xb4afa6);
    const seam = col(0x8a867d);
    const cap = col(0xd2cec6);
    const y0 = 4.64;
    for (const side of [1, -1]) {
      const prof = (z) => [
        [side * halfW(z, y0), y0], // W: the wall
        [side * BIN_X, 4.7], //       A: the bottom's inner edge
        [side * (BIN_X - 0.045), 4.97], // M: the door, bulging out a little
        [side * (BIN_X - 0.01), 5.22], //  D: its top
        [side * (BIN_X - 0.08), CEIL], //  the cove up to the ceiling
      ];
      const zs = [BINS.z0];
      for (let z = BINS.z0 + 1.58; z < BINS.z1 - 0.3; z += 1.58) zs.push(z);
      zs.push(BINS.z1);
      for (let i = 0; i < zs.length - 1; i++) {
        const za = zs[i];
        const zb = zs[i + 1];
        const a = prof(za);
        const b = prof(zb);
        const q = (k, cc, LL) => (LL || G).quad([a[k][0], a[k][1], za], [b[k][0], b[k][1], zb], [b[k + 1][0], b[k + 1][1], zb], [a[k + 1][0], a[k + 1][1], za], cc);
        q(0, psu);
        q(1, door);
        q(2, door);
        q(3, col(0xffe2b8, 0.7), L);
        // The seam between two bin doors.
        const x = side * (BIN_X - 0.049);
        G.quad([x, 4.71, zb - 0.008], [x, 4.71, zb + 0.008], [side * (BIN_X - 0.014), 5.21, zb + 0.008], [side * (BIN_X - 0.014), 5.21, zb - 0.008], seam);
      }
      // The ends.
      for (const z of [BINS.z0, BINS.z1]) {
        const p = prof(z);
        const top = [side * halfW(z, CEIL), CEIL];
        const pts = p.concat([top]);
        for (let k = 1; k < pts.length - 1; k++) G.tri([pts[0][0], pts[0][1], z], [pts[k][0], pts[k][1], z], [pts[k + 1][0], pts[k + 1][1], z], cap);
      }
    }
    // A reading light over every seat, in the panel under the bins.
    const warm = col(0xfff3d6, 1.1);
    for (let r = 0; r < ROWS; r++) {
      const z = ROW0 - r * PITCH + 0.32;
      for (const side of [1, -1]) {
        for (const sx of [0.98, 1.22, 1.46]) {
          const x = side * sx;
          const y = lerp(4.7, y0, (sx - BIN_X) / (halfW(z, y0) - BIN_X)) - 0.006;
          L.quad([x - 0.035, y, z - 0.035], [x + 0.035, y, z - 0.035], [x + 0.035, y, z + 0.035], [x - 0.035, y, z + 0.035], warm);
        }
      }
    }
  }

  /** 28 rows of three and three, in the airline's colour, white covers on the headrests. */
  function buildSeats(G, c) {
    const fabric = VH.colMix(col(c), col(0x161a26), 0.58);
    const fabricDark = VH.colMul(fabric, 0.78);
    const cover = col(0xd9d9d4);
    const shell = col(0x3b3e44);
    const tray = col(0x50545b);
    const arm = col(0x2c2f34);
    const leg = col(0x55595f);
    for (let r = 0; r < ROWS; r++) {
      const z = ROW0 - r * PITCH;
      for (const side of [1, -1]) {
        for (const sx of SEAT_X) {
          const x = side * sx;
          const w = 0.205;
          // The cushion.
          G.box(x - w, FL + 0.36, z - 0.02, x + w, FL + 0.49, z + 0.42, fabricDark, 'bottom', fabric);
          // The back, leaning back a little: front face fabric, the back of it the shell with a tray.
          const bz = z - 0.03;
          const tz = z - 0.17;
          const yb = FL + 0.47;
          const yt = FL + 1.12;
          const t = 0.09;
          G.slab([x - w, yb, bz], [x + w, yb, bz], [x + w, yt, tz], [x - w, yt, tz],
            [x - w, yb, bz - t], [x + w, yb, bz - t], [x + w, yt, tz - t], [x - w, yt, tz - t], fabric, shell);
          // The headrest cover, and the tray table on the back.
          const k0 = 0.83;
          G.quad([x - w + 0.06, lerp(yb, yt, k0), lerp(bz, tz, k0) + 0.004], [x + w - 0.06, lerp(yb, yt, k0), lerp(bz, tz, k0) + 0.004],
            [x + w - 0.06, yt - 0.02, tz + 0.004], [x - w + 0.06, yt - 0.02, tz + 0.004], cover);
          const k1 = 0.42;
          const k2 = 0.84;
          G.quad([x + w - 0.04, lerp(yb, yt, k1), lerp(bz, tz, k1) - t - 0.004], [x - w + 0.04, lerp(yb, yt, k1), lerp(bz, tz, k1) - t - 0.004],
            [x - w + 0.04, lerp(yb, yt, k2), lerp(bz, tz, k2) - t - 0.004], [x + w - 0.04, lerp(yb, yt, k2), lerp(bz, tz, k2) - t - 0.004], tray);
        }
        // Armrests between and either side of the three, and the frame under them.
        for (let a = 0; a < 4; a++) {
          const ax = side * (SEAT_X[0] - 0.235 + a * 0.47);
          G.box(ax - 0.025, FL + 0.6, z - 0.06, ax + 0.025, FL + 0.67, z + 0.33, arm, 'bottom');
        }
        const x0 = side * (SEAT_X[0] - 0.2);
        const x1 = side * (SEAT_X[2] + 0.2);
        G.box(Math.min(x0, x1), FL, z + 0.05, Math.max(x0, x1), FL + 0.36, z + 0.1, leg, 'top bottom');
      }
    }
  }

  /** The galleys and lavatories at either end. */
  function buildGalleys(G, L) {
    const steel = col(0xb6bac0);
    const steelDark = col(0x8f949b);
    const top = col(0xd9dcdf);
    const lav = col(0xe6e2da);
    const lavDoor = col(0xd2ccc1);
    const handle = col(0x5d6168);
    // Front galley, starboard, across from the door: carts under the worktop, cupboards above.
    const xw = -halfW(14.0, FL + 1.05) + 0.02;
    G.box(xw, FL, FWD + 0.02, -1.0, FL + 1.04, DECK - 0.06, steel, 'nx bottom', top);
    for (let z = FWD + 0.12; z < DECK - 0.4; z += 0.42) {
      G.quad([-0.996, FL + 0.08, z], [-0.996, FL + 0.08, z + 0.38], [-0.996, FL + 0.92, z + 0.38], [-0.996, FL + 0.92, z], steelDark);
      G.box(-0.995, FL + 0.82, z + 0.06, -0.975, FL + 0.85, z + 0.32, handle, 'bottom');
    }
    G.box(-halfW(14.0, 5.12) + 0.03, 4.62, FWD + 0.05, -1.02, 5.12, DECK - 0.08, steel, 'nx');
    L.box(-1.03, 4.66, 14.3, -1.0, 4.7, 14.36, col(0xff3b30, 1.2));
    // Front lavatory, port, aft of the door: its door faces row 1.
    const lw = halfW(13.8, 4.6) - 0.02;
    G.box(0.52, FL, FWD, 1.1, CEIL, LAV_D, lav, 'px');
    G.box(1.1, FL, FWD, lw, 4.6, LAV_D, lav, 'px');
    G.quad([1.22, FL + 0.04, FWD - 0.004], [0.58, FL + 0.04, FWD - 0.004], [0.58, FL + 1.96, FWD - 0.004], [1.22, FL + 1.96, FWD - 0.004], lavDoor);
    G.box(0.64, FL + 0.95, FWD - 0.03, 0.68, FL + 1.05, FWD - 0.004, handle);
    L.box(0.86, FL + 2.02, FWD - 0.012, 0.94, FL + 2.08, FWD - 0.004, col(0x2ee86b, 1.1));
    // Aft: a lavatory each side, doors facing forward, and the galley across the back.
    for (const side of [1, -1]) {
      const w = halfW(-10.3, 4.6) - 0.02;
      const a = side > 0 ? [0.45, 1.08] : [-1.08, -0.45];
      const b = side > 0 ? [1.08, w] : [-w, -1.08];
      G.box(a[0], FL, LAV_A, a[1], CEIL, LAV_F, lav, side > 0 ? 'px' : 'nx');
      G.box(b[0], FL, LAV_A, b[1], 4.6, LAV_F, lav, side > 0 ? 'px' : 'nx');
      const d0 = side * 0.52;
      const d1 = side * 1.2;
      G.quad([d0, FL + 0.04, LAV_F + 0.004], [d1, FL + 0.04, LAV_F + 0.004], [d1, FL + 1.96, LAV_F + 0.004], [d0, FL + 1.96, LAV_F + 0.004], lavDoor);
      L.box(side * 0.82, FL + 2.02, LAV_F + 0.004, side * 0.9, FL + 2.08, LAV_F + 0.012, col(0x2ee86b, 1.1));
    }
    const aw = halfW(AFT, FL + 1.05) - 0.02;
    G.box(-aw, FL, AFT, aw, FL + 1.04, LAV_A, steel, 'nz bottom', top);
    for (let x = -0.4; x < 0.4; x += 0.42) G.quad([x, FL + 0.08, LAV_A + 0.004], [x + 0.38, FL + 0.08, LAV_A + 0.004], [x + 0.38, FL + 0.92, LAV_A + 0.004], [x, FL + 0.92, LAV_A + 0.004], steelDark);
    G.box(-0.44, 4.55, AFT, 0.44, 5.1, AFT + 0.32, steel, 'nz');
  }

  /** The flight deck: its own lining with the windscreen open, the panel, the seats. */
  function buildDeck(G, L) {
    const lining = col(0x6c7179);
    const upper = col(0x585d65);
    const reveal = col(0x2a2d31);
    const zs = [DECK, 15.95, 16.3, 16.62, 17.06, 17.18, 17.66, 17.78, NOSE];
    for (let i = 0; i < zs.length - 1; i++) {
      const za = zs[i];
      const zb = zs[i + 1];
      const fA = sAt(za, FL);
      const fB = sAt(zb, FL);
      const gz = GLAZE.find((g) => Math.abs(g[0] - za) < 1e-3);
      for (const side of [1, -1]) {
        const run = (sa0, sa1, sb0, sb1, n, cc) => {
          for (let k = 0; k < n; k++) {
            const a0 = lerp(sa0, sa1, k / n);
            const a1 = lerp(sa0, sa1, (k + 1) / n);
            const b0 = lerp(sb0, sb1, k / n);
            const b1 = lerp(sb0, sb1, (k + 1) / n);
            const pts = side > 0 ? [wallPt(za, a0, side), wallPt(zb, b0, side), wallPt(zb, b1, side), wallPt(za, a1, side)] : [wallPt(za, a0, side), wallPt(za, a1, side), wallPt(zb, b1, side), wallPt(zb, b0, side)];
            G.quad(pts[0], pts[1], pts[2], pts[3], cc);
          }
        };
        if (gz) {
          // A pane: lining above and below it, a dark reveal out to the glass.
          const e = 0.03;
          const [tA, bA] = [gz[2][0] + e, gz[2][1] - e];
          const [tB, bB] = [gz[3][0] + e, gz[3][1] - e];
          run(0, tA, 0, tB, 3, upper);
          run(bA, fA, bB, fB, 4, lining);
          const o = -WALL + 0.004;
          for (const [sa, sb] of [[tA, tB], [bA, bB]]) G.quad(wallPt(za, sa, side), wallPt(zb, sb, side), wallPt(zb, sb, side, o), wallPt(za, sa, side, o), reveal);
          G.quad(wallPt(za, tA, side), wallPt(za, bA, side), wallPt(za, bA, side, o), wallPt(za, tA, side, o), reveal);
          G.quad(wallPt(zb, tB, side), wallPt(zb, bB, side), wallPt(zb, bB, side, o), wallPt(zb, tB, side, o), reveal);
        } else {
          run(0, 0.9, 0, 0.9, 3, upper);
          run(0.9, fA, 0.9, fB, 4, lining);
        }
      }
    }
    // The end, behind the panel and under the windscreen.
    const ring = [];
    const sF = sAt(NOSE, FL);
    for (let k = 0; k <= 8; k++) ring.push(wallPt(NOSE, (sF * k) / 8, 1));
    const full = ring.concat(ring.slice(1, -1).reverse().map((p) => [-p[0], p[1], p[2]]));
    full.push([-ring[ring.length - 1][0], ring[ring.length - 1][1], NOSE]);
    const ctr = [0, FL + 0.6, NOSE];
    for (let k = 0; k < full.length; k++) G.tri(ctr, full[k], full[(k + 1) % full.length], reveal);

    // The instrument panel: a sloping face, the glare shield over it, knee space under it.
    const dark = col(0x2a2d32);
    const black = col(0x1c1e21);
    const fb = [PANEL, FL + 0.3];
    const ft = [17.5, FL + 0.98];
    const W = (z, y) => halfW(z, y) - 0.015;
    const wq = (z0, y0, z1, y1, cc) => G.quad([-W(z0, y0), y0, z0], [W(z0, y0), y0, z0], [W(z1, y1), y1, z1], [-W(z1, y1), y1, z1], cc);
    wq(fb[0], fb[1], ft[0], ft[1], dark);
    wq(ft[0], ft[1], 17.4, FL + 1.04, black);
    wq(17.4, FL + 1.04, 17.9, FL + 1.04, black);
    wq(17.62, FL, fb[0], fb[1], black);
    // The flight control unit along the glare shield, its readouts lit.
    G.box(-0.55, FL + 1.04, 17.37, 0.55, FL + 1.1, 17.47, col(0x3a3e44));
    for (let x = -0.45; x <= 0.46; x += 0.15) L.quad([x - 0.03, FL + 1.075, 17.369], [x + 0.03, FL + 1.075, 17.369], [x + 0.03, FL + 1.095, 17.369], [x - 0.03, FL + 1.095, 17.369], col(0xffa640, 1.15));
    // Six screens on the face: each pilot's flight and nav displays, the engine and systems pair in the middle.
    const face = (x, f, dx, df, cc, LL) => {
      const P = (u, v) => [x + u, lerp(fb[1], ft[1], f + v), lerp(fb[0], ft[0], f + v) - 0.006];
      (LL || L).quad(P(-dx, -df), P(dx, -df), P(dx, df), P(-dx, df), cc);
    };
    const sky = col(0x2f7fe0);
    const ground = col(0x8a5a2a);
    const navy = col(0x07111f);
    for (const sgn of [1, -1]) {
      // Flight display: sky over ground, the horizon, the little aircraft symbol.
      const xp = sgn * 0.78;
      face(xp, 0.6, 0.1, 0.075, sky);
      face(xp, 0.47, 0.1, 0.055, ground);
      face(xp, 0.525, 0.1, 0.005, col(0xffffff));
      face(xp, 0.525, 0.035, 0.008, col(0xffd21f, 1.1));
      face(xp, 0.29, 0.1, 0.1, col(0x182230));
      // Nav display: dark, a green arc and a magenta track.
      const xn = sgn * 0.54;
      face(xn, 0.52, 0.1, 0.13, navy);
      for (let k = -3; k <= 3; k++) face(xn + k * 0.025, 0.56 + 0.07 * (1 - Math.abs(k) / 3) * 0.6, 0.012, 0.004, col(0x2ee86b, 1.1));
      face(xn, 0.5, 0.004, 0.08, col(0xff4fd8, 1.1));
    }
    // The middle pair: engine gauges, a systems page.
    face(0, 0.62, 0.11, 0.09, navy);
    for (const dx of [-0.05, 0.05]) {
      face(dx, 0.66, 0.03, 0.03, col(0x0c1b2c));
      face(dx, 0.66, 0.025, 0.004, col(0x2ee86b, 1.1));
    }
    face(0, 0.57, 0.08, 0.004, col(0xffffff));
    face(0, 0.33, 0.11, 0.1, navy);
    for (let k = 0; k < 4; k++) face(-0.06 + k * 0.04, 0.33, 0.006, 0.03 + k * 0.012, col(k === 2 ? 0xffb020 : 0x2ee86b, 1.1));

    // The pedestal between the seats: thrust levers, radios.
    const ped = col(0x33373c);
    G.box(-0.22, FL, 16.45, 0.22, FL + 0.76, PANEL, ped, 'bottom', col(0x2a2d31));
    for (const dx of [-0.06, 0.06]) {
      G.box(dx - 0.02, FL + 0.76, 16.92, dx + 0.02, FL + 0.93, 16.98, col(0x9aa0a6));
      G.box(dx - 0.035, FL + 0.93, 16.9, dx + 0.035, FL + 0.97, 17.0, black);
    }
    for (let z = 17.05; z < 17.3; z += 0.1) L.quad([-0.16, FL + 0.765, z], [0.16, FL + 0.765, z], [0.16, FL + 0.765, z + 0.05], [-0.16, FL + 0.765, z + 0.05], col(0x7cd3ff, 0.9));
    // The pilots' seats, side consoles and sidesticks.
    const seat = col(0x55504a);
    const seatDark = col(0x403c37);
    for (const sgn of [1, -1]) {
      const x = sgn * CAPT.x;
      G.box(x - 0.17, FL, 16.4, x + 0.17, FL + 0.38, 16.75, col(0x2c2f34), 'bottom');
      G.box(x - 0.25, FL + 0.38, 16.32, x + 0.25, FL + 0.52, 16.86, seatDark, 'bottom', seat);
      G.slab([x - 0.25, FL + 0.5, 16.34], [x + 0.25, FL + 0.5, 16.34], [x + 0.24, FL + 1.28, 16.22], [x - 0.24, FL + 1.28, 16.22],
        [x - 0.25, FL + 0.5, 16.24], [x + 0.25, FL + 0.5, 16.24], [x + 0.24, FL + 1.28, 16.12], [x - 0.24, FL + 1.28, 16.12], seat, seatDark);
      G.box(x - 0.15, FL + 1.28, 16.13, x + 0.15, FL + 1.46, 16.25, seat);
      for (const s2 of [-1, 1]) G.box(x + s2 * 0.27 - 0.03, FL + 0.7, 16.38, x + s2 * 0.27 + 0.03, FL + 0.77, 16.8, seatDark);
      const cw = halfW(16.9, FL + 0.62) - 0.02;
      const c0 = sgn > 0 ? 0.95 : -cw;
      const c1 = sgn > 0 ? cw : -0.95;
      G.box(c0, FL, 16.55, c1, FL + 0.62, PANEL, ped, 'bottom', col(0x2a2d31));
      const kx = sgn * 1.1;
      G.box(kx - 0.025, FL + 0.62, 16.92, kx + 0.025, FL + 0.82, 16.97, black);
      G.box(kx - 0.035, FL + 0.8, 16.9, kx + 0.035, FL + 0.86, 17.0, black);
    }
    // The overhead panel, switches lit here and there.
    const S = surf();
    const yo = (z) => S.centre(z) + S.height(z) - WALL - 0.12;
    G.quad([-0.42, yo(16.25), 16.25], [0.42, yo(16.25), 16.25], [0.42, yo(17.45) - 0.05, 17.45], [-0.42, yo(17.45) - 0.05, 17.45], col(0x3a3e44));
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 5; j++) {
        if ((i * 7 + j * 3) % 4 === 0) continue;
        const z = 16.4 + i * 0.18;
        const x = -0.32 + j * 0.16;
        const y = lerp(yo(16.25), yo(17.45) - 0.05, (z - 16.25) / 1.2) - 0.005;
        L.quad([x - 0.02, y, z - 0.015], [x + 0.02, y, z - 0.015], [x + 0.02, y, z + 0.015], [x - 0.02, y, z + 0.015], col((i + j) % 3 === 0 ? 0xffb020 : 0xe8f4ff, 1.0));
      }
    }
    // The bulkhead above the cabin ceiling, up to the crown (seen from the flight deck).
    const sTop = sAt(DECK, CEIL);
    for (let k = 0; k < 6; k++) {
      const a = wallPt(DECK, (sTop * k) / 6, 1);
      const b = wallPt(DECK, (sTop * (k + 1)) / 6, 1);
      G.tri([0, CEIL, DECK], a, b, col(0x6c7179));
      G.tri([0, CEIL, DECK], [-b[0], b[1], DECK], [-a[0], a[1], DECK], col(0x6c7179));
    }
    // The flight-deck door, open and folded back against the bulkhead on the right.
    G.box(-1.27, FL, DECK + 0.1, -DS.x - 0.02, FL + 1.96, DECK + 0.15, col(0xbfc3c8));
  }

  /**
   * The front door: its lining (the skin is a few centimetres thick), the threshold across to
   * the bridge, and the bridge's rubber collar round it filling the gap to the fuselage.
   */
  function buildDoor(G) {
    const lining = col(0xb9bec4);
    const rubber = col(0x2c2f34);
    const canopy = col(0x5d636b);
    const sill = col(0x8f959c);
    const o = -WALL + 0.003;
    const zs = [DOOR.z0, DOOR.zc, DOOR.z1];
    const sF = (z) => sAt(z, FL);
    for (let i = 0; i < 2; i++) {
      const za = zs[i];
      const zb = zs[i + 1];
      G.quad(wallPt(za, DOOR.s0, 1), wallPt(zb, DOOR.s0, 1), wallPt(zb, DOOR.s0, 1, o), wallPt(za, DOOR.s0, 1, o), lining);
    }
    for (const z of [DOOR.z0, DOOR.z1]) {
      const n = 4;
      for (let k = 0; k < n; k++) {
        const a = lerp(DOOR.s0, DOOR.s1, k / n);
        const b = lerp(DOOR.s0, DOOR.s1, (k + 1) / n);
        G.quad(wallPt(z, a, 1), wallPt(z, b, 1), wallPt(z, b, 1, o), wallPt(z, a, 1, o), lining);
      }
      // Down to the floor below the skin's sill.
      G.quad(wallPt(z, DOOR.s1, 1), wallPt(z, sF(z), 1), wallPt(z, sF(z), 1, o), wallPt(z, DOOR.s1, 1, o), lining);
    }
    // The threshold: a metal plate from inside the door out over the gap to the bridge's floor.
    G.box(1.62, FL - 0.02, DOOR.z0 + 0.01, 2.32, FL + 0.012, DOOR.z1 - 0.01, sill, 'bottom');
    G.box(2.24, FL + 0.012, DOOR.z0 + 0.01, 2.3, FL + 0.016, DOOR.z1 - 0.01, col(0xe0b12e));
    // The collar at the bridge's mouth (x 2.25), its opening round the door, and its sides in
    // to the skin.
    const X = 2.23;
    const zl = DOOR.zc - 1.27;
    const zr = DOOR.zc + 1.27;
    const a0 = DOOR.z0 - 0.03;
    const a1 = DOOR.z1 + 0.03;
    const top = FL + 1.9;
    const hi = FL + 2.92;
    G.quad([X, FL, zl], [X, FL, a0], [X, hi, a0], [X, hi, zl], canopy);
    G.quad([X, FL, a1], [X, FL, zr], [X, hi, zr], [X, hi, a1], canopy);
    G.quad([X, top, a0], [X, top, a1], [X, hi, a1], [X, hi, a0], canopy);
    // A dark rubber seal round the opening.
    const e = 0.07;
    G.quad([X + 0.005, FL, a0 - e], [X + 0.005, FL, a0], [X + 0.005, top, a0], [X + 0.005, top + e, a0 - e], rubber);
    G.quad([X + 0.005, FL, a1], [X + 0.005, FL, a1 + e], [X + 0.005, top + e, a1 + e], [X + 0.005, top, a1], rubber);
    G.quad([X + 0.005, top, a0], [X + 0.005, top, a1], [X + 0.005, top + e, a1 + e], [X + 0.005, top + e, a0 - e], rubber);
    const skin = (z, y) => halfW(z, y, -WALL) - 0.01;
    const ys = [FL, FL + 0.5, FL + 1.0, FL + 1.5, top];
    for (const z of [a0, a1]) {
      for (let k = 0; k < ys.length - 1; k++) G.quad([skin(z, ys[k]), ys[k], z], [X, ys[k], z], [X, ys[k + 1], z], [skin(z, ys[k + 1]), ys[k + 1], z], rubber);
    }
    G.quad([skin(a0, top), top, a0], [X, top, a0], [X, top, a1], [skin(a1, top), top, a1], rubber);
  }

  const CABIN_GEO = new Map();
  let CASTER_GEO = null;
  /** One cabin's meshes' geometry, for an airline colour (cached). */
  function cabinGeometry(c) {
    let g = CABIN_GEO.get(c);
    if (g) return g;
    const G = new Geo();
    const L = new Geo();
    buildLining(G, L, c);
    buildBins(G, L);
    buildSeats(G, c);
    buildGalleys(G, L);
    buildDeck(G, L);
    buildDoor(G);
    g = { shell: G.build(), glow: L.build() };
    CABIN_GEO.set(c, g);
    return g;
  }

  // ------------------------------------------------- seated passengers
  let PAX_GEO = null;
  /** One seated passenger (at a seat's reference point): head, hair, shirt, trousers by slot. */
  function paxGeometry() {
    if (PAX_GEO) return PAX_GEO;
    const pos = [];
    const slot = [];
    const add = (geo, s, m) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (m) g.applyMatrix4(m);
      const p = g.attributes.position.array;
      for (let i = 0; i < p.length; i++) pos.push(p[i]);
      for (let i = 0; i < p.length / 3; i++) slot.push(s);
      g.dispose();
    };
    const M = (x, y, z, rx) => new THREE.Matrix4().makeRotationX(rx || 0).setPosition(x, y, z);
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    // 0 skin, 1 hair, 2 top, 3 bottom
    add(box(0.36, 0.16, 0.46), 3, M(0, FL + 0.57, 0.2)); //          thighs
    add(box(0.32, 0.46, 0.14), 3, M(0, FL + 0.3, 0.44)); //          shins
    add(box(0.38, 0.56, 0.22), 2, M(0, FL + 0.86, -0.0, -0.1)); //   body
    for (const s of [-1, 1]) {
      add(box(0.09, 0.42, 0.13), 2, M(s * 0.23, FL + 0.86, 0.0, -0.1)); // upper arms
      add(box(0.08, 0.08, 0.3), 2, M(s * 0.22, FL + 0.67, 0.16)); //        forearms on the armrests
      add(box(0.08, 0.06, 0.1), 0, M(s * 0.22, FL + 0.67, 0.35)); //        hands
    }
    add(box(0.1, 0.08, 0.1), 0, M(0, FL + 1.17, -0.04)); //          neck
    add(new THREE.SphereGeometry(0.115, 8, 6), 0, M(0, FL + 1.3, -0.03));
    add(new THREE.SphereGeometry(0.122, 8, 3, 0, PI * 2, 0, PI * 0.5), 1, new THREE.Matrix4().makeRotationX(-0.5).setPosition(0, FL + 1.315, -0.05));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSlot', new THREE.Float32BufferAttribute(slot, 1));
    const white = new Float32Array(pos.length).fill(1);
    g.setAttribute('color', new THREE.BufferAttribute(white, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    PAX_GEO = g;
    return g;
  }

  // ------------------------------------------------------- materials
  let MATS = null;
  /** The cabin's own lighting: lit by the scene in the fuselage's shadow, plus its own lights. */
  function mats() {
    if (MATS) return MATS;
    const lift = { value: 0.55 };
    const patch = (key, extra) => (m) => {
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uCabinLift = lift;
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uCabinLift;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uCabinLift;');
        if (extra) extra(shader);
      };
      m.customProgramCacheKey = () => key;
      return m;
    };
    const shell = patch('vh-cabin-shell-v1')(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide, envMapIntensity: 0.45 }));
    const pax = patch('vh-cabin-pax-v1', (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aSlot;\nattribute vec3 iSkin;\nattribute vec3 iHair;\nattribute vec3 iTop;\nattribute vec3 iBottom;')
        .replace('#include <color_vertex>', '#include <color_vertex>\n{ float sl = floor(aSlot + 0.5); vColor.xyz *= sl < 0.5 ? iSkin : sl < 1.5 ? iHair : sl < 2.5 ? iTop : iBottom; }');
    })(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, envMapIntensity: 0.45 }));
    const glow = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    // The airliner's shell casts its shadow from its far side (three.js draws one-sided
    // materials' back faces into the shadow map), so the cabin gets a box of its own that
    // only ever draws into the shadow map: the sun stays outside.
    const caster = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
    MATS = { shell, pax, glow, lift, caster };
    return MATS;
  }

  // -------------------------------------------------- the skin cut away
  const CUTS = new Map(); // a model's geometry → the same with the door cut out (or itself)
  /**
   * `src` with the triangles in the door's cut-out removed; for the painted body (`paint` is
   * the livery colour) the frame round the doorway is patched back in.
   */
  function cutGeometry(src, paint) {
    if (CUTS.has(src)) return CUTS.get(src);
    const S = surf();
    const P = src.attributes.position.array;
    const N = src.attributes.normal ? src.attributes.normal.array : null;
    const C = src.attributes.color ? src.attributes.color.array : null;
    const inCut = (i) => {
      const x = P[i];
      const y = P[i + 1];
      const z = P[i + 2];
      if (x < 0.5 || z < CUT.z0 - 0.02 || z > CUT.z1 + 0.02) return false;
      const u = x / S.width(z);
      const v = (y - S.centre(z)) / S.height(z);
      if (Math.abs(Math.hypot(u, v) - 1) > 0.05) return false;
      const s = Math.atan2(u, v);
      return s > CUT.s0 - 0.012 && s < CUT.s1 + 0.012;
    };
    const keep = [];
    let dropped = 0;
    for (let t = 0; t < P.length; t += 9) {
      if (inCut(t) && inCut(t + 3) && inCut(t + 6)) dropped++;
      else keep.push(t);
    }
    if (!dropped) {
      CUTS.set(src, src);
      return src;
    }
    const pos = [];
    const nor = [];
    const cl = [];
    for (const t of keep) {
      for (let k = 0; k < 9; k++) {
        pos.push(P[t + k]);
        if (N) nor.push(N[t + k]);
        if (C) cl.push(C[t + k]);
      }
    }
    if (paint !== undefined && paint !== null && C && N) {
      // The skin back round the opening, in its paint: white over the cheat line, the line itself.
      const K = new VH.AircraftKit();
      const deep = SHADE(paint, 0.72);
      const bands = (s0, s1) => {
        const cuts = [s0, s1];
        for (const b of [1.6, 1.79, 1.86]) if (b > s0 && b < s1) cuts.push(b);
        cuts.sort((a, b) => a - b);
        const out = [];
        for (let i = 0; i < cuts.length - 1; i++) {
          const m = (cuts[i] + cuts[i + 1]) / 2;
          out.push([cuts[i], cuts[i + 1], m >= 1.6 && m < 1.79 ? paint : m >= 1.79 && m < 1.86 ? deep : WHITE]);
        }
        return out;
      };
      const strip = (z0, z1, s0, s1) => {
        for (const [a, b, cc] of bands(s0, s1)) K.patch(S, z0, z1, [a, b], [a, b], 1, cc, { lift: 0.0015, nz: 2, ns: 2 });
      };
      strip(CUT.z0, CUT.z1, CUT.s0, DOOR.s0);
      strip(CUT.z0, CUT.z1, DOOR.s1, CUT.s1);
      strip(CUT.z0, DOOR.z0, DOOR.s0, DOOR.s1);
      strip(DOOR.z1, CUT.z1, DOOR.s0, DOOR.s1);
      for (let i = 0; i < K.pos.length; i++) {
        pos.push(K.pos[i]);
        nor.push(K.nor[i]);
        cl.push(K.col[i]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (N) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (C) g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    g.computeBoundingSphere();
    CUTS.set(src, g);
    return g;
  }

  // ------------------------------------------------------------ colliders
  /**
   * Every collider of one stand's cabin, in the plane's frame: [x0, y0, z0, x1, y1, z1, flags].
   * (Seat blocks and the bins don't stop the camera; the bins don't stop Jay, who can't reach them.)
   */
  function colliderList() {
    const F = VH.COLLIDE;
    const ALL = F.SOLID | F.CAMERA | F.SHOTS;
    const BODY = F.SOLID | F.SHOTS;
    const CAM = F.CAMERA | F.SHOTS;
    const zc = DOOR.zc;
    const out = [
      [-1.95, FL - 0.4, AFT, 1.95, FL, NOSE, ALL, 'floor'],
      [1.85, FL - 0.4, DOOR.z0 + 0.02, 2.6, FL, DOOR.z1 - 0.02, ALL, 'floor'], // the threshold
      [-2.1, CEIL, AFT, 2.1, CEIL + 0.5, NOSE, F.SOLID | F.CAMERA],
      [1.86, FL, AFT, 2.3, CEIL, DOOR.z0, ALL],
      [1.86, FL, DOOR.z1, 2.3, CEIL, DECK + 0.1, ALL],
      [1.55, FL + 1.88, DOOR.z0, 2.6, CEIL, DOOR.z1, ALL], // over the door
      [-2.3, FL, AFT, -1.86, CEIL, DECK + 0.1, ALL],
      [1.86, FL - 0.4, zc - 1.6, 2.58, FL + 3.0, DOOR.z0, ALL], // the bridge's mouth either side of the door
      [1.86, FL - 0.4, DOOR.z1, 2.58, FL + 3.0, zc + 1.6, ALL],
      [0.4, FL, ROW0 - (ROWS - 1) * PITCH - 0.32, 1.88, FL + 1.62, ROW0 + 0.45, BODY], // the seats
      [-1.88, FL, ROW0 - (ROWS - 1) * PITCH - 0.32, -0.4, FL + 1.62, ROW0 + 0.45, BODY],
      [BIN_X - 0.06, 4.62, BINS.z0, 1.95, CEIL, BINS.z1, CAM],
      [-1.95, 4.62, BINS.z0, -BIN_X + 0.06, CEIL, BINS.z1, CAM],
      [-1.95, FL, FWD, -0.98, FL + 1.05, DECK, ALL], // the front galley
      [-1.6, 4.6, FWD, -1.0, CEIL, DECK, CAM],
      [0.5, FL, FWD, 1.95, CEIL, LAV_D, ALL], // the front lavatory
      [0.43, FL, LAV_A, 1.95, CEIL, LAV_F, ALL],
      [-1.95, FL, LAV_A, -0.43, CEIL, LAV_F, ALL],
      [-1.95, FL, AFT - 0.4, 1.95, FL + 1.05, LAV_A, ALL],
      [-1.95, FL, AFT - 0.5, 1.95, CEIL, AFT, ALL],
      [-1.95, FL, DECK - 0.04, -DS.x, CEIL, DECK + 0.16, ALL], // the flight-deck bulkhead and doorway
      [DS.x, FL, DECK - 0.04, 1.95, CEIL, DECK + 0.16, ALL],
      [-DS.x, FL + DS.h, DECK - 0.04, DS.x, CEIL, DECK + 0.16, ALL],
      [1.48, FL, DECK, 2.0, CEIL, 16.9, ALL], // the flight deck
      [-2.0, FL, DECK, -1.48, CEIL, 16.9, ALL],
      [1.2, FL, 16.9, 1.9, CEIL, NOSE, ALL],
      [-1.9, FL, 16.9, -1.2, CEIL, NOSE, ALL],
      [0.95, FL, 16.55, 1.5, FL + 0.66, PANEL, ALL], // side consoles
      [-1.5, FL, 16.55, -0.95, FL + 0.66, PANEL, ALL],
      [-1.4, FL, PANEL, 1.4, FL + 1.06, NOSE, ALL], // the panel
      [-0.23, FL, 16.45, 0.23, FL + 0.8, PANEL, ALL], // the pedestal
      [0.36, FL, 16.2, 0.88, FL + 1.3, 16.86, BODY], // the seats
      [-0.88, FL, 16.2, -0.36, FL + 1.3, 16.86, BODY],
      [-1.2, 4.95, 16.9, 1.2, 5.7, NOSE, F.SOLID | F.CAMERA],
    ];
    return out;
  }

  const PARK = -900;
  function parkCol(c) {
    if (!c._cabin) c._cabin = [c.minY, c.maxY, c.y0, c.y1];
    c.minY = c.maxY = c.y0 = c.y1 = PARK;
  }
  function unparkCol(c) {
    if (!c._cabin) return;
    c.minY = c._cabin[0];
    c.maxY = c._cabin[1];
    c.y0 = c._cabin[2];
    c.y1 = c._cabin[3];
  }

  // ---------------------------------------------------------- the crew
  /** A cabin crew member's brain (a crowd agent): at their post, a word now and then; off if it kicks off. */
  class CrewBrain {
    constructor(sys, cab, post) {
      this.sys = sys;
      this.cab = cab;
      this.post = post; // { x, z, yaw } in the world
      this.gone = false;
      this.flee = null; // [{x, z}, ...] the way off
      this.pi = 0;
      this.talkT = 0;
      this.witness = true;
      this.speed = 4.6;
    }

    expired() {
      return this.gone;
    }

    setAlert(a) {
      if (!a.dead && !this.flee && this.cab) this.sys._crewFlee(this.cab);
    }

    update(a, dt) {
      const an = a.anim;
      an.talk = this.talkT > 0 ? 1 : 0;
      an.sprint = false;
      this.talkT = Math.max(0, this.talkT - dt);
      a.moveSpeed = 0;
      if (this.flee) {
        const w = this.flee[this.pi];
        if (!w) {
          this.gone = true;
          return;
        }
        const dx = w.x - a.pos.x;
        const dz = w.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.6 || (a.blocked > 1.0 && d < 2.5)) {
          this.pi++;
          return;
        }
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 8, dt);
        a.moveSpeed = this.speed;
        an.sprint = true;
        return;
      }
      // Back to the post if nudged off it, then face the way they work.
      const p = this.post;
      const dx = p.x - a.pos.x;
      const dz = p.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.25) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 6, dt);
        a.moveSpeed = Math.min(1.1, d * 1.5);
      } else {
        const want = this.face !== undefined ? this.face : p.yaw;
        a.heading = dampAngle(a.heading, want, 4, dt);
      }
    }
  }

  // -------------------------------------------------------------- Cabin
  class Cabin {
    constructor(game) {
      this.game = game;
      this.saveKey = 'cabin';
      this.boarded = 0;
      this.taken = 0;
      this.aboard = false;
      this.live = []; //   the built cabins: { st, rot, model, group, pax, crew, ... }
      this.standCols = new Map(); // stand id → { cols: [...], on, sill }
      this.items = new Map(); //     stand id → the "Take the controls" interactable
      this.taking = null; //  the fade into the cockpit
      this.walking = null; // the fade back to the gate
      this.hijacked = null; // { stand, v }: the stand kept clear until he's taken it away
      this._zoomWas = null;
      this._sayT = 0;
      this._preT = 0;
      this._paxPool = [];
      this._m4 = new THREE.Matrix4();
      const A = game.airside;
      this.ok = !!(A && A.ok && VH.AircraftKit && game.physics && game.scene && typeof A.cabinPlane === 'function');
      if (!this.ok) return;
      this._warmup();
      const it = game.interaction;
      if (it) {
        for (const st of A.stands()) {
          const item = { id: 'cabin_controls_' + st.id, kind: 'cabinControls', stand: st.id, x: st.x + CAPT.x, y: FL + 1, z: st.z + CAPT.z, radius: 1.35, label: 'Take the controls', enabled: false };
          it.register(item);
          // (register copies it: keep the one it holds)
          this.items.set(st.id, it.items[it.items.length - 1]);
        }
        it.on('cabinControls', (item) => {
          this._takeControls(item.stand);
          return 3;
        });
      }
      // Shots fired in a cabin, or into one: everyone aboard runs for it.
      VH.events.on('combat:ray', (e) => this._shots(e));
    }

    /** One of each material out of sight, so the loading screen compiles their shaders. */
    _warmup() {
      try {
        const M = mats();
        const g = (this._warm = new THREE.Group());
        g.position.set(0, -3000, 0);
        const G = new Geo();
        G.box(0, 0, 0, 1, 1, 1, col(0xffffff));
        const geo = G.build();
        const shell = new THREE.Mesh(geo, M.shell);
        shell.receiveShadow = true;
        const pax = new THREE.InstancedMesh(paxGeometry(), M.pax, 1);
        pax.receiveShadow = true;
        pax.setMatrixAt(0, new THREE.Matrix4());
        const caster = new THREE.Mesh(geo, M.caster);
        caster.castShadow = true;
        g.add(shell, new THREE.Mesh(geo, M.glow), pax, caster);
        this.game.scene.add(g);
      } catch (err) {
        console.warn('[cabin] warm-up failed', err);
      }
    }

    // --------------------------------------------------------- world system
    update(dt) {
      if (!this.ok) return;
      const g = this.game;
      const A = g.airside;
      if (!A.inited) return;
      dt = Math.min(dt, 0.1);
      if (this._reboard) {
        const st = A.stands().find((q) => q.id === this._reboard);
        const p0 = g.player;
        this._reboard = 0;
        if (st && !p0.inVehicle && Math.hypot(p0.pos.x - st.door.x, p0.pos.z - st.door.z) < 30) this._toGate(st, true);
      }
      if (this._warm) {
        this._warm.removeFromParent();
        this._warm = null;
      }
      this._sayT = Math.max(0, this._sayT - dt);
      this._preT -= dt;
      const p = g.player;
      const P = p.inVehicle && p.vehicle ? p.vehicle.pos : p.pos;
      // Which stands want a cabin: a plane on the stand, Jay near its door (and on foot).
      const want = [];
      for (const st of A.stands()) {
        const info = A.cabinPlane(st.id);
        if (!info) continue;
        const d = Math.hypot(P.x - st.door.x, P.z - st.door.z);
        const have = this.live.find((c) => c.st.id === st.id);
        if (d < (have ? FAR : NEAR)) want.push({ st, info, d });
        else if (d < 260) this._prefetch(info);
      }
      want.sort((a, b) => a.d - b.d);
      want.length = Math.min(want.length, LIVE_MAX);
      // Down: no longer wanted, or the plane changed (another rotation, or it's moving).
      for (const c of this.live.slice()) {
        const w = want.find((q) => q.st.id === c.st.id);
        if (!w || w.info.rot !== c.rot) this._drop(c);
      }
      for (const w of want) {
        let c = this.live.find((q) => q.st.id === w.st.id);
        if (!c) c = this._build(w.st, w.info);
        if (c) this._tick(c, w.info, dt);
      }
      // Jay aboard?
      const was = this.aboard;
      const on = this._jayCabin();
      this.aboard = !!on;
      if (this.aboard !== was) this._camera(this.aboard);
      // The "Take the controls" prompts.
      for (const [id, item] of this.items) {
        const c = on && on.st.id === id ? on : null;
        item.enabled = !!c && !c.disabled && !this.taking && !this.walking && !p.inVehicle && this._localZ(c) > DECK + 0.1;
      }
      if (this.taking) this._takingTick(dt);
      if (this.walking) this._walkingTick(dt);
      if (this.hijacked) this._hijackTick();
    }

    /** Get a plane's cabin and its cut-out door ready before Jay's close (a piece at a time). */
    _prefetch(info) {
      if (this._preT > 0) return;
      this._preT = 0.4;
      if (!CABIN_GEO.has(info.color)) {
        cabinGeometry(info.color);
        return;
      }
      const m = info.model;
      if (!m || !m.meshes) return;
      for (let i = 0; i < m.meshes.length; i++) {
        if (CUTS.has(m.meshes[i].geometry)) continue;
        cutGeometry(m.meshes[i].geometry, i === 0 ? m.color : null);
        return;
      }
    }

    /** The cabin Jay is in, or null. */
    _jayCabin() {
      const p = this.game.player;
      if (p.inVehicle || p.state === 'dead') return null;
      for (const c of this.live) {
        const lx = p.pos.x - c.st.x;
        const lz = p.pos.z - c.st.z;
        if (p.pos.y < FL - 0.6 || p.pos.y > CEIL) continue;
        if (lz > AFT && lz < NOSE && (lx > -1.95 && lx < 1.9 || (lx < 2.3 && lx > 0 && lz > DOOR.z0 - 0.1 && lz < DOOR.z1 + 0.1))) return c;
      }
      return null;
    }

    _localZ(c) {
      return this.game.player.pos.z - c.st.z;
    }

    /** Pull the camera in while Jay's inside (and put it back after). */
    _camera(inside) {
      const r = this.game.cameraRig;
      if (!r) return;
      if (inside) {
        this._zoomWas = r.zoom;
        r.zoom = Math.min(r.zoom, -1.3);
      } else if (this._zoomWas !== null) {
        r.zoom = this._zoomWas;
        this._zoomWas = null;
      }
    }

    // ------------------------------------------------------------ building
    _build(st, info) {
      const g = this.game;
      if (!info.model) return null;
      const M = mats();
      const geo = cabinGeometry(info.color);
      const group = new THREE.Group();
      group.name = 'cabin ' + st.gate;
      group.position.set(st.x, 0, st.z);
      group.rotation.y = info.yaw || 0;
      const shell = new THREE.Mesh(geo.shell, M.shell);
      shell.receiveShadow = true;
      const glow = new THREE.Mesh(geo.glow, M.glow);
      const { pax, attrs, pg } = this._paxPool.pop() || this._paxMesh();
      pax.count = 0;
      for (const m of [shell, glow, pax]) {
        m.castShadow = false;
        group.add(m);
      }
      if (!CASTER_GEO) {
        CASTER_GEO = new THREE.BoxGeometry(4.08, CEIL + 0.14 - (FL - 0.12), NOSE - AFT + 0.3);
        CASTER_GEO.translate(0, (CEIL + 0.14 + FL - 0.12) / 2, (NOSE + AFT) / 2);
      }
      const caster = new THREE.Mesh(CASTER_GEO, M.caster);
      caster.castShadow = true;
      caster.receiveShadow = false;
      group.add(caster);
      g.scene.add(group);
      const c = {
        st, rot: info.rot, model: null, swapped: [], group, shell, glow, pax, attrs, pg,
        open: false, shown: -1, set: null, order: null, sat: 0, stood: 0, phase: '',
        crew: [], said: {}, inside: false, deckWarned: false, holdSaid: 0, color: info.color, runners: [],
      };
      this.live.push(c);
      this._cols(st, true);
      if (!info.disabled) this._crewIn(c);
      return c;
    }

    /** The seated passengers of one cabin: an instanced mesh with its own colours (two kept for reuse). */
    _paxMesh() {
      const pax = new THREE.InstancedMesh(paxGeometry(), mats().pax, SEATS);
      pax.receiveShadow = true;
      pax.frustumCulled = false;
      const ia = () => new THREE.InstancedBufferAttribute(new Float32Array(SEATS * 3), 3);
      // Each has its own instance attributes, so its own (cheap) geometry wrapper round the shared shape.
      const pg = new THREE.BufferGeometry();
      const base = paxGeometry();
      for (const k of Object.keys(base.attributes)) pg.setAttribute(k, base.attributes[k]);
      pg.boundingSphere = base.boundingSphere;
      const attrs = { iSkin: ia(), iHair: ia(), iTop: ia(), iBottom: ia() };
      for (const k of Object.keys(attrs)) pg.setAttribute(k, attrs[k]);
      pax.geometry = pg;
      return { pax, attrs, pg };
    }

    _drop(c) {
      if (c.dropped) return;
      c.dropped = true;
      this._uncut(c);
      this._doorOpen(c, false);
      this._cols(c.st, false);
      c.group.removeFromParent();
      c.group.remove(c.pax);
      c.pax.count = 0;
      if (this._paxPool.length < LIVE_MAX) this._paxPool.push({ pax: c.pax, attrs: c.attrs, pg: c.pg });
      for (const a of c.crew) if (a.brain) a.brain.gone = true;
      c.crew = [];
      this.live = this.live.filter((q) => q !== c);
      const A = this.game.airside;
      if (A && A.cabinHold) A.cabinHold(c.st.id, false);
      // Jay can't be left inside a cabin that's going (the plane is leaving, or it's gone).
      if (!this.taking && this._jayIn(c)) this._toGate(c.st, true);
    }

    _jayIn(c) {
      const p = this.game.player;
      const lx = p.pos.x - c.st.x;
      const lz = p.pos.z - c.st.z;
      return !p.inVehicle && p.pos.y > FL - 0.6 && p.pos.y < CEIL && lx > -2 && lx < 2.3 && lz > AFT && lz < NOSE;
    }

    /** One stand's colliders on (made the first time) or parked out of the way. */
    _cols(st, on) {
      const ph = this.game.physics;
      let s = this.standCols.get(st.id);
      if (!s) {
        if (!on) return;
        const cols = colliderList().map(([x0, y0, z0, x1, y1, z1, flags, tag]) => ph.addBox(st.x + x0, y0, st.z + z0, st.x + x1, y1, st.z + z1, tag || 'cabin', flags));
        for (const c of cols) parkCol(c);
        // The bridge's sill across its mouth (terminal.js): parked while the door is open.
        let sill = null;
        ph.query(st.x + 2.2, st.door.z - 0.5, st.x + 2.4, st.door.z + 0.5, (c) => {
          if (c.tag === 'bridge' && c.minX > st.x + 2.0 && c.maxX < st.x + 2.7 && c.maxZ - c.minZ > 2.5 && c.minY > FL - 0.6 && c.minY < FL) sill = c;
        });
        s = { cols, on: false, sill, sillParked: false };
        this.standCols.set(st.id, s);
      }
      if (s.on === on) return;
      s.on = on;
      for (const c of s.cols) (on ? unparkCol : parkCol)(c);
    }

    _sill(st, open) {
      const s = this.standCols.get(st.id);
      if (!s || !s.sill || s.sillParked === open) return;
      s.sillParked = open;
      (open ? parkCol : unparkCol)(s.sill);
    }

    /** The skin round the door cut away on this plane's model (or put back). */
    _cut(c, model) {
      if (c.model === model) return;
      this._uncut(c);
      if (!model || !model.meshes) return;
      c.model = model;
      model.meshes.forEach((mesh, i) => {
        const cut = cutGeometry(mesh.geometry, i === 0 ? model.color : null);
        if (cut !== mesh.geometry) {
          c.swapped.push([mesh, mesh.geometry]);
          mesh.geometry = cut;
        }
      });
    }

    _uncut(c) {
      for (const [mesh, geo] of c.swapped) mesh.geometry = geo;
      c.swapped = [];
      if (c.model && c.model._air && c.model._air.door) c.model._air.door.visible = false;
      c.model = null;
    }

    _doorOpen(c, open) {
      if (c.open === open) return;
      c.open = open;
      this._sill(c.st, open);
    }

    // ------------------------------------------------------------- ticking
    _tick(c, info, dt) {
      const g = this.game;
      const p = g.player;
      const A = g.airside;
      const near = !p.inVehicle && Math.hypot(p.pos.x - c.st.door.x, p.pos.z - c.st.door.z) < OPEN_NEAR && p.pos.y > FL - 1;
      const inside = this._jayIn(c);
      const open = info.bridge && !info.push && (!info.closed || near || inside || !!c.holding);
      this._doorOpen(c, open);
      const model = open ? (info.model || null) : null;
      this._cut(c, model);
      if (c.model && c.model._air && c.model._air.door) c.model._air.door.visible = false;
      c.group.visible = !!info.model;
      // Shot up or on fire (havoc-air.js): nobody stays aboard, the crew included (some go up
      // the bridge, the rest down the slides), and nobody boards. No taking it, either.
      c.disabled = !!info.disabled;
      if (c.disabled && !c.panic) this._panic(c, info.pax > 0 || c.pax.count > 0);
      // The lights: a touch brighter after dark.
      const night = A.night || 0;
      mats().lift.value = 0.2 - night * 0.06;
      this._seats(c, info);
      this._crewTick(c, info, dt);
      this._assist(c, dt);
      // Jay on board.
      if (inside && !c.inside) {
        c.inside = true;
        if (!c.counted) {
          c.counted = true;
          this.boarded++;
          if (g.achievements && g.achievements.unlock) g.achievements.unlock('frequent_flyer');
          VH.events.emit('cabin:aboard', { stand: c.st.id, gate: c.st.gate });
        }
        this._greet(c, info);
      } else if (!inside && c.inside) c.inside = false;
      if (inside && !c.deckWarned && p.pos.z - c.st.z > DECK - 0.6 && !this.taking) {
        c.deckWarned = true;
        this._say(c, 1, LINES.deck);
      }
      // The doors are due to shut with Jay aboard: airside waits; the crew don't.
      if (A.cabinHold) A.cabinHold(c.st.id, inside && !this.taking);
      c.holding = inside && info.held > 0 ? info.held : 0;
      if (c.holding) this._holdTick(c, info);
      else c.holdSaid = 0;
    }

    /** A gentle hand along the aisle and through the doorways, so their corners don't catch Jay. */
    _assist(c, dt) {
      const p = this.game.player;
      if (p.state !== 'ground' || p.inVehicle || p.frozen || p.pos.y < FL - 0.5 || p.pos.y > FL + 1) return;
      const vx = p.vel.x;
      const vz = p.vel.z;
      const lx = p.pos.x - c.st.x;
      const lz = p.pos.z - c.st.z;
      const k = Math.min(1, dt * 5);
      if (vx * vx + vz * vz < 0.25) {
        // Stopped dead in the aisle while trying to walk (caught on a seat corner, jostled there
        // by people getting off): back to its middle, where nothing catches.
        const inp = this.game.input;
        const mv = inp && inp.moveVector ? inp.moveVector() : null;
        if (mv && Math.hypot(mv.x, mv.y) > 0.3 && lz > -9.5 && lz < 13.6 && Math.abs(lx) < 0.75) p.pos.x -= lx * k;
        return;
      }
      if (lz > -9.5 && lz < 13.6 && Math.abs(lx) < 0.75 && Math.abs(vz) > Math.abs(vx)) p.pos.x -= lx * k; // the aisle
      else if (lx > 1.2 && lx < 4.5 && Math.abs(lz - DOOR.zc) < 1.3 && Math.abs(vx) > Math.abs(vz) * 0.8) p.pos.z -= (lz - DOOR.zc) * k; // the door
      else if (lz > DECK - 1.0 && lz < DECK + 0.6 && Math.abs(lx) < 0.8 && Math.abs(vz) > Math.abs(vx)) p.pos.x -= lx * k; // the flight deck's
    }

    _holdTick(c, info) {
      const t = c.holding;
      if (c.holdSaid < 1 && t > 0.5) {
        c.holdSaid = 1;
        this._say(c, 0, LINES.hold1, true);
      }
      if (c.holdSaid < 2 && t > 9) {
        c.holdSaid = 2;
        const f = info.dep;
        const L = this.game.airportLife;
        const text = 'Would the passenger delaying ' + (f ? f.airline + ' flight ' + f.code + ' to ' + f.city : 'the flight at gate ' + c.st.gate) + ' please leave the aircraft immediately. Thank you.';
        if (L && L._pa) L._pa(text);
      }
      if (c.holdSaid < 3 && t > 18) {
        c.holdSaid = 3;
        this._say(c, 0, LINES.hold2, true);
      }
      if (c.holdSaid < 4 && t > 27) {
        c.holdSaid = 4;
        this._say(c, 1, LINES.hold3, true);
      }
      if (t > HOLD_WALK && !this.walking && !this.taking) {
        this._say(c, 0, LINES.walked, true);
        this.walking = { st: c.st, t: 0, done: false };
        this.game.hud && this.game.hud.setFade(1, 450);
        this.game.player.frozen = true;
      }
    }

    _walkingTick(dt) {
      const w = this.walking;
      w.t += dt;
      if (!w.done && w.t > 0.5) {
        w.done = true;
        this._toGate(w.st, false);
      }
      if (w.t > 0.9) {
        this.game.player.frozen = false;
        this.game.hud && this.game.hud.setFade(0, 700);
        this.walking = null;
      }
    }

    /** Jay into the gate lounge (the crew walked him back, or the cabin's going). */
    _toGate(st, quiet) {
      const g = this.game;
      const p = g.player;
      const T = g.world && g.world.terminal;
      const gate = T && T.gates && T.gates.find((q) => q.stand === st.id);
      const x = gate ? gate.x - 1.6 : st.x + 12.4;
      const z = gate ? gate.door.z + 4.2 : -1239.8;
      p.teleport(x, z, PI, 0.5);
      if (g.cameraRig && g.cameraRig.snapBehind) g.cameraRig.snapBehind(p);
      const A = g.airside;
      if (A && A.cabinHold) A.cabinHold(st.id, false);
      for (const c of this.live) if (c.st === st) c.inside = false;
      if (!quiet) VH.events.emit('notify', { title: 'Back to the gate', text: 'The cabin crew walk Jay back to the gate.', icon: '🛫' });
    }

    // ------------------------------------------------------- the passengers
    /** The seats: how many full for where the flight is, filled back first and emptied front first. */
    _seats(c, info) {
      let kind;
      let n;
      let flight;
      if (!info.deplaned) {
        kind = 'arr';
        flight = info.arr;
        n = Math.round(info.pax);
      } else {
        kind = 'dep';
        flight = info.dep;
        n = info.boarding ? Math.round(info.pax) : 0;
      }
      const total = Math.min(SEATS, flight ? flight.pax : 0);
      if (c.phase !== kind) {
        c.phase = kind;
        c.sat = 0;
        c.stood = 0;
        c.enRoute = 0;
        this._order(c, flight, kind, total);
      }
      n = Math.min(n, total);
      if (kind === 'dep') n = Math.max(n, Math.min(total, c.sat));
      else n = Math.min(n, total - c.stood);
      n = c.panic ? 0 : clamp(n, 0, SEATS);
      if (n === c.shown) return;
      c.shown = n;
      // The ones shown are the first n of the order (boarding) or the last n (deplaning).
      const list = kind === 'dep' ? c.order.slice(0, n) : c.order.slice(c.order.length - n);
      const m = this._m4;
      for (let i = 0; i < list.length; i++) {
        const j = list[i];
        const sp = seatPos(j);
        const lk = c.looks[j];
        m.makeRotationY(lk.yaw).setPosition(sp.x, 0, sp.z);
        c.pax.setMatrixAt(i, m);
        c.attrs.iSkin.setXYZ(i, lk.skin.r, lk.skin.g, lk.skin.b);
        c.attrs.iHair.setXYZ(i, lk.hair.r, lk.hair.g, lk.hair.b);
        c.attrs.iTop.setXYZ(i, lk.top.r, lk.top.g, lk.top.b);
        c.attrs.iBottom.setXYZ(i, lk.bottom.r, lk.bottom.g, lk.bottom.b);
      }
      c.pax.count = list.length;
      c.pax.instanceMatrix.needsUpdate = true;
      for (const k of Object.keys(c.attrs)) c.attrs[k].needsUpdate = true;
    }

    /**
     * Who sits where on this flight: `total` seats taken at random; boarding fills them about
     * back to front, deplaning empties them front to back (the order's first entries go first).
     */
    _order(c, flight, kind, total) {
      const seed = (c.rot * 31 + (kind === 'dep' ? 7 : 3)) | 0;
      const r = rng(seed);
      const all = [];
      for (let j = 0; j < SEATS; j++) all.push(j);
      for (let i = all.length - 1; i > 0; i--) {
        const k = Math.floor(r() * (i + 1));
        [all[i], all[k]] = [all[k], all[i]];
      }
      const taken = all.slice(0, total);
      const row = (j) => Math.floor(j / 6) + r() * 4;
      const key = new Map(taken.map((j) => [j, row(j)]));
      // Boarding: back rows first. Deplaning: the order is who's still there last, so the
      // front rows (low keys) come first in the list and go first.
      taken.sort((a, b) => (kind === 'dep' ? key.get(b) - key.get(a) : key.get(a) - key.get(b)));
      c.order = taken;
      c.looks = c.looks || [];
      const tc = new THREE.Color();
      const lin = (hex) => {
        tc.set(hex);
        return { r: tc.r, g: tc.g, b: tc.b };
      };
      const rl = VH.Crowd && VH.Crowd.randomLook;
      for (let j = 0; j < SEATS; j++) {
        const L = rl ? rl(r) : { skin: 0xc68a63, hair: 0x2a1d14, top: 0x3a6fb0, bottom: 0x2b2f35 };
        c.looks[j] = { skin: lin(L.skin), hair: lin(L.hair), top: lin(r() < 0.5 ? L.top : L.shirt || L.top), bottom: lin(L.bottom), yaw: (r() - 0.5) * 0.25 };
      }
      c.shown = -1;
    }

    // ------------------------------------------------- airportlife.js's way in
    /** A cabin at this stand with its door open? */
    _liveAt(stand) {
      return this.live.find((c) => c.st.id === stand && c.open) || null;
    }

    /**
     * For a boarding traveller at the bridge's mouth: the way on through the door and down the
     * aisle to their row ({ pts, seat }), or null if there's no cabin to walk into.
     */
    boardPath(stand) {
      if (!this.ok) return null;
      const c = this._liveAt(stand);
      if (!c || c.panic || c.phase !== 'dep' || !c.order || this.taking) return null;
      const k = Math.max(c.shown, 0) + (c.enRoute || 0);
      if (k >= c.order.length) return null;
      const seat = c.order[k];
      c.enRoute = (c.enRoute || 0) + 1;
      const sp = seatPos(seat);
      const x0 = c.st.x;
      const z0 = c.st.z;
      return {
        seat,
        pts: [{ x: x0 + 1.55, z: z0 + DOOR.zc }, { x: x0 + 0.35, z: z0 + 14.45 }, { x: x0, z: z0 + 12.9 }, { x: x0, z: z0 + sp.z + 0.25 }],
      };
    }

    /** ...and they've sat down (their figure shows from now on). */
    seated(stand, seat) {
      const c = this.live.find((q) => q.st.id === stand);
      if (!c || c.phase !== 'dep' || !c.order) return;
      c.enRoute = Math.max(0, (c.enRoute || 0) - 1);
      const k = c.order.indexOf(seat);
      if (k >= 0) c.sat = Math.max(c.sat, k + 1);
    }

    /** For an arriving passenger: up out of their seat ({ start }) and along to the door ({ pts }), or null. */
    exitPath(stand) {
      if (!this.ok) return null;
      const c = this._liveAt(stand);
      if (!c || c.phase !== 'arr' || !c.order || c.shown <= 0 || this.taking) return null;
      // The next one to go: the first of those still sitting.
      const list = c.order.slice(c.order.length - c.shown);
      const seat = list[0];
      c.stood++;
      c.shown = -1; // (redrawn next tick, without them)
      const sp = seatPos(seat);
      const x0 = c.st.x;
      const z0 = c.st.z;
      return {
        start: { x: x0 + sp.side * 0.12, y: FL, z: z0 + sp.z + 0.3 },
        pts: [{ x: x0, z: z0 + 12.9 }, { x: x0 + 0.35, z: z0 + 14.45 }, { x: x0 + 1.55, z: z0 + DOOR.zc }, { x: x0 + 2.7, z: z0 + DOOR.zc }],
      };
    }

    // ----------------------------------------------------------- the crew
    _crewIn(c) {
      const g = this.game;
      if (!g.crowd || !VH.Crowd || !VH.Crowd.randomLook) return;
      const x0 = c.st.x;
      const z0 = c.st.z;
      const posts = [
        { x: x0 - 0.72, z: z0 + 15.3, yaw: PI / 2 - 0.3 }, // across from the door, greeting
        { x: x0 - 0.74, z: z0 + 14.0, yaw: -PI / 2 }, //       at the galley counter
      ];
      const trim = c.color || 0x1d2a44;
      for (const post of posts) {
        const L = VH.Crowd.randomLook();
        Object.assign(L, { top: 0x1d2a44, trim, shirt: 0xf4f4f2, bottom: 0x1d2a44, shoes: 0x161616, cap: false, bag: false });
        const brain = new CrewBrain(this, c, post);
        const a = g.crowd.spawn(post.x, post.z, { look: L, faction: 'civilian', role: 'airport', persistent: true, heading: post.yaw, y: FL, health: 60 });
        a.brain = brain;
        a.name = 'Cabin crew';
        c.crew.push(a);
      }
    }

    _crewTick(c, info) {
      // The greeter turns to face Jay once he's in.
      const a = c.crew[0];
      if (a && a.brain && !a.brain.flee) {
        const p = this.game.player;
        const d = Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
        a.brain.face = d < 4 && Math.abs(p.pos.y - a.pos.y) < 1 ? Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z) : undefined;
      }
      void info;
    }

    /** The crew run for it: out of the door and up the bridge. */
    _crewFlee(c) {
      const way = this._wayOff(c.st);
      c.crew.forEach((a, i) => {
        if (!a.brain || a.brain.flee) return;
        a.brain.flee = [{ x: c.st.x + 0.2, z: c.st.z + DOOR.zc - 0.3 + i * 0.6 }].concat(way);
        a.brain.pi = 0;
      });
    }

    /** From the door, up the bridge and into the terminal. */
    _wayOff(st) {
      const T = this.game.world && this.game.world.terminal;
      const gate = T && T.gates && T.gates.find((q) => q.stand === st.id);
      const pts = [{ x: st.x + 1.6, z: st.door.z }, { x: st.x + 2.8, z: st.door.z }];
      if (gate && gate.bridge) for (const q of gate.bridge.slice().reverse()) pts.push({ x: q.x, z: q.z });
      return pts;
    }

    _greet(c, info) {
      if (info.closed || !info.deplaned) {
        this._say(c, 0, info.deplaned ? LINES.pass : LINES.deplane);
        return;
      }
      if (!info.boarding) {
        this._say(c, 0, LINES.empty);
        return;
      }
      this._say(c, 0, Math.random() < 0.55 ? LINES.welcome : LINES.pass);
    }

    /** A line from one of the crew (0 the door, 1 the galley), as an ambient subtitle. */
    _say(c, who, lines, force) {
      if (!force && this._sayT > 0) return;
      const a = c.crew[who] || c.crew[0];
      if (!a || a.dead || a.removed || (a.brain && a.brain.flee && lines !== LINES.flee && lines !== LINES.shots)) return;
      const d = this.game.dialogue;
      if (!d || !d.play) return;
      if (!this._cast && d.addCast) {
        d.addCast({
          cabin_crew: { name: 'Cabin crew', voice: { gender: 'female', pitch: 1.1, rate: 1.05 } },
          cabin_crew2: { name: 'Cabin crew', voice: { gender: 'male', pitch: 1.0, rate: 1.05 } },
        });
        this._cast = true;
      }
      this._sayT = 6;
      if (a.brain) a.brain.talkT = 2.2;
      // Something that matters now cuts short the crew's last line (and any still waiting).
      const ours = (job) => job && job.mode === 'ambient' && job.lines && job.lines[0] && /^cabin_crew/.test(job.lines[0][0]);
      if (force && d.queue && d._finishCurrent) {
        d.queue = d.queue.filter((q) => !ours(q) || (q.resolve(), false));
        if (ours(d.current)) d._finishCurrent(true);
      }
      d.play([[who === 0 ? 'cabin_crew' : 'cabin_crew2', lines[Math.floor(Math.random() * lines.length)]]], { mode: 'ambient' });
    }

    // ------------------------------------------------------ the flight deck
    _takeControls(stand) {
      const g = this.game;
      if (this.taking || this.walking || g.player.inVehicle) return;
      const c = this.live.find((q) => q.st.id === stand);
      if (!c || c.disabled || !this._jayIn(c)) return;
      this.taking = { c, t: 0, done: false };
      g.player.frozen = true;
      this._crewFlee(c);
      this._say(c, 1, LINES.flee, true);
      if (g.hud) g.hud.setFade(1, 420);
    }

    _takingTick(dt) {
      const T = this.taking;
      T.t += dt;
      if (!T.done && T.t > 0.5) {
        T.done = true;
        this._swap(T.c);
      }
      if (T.t > 1.0) {
        if (this.game.hud) this.game.hud.setFade(0, 800);
        this.taking = null;
      }
    }

    /** The scripted airliner off the stand, a flyable one in its place with Jay at the controls. */
    _swap(c) {
      const g = this.game;
      const A = g.airside;
      const p = g.player;
      const st = c.st;
      const info = A.cabinPlane(st.id);
      // (Shot up while the screen was going dark: not hers to take now.)
      if (info && info.disabled) {
        p.frozen = false;
        return;
      }
      // Everyone off: the runners up the bridge, the crew already going.
      this._evacuate(c);
      const crew = c.crew;
      c.crew = [];
      this._drop(c);
      // (its crew keep running: they belonged to the cabin, now they're on their own)
      for (const a of crew) if (a.brain) a.brain.cab = null;
      p.frozen = false;
      const pose = A.cabinTake ? A.cabinTake(st.id) : null;
      if (!pose) return;
      // Turned round to face the taxilane (she can't back out), and back from the bridge so
      // the tailplane clears it.
      const yaw = (pose.yaw || 0) + PI;
      const x = pose.x - Math.sin(pose.yaw || 0) * 8;
      const z = pose.z - Math.cos(pose.yaw || 0) * 8;
      const v = g.vehicles.spawn('albatross', x, z, yaw, { color: pose.color });
      v.persistent = true;
      const quiet = g.missions && g.missions.suppressHeat;
      g.vehicles.beginEnter({ v, side: 1, x: v.pos.x, z: v.pos.z });
      g.vehicles._finishEnter();
      if (g.cameraRig && g.cameraRig.snapToCar) g.cameraRig.snapToCar(v);
      this.hijacked = { stand: st.id, v, t: 0 };
      this.taken++;
      if (g.achievements && g.achievements.unlock) g.achievements.unlock('captain_speaking');
      // The police take a dim view.
      const pol = g.police;
      if (pol && !quiet) {
        pol.crime('hijack', x, z);
        if (pol.level < 3) pol.setLevel(3, 'hijack');
        if (pol._sawPlayer) pol._sawPlayer();
        if (pol._dispatch) pol._dispatch('report', { kind: 'hijack', x, z, heat: 3 });
      }
      const f = info && info.dep;
      VH.events.emit('cabin:hijack', { stand: st.id, gate: st.gate, flight: f || null, x, z, v });
      VH.events.emit('notify', { title: 'Captain speaking', text: (pose.airline ? 'The ' + pose.airline + ' jet' : 'The jet') + ' is yours. W for power, A and D to steer, Space to lift the nose.', icon: '✈' });
    }

    /** A bullet fired in (or through) a cabin: the passengers and crew run for it. */
    _shots(e) {
      if (!this.ok || !e || !this.live.length) return;
      for (const c of this.live) {
        if (c.panic || !c.open) continue;
        // Its middle, near enough: from the shooter along the shot, the nearest point to the cabin's axis.
        const ax = c.st.x;
        const mz = c.st.z + 2;
        const t = clamp((ax - e.ox) * e.dx + (mz - e.oz) * e.dz, 0, e.dist || 0);
        const px = e.ox + e.dx * t;
        const py = e.oy + e.dy * t;
        const pz = e.oz + e.dz * t;
        if (Math.abs(px - ax) < 2.1 && py > FL - 0.2 && py < CEIL && pz > c.st.z + AFT && pz < c.st.z + NOSE) this._panic(c);
      }
    }

    _panic(c, runners) {
      c.panic = true;
      if (runners !== false) this._evacuate(c);
      c.pax.count = 0;
      c.shown = 0;
      this._crewFlee(c);
      this._say(c, 0, LINES.shots, true);
    }

    /** Passengers off: the seats empty, and a stream of them runs up the bridge into the terminal. */
    _evacuate(c) {
      const was = c.pax.count;
      c.pax.count = 0;
      const L = this.game.airportLife;
      if (!L || typeof L.cabinRunners !== 'function') return;
      const n = Math.min(10, Math.max(3, Math.round(was / 12)));
      L.cabinRunners(c.st.gate, n, { x: c.st.x + 1.4, z: c.st.door.z, y: FL });
    }

    _hijackTick() {
      const h = this.hijacked;
      const A = this.game.airside;
      const v = h.v;
      const st = A.stands().find((q) => q.id === h.stand);
      const gone = !v || v.removed || v.wrecked || !st || Math.hypot(v.pos.x - st.x, v.pos.z - st.z) > 70;
      if (gone) {
        if (A.cabinBlock) A.cabinBlock(h.stand, false);
        this.hijacked = null;
      }
    }

    // ------------------------------------------------------------ lifecycle
    _clearAll() {
      for (const c of this.live.slice()) this._drop(c);
      for (const s of this.standCols.values()) {
        for (const c of s.cols) parkCol(c);
        s.on = false;
        if (s.sill && s.sillParked) unparkCol(s.sill);
        s.sillParked = false;
      }
      for (const item of this.items.values()) item.enabled = false;
      if (this.taking || this.walking) {
        this.game.player.frozen = false;
        if (this.game.hud) this.game.hud.setFade(0, 0);
      }
      this.taking = null;
      this.walking = null;
      if (this.hijacked && this.game.airside && this.game.airside.cabinBlock) this.game.airside.cabinBlock(this.hijacked.stand, false);
      this.hijacked = null;
      if (this.aboard) this._camera(false);
      this.aboard = false;
    }

    reset() {
      this._reboard = 0;
      if (!this.ok) return;
      this._clearAll();
    }

    stop() {
      if (!this.ok) return;
      this._clearAll();
    }

    blips() {}

    stats() {
      const out = [];
      if (this.boarded > 0) out.push(['Airliners boarded', String(this.boarded)]);
      if (this.taken > 0) out.push(['Airliners taken from the gate', String(this.taken)]);
      return out;
    }

    serialize() {
      const on = this.ok && this.aboard ? this._jayCabin() : null;
      return { boarded: this.boarded, taken: this.taken, aboard: on ? on.st.id : undefined };
    }

    load(d) {
      this.boarded = d && typeof d.boarded === 'number' ? d.boarded : 0;
      this.taken = d && typeof d.taken === 'number' ? d.taken : 0;
      // Saved aboard: the cabin isn't there yet on the way back in, so he starts at that gate.
      this._reboard = d && d.aboard ? d.aboard : 0;
    }
  }

  VH.Cabin = Cabin;
  VH.Cabin.seatPos = seatPos; // for tests
  VH.Cabin.mats = mats;
})();
