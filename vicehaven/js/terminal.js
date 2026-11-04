/*
 * terminal.js — the terminal at Vicehaven International: a glass hall Jay
 * can walk into from the kerb, through check-in and security, along the
 * concourse to the four gates and down the jet bridges to the planes'
 * doors, and back out through baggage reclaim and arrivals.
 *
 *   VH.Terminal.build(world, layout, data)  the building (world build time;
 *                                           Airfield.build calls it): the
 *                                           static geometry goes into merged
 *                                           chunk meshes, and world.terminal
 *                                           describes the place for the
 *                                           people (airportlife.js)
 *   VH.Terminal.registerPlaces(world, p)    airport_arrivals (at its doors)
 *   new VH.Terminal(game)                   what moves: the sliding doors, the
 *                                           flight boards, the carousels and
 *                                           their bags, the security arches
 *                                           (a gun sets them off), the hall
 *                                           lights at night, isInside()
 *
 * The plan (x east, z south; metres). The hall stands on a low plinth with
 * its floor at FY; the forecourt ramps gently up to it from the kerb.
 *
 *   x -430            -350      -290              -195              -80
 *   z -1245 +--glass--A1 door(-376)--A2(-286)--------A3(-196)----A4(-106)--+
 *           |  CONCOURSE: gate lounges, seats facing the planes, desks     |
 *   z -1229 |  ·   ·   ·   ·   ·  (columns)  ·   ·    +--wall, door -189---+
 *           | duty free, news,  |SECURITY| food court, | BAGGAGE RECLAIM     |
 *           | gifts, toilets    |4 lanes | café, shops | carousels 1 and 2   |
 *   z -1216 +===partition=======+ queues +=============+=====exit -136======+
 *           | DEPARTURES: three check-in | info, café, | ARRIVALS: meeting   |
 *           | islands (A, B, C)          | Sunrise 24/7| rail, car hire, café|
 *   z -1196 +--doors -402.5, -377.5, -320 ---- -235 ------ -165 ---- -112 --+
 *             forecourt ramp, drop-off canopy, kerb (z -1191..-1189)
 *             Airport Road (the north lanes head west: cars stop at the kerb)
 *
 * Jet bridges: from each gate door (x = stand + 14) a tunnel runs north up
 * to a rotunda on a column, then a second tunnel runs west to the parked
 * airliner's front door (the stand's `door`), rising from FY to 3 m.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, damp, smoothstep } = VH.math;
  const F = () => VH.COLLIDE;

  // ---------------------------------------------------------------- plan
  const X0 = -430;
  const X1 = -80;
  const Z0 = -1245; // the airside (north) wall
  const Z1 = -1196; // the landside front
  const FY = 0.45; // the hall floor (the step-up limit is 0.45, so the plinth is walkable too)
  const CEIL = FY + 9.6; // underside of the roof inside
  const ROOF = CEIL + 0.9; // top of the roof slab
  const KERB = 0.15;
  const KERB_Z = -1191; // the kerb strip runs from here to Airport Road's edge
  const ROAD_Z = -1189;
  const PZ = -1216; // the partition between landside and airside
  const NZ = -1229; // airside shops / concourse (a line of columns)
  const WALL_H = 4.2; // partitions inside the hall
  const SEC = { x0: -350, x1: -290, z: -1221 }; // security, and its barrier line
  const LANES = [-337.5, -325, -312.5, -300]; // lane centres: x-ray belt to the west, arch to the east
  const EXIT = { x0: -139, x1: -133 }; // reclaim → arrivals hall
  const REC = { x0: -195, door0: -192, door1: -186 }; // baggage reclaim (to the east wall)
  const ISLANDS = [-415, -390, -365]; // check-in islands (centres), desks on both sides
  const ISLAND_Z = [-1201.6, -1212.6];
  const DESK_Z = [-1203.2, -1205.9, -1208.6, -1211.3];
  const DOORS = [
    { id: 'dep1', x: -402.5, kind: 'departures' },
    { id: 'dep2', x: -377.5, kind: 'departures' },
    { id: 'dep3', x: -320, kind: 'departures' },
    { id: 'hall', x: -235, kind: 'departures' },
    { id: 'arr1', x: -165, kind: 'arrivals' },
    { id: 'arr2', x: -112, kind: 'arrivals' },
  ];
  const DOOR_W = 4.0; // each opening (two leaves slide apart)
  const DOOR_H = 3.2;
  const GATE_DX = 14; // the gate door is this far east of its stand's centre line
  const BR = { w: 1.5, wi: 1.25, h: 2.9, ry: 2.0, dy: 3.0 }; // bridge half widths, inside height, rotunda and door floors
  const COLS_N = [-415, -385, -350, -290, -260, -230, -195, -165, -135, -105];
  const COLS_S = [-415, -385, -350, -290, -260, -230, -195, -165, -105];
  const CANOPY_COLS = [-420, -390, -360, -330, -300, -270, -240, -210, -180, -150, -120, -90];
  const PIECES = [X0, -384, -192, X1]; // the chunk lines the hall is cut at (192 m chunks from -768)
  const SKY = [[-1207.5, -1204], [-1240, -1236.5]]; // skylight strips in the roof (z)

  // Original airlines and places only.
  const AIRLINES = [
    { name: 'Sunbird Airways', code: 'SB', bg: ['#ff9a2e', '#e8541c'], fg: '#ffffff' },
    { name: 'Gullwing Air', code: 'GW', bg: ['#1aa6a6', '#0d6f80'], fg: '#ffffff' },
    { name: 'Coral Coast Airlines', code: 'CC', bg: ['#ff5f8a', '#c2305d'], fg: '#ffffff' },
    { name: 'Pelican Express', code: 'PX', bg: ['#2f5fd6', '#1a3990'], fg: '#ffd84a' },
    { name: 'Atlantica', code: 'AT', bg: ['#173a5e', '#0b2038'], fg: '#7fe0ff' },
    { name: 'Northwind', code: 'NW', bg: ['#4b4f8f', '#2c2f5e'], fg: '#ffffff' },
  ];
  const CITIES = ['Port Elmira', 'San Calisto', 'Bellmoor', 'Marisol Bay', 'Kingsport', 'Avalon Key', 'Halcyon City', 'Cape Verity', 'Northbay', 'Santa Lucerne', 'Ostravia', 'Riverton'];

  const C = (hex, mul) => VH.col(hex, mul);
  const COL = {
    stone: 0xe3ddd0, floor: 0xc9c3b8, band: 0xa9a399, carpet: 0x4d6074, carpetEdge: 0x384756,
    rubber: 0x7f868e, ceiling: 0xe2e0da, beam: 0xd6d3cb, wall: 0xdcd6ca, wallB: 0xcfc7b8,
    wood: 0xa9794a, teal: 0x169aa1, pink: 0xe94e7b, orange: 0xf08a2c, steel: 0xc3c9cf,
    mullion: 0x5b636c, dark: 0x2b2f35, black: 0x1b1d21, seat: 0x2f4357, seatB: 0x1f8d96,
    chrome: 0xb9bfc6, white: 0xf4f2ee, glass: 0xa9c8da, leaf: 0x3f7a3a, leafB: 0x5b9a45,
    planter: 0x8a8174, light: 0xfff4e2,
  };

  /** Forecourt height at z (the ramp from the kerb up to the doors). */
  function rampY(z) {
    return KERB + (FY - KERB) * clamp((KERB_Z - z) / (KERB_Z - Z1), 0, 1);
  }

  // ------------------------------------------------------------ the kit
  /**
   * Drawing helpers for the build. Chunk surfaces (prop, screen, concrete,
   * plaza...) go into the world's shared builders; three surfaces are the
   * terminal's own, merged per chunk with their own materials:
   *   hall   the inside, lit like the street and never in the roof's
   *          shadow, with a glow of its own at night (uHallLift)
   *   glass  real glass: the planes show through it, and the lit hall
   *          shows through it at night
   *   roof   the roof, which casts no shadow (so the people inside aren't
   *          standing in the dark)
   */
  const OWN = { hall: true, glass: true, roof: true };

  function makeKit(world) {
    const ph = world.physics;
    // One mesh per surface for the whole building (a draw call each): from inside or
    // near it most of the hall is in view anyway, so splitting it by chunk saves nothing.
    const own = new Map();
    const home = world.chunkAt((X0 + X1) / 2, (Z0 + Z1) / 2);
    const ownBuilder = (kind) => {
      let e = own.get(kind);
      if (!e) own.set(kind, (e = { kind, chunk: home, b: new VH.GeometryBuilder({}) }));
      return e.b;
    };
    const S = (surf, x, z) => (OWN[surf] ? ownBuilder(surf) : world.ctxAt(x, z)[surf]);
    const col = (c) => (typeof c === 'number' ? C(c) : c);
    const k = {
      world, ph, own, S,
      signs: [], // wayfinding and shop signs (one atlas, one mesh)
      boards: [], // flight boards and gate screens (redrawn at run time)
      nodes: [], links: [], nodeIx: {},
      box(surf, x0, y0, z0, x1, y1, z1, c, opts) {
        if (x0 > x1) [x0, x1] = [x1, x0];
        if (z0 > z1) [z0, z1] = [z1, z0];
        S(surf, (x0 + x1) / 2, (z0 + z1) / 2).box(x0, y0, z0, x1, y1, z1, col(c), opts);
      },
      col(x0, y0, z0, x1, y1, z1, tag, flags) {
        if (x0 > x1) [x0, x1] = [x1, x0];
        if (z0 > z1) [z0, z1] = [z1, z0];
        return ph.addBox(x0, y0, z0, x1, y1, z1, tag || 'building', flags === undefined ? F().ALL : flags);
      },
      /** A box drawn and made solid (furniture blocks people and bullets, not the camera). */
      solid(surf, x0, y0, z0, x1, y1, z1, c, opts, tag, flags) {
        k.box(surf, x0, y0, z0, x1, y1, z1, c, opts);
        return k.col(x0, Math.min(y0, FY), z0, x1, y1, z1, tag || 'furniture', flags === undefined ? F().SOLID | F().SHOTS : flags);
      },
      top(surf, x0, z0, x1, z1, y, c) {
        S(surf, (x0 + x1) / 2, (z0 + z1) / 2).topRect(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), y, col(c));
      },
      /** A downward-facing rectangle (a ceiling) at height y. */
      under(surf, x0, z0, x1, z1, y, c) {
        if (x0 > x1) [x0, x1] = [x1, x0];
        if (z0 > z1) [z0, z1] = [z1, z0];
        S(surf, (x0 + x1) / 2, (z0 + z1) / 2).quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, -1, 0], col(c));
      },
      /** A vertical rectangle from (ax, az) to (bx, bz), facing (nx, nz). */
      vq(surf, ax, az, bx, bz, y0, y1, nx, nz, c) {
        let dx = bx - ax;
        let dz = bz - az;
        if (-dz * nx + dx * nz < 0) {
          [ax, bx] = [bx, ax];
          [az, bz] = [bz, az];
          dx = -dx;
          dz = -dz;
        }
        S(surf, (ax + bx) / 2, (az + bz) / 2).quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [nx, 0, nz], col(c));
      },
      /** A flat four-cornered face; flipped if needed so it faces along `hint`. */
      face(surf, pts, hint, c) {
        const [a, b, cc] = pts;
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = cc[0] - a[0], vy = cc[1] - a[1], vz = cc[2] - a[2];
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const p = nx * hint[0] + ny * hint[1] + nz * hint[2] < 0 ? pts.slice().reverse() : pts;
        S(surf, (a[0] + cc[0]) / 2, (a[2] + cc[2]) / 2).polygon(p, col(c));
      },
      cyl(surf, x, y0, z, r0, r1, h, seg, c, cap) {
        S(surf, x, z).cylinder(x, y0, z, r0, r1, h, seg, col(c), cap);
      },
      merge(surf, geo, m, c) {
        const x = m.elements[12];
        const z = m.elements[14];
        S(surf, x, z).merge(geo, m, col(c));
      },
      // ---- the people's map
      node(id, x, z, y) {
        k.nodeIx[id] = k.nodes.length;
        k.nodes.push({ id, x, y: y === undefined ? FY : y, z });
        return id;
      },
      link(a, b) {
        const i = k.nodeIx[a];
        const j = k.nodeIx[b];
        if (i === undefined || j === undefined) throw new Error('terminal nav: no node ' + (i === undefined ? a : b));
        k.links.push([i, j]);
      },
      chain(...ids) {
        for (let i = 1; i < ids.length; i++) k.link(ids[i - 1], ids[i]);
      },
    };
    return k;
  }

  // ----------------------------------------------------------- materials
  /** The hall's material: vertex colours, no shadows, a glow of its own at night. */
  function hallMaterial(lift) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.04 });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uHallLift = lift;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uHallLift;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uHallLift;');
    };
    mat.customProgramCacheKey = () => 'vh-terminal-hall-v1';
    return mat;
  }

  function glassMaterial() {
    return new THREE.MeshStandardMaterial({
      vertexColors: true, transparent: true, opacity: 0.26, roughness: 0.06, metalness: 0.55,
      side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.3,
    });
  }

  /** Turn the terminal's own builders into meshes, one per surface per chunk. */
  function finishOwn(k, mats) {
    for (const e of k.own.values()) {
      if (e.b.isEmpty) continue;
      const mesh = new THREE.Mesh(e.b.build(), e.kind === 'hall' ? mats.hall : e.kind === 'glass' ? mats.glass : mats.roof);
      mesh.name = 'terminal ' + e.kind;
      mesh.castShadow = false;
      mesh.receiveShadow = e.kind === 'roof';
      if (e.kind === 'glass') mesh.renderOrder = 2;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      e.chunk.group.add(mesh);
    }
  }

  // --------------------------------------------------------------- shell
  /** Split [a0, a1] at the chunk lines so long pieces are culled with their chunk. */
  function pieces(a0, a1) {
    const cuts = PIECES.filter((p) => p > a0 + 0.01 && p < a1 - 0.01);
    const out = [];
    let cur = a0;
    for (const p of cuts) {
      out.push([cur, p]);
      cur = p;
    }
    out.push([cur, a1]);
    return out;
  }

  /**
   * A glass wall along x (z = fixed) or along z (x = fixed), floor to
   * ceiling, with mullions every 3 m, two transoms and openings
   * ({ a0, a1, top }: doors, gate doors). `out` is the outward side (±1).
   */
  function glassWall(k, alongX, fixed, a0, a1, out, openings) {
    const nx = alongX ? 0 : out;
    const nz = alongX ? out : 0;
    const ops = (openings || []).slice().sort((p, q) => p.a0 - q.a0);
    const spans = [];
    let cur = a0;
    for (const o of ops) {
      if (o.a0 > cur) spans.push([cur, o.a0]);
      cur = o.a1;
    }
    if (cur < a1) spans.push([cur, a1]);
    const pane = (s0, s1, y0, y1) => {
      for (const [p0, p1] of pieces(s0, s1)) {
        if (alongX) k.vq('glass', p0, fixed, p1, fixed, y0, y1, nx, nz, COL.glass);
        else k.vq('glass', fixed, p0, fixed, p1, y0, y1, nx, nz, COL.glass);
      }
    };
    // Along-the-wall boxes: [s0, s1] along, y0..y1, d0..d1 across (inward is -out).
    const bar = (surf, s0, s1, y0, y1, d0, d1, c) => {
      const f0 = fixed + out * d0;
      const f1 = fixed + out * d1;
      if (alongX) k.box(surf, s0, y0, Math.min(f0, f1), s1, y1, Math.max(f0, f1), c);
      else k.box(surf, Math.min(f0, f1), y0, s0, Math.max(f0, f1), y1, s1, c);
    };
    const collide = (s0, s1, y0, y1) => {
      const f0 = fixed - out * 0.3;
      if (alongX) k.col(s0, y0, Math.min(f0, fixed), s1, y1, Math.max(f0, fixed), 'glass');
      else k.col(Math.min(f0, fixed), y0, s0, Math.max(f0, fixed), y1, s1, 'glass');
    };
    for (const [s0, s1] of spans) {
      pane(s0, s1, FY + 0.25, CEIL - 0.6);
      for (const [p0, p1] of pieces(s0, s1)) bar('prop', p0, p1, FY, FY + 0.25, -0.16, 0.16, COL.dark);
      collide(s0, s1, 0, CEIL);
    }
    for (const o of ops) {
      pane(o.a0, o.a1, o.top + 0.1, CEIL - 0.6);
      collide(o.a0, o.a1, o.top, CEIL);
      // The frame: posts and a header.
      bar('prop', o.a0 - 0.12, o.a0, FY, o.top + 0.1, -0.2, 0.2, COL.dark);
      bar('prop', o.a1, o.a1 + 0.12, FY, o.top + 0.1, -0.2, 0.2, COL.dark);
      bar('prop', o.a0 - 0.12, o.a1 + 0.12, o.top, o.top + 0.12, -0.2, 0.2, COL.dark);
    }
    // Mullions (not across the openings), transoms, the header beam.
    for (let a = a0 + 3; a < a1 - 0.5; a += 3) {
      if (ops.some((o) => a > o.a0 - 0.3 && a < o.a1 + 0.3)) continue;
      bar('prop', a - 0.05, a + 0.05, FY + 0.25, CEIL - 0.6, -0.14, 0.14, COL.mullion);
    }
    for (const [p0, p1] of pieces(a0, a1)) {
      bar('prop', p0, p1, FY + 3.3, FY + 3.42, -0.12, 0.12, COL.mullion);
      bar('prop', p0, p1, FY + 6.5, FY + 6.62, -0.12, 0.12, COL.mullion);
      bar('prop', p0, p1, CEIL - 0.6, CEIL, -0.2, 0.2, COL.steel);
    }
  }

  function shell(k, stands) {
    // The plinth, the floor slab and its finish.
    for (const [p0, p1] of pieces(X0, X1)) {
      k.box('concrete', p0, 0, Z0, p1, FY, Z1, C(COL.stone), { skip: { top: true, s: true, e: p1 < X1, w: p0 > X0 }, uvScale: 2 });
      k.top('hall', p0, Z0, p1, Z1, FY, COL.floor);
    }
    k.col(X0, -1, Z0, X1, FY, Z1, 'floor', F().ALL);
    // Inlay lines across the floor every 6 m, and walkway bands.
    for (let x = X0 + 6; x < X1 - 1; x += 6) k.top('hall', x - 0.09, Z0 + 0.3, x + 0.09, Z1 - 0.3, FY + 0.008, COL.band);
    for (const [p0, p1] of pieces(X0 + 0.3, X1 - 0.3)) {
      k.top('hall', p0, -1199.1, p1, -1197.9, FY + 0.01, 0xb8b4ab);
      k.top('hall', p0, -1232.2, p1, -1231.0, FY + 0.01, 0xb8b4ab);
    }

    // Glass all round: the front with its door sets, the back with a door per gate.
    const doorOps = DOORS.map((d) => ({ a0: d.x - DOOR_W / 2, a1: d.x + DOOR_W / 2, top: FY + DOOR_H }));
    glassWall(k, true, Z1, X0, X1, 1, doorOps);
    const gateOps = stands.map((s) => ({ a0: s.x + GATE_DX - BR.wi, a1: s.x + GATE_DX + BR.wi, top: FY + BR.h }));
    glassWall(k, true, Z0, X0, X1, -1, gateOps);
    glassWall(k, false, X0, Z0, Z1, -1, []);
    glassWall(k, false, X1, Z0, Z1, 1, []);

    roof(k);
    ceiling(k);
    for (const x of COLS_N) column(k, x, NZ);
    for (const x of COLS_S) column(k, x, PZ);
  }

  function roof(k) {
    const O = { x0: X0 - 3, x1: X1 + 3, z0: Z0 - 3, z1: Z1 + 4 };
    const white = COL.white;
    const soffit = 0xdcdad3;
    // The slab over the hall, open over the two skylight strips.
    const sx0 = X0 + 8;
    const sx1 = X1 - 8;
    const rects = [[X0, Z0, sx0, Z1], [sx1, Z0, X1, Z1]];
    for (const [p0, p1] of pieces(sx0, sx1)) {
      rects.push([p0, Z0, p1, SKY[1][0]], [p0, SKY[1][1], p1, SKY[0][0]], [p0, SKY[0][1], p1, Z1]);
    }
    for (const [x0, z0, x1, z1] of rects) {
      k.top('roof', x0, z0, x1, z1, ROOF, white);
      k.under('hall', x0, z0, x1, z1, CEIL, COL.ceiling);
    }
    // Skylight shafts and their glass.
    for (const [z0, z1] of SKY) {
      for (const [p0, p1] of pieces(sx0, sx1)) {
        k.vq('roof', p0, z0, p1, z0, CEIL, ROOF, 0, 1, 0xe8e6e0);
        k.vq('roof', p0, z1, p1, z1, CEIL, ROOF, 0, -1, 0xe8e6e0);
        k.top('glass', p0, z0, p1, z1, ROOF - 0.05, 0xc4dcea);
      }
      k.vq('roof', sx0, z0, sx0, z1, CEIL, ROOF, 1, 0, 0xe8e6e0);
      k.vq('roof', sx1, z0, sx1, z1, CEIL, ROOF, -1, 0, 0xe8e6e0);
      for (let x = sx0 + 4; x < sx1 - 1; x += 4) k.box('roof', x - 0.06, ROOF - 0.12, z0, x + 0.06, ROOF, z1, COL.mullion);
    }
    // The overhangs: a deep one over the forecourt, narrower round the rest.
    const strips = [[O.x0, Z1, O.x1, O.z1], [O.x0, O.z0, O.x1, Z0], [O.x0, Z0, X0, Z1], [X1, Z0, O.x1, Z1]];
    for (const [x0, z0, x1, z1] of strips) {
      for (const [p0, p1] of x1 - x0 > 50 ? pieces(x0, x1) : [[x0, x1]]) {
        k.top('roof', p0, z0, p1, z1, ROOF, white);
        k.under('roof', p0, z0, p1, z1, CEIL, soffit);
      }
    }
    // The fascia round the edge, deeper at the front.
    for (const [p0, p1] of pieces(O.x0, O.x1)) {
      k.box('roof', p0, CEIL - 0.5, O.z1 - 0.5, p1, ROOF + 0.3, O.z1, white, { bottom: true });
      k.box('roof', p0, CEIL - 0.1, O.z0, p1, ROOF + 0.15, O.z0 + 0.35, white, { bottom: true });
    }
    k.box('roof', O.x0, CEIL - 0.1, O.z0, O.x0 + 0.35, ROOF + 0.15, O.z1, white, { bottom: true });
    k.box('roof', O.x1 - 0.35, CEIL - 0.1, O.z0, O.x1, ROOF + 0.15, O.z1, white, { bottom: true });
    // The wave on top: two raised bands rising to the middle.
    for (const [p0, p1] of pieces(X0 + 2, X1 - 2)) {
      k.box('roof', p0, ROOF, SKY[1][1] + 0.6, p1, ROOF + 1.0, SKY[0][0] - 0.6, 0xf0eee8);
      k.box('roof', p0, ROOF + 1.0, -1231, p1, ROOF + 1.7, -1213, 0xe2e0d9);
    }
    // Solid over the hall only: the overhangs have nothing to stop, and a collider over
    // the forecourt would have anyone dropped off there (a place, a spawn) land on the roof.
    k.col(X0, CEIL, Z0, X1, ROOF, Z1, 'building');
    k.col(X0 + 2, ROOF, SKY[1][1] + 0.6, X1 - 2, ROOF + 1.0, SKY[0][0] - 0.6, 'building');
    k.col(X0 + 2, ROOF + 1.0, -1231, X1 - 2, ROOF + 1.7, -1213, 'building');
  }

  function ceiling(k) {
    // Beams across the hall every 15 m, long beams over the partitions.
    for (let x = X0 + 10; x < X1 - 4; x += 15) k.box('hall', x - 0.22, CEIL - 0.75, Z0 + 0.3, x + 0.22, CEIL, Z1 - 0.3, COL.beam, { bottom: true, skip: { top: true } });
    for (const z of [PZ, NZ]) {
      for (const [p0, p1] of pieces(X0 + 0.3, X1 - 0.3)) k.box('hall', p0, CEIL - 0.95, z - 0.25, p1, CEIL, z + 0.25, COL.beam, { bottom: true, skip: { top: true } });
    }
    // Light strips between the beams, clear of the skylights.
    const lamp = C(COL.light, 1.7);
    for (let z = Z0 + 3; z < Z1 - 2; z += 4) {
      if (SKY.some(([a, b]) => z > a - 0.8 && z < b + 0.8)) continue;
      if (Math.abs(z - PZ) < 0.8 || Math.abs(z - NZ) < 0.8) continue;
      for (let x = X0 + 2.5; x < X1 - 2; x += 5) {
        const bx = ((x - (X0 + 10)) % 15 + 15) % 15;
        if (bx < 0.9 || bx > 14.1) continue;
        const ctx = k.world.ctxAt(x, z);
        ctx.screen.quad([x, CEIL - 0.03, z - 0.2], [x + 3, CEIL - 0.03, z - 0.2], [x + 3, CEIL - 0.03, z + 0.2], [x, CEIL - 0.03, z + 0.2], [0, -1, 0], lamp);
      }
    }
  }

  function column(k, x, z) {
    k.cyl('hall', x, FY, z, 0.42, 0.42, 0.12, 12, 0xbdb8ae);
    k.cyl('hall', x, FY + 0.12, z, 0.36, 0.36, CEIL - 1.6 - FY, 12, COL.white);
    k.cyl('hall', x, CEIL - 1.48, z, 0.36, 1.1, 0.55, 12, COL.white);
    k.col(x - 0.4, 0, z - 0.4, x + 0.4, CEIL, z + 0.4, 'column');
  }

  /** A wall inside the hall (partitions, back walls of shops), drawn on both faces. */
  function wall(k, x0, z0, x1, z1, h, c, band) {
    k.box('hall', x0, FY, z0, x1, FY + h, z1, c || COL.wall);
    if (band !== false) {
      const t = 0.03;
      k.box('hall', x0 - (x1 - x0 < 1 ? t : 0), FY + h - 0.7, z0 - (z1 - z0 < 1 ? t : 0), x1 + (x1 - x0 < 1 ? t : 0), FY + h - 0.45, z1 + (z1 - z0 < 1 ? t : 0), band || COL.teal);
    }
    k.box('hall', x0 - 0.04, FY + h, z0 - 0.04, x1 + 0.04, FY + h + 0.08, z1 + 0.04, COL.wood);
    k.col(x0, 0, z0, x1, FY + h + 0.08, z1, 'wall');
  }

  function partitions(k) {
    const t = 0.15;
    // Landside | airside, with the way through security and the arrivals exit.
    wall(k, X0 + 0.3, PZ - t, SEC.x0, PZ + t, WALL_H);
    wall(k, SEC.x1, PZ - t, EXIT.x0, PZ + t, WALL_H);
    wall(k, EXIT.x1, PZ - t, X1 - 0.3, PZ + t, WALL_H);
    // Security's sides, as far as the barrier.
    wall(k, SEC.x0 - t, PZ + t, SEC.x0 + t, SEC.z + 0.1, WALL_H);
    wall(k, SEC.x1 - t, PZ + t, SEC.x1 + t, SEC.z + 0.1, WALL_H);
    // Baggage reclaim: its west wall, and the north wall with the way in from the concourse.
    wall(k, REC.x0 - t, NZ + t, REC.x0 + t, PZ - t, WALL_H);
    wall(k, REC.x0 - t, NZ - t, REC.door0, NZ + t, WALL_H);
    wall(k, REC.door1, NZ - t, X1 - 0.3, NZ + t, WALL_H);
    // Door frames on the openings.
    for (const [x0, x1, z] of [[EXIT.x0, EXIT.x1, PZ], [REC.door0, REC.door1, NZ]]) {
      k.box('hall', x0 - 0.2, FY, z - 0.22, x0, FY + 3.2, z + 0.22, COL.dark);
      k.box('hall', x1, FY, z - 0.22, x1 + 0.2, FY + 3.2, z + 0.22, COL.dark);
      k.box('hall', x0 - 0.2, FY + 3.2, z - 0.22, x1 + 0.2, FY + WALL_H, z + 0.22, COL.wall);
      k.col(x0, FY + 3.2, z - 0.15, x1, FY + WALL_H, z + 0.15, 'wall');
    }
  }

  // ----------------------------------------------------------- landside
  function forecourt(k) {
    const world = k.world;
    // The kerb strip by the road, and the forecourt ramping up to the doors.
    for (const [p0, p1] of pieces(X0, X1)) {
      const ctx = world.ctxAt((p0 + p1) / 2, KERB_Z);
      ctx.concrete.box(p0, 0, KERB_Z, p1, KERB, ROAD_Z, C(0xcfcac0), { skip: { top: true, n: true, e: p1 < X1, w: p0 > X0 } });
      ctx.sidewalk.topRect(p0, KERB_Z, p1, ROAD_Z, KERB, C(0xffffff), 3);
      const y0 = KERB;
      const pts = [[p0, y0, KERB_Z], [p1, y0, KERB_Z], [p1, FY, Z1], [p0, FY, Z1]];
      const uv = pts.map((p) => [p[0] / 4, -p[2] / 4]);
      ctx.plaza.quad(pts[0], pts[1], pts[2], pts[3], [0, 0.995, 0.06], C(0xe6e0d4), uv);
    }
    for (const [x, s] of [[X0, -1], [X1, 1]]) {
      k.face('concrete', [[x, 0, KERB_Z], [x, KERB, KERB_Z], [x, FY, Z1], [x, 0, Z1]], [s, 0, 0], C(0xcfcac0));
    }
    world.physics.addBox(X0, -0.5, KERB_Z, X1, KERB, ROAD_Z, 'kerb', F().SOLID);
    world.physics.addRamp((X0 + X1) / 2, (KERB_Z + Z1) / 2, (X1 - X0) / 2, (KERB_Z - Z1) / 2, Math.PI, -0.5, KERB, FY, 'kerb', F().SOLID);
    // Door mats outside and in.
    for (const d of DOORS) {
      k.top('hall', d.x - 2.4, Z1 - 3.0, d.x + 2.4, Z1 - 0.3, FY + 0.016, 0x3a3e44);
      const ctx = world.ctxAt(d.x, Z1 + 1);
      ctx.decal.quad([d.x - 2.4, rampY(Z1 + 1.6) + 0.02, Z1 + 1.6], [d.x + 2.4, rampY(Z1 + 1.6) + 0.02, Z1 + 1.6], [d.x + 2.4, FY + 0.02, Z1 + 0.05], [d.x - 2.4, FY + 0.02, Z1 + 0.05], [0, 1, 0], C(0x41454b));
      // Steel bollards across the way in: people walk between them, cars don't.
      const bz = Z1 + 2.3;
      const by = rampY(bz);
      for (const o of [-3.3, -2.05, -0.85, 0.85, 2.05, 3.3]) {
        const bx = d.x + o;
        ctx.prop.cylinder(bx, by - 0.05, bz, 0.11, 0.11, 0.95, 10, C(COL.chrome), true, C(0xd8dde2));
        ctx.prop.cylinder(bx, by + 0.62, bz, 0.115, 0.115, 0.1, 10, C(0xe0b12e), false);
        world.physics.addBox(bx - 0.12, 0, bz - 0.12, bx + 0.12, by + 0.9, bz + 0.12, 'bollard', F().SOLID | F().SHOTS);
      }
    }

    // The drop-off canopy over the forecourt, on a row of columns at the kerb.
    const cz0 = Z1 + 0.4;
    const cz1 = ROAD_Z - 0.4;
    const cx0 = X0 + 4;
    const cx1 = X1 - 4;
    for (const [p0, p1] of pieces(cx0, cx1)) {
      const ctx = world.ctxAt((p0 + p1) / 2, cz1);
      ctx.prop.box(p0, 6.2, cz0, p1, 6.55, cz1, C(0xf2f0ea), { bottom: true });
      ctx.prop.box(p0, 6.55, cz1 - 0.3, p1, 6.95, cz1, C(COL.teal), {});
      for (let x = p0 + 2; x < p1 - 2; x += 6) ctx.screen.quad([x, 6.18, cz0 + 1.2], [x + 3.2, 6.18, cz0 + 1.2], [x + 3.2, 6.18, cz0 + 1.6], [x, 6.18, cz0 + 1.6], [0, -1, 0], C(COL.light, 1.6));
      for (let x = p0 + 2; x < p1 - 2; x += 6) ctx.screen.quad([x, 6.18, cz1 - 1.4], [x + 3.2, 6.18, cz1 - 1.4], [x + 3.2, 6.18, cz1 - 1.0], [x, 6.18, cz1 - 1.0], [0, -1, 0], C(COL.light, 1.6));
    }
    const pools = world.floodlights || (world.floodlights = []);
    for (const x of CANOPY_COLS) {
      const ctx = world.ctxAt(x, -1190.3);
      ctx.prop.box(x - 0.22, KERB, -1190.52, x + 0.22, 6.2, -1190.08, C(0xd8d4cb));
      ctx.prop.box(x - 0.3, KERB, -1190.6, x + 0.3, KERB + 0.4, -1190.0, C(0x9b9890));
      world.physics.addBox(x - 0.25, 0, -1190.55, x + 0.25, 6.2, -1190.05, 'pole', F().SOLID | F().SHOTS);
    }
    for (let x = X0 + 15; x < X1 - 10; x += 22) pools.push({ x, z: -1193.2, r: 7.5, y: rampY(-1193.2) + 0.03, strength: 0.75, tint: [1.3, 1.05, 0.8] });

    // Benches and bins against the glass between the door sets, a bus stop and a taxi rank sign.
    const benches = [-415, -390, -362, -345, -280, -255, -190, -140, -95];
    for (const x of benches) {
      const z = Z1 + 0.9;
      const ctx = world.ctxAt(x, z);
      const y = rampY(z);
      ctx.prop.box(x - 0.9, y + 0.4, z - 0.25, x + 0.9, y + 0.46, z + 0.25, C(COL.wood));
      ctx.prop.box(x - 0.9, y + 0.46, z - 0.3, x + 0.9, y + 0.85, z - 0.24, C(COL.wood));
      for (const s of [-0.75, 0.75]) ctx.prop.box(x + s - 0.04, y - 0.1, z - 0.25, x + s + 0.04, y + 0.4, z + 0.25, C(COL.dark));
      world.physics.addBox(x - 0.9, 0, z - 0.3, x + 0.9, y + 0.85, z + 0.25, 'bench', F().SOLID | F().SHOTS);
    }
    for (const x of [-396, -351, -268, -150]) {
      const z = Z1 + 0.6;
      const y = rampY(z);
      const ctx = world.ctxAt(x, z);
      ctx.prop.cylinder(x, y - 0.1, z, 0.26, 0.26, 1.0, 10, C(0x5a6068), true, C(COL.dark));
      world.physics.addBox(x - 0.28, 0, z - 0.28, x + 0.28, y + 0.9, z + 0.28, 'bin', F().SOLID | F().SHOTS);
    }
    // The bus stop (a shelter at the east end of the canopy's middle) and the taxi rank.
    const bx = -215;
    {
      const ctx = world.ctxAt(bx, -1192);
      const y = rampY(-1191.6);
      ctx.prop.box(bx - 3.2, y + 2.55, -1193.6, bx + 3.2, y + 2.7, -1191.4, C(0x3b4a5a), { bottom: true });
      for (const s of [-3.1, 3.1]) ctx.prop.box(bx + s - 0.05, y - 0.2, -1193.5, bx + s + 0.05, y + 2.55, -1193.4, C(COL.dark));
      k.vq('glass', bx - 3.1, -1193.45, bx + 3.1, -1193.45, y + 0.1, y + 2.5, 0, 1, COL.glass);
      ctx.prop.box(bx - 2, y + 0.42, -1193.3, bx + 2, y + 0.48, -1192.9, C(COL.wood));
      world.physics.addBox(bx - 3.2, 0, -1193.6, bx + 3.2, y + 2.5, -1193.3, 'shelter', F().SOLID | F().SHOTS);
    }
    for (const x of [-222, -131]) {
      const ctx = world.ctxAt(x, -1189.6);
      ctx.prop.box(x - 0.05, KERB, -1189.65, x + 0.05, KERB + 2.6, -1189.55, C(0x5a6068));
      world.physics.addBox(x - 0.08, 0, -1189.7, x + 0.08, KERB + 2.6, -1189.5, 'pole', F().SOLID);
    }
    k.signs.push({ x: -222, y: KERB + 2.95, z: -1189.6, yaw: 0, w: 0.9, h: 0.9, back: true, style: 'bus', rows: ['[bus]'], sub: 'BUS' });
    k.signs.push({ x: -131, y: KERB + 2.95, z: -1189.6, yaw: 0, w: 0.9, h: 0.9, back: true, style: 'taxi', rows: ['[taxi]'], sub: 'TAXI' });
    // The taxi rank's bays on the road (cabs queue east of the head), the drop-off bays' lines.
    for (let x = -126; x < -90; x += 8) world.ctxAt(x, -1187).marks.topRect(x - 6.5, -1188.85, x, -1188.65, 0.006, C(0xe0b12e));
    for (const d of DOORS.filter((q) => q.kind === 'departures')) world.ctxAt(d.x, -1187).marks.topRect(d.x - 14, -1188.85, d.x + 4, -1188.7, 0.006, C(0xf4f4ef));

    // The name over the canopy, and DEPARTURES / ARRIVALS on the canopy's edge.
    const cx = (X0 + X1) / 2;
    const signs = world.signs || (world.signs = []);
    signs.push({ x: cx, y: 8.35, z: Z1 + 0.3, yaw: 0, w: 46, h: 2.6, lines: ['VICEHAVEN INTERNATIONAL'], style: 'monolith' });
    signs.push({ x: -380, y: 6.75, z: cz1 + 0.05, yaw: 0, w: 14, h: 0.8, lines: ['DEPARTURES  ✈  CHECK-IN'], style: 'info' });
    signs.push({ x: -140, y: 6.75, z: cz1 + 0.05, yaw: 0, w: 14, h: 0.8, lines: ['ARRIVALS  ✈  TAXIS · CAR HIRE'], style: 'info' });
  }

  // ------------------------------------------------------------ check-in
  function checkin(k, desks, airlines) {
    const [za, zb] = ISLAND_Z; // south and north ends (za > zb)
    const z0 = zb;
    const z1 = za;
    ISLANDS.forEach((ic, n) => {
      const letter = 'ABC'[n];
      // The belt housing down the middle and the moving belt on top of it.
      k.solid('hall', ic - 0.55, FY, z0, ic + 0.55, FY + 0.82, z1, 0x8f969e, null, 'belt');
      k.top('hall', ic - 0.42, z0 + 1.2, ic + 0.42, z1 - 0.2, FY + 0.83, 0x26282c);
      for (let z = z1 - 0.6; z > z0 + 1.4; z -= 0.9) k.top('hall', ic - 0.42, z - 0.05, ic + 0.42, z + 0.05, FY + 0.835, 0x3b3e44);
      // The belt runs into the hall's baggage system through a curtained hatch at the north end.
      k.solid('hall', ic - 0.9, FY, z0 - 0.2, ic + 0.9, FY + 2.1, z0 + 1.2, 0x7d848c, null, 'belt');
      for (let x = ic - 0.4; x < ic + 0.41; x += 0.2) k.box('hall', x - 0.08, FY + 0.85, z0 + 1.2, x + 0.08, FY + 1.75, z0 + 1.23, 0x1d1f23);
      // An end panel at the south end with the island's letter.
      k.solid('hall', ic - 2.45, FY, z1 - 0.3, ic + 2.45, FY + 1.1, z1, COL.teal, null, 'desk');
      // The bulkhead over the island on three posts, carrying the airline signs.
      for (const z of [z1 - 0.6, (z0 + z1) / 2, z0 + 1.6]) k.box('hall', ic - 0.08, FY + 0.82, z - 0.08, ic + 0.08, FY + 2.75, z + 0.08, COL.steel);
      k.box('hall', ic - 1.25, FY + 2.75, z0 + 0.6, ic + 1.25, FY + 3.45, z1, 0x30353c, { bottom: true });
      k.signs.push({ x: ic, y: FY + 3.1, z: z1 + 0.01, yaw: 0, w: 2.3, h: 0.62, style: 'gate', rows: ['Check-in ' + letter] });
      for (const side of [-1, 1]) {
        const al = airlines[(n * 2 + (side > 0 ? 1 : 0)) % airlines.length];
        const yaw = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        // Desks: a counter row with four positions, each with a bag scale beside it.
        const xo = ic + side * 2.45; // outer face
        const xi = ic + side * 1.65; // inner face (the agents' side)
        k.box('hall', Math.min(xo, xi), FY, z0 + 1.2, Math.max(xo, xi), FY + 1.0, z1 - 0.3, COL.white);
        k.box('hall', Math.min(xo, xi) - 0.04, FY + 1.0, z0 + 1.16, Math.max(xo, xi) + 0.04, FY + 1.06, z1 - 0.26, 0x3b342d);
        k.col(Math.min(xo, xi), 0, z0 + 1.2, Math.max(xo, xi), FY + 1.06, z1 - 0.3, 'desk', F().SOLID | F().SHOTS);
        // The counter front in the airline's colour, with a lit desk number.
        k.vq('hall', xo + side * 0.01, z0 + 1.2, xo + side * 0.01, z1 - 0.3, FY + 0.1, FY + 0.95, side, 0, hexOf(al.bg[0]));
        k.signs.push({ x: ic + side * 1.3, y: FY + 3.1, z: (z0 + z1) / 2 + 0.3, yaw, w: 8.6, h: 0.62, style: 'brand', colors: { bg: al.bg, fg: al.fg }, rows: [al.name], plain: true });
        DESK_Z.forEach((dz, i) => {
          const num = n * 8 + (side > 0 ? 4 : 0) + i + 1;
          // Bag scale (a low belt) beside the counter and the injection belt to the middle.
          const sz0 = dz + 0.75;
          const sz1 = dz + 1.3;
          k.box('hall', Math.min(xo, ic + side * 0.55) , FY, sz0, Math.max(xo, ic + side * 0.55), FY + 0.32, sz1, 0x9aa1a8);
          k.top('hall', Math.min(xo, ic + side * 0.6), sz0 + 0.06, Math.max(xo, ic + side * 0.6), sz1 - 0.06, FY + 0.33, 0x26282c);
          // The agent's screen and keyboard (facing the agent), a number over the desk.
          const mx = ic + side * 1.95;
          k.box('hall', mx - 0.04, FY + 1.06, dz - 0.25, mx + 0.04, FY + 1.42, dz + 0.25, 0x23262b);
          k.vq('screen', mx - side * 0.045, dz - 0.22, mx - side * 0.045, dz + 0.22, FY + 1.1, FY + 1.38, -side, 0, C(0x8fd6ff, 1.1));
          k.vq('screen', xo + side * 0.02, dz - 0.3, xo + side * 0.02, dz + 0.3, FY + 0.72, FY + 0.92, side, 0, C(0xffffff, 1.2));
          k.signs.push({ x: ic + side * 1.27, y: FY + 2.55, z: dz, yaw, w: 0.62, h: 0.34, style: 'way', rows: [String(num)], center: true });
          desks.push({
            id: 'checkin' + num, kind: 'checkin', airline: al.name, code: al.code, island: letter,
            x: ic + side * 2.05, z: dz, yaw,
            staff: { x: ic + side * 1.1, z: dz, yaw },
            queue: [3.1, 4.3, 5.5, 6.7].map((d) => ({ x: ic + side * d, z: dz })),
          });
        });
      }
      // Queue tapes along each side of the island.
      for (const side of [-1, 1]) {
        const xt = ic + side * 7.4;
        tapes(k, [[xt, z1 + 0.2], [xt, z0 + 1.0]], 0x1c5fd0);
      }
    });
    // The information desk in the middle of the landside hall.
    const ix = -268;
    const iz = -1206;
    k.solid('hall', ix - 1.8, FY, iz - 0.6, ix + 1.8, FY + 1.05, iz + 0.6, COL.white, null, 'desk');
    k.vq('hall', ix - 1.8, iz + 0.61, ix + 1.8, iz + 0.61, FY + 0.1, FY + 0.95, 0, 1, COL.teal);
    k.box('hall', ix - 1.85, FY + 1.05, iz - 0.65, ix + 1.85, FY + 1.1, iz + 0.65, 0x3b342d);
    k.box('hall', ix - 0.06, FY + 1.1, iz - 0.06, ix + 0.06, CEIL - 0.75, iz + 0.06, COL.steel);
    k.box('hall', ix - 0.55, FY + 3.4, iz - 0.55, ix + 0.55, FY + 4.5, iz + 0.55, 0x1e2227);
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      k.signs.push({ x: ix + Math.sin(yaw) * 0.56, y: FY + 3.95, z: iz + Math.cos(yaw) * 0.56, yaw, w: 1.0, h: 1.0, style: 'info', rows: ['i'] });
    }
    desks.push({ id: 'info', kind: 'info', x: ix, z: iz + 0.6, yaw: 0, staff: { x: ix, z: iz - 1.3, yaw: 0 }, queue: [{ x: ix, z: iz + 1.7 }, { x: ix, z: iz + 2.9 }, { x: ix, z: iz + 4.1 }] });
  }

  /** Queue tapes: posts every 2 m along a polyline, a blue tape between them (no collider). */
  function tapes(k, pts, hex) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1];
      const [bx, bz] = pts[i];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 2));
      for (let j = 0; j <= n; j++) {
        if (i > 1 && j === 0) continue;
        const x = ax + ((bx - ax) * j) / n;
        const z = az + ((bz - az) * j) / n;
        k.cyl('hall', x, FY, z, 0.16, 0.16, 0.04, 8, COL.dark);
        k.cyl('hall', x, FY + 0.04, z, 0.035, 0.035, 0.94, 6, COL.chrome);
      }
      const yaw = Math.atan2(bx - ax, bz - az);
      k.S('hall', (ax + bx) / 2, (az + bz) / 2).orientedBox((ax + bx) / 2, (az + bz) / 2, 0.012, len / 2, yaw, FY + 0.86, FY + 0.93, C(hex));
    }
  }

  function hexOf(css) {
    return parseInt(String(css).replace('#', ''), 16);
  }

  // ------------------------------------------------------------ security
  /**
   * Four lanes across the security hall. Each: an x-ray belt (loading table,
   * the machine on the barrier line, the collection end) with its operator,
   * and a walk-through arch just east of it, the only way past the barrier.
   */
  function security(k, out) {
    const bz = SEC.z;
    const segs = [];
    let cur = SEC.x0 + 0.15;
    LANES.forEach((c, i) => {
      const ax = c + 0.6; // the arch's opening
      // Belt: loading table (landside), machine, collection rollers (airside).
      k.solid('hall', c - 2.0, FY, bz + 3.4, c - 1.0, FY + 0.82, bz - 4.6, 0xa3aab2, null, 'belt');
      k.top('hall', c - 1.9, bz + 3.3, c - 1.1, bz - 4.5, FY + 0.83, 0x26282c);
      k.solid('hall', c - 2.25, FY, bz - 0.9, c - 0.75, FY + 1.85, bz + 0.9, 0x9aa3ad, null, 'machine');
      k.box('hall', c - 2.27, FY + 1.5, bz - 0.92, c - 0.73, FY + 1.6, bz + 0.92, COL.teal);
      for (const z of [bz + 0.92, bz - 0.92]) {
        for (let x = c - 1.85; x < c - 1.1; x += 0.16) k.box('hall', x - 0.06, FY + 0.85, z - 0.01, x + 0.06, FY + 1.45, z + 0.01, 0x1b1d21);
      }
      // Grey trays waiting at the loading end, a couple on the belt.
      for (let j = 0; j < 4; j++) k.box('hall', c - 1.88, FY + 0.83 + j * 0.07, bz + 2.6, c - 1.12, FY + 0.9 + j * 0.07, bz + 3.2, 0x8a9098);
      k.box('hall', c - 1.85, FY + 0.84, bz + 1.4, c - 1.15, FY + 0.95, bz + 2.0, 0x8a9098);
      k.box('hall', c - 1.85, FY + 0.84, bz - 2.6, c - 1.15, FY + 0.95, bz - 2.0, 0x8a9098);
      // The operator's desk and screen, west of the machine on the airside.
      k.solid('hall', c - 3.6, FY, bz - 1.0, c - 2.6, FY + 0.78, bz - 0.15, 0xdad6ce, null, 'desk');
      k.box('hall', c - 3.35, FY + 0.78, bz - 0.35, c - 2.85, FY + 1.2, bz - 0.3, 0x23262b);
      k.vq('screen', c - 3.32, bz - 0.36, c - 2.88, bz - 0.36, FY + 0.82, FY + 1.16, 0, -1, C(0x9fe0c0, 1.0));
      // The arch: two posts and a lintel with a light on top.
      k.solid('hall', c, FY, bz - 0.35, c + 0.15, FY + 2.15, bz + 0.35, 0xc9ced4, null, 'arch');
      k.solid('hall', c + 1.05, FY, bz - 0.35, c + 1.2, FY + 2.15, bz + 0.35, 0xc9ced4, null, 'arch');
      k.box('hall', c, FY + 2.15, bz - 0.35, c + 1.2, FY + 2.45, bz + 0.35, 0xc9ced4, { bottom: true });
      k.col(c, FY + 2.15, bz - 0.35, c + 1.2, FY + 2.45, bz + 0.35, 'arch', F().SOLID | F().SHOTS);
      // Barrier between this lane and the last; a short panel between machine and arch.
      segs.push([cur, c - 2.25], [c - 0.75, c]);
      cur = c + 1.2;
      // Queue lane tapes either side of the arch's approach, from the hall to the belt.
      tapes(k, [[ax - 0.8, bz + 3.4], [ax - 0.8, PZ + 4.5]], 0x1c5fd0);
      tapes(k, [[ax + 0.8, bz + 1.6], [ax + 0.8, PZ + 4.5]], 0x1c5fd0);
      out.push({
        id: 'lane' + (i + 1), x: ax, z: bz, yaw: Math.PI, // walked through heading north
        arch: { x: ax, z: bz },
        belt: { x: c - 1.5, z0: bz + 3.3, z1: bz - 4.5 },
        queue: [1.4, 2.5, 3.6, 4.7, 5.8, 6.9, 8.0].map((d) => ({ x: ax, z: bz + d })),
        staff: [
          { x: c + 2.0, z: bz - 1.0, yaw: -Math.PI / 2 }, // at the arch, facing it
          { x: c - 3.1, z: bz - 1.6, yaw: 0 }, //           on the x-ray screen
          { x: c - 0.5, z: bz + 1.2, yaw: Math.PI / 2 }, //  by the loading table
        ],
      });
    });
    segs.push([cur, SEC.x1 - 0.15]);
    // The barrier: glass panels in a steel frame, too high to climb.
    for (const [a, b] of segs) {
      if (b - a < 0.05) continue;
      k.box('hall', a, FY, bz - 0.06, b, FY + 0.12, bz + 0.06, COL.dark);
      k.box('hall', a, FY + 1.86, bz - 0.05, b, FY + 1.95, bz + 0.05, COL.chrome);
      k.vq('glass', a, bz, b, bz, FY + 0.12, FY + 1.86, 0, 1, COL.glass);
      for (let x = a; x <= b + 0.01; x += Math.max(0.5, (b - a) / Math.max(1, Math.round((b - a) / 2)))) k.box('hall', x - 0.03, FY, bz - 0.05, x + 0.03, FY + 1.95, bz + 0.05, COL.chrome);
      k.col(a, 0, bz - 0.08, b, FY + 1.95, bz + 0.08, 'glass', F().SOLID | F().SHOTS);
    }
    // A rubber floor in the security hall.
    k.top('hall', SEC.x0 + 0.15, NZ + 0.3, SEC.x1 - 0.15, PZ - 0.15, FY + 0.012, COL.rubber);
    k.top('hall', SEC.x0 - 1, PZ + 0.15, SEC.x1 + 1, PZ + 4.6, FY + 0.012, 0x8d939a);
  }

  // ------------------------------------------------------------ reclaim
  const CAROUSEL = { L: 8, R: 2.2, rc: 1.65, bw: 1.0 }; // straight half length, outer radius, belt centre line, belt width
  const CAROUSELS = [{ id: 'carousel1', x: -160, z: -1222.5 }, { id: 'carousel2', x: -112, z: -1222.5 }];

  /** A point on a carousel's belt `s` metres round from its south-west corner (east along the south side). */
  function beltAt(c, s, r, out) {
    const { L } = CAROUSEL;
    const rc = r === undefined ? CAROUSEL.rc : r;
    const P = 4 * L + 2 * Math.PI * rc;
    let t = ((s % P) + P) % P;
    const o = out || {};
    if (t < 2 * L) {
      o.x = c.x - L + t;
      o.z = c.z + rc;
      o.tx = 1;
      o.tz = 0;
      return o;
    }
    t -= 2 * L;
    const arc = Math.PI * rc;
    if (t < arc) {
      const a = t / rc; // from south (+z) round through east to north
      o.x = c.x + L + Math.sin(a) * rc;
      o.z = c.z + Math.cos(a) * rc;
      o.tx = Math.cos(a);
      o.tz = -Math.sin(a);
      return o;
    }
    t -= arc;
    if (t < 2 * L) {
      o.x = c.x + L - t;
      o.z = c.z - rc;
      o.tx = -1;
      o.tz = 0;
      return o;
    }
    t -= 2 * L;
    const a = t / rc; // from north round through west to south
    o.x = c.x - L - Math.sin(a) * rc;
    o.z = c.z - Math.cos(a) * rc;
    o.tx = -Math.cos(a);
    o.tz = Math.sin(a);
    return o;
  }

  function reclaim(k) {
    // A warmer floor in the hall, and the way in from the concourse.
    k.top('hall', REC.x0 + 0.15, NZ + 0.15, X1 - 0.3, PZ - 0.15, FY + 0.012, 0xd3cdc2);
    const { L, R } = CAROUSEL;
    const out = [];
    CAROUSELS.forEach((c, i) => {
      // The skirt, the belt's bed and the island in the middle.
      k.box('hall', c.x - L, FY, c.z - R, c.x + L, FY + 0.42, c.z + R, 0x6f767e);
      for (const s of [-1, 1]) k.cyl('hall', c.x + s * L, FY, c.z, R, R, 0.42, 20, 0x6f767e, true);
      k.box('hall', c.x - L, FY, c.z - 1.1, c.x + L, FY + 0.62, c.z + 1.1, 0xb4bac1);
      for (const s of [-1, 1]) k.cyl('hall', c.x + s * L, FY, c.z, 1.1, 1.1, 0.62, 16, 0xb4bac1, true);
      // The hatch the bags come out of, at the east end of the island.
      k.box('hall', c.x + L - 2.2, FY + 0.62, c.z - 0.9, c.x + L + 0.2, FY + 2.0, c.z + 0.9, 0x5d646c);
      for (let z = c.z - 0.75; z < c.z + 0.76; z += 0.18) k.box('hall', c.x + L - 2.24, FY + 0.7, z - 0.07, c.x + L - 2.2, FY + 1.75, z + 0.07, 0x1b1d21);
      k.box('hall', c.x + L - 2.3, FY + 2.0, c.z - 1.0, c.x + L + 0.3, FY + 2.15, c.z + 1.0, COL.teal);
      k.col(c.x - L - R, 0, c.z - R, c.x + L + R, FY + 0.62, c.z + R, 'metal', F().SOLID | F().SHOTS);
      k.col(c.x + L - 2.2, FY + 0.62, c.z - 0.9, c.x + L + 0.2, FY + 2.0, c.z + 0.9, 'metal', F().SOLID | F().SHOTS);
      // A big number on a post at each end, seen across the hall.
      for (const s of [-1, 1]) {
        const x = c.x + s * (L + R + 0.6);
        k.box('hall', x - 0.05, FY, c.z - 0.05, x + 0.05, FY + 2.6, c.z + 0.05, COL.steel);
        k.box('hall', x - 0.06, FY + 2.6, c.z - 0.45, x + 0.06, FY + 3.4, c.z + 0.45, 0x1e2227);
        for (const yaw of [Math.PI / 2, -Math.PI / 2]) k.signs.push({ x: x + Math.sin(yaw) * 0.07, y: FY + 3.0, z: c.z, yaw, w: 0.8, h: 0.75, style: 'gate', rows: [String(i + 1)] });
        k.col(x - 0.08, 0, c.z - 0.08, x + 0.08, FY + 2.6, c.z + 0.08, 'pole', F().SOLID);
      }
      // Where people wait for their bags: round the belt, facing it.
      const wait = [];
      for (let s = 1.5; s < 4 * L + 2 * Math.PI * CAROUSEL.rc; s += 1.6) {
        const p = beltAt(c, s, R + 0.75);
        if (p.x > c.x + L - 2.4 && Math.abs(p.z - c.z) < 1.5) continue;
        if (p.x > c.x + L + R) continue; // not round the hatch end (the number post)
        // Facing the belt (towards the stadium's centre line).
        wait.push({ x: p.x, z: p.z, yaw: Math.atan2(clamp(p.x, c.x - L, c.x + L) - p.x, c.z - p.z) });
      }
      out.push({ id: c.id, n: i + 1, x: c.x, z: c.z, w: 2 * (L + R), d: 2 * R, L, R, rc: CAROUSEL.rc, wait });
    });
    // Luggage trolleys stacked by the way in.
    for (let j = 0; j < 7; j++) {
      const x = -193.4;
      const z = -1219.6 + j * 0.42;
      k.box('hall', x - 0.3, FY + 0.15, z - 0.18, x + 0.3, FY + 0.22, z + 0.18, COL.chrome);
      k.box('hall', x - 0.3, FY + 0.22, z + 0.12, x + 0.3, FY + 1.0, z + 0.16, COL.chrome);
      k.box('hall', x - 0.32, FY + 1.0, z + 0.1, x + 0.32, FY + 1.05, z + 0.2, 0xe23b3b);
    }
    k.col(-193.8, 0, -1219.9, -193.0, FY + 1.05, -1216.6, 'trolley', F().SOLID | F().SHOTS);
    // The reclaim board between the carousels (both faces), the exit sign.
    for (const yaw of [0, Math.PI]) k.boards.push({ kind: 'reclaim', x: -136, y: FY + 4.6, z: -1222.5 + Math.cos(yaw) * 0.13, yaw, w: 4.2, h: 2.1 });
    k.box('hall', -138.2, FY + 3.45, -1222.6, -133.8, FY + 5.75, -1222.4, 0x1b1d21);
    for (const x of [-137.6, -134.4]) k.box('hall', x - 0.03, FY + 5.75, -1222.53, x + 0.03, CEIL - 0.75, -1222.47, COL.steel);
    k.signs.push({ x: -136, y: FY + 3.6, z: PZ - 0.25, yaw: Math.PI, w: 5.4, h: 0.7, style: 'exit', rows: ['Way out · Nothing to declare'] });
    k.signs.push({ x: -189, y: FY + 3.75, z: NZ - 0.25, yaw: Math.PI, w: 5.6, h: 0.7, style: 'way', rows: ['[bag] Baggage reclaim · Arrivals ↓'] });
    return out;
  }

  // ---------------------------------------------------------- concourse
  const SEAT_ROWS = [-1235.0, -1237.6, -1240.2];

  /** A block of seats in a row facing north (towards the window), on one beam. */
  function seatBlock(k, x0, n, z, zone, seats, rng) {
    const pitch = 0.6;
    const x1 = x0 + n * pitch;
    k.box('hall', x0, FY + 0.3, z - 0.06, x1, FY + 0.36, z + 0.06, COL.chrome);
    for (const lx of [x0 + 0.15, (x0 + x1) / 2, x1 - 0.15]) {
      k.box('hall', lx - 0.03, FY, z - 0.25, lx + 0.03, FY + 0.32, z + 0.25, COL.chrome);
    }
    for (let i = 0; i < n; i++) {
      const sx = x0 + pitch * (i + 0.5);
      const c = rng() < 0.18 ? COL.seatB : COL.seat;
      k.box('hall', sx - 0.27, FY + 0.38, z - 0.26, sx + 0.27, FY + 0.46, z + 0.2, c);
      k.box('hall', sx - 0.27, FY + 0.46, z + 0.2, sx + 0.27, FY + 0.95, z + 0.27, c);
      seats.push({ x: sx, y: FY + 0.45, z: z - 0.1, yaw: Math.PI, zone, approach: { x: sx, z: z - 1.2 } });
    }
    // Only the backs are solid, so whoever sits down can get to the seat.
    k.col(x0, 0, z + 0.2, x1, FY + 0.95, z + 0.3, 'seat', F().SOLID | F().SHOTS);
  }

  function gates(k, stands, seats, desks) {
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out = [];
    stands.forEach((s, i) => {
      const gx = s.x + GATE_DX;
      const zone = 'gate' + s.gate;
      // Carpet in the lounge.
      k.top('hall', gx - 32, Z0 + 0.3, gx + 9, -1233.6, FY + 0.012, COL.carpet);
      k.top('hall', gx - 32, -1233.9, gx + 9, -1233.6, FY + 0.016, COL.carpetEdge);
      // Seats: three rows of four blocks, facing the window and the plane.
      const first = seats.length;
      for (const z of SEAT_ROWS) for (const bx of [-30, -23.6, -17.2, -10.8]) seatBlock(k, gx + bx, 8, z, zone, seats, rng);
      const mine = [];
      for (let j = first; j < seats.length; j++) mine.push(j);
      // The gate desk, the screen behind it, the gate number over the door.
      k.solid('hall', gx + 2.4, FY, -1241.6, gx + 6.2, FY + 1.05, -1240.6, COL.white, null, 'desk');
      k.vq('hall', gx + 2.4, -1240.59, gx + 6.2, -1240.59, FY + 0.1, FY + 0.95, 0, 1, COL.teal);
      k.box('hall', gx + 2.36, FY + 1.05, -1241.64, gx + 6.24, FY + 1.1, -1240.56, 0x3b342d);
      for (const x of [gx + 3.4, gx + 5.2]) {
        k.box('hall', x - 0.25, FY + 1.1, -1241.3, x + 0.25, FY + 1.42, -1241.25, 0x23262b);
        k.vq('screen', x - 0.22, -1241.31, x + 0.22, -1241.31, FY + 1.13, FY + 1.4, 0, -1, C(0x8fd6ff, 1.1));
      }
      k.box('hall', gx + 3.0, FY, -1243.6, gx + 5.6, FY + 3.6, -1243.35, 0x30353c);
      k.col(gx + 3.0, 0, -1243.6, gx + 5.6, FY + 3.6, -1243.35, 'panel', F().SOLID | F().SHOTS);
      k.boards.push({ kind: 'gate', stand: s.id, gate: s.gate, x: gx + 4.3, y: FY + 2.55, z: -1243.33, yaw: 0, w: 2.2, h: 1.24 });
      k.signs.push({ x: gx, y: FY + BR.h + 0.75, z: Z0 + 0.26, yaw: 0, w: 1.5, h: 0.8, style: 'gate', rows: [s.gate] });
      // A gate sign hanging over the lounge, read from along the concourse.
      k.box('hall', gx - 1.3, FY + 4.7, -1232.7, gx + 1.3, FY + 5.7, -1232.5, 0x1e2227);
      for (const x of [gx - 1.1, gx + 1.1]) k.box('hall', x - 0.03, FY + 5.7, -1232.63, x + 0.03, CEIL - 0.75, -1232.57, COL.steel);
      k.signs.push({ x: gx, y: FY + 5.2, z: -1232.48, yaw: 0, w: 2.4, h: 0.9, style: 'gate', rows: ['[plane] ' + s.gate] });
      k.signs.push({ x: gx, y: FY + 5.2, z: -1232.72, yaw: Math.PI, w: 2.4, h: 0.9, style: 'gate', rows: ['[plane] ' + s.gate] });
      const desk = desks.length;
      desks.push({
        id: 'gate' + s.gate, kind: 'gate', gate: s.gate, stand: s.id, x: gx + 4.3, z: -1240.6, yaw: 0,
        staff: { x: gx + 3.4, z: -1242.3, yaw: 0 }, staff2: { x: gx + 5.2, z: -1242.3, yaw: 0 },
        queue: [1.2, 2.4, 3.6, 4.8].map((d) => ({ x: gx + 4.3, z: -1240.6 + d })),
      });
      const br = jetBridge(k, s);
      // Plants between the lounges.
      plant(k, gx + 11, -1243.6, 1);
      plant(k, gx - 34, -1243.6, 1);
      out.push({ stand: s.id, gate: s.gate, x: gx, door: { x: gx, z: Z0 + 1.0 }, bridge: br.points, end: br.end, seats: mine, desk, board: { x: gx + 4.3, z: -1243.33 } });
    });
    return out;
  }

  // -------------------------------------------------------- jet bridges
  /**
   * A straight tunnel along `axis` ('x' or 'z') from a0 to a1 (either way),
   * centred on the cross line `c`, its floor rising from y0 to y1, with a
   * window band down both sides. Colliders in `n` pieces so the floor
   * ramps, the walls and the roof follow the slope.
   */
  function tube(k, axis, c, a0, a1, y0, y1, n) {
    const { w, wi, h } = BR;
    const P = (a, y, cr) => (axis === 'z' ? [c + cr, y, a] : [a, y, c + cr]);
    const flat = (cr0, cr1, lift, hint, surf, col) => k.face(surf, [P(a0, y0 + lift, cr0), P(a1, y1 + lift, cr0), P(a1, y1 + lift, cr1), P(a0, y0 + lift, cr1)], hint, col);
    flat(-wi, wi, 0, [0, 1, 0], 'hall', COL.carpet);
    flat(-wi, wi, h, [0, -1, 0], 'hall', COL.ceiling);
    flat(-0.18, 0.18, h - 0.02, [0, -1, 0], 'screen', C(COL.light, 1.5));
    flat(-w, w, h + 0.3, [0, 1, 0], 'prop', COL.steel);
    flat(-w, w, -0.3, [0, -1, 0], 'prop', 0x8b9198);
    const side = (cr, lo, hi, hint, surf, col) => k.face(surf, [P(a0, y0 + lo, cr), P(a1, y1 + lo, cr), P(a1, y1 + hi, cr), P(a0, y0 + hi, cr)], hint, col);
    for (const s of [-1, 1]) {
      const nIn = axis === 'z' ? [-s, 0, 0] : [0, 0, -s];
      const nOut = [-nIn[0], 0, -nIn[2]];
      side(s * wi, 0, 1.0, nIn, 'hall', 0x9aa4ae);
      side(s * wi, 2.2, h, nIn, 'hall', 0xe4e2dc);
      side(s * w, -0.3, 1.0, nOut, 'prop', COL.steel);
      side(s * w, 2.2, h + 0.3, nOut, 'prop', COL.steel);
      side(s * w, 1.0, 2.2, nOut, 'glass', COL.glass);
      flat(s * wi, s * w, 1.0, [0, 1, 0], 'hall', 0xcfd3d8);
      flat(s * wi, s * w, 2.2, [0, -1, 0], 'hall', 0xcfd3d8);
      // A blue band along the outside under the windows.
      side(s * (w + 0.01), 0.55, 0.85, nOut, 'prop', 0x1d5aa8);
    }
    const ph = k.ph;
    const dir = Math.sign(a1 - a0);
    const yaw = axis === 'z' ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    for (let j = 0; j < n; j++) {
      const pa = a0 + ((a1 - a0) * j) / n;
      const pb = a0 + ((a1 - a0) * (j + 1)) / n;
      const ylo = y0 + ((y1 - y0) * j) / n;
      const yhi = y0 + ((y1 - y0) * (j + 1)) / n;
      const am = (pa + pb) / 2;
      const hz = Math.abs(pb - pa) / 2;
      const [cx, , cz] = P(am, 0, 0);
      ph.addRamp(cx, cz, w, hz, yaw, ylo - 0.35, ylo, yhi, 'floor', F().ALL);
      const lo = Math.min(pa, pb);
      const hi = Math.max(pa, pb);
      for (const s of [-1, 1]) {
        const c0 = c + s * wi;
        const c1 = c + s * w;
        if (axis === 'z') k.col(c0, ylo - 0.35, lo, c1, yhi + h + 0.3, hi, 'bridge');
        else k.col(lo, ylo - 0.35, c0, hi, yhi + h + 0.3, c1, 'bridge');
      }
      if (axis === 'z') k.col(c - w, ylo + h, lo, c + w, yhi + h + 0.3, hi, 'bridge');
      else k.col(lo, ylo + h, c - w, hi, yhi + h + 0.3, c + w, 'bridge');
    }
  }

  /** The rotunda: a square room on a column where the bridge turns towards the plane. */
  function rotunda(k, x, z) {
    const { h, ry } = BR;
    const r = 2.5;
    const ri = 2.25;
    k.top('hall', x - ri, z - ri, x + ri, z + ri, ry, COL.carpet);
    k.under('hall', x - ri, z - ri, x + ri, z + ri, ry + h, COL.ceiling);
    k.S('screen', x, z).quad([x - 0.9, ry + h - 0.02, z - 0.9], [x + 0.9, ry + h - 0.02, z - 0.9], [x + 0.9, ry + h - 0.02, z + 0.9], [x - 0.9, ry + h - 0.02, z + 0.9], [0, -1, 0], C(COL.light, 1.5));
    k.box('prop', x - r, ry + h, z - r, x + r, ry + h + 0.3, z + r, COL.steel);
    k.under('prop', x - r, z - r, x + r, z + r, ry - 0.3, 0x8b9198);
    k.col(x - r, ry - 0.35, z - r, x + r, ry, z + r, 'floor', F().ALL);
    k.col(x - r, ry + h, z - r, x + r, ry + h + 0.3, z + r, 'bridge');
    // Walls: openings south (to the terminal) and west (to the plane).
    const segs = [
      ['z', z - r, x - r, x + r, 1], //            north: [fixed, a0, a1, inward sign]
      ['x', x + r, z - r, z + r, -1], //           east
      ['z', z + r, x - r, x - BR.wi, -1], //       south, either side of the tunnel
      ['z', z + r, x + BR.wi, x + r, -1],
      ['x', x - r, z - r, z - BR.wi, 1], //        west
      ['x', x - r, z + BR.wi, z + r, 1],
    ];
    for (const [ax, f, a0, a1, inw] of segs) {
      const fi = f + inw * (r - ri);
      if (ax === 'z') {
        k.vq('hall', a0, fi, a1, fi, ry, ry + h, 0, inw, 0xe4e2dc);
        k.vq('prop', a0, f, a1, f, ry - 0.3, ry + h + 0.3, 0, -inw, COL.steel);
        k.col(a0, ry - 0.35, Math.min(f, fi), a1, ry + h + 0.3, Math.max(f, fi), 'bridge');
      } else {
        k.vq('hall', fi, a0, fi, a1, ry, ry + h, inw, 0, 0xe4e2dc);
        k.vq('prop', f, a0, f, a1, ry - 0.3, ry + h + 0.3, -inw, 0, COL.steel);
        k.col(Math.min(f, fi), ry - 0.35, a0, Math.max(f, fi), ry + h + 0.3, a1, 'bridge');
      }
    }
    // The column it stands on.
    k.cyl('prop', x, 0, z, 0.75, 0.75, 0.3, 12, 0x8f9499, true);
    k.cyl('prop', x, 0.3, z, 0.42, 0.42, ry - 0.6, 12, COL.steel);
    k.col(x - 0.45, 0, z - 0.45, x + 0.45, ry - 0.3, z + 0.45, 'pole');
  }

  function jetBridge(k, s) {
    const gx = s.x + GATE_DX;
    const zc = s.door.z;
    const xe = s.x + 2.25; // the bridge's mouth, a hand's width off the fuselage at the door
    const { ry, dy, h, w } = BR;
    tube(k, 'z', gx, Z0, zc + 2.5, FY, ry, 4);
    rotunda(k, gx, zc);
    tube(k, 'x', zc, gx - 2.5, xe, ry, dy, 3);
    // The cab's bellows round the mouth, and a sill the people can't step off.
    k.box('prop', xe - 0.05, dy + h, zc - 1.8, xe + 0.7, dy + h + 0.55, zc + 1.8, 0x34383e, { bottom: true });
    k.box('prop', xe - 0.05, dy - 0.65, zc - 1.8, xe + 0.7, dy - 0.25, zc + 1.8, 0x34383e, { bottom: true });
    for (const sgn of [-1, 1]) k.box('prop', xe - 0.05, dy - 0.65, zc + sgn * 1.5, xe + 0.7, dy + h + 0.55, zc + sgn * 1.8, 0x34383e);
    for (let x = xe + 0.05; x < xe + 0.7; x += 0.16) k.box('prop', x - 0.02, dy + h + 0.55, zc - 1.82, x + 0.02, dy + h + 0.57, zc + 1.82, 0x1f2226);
    k.col(xe - 0.1, dy - 0.4, zc - w, xe + 0.25, dy + h, zc + w, 'bridge');
    // The wheeled leg under the outer end.
    const lx = xe + 3.2;
    const ly = dy - ((dy - ry) * 3.2) / (gx - 2.5 - xe);
    k.box('prop', lx - 0.15, 0.75, zc - 0.15, lx + 0.15, ly - 0.3, zc + 0.15, COL.steel);
    k.box('prop', lx - 0.35, 0.3, zc - 1.1, lx + 0.35, 0.8, zc + 1.1, 0x4d535a);
    for (const sgn of [-1, 1]) k.cyl('prop', lx, 0, zc + sgn * 0.75, 0.32, 0.32, 0.62, 10, 0x1b1d21, true);
    k.col(lx - 0.4, 0, zc - 1.15, lx + 0.4, 0.8, zc + 1.15, 'pole');
    k.col(lx - 0.18, 0.8, zc - 0.18, lx + 0.18, ly - 0.3, zc + 0.18, 'pole');
    // A gate sign over the door on the outside wall of the terminal, for the crews.
    const yT1 = (z) => FY + ((ry - FY) * (Z0 - z)) / (Z0 - (zc + 2.5));
    const yT2 = (x) => ry + ((dy - ry) * (gx - 2.5 - x)) / (gx - 2.5 - xe);
    const points = [
      { x: gx, y: FY, z: Z0 + 1.0 },
      { x: gx, y: yT1(Z0 - 1.2), z: Z0 - 1.2 },
      { x: gx, y: yT1(zc + 3.0), z: zc + 3.0 },
      { x: gx, y: ry, z: zc },
      { x: gx - 3.4, y: yT2(gx - 3.4), z: zc },
      { x: xe + 0.75, y: dy, z: zc },
    ];
    return { points, end: { x: xe + 0.75, y: dy, z: zc, mouth: xe } };
  }

  // --------------------------------------------------- shops and cafés
  const GOODS = [0xd93b48, 0xf2c94c, 0x3d7be0, 0x27ae60, 0xf5f0e6, 0xef6c2f, 0x16a3a3, 0x8e5a3c, 0xb03a8c, 0x2b2f35];

  /**
   * An open-fronted unit against a wall: side walls, a lit fascia with the
   * name over the front, and what's inside by kind ('shop', 'food', 'cafe',
   * 'hire'). u: { id, name, sub, kind, x0, x1, zb (the wall it backs on),
   * zf (its open front), bg, fg }.
   */
  function unit(k, u, desks) {
    const f = Math.sign(u.zf - u.zb); // +1 opens to the south, -1 to the north
    const zb = u.zb;
    const zf = u.zf;
    const yaw = f > 0 ? 0 : Math.PI;
    const accent = hexOf(u.bg[0]);
    const xc = (u.x0 + u.x1) / 2;
    let seed = Math.abs(Math.round(u.x0 * 7 + u.zf));
    const rng = () => ((seed = (seed * 16807 + 11) % 2147483647) / 2147483647);
    const pick = (a) => a[Math.floor(rng() * a.length) % a.length];
    for (const x of [u.x0, u.x1]) {
      k.box('hall', x - 0.1, FY, zb, x + 0.1, FY + 3.7, zf, COL.wallB);
      k.col(x - 0.1, 0, zb, x + 0.1, FY + 3.7, zf, 'wall');
    }
    k.box('hall', u.x0 - 0.12, FY + 2.95, zf - f * 0.35, u.x1 + 0.12, FY + 3.75, zf, VH.colMul(C(accent), 0.55), { bottom: true });
    k.signs.push({ x: xc, y: FY + 3.35, z: zf + f * 0.012, yaw, w: Math.min(u.x1 - u.x0 - 0.8, 9), h: 0.66, style: 'brand', colors: { bg: u.bg, fg: u.fg }, rows: [u.name], sub: u.sub });
    k.vq('hall', u.x0 + 0.1, zb + f * 0.01, u.x1 - 0.1, zb + f * 0.01, FY, FY + 3.7, 0, f, VH.colMix(C(accent), C(0xffffff), 0.55));
    k.top('hall', u.x0 + 0.1, zb, u.x1 - 0.1, zf, FY + 0.012, u.kind === 'shop' ? 0xcdb48e : 0xd8d2c6);
    for (let x = u.x0 + 0.8; x < u.x1 - 1.6; x += 2.6) k.under('screen', x, zf - f * 0.75, x + 1.8, zf - f * 0.45, FY + 2.93, C(COL.light, 1.5));
    const desk = { id: u.id, kind: u.kind === 'food' ? 'cafe' : u.kind, name: u.name, food: u.kind === 'food' || undefined };
    if (u.kind === 'shop') {
      // Shelves round the walls, a display table, the counter by the front.
      const zs0 = zb + f * 0.05;
      const zs1 = zb + f * 0.55;
      k.solid('hall', u.x0 + 0.1, FY, zs0, u.x1 - 0.1, FY + 2.2, zs1, 0xe2ded6, null, 'shelf');
      for (let lvl = 0; lvl < 4; lvl++) {
        const y = FY + 0.25 + lvl * 0.48;
        for (let x = u.x0 + 0.3; x < u.x1 - 0.5; x += 0.38) k.box('hall', x, y, zs1, x + 0.3, y + 0.22 + rng() * 0.12, zs1 + f * 0.06, pick(GOODS));
      }
      for (const [x, s] of [[u.x0 + 0.1, 1], [u.x1 - 0.1, -1]]) {
        const za = zb + f * 0.9;
        const zz = zf - f * 2.4;
        k.solid('hall', x, FY, za, x + s * 0.45, FY + 1.8, zz, 0xe2ded6, null, 'shelf');
        for (let lvl = 0; lvl < 3; lvl++) {
          const y = FY + 0.25 + lvl * 0.5;
          for (let t = 0; t < Math.abs(zz - za) - 0.4; t += 0.4) {
            const z = za + f * (t + 0.1);
            k.box('hall', x + s * 0.45, y, z, x + s * 0.5, y + 0.2 + rng() * 0.12, z + f * 0.3, pick(GOODS));
          }
        }
      }
      const tz = (zb + zf) / 2;
      const tw = Math.min(3, (u.x1 - u.x0) / 2 - 2.6);
      if (tw > 0.6) {
        k.solid('hall', xc - tw, FY, tz - 0.6, xc + tw, FY + 0.8, tz + 0.6, 0x6b4f3a, null, 'table');
        for (let x = xc - tw + 0.2; x < xc + tw - 0.3; x += 0.42) k.box('hall', x, FY + 0.8, tz - 0.4, x + 0.3, FY + 0.95 + rng() * 0.15, tz - 0.1 + rng() * 0.4, pick(GOODS));
      }
      const cx0 = u.x1 - 2.9;
      const cx1 = u.x1 - 0.7;
      const cz = zf - f * 1.6;
      k.solid('hall', cx0, FY, cz - 0.35, cx1, FY + 1.05, cz + 0.35, COL.white, null, 'counter');
      k.vq('hall', cx0, cz + f * 0.36, cx1, cz + f * 0.36, FY + 0.1, FY + 0.95, 0, f, accent);
      k.box('hall', cx0 + 0.3, FY + 1.05, cz - 0.2, cx0 + 0.7, FY + 1.2, cz + 0.2, 0x23262b);
      Object.assign(desk, {
        x: (cx0 + cx1) / 2, z: cz + f * 0.35, yaw,
        staff: { x: (cx0 + cx1) / 2, z: cz - f * 1.0, yaw },
        queue: [0.7, 1.8, 2.9].map((d) => ({ x: (cx0 + cx1) / 2, z: cz + f * (0.35 + d) })),
      });
    } else {
      // Food and coffee: a counter across the front, the kitchen behind, menus on the wall.
      const cz0 = zf - f * 0.8;
      k.solid('hall', u.x0 + 0.1, FY, Math.min(cz0, zf), u.x1 - 0.1, FY + 1.05, Math.max(cz0, zf), COL.white, null, 'counter');
      k.vq('hall', u.x0 + 0.1, zf + f * 0.01, u.x1 - 0.1, zf + f * 0.01, FY + 0.1, FY + 0.98, 0, f, accent);
      k.box('hall', u.x0 + 0.06, FY + 1.05, Math.min(cz0, zf) - 0.04, u.x1 - 0.06, FY + 1.1, Math.max(cz0, zf) + 0.04, 0x3b342d);
      if (u.kind !== 'hire') {
        // A glass case of food (or cakes) on the counter, and a till.
        k.vq('glass', u.x0 + 0.6, zf - f * 0.15, xc + 0.8, zf - f * 0.15, FY + 1.1, FY + 1.5, 0, f, COL.glass);
        for (let x = u.x0 + 0.7; x < xc + 0.6; x += 0.34) k.box('hall', x, FY + 1.1, zf - f * 0.6, x + 0.26, FY + 1.18 + rng() * 0.08, zf - f * 0.25, pick([0xd9a05b, 0xf0d39a, 0x8e5a3c, 0xe85f5c, 0x6fbf73]));
        k.box('hall', xc + 1.3, FY + 1.1, cz0 + f * 0.1, xc + 1.7, FY + 1.25, cz0 + f * 0.45, 0x23262b);
        // The kitchen: a back counter with machines on it, and menu boards above.
        const kb = zb + f * 0.75;
        k.solid('hall', u.x0 + 0.1, FY, Math.min(zb, kb), u.x1 - 0.1, FY + 0.95, Math.max(zb, kb), 0xb9bec4, null, 'counter');
        for (let x = u.x0 + 0.5; x < u.x1 - 1.0; x += 1.3) {
          const kind = rng();
          k.box('hall', x, FY + 0.95, zb + f * 0.1, x + 0.8, FY + 0.95 + (kind < 0.5 ? 0.55 : 0.32), zb + f * 0.6, kind < 0.5 ? 0x2b2f35 : 0xc9ced4);
        }
        const mw = (u.x1 - u.x0 - 1.2) / 3;
        for (let m = 0; m < 3; m++) {
          k.signs.push({ x: u.x0 + 0.6 + mw * (m + 0.5), y: FY + 2.25, z: zb + f * 0.02, yaw, w: mw - 0.2, h: 0.9, style: 'menu', colors: { bg: u.bg, fg: u.fg }, rows: u.menu ? u.menu[m] : ['Menu'], seed: m + Math.round(xc) });
        }
      } else {
        k.box('hall', u.x0 + 0.5, FY + 1.1, cz0 + f * 0.2, u.x0 + 0.9, FY + 1.45, cz0 + f * 0.25, 0x23262b);
        k.box('hall', u.x1 - 0.9, FY + 1.1, cz0 + f * 0.2, u.x1 - 0.5, FY + 1.45, cz0 + f * 0.25, 0x23262b);
        k.signs.push({ x: xc, y: FY + 2.2, z: zb + f * 0.02, yaw, w: Math.min(u.x1 - u.x0 - 1.4, 7), h: 1.1, style: 'brand', colors: { bg: u.bg, fg: u.fg }, rows: [u.name], sub: u.tag });
      }
      Object.assign(desk, {
        x: xc, z: zf, yaw,
        staff: { x: xc, z: zf - f * 1.6, yaw },
        queue: [0.8, 1.9, 3.0, 4.1].map((d) => ({ x: xc - 0.6, z: zf + f * d })),
      });
    }
    desks.push(desk);
    return desk;
  }

  /** A café table with chairs round it; the chairs are seats (no collider: only the table is solid). */
  function table(k, x, z, n, zone, seats, top) {
    k.cyl('hall', x, FY, z, 0.28, 0.28, 0.04, 10, COL.dark);
    k.cyl('hall', x, FY + 0.04, z, 0.05, 0.05, 0.68, 6, COL.chrome);
    k.cyl('hall', x, FY + 0.72, z, 0.42, 0.42, 0.04, 14, top || COL.white, true);
    k.col(x - 0.42, 0, z - 0.42, x + 0.42, FY + 0.76, z + 0.42, 'table', F().SOLID | F().SHOTS);
    const spots = n === 2 ? [[-1, 0], [1, 0]] : [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dz] of spots) {
      const cx = x + dx * 0.72;
      const cz = z + dz * 0.72;
      const yaw = Math.atan2(-dx, -dz);
      k.S('hall', cx, cz).orientedBox(cx, cz, 0.21, 0.21, yaw, FY + 0.4, FY + 0.46, C(COL.wood));
      k.S('hall', cx, cz).orientedBox(cx + dx * 0.2, cz + dz * 0.2, 0.21, 0.025, yaw, FY + 0.46, FY + 0.88, C(COL.wood));
      for (const [lx, lz] of [[-0.16, -0.16], [0.16, 0.16], [-0.16, 0.16], [0.16, -0.16]]) k.box('hall', cx + lx - 0.015, FY, cz + lz - 0.015, cx + lx + 0.015, FY + 0.4, cz + lz + 0.015, COL.dark);
      seats.push({ x: cx, y: FY + 0.45, z: cz, yaw, zone, approach: { x: x + dx * 1.35, z: z + dz * 1.35 } });
    }
  }

  // Shared plant parts (merged into the hall's geometry).
  let PLANT = null;
  function plantGeo() {
    if (PLANT) return PLANT;
    const blob = new THREE.IcosahedronGeometry(0.5, 0);
    const frond = new THREE.BoxGeometry(1.5, 0.04, 0.32).translate(0.75, 0, 0);
    PLANT = { blob, frond };
    return PLANT;
  }

  /** A planter with a small palm or a bush in it (solid). s: 1 big palm, 0.6 bush. */
  function plant(k, x, z, s) {
    const g = plantGeo();
    const big = s >= 1;
    const hw = big ? 0.6 : 0.45;
    k.solid('hall', x - hw, FY, z - hw, x + hw, FY + 0.6, z + hw, COL.planter, null, 'planter');
    k.top('hall', x - hw + 0.06, z - hw + 0.06, x + hw - 0.06, z + hw - 0.06, FY + 0.6, 0x4a3a2a);
    const m = new THREE.Matrix4();
    const r = new THREE.Matrix4();
    if (big) {
      const h = 3.2;
      k.cyl('hall', x, FY + 0.6, z, 0.1, 0.07, h, 6, 0x8a6a48);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + x;
        m.makeTranslation(x, FY + 0.6 + h, z);
        r.makeRotationY(a);
        m.multiply(r);
        r.makeRotationZ(-0.45 - (i % 2) * 0.25);
        m.multiply(r);
        k.merge('hall', g.frond, m, i % 2 ? COL.leaf : COL.leafB);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const a = i * 1.9 + x;
        m.makeTranslation(x + Math.cos(a) * 0.18, FY + 0.95 + (i % 2) * 0.25, z + Math.sin(a) * 0.18);
        r.makeScale(0.75, 0.9, 0.75);
        m.multiply(r);
        k.merge('hall', g.blob, m, i % 2 ? COL.leaf : COL.leafB);
      }
    }
  }

  /** A toilets block: solid, with two dark doorways and the signs. f: which way it faces (±1 in z). */
  function toilets(k, x0, x1, zb, zf) {
    const f = Math.sign(zf - zb);
    k.box('hall', x0, FY, Math.min(zb, zf), x1, FY + WALL_H, Math.max(zb, zf), COL.wallB);
    k.col(x0, 0, Math.min(zb, zf), x1, FY + WALL_H, Math.max(zb, zf), 'wall');
    const xc = (x0 + x1) / 2;
    for (const [dx, who] of [[-2.6, 'Ladies'], [2.6, 'Gents']]) {
      k.vq('hall', xc + dx - 0.8, zf + f * 0.01, xc + dx + 0.8, zf + f * 0.01, FY, FY + 2.3, 0, f, 0x23262b);
      k.signs.push({ x: xc + dx, y: FY + 2.75, z: zf + f * 0.02, yaw: f > 0 ? 0 : Math.PI, w: 1.5, h: 0.42, style: 'way', rows: ['[wc] ' + who], center: true });
    }
    k.signs.push({ x: xc, y: FY + 3.55, z: zf + f * 0.02, yaw: f > 0 ? 0 : Math.PI, w: 2.4, h: 0.55, style: 'way', rows: ['[wc] Toilets'], center: true });
  }

  function retail(k, desks, seats) {
    const A = PZ - 0.15; // the partition's airside face
    const L = PZ + 0.15; // its landside face
    const units = [
      // Airside, west of security.
      { id: 'dutyfree', name: 'Bayside Duty Free', sub: 'Perfume · Sweets · Sunglasses', kind: 'shop', x0: -429.6, x1: -405, zb: A, zf: -1223, bg: ['#7a3fb0', '#4b2378'], fg: '#ffe9a8' },
      { id: 'news', name: 'Paper Kite', sub: 'News · Books · Snacks', kind: 'shop', x0: -404, x1: -391, zb: A, zf: -1223, bg: ['#e8463a', '#b8281f'], fg: '#ffffff' },
      { id: 'gifts', name: 'Coral & Co.', sub: 'Gifts from Vicehaven', kind: 'shop', x0: -390, x1: -377, zb: A, zf: -1223, bg: ['#ff7f6b', '#e0525e'], fg: '#ffffff' },
      // Airside, the food court east of security.
      { id: 'grill', name: "Gull's Grill", sub: 'Burgers · Fries', kind: 'food', x0: -289.8, x1: -278, zb: A, zf: -1220, bg: ['#ffb72e', '#e07a12'], fg: '#2b1a0a', menu: [['Burgers', 'from $6'], ['Fries', '$3'], ['Shakes', '$4']] },
      { id: 'noodles', name: 'Noodle Tide', sub: 'Noodles · Bao', kind: 'food', x0: -277, x1: -265, zb: A, zf: -1220, bg: ['#d8232a', '#9c1218'], fg: '#ffe7b0', menu: [['Noodles', '$8'], ['Bao', '$5'], ['Dumplings', '$6']] },
      { id: 'bakery', name: 'Sunny Side', sub: 'Bakery · Breakfast', kind: 'food', x0: -264, x1: -252, zb: A, zf: -1220, bg: ['#ffe05a', '#f2b51e'], fg: '#4a2c0a', menu: [['Pastries', '$3'], ['Breakfast', '$7'], ['Juice', '$3']] },
      { id: 'lighthouse', name: 'Lighthouse Coffee', sub: 'Coffee · Cakes', kind: 'cafe', x0: -250, x1: -236, zb: A, zf: -1220, bg: ['#1f4f6e', '#123349'], fg: '#ffffff', menu: [['Coffee', '$3'], ['Tea', '$2'], ['Cake', '$4']] },
      { id: 'books', name: 'Skyline Books', sub: 'Books · Magazines', kind: 'shop', x0: -234, x1: -221, zb: A, zf: -1223, bg: ['#2d6a4f', '#1b4332'], fg: '#ffffff' },
      { id: 'tech', name: 'Tidewater Tech', sub: 'Headphones · Chargers', kind: 'shop', x0: -220, x1: -208, zb: A, zf: -1223, bg: ['#1f2d3d', '#0f1722'], fg: '#4ff0e0' },
      { id: 'sweets', name: 'Sweet Spot', sub: 'Sweets · Toys', kind: 'shop', x0: -207, x1: -195.4, zb: A, zf: -1223, bg: ['#ff6fb5', '#d93f8f'], fg: '#ffffff' },
      // Landside.
      { id: 'pelican', name: 'Pelican Coffee', sub: 'Fresh every hour', kind: 'cafe', x0: -258, x1: -244, zb: L, zf: -1211.6, bg: ['#0f8f8a', '#0a5f5c'], fg: '#ffffff', menu: [['Coffee', '$3'], ['Bagels', '$4'], ['Smoothies', '$5']] },
      { id: 'sunrise', name: 'Sunrise 24/7', sub: 'Snacks · Drinks · Travel', kind: 'shop', x0: -215, x1: -199, zb: L, zf: -1210, bg: ['#ff8a1f', '#e2471b'], fg: '#ffffff' },
      { id: 'tern', name: 'Tern Café', sub: 'Coffee · Sandwiches', kind: 'cafe', x0: -194.7, x1: -182, zb: L, zf: -1211.6, bg: ['#3b7dd8', '#2456a6'], fg: '#ffffff', menu: [['Coffee', '$3'], ['Sandwiches', '$5'], ['Soup', '$4']] },
      // Car hire in the arrivals hall.
      { id: 'hire1', name: 'Sunwheel Car Hire', tag: 'Drive the bay', kind: 'hire', x0: -126, x1: -113, zb: L, zf: -1212.4, bg: ['#ffc93c', '#f29e1e'], fg: '#2b1a0a' },
      { id: 'hire2', name: 'Coastline Rentals', tag: 'Cars · Vans · Convertibles', kind: 'hire', x0: -112, x1: -99, zb: L, zf: -1212.4, bg: ['#14a37f', '#0b6e55'], fg: '#ffffff' },
      { id: 'hire3', name: 'Bayline Drive', tag: 'Pick up here', kind: 'hire', x0: -98, x1: -85, zb: L, zf: -1212.4, bg: ['#5a3fd0', '#3a2690'], fg: '#ffffff' },
    ];
    for (const u of units) unit(k, u, desks);
    // Food court and café tables.
    for (const x of [-286, -279, -272, -265, -258]) for (const z of [-1223.6, -1226.6]) table(k, x, z, 4, 'food', seats);
    for (const x of [-247, -240]) for (const z of [-1223.6, -1226.6]) table(k, x, z, 4, 'food', seats, 0x3b2f28);
    for (const x of [-256, -248]) for (const z of [-1206.4, -1203.4]) table(k, x, z, 4, 'landside', seats, 0x3b2f28);
    for (const x of [-191.5, -185.5]) for (const z of [-1207.6, -1204.6]) table(k, x, z, 2, 'arrivals', seats, 0x3b2f28);
    // Toilets, airside and landside.
    toilets(k, -364, SEC.x0 - 0.15, A, -1222);
    toilets(k, SEC.x1 + 0.15, -280, L, -1211.2);
    // Seats in the airside wing, landside and in the arrivals hall (facing the way people come).
    let seed = 3;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    seatBlock(k, -376.2, 8, -1224.6, 'shops', seats, rng);
    seatBlock(k, -233, 8, -1205.5, 'landside', seats, rng);
    seatBlock(k, -224, 8, -1205.5, 'landside', seats, rng);
    seatBlock(k, -233, 8, -1208.3, 'landside', seats, rng);
    seatBlock(k, -224, 8, -1208.3, 'landside', seats, rng);
    seatBlock(k, -178, 8, -1205.0, 'arrivals', seats, rng);
    seatBlock(k, -168, 8, -1205.0, 'arrivals', seats, rng);
    // Plants: along the front glass, round the halls.
    for (const x of [-428, -340, -295, -270, -196, -150, -124, -82]) plant(k, x, -1200.4 + (x === -428 || x === -82 ? -1.4 : 0), x === -428 || x === -82 || x === -295 ? 1 : 0.6);
    plant(k, -198, -1214.2, 0.6);
    for (const x of [-428, -82]) plant(k, x, -1236, 1);
    for (const x of [-372, -366]) plant(k, x, -1220.5, 0.6);
  }

  // ------------------------------------------------------------ arrivals
  function arrivals(k) {
    // The meeting rail: a corridor out of the reclaim exit, where people wait.
    const rail = (pts) => {
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1];
        const [bx, bz] = pts[i];
        const len = Math.hypot(bx - ax, bz - az);
        const yaw = Math.atan2(bx - ax, bz - az);
        const cx = (ax + bx) / 2;
        const cz = (az + bz) / 2;
        k.S('hall', cx, cz).orientedBox(cx, cz, 0.04, len / 2, yaw, FY + 0.98, FY + 1.06, C(COL.chrome));
        k.S('hall', cx, cz).orientedBox(cx, cz, 0.015, len / 2, yaw, FY + 0.45, FY + 0.5, C(COL.chrome));
        k.ph.addOrientedBox(cx, cz, 0.06, len / 2, yaw, 0, FY + 1.06, 'rail', F().SOLID | F().SHOTS);
        const n = Math.max(1, Math.round(len / 1.5));
        for (let j = 0; j <= n; j++) k.cyl('hall', ax + ((bx - ax) * j) / n, FY, az + ((bz - az) * j) / n, 0.035, 0.035, 1.0, 6, COL.chrome);
      }
    };
    rail([[EXIT.x0 - 0.3, PZ + 0.2], [EXIT.x0 - 0.3, -1210.5], [EXIT.x0 - 2.3, -1208.8]]);
    rail([[EXIT.x1 + 0.3, PZ + 0.2], [EXIT.x1 + 0.3, -1210.5], [EXIT.x1 + 2.3, -1208.8]]);
    const meet = [];
    for (const [x, yaw] of [[EXIT.x0 - 0.75, Math.PI / 2], [EXIT.x1 + 0.75, -Math.PI / 2]]) {
      for (let z = PZ + 0.9; z < -1210.8; z += 0.85) meet.push({ x, z, yaw });
    }
    for (let x = EXIT.x0 - 3.6; x > EXIT.x0 - 9; x -= 0.85) meet.push({ x, z: -1208.6, yaw: Math.atan2(-136 - x, -1214 + 1208.6) });
    for (let x = EXIT.x1 + 3.6; x < EXIT.x1 + 9; x += 0.85) meet.push({ x, z: -1208.6, yaw: Math.atan2(-136 - x, -1214 + 1208.6) });
    k.signs.push({ x: -136, y: FY + 3.75, z: PZ + 0.17, yaw: 0, w: 9, h: 0.75, style: 'way', rows: ['Arrivals · Welcome to Vicehaven'], center: true });
    return meet;
  }

  // ---------------------------------------------------------------- signs
  const FONT = "'Bahnschrift', 'Segoe UI', 'Arial Narrow', Arial, sans-serif";
  const ARROWS = { '↑': 0, '↗': 45, '→': 90, '↘': 135, '↓': 180, '↙': 225, '←': 270, '↖': 315 };
  const ARROW_PTS = [[0, -0.5], [0.42, -0.04], [0.14, -0.04], [0.14, 0.5], [-0.14, 0.5], [-0.14, -0.04], [-0.42, -0.04]];
  const PLANE_HALF = [[0, -0.5], [0.06, -0.43], [0.065, -0.13], [0.48, 0.1], [0.48, 0.19], [0.065, 0.07], [0.05, 0.3], [0.2, 0.41], [0.2, 0.48], [0, 0.44]];
  const PLANE_PTS = PLANE_HALF.concat(PLANE_HALF.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
  const SIGN_STYLES = {
    way: { bg: ['#1e2227'], fg: '#ffd23c', icon: '#ffffff' },
    gate: { bg: ['#ffd23c'], fg: '#1e2227', icon: '#1e2227' },
    exit: { bg: ['#13804a'], fg: '#ffffff', icon: '#ffffff' },
    info: { bg: ['#1e2227'], fg: '#ffd23c', icon: '#ffd23c' },
    bus: { bg: ['#1c5fd0'], fg: '#ffffff', icon: '#ffffff' },
    taxi: { bg: ['#ffd23c'], fg: '#1e2227', icon: '#1e2227' },
  };

  function poly(g, pts, cx, cy, size, deg) {
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const px = cx + (x * c - y * s) * size;
      const py = cy + (x * s + y * c) * size;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    });
    g.closePath();
    g.fill();
  }

  function rrect(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r);
    else g.rect(x, y, w, h);
    g.fill();
  }

  /** Little pictograms, drawn in a box `s` across centred on (cx, cy). */
  function icon(g, name, cx, cy, s, color) {
    g.fillStyle = color;
    g.strokeStyle = color;
    const u = s / 10;
    switch (name) {
      case 'plane':
        poly(g, PLANE_PTS, cx, cy, s * 0.95, 45);
        break;
      case 'land':
        poly(g, PLANE_PTS, cx, cy, s * 0.95, 135);
        break;
      case 'bag':
        rrect(g, cx - 3.2 * u, cy - 2.2 * u, 6.4 * u, 5.6 * u, u);
        g.lineWidth = u * 0.9;
        g.strokeRect(cx - 1.4 * u, cy - 4 * u, 2.8 * u, 1.8 * u);
        g.fillRect(cx - 2.5 * u, cy + 3.4 * u, 1.2 * u, 1.2 * u);
        g.fillRect(cx + 1.3 * u, cy + 3.4 * u, 1.2 * u, 1.2 * u);
        break;
      case 'wc':
        for (const [dx, dress] of [[-2.3, false], [2.3, true]]) {
          g.beginPath();
          g.arc(cx + dx * u, cy - 3.3 * u, 1.1 * u, 0, Math.PI * 2);
          g.fill();
          if (dress) poly(g, [[0, -0.5], [0.5, 0.35], [-0.5, 0.35]], cx + dx * u, cy + 0.2 * u, 4.6 * u, 0);
          else g.fillRect(cx + (dx - 1.1) * u, cy - 1.8 * u, 2.2 * u, 3.6 * u);
          g.fillRect(cx + (dx - 0.8) * u, cy + 1.6 * u, 0.6 * u, 3 * u);
          g.fillRect(cx + (dx + 0.2) * u, cy + 1.6 * u, 0.6 * u, 3 * u);
        }
        g.fillRect(cx - 0.15 * u, cy - 4.5 * u, 0.3 * u, 9 * u);
        break;
      case 'cup':
        poly(g, [[-0.5, -0.5], [0.5, -0.5], [0.38, 0.5], [-0.38, 0.5]], cx - 0.8 * u, cy + 1 * u, 5.4 * u, 0);
        g.lineWidth = u;
        g.beginPath();
        g.arc(cx + 2.3 * u, cy + 0.6 * u, 1.3 * u, -Math.PI / 2, Math.PI / 2);
        g.stroke();
        g.fillRect(cx - 4.2 * u, cy + 4 * u, 7 * u, 0.8 * u);
        for (const dx of [-1.8, 0.2]) {
          g.beginPath();
          g.moveTo(cx + dx * u, cy - 2.6 * u);
          g.quadraticCurveTo(cx + (dx + 1) * u, cy - 3.6 * u, cx + dx * u, cy - 4.6 * u);
          g.stroke();
        }
        break;
      case 'taxi':
      case 'car':
        rrect(g, cx - 4.6 * u, cy - 0.6 * u, 9.2 * u, 3 * u, u * 0.8);
        poly(g, [[-0.32, 0.5], [-0.2, -0.5], [0.22, -0.5], [0.36, 0.5]], cx, cy - 1.6 * u, 6.8 * u, 0);
        if (name === 'taxi') g.fillRect(cx - 1.1 * u, cy - 4.6 * u, 2.2 * u, 0.9 * u);
        g.fillStyle = color === '#1e2227' ? '#ffd23c' : '#1e2227';
        g.beginPath();
        g.arc(cx - 2.6 * u, cy + 2.5 * u, 1.2 * u, 0, Math.PI * 2);
        g.arc(cx + 2.6 * u, cy + 2.5 * u, 1.2 * u, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = color;
        g.beginPath();
        g.arc(cx - 2.6 * u, cy + 2.5 * u, 0.9 * u, 0, Math.PI * 2);
        g.arc(cx + 2.6 * u, cy + 2.5 * u, 0.9 * u, 0, Math.PI * 2);
        g.fill();
        break;
      case 'bus':
        rrect(g, cx - 3.6 * u, cy - 4.4 * u, 7.2 * u, 8 * u, u);
        g.fillStyle = color === '#ffffff' ? '#1c5fd0' : '#ffffff';
        g.fillRect(cx - 2.8 * u, cy - 3.4 * u, 5.6 * u, 3.4 * u);
        g.fillRect(cx - 2.8 * u, cy + 1.6 * u, 1.4 * u, 1 * u);
        g.fillRect(cx + 1.4 * u, cy + 1.6 * u, 1.4 * u, 1 * u);
        g.fillStyle = color;
        g.fillRect(cx - 3 * u, cy + 3.6 * u, 1.4 * u, 1.2 * u);
        g.fillRect(cx + 1.6 * u, cy + 3.6 * u, 1.4 * u, 1.2 * u);
        break;
      case 'shop':
        poly(g, [[-0.5, -0.3], [0.5, -0.3], [0.42, 0.5], [-0.42, 0.5]], cx, cy + 1 * u, 7 * u, 0);
        g.lineWidth = u * 0.8;
        g.beginPath();
        g.arc(cx, cy - 1.8 * u, 1.7 * u, Math.PI, 0);
        g.stroke();
        break;
      case 'food':
        g.fillRect(cx - 2.6 * u, cy - 4.5 * u, 0.9 * u, 9 * u);
        for (const dx of [-3.6, -2.15, -0.7]) g.fillRect(cx + dx * u, cy - 4.5 * u, 0.5 * u, 3 * u);
        g.fillRect(cx - 3.6 * u, cy - 1.8 * u, 3.4 * u, 0.9 * u);
        poly(g, [[0, -0.5], [0.5, -0.1], [0.5, 0.05], [0.16, 0.05], [0.16, 0.5], [0, 0.5]], cx + 1.6 * u, cy, 9 * u, 0);
        break;
      case 'info':
        g.lineWidth = u * 0.9;
        g.beginPath();
        g.arc(cx, cy, 4.3 * u, 0, Math.PI * 2);
        g.stroke();
        g.font = '700 ' + Math.round(6.4 * u) + 'px Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('i', cx, cy + 0.4 * u);
        break;
      default:
        break;
    }
  }

  /** Split a row: '← [plane] Gates A1–A4 · [bag] Baggage →' → { lead, parts, text, trail }. */
  function parseRow(line) {
    let t = String(line).trim();
    let lead = null;
    let trail = null;
    if (t[0] in ARROWS) {
      lead = ARROWS[t[0]];
      t = t.slice(1).trim();
    }
    if (t.length && t[t.length - 1] in ARROWS) {
      trail = ARROWS[t[t.length - 1]];
      t = t.slice(0, -1).trim();
    }
    // Text and [icon] tokens, in order.
    const parts = t.split(/(\[\w+\])/).filter((q) => q.length).map((q) => (/^\[\w+\]$/.test(q) ? { icon: q.slice(1, -1) } : { text: q }));
    return { lead, trail, parts, text: parts.filter((q) => q.text).map((q) => q.text).join('') };
  }

  function fit(g, text, weight, italic, maxW, size) {
    for (let i = 0; i < 24; i++) {
      g.font = (italic ? 'italic ' : '') + weight + ' ' + Math.round(size) + 'px ' + FONT;
      if (g.measureText(text).width <= maxW) break;
      size *= 0.92;
    }
    return size;
  }

  /** Paint one sign into the atlas at (x, y), W x H pixels. */
  function paintSign(g, spec, x, y, W, H) {
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.rect(-4, -4, W + 8, H + 8);
    g.clip();
    const st = spec.style;
    if (st === 'brand' || st === 'menu' || st === 'ad') {
      const bg = (spec.colors && spec.colors.bg) || ['#333', '#111'];
      const grad = g.createLinearGradient(0, 0, 0, H);
      bg.forEach((c, i) => grad.addColorStop(bg.length === 1 ? 0 : i / (bg.length - 1), c));
      g.fillStyle = grad;
      g.fillRect(-4, -4, W + 8, H + 8);
      const fg = (spec.colors && spec.colors.fg) || '#fff';
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (st === 'menu') {
        // A menu panel: a dish (a plate with something on it) and a price.
        const r = Math.min(H * 0.28, W * 0.18);
        g.fillStyle = 'rgba(255,255,255,0.92)';
        g.beginPath();
        g.arc(W * 0.27, H * 0.5, r, 0, Math.PI * 2);
        g.fill();
        const foods = ['#d9a05b', '#e85f5c', '#f0d39a', '#6fbf73', '#8e5a3c', '#ffcf4a'];
        const seed = spec.seed || 0;
        for (let i = 0; i < 4; i++) {
          g.fillStyle = foods[(seed + i * 3) % foods.length];
          g.beginPath();
          g.arc(W * 0.27 + Math.cos(i * 1.7 + seed) * r * 0.35, H * 0.5 + Math.sin(i * 1.7 + seed) * r * 0.35, r * (0.42 - i * 0.06), 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = fg;
        const rows = spec.rows;
        const s1 = fit(g, rows[0], '700', false, W * 0.5, H * 0.3);
        g.fillText(rows[0], W * 0.7, H * 0.36);
        if (rows[1]) {
          fit(g, rows[1], '800', false, W * 0.5, s1 * 1.1);
          g.fillText(rows[1], W * 0.7, H * 0.7);
        }
      } else {
        const head = spec.rows[0];
        const sub = spec.sub;
        const hs = fit(g, head, '800', !spec.plain, W * 0.9, H * (sub ? 0.52 : 0.68));
        g.fillText(head, W / 2, H * (sub ? 0.4 : 0.52));
        if (sub) {
          fit(g, sub, '600', false, W * 0.85, Math.min(hs * 0.5, H * 0.24));
          g.globalAlpha = 0.9;
          g.fillText(sub, W / 2, H * 0.78);
          g.globalAlpha = 1;
        }
      }
      g.restore();
      return;
    }
    const S = SIGN_STYLES[st] || SIGN_STYLES.way;
    g.fillStyle = S.bg[0];
    g.fillRect(-4, -4, W + 8, H + 8);
    if (st === 'bus' || st === 'taxi') {
      icon(g, st, W / 2, H * 0.42, H * 0.62, S.icon);
      g.fillStyle = S.fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      fit(g, spec.sub || '', '800', false, W * 0.8, H * 0.2);
      g.fillText(spec.sub || '', W / 2, H * 0.85);
      g.restore();
      return;
    }
    if (st === 'info' && spec.rows[0] === 'i') {
      icon(g, 'info', W / 2, H / 2, H * 0.92, S.icon);
      g.restore();
      return;
    }
    const rows = spec.rows.map(parseRow);
    const rh = H / rows.length;
    const pad = Math.min(rh * 0.22, W * 0.04);
    rows.forEach((r, i) => {
      const cy = rh * (i + 0.5);
      const box = rh * 0.62;
      let left = pad;
      let right = W - pad;
      if (r.lead !== null) {
        g.fillStyle = S.fg;
        poly(g, ARROW_PTS, left + box / 2, cy, box, r.lead);
        left += box + pad * 0.8;
      }
      if (r.trail !== null) {
        g.fillStyle = S.fg;
        poly(g, ARROW_PTS, right - box / 2, cy, box, r.trail);
        right -= box + pad * 0.8;
      }
      const size = rh * (st === 'gate' ? 0.64 : 0.5);
      const room = Math.max(10, right - left);
      // Shrink the type until text and icons fit.
      let ts = size;
      let total = 0;
      for (let n = 0; n < 24; n++) {
        g.font = '700 ' + Math.round(ts) + 'px ' + FONT;
        const ib = Math.min(box, ts * 1.25);
        total = r.parts.reduce((w, q) => w + (q.icon ? ib * 1.12 : g.measureText(q.text).width), 0);
        if (total <= room) break;
        ts *= 0.93;
      }
      const ib = Math.min(box, ts * 1.25);
      let x = spec.center || st === 'gate' || st === 'exit' ? left + (room - total) / 2 : r.trail !== null && r.lead === null ? right - total : left;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      for (const q of r.parts) {
        if (q.icon) {
          icon(g, q.icon, x + ib * 0.56, cy, ib, S.icon);
          x += ib * 1.12;
        } else {
          g.fillStyle = S.fg;
          g.fillText(q.text, x, cy + ts * 0.04);
          x += g.measureText(q.text).width;
        }
      }
      if (i > 0) {
        g.fillStyle = 'rgba(255,255,255,0.14)';
        g.fillRect(pad, rh * i - 1, W - pad * 2, 2);
      }
    });
    g.restore();
  }

  /** Pack the signs into one canvas (shelf packing), paint them, and return their regions. */
  function signAtlas(signs) {
    const MAXW = 2048;
    let ppm = 120;
    let layout = null;
    for (let tries = 0; tries < 10 && !layout; tries++) {
      const items = signs.map((s, i) => {
        let w = Math.round(s.w * ppm);
        let h = Math.round(s.h * ppm);
        const sc = Math.min(1, 900 / w, 300 / h);
        w = Math.max(24, Math.round(w * sc));
        h = Math.max(16, Math.round(h * sc));
        return { i, w, h };
      });
      const order = items.slice().sort((a, b) => b.h - a.h);
      let x = 0;
      let y = 0;
      let rowH = 0;
      const P = 6;
      for (const it of order) {
        if (x + it.w + P * 2 > MAXW) {
          x = 0;
          y += rowH;
          rowH = 0;
        }
        it.x = x + P;
        it.y = y + P;
        x += it.w + P * 2;
        rowH = Math.max(rowH, it.h + P * 2);
      }
      const H = y + rowH;
      if (H <= 2048) {
        let CH = 256;
        while (CH < H) CH *= 2;
        layout = { items, W: MAXW, H: CH };
      } else ppm *= 0.85;
    }
    const canvas = document.createElement('canvas');
    canvas.width = layout.W;
    canvas.height = layout.H;
    const g = canvas.getContext('2d');
    g.fillStyle = '#1e2227';
    g.fillRect(0, 0, layout.W, layout.H);
    for (const it of layout.items) paintSign(g, signs[it.i], it.x, it.y, it.w, it.h);
    return { canvas, W: layout.W, H: layout.H, items: layout.items };
  }

  /** A quad facing `yaw` (its front normal is (sin yaw, cos yaw)) with UVs from an atlas region. */
  function quadUV(b, x, y, z, yaw, w, h, u0, v0, u1, v1) {
    const nx = Math.sin(yaw);
    const nz = Math.cos(yaw);
    const rx = nz; // the viewer's right, looking at the front
    const rz = -nx;
    const hw = w / 2;
    const hh = h / 2;
    const BL = [x - rx * hw, y - hh, z - rz * hw];
    const BR_ = [x + rx * hw, y - hh, z + rz * hw];
    const TR = [x + rx * hw, y + hh, z + rz * hw];
    const TL = [x - rx * hw, y + hh, z - rz * hw];
    b.quad(BL, BR_, TR, TL, [nx, 0, nz], [1, 1, 1], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
  }

  function buildSigns(k, mats) {
    const atlas = signAtlas(k.signs);
    const tex = new THREE.CanvasTexture(atlas.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = k.world.materials._anisotropy || 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.92, 0.92, 0.92), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const b = new VH.GeometryBuilder({ uv: true }); // all of them in one mesh
    for (const it of atlas.items) {
      const s = k.signs[it.i];
      const u0 = it.x / atlas.W;
      const u1 = (it.x + it.w) / atlas.W;
      const v0 = 1 - (it.y + it.h) / atlas.H;
      const v1 = 1 - it.y / atlas.H;
      quadUV(b, s.x, s.y, s.z, s.yaw, s.w, s.h, u0, v0, u1, v1);
      if (s.back) quadUV(b, s.x - Math.sin(s.yaw) * 0.02, s.y, s.z - Math.cos(s.yaw) * 0.02, s.yaw + Math.PI, s.w, s.h, u0, v0, u1, v1);
      // A slim dark frame behind wayfinding signs that hang in the air.
      if (s.style !== 'brand' && s.style !== 'menu' && !s.back) {
        const fx = Math.sin(s.yaw);
        const fz = Math.cos(s.yaw);
        k.S('hall', s.x, s.z).orientedBox(s.x - fx * 0.03, s.z - fz * 0.03, s.w / 2 + 0.03, 0.028, s.yaw, s.y - s.h / 2 - 0.03, s.y + s.h / 2 + 0.03, C(0x15171a));
      }
    }
    const mesh = new THREE.Mesh(b.build(), mat);
    mesh.name = 'terminal signs';
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    k.world.chunkAt((X0 + X1) / 2, (Z0 + Z1) / 2).group.add(mesh);
    return { texture: tex, material: mat, count: k.signs.length };
  }

  // A few posters on the partitions: the city, and the shops at the airport.
  function posters(k) {
    const ads = [
      { x: -398, rows: ['Oceanview Pier'], sub: 'Rides, lights and the best sunsets on the bay', bg: ['#ff8a3d', '#d6336c'], fg: '#fff' },
      { x: -310, rows: ['The Velvet Tide'], sub: 'Dance on the Boardwalk · Open late', bg: ['#3a1c71', '#d76d77'], fg: '#fff' },
      { x: -228, rows: ['Northgate Heights'], sub: 'Live high above the bay', bg: ['#134e5e', '#71b280'], fg: '#fff' },
      { x: -151, rows: ['Welcome to Vicehaven'], sub: 'Sun, sea and city lights', bg: ['#ffb347', '#ff4f8b'], fg: '#fff' },
    ];
    for (const a of ads) {
      k.box('hall', a.x - 2.15, FY + 1.35, PZ + 0.15, a.x + 2.15, FY + 3.25, PZ + 0.24, 0x15171a);
      k.signs.push({ x: a.x, y: FY + 2.3, z: PZ + 0.25, yaw: 0, w: 4.1, h: 1.8, style: 'brand', plain: true, colors: { bg: a.bg, fg: a.fg }, rows: a.rows, sub: a.sub });
    }
    const air = [
      { x: -300, rows: ['Bayside Duty Free'], sub: 'Treat yourself before you fly', bg: ['#7a3fb0', '#4b2378'], fg: '#ffe9a8' },
      { x: -150, rows: ['Lighthouse Coffee'], sub: 'Freshly roasted, gate side', bg: ['#1f4f6e', '#123349'], fg: '#fff' },
    ];
    for (const a of air) {
      k.box('hall', a.x - 2.15, FY + 1.35, NZ - 0.24, a.x + 2.15, FY + 3.25, NZ - 0.15, 0x15171a);
      k.signs.push({ x: a.x, y: FY + 2.3, z: NZ - 0.25, yaw: Math.PI, w: 4.1, h: 1.8, style: 'brand', plain: true, colors: { bg: a.bg, fg: a.fg }, rows: a.rows, sub: a.sub });
    }
    // Baggage reclaim: what there is to do in town, on both long walls (z: the wall's face, yaw: facing).
    const reclaimAds = [
      { x: -182, z: PZ - 0.15, yaw: Math.PI, rows: ['Sunset Strip'], sub: 'Neon, music and the late-night crowd', bg: ['#ff3c8e', '#5b2a86'], fg: '#fff' },
      { x: -122, z: PZ - 0.15, yaw: Math.PI, rows: ['Vicehaven Bay Cruises'], sub: 'Round the islands · Every hour from the quay', bg: ['#1aa6b7', '#0d4f8b'], fg: '#fff' },
      { x: -96, z: PZ - 0.15, yaw: Math.PI, rows: ['Coastline Rentals'], sub: 'Your car is waiting in arrivals', bg: ['#14a37f', '#0b6e55'], fg: '#fff' },
      { x: -172, z: NZ + 0.15, yaw: 0, rows: ['Welcome to Vicehaven'], sub: 'Sun, sea and city lights', bg: ['#ffb347', '#ff4f8b'], fg: '#fff' },
      { x: -148, z: NZ + 0.15, yaw: 0, rows: ['Oceanview Pier'], sub: 'Rides, lights and the best sunsets on the bay', bg: ['#ff8a3d', '#d6336c'], fg: '#fff' },
      { x: -100, z: NZ + 0.15, yaw: 0, rows: ['Tidewater Tech'], sub: 'Forgot your charger? Gate side and landside', bg: ['#1f2d3d', '#0f1722'], fg: '#4ff0e0' },
    ];
    for (const a of reclaimAds) {
      const f = Math.cos(a.yaw); // +1 faces south
      k.box('hall', a.x - 2.15, FY + 1.35, a.z, a.x + 2.15, FY + 3.25, a.z + f * 0.09, 0x15171a);
      k.signs.push({ x: a.x, y: FY + 2.3, z: a.z + f * 0.1, yaw: a.yaw, w: 4.1, h: 1.8, style: 'brand', plain: true, colors: { bg: a.bg, fg: a.fg }, rows: a.rows, sub: a.sub });
    }
    // A banner hung across the reclaim hall, facing the way in from the gates (and back).
    const bx = -177;
    k.box('hall', bx - 0.1, FY + 4.85, -1226.7, bx + 0.1, FY + 6.35, -1217.3, 0x15171a);
    for (const z of [-1225.5, -1218.5]) k.box('hall', bx - 0.03, FY + 6.35, z - 0.03, bx + 0.03, CEIL - 0.75, z + 0.03, COL.steel);
    for (const s of [-1, 1]) {
      k.signs.push({ x: bx + s * 0.11, y: FY + 5.6, z: -1222, yaw: (s * Math.PI) / 2, w: 9.2, h: 1.3, style: 'brand', plain: true, colors: { bg: ['#ff8a3d', '#ff4f8b'], fg: '#ffffff' }, rows: ['Welcome to Vicehaven!'], sub: 'Sun, sea and city lights · Enjoy your stay' });
    }
  }

  /** Wayfinding over the halls: hanging two-faced signs (↑ is straight on). */
  function wayfinding(k) {
    const hang = (x, y, z, yaw, w, front, back) => {
      const fr = [].concat(front);
      const bk = back ? [].concat(back) : null;
      const h = 0.72 * Math.max(fr.length, bk ? bk.length : 1) + 0.08;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      k.S('hall', x, z).orientedBox(x, z, w / 2 + 0.05, 0.06, yaw, y - h / 2 - 0.04, y + h / 2 + 0.04, C(0x15171a));
      for (const sg of [-1, 1]) {
        const rx = fz * sg * (w / 2 - 0.3);
        const rz = -fx * sg * (w / 2 - 0.3);
        k.box('hall', x + rx - 0.025, y + h / 2, z + rz - 0.025, x + rx + 0.025, CEIL - 0.75, z + rz + 0.025, COL.steel);
      }
      k.signs.push({ x: x + fx * 0.062, y, z: z + fz * 0.062, yaw, w, h, style: 'way', rows: fr });
      if (bk) k.signs.push({ x: x - fx * 0.062, y, z: z - fz * 0.062, yaw: yaw + Math.PI, w, h, style: 'way', rows: bk });
    };
    const Y = FY + 5.0;
    const Y2 = FY + 5.9;
    // Landside: coming in through the doors, and along the hall.
    hang(-390, Y, -1200.6, 0, 6.4, '[bag] Check-in A · B · C ↑', 'Way out · [taxi] Taxis ↑');
    hang(-320, Y, -1206.0, 0, 7.0, '[plane] Security · All gates ↑', 'Way out ↑');
    hang(-235, Y, -1200.6, 0, 7.2, '← [bag] Check-in · Security', 'Way out ↑');
    hang(-150, Y, -1200.6, 0, 7.2, 'Arrivals · Meeting point ↗', '[taxi] Taxis · [bus] Buses ↑');
    hang(-300, Y2, -1198.8, Math.PI / 2, 7.4, '[bag] Check-in · [plane] Security ↑', 'Arrivals · [car] Car hire ↑');
    hang(-196, Y2, -1198.8, Math.PI / 2, 7.4, 'Departures · [cup] Café ↑', '[car] Car hire · [taxi] Taxis ↑');
    hang(-136, Y - 0.6, -1209.6, Math.PI, 6.4, '[taxi] Taxis · [bus] Buses ↑', null);
    // Airside: out of security, along the concourse.
    hang(-318, Y, -1225.0, 0, 8.4, ['← [plane] Gate A1 · [shop] Duty free', '[plane] Gates A2–A4 · [food] Food court →'], null);
    hang(-340, Y2, -1231.6, Math.PI / 2, 7.6, '[plane] Gate A1 · [shop] Shops ↑', '[plane] Gates A2–A4 ↑');
    hang(-240, Y2, -1231.6, Math.PI / 2, 7.6, '[plane] Gates A1–A2 ↑', '[plane] Gates A3–A4 · [bag] Baggage ↑');
    hang(-150, Y2, -1231.6, Math.PI / 2, 7.6, '[plane] Gates A1–A3 ↑', '[plane] Gate A4 ↑');
    hang(-189, Y - 0.4, -1233.4, Math.PI, 6.6, '[bag] Baggage reclaim · Way out ↑', '[plane] Gates ↑');
  }

  // --------------------------------------------------------------- boards
  // Regions of the boards' canvas (2048 x 1024), redrawn at run time.
  const BOARD_REGIONS = {
    dep: [0, 0, 1024, 512],
    arr: [1024, 0, 1024, 512],
    reclaim: [0, 512, 768, 384],
    gate0: [768, 512, 448, 252],
    gate1: [1216, 512, 448, 252],
    gate2: [768, 764, 448, 252],
    gate3: [1216, 764, 448, 252],
  };

  function bigBoards(k) {
    // Departures in the check-in hall and the landside middle, arrivals by the meeting point:
    // big screens standing on the partition, facing the hall.
    const wallBoard = (kind, x) => {
      k.box('hall', x - 3.9, FY + WALL_H + 0.08, PZ - 0.1, x + 3.9, FY + 8.3, PZ + 0.12, 0x1b1d21);
      k.boards.push({ kind, x, y: FY + 6.25, z: PZ + 0.13, yaw: 0, w: 7.4, h: 3.7 });
      k.boards.push({ kind, x, y: FY + 6.25, z: PZ - 0.11, yaw: Math.PI, w: 7.4, h: 3.7 }); // and over the wall, airside
    };
    wallBoard('dep', -390);
    wallBoard('dep', -262);
    wallBoard('arr', -160);
    // Airside: a double-sided board hanging over the way out of security.
    const x = -318;
    const z = -1228.0;
    k.box('hall', x - 3.4, FY + 3.85, z - 0.12, x + 3.4, FY + 7.35, z + 0.12, 0x1b1d21);
    for (const s of [-1, 1]) k.box('hall', x + s * 3.0 - 0.03, FY + 7.35, z - 0.03, x + s * 3.0 + 0.03, CEIL - 0.95, z + 0.03, COL.steel);
    k.boards.push({ kind: 'dep', x, y: FY + 5.6, z: z + 0.13, yaw: 0, w: 6.6, h: 3.3 });
    k.boards.push({ kind: 'dep', x, y: FY + 5.6, z: z - 0.13, yaw: Math.PI, w: 6.6, h: 3.3 });
  }

  // ------------------------------------------------------------------ nav
  /**
   * The people's map: nodes on the walkways and links between them that
   * keep clear of every wall, desk and seat (the build test raycasts each
   * one). Every door → check-in → security → the concourse → each gate →
   * down its bridge; and back: bridge → reclaim → the exit → the kerb.
   */
  function nav(k, gatesOut, lanes) {
    const N = (id, x, z, y) => k.node(id, x, z, y);
    const L = (a, b) => k.link(a, b);
    // Landside: the kerb, the forecourt line, the doors and the walkway inside the front glass.
    const FZ = -1192.6;
    const KZ = -1189.6;
    const WZ = -1198.5;
    const fxs = [-426, ...DOORS.map((d) => d.x), -215, -170, -152, -128, -84].sort((a, b) => a - b);
    const fid = (x) => 'fc' + x;
    for (const x of fxs) N(fid(x), x, FZ);
    for (let i = 1; i < fxs.length; i++) L(fid(fxs[i - 1]), fid(fxs[i]));
    const kerbX = [...DOORS.map((d) => d.x), -215, -170, -152, -128];
    for (const x of kerbX) {
      N('kerb' + x, x, KZ, KERB);
      L('kerb' + x, fid(x));
    }
    const wxs = [-425.5, -402.5, -377.5, -352.5, -320, -268, -252, -235, -207, -188.5, -165, -136, -112, -91];
    const wid = (x) => 'w' + x;
    for (const x of wxs) N(wid(x), x, WZ);
    for (let i = 1; i < wxs.length; i++) L(wid(wxs[i - 1]), wid(wxs[i]));
    for (const d of DOORS) {
      N('door_' + d.id + '_out', d.x, Z1 + 1.3);
      L(fid(d.x), 'door_' + d.id + '_out');
      L('door_' + d.id + '_out', wid(d.x));
    }
    // Check-in: aisles between the islands, and a walkway behind them.
    const aisles = [-425.5, -402.5, -377.5, -352.5];
    for (const x of aisles) {
      N('ai' + x, x, -1207.3);
      N('ab' + x, x, -1214.3);
      k.chain(wid(x), 'ai' + x, 'ab' + x);
    }
    k.chain(...aisles.map((x) => 'ab' + x));
    // Security: the tail of each lane's queue, through the arch, out into the airside.
    lanes.forEach((ln, i) => {
      const x = ln.arch.x;
      N('sq' + i, x, -1211.0);
      N('sin' + i, x, SEC.z + 1.4);
      N('sarch' + i, x, SEC.z);
      N('sout' + i, x, SEC.z - 2.4);
      N('sn' + i, x, SEC.z - 5.4);
      k.chain('sq' + i, 'sin' + i, 'sarch' + i, 'sout' + i, 'sn' + i);
      if (i) L('sq' + (i - 1), 'sq' + i);
      if (i) L('sn' + (i - 1), 'sn' + i);
    });
    L('ab-352.5', 'sq0');
    L(wid(-320), 'sq1');
    L(wid(-320), 'sq2');
    L(wid(-268), 'sq3');
    // Landside middle and arrivals: the info desk, the cafés, the shop, car hire, the meeting point.
    N('info', -268, -1203.2);
    L(wid(-268), 'info');
    N('pelican', -252, -1210.2);
    L(wid(-252), 'pelican');
    N('sunrise', -207, -1208.6);
    L(wid(-207), 'sunrise');
    N('tern', -188.5, -1210.2);
    L(wid(-188.5), 'tern');
    N('meet', -136, -1208.2);
    N('exit_s', -136, -1214.2);
    L(wid(-136), 'meet');
    L('meet', 'exit_s');
    for (const [id, x] of [['hire1', -119.5], ['hire2', -105.5], ['hire3', -91.5]]) N(id, x, -1209.4);
    k.chain('hire1', 'hire2', 'hire3');
    L(wid(-112), 'hire1');
    L(wid(-112), 'hire2');
    L(wid(-91), 'hire3');
    // Airside: the shops west of security, the food court and shops east, the concourse spine.
    const SZ = -1231.6;
    const sxs = new Set([-425.5, -421, -397, -370, -243.5, -227.5, -214, -201.2, -189, -150, -84]);
    for (const ln of lanes) sxs.add(ln.arch.x);
    for (const g of gatesOut) sxs.add(g.x);
    for (const x of [-282.5, -268.5, -254.5]) sxs.add(x);
    const spine = Array.from(sxs).sort((a, b) => a - b);
    const sid = (x) => 'sp' + x;
    for (const x of spine) N(sid(x), x, SZ);
    for (let i = 1; i < spine.length; i++) L(sid(spine[i - 1]), sid(spine[i]));
    lanes.forEach((ln, i) => L('sn' + i, sid(ln.arch.x)));
    const aw = [-421, -397, -383.5, -370, -357];
    for (const x of aw) N('aw' + x, x, -1225.6);
    k.chain(...aw.map((x) => 'aw' + x));
    L('aw-357', 'sn0');
    for (const x of [-421, -397, -370]) L('aw' + x, sid(x));
    for (const x of [-282.5, -268.5, -254.5, -243.5]) {
      N('fl' + x, x, -1221.3);
      L('fl' + x, sid(x));
    }
    k.chain('fl-282.5', 'fl-268.5', 'fl-254.5', 'fl-243.5');
    L('sn3', 'fl-282.5');
    const ae = [-227.5, -214, -201.2];
    for (const x of ae) {
      N('ae' + x, x, -1225.6);
      L('ae' + x, sid(x));
    }
    k.chain(...ae.map((x) => 'ae' + x));
    // Gates: the lounge, rows of seats, the door, down the bridge.
    for (const g of gatesOut) {
      const id = 'g' + g.gate;
      N(id, g.x, -1234.0);
      L(sid(g.x), id);
      const aisleX = [-31, -24.4, -18.0, -11.6, -5.0].map((d) => g.x + d);
      const lanesZ = SEAT_ROWS.map((z) => z - 1.2);
      aisleX.forEach((ax, a) => {
        N(id + 'a' + a, ax, -1233.9);
        lanesZ.forEach((lz, r) => N(id + 'a' + a + 'r' + r, ax, lz));
        k.chain(id + 'a' + a, id + 'a' + a + 'r0', id + 'a' + a + 'r1', id + 'a' + a + 'r2');
        if (a) {
          L(id + 'a' + (a - 1), id + 'a' + a);
          for (let r = 0; r < 3; r++) L(id + 'a' + (a - 1) + 'r' + r, id + 'a' + a + 'r' + r);
        }
      });
      L(id + 'a4', id);
      const b = g.bridge;
      N(id + 'door', b[0].x, b[0].z);
      L(id, id + 'door');
      for (let j = 1; j < b.length; j++) {
        N(id + 'b' + j, b[j].x, b[j].z, b[j].y);
        L(j === 1 ? id + 'door' : id + 'b' + (j - 1), id + 'b' + j);
      }
      g.nodes = { lounge: k.nodeIx[id], door: k.nodeIx[id + 'door'], end: k.nodeIx[id + 'b' + (b.length - 1)] };
    }
    // Baggage reclaim: in from the concourse, round both carousels, out to the arrivals hall.
    N('rec_d', -189, NZ + 0.1);
    N('rec_in', -189, -1226.0);
    k.chain(sid(-189), 'rec_d', 'rec_in');
    const rx = [-180, -160, -136, -112, -88];
    for (const x of rx) {
      N('rn' + x, x, -1227.0);
      N('rs' + x, x, -1218.0);
    }
    k.chain(...rx.map((x) => 'rn' + x));
    k.chain(...rx.map((x) => 'rs' + x));
    for (const x of [-180, -136, -88]) L('rn' + x, 'rs' + x);
    L('rec_in', 'rn-180');
    L('rec_in', 'rs-180');
    L('rs-136', 'exit_s');
    return k;
  }

  /** Nav links that run into a collider: rays at knee and chest height, and either side. */
  function checkNav(physics, navData) {
    const bad = [];
    const { nodes, links } = navData;
    for (const [i, j] of links) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      const ux = dx / len;
      const uz = dz / len;
      let hit = null;
      for (const off of [-0.28, 0, 0.28]) {
        for (const h of [0.35, 1.2]) {
          const ox = a.x - uz * off;
          const oz = a.z + ux * off;
          const dy = b.y - a.y;
          const l3 = Math.hypot(len, dy);
          const r = physics.raycast(ox, a.y + h, oz, dx / l3, dy / l3, dz / l3, l3, { flags: VH.COLLIDE.SOLID, ground: false });
          if (r && !hit) hit = { off, h, t: +r.t.toFixed(2), tag: r.collider && r.collider.tag, at: [+r.x.toFixed(1), +r.z.toFixed(1)] };
        }
      }
      if (hit) bad.push({ a: a.id, b: b.id, hit });
    }
    // Connected?
    const seen = new Set([0]);
    const adj = nodes.map(() => []);
    for (const [i, j] of links) {
      adj[i].push(j);
      adj[j].push(i);
    }
    const stack = [0];
    while (stack.length) {
      const n = stack.pop();
      for (const m of adj[n]) if (!seen.has(m)) seen.add(m) && stack.push(m);
    }
    const islands = nodes.filter((n, i) => !seen.has(i)).map((n) => n.id);
    return { bad, islands, nodes: nodes.length, links: links.length };
  }

  // ---------------------------------------------------------------- build
  /** Night-time light pools on the hall floor (fx.js draws them). */
  function pools(world) {
    const list = world.floodlights || (world.floodlights = []);
    const add = (x, z, r) => list.push({ x, z, r, y: FY + 0.03, strength: 0.55, tint: [1.25, 1.08, 0.86] });
    for (let x = X0 + 12; x < X1 - 5; x += 24) {
      add(x, -1199, 8);
      add(x + 12, -1231.6, 8);
    }
    for (const x of ISLANDS) add(x, -1207, 9);
    for (const c of CAROUSELS) add(c.x, c.z, 10);
  }

  function zones(stands) {
    const z = [
      { id: 'checkin', x0: X0, z0: PZ, x1: SEC.x1, z1: Z1 },
      { id: 'landside', x0: SEC.x1, z0: PZ, x1: REC.x0, z1: Z1 },
      { id: 'arrivals', x0: REC.x0, z0: PZ, x1: X1, z1: Z1 },
      { id: 'security', x0: SEC.x0, z0: NZ, x1: SEC.x1, z1: PZ },
      { id: 'shops', x0: X0, z0: NZ, x1: SEC.x0, z1: PZ },
      { id: 'food', x0: SEC.x1, z0: NZ, x1: REC.x0, z1: PZ },
      { id: 'baggage', x0: REC.x0, z0: NZ, x1: X1, z1: PZ },
      { id: 'concourse', x0: X0, z0: Z0, x1: X1, z1: NZ },
    ];
    for (const s of stands) z.push({ id: 'gate' + s.gate, x0: s.x + GATE_DX - 32, z0: Z0, x1: s.x + GATE_DX + 9, z1: -1233.6 });
    return z;
  }

  function airlineList() {
    // airside.js may name its own airlines (VH.Airside.AIRLINES: [{ name, code }]); the desks match them.
    const theirs = VH.Airside && Array.isArray(VH.Airside.AIRLINES) ? VH.Airside.AIRLINES : null;
    if (!theirs || !theirs.length) return AIRLINES;
    return theirs.slice(0, 6).map((a, i) => Object.assign({}, AIRLINES[i % AIRLINES.length], {
      name: a.name || AIRLINES[i % AIRLINES.length].name,
      code: a.code || AIRLINES[i % AIRLINES.length].code,
      bg: a.bg || (a.color ? [a.color, a.color] : AIRLINES[i % AIRLINES.length].bg),
      fg: a.fg || AIRLINES[i % AIRLINES.length].fg,
    }));
  }

  class Terminal {
    static build(world, layout, data) {
      const stands = (data && data.stands) || [];
      const k = makeKit(world);
      const lift = { value: 0.03 };
      const mats = { hall: hallMaterial(lift), glass: glassMaterial(), roof: world.materials.propMatte };
      const airlines = airlineList();
      const desks = [];
      const seats = [];
      const lanes = [];
      shell(k, stands);
      partitions(k);
      forecourt(k);
      checkin(k, desks, airlines);
      security(k, lanes);
      const carousels = reclaim(k);
      const gatesOut = gates(k, stands, seats, desks);
      retail(k, desks, seats);
      const meet = arrivals(k);
      posters(k);
      wayfinding(k);
      bigBoards(k);
      // Board frames: a dark bezel behind each screen.
      for (const b of k.boards) {
        const fx = Math.sin(b.yaw);
        const fz = Math.cos(b.yaw);
        k.S('hall', b.x, b.z).orientedBox(b.x - fx * 0.05, b.z - fz * 0.05, b.w / 2 + 0.08, 0.045, b.yaw, b.y - b.h / 2 - 0.08, b.y + b.h / 2 + 0.08, C(0x111316));
      }
      nav(k, gatesOut, lanes);
      const signs = buildSigns(k, mats);
      finishOwn(k, mats);
      pools(world);
      // Each node stands on whatever floor is under it (the forecourt ramp, a bridge).
      for (const n of k.nodes) n.y = +world.physics.groundHeight(n.x, n.z, n.y + 0.8).toFixed(3);
      for (const g of gatesOut) for (const p of g.bridge) p.y = +world.physics.groundHeight(p.x, p.z, p.y + 0.8).toFixed(3);
      const bridgeRects = [];
      for (const s of stands) {
        const gx = s.x + GATE_DX;
        bridgeRects.push([gx - BR.w, s.door.z + 2.5, gx + BR.w, Z0], [gx - 2.5, s.door.z - 2.5, gx + 2.5, s.door.z + 2.5], [s.x + 2.25, s.door.z - BR.w, gx - 2.5, s.door.z + BR.w]);
      }
      if (data) data.bridgeRects = bridgeRects;
      const dep = (x) => ({ x, z: -1187.2, yaw: -Math.PI / 2, kerb: { x: x + 1.0, z: -1189.6 } });
      world.terminal = {
        floorY: FY,
        ceilingY: CEIL,
        bounds: { x0: X0, z0: Z0, x1: X1, z1: Z1 },
        partitionZ: PZ,
        concourseZ: NZ,
        zones: zones(stands),
        nav: { nodes: k.nodes, links: k.links },
        doors: DOORS.map((d) => ({ id: d.id, x: d.x, z: Z1, kind: d.kind, w: DOOR_W, out: { x: d.x, z: Z1 + 1.3 }, in: { x: d.x, z: Z1 - 2.5 }, node: k.nodeIx['door_' + d.id + '_out'] })),
        desks,
        security: lanes,
        seats,
        gates: gatesOut,
        carousels,
        meet,
        boards: k.boards,
        airlines: airlines.map((a) => ({ name: a.name, code: a.code })),
        bridges: bridgeRects,
        // Where cars stop in the kerb lane (facing west), and where their passengers step out.
        kerb: {
          departures: [-405, -380, -325, -240].map(dep),
          arrivals: [-172, -154].map(dep),
          taxiRank: [-129, -121, -113, -105, -97].map((x) => ({ x, z: -1187.2, yaw: -Math.PI / 2 })),
          taxiQueue: [-127.5, -126.4, -125.3, -124.2, -123.1, -122].map((x) => ({ x, z: -1189.7, yaw: -Math.PI / 2 })),
          bus: { x: -212, z: -1187.2, yaw: -Math.PI / 2, kerb: { x: -215, z: -1192.4 } },
          walk: { z: -1192.6 },
        },
        places: { checkin: { x: -377.5, z: -1199 }, gates: { x: -240, z: -1231.6 }, arrivals: { x: -136, z: -1205 }, arrivalsKerb: { x: -140, z: -1192.4 } },
        signs: signs.count,
      };
      Object.defineProperty(world.terminal, '_rt', { value: { mats, lift }, enumerable: false });
      return world.terminal;
    }

    /** Nav links that hit a collider, and nodes cut off from the rest (for the tests). */
    static checkNav(physics, T) {
      return checkNav(physics, T.nav);
    }

    /**
     * Arrivals, on the forecourt by its doors (a taxi fare can end here). The
     * gates get no place of their own: inside the airside fence the GPS
     * would send Jay round by the service gate.
     */
    static registerPlaces(world, places) {
      const T = world.terminal;
      if (!T) return;
      const a = T.places.arrivalsKerb;
      places.add('airport_arrivals', { name: 'Vicehaven International, Arrivals', x: a.x, z: a.z, yaw: Math.PI, kind: 'airport', district: 'airport' });
    }

    // ------------------------------------------------------------ runtime
    constructor(game) {
      this.game = game;
      const T = (this.T = game.world && game.world.terminal);
      this.ok = !!T;
      this.saveKey = 'terminal';
      this.alarms = 0;
      if (!this.ok) return;
      this._t = 0;
      this._boardT = 0;
      this._slowT = 0;
      this._boardKey = '';
      this._lastJay = { x: 0, z: 0 };
      this._warned = 0;
      this._guardT = 0;
      this._buildDoors();
      this._buildCarousels();
      this._buildBoards();
      this._buildArches();
      this._buildShutters();
      this._fallbackT = 60 + Math.random() * 60;
      VH.events.on('airside:arrived', (e) => this._onArrived(e));
    }

    // ------------------------------------------------------------- doors
    _buildDoors() {
      const g = this.game;
      const leafW = DOOR_W / 2 - 0.02;
      const leafH = DOOR_H - 0.04;
      const glass = new THREE.MeshStandardMaterial({ color: 0xbfd8e6, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.5, depthWrite: false, side: THREE.DoubleSide });
      const b = new VH.GeometryBuilder({});
      const frame = C(0x3a3f46);
      b.box(-leafW / 2, 0, -0.03, leafW / 2, 0.12, 0.03, frame);
      b.box(-leafW / 2, leafH - 0.08, -0.03, leafW / 2, leafH, 0.03, frame);
      b.box(-leafW / 2, 0.12, -0.03, -leafW / 2 + 0.07, leafH - 0.08, 0.03, frame);
      b.box(leafW / 2 - 0.07, 0.12, -0.03, leafW / 2, leafH - 0.08, 0.03, frame);
      b.box(-leafW / 2 + 0.07, 1.0, -0.025, leafW / 2 - 0.07, 1.06, 0.025, C(0x9aa1a8));
      const n = DOORS.length * 2;
      this.leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(leafW - 0.1, leafH - 0.18), glass, n);
      this.frames = new THREE.InstancedMesh(b.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }), n);
      for (const m of [this.leaves, this.frames]) {
        m.name = 'terminal doors';
        m.frustumCulled = false;
        g.scene.add(m);
      }
      this.leaves.renderOrder = 3;
      this.doors = DOORS.map((d) => ({ id: d.id, x: d.x, kind: d.kind, open: 0, want: 0, shown: -1 }));
      this._m = new THREE.Matrix4();
      this._doorsDirty = true;
      this._placeDoors();
    }

    _placeDoors() {
      const m = this._m;
      const leafW = DOOR_W / 2 - 0.02;
      this.doors.forEach((d, i) => {
        const e = smoothstep(0, 1, d.open);
        for (const s of [0, 1]) {
          const side = s ? 1 : -1;
          const x = d.x + side * (leafW / 2 + 0.01 + e * (leafW - 0.06));
          m.makeTranslation(x, FY + 0.02, Z1 - 0.12);
          this.frames.setMatrixAt(i * 2 + s, m);
          m.makeTranslation(x, FY + 0.02 + (DOOR_H - 0.04) / 2, Z1 - 0.12);
          this.leaves.setMatrixAt(i * 2 + s, m);
        }
        d.shown = d.open;
      });
      this.frames.instanceMatrix.needsUpdate = true;
      this.leaves.instanceMatrix.needsUpdate = true;
    }

    _updateDoors(dt, p) {
      const g = this.game;
      this._doorScan = (this._doorScan || 0) - dt;
      const scan = this._doorScan <= 0;
      if (scan) this._doorScan = 0.15;
      let moved = false;
      for (const d of this.doors) {
        if (scan) {
          const near = (x, z) => Math.abs(x - d.x) < 3.4 && z > Z1 - 3.6 && z < Z1 + 3.8;
          let want = near(p.x, p.z) && p.y < FY + 3;
          if (!want && g.crowd) {
            g.crowd.near(d.x, Z1, 4.2, (a) => {
              if (!a.dead && !a.hidden && near(a.pos.x, a.pos.z)) want = true;
            });
          }
          d.want = want ? 1 : 0;
        }
        const before = d.open;
        d.open = clamp(d.open + (d.want ? 1.7 : -0.9) * dt, 0, 1);
        if (d.open !== before) moved = true;
      }
      if (moved) this._placeDoors();
    }

    // ------------------------------------------------------------ boards
    _buildBoards() {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1024;
      this.boardCanvas = canvas;
      this.boardCtx = canvas.getContext('2d');
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = (this.game.world.materials && this.game.world.materials._anisotropy) || 4;
      this.boardTex = tex;
      const b = new VH.GeometryBuilder({ uv: true });
      const gateIx = {};
      (this.T.gates || []).forEach((gt, i) => (gateIx[gt.gate] = i));
      for (const q of this.T.boards) {
        const key = q.kind === 'gate' ? 'gate' + (gateIx[q.gate] || 0) : q.kind;
        const r = BOARD_REGIONS[key];
        if (!r) continue;
        quadUV(b, q.x, q.y, q.z, q.yaw, q.w, q.h, r[0] / 2048, 1 - (r[1] + r[3]) / 1024, (r[0] + r[2]) / 2048, 1 - r[1] / 1024);
      }
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.95, 0.95, 0.95), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
      this.boardMesh = new THREE.Mesh(b.build(), mat);
      this.boardMesh.name = 'terminal boards';
      this.game.scene.add(this.boardMesh);
      this._drawBoards(true);
    }

    /** The day's flights: airside.js's schedule, or a plausible list of our own. */
    flights() {
      const a = this.game.airside;
      if (a && typeof a.flights === 'function') {
        try {
          const list = a.flights();
          if (Array.isArray(list) && list.length) return list;
        } catch (err) {
          /* fall through to our own list */
        }
      }
      return this._ownFlights();
    }

    _ownFlights() {
      const h = this.game.environment ? this.game.environment.hours : 12;
      const base = Math.floor(h * 4) / 4;
      const out = [];
      const gates = ['A1', 'A2', 'A3', 'A4'];
      for (let i = -3; i < 9; i++) {
        const slot = base + i * 0.5;
        const n = Math.floor(slot * 2 + 1000);
        const al = AIRLINES[n % AIRLINES.length];
        const kind = n % 2 ? 'dep' : 'arr';
        const time = ((slot % 24) + 24) % 24;
        const dt = slot - h;
        let status;
        if (kind === 'dep') status = dt < -0.3 ? 'Departed' : dt < -0.1 ? 'Gate closed' : dt < 0.1 ? 'Final call' : dt < 0.6 ? 'Boarding' : dt < 1.5 ? 'Go to gate' : n % 7 === 0 ? 'Delayed' : 'Scheduled';
        else status = dt < -0.6 ? 'At gate' : dt < -0.1 ? 'Landed' : dt < 0.4 ? 'Approaching' : n % 9 === 0 ? 'Delayed' : 'Expected';
        out.push({ id: 'own' + n, code: al.code + ' ' + (100 + ((n * 37) % 800)), airline: al.name, city: CITIES[(n * 5) % CITIES.length], kind, time, gate: gates[n % 4], stand: (n % 4) + 1, status });
      }
      return out;
    }

    _drawBoards(force) {
      const flights = this.flights();
      const h = this.game.environment ? this.game.environment.hours : 12;
      const clock = hhmm(h);
      const key = clock.slice(0, 4) + '|' + flights.map((f) => f.code + f.status + f.gate).join(',') + '|' + this.carousels.map((c) => (c.flight ? c.flight.code : '')).join(',');
      if (!force && key === this._boardKey) return;
      this._boardKey = key;
      const g = this.boardCtx;
      const now = h;
      const rel = (f) => {
        let d = f.time - now;
        if (d < -12) d += 24;
        if (d > 12) d -= 24;
        return d;
      };
      // A late flight stays up until it has gone (or come in); then it drops off after a while.
      const eff = (f) => rel(f.est !== null && f.est !== undefined ? f.est : f.time);
      const liveDep = (f) => /board|final|closed|delay|go to gate/i.test(f.status || '');
      const liveArr = (f) => /land|at gate|approach|taxi|delay/i.test(f.status || '') || this.carouselOf(f.id) >= 0;
      const deps = flights.filter((f) => f.kind === 'dep' && (eff(f) > -0.75 || liveDep(f)) && !/cancel/i.test(f.status || '')).sort((a, b) => rel(a) - rel(b)).slice(0, 9);
      const arrs = flights.filter((f) => f.kind === 'arr' && (eff(f) > -1.5 || liveArr(f))).sort((a, b) => rel(a) - rel(b)).slice(0, 9);
      const remark = (f, s) => (/delay/i.test(s) && f.est !== null && f.est !== undefined ? 'Expected ' + hhmm(f.est) : s);
      drawBoard(g, BOARD_REGIONS.dep, 'Departures', clock, ['Time', 'Flight', 'To', 'Gate', 'Remarks'], deps.map((f) => [hhmm(f.time), f.code, f.city, f.gate || '', remark(f, f.status || '')]), true);
      drawBoard(g, BOARD_REGIONS.arr, 'Arrivals', clock, ['Time', 'Flight', 'From', 'Gate', 'Status'], arrs.map((f) => [hhmm(f.time), f.code, f.city, f.gate || '', remark(f, this._arrStatus(f))]), false);
      drawReclaim(g, BOARD_REGIONS.reclaim, this.carousels.map((c) => c.flight), clock);
      const gates = this.T.gates || [];
      gates.forEach((gt, i) => {
        const r = BOARD_REGIONS['gate' + i];
        if (!r) return;
        const mine = flights.filter((f) => f.kind === 'dep' && f.gate === gt.gate && rel(f) > -0.3).sort((a, b) => rel(a) - rel(b))[0];
        drawGate(g, r, gt.gate, mine);
      });
      this.boardTex.needsUpdate = true;
    }

    _arrStatus(f) {
      const c = this.carousels.findIndex((q) => q.flight && q.flight.id === f.id);
      if (c >= 0) return 'Bags: belt ' + (c + 1);
      return f.status || '';
    }

    // --------------------------------------------------------- carousels
    _buildCarousels() {
      const g = this.game;
      const list = this.T.carousels || [];
      // The belt: a loop of steel plates, its texture scrolls while it runs.
      const cv = document.createElement('canvas');
      cv.width = 128;
      cv.height = 32;
      const cg = cv.getContext('2d');
      cg.fillStyle = '#3a3e44';
      cg.fillRect(0, 0, 128, 32);
      for (let i = 0; i < 4; i++) {
        cg.fillStyle = '#5c6269';
        cg.fillRect(i * 32 + 2, 2, 28, 28);
        cg.fillStyle = '#6f767e';
        cg.fillRect(i * 32 + 2, 2, 28, 4);
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.beltTex = tex;
      const pos = [];
      const uv = [];
      const idx = [];
      const p = {};
      const { L, rc, bw } = CAROUSEL;
      const P = 4 * L + 2 * Math.PI * rc;
      for (const c of list) {
        const base = pos.length / 3;
        const n = 96;
        for (let i = 0; i <= n; i++) {
          const s = (P * i) / n;
          beltAt(c, s, rc, p);
          const nx = p.tz;
          const nz = -p.tx; // outward (left of the direction of travel)
          for (const side of [-1, 1]) {
            pos.push(p.x + nx * side * (bw / 2), FY + 0.445, p.z + nz * side * (bw / 2));
            uv.push(s / 1.0, side > 0 ? 1 : 0);
          }
        }
        for (let i = 0; i < n; i++) {
          const a = base + i * 2;
          idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      this.belt = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }));
      this.belt.name = 'terminal carousels';
      g.scene.add(this.belt);
      // The bags: one instanced box each, a few shapes by scaling.
      this.maxBags = 48;
      this.bagMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05 }), this.maxBags);
      this.bagMesh.name = 'terminal bags';
      this.bagMesh.count = 0;
      this.bagMesh.visible = false;
      this.bagMesh.frustumCulled = false;
      g.scene.add(this.bagMesh);
      this._col = new THREE.Color();
      this._q = new THREE.Quaternion();
      this._v = new THREE.Vector3();
      this._sc = new THREE.Vector3();
      this._up = new THREE.Vector3(0, 1, 0);
      this.carousels = list.map((c) => ({ c, flight: null, run: 0, toSpawn: 0, spawnT: 0, since: 0 }));
      this.bags = [];
    }

    /** Which carousel a flight's bags are on (or -1). */
    carouselOf(flightId) {
      return this.carousels ? this.carousels.findIndex((q) => q.flight && q.flight.id === flightId) : -1;
    }

    /** Each carousel: its flight, whether it's running and how many bags are on it. */
    carouselState() {
      return (this.carousels || []).map((q, i) => ({ id: q.c.id, n: i + 1, flight: q.flight, running: q.run > 0, bags: this.bags.filter((b) => b.ci === i).length }));
    }

    _onArrived(e) {
      if (!this.ok) return;
      const f = (e && e.flight) || { id: 'arr' + Math.round(this._t), code: '', city: '' };
      // The carousel that's been quiet longest takes it.
      let best = 0;
      this.carousels.forEach((q, i) => {
        const b = this.carousels[best];
        if ((q.flight ? 1 : 0) < (b.flight ? 1 : 0) || ((q.flight ? 1 : 0) === (b.flight ? 1 : 0) && q.since > b.since)) best = i;
      });
      const q = this.carousels[best];
      q.flight = f;
      q.run = 260;
      q.since = 0;
      q.toSpawn = 14 + Math.floor(Math.random() * 10);
      q.spawnT = 25; // the first bag a little after the passengers get there
      VH.events.emit('terminal:carousel', { carousel: q.c.id, n: best + 1, flight: f, x: q.c.x, z: q.c.z });
      this._boardT = 0; // redrawn when Jay is near enough to see them
    }

    _updateCarousels(dt, near) {
      const BAGC = [0x2b2f35, 0x1f3a5f, 0xc0392b, 0x16a085, 0x8e44ad, 0xd35400, 0x34495e, 0xe5c04a, 0x7f8c8d, 0xff6f91];
      const { L, rc } = CAROUSEL;
      const P = 4 * L + 2 * Math.PI * rc;
      let running = false;
      this.carousels.forEach((q, i) => {
        q.since += dt;
        if (q.run <= 0) return;
        q.run -= dt;
        running = true;
        q.spawnT -= dt;
        if (q.toSpawn > 0 && q.spawnT <= 0 && this.bags.length < this.maxBags) {
          // Out of the hatch onto the belt, if there's room.
          const s0 = 2 * L - 1.2;
          if (!this.bags.some((b) => b.ci === i && Math.abs(((b.s - s0) % P + P) % P) < 1.0)) {
            const big = Math.random();
            this.bags.push({ ci: i, s: s0, color: BAGC[Math.floor(Math.random() * BAGC.length)], w: big < 0.3 ? 0.42 : 0.5 + Math.random() * 0.1, h: big < 0.3 ? 0.3 : 0.24 + Math.random() * 0.06, l: big < 0.3 ? 0.55 : 0.7 + Math.random() * 0.15, yaw: (Math.random() - 0.5) * 0.6, age: 0 });
            q.toSpawn--;
          }
          q.spawnT = 0.9 + Math.random() * 1.4;
        }
        if (q.run <= 0) {
          q.flight = null;
          this.bags = this.bags.filter((b) => b.ci !== i);
          this._boardT = 0;
        }
      });
      if (!running && !this.bags.length) {
        if (this.bagMesh.count) this.bagMesh.count = 0;
        this.bagMesh.visible = false;
        return;
      }
      const speed = 0.45;
      if (running) this.beltTex.offset.x -= (speed * dt) / 1.0 * 0.25;
      // Bags ride round; after a while their owners start lifting them off.
      for (const b of this.bags) {
        b.s += speed * dt;
        b.age += dt;
      }
      this.bags = this.bags.filter((b) => !(b.age > 50 && Math.random() < dt * 0.02));
      if (!near) return;
      const p = {};
      const m = this._m;
      this.bags.forEach((b, j) => {
        const q = this.carousels[b.ci];
        beltAt(q.c, b.s, rc, p);
        const yaw = Math.atan2(p.tx, p.tz) + b.yaw;
        this._q.setFromAxisAngle(this._up, yaw);
        this._v.set(p.x, FY + 0.45, p.z);
        this._sc.set(b.w, b.h, b.l);
        m.compose(this._v, this._q, this._sc);
        this.bagMesh.setMatrixAt(j, m);
        this._col.setHex(b.color);
        this.bagMesh.setColorAt(j, this._col);
      });
      this.bagMesh.count = this.bags.length;
      this.bagMesh.visible = this.bags.length > 0;
      this.bagMesh.instanceMatrix.needsUpdate = true;
      if (this.bagMesh.instanceColor) this.bagMesh.instanceColor.needsUpdate = true;
    }

    // ---------------------------------------------------------- security
    _buildArches() {
      const lanes = this.T.security || [];
      this.lights = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, lanes.length));
      this.lights.name = 'terminal arch lights';
      this.lights.frustumCulled = false;
      const m = new THREE.Matrix4();
      lanes.forEach((ln, i) => {
        m.makeTranslation(ln.arch.x, FY + 2.51, ln.arch.z);
        this.lights.setMatrixAt(i, m);
      });
      this.game.scene.add(this.lights);
      this.arches = lanes.map(() => ({ flash: 0, alarm: false }));
      this._paintArches();
    }

    _paintArches() {
      const c = this._col || (this._col = new THREE.Color());
      this.arches.forEach((a, i) => {
        if (a.flash > 0 && a.alarm) c.setRGB(Math.sin(this._t * 18) > 0 ? 3.2 : 0.4, 0.1, 0.08);
        else if (a.flash > 0) c.setRGB(0.2, 2.4, 0.6);
        else c.setRGB(0.12, 0.9, 0.3);
        this.lights.setColorAt(i, c);
      });
      if (this.lights.instanceColor) this.lights.instanceColor.needsUpdate = true;
    }

    /** An arch goes off (alarm) or blinks green as someone walks through (airportlife.js may call this). */
    archBeep(i, alarm) {
      const a = this.arches && this.arches[i];
      if (!a) return;
      a.flash = alarm ? 2.6 : 0.7;
      a.alarm = !!alarm;
      const au = this.game.audio;
      if (!au || !au.ready || !au._tone) return;
      const p = this.game.player.pos;
      const ln = this.T.security[i];
      const d = Math.hypot(p.x - ln.arch.x, p.z - ln.arch.z);
      if (d > 40) return;
      const lv = clamp(1 - d / 40, 0, 1);
      const t = au.ctx.currentTime;
      if (alarm) for (let j = 0; j < 4; j++) au._tone({ t: t + j * 0.22, freq: 1320, wave: 'square', peak: 0.06 * lv, attack: 0.004, decay: 0.15, lowpass: 3200 });
      else au._tone({ t, freq: 880, wave: 'sine', peak: 0.03 * lv, attack: 0.004, decay: 0.12 });
    }

    /** Does Jay have anything on him that sets a metal detector off? */
    _carrying() {
      const cb = this.game.combat;
      if (!cb || !cb.inventory) return false;
      const all = (VH.Data && VH.Data.weaponsById) || {};
      return Object.keys(cb.inventory).some((id) => {
        const w = all[id];
        return w && w.kind !== 'melee' && w.slot !== 'unarmed' && !w.stun;
      });
    }

    _updateArches(dt, p, onFoot) {
      const lanes = this.T.security || [];
      const prev = this._lastJay;
      if (onFoot && p.y < FY + 1.2) {
        lanes.forEach((ln, i) => {
          // Walked through (a step, not a teleport across it).
          const crossed = (prev.z - ln.arch.z) * (p.z - ln.arch.z) <= 0 && prev.z !== p.z && Math.abs(p.z - prev.z) < 0.6;
          if (crossed && Math.abs(p.x - ln.arch.x) < 0.6 && Math.abs(prev.x - ln.arch.x) < 0.9) {
            const gun = this._carrying();
            this.archBeep(i, gun);
            if (gun) this._alarm(i);
          }
        });
      }
      prev.x = p.x;
      prev.z = p.z;
      let lit = false;
      for (const a of this.arches) {
        if (a.flash > 0) {
          a.flash = Math.max(0, a.flash - dt);
          lit = true;
        }
      }
      if (lit || this._archLit) this._paintArches();
      this._archLit = lit;
    }

    _alarm(i) {
      const g = this.game;
      this.alarms++;
      VH.events.emit('terminal:alarm', { lane: i, x: this.T.security[i].arch.x, z: this.T.security[i].arch.z });
      if (this._t < this._guardT) return;
      this._guardT = this._t + 9;
      const d = g.dialogue;
      if (!d || !d.play) return;
      if (!this._cast && d.addCast) {
        d.addCast({ airport_security: { name: 'Security', voice: { gender: 'female', pitch: 1.0, rate: 1.05 } } });
        this._cast = true;
      }
      const lines = this._warned === 0
        ? ["Whoa, whoa. Step back through for me, please. What've you got in your pockets?", 'Is that a gun? You can\'t take that airside. Turn round, please.']
        : this._warned === 1
          ? ['You again? It beeps every time. Leave the hardware at home.', "Sir, I'm going to need you to stop walking through my arch with that."]
          : ['Beep. Beep. Yes, we know.', "I'm not even surprised any more."];
      this._warned++;
      d.play([['airport_security', lines[Math.floor(Math.random() * lines.length)]]], { mode: 'ambient' });
    }

    // ----------------------------------------------- bridge-end shutters
    _buildShutters() {
      const gates = this.T.gates || [];
      const b = new VH.GeometryBuilder({});
      const h = BR.h;
      b.box(-0.04, 0, -BR.wi, 0.04, h, BR.wi, C(0x9aa1a8));
      for (let y = 0.15; y < h; y += 0.15) b.box(-0.05, y, -BR.wi, 0.05, y + 0.03, BR.wi, C(0x7d848c));
      b.box(-0.06, 0, -BR.wi, 0.06, 0.25, BR.wi, C(0xe0b12e));
      this.shutters = new THREE.InstancedMesh(b.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }), Math.max(1, gates.length));
      this.shutters.name = 'terminal bridge shutters';
      this.shutters.frustumCulled = false;
      this.game.scene.add(this.shutters);
      this.shut = gates.map(() => ({ open: 0, shown: -1 }));
      this._updateShutters(0, true);
    }

    _updateShutters(dt, force) {
      const gates = this.T.gates || [];
      const st = this.game.airside && typeof this.game.airside.stands === 'function' ? this._safe(() => this.game.airside.stands()) : null;
      const m = this._m || (this._m = new THREE.Matrix4());
      const sc = this._shSc || (this._shSc = new THREE.Vector3());
      let dirty = !!force;
      gates.forEach((gt, i) => {
        const s = st && st.find((q) => q.id === gt.stand);
        const docked = !!s && /^(parked|deplaning|boarding|closed)$/.test(s.state || '');
        const sh = this.shut[i];
        sh.open = clamp(sh.open + (docked ? 0.5 : -0.5) * dt, 0, 1);
        if (force || Math.abs(sh.open - sh.shown) > 0.004) {
          sh.shown = sh.open;
          const k = 1 - sh.open;
          m.makeTranslation(gt.end.mouth + 0.06, BR.dy + BR.h * (1 - k), gt.end.z);
          m.scale(sc.set(1, Math.max(0.02, k), 1));
          this.shutters.setMatrixAt(i, m);
          dirty = true;
        }
      });
      if (dirty) this.shutters.instanceMatrix.needsUpdate = true;
    }

    _safe(fn) {
      try {
        return fn();
      } catch (err) {
        return null;
      }
    }

    // ----------------------------------------------------------- queries
    /** Inside the terminal (the halls, or a jet bridge)? y defaults to the floor. */
    isInside(x, z, y) {
      if (!this.ok) return false;
      const yy = y === undefined ? FY : y;
      if (x > X0 && x < X1 && z > Z0 && z < Z1 && yy > -1 && yy < CEIL) return true;
      for (const r of this.T.bridges) if (x > r[0] && x < r[2] && z > r[1] && z < r[3] && yy > 0.2 && yy < BR.dy + BR.h + 0.5) return true;
      return false;
    }

    // ------------------------------------------------------------ update
    update(dt) {
      if (!this.ok) return;
      const g = this.game;
      this._t += dt;
      const pl = g.player;
      const p = pl.pos;
      const cx = (X0 + X1) / 2;
      const cz = (Z0 + Z1) / 2;
      const dist = Math.hypot(Math.max(0, Math.abs(p.x - cx) - (X1 - X0) / 2), Math.max(0, Math.abs(p.z - cz) - (Z1 - Z0) / 2));
      const near = dist < 450;
      // Without airside.js, a flight comes in now and then so the belts still run.
      if (!(g.airside && g.airside.flights)) {
        this._fallbackT -= dt;
        if (this._fallbackT <= 0) {
          this._fallbackT = 150 + Math.random() * 150;
          const f = this._ownFlights().filter((q) => q.kind === 'arr')[0];
          if (f) this._onArrived({ flight: f });
        }
      }
      this._updateCarousels(dt, near && dist < 200);
      if (!near) return;
      this._updateDoors(dt, p);
      this._updateArches(dt, p, !pl.inVehicle && !pl.isDead);
      this._slowT -= dt;
      if (this._slowT <= 0) {
        this._slowT = 0.5;
        const night = (g.environment && g.environment.nightFactor) || 0;
        const lift = this.T._rt.lift;
        lift.value = 0.03 + night * 0.55;
        this._updateShutters(0.5);
      }
      this._boardT -= dt;
      if (this._boardT <= 0 && dist < 250) {
        this._boardT = 4;
        this._drawBoards(false);
      }
    }

    blips() {}

    reset() {
      if (!this.ok) return;
      this.alarms = 0;
      this._warned = 0;
      this.bags = [];
      for (const q of this.carousels) {
        q.flight = null;
        q.run = 0;
      }
      if (this.bagMesh) {
        this.bagMesh.count = 0;
        this.bagMesh.visible = false;
      }
      for (const d of this.doors) d.open = d.want = 0;
      this._placeDoors();
      this._drawBoards(true);
    }

    stop() {}

    stats() {
      return this.alarms > 0 ? [['Airport metal detectors set off', String(this.alarms)]] : [];
    }

    serialize() {
      return { alarms: this.alarms };
    }

    load(d) {
      this.alarms = (d && d.alarms) || 0;
      this._warned = this.alarms > 0 ? 1 : 0;
    }
  }

  // -------------------------------------------------- board painting
  function hhmm(h) {
    const t = ((h % 24) + 24) % 24;
    const hh = Math.floor(t);
    const mm = Math.floor((t - hh) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }

  const STATUS_COL = [
    [/expected \d/i, '#ffc23c'], [/final|now boarding/i, '#ff5a4a'], [/boarding/i, '#5cff8a'], [/closed/i, '#ff9a3c'], [/delay/i, '#ffc23c'],
    [/cancel/i, '#ff5a4a'], [/depart|left/i, '#8a97a8'], [/landed|at gate|bags/i, '#5cff8a'], [/approach|expected|on time|go to gate/i, '#e8f0ff'],
  ];
  function statusColour(s) {
    for (const [re, c] of STATUS_COL) if (re.test(s)) return c;
    return '#e8f0ff';
  }

  function boardFrame(g, r, title, clock, icon_) {
    const [x, y, w, h] = r;
    g.save();
    g.translate(x, y);
    g.fillStyle = '#081426';
    g.fillRect(0, 0, w, h);
    const hh = Math.round(h * 0.15);
    const grad = g.createLinearGradient(0, 0, 0, hh);
    grad.addColorStop(0, '#173a6b');
    grad.addColorStop(1, '#0f2a52');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, hh);
    g.fillStyle = '#ffd23c';
    if (icon_) icon(g, icon_, hh * 0.62, hh / 2, hh * 0.7, '#ffd23c');
    g.font = '700 ' + Math.round(hh * 0.58) + 'px ' + FONT;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillText(title, icon_ ? hh * 1.2 : hh * 0.4, hh / 2 + 1);
    g.textAlign = 'right';
    g.fillStyle = '#ffffff';
    g.fillText(clock, w - hh * 0.4, hh / 2 + 1);
    return hh;
  }

  function drawBoard(g, r, title, clock, cols, rows, dep) {
    const [, , w, h] = r;
    const hh = boardFrame(g, r, title, clock, dep ? 'plane' : 'land');
    const cx = [0.02, 0.13, 0.3, 0.68, 0.78].map((f) => f * w);
    const rowH = (h - hh) / 10;
    g.font = '600 ' + Math.round(rowH * 0.42) + 'px ' + FONT;
    g.fillStyle = '#8fb3e0';
    g.textAlign = 'left';
    cols.forEach((c, i) => g.fillText(c, cx[i], hh + rowH * 0.5));
    const blink = Math.floor(Date.now() / 700) % 2 === 0;
    rows.forEach((row, j) => {
      const y = hh + rowH * (j + 1.5);
      if (j % 2 === 0) {
        g.fillStyle = 'rgba(255,255,255,0.04)';
        g.fillRect(0, y - rowH / 2, w, rowH);
      }
      g.font = '600 ' + Math.round(rowH * 0.55) + 'px ' + FONT;
      row.forEach((cell, i) => {
        g.fillStyle = i === 3 ? '#ffd23c' : i === 4 ? statusColour(cell) : '#ffffff';
        if (i === 4 && /final/i.test(cell) && !blink) g.fillStyle = '#ffd23c';
        let t = String(cell);
        const maxW = (i < 4 ? cx[i + 1] - cx[i] : w - cx[i]) - rowH * 0.3;
        while (t.length > 2 && g.measureText(t).width > maxW) t = t.slice(0, -1);
        g.fillText(t, cx[i], y);
      });
    });
    if (!rows.length) {
      g.fillStyle = '#8fb3e0';
      g.fillText('No more flights today', cx[0], hh + rowH * 1.5);
    }
    g.restore();
  }

  function drawReclaim(g, r, flights, clock) {
    const [, , w, h] = r;
    const hh = boardFrame(g, r, 'Baggage reclaim', clock, 'bag');
    const rowH = (h - hh) / 3;
    flights.forEach((f, i) => {
      const y = hh + rowH * (i + 0.5) + rowH * 0.25;
      g.fillStyle = '#ffd23c';
      g.font = '800 ' + Math.round(rowH * 0.62) + 'px ' + FONT;
      g.textAlign = 'center';
      g.fillText(String(i + 1), w * 0.08, y);
      g.textAlign = 'left';
      g.font = '600 ' + Math.round(rowH * 0.4) + 'px ' + FONT;
      g.fillStyle = '#ffffff';
      g.fillText(f ? (f.code || '') + '  ' + (f.city || '') : '—', w * 0.17, y - rowH * 0.12);
      g.fillStyle = f ? '#5cff8a' : '#8a97a8';
      g.font = '600 ' + Math.round(rowH * 0.3) + 'px ' + FONT;
      g.fillText(f ? 'Bags on the belt' : 'Not in use', w * 0.17, y + rowH * 0.28);
    });
    g.restore();
  }

  function drawGate(g, r, gate, f) {
    const [x, y, w, h] = r;
    g.save();
    g.translate(x, y);
    g.fillStyle = '#081426';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd23c';
    g.fillRect(0, 0, w * 0.28, h);
    g.fillStyle = '#1e2227';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '800 ' + Math.round(h * 0.16) + 'px ' + FONT;
    g.fillText('Gate', w * 0.14, h * 0.3);
    g.font = '800 ' + Math.round(h * 0.36) + 'px ' + FONT;
    g.fillText(gate, w * 0.14, h * 0.6);
    g.textAlign = 'left';
    if (f) {
      g.fillStyle = '#8fb3e0';
      g.font = '600 ' + Math.round(h * 0.11) + 'px ' + FONT;
      g.fillText((f.airline || '') + '  ' + (f.code || ''), w * 0.33, h * 0.2);
      g.fillStyle = '#ffffff';
      let city = String(f.city || '');
      g.font = '700 ' + Math.round(h * 0.22) + 'px ' + FONT;
      while (city.length > 3 && g.measureText(city).width > w * 0.62) city = city.slice(0, -1);
      g.fillText(city, w * 0.33, h * 0.46);
      g.font = '600 ' + Math.round(h * 0.13) + 'px ' + FONT;
      g.fillStyle = '#ffd23c';
      g.fillText(hhmm(f.time), w * 0.33, h * 0.72);
      g.fillStyle = statusColour(f.status || '');
      g.fillText(f.status || '', w * 0.55, h * 0.72);
    } else {
      g.fillStyle = '#8a97a8';
      g.font = '600 ' + Math.round(h * 0.14) + 'px ' + FONT;
      g.fillText('No flight', w * 0.33, h * 0.5);
    }
    g.restore();
  }

  // The map: the jet bridges as they are now (airfield.js draws the rest).
  Terminal.FLOOR_Y = FY;
  Terminal.BOUNDS = { x0: X0, z0: Z0, x1: X1, z1: Z1 };
  VH.Terminal = Terminal;
})();
