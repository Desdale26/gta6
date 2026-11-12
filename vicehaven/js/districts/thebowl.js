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
    // The front wall the tiers sit on (the outer wall carries on below it).
    for (const [x0, x1] of halves) W.solid(world, world.ctxAt((x0 + x1) / 2, S.zf).concrete, x0, 0, S.zf - 0.4, x1, KERB + 1.4, S.zf, 0xd9d4c8, null, 'building');
    // Over the tunnel: a lintel from its roof up to the first tier above it.
    const ctxT = world.ctxAt((T.x0 + T.x1) / 2, S.zf);
    W.solid(world, ctxT.concrete, T.x0, KERB + T.h, S.zf - 4, T.x1, KERB + T.h + 1.2, S.zf, 0xd9d4c8, null, 'building');
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
    for (const x of [T.x0 + 0.05, T.x1 - 0.05]) ctxT.prop.box(x - 0.05, KERB + 0.1, S.zb, x + 0.05, KERB + 1.0, S.zf, col(0xf2c230));
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
        ctx.concrete.box(tx0, KERB + T.h, S.zb - 2, tx1, yBack + 3, S.zb, wallC);
      } else {
        ctx.b.wall([xb, 0, S.zb - 2], -1, 0, xb - x, yBack + 3, wallC, null, [0, Math.max(1, Math.round((xb - x) / 4)), 0, 4], [0.55, 0.5, 1, 0.3]);
      }
    }
    for (const [x0, x1] of halves) world.physics.addBox(x0, 0, S.zb - 2, x1, yBack + 3, S.zb + 0.01, 'building', F().ALL);
    world.physics.addBox(T.x0, KERB + T.h, S.zb - 2, T.x1, yBack + 3, S.zb, 'building', F().ALL);
    // End walls.
    for (const x of [S.x0, S.x1]) {
      const ctx = world.ctxAt(x, (S.zb + S.zf) / 2);
      const x0 = x === S.x0 ? x - 0.6 : x, x1 = x === S.x0 ? x : x + 0.6;
      ctx.concrete.box(x0, 0, S.zb - 2, x1, yBack + 3, S.zf, col(0xd9d4c8));
      world.physics.addBox(x0, 0, S.zb - 2, x1, yBack + 3, S.zf, 'building', F().ALL);
    }
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
    for (const [x0, x1, h, c] of [[cxE - 1.4, cxE + 1.4, 0.75, 0xd9b45a], [cxE - 4.2, cxE - 1.4, 0.5, 0xc8ccd0], [cxE + 1.4, cxE + 4.2, 0.35, 0xb87333]]) {
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
    });
  }

  // --------------------------------------------------------- moving parts
  class BowlLife {
    constructor(game) {
      this.game = game;
    }
    update() {}
    stop() {}
    reset() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'The Bowl',
    plots: ['southbay_speedway'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.southbay_speedway || !VH.WNKit) return;
      buildSpeedway(world);
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
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: 197, z: SP.pits.z0 + 6, yaw: 0, kinds: ['garage', 'parking'], name: 'The pit lane' },
          { x: 167, z: SP.garages.z1 + 2, yaw: 0, kinds: ['street', 'alley', 'parking'], name: 'The paddock road' },
          { x: 70, z: SP.z0 + 5, yaw: 0, kinds: ['street', 'corner', 'parking'], name: 'The Speedway plaza' },
        );
      }
    },
    System: BowlLife,
  });
})();
