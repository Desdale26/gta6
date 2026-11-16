/*
 * districts/thebowl.js — The Bowl (VICEHAVEN 3.0): sport and shows in the
 * far south-east.
 *
 *   Southbay Speedway   a real oval you can race on: an 18 m track with red
 *                       and white kerbs, a catch fence, the main stand with
 *                       the commentary box and a vehicle tunnel under it, the
 *                       pit lane and garages, the winners' enclosure with the
 *                       honours board, a back stand and the back gate.
 *   Mariner Stadium     the bowl with its marathon gate, the apron road round
 *                       it, the players' entrance and the vast car park (with
 *                       the stunt crew's bus jump).
 *   Southbay Expo Hall  the long exhibition hall on the coast road.
 *
 * Racing: VH.Circuits holds closed circuits. missions.js asks it whether a
 * race's checkpoints lie on one; if so the rivals line up on the circuit's
 * grid and follow its racing line (CircuitDriver) instead of the street
 * lanes. Everything else draws into the chunk builders through VH.WNKit.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const D = 'thebowl';
  const PI = Math.PI;
  const F = () => VH.COLLIDE;
  const K = () => VH.WNKit;
  const col = (h) => (Array.isArray(h) ? h : VH.col(h));

  // ------------------------------------------------------------ the oval
  // Plot 13..321 x 1477..1749. Two straights along X joined by two half
  // circles; the race runs anticlockwise on the map (west along the main
  // straight in front of the stand, turn one at the west end).
  const SP = {
    x0: 13, x1: 321, z0: 1477, z1: 1749,
    cz: 1613, xw: 105, xe: 229, R: 70, HW: 9,
    lineX: 167,
    stand: { x0: 52, x1: 282, zf: 1531, zb: 1490 },
    tunnel: { x0: 118, x1: 128, h: 4.8 },
    pits: { x0: 110, x1: 224, z0: 1553.4, z1: 1563.5, wallX0: 118, wallX1: 216 },
    garages: { z0: 1565, z1: 1579, a: [120, 160], b: [174, 214] },
    enclosure: { x0: 160, x1: 174, z0: 1565, z1: 1579 },
    backStand: { x0: 100, x1: 205, z0: 1697, z1: 1722 },
    backGate: { x0: 214, x1: 226 },
  };
  SP.zn = SP.cz - SP.R; // north straight centre line (1543)
  SP.zs = SP.cz + SP.R; // south straight (1683)
  const STR = SP.xe - SP.xw; // straight length (124)
  const ARC = PI * SP.R;
  const HALF = SP.lineX - SP.xw; // the line to the end of the main straight (62)
  const LEN = 2 * STR + 2 * ARC;

  /** Point on the oval at distance s from the line (race direction), offset o outwards. */
  function trackAt(s, o, out) {
    out = out || {};
    s = ((s % LEN) + LEN) % LEN;
    let x, z, hx, hz;
    const R = SP.R;
    if (s < HALF) {
      x = SP.lineX - s; z = SP.zn; hx = -1; hz = 0;
    } else if (s < HALF + ARC) {
      const t = (s - HALF) / R;
      x = SP.xw - R * Math.sin(t); z = SP.cz - R * Math.cos(t); hx = -Math.cos(t); hz = Math.sin(t);
    } else if (s < HALF + ARC + STR) {
      x = SP.xw + (s - HALF - ARC); z = SP.zs; hx = 1; hz = 0;
    } else if (s < HALF + 2 * ARC + STR) {
      const t = (s - HALF - ARC - STR) / R;
      x = SP.xe + R * Math.sin(t); z = SP.cz + R * Math.cos(t); hx = Math.cos(t); hz = -Math.sin(t);
    } else {
      x = SP.xe - (s - HALF - 2 * ARC - STR); z = SP.zn; hx = -1; hz = 0;
    }
    // Outward normal: the inside is on the left.
    const nx = -hz, nz = hx;
    out.x = x + nx * (o || 0);
    out.z = z + nz * (o || 0);
    out.hx = hx; out.hz = hz; out.nx = nx; out.nz = nz;
    out.curved = (s >= HALF && s < HALF + ARC) || (s >= HALF + ARC + STR && s < HALF + 2 * ARC + STR);
    return out;
  }
  /** s of the track at the start of each piece (for sweeping in steps that land on the joints). */
  const JOINTS = [0, HALF, HALF + ARC, HALF + ARC + STR, HALF + 2 * ARC + STR, LEN];

  const _a = {}, _b = {}, _c = {}, _d = {};
  /** A flat strip of the track from s0 to s1 between offsets o0 and o1, in steps of at most ds. */
  function strip(world, surf, s0, s1, o0, o1, y, hex, ds, alt) {
    const n = Math.max(1, Math.ceil((s1 - s0) / (ds || 4)));
    for (let i = 0; i < n; i++) {
      const sa = s0 + ((s1 - s0) * i) / n;
      const sb = s0 + ((s1 - s0) * (i + 1)) / n;
      trackAt(sa, o0, _a); trackAt(sa, o1, _b); trackAt(sb, o1, _c); trackAt(sb, o0, _d);
      const ctx = world.ctxAt((_a.x + _c.x) / 2, (_a.z + _c.z) / 2);
      const c = col(alt ? alt(i) : hex);
      quadUp(ctx[surf], [_a.x, y, _a.z], [_b.x, y, _b.z], [_c.x, y, _c.z], [_d.x, y, _d.z], c);
    }
  }
  /** A horizontal quad facing up whatever the winding. */
  function quadUp(surf, p0, p1, p2, p3, c) {
    const ux = p1[0] - p0[0], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vz = p2[2] - p0[2];
    const ny = uz * vx - ux * vz;
    surf.polygon(ny >= 0 ? [p0, p1, p2, p3] : [p3, p2, p1, p0], c);
  }
  /** Sweep a piece in steps along the oval between joints: fn(sa, sb) for each step. */
  function sweep(s0, s1, ds, fn) {
    const cuts = [s0];
    for (const j of JOINTS) if (j > s0 + 1e-6 && j < s1 - 1e-6) cuts.push(j);
    cuts.push(s1);
    for (let k = 0; k < cuts.length - 1; k++) {
      const a = cuts[k], b = cuts[k + 1];
      const n = Math.max(1, Math.ceil((b - a) / ds));
      for (let i = 0; i < n; i++) fn(a + ((b - a) * i) / n, a + ((b - a) * (i + 1)) / n, k);
    }
  }
  /** A wall along the oval at offset o (thickness t) from s0 to s1: drawn and solid. */
  function ovalWall(world, s0, s1, o, t, y0, y1, hex, tag, flags, surfName, step) {
    sweep(s0, s1, step || 5, (sa, sb) => {
      trackAt(sa, o, _a);
      trackAt(sb, o, _b);
      const cx = (_a.x + _b.x) / 2, cz = (_a.z + _b.z) / 2;
      const len = Math.hypot(_b.x - _a.x, _b.z - _a.z);
      const yaw = Math.atan2(_b.x - _a.x, _b.z - _a.z);
      const ctx = world.ctxAt(cx, cz);
      const c = col(typeof hex === 'function' ? hex(sa) : hex);
      ctx[surfName || 'concrete'].orientedBox(cx, cz, t / 2, len / 2 + 0.06, yaw, y0, y1, c);
      world.physics.addOrientedBox(cx, cz, t / 2, len / 2 + 0.15, yaw, 0, y1, tag || 'wall', flags === undefined ? F().ALL : flags);
    });
  }
  /** s of the north straight at world x (east of the line counts back from LEN). */
  const sNorth = (x) => (x <= SP.lineX ? SP.lineX - x : LEN - (x - SP.lineX));
  const sSouth = (x) => HALF + ARC + (x - SP.xw);

  function buildSpeedway(world) {
    const W = K();
    const yT = KERB + 0.012;
    const yM = KERB + 0.024;
    // --- the track, its run-off and the kerbs
    strip(world, 'asphaltTop', 0, LEN, -SP.HW, SP.HW, yT, 0xb2b2b4, 4);
    strip(world, 'asphaltTop', 0, LEN, SP.HW, SP.HW + 1, yT, 0x9a9a98, 4);
    // White edge lines on the straights, red and white kerbs round the turns (inside and out).
    const kerbAlt = (i) => (i % 2 ? 0xf2f2ee : 0xd42a26);
    for (const [a, b] of [[HALF, HALF + ARC], [HALF + ARC + STR, HALF + 2 * ARC + STR]]) {
      strip(world, 'marks', a - 6, b + 6, -SP.HW, -SP.HW + 1.4, yM, 0, 3, kerbAlt);
      strip(world, 'marks', a + 20, b - 20, SP.HW - 1.4, SP.HW, yM, 0, 3, kerbAlt);
    }
    for (const [a, b] of [[0, HALF - 6], [HALF + ARC + 6, HALF + ARC + STR - 6], [HALF + 2 * ARC + STR + 6, LEN]]) {
      strip(world, 'marks', a, b, -SP.HW, -SP.HW + 0.35, yM, 0xf4f4ef, 10);
      strip(world, 'marks', a, b, SP.HW - 0.35, SP.HW, yM, 0xf4f4ef, 10);
    }
    // The start-finish line (a chequer) and the grid boxes behind it.
    const ctxL = world.ctxAt(SP.lineX, SP.zn);
    for (let k = 0; k < 18; k++) {
      for (let r = 0; r < 2; r++) {
        const z0 = SP.zn - SP.HW + k;
        ctxL.marks.topRect(SP.lineX - 1 + r, z0, SP.lineX + r, z0 + 1, yM, col((k + r) % 2 ? 0x1b1b1d : 0xf4f4ef));
      }
    }
    for (let j = 0; j < 8; j++) {
      const g = gridSlot(j);
      const ctx = world.ctxAt(g.x, g.z);
      // A white bracket open towards the line: a bar behind the car and two short sides.
      ctx.marks.topRect(g.x + 2.6, g.z - 1.6, g.x + 2.9, g.z + 1.6, yM, col(0xf4f4ef));
      ctx.marks.topRect(g.x + 0.8, g.z - 1.6, g.x + 2.9, g.z - 1.3, yM, col(0xf4f4ef));
      ctx.marks.topRect(g.x + 0.8, g.z + 1.3, g.x + 2.9, g.z + 1.6, yM, col(0xf4f4ef));
    }

    // --- the infield: grass, the pit lane, a service road
    const ctxI = world.ctxAt(167, 1620);
    const P = SP.pits;
    const G = SP.garages;
    W.pave(world, P.x0, P.z0, P.x1, P.z1, 0xa8a8aa, 'asphaltTop', yT);
    W.mark(world, P.x0 + 4, P.z1 - 0.3, P.x1 - 4, P.z1 - 0.1, 0xf4f4ef);
    W.mark(world, P.x0 + 4, P.z0 + 4.8, P.x1 - 4, P.z0 + 5.0, 0xf2c230);
    const grass = (x0, z0, x1, z1) => {
      W.pave(world, x0, z0, x1, z1, 0xffffff, 'grassTop', yT);
      world.addLawn(x0, z0, x1, z1);
    };
    grass(SP.xw, G.z1 + 3, SP.xe, SP.zs - SP.HW - 1);
    grass(SP.xw, P.z1 + 0.5, G.a[0] - 1, G.z1 + 3);
    grass(G.b[1] + 1, P.z1 + 0.5, SP.xe, G.z1 + 3);
    W.pave(world, G.a[0] - 1, G.z1, G.b[1] + 1, G.z1 + 3, 0xa8a8aa, 'asphaltTop', yT);
    // The half-disc infields of the two turns, and the grass strip inside the kerb.
    for (const east of [false, true]) {
      const cx = east ? SP.xe : SP.xw;
      const r = SP.R - SP.HW - 0.05;
      const n = 28;
      for (let i = 0; i < n; i++) {
        const t0 = (i / n) * PI, t1 = ((i + 1) / n) * PI;
        const s = east ? 1 : -1;
        const p0 = [cx, yT, SP.cz];
        const p1 = [cx + s * r * Math.sin(t0), yT, SP.cz - s * r * Math.cos(t0)];
        const p2 = [cx + s * r * Math.sin(t1), yT, SP.cz - s * r * Math.cos(t1)];
        const ctx = world.ctxAt((p1[0] + p2[0]) / 2, (p1[2] + p2[2]) / 2);
        const ux = p1[0] - p0[0], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vz = p2[2] - p0[2];
        ctx.grassTop.polygon(uz * vx - ux * vz >= 0 ? [p0, p1, p2] : [p2, p1, p0], col(0xffffff));
      }
      world.addLawn(cx - (east ? 0 : r), SP.cz - r, cx + (east ? r : 0), SP.cz + r);
    }

    // --- walls: the outer wall with its catch fence, the pit wall, the tyre barriers
    const T = SP.tunnel;
    const BG = SP.backGate;
    const outerO = SP.HW + 1;
    const gapsOuter = [[sNorth(T.x1), sNorth(T.x0)], [sSouth(BG.x0), sSouth(BG.x1)]];
    const pieces = [];
    let cur = 0;
    for (const [g0, g1] of gapsOuter.slice().sort((p, q) => p[0] - q[0])) {
      pieces.push([cur, g0]);
      cur = g1;
    }
    pieces.push([cur, LEN]);
    const fenceC = col(0x6f767d);
    for (const [a, b] of pieces) {
      // Concrete wall 1.25 m with a painted top band, then the catch fence to 4.3 m (solid to cars and people; shots pass).
      ovalWall(world, a, b, outerO + 0.3, 0.6, 0, KERB + 1.25, (s) => (Math.floor(s / 12) % 2 ? 0xe8e4da : 0xd4d0c6), 'wall', F().SOLID | F().SHOTS | F().CAMERA);
      ovalWall(world, a, b, outerO + 0.3, 0.64, KERB + 1.25, KERB + 1.45, 0x1f6f8a, 'wall', F().SOLID, 'prop');
      world.physics && sweep(a, b, 6, (sa, sb) => {
        trackAt(sa, outerO + 0.45, _a);
        trackAt(sb, outerO + 0.45, _b);
        const ctx = world.ctxAt(_a.x, _a.z);
        ctx.prop.box(_a.x - 0.07, KERB + 1.4, _a.z - 0.07, _a.x + 0.07, KERB + 4.4, _a.z + 0.07, fenceC);
        for (const y of [2.2, 3.1, 4.0]) W.beam(ctx.prop, _a.x, KERB + y, _a.z, _b.x, KERB + y, _b.z, 0.05, fenceC);
        const cx = (_a.x + _b.x) / 2, cz = (_a.z + _b.z) / 2;
        world.physics.addOrientedBox(cx, cz, 0.12, Math.hypot(_b.x - _a.x, _b.z - _a.z) / 2 + 0.1, Math.atan2(_b.x - _a.x, _b.z - _a.z), KERB + 1.4, KERB + 4.4, 'fence', F().SOLID);
      });
    }
    // Gate posts at the two openings.
    for (const [a, b] of gapsOuter) {
      for (const s of [a, b]) {
        trackAt(s, outerO + 0.3, _a);
        W.solid(world, world.ctxAt(_a.x, _a.z).concrete, _a.x - 0.5, 0, _a.z - 0.5, _a.x + 0.5, KERB + 4.6, _a.z + 0.5, 0xe8e4da, null, 'wall');
      }
    }
    // The pit wall (inside the main straight), with its gantry posts.
    const pitWall = [[0, sNorth(P.wallX0)], [sNorth(P.wallX1), LEN]];
    for (const [a, b] of pitWall) {
      ovalWall(world, a, b, -SP.HW - 1.0, 0.8, 0, KERB + 1.1, 0xe8e4da, 'wall', F().ALL, 'concrete', 6);
      ovalWall(world, a, b, -SP.HW - 1.0, 0.84, KERB + 1.1, KERB + 1.25, 0xd42a26, 'wall', F().SOLID, 'prop', 6);
    }
    // Tyre barriers round the inside of the turns and the back straight (black and white bands).
    const tyre = (s) => (Math.floor(s / 4) % 2 ? 0x1c1c1e : 0xeeeeea);
    const tW0 = HALF + 0.3 * SP.R;
    const tE1 = HALF + ARC + STR + (PI - 0.3) * SP.R;
    ovalWall(world, tW0, tE1, -SP.HW - 1.2, 1.0, 0, KERB + 0.95, tyre, 'tyres', F().ALL, 'propMatte', 4);

    // --- the main stand, the commentary box and the tunnel under it
    buildMainStand(world);
    buildPitsAndEnclosure(world);
    buildBackStand(world);

    // --- floodlights, the plaza, signs
    const masts = [[40, 1528], [294, 1528], [32, 1700], [302, 1700], [167, 1712], [90, 1600], [244, 1600]];
    for (const [x, z] of masts) floodMast(world, x, z, 26, SP.lineX, SP.cz);
    // The masts light the track at night (fx.js floodlight pools: one instanced mesh for the lot).
    const pools = world.floodlights || (world.floodlights = []);
    for (let s = 0; s < LEN; s += 20) {
      trackAt(s, 0, _a);
      pools.push({ x: _a.x, z: _a.z, r: 18, y: KERB + 0.03, strength: 0.7, tint: [1.15, 1.08, 0.95] });
    }
    for (const x of [130, 167, 204]) pools.push({ x, z: (SP.pits.z0 + SP.garages.z1) / 2, r: 16, y: KERB + 0.03, strength: 0.6 });
    // The plaza along Foundry Road: turnstile booths either side of the tunnel mouth.
    const S = SP.stand;
    W.pave(world, S.x0, SP.z0 + 1, S.x1, S.zb, 0xd8d2c4, 'plazaTop');
    for (const bx of [T.x0 - 14, T.x0 - 8, T.x1 + 3, T.x1 + 9]) booth(world, bx, S.zb - 5.5, 0x1f6f8a);
    world.addProp('streetlight', S.x0 + 4, KERB, SP.z0 + 3, PI, 1);
    world.addProp('streetlight', S.x1 - 4, KERB, SP.z0 + 3, PI, 1);
    world.addProp('streetlight', 82, KERB, SP.z0 + 3, PI, 1);
    world.addProp('streetlight', 252, KERB, SP.z0 + 3, PI, 1);
    W.sign(world, { x: (T.x0 + T.x1) / 2, y: KERB + 8.4, z: S.zb - 0.12, yaw: PI, w: 22, h: 3.2, lines: ['SOUTHBAY SPEEDWAY'], style: 'neon', oneSided: true, flat: false, colors: { bg: ['#10324a', '#1f6f8a'], fg: '#ffb43a', glow: '#ff8a1f', outline: '#ffd27a' } });
    W.sign(world, { x: SP.x0 + 3, y: KERB + 4.4, z: 1560, yaw: -PI / 2, w: 10, h: 3.4, lines: ['SOUTHBAY SPEEDWAY', 'RACING EVERY SUMMER SATURDAY'], style: 'monolith', posts: true, colors: { bg: ['#10324a', '#1f6f8a'], fg: '#ffffff' } });
    // The back road from the back gate to the South Coast Highway.
    W.pave(world, BG.x0, SP.zs + SP.HW + 1.6, BG.x1, SP.z1, 0xa8a8aa, 'asphaltTop', yT);
    W.sign(world, { x: BG.x1 + 2, y: KERB + 2.3, z: SP.z1 - 6, yaw: PI / 2, w: 3.6, h: 1.4, lines: ['SERVICE GATE', 'NO ENTRY ON RACE DAYS'], style: 'info', posts: true });
    world.addProp('streetlight', BG.x1 + 2, KERB, SP.z1 - 20, -PI / 2, 1);
  }

  /** A floodlight mast with a lamp bank facing the middle of the oval. */
  function floodMast(world, x, z, h, tx, tz) {
    const ctx = world.ctxAt(x, z);
    const W = K();
    ctx.prop.cylinder(x, KERB, z, 0.55, 0.32, h, 8, col(0x8a9097), false);
    world.physics.addBox(x - 0.5, 0, z - 0.5, x + 0.5, KERB + h, z + 0.5, 'pole', F().ALL);
    const yaw = Math.atan2(tx - x, tz - z);
    ctx.prop.orientedBox(x, z, 3.2, 0.5, yaw, KERB + h, KERB + h + 3.2, col(0x3a3f45));
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (let r = 0; r < 3; r++) {
      for (let c = -2; c <= 2; c++) {
        const px = x + fx * 0.55 + Math.cos(yaw) * c * 1.15;
        const pz = z + fz * 0.55 - Math.sin(yaw) * c * 1.15;
        ctx.screen.box(px - 0.4, KERB + h + 0.4 + r * 0.95, pz - 0.4, px + 0.4, KERB + h + 1.1 + r * 0.95, pz + 0.4, VH.col(0xfff4d8, 2.6));
      }
    }
    if (ctx.addBeacon) ctx.addBeacon(x, KERB + h + 3.6, z);
  }

  /** A small ticket booth (solid). */
  function booth(world, x, z, hex) {
    const W = K();
    const ctx = world.ctxAt(x, z);
    W.solid(world, ctx.concrete, x - 1.6, KERB, z - 1.4, x + 1.6, KERB + 2.6, z + 1.4, 0xece6d8, null, 'building');
    ctx.prop.box(x - 1.8, KERB + 2.6, z - 1.6, x + 1.8, KERB + 2.9, z + 1.6, col(hex));
    ctx.screen.box(x - 1.1, KERB + 1.1, z - 1.45, x + 1.1, KERB + 2.1, z - 1.4, VH.col(0xbfe4ff, 1.4));
  }

  /**
   * The way up into the main stand: a long stair outside each end wall from the
   * plaza to a landing at the back walkway (through the doorway in the end
   * wall), and aisle stairs down the tiers from the walkway to the front row.
   */
  function buildStandAccess(world, yBack, depth, rise, tiers) {
    const W = K();
    const S = SP.stand;
    const zBot = S.zf - 0.5, zTop = S.zb + 4.6, len = zBot - zTop;
    for (const side of [-1, 1]) {
      const xw = side < 0 ? S.x0 - 0.6 : S.x1 + 0.6; // the end wall's outer face
      const xs = xw + side * 1.1, xo = xw + side * 2.2; // the stair's centre and outer edge
      const ctx = world.ctxAt(xs, (S.zb + S.zf) / 2);
      W.stairs(world, ctx.concrete, xs, zBot, 'n', len, 2.2, KERB, yBack, 0xcfcabd, { rails: false, tag: 'stairs' });
      // The landing, its rails (open to the stair and to the doorway).
      W.deck(world, ctx.concrete, Math.min(xw, xo), S.zb - 0.6, Math.max(xw, xo), zTop + 0.05, yBack, 0xcfcabd, 'concrete', 0.4);
      for (const [a0, a1, b0, b1] of [[xw, S.zb - 0.6, xo, S.zb - 0.6], [xo, S.zb - 0.6, xo, zTop]]) {
        const c0 = Math.min(a0, b0) - 0.05, c1 = Math.max(a0, b0) + 0.05, e0 = Math.min(a1, b1) - 0.05, e1 = Math.max(a1, b1) + 0.05;
        ctx.prop.box(c0, yBack + 0.95, e0, c1, yBack + 1.05, e1, col(0x3f454c));
        world.physics.addBox(c0, yBack - 0.4, e0, c1, yBack + 1.05, e1, 'railing', F().SOLID | F().SHOTS);
      }
      for (const z of [S.zb - 0.6, zTop]) ctx.prop.box(xo - 0.04, yBack, z - 0.04, xo + 0.04, yBack + 1.0, z + 0.04, col(0x3f454c));
      // The stair's outer rail: a handrail on posts, solid in short runs that follow the slope.
      W.beam(ctx.prop, xo, KERB + 1.0, zBot, xo, yBack + 1.0, zTop, 0.06, 0x3f454c);
      const n = Math.ceil(len / 3);
      for (let k = 0; k <= n; k++) {
        const z = zBot - (len * k) / n, y = KERB + ((yBack - KERB) * k) / n;
        ctx.prop.box(xo - 0.04, y, z - 0.04, xo + 0.04, y + 1.0, z + 0.04, col(0x3f454c));
        if (k < n) {
          const z1 = zBot - (len * (k + 1)) / n, y1 = KERB + ((yBack - KERB) * (k + 1)) / n;
          world.physics.addBox(xo - 0.06, Math.max(0, y - 0.6), z1, xo + 0.06, y1 + 1.0, z, 'railing', F().SOLID | F().SHOTS);
        }
      }
      // A sign at the foot: the seats are up here.
      W.sign(world, { x: xw + side * 0.05, y: KERB + 5.2, z: zBot - 8, yaw: side * PI / 2, w: 6, h: 1.4, lines: ['MAIN STAND', 'ALL SEATS UP THE STAIRS'], style: 'info', oneSided: true, colors: { bg: ['#1f6f8a', '#1f4f7a'], fg: '#ffffff', bar: '#f2c230' } });
    }
    // Aisles down the tiers, between the roof columns (the steps cover the seats in their way).
    for (const xa of [85, 139, 193, 247]) {
      const ctx = world.ctxAt(xa, (S.zb + S.zf) / 2);
      const y0 = KERB + 1.4 + rise, y1 = KERB + 1.4 + tiers * rise;
      W.stairs(world, ctx.concrete, xa, S.zf, 'n', (tiers - 1) * depth, 1.4, y0, y1, 0xcfcabd, { rails: false, tag: 'stairs' });
    }
  }

  /**
   * The main stand: tiers of seats from the outer wall up to a back wall on
   * Foundry Road, a roof on slim columns, the glass commentary box over the
   * line, and the vehicle tunnel through it into the circuit.
   */
  function buildMainStand(world) {
    const W = K();
    const S = SP.stand;
    const T = SP.tunnel;
    const tiers = 10;
    const depth = (S.zf - S.zb - 4) / tiers; // a walkway behind the back row
    const rise = 1.25;
    const seatA = 0xe8762a, seatB = 0x1f4f7a;
    // Two halves either side of the tunnel; over the tunnel only the tiers above its roof.
    const halves = [[S.x0, T.x0], [T.x1, S.x1]];
    for (let k = 0; k < tiers; k++) {
      const zf = S.zf - k * depth; // front edge of this tier
      const yTop = KERB + 1.4 + (k + 1) * rise;
      for (const [x0, x1] of halves) {
        for (let x = x0; x < x1 - 1e-6; x += 40) {
          const xb = Math.min(x1, x + 40);
          const ctx = world.ctxAt((x + xb) / 2, zf);
          ctx.concrete.box(x, yTop - rise, zf - depth, xb, yTop, zf, col(0xd9d4c8), { skip: { n: true } });
          // Seat rows: a coloured band on each tier's front half, blocks of colour along it.
          for (let sx = x; sx < xb - 1e-6; sx += 10) {
            const ex = Math.min(xb, sx + 10);
            const c = Math.floor((sx - S.x0) / 10 + k / 3) % 3 === 0 ? seatB : seatA;
            ctx.prop.box(sx + 0.2, yTop, zf - depth + 0.4, ex - 0.2, yTop + 0.45, zf - depth + 1.0, col(c));
          }
        }
      }
      // The tiers are solid (stepped), so a car or a person on them stands on them.
      for (const [x0, x1] of halves) world.physics.addBox(x0, 0, zf - depth, x1, yTop, zf, 'building', F().ALL);
      if (yTop - rise >= KERB + T.h) {
        const ctx = world.ctxAt((T.x0 + T.x1) / 2, zf);
        ctx.concrete.box(T.x0, yTop - rise, zf - depth, T.x1, yTop, zf, col(0xd9d4c8), { skip: { n: true } });
        world.physics.addBox(T.x0, yTop - rise, zf - depth, T.x1, yTop, zf, 'building', F().ALL);
      }
    }
    const yBack = KERB + 1.4 + tiers * rise; // the back walkway
    // The back walkway behind the top row: solid to its floor (over the tunnel only above the tunnel roof).
    for (const [x0, x1] of halves) {
      const ctx = world.ctxAt((x0 + x1) / 2, S.zb + 2);
      ctx.concrete.box(x0, KERB, S.zb, x1, yBack, S.zb + 4.05, col(0xd9d4c8), { skip: { n: true, s: true } });
      world.physics.addBox(x0, 0, S.zb, x1, yBack, S.zb + 4.05, 'building', F().ALL);
    }
    {
      const ctx = world.ctxAt((T.x0 + T.x1) / 2, S.zb + 2);
      ctx.concrete.box(T.x0, KERB + T.h, S.zb, T.x1, yBack, S.zb + 4.05, col(0xd9d4c8), { skip: { n: true, s: true } });
      world.physics.addBox(T.x0, KERB + T.h, S.zb, T.x1, yBack, S.zb + 4.05, 'building', F().ALL);
    }
    // The front wall the tiers sit on (the outer wall carries on below it).
    for (const [x0, x1] of halves) W.solid(world, world.ctxAt((x0 + x1) / 2, S.zf).concrete, x0, 0, S.zf - 0.4, x1, KERB + 1.4, S.zf, 0xd9d4c8, null, 'building');
    // Over the tunnel: a lintel from its roof up to the first tier above it.
    const ctxT = world.ctxAt((T.x0 + T.x1) / 2, S.zf);
    // (Not W.solid: its collider always reaches the ground and would shut the tunnel.)
    ctxT.concrete.box(T.x0, KERB + T.h, S.zf - 4, T.x1, KERB + T.h + 1.2, S.zf, col(0xd9d4c8));
    world.physics.addBox(T.x0, KERB + T.h, S.zf - 4, T.x1, KERB + T.h + 1.2, S.zf, 'building', F().ALL);
    for (let k = 0; k < tiers; k++) {
      const zf = S.zf - k * depth;
      const yTop = KERB + 1.4 + (k + 1) * rise;
      if (yTop - rise < KERB + T.h && yTop > KERB + T.h) {
        ctxT.concrete.box(T.x0, KERB + T.h, zf - depth, T.x1, yTop, zf, col(0xd9d4c8));
        world.physics.addBox(T.x0, KERB + T.h, zf - depth, T.x1, yTop, zf, 'building', F().ALL);
      }
    }
    // The tunnel: lined walls, a ceiling, lights, a gate frame each end (the stand halves are its walls).
    W.pave(world, T.x0, S.zb, T.x1, S.zf + 2, 0xa8a8aa, 'asphaltTop');
    ctxT.concrete.box(T.x0, KERB + T.h - 0.3, S.zb, T.x1, KERB + T.h, S.zf, col(0xbdb8ac), { bottom: true, skip: { top: true } });
    world.physics.addBox(T.x0, KERB + T.h - 0.3, S.zb, T.x1, KERB + T.h + 0.1, S.zf, 'building', F().SOLID | F().SHOTS | F().CAMERA);
    for (const x of [T.x0 + 0.05, T.x1 - 0.05]) {
      ctxT.prop.box(x - 0.05, KERB + 0.1, S.zb, x + 0.05, KERB + 1.0, S.zf, col(0xf2c230));
      world.physics.addBox(x - 0.05, 0, S.zb, x + 0.05, KERB + 1.0, S.zf, 'wall', F().ALL);
    }
    for (let z = S.zb + 4; z < S.zf - 2; z += 8) ctxT.screen.box((T.x0 + T.x1) / 2 - 1.5, KERB + T.h - 0.36, z - 0.25, (T.x0 + T.x1) / 2 + 1.5, KERB + T.h - 0.3, z + 0.25, VH.col(0xfff2d0, 2.4));
    // The back wall on Foundry Road (windows: offices and the bar), a walkway, the roof.
    for (let x = S.x0; x < S.x1 - 1e-6; x += 46) {
      const xb = Math.min(S.x1, x + 46);
      const ctx = world.ctxAt((x + xb) / 2, S.zb);
      const tx0 = Math.max(x, T.x0), tx1 = Math.min(xb, T.x1);
      const wallC = col(0xe4dfd2);
      if (tx1 > tx0) {
        // Leave the tunnel mouth open.
        if (tx0 > x) ctx.b.wall([tx0, 0, S.zb - 2], -1, 0, tx0 - x, yBack + 3, wallC, null, [0, Math.max(1, Math.round((tx0 - x) / 4)), 0, 4], [0.55, 0.5, 1, 0.3]);
        if (xb > tx1) ctx.b.wall([xb, 0, S.zb - 2], -1, 0, xb - tx1, yBack + 3, wallC, null, [0, Math.max(1, Math.round((xb - tx1) / 4)), 0, 4], [0.55, 0.5, 1, 0.3]);
        ctx.concrete.box(tx0, KERB + T.h, S.zb - 2, tx1, yBack + 3, S.zb, wallC, { bottom: true });
      } else {
        ctx.b.wall([xb, 0, S.zb - 2], -1, 0, xb - x, yBack + 3, wallC, null, [0, Math.max(1, Math.round((xb - x) / 4)), 0, 4], [0.55, 0.5, 1, 0.3]);
      }
    }
    for (const [x0, x1] of halves) world.physics.addBox(x0, 0, S.zb - 2, x1, yBack + 3, S.zb + 0.01, 'building', F().ALL);
    world.physics.addBox(T.x0, KERB + T.h, S.zb - 2, T.x1, yBack + 3, S.zb, 'building', F().ALL);
    // The wall's ends at the tunnel mouth (b.wall draws only the street face).
    for (const x of [T.x0 - 0.2, T.x1]) ctxT.concrete.box(x, 0, S.zb - 2, x + 0.2, KERB + T.h, S.zb, col(0xe4dfd2));
    // End walls, each with a doorway at the top from the stair outside onto the back walkway.
    const dz0 = S.zb + 0.4, dz1 = S.zb + 3.6, dTop = yBack + 2.6;
    for (const x of [S.x0, S.x1]) {
      const ctx = world.ctxAt(x, (S.zb + S.zf) / 2);
      const x0 = x === S.x0 ? x - 0.6 : x, x1 = x === S.x0 ? x : x + 0.6;
      for (const [y0, y1, z0, z1] of [[0, yBack + 3, S.zb - 2, dz0], [0, yBack + 3, dz1, S.zf], [0, yBack, dz0, dz1], [dTop, yBack + 3, dz0, dz1]]) {
        ctx.concrete.box(x0, y0, z0, x1, y1, z1, col(0xd9d4c8));
        world.physics.addBox(x0, y0, z0, x1, y1, z1, 'building', F().ALL);
      }
    }
    buildStandAccess(world, yBack, depth, rise, tiers);
    // The roof: a slab on a row of columns along the front of the back walkway half-way down.
    const roofY = yBack + 6.5;
    const zr1 = S.zb + 22;
    for (let x = S.x0 - 1; x < S.x1 + 1 - 1e-6; x += 46) {
      const xb = Math.min(S.x1 + 1, x + 46);
      const ctx = world.ctxAt((x + xb) / 2, S.zb);
      ctx.prop.box(x, roofY, S.zb - 2.5, xb, roofY + 0.6, zr1, col(0xeef0f2), { bottom: true });
      ctx.prop.box(x, roofY + 0.6, zr1 - 0.6, xb, roofY + 1.6, zr1, col(0x1f6f8a));
    }
    for (let x = S.x0 + 6; x < S.x1 - 2; x += 18) {
      if (x > T.x0 - 2 && x < T.x1 + 2) continue;
      const k = Math.floor((S.zf - (zr1 - 4)) / depth);
      const yb = KERB + 1.4 + (k + 1) * rise;
      const ctx = world.ctxAt(x, zr1 - 4);
      ctx.prop.box(x - 0.25, yb, zr1 - 4.25, x + 0.25, roofY, zr1 - 3.75, col(0xc8ccd0));
      world.physics.addBox(x - 0.25, yb, zr1 - 4.25, x + 0.25, roofY, zr1 - 3.75, 'pole', F().ALL);
    }
    world.physics.addBox(S.x0 - 1, roofY, S.zb - 2.5, S.x1 + 1, roofY + 1.6, zr1, 'building', F().ALL);
    // The commentary box over the line: a glass box hung under the roof at the back.
    const cx0 = SP.lineX - 7, cx1 = SP.lineX + 7;
    const ctxC = world.ctxAt(SP.lineX, S.zb);
    const yb0 = yBack + 0.2;
    ctxC.concrete.box(cx0, yb0, S.zb, cx1, yb0 + 0.4, S.zb + 6, col(0xd9d4c8));
    ctxC.screen.box(cx0 + 0.2, yb0 + 1.2, S.zb + 5.8, cx1 - 0.2, yb0 + 3.6, S.zb + 6.05, VH.col(0x9fd0e8, 1.25));
    ctxC.prop.box(cx0, yb0 + 0.4, S.zb + 5.8, cx1, yb0 + 1.2, S.zb + 6.1, col(0x1f6f8a));
    ctxC.prop.box(cx0, yb0 + 3.6, S.zb, cx1, roofY, S.zb + 6.1, col(0x1f6f8a));
    for (const x of [cx0, cx1]) ctxC.prop.box(x - 0.15, yb0, S.zb, x + 0.15, roofY, S.zb + 6.1, col(0x1f6f8a));
    world.physics.addBox(cx0, yb0, S.zb, cx1, roofY, S.zb + 6.1, 'building', F().ALL);
    W.sign(world, { x: SP.lineX, y: yb0 + 0.8, z: S.zb + 6.2, yaw: 0, w: 9, h: 0.7, lines: ['COMMENTARY'], style: 'plaque', oneSided: true, flat: false, colors: { bg: ['#1f6f8a', '#1f6f8a'], fg: '#ffffff', border: '#1f6f8a' } });
    // Advertising boards along the front of the roof (original brands).
    W.sign(world, { x: 95, y: roofY + 1.1, z: zr1 + 0.1, yaw: 0, w: 28, h: 1.0, lines: ['TIDAL FUEL · FILL UP AT THE TIDE'], style: 'plaque', oneSided: true, colors: { bg: ['#0f8fd6', '#0a4f8c'], fg: '#ffffff', border: '#0a4f8c' } });
    W.sign(world, { x: 240, y: roofY + 1.1, z: zr1 + 0.1, yaw: 0, w: 28, h: 1.0, lines: ['SANDPIPER PRAWN SHACK · NOW WITH FEWER BONES'], style: 'plaque', oneSided: true, colors: { bg: ['#f2c230', '#e8a020'], fg: '#7a2a10', border: '#7a2a10' } });
    SP.yBack = yBack;
    SP.roofY = roofY;
  }

  /** The pit garages (open bays), the winners' enclosure with the honours board, the timing tower. */
  function buildPitsAndEnclosure(world) {
    const W = K();
    const G = SP.garages;
    const E = SP.enclosure;
    const H = 5.2;
    for (const [x0, x1] of [G.a, G.b]) {
      const ctx = world.ctxAt((x0 + x1) / 2, G.z0);
      // Back wall, roof, partitions every 10 m: open towards the pit lane.
      W.solid(world, ctx.concrete, x0, 0, G.z1 - 0.4, x1, KERB + H, G.z1, 0xe8e4da, null, 'building');
      ctx.concrete.box(x0 - 0.3, KERB + H, G.z0 - 1.2, x1 + 0.3, KERB + H + 0.5, G.z1, col(0xe8e4da), { bottom: true });
      ctx.prop.box(x0 - 0.3, KERB + H + 0.1, G.z0 - 1.25, x1 + 0.3, KERB + H + 0.45, G.z0 - 1.2, col(0x1f6f8a));
      world.physics.addBox(x0 - 0.3, KERB + H, G.z0 - 1.2, x1 + 0.3, KERB + H + 0.5, G.z1, 'building', F().ALL);
      for (let x = x0; x <= x1 + 1e-6; x += 10) {
        W.solid(world, ctx.concrete, x - 0.2, 0, G.z0, x + 0.2, KERB + H, G.z1, 0xd9d4c8, null, 'building');
      }
      // Inside each bay: a tool chest and a stack of tyres against the back wall, a bay number.
      let bay = x0 === G.a[0] ? 1 : 5;
      for (let x = x0; x < x1 - 1e-6; x += 10, bay++) {
        ctx.interior.box(x + 0.2, KERB, G.z0, x + 9.8, KERB + H, G.z1 - 0.4, col(0xcfd3d6), { skip: { top: true, s: true, n: true, e: true, w: true }, bottom: true });
        W.solid(world, ctx.prop, x + 1, KERB, G.z1 - 1.3, x + 2.6, KERB + 1.1, G.z1 - 0.4, 0xc8302c, null, 'metal');
        for (let k = 0; k < 4; k++) ctx.propMatte.cylinder(x + 7.6, KERB + k * 0.26, G.z1 - 1.1, 0.34, 0.34, 0.26, 10, col(0x1c1c1e), true);
        W.block(world, x + 7.2, 0, G.z1 - 1.5, x + 8.0, KERB + 1.04, G.z1 - 0.7, 'tyres');
        ctx.screen.box(x + 2, KERB + H - 0.3, G.z0 + 2, x + 8, KERB + H - 0.2, G.z0 + 2.4, VH.col(0xf4fbff, 2.2));
        ctx.prop.box(x + 4.2, KERB + H - 1.2, G.z0 - 0.1, x + 5.8, KERB + H - 0.3, G.z0 - 0.02, col(0xf2f2ee));
      }
    }
    // The winners' enclosure between the two garage rows: a podium, low walls, the honours board on its back wall.
    const ctxE = world.ctxAt((E.x0 + E.x1) / 2, E.z0);
    W.pave(world, E.x0, E.z0, E.x1, E.z1, 0x2a6f3a, 'plazaTop');
    W.solid(world, ctxE.concrete, E.x0, 0, E.z1 - 0.5, E.x1, KERB + 4.8, E.z1, 0xf2ede0, null, 'building');
    for (const x of [E.x0, E.x1]) W.solid(world, ctxE.concrete, x - (x === E.x0 ? 0 : 0.4), 0, E.z0 + 3, x + (x === E.x0 ? 0.4 : 0), KERB + 1.1, E.z1, 0xf2ede0, null, 'wall');
    // Podium steps 1-2-3 (people step up them).
    const cxE = (E.x0 + E.x1) / 2;
    const zp0 = E.z1 - 5.5, zp1 = E.z1 - 3.0;
    for (const [x0, x1, h, c] of [[cxE - 1.4, cxE + 1.4, 0.75, 0xd9b45a], [cxE - 4.2, cxE - 1.4, 0.5, 0xc8ccd0], [cxE + 1.4, cxE + 4.2, 0.42, 0xb87333]]) {
      ctxE.prop.box(x0, KERB, zp0, x1, KERB + h, zp1, col(c));
      world.physics.addBox(x0, 0, zp0, x1, KERB + h, zp1, 'stone', F().ALL);
    }
    W.sign(world, { x: cxE, y: KERB + 3.2, z: E.z1 - 0.56, yaw: PI, w: 11, h: 2.6, lines: ['SOUTHBAY 500 · ROLL OF HONOUR', 'WINNERS SINCE 1961'], style: 'plaque', oneSided: true, colors: { bg: ['#1a3a22', '#123018'], fg: '#e8d080', border: '#d9b45a' } });
    // An arch over the enclosure's open front.
    for (const x of [E.x0 + 0.6, E.x1 - 0.6]) W.solid(world, ctxE.prop, x - 0.2, KERB, E.z0 + 0.6, x + 0.2, KERB + 4.2, E.z0 + 1.0, 0xd9b45a, null, 'pole');
    ctxE.prop.box(E.x0 + 0.4, KERB + 4.2, E.z0 + 0.5, E.x1 - 0.4, KERB + 4.9, E.z0 + 1.1, col(0xd9b45a));
    W.sign(world, { x: cxE, y: KERB + 4.55, z: E.z0 + 0.45, yaw: PI, w: 9, h: 0.6, lines: ['WINNERS'], style: 'plaque', oneSided: true, colors: { bg: ['#d9b45a', '#c9a44a'], fg: '#1a3a22', border: '#d9b45a' } });
    // The timing tower at the line, in the infield behind the garages.
    const tx = SP.lineX, tz = G.z1 + 1.6;
    const ctxP = world.ctxAt(tx, tz);
    W.solid(world, ctxP.prop, tx - 1.2, KERB, tz - 0.6, tx + 1.2, KERB + 16, tz + 0.6, 0x10324a, null, 'pole');
    for (let k = 0; k < 6; k++) ctxP.screen.box(tx - 1.0, KERB + 9 + k * 1.1, tz - 0.66, tx + 1.0, KERB + 9.8 + k * 1.1, tz - 0.6, VH.col(k % 2 ? 0xffb43a : 0xffffff, 1.8));
    W.sign(world, { x: tx, y: KERB + 15.2, z: tz - 0.7, yaw: PI, w: 2.2, h: 1.2, lines: ['SBS'], style: 'plaque', oneSided: true, colors: { bg: ['#10324a', '#10324a'], fg: '#ffb43a', border: '#ffb43a' } });
    // Gantry lights over the line on the pit wall side.
    const gz = SP.zn - SP.HW - 1.0;
    const ctxG = world.ctxAt(SP.lineX, gz);
    W.solid(world, ctxG.prop, SP.lineX - 0.25, KERB + 1.25, gz - 0.25, SP.lineX + 0.25, KERB + 7.2, gz + 0.25, 0x3a3f45, null, 'pole');
    ctxG.prop.box(SP.lineX - 0.3, KERB + 6.6, gz - 6, SP.lineX + 0.3, KERB + 7.4, gz + 0.3, col(0x3a3f45));
    for (let k = 0; k < 5; k++) ctxG.screen.box(SP.lineX - 0.32, KERB + 6.75, gz - 5.4 + k * 1.1, SP.lineX - 0.3, KERB + 7.25, gz - 4.9 + k * 1.1, VH.col(0xff3020, 2.4));
  }

  /** The back stand on the far straight (simple bleachers), solid. */
  function buildBackStand(world) {
    const W = K();
    const B = SP.backStand;
    const rows = 6;
    const d = (B.z1 - B.z0) / rows;
    for (let k = 0; k < rows; k++) {
      const z0 = B.z0 + k * d;
      const y = KERB + 0.8 + (k + 1) * 0.9;
      for (let x = B.x0; x < B.x1 - 1e-6; x += 35) {
        const xb = Math.min(B.x1, x + 35);
        const ctx = world.ctxAt((x + xb) / 2, z0);
        ctx.concrete.box(x, y - 0.9, z0, xb, y, z0 + d, col(0xcfd3d6), { skip: { s: true } });
        ctx.prop.box(x + 0.2, y, z0 + d - 1.0, xb - 0.2, y + 0.4, z0 + d - 0.4, col(k % 2 ? 0xe8762a : 0xf2f2ee));
      }
      world.physics.addBox(B.x0, 0, z0, B.x1, y, B.z1, 'building', F().ALL);
    }
    const ctx = world.ctxAt((B.x0 + B.x1) / 2, B.z1);
    for (let x = B.x0; x < B.x1 - 1e-6; x += 35) {
      const xb = Math.min(B.x1, x + 35);
      world.ctxAt((x + xb) / 2, B.z1).concrete.box(x, 0, B.z1, xb, KERB + 0.8 + rows * 0.9 + 1.1, B.z1 + 0.5, col(0xcfd3d6));
    }
    world.physics.addBox(B.x0, 0, B.z1, B.x1, KERB + 0.8 + rows * 0.9 + 1.1, B.z1 + 0.5, 'building', F().ALL);
    for (const x of [B.x0, B.x1]) W.solid(world, ctx.concrete, x - 0.3, 0, B.z0, x + 0.3, KERB + 0.8 + rows * 0.9 + 1.1, B.z1, 0xcfd3d6, null, 'building');
    W.sign(world, { x: (B.x0 + B.x1) / 2, y: KERB + 9.4, z: B.z1 + 0.1, yaw: PI, w: 30, h: 2.4, lines: ['SOUTHBAY SPEEDWAY · EST. 1958'], style: 'plaque', posts: false, oneSided: true, colors: { bg: ['#10324a', '#1f6f8a'], fg: '#ffb43a', border: '#ffb43a' } });
    W.sign(world, { x: (B.x0 + B.x1) / 2, y: KERB + 9.4, z: B.z1 + 0.6, yaw: 0, w: 30, h: 2.4, lines: ['SOUTHBAY SPEEDWAY · EST. 1958'], style: 'plaque', oneSided: true, colors: { bg: ['#10324a', '#1f6f8a'], fg: '#ffb43a', border: '#ffb43a' } });
    for (const x of [B.x0 + 10, B.x1 - 10]) {
      ctx.prop.box(x - 0.2, KERB, B.z1 + 0.5, x + 0.2, KERB + 10.8, B.z1 + 0.9, col(0x3a3f45));
      world.physics.addBox(x - 0.2, 0, B.z1 + 0.5, x + 0.2, KERB + 10.8, B.z1 + 0.9, 'pole', F().ALL);
    }
  }

  // ------------------------------------------------------- Mariner Stadium
  // Plot 13..321 x 1199..1463. An elliptical bowl in the east of the plot
  // with a marathon gate at each end (drive in from the apron road, across
  // the running track and the pitch, out the other side), the apron road
  // round it, the vast car park to the west and the stunt crew's bus jump
  // along the south.
  const ST = {
    cx: 232, cz: 1312, a: 76, b: 58, N: 64,
    tiers: 8, tierD: 2.3, rise: 1.3, base: 2.2, wallH: 16, roofY: 18.4,
    gateHW: 6, gateTop: 5.6,
    track: 5.2,
  };
  ST.dF = ST.tiers * ST.tierD; // the front of the lowest tier, in from the outer wall
  // Walk-through tunnels under the stand on the short axis, out to the track:
  // the players' tunnel on the south side (s = 1), the fans' turnstile gate on the north (s = -1).
  ST.tunnels = [{ s: 1, hw: 2.6, top: 3.1 }, { s: -1, hw: 3.4, top: 3.1 }];
  // Aisle stairs from the running track up through the tiers to the back row, either side
  // of both tunnels (x offset from the centre; s = 1 south, -1 north). They cut the podium wall and the seats.
  ST.aisles = [];
  for (const s of [-1, 1]) for (const dx of [-9.5, 9.5]) ST.aisles.push({ s, x: ST.cx + dx, hw: 0.9 });
  function tunnelAt(x, z) {
    for (const T of ST.tunnels) if ((z - ST.cz) * T.s > 0 && Math.abs(x - ST.cx) < T.hw) return T;
    return null;
  }
  const BJ = { z: 1425, hw: 3.2, x0: 124.3, lip: 135.7, h: 4.6, bus0: 136.5, busW: 2.6, gap: 0.7, land0: 156.4, land1: 186 };
  BJ.bus1 = BJ.bus0 + 6 * BJ.busW + 5 * BJ.gap;

  /** Point on the stadium ellipse at angle t, d metres in from the outer wall. */
  function ell(t, d, out) {
    out = out || {};
    out.x = ST.cx + (ST.a - d) * Math.cos(t);
    out.z = ST.cz + (ST.b - d) * Math.sin(t);
    return out;
  }
  const _e0 = {}, _e1 = {};
  /**
   * A ring piece between angles t0 and t1, from d0 to d1 in from the wall,
   * y0..y1: drawn into surf and (unless noCol) solid. Pieces inside the
   * marathon gates' corridors (|z - cz| < gateHW at either end) are cut so
   * the corridor stays open below gateTop.
   */
  function ringPiece(world, surfName, t0, t1, d0, d1, y0, y1, hex, tag, flags, noCol) {
    const dm = (d0 + d1) / 2;
    ell(t0, dm, _e0);
    ell(t1, dm, _e1);
    const pieces = [[_e0.x, _e0.z, _e1.x, _e1.z]];
    // The tunnels (north and south): pieces in the corridor keep only what is above its ceiling.
    const T0 = tunnelAt(_e0.x, _e0.z), T1 = tunnelAt(_e1.x, _e1.z), Tn = T0 || T1;
    if (Tn && y0 < KERB + Tn.top - 1e-6) {
      const top = KERB + Tn.top;
      const [ax, az, bx, bz] = pieces[0];
      if (T0 && T1) {
        if (y1 > top) box4(world, surfName, pieces[0], d1 - d0, top, y1, hex, tag, flags, noCol);
        return;
      }
      const edge = ST.cx + Math.sign((T0 ? bx : ax) - ST.cx) * Tn.hw;
      const u = (edge - ax) / (bx - ax);
      const ez = az + (bz - az) * u;
      box4(world, surfName, T0 ? [edge, ez, bx, bz] : [ax, az, edge, ez], d1 - d0, y0, y1, hex, tag, flags, noCol);
      if (y1 > top) box4(world, surfName, T0 ? [ax, az, edge, ez] : [edge, ez, bx, bz], d1 - d0, top, y1, hex, tag, flags, noCol);
      return;
    }
    const inGate = (z) => Math.abs(z - ST.cz) < ST.gateHW;
    // The gates are where the ellipse crosses z = cz (t = 0 and t = PI).
    if (inGate(_e0.z) || inGate(_e1.z)) {
      if (y0 >= KERB + ST.gateTop - 1e-6) {
        // Above the gate: keep it whole.
      } else if (inGate(_e0.z) && inGate(_e1.z)) {
        // Inside the corridor: only the part above the gate.
        if (y1 > KERB + ST.gateTop) ringPiece(world, surfName, t0, t1, d0, d1, KERB + ST.gateTop, y1, hex, tag, flags, noCol);
        return;
      } else {
        // Straddling: cut at the corridor's edge, keep the outer part, and the bit above the gate.
        const zIn = inGate(_e0.z) ? _e0.z : _e1.z;
        const edge = ST.cz + Math.sign(zIn === _e0.z ? _e1.z - ST.cz : _e0.z - ST.cz) * ST.gateHW;
        const [ax, az, bx, bz] = pieces[0];
        const u = (edge - az) / (bz - az);
        const ex = ax + (bx - ax) * u;
        if (inGate(az)) pieces[0] = [ex, edge, bx, bz];
        else pieces[0] = [ax, az, ex, edge];
        if (y1 > KERB + ST.gateTop) {
          const q = inGate(az) ? [ax, az, ex, edge] : [ex, edge, bx, bz];
          box4(world, surfName, q, d1 - d0, KERB + ST.gateTop, y1, hex, tag, flags, noCol);
        }
      }
    }
    for (const q of pieces) box4(world, surfName, q, d1 - d0, y0, y1, hex, tag, flags, noCol);
  }
  /** ringPiece, with a gap where an aisle stair comes through (the podium wall, the seat rows). */
  function ringCut(world, surfName, t0, t1, d0, d1, y0, y1, hex, tag, flags, noCol) {
    const dm = (d0 + d1) / 2;
    const e0 = ell(t0, dm), e1 = ell(t1, dm);
    for (const A of ST.aisles) {
      if ((e0.z - ST.cz) * A.s <= 0) continue;
      const lo = Math.min(e0.x, e1.x), hi = Math.max(e0.x, e1.x);
      if (hi <= A.x - A.hw || lo >= A.x + A.hw) continue;
      const at = (x) => [x, e0.z + ((e1.z - e0.z) * (x - e0.x)) / (e1.x - e0.x)];
      const a = at(Math.max(lo, A.x - A.hw)), b = at(Math.min(hi, A.x + A.hw));
      const L = e0.x < e1.x ? [e0.x, e0.z] : [e1.x, e1.z], R = e0.x < e1.x ? [e1.x, e1.z] : [e0.x, e0.z];
      if (a[0] > L[0] + 0.05) box4(world, surfName, [L[0], L[1], a[0], a[1]], d1 - d0, y0, y1, hex, tag, flags, noCol);
      if (R[0] > b[0] + 0.05) box4(world, surfName, [b[0], b[1], R[0], R[1]], d1 - d0, y0, y1, hex, tag, flags, noCol);
      return;
    }
    ringPiece(world, surfName, t0, t1, d0, d1, y0, y1, hex, tag, flags, noCol);
  }
  /** z of the stand at x, d metres in from the outer wall, on side s. */
  function ellZ(x, d, s) {
    const c = (x - ST.cx) / (ST.a - d);
    return ST.cz + s * (ST.b - d) * Math.sqrt(Math.max(0, 1 - c * c));
  }
  function buildAisles(world) {
    const W = K();
    const yF = KERB + ST.base, yB = yF + (ST.tiers - 1) * ST.rise;
    for (const A of ST.aisles) {
      const dir = A.s > 0 ? 's' : 'n';
      const zT = ellZ(A.x, ST.dF + 3.4, A.s), zF = ellZ(A.x, ST.dF, A.s), zB = ellZ(A.x, ST.dF - (ST.tiers - 1) * ST.tierD, A.s);
      const ctx = world.ctxAt(A.x, zF);
      // Up from the track through the gap in the podium wall to the front row ...
      W.stairs(world, ctx.concrete, A.x, zT, dir, Math.abs(zF - zT), 2 * A.hw, KERB, yF, 0xbdb8ac, { rails: false, tag: 'stairs' });
      // ... and on up the tiers to the back row.
      W.stairs(world, ctx.concrete, A.x, zF, dir, Math.abs(zB - zF), 2 * A.hw, yF, yB, 0xc9c4b8, { rails: false, tag: 'stairs' });
      // Handrails down the middle of the lower flight, yellow nosing strips at the gap.
      K().beam(ctx.prop, A.x, KERB + 1.0, zT, A.x, yF + 1.0, zF, 0.05, 0xd8a520);
      for (const z of [zT, zF]) ctx.prop.box(A.x - 0.03, z === zT ? KERB : yF, z - 0.03, A.x + 0.03, (z === zT ? KERB : yF) + 1.0, z + 0.03, col(0xd8a520));
      for (const x of [A.x - A.hw, A.x + A.hw]) ctx.prop.box(x - 0.06, KERB, Math.min(zF, ellZ(A.x, ST.dF + 0.4, A.s)), x + 0.06, KERB + ST.base + 0.95, Math.max(zF, ellZ(A.x, ST.dF + 0.4, A.s)), col(0xd8a520));
    }
  }
  function box4(world, surfName, q, thick, y0, y1, hex, tag, flags, noCol) {
    const [ax, az, bx, bz] = q;
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.05) return;
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const yaw = Math.atan2(bx - ax, bz - az);
    world.ctxAt(cx, cz)[surfName].orientedBox(cx, cz, thick / 2, len / 2 + 0.12, yaw, y0, y1, col(hex));
    if (!noCol) world.physics.addOrientedBox(cx, cz, thick / 2, len / 2 + 0.12, yaw, y0 <= KERB + 0.01 ? 0 : y0, y1, tag || 'building', flags === undefined ? F().ALL : flags);
  }

  function buildStadium(world) {
    const W = K();
    const N = ST.N;
    const yT = KERB + 0.012;
    // --- the ground: asphalt over the whole plot (apron road and car parks), the bowl's floor
    W.pave(world, 13, 1199, 321, 1463, 0xc8c8ca, 'asphaltTop', yT);
    // The pitch (a fan of grass in stripes) and the red running track round it.
    const pa = ST.a - ST.dF - ST.track, pb = ST.b - ST.dF - ST.track;
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * 2 * PI, t1 = ((i + 1) / N) * 2 * PI;
      const p0 = [ST.cx, KERB + 0.02, ST.cz];
      const p1 = [ST.cx + pa * Math.cos(t0), KERB + 0.02, ST.cz + pb * Math.sin(t0)];
      const p2 = [ST.cx + pa * Math.cos(t1), KERB + 0.02, ST.cz + pb * Math.sin(t1)];
      const gs = world.ctxAt((p1[0] + p2[0] + ST.cx) / 3, (p1[2] + p2[2] + ST.cz) / 3).grassTop;
      const ny = (p1[2] - p0[2]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[2] - p0[2]);
      gs.polygon(ny >= 0 ? [p0, p1, p2] : [p2, p1, p0], col(0xffffff));
      // The track: a ring of quads between the pitch and the front wall.
      const ta = ST.a - ST.dF, tb = ST.b - ST.dF;
      const q0 = [ST.cx + ta * Math.cos(t0), KERB + 0.022, ST.cz + tb * Math.sin(t0)];
      const q1 = [ST.cx + ta * Math.cos(t1), KERB + 0.022, ST.cz + tb * Math.sin(t1)];
      const r0 = [p1[0], KERB + 0.022, p1[2]], r1 = [p2[0], KERB + 0.022, p2[2]];
      quadUp(world.ctxAt((q0[0] + r1[0]) / 2, (q0[2] + r1[2]) / 2).marks, r0, q0, q1, r1, col(0xb5523a));
    }
    world.addLawn(ST.cx - pa * 0.7, ST.cz - pb * 0.7, ST.cx + pa * 0.7, ST.cz + pb * 0.7);
    // Mown stripes and the pitch markings (a 76 x 44 field, halfway line, centre circle, goals).
    const fx0 = ST.cx - 38, fx1 = ST.cx + 38, fz0 = ST.cz - 22, fz1 = ST.cz + 22;
    for (let x = fx0; x < fx1 - 1e-6; x += 7.6) if (Math.round((x - fx0) / 7.6) % 2) W.pave(world, x, fz0, x + 7.6, fz1, 0x7fb257, 'marks', KERB + 0.026);
    const line = (x0, z0, x1, z1) => W.mark(world, x0, z0, x1, z1, 0xf4f4ef, KERB + 0.03);
    line(fx0, fz0, fx1, fz0 + 0.2); line(fx0, fz1 - 0.2, fx1, fz1); line(fx0, fz0, fx0 + 0.2, fz1); line(fx1 - 0.2, fz0, fx1, fz1);
    line(ST.cx - 0.1, fz0, ST.cx + 0.1, fz1);
    for (const [x0, x1] of [[fx0, fx0 + 12], [fx1 - 12, fx1]]) {
      line(x0, ST.cz - 12, x1, ST.cz - 11.8); line(x0, ST.cz + 11.8, x1, ST.cz + 12);
      const xi = x0 === fx0 ? x1 : x0;
      line(xi - 0.1, ST.cz - 12, xi + 0.1, ST.cz + 12);
    }
    for (let k = 0; k < 24; k++) {
      const t = (k / 24) * 2 * PI;
      const x = ST.cx + 7 * Math.cos(t), z = ST.cz + 7 * Math.sin(t);
      world.ctxAt(x, z).marks.topRect(x - 0.35, z - 0.35, x + 0.35, z + 0.35, KERB + 0.03, col(0xf4f4ef));
    }
    // Goals: white frames, solid posts (the net is drawn, a car bumps it).
    for (const gx of [fx0, fx1]) {
      const ctx = world.ctxAt(gx, ST.cz);
      const back = gx === fx0 ? -2 : 2;
      for (const z of [ST.cz - 3.7, ST.cz + 3.7]) {
        ctx.prop.box(gx - 0.08, KERB, z - 0.08, gx + 0.08, KERB + 2.44, z + 0.08, col(0xffffff));
        world.physics.addBox(gx - 0.1, 0, z - 0.1, gx + 0.1, KERB + 2.44, z + 0.1, 'pole', F().ALL);
      }
      ctx.prop.box(gx - 0.08, KERB + 2.36, ST.cz - 3.7, gx + 0.08, KERB + 2.52, ST.cz + 3.7, col(0xffffff));
      const nx0 = Math.min(gx, gx + back), nx1 = Math.max(gx, gx + back);
      ctx.propMatte.box(nx0, KERB, ST.cz - 3.7, nx1, KERB + 2.4, ST.cz + 3.7, col(0xdfe3e6), { skip: { [gx === fx0 ? 'e' : 'w']: true } });
      // The net: back and sides solid, the mouth open (you can walk, or drive, into the goal).
      const bxn = gx + back;
      world.physics.addBox(bxn - 0.08, 0, ST.cz - 3.75, bxn + 0.08, KERB + 2.4, ST.cz + 3.75, 'fence', F().SOLID | F().CAMERA);
      for (const z of [ST.cz - 3.75, ST.cz + 3.65]) world.physics.addBox(nx0, 0, z, nx1, KERB + 2.4, z + 0.1, 'fence', F().SOLID | F().CAMERA);
    }

    // --- the bowl: stepped tiers in a ring, the podium wall in front, the outer wall, the roof
    const seatA = 0x1f4f7a, seatB = 0xf2f2ee, seatC = 0x2f8fb8;
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * 2 * PI, t1 = ((i + 1) / N) * 2 * PI;
      for (let k = 0; k < ST.tiers; k++) {
        const d1 = ST.dF - k * ST.tierD, d0 = d1 - ST.tierD; // k = 0 is the front (lowest) tier
        const yTop = KERB + ST.base + k * ST.rise;
        ringPiece(world, 'concrete', t0, t1, d0, d1, 0, yTop, 0xd6d1c4, 'building');
        // A row of seats along the front of each tier (coloured blocks spell the club's stripes).
        const c = (Math.floor(i / 4) + (k > 4 ? 1 : 0)) % 3 === 0 ? seatC : (i + k) % 2 ? seatA : seatB;
        ringCut(world, 'prop', t0, t1, d1 - 1.0, d1 - 0.4, yTop, yTop + 0.45, c, 'building', F().SOLID, true);
      }
      // The podium wall in front of the lowest tier (a rail on it).
      ringCut(world, 'concrete', t0, t1, ST.dF, ST.dF + 0.4, 0, KERB + ST.base + 0.9, 0xf2f2ee, 'wall');
      // The outer wall: a sand-coloured shell with ribs, a teal band and a lit band under the roof.
      const yW = KERB + ST.wallH;
      ringPiece(world, 'concrete', t0, t1, -0.6, 0, 0, yW, i % 2 ? 0xe2d6bd : 0xd9ccb0, 'building');
      ringPiece(world, 'prop', t0, t1, -0.75, -0.55, KERB + 3.2, KERB + 4.0, 0x1f6f8a, 'building', F().SOLID, true);
      ringPiece(world, 'screen', t0, t1, -0.7, -0.55, yW - 2.0, yW - 1.5, VH.col(0xfff2d0, 2.0), 'building', F().SOLID, true);
      if (i % 2 === 0) {
        ell(t0, -0.9, _a);
        if (Math.abs(_a.z - ST.cz) > ST.gateHW + 1 && !(Math.abs(_a.x - ST.cx) < 4.5)) {
          world.ctxAt(_a.x, _a.z).prop.box(_a.x - 0.35, 0, _a.z - 0.35, _a.x + 0.35, ST.roofY + 0.4, _a.z + 0.35, col(0xeef0f2));
          world.physics.addBox(_a.x - 0.35, 0, _a.z - 0.35, _a.x + 0.35, ST.roofY + 0.4, _a.z + 0.35, 'pole', F().ALL);
        }
      }
      // The roof: a white ring over the upper tiers, its leading edge in club blue.
      ringPiece(world, 'prop', t0, t1, -1.0, 11, ST.roofY, ST.roofY + 0.5, 0xeef0f2, 'building');
      ringPiece(world, 'prop', t0, t1, 10.6, 11.2, ST.roofY - 0.6, ST.roofY + 0.6, 0x1f4f7a, 'building', F().SOLID, true);
      // Lights under the roof's edge (glow at night, light the pitch).
      if (i % 4 === 0) ringPiece(world, 'screen', t0, t1, 9.8, 10.6, ST.roofY - 0.25, ST.roofY - 0.05, VH.col(0xfff4d8, 1.6), 'building', F().SOLID, true);
    }
    buildAisles(world);
    // The marathon gates: a lit ceiling, yellow kerb rails, steel gates folded back, big lettering over the west one.
    for (const side of [-1, 1]) {
      const xo = ST.cx + side * (ST.a + 0.8), xi = ST.cx + side * (ST.a - ST.dF - 0.4);
      const x0 = Math.min(xo, xi), x1 = Math.max(xo, xi);
      const ctx = world.ctxAt((x0 + x1) / 2, ST.cz);
      ctx.concrete.box(x0, KERB + ST.gateTop - 0.4, ST.cz - ST.gateHW, x1, KERB + ST.gateTop, ST.cz + ST.gateHW, col(0xbdb8ac), { bottom: true, skip: { top: true } });
      world.physics.addBox(x0, KERB + ST.gateTop - 0.4, ST.cz - ST.gateHW, x1, KERB + ST.gateTop + 0.1, ST.cz + ST.gateHW, 'building', F().ALL);
      for (let x = x0 + 3; x < x1 - 2; x += 5) ctx.screen.box(x - 0.8, KERB + ST.gateTop - 0.46, ST.cz - 0.3, x + 0.8, KERB + ST.gateTop - 0.4, ST.cz + 0.3, VH.col(0xfff2d0, 2.4));
      for (const z of [ST.cz - ST.gateHW + 0.08, ST.cz + ST.gateHW - 0.08]) {
        ctx.prop.box(x0, KERB + 0.1, z - 0.08, x1, KERB + 0.9, z + 0.08, col(0xf2c230));
        world.physics.addBox(x0, 0, z - 0.08, x1, KERB + 0.9, z + 0.08, 'wall', F().ALL);
        // A folded-back steel gate leaf against the wall outside.
        const sz = Math.sign(z - ST.cz);
        const lx = ST.cx + side * (ST.a + 1.6);
        const lz0 = Math.min(z + sz * 0.6, z + sz * 6.1), lz1 = Math.max(z + sz * 0.6, z + sz * 6.1);
        world.ctxAt(lx, (lz0 + lz1) / 2).prop.box(lx - 0.08, KERB, lz0, lx + 0.08, KERB + 4.4, lz1, col(0x3a3f45));
        world.physics.addBox(lx - 0.1, 0, lz0, lx + 0.1, KERB + 4.4, lz1, 'metal', F().ALL);
      }
      // Gate frame lettering.
      ctx.prop.box(xo - 0.3, KERB + ST.gateTop, ST.cz - ST.gateHW - 0.8, xo + 0.3, KERB + ST.gateTop + 1.2, ST.cz + ST.gateHW + 0.8, col(0x1f4f7a));
    }
    W.sign(world, { x: ST.cx - ST.a - 1.2, y: KERB + 10.5, z: ST.cz, yaw: -PI / 2, w: 30, h: 4.2, lines: ['MARINER STADIUM', 'HOME OF THE SOUTHBAY MARINERS'], style: 'neon', oneSided: true, flat: false, colors: { bg: ['#0e2a44', '#1f4f7a'], fg: '#ffffff', glow: '#7fd0ff', outline: '#7fd0ff' } });
    W.sign(world, { x: ST.cx - ST.a - 1.0, y: KERB + ST.gateTop + 0.6, z: ST.cz, yaw: -PI / 2, w: 11, h: 0.9, lines: ['MARATHON GATE'], style: 'plaque', oneSided: true, colors: { bg: ['#1f4f7a', '#1f4f7a'], fg: '#f2c230', border: '#f2c230' } });

    // --- the players' tunnel (south) and the fans' turnstile gate (north), through the stand
    buildStadiumTunnels(world);

    // --- the apron road: a dashed centre line round the bowl, ticket booths by the west gate, lamps
    for (let i = 0; i < 96; i += 2) {
      const t0 = (i / 96) * 2 * PI, t1 = ((i + 1) / 96) * 2 * PI;
      ell(t0, -6.5, _a); ell(t1, -6.5, _b);
      const cx = (_a.x + _b.x) / 2, cz = (_a.z + _b.z) / 2;
      world.ctxAt(cx, cz).marks.orientedBox(cx, cz, 0.08, Math.hypot(_b.x - _a.x, _b.z - _a.z) / 2, Math.atan2(_b.x - _a.x, _b.z - _a.z), KERB + 0.018, KERB + 0.024, col(0xf4f4ef));
    }
    for (let i = 0; i < 24; i++) {
      const t = ((i + 0.5) / 24) * 2 * PI;
      ell(t, -12.5, _a);
      if (Math.abs(_a.z - ST.cz) < 10 || _a.x > 318 || _a.z < 1201 || _a.z > 1461) continue;
      world.addProp('streetlight', _a.x, KERB, _a.z, Math.atan2(ST.cx - _a.x, ST.cz - _a.z), 1);
    }
    // Ticket booths against the wall either side of the west gate (clear of the apron road).
    for (const dz of [-14.5, -9.5, 9.5, 14.5]) booth(world, ST.cx - ST.a - 1.2, ST.cz + dz, 0x1f4f7a);
    // Floodlight pools on the pitch and the apron, from the roof lights.
    const pools = world.floodlights || (world.floodlights = []);
    for (const [dx, dz] of [[0, 0], [-30, -12], [30, -12], [-30, 12], [30, 12], [-55, 0], [55, 0], [0, -32], [0, 32]]) pools.push({ x: ST.cx + dx, z: ST.cz + dz, r: 22, y: KERB + 0.04, strength: 0.7, tint: [1.1, 1.1, 1.0] });
  }

  /**
   * The two tunnels ringPiece cuts through the stand, out to the running
   * track: the players' tunnel on the south side (glass doors folded back
   * under a canopy, a blue runner, THIS IS MARINER STADIUM on the wall) and
   * the fans' gate on the north (a bank of turnstiles you walk through but
   * can't drive through, off a forecourt with the club's anchor on a plinth).
   */
  function buildStadiumTunnels(world) {
    const W = K(), Sk = VH.SouthKit;
    const pools = world.floodlights || (world.floodlights = []);
    const x = ST.cx;
    for (const T of ST.tunnels) {
      const s = T.s, hw = T.hw, top = KERB + T.top;
      const zAt = (d) => ST.cz + s * (ST.b - d);
      const zo = zAt(-0.75), zf = zAt(ST.dF + 0.4), zm = zAt(ST.dF - ST.tierD), zw = zAt(-0.6);
      const z0 = Math.min(zo, zf), z1 = Math.max(zo, zf);
      const ctx = world.ctxAt(x, (z0 + z1) / 2);
      // The ceiling, lit strips under it; walls either side of the mouth, where the front tier was cut.
      ctx.concrete.box(x - hw - 0.3, top - 0.3, z0, x + hw + 0.3, top, z1, col(0xcfcabd), { bottom: true });
      world.physics.addBox(x - hw - 0.3, top - 0.3, z0, x + hw + 0.3, top, z1, 'building', F().ALL);
      for (let z = z0 + 1.5; z < z1 - 1; z += 3.5) ctx.screen.box(x - 0.5, top - 0.34, z, x + 0.5, top - 0.3, z + 1.2, VH.col(0xfff2d0, 2.2));
      const ma = Math.min(zm, zf), mb = Math.max(zm, zf);
      for (const sx of [-1, 1]) {
        const xa = Math.min(x + sx * hw, x + sx * (hw + 0.4)), xb = Math.max(x + sx * hw, x + sx * (hw + 0.4));
        ctx.concrete.box(xa, 0, ma, xb, top, mb, col(0xd6d1c4));
        world.physics.addBox(xa, 0, ma, xb, top, mb, 'wall', F().ALL);
        // A steel jamb either side of the outer opening.
        const ja = Math.min(x + sx * (hw - 0.12), x + sx * (hw + 0.1)), jb = Math.max(x + sx * (hw - 0.12), x + sx * (hw + 0.1));
        const jz0 = Math.min(zw + s * 0.12, zAt(0.3)), jz1 = Math.max(zw + s * 0.12, zAt(0.3));
        ctx.prop.box(ja, KERB, jz0, jb, top, jz1, col(0x3a3f45));
        world.physics.addBox(ja, 0, jz0, jb, top, jz1, 'metal', F().ALL);
      }
      // A canopy over the outer opening on two posts.
      const cz0 = Math.min(zw, zw + s * 4.5), cz1 = Math.max(zw, zw + s * 4.5), pz = zw + s * 4.3;
      const cw = hw + 1.9;
      ctx.prop.box(x - cw, KERB + 3.4, cz0, x + cw, KERB + 3.7, cz1, col(0x1f4f7a), { bottom: true });
      world.physics.addBox(x - cw, KERB + 3.4, cz0, x + cw, KERB + 3.7, cz1, 'building', F().SOLID | F().SHOTS);
      for (const dx of [-cw + 0.3, cw - 0.3]) Sk.air(world, ctx.prop, x + dx - 0.1, KERB, pz - 0.1, x + dx + 0.1, KERB + 3.4, pz + 0.1, 0xc8ccd0, 'pole');
      ctx.screen.box(x - cw + 0.4, KERB + 3.36, cz0 + 0.4, x + cw - 0.4, KERB + 3.4, cz0 + 0.6, VH.col(0xfff2d0, 2.0));
      ctx.screen.box(x - cw + 0.4, KERB + 3.36, cz1 - 0.6, x + cw - 0.4, KERB + 3.4, cz1 - 0.4, VH.col(0xfff2d0, 2.0));
      pools.push({ x, z: zw + s * 4, r: 8, y: KERB + 0.04, strength: 0.75, tint: [1.1, 1.05, 0.95] });
      pools.push({ x, z: (zm + zf) / 2, r: 6, y: KERB + 0.04, strength: 0.6, tint: [1.1, 1.05, 0.95] });

      if (s === 1) {
        // Players: the glass doors folded back flat against the wall either side, a blue runner, the sign.
        for (const sx of [-1, 1]) {
          const xa = Math.min(x + sx * (hw + 0.15), x + sx * (hw + 1.55)), xb = Math.max(x + sx * (hw + 0.15), x + sx * (hw + 1.55));
          const ga = Math.min(zw + s * 0.02, zw + s * 0.1), gb = Math.max(zw + s * 0.02, zw + s * 0.1);
          ctx.screen.box(xa + 0.08, KERB + 0.08, ga, xb - 0.08, KERB + 2.87, gb, VH.col(0x9fc8dc, 1.2));
          for (const [ya, yb] of [[KERB, KERB + 0.08], [KERB + 2.87, KERB + 2.95]]) ctx.prop.box(xa, ya, ga, xb, yb, gb, col(0x3a3f45));
          for (const xx of [xa, xb - 0.08]) ctx.prop.box(xx, KERB, ga, xx + 0.08, KERB + 2.95, gb, col(0x3a3f45));
          ctx.prop.box(xa + 0.3, KERB + 1.0, Math.min(gb, gb + s * 0.06), xa + 0.36, KERB + 1.6, Math.max(gb, gb + s * 0.06), col(0xc8ccd0)); // a pull handle
        }
        W.pave(world, x - hw + 0.4, z0 + 0.2, x + hw - 0.4, mb - 0.2, 0x1f4f7a, 'marks', KERB + 0.02, 0);
        W.sign(world, { x, y: KERB + 4.6, z: zw + s * 0.25, yaw: 0, w: 7, h: 0.8, lines: ["PLAYERS' ENTRANCE"], style: 'plaque', oneSided: true, colors: { bg: ['#1f4f7a', '#1f4f7a'], fg: '#ffffff', border: '#f2c230' } });
        W.sign(world, { x: x - hw + 0.3, y: KERB + 1.9, z: (zw + zm) / 2, yaw: PI / 2, w: 5.2, h: 0.9, lines: ['THIS IS MARINER STADIUM'], style: 'plaque', oneSided: true, colors: { bg: ['#1f4f7a', '#163e60'], fg: '#ffffff', border: '#f2c230' } });
      } else {
        // Fans: a bank of turnstiles across the opening (lanes for people, too narrow for a car).
        const ta = Math.min(zAt(0.7), zAt(1.9)), tb = Math.max(zAt(0.7), zAt(1.9));
        const n = 5, cwid = 0.42, lane = (2 * hw - n * cwid) / (n - 1);
        for (let k = 0; k < n; k++) {
          const xc = x - hw + cwid / 2 + k * (cwid + lane);
          ctx.prop.box(xc - cwid / 2, KERB, ta, xc + cwid / 2, KERB + 1.0, tb, col(0x5a6068));
          ctx.prop.box(xc - cwid / 2 - 0.02, KERB + 1.0, ta - 0.02, xc + cwid / 2 + 0.02, KERB + 1.08, tb + 0.02, col(0x1f4f7a));
          ctx.screen.box(xc - 0.08, KERB + 1.08, ta + 0.15, xc + 0.08, KERB + 1.12, ta + 0.35, VH.col(0x3fe07a, 2.0));
          // The arms, dropped (the gate's on free entry): bars hanging down the cabinet's sides.
          for (const sx of [-1, 1]) if ((k > 0 || sx > 0) && (k < n - 1 || sx < 0)) ctx.prop.box(xc + sx * (cwid / 2) - 0.03, KERB + 0.3, (ta + tb) / 2 - 0.03, xc + sx * (cwid / 2 + 0.06), KERB + 0.92, (ta + tb) / 2 + 0.03, col(0xc8ccd0));
          world.physics.addBox(xc - cwid / 2 - 0.08, 0, ta, xc + cwid / 2 + 0.08, KERB + 1.08, tb, 'metal', F().ALL);
        }
        W.sign(world, { x, y: KERB + 5.2, z: zw + s * 0.25, yaw: PI, w: 9, h: 1.1, lines: ['GATE N · TURNSTILES 1–4', 'ALL TICKETS · SEASON CARDS · NO VEHICLES'], style: 'plaque', oneSided: true, colors: { bg: ['#1f4f7a', '#163e60'], fg: '#ffffff', border: '#f2c230' } });
        buildFansForecourt(world, zw);
      }
    }
  }

  /** The fans' forecourt north of the gate: paving, bollards, a crossing over the apron road, the anchor. */
  function buildFansForecourt(world, zw) {
    const W = K(), Sk = VH.SouthKit;
    const x = ST.cx;
    const P = { x0: x - 18, x1: x + 18, z0: 1224, z1: 1240 };
    W.pave(world, P.x0, P.z0, P.x1, P.z1, 0xd8cfbf, 'plazaTop', KERB + 0.016, 4);
    // A zebra across the apron road from the forecourt to the gate.
    for (let xx = x - 3; xx < x + 3; xx += 1.2) W.mark(world, xx, P.z1 + 0.5, xx + 0.6, zw - 1.2, 0xf4f4ef, KERB + 0.02);
    // Bollards along the road edge (people walk between them; cars don't).
    for (let xx = P.x0 + 0.5; xx <= P.x1 - 0.4; xx += 1.8) world.addProp('bollard', xx, KERB, P.z1 + 0.3, 0, 1);
    for (let zz = P.z0 + 1; zz < P.z1; zz += 1.8) for (const xx of [P.x0 - 0.3, P.x1 + 0.3]) world.addProp('bollard', xx, KERB, zz, 0, 1);
    // The anchor on its plinth.
    const ax = x, az = (P.z0 + P.z1) / 2;
    const c = world.ctxAt(ax, az);
    const brz = col(0x8a6a3a);
    Sk.obox(world, c.concrete, ax, az, 1.6, 1.6, 0, KERB, KERB + 1.2, 0xd9d4c8, 'stone');
    c.concrete.box(ax - 1.75, KERB + 1.2, az - 1.75, ax + 1.75, KERB + 1.35, az + 1.75, col(0xc8c2b4));
    world.physics.addBox(ax - 1.75, KERB + 1.2, az - 1.75, ax + 1.75, KERB + 1.35, az + 1.75, 'stone', F().ALL);
    const yb = KERB + 1.35;
    c.prop.box(ax - 0.18, yb + 0.6, az - 0.18, ax + 0.18, yb + 4.6, az + 0.18, brz); // the shank
    c.prop.box(ax - 1.3, yb + 4.0, az - 0.14, ax + 1.3, yb + 4.3, az + 0.14, brz); // the stock
    c.prop.cylinder(ax, yb + 4.6, az, 0.42, 0.42, 0.14, 12, brz, true); // the ring (a disc)
    for (const sx of [-1, 1]) {
      K().beam(c.prop, ax, yb + 0.7, az, ax + sx * 1.3, yb + 1.6, az, 0.22, brz); // the arms
      c.prop.orientedBox(ax + sx * 1.35, az, 0.32, 0.16, 0, yb + 1.3, yb + 2.0, brz); // the flukes
    }
    world.physics.addBox(ax - 1.7, yb, az - 0.25, ax + 1.7, yb + 2.0, az + 0.25, 'metal', F().ALL);
    world.physics.addBox(ax - 0.25, yb + 2.0, az - 0.25, ax + 0.25, yb + 4.7, az + 0.25, 'metal', F().ALL);
    W.sign(world, { x: ax, y: KERB + 0.65, z: az - 1.62, yaw: PI, w: 2.8, h: 0.7, lines: ['SOUTHBAY MARINERS', 'EST. 1931 · HOLD FAST'], style: 'plaque', oneSided: true, colors: { bg: ['#2a2418', '#1e1a12'], fg: '#e8d080', border: '#b8964a' } });
    // Flags at the corners, benches facing the anchor.
    for (const [fx, fz] of [[P.x0 + 1.5, P.z0 + 1.5], [P.x1 - 1.5, P.z0 + 1.5]]) {
      const cf = world.ctxAt(fx, fz);
      Sk.drum(world, cf.prop, fx, KERB, fz, 0.08, 10, 8, 0xcfd3d6, 'pole');
      cf.prop.box(fx + 0.08, KERB + 8.2, fz - 0.02, fx + 2.6, KERB + 9.7, fz + 0.02, col(0x1f4f7a));
      cf.prop.box(fx + 0.08, KERB + 8.75, fz - 0.025, fx + 2.6, KERB + 9.15, fz + 0.025, col(0xf2c230));
    }
    for (const [bx, bz, yaw] of [[ax - 6, az - 3, 0], [ax + 6, az - 3, 0], [ax - 6, az + 3, PI], [ax + 6, az + 3, PI]]) world.addProp('bench', bx, KERB, bz, yaw, 1);
    const pools = world.floodlights || (world.floodlights = []);
    pools.push({ x: ax, z: az, r: 12, y: KERB + 0.04, strength: 0.55, tint: [1.1, 1.0, 0.85] });
  }

  /** The car parks: bays, islands with palms and lamps, and the stunt crew's bus jump along the south. */
  function buildStadiumParks(world) {
    const W = K();
    const white = 0xf4f4ef;
    // West car park: four double rows of bays running north-south, a cross aisle in the middle (by the gate).
    const rows = [30, 58, 86, 114];
    const zA = [[1206, 1300], [1324, 1408]];
    for (const rx of rows) {
      for (const [z0, z1] of zA) {
        W.mark(world, rx - 0.08, z0, rx + 0.08, z1, white);
        for (let z = z0; z <= z1 + 1e-6; z += 3) {
          W.mark(world, rx - 5.5, z - 0.06, rx - 0.08, z + 0.06, white);
          W.mark(world, rx + 0.08, z - 0.06, rx + 5.5, z + 0.06, white);
        }
        // Island at each end of the row: a kerbed planter with a palm and a lamp.
        for (const z of [z0 - 2.5, z1 + 2.5]) {
          const ctx = world.ctxAt(rx, z);
          ctx.concrete.box(rx - 1.6, KERB, z - 1.6, rx + 1.6, KERB + 0.3, z + 1.6, col(0xd9d4c8));
          ctx.grassTop.topRect(rx - 1.45, z - 1.45, rx + 1.45, z + 1.45, KERB + 0.31, col(0xffffff));
          world.physics.addBox(rx - 1.6, 0, z - 1.6, rx + 1.6, KERB + 0.3, z + 1.6, 'kerb', F().SOLID);
          world.addProp('palm', rx, KERB + 0.3, z, (rx * 7 + z) % 6.28, 1);
        }
      }
      for (const z of [1250, 1370]) world.addProp('streetlight', rx, KERB, z, PI / 2, 1);
    }
    // Arrows and a sign at the cross aisle.
    for (const x of [44, 72, 100]) W.mark(world, x - 2, ST.cz - 0.12, x + 2, ST.cz + 0.12, white);
    W.sign(world, { x: 15.5, y: KERB + 3.2, z: ST.cz - 8, yaw: -PI / 2, w: 6, h: 2.2, lines: ['MARINER STADIUM', 'CAR PARKS A–D · COACHES NORTH'], style: 'info', posts: true });
    // North strip: coach bays along Mariner Way.
    for (let x = 150; x < 300; x += 6) W.mark(world, x - 0.06, 1205, x + 0.06, 1222, white);
    W.mark(world, 150, 1205, 300, 1205.15, white);
    for (const x of [170, 230, 290]) world.addProp('streetlight', x, KERB, 1203, 0, 1);

    // --- the bus jump: run-up lane, take-off ramp, six buses side by side, landing ramp, run-out
    const z = BJ.z;
    for (const zz of [z - BJ.hw - 0.3, z + BJ.hw + 0.1]) W.mark(world, 20, zz, 310, zz + 0.2, 0xf2c230);
    for (let x = 30; x < BJ.x0 - 4; x += 12) W.mark(world, x, z - 0.12, x + 5, z + 0.12, white);
    W.ramp(world, world.ctxAt(BJ.x0 + 7, z).prop, BJ.x0, z, PI / 2, BJ.hw * 2, BJ.lip - BJ.x0, KERB, KERB + BJ.h, 0xf2c230, 'metal');
    // Chevrons on the ramp face (decals on the deck would z-fight: use the lip board instead).
    const ctxR = world.ctxAt(BJ.lip, z);
    ctxR.prop.box(BJ.lip - 0.3, 0, z - BJ.hw, BJ.lip, KERB + BJ.h - 0.05, z + BJ.hw, col(0x1c1c1e));
    W.ramp(world, world.ctxAt(BJ.land1 - 8, z).prop, BJ.land1, z, -PI / 2, BJ.hw * 2 + 1, BJ.land1 - BJ.land0, KERB, KERB + BJ.h, 0xf2c230, 'metal');
    const ctxL = world.ctxAt(BJ.land0, z);
    ctxL.prop.box(BJ.land0, 0, z - BJ.hw - 0.5, BJ.land0 + 0.3, KERB + BJ.h - 0.05, z + BJ.hw + 0.5, col(0x1c1c1e));
    for (let k = 0; k < 6; k++) bus(world, BJ.bus0 + k * (BJ.busW + BJ.gap) + BJ.busW / 2, z, k);
    // Barriers along the run-out and a scoreboard sign.
    for (let x = BJ.land1 + 6; x < 300; x += 6) {
      world.addProp('barrier', x, KERB, z - BJ.hw - 2, 0, 1);
      world.addProp('barrier', x, KERB, z + BJ.hw + 2, 0, 1);
    }
    W.sign(world, { x: BJ.lip - 6, y: KERB + 3.0, z: z - BJ.hw - 4, yaw: PI, w: 7, h: 2.2, lines: ['THE BIG JUMP', 'SIX BUSES · STUNT CREW ONLY'], style: 'info', posts: true });
  }

  /** A parked bus (stunt prop), solid: long side across the jump. */
  function bus(world, x, z, k) {
    const ctx = world.ctxAt(x, z);
    const hw = BJ.busW / 2, hl = 5.6;
    const body = [0xf2c230, 0x2f8fb8, 0xf2c230, 0x2f8fb8, 0xf2c230, 0x2f8fb8][k];
    ctx.prop.box(x - hw, KERB + 0.5, z - hl, x + hw, KERB + 3.0, z + hl, col(body));
    ctx.prop.box(x - hw - 0.02, KERB + 1.7, z - hl + 0.6, x + hw + 0.02, KERB + 2.6, z + hl - 1.2, col(0x1c2a33));
    ctx.prop.box(x - hw + 0.1, KERB + 3.0, z - hl + 0.3, x + hw - 0.1, KERB + 3.2, z + hl - 0.3, col(0xf2f2ee));
    for (const zz of [z - hl + 1.6, z + hl - 2.0]) for (const sx of [-1, 1]) ctx.propMatte.box(x + sx * hw - 0.14, KERB, zz - 0.5, x + sx * hw + 0.14, KERB + 1.0, zz + 0.5, col(0x1c1c1e));
    world.physics.addBox(x - hw, 0, z - hl, x + hw, KERB + 3.2, z + hl, 'metal', F().ALL);
  }

  // ------------------------------------------------------ Southbay Expo Hall
  // Plot 339..421 x 1193..1467, on Sandpiper Drive with the bay behind it.
  // A long hall you can walk (or drive) into: a glass foyer with its doors
  // open on the forecourt, a loading door at the south end onto the service
  // yard, and inside the current show, CASTELLANE: 50 YEARS OF CHAMPIONS,
  // classic racing cars on plinths (they are real cars: take one).
  const EX = {
    x0: 350, x1: 416, z0: 1222, z1: 1438, h: 13, t: 0.6,
    foyer: { z0: 1312, z1: 1348, h: 7 }, door: { z0: 1323, z1: 1337 },
    load: { x0: 375, x1: 391, h: 6 },
    cars: [
      { type: 'ironclad', z: 1252, color: 0xa8101c },
      { type: 'vireo', z: 1282, color: 0xd4a017 },
      { type: 'lowrider', z: 1300, color: 0x0a6f7a },
      { type: 'zephyr', z: 1362, color: 0xe8e6e0 },
      { type: 'drifter', z: 1388, color: 0xf2c500 },
      { type: 'vireo', z: 1416, color: 0x121314 },
    ],
    plinthX: 383, plinthH: 0.3,
  };

  /** A box drawn in pieces no longer than 50 m along z (each in its own chunk), and solid. */
  function longBox(world, surf, x0, y0, z0, x1, y1, z1, hex, opts, tag, flags) {
    for (let z = z0; z < z1 - 1e-6; z += 50) {
      const zb = Math.min(z1, z + 50);
      world.ctxAt((x0 + x1) / 2, (z + zb) / 2)[surf].box(x0, y0, z, x1, y1, zb, col(hex), opts);
    }
    if (tag !== false) world.physics.addBox(x0, y0 <= KERB + 0.01 ? 0 : y0, z0, x1, y1, z1, tag || 'building', flags === undefined ? F().ALL : flags);
  }
  /** A window-grid facade (b.wall) along z in pieces, facing west (dir +1) or east (dir -1). */
  function facadeZ(world, x, z0, z1, h, dir, hex) {
    for (let z = z0; z < z1 - 1e-6; z += 48) {
      const zb = Math.min(z1, z + 48);
      const len = zb - z;
      const ctx = world.ctxAt(x, (z + zb) / 2);
      if (dir > 0) ctx.b.wall([x, 0, z], 0, 1, len, h, col(hex), null, [0, Math.max(1, Math.round(len / 6)), 0, 2], [0.4, 0.35, 1, 0.3]);
      else ctx.b.wall([x, 0, zb], 0, -1, len, h, col(hex), null, [0, Math.max(1, Math.round(len / 6)), 0, 2], [0.4, 0.35, 1, 0.3]);
    }
  }

  function buildExpo(world) {
    const W = K();
    const E = EX;
    const wallC = 0xe9e4d8, trim = 0x10324a;
    const H = KERB + E.h;
    // --- ground: the forecourt plaza, the floor inside, the service yard and the north car park
    W.pave(world, 339, 1193, E.x0, 1467, 0xe2dccd, 'plazaTop');
    // The hall floor (and its walls' lining, below) on the unshadowed interior surface: it reads lit, not in the roof's shadow.
    W.pave(world, E.x0, E.z0, E.x1, E.z1, 0xd9dcdf, 'interior', KERB + 0.014, 3);
    W.pave(world, E.x0, E.z1, 421, 1467, 0xb8b8ba, 'asphaltTop');
    W.pave(world, E.x0, 1193, 421, E.z0, 0xb8b8ba, 'asphaltTop');
    for (let x = 354; x < 414; x += 3) W.mark(world, x - 0.06, 1197, x + 0.06, 1209, 0xf4f4ef);
    // --- the shell: four walls (window-grid facades outside, plain inside), the roof
    const t = E.t;
    // West wall, either side of the foyer.
    for (const [z0, z1] of [[E.z0, E.foyer.z0], [E.foyer.z1, E.z1]]) {
      longBox(world, 'concrete', E.x0, 0, z0, E.x0 + t, H, z1, wallC);
      facadeZ(world, E.x0 - 0.02, z0, z1, H, 1, wallC);
    }
    // East wall (the bay side) and the two ends.
    longBox(world, 'concrete', E.x1 - t, 0, E.z0, E.x1, H, E.z1, wallC);
    facadeZ(world, E.x1 + 0.02, E.z0, E.z1, H, -1, wallC);
    const ctxN = world.ctxAt((E.x0 + E.x1) / 2, E.z0);
    W.solid(world, ctxN.concrete, E.x0, 0, E.z0, E.x1, H, E.z0 + t, wallC, null, 'building');
    ctxN.b.wall([E.x1, 0, E.z0 - 0.02], -1, 0, E.x1 - E.x0, H, col(wallC), null, [0, 11, 0, 2], [0.4, 0.35, 1, 0.3]);
    // South end: the loading door, open (a roller shutter rolled up under its lintel).
    const ctxS = world.ctxAt((E.x0 + E.x1) / 2, E.z1);
    const L = E.load;
    for (const [x0, x1] of [[E.x0, L.x0], [L.x1, E.x1]]) W.solid(world, ctxS.concrete, x0, 0, E.z1 - t, x1, H, E.z1, wallC, null, 'building');
    ctxS.concrete.box(L.x0, KERB + L.h, E.z1 - t, L.x1, H, E.z1, col(wallC));
    world.physics.addBox(L.x0, KERB + L.h, E.z1 - t, L.x1, H, E.z1, 'building', F().ALL);
    ctxS.prop.box(L.x0, KERB + L.h - 0.6, E.z1 - t - 0.4, L.x1, KERB + L.h, E.z1 - t, col(0x8a9097), { bottom: true });
    for (const x of [L.x0, L.x1]) {
      ctxS.prop.box(x - 0.3, 0, E.z1 - 0.05, x + 0.3, KERB + L.h + 0.3, E.z1 + 0.25, col(0xf2c230));
      world.physics.addBox(x - 0.3, 0, E.z1 - 0.05, x + 0.3, KERB + L.h + 0.3, E.z1 + 0.25, 'metal', F().ALL);
    }
    W.sign(world, { x: (L.x0 + L.x1) / 2, y: KERB + L.h + 1.2, z: E.z1 + 0.06, yaw: 0, w: 9, h: 1.0, lines: ['LOADING BAY 1 · KEEP CLEAR'], style: 'plaque', oneSided: true, colors: { bg: ['#f2c230', '#f2c230'], fg: '#1c1c1e', border: '#1c1c1e' } });
    // The roof: a slab (its underside is the ceiling), a parapet in club blue, roof lights.
    longBox(world, 'concrete', E.x0, H, E.z0, E.x1, H + 0.6, E.z1, 0xcfd3d6, { bottom: true }, 'building');
    longBox(world, 'prop', E.x0 - 0.1, H + 0.6, E.z0 - 0.1, E.x0 + 0.4, H + 1.6, E.z1 + 0.1, trim, null, false);
    longBox(world, 'prop', E.x1 - 0.4, H + 0.6, E.z0 - 0.1, E.x1 + 0.1, H + 1.6, E.z1 + 0.1, trim, null, false);
    // The lining inside: pale panels to 5 m, a club-blue band above (each solid, flush with the wall).
    for (const [x0, x1] of [[E.x0 + t, E.x0 + t + 0.05], [E.x1 - t - 0.05, E.x1 - t]]) {
      for (const [z0, z1] of x0 < 383 ? [[E.z0 + t, E.foyer.z0], [E.foyer.z1, E.z1 - t]] : [[E.z0 + t, E.z1 - t]]) {
        longBox(world, 'interior', x0, KERB, z0, x1, KERB + 5, z1, 0xf1efe8);
        longBox(world, 'interior', x0, KERB + 5, z0, x1, KERB + 6.2, z1, trim, null, false);
      }
    }
    // A red carpet from the doors to the trophy, then the length of the hall between the plinth rows.
    W.pave(world, E.x0 + t, 1326, 382, 1334, 0x9a1b22, 'interior', KERB + 0.03, 2);
    W.pave(world, 372, E.z0 + 8, 376, E.z1 - 8, 0x9a1b22, 'interior', KERB + 0.03, 2);
    // Banners hung from the roof down the hall: teal and gold, a racing number on each.
    for (let z = E.z0 + 18; z < E.z1 - 10; z += 24) {
      const ctx = world.ctxAt(383, z);
      ctx.prop.box(382.95, H - 6.5, z - 1.6, 383.05, H - 0.1, z + 1.6, col(Math.round(z / 24) % 2 ? 0x0f5f5a : 0xd4a017));
      ctx.prop.box(382.9, H - 4.6, z - 0.9, 383.1, H - 2.8, z + 0.9, col(0xf2f2ee));
    }
    // Ceiling lights in three long rows (they glow; the hall reads lit at night through the foyer).
    for (const x of [365, 383, 401]) {
      for (let z = E.z0 + 6; z < E.z1 - 6; z += 12) world.ctxAt(x, z).screen.box(x - 0.4, H - 0.12, z - 3, x + 0.4, H - 0.02, z + 3, VH.col(0xf6f8ff, 2.0));
    }
    // Pillars in two rows.
    for (const x of [368, 398]) {
      for (let z = E.z0 + 36; z < E.z1 - 20; z += 36) {
        const ctx = world.ctxAt(x, z);
        ctx.interior.box(x - 0.45, KERB, z - 0.45, x + 0.45, H, z + 0.45, col(0xe2e4e6));
        world.physics.addBox(x - 0.45, 0, z - 0.45, x + 0.45, H, z + 0.45, 'building', F().ALL);
      }
    }

    // --- the foyer: a glass box on the forecourt, doors wide open, a canopy
    const Fy = E.foyer;
    const fx0 = E.x0 - 7; // the foyer stands out onto the forecourt
    const ctxF = world.ctxAt(E.x0 - 3, (Fy.z0 + Fy.z1) / 2);
    const glass = VH.col(0x9fd0e8, 1.15);
    const mull = col(0x3a3f45);
    const DR = E.door;
    // Front glass either side of the doors, side walls of glass, a solid band above.
    for (const [z0, z1] of [[Fy.z0, DR.z0], [DR.z1, Fy.z1]]) {
      ctxF.screen.box(fx0, KERB, z0, fx0 + 0.12, KERB + Fy.h, z1, glass);
      world.physics.addBox(fx0, 0, z0, fx0 + 0.12, KERB + Fy.h, z1, 'glass', F().ALL);
      for (let z = z0; z <= z1 + 1e-6; z += (z1 - z0) / Math.max(1, Math.round((z1 - z0) / 3))) ctxF.prop.box(fx0 - 0.06, KERB, z - 0.06, fx0 + 0.18, KERB + Fy.h, z + 0.06, mull);
    }
    for (const z of [Fy.z0, Fy.z1 - 0.12]) {
      ctxF.screen.box(fx0, KERB, z, E.x0, KERB + Fy.h, z + 0.12, glass);
      world.physics.addBox(fx0, 0, z, E.x0, KERB + Fy.h, z + 0.12, 'glass', F().ALL);
    }
    ctxF.concrete.box(fx0 - 0.1, KERB + Fy.h, Fy.z0 - 0.1, E.x0, KERB + Fy.h + 1.4, Fy.z1 + 0.1, col(trim), { bottom: true });
    world.physics.addBox(fx0 - 0.1, KERB + Fy.h, Fy.z0 - 0.1, E.x0, KERB + Fy.h + 1.4, Fy.z1 + 0.1, 'building', F().ALL);
    // Inside the west wall above the foyer: the wall carries on above the foyer roof.
    longBox(world, 'concrete', E.x0, KERB + Fy.h, Fy.z0, E.x0 + t, H, Fy.z1, wallC);
    // The doors themselves: two pairs of glass leaves folded back against the front.
    for (const z of [DR.z0 + 0.1, DR.z1 - 0.1]) {
      const s = z < (DR.z0 + DR.z1) / 2 ? 1 : -1;
      ctxF.screen.box(fx0 - 1.6, KERB, z - 0.05, fx0 - 0.1, KERB + 2.6, z + 0.05, glass);
      ctxF.prop.box(fx0 - 1.65, KERB, z - 0.07, fx0 - 0.05, KERB + 0.12, z + 0.07, mull);
      world.physics.addBox(fx0 - 1.6, 0, z - 0.06, fx0 - 0.1, KERB + 2.6, z + 0.06, 'glass', F().ALL);
      void s;
    }
    // The door opening in the foyer front (a frame).
    ctxF.prop.box(fx0 - 0.1, KERB + 3.2, DR.z0, fx0 + 0.2, KERB + Fy.h, DR.z1, col(trim));
    world.physics.addBox(fx0 - 0.1, KERB + 3.2, DR.z0, fx0 + 0.2, KERB + Fy.h, DR.z1, 'building', F().ALL);
    // A doormat, the welcome desk inside.
    world.ctxAt(fx0 + 2, 1330).decal.topRect(fx0 + 0.3, DR.z0 + 1, fx0 + 4, DR.z1 - 1, KERB + 0.02, col(0x2a2d33));
    W.solid(world, ctxF.prop, E.x0 - 3.2, KERB, Fy.z0 + 3, E.x0 - 1.4, KERB + 1.1, Fy.z0 + 9, 0xeef0f2, null, 'building');
    // Cardboard Rex Castellane in the doorway, waving (a flat cut-out on a stand).
    {
      const rx = fx0 - 2.2, rz = DR.z0 + 1.6;
      const ctx = world.ctxAt(rx, rz);
      ctx.prop.box(rx - 0.03, KERB, rz - 0.25, rx + 0.03, KERB + 0.95, rz + 0.25, col(0x23262b)); // trousers
      ctx.prop.box(rx - 0.03, KERB + 0.95, rz - 0.32, rx + 0.03, KERB + 1.6, rz + 0.32, col(0xf2f2ee)); // white racing jacket
      ctx.prop.box(rx - 0.035, KERB + 1.2, rz - 0.33, rx + 0.035, KERB + 1.32, rz + 0.33, col(0xd4a017)); // gold stripe
      ctx.prop.box(rx - 0.03, KERB + 1.62, rz - 0.13, rx + 0.03, KERB + 1.92, rz + 0.13, col(0xe0b090)); // face
      ctx.prop.box(rx - 0.03, KERB + 1.88, rz - 0.15, rx + 0.03, KERB + 1.98, rz + 0.15, col(0xb8b8b4)); // silver hair
      W.tiltBox(ctx.prop, rx, KERB + 1.82, rz + 0.48, 0.06, 0.62, 0.13, 0, -0.5, col(0xf2f2ee)); // the waving arm
      ctx.prop.box(rx + 0.03, KERB, rz - 0.3, rx + 0.4, KERB + 0.04, rz + 0.3, col(0x5a4636)); // the stand
      world.physics.addBox(rx - 0.06, 0, rz - 0.34, rx + 0.4, KERB + 1.98, rz + 0.34, 'plank', F().SOLID | F().CAMERA);
      world.physics.addBox(rx - 0.06, KERB + 1.45, rz + 0.34, rx + 0.06, KERB + 2.2, rz + 0.7, 'plank', F().SOLID | F().CAMERA);
    }

    // --- outside: signs, flags, lamps, benches
    W.sign(world, { x: E.x0 - 0.15, y: H - 2.4, z: 1270, yaw: -PI / 2, w: 44, h: 3.4, lines: ['SOUTHBAY EXPO HALL'], style: 'neon', oneSided: true, flat: false, colors: { bg: ['#10324a', '#1f6f8a'], fg: '#ffffff', glow: '#7fd0ff', outline: '#7fd0ff' } });
    W.sign(world, { x: E.x0 - 0.15, y: KERB + 6.8, z: 1390, yaw: -PI / 2, w: 14, h: 11, lines: ['CASTELLANE', '50 YEARS', 'OF CHAMPIONS', 'NOW SHOWING'], style: 'plaque', oneSided: true, colors: { bg: ['#0f5f5a', '#0a3f3c'], fg: '#e8d080', border: '#d4a017' } });
    for (let z = 1205; z < 1462; z += 22) {
      if (z > Fy.z0 - 4 && z < Fy.z1 + 4) continue;
      const ctx = world.ctxAt(341.5, z);
      ctx.prop.cylinder(341.5, KERB, z, 0.09, 0.07, 9, 8, col(0xd0d4d8), true);
      world.physics.addBox(341.4, 0, z - 0.1, 341.6, KERB + 9, z + 0.1, 'pole', F().ALL);
      ctx.prop.box(341.45, KERB + 7.2, z + 0.1, 341.55, KERB + 8.8, z + 2.5, col([0x0f5f5a, 0xd4a017, 0x1f6f8a][Math.round(z / 22) % 3]));
    }
    for (const z of [1240, 1290, 1370, 1420]) world.addProp('streetlight', 340.6, KERB, z, -PI / 2, 1);
    for (const z of [1300, 1360]) world.addProp('bench', 345, KERB, z, -PI / 2, 1);
    world.addProp('streetlight', 400, KERB, E.z1 + 12, PI, 1);
    // A pool of light on the forecourt and in the doorway; the hall's own light inside.
    const pools = world.floodlights || (world.floodlights = []);
    pools.push({ x: fx0 - 2, z: 1330, r: 10, y: KERB + 0.03, strength: 0.6, tint: [1.2, 1.1, 0.9] });
    for (let z = E.z0 + 16; z < E.z1; z += 30) for (const x of [368, 398]) pools.push({ x, z, r: 20, y: KERB + 0.03, strength: 0.8, tint: [1.15, 1.1, 1.0] });

    // --- inside: plinths for the cars, a trophy island in the middle, display boards
    for (const c of E.cars) {
      const ctx = world.ctxAt(E.plinthX, c.z);
      const x0 = E.plinthX - 3.6, x1 = E.plinthX + 3.6, z0 = c.z - 2.4, z1 = c.z + 2.4;
      ctx.prop.box(x0, KERB, z0, x1, KERB + E.plinthH, z1, col(0x23262b));
      ctx.prop.box(x0 - 0.02, KERB + E.plinthH - 0.06, z0 - 0.02, x1 + 0.02, KERB + E.plinthH, z1 + 0.02, col(0xd4a017));
      world.physics.addBox(x0, 0, z0, x1, KERB + E.plinthH, z1, 'stone', F().ALL);
      // A display board beside each car: a lit photo panel on two legs.
      const bx = E.plinthX + 7.5;
      ctx.prop.box(bx - 0.1, KERB, c.z - 1.6, bx + 0.1, KERB + 2.4, c.z + 1.6, col(0x10324a));
      ctx.screen.box(bx - 0.13, KERB + 0.9, c.z - 1.4, bx + 0.13, KERB + 2.2, c.z + 1.4, VH.col(0xf2e8c8, 1.3));
      world.physics.addBox(bx - 0.12, 0, c.z - 1.6, bx + 0.12, KERB + 2.4, c.z + 1.6, 'wall', F().ALL);
    }
    // The trophy island opposite the doors: a round dais and a big gold cup.
    {
      const tx = 386, tz = 1330;
      const ctx = world.ctxAt(tx, tz);
      ctx.prop.cylinder(tx, KERB, tz, 4, 4, 0.5, 20, col(0x23262b), true);
      ctx.prop.cylinder(tx, KERB + 0.5, tz, 1.0, 0.8, 1.0, 12, col(0xeef0f2), true);
      ctx.prop.cylinder(tx, KERB + 1.5, tz, 0.25, 0.5, 0.9, 12, col(0xd4a017), true);
      ctx.prop.cylinder(tx, KERB + 2.4, tz, 0.5, 0.75, 0.9, 12, col(0xd4a017), true);
      VH.SouthKit.disc(world, tx, tz, 4, 0, KERB + 0.5, 'stone');
      VH.SouthKit.disc(world, tx, tz, 1.0, 0, KERB + 3.3, 'stone');
    }
    W.sign(world, { x: E.x1 - t - 0.1, y: KERB + 6.5, z: 1330, yaw: -PI / 2, w: 24, h: 3.6, lines: ['CASTELLANE · 50 YEARS OF CHAMPIONS', 'SOUTHBAY 500 · WINNERS 1961 – TODAY'], style: 'plaque', oneSided: true, colors: { bg: ['#0f5f5a', '#0a3f3c'], fg: '#e8d080', border: '#d4a017' } });
  }

  // ------------------------------------------------------------ the grid
  /** Grid slot j (0 = pole): two abreast, 9 m apart, behind the line. */
  function gridSlot(j) {
    const row = Math.floor(j / 2);
    const o = j % 2 ? -3.5 : 3.5;
    const s = LEN - 7 - row * 9;
    const p = trackAt(s, o, {});
    return { x: p.x, z: p.z, yaw: Math.atan2(p.hx, p.hz), s, o };
  }

  // -------------------------------------------------------- the circuits
  /**
   * VH.Circuits: closed circuits races can run on. A circuit has a racing
   * line sampled every metre; find(checkpoints) returns the circuit all a
   * race's checkpoints lie on, grid(i, base) a starting slot behind the car
   * at base, driver(...) an AI racer that follows the line.
   */
  class Circuit {
    constructor(def) {
      Object.assign(this, def);
      const n = Math.ceil(this.length);
      this.n = n;
      this.xs = new Float32Array(n);
      this.zs = new Float32Array(n);
      this.hx = new Float32Array(n);
      this.hz = new Float32Array(n);
      this.k = new Float32Array(n); // curvature (1/m)
      const p = {};
      for (let i = 0; i < n; i++) {
        this.at((i / n) * this.length, 0, p);
        this.xs[i] = p.x; this.zs[i] = p.z; this.hx[i] = p.hx; this.hz[i] = p.hz;
        this.k[i] = p.curved ? 1 / this.radius : 0;
      }
      this.drivers = new Set();
      this.playerDist = 0;
    }
    /** How far Jay has gone round since the race started (once per frame, from any driver). */
    trackPlayer(game) {
      if (this._pt === game.time) return;
      const first = this._pt === undefined || game.time - this._pt > 1;
      this._pt = game.time;
      const pv = game.player && game.player.vehicle;
      const pos = pv ? pv.pos : game.player.pos;
      const s = this.project(pos.x, pos.z, first ? undefined : this._ps);
      if (first) this.playerDist = 0;
      else {
        let ds = s - this._ps;
        if (ds < -this.length / 2) ds += this.length;
        if (ds > this.length / 2) ds -= this.length;
        this.playerDist += ds;
      }
      this._ps = s;
    }
    contains(x, z) {
      return x > this.bounds[0] && x < this.bounds[2] && z > this.bounds[1] && z < this.bounds[3];
    }
    /** Nearest s to (x, z), searching near a guess (or everywhere). */
    project(x, z, guess) {
      const n = this.n;
      let best = -1, bd = Infinity;
      const scan = (i0, i1) => {
        for (let j = i0; j <= i1; j++) {
          const i = ((j % n) + n) % n;
          const dx = this.xs[i] - x, dz = this.zs[i] - z;
          const d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = i; }
        }
      };
      if (guess !== undefined && guess !== null) {
        const g = Math.round((guess / this.length) * n);
        scan(g - 12, g + 40);
      }
      if (best < 0 || bd > 400) { bd = Infinity; scan(0, n - 1); }
      return (best / n) * this.length;
    }
    /** Lateral offset (outwards +) of (x, z) from the line at s. */
    lateral(x, z, s) {
      const i = Math.floor((s / this.length) * this.n) % this.n;
      return (x - this.xs[i]) * -this.hz[i] + (z - this.zs[i]) * this.hx[i];
    }
    gridSlot(i, base) {
      // Slot 0 is the car at base; rivals take the slots behind it.
      let s0 = LEN - 7;
      let o0 = 3.5;
      if (base) {
        s0 = this.project(base.x, base.z);
        o0 = this.lateral(base.x, base.z, s0) >= 0 ? 3.5 : -3.5;
      }
      const j = i + 1;
      const row = Math.floor(j / 2);
      const o = j % 2 ? -o0 : o0;
      const p = this.at(s0 - row * 9, o, {});
      return { x: p.x, z: p.z, yaw: Math.atan2(p.hx, p.hz) };
    }
    driver(engine, v, cps, skill) {
      return new CircuitDriver(engine, this, v, cps, skill);
    }
  }

  class CircuitDriver {
    constructor(engine, circuit, v, cps, skill) {
      this.game = engine.game;
      this.c = circuit;
      this.v = v;
      this.cps = cps;
      this.i = 0;
      this.skill = Math.max(0.4, Math.min(1.1, skill || 0.85));
      this.finished = false;
      this.go = false;
      this.s = circuit.project(v.pos.x, v.pos.z);
      this.lane = circuit.lateral(v.pos.x, v.pos.z, this.s);
      this.targetLane = this.lane > 0 ? 2.5 : -2.5;
      this._sense = Math.random() * 0.2;
      this.dist = 0;
      this._bds = Infinity;
      this._blat = 0;
      this._bv = 0;
      this._stuck = 0;
      this._rev = 0;
      this._p = {};
      this._l = {};
      circuit.drivers.add(this);
      // Race cars are built for door-banging: a rival takes a quarter of the knocks (vehicle.damage).
      if (!v.damageScale) v.damageScale = 1;
    }
    onBump() {}
    update(v, dt) {
      const C = this.c;
      if (v.wrecked || v.removed) {
        C.drivers.delete(this);
        return;
      }
      if (!this.go) {
        v.input.accel = 0;
        v.input.steer = 0;
        v.input.handbrake = 1;
        return;
      }
      const s0 = this.s;
      this.s = C.project(v.pos.x, v.pos.z, this.s);
      let ds = this.s - s0;
      if (ds < -C.length / 2) ds += C.length;
      if (ds > C.length / 2) ds -= C.length;
      this.dist += ds;
      C.trackPlayer(this.game);
      // Checkpoints, exactly as the street racers count them.
      if (!this.finished) {
        const cp = this.cps[this.i];
        if (Math.hypot(cp.x - v.pos.x, cp.z - v.pos.z) < 14) {
          this.i++;
          if (this.i >= this.cps.length) {
            this.finished = true;
            this.finishTime = this.game.time;
          }
        }
      }
      const speed = Math.max(0, v.vF);
      // Traffic: four times a second, move over for a car close ahead in our lane.
      this._sense -= dt;
      if (this._sense <= 0) {
        this._sense = 0.22 + Math.random() * 0.08;
        this._senseAhead(v, speed);
      }
      const want = this.finished ? -6.2 : this.targetLane;
      this.lane += Math.max(-2.2 * dt, Math.min(2.2 * dt, want - this.lane));
      // Stuck against something: back off and try again.
      if (this._rev > 0) {
        this._rev -= dt;
        v.input.accel = -0.8;
        v.input.steer = -this._revSteer;
        v.input.handbrake = 0;
        return;
      }
      if (speed < 1.2 && v.input.accel > 0.3) this._stuck += dt;
      else this._stuck = Math.max(0, this._stuck - dt);
      if (this._stuck > 1.8) {
        this._stuck = 0;
        this._rev = 1.2;
        this._revSteer = v.input.steer || 1;
      }
      // Steering: pure pursuit on a point of the line ahead, in our lane.
      const look = 7 + speed * 0.42;
      const p = C.at(this.s + look, this.lane, this._p);
      const l = v.worldToLocal(p.x, p.z, this._l);
      const d2 = l.x * l.x + l.z * l.z;
      const curv = d2 > 0.01 ? (2 * l.x) / d2 : 0;
      const angle = Math.atan(v.wheelbase * curv);
      const lock = VH.math.lerp(0.62, 0.15, VH.math.smoothstep(4, 46, Math.abs(v.vF))) * v.tune.steer;
      v.input.steer = VH.math.clamp(angle / Math.max(0.05, lock), -1, 1);
      // Speed: as fast as the car goes, slowing in time for the turns.
      const aLat = C.grip * (0.82 + 0.22 * this.skill);
      let target = this.finished ? 13 : (v.topSpeed || 40) * (0.86 + 0.14 * this.skill);
      const brake = 7.5;
      const reach = (speed * speed) / (2 * brake) + 12;
      for (let d = 0; d <= reach; d += 6) {
        const i = Math.floor((((this.s + d) % C.length) / C.length) * C.n);
        const k = C.k[i];
        if (k > 0) {
          const vc = Math.sqrt(aLat / Math.max(1e-4, 1 / (1 / k + this.lane)));
          target = Math.min(target, Math.sqrt(vc * vc + 2 * brake * Math.max(0, d - 4)));
        }
      }
      // A little kind: a rival well ahead of Jay eases off (up to a tenth).
      const lead = this.dist - C.playerDist;
      if (!this.finished && lead > 25) target *= 1 - Math.min(0.1, (lead - 25) / 400);
      // Off the track (spun into the infield or the pit lane): crawl back on.
      const off = Math.abs(C.lateral(v.pos.x, v.pos.z, this.s));
      if (off > SP.HW + 0.5) target = Math.min(target, 9);
      // Boxed in behind a car we can't get round yet: sit on its bumper.
      if (this._bds < 9 + speed * 0.25 && Math.abs(this._blat - this.lane) < 2.4) target = Math.min(target, this._bv - 0.5 + this._bds * 0.08);
      v.input.handbrake = 0;
      v.input.boost = 0;
      if (speed < target - 0.5) v.input.accel = 1;
      else if (speed > target + 1.5) v.input.accel = speed < 1 ? 0 : -Math.min(1, (speed - target) / 4);
      else v.input.accel = 0.25;
    }
    _consider(o, os, speed) {
      const C = this.c;
      let ds = os - this.s;
      if (ds < -C.length / 2) ds += C.length;
      if (ds > C.length / 2) ds -= C.length;
      if (ds <= 0 || ds > 10 + speed * 0.5) return;
      const lat = C.lateral(o.pos.x, o.pos.z, os);
      if (Math.abs(lat - this.lane) < 2.9 && ds < this._bds) {
        this._bds = ds;
        this._blat = lat;
        this._bv = Math.max(0, o.vF || 0);
      }
    }
    _senseAhead(v, speed) {
      const C = this.c;
      this._bds = Infinity;
      for (const d of C.drivers) {
        if (d === this) continue;
        if (!d.v || d.v.removed || d.v.wrecked) {
          C.drivers.delete(d); // a race that's over
          continue;
        }
        this._consider(d.v, d.s, speed);
      }
      const pv = this.game.player && this.game.player.vehicle;
      if (pv && C.contains(pv.pos.x, pv.pos.z)) this._consider(pv, C.project(pv.pos.x, pv.pos.z), speed);
      if (this._bds < Infinity) this.targetLane = this._blat > 0 ? Math.max(-6, this._blat - 4.2) : Math.min(6, this._blat + 4.2);
      else if (Math.random() < 0.15) this.targetLane = Math.max(-5, Math.min(5, this.targetLane * 0.6));
    }
  }

  VH.Circuits = VH.Circuits || {
    list: [],
    add(c) {
      this.list.push(c);
      return c;
    },
    /** The circuit every checkpoint of a race lies on, if there is one. */
    find(cps) {
      if (!cps || !cps.length) return null;
      for (const c of this.list) if (cps.every((p) => p && c.contains(p.x, p.z))) return c;
      return null;
    },
  };

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      if (!layout.plots || !layout.plots.southbay_speedway) return;
      const R = o.R;
      const box = (x0, z0, x1, z1, c, sh) => K().mapBox(g, R, x0, z0, x1, z1, c, sh);
      box(SP.x0, SP.z0, SP.x1, SP.z1, '#cfc9bb', false);
      // The track as a thick ring of rectangles; the infield green.
      g.fillStyle = '#5f5f63';
      const p = {};
      for (let s = 0; s < LEN; s += 3) {
        trackAt(s, 0, p);
        R(p.x - 9.5, p.z - 9.5, p.x + 9.5, p.z + 9.5);
      }
      g.fillStyle = '#8fbf6a';
      R(SP.xw, SP.cz - 59, SP.xe, SP.cz + 59);
      if (o.circle) {
        o.circle(SP.xw, SP.cz, 60);
        o.circle(SP.xe, SP.cz, 60);
      }
      box(SP.pits.x0, SP.pits.z0, SP.pits.x1, SP.garages.z1, '#9a9a9e', false);
      box(SP.stand.x0, SP.stand.zb - 2, SP.stand.x1, SP.stand.zf, '#e8762a');
      box(SP.backStand.x0, SP.backStand.z0, SP.backStand.x1, SP.backStand.z1, '#e8762a');
      g.fillStyle = '#ffffff';
      R(SP.lineX - 1, SP.zn - 9, SP.lineX + 1, SP.zn + 9);
      if (layout.plots.mariner_stadium) {
        box(13, 1199, 321, 1463, '#a9a9ad', false);
        // The bowl: rings of rectangles (the stands), the pitch inside.
        for (let i = 0; i < 72; i++) {
          const t = (i / 72) * 2 * PI;
          for (const [d, c, r] of [[3, '#d9ccb0', 4], [12, '#1f4f7a', 6], [ST.dF + 2.6, '#b5523a', 3]]) {
            g.fillStyle = c;
            const x = ST.cx + (ST.a - d) * Math.cos(t), z = ST.cz + (ST.b - d) * Math.sin(t);
            R(x - r, z - r, x + r, z + r);
          }
        }
        g.fillStyle = '#6aa84f';
        R(ST.cx - 40, ST.cz - 24, ST.cx + 40, ST.cz + 24);
        g.fillStyle = '#f2c230';
        R(BJ.bus0, BJ.z - 6, BJ.bus1, BJ.z + 6);
      }
    });
  }

  // --------------------------------------------------------- moving parts
  class BowlLife {
    constructor(game) {
      this.game = game;
      const W = K();
      if (!W || !game.world || !game.world.theBowlStadium) return;
      // Parked cars in the stadium car park (about one bay in three).
      const list = [];
      let seed = 4111;
      for (const rx of [30, 58, 86, 114]) {
        for (const [z0, z1] of [[1206, 1300], [1324, 1408]]) {
          for (let z = z0 + 1.5; z < z1; z += 3) {
            seed++;
            if (VH.math.hash2(seed, 5) < 0.62) continue;
            const west = VH.math.hash2(seed, 9) < 0.5;
            list.push(W.parkedSpot(rx + (west ? -2.8 : 2.8), z, west ? PI / 2 : -PI / 2, seed));
          }
        }
      }
      W.addParkedSpots(game, list);
      // The classic cars at the Expo Hall's show wait on their plinths (take one; another is wheeled in).
      if (game.world.theBowlExpo && game.vehicles && game.vehicles.addFixedSpot) {
        for (const c of EX.cars) game.vehicles.addFixedSpot({ type: c.type, x: EX.plinthX, z: c.z, yaw: -PI / 2, y: KERB + EX.plinthH, color: c.color, r: 4 });
      }
    }
    update() {}
    stop() {}
    reset() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'The Bowl',
    plots: ['southbay_speedway', 'mariner_stadium', 'expo_hall'],
    build(world, layout) {
      return VH.SouthKit.withUndersides(() => this._build(world, layout)); // canopies, ceilings and lamps show from below
    },
    _build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.southbay_speedway || !VH.WNKit) return;
      buildSpeedway(world);
      if (layout.plots.mariner_stadium) {
        buildStadium(world);
        buildStadiumParks(world);
        world.theBowlStadium = true;
      }
      if (layout.plots.expo_hall) {
        buildExpo(world);
        world.theBowlExpo = true;
      }
      VH.Circuits.add(new Circuit({
        id: 'southbay_speedway',
        name: 'Southbay Speedway',
        length: LEN,
        radius: SP.R,
        grip: 9.2,
        bounds: [SP.x0 - 2, SP.zn - SP.HW - 6, SP.x1 + 2, SP.zs + SP.HW + 6],
        at: trackAt,
      }));
      world.theBowl = true;
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      if (!world.theBowl) return;
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const t = (s, o) => trackAt(s, o, {});
      const g0 = gridSlot(0);
      add('southbay_speedway', { name: 'Southbay Speedway', x: (SP.tunnel.x0 + SP.tunnel.x1) / 2, z: SP.z0 + 4, yaw: 0, kind: 'parking', landmark: true });
      add('speedway_grid', { name: 'The grid, Southbay Speedway', x: g0.x, z: g0.z, yaw: -PI / 2, kind: 'street' });
      const t1 = t(HALF + ARC / 2, 0);
      add('speedway_turn1', { name: 'Turn one, Southbay Speedway', x: t1.x, z: t1.z, yaw: PI, kind: 'street' });
      const bs = t(HALF + ARC + STR / 2, 0);
      add('speedway_back_straight', { name: 'The back straight, Southbay Speedway', x: bs.x, z: bs.z, yaw: PI / 2, kind: 'street' });
      const t3 = t(HALF + ARC + STR + ARC / 2, 0);
      add('speedway_turn3', { name: 'Turn three, Southbay Speedway', x: t3.x, z: t3.z, yaw: 0, kind: 'street' });
      add('speedway_pits', { name: 'The pits, Southbay Speedway', x: 145, z: SP.pits.z0 + 6, yaw: 0, kind: 'garage' });
      add('winners_enclosure', { name: "The winners' enclosure", x: (SP.enclosure.x0 + SP.enclosure.x1) / 2, z: SP.enclosure.z0 + 4.5, yaw: 0, kind: 'storefront' });
      add('speedway_tunnel', { name: 'The tunnel under the main stand', x: (SP.tunnel.x0 + SP.tunnel.x1) / 2, z: (SP.stand.zb + SP.stand.zf) / 2, yaw: 0, kind: 'street' });
      add('commentary_box', { name: 'The commentary box', x: SP.lineX, z: SP.stand.zb + 3, y: SP.yBack + 0.6, yaw: 0, kind: 'storefront' });
      add('speedway_back_gate', { name: 'The service gate, Southbay Speedway', x: (SP.backGate.x0 + SP.backGate.x1) / 2, z: SP.zs + SP.HW + 6, yaw: 0, kind: 'street' });
      if (world.theBowlStadium) {
        const gx = ST.cx - ST.a;
        add('mariner_stadium', { name: 'Mariner Stadium', x: gx - 16, z: ST.cz, yaw: PI / 2, kind: 'street', landmark: true });
        add('stadium_gate', { name: 'The marathon gate, Mariner Stadium', x: gx - 6, z: ST.cz, yaw: PI / 2, kind: 'street' });
        add('stadium_apron_north', { name: 'The apron road, north of the stadium', x: ST.cx, z: ST.cz - ST.b - 6.5, yaw: PI / 2, kind: 'street' });
        add('stadium_apron_south', { name: "The apron road by the players' entrance", x: ST.cx + 14, z: ST.cz + ST.b + 6.5, yaw: -PI / 2, kind: 'street' });
        add('bowl_car_park', { name: 'The stadium car park', x: 72, z: ST.cz, yaw: PI / 2, kind: 'parking' });
        add('stadium_bus_ramp', { name: 'The bus jump, stadium car park', x: BJ.x0 - 2, z: BJ.z, yaw: PI / 2, kind: 'parking' });
      }
      if (world.theBowlExpo) {
        add('expo_hall', { name: 'Southbay Expo Hall', x: EX.x0 - 10, z: (EX.door.z0 + EX.door.z1) / 2, yaw: PI / 2, kind: 'storefront', landmark: true });
      }
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: 197, z: SP.pits.z0 + 6, yaw: 0, kinds: ['garage', 'parking'], name: 'The pit lane' },
          { x: 167, z: SP.garages.z1 + 2, yaw: 0, kinds: ['street', 'alley', 'parking'], name: 'The paddock road' },
          { x: 70, z: SP.z0 + 5, yaw: 0, kinds: ['street', 'corner', 'parking'], name: 'The Speedway plaza' },
        );
        if (world.theBowlStadium) {
          extra.push(
            { x: 44, z: 1250, yaw: 0, kinds: ['parking', 'street'], name: 'Car park A, Mariner Stadium' },
            { x: 100, z: 1380, yaw: PI, kinds: ['parking', 'corner'], name: 'Car park D, Mariner Stadium' },
            { x: 225, z: 1214, yaw: PI / 2, kinds: ['parking', 'street'], name: 'The coach bays, Mariner Way' },
            { x: ST.cx - 8, z: 1232, yaw: 0, kinds: ['plaza', 'street', 'corner'], name: "The fans' forecourt, Mariner Stadium" },
            { x: ST.cx, z: ST.cz + ST.b - 6, yaw: 0, kinds: ['alley'], name: "The players' tunnel, Mariner Stadium" },
            { x: ST.cx + ST.a + 6, z: ST.cz + 20, yaw: PI, kinds: ['street', 'alley', 'corner'], name: 'The apron road, east side' },
            { x: ST.cx, z: ST.cz, yaw: PI / 2, kinds: ['park', 'overlook'], name: 'The pitch, Mariner Stadium' },
          );
        }
        if (world.theBowlExpo) {
          extra.push(
            { x: (EX.load.x0 + EX.load.x1) / 2, z: EX.z1 + 10, yaw: PI, kinds: ['warehouse', 'garage', 'parking'], name: 'The Expo Hall loading yard' },
            { x: EX.x0 + 12, z: 1330, yaw: PI / 2, kinds: ['storefront', 'warehouse'], name: 'Inside the Expo Hall' },
            { x: 384, z: 1203, yaw: 0, kinds: ['parking', 'street'], name: 'The Expo Hall car park' },
          );
        }
      }
    },
    System: BowlLife,
  });
})();
