/*
 * districts/redwater.js — Redwater's landmarks (VICEHAVEN 4.0): the
 * countryside and leisure south-west of the city.
 *
 *   pelican_links      Pelican Links golf club on Southbay Road: nine holes
 *                      you can walk or drive across (striped fairways, greens
 *                      with flags, bunkers, three water hazards, buggy paths),
 *                      the white clubhouse with its terrace and putting green,
 *                      the buggy shed (buggies parked, as props), a floodlit
 *                      driving range where Jay can hit a bucket of balls
 *   redwater_ranch     Redwater Ranch on Westgate Parkway: the log gate, the
 *                      red stables with horses looking out, the hay barn, the
 *                      round pen and pony rides, three paddocks of horses, the
 *                      ranch house, and the floodlit rodeo arena with chutes,
 *                      barrels, two stands, the announcer's box and a corn-dog
 *                      kiosk; a visitors' car park and horse trailers
 *   willow_lake        Willow Lake on Mariner Way: a lake with weeping willows,
 *                      an island, ducks and swans, a path round it; the jetty
 *                      with rowing boats (hire one at the boathouse), three
 *                      fishing platforms (bait at the middle one, the biggest
 *                      catch is saved), five log cabins on the north shore, a
 *                      campsite of tents and caravans with a shower block and
 *                      a campfire circle, the reception and camp shop
 *   redwater_solar     Redwater Solar Farm on South Coast Highway: 9,408
 *                      panels in rows behind a deer fence, sheep grazing
 *                      between them, inverters, the battery store and the
 *                      substation, the Sunhouse visitor centre (its board and
 *                      counter tell the farm's live output from the sun) and
 *                      a viewing tower you can climb
 *   redwater_recycling Redwater Recycling Centre on South Coast Highway: in at
 *                      the west gate, up the ramp onto the skip deck (throw
 *                      junk over the rail), down and out at the east gate;
 *                      bottle banks, Second Chance (the re-use shop), the
 *                      staff yard with lorries, a loader and bales, and the
 *                      compost rows
 *
 * Static parts are merged into the chunk builders (VH.WNKit, VH.CountryKit);
 * nothing makes a mesh of its own apart from the signs and the ponds' water.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const F = () => VH.COLLIDE;
  const W = () => VH.WNKit;
  const C = () => VH.CountryKit;
  const D = 'redwater';

  // ------------------------------------------------------------- helpers
  /** A flat convex polygon facing up at height y: pts = [[x, z], ...] in either winding. */
  function flat(surf, pts, y, col) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    const P = pts.map((p) => [p[0], y, p[1]]);
    if (a > 0) P.reverse(); // the builder's normal comes from the winding: up wants a negative (x, z) area
    surf.polygon(P, col);
  }

  /** An ellipse (turned yaw) lying at height y on a surface, each slice drawn by the chunk it stands in. */
  function ellipse(world, surfName, cx, cz, rx, rz, yaw, y, col, n) {
    const N = n || Math.max(14, Math.round((rx + rz) * 0.8));
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const pt = (i) => {
      const a = (i / N) * Math.PI * 2;
      const u = Math.cos(a) * rx, v = Math.sin(a) * rz;
      return [cx + u * c + v * s, cz - u * s + v * c];
    };
    // Slices of up to four segments (convex fans from the centre).
    for (let i = 0; i < N; i += 4) {
      const pts = [[cx, cz]];
      for (let k = i; k <= Math.min(N, i + 4); k++) pts.push(pt(k % N));
      const m = pt(i + 2);
      flat(world.ctxAt((cx + m[0]) / 2, (cz + m[1]) / 2)[surfName], pts, y, col);
    }
  }

  /** A straight band from (ax, az) to (bx, bz), `w` wide, at height y (pieces of up to 30 m in their own chunks). */
  function band(world, surfName, ax, az, bx, bz, w, y, col) {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.1) return;
    const ux = (bx - ax) / L, uz = (bz - az) / L, rx = -uz * (w / 2), rz = ux * (w / 2);
    const n = Math.max(1, Math.ceil(L / 30));
    for (let i = 0; i < n; i++) {
      const s0 = (L * i) / n, s1 = (L * (i + 1)) / n;
      const p0x = ax + ux * s0, p0z = az + uz * s0, p1x = ax + ux * s1, p1z = az + uz * s1;
      flat(world.ctxAt((p0x + p1x) / 2, (p0z + p1z) / 2)[surfName], [[p0x - rx, p0z - rz], [p1x - rx, p1z - rz], [p1x + rx, p1z + rz], [p0x + rx, p0z + rz]], y, col);
    }
  }

  /** Distance from (x, z) to the segment a..b. */
  function segDist(x, z, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - ax - dx * t, z - az - dz * t);
  }

  /** Tarmac (car parks, drives, the tip's lanes and deck): the dark asphalt texture lifted to match the roads beside it. */
  const TARMAC = VH.col(0xb4b4b4, 2);
  function tarmac(world, x0, z0, x1, z1, y) {
    W().tiles(world, x0, z0, x1, z1, (a, b, c, d, ctx) => ctx.asphaltTop.topRect(a, b, c, d, y, TARMAC, 6));
  }
  /** A tall ball-stop net along an axis-aligned line: poles every 12 m and a see-through mesh of cords; solid to people. */
  function net(world, x0, z0, x1, z1, h) {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const c = alongX ? z0 : x0;
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const pole = VH.col(0x5a5f66), cord = VH.col(0x26332a);
    const R = (q0, q1, cc0, cc1, y0, y1) => (alongX ? [q0, y0, cc0, q1, y1, cc1] : [cc0, y0, q0, cc1, y1, q1]);
    C().pieces(a0, a1, 48, (a, b) => {
      const ctx = world.ctxAt(alongX ? (a + b) / 2 : c, alongX ? c : (a + b) / 2);
      // (The cords cast no shadow: a fine mesh would shade the whole range in the far shadow map.)
      for (let y = 0.6; y <= h + 0.01; y += 0.9) ctx.interior.box(...R(a, b, c - 0.015, c + 0.015, KERB + y, KERB + y + 0.035), cord);
      for (let p = a; p <= b + 0.01; p += 0.9) ctx.interior.box(...R(p - 0.015, p + 0.015, c - 0.015, c + 0.015, KERB + 0.6, KERB + h), cord);
    });
    for (let p = a0; p <= a1 + 0.01; p += Math.max(6, (a1 - a0) / Math.max(1, Math.round((a1 - a0) / 12)))) {
      world.ctxAt(alongX ? p : c, alongX ? c : p).prop.box(...R(p - 0.1, p + 0.1, c - 0.1, c + 0.1, KERB, KERB + h + 0.3), pole);
    }
    const bx = R(a0, a1, c - 0.12, c + 0.12, 0, KERB + h + 0.3);
    world.physics.addBox(bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], 'fence', F().SOLID | F().CAMERA);
  }

  /** A parked golf buggy (a prop: solid, not driveable), facing yaw. */
  function buggy(world, x, z, yaw, hex) {
    const ctx = world.ctxAt(x, z);
    const s = ctx.detail;
    const K = C();
    const P = K.frame(x, z, yaw);
    const body = VH.col(hex || 0xf2efe8);
    const dark = VH.col(0x2b2d30);
    const ob = (f, r, hf, hr, y0, y1, c) => {
      const [px, pz] = P(f, r);
      s.orientedBox(px, pz, hr, hf, yaw, y0, y1, c);
    };
    ob(0, 0, 1.15, 0.6, KERB + 0.3, KERB + 0.62, body); // the tub
    ob(0.75, 0, 0.4, 0.58, KERB + 0.62, KERB + 0.95, body); // the bonnet
    ob(-0.05, 0, 0.32, 0.55, KERB + 0.62, KERB + 0.82, VH.col(0x2f4a3a)); // the seat
    ob(-0.4, 0, 0.06, 0.55, KERB + 0.82, KERB + 1.3, VH.col(0x2f4a3a)); // the seat back
    ob(-0.85, 0, 0.3, 0.52, KERB + 0.62, KERB + 1.05, VH.col(0x3a3f45)); // the bag well
    for (const [f, r] of [[-0.95, 0.4], [-0.75, -0.35]]) {
      const [bx, bz] = P(f, r);
      s.cylinder(bx, KERB + 0.7, bz, 0.13, 0.13, 0.9, 8, VH.col(r > 0 ? 0x2f6f9a : 0xc8402c), true); // golf bags
    }
    for (const [f, r] of [[0.55, 0.55], [0.55, -0.55], [-0.75, 0.55], [-0.75, -0.55]]) ob(f, r, 0.03, 0.03, KERB + 0.9, KERB + 1.95, dark); // canopy posts
    ob(-0.1, 0, 0.75, 0.66, KERB + 1.95, KERB + 2.02, body); // the canopy
    ob(0.62, 0, 0.03, 0.5, KERB + 1.05, KERB + 1.6, VH.col(0x3a4a58)); // the windscreen
    for (const f of [0.72, -0.72]) {
      for (const r of [0.55, -0.55]) {
        const [wx, wz] = P(f, r);
        K.wheel(s, wx, KERB + 0.22, wz, 0.22, 0.16, yaw, dark);
      }
    }
    world.physics.addOrientedBox(x, z, 0.66, 1.2, yaw, 0, KERB + 1.3, 'metal', F().SOLID | F().SHOTS);
    world.physics.addOrientedBox(x - Math.sin(yaw) * 0.1, z - Math.cos(yaw) * 0.1, 0.66, 0.8, yaw, KERB + 1.3, KERB + 2.05, 'metal', F().SOLID | F().SHOTS);
  }

  // ------------------------------------------------------- Pelican Links
  // The plot (-1582..-1057, 669..1181): Southbay Road north (the front),
  // Backlot Avenue east, Mariner Way south, Westfield Road west. The club
  // and the driving range along the north side, nine holes below them.
  const PL = {
    x0: -1582, x1: -1057, z0: 669, z1: 1181,
    edge: 1.6,
    range: { x0: -1572, x1: -1326, z0: 680, z1: 764, bays: -1342 },
    club: { x0: -1272, x1: -1222, z0: 698, z1: 728, h: 7 },
    terrace: { z1: 744 },
    shed: { x0: -1206, x1: -1184, z0: 688, z1: 724 },
    park: { x0: -1176, x1: -1068, z0: 678, z1: 760 },
    gate: { x0: -1146, x1: -1128 }, // the car park's way in from Southbay Road
    putt: { x: -1246, z: 757, rx: 19, rz: 7.5 },
    // The nine holes: tee, green, fairway width (0: a par 3 over water), the side the buggy path runs.
    holes: [
      { tx: -1300, tz: 792, gx: -1505, gz: 800, w: 32, path: 1 },
      { tx: -1552, tz: 842, gx: -1550, gz: 1050, w: 30, path: 1 },
      { tx: -1540, tz: 1120, gx: -1332, gz: 1142, w: 32, path: 1 },
      { tx: -1290, tz: 1140, gx: -1150, gz: 1122, w: 0, path: 1 },
      { tx: -1100, tz: 1100, gx: -1104, gz: 882, w: 30, path: 1 },
      { tx: -1180, tz: 852, gx: -1198, gz: 1048, w: 30, path: -1 },
      { tx: -1262, tz: 1062, gx: -1275, gz: 872, w: 30, path: -1 },
      { tx: -1350, tz: 864, gx: -1395, gz: 1056, w: 30, path: -1 },
      { tx: -1466, tz: 1048, gx: -1452, gz: 870, w: 30, path: -1 },
    ],
    ponds: [
      { x: -1415, z: 962, rx: 15, rz: 40 },
      { x: -1218, z: 1131, rx: 24, rz: 13 },
      { x: -1229, z: 960, rx: 12, rz: 30 },
    ],
  };
  PL.holes.forEach((H, i) => {
    H.n = i + 1;
    const L = Math.hypot(H.gx - H.tx, H.gz - H.tz);
    H.L = L;
    H.ux = (H.gx - H.tx) / L;
    H.uz = (H.gz - H.tz) / L;
    H.yaw = Math.atan2(H.ux, H.uz); // facing from the tee to the green
    H.rx = -H.uz; // across, to one side
    H.rz = H.ux;
    // The pin: a little off the green's middle.
    H.px = H.gx + H.rx * (i % 2 ? 3 : -3) + H.ux * 2;
    H.pz = H.gz + H.rz * (i % 2 ? 3 : -3) + H.uz * 2;
  });

  const GOLF = {
    fwA: VH.col(0xd4fca8, 1.3), fwB: VH.col(0xbcec94, 1.3), tee: VH.col(0xdcffb4, 1.35),
    fringe: VH.col(0xc4f4a0, 1.3), green: VH.col(0xe4ffc4, 1.55), sand: VH.col(0xeedcaa), path: VH.col(0xb4ab98), cup: VH.col(0x1a1c1a),
  };

  function buildGolf(world) {
    const K = C(), WN = W();
    const P = PL, e = P.edge;
    // The rough over the whole course, the paths and fairways over it.
    WN.pave(world, P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e, 0xa6b888, 'grassTop', KERB + 0.004); // the rough: longer, darker grass
    world.addLawn(P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e);
    VH.Districts.open && VH.Districts.open(P.x0, P.range.z1, P.x1, P.z1, 'Pelican Links golf course');
    VH.Districts.open && VH.Districts.open(P.range.x0, P.range.z0, P.range.bays, P.range.z1, 'Pelican Links driving range');
    for (const H of P.holes) buildHole(world, H);
    for (const p of P.ponds) {
      K.pond(world, p.x, p.z, p.rx, p.rz, { bank: 0x9a948a });
    }
    buildPaths(world);
    buildCourseTrees(world);
    buildClubhouse(world);
    buildBuggyShed(world);
    buildPuttingGreen(world);
    buildRange(world);
    buildClubCarPark(world);
    // The course's edge: white out-of-bounds stakes along the lanes (knee-low).
    const stake = VH.col(0xf2f2ee);
    const stakes = (x0, z0, x1, z1) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 12);
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n;
        world.ctxAt(x, z).detail.box(x - 0.04, KERB, z - 0.04, x + 0.04, KERB + 0.45, z + 0.04, stake); // solidity: passable (knee-low)
      }
    };
    stakes(P.x0 + e + 0.8, P.range.z1 + 4, P.x0 + e + 0.8, P.z1 - e - 0.8);
    stakes(P.x0 + e + 0.8, P.z1 - e - 0.8, P.x1 - e - 0.8, P.z1 - e - 0.8);
    stakes(P.x1 - e - 0.8, P.park.z1 + 4, P.x1 - e - 0.8, P.z1 - e - 0.8);
    // The names: on Southbay Road by the gate, and on the corner of Backlot Avenue and Mariner Way.
    VH.Landmarks.sign(world, { x: P.gate.x0 - 6, y: KERB + 2.4, z: P.z0 + e + 1.2, yaw: Math.PI, w: 7, h: 1.6, lines: ['PELICAN LINKS', 'Golf club · Driving range · Visitors welcome'], style: 'brand', posts: true, colors: { bg: ['#1f4a36', '#163828'], fg: '#f4ead2' }, frame: 0xf2efe8, twoSided: true });
    VH.Landmarks.sign(world, { x: P.x1 - 10, y: KERB + 1.8, z: P.z1 - 6, yaw: Math.PI / 2, w: 4.2, h: 1.1, lines: ['PELICAN LINKS', 'Golfers have right of way'], style: 'park', posts: true });
    pelican(world, P.gate.x0 - 14, P.z0 + 10);
  }

  /** One hole: the tee, the striped fairway, the fringe and green with its flag, the bunkers. */
  function buildHole(world, H) {
    const K = C();
    const yF = KERB + 0.025, yT = KERB + 0.04, yG = KERB + 0.055;
    // The fairway: a lens of mown stripes from 16 m past the tee to under the green.
    if (H.w) {
      const a0 = 16, a1 = H.L - 4;
      const n = Math.max(4, Math.round((a1 - a0) / 9));
      const wid = (s) => H.w * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, (s - a0) / (a1 - a0)))));
      for (let i = 0; i < n; i++) {
        const s0 = a0 + ((a1 - a0) * i) / n, s1 = a0 + ((a1 - a0) * (i + 1)) / n;
        const w0 = wid(s0) / 2, w1 = wid(s1) / 2;
        const c0x = H.tx + H.ux * s0, c0z = H.tz + H.uz * s0, c1x = H.tx + H.ux * s1, c1z = H.tz + H.uz * s1;
        flat(world.ctxAt((c0x + c1x) / 2, (c0z + c1z) / 2).grassTop, [[c0x - H.rx * w0, c0z - H.rz * w0], [c1x - H.rx * w1, c1z - H.rz * w1], [c1x + H.rx * w1, c1z + H.rz * w1], [c0x + H.rx * w0, c0z + H.rz * w0]], yF, i % 2 ? GOLF.fwA : GOLF.fwB);
      }
    }
    // The tee: a mown box, two markers, a bench, a ball washer and the hole's board.
    const tl = 7, tw = 5;
    flat(world.ctxAt(H.tx, H.tz).grassTop, [[H.tx - H.ux * tl - H.rx * tw, H.tz - H.uz * tl - H.rz * tw], [H.tx + H.ux * tl - H.rx * tw, H.tz + H.uz * tl - H.rz * tw], [H.tx + H.ux * tl + H.rx * tw, H.tz + H.uz * tl + H.rz * tw], [H.tx - H.ux * tl + H.rx * tw, H.tz - H.uz * tl + H.rz * tw]], yT, GOLF.tee);
    const tc = world.ctxAt(H.tx, H.tz);
    const mark = H.n % 3 === 0 ? 0xc8302c : H.n % 3 === 1 ? 0xf2f2ee : 0x2f6f9a;
    for (const s of [-1.6, 1.6]) {
      const mx = H.tx + H.ux * 2 + H.rx * s, mz = H.tz + H.uz * 2 + H.rz * s;
      K.blob(tc.detail, mx, KERB + 0.12, mz, 0.12, 0.1, 0.12, VH.col(mark)); // solidity: passable (tee markers, ankle-high)
    }
    const side = H.path;
    const bx = H.tx - H.ux * 4 + H.rx * side * 8, bz = H.tz - H.uz * 4 + H.rz * side * 8;
    world.addProp('bench', bx, KERB, bz, H.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2), 1);
    // The ball washer: a post with a little paddle box on top.
    const wx = H.tx - H.ux * 4 + H.rx * side * 6.2, wz = H.tz - H.uz * 4 + H.rz * side * 6.2;
    tc.detail.box(wx - 0.05, KERB, wz - 0.05, wx + 0.05, KERB + 0.9, wz + 0.05, VH.col(0x3a3f45));
    tc.detail.box(wx - 0.14, KERB + 0.9, wz - 0.1, wx + 0.14, KERB + 1.2, wz + 0.1, VH.col(0x2f6f3a));
    world.physics.addBox(wx - 0.15, 0, wz - 0.12, wx + 0.15, KERB + 1.2, wz + 0.12, 'pole', F().SOLID | F().SHOTS);
    // The hole's board: a green panel with the number dots (no text: signs cost draw calls), on two posts.
    const hx = H.tx - H.ux * 8, hz = H.tz - H.uz * 8;
    const P2 = K.frame(hx, hz, H.yaw);
    for (const r of [-0.6, 0.6]) {
      const [px, pz] = P2(0, r);
      tc.detailWood.box(px - 0.05, KERB, pz - 0.05, px + 0.05, KERB + 1.5, pz + 0.05, VH.col(0x6b5038));
    }
    tc.detail.orientedBox(hx, hz, 0.75, 0.04, H.yaw, KERB + 0.8, KERB + 1.45, VH.col(0x1f4a36));
    for (let k = 0; k < H.n; k++) {
      const r = -0.55 + (k % 5) * 0.27, yy = KERB + 1.3 - Math.floor(k / 5) * 0.2;
      const [dx, dz] = P2(-0.06, r);
      tc.detail.box(dx - 0.05, yy - 0.05, dz - 0.05, dx + 0.05, yy + 0.05, dz + 0.05, VH.col(0xf4ead2));
    }
    world.physics.addOrientedBox(hx, hz, 0.8, 0.12, H.yaw, 0, KERB + 1.5, 'sign', F().SOLID | F().SHOTS);
    // The fringe and the green, the cup and the flag.
    ellipse(world, 'grassTop', H.gx, H.gz, 16.5, 13, H.yaw, yG - 0.01, GOLF.fringe);
    ellipse(world, 'grassTop', H.gx, H.gz, 14, 10.5, H.yaw, yG, GOLF.green);
    ellipse(world, 'marks', H.px, H.pz, 0.25, 0.25, 0, yG + 0.012, GOLF.cup, 10);
    const gc = world.ctxAt(H.px, H.pz);
    gc.prop.cylinder(H.px, KERB, H.pz, 0.03, 0.03, 2.7, 6, VH.col(0xf2f2ee), true);
    const fy = KERB + 2.7;
    const flagCol = VH.col(H.n % 2 ? 0xe8302c : 0xf2c318);
    // The flag, streaming away from the south-west wind, both faces.
    const fx = Math.cos(0.6), fz = -Math.sin(0.6);
    const f0 = [H.px, fy, H.pz], f1 = [H.px, fy - 0.75, H.pz], f2 = [H.px + fx * 1.2, fy - 0.37, H.pz + fz * 1.2];
    gc.prop.polygon([f0, f1, f2], flagCol);
    gc.prop.polygon([f0, f2, f1], flagCol);
    world.physics.addBox(H.px - 0.06, 0, H.pz - 0.06, H.px + 0.06, fy, H.pz + 0.06, 'pole', F().SOLID | F().SHOTS);
    // Bunkers: one either side of the green's front, a fairway bunker on the long holes.
    const bunk = (s, f, r, rx, rz) => ellipse(world, 'marks', H.gx + H.ux * f + H.rx * r * s, H.gz + H.uz * f + H.rz * r * s, rx, rz, H.yaw + 0.4 * s, KERB + 0.06, GOLF.sand);
    bunk(1, -10, 17, 5.5, 3.5);
    if (H.n % 2) bunk(-1, -4, 18, 4.5, 3);
    else bunk(-1, 8, 17, 4.5, 3);
    if (H.w && H.L > 190) bunk(H.n % 2 ? 1 : -1, -H.L * 0.42, H.w * 0.42, 6, 3.5);
  }

  /** The buggy paths: alongside each hole, then on to the next tee; from the club to the first and back from the ninth. */
  function buildPaths(world) {
    const P = PL;
    const y = KERB + 0.035;
    const pts = [];
    const club = [P.club.x1 - 2, P.terrace.z1 + 1.5]; // the terrace steps (east of the putting green)
    pts.push([club, [P.club.x1 - 2, 772], [P.holes[0].tx + 10, 778]]);
    P.holes.forEach((H, i) => {
      const o = 24 * H.path;
      const a = [H.tx + H.rx * o - H.ux * 2, H.tz + H.rz * o - H.uz * 2];
      const b = [H.gx + H.rx * o + H.ux * 6, H.gz + H.rz * o + H.uz * 6];
      pts.push([a, b]);
      const N = P.holes[i + 1];
      if (N) pts.push([b, [N.tx + N.rx * 24 * N.path - N.ux * 2, N.tz + N.rz * 24 * N.path - N.uz * 2]]);
    });
    const last = pts[pts.length - 1];
    pts.push([last[last.length - 1], [-1420, 822], [-1340, 822], [-1250, 778], [P.club.x1 - 2, 772]]);
    PL.pathSegs = [];
    for (const line of pts) {
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, az] = line[i], [bx, bz] = line[i + 1];
        band(world, 'marks', ax, az, bx, bz, 2.6, y, GOLF.path);
        // Round the joints.
        ellipse(world, 'marks', bx, bz, 1.3, 1.3, 0, y, GOLF.path, 8);
        PL.pathSegs.push([ax, az, bx, bz]);
      }
    }
  }

  /** Trees in clumps in the rough between the holes (instanced props, solid trunks). */
  function buildCourseTrees(world) {
    const P = PL;
    const rng = new VH.RNG('pelican-trees');
    const clear = (x, z) => {
      if (z < P.range.z1 + 8) return false;
      for (const H of P.holes) {
        if (segDist(x, z, H.tx - H.ux * 12, H.tz - H.uz * 12, H.gx, H.gz) < (H.w ? H.w / 2 + 9 : 14)) return false;
        if (Math.hypot(x - H.gx, z - H.gz) < 26) return false;
      }
      for (const p of P.ponds) if (((x - p.x) / (p.rx + 6)) ** 2 + ((z - p.z) / (p.rz + 6)) ** 2 < 1) return false;
      for (const s of P.pathSegs) if (segDist(x, z, s[0], s[1], s[2], s[3]) < 4) return false;
      return true;
    };
    let n = 0;
    for (let x = P.x0 + 8; x < P.x1 - 6; x += 9) {
      for (let z = P.range.z1 + 10; z < P.z1 - 5; z += 9) {
        const jx = x + rng.range(-3.5, 3.5), jz = z + rng.range(-3.5, 3.5);
        // Clumps: a cheap two-wave noise decides where the woods are.
        const k = Math.sin(jx * 0.031 + 1.7) + Math.sin(jz * 0.027 + jx * 0.011) + rng.range(-0.5, 0.5);
        if (k < 0.55 || !clear(jx, jz)) continue;
        const t = rng.next();
        world.addProp(t < 0.45 ? 'tree' : t < 0.85 ? 'treeB' : 'palm', jx, KERB, jz, rng.range(0, 6.28), rng.range(0.85, 1.25));
        n++;
      }
    }
    // A row along the north edge of the course, behind the range's fence and the club.
    for (let x = P.x0 + 12; x < P.x1 - 8; x += 22) {
      if (x > P.club.x0 - 30 && x < P.x1) continue;
      world.addProp('treeB', x, KERB, P.range.z1 + 5, x, 1.05);
    }
    PL.trees = n;
  }

  /** The clubhouse: two storeys of white weatherboard under a green roof, a porch, the terrace over the course. */
  function buildClubhouse(world) {
    const K = C(), WN = W();
    const c = PL.club;
    const ctx = K.shed(world, c, { h: c.h, rise: 4.5, wall: 0xf2efe6, roof: 0x2a4a3a, axis: 'x', bay: 3.4, floorH: 3.5, ww: 0.5, wh: 0.55, seed: 21.3 });
    // A white band between the floors, dark green eaves boards.
    ctx.prop.box(c.x0 - 0.08, KERB + 3.4, c.z0 - 0.08, c.x1 + 0.08, KERB + 3.6, c.z1 + 0.08, VH.col(0xd8d4c8));
    // The cupola on the ridge: white louvred lantern, a green spire, a weathervane.
    {
      const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, ry = KERB + c.h + 4.5;
      ctx.prop.box(cx - 1.6, ry - 1.2, cz - 1.6, cx + 1.6, ry + 1.6, cz + 1.6, VH.col(0xf8f6f0));
      for (const s of [-1, 1]) {
        ctx.prop.box(cx - 0.9, ry + 0.2, cz + s * 1.6 - 0.02, cx + 0.9, ry + 1.3, cz + s * 1.6 + 0.02, VH.col(0x2a4a3a));
        ctx.prop.box(cx + s * 1.6 - 0.02, ry + 0.2, cz - 0.9, cx + s * 1.6 + 0.02, ry + 1.3, cz + 0.9, VH.col(0x2a4a3a));
      }
      ctx.prop.cylinder(cx, ry + 1.6, cz, 2.25, 0.05, 2.6, 8, VH.col(0x2a4a3a), false);
      ctx.prop.box(cx - 0.03, ry + 4.2, cz - 0.03, cx + 0.03, ry + 5.4, cz + 0.03, VH.col(0x3a3f45));
      ctx.prop.box(cx - 0.6, ry + 5.0, cz - 0.02, cx + 0.6, ry + 5.25, cz + 0.02, VH.col(0x3a3f45));
      world.physics.addBox(cx - 1.6, ry - 1.2, cz - 1.6, cx + 1.6, ry + 1.6, cz + 1.6, 'building', F().CAMERA | F().SHOTS);
    }
    // The porch on the north side: a pediment on four white columns, the doors, the name.
    const dx = (c.x0 + c.x1) / 2;
    WN.pave(world, dx - 12, c.z0 - 18, dx + 12, c.z0, 0xd8ccb0, 'plazaTop', KERB + 0.02, 3);
    for (const x of [dx - 4.5, dx - 1.5, dx + 1.5, dx + 4.5]) {
      ctx.prop.cylinder(x, KERB, c.z0 - 4.2, 0.28, 0.24, 4.2, 12, VH.col(0xf8f6f0), true);
      for (let k = 0; k < 4; k++) world.physics.addOrientedBox(x, c.z0 - 4.2, 0.29, 0.12, (k * Math.PI) / 4, 0, KERB + 4.2, 'pole', F().SOLID | F().SHOTS);
    }
    ctx.prop.box(dx - 5.4, KERB + 4.2, c.z0 - 5, dx + 5.4, KERB + 4.7, c.z0, VH.col(0xf8f6f0));
    WN.gable(ctx.prop, dx - 5.6, c.z0 - 5.2, dx + 5.6, c.z0 + 0.2, KERB + 4.7, 1.6, 'z', 0x2a4a3a, 0xf8f6f0);
    ctx.prop.box(dx - 1.4, KERB, c.z0 - 0.08, dx + 1.4, KERB + 2.8, c.z0 + 0.02, VH.col(0x2a3a30));
    ctx.screen.box(dx - 1.2, KERB + 0.3, c.z0 - 0.1, dx + 1.2, KERB + 2.6, c.z0 - 0.08, VH.col(0xffe2b0, 0.8));
    VH.Landmarks.sign(world, { x: dx, y: KERB + 5.35, z: c.z0 - 5.6, yaw: Math.PI, w: 4.6, h: 0.8, lines: ['PELICAN LINKS', 'Est. 1932'], style: 'plaque' });
    for (const s of [-1, 1]) {
      // Box hedges and lamps either side of the steps.
      K.hedge(world, dx + s * 6, c.z0 - 17, dx + s * 6, c.z0 - 6, [], 0.8, 0.8);
      WN.lamp(world, dx + s * 5.2, c.z0 - 5.6, 0xfff1c8, 2.4, 0.2, KERB + 2.6);
      world.addProp('planter', dx + s * 3, KERB, c.z0 - 7, 0, 1);
    }
    // Flagpoles on the lawn in front.
    for (const [x, col] of [[dx - 10, 0x2f8a4a], [dx + 10, 0xe8302c]]) {
      ctx.prop.cylinder(x, KERB, c.z0 - 15, 0.07, 0.05, 9, 8, VH.col(0xf2f2ee), true);
      ctx.prop.box(x + 0.06, KERB + 7.4, c.z0 - 15.02, x + 2.2, KERB + 8.8, c.z0 - 14.98, VH.col(col));
      world.physics.addBox(x - 0.1, 0, c.z0 - 15.1, x + 0.1, KERB + 9, c.z0 - 14.9, 'pole', F().SOLID | F().SHOTS);
    }
    // The terrace: timber decking along the south side, tables and parasols, a white rail with steps down to the course.
    const tz0 = c.z1, tz1 = PL.terrace.z1;
    ctx.wood.topRect(c.x0 - 2, tz0, c.x1 + 2, tz1, KERB + 0.03, VH.col(0xb89a72), 2);
    const rail = VH.col(0xf2f2ee);
    const gap = [c.x1 - 4.5, c.x1 + 0.5]; // the steps down to the course, by the buggy path
    for (const [a0, a1] of [[c.x0 - 2, gap[0]], [gap[1], c.x1 + 2]]) {
      ctx.prop.box(a0, KERB + 0.95, tz1 - 0.08, a1, KERB + 1.05, tz1 + 0.08, rail);
      for (let x = a0; x <= a1 + 0.01; x += 1.2) ctx.prop.box(x - 0.04, KERB, tz1 - 0.04, x + 0.04, KERB + 0.95, tz1 + 0.04, rail);
      world.physics.addBox(a0, 0, tz1 - 0.1, a1, KERB + 1.05, tz1 + 0.1, 'railing', F().SOLID | F().SHOTS);
    }
    for (const x of [c.x0 - 2, c.x1 + 2]) {
      ctx.prop.box(x - 0.08, KERB + 0.95, tz0, x + 0.08, KERB + 1.05, tz1, rail);
      world.physics.addBox(x - 0.1, 0, tz0, x + 0.1, KERB + 1.05, tz1, 'railing', F().SOLID | F().SHOTS);
    }
    let k = 0;
    for (let x = c.x0 + 3; x < c.x1 - 2; x += 7.5) {
      if (Math.abs(x - dx) < 3.5) continue;
      cafeTable(world, x, (tz0 + tz1) / 2 + 0.5, [0x1f4a36, 0xf2efe6, 0xe8302c][k++ % 3]);
    }
    // The bar's hatch on the terrace: lemonade and a sandwich.
    ctx.screen.box(dx - 2, KERB + 1.0, c.z1 + 0.02, dx + 2, KERB + 2.2, c.z1 + 0.05, VH.col(0xffe8b8, 0.85));
    WN.solid(world, ctx.wood, dx - 2.2, KERB, c.z1, dx + 2.2, KERB + 1.05, c.z1 + 0.7, 0x6b5038, null, 'crate', F().SOLID | F().SHOTS);
    world.interactables.push({ id: 'pelican_bar', kind: 'redwaterBuy', x: dx, y: KERB + 1.0, z: c.z1 + 1.8, radius: 1.8, label: 'Buy a pink lemonade', price: 3, heal: 20, what: 'lemonade' });
    VH.Landmarks.sign(world, { x: dx, y: KERB + 2.65, z: c.z1 + 0.08, yaw: 0, w: 3.6, h: 0.6, lines: ['THE NINETEENTH HOLE'], style: 'plaque' });
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: dx, z: c.z0 - 6, r: 8, y: KERB + 0.03, strength: 0.8 });
    world.floodlights.push({ x: dx - 15, z: (tz0 + tz1) / 2, r: 7, y: KERB + 0.04, strength: 0.6 });
    world.floodlights.push({ x: dx + 15, z: (tz0 + tz1) / 2, r: 7, y: KERB + 0.04, strength: 0.6 });
    WN.festoon(world, c.x0 - 1.5, KERB + 2.9, tz1 - 0.3, c.x1 + 1.5, KERB + 2.9, tz1 - 0.3, 0.4, [0xffe2a0, 0xfff1c8], 1.5);
    for (const x of [c.x0 - 1.5, c.x1 + 1.5]) {
      ctx.wood.box(x - 0.08, KERB, tz1 - 0.38, x + 0.08, KERB + 3.0, tz1 - 0.22, VH.col(0xd8d4c8));
      world.physics.addBox(x - 0.1, 0, tz1 - 0.4, x + 0.1, KERB + 3.0, tz1 - 0.2, 'pole', F().SOLID | F().SHOTS);
    }
  }

  /** A round café table with two chairs and a parasol (solid). */
  function cafeTable(world, x, z, hex) {
    const ctx = world.ctxAt(x, z);
    ctx.detail.cylinder(x, KERB + 0.72, z, 0.55, 0.55, 0.04, 12, VH.col(0xf2f2ee), true);
    ctx.detail.cylinder(x, KERB, z, 0.05, 0.05, 0.72, 6, VH.col(0x3a3f45), false);
    for (const s of [-1, 1]) {
      ctx.detail.box(x + s * 0.95 - 0.22, KERB + 0.42, z - 0.22, x + s * 0.95 + 0.22, KERB + 0.47, z + 0.22, VH.col(0x2a2d30));
      ctx.detail.box(x + s * 1.15 - 0.03, KERB + 0.47, z - 0.22, x + s * 1.15 + 0.03, KERB + 0.95, z + 0.22, VH.col(0x2a2d30));
      for (const dz of [-0.18, 0.18]) ctx.detail.box(x + s * 0.95 - 0.03, KERB, z + dz - 0.03, x + s * 0.95 + 0.03, KERB + 0.42, z + dz + 0.03, VH.col(0x2a2d30)); // solidity: passable (inside the chair's collider)
      world.physics.addBox(x + s * 0.95 - 0.24, 0, z - 0.24, x + s * 1.18, KERB + 0.95, z + 0.24, 'bench', F().SOLID | F().SHOTS);
    }
    world.physics.addBox(x - 0.56, 0, z - 0.56, x + 0.56, KERB + 0.76, z + 0.56, 'bench', F().SOLID | F().SHOTS);
    C().parasol(world, x, z, hex, 2.5);
  }

  /** The buggy shed: a lean-to roof on posts over two rows of buggies, the pro shop beside it. */
  function buildBuggyShed(world) {
    const WN = W();
    const s = PL.shed;
    const ctx = world.ctxAt((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2);
    // Back (west) wall, the roof, posts along the open east side.
    WN.solid(world, ctx.wood, s.x0, KERB, s.z0, s.x0 + 0.3, KERB + 3.4, s.z1, 0x2a4a3a, null, 'building', F().ALL);
    WN.solid(world, ctx.wood, s.x0, KERB, s.z0, s.x1, KERB + 3.2, s.z0 + 0.3, 0x2a4a3a, null, 'building', F().ALL);
    WN.solid(world, ctx.wood, s.x0, KERB, s.z1 - 0.3, s.x1, KERB + 3.2, s.z1, 0x2a4a3a, null, 'building', F().ALL);
    WN.tiltBox(ctx.prop, (s.x0 + s.x1) / 2, KERB + 3.35, (s.z0 + s.z1) / 2, s.x1 - s.x0 + 0.8, 0.18, s.z1 - s.z0 + 0.6, Math.PI / 2, -0.06, 0x5c5f63);
    for (let z = s.z0 + 6; z < s.z1 - 3; z += 6) {
      ctx.wood.box(s.x1 - 0.2, KERB, z - 0.12, s.x1, KERB + 3.0, z + 0.12, VH.col(0xd8d4c8));
      world.physics.addBox(s.x1 - 0.22, 0, z - 0.14, s.x1 + 0.02, KERB + 3.0, z + 0.14, 'pole', F().SOLID | F().SHOTS);
    }
    WN.pave(world, s.x0, s.z0, s.x1 + 10, s.z1, 0xb0aca4, 'plazaTop', KERB + 0.02, 3);
    for (let z = s.z0 + 2.2; z < s.z1 - 1.5; z += 2.4) {
      buggy(world, s.x0 + 2.6, z, Math.PI / 2);
      buggy(world, s.x0 + 6.4, z, Math.PI / 2);
    }
    // Three out on the apron, ready to go.
    for (let i = 0; i < 3; i++) buggy(world, s.x1 + 5, s.z0 + 6 + i * 3, Math.PI / 2 + 0.1, i === 1 ? 0xe8e4d4 : 0xf2efe8);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: s.x1 + 4, z: (s.z0 + s.z1) / 2, r: 8, y: KERB + 0.03, strength: 0.6 });
    VH.Landmarks.sign(world, { x: s.x1 + 0.1, y: KERB + 3.0, z: s.z0 + 2.5, yaw: Math.PI / 2, w: 3.2, h: 0.6, lines: ['BUGGIES · PRO SHOP'], style: 'plaque' });
  }

  /** The putting green behind the terrace: a long green with a few short flags. */
  function buildPuttingGreen(world) {
    const p = PL.putt;
    ellipse(world, 'grassTop', p.x, p.z, p.rx + 2, p.rz + 2, 0, KERB + 0.045, GOLF.fringe);
    ellipse(world, 'grassTop', p.x, p.z, p.rx, p.rz, 0, KERB + 0.055, GOLF.green);
    const ctx = world.ctxAt(p.x, p.z);
    [[-13, -2], [-5, 3], [4, -3], [12, 2]].forEach(([dx, dz], i) => {
      const x = p.x + dx, z = p.z + dz;
      ellipse(world, 'marks', x, z, 0.22, 0.22, 0, KERB + 0.066, GOLF.cup, 10);
      ctx.detail.cylinder(x, KERB, z, 0.015, 0.015, 0.9, 6, VH.col(0xf2f2ee), true); // solidity: passable (a putting flag on a thin cane)
      ctx.detail.box(x + 0.01, KERB + 0.72, z - 0.01, x + 0.3, KERB + 0.9, z + 0.01, VH.col(i % 2 ? 0xf2c318 : 0xe8302c)); // solidity: passable
    });
  }

  /** The driving range: covered bays at the east end, target greens and yardage boards, nets and floodlights. */
  function buildRange(world) {
    const K = C(), WN = W();
    const R = PL.range;
    const bx = R.bays;
    // The tall nets along both long sides and the far end.
    net(world, R.x0, R.z0, bx + 8, R.z0, 8);
    net(world, R.x0, R.z1, bx - 1, R.z1, 8);
    net(world, R.x0, R.z0, R.x0, R.z1, 8);
    // The bays: a long shelter facing west, mats, dividers, ball machines.
    const ctx = world.ctxAt(bx + 6, (R.z0 + R.z1) / 2);
    const z0 = R.z0 + 4, z1 = R.z1 - 4;
    WN.solid(world, ctx.wood, bx + 7.6, KERB, z0, bx + 8, KERB + 3.6, z1, 0x2a4a3a, null, 'building', F().ALL); // the back wall
    WN.tiltBox(ctx.prop, bx + 4, KERB + 3.5, (z0 + z1) / 2, 9.2, 0.2, z1 - z0 + 0.4, 0, 0, 0x5c5f63);
    // (The roof as a slab: a flat box so it can be stood on from the tower? no: it is out of reach; a collider keeps the camera out.)
    world.physics.addBox(bx - 0.6, KERB + 3.4, z0 - 0.2, bx + 8.6, KERB + 3.6, z1 + 0.2, 'building', F().CAMERA | F().SHOTS);
    ctx.plazaTop.topRect(bx, z0, bx + 7.6, z1, KERB + 0.03, VH.col(0xc8c4bc), 3);
    let bay = 0;
    for (let z = z0; z < z1 - 0.1; z += 3.2) {
      // Posts and low dividers between the bays.
      ctx.wood.box(bx - 0.12, KERB, z - 0.12, bx + 0.12, KERB + 3.4, z + 0.12, VH.col(0xd8d4c8));
      world.physics.addBox(bx - 0.14, 0, z - 0.14, bx + 0.14, KERB + 3.4, z + 0.14, 'pole', F().SOLID | F().SHOTS);
      if (z > z0) {
        ctx.wood.box(bx + 0.2, KERB, z - 0.05, bx + 4.5, KERB + 1.1, z + 0.05, VH.col(0x6b5038));
        world.physics.addBox(bx + 0.2, 0, z - 0.07, bx + 4.5, KERB + 1.1, z + 0.07, 'fence', F().SOLID | F().SHOTS);
      }
      if (z + 3.2 <= z1 + 0.1) {
        // The mat, a tee and a basket of balls.
        ctx.detail.box(bx + 0.6, KERB + 0.03, z + 0.6, bx + 2.4, KERB + 0.06, z + 2.6, VH.col(0x3f8a3a)); // solidity: passable (a mat)
        ctx.detail.box(bx + 2.8, KERB, z + 1.2, bx + 3.3, KERB + 0.28, z + 1.7, VH.col(0x2f4a8a)); // solidity: passable (a basket)
        for (let k = 0; k < 6; k++) ctx.detail.box(bx + 2.85 + (k % 3) * 0.14, KERB + 0.28, z + 1.25 + Math.floor(k / 3) * 0.2, bx + 2.95 + (k % 3) * 0.14, KERB + 0.36, z + 1.35 + Math.floor(k / 3) * 0.2, VH.col(0xf8f8f4)); // solidity: passable
        bay++;
      }
    }
    // The ball machine by the gate, where Jay buys a bucket.
    const mx = bx + 6.2, mz = R.z1 - 2;
    WN.solid(world, ctx.prop, mx - 0.6, KERB, mz - 0.5, mx + 0.6, KERB + 1.8, mz + 0.5, 0xe8302c, null, 'metal');
    ctx.screen.box(mx - 0.4, KERB + 1.1, mz - 0.52, mx + 0.4, KERB + 1.5, mz - 0.5, VH.col(0x9ad0ff, 1.2));
    world.interactables.push({ id: 'pelican_range', kind: 'redwaterRange', x: mx, y: KERB + 1.0, z: mz - 1.6, radius: 1.8, label: 'Hit a bucket of balls', price: 5 });
    VH.Landmarks.sign(world, { x: bx + 7.5, y: KERB + 2.6, z: (z0 + z1) / 2, yaw: -Math.PI / 2, w: 6, h: 1.0, lines: ['DRIVING RANGE', 'Buckets $5 at the machine'], style: 'brand', colors: { bg: ['#1f4a36', '#163828'], fg: '#f4ead2' }, frame: 0xf2efe8 });
    // Targets: rings of green with a flag, and yardage boards at 50, 100, 150, 200 m.
    [[50, 0, 0xe8302c], [100, -14, 0xf2c318], [150, 12, 0x2f6f9a], [200, -6, 0xf2f2ee]].forEach(([d, dz, col]) => {
      const tx = bx - d, tz = (R.z0 + R.z1) / 2 + dz;
      ellipse(world, 'grassTop', tx, tz, 9, 6, 0, KERB + 0.05, GOLF.green);
      const c2 = world.ctxAt(tx, tz);
      c2.prop.cylinder(tx, KERB, tz, 0.04, 0.04, 2.6, 6, VH.col(0xf2f2ee), true);
      c2.prop.box(tx + 0.04, KERB + 2.0, tz - 0.02, tx + 1.0, KERB + 2.6, tz + 0.02, VH.col(col));
      world.physics.addBox(tx - 0.07, 0, tz - 0.07, tx + 0.07, KERB + 2.6, tz + 0.07, 'pole', F().SOLID | F().SHOTS);
      // The board: a tall white panel with a coloured stripe, near the north net.
      const yx = tx, yz = R.z0 + 5;
      c2.prop.box(yx - 1.2, KERB + 0.6, yz - 0.08, yx + 1.2, KERB + 2.6, yz + 0.08, VH.col(0xf2f2ee));
      c2.prop.box(yx - 1.2, KERB + 2.2, yz + 0.08, yx + 1.2, KERB + 2.6, yz + 0.1, VH.col(col));
      for (const s of [-1, 1]) c2.prop.box(yx + s * 1.0 - 0.06, KERB, yz - 0.06, yx + s * 1.0 + 0.06, KERB + 0.6, yz + 0.06, VH.col(0x3a3f45));
      world.physics.addBox(yx - 1.25, 0, yz - 0.12, yx + 1.25, KERB + 2.6, yz + 0.12, 'sign', F().SOLID | F().SHOTS);
    });
    // Balls lying out on the range.
    const rng = new VH.RNG('pelican-range-balls');
    for (let i = 0; i < 260; i++) {
      const x = bx - rng.range(15, 230), z = rng.range(R.z0 + 6, R.z1 - 6);
      world.ctxAt(x, z).detail.box(x - 0.04, KERB + 0.02, z - 0.04, x + 0.04, KERB + 0.1, z + 0.04, VH.col(0xf8f8f4)); // solidity: passable (golf balls)
    }
    // Floodlights along both nets.
    for (let x = bx - 30; x > R.x0 + 10; x -= 55) {
      for (const z of [R.z0 + 1.5, R.z1 - 1.5]) world.addProp('streetlight', x, KERB, z, z < (R.z0 + R.z1) / 2 ? 0 : Math.PI, 1.25);
    }
    world.floodlights = world.floodlights || [];
    for (let x = bx - 20; x > R.x0 + 30; x -= 60) world.floodlights.push({ x, z: (R.z0 + R.z1) / 2, r: 26, y: KERB + 0.03, strength: 0.45 });
    PL.bays = bay;
  }

  /** The club car park: tarmac, white bays, lamps, a way in from Southbay Road and onto the club's forecourt. */
  function buildClubCarPark(world) {
    const K = C(), WN = W();
    const p = PL.park;
    tarmac(world, p.x0, p.z0, p.x1, p.z1, KERB + 0.012);
    tarmac(world, PL.gate.x0, PL.z0 + PL.edge, PL.gate.x1, p.z0, KERB + 0.012);
    // A drive from the car park to the club's forecourt.
    tarmac(world, PL.shed.x1 + 10, PL.club.z0 - 18, p.x0, PL.club.z0 - 6, KERB + 0.012);
    const white = 0xf2f2ee;
    PL.bayRows = [];
    for (const [z, dir] of [[p.z0 + 3, 1], [p.z0 + 31, -1], [p.z0 + 31, 1], [p.z1 - 3, -1]]) {
      for (let x = p.x0 + 4; x <= p.x1 - 4; x += 2.7) WN.mark(world, x - 0.06, Math.min(z, z + dir * 5), x + 0.06, Math.max(z, z + dir * 5), white, KERB + 0.02);
      PL.bayRows.push({ z: z + dir * 2.5, h: dir > 0 ? Math.PI : 0 });
    }
    // Hedges round it, open at the gate and the drive.
    K.hedge(world, p.x0 - 1, p.z0 - 0.5, p.x1 + 0.5, p.z0 - 0.5, [[PL.gate.x0, PL.gate.x1]], 1.1, 0.9);
    K.hedge(world, p.x1 + 0.5, p.z0, p.x1 + 0.5, p.z1 + 0.5, [], 1.1, 0.9);
    K.hedge(world, p.x0 - 1, p.z1 + 0.5, p.x1 + 0.5, p.z1 + 0.5, [[p.x0 + 6, p.x0 + 16]], 1.1, 0.9);
    for (const x of [p.x0 + 20, p.x0 + 54, p.x0 + 88]) {
      world.addProp('streetlight', x, KERB, p.z0 + 31, 0, 1);
      world.addProp('planter', x + 2, KERB, p.z0 + 31, 0, 1);
    }
  }

  /** A white pelican on a stone plinth at the gate, the club's emblem. */
  function pelican(world, x, z) {
    const K = C();
    const ctx = world.ctxAt(x, z);
    W().solid(world, ctx.concrete, x - 1.1, KERB, z - 1.1, x + 1.1, KERB + 1.2, z + 1.1, 0xb8b2a6, null, 'wall', F().ALL);
    const y = KERB + 1.2;
    const wh = VH.col(0xf4f2ec), bill = VH.col(0xf2b02e);
    K.blob(ctx.prop, x, y + 0.75, z, 0.55, 0.5, 0.85, wh); // body
    K.blob(ctx.prop, x, y + 0.7, z - 0.75, 0.3, 0.32, 0.4, wh); // tail
    ctx.prop.cylinder(x, y + 0.9, z + 0.55, 0.16, 0.13, 0.85, 8, wh, true); // neck
    K.blob(ctx.prop, x, y + 1.85, z + 0.62, 0.2, 0.2, 0.26, wh); // head
    W().tiltBox(ctx.prop, x, y + 1.72, z + 1.15, 0.14, 0.1, 0.9, 0, 0.18, bill); // the bill
    W().tiltBox(ctx.prop, x, y + 1.6, z + 1.05, 0.2, 0.2, 0.7, 0, 0.3, VH.col(0xe8a83a)); // the pouch
    for (const s of [-1, 1]) K.blob(ctx.prop, x + s * 0.5, y + 0.85, z - 0.05, 0.12, 0.35, 0.7, VH.col(0xd8d4cc)); // folded wings
    world.physics.addBox(x - 0.62, y, z - 1.1, x + 0.62, y + 1.3, z + 0.9, 'wall', F().SOLID | F().SHOTS); // the body
    world.physics.addBox(x - 0.25, y + 1.0, z + 0.3, x + 0.25, y + 2.1, z + 1.6, 'wall', F().SOLID | F().SHOTS); // the neck, head and bill
  }

  // ------------------------------------------------------- Redwater Ranch
  // The plot (-1043..-647, 669..913): Westgate Parkway east (the front, the
  // ranch gate), Southbay Road north, Dune Street south, Backlot Avenue
  // west. The drive runs in from the gate to the rodeo arena; the stables,
  // the round pen and the house face the yard track; paddocks in the west.
  const RR = {
    x0: -1043, x1: -647, z0: 669, z1: 913,
    edge: 1.6,
    gate: { z0: 776, z1: 790 },
    drive: { x0: -790, z0: 776, z1: 790 },
    spur: { x0: -778, x1: -768, z0: 722 },
    yard: { x0: -1000, x1: -700, z0: 722, z1: 730 },
    park: { x0: -758, x1: -662, z0: 802, z1: 904, in0: -728, in1: -712 },
    house: { x0: -748, x1: -708, z0: 688, z1: 712, h: 6 },
    stables: { x0: -1000, x1: -924, z0: 688, z1: 714, h: 4.2 },
    hay: { x0: -912, x1: -884, z0: 690, z1: 714 },
    pen: { x: -858, z: 708, r: 9.5 },
    arena: { x0: -896, x1: -782, z0: 770, z1: 848 },
    chutes: { x0: -912, x1: -898, z0: 788, z1: 830 },
    paddocks: { x0: -1034, x1: -918, z: [738, 790, 846, 905] },
  };

  /** Steel pipe rails (a rodeo fence) along an axis-aligned line: 1.8 m, too tall to vault. */
  function pipeRail(world, x0, z0, x1, z1, gaps) {
    C().postRail(world, x0, z0, x1, z1, gaps, { h: 1.8, hex: 0x8e959c, rails: [0.45, 0.95, 1.4, 1.72] });
  }

  /**
   * Bleachers along X from x0 to x1: `rows` tiers 0.42 m high and 0.85 m deep
   * (Jay steps up them), rising from zFront in direction dir (+1 south, -1
   * north), a back wall with a rail, end walls. Returns the top row's height and back edge.
   */
  function bleachers(world, x0, x1, zFront, dir, rows, seatHex) {
    const d = 0.85, rise = 0.42;
    for (let k = 0; k < rows; k++) {
      const za = zFront + dir * k * d, zb = zFront + dir * (k + 1) * d;
      const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
      const top = KERB + rise * (k + 1);
      C().pieces(x0, x1, 40, (a, b) => {
        const ctx = world.ctxAt((a + b) / 2, z0);
        ctx.concrete.box(a, 0, z0, b, top, z1, VH.col(0xc8c4bc), { bottom: false });
        // The seat plank along the tier's front edge.
        const zs = dir > 0 ? z0 : z1 - 0.3;
        ctx.prop.box(a + 0.1, top, zs, b - 0.1, top + 0.06, zs + 0.3, VH.col(k % 2 ? seatHex : 0xf2f2ee)); // solidity: passable (a seat plank on the tier)
      });
      world.physics.addBox(x0, 0, z0, x1, top, z1, 'building', F().ALL);
    }
    const back = zFront + dir * rows * d;
    const topY = KERB + rise * rows;
    const zb0 = Math.min(back, back + dir * 0.3), zb1 = Math.max(back, back + dir * 0.3);
    C().pieces(x0, x1, 40, (a, b) => world.ctxAt((a + b) / 2, zb0).concrete.box(a, 0, zb0, b, topY + 1.1, zb1, VH.col(0xb8b4ac)));
    world.physics.addBox(x0, 0, zb0, x1, topY + 1.1, zb1, 'building', F().ALL);
    for (const x of [x0, x1]) {
      const z0 = Math.min(zFront, back), z1 = Math.max(zFront, back);
      W().solid(world, world.ctxAt(x, z0).concrete, x - (x === x0 ? 0.3 : 0), 0, z0, x + (x === x1 ? 0.3 : 0), topY + 1.1, z1, 0xb8b4ac, null, 'building');
    }
    return { y: topY, back };
  }

  /** A horse's head and neck looking out over a stable half-door (facing +z). */
  function horseHead(ctx, x, z, hex) {
    const c = VH.col(hex);
    ctx.detailMatte.orientedBox(x, z + 0.15, 0.16, 0.3, 0.15, KERB + 1.45, KERB + 2.0, c); // the neck
    ctx.detailMatte.orientedBox(x, z + 0.55, 0.13, 0.32, 0.25, KERB + 1.55, KERB + 1.85, c); // the head
    ctx.detailMatte.box(x - 0.1, KERB + 1.85, z + 0.25, x + 0.1, KERB + 2.0, z + 0.32, VH.colMul(c, 0.7)); // the ears
  }

  function buildRanch(world) {
    const K = C(), WN = W();
    const P = RR, e = P.edge;
    K.ground(world, P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e, 'meadow', KERB + 0.002);
    world.addLawn(P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e);
    // The ranch fence round the plot (dark timber), open at the gate and two walkers' gaps.
    const fx0 = P.x0 + e + 0.5, fx1 = P.x1 - e - 0.5, fz0 = P.z0 + e + 0.5, fz1 = P.z1 - e - 0.5;
    const rail = { hex: 0x5a4030, h: 1.3 };
    K.postRail(world, fx0, fz0, fx1, fz0, [[-822, -818]], rail);
    K.postRail(world, fx0, fz1, fx1, fz1, [[-722, -718]], rail);
    K.postRail(world, fx0, fz0, fx0, fz1, [], rail);
    K.postRail(world, fx1, fz0, fx1, fz1, [[P.gate.z0, P.gate.z1]], rail);
    // Tracks: the drive, the spur to the yard, the yard track along the buildings.
    K.ground(world, P.drive.x0, P.gate.z0, P.x1, P.gate.z1, 'soil', KERB + 0.01);
    K.ground(world, P.spur.x0, P.spur.z0, P.spur.x1, P.gate.z0, 'soil', KERB + 0.01);
    K.ground(world, P.yard.x0, P.yard.z0, P.yard.x1, P.yard.z1, 'soil', KERB + 0.01);
    buildRanchGate(world);
    buildRanchHouse(world);
    buildStables(world);
    buildHayBarn(world);
    buildRoundPen(world);
    buildPaddocks(world);
    buildArena(world);
    buildRanchPark(world);
    // Shade trees along the north and south fences, lamps along the drive.
    for (let x = P.x0 + 20; x < P.x1 - 20; x += 26) {
      if (x > P.house.x0 - 8 && x < P.house.x1 + 8) continue;
      if (x > P.stables.x0 - 6 && x < P.hay.x1 + 4) continue;
      world.addProp(x % 3 ? 'tree' : 'treeB', x, KERB, fz0 + 4, x, 1.1);
    }
    for (let x = P.arena.x0; x < P.park.x0 - 6; x += 24) world.addProp('treeB', x, KERB, fz1 - 4, x, 1.05);
    for (let x = P.drive.x0 + 10; x < P.x1 - 8; x += 30) world.addProp('streetlight', x, KERB, P.gate.z0 - 1.5, 0, 1);
    for (let x = P.yard.x0 + 20; x < P.yard.x1 - 10; x += 40) world.addProp('streetlight', x, KERB, P.yard.z1 + 1.5, Math.PI, 1);
  }

  /** The ranch gate on Westgate Parkway: two log posts and a crossbar with the name, a cattle grid. */
  function buildRanchGate(world) {
    const P = RR;
    const x = P.x1 - P.edge - 1.5;
    const ctx = world.ctxAt(x, (P.gate.z0 + P.gate.z1) / 2);
    const log = VH.col(0x7a5434);
    for (const z of [P.gate.z0 - 0.6, P.gate.z1 + 0.6]) {
      ctx.wood.cylinder(x, KERB, z, 0.38, 0.34, 6.4, 10, log, true);
      for (let k = 0; k < 4; k++) world.physics.addOrientedBox(x, z, 0.38, 0.16, (k * Math.PI) / 4, 0, KERB + 6.4, 'pole', F().SOLID | F().SHOTS);
    }
    ctx.wood.box(x - 0.3, KERB + 5.6, P.gate.z0 - 1.6, x + 0.3, KERB + 6.2, P.gate.z1 + 1.6, log);
    VH.Landmarks.sign(world, { x: x + 0.35, y: KERB + 4.75, z: (P.gate.z0 + P.gate.z1) / 2, yaw: Math.PI / 2, w: 9, h: 1.4, lines: ['REDWATER RANCH', 'Rodeo · Pony rides · Livery'], style: 'brand', colors: { bg: ['#6b3a22', '#4e2a18'], fg: '#f4e2b8' }, frame: 0x3a2a1c, twoSided: true });
    // Horseshoes nailed to the crossbar ends.
    for (const z of [P.gate.z0 - 1.2, P.gate.z1 + 1.2]) ctx.prop.cylinder(x + 0.32, KERB + 5.2, z, 0.25, 0.25, 0.05, 10, VH.col(0xa8a8a0), true);
    for (let k = 0; k < 12; k++) ctx.detail.box(x - 6 + k * 0.4 - 0.05, KERB + 0.015, P.gate.z0 + 0.5, x - 6 + k * 0.4 + 0.05, KERB + 0.05, P.gate.z1 - 0.5, VH.col(0x6a6e72)); // the cattle grid
  }

  /** The ranch house: a two-storey timber house with a deep porch facing the yard. */
  function buildRanchHouse(world) {
    const K = C(), WN = W();
    const h = RR.house;
    const ctx = K.shed(world, h, { h: h.h, rise: 3.2, wall: 0xe8dcc0, roof: 0x6b3a22, axis: 'x', bay: 3.2, floorH: 3, ww: 0.45, wh: 0.55, seed: 7.7 });
    // The porch: a deck along the south side under a lean-to on posts, the front door, rocking chairs, a lamp.
    const pz0 = h.z1, pz1 = h.z1 + 3.2;
    ctx.wood.topRect(h.x0 + 2, pz0, h.x1 - 2, pz1, KERB + 0.04, VH.col(0xa8885c), 2);
    WN.tiltBox(ctx.prop, (h.x0 + h.x1) / 2, KERB + 3.25, (pz0 + pz1) / 2, h.x1 - h.x0 - 3.4, 0.16, pz1 - pz0 + 0.4, 0, 0.18, 0x6b3a22);
    for (let x = h.x0 + 2.2; x <= h.x1 - 2.1; x += (h.x1 - h.x0 - 4.4) / 5) {
      ctx.wood.box(x - 0.1, KERB, pz1 - 0.3, x + 0.1, KERB + 2.95, pz1 - 0.1, VH.col(0xf2efe6));
      world.physics.addBox(x - 0.12, 0, pz1 - 0.32, x + 0.12, KERB + 2.95, pz1 - 0.08, 'pole', F().SOLID | F().SHOTS);
    }
    const dx = (h.x0 + h.x1) / 2;
    ctx.prop.box(dx - 0.8, KERB, h.z1 - 0.02, dx + 0.8, KERB + 2.3, h.z1 + 0.06, VH.col(0x5a3a22));
    ctx.screen.box(dx - 0.5, KERB + 1.4, h.z1 + 0.06, dx + 0.5, KERB + 2.1, h.z1 + 0.08, VH.col(0xffe0a8, 0.85));
    for (const x of [dx - 4, dx + 4]) {
      WN.solid(world, ctx.wood, x - 0.35, KERB, pz0 + 0.6, x + 0.35, KERB + 1.1, pz0 + 1.3, 0x6b4a30, null, 'bench', F().SOLID | F().SHOTS);
    }
    WN.lamp(world, dx + 1.4, h.z1 + 0.3, 0xffe2a0, 2.4, 0.2, KERB + 2.3);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: dx, z: pz1 + 2, r: 7, y: KERB + 0.03, strength: 0.6 });
    // A mailbox on a post by the yard track and a wagon wheel against the porch.
    WN.solid(world, ctx.detail, h.x1 + 3, KERB, pz1 + 1, h.x1 + 3.6, KERB + 1.25, pz1 + 1.4, 0x2a2d30, null, 'pole', F().SOLID | F().SHOTS);
    K.wheel(ctx.detail, h.x0 + 1.2, KERB + 0.7, pz0 + 0.5, 0.7, 0.08, 0, VH.col(0x6b4a30));
    world.physics.addBox(h.x0 + 1.1, 0, pz0 - 0.2, h.x0 + 1.3, KERB + 1.4, pz0 + 1.2, 'crate', F().SOLID | F().SHOTS);
  }

  /** The stables: a long red barn, a dozen stalls with half-doors along the yard, horses looking out. */
  function buildStables(world) {
    const K = C(), WN = W();
    const s = RR.stables;
    const ctx = K.shed(world, s, { h: s.h, rise: 3.4, wall: 0x8a3a2a, roof: 0x4a4c50, axis: 'x', style: 0, sides: { s: 'blank', n: 'blank' }, seed: 4.1 });
    const white = VH.col(0xf2efe6);
    ctx.prop.box(s.x0 - 0.05, KERB + s.h - 0.25, s.z1 - 0.02, s.x1 + 0.05, KERB + s.h, s.z1 + 0.08, white);
    const cols = [0x6b4228, 0x3a2a20, 0x9a6a42, 0xd8cdb8, 0x2a2420, 0x8a5a3a];
    let k = 0;
    for (let x = s.x0 + 3.2; x < s.x1 - 2; x += 5.6, k++) {
      // The stall: a dark doorway, a split door (the top half open), white cross-bracing on the lower half.
      ctx.prop.box(x - 1.1, KERB, s.z1 - 0.02, x + 1.1, KERB + 2.6, s.z1 + 0.04, VH.col(0x1e1a16));
      ctx.wood.box(x - 1.1, KERB, s.z1 + 0.04, x + 1.1, KERB + 1.3, s.z1 + 0.12, VH.col(0x8a3a2a));
      WN.beam(ctx.prop, x - 1.0, KERB + 0.1, s.z1 + 0.14, x + 1.0, KERB + 1.2, s.z1 + 0.14, 0.08, white);
      WN.beam(ctx.prop, x - 1.0, KERB + 1.2, s.z1 + 0.14, x + 1.0, KERB + 0.1, s.z1 + 0.14, 0.08, white);
      ctx.prop.box(x - 1.2, KERB + 2.6, s.z1 - 0.02, x + 1.2, KERB + 2.75, s.z1 + 0.1, white);
      if (k % 4 !== 3) {
        horseHead(ctx, x, s.z1, cols[k % cols.length]);
        world.physics.addBox(x - 0.22, KERB + 1.3, s.z1, x + 0.22, KERB + 2.05, s.z1 + 0.9, 'animal', F().SOLID | F().SHOTS); // the head over the door
      }
      // A name board over each stall.
      ctx.detail.box(x - 0.45, KERB + 2.8, s.z1 + 0.04, x + 0.45, KERB + 3.05, s.z1 + 0.07, VH.col(0xf4e2b8));
    }
    world.physics.addBox(s.x0, 0, s.z1, s.x1, KERB + 1.3, s.z1 + 0.15, 'building', F().ALL); // the half-doors
    // A cupola with a horse weathervane on the ridge.
    const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2, ry = KERB + s.h + 3.4;
    ctx.prop.box(cx - 1.2, ry - 0.8, cz - 1.2, cx + 1.2, ry + 1.2, cz + 1.2, white);
    ctx.prop.box(cx - 1.21, ry, cz - 0.7, cx + 1.21, ry + 0.9, cz + 0.7, VH.col(0x3a3f45));
    ctx.prop.cylinder(cx, ry + 1.2, cz, 1.75, 0.05, 1.6, 8, VH.col(0x4a4c50), false);
    ctx.prop.box(cx - 0.02, ry + 2.7, cz - 0.02, cx + 0.02, ry + 3.6, cz + 0.02, VH.col(0x2a2d30));
    ctx.prop.box(cx - 0.45, ry + 3.3, cz - 0.02, cx + 0.45, ry + 3.55, cz + 0.02, VH.col(0x2a2d30));
    VH.Landmarks.sign(world, { x: s.x0 + 8, y: KERB + 3.6, z: s.z1 + 0.12, yaw: 0, w: 4.4, h: 0.7, lines: ['REDWATER STABLES'], style: 'plaque' });
    // Tack and muck: a saddle rack, a wheelbarrow, buckets, a water trough in the yard.
    WN.solid(world, ctx.wood, s.x1 + 1, KERB, s.z1 - 3, s.x1 + 1.6, KERB + 1.1, s.z1 - 0.5, 0x6b4a30, null, 'crate', F().SOLID | F().SHOTS);
    ctx.detailMatte.box(s.x1 + 0.95, KERB + 1.1, s.z1 - 2.8, s.x1 + 1.65, KERB + 1.35, s.z1 - 0.7, VH.col(0x5a3418)); // saddles on the rack
    world.physics.addBox(s.x1 + 0.95, KERB + 1.1, s.z1 - 2.8, s.x1 + 1.65, KERB + 1.35, s.z1 - 0.7, 'crate', F().SOLID | F().SHOTS);
    trough(world, s.x0 + 30, s.z1 + 2.2, 0);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: cx - 15, z: s.z1 + 3, r: 8, y: KERB + 0.03, strength: 0.5 });
    world.floodlights.push({ x: cx + 15, z: s.z1 + 3, r: 8, y: KERB + 0.03, strength: 0.5 });
    for (let x = s.x0 + 6; x < s.x1; x += 16) WN.lamp(world, x, s.z1 + 0.3, 0xffe2a0, 2.2, 0.2, KERB + 3.1);
  }

  /** A galvanised water trough (solid, knee-high), along X (yaw 0) or Z. */
  function trough(world, x, z, yaw) {
    const ctx = world.ctxAt(x, z);
    ctx.detail.orientedBox(x, z, 1.2, 0.4, yaw, KERB, KERB + 0.65, VH.col(0x9aa0a6));
    ctx.detail.orientedBox(x, z, 1.1, 0.3, yaw, KERB + 0.66, KERB + 0.67, VH.col(0x4a7a9a));
    world.physics.addOrientedBox(x, z, 1.2, 0.4, yaw, 0, KERB + 0.65, 'metal', F().SOLID | F().SHOTS);
  }

  /** The hay barn: a tall roof on posts over stacks of bales (climbable). */
  function buildHayBarn(world) {
    const K = C(), WN = W();
    const b = RR.hay;
    const ctx = world.ctxAt((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
    for (const x of [b.x0, (b.x0 + b.x1) / 2, b.x1]) {
      for (const z of [b.z0, b.z1]) {
        ctx.prop.box(x - 0.15, KERB, z - 0.15, x + 0.15, KERB + 6, z + 0.15, VH.col(0x5a5f66));
        world.physics.addBox(x - 0.17, 0, z - 0.17, x + 0.17, KERB + 6, z + 0.17, 'pole', F().SOLID | F().SHOTS);
      }
    }
    WN.gable(ctx.prop, b.x0 - 0.4, b.z0 - 0.4, b.x1 + 0.4, b.z1 + 0.4, KERB + 6, 2.6, 'x', 0x7a3a2a);
    world.physics.addBox(b.x0 - 0.5, KERB + 6, b.z0 - 0.5, b.x1 + 0.5, KERB + 7.6, b.z1 + 0.5, 'building', F().CAMERA | F().SHOTS);
    // Stacks: a stepped heap so Jay can climb to the top.
    for (let t = 0; t < 4; t++) {
      const x0 = b.x0 + 1 + t * 1.2, x1 = b.x1 - 1 - t * 0.4, z0 = b.z0 + 1, z1 = b.z1 - 1 - t * 1.6;
      K.bale(world, x0, KERB + t * 0.45, z0, x1, KERB + (t + 1) * 0.45, z1);
    }
    K.ground(world, b.x0 - 1, b.z0 - 1, b.x1 + 1, b.z1 + 1, 'straw', KERB + 0.012);
  }

  /** The round pen: a ring of pipe rails, sand inside, a pony and the pony-ride hut by its gate. */
  function buildRoundPen(world) {
    const K = C(), WN = W();
    const p = RR.pen;
    const N = 16;
    const sandCol = VH.col(0xd8c08a);
    ellipse(world, 'marks', p.x, p.z, p.r - 0.2, p.r - 0.2, 0, KERB + 0.03, sandCol);
    const ctx = world.ctxAt(p.x, p.z);
    const rail = VH.col(0x8e959c);
    for (let i = 0; i < N; i++) {
      if (i === 4) continue; // the gate (south)
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      const ax = p.x + Math.sin(a0) * p.r, az = p.z + Math.cos(a0) * p.r, bx = p.x + Math.sin(a1) * p.r, bz = p.z + Math.cos(a1) * p.r;
      for (const y of [0.45, 0.95, 1.45, 1.75]) WN.beam(ctx.detail, ax, KERB + y, az, bx, KERB + y, bz, 0.07, rail);
      ctx.detail.box(ax - 0.06, KERB, az - 0.06, ax + 0.06, KERB + 1.85, az + 0.06, rail);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, len = Math.hypot(bx - ax, bz - az) / 2 + 0.06;
      world.physics.addOrientedBox(mx, mz, 0.1, len, Math.atan2(bx - ax, bz - az), 0, KERB + 1.85, 'fence', F().SOLID | F().CAMERA);
    }
    // The last post by the gate.
    const g1 = (5 / N) * Math.PI * 2, gx = p.x + Math.sin(g1) * p.r, gz = p.z + Math.cos(g1) * p.r;
    ctx.detail.box(gx - 0.06, KERB, gz - 0.06, gx + 0.06, KERB + 1.85, gz + 0.06, rail);
    K.animal(world, 'pony', p.x - 2, p.z - 1, 1.2, { color: 0xd8cdb8 });
    // The pony-ride hut by the gate.
    const hx = p.x + p.r + 4, hz = p.z + 4;
    const hut = { x0: hx - 1.5, x1: hx + 1.5, z0: hz - 1.2, z1: hz + 1.2 };
    K.shed(world, hut, { h: 2.4, rise: 0.9, wall: 0xe8dcc0, roof: 0x6b3a22, axis: 'x', style: 0 });
    world.ctxAt(hx, hz).screen.box(hut.x0 + 0.5, KERB + 1.0, hut.z1 + 0.01, hut.x1 - 0.5, KERB + 1.8, hut.z1 + 0.04, VH.col(0xffe0a8, 0.85));
    world.interactables.push({ id: 'ranch_pony', kind: 'redwaterPony', x: hx, y: KERB + 1.0, z: hut.z1 + 1.3, radius: 1.8, label: 'Pony ride round the pen', price: 5 });
    VH.Landmarks.sign(world, { x: hx, y: KERB + 2.05, z: hut.z1 + 0.06, yaw: 0, w: 2.6, h: 0.5, lines: ['PONY RIDES $5'], style: 'plaque' });
  }

  /** Three paddocks in the west: rail fences with gates off the yard track, horses, a field shelter and a trough in each. */
  function buildPaddocks(world) {
    const K = C(), WN = W();
    const P = RR.paddocks;
    const rng = new VH.RNG('redwater-ranch-horses');
    const rail = { hex: 0xf2efe6, h: 1.3 };
    const zs = P.z;
    // The outer line along the yard track side (east) with a gate into each paddock; the rails between them.
    for (let i = 0; i < zs.length - 1; i++) {
      const z0 = zs[i], z1 = zs[i + 1] - (i < zs.length - 2 ? 4 : 0);
      K.postRail(world, P.x1, z0, P.x1, z1, [[z0 + 6, z0 + 10]], rail);
      K.postRail(world, P.x0, z0, P.x1, z0, i === 0 ? [[P.x1 - 12, P.x1 - 8]] : [], rail);
      if (i < zs.length - 2) K.postRail(world, P.x0, z1, P.x1, z1, [], rail);
      K.postRail(world, P.x0, z0, P.x0, z1, [], rail);
      // A field shelter against the west rail: an open-fronted timber box under a lean-to.
      const sx0 = P.x0 + 1, sx1 = P.x0 + 6, sz0 = z0 + 8, sz1 = z0 + 20;
      const ctx = world.ctxAt((sx0 + sx1) / 2, (sz0 + sz1) / 2);
      WN.solid(world, ctx.wood, sx0, KERB, sz0, sx0 + 0.25, KERB + 2.8, sz1, 0x6b4a30, null, 'building', F().ALL);
      WN.solid(world, ctx.wood, sx0, KERB, sz0, sx1, KERB + 2.6, sz0 + 0.25, 0x6b4a30, null, 'building', F().ALL);
      WN.solid(world, ctx.wood, sx0, KERB, sz1 - 0.25, sx1, KERB + 2.6, sz1, 0x6b4a30, null, 'building', F().ALL);
      WN.tiltBox(ctx.prop, (sx0 + sx1) / 2 + 0.1, KERB + 2.85, (sz0 + sz1) / 2, sx1 - sx0 + 0.8, 0.14, sz1 - sz0 + 0.6, Math.PI / 2, 0.08, 0x4a4c50);
      world.physics.addBox(sx0 - 0.4, KERB + 2.55, sz0 - 0.3, sx1 + 0.5, KERB + 3.15, sz1 + 0.3, 'building', F().ALL);
      trough(world, P.x1 - 8, z0 + 14, Math.PI / 2);
      // Horses grazing.
      const n = rng.int(3, 5);
      for (let k = 0; k < n; k++) {
        const x = rng.range(P.x0 + 14, P.x1 - 14), z = rng.range(z0 + 6, z1 - 6);
        K.animal(world, rng.chance(0.25) ? 'pony' : 'horse', x, z, rng.range(0, Math.PI * 2), { color: rng.pick(K.ANIMALS.horse.colors), grazing: rng.chance(0.6) });
      }
    }
  }

  /** The rodeo arena: a dirt ring inside pipe rails, chutes at the west end, stands both sides, floodlights, barrels. */
  function buildArena(world) {
    const K = C(), WN = W();
    const A = RR.arena;
    K.ground(world, A.x0, A.z0, A.x1, A.z1, 'arena', KERB + 0.012);
    const midZ = (A.z0 + A.z1) / 2;
    // The rails: a gate at the east end (on the drive) and the chutes' gates at the west end.
    pipeRail(world, A.x0, A.z0, A.x1, A.z0, [[A.x1 - 26, A.x1 - 22]]);
    pipeRail(world, A.x0, A.z1, A.x1, A.z1, [[A.x1 - 26, A.x1 - 22]]);
    pipeRail(world, A.x1, A.z0, A.x1, A.z1, [[RR.gate.z0, RR.gate.z1]]);
    pipeRail(world, A.x0, A.z0, A.x0, RR.chutes.z0, []);
    pipeRail(world, A.x0, RR.chutes.z1, A.x0, A.z1, []);
    // The chutes: five narrow pens behind the west rail, their gates facing the ring.
    const C2 = RR.chutes;
    const w = (C2.z1 - C2.z0) / 5;
    for (let i = 0; i <= 5; i++) pipeRail(world, C2.x0, C2.z0 + i * w, A.x0, C2.z0 + i * w, []);
    pipeRail(world, C2.x0, C2.z0, C2.x0, C2.z1, []);
    const gc = world.ctxAt(A.x0, (C2.z0 + C2.z1) / 2);
    for (let i = 0; i < 5; i++) {
      const z0 = C2.z0 + i * w + 0.3, z1 = C2.z0 + (i + 1) * w - 0.3;
      for (const y of [0.5, 1.0, 1.5]) gc.detail.box(A.x0 - 0.05, KERB + y, z0, A.x0 + 0.05, KERB + y + 0.12, z1, VH.col(0xc8402c));
      gc.detail.box(A.x0 - 0.12, KERB + 1.9, z0 + 0.2, A.x0 + 0.12, KERB + 2.2, z1 - 0.2, VH.col(0xf2efe6)); // the chute number board
    }
    world.physics.addBox(A.x0 - 0.12, 0, C2.z0, A.x0 + 0.12, KERB + 1.8, C2.z1, 'fence', F().SOLID | F().CAMERA);
    K.ground(world, C2.x0, C2.z0, A.x0, C2.z1, 'arena', KERB + 0.012);
    // A catwalk along the back of the chutes (stairs up at the north end).
    WN.deck(world, gc.wood, C2.x0 - 1.6, C2.z0, C2.x0 - 0.2, C2.z1, KERB + 1.4, 0x8a6a48, 'plank', 0.15);
    WN.stairs(world, gc.wood, C2.x0 - 0.9, C2.z0 - 3.5, 's', 3.5, 1.2, KERB, KERB + 1.4, 0x8a6a48, { railHex: 0x6b4a30 });
    // Barrels for barrel racing (round, solid).
    [[A.x0 + 40, midZ - 20, 0x2f6f9a], [A.x0 + 40, midZ + 20, 0x2f6f9a], [A.x0 + 75, midZ, 0xc8402c]].forEach(([x, z, col]) => {
      const c = world.ctxAt(x, z);
      c.detail.cylinder(x, KERB, z, 0.32, 0.32, 0.9, 12, VH.col(col), true);
      for (const y of [0.3, 0.6]) c.detail.cylinder(x, KERB + y, z, 0.335, 0.335, 0.05, 12, VH.col(0x3a3f45), false);
      for (let k = 0; k < 4; k++) world.physics.addOrientedBox(x, z, 0.33, 0.14, (k * Math.PI) / 4, 0, KERB + 0.9, 'metal', F().SOLID | F().SHOTS);
    });
    // The stands: the big one along the south side, a smaller one on the north with the announcer's box on top.
    const sx0 = A.x0 + 14, sx1 = A.x1 - 30;
    const south = bleachers(world, sx0, sx1, A.z1 + 1.2, 1, 8, 0xc8402c);
    const north = bleachers(world, sx0 + 16, sx1 - 16, A.z0 - 1.2, -1, 5, 0x2f6f9a);
    // Steps up the stands' ends are the tiers themselves (0.42 m each); a rail along the front of the south stand's first tier.
    const bx = (sx0 + sx1) / 2;
    const box = { x0: bx - 4, x1: bx + 4, z0: north.back - 3.4, z1: north.back - 0.3 };
    const bc = world.ctxAt(bx, box.z0);
    // The announcer's box: a little tower behind the north stand, its glass looking over the ring.
    WN.building(world, box.x0, box.z0, box.x1, box.z1, north.y - KERB + 2.6, { wall: 0xf2efe6, roof: 0x6b3a22, style: 4, bay: 2, floorH: north.y - KERB + 2.6, ww: 0.8, wh: 0.3, parapet: 0.3, sides: { n: 'blank', e: 'blank', w: 'blank' } });
    VH.Landmarks.sign(world, { x: bx, y: north.y + 3.4, z: box.z1 + 0.1, yaw: 0, w: 9, h: 1.2, lines: ['REDWATER RODEO', 'Saturdays · Barrels · Roping · Bronc riding'], style: 'brand', colors: { bg: ['#6b3a22', '#4e2a18'], fg: '#f4e2b8' }, frame: 0x3a2a1c });
    VH.Landmarks.sign(world, { x: bx, y: south.y + 2.2, z: south.back - 0.05, yaw: Math.PI, w: 12, h: 1.6, lines: ['REDWATER RODEO'], style: 'brand', colors: { bg: ['#6b3a22', '#4e2a18'], fg: '#f4e2b8' }, frame: 0x3a2a1c });
    bc.prop.box(bx - 0.1, south.y + 1.1, south.back, bx + 0.1, south.y + 1.5, south.back + 0.3, VH.col(0x3a3f45));
    // The floodlights: four masts at the corners.
    world.floodlights = world.floodlights || [];
    for (const [x, z] of [[A.x0 + 4, A.z0 - 4], [A.x1 - 4, A.z0 - 4], [A.x0 + 4, A.z1 + 12], [A.x1 - 4, A.z1 + 12]]) {
      const c = world.ctxAt(x, z);
      c.prop.cylinder(x, KERB, z, 0.25, 0.18, 16, 8, VH.col(0x8e959c), true);
      for (let k = 0; k < 4; k++) world.physics.addOrientedBox(x, z, 0.26, 0.11, (k * Math.PI) / 4, 0, KERB + 16, 'pole', F().SOLID | F().SHOTS);
      c.prop.box(x - 1.6, KERB + 15.6, z - 0.4, x + 1.6, KERB + 17.2, z + 0.4, VH.col(0x3a3f45));
      const fz = z < midZ ? 0.42 : -0.42;
      c.screen.box(x - 1.4, KERB + 15.8, z + fz - 0.02, x + 1.4, KERB + 17.0, z + fz + 0.02, VH.col(0xfff4d8, 2.2));
    }
    world.floodlights.push({ x: A.x0 + 30, z: midZ, r: 30, y: KERB + 0.03, strength: 0.6 });
    world.floodlights.push({ x: A.x1 - 30, z: midZ, r: 30, y: KERB + 0.03, strength: 0.6 });
    // A snack hatch at the east end of the south stand.
    const kx = sx1 + 6, kz = A.z1 + 6;
    const kiosk = { x0: kx - 3, x1: kx + 3, z0: kz - 2.5, z1: kz + 2.5 };
    const kc = K.shed(world, kiosk, { h: 2.8, rise: 1.0, wall: 0x8a3a2a, roof: 0x4a4c50, axis: 'x', style: 0 });
    kc.screen.box(kiosk.x1 - 0.01, KERB + 1.0, kz - 1.6, kiosk.x1 + 0.02, KERB + 2.0, kz + 1.6, VH.col(0xffe8b8, 0.85));
    world.interactables.push({ id: 'ranch_snacks', kind: 'redwaterBuy', x: kiosk.x1 + 1.4, y: KERB + 1.0, z: kz, radius: 1.8, label: 'Buy a corn dog', price: 4, heal: 30, what: 'corndog' });
    VH.Landmarks.sign(world, { x: kiosk.x1 + 0.05, y: KERB + 2.35, z: kz, yaw: Math.PI / 2, w: 3.4, h: 0.5, lines: ['CORN DOGS · LEMONADE'], style: 'plaque' });
    world.floodlights.push({ x: kiosk.x1 + 2, z: kz, r: 6, y: KERB + 0.03, strength: 0.6 });
    RR.stands = { south, north };
  }

  /** The visitors' car park off the drive: gravel, timber sleepers at the bay heads, lamps; horse trailers parked. */
  function buildRanchPark(world) {
    const K = C(), WN = W();
    const p = RR.park;
    K.ground(world, p.x0, p.z0, p.x1, p.z1, 'gravel', KERB + 0.01);
    K.ground(world, p.in0, RR.gate.z1, p.in1, p.z0, 'gravel', KERB + 0.01);
    RR.bayRows = [];
    for (const [z, dir] of [[p.z0 + 3, 1], [p.z0 + 33, -1], [p.z0 + 33, 1], [p.z0 + 63, -1], [p.z0 + 63, 1], [p.z1 - 3, -1]]) {
      const zh = z + dir * 0.25;
      for (let x = p.x0 + 3; x < p.x1 - 3; x += 2.7) world.ctxAt(x, zh).detailWood.box(x - 0.9, KERB, zh - 0.12, x + 0.9, KERB + 0.12, zh + 0.12, VH.col(0x6b5038));
      RR.bayRows.push({ z: z + dir * 2.6, h: dir > 0 ? Math.PI : 0 });
    }
    for (const z of [p.z0 + 33, p.z0 + 63]) for (const x of [p.x0 + 20, p.x0 + 60]) world.addProp('streetlight', x, KERB, z, 0, 1);
    // Horse trailers along the north edge of the drive by the stables track.
    for (let i = 0; i < 3; i++) horseTrailer(world, -830 + i * 9, 748, Math.PI / 2, [0xf2efe6, 0x8a3a2a, 0x2f4a6a][i]);
  }

  /** A two-horse trailer (solid box on two axles, ramp at the back), facing yaw. */
  function horseTrailer(world, x, z, yaw, hex) {
    const ctx = world.ctxAt(x, z);
    const s = ctx.detail;
    const P = C().frame(x, z, yaw);
    const body = VH.col(hex);
    s.orientedBox(x, z, 1.05, 2.4, yaw, KERB + 0.45, KERB + 2.5, body);
    const [sx, sz] = P(0, 1.06);
    s.orientedBox(sx, sz, 0.02, 2.2, yaw, KERB + 1.5, KERB + 1.8, VH.col(0x2a2d30)); // the window band
    const [tx, tz] = P(2.4 + 0.6, 0);
    s.orientedBox(tx, tz, 0.08, 0.6, yaw, KERB + 0.45, KERB + 0.6, VH.col(0x2a2d30)); // the hitch
    for (const f of [-0.4, 0.4]) {
      for (const r of [-1.1, 1.1]) {
        const [wx, wz] = P(f, r);
        C().wheel(s, wx, KERB + 0.35, wz, 0.35, 0.2, yaw, VH.col(0x1b1d20));
      }
    }
    world.physics.addOrientedBox(x, z, 1.1, 2.45, yaw, 0, KERB + 2.5, 'metal', F().ALL);
  }

  // ---------------------------------------------------------- Willow Lake
  // The plot (-1582..-1305, 1199..1463): Mariner Way north (the front, the
  // way into the car park), Willow Lane east, Foundry Road south, Westfield
  // Road west. The lake fills the west two-thirds, a gravel path round it,
  // an island with a willow, the jetty and the boathouse on the north shore
  // and fishing platforms on the south; log cabins along the lane behind
  // the north shore; the campsite in the east behind the reception.
  const WL = {
    x0: -1582, x1: -1305, z0: 1199, z1: 1463,
    edge: 1.6,
    // The lake: an ellipse whose radius wobbles with the angle, a bay in the south-west, flatter in the east.
    lake: { x: -1478, z: 1352, rx: 72, rz: 56, n: 96, bays: [[2.6, 0.22, 0.32], [0.05, -0.08, 0.5]], wy: KERB + 0.2 },
    ring: 5, // the path round the lake: this far outside the shore
    island: { x: -1502, z: 1364, rx: 11, rz: 7 },
    gate: { x0: -1362, x1: -1348 }, // the car park's way in from Mariner Way
    walk: 0, // the footpath from Mariner Way to the jetty and on to Foundry Road: on the jetty's line (set in build)
    park: { x0: -1394, x1: -1310, z0: 1206, z1: 1250 },
    office: { x0: -1394, x1: -1374, z0: 1258, z1: 1268 },
    lane: { x0: -1562, z0: 1244, z1: 1250 },
    cabins: { xs: [-1554, -1534, -1514, -1446, -1426], z0: 1260, z1: 1267, w: 10, deck: 3.5 },
    cabinPath: 1274, // the footpath along the cabins' decks
    boathouse: { x0: -1506, x1: -1494, z0: 1278, z1: 1288 },
    camp: { x0: -1396, x1: -1308, z0: 1274, z1: 1458, track: -1350 },
    toilets: { x0: -1331, x1: -1311, z0: 1294, z1: 1306 },
    fire: { x: -1374, z: 1444 },
    pitchZ: [1286, 1302, 1318, 1334, 1350, 1366, 1382, 1398, 1414, 1430, 1446],
    pitchX: [-1374, -1326],
    campWay: 1350, // the path from the track to the lake, where the west row has no pitch
  };

  /** The lake's radius factor at the parametric angle a (x = cos a, z = sin a): gentle wobbles and the bays. */
  function lakeK(L, a) {
    let k = 1 + 0.06 * Math.sin(2 * a + 0.8) + 0.05 * Math.sin(3 * a + 2.1) + 0.025 * Math.sin(5 * a + 0.3);
    for (const [a0, h, wd] of L.bays || []) {
      let d = Math.abs(a - a0) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      k += h * Math.exp(-((d / wd) ** 2));
    }
    return k;
  }
  /** The shore: L.n points round the lake, each with its outward normal (the average of its two edges'). */
  function lakeShore(L) {
    if (L.pts) return L.pts;
    const N = L.n;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, k = lakeK(L, a);
      pts.push({ x: L.x + Math.cos(a) * L.rx * k, z: L.z + Math.sin(a) * L.rz * k });
    }
    for (let i = 0; i < N; i++) {
      const p = pts[(i + N - 1) % N], q = pts[(i + 1) % N];
      // Edge direction p -> q; outward is to its left in this winding (x right, z down the map).
      let nx = q.z - p.z, nz = -(q.x - p.x);
      if (nx * (pts[i].x - L.x) + nz * (pts[i].z - L.z) < 0) {
        nx = -nx;
        nz = -nz;
      }
      const n = Math.hypot(nx, nz);
      pts[i].nx = nx / n;
      pts[i].nz = nz / n;
    }
    L.pts = pts;
    return pts;
  }
  /** Shore edge i (from point i to i + 1): its middle, the yaw pointing into the water, its length. */
  function shoreSlice(L, i) {
    const pts = lakeShore(L), N = pts.length;
    i = ((i % N) + N) % N;
    const a = pts[i], b = pts[(i + 1) % N];
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    let nx = -(b.z - a.z), nz = b.x - a.x;
    if (nx * (L.x - mx) + nz * (L.z - mz) < 0) {
      nx = -nx;
      nz = -nz;
    }
    const n = Math.hypot(nx, nz);
    return { i, x: mx, z: mz, yaw: Math.atan2(nx / n, nz / n), len: Math.hypot(b.x - a.x, b.z - a.z), ax: a.x, az: a.z, bx: b.x, bz: b.z };
  }
  /** The shore edge nearest the parametric angle a. */
  function sliceAt(L, a) {
    const N = L.n;
    return shoreSlice(L, Math.round((((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * N - 0.5));
  }
  /** A point on the path round the lake (WL.ring outside the shore) at the parametric angle a, and the outward normal there. */
  function ringPt(a) {
    const L = WL.lake, pts = lakeShore(L), N = pts.length;
    const t = ((((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * N;
    const i = Math.floor(t) % N, f = t - Math.floor(t);
    const p = pts[i], q = pts[(i + 1) % N];
    let nx = p.nx + (q.nx - p.nx) * f, nz = p.nz + (q.nz - p.nz) * f;
    const n = Math.hypot(nx, nz);
    nx /= n;
    nz /= n;
    const r = WL.ring;
    return [p.x + (q.x - p.x) * f + nx * r, p.z + (q.z - p.z) * f + nz * r, nx, nz];
  }
  /** Is (x, z) within `margin` metres of the water (or in it)? */
  function nearLake(L, x, z, margin) {
    const u = (x - L.x) / L.rx, v = (z - L.z) / L.rz;
    const a = Math.atan2(v, u), k = lakeK(L, a);
    return Math.hypot(u, v) < k + margin / Math.min(L.rx, L.rz);
  }

  /**
   * The lake: a dark bed, the water (its own mesh, like the ponds), stones
   * along the shore, a timber rail just outside them (solid: the water is
   * for looking at) that closes onto the jetty's and platforms' rails, reed
   * clumps in the shallows and lily pads. gaps: [{ s: shore slice, w: width }].
   */
  function buildLake(world, L, gaps) {
    const pts = lakeShore(L), N = pts.length;
    // The bed and the water stand a hand's breadth over the meadow (the stones hide the step): the long
    // slices from the middle flickered in stripes against the grass from high up when they were closer.
    const bed = VH.col(0x2f4a3e), yb = L.wy - 0.06;
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[(i + 1) % N];
      world.ctxAt((L.x + a.x + b.x) / 3, (L.z + a.z + b.z) / 3).asphaltTop.polygon([[L.x, yb, L.z], [b.x, yb, b.z], [a.x, yb, a.z]], bed);
    }
    const shape = new THREE.Shape();
    pts.forEach((p, i) => {
      const x = (p.x - L.x) * 0.997, y = -(p.z - L.z) * 0.997;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    const water = new THREE.Mesh(new THREE.ShapeGeometry(shape), world.materials.fountainWater || world.materials.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(L.x, L.wy, L.z);
    water.name = 'lake';
    water.receiveShadow = false; // (long thin triangles: the shadow map striped them)
    world.chunkAt(L.x, L.z).group.add(water);
    const stone = VH.col(0x9a948a), rail = VH.col(0xc8aa7c);
    const reed = VH.col(0x56763a), reedTop = VH.col(0x9a8c50);
    const off = 0.65; // the rail stands this far outside the shore line
    const R = (p) => [p.x + p.nx * off, p.z + p.nz * off];
    const railSeg = (ax, az, bx, bz) => {
      const ctx = world.ctxAt((ax + bx) / 2, (az + bz) / 2);
      for (const y of [0.5, 0.95]) W().beam(ctx.detailWood, ax, KERB + y, az, bx, KERB + y, bz, 0.09, rail);
      const len = Math.hypot(bx - ax, bz - az);
      world.physics.addOrientedBox((ax + bx) / 2, (az + bz) / 2, 0.1, len / 2 + 0.06, Math.atan2(bx - ax, bz - az), 0, KERB + 1.05, 'fence', F().SOLID | F().CAMERA);
    };
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[(i + 1) % N];
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, len = Math.hypot(b.x - a.x, b.z - a.z);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const c = world.ctxAt(mx, mz);
      c.detailMatte.orientedBox(mx, mz, 0.45, len / 2 + 0.3, yaw, KERB, L.wy + 0.1, stone); // solidity: passable (shore stones, knee-low)
      const [ax, az] = R(a), [bx, bz] = R(b);
      c.detailWood.box(ax - 0.07, KERB, az - 0.07, ax + 0.07, KERB + 1.05, az + 0.07, rail);
      const g = gaps.find((q) => q.s.i === i);
      if (g) {
        // Stubs from the corners in to the jetty's rails.
        const k = Math.max(0, (len - g.w) / 2 - 0.02) / len;
        if (k > 0.02) {
          railSeg(ax, az, ax + (bx - ax) * k, az + (bz - az) * k);
          railSeg(bx + (ax - bx) * k, bz + (az - bz) * k, bx, bz);
        }
        continue;
      }
      railSeg(ax, az, bx, bz);
      // Reeds in clumps a metre into the water (behind the rail: leaves, never in the way).
      const h = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      if (h < 0.45) {
        const ix = mx - a.nx * 1.3, iz = mz - a.nz * 1.3;
        c.hedge.orientedBox(ix, iz, 0.35, len * (0.2 + h * 0.5), yaw, KERB, KERB + 1.1 + h * 0.9, reed, reedTop);
      }
    }
    // Lily pads in the calm corners.
    const rng = new VH.RNG('willow-lilies');
    for (let k = 0; k < 7; k++) {
      const p = pts[(k * 37 + 11) % N];
      for (let j = 0; j < 4; j++) {
        const t = rng.range(2.5, 6), sx = rng.range(-2.5, 2.5);
        const x = p.x - p.nx * t + p.nz * sx, z = p.z - p.nz * t - p.nx * sx;
        ellipse(world, 'marks', x, z, rng.range(0.4, 0.75), rng.range(0.4, 0.75), 0, L.wy + 0.012, VH.col(rng.chance(0.2) ? 0xf2d8e0 : 0x4a7a3a), 7);
      }
    }
    return water;
  }

  /** Round octagonal collider for a trunk or post of radius r (four turned boxes). */
  function roundCollider(world, x, z, r, y0, y1, tag, flags) {
    for (let k = 0; k < 4; k++) world.physics.addOrientedBox(x, z, r, r * 0.42, (k * Math.PI) / 4, y0, y1, tag || 'pole', flags === undefined ? F().SOLID | F().SHOTS : flags);
  }

  /** A weeping willow: a stout trunk, a domed crown and a curtain of leaves hanging to head height (walked through, like leaves). */
  function willow(world, x, z, s, y) {
    const K = C();
    const base = y === undefined ? KERB : y;
    const ctx = world.ctxAt(x, z);
    const bark = VH.col(0x5a4632);
    ctx.wood.cylinder(x, base, z, 0.42 * s, 0.3 * s, 3.4 * s, 8, bark, true);
    for (const [dx, dz] of [[1.4, 0.3], [-1.1, 0.9], [0.2, -1.4]]) W().beam(ctx.wood, x, base + 2.8 * s, z, x + dx * s, base + 4.2 * s, z + dz * s, 0.22 * s, bark);
    roundCollider(world, x, z, 0.4 * s, 0, base + 3.4 * s, 'pole');
    const leafA = VH.col(0x9ab84a), leafB = VH.col(0x7ea040);
    K.blob(ctx.hedge, x, base + 4.9 * s, z, 3.3 * s, 1.7 * s, 3.3 * s, leafA);
    K.blob(ctx.hedge, x + 0.8 * s, base + 5.8 * s, z - 0.5 * s, 2.0 * s, 1.1 * s, 2.0 * s, leafA);
    // The curtain: an open cone from the crown's rim down to 1.6 m (two layers, the inner one darker).
    ctx.hedge.cylinder(x, base + 1.6 * s, z, 3.6 * s, 3.1 * s, 3.4 * s, 12, leafB, false);
    ctx.hedge.cylinder(x, base + 1.9 * s, z, 3.0 * s, 2.6 * s, 3.0 * s, 10, VH.colMul(leafB, 0.85), false);
  }

  /** A clinker rowing boat lying on the water (or upside down on trestles with up = false), facing yaw. */
  function rowboat(world, x, z, yaw, hex, up) {
    const ctx = world.ctxAt(x, z);
    const s = ctx.detail;
    const K = C();
    const P = K.frame(x, z, yaw);
    const hull = VH.col(hex || 0xf2efe6), inside = VH.col(0xa8885c), trim = VH.col(0x6b4a30);
    if (up === false) {
      // Upturned on two trestles: the hull's bottom painted, the gunwale underneath.
      const y0 = KERB + 0.55;
      s.orientedBox(x, z, 0.62, 1.5, yaw, y0, y0 + 0.42, hull, VH.col(hex === 0xf2efe6 ? 0x2f5f8a : 0xf2efe6));
      const [bx, bz] = P(1.75, 0);
      s.orientedBox(bx, bz, 0.32, 0.3, yaw, y0 + 0.05, y0 + 0.38, hull);
      for (const f of [-0.9, 0.9]) {
        const [tx, tz] = P(f, 0);
        world.ctxAt(tx, tz).detailWood.orientedBox(tx, tz, 0.75, 0.06, yaw, KERB, y0, trim);
      }
      world.physics.addOrientedBox(x + Math.sin(yaw) * 0.15, z + Math.cos(yaw) * 0.15, 0.78, 1.95, yaw, 0, y0 + 0.42, 'plank', F().SOLID | F().SHOTS);
      return;
    }
    const y0 = WL.lake.wy - 0.06, y1 = WL.lake.wy + 0.34;
    s.orientedBox(x, z, 0.62, 1.4, yaw, y0, y1, hull, inside); // the hull, its floor boards seen from above
    const [bx, bz] = P(1.65, 0);
    s.orientedBox(bx, bz, 0.34, 0.28, yaw, y0 + 0.05, y1 + 0.03, hull, inside); // the bow
    const [cx, cz] = P(-1.45, 0);
    s.orientedBox(cx, cz, 0.55, 0.06, yaw, y0, y1 + 0.02, trim); // the transom
    for (const f of [-0.6, 0.35]) {
      const [tx, tz] = P(f, 0);
      s.orientedBox(tx, tz, 0.6, 0.12, yaw, y1 - 0.02, y1 + 0.03, trim); // thwarts
    }
    // The oars shipped along the thwarts.
    for (const r of [-0.35, 0.35]) {
      const [ax, az] = P(1.2, r), [ox, oz] = P(-1.3, r * 0.8);
      W().beam(s, ax, y1 + 0.06, az, ox, y1 + 0.06, oz, 0.05, VH.col(0xc8a878)); // solidity: passable (oars in a boat on the water)
    }
    world.physics.addOrientedBox(x + Math.sin(yaw) * 0.12, z + Math.cos(yaw) * 0.12, 0.64, 1.8, yaw, 0, y1 + 0.05, 'plank', F().SOLID | F().SHOTS);
  }

  /** A duck (or, big, a swan) sitting on the water, facing yaw. */
  function duck(world, x, z, yaw, swan, hex) {
    const ctx = world.ctxAt(x, z);
    const s = ctx.detailMatte, K = C();
    const k = swan ? 2.2 : 1;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const body = VH.col(hex || (swan ? 0xf8f6f0 : 0x8a6a48));
    const wy = WL.lake.wy;
    K.blob(s, x, wy + 0.06 * k, z, (0.12 + Math.abs(fx) * 0.1) * k, 0.09 * k, (0.12 + Math.abs(fz) * 0.1) * k, body);
    const hx = x + fx * 0.2 * k, hz = z + fz * 0.2 * k;
    if (swan) W().beam(s, x + fx * 0.12 * k, wy + 0.14 * k, z + fz * 0.12 * k, hx, wy + 0.42 * k, hz, 0.07 * k, body); // (the neck)
    const hy = wy + (swan ? 0.45 : 0.2) * k;
    K.blob(s, hx, hy, hz, 0.07 * k, 0.07 * k, 0.07 * k, swan ? body : VH.col(hex ? 0x8a6a48 : 0x2f6a3a)); // solidity: passable
    s.box(hx + fx * 0.07 * k - 0.03, hy - 0.02, hz + fz * 0.07 * k - 0.03, hx + fx * 0.07 * k + 0.03, hy + 0.01, hz + fz * 0.07 * k + 0.03, VH.col(0xf0a030)); // solidity: passable (the beak)
    // The rail can be vaulted and the lake is only ankle-deep, so the birds are solid.
    const ph = world.physics;
    const bx = (0.12 + Math.abs(fx) * 0.1) * k * 0.7, bz = (0.12 + Math.abs(fz) * 0.1) * k * 0.7; // inside the body's oval
    ph.addBox(x - bx, wy - 0.05, z - bz, x + bx, wy + 0.11 * k, z + bz, 'animal', F().SOLID | F().SHOTS);
    // (A duck's head is a 14 cm ball over its body: only the swans' necks need one of their own.)
    if (swan) ph.addOrientedBox(x + fx * 0.16 * k, z + fz * 0.16 * k, 0.055 * k, 0.09 * k, yaw, wy + 0.1 * k, hy + 0.05 * k, 'animal', F().SOLID | F().SHOTS);
  }

  /**
   * A timber deck from (x, z) running `len` metres out along yaw, `w` wide,
   * its top at y, on piles; a rail down both sides and across the far end
   * (open at the land end). Returns the frame (f, r) -> [x, z].
   */
  function jetty(world, x, z, yaw, w, len, y) {
    const K = C();
    const P = K.frame(x, z, yaw);
    const plank = VH.col(0xb89a70), dark = VH.col(0x7a5e40), rail = VH.col(0xc8aa7c);
    const [cx, cz] = P(len / 2, 0);
    K.pieces(0, len, 20, (a, b) => {
      const [px, pz] = P((a + b) / 2, 0);
      const ctx = world.ctxAt(px, pz);
      ctx.prop.orientedBox(px, pz, w / 2, (b - a) / 2, yaw, y - 0.18, y, plank);
      // Plank joints across the deck.
      for (let f = Math.ceil(a / 0.9) * 0.9; f < b; f += 0.9) {
        const [jx, jz] = P(f, 0);
        ctx.detail.orientedBox(jx, jz, w / 2 - 0.02, 0.012, yaw, y, y + 0.004, dark); // solidity: passable (paint)
      }
    });
    world.physics.addOrientedBox(cx, cz, w / 2, len / 2, yaw, y - 0.3, y, 'plank', F().SOLID | F().SHOTS);
    // Piles under the edges, and the posts and rails above them.
    for (let f = 0.3; f <= len; f += 2.4) {
      for (const r of [-w / 2 + 0.1, w / 2 - 0.1]) {
        const [px, pz] = P(Math.min(f, len - 0.1), r);
        const ctx = world.ctxAt(px, pz);
        ctx.wood.box(px - 0.11, KERB - 0.1, pz - 0.11, px + 0.11, y - 0.18, pz + 0.11, dark); // a pile (under the deck)
        ctx.detailWood.box(px - 0.06, y, pz - 0.06, px + 0.06, y + 1.0, pz + 0.06, rail);
      }
    }
    const rails = (f0, r0, f1, r1) => {
      const [ax, az] = P(f0, r0), [bx, bz] = P(f1, r1);
      const ctx = world.ctxAt((ax + bx) / 2, (az + bz) / 2);
      for (const yy of [0.5, 0.95]) W().beam(ctx.detailWood, ax, y + yy, az, bx, y + yy, bz, 0.08, rail);
      const L = Math.hypot(bx - ax, bz - az);
      world.physics.addOrientedBox((ax + bx) / 2, (az + bz) / 2, 0.09, L / 2 + 0.05, Math.atan2(bx - ax, bz - az), 0, y + 1.0, 'railing', F().SOLID | F().SHOTS);
    };
    rails(0.3, -w / 2 + 0.1, len - 0.1, -w / 2 + 0.1);
    rails(0.3, w / 2 - 0.1, len - 0.1, w / 2 - 0.1);
    rails(len - 0.1, -w / 2 + 0.1, len - 0.1, w / 2 - 0.1);
    for (const r of [-w / 2 + 0.1, w / 2 - 0.1]) {
      const [px, pz] = P(len - 0.1, r);
      world.ctxAt(px, pz).detailWood.box(px - 0.06, y, pz - 0.06, px + 0.06, y + 1.0, pz + 0.06, rail);
    }
    return P;
  }

  /** A ridge tent (two sloping sides, a door flap at the front) or, dome = true, a dome tent; facing yaw. Solid. */
  function tent(world, x, z, yaw, hex, dome, big) {
    const ctx = world.ctxAt(x, z);
    const s = ctx.detail, K = C();
    const col = VH.col(hex), dark = VH.colMul(VH.col(hex), 0.62);
    const P = K.frame(x, z, yaw);
    if (dome) {
      const R = big ? 1.9 : 1.4, H = big ? 1.6 : 1.25;
      K.blob(s, x, KERB, z, R, H, R, col);
      // The door: a dark arch on the front, and the poles' seams over the top.
      const [dx, dz] = P(R * 0.86, 0);
      s.orientedBox(dx, dz, 0.42, 0.25, yaw, KERB, KERB + H * 0.62, dark);
      // (The sphere is a low one: seven facets round, so the dome's sides are straight to 0.7 of its height.)
      for (const [h0, h1, k] of [[0, 0.42, 0.88], [0.42, 0.78, 0.7], [0.78, 1, 0.3]]) roundCollider(world, x, z, R * k, h0 ? KERB + H * h0 : 0, KERB + H * h1, 'tent', F().SOLID | F().CAMERA);
      return;
    }
    const L = big ? 4.2 : 2.6, hw = big ? 1.5 : 1.05, H = big ? 2.0 : 1.35;
    // The ridge runs along yaw; the sides slope down to the ground.
    const f0 = -L / 2, f1 = L / 2;
    const V = (f, r, y) => {
      const [px, pz] = P(f, r);
      return [px, y, pz];
    };
    for (const side of [-1, 1]) {
      const a = V(f0, side * hw, KERB), b = V(f1, side * hw, KERB), c = V(f1, 0, KERB + H), d = V(f0, 0, KERB + H);
      const quad = side > 0 ? [d, c, b, a] : [c, d, a, b]; // facing out and up
      s.polygon(quad, col);
      s.polygon(quad.slice().reverse(), dark);
    }
    for (const [f, door] of [[f1, true], [f0, false]]) {
      const tri = [V(f, -hw, KERB), V(f, hw, KERB), V(f, 0, KERB + H)];
      s.polygon(f > 0 ? tri : tri.slice().reverse(), door ? dark : col);
      s.polygon(f > 0 ? tri.slice().reverse() : tri, dark);
    }
    // Guy ropes are left out (thin); the pegs' loops are flat on the grass. Stepped colliders under the slopes.
    for (const [t0, t1] of [[0, 0.3], [0.3, 0.55], [0.55, 0.8], [0.8, 1]]) {
      world.physics.addOrientedBox(x, z, hw * (1 - (t0 + t1) / 2) + 0.02, L / 2, yaw, t0 === 0 ? 0 : KERB + H * t0, KERB + H * t1, 'tent', F().SOLID | F().CAMERA);
    }
  }

  /** A touring caravan: a rounded box on one axle, a window band, a door on the right side, the A-frame hitch; facing yaw. */
  function caravan(world, x, z, yaw, stripe) {
    const ctx = world.ctxAt(x, z);
    const s = ctx.detail, K = C();
    const P = K.frame(x, z, yaw);
    const body = VH.col(0xf4f2ea), glass = VH.col(0x2a3440);
    const ob = (f, r, hf, hr, y0, y1, c, top) => {
      const [px, pz] = P(f, r);
      s.orientedBox(px, pz, hr, hf, yaw, y0, y1, c, top);
    };
    const y0 = KERB + 0.45, y1 = KERB + 2.55;
    ob(0, 0, 2.6, 1.1, y0, y1, body);
    ob(2.75, 0, 0.18, 0.95, y0 + 0.2, y1 - 0.25, body); // the rounded front
    ob(0, 0, 2.62, 1.12, y0 + 0.75, y0 + 0.9, VH.col(stripe || 0x2f6f9a));
    ob(2.94, 0, 0.02, 0.8, y0 + 1.15, y0 + 1.75, glass); // the front window
    for (const f of [-1.6, 0.4, 1.8]) ob(f, 0, 0.5, 1.13, y0 + 1.15, y0 + 1.7, glass);
    ob(-0.6, 1.12, 0.4, 0.02, y0 + 0.05, y0 + 1.95, VH.col(0xe8e4d8)); // the door
    ob(0, 0, 1.0, 0.6, y1, y1 + 0.12, VH.col(0xd8d8d0)); // a roof light
    ob(3.6, 0, 0.6, 0.07, KERB + 0.35, KERB + 0.5, VH.col(0x2b2d30)); // the hitch
    for (const r of [-1, 1]) {
      const [wx, wz] = P(0, r * 1.0);
      K.wheel(s, wx, KERB + 0.33, wz, 0.33, 0.2, yaw, VH.col(0x1b1d20));
    }
    const [jx, jz] = P(3.9, 0);
    s.box(jx - 0.05, KERB, jz - 0.05, jx + 0.05, KERB + 0.42, jz + 0.05, VH.col(0x3a3f45)); // the jockey wheel's leg
    world.physics.addOrientedBox(x + Math.sin(yaw) * 0.1, z + Math.cos(yaw) * 0.1, 1.13, 2.95, yaw, 0, y1 + 0.12, 'metal', F().ALL);
    const [hx, hz] = P(3.6, 0);
    world.physics.addOrientedBox(hx, hz, 0.15, 0.6, yaw, 0, KERB + 0.5, 'metal', F().SOLID);
  }

  /** A striped windbreak along a line (1.2 m, solid). */
  function windbreak(world, ax, az, bx, bz, cols) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L));
    const yaw = Math.atan2(bx - ax, bz - az);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
      const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
      ctx.detail.orientedBox((x0 + x1) / 2, (z0 + z1) / 2, 0.02, L / n / 2, yaw, KERB + 0.1, KERB + 1.2, VH.col(cols[i % cols.length]));
      ctx.detailWood.box(x0 - 0.03, KERB, z0 - 0.03, x0 + 0.03, KERB + 1.25, z0 + 0.03, VH.col(0x8a6a48));
    }
    world.physics.addOrientedBox((ax + bx) / 2, (az + bz) / 2, 0.06, L / 2 + 0.04, yaw, 0, KERB + 1.25, 'fence', F().SOLID | F().CAMERA);
  }

  /** A folding camping chair (solid), facing yaw. */
  function campChair(world, x, z, yaw, hex, y) {
    const ctx = world.ctxAt(x, z);
    const base = y === undefined ? KERB : y;
    const P = C().frame(x, z, yaw);
    const col = VH.col(hex || 0x2f5f8a);
    ctx.detail.orientedBox(x, z, 0.27, 0.25, yaw, base + 0.36, base + 0.44, col);
    const [bx, bz] = P(-0.24, 0);
    ctx.detail.orientedBox(bx, bz, 0.27, 0.03, yaw, base + 0.44, base + 0.95, col);
    for (const [f, r] of [[0.2, 0.25], [0.2, -0.25], [-0.22, 0.25], [-0.22, -0.25]]) {
      const [lx, lz] = P(f, r);
      ctx.detail.box(lx - 0.02, base, lz - 0.02, lx + 0.02, base + 0.4, lz + 0.02, VH.col(0x3a3f45)); // solidity: passable (inside the chair's collider)
    }
    world.physics.addOrientedBox(x, z, 0.29, 0.29, yaw, 0, base + 0.44, 'bench', F().SOLID | F().SHOTS);
    world.physics.addOrientedBox(bx, bz, 0.29, 0.05, yaw, base + 0.44, base + 0.95, 'bench', F().SOLID | F().SHOTS);
  }

  /** A log lying on the grass as a seat (axis across yaw), solid. */
  function logSeat(world, x, z, yaw, len) {
    const ctx = world.ctxAt(x, z);
    C().wheel(ctx.detailWood, x, KERB + 0.24, z, 0.24, len, yaw, VH.col(0x6b4a30));
    world.physics.addOrientedBox(x, z, len / 2, 0.24, yaw, 0, KERB + 0.48, 'bench', F().SOLID | F().SHOTS);
  }

  /** A post with a light on top (a path lamp), solid. */
  function postLamp(world, x, z, h, hex) {
    W().lamp(world, x, z, hex || 0xffe2a0, 2.2, h);
    world.physics.addBox(x - 0.08, 0, z - 0.08, x + 0.08, KERB + h, z + 0.08, 'pole', F().SOLID | F().SHOTS);
    (world.floodlights || (world.floodlights = [])).push({ x, z, r: 3.5, y: KERB + 0.03, strength: 0.35, tint: [1.1, 1.0, 0.8] });
  }

  function buildWillowLake(world) {
    const K = C(), WN = W();
    const P = WL, e = P.edge, L = P.lake;
    K.ground(world, P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e, 'meadow', KERB + 0.002);
    world.addLawn(P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e);
    // The fence round the plot (dark timber): open at the car park's gate and where the footpath crosses.
    const jet = sliceAt(L, Math.PI * 1.5);
    P.walk = jet.x;
    const fx0 = P.x0 + e + 0.5, fx1 = P.x1 - e - 0.5, fz0 = P.z0 + e + 0.5, fz1 = P.z1 - e - 0.5;
    const rail = { hex: 0x5a4030, h: 1.3 };
    K.postRail(world, fx0, fz0, fx1, fz0, [[P.gate.x0, P.gate.x1], [P.walk - 2, P.walk + 2]], rail);
    K.postRail(world, fx0, fz1, fx1, fz1, [[P.walk - 2, P.walk + 2]], rail);
    K.postRail(world, fx0, fz0, fx0, fz1, [], rail);
    K.postRail(world, fx1, fz0, fx1, fz1, [], rail);
    // The lake: the jetty's slice and the three fishing platforms' slices are left open in the reeds.
    const pegs = [sliceAt(L, Math.PI * 0.5 - 0.33), sliceAt(L, Math.PI * 0.5 + 0.02), sliceAt(L, Math.PI * 0.5 + 0.36)];
    buildLake(world, L, [{ s: jet, w: 3.6 }, ...pegs.map((q) => ({ s: q, w: 3.4 }))]);
    P.jet = jet;
    P.pegs = pegs;
    buildLakePaths(world);
    buildIsland(world);
    buildJetty(world);
    buildBoathouse(world);
    buildFishing(world);
    P.cabins.xs.forEach((x, i) => buildCabin(world, x, i));
    buildWillowOffice(world);
    buildWillowPark(world);
    buildCampsite(world);
    buildLakeTrees(world);
    // Ducks and two swans on the water (clear of the jetty and the island).
    const rng = new VH.RNG('willow-ducks');
    for (let k = 0; k < 14; k++) {
      const a = rng.range(0, Math.PI * 2), t = rng.range(0.25, 0.8) * lakeK(L, a);
      const x = L.x + Math.cos(a) * L.rx * t, z = L.z + Math.sin(a) * L.rz * t;
      if (Math.hypot(x - P.island.x, z - P.island.z) < 16 || Math.abs(x - jet.x) < 6 && z < jet.z + 40) continue;
      duck(world, x, z, rng.range(0, Math.PI * 2), k < 2, k % 4 === 3 ? 0xf2efe6 : null);
    }
    // The names: by the car park's gate on Mariner Way, and by the footpath's gates.
    VH.Landmarks.sign(world, { x: P.gate.x1 + 7, y: KERB + 2.4, z: P.z0 + e + 1.2, yaw: Math.PI, w: 7, h: 1.6, lines: ['WILLOW LAKE', 'Cabins · Camping · Boats · Fishing'], style: 'brand', posts: true, colors: { bg: ['#2f5a3a', '#22442c'], fg: '#f2ead0' }, frame: 0x5a4030, twoSided: true });
    VH.Landmarks.sign(world, { x: P.walk + 4.5, y: KERB + 1.8, z: P.z1 - e - 1.4, yaw: 0, w: 4.2, h: 1.1, lines: ['WILLOW LAKE', 'Footpath round the lake'], style: 'park', posts: true });
  }

  /** The gravel path round the lake, the footpath along the cabins and the ways in; benches and lamps along them. */
  function buildLakePaths(world) {
    const P = WL, L = P.lake;
    const y = KERB + 0.035;
    const col = VH.col(0xb4ab98);
    const N = 56;
    P.paths = [];
    const seg = (ax, az, bx, bz, w) => {
      band(world, 'marks', ax, az, bx, bz, w || 2.6, y, col);
      ellipse(world, 'marks', bx, bz, (w || 2.6) / 2, (w || 2.6) / 2, 0, y, col, 8);
      P.paths.push([ax, az, bx, bz]);
    };
    for (let i = 0; i < N; i++) {
      const [ax, az] = ringPt((i / N) * Math.PI * 2), [bx, bz] = ringPt(((i + 1) / N) * Math.PI * 2);
      seg(ax, az, bx, bz);
    }
    const bottom = ringPt(Math.PI * 0.5)[1];
    // The footpath north-south: Mariner Way, across the lane, past the boathouse to the jetty; from the south shore to Foundry Road.
    seg(P.walk, P.z0 + 1, P.walk, P.jet.z - 1.5, 2.4);
    seg(P.walk, bottom - 0.5, P.walk, P.z1 - 1, 2.4);
    // Along the cabins' decks, and down to the lake at its north-west.
    const cz = P.cabinPath;
    seg(P.cabins.xs[0] - 4, cz, P.office.x0, cz, 2.4);
    const nw = ringPt(Math.PI * 1.2);
    seg(P.cabins.xs[0] - 4, cz, nw[0], nw[1], 2.4);
    // From the campsite to the east shore.
    const east = ringPt(0);
    seg(P.camp.track - 3, P.campWay, east[0], east[1], 2.4);
    // Benches facing the water and lamps along the ring.
    for (let k = 0; k < 14; k++) {
      const a = ((k + 0.5) / 14) * Math.PI * 2;
      const [px, pz, ox, oz] = ringPt(a); // and the way out from the water
      if (k % 2 === 0) {
        if (Math.abs(px - P.jet.x) > 8 && !P.pegs.some((s) => Math.hypot(px - s.x, pz - s.z) < 10)) world.addProp('bench', px + ox * 2.4, KERB, pz + oz * 2.4, Math.atan2(-ox, -oz), 1);
      } else {
        postLamp(world, px + ox * 1.9, pz + oz * 1.9, 1.0);
      }
    }
  }

  /** The island: a grassy hump in the lake with a willow, two bushes and a duck house on a post. */
  function buildIsland(world) {
    const K = C(), I = WL.island;
    const y = WL.lake.wy;
    ellipse(world, 'marks', I.x, I.z, I.rx + 1.2, I.rz + 1.0, 0.3, y + 0.025, VH.col(0xa89a72));
    ellipse(world, 'grassTop', I.x, I.z, I.rx, I.rz, 0.3, y + 0.07, VH.col(0xb8d890, 1.1));
    willow(world, I.x - 1.5, I.z + 0.5, 1.05, y + 0.07);
    const ctx = world.ctxAt(I.x, I.z);
    K.blob(ctx.hedge, I.x + 6, KERB + 0.6, I.z - 1.5, 1.6, 1.0, 1.4, VH.col(0x5a7a3a));
    K.blob(ctx.hedge, I.x - 7, KERB + 0.5, I.z + 2, 1.3, 0.8, 1.2, VH.col(0x6a8a3a));
    world.physics.addBox(I.x + 4.6, 0, I.z - 2.8, I.x + 7.4, KERB + 1.5, I.z - 0.2, 'hedge', F().SOLID | F().SHOTS);
    world.physics.addBox(I.x - 8.2, 0, I.z + 0.9, I.x - 5.8, KERB + 1.2, I.z + 3.1, 'hedge', F().SOLID | F().SHOTS);
    // The duck house: a little red hut on a post at the water's edge.
    const dx = I.x + 3, dz = I.z + I.rz - 0.6;
    ctx.wood.box(dx - 0.07, KERB, dz - 0.07, dx + 0.07, KERB + 1.2, dz + 0.07, VH.col(0x6b5038));
    ctx.prop.box(dx - 0.45, KERB + 1.2, dz - 0.35, dx + 0.45, KERB + 1.75, dz + 0.35, VH.col(0xa83a2a));
    W().gable(ctx.prop, dx - 0.45, dz - 0.35, dx + 0.45, dz + 0.35, KERB + 1.75, 0.35, 'x', 0x3a3f45, 0xa83a2a);
    ctx.prop.box(dx - 0.12, KERB + 1.3, dz + 0.35, dx + 0.12, KERB + 1.55, dz + 0.37, VH.col(0x1a1a1a));
    world.physics.addBox(dx - 0.47, 0, dz - 0.37, dx + 0.47, KERB + 2.1, dz + 0.37, 'pole', F().SOLID | F().SHOTS);
  }

  /** The jetty off the north shore: rowing boats moored along it, a lifebuoy, the boat-hire hatch at its root. */
  function buildJetty(world) {
    const P = WL, s = P.jet;
    const len = 34, w = 3.6;
    // From 1.5 m back on the bank, out square to the shore.
    const x0 = s.x - Math.sin(s.yaw) * 1.5, z0 = s.z - Math.cos(s.yaw) * 1.5;
    const J = jetty(world, x0, z0, s.yaw, w, len, KERB + 0.32);
    P.jetty = { x0, z0, len, w, P: J };
    const cols = [0xf2efe6, 0x2f6f9a, 0xc8402c, 0x2f7a4a, 0xf2c318];
    [[9, 1], [16, 1], [23, -1], [12.5, -1], [30, 1]].forEach(([f, r], i) => {
      const [bx, bz] = J(f, r * (w / 2 + 0.95));
      rowboat(world, bx, bz, s.yaw + (i % 2 ? Math.PI : 0), cols[i]);
    });
    // One boat out on the water by the island.
    rowboat(world, P.island.x + 16, P.island.z - 6, 2.2, 0xf2c318);
    // A lifebuoy on a post by the root, the no-swimming sign.
    const [lx, lz] = J(0.6, -(w / 2 + 1.4));
    const lc = world.ctxAt(lx, lz);
    lc.wood.box(lx - 0.08, KERB, lz - 0.08, lx + 0.08, KERB + 1.9, lz + 0.08, VH.col(0x6b5038));
    C().wheel(lc.detail, lx, KERB + 1.35, lz + 0.12, 0.38, 0.1, Math.PI / 2, VH.col(0xe8402c));
    C().wheel(lc.detail, lx, KERB + 1.35, lz + 0.18, 0.2, 0.02, Math.PI / 2, VH.col(0xf2f2ee));
    world.physics.addBox(lx - 0.4, 0, lz - 0.1, lx + 0.4, KERB + 1.9, lz + 0.25, 'pole', F().SOLID | F().SHOTS);
    const [nx, nz] = J(-1.2, w / 2 + 3.2);
    VH.Landmarks.sign(world, { x: nx, y: KERB + 1.6, z: nz, yaw: Math.PI, w: 3.4, h: 0.9, lines: ['NO SWIMMING', 'Deep cold water'], style: 'park', posts: true });
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: x0, z: z0 + 1, r: 6, y: KERB + 0.03, strength: 0.5 });
    const [ex, ez] = J(len - 1, 0);
    world.floodlights.push({ x: ex, z: ez, r: 4, y: KERB + 0.36, strength: 0.4 });
    for (const r of [-1, 1]) {
      const [px, pz] = J(len - 0.1, r * (w / 2 - 0.1));
      W().lamp(world, px, pz, 0xffe2a0, 2.2, 0.25, KERB + 1.32);
    }
  }

  /** The boathouse behind the jetty: green timber, the big doors on the lake side, the hire hatch, oars on a rack, boats upturned. */
  function buildBoathouse(world) {
    const K = C(), WN = W();
    const b = WL.boathouse;
    const ctx = K.shed(world, b, { h: 3.6, rise: 2.6, wall: 0x4a6a52, roof: 0x3a3f45, axis: 'z', style: 0, sides: { s: 'blank' } });
    const cx = (b.x0 + b.x1) / 2;
    // The doors (shut) and the hire hatch beside them.
    ctx.prop.box(cx - 3.2, KERB, b.z1 - 0.02, cx + 1.2, KERB + 3.2, b.z1 + 0.06, VH.col(0x3a4a3e));
    WN.beam(ctx.prop, cx - 3.1, KERB + 0.1, b.z1 + 0.08, cx + 1.1, KERB + 3.1, b.z1 + 0.08, 0.1, 0xf2efe6);
    WN.beam(ctx.prop, cx - 3.1, KERB + 3.1, b.z1 + 0.08, cx + 1.1, KERB + 0.1, b.z1 + 0.08, 0.1, 0xf2efe6);
    ctx.prop.box(cx - 1.0 - 2.1, KERB + 3.1, b.z1 - 0.02, cx + 1.1, KERB + 3.25, b.z1 + 0.1, VH.col(0xf2efe6));
    const hx = b.x1 - 2.2;
    ctx.screen.box(hx - 1.0, KERB + 1.0, b.z1 + 0.02, hx + 1.0, KERB + 1.9, b.z1 + 0.05, VH.col(0xffe2b0, 0.85));
    WN.solid(world, ctx.wood, hx - 1.2, KERB, b.z1, hx + 1.2, KERB + 1.0, b.z1 + 0.5, 0x6b5038, null, 'building', F().ALL); // the counter
    world.interactables.push({ id: 'willow_boats', kind: 'redwaterBoat', x: hx, y: KERB + 1.0, z: b.z1 + 1.6, radius: 1.8, label: 'Hire a rowing boat', price: 8 });
    VH.Landmarks.sign(world, { x: hx, y: KERB + 2.35, z: b.z1 + 0.08, yaw: 0, w: 3.0, h: 0.55, lines: ['ROWING BOATS $8'], style: 'plaque' });
    WN.lamp(world, hx, b.z1 + 0.3, 0xffe2a0, 2.2, 0.2, KERB + 2.85);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: hx, z: b.z1 + 2, r: 5, y: KERB + 0.03, strength: 0.5 });
    // Oars stood in a rack on the east wall.
    const rx = b.x1 + 0.35;
    for (let k = 0; k < 6; k++) {
      const z = b.z0 + 3 + k * 0.4;
      WN.beam(ctx.detailWood, rx, KERB, z, rx - 0.15, KERB + 2.5, z, 0.05, 0xc8a878);
      ctx.detailWood.box(rx - 0.21, KERB + 2.2, z - 0.09, rx - 0.09, KERB + 2.5, z + 0.09, VH.col(0xc8a878)); // the blade
    }
    world.physics.addBox(b.x1, 0, b.z0 + 2.7, rx + 0.12, KERB + 2.5, b.z0 + 5.3, 'crate', F().SOLID | F().SHOTS);
    // Two boats upturned on trestles on the west side.
    rowboat(world, b.x0 - 2.2, b.z0 + 3.5, 0, 0xf2efe6, false);
    rowboat(world, b.x0 - 2.2, b.z0 + 8.5, Math.PI, 0x2f6f9a, false);
  }

  /** Three fishing platforms off the south shore; the bait box on the middle one. */
  function buildFishing(world) {
    const K = C();
    const P = WL;
    P.pegs.forEach((s, i) => {
      const x0 = s.x - Math.sin(s.yaw) * 1.2, z0 = s.z - Math.cos(s.yaw) * 1.2;
      const J = jetty(world, x0, z0, s.yaw, 3.4, 5.2, KERB + 0.3);
      s.P = J;
      // A green brolly and a chair on two of them, a rod out over the rail.
      if (i !== 1) {
        const [ux, uz] = J(3.6, 0.9);
        const uc = world.ctxAt(ux, uz);
        // (The brolly's rim is above head height: 2.4 m off the deck.)
        uc.detail.cylinder(ux, KERB + 0.3, uz, 0.035, 0.035, 2.5, 6, VH.col(0xd8d8d0), true);
        uc.detail.cylinder(ux, KERB + 2.25, uz, 1.25, 0.05, 0.5, 8, VH.col(0x2f5a3a), true);
        world.physics.addBox(ux - 0.08, 0, uz - 0.08, ux + 0.08, KERB + 2.8, uz + 0.08, 'pole', F().SOLID | F().SHOTS);
        const [chx, chz] = J(2.6, -0.4);
        campChair(world, chx, chz, s.yaw, 0x2f5a3a, KERB + 0.3);
        const [r0x, r0z] = J(3.3, -0.9), [r1x, r1z] = J(7.4, -1.3);
        W().beam(uc.detail, r0x, KERB + 0.95, r0z, r1x, KERB + 2.3, r1z, 0.03, VH.col(0x2a2d30)); // solidity: passable (a fishing rod out over the water)
        uc.detail.box(r0x - 0.04, KERB + 0.3, r0z - 0.04, r0x + 0.04, KERB + 0.95, r0z + 0.04, VH.col(0x3a3f45)); // solidity: passable (the rod rest, 2 cm)
      } else {
        const [bx, bz] = J(1.2, 1.0);
        const bc = world.ctxAt(bx, bz);
        W().solid(world, bc.detailWood, bx - 0.45, KERB + 0.3, bz - 0.3, bx + 0.45, KERB + 1.05, bz + 0.3, 0x4a6a52, null, 'crate', F().SOLID | F().SHOTS);
        world.interactables.push({ id: 'willow_fish', kind: 'redwaterFish', x: s.x - Math.sin(s.yaw) * -2.5, y: KERB + 1.2, z: s.z - Math.cos(s.yaw) * -2.5, radius: 2.2, label: 'Go fishing (bait)', price: 2 });
        const [gx, gz] = J(-2.4, 2.6);
        VH.Landmarks.sign(world, { x: gx, y: KERB + 1.6, z: gz, yaw: s.yaw + Math.PI, w: 3.4, h: 0.9, lines: ['FISHING', 'Bait $2 · Catch and release'], style: 'park', posts: true });
      }
    });
    // Picnic tables on the grass behind the platforms, a barbecue stand and bins.
    const z = WL.lake.z + WL.lake.rz + WL.ring + 9;
    for (const x of [-1530, -1516, -1446, -1432]) K.picnicTable(world, x, z, 0, 0x8a6a48);
    const bx = -1500, bz = z + 2;
    const bc = world.ctxAt(bx, bz);
    W().solid(world, bc.concrete, bx - 0.8, KERB, bz - 0.5, bx + 0.8, KERB + 0.85, bz + 0.5, 0x9a948a, null, 'building', F().ALL);
    bc.detail.box(bx - 0.6, KERB + 0.85, bz - 0.35, bx + 0.6, KERB + 0.9, bz + 0.35, VH.col(0x2a2d30)); // the grill
    for (const x of [-1508, -1440]) world.addProp('bin', x, KERB, z - 2.4, 0, 1);
  }

  /** A log cabin facing the lake: corner log ends, a stone chimney, a deck with a rail and two chairs, a porch lamp; a gravel pad behind. */
  function buildCabin(world, x, i) {
    const K = C(), WN = W();
    const c = WL.cabins;
    const r = { x0: x - c.w / 2, x1: x + c.w / 2, z0: c.z0, z1: c.z1 };
    const logCol = [0x8a5a36, 0x7a4e2e, 0x96643c][i % 3];
    const ctx = K.shed(world, r, { h: 2.9, rise: 2.0, wall: logCol, roof: 0x3f4a3a, axis: 'x', bay: 2.6, floorH: 2.9, ww: 0.5, wh: 0.5, seed: 3.3 + i, sides: { e: 'blank', w: 'blank' } });
    // The log ends, crossing at the corners.
    const end = VH.colMul(VH.col(logCol), 1.25);
    for (const cx of [r.x0, r.x1]) {
      for (const cz of [r.z0, r.z1]) {
        for (let k = 0; k < 9; k++) {
          const y = KERB + 0.12 + k * 0.31, o = k % 2 ? 0.28 : 0.12;
          ctx.wood.box(cx - o, y, cz - (0.4 - o), cx + o, y + 0.26, cz + (0.4 - o), end);
        }
      }
    }
    for (const cx of [r.x0, r.x1]) {
      for (const cz of [r.z0, r.z1]) {
        world.physics.addBox(cx - 0.29, 0, cz - 0.13, cx + 0.29, KERB + 2.9, cz + 0.13, 'building', F().ALL);
        world.physics.addBox(cx - 0.13, 0, cz - 0.29, cx + 0.13, KERB + 2.9, cz + 0.29, 'building', F().ALL);
      }
    }
    // The chimney on the west gable.
    const cz = (r.z0 + r.z1) / 2;
    WN.solid(world, ctx.concrete, r.x0 - 0.9, KERB, cz - 0.6, r.x0 - 0.3, KERB + 5.7, cz + 0.6, 0x8a8478, null, 'building', F().ALL);
    // The deck: a step up, the rail round it with the steps' gap, the door and its lamp.
    const dz0 = r.z1, dz1 = r.z1 + c.deck, dy = KERB + 0.38;
    WN.deck(world, ctx.wood, r.x0 + 0.4, dz0, r.x1 - 0.4, dz1, dy, 0x9a7448, 'plank', 0.38);
    const rl = { hex: 0x7a5a3a, h: 0.95, y: dy };
    K.postRail(world, r.x0 + 0.5, dz1 - 0.1, r.x1 - 0.5, dz1 - 0.1, [[x - 0.9, x + 0.9]], rl);
    K.postRail(world, r.x0 + 0.5, dz0 + 0.4, r.x0 + 0.5, dz1 - 0.1, [], rl);
    K.postRail(world, r.x1 - 0.5, dz0 + 0.4, r.x1 - 0.5, dz1 - 0.1, [], rl);
    ctx.prop.box(x - 0.5, dy, r.z1 - 0.02, x + 0.5, dy + 2.05, r.z1 + 0.05, VH.col(0x4a3020));
    WN.lamp(world, x + 0.95, r.z1 + 0.15, 0xffd890, 2.2, 0.2, KERB + 2.45);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x, z: dz1 + 1.5, r: 5, y: KERB + 0.03, strength: 0.45 });
    campChair(world, x - 3, dz0 + 1.6, Math.PI * (i % 2 ? 0.92 : 1.08) - Math.PI, [0x2f5a3a, 0xc8402c, 0x2f5f8a][i % 3], dy);
    campChair(world, x + 2.8, dz0 + 1.5, Math.PI * 0.05, [0xf2c318, 0x2f5a3a, 0xc8402c][i % 3], dy);
    // Firewood stacked against the east wall, a gravel pad behind for the car.
    WN.solid(world, ctx.detailWood, r.x1 + 0.35, KERB, cz - 1.6, r.x1 + 1.05, KERB + 1.1, cz + 1.6, 0x7a5434, null, 'crate', F().SOLID | F().SHOTS);
    K.ground(world, x - 3, WL.lane.z1, x + 3, r.z0 - 0.4, 'gravel', KERB + 0.01);
  }

  /** The reception and camp shop by the car park: a timber hut with a veranda, the shop hatch, festoon lights. */
  function buildWillowOffice(world) {
    const K = C(), WN = W();
    const o = WL.office;
    const ctx = K.shed(world, o, { h: 3.2, rise: 1.8, wall: 0x8a5a36, roof: 0x3f4a3a, axis: 'x', bay: 2.8, floorH: 3.2, ww: 0.5, wh: 0.5, seed: 9.1 });
    // The veranda on the car park side.
    const vz0 = o.z0 - 3, vz1 = o.z0;
    ctx.wood.topRect(o.x0, vz0, o.x1, vz1, KERB + 0.04, VH.col(0xa8885c), 2);
    WN.tiltBox(ctx.prop, (o.x0 + o.x1) / 2, KERB + 3.0, (vz0 + vz1) / 2, o.x1 - o.x0 + 0.6, 0.14, vz1 - vz0 + 0.5, 0, -0.16, 0x3f4a3a);
    for (const x of [o.x0 + 0.3, (o.x0 + o.x1) / 2, o.x1 - 0.3]) {
      ctx.wood.box(x - 0.1, KERB, vz0 + 0.1, x + 0.1, KERB + 2.9, vz0 + 0.3, VH.col(0x6b4a30));
      world.physics.addBox(x - 0.12, 0, vz0 + 0.08, x + 0.12, KERB + 2.9, vz0 + 0.32, 'pole', F().SOLID | F().SHOTS);
    }
    const hx = o.x0 + 5;
    ctx.screen.box(hx - 1.2, KERB + 1.0, o.z0 - 0.05, hx + 1.2, KERB + 2.0, o.z0 - 0.02, VH.col(0xffe2b0, 0.85));
    WN.solid(world, ctx.wood, hx - 1.4, KERB, o.z0 - 0.55, hx + 1.4, KERB + 1.0, o.z0, 0x6b5038, null, 'building', F().ALL);
    world.interactables.push({ id: 'willow_shop', kind: 'redwaterBuy', x: hx, y: KERB + 1.0, z: o.z0 - 1.8, radius: 1.8, label: 'Buy toasted marshmallows', price: 3, heal: 25, what: 'smores' });
    const dx = o.x1 - 5;
    ctx.prop.box(dx - 0.55, KERB, o.z0 - 0.06, dx + 0.55, KERB + 2.2, o.z0 + 0.02, VH.col(0x4a3020)); // the reception door
    VH.Landmarks.sign(world, { x: o.x1 + 3, y: KERB + 1.8, z: vz0 - 1.5, yaw: Math.PI, w: 3.8, h: 1.0, lines: ['RECEPTION', 'Camp shop · Cabins · Pitches'], style: 'park', posts: true });
    // Bulbs under the veranda's front edge (they hang from 2.2 m: Jay walks under them).
    WN.festoon(world, o.x0 + 0.3, KERB + 2.5, vz0 + 0.2, o.x1 - 0.3, KERB + 2.5, vz0 + 0.2, 0.25, [0xffd890, 0xff9a6a, 0x9ad8ff, 0xb8ff9a], 1.4);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: (o.x0 + o.x1) / 2, z: vz0 - 1, r: 7, y: KERB + 0.03, strength: 0.55 });
    // A noticeboard on two posts by the track.
    const nx = o.x1 + 3.5, nz = o.z0 + 2;
    ctx.detailWood.box(nx - 0.9, KERB, nz - 0.06, nx - 0.8, KERB + 1.9, nz + 0.06, VH.col(0x6b4a30));
    ctx.detailWood.box(nx + 0.8, KERB, nz - 0.06, nx + 0.9, KERB + 1.9, nz + 0.06, VH.col(0x6b4a30));
    ctx.detail.box(nx - 0.85, KERB + 1.0, nz - 0.04, nx + 0.85, KERB + 1.8, nz + 0.04, VH.col(0x5a7a4a));
    for (let k = 0; k < 5; k++) ctx.detail.box(nx - 0.7 + k * 0.3, KERB + 1.15 + (k % 2) * 0.25, nz - 0.06, nx - 0.5 + k * 0.3, KERB + 1.45 + (k % 2) * 0.25, nz - 0.04, VH.col([0xf2efe6, 0xf2e2a0, 0xb8d8f2][k % 3]));
    world.physics.addBox(nx - 0.92, 0, nz - 0.08, nx + 0.92, KERB + 1.9, nz + 0.08, 'sign', F().SOLID | F().SHOTS);
  }

  /** The car park off Mariner Way (gravel, sleepers at the bay heads, lamps) and the cabins' lane. */
  function buildWillowPark(world) {
    const K = C();
    const p = WL.park;
    K.ground(world, p.x0, p.z0, p.x1, p.z1, 'gravel', KERB + 0.01);
    K.ground(world, WL.gate.x0, WL.z0 + WL.edge, WL.gate.x1, p.z0, 'gravel', KERB + 0.01);
    K.ground(world, WL.lane.x0, WL.lane.z0, p.x0, WL.lane.z1, 'gravel', KERB + 0.01);
    WL.bayRows = [];
    for (const [z, dir] of [[p.z0 + 3, 1], [p.z0 + 22, -1], [p.z0 + 22, 1], [p.z1 - 3, -1]]) {
      const zh = z + dir * 0.25;
      const skip = z === p.z0 + 3 ? [WL.gate.x0 - 2, WL.gate.x1 + 2] : null;
      for (let x = p.x0 + 3; x < p.x1 - 3; x += 2.7) {
        if (skip && x > skip[0] - 1 && x < skip[1] + 1) continue;
        world.ctxAt(x, zh).detailWood.box(x - 0.9, KERB, zh - 0.12, x + 0.9, KERB + 0.12, zh + 0.12, VH.col(0x6b5038));
      }
      WL.bayRows.push({ z: z + dir * 2.6, h: dir > 0 ? Math.PI : 0, skip });
    }
    for (const x of [p.x0 + 22, p.x1 - 22]) world.addProp('streetlight', x, KERB, p.z0 + 22, 0, 1);
    for (let x = WL.lane.x0 + 30; x < p.x0 - 10; x += 44) world.addProp('streetlight', x, KERB, WL.lane.z0 - 1.5, 0, 1);
  }

  /** The campsite: the track and its turning circle, pitches with tents, caravans and cars, the toilet block, the campfire. */
  function buildCampsite(world) {
    const K = C(), WN = W();
    const P = WL, cp = P.camp;
    const tx = cp.track;
    K.ground(world, tx - 3, P.park.z1, tx + 3, cp.z1 - 8, 'gravel', KERB + 0.01);
    ellipse(world, 'marks', tx, cp.z1 - 9, 8, 7, 0, KERB + 0.03, VH.col(0x9c9486), 12);
    for (let z = cp.z0 + 6; z < cp.z1 - 10; z += 24) for (const s of [-1, 1]) postLamp(world, tx + s * 4, z, 1.0);
    // The toilet and shower block.
    const t = P.toilets;
    const tc = K.shed(world, t, { h: 3.0, rise: 1.4, wall: 0xe8e0cc, roof: 0x2f4a3a, axis: 'x', bay: 3, floorH: 3, ww: 0.35, wh: 0.25, seed: 5.5, sides: { w: 'blank' } });
    for (const [z, col] of [[t.z0 + 3, 0x2f5f9a], [t.z1 - 3, 0xc8402c]]) tc.prop.box(t.x0 - 0.06, KERB, z - 0.55, t.x0 + 0.02, KERB + 2.1, z + 0.55, VH.col(col));
    VH.Landmarks.sign(world, { x: t.x0 - 0.08, y: KERB + 2.55, z: (t.z0 + t.z1) / 2, yaw: -Math.PI / 2, w: 4.2, h: 0.55, lines: ['TOILETS · SHOWERS'], style: 'plaque' });
    WN.lamp(world, t.x0 - 0.3, (t.z0 + t.z1) / 2, 0xfff2d8, 2.2, 0.2, KERB + 2.2);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: t.x0 - 3, z: (t.z0 + t.z1) / 2, r: 6, y: KERB + 0.03, strength: 0.45 });
    world.addProp('bin', t.x0 - 1.2, KERB, t.z1 + 2, 0, 1);
    // The pitches: a mown square each, an electric hook-up post, and a tent, a caravan or a picnic table.
    const rng = new VH.RNG('willow-camp');
    const tentCols = [0x2f7a4a, 0xe86a2a, 0x2f5f9a, 0xd8c040, 0xc8402c, 0x6a4a8a, 0x3a8a8a];
    P.campCars = [];
    P.pitches = [];
    for (const px of P.pitchX) {
      const west = px < tx;
      const back = west ? px - 8.5 : px + 8.5, front = west ? px + 8 : px - 8;
      const rows = P.pitchZ.filter((pz) => (west ? Math.abs(pz - P.fire.z) >= 6 && Math.abs(pz - P.campWay) >= 6 : pz <= t.z0 - 8 || pz >= t.z1 + 8));
      // Hedges between the pitches and along the back (open to the track); none against the shower block.
      const lines = new Set();
      for (const pz of rows) for (const z of [pz - 8, pz + 8]) if (west || z < t.z0 - 1 || z > t.z1 + 1) lines.add(z);
      for (const z of lines) K.hedge(world, Math.min(back, front), z, Math.max(back, front), z, [], 1.2, 0.9, 0x3f6a30);
      for (const pz of rows) K.hedge(world, back, pz - 8.45, back, pz + 8.45, west ? [] : [[t.z0 - 0.6, t.z1 + 0.6]], 1.2, 0.9, 0x3f6a30);
      for (const pz of rows) {
        W().pave(world, px - 7, pz - 6.5, px + 7, pz + 6.5, 0xd8f4a8, 'grassTop', KERB + 0.02);
        P.pitches.push([px, pz]);
        // The hook-up post at the pitch's front corner.
        const hx = west ? px + 6.6 : px - 6.6, hz = pz - 6;
        const hc = world.ctxAt(hx, hz);
        hc.detail.box(hx - 0.14, KERB, hz - 0.14, hx + 0.14, KERB + 0.85, hz + 0.14, VH.col(0x3a6a3a));
        hc.screen.box(hx - 0.1, KERB + 0.86, hz - 0.1, hx + 0.1, KERB + 0.92, hz + 0.1, VH.col(0x9aff9a, 1.6));
        world.physics.addBox(hx - 0.15, 0, hz - 0.15, hx + 0.15, KERB + 0.92, hz + 0.15, 'pole', F().SOLID | F().SHOTS);
        const roll = rng.next();
        const yaw = west ? Math.PI / 2 : -Math.PI / 2; // doors face the track
        const col = rng.pick(tentCols);
        if (roll < 0.36) {
          tent(world, px - (west ? 1 : -1), pz + rng.range(-1.5, 1.5), yaw, col, false, rng.chance(0.5));
          campChair(world, px + (west ? 2.4 : -2.4), pz + 2.2, yaw + 0.4, rng.pick(tentCols));
        } else if (roll < 0.66) {
          tent(world, px, pz, yaw, col, true, rng.chance(0.4));
          if (rng.chance(0.6)) tent(world, px - (west ? 4 : -4), pz - 3.6, yaw, rng.pick(tentCols), true, false);
          windbreak(world, px - 5, pz + 4.5, px + 3, pz + 4.5, [col, 0xf2efe6]);
        } else if (roll < 0.86) {
          caravan(world, px - (west ? 0.5 : -0.5), pz, west ? 0 : Math.PI, rng.pick([0x2f6f9a, 0xc8402c, 0x2f7a4a, 0x8a6a48]));
          campChair(world, px + (west ? 2.6 : -2.6), pz - 1.5, yaw, rng.pick(tentCols));
          campChair(world, px + (west ? 2.6 : -2.6), pz + 0.2, yaw + 0.3, rng.pick(tentCols));
        } else {
          K.picnicTable(world, px, pz, 0, 0x8a6a48);
          tent(world, px - (west ? 4 : -4), pz + 2.5, yaw, col, true, false);
        }
        // A car on most pitches, between the pitch and the track.
        if (roll < 0.86 && rng.chance(0.7)) P.campCars.push({ x: west ? px + 10.5 : px - 10.5, z: pz + 1, h: rng.chance(0.5) ? 0 : Math.PI });
      }
    }
    buildCampfire(world);
  }

  /** The campfire circle at the end of the track: stones, a stack of logs with a glow, log seats, festoon lights on two posts. */
  function buildCampfire(world) {
    const K = C();
    const f = WL.fire;
    const ctx = world.ctxAt(f.x, f.z);
    ellipse(world, 'marks', f.x, f.z, 5.5, 5.5, 0, KERB + 0.025, VH.col(0xa4865c), 14);
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * Math.PI * 2;
      K.blob(ctx.detailMatte, f.x + Math.sin(a) * 0.95, KERB + 0.08, f.z + Math.cos(a) * 0.95, 0.22, 0.14, 0.2, VH.col(0x8a857a)); // solidity: passable (the fire's ring of stones, ankle-high)
    }
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      W().beam(ctx.detailWood, f.x + Math.sin(a) * 0.55, KERB + 0.05, f.z + Math.cos(a) * 0.55, f.x, KERB + 0.85, f.z, 0.11, VH.col(0x5a3a22));
    }
    K.blob(ctx.screen, f.x, KERB + 0.28, f.z, 0.42, 0.32, 0.42, VH.col(0xff8a2a, 2.4));
    world.physics.addBox(f.x - 0.6, 0, f.z - 0.6, f.x + 0.6, KERB + 0.88, f.z + 0.6, 'crate', F().SOLID);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      logSeat(world, f.x + Math.sin(a) * 3.4, f.z + Math.cos(a) * 3.4, a, 2.0);
    }
    for (const s of [-1, 1]) {
      const px = f.x + s * 6.2, pz = f.z - 1;
      ctx.wood.box(px - 0.08, KERB, pz - 0.08, px + 0.08, KERB + 3.0, pz + 0.08, VH.col(0x6b4a30));
      world.physics.addBox(px - 0.1, 0, pz - 0.1, px + 0.1, KERB + 3.0, pz + 0.1, 'pole', F().SOLID | F().SHOTS);
    }
    W().festoon(world, f.x - 6.2, KERB + 2.95, f.z - 1, f.x + 6.2, KERB + 2.95, f.z - 1, 0.6, [0xffd890, 0xff9a6a, 0xffe8b8], 1.2);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: f.x, z: f.z, r: 6, y: KERB + 0.03, strength: 0.6, tint: [1.3, 0.75, 0.4] });
  }

  /** Willows round the shore, woods along the lanes, trees between the cabins. */
  function buildLakeTrees(world) {
    const P = WL, L = P.lake;
    // Willows just outside the shore stones (in front of the path), their curtains over the water.
    const pts = lakeShore(L);
    for (const a of [0.42, 0.8, 2.3, 2.62, 2.95, 3.6, 4.1, 5.3, 5.62, 6.15]) {
      const p = pts[Math.round((a / (Math.PI * 2)) * pts.length) % pts.length];
      willow(world, p.x + p.nx * 2.4, p.z + p.nz * 2.4, 0.95 + ((a * 7) % 1) * 0.2);
    }
    const rng = new VH.RNG('willow-woods');
    const clear = (x, z) => {
      if (nearLake(L, x, z, 12)) return false;
      if (x > P.camp.x0 - 4) return false; // the campsite, the office and the car park
      if (z > P.lane.z0 - 4 && z < P.cabinPath + 4) return false; // the lane, the cabins and their path
      if (Math.abs(x - P.walk) < 4) return false;
      if (x > P.boathouse.x0 - 6 && x < P.boathouse.x1 + 3 && z < P.boathouse.z1 + 4) return false;
      if (z > L.z + L.rz + P.ring + 4 && z < L.z + L.rz + P.ring + 14 && x > -1540 && x < -1424) return false; // the picnic tables
      for (const s of P.paths) if (segDist(x, z, s[0], s[1], s[2], s[3]) < 3.5) return false;
      return true;
    };
    // The woods' floor: rougher, darker grass along the lanes (the lawns by the water stay mown).
    const e = P.edge, south = ringPt(Math.PI * 0.5)[1] + 8;
    for (const r of [[P.x0 + e, P.z0 + e, P.camp.x0 - 4, P.lane.z0 - 2], [P.x0 + e, P.lane.z1 + 2, P.x0 + e + 14, south], [P.x0 + e, south, P.camp.x0 - 4, P.z1 - e]]) {
      W().pave(world, r[0], r[1], r[2], r[3], 0xb4c494, 'grassTop', KERB + 0.012);
    }
    for (let x = P.x0 + 6; x < P.x1 - 5; x += 8) {
      for (let z = P.z0 + 6; z < P.z1 - 5; z += 8) {
        const jx = x + rng.range(-3, 3), jz = z + rng.range(-3, 3);
        const k = Math.sin(jx * 0.037 + 0.4) + Math.sin(jz * 0.029 + jx * 0.013) + rng.range(-0.5, 0.5);
        // Woods in the rough along the lanes; a few lone oaks on the lawns.
        const rough = jz < P.lane.z0 - 2 || jz > south || jx < P.x0 + e + 14;
        if ((rough ? k < -0.75 : k < 1.15) || !clear(jx, jz)) continue;
        world.addProp(rng.chance(0.55) ? 'treeB' : 'tree', jx, KERB, jz, rng.range(0, 6.28), rng.range(0.85, 1.2) * (rough ? 1 : 1.2));
      }
    }
    // A hedge of trees along Willow Lane behind the campsite.
    for (let z = P.camp.z0 + 4; z < P.z1 - 6; z += 13) world.addProp('treeB', P.x1 - 4.5, KERB, z, z, 1.0);
    for (let x = P.camp.x0 + 6; x < P.x1 - 8; x += 14) world.addProp('tree', x, KERB, P.z1 - 4.5, x, 1.0);
  }

  // -------------------------------------------------------- the solar farm
  const SO = {
    x0: -1582, x1: -1305, z0: 1477, z1: 1749,
    edge: 1.6,
    // The deer fence round the panels (the perimeter track runs just inside it).
    fence: { x0: -1577.5, x1: -1309.5, z0: 1481.5, z1: 1701 },
    spine: -1443, // the track up the middle, on the line of the drive in from South Coast Highway
    aisle: { z0: 1584, z1: 1598 }, // the inverter lane across the middle, its track down the middle
    halves: [[-1570, -1449], [-1437, -1317]], // the rows' ends, west and east of the spine
    blocks: [1584, 1694], // each block's first row has its front (low, south) edge here; the others step north
    rows: 11,
    pitch: 9,
    tilt: 25, // degrees: the panels lean back to face the midday sun, which crosses the south (+Z)
    slope: 4.2, // a table's depth up the slope: two panels, long side up
    low: 0.75, // its front edge above the grass
    module: 1.1, // one panel's width along the row
    watts: 400, // one panel at its best
    gate: { x0: -1450, x1: -1436 }, // the way in from South Coast Highway
    drive: { x0: -1447, x1: -1439 },
    track: { z0: 1701.6, z1: 1705.4 }, // the service track inside the fence; the compounds open off it
    battery: { x0: -1578, x1: -1526, z0: 1707, z1: 1744 },
    park: { x0: -1520, x1: -1468, z0: 1708, z1: 1744 },
    house: { x0: -1428, x1: -1404, z0: 1716, z1: 1729 }, // the Sunhouse, the visitor centre
    tower: { x0: -1428, x1: -1420, z0: 1706.5, z1: 1712.5, h: 4.4 }, // the viewing deck
    sub: { x0: -1398, x1: -1310, z0: 1707, z1: 1744 },
    weather: { x: -1458, z: 1586 },
    trail: 1737, // the Sun Trail footpath from the car park to the Sunhouse
    panels: 0, // counted as they are built
  };
  let PANEL = null;

  /** The front (low, south) edges of every row of tables: [zf, ...] for both blocks. */
  function solarRows() {
    const out = [];
    for (const z of SO.blocks) for (let i = 0; i < SO.rows; i++) out.push(z - i * SO.pitch);
    return out;
  }
  /** A table's depth on the ground (m). */
  function tableDepth() {
    return SO.slope * Math.cos((SO.tilt * Math.PI) / 180);
  }

  /**
   * One table of panels from x a to b, its front (low, south) edge on zf: a
   * dark glass face over a pale backing (drawn far off too), the panels'
   * frames, two rails and the legs (close up only). Solid from the ground to
   * its top edge unless solidToo is false. Returns how many panels it holds.
   */
  function panelTable(world, a, b, zf, base, solidToo) {
    const P = SO, t = (P.tilt * Math.PI) / 180, ct = Math.cos(t), st = Math.sin(t);
    const d = P.slope * ct, rise = P.slope * st, hs = P.slope / 2;
    const y0 = base === undefined ? KERB : base;
    const zc = zf - d / 2, yc = y0 + P.low + rise / 2, xc = (a + b) / 2, len = b - a;
    const ctx = world.ctxAt(xc, zc);
    W().tiltBox(ctx.prop, xc, yc + ct * 0.02, zc + st * 0.02, len, 0.03, P.slope, 0, t, PANEL.face);
    W().tiltBox(ctx.prop, xc, yc - ct * 0.025, zc - st * 0.025, len + 0.04, 0.05, P.slope + 0.04, 0, t, PANEL.back);
    // The frames: a line between every panel and one across the middle, just proud of the glass.
    const s = ctx.detail, off = 0.04, nrm = [0, ct, st];
    const at = (lx, q) => [lx, yc + ct * off - st * q, zc + st * off + ct * q];
    const strip = (lx0, lx1, q0, q1) => s.quad(at(lx0, q1), at(lx1, q1), at(lx1, q0), at(lx0, q0), nrm, PANEL.frame);
    const n = Math.max(1, Math.round(len / P.module));
    for (let k = 0; k <= n; k++) {
      const x = a + (len * k) / n;
      strip(Math.max(a, x - 0.02), Math.min(b, x + 0.02), -hs, hs);
    }
    for (const q of [-hs, -0.025, hs - 0.05]) strip(a, b, q, q + 0.05);
    // Two rails under the panels and the legs down to the grass.
    for (const q of [-0.3 * P.slope, 0.3 * P.slope]) {
      const y = yc - st * q - 0.1, z = zc + ct * q;
      s.box(a + 0.3, y - 0.07, z - 0.05, b - 0.3, y + 0.03, z + 0.05, PANEL.steel);
      const m = Math.max(1, Math.round((len - 0.6) / 5.8));
      for (let k = 0; k <= m; k++) {
        const x = a + 0.3 + ((len - 0.6) * k) / m;
        s.box(x - 0.05, y0, z - 0.05, x + 0.05, y - 0.07, z + 0.05, PANEL.steel, { skip: { top: true } });
      }
    }
    if (solidToo !== false) world.physics.addBox(a, 0, zf - d, b, y0 + P.low + rise + 0.06, zf, 'metal', F().ALL);
    return n * 2;
  }

  /** A deer fence on an axis-aligned line: timber posts and five wire strands, 2 m high (too tall to climb), with gaps. */
  function deerFence(world, x0, z0, x1, z1, gaps) {
    const K = C();
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const c = alongX ? z0 : x0;
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const post = VH.col(0x8a6a48), wire = VH.col(0x6a7076);
    for (const [p0, p1] of K.cut(a0, a1, gaps)) {
      K.pieces(p0, p1, 60, (a, b) => {
        const ctx = world.ctxAt(alongX ? (a + b) / 2 : c, alongX ? c : (a + b) / 2);
        const R = (q0, q1, cc0, cc1, ya, yb) => (alongX ? [q0, ya, cc0, q1, yb, cc1] : [cc0, ya, q0, cc1, yb, q1]);
        for (const y of [0.2, 0.6, 1.0, 1.45, 1.95]) ctx.detail.box(...R(a, b, c - 0.012, c + 0.012, KERB + y - 0.035, KERB + y + 0.035), wire);
        for (let p = a; p <= b + 0.01; p += 3.5) {
          const q = Math.min(p, b);
          ctx.detailWood.box(...R(q - 0.06, q + 0.06, c - 0.06, c + 0.06, KERB - 0.05, KERB + 2.05), post);
        }
      });
      const bx = alongX ? [p0, 0, c - 0.08, p1, KERB + 2.05, c + 0.08] : [c - 0.08, 0, p0, c + 0.08, KERB + 2.05, p1];
      world.physics.addBox(bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], 'fence', F().SOLID | F().CAMERA);
    }
  }

  /** A galvanised five-bar gate standing open: hinged at (x, z), pointing along yaw, len long. */
  function fiveBar(world, x, z, yaw, len) {
    const ctx = world.ctxAt(x, z);
    const col = VH.col(0xa8aeb4);
    const ex = x + Math.sin(yaw) * len, ez = z + Math.cos(yaw) * len;
    for (const y of [0.3, 0.55, 0.8, 1.05, 1.25]) W().beam(ctx.detail, x, KERB + y, z, ex, KERB + y, ez, 0.07, col);
    W().beam(ctx.detail, x, KERB + 0.3, z, ex, KERB + 1.25, ez, 0.07, col); // the brace
    for (const [px, pz] of [[x, z], [ex, ez]]) ctx.detail.box(px - 0.06, KERB, pz - 0.06, px + 0.06, KERB + 1.32, pz + 0.06, col);
    world.physics.addOrientedBox((x + ex) / 2, (z + ez) / 2, 0.08, len / 2 + 0.06, yaw, 0, KERB + 1.32, 'fence', F().SOLID | F().CAMERA);
  }

  /** A security camera on a green pole, looking along yaw. */
  function cctv(world, x, z, yaw) {
    const ctx = world.ctxAt(x, z);
    const pole = VH.col(0x5a6a5a);
    ctx.prop.cylinder(x, KERB, z, 0.09, 0.07, 6, 6, pole, true);
    roundCollider(world, x, z, 0.1, 0, KERB + 6);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    W().beam(ctx.prop, x, KERB + 5.8, z, x + fx * 0.6, KERB + 5.8, z + fz * 0.6, 0.06, pole);
    W().tiltBox(ctx.prop, x + fx * 0.75, KERB + 5.62, z + fz * 0.75, 0.22, 0.2, 0.5, yaw, 0.35, VH.col(0xeceee8));
  }

  /** An inverter: a white cabin on a concrete plinth, louvres down its long sides, a finned transformer at its east end. */
  function inverter(world, x, z, n, faceS) {
    const WN = W();
    const ctx = world.ctxAt(x, z);
    WN.pave(world, x - 4.6, z - 1.8, x + 4.8, z + 1.8, 0xb8b4ac, 'plazaTop', KERB + 0.016);
    WN.solid(world, ctx.prop, x - 4, KERB, z - 1.2, x + 1.2, KERB + 2.6, z + 1.2, 0xeef0ec, null, 'metal');
    ctx.prop.box(x - 4.1, KERB + 2.6, z - 1.3, x + 1.3, KERB + 2.72, z + 1.3, VH.col(0xc8ccc8)); // the roof's lip
    const louvre = VH.col(0x9aa0a6);
    for (const sz of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const lx = x - 3.5 + k * 1.15;
        ctx.detail.box(lx, KERB + 1.4, z + sz * 1.2 - 0.03, lx + 0.8, KERB + 2.2, z + sz * 1.2 + 0.03, louvre);
      }
    }
    WN.solid(world, ctx.prop, x + 1.8, KERB, z - 0.9, x + 3.8, KERB + 1.8, z + 0.9, 0x5f6f5f, null, 'metal');
    for (let k = -0.7; k <= 0.71; k += 0.35) ctx.detail.box(x + 3.8, KERB + 0.3, z + k - 0.04, x + 4.2, KERB + 1.6, z + k + 0.04, VH.col(0x56665a));
    world.physics.addBox(x + 3.8, 0, z - 0.8, x + 4.2, KERB + 1.6, z + 0.8, 'metal');
    for (const k of [-0.5, 0, 0.5]) ctx.prop.cylinder(x + 2.8 + k, KERB + 1.8, z, 0.1, 0.06, 0.6, 6, VH.col(0x8a5a3a), true);
    const fz = faceS ? 1 : -1, yaw = faceS ? 0 : Math.PI;
    VH.Landmarks.sign(world, { x: x - 1.4, y: KERB + 0.95, z: z + fz * 1.25, yaw, w: 1.6, h: 0.45, lines: ['INVERTER ' + n], style: 'info' });
    VH.Landmarks.sign(world, { x: x + 2.8, y: KERB + 1.15, z: z + fz * 0.95, yaw, w: 0.7, h: 0.5, lines: ['DANGER', 'High voltage'], style: 'brand', colors: { bg: ['#f2d22e', '#e0c018'], fg: '#1a1a1a' } });
  }

  /** The weather station: a mast with the wind cups and vane, the sun meter on its arm, a logger and a white louvred screen. */
  function weatherStation(world, x, z) {
    const K = C(), WN = W();
    const ctx = world.ctxAt(x, z);
    const grey = VH.col(0xb8bec4);
    K.ground(world, x - 3.5, z - 1.8, x + 3.5, z + 1.8, 'gravel', KERB + 0.014);
    ctx.prop.cylinder(x, KERB, z, 0.06, 0.05, 6, 6, grey, true);
    roundCollider(world, x, z, 0.08, 0, KERB + 6);
    W().beam(ctx.prop, x - 0.8, KERB + 5.9, z, x + 0.8, KERB + 5.9, z, 0.05, grey);
    ctx.prop.cylinder(x - 0.8, KERB + 5.9, z, 0.015, 0.015, 0.25, 4, grey, true);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.094;
      K.blob(ctx.prop, x - 0.8 + Math.cos(a) * 0.18, KERB + 6.15, z + Math.sin(a) * 0.18, 0.05, 0.05, 0.05, 0xf2f2ee);
    }
    W().tiltBox(ctx.prop, x + 0.8, KERB + 6.1, z, 0.04, 0.18, 0.5, Math.PI / 2, 0, VH.col(0x2a2d30));
    // The logger box and its little panel on the mast; the sun meter (a white dome) on an arm.
    WN.solid(world, ctx.prop, x - 0.25, KERB + 1.3, z + 0.06, x + 0.25, KERB + 1.9, z + 0.32, 0xd8dcd8, null, 'metal', F().SOLID | F().SHOTS);
    W().tiltBox(ctx.prop, x, KERB + 2.6, z + 0.35, 0.6, 0.03, 0.45, 0, 0.6, PANEL.face);
    W().beam(ctx.prop, x, KERB + 3.2, z, x + 0.6, KERB + 3.2, z, 0.04, grey);
    K.blob(ctx.prop, x + 0.6, KERB + 3.26, z, 0.07, 0.05, 0.07, 0xf8f8f4);
    // The Stevenson screen on its legs.
    const sx = x + 2, sz = z;
    WN.solid(world, ctx.prop, sx - 0.35, KERB + 0.9, sz - 0.3, sx + 0.35, KERB + 1.5, sz + 0.3, 0xf4f4f0, null, 'metal', F().SOLID | F().SHOTS);
    for (let k = 0; k < 4; k++) ctx.detail.box(sx - 0.36, KERB + 0.97 + k * 0.13, sz + 0.3, sx + 0.36, KERB + 1.02 + k * 0.13, sz + 0.33, VH.col(0xd8d8d2));
    for (const [lx, lz] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) ctx.detail.box(sx + lx - 0.03, KERB, sz + lz - 0.03, sx + lx + 0.03, KERB + 0.9, sz + lz + 0.03, VH.col(0xe8e8e4));
    world.physics.addBox(sx - 0.33, 0, sz - 0.28, sx + 0.33, KERB + 0.9, sz + 0.28, 'metal', F().SOLID | F().SHOTS);
    VH.Landmarks.sign(world, { x: sx, y: KERB + 1.2, z: sz - 0.32, yaw: Math.PI, w: 0.6, h: 0.35, lines: ['WEATHER STATION'], style: 'plaque' });
  }

  function buildSolar(world) {
    const K = C(), WN = W();
    const P = SO, e = P.edge;
    PANEL = { face: VH.col(0x1d3050), back: VH.col(0xc4c8cc), frame: VH.col(0x8894a6), steel: VH.col(0x8f969c) };
    K.ground(world, P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e, 'meadow', KERB + 0.002);
    world.addLawn(P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e);
    const Fn = P.fence;
    // Hedges along the lanes and the deer fence inside them; the field gate on the drive.
    K.hedge(world, P.x0 + e + 0.5, P.z0 + e + 0.5, P.x1 - e - 0.5, P.z0 + e + 0.5, [[P.x0 + 10, P.x0 + 18]], 1.5, 0.9);
    K.hedge(world, P.x0 + e + 0.5, P.z0 + e + 1, P.x0 + e + 0.5, P.z1 - e - 0.5, [], 1.5, 0.9);
    K.hedge(world, P.x1 - e - 0.5, P.z0 + e + 1, P.x1 - e - 0.5, Fn.z1, [], 1.5, 0.9);
    const fg = [[P.drive.x0 - 0.5, P.drive.x1 + 0.5]];
    deerFence(world, Fn.x0, Fn.z0, Fn.x1, Fn.z0, []);
    deerFence(world, Fn.x0, Fn.z1, Fn.x1, Fn.z1, fg);
    deerFence(world, Fn.x0, Fn.z0, Fn.x0, Fn.z1, []);
    deerFence(world, Fn.x1, Fn.z0, Fn.x1, Fn.z1, []);
    fiveBar(world, P.drive.x0 - 0.5, Fn.z1 - 0.25, -Math.PI / 2, 4.2); // swung back against the fence, clear of the track
    fiveBar(world, P.drive.x1 + 0.5, Fn.z1 - 0.25, Math.PI / 2, 4.2);
    for (let k = 0; k < 8; k++) WN.mark(world, P.drive.x0, Fn.z1 - 1.4 + k * 0.4, P.drive.x1, Fn.z1 - 1.24 + k * 0.4, 0x2a2d30, KERB + 0.03); // the cattle grid
    // The tracks: round the inside of the fence, up the spine, across the inverter lane.
    const tr = (x0, z0, x1, z1) => K.ground(world, x0, z0, x1, z1, 'gravel', KERB + 0.012);
    tr(Fn.x0 + 1, Fn.z0 + 1, Fn.x1 - 1, Fn.z0 + 6);
    tr(Fn.x0 + 1, Fn.z1 - 6, Fn.x1 - 1, Fn.z1 - 1);
    tr(Fn.x0 + 1, Fn.z0 + 6, Fn.x0 + 6, Fn.z1 - 6);
    tr(Fn.x1 - 6, Fn.z0 + 6, Fn.x1 - 1, Fn.z1 - 6);
    tr(P.spine - 3, Fn.z0 + 6, P.spine + 3, Fn.z1 - 6);
    tr(Fn.x0 + 6, (P.aisle.z0 + P.aisle.z1) / 2 - 2.5, Fn.x1 - 6, (P.aisle.z0 + P.aisle.z1) / 2 + 2.5);
    tr(P.drive.x0, Fn.z1 - 1, P.drive.x1, Fn.z1 + 0.6);
    // The panels: eleven rows a block, each half-row two tables with a walkway between.
    P.panels = 0;
    P.tables = [];
    for (const zf of solarRows()) {
      for (const [h0, h1] of P.halves) {
        const mid = (h0 + h1) / 2;
        for (const [a, b] of [[h0, mid - 2], [mid + 2, h1]]) {
          P.panels += panelTable(world, a, b, zf);
          P.tables.push([a, b, zf]);
        }
      }
    }
    // An inverter at each end of the walkways, on the lane across the middle.
    let n = 1;
    for (const [h0, h1] of P.halves) {
      const mid = (h0 + h1) / 2;
      inverter(world, mid + 1, P.aisle.z0 + 2.2, n++, false);
      inverter(world, mid + 1, P.aisle.z1 - 2.2, n++, true);
    }
    weatherStation(world, P.weather.x, P.weather.z);
    // Cameras on the fence's corners.
    cctv(world, Fn.x0 + 1.5, Fn.z0 + 1.5, Math.PI * 0.75);
    cctv(world, Fn.x1 - 1.5, Fn.z0 + 1.5, -Math.PI * 0.75);
    cctv(world, Fn.x0 + 1.5, Fn.z1 - 1.5, Math.PI * 0.25);
    cctv(world, Fn.x1 - 1.5, Fn.z1 - 1.5, -Math.PI * 0.25);
    // The flock that keeps the grass down: little groups grazing along the gaps between the rows.
    const rng = new VH.RNG('redwater-solar-sheep');
    const rows = solarRows(), d = tableDepth(), gap = P.pitch - d;
    const troughZ = P.blocks[1] - 4 * P.pitch + gap / 2;
    P.sheep = 0;
    for (let f = 0; f < 10; ) {
      const i = rng.int(0, rows.length - 1);
      if (i % P.rows === 0) continue; // (no gap south of a block's first row)
      f++;
      const [h0, h1] = rng.pick(P.halves);
      const cx = rng.range(h0 + 14, h1 - 14), n = rng.int(4, 8);
      for (let k = 0; k < n; k++) {
        const x = cx + (k - n / 2) * rng.range(2.2, 3.4), z = rows[i] + gap / 2 + rng.range(-1, 1);
        if (Math.abs(x - (P.spine + 6)) < 3 && Math.abs(z - troughZ) < 2) continue; // (the trough)
        K.animal(world, 'sheep', x, z, Math.PI / 2 + (rng.chance(0.5) ? Math.PI : 0) + rng.range(-0.3, 0.3), { color: rng.pick([0xf2eee4, 0xe8e2d4, 0xf6f2ea]), grazing: rng.chance(0.7) });
        P.sheep++;
      }
    }
    // A water trough for them by the spine.
    trough(world, P.spine + 6, troughZ, 0);
    buildSolarStrip(world);
    // The names: at the gate on South Coast Highway, and on the corner of Foundry Road and Westfield Road.
    WN.sign(world, { x: P.gate.x0 - 6, y: KERB + 2.4, z: P.z1 - e - 1.4, yaw: 0, w: 7, h: 1.6, lines: ['REDWATER SOLAR FARM', 'The Sunhouse · Sun Trail · Viewing tower'], style: 'brand', posts: true, colors: { bg: ['#1d3a5a', '#14304a'], fg: '#ffd84a' }, frame: 0xf2f2ee, twoSided: true });
    WN.sign(world, { x: P.x0 + 14, y: KERB + 1.8, z: P.z0 + e + 0.5, yaw: Math.PI, w: 4.4, h: 1.1, lines: ['REDWATER SOLAR FARM', 'Visitors: entrance on South Coast Highway'], style: 'park', posts: true });
    VH.Landmarks.sign(world, { x: P.spine + 6.5, y: KERB + 1.35, z: Fn.z1 + 0.12, yaw: 0, w: 2.6, h: 0.8, lines: ['SHEEP GRAZING', 'Drive slowly · Authorised vehicles only'], style: 'park' });
  }

  /** Along the highway: the battery store, the car park, the drive, the Sunhouse and its tower, the substation. */
  function buildSolarStrip(world) {
    const K = C(), WN = W();
    const P = SO, e = P.edge, Fn = P.fence;
    // The service track behind the fence, the drive and its gate on the highway.
    K.ground(world, Fn.x0, P.track.z0, Fn.x1, P.track.z1, 'gravel', KERB + 0.012);
    tarmac(world, P.drive.x0, P.track.z1, P.drive.x1, P.z1 - e - 6, KERB + 0.012);
    tarmac(world, P.gate.x0, P.z1 - e - 6, P.gate.x1, P.z1 - e, KERB + 0.012);
    for (let z = P.track.z1 + 2; z < P.z1 - e - 8; z += 6) WN.mark(world, P.spine - 0.07, z, P.spine + 0.07, z + 3, 0xf2f2ee, KERB + 0.022);
    // A low hedge along the highway (people can hop it), open at the gate and the footpath.
    const hz = P.z1 - e - 0.6;
    K.hedge(world, P.x0 + e + 1, hz, P.x1 - e - 0.5, hz, [[P.gate.x0 - 2, P.gate.x1 + 2], [-1418, -1414]], 1.1, 0.8);
    for (const z of [P.track.z1 + 3, P.track.z1 + 20, P.z1 - e - 8]) world.addProp('streetlight', P.drive.x0 - 1.2, KERB, z, Math.PI / 2, 1);
    buildBatteryStore(world);
    buildSolarPark(world);
    buildSunhouse(world);
    buildSolarTower(world);
    buildSolarSubstation(world);
  }

  /** The battery store: six white containers of batteries in a fenced gravel compound, a transformer and a kiosk. */
  function buildBatteryStore(world) {
    const K = C(), WN = W();
    const B = SO.battery;
    K.ground(world, B.x0, B.z0, B.x1, B.z1, 'gravel', KERB + 0.014);
    const gate = [B.x0 + 22, B.x0 + 30];
    WN.fence(world, B.x0, B.z0, B.x1, B.z0, [gate], 'chain', 2.4);
    WN.fence(world, B.x0, B.z1, B.x1, B.z1, [], 'chain', 2.4);
    WN.fence(world, B.x0, B.z0, B.x0, B.z1, [], 'chain', 2.4);
    WN.fence(world, B.x1, B.z0, B.x1, B.z1, [], 'chain', 2.4);
    const gc = world.ctxAt((gate[0] + gate[1]) / 2, B.z0);
    gc.prop.box(gate[0], KERB + 0.1, B.z0 - 0.06, gate[1], KERB + 2.2, B.z0 + 0.06, VH.col(0x7d838a));
    world.physics.addBox(gate[0], 0, B.z0 - 0.12, gate[1], KERB + 2.3, B.z0 + 0.12, 'fence', F().SOLID | F().CAMERA);
    WN.sign(world, { x: gate[1] + 4, y: KERB + 1.6, z: B.z0 - 0.3, yaw: Math.PI, w: 3.4, h: 0.9, lines: ['REDWATER BATTERY STORE', 'Danger of death · Keep out'], style: 'brand', posts: true, colors: { bg: ['#f2d22e', '#e0c018'], fg: '#1a1a1a' }, frame: 0x2b2f35 });
    for (const z0 of [B.z0 + 6, B.z0 + 19]) {
      for (const x0 of [B.x0 + 4, B.x0 + 19, B.x0 + 34]) batteryBox(world, x0, z0, x0 + 12, z0 + 2.5);
    }
    // The transformer that lifts their power onto the line, and the control kiosk.
    const tx = B.x0 + 8, tz = B.z1 - 6;
    const c = world.ctxAt(tx, tz);
    WN.pave(world, tx - 4, tz - 3, tx + 4, tz + 3, 0xb8b4ac, 'plazaTop', KERB + 0.016);
    WN.solid(world, c.prop, tx - 3, KERB, tz - 2, tx + 3, KERB + 3, tz + 2, 0x5f6f5f, null, 'metal');
    for (let k = -2.6; k <= 2.61; k += 0.52) c.detail.box(tx + k - 0.06, KERB + 0.3, tz - 2.6, tx + k + 0.06, KERB + 2.6, tz - 2, VH.col(0x56665a));
    world.physics.addBox(tx - 2.7, 0, tz - 2.6, tx + 2.7, KERB + 2.6, tz - 2, 'metal');
    for (const k of [-1.5, 0, 1.5]) c.prop.cylinder(tx + k, KERB + 3, tz, 0.22, 0.12, 1.4, 8, VH.col(0x8a5a3a), true);
    K.shed(world, { x0: B.x0 + 20, x1: B.x0 + 28, z0: B.z1 - 8, z1: B.z1 - 3 }, { h: 2.8, rise: 0.6, wall: 0xd8dcd8, roof: 0x5c5f63, axis: 'x', style: 1 });
    world.addProp('streetlight', B.x0 + 32, KERB, B.z1 - 4, Math.PI, 1);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: B.x0 + 26, z: B.z0 + 15, r: 14, y: KERB + 0.03, strength: 0.45 });
  }

  /** One battery container: white on a plinth, door seams and green status lights down its south side, coolers on its east end. */
  function batteryBox(world, x0, z0, x1, z1) {
    const WN = W();
    const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
    ctx.concrete.box(x0 + 0.1, KERB, z0 + 0.1, x1 - 0.1, KERB + 0.22, z1 - 0.1, VH.col(0xb4b0a8));
    WN.solid(world, ctx.prop, x0, KERB + 0.22, z0, x1, KERB + 3.0, z1, 0xf0f2f0, null, 'metal');
    const seam = VH.col(0xc0c4c4), led = VH.col(0x5cff8a, 2.4);
    for (let k = 1; k < 6; k++) {
      const x = x0 + (k * (x1 - x0)) / 6;
      ctx.detail.box(x - 0.025, KERB + 0.4, z1, x + 0.025, KERB + 2.8, z1 + 0.025, seam);
      ctx.screen.box(x - 0.6, KERB + 2.35, z1, x - 0.45, KERB + 2.5, z1 + 0.035, led);
    }
    // Two coolers on a stand at the east end.
    const cz = (z0 + z1) / 2;
    WN.solid(world, ctx.prop, x1, KERB + 0.5, z0 + 0.2, x1 + 0.8, KERB + 2.4, z1 - 0.2, 0xd8dcd8, null, 'metal', F().SOLID | F().SHOTS);
    for (const s of [-1, 1]) ctx.detail.box(x1 + 0.8, KERB + 1.0, cz + s * 0.55 - 0.45, x1 + 0.83, KERB + 1.9, cz + s * 0.55 + 0.45, VH.col(0x3a3f45));
    for (const z of [z0 + 0.3, z1 - 0.3]) ctx.detail.box(x1 + 0.6, KERB, z - 0.05, x1 + 0.7, KERB + 0.5, z + 0.05, VH.col(0x8f969c));
    world.physics.addBox(x1, 0, z0 + 0.2, x1 + 0.8, KERB + 0.5, z1 - 0.2, 'metal', F().SOLID | F().SHOTS);
  }

  /** The visitors' car park: tarmac, white bays, a hedge on the track side, lamps; the way in from the drive. */
  function buildSolarPark(world) {
    const K = C(), WN = W();
    const p = SO.park;
    tarmac(world, p.x0, p.z0, p.x1, p.z1, KERB + 0.012);
    tarmac(world, p.x1, p.z0 + 6, SO.drive.x0, p.z0 + 13, KERB + 0.012);
    const white = 0xf2f2ee;
    SO.bayRows = [];
    for (const [z, dir] of [[p.z0 + 1, 1], [p.z0 + 18, -1], [p.z0 + 18, 1], [p.z1 - 1, -1]]) {
      for (let x = p.x0 + 8.4; x <= p.x1 - 2.9; x += 2.7) WN.mark(world, x - 0.06, Math.min(z, z + dir * 5), x + 0.06, Math.max(z, z + dir * 5), white, KERB + 0.02);
      SO.bayRows.push({ z: z + dir * 2.5, h: dir > 0 ? Math.PI : 0, skip: [p.x0, p.x0 + 6] });
    }
    K.hedge(world, p.x0 - 1, p.z0 - 0.6, p.x1 + 0.5, p.z0 - 0.6, [], 1.1, 0.8);
    K.hedge(world, p.x0 - 0.6, p.z0, p.x0 - 0.6, p.z1, [], 1.1, 0.8);
    for (const x of [p.x0 + 18, p.x0 + 40]) world.addProp('streetlight', x, KERB, p.z0 + 18, 0, 1);
    world.addProp('bin', p.x1 - 1, KERB, p.z1 - 7, 0, 1);
  }

  /**
   * The Sunhouse: the visitor centre, timber with a glass front lit inside,
   * panels on its roof, a canopy over the door, the live-output counter; a
   * terrace with picnic tables and the Sun Trail's boards along the path.
   */
  function buildSunhouse(world) {
    const K = C(), WN = W();
    const H = SO.house, hx = (H.x0 + H.x1) / 2;
    const ctx = WN.building(world, H.x0, H.z0, H.x1, H.z1, 4.2, { wall: 0x9a7a52, roof: 0x5c5f63, style: 2, bay: 2.4, floorH: 4.2, ww: 0.9, wh: 0.78, parapet: 0.45, sides: { n: 'blank', e: 'blank' }, seed: 0.61 });
    // Its own panels on the roof (two rows, tilted at the sun).
    for (const zf of [H.z1 - 1.2, H.z1 - 7.4]) SO.panels += panelTable(world, H.x0 + 1.2, H.x1 - 1.2, zf, KERB + 4.2, false);
    // The glass doors (drawn on the front), and the canopy over them on two posts.
    ctx.prop.box(hx - 1.15, KERB, H.z1, hx + 1.15, KERB + 2.5, H.z1 + 0.04, VH.col(0x3a3f45));
    for (const x of [hx - 1.05, hx + 0.05]) ctx.prop.box(x, KERB + 0.1, H.z1 + 0.04, x + 1.0, KERB + 2.4, H.z1 + 0.06, VH.col(0x2a4a5a));
    for (const x of [hx - 0.25, hx + 0.15]) ctx.prop.box(x, KERB + 1.0, H.z1 + 0.06, x + 0.1, KERB + 1.15, H.z1 + 0.12, VH.col(0xd8dcd8)); // handles
    const cz = H.z1 + 2.6;
    ctx.wood.box(hx - 3.2, KERB + 2.9, H.z1, hx + 3.2, KERB + 3.1, cz, VH.col(0x6b5038), { bottom: true });
    for (const x of [hx - 2.9, hx + 2.9]) WN.solid(world, ctx.wood, x - 0.1, KERB, cz - 0.3, x + 0.1, KERB + 2.9, cz - 0.1, 0x6b5038, null, 'pole', F().SOLID | F().SHOTS);
    VH.Landmarks.sign(world, { x: hx, y: KERB + 3.6, z: H.z1 + 0.06, yaw: 0, w: 7.5, h: 0.9, lines: ['THE SUNHOUSE', 'Redwater Solar Farm visitor centre'], style: 'brand', colors: { bg: ['#1d3a5a', '#14304a'], fg: '#ffd84a' }, frame: 0xf2f2ee });
    // The live-output board by the door (lit), and the counter you ask at.
    ctx.screen.box(hx + 3.6, KERB + 1.2, H.z1, hx + 5.4, KERB + 2.3, H.z1 + 0.05, VH.col(0x3a6aa8, 1.6));
    ctx.screen.box(hx + 3.75, KERB + 1.7, H.z1 + 0.05, hx + 5.25, KERB + 2.0, H.z1 + 0.07, VH.col(0xffd84a, 2.2));
    world.interactables.push({ id: 'solar_output', kind: 'redwaterSolar', x: hx + 2, y: KERB + 1.2, z: H.z1 + 1.6, radius: 2.4, label: "Check the farm's output", what: 'output' });
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: hx, z: H.z1 + 3, r: 8, y: KERB + 0.03, strength: 0.7 });
    // The terrace and the footpath to it (across the drive from the car park), picnic tables, bins.
    WN.pave(world, H.x0 - 2, H.z1, H.x1 + 2, H.z1 + 9, 0xd4ccb8, 'plazaTop', KERB + 0.016);
    WN.pave(world, SO.park.x1, SO.trail - 1.4, SO.drive.x0, SO.trail + 1.4, 0xd4ccb8, 'plazaTop', KERB + 0.016);
    WN.pave(world, SO.drive.x1, SO.trail - 1.4, H.x0 - 2, SO.trail + 1.4, 0xd4ccb8, 'plazaTop', KERB + 0.016);
    for (let x = SO.drive.x0 + 0.5; x < SO.drive.x1 - 0.4; x += 1.2) WN.mark(world, x, SO.trail - 1.3, x + 0.6, SO.trail + 1.3, 0xf2f2ee, KERB + 0.022);
    WN.pave(world, -1417.5, H.z1 + 9, -1414.5, SO.z1 - SO.edge, 0xd4ccb8, 'plazaTop', KERB + 0.016);
    for (const [x, z] of [[H.x0 + 2.5, H.z1 + 6], [H.x0 + 7.5, H.z1 + 6.5], [H.x1 - 3, H.z1 + 6]]) K.picnicTable(world, x, z, 0, 0x8a6a48);
    world.addProp('bin', H.x1 + 1, KERB, H.z1 + 2, 0, 1);
    world.addProp('bench', H.x0 - 1, KERB, H.z1 + 4, Math.PI / 2, 1);
    world.floodlights.push({ x: hx, z: H.z1 + 7, r: 9, y: KERB + 0.03, strength: 0.5 });
    // The Sun Trail: three boards along the path from the car park.
    const boards = [
      ['SUN TRAIL 1 · SUNLIGHT TO KETTLE', 'Light knocks electrons loose in the panels', 'The inverters turn it into mains power'],
      ['SUN TRAIL 2 · SHEEP AND THE SUN', SO.sheep + ' sheep keep the grass short', 'They like the shade under the panels'],
      ['SUN TRAIL 3 · SAVING IT FOR LATER', 'Six containers of batteries by the gate', 'Lunchtime sunshine boils teatime kettles'],
    ];
    boards.forEach((lines, i) => WN.sign(world, { x: [SO.park.x1 + 4, SO.park.x1 + 11, SO.drive.x1 + 6][i], y: KERB + 1.6, z: SO.trail - 2.6, yaw: 0, w: 3.6, h: 1.2, lines, style: 'info', posts: true }));
  }

  /** The viewing tower: a timber deck 4.4 m up by the fence, stairs from the east, a viewer on a post. */
  function buildSolarTower(world) {
    const WN = W();
    const T = SO.tower, y = KERB + T.h;
    const ctx = world.ctxAt((T.x0 + T.x1) / 2, (T.z0 + T.z1) / 2);
    const wood = 0x8a6a48, dark = 0x6b5038;
    WN.deck(world, ctx.wood, T.x0, T.z0, T.x1, T.z1, y, wood, 'wood', 0.25);
    for (const x of [T.x0 + 0.15, (T.x0 + T.x1) / 2, T.x1 - 0.15]) {
      for (const z of [T.z0 + 0.15, T.z1 - 0.15]) {
        if (x === T.x1 - 0.15 && z === T.z1 - 0.15) continue; // (the stair lands there)
        WN.solid(world, ctx.wood, x - 0.13, KERB, z - 0.13, x + 0.13, y - 0.25, z + 0.13, dark, null, 'pole', F().SOLID | F().SHOTS);
        W().beam(ctx.wood, x, y - 1.4, z, x + (x < (T.x0 + T.x1) / 2 ? 0.9 : -0.9), y - 0.3, z, 0.1, dark);
      }
    }
    WN.stairs(world, ctx.wood, T.x1 + 8.4, T.z1 - 0.8, 'w', 8.4, 1.4, KERB, y, wood, { railHex: dark });
    WN.deckRails(world, T.x0, T.z0, T.x1, T.z1, y, [{ side: 'e', a0: T.z1 - 1.6, a1: T.z1 }], dark);
    // The viewer: a coin telescope on a post at the north rail.
    const vx = (T.x0 + T.x1) / 2, vz = T.z0 + 0.9;
    ctx.prop.cylinder(vx, y, vz, 0.07, 0.07, 1.05, 6, VH.col(0x2f5a3a), true);
    ctx.prop.box(vx - 0.18, y + 1.05, vz - 0.32, vx + 0.18, y + 1.35, vz + 0.18, VH.col(0x2f5a3a));
    world.physics.addBox(vx - 0.18, y, vz - 0.32, vx + 0.18, y + 1.35, vz + 0.18, 'metal', F().SOLID | F().SHOTS);
    world.interactables.push({ id: 'solar_viewer', kind: 'redwaterSolar', x: vx, y: y + 1.2, z: vz + 1.0, radius: 1.6, label: 'Look through the viewer', what: 'view' });
    // A lamp on the corner post for the evening, and a board at the foot of the stairs.
    WN.lamp(world, T.x0 + 0.15, T.z1 - 0.15, 0xfff1c8, 2.4, 0.3, y + 1.05);
    WN.sign(world, { x: T.x1 + 9.5, y: KERB + 1.3, z: T.z1 + 1.3, yaw: Math.PI / 2, w: 1.6, h: 0.5, lines: ['VIEWING TOWER'], style: 'park', posts: true });
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: T.x1 + 4, z: T.z1, r: 6, y: KERB + 0.03, strength: 0.45 });
  }

  /** The substation: a fenced gravel yard with three transformers, the gantries, switchgear and the control building. */
  function buildSolarSubstation(world) {
    const K = C(), WN = W();
    const S = SO.sub;
    K.ground(world, S.x0, S.z0, S.x1, S.z1, 'gravel', KERB + 0.014);
    const gate = [S.x1 - 20, S.x1 - 12];
    WN.fence(world, S.x0, S.z0, S.x1, S.z0, [gate], 'chain', 2.4);
    WN.fence(world, S.x0, S.z1, S.x1, S.z1, [], 'chain', 2.4);
    WN.fence(world, S.x0, S.z0, S.x0, S.z1, [], 'chain', 2.4);
    WN.fence(world, S.x1, S.z0, S.x1, S.z1, [], 'chain', 2.4);
    const gc = world.ctxAt((gate[0] + gate[1]) / 2, S.z0);
    gc.prop.box(gate[0], KERB + 0.1, S.z0 - 0.06, gate[1], KERB + 2.2, S.z0 + 0.06, VH.col(0x7d838a));
    world.physics.addBox(gate[0], 0, S.z0 - 0.12, gate[1], KERB + 2.3, S.z0 + 0.12, 'fence', F().SOLID | F().CAMERA);
    VH.Landmarks.sign(world, { x: gate[0] - 4, y: KERB + 1.6, z: S.z0 - 0.12, yaw: Math.PI, w: 3.2, h: 0.9, lines: ['DANGER OF DEATH', 'Keep out · Redwater substation'], style: 'brand', colors: { bg: ['#f2d22e', '#e0c018'], fg: '#1a1a1a' }, frame: 0x2b2f35 });
    VH.Landmarks.sign(world, { x: S.x0 + 20, y: KERB + 1.6, z: S.z1 + 0.12, yaw: 0, w: 3.2, h: 0.9, lines: ['DANGER OF DEATH', 'Keep out · Redwater substation'], style: 'brand', colors: { bg: ['#f2d22e', '#e0c018'], fg: '#1a1a1a' }, frame: 0x2b2f35 });
    // The control building in the south-west corner.
    const cb = { x0: S.x0 + 4, x1: S.x0 + 22, z0: S.z1 - 11, z1: S.z1 - 3 };
    WN.building(world, cb.x0, cb.z0, cb.x1, cb.z1, 3.6, { wall: 0xc8c0b0, roof: 0x6b6e72, style: 1, bay: 3.6, floorH: 3.6, ww: 0.35, wh: 0.4, parapet: 0.4 });
    WN.lamp(world, (cb.x0 + cb.x1) / 2, cb.z0 - 0.3, 0xfff1c8, 2.4, 0.2, KERB + 3.0);
    // Three transformers in a row, finned, with bushings, each in a low bund.
    for (let i = 0; i < 3; i++) {
      const tx = S.x0 + 12 + i * 18, tz = S.z0 + 11;
      const c = world.ctxAt(tx, tz);
      c.concrete.box(tx - 4.2, KERB, tz - 3.4, tx + 4.2, KERB + 0.3, tz + 3.4, VH.col(0xb4b0a8));
      WN.solid(world, c.prop, tx - 3, KERB + 0.3, tz - 2.2, tx + 3, KERB + 3.6, tz + 2.2, 0x6a7a6a, null, 'metal');
      for (let k = -2.6; k <= 2.61; k += 0.52) c.detail.box(tx + k - 0.06, KERB + 0.6, tz + 2.2, tx + k + 0.06, KERB + 3.2, tz + 2.9, VH.col(0x5a6a5a));
      world.physics.addBox(tx - 2.7, 0, tz + 2.2, tx + 2.7, KERB + 3.2, tz + 2.9, 'metal');
      world.physics.addBox(tx - 4.2, 0, tz - 3.4, tx + 4.2, KERB + 0.3, tz + 3.4, 'kerb', F().SOLID);
      for (const k of [-1.5, 0, 1.5]) c.prop.cylinder(tx + k, KERB + 3.6, tz, 0.22, 0.12, 1.6, 8, VH.col(0x8a5a3a), true);
    }
    // The switchgear: grey cabinets in a row.
    for (let x = S.x0 + 30; x < S.x0 + 52; x += 2.2) WN.solid(world, world.ctxAt(x, S.z1 - 8).prop, x, KERB, S.z1 - 9, x + 2, KERB + 2.3, S.z1 - 7.8, 0x9aa0a6, null, 'metal');
    // The gantries: steel goalposts the lines come in on, with their insulators.
    for (const gx of [S.x1 - 26, S.x1 - 8]) {
      const c = world.ctxAt(gx, S.z0 + 12);
      for (const gz of [S.z0 + 4, S.z0 + 20]) {
        c.prop.box(gx - 0.25, KERB, gz - 0.25, gx + 0.25, KERB + 10, gz + 0.25, VH.col(0x9aa0a6));
        world.physics.addBox(gx - 0.27, 0, gz - 0.27, gx + 0.27, KERB + 10, gz + 0.27, 'pole', F().SOLID | F().SHOTS);
      }
      c.prop.box(gx - 0.2, KERB + 9.6, S.z0 + 4, gx + 0.2, KERB + 10, S.z0 + 20, VH.col(0x9aa0a6));
      for (let gz = S.z0 + 6; gz < S.z0 + 19; gz += 3.5) c.prop.cylinder(gx, KERB + 8.2, gz, 0.15, 0.15, 1.4, 6, VH.col(0x8a5a3a), false);
    }
    // The lines from the gantries to the transformers.
    for (let k = 0; k < 3; k++) {
      const gz = S.z0 + 7.5 + k * 3.5;
      W().beam(world.ctxAt(S.x1 - 17, gz).prop, S.x1 - 26, KERB + 8.2, gz, S.x1 - 8, KERB + 8.2, gz, 0.04, 0x3a3f45);
      W().beam(world.ctxAt(S.x0 + 40, gz).prop, S.x0 + 48, KERB + 5.2, S.z0 + 11, S.x1 - 26, KERB + 8.2, gz, 0.04, 0x3a3f45);
    }
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: S.x0 + 30, z: S.z0 + 18, r: 16, y: KERB + 0.03, strength: 0.45 });
    world.floodlights.push({ x: S.x1 - 16, z: S.z0 + 18, r: 12, y: KERB + 0.03, strength: 0.4 });
    for (const x of [S.x0 + 28, S.x1 - 4]) world.addProp('streetlight', x, KERB, S.z1 - 2, Math.PI, 1);
  }

  // --------------------------------------------------- the recycling centre
  const RC = {
    x0: -863, x1: -647, z0: 1477, z1: 1749,
    edge: 1.6,
    // The public side: in from South Coast Highway at the west gate, up the ramp, along the skip deck, down and out at the east gate.
    inLane: { x0: -852, x1: -842 },
    outLane: { x0: -702, x1: -692 },
    deck: { x0: -822, x1: -722, z0: 1702, z1: 1714, h: 2.4 }, // the split-level deck; the skips stand below its north edge
    ramp: 20,
    skips: { n: 10, x0: -817, pitch: 9.6, z0: 1695.4, z1: 1701.6, h: 2.2 },
    shop: { x0: -832, x1: -806, z0: 1726, z1: 1737 }, // Second Chance, the re-use shop
    banks: { x: -786, z: 1727 }, // the bottle banks
    park: { x0: -764, x1: -712, z0: 1720, z1: 1744 },
    office: { x0: -860, x1: -854, z0: 1722, z1: 1734 },
    // The working side: the yard behind the skips, the sorting shed and its bales, the lorry depot, the weighbridge.
    yard: { z0: 1662, z1: 1702 },
    lorryIn: { z0: 1662, z1: 1674 }, // the lorries' way in from Tipper Lane, over the weighbridge
    shed: { x0: -822, x1: -740, z0: 1588, z1: 1640, h: 11 },
    bales: { x0: -732, x1: -696, z0: 1592, z1: 1640 },
    depot: { x0: -686, x1: -652, z0: 1566, z1: 1658 },
    // The far side: compost windrows and the push-wall bays.
    compost: { x0: -852, x1: -752, z: [1494, 1505, 1516, 1527, 1538, 1549], a: 3, h: 2.2 },
    bays: { x0: -742, x1: -655, z0: 1486, z1: 1556, wall: 3 },
  };

  /**
   * A long heap with a ridge along X (a compost windrow, a pile in a bay):
   * two slopes of textured earth that Jay can scramble up, solid as two ramps.
   */
  function heap(world, x0, x1, zc, a, h, hex, surf) {
    const sf = surf || 'asphaltTop', col = VH.col(hex, surf ? 1 : 4.5); // (earth on the asphalt texture; scrap and rubble flat-lit)
    const y0 = KERB, y1 = KERB + h;
    C().pieces(x0, x1, 60, (xa, xb) => {
      const s = world.ctxAt((xa + xb) / 2, zc)[sf];
      s.polygon([[xa, y0, zc + a], [xb, y0, zc + a], [xb, y1, zc], [xa, y1, zc]], col);
      s.polygon([[xb, y0, zc - a], [xa, y0, zc - a], [xa, y1, zc], [xb, y1, zc]], col);
    });
    world.ctxAt(x0, zc)[sf].polygon([[x0, y0, zc - a], [x0, y0, zc + a], [x0, y1, zc]], col);
    world.ctxAt(x1, zc)[sf].polygon([[x1, y0, zc + a], [x1, y0, zc - a], [x1, y1, zc]], col);
    const xc = (x0 + x1) / 2, L = (x1 - x0) / 2;
    world.physics.addRamp(xc, zc + a / 2, L, a / 2, Math.PI, 0, y0, y1, 'dirt', F().ALL);
    world.physics.addRamp(xc, zc - a / 2, L, a / 2, 0, 0, y0, y1, 'dirt', F().ALL);
  }
  /** Bits lying on a heap's slopes (planks, rubble, branches), each flat on the slope so no edge stands proud. */
  function heapBits(world, x0, x1, zc, a, h, hexes, n, seed) {
    const rng = new VH.RNG(seed);
    const ang = Math.atan2(h, a);
    for (let k = 0; k < n; k++) {
      const x = rng.range(x0 + 1, x1 - 1), t = rng.range(0.15, 0.85), side = rng.chance(0.5) ? 1 : -1;
      const z = zc + side * a * (1 - t), y = KERB + h * t;
      const ctx = world.ctxAt(x, z);
      W().tiltBox(ctx.propMatte, x, y + 0.02, z, rng.range(0.6, 2.2), 0.08, rng.range(0.3, 0.8), side > 0 ? 0 : Math.PI, ang + rng.range(-0.05, 0.05), VH.col(rng.pick(hexes))); // solidity: passable (flat on the slope)
    }
  }

  /** A roll-on skip: an open steel container, its load showing over the rim; a board with its name on the deck rail above. */
  function rollSkip(world, x, z0, z1, h, hex, load) {
    const ctx = world.ctxAt(x, (z0 + z1) / 2);
    const col = VH.col(hex), rim = VH.colMul(VH.col(hex), 0.75);
    const x0 = x - 1.3, x1 = x + 1.3;
    // Open-topped: four walls on a floor.
    ctx.prop.box(x0, KERB + 0.2, z0, x0 + 0.1, KERB + h, z1, col);
    ctx.prop.box(x1 - 0.1, KERB + 0.2, z0, x1, KERB + h, z1, col);
    ctx.prop.box(x0 + 0.1, KERB + 0.2, z0, x1 - 0.1, KERB + h, z0 + 0.1, col);
    ctx.prop.box(x0 + 0.1, KERB + 0.2, z1 - 0.1, x1 - 0.1, KERB + h, z1, col);
    ctx.prop.box(x0 - 0.06, KERB + h - 0.15, z0 - 0.06, x0 + 0.1, KERB + h, z1 + 0.06, rim); // the rim
    ctx.prop.box(x1 - 0.1, KERB + h - 0.15, z0 - 0.06, x1 + 0.06, KERB + h, z1 + 0.06, rim);
    ctx.prop.box(x0 + 0.1, KERB + h - 0.15, z0 - 0.06, x1 - 0.1, KERB + h, z0 + 0.1, rim);
    ctx.prop.box(x0 + 0.1, KERB + h - 0.15, z1 - 0.1, x1 - 0.1, KERB + h, z1 + 0.06, rim);
    for (const z of [z0 + 1.2, (z0 + z1) / 2, z1 - 1.2]) ctx.prop.box(x0 - 0.05, KERB + 0.3, z - 0.08, x1 + 0.05, KERB + h - 0.2, z + 0.08, rim); // ribs
    for (const xx of [x0 + 0.3, x1 - 0.3]) ctx.prop.box(xx - 0.12, KERB, z0 + 0.2, xx + 0.12, KERB + 0.2, z1 - 0.2, VH.col(0x2a2d30)); // runners
    // The load: a few lumps just under the rim in the load's colours (an empty spare skip shows its floor).
    const L = load;
    if (!L) {
      ctx.prop.box(x0 + 0.1, KERB + 0.2, z0 + 0.1, x1 - 0.1, KERB + 0.3, z1 - 0.1, VH.colMul(col, 0.6), { skip: { n: true, s: true, e: true, w: true } });
      // Hollow: four walls and the floor, so whatever lands inside sits on the floor.
      const ph = world.physics, yt = KERB + h, fl = F().ALL;
      ph.addBox(x0 - 0.06, 0, z0 - 0.06, x0 + 0.1, yt, z1 + 0.06, 'metal', fl);
      ph.addBox(x1 - 0.1, 0, z0 - 0.06, x1 + 0.06, yt, z1 + 0.06, 'metal', fl);
      ph.addBox(x0 + 0.1, 0, z0 - 0.06, x1 - 0.1, yt, z0 + 0.1, 'metal', fl);
      ph.addBox(x0 + 0.1, 0, z1 - 0.1, x1 - 0.1, yt, z1 + 0.06, 'metal', fl);
      ph.addBox(x0 + 0.1, 0, z0 + 0.1, x1 - 0.1, KERB + 0.3, z1 - 0.1, 'metal', fl);
      return;
    }
    ctx.propMatte.box(x0 + 0.1, KERB + 0.3, z0 + 0.1, x1 - 0.1, KERB + h - 0.12, z1 - 0.1, VH.col(L[0]), { skip: { n: true, s: true, e: true, w: true } });
    for (let k = 0; k < 4; k++) {
      const zz = z0 + 0.8 + k * ((z1 - z0 - 1.6) / 3);
      W().tiltBox(ctx.propMatte, x + (k % 2 ? 0.4 : -0.4), KERB + h - 0.05, zz, 0.9, 0.3, 1.0, k * 0.7, 0.2, VH.col(L[1 + (k % (L.length - 1))])); // solidity: passable (heaped just over the rim)
    }
    world.physics.addBox(x0 - 0.06, 0, z0 - 0.06, x1 + 0.06, KERB + h, z1 + 0.06, 'metal', F().ALL);
  }

  /** A bin lorry (or, with hook, a hook-lift lorry carrying a skip), parked facing yaw; solid. */
  function lorry(world, x, z, yaw, hex, hook) {
    const ctx = world.ctxAt(x, z), s = ctx.prop;
    const P = C().frame(x, z, yaw);
    const body = VH.col(hex || 0x2f7a3a), white = VH.col(0xf2f2ee), dark = VH.col(0x2a2d30);
    const ob = (f, r, hf, hr, y0, y1, c, surf) => {
      const [px, pz] = P(f, r);
      (surf || s).orientedBox(px, pz, hr, hf, yaw, y0, y1, c);
    };
    ob(-0.6, 0, 4.4, 0.55, KERB + 0.5, KERB + 1.0, dark); // the chassis
    ob(3.0, 0, 1.0, 1.25, KERB + 0.75, KERB + 3.0, white); // the cab
    ob(4.02, 0, 0.03, 1.1, KERB + 1.9, KERB + 2.75, VH.col(0x2a3a44)); // the windscreen
    for (const r of [-1, 1]) ob(3.2, r * 1.26, 0.6, 0.02, KERB + 1.9, KERB + 2.7, VH.col(0x2a3a44)); // side windows
    ob(3.0, 0, 1.02, 1.27, KERB + 0.75, KERB + 1.1, body); // a stripe along the cab's foot
    if (!hook) {
      ob(-1.2, 0, 2.9, 1.25, KERB + 1.0, KERB + 3.4, body); // the body
      ob(-4.35, 0, 0.3, 1.2, KERB + 0.7, KERB + 3.1, VH.colMul(body, 0.8)); // the tailgate
      ob(-4.75, 0, 0.12, 0.9, KERB + 0.7, KERB + 1.5, dark); // the bin lifter
    } else {
      ob(-1.3, 0, 2.9, 1.2, KERB + 1.05, KERB + 2.9, body); // the skip on its back
      ob(-1.3, 0, 2.95, 1.25, KERB + 2.75, KERB + 2.9, VH.colMul(body, 0.75));
      ob(1.75, 0, 0.15, 0.6, KERB + 1.0, KERB + 3.4, dark); // the hook arm
    }
    const tyre = VH.col(0x1b1d20);
    for (const f of [3.0, -1.2, -2.5]) {
      for (const r of [-1.05, 1.05]) {
        const [wx, wz] = P(f, r);
        C().wheel(s, wx, KERB + 0.5, wz, 0.5, 0.4, yaw, tyre);
      }
    }
    // Colliders fitted to the parts: the cab, the body (or the skip and the hook arm), the tailgate and lifter, the chassis.
    const box = (f, hf, hr, top) => {
      const [px, pz] = P(f, 0);
      world.physics.addOrientedBox(px, pz, hr, hf, yaw, 0, top, 'metal', F().ALL);
    };
    box(3.0, 1.05, 1.28, KERB + 3.0);
    box(-0.6, 4.4, 0.55, KERB + 1.0);
    if (!hook) {
      box(-1.2, 2.9, 1.25, KERB + 3.4);
      box(-4.35, 0.3, 1.2, KERB + 3.1);
      box(-4.75, 0.12, 0.9, KERB + 1.5);
    } else {
      box(-1.3, 2.95, 1.25, KERB + 2.9);
      box(1.8, 0.2, 0.6, KERB + 3.4);
    }
    if (!hook) {
      for (const side of [-1, 1]) {
        const [sx, sz] = P(-1.2, side * 1.27);
        VH.Landmarks.sign(world, { x: sx, y: KERB + 2.5, z: sz, yaw: yaw + side * Math.PI / 2, w: 4.6, h: 0.7, lines: ['REDWATER RECYCLING'], style: 'brand', colors: { bg: ['#2f7a3a', '#246030'], fg: '#ffffff' } });
      }
    }
  }

  /** A wheel loader, parked: yellow, a glass cab, its bucket down. Solid. */
  function loader(world, x, z, yaw) {
    const ctx = world.ctxAt(x, z), s = ctx.prop;
    const P = C().frame(x, z, yaw);
    const yel = VH.col(0xe0b12e), dark = VH.col(0x2a2d30);
    const ob = (f, r, hf, hr, y0, y1, c) => {
      const [px, pz] = P(f, r);
      s.orientedBox(px, pz, hr, hf, yaw, y0, y1, c);
    };
    ob(-0.9, 0, 1.5, 1.05, KERB + 0.8, KERB + 2.2, yel); // the engine
    ob(0.3, 0, 0.75, 0.85, KERB + 2.2, KERB + 3.5, VH.col(0x2a3a44)); // the glass cab
    ob(0.3, 0, 0.82, 0.9, KERB + 3.5, KERB + 3.65, yel);
    ob(1.5, 0, 0.6, 0.6, KERB + 0.8, KERB + 1.9, yel); // the front frame
    for (const r of [-0.7, 0.7]) {
      const [ax, az] = P(1.6, r), [bx, bz] = P(3.0, r);
      W().beam(s, ax, KERB + 1.9, az, bx, KERB + 0.9, bz, 0.22, yel); // the arms
    }
    ob(3.35, 0, 0.45, 1.45, KERB + 0.1, KERB + 1.2, VH.colMul(yel, 0.75)); // the bucket
    const tyre = VH.col(0x1b1d20);
    for (const f of [1.5, -1.3]) {
      for (const r of [-1.1, 1.1]) {
        const [wx, wz] = P(f, r);
        C().wheel(s, wx, KERB + 0.8, wz, 0.8, 0.55, yaw, tyre);
      }
    }
    const [bx, bz] = P(-0.2, 0), [kx, kz] = P(3.35, 0), [mx, mz] = P(2.5, 0);
    world.physics.addOrientedBox(bx, bz, 1.4, 2.3, yaw, 0, KERB + 3.65, 'metal', F().ALL);
    world.physics.addOrientedBox(mx, mz, 1.4, 0.4, yaw, 0, KERB + 1.6, 'metal', F().ALL);
    world.physics.addOrientedBox(kx, kz, 1.45, 0.45, yaw, 0, KERB + 1.2, 'metal', F().ALL);
  }

  /** A recycling bale: a pressed block with two straps. */
  function rbale(ctx, x0, y0, z0, hex) {
    const x1 = x0 + 1.5, z1 = z0 + 1.1, y1 = y0 + 1.05;
    ctx.propMatte.box(x0, y0, z0, x1, y1, z1, VH.col(hex), { bottom: y0 > KERB + 0.01 });
    for (const t of [0.3, 0.7]) {
      const x = x0 + (x1 - x0) * t;
      ctx.detail.box(x - 0.03, y0, z0 - 0.01, x + 0.03, y1 + 0.01, z1 + 0.01, VH.col(0x2a2d30));
    }
  }

  function buildRecycling(world) {
    const K = C(), WN = W();
    const P = RC, e = P.edge;
    // Concrete over the working side, tarmac on the public side, grass in the corners.
    K.ground(world, P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e, 'meadow', KERB + 0.002);
    world.addLawn(P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e);
    // (plaza tiles drawn big read as a yard's concrete slabs)
    WN.pave(world, P.x0 + e, P.yard.z0, P.x1 - e, P.yard.z1, 0xd0ccc4, 'plazaTop', KERB + 0.012, 16);
    WN.pave(world, P.x0 + e, P.compost.z[0] - P.compost.a - 4, P.x1 - e, P.yard.z0, 0xc8c2b6, 'plazaTop', KERB + 0.01, 16);
    // The fence round the working side: Tipper Lane, Foundry Road, Westgate Parkway; the lorry gate on Tipper Lane.
    const fx0 = P.x0 + e + 0.6, fx1 = P.x1 - e - 0.6, fz0 = P.z0 + e + 0.6, fzs = P.deck.z0 - 0.4;
    WN.fence(world, fx0, fz0, fx1, fz0, [], 'chain', 2.4);
    WN.fence(world, fx0, fz0, fx0, fzs, [[P.lorryIn.z0, P.lorryIn.z1]], 'chain', 2.4);
    WN.fence(world, fx1, fz0, fx1, fzs, [], 'chain', 2.4);
    // ... and between the working yard and the public side, either side of the deck (its north wall does the rest).
    WN.fence(world, fx0, fzs, P.deck.x0 - P.ramp, fzs, [], 'chain', 2.4);
    WN.fence(world, P.deck.x1 + P.ramp, fzs, fx1, fzs, [], 'chain', 2.4);
    buildTipDeck(world);
    buildTipVisitors(world);
    buildRecyclingYard(world);
    buildCompost(world);
    buildYardDressing(world);
    // The name at the way in on South Coast Highway, and on Westgate Parkway.
    WN.sign(world, { x: P.inLane.x1 + 9, y: KERB + 2.4, z: P.z1 - e - 1.4, yaw: 0, w: 7.5, h: 1.6, lines: ['REDWATER RECYCLING CENTRE', 'Household recycling · Re-use shop · Open daily'], style: 'brand', posts: true, colors: { bg: ['#2f7a3a', '#246030'], fg: '#ffffff' }, frame: 0xf2f2ee, twoSided: true });
    WN.sign(world, { x: P.x1 - e - 2.5, y: KERB + 2.2, z: 1610, yaw: Math.PI / 2, w: 6, h: 1.3, lines: ['REDWATER RECYCLING', 'Lorries: Tipper Lane · Public: South Coast Highway'], style: 'brand', posts: true, colors: { bg: ['#2f7a3a', '#246030'], fg: '#ffffff' }, frame: 0xf2f2ee });
  }

  /** The split-level deck: up the ramp, park by the rail, throw your junk down into the right skip; down the ramp and out. */
  function buildTipDeck(world) {
    const K = C(), WN = W();
    const P = RC, D = P.deck, y = KERB + D.h, e = P.edge;
    const tar = TARMAC, conc = VH.col(0xb8b4ac);
    // The lanes in and out from the highway, and the ramps.
    tarmac(world, P.inLane.x0, D.z0, P.inLane.x1, P.z1 - e, KERB + 0.012);
    tarmac(world, P.outLane.x0, D.z0, P.outLane.x1, P.z1 - e, KERB + 0.012);
    const rampUp = (xLow, xHigh) => {
      const xa = Math.min(xLow, xHigh), xb = Math.max(xLow, xHigh);
      const yl = KERB + 0.01, yh = y + 0.012;
      const at = (x) => yl + ((yh - yl) * (x - xLow)) / (xHigh - xLow);
      const ctx = world.ctxAt((xa + xb) / 2, (D.z0 + D.z1) / 2);
      const top = tar;
      // The slope (two halves so each sits in its chunk's builder), the side walls.
      ctx.asphaltTop.quad([xa, at(xa), D.z1], [xb, at(xb), D.z1], [xb, at(xb), D.z0], [xa, at(xa), D.z0], [0, 1, 0], top);
      ctx.concrete.polygon([[xa, KERB, D.z1], [xb, KERB, D.z1], [xb, at(xb) - 0.012, D.z1], [xa, at(xa) - 0.012, D.z1]], conc);
      ctx.concrete.polygon([[xb, KERB, D.z0], [xa, KERB, D.z0], [xa, at(xa) - 0.012, D.z0], [xb, at(xb) - 0.012, D.z0]], conc);
      const yaw = xHigh > xLow ? Math.PI / 2 : -Math.PI / 2;
      world.physics.addRamp((xa + xb) / 2, (D.z0 + D.z1) / 2, (D.z1 - D.z0) / 2, (xb - xa) / 2, yaw, 0, yl, yh, 'road', F().ALL);
      // Kerb rails up both sides.
      for (const z of [D.z0 + 0.15, D.z1 - 0.15]) {
        const c2 = world.ctxAt((xa + xb) / 2, z);
        W().beam(c2.prop, xLow, at(xLow) + 0.9, z, xHigh, at(xHigh) + 0.9, z, 0.08, 0xe8c040);
        for (let k = 0; k <= 4; k++) {
          const x = xLow + ((xHigh - xLow) * k) / 4;
          c2.prop.box(x - 0.05, at(x), z - 0.05, x + 0.05, at(x) + 0.9, z + 0.05, VH.col(0xe8c040));
        }
        world.physics.addRamp((xa + xb) / 2, z, 0.1, (xb - xa) / 2, yaw, 0, yl + 0.95, yh + 0.95, 'railing', F().SOLID | F().SHOTS);
      }
    };
    rampUp(D.x0 - P.ramp, D.x0);
    rampUp(D.x1 + P.ramp, D.x1);
    // The deck itself: a concrete-walled bank with tarmac on top.
    W().tiles(world, D.x0, D.z0, D.x1, D.z1, (xa, za, xb, zb, ctx) => {
      ctx.concrete.box(xa, KERB, za, xb, y, zb, conc, { skip: { top: true } });
      ctx.asphaltTop.topRect(xa, za, xb, zb, y + 0.012, tar, 6);
    });
    world.physics.addBox(D.x0, 0, D.z0, D.x1, y, D.z1, 'road', F().ALL);
    // The walkway along the north edge, bays for the cars, arrows down the lane.
    WN.mark(world, D.x0, D.z0 + 3, D.x1, D.z0 + 3.12, 0xf2c018, y + 0.022);
    for (let x = D.x0 + 2; x <= D.x1 - 2; x += 3.2) WN.mark(world, x - 0.06, D.z0 + 3.1, x + 0.06, D.z0 + 7.6, 0xf2f2ee, y + 0.022);
    for (let x = D.x0 + 8; x < D.x1 - 6; x += 18) WN.mark(world, x, D.z1 - 2.6, x + 3, D.z1 - 2.4, 0xf2f2ee, y + 0.022);
    // Rails: along the north edge over the skips (waist-high: you throw over it), along the south edge.
    const dc = world.ctxAt((D.x0 + D.x1) / 2, D.z0);
    for (let x = D.x0; x < D.x1 - 0.01; x += 25) {
      const xb = Math.min(D.x1, x + 25);
      VH.Landmarks.railing(world, world.ctxAt((x + xb) / 2, D.z0), x, D.z0 + 0.2, xb, D.z0 + 0.2, y, { color: 0xe8c040 });
      VH.Landmarks.railing(world, world.ctxAt((x + xb) / 2, D.z1), x, D.z1 - 0.2, xb, D.z1 - 0.2, y, { color: 0x3f454c });
    }
    // The skips below, each with its board on the rail.
    const KINDS = [
      ['GARDEN WASTE', 0x2f7a3a, [0x5a7a2e, 0x7a9a3a, 0x8a6a3a]],
      ['WOOD', 0x2f5a8a, [0x8a6a48, 0xa8845a, 0x6b4e33]],
      ['METAL', 0x8a3a2a, [0x8a9097, 0x9a5a2e, 0x6a7078]],
      ['CARDBOARD', 0x2f5a8a, [0xb8925a, 0xa88450, 0xc8a46a]],
      ['PAPER', 0x2f7a3a, [0xe8e4d8, 0xd8d4c8, 0x9ab0c8]],
      ['PLASTICS', 0xe0b12e, [0x3a7ac8, 0xe8e8e4, 0xc83a3a]],
      ['ELECTRICALS', 0x8a3a2a, [0x3a3f45, 0xe8e8e4, 0x6a7078]],
      ['TEXTILES', 0x7a3a8a, [0xc83a6a, 0x3a5ac8, 0xe8c040]],
      ['RUBBLE', 0x6a7078, [0x9a948a, 0xb8b4ac, 0x7a746a]],
      ['GENERAL WASTE', 0x3a3f45, [0x2a2d30, 0x4a4f55, 0x6a6458]],
    ];
    const S = P.skips;
    for (let k = 0; k < S.n; k++) {
      const x = S.x0 + k * S.pitch, [name, hex, load] = KINDS[k];
      rollSkip(world, x, S.z0, S.z1, S.h, hex, load);
      const css = '#' + hex.toString(16).padStart(6, '0');
      WN.sign(world, { x, y: y + 1.75, z: D.z0 + 0.3, yaw: 0, w: 2.6, h: 0.6, lines: [name], style: 'brand', posts: true, colors: { bg: [css, css], fg: hex === 0xe0b12e ? '#1a1a1a' : '#ffffff' } });
    }
    for (const x of [D.x0 + 30, D.x1 - 30]) world.interactables.push({ id: 'tip_skip_' + (x < -770 ? 'w' : 'e'), kind: 'redwaterTip', x, y: y + 1.2, z: D.z0 + 1.6, radius: 4, label: 'Get rid of your junk', what: 'skip' });
    // Lamps along the south rail, up on the deck.
    for (let x = D.x0 + 12; x < D.x1; x += 25) world.addProp('streetlight', x, y, D.z1 - 0.6, Math.PI, 1);
    VH.Landmarks.sign(world, { x: P.inLane.x0 - 1.7, y: KERB + 1.4, z: D.z1 + 2.5, yaw: 0, w: 2.4, h: 0.9, lines: ['ONE WAY', 'Up the ramp · 5 mph'], style: 'road', posts: true }); // beside the lane, not in it
    world.floodlights = world.floodlights || [];
    for (let x = D.x0 + 20; x < D.x1; x += 30) world.floodlights.push({ x, z: (D.z0 + D.z1) / 2, r: 12, y: y + 0.03, strength: 0.4 });
    // A hook-lift lorry in the yard below, about to swap a full skip.
    lorry(world, D.x0 + 40, P.yard.z1 - 12, 0, 0x2f7a3a, true);
  }

  /** The visitors' side by the highway: the re-use shop, the bottle banks, a car park, the site office, the hedge. */
  function buildTipVisitors(world) {
    const K = C(), WN = W();
    const P = RC, e = P.edge;
    // A low hedge along the highway, open at the two gates.
    const hz = P.z1 - e - 0.6;
    K.hedge(world, P.x0 + e + 0.5, hz, P.x1 - e - 0.5, hz, [[P.inLane.x0 - 1, P.inLane.x1 + 1], [P.outLane.x0 - 1, P.outLane.x1 + 1]], 1.1, 0.8);
    K.hedge(world, P.x0 + e + 0.5, P.deck.z0, P.x0 + e + 0.5, hz, [], 1.1, 0.8);
    K.hedge(world, P.x1 - e - 0.5, P.deck.z0, P.x1 - e - 0.5, hz, [], 1.1, 0.8);
    // Second Chance: the re-use shop, lit inside, with its finds out front.
    const S = P.shop, sx = (S.x0 + S.x1) / 2;
    const shc = K.shed(world, S, { h: 3.4, rise: 1.4, wall: 0x2f6a5a, roof: 0x5c5f63, axis: 'x', style: 1, sides: { n: 'blank', e: 'blank', w: 'blank', s: 'blank' } });
    // The shopfront: two lit display windows full of finds either side of a glass door, under a striped awning.
    {
      const zf = S.z1, frame = VH.col(0x1a3a2a), lit = VH.col(0xffe6b8, 1.15), shelf = VH.col(0x6b4e33);
      const rng = new VH.RNG('redwater-second-chance');
      const GOODS = [0xc83a3a, 0x3a5ac8, 0xe8c040, 0x2f7a3a, 0xe8e4d8, 0x8a6a48, 0x7a3a8a, 0xd87a2a, 0x3a3f45, 0x9ab0c8];
      for (const [wx0, wx1] of [[S.x0 + 2, sx - 1.6], [sx + 1.6, S.x1 - 2]]) {
        const y0 = KERB + 0.55, y1 = KERB + 2.3;
        shc.screen.box(wx0, y0, zf, wx1, y1, zf + 0.01, lit); // the lit room behind the glass
        for (const ys of [y0 + 0.5, y0 + 1.05]) {
          shc.prop.box(wx0, ys - 0.04, zf, wx1, ys, zf + 0.06, shelf); // a shelf, and what is on it
          for (let x = wx0 + 0.15; x < wx1 - 0.4; x += rng.range(0.35, 0.8)) {
            const gw = rng.range(0.18, 0.4), gh = rng.range(0.12, 0.42);
            shc.prop.box(x, ys, zf + 0.012, x + gw, ys + gh, zf + 0.05, VH.col(rng.pick(GOODS)));
          }
        }
        // Bigger things on the window floor: a lamp, a chair back, a guitar, a stack of crates.
        for (let x = wx0 + 0.4; x < wx1 - 0.8; x += rng.range(1.4, 2.2)) {
          const kind = rng.int(0, 3), c = VH.col(rng.pick(GOODS));
          if (kind === 0) { shc.prop.box(x, y0, zf + 0.012, x + 0.06, y0 + 0.4, zf + 0.04, frame); shc.prop.box(x - 0.15, y0 + 0.4, zf + 0.012, x + 0.21, y0 + 0.6, zf + 0.05, c); }
          else if (kind === 1) { shc.prop.box(x, y0, zf + 0.012, x + 0.5, y0 + 0.45, zf + 0.05, c); shc.prop.box(x, y0 + 0.45, zf + 0.012, x + 0.08, y0 + 0.75, zf + 0.05, c); shc.prop.box(x + 0.42, y0 + 0.45, zf + 0.012, x + 0.5, y0 + 0.75, zf + 0.05, c); }
          else if (kind === 2) { shc.prop.box(x, y0, zf + 0.012, x + 0.34, y0 + 0.35, zf + 0.05, c); shc.prop.box(x + 0.13, y0 + 0.35, zf + 0.012, x + 0.21, y0 + 0.85, zf + 0.05, frame); }
          else { for (let k = 0; k < 2; k++) shc.prop.box(x, y0 + k * 0.22, zf + 0.012, x + 0.45, y0 + k * 0.22 + 0.2, zf + 0.05, VH.col(0xa8845a)); }
        }
        // The frame and glazing bars.
        shc.prop.box(wx0 - 0.12, KERB, zf, wx1 + 0.12, y0, zf + 0.12, frame); // the stall riser
        shc.prop.box(wx0 - 0.12, y1, zf, wx1 + 0.12, y1 + 0.12, zf + 0.12, frame);
        for (let x = wx0; x <= wx1 + 0.01; x += (wx1 - wx0) / 4) shc.prop.box(x - 0.05, y0, zf, x + 0.05, y1, zf + 0.1, frame);
      }
      // The door: dark glass in a frame, with a push bar and an OPEN card.
      shc.prop.box(sx - 1.1, KERB, zf, sx + 1.1, KERB + 2.45, zf + 0.12, frame);
      shc.prop.box(sx - 0.95, KERB + 0.05, zf + 0.12, sx + 0.95, KERB + 2.3, zf + 0.14, VH.col(0x2a3a44));
      shc.screen.box(sx - 0.85, KERB + 0.15, zf + 0.12, sx + 0.85, KERB + 2.2, zf + 0.125, VH.col(0xffe6b8, 0.5));
      shc.prop.box(sx - 0.7, KERB + 1.0, zf + 0.14, sx + 0.7, KERB + 1.06, zf + 0.2, VH.col(0xb8bcc0));
      VH.Landmarks.sign(world, { x: sx + 0.45, y: KERB + 1.55, z: zf + 0.16, yaw: 0, w: 0.5, h: 0.22, lines: ['OPEN'], style: 'plaque' });
      // The awning: yellow and green stripes, sloping out over the pavement.
      const ay0 = KERB + 2.52, ay1 = KERB + 2.2, out = 1.3, ang = Math.atan2(ay0 - ay1, out);
      let k = 0;
      for (let x = S.x0 + 1.5; x < S.x1 - 1.5 - 0.01; x += 1, k++) {
        const xb = Math.min(S.x1 - 1.5, x + 1);
        W().tiltBox(shc.prop, (x + xb) / 2, (ay0 + ay1) / 2, zf + out / 2, xb - x, 0.05, Math.hypot(out, ay0 - ay1), 0, ang, VH.col(k % 2 ? 0x2f7a3a : 0xe8c040));
      }
      shc.prop.box(S.x0 + 1.5, ay1 - 0.2, zf + out - 0.03, S.x1 - 1.5, ay1, zf + out + 0.02, VH.col(0xe8c040)); // the valance
      world.physics.addBox(S.x0 + 1.5, ay1 - 0.2, zf, S.x1 - 1.5, ay0 + 0.05, zf + out + 0.02, 'awning', F().ALL);
    }
    VH.Landmarks.sign(world, { x: sx, y: KERB + 2.95, z: S.z1 + 0.08, yaw: 0, w: 7, h: 0.75, lines: ['SECOND CHANCE · RE-USE SHOP'], style: 'brand', colors: { bg: ['#e8c040', '#d8b030'], fg: '#1a3a2a' }, frame: 0x1a3a2a });
    WN.pave(world, S.x0 - 1, S.z1, S.x1 + 1, S.z1 + 4, 0xd4ccb8, 'plazaTop', KERB + 0.016);
    WN.pave(world, P.inLane.x1, S.z1 + 1, S.x0 - 1, S.z1 + 3.5, 0xd4ccb8, 'plazaTop', KERB + 0.016);
    world.interactables.push({ id: 'tip_shop', kind: 'redwaterTip', x: sx, y: KERB + 1.2, z: S.z1 + 1.5, radius: 2.4, label: 'Browse the re-use shop', price: 5, what: 'shop' });
    const fc = world.ctxAt(S.x0 + 4, S.z1 + 2);
    // A sofa, an armchair and a table out front (all solid, all for sale).
    const sofa = (x, z, w, hex) => {
      WN.solid(world, fc.detailMatte, x - w / 2, KERB, z - 0.45, x + w / 2, KERB + 0.45, z + 0.45, hex, null, 'bench', F().SOLID | F().SHOTS);
      fc.detailMatte.box(x - w / 2, KERB + 0.45, z - 0.45, x + w / 2, KERB + 0.95, z - 0.2, VH.col(hex));
      for (const s of [-1, 1]) fc.detailMatte.box(x + s * w / 2 - (s > 0 ? 0.2 : 0), KERB + 0.45, z - 0.45, x + s * w / 2 + (s < 0 ? 0.2 : 0), KERB + 0.7, z + 0.45, VH.col(hex));
      world.physics.addBox(x - w / 2, KERB + 0.45, z - 0.45, x + w / 2, KERB + 0.95, z - 0.2, 'bench', F().SOLID | F().SHOTS);
    };
    sofa(S.x0 + 3, S.z1 + 2.2, 2.0, 0x8a3a3a);
    sofa(S.x1 - 3, S.z1 + 2.2, 1.0, 0x3a5a8a);
    WN.solid(world, fc.detailWood, S.x1 - 6.5, KERB, S.z1 + 1.8, S.x1 - 5.3, KERB + 0.75, S.z1 + 2.6, 0x8a6a48, null, 'bench', F().SOLID | F().SHOTS);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: sx, z: S.z1 + 3, r: 8, y: KERB + 0.03, strength: 0.6 });
    // The bottle banks: green, brown and clear glass, cans, and a clothes bank, on a concrete pad.
    const B = P.banks;
    WN.pave(world, B.x - 9, B.z - 3, B.x + 9, B.z + 3, 0xb8b4ac, 'plazaTop', KERB + 0.016);
    const bc = world.ctxAt(B.x, B.z);
    [[0x2f7a3a, 'GREEN GLASS'], [0x7a4a2a, 'BROWN GLASS'], [0xe8ece8, 'CLEAR GLASS']].forEach(([hex, name], i) => {
      const x = B.x - 6 + i * 3.4;
      bc.prop.cylinder(x, KERB, B.z, 1.0, 0.6, 1.45, 10, VH.col(hex), true);
      bc.prop.cylinder(x, KERB + 1.45, B.z, 0.6, 0.15, 0.25, 10, VH.col(hex), true);
      bc.prop.box(x - 0.18, KERB + 1.05, B.z + 0.76, x + 0.18, KERB + 1.3, B.z + 0.82, VH.col(0x1a1a1a)); // the hole
      roundCollider(world, x, B.z, 0.95, 0, KERB + 0.8);
      roundCollider(world, x, B.z, 0.72, KERB + 0.8, KERB + 1.6);
      VH.Landmarks.sign(world, { x, y: KERB + 0.55, z: B.z + 1.02, yaw: 0, w: 1.3, h: 0.3, lines: [name], style: 'plaque' });
    });
    for (const [x, hex, name] of [[B.x + 4.5, 0xc83a3a, 'CANS'], [B.x + 7, 0x7a3a8a, 'CLOTHES & SHOES']]) {
      WN.solid(world, bc.prop, x - 0.9, KERB, B.z - 0.8, x + 0.9, KERB + 1.8, B.z + 0.8, hex, null, 'metal');
      bc.prop.box(x - 0.4, KERB + 1.2, B.z + 0.8, x + 0.4, KERB + 1.45, B.z + 0.84, VH.col(0x1a1a1a));
      VH.Landmarks.sign(world, { x, y: KERB + 0.7, z: B.z + 0.86, yaw: 0, w: 1.5, h: 0.35, lines: [name], style: 'plaque' });
    }
    world.interactables.push({ id: 'tip_bottles', kind: 'redwaterTip', x: B.x - 2.6, y: KERB + 1.2, z: B.z + 2.4, radius: 2.6, label: 'Recycle a bag of bottles', what: 'bottles' });
    // The car park, reached off the lane out.
    const p = P.park;
    tarmac(world, p.x0, p.z0, p.x1, p.z1, KERB + 0.012);
    tarmac(world, p.x1, p.z0 + 7, P.outLane.x0, p.z0 + 14, KERB + 0.012);
    P.bayRows = [];
    for (const [z, dir] of [[p.z0 + 1, 1], [p.z1 - 1, -1]]) {
      for (let x = p.x0 + 8.4; x <= p.x1 - 2.9; x += 2.7) WN.mark(world, x - 0.06, Math.min(z, z + dir * 5), x + 0.06, Math.max(z, z + dir * 5), 0xf2f2ee, KERB + 0.02);
      P.bayRows.push({ z: z + dir * 2.5, h: dir > 0 ? Math.PI : 0, skip: [p.x0, p.x0 + 6] });
    }
    for (const x of [p.x0 + 14, p.x0 + 38]) world.addProp('streetlight', x, KERB, p.z0 + 12, 0, 1);
    // The site office by the way in, and lamps down both lanes.
    const O = P.office;
    K.shed(world, O, { h: 2.7, rise: 0.4, wall: 0xd8dcd8, roof: 0x5c5f63, axis: 'z', style: 1, sides: { w: 'blank' } });
    VH.Landmarks.sign(world, { x: O.x1 + 0.08, y: KERB + 2.2, z: (O.z0 + O.z1) / 2, yaw: Math.PI / 2, w: 2.6, h: 0.5, lines: ['SITE OFFICE'], style: 'plaque' });
    for (const z of [P.deck.z1 + 6, P.deck.z1 + 24]) {
      world.addProp('streetlight', P.inLane.x0 - 1.2, KERB, z, Math.PI / 2, 1);
      world.addProp('streetlight', P.outLane.x1 + 1.2, KERB, z, -Math.PI / 2, 1);
    }
    world.addProp('bin', B.x + 9.5, KERB, B.z + 2, 0, 1);
    world.addProp('bench', (S.x1 + B.x) / 2 + 2, KERB, S.z1 + 3, Math.PI, 1);
  }

  /** The working yard: the weighbridge, the sorting shed and its bales, the bin lorries' depot, floodlight masts. */
  function buildRecyclingYard(world) {
    const K = C(), WN = W();
    const P = RC, e = P.edge;
    // The weighbridge on the lorries' way in from Tipper Lane, its cabin and a raised barrier.
    const L = P.lorryIn, wz = (L.z0 + L.z1) / 2, wx0 = P.x0 + e + 8, wx1 = wx0 + 18;
    WN.pave(world, wx0, wz - 1.8, wx1, wz + 1.8, 0x5a5f66, 'marks', KERB + 0.024);
    for (let x = wx0 + 1; x < wx1; x += 2) WN.mark(world, x, wz - 1.7, x + 0.05, wz + 1.7, 0x8a9097, KERB + 0.03);
    const cab = { x0: wx0 + 5, x1: wx0 + 12, z0: L.z0 - 7, z1: L.z0 - 3 };
    K.shed(world, cab, { h: 2.7, rise: 0.4, wall: 0xd8dcd8, roof: 0x5c5f63, axis: 'x', style: 1 });
    VH.Landmarks.sign(world, { x: (cab.x0 + cab.x1) / 2, y: KERB + 2.3, z: cab.z1 + 0.08, yaw: 0, w: 3, h: 0.5, lines: ['WEIGHBRIDGE'], style: 'plaque' });
    const bx = wx0 - 2, bzc = L.z0 + 0.4, gc = world.ctxAt(bx, bzc);
    WN.solid(world, gc.prop, bx - 0.25, KERB, bzc - 0.25, bx + 0.25, KERB + 1.1, bzc + 0.25, 0xe8c040, null, 'metal', F().SOLID | F().SHOTS);
    gc.prop.box(bx - 0.06, KERB + 1.1, bzc - 0.06, bx + 0.06, KERB + 5.6, bzc + 0.06, VH.col(0xf2f2ee)); // the boom, raised
    for (let k = 0; k < 4; k++) gc.prop.box(bx - 0.065, KERB + 1.6 + k * 1.1, bzc - 0.065, bx + 0.065, KERB + 2.1 + k * 1.1, bzc + 0.065, VH.col(0xd83a2a));
    gc.screen.box(bx - 0.1, KERB + 0.7, bzc + 0.25, bx + 0.1, KERB + 0.9, bzc + 0.27, VH.col(0x5cff8a, 2.2));
    VH.Landmarks.sign(world, { x: P.x0 + e + 3, y: KERB + 2, z: L.z1 + 1.2, yaw: -Math.PI / 2, w: 3.4, h: 0.9, lines: ['LORRIES ONLY', 'Stop on the weighbridge'], style: 'road', posts: true });
    // The sorting shed: green cladding, three roller doors onto the yard, the office at its west end.
    const S = P.shed;
    const sc = K.shed(world, S, { h: S.h, rise: 3, wall: 0x4f6f5f, roof: 0x8d9094, axis: 'x', style: 0 });
    for (const x of [S.x0 + 18, S.x0 + 41, S.x0 + 64]) {
      sc.prop.box(x - 3.5, KERB, S.z1, x + 3.5, KERB + 7, S.z1 + 0.08, VH.col(0x9aa0a6));
      for (let yy = KERB + 0.5; yy < KERB + 7; yy += 0.5) sc.detail.box(x - 3.5, yy, S.z1 + 0.08, x + 3.5, yy + 0.05, S.z1 + 0.1, VH.col(0x7a8086));
      sc.prop.box(x - 3.8, KERB + 7, S.z1, x + 3.8, KERB + 7.6, S.z1 + 0.3, VH.col(0x3a3f45)); // the door's head box
      world.floodlights = world.floodlights || [];
      world.floodlights.push({ x, z: S.z1 + 5, r: 8, y: KERB + 0.03, strength: 0.5 });
      WN.lamp(world, x, S.z1 + 0.4, 0xfff1c8, 2.4, 0.2, KERB + 7.7);
    }
    VH.Landmarks.sign(world, { x: S.x0 + 41, y: KERB + 9, z: S.z1 + 0.08, yaw: 0, w: 16, h: 1.6, lines: ['REDWATER RECYCLING · SORTING CENTRE'], style: 'brand', colors: { bg: ['#2f7a3a', '#246030'], fg: '#ffffff' } });
    WN.building(world, S.x0 - 10, S.z1 - 22, S.x0, S.z1 - 2, 6.8, { wall: 0xd8d4c8, roof: 0x6b6e72, style: 1, bay: 3.2, floorH: 3.4, ww: 0.5, wh: 0.5, sides: { e: 'skip' } });
    // A conveyor up the shed's east end from a hopper, over to the baler.
    const hx = S.x1 + 3, hz = S.z0 + 14, hc = world.ctxAt(hx, hz);
    WN.solid(world, hc.prop, hx - 2, KERB, hz - 2, hx + 2, KERB + 3, hz + 2, 0x5a6a5a, null, 'metal');
    hc.prop.box(hx - 2.4, KERB + 3, hz - 2.4, hx + 2.4, KERB + 4.2, hz + 2.4, VH.col(0x6a7a6a)); // the hopper's mouth
    world.physics.addBox(hx - 2.4, KERB + 3, hz - 2.4, hx + 2.4, KERB + 4.2, hz + 2.4, 'metal', F().ALL);
    W().beam(hc.prop, hx, KERB + 4.2, hz, S.x1 - 0.2, KERB + 9, hz, 0.9, VH.col(0x8a9097));
    // The bales, stacked by kind: paper, cardboard, cans, plastic bottles, plastic film.
    const B = P.bales, hexes = [0xe8e4d8, 0xb8925a, 0xaab0b6, 0x3a7ac8, 0xe8e8ee, 0xc8a46a];
    let n = 0;
    for (let x = B.x0; x + 1.5 <= B.x1; x += 4.5) {
      for (let z = B.z0; z + 1.1 <= B.z1; z += 1.2) {
        if (z > B.z0 + 18 && z < B.z0 + 24) continue; // a way through the stacks
        const hex = hexes[Math.round((x - B.x0) / 4.5) % hexes.length];
        const tall = 1 + ((Math.abs(Math.round(x * 3 + z * 7)) % 5) < 2 ? 2 : (Math.abs(Math.round(x + z)) % 3 ? 1 : 0));
        const ctx = world.ctxAt(x, z);
        for (let k = 0; k < tall; k++) rbale(ctx, x, KERB + k * 1.05, z, hex);
        world.physics.addBox(x, 0, z, x + 1.5, KERB + tall * 1.05, z + 1.1, 'crate', F().ALL);
        n++;
      }
    }
    // The depot: bin lorries parked in a row, a wash bay, a fuel pump.
    const Dp = P.depot;
    K.ground(world, Dp.x0, Dp.z0, Dp.x1, Dp.z1, 'gravel', KERB + 0.016);
    for (let i = 0; i < 6; i++) lorry(world, Dp.x0 + 10, Dp.z0 + 8 + i * 6.5, -Math.PI / 2, 0x2f7a3a, false);
    const wb = { x0: Dp.x1 - 14, x1: Dp.x1 - 2, z0: Dp.z1 - 24, z1: Dp.z1 - 8 };
    const wc = world.ctxAt((wb.x0 + wb.x1) / 2, (wb.z0 + wb.z1) / 2);
    for (const x of [wb.x0, wb.x1]) for (const z of [wb.z0, wb.z1]) WN.solid(world, wc.prop, x - 0.2, KERB, z - 0.2, x + 0.2, KERB + 5, z + 0.2, 0x9aa0a6, null, 'pole', F().SOLID | F().SHOTS);
    wc.prop.box(wb.x0 - 0.5, KERB + 5, wb.z0 - 0.5, wb.x1 + 0.5, KERB + 5.4, wb.z1 + 0.5, VH.col(0xd8dcd8), { bottom: true });
    VH.Landmarks.sign(world, { x: (wb.x0 + wb.x1) / 2, y: KERB + 4.6, z: wb.z1 + 0.6, yaw: 0, w: 4, h: 0.6, lines: ['WASH BAY'], style: 'plaque' });
    const px = Dp.x1 - 8, pz = Dp.z0 + 10, pc = world.ctxAt(px, pz);
    WN.pave(world, px - 3, pz - 2, px + 3, pz + 2, 0xb8b4ac, 'plazaTop', KERB + 0.02);
    WN.solid(world, pc.prop, px - 0.5, KERB + 0.1, pz - 0.35, px + 0.5, KERB + 1.9, pz + 0.35, 0x2f7a3a, null, 'metal');
    pc.screen.box(px - 0.3, KERB + 1.3, pz + 0.35, px + 0.3, KERB + 1.6, pz + 0.37, VH.col(0x9adcff, 1.6));
    // Floodlight masts over the yard.
    for (const [x, z] of [[P.x0 + 30, P.yard.z0 - 8], [-770, 1660], [-700, 1660], [-700, 1580]]) {
      const c = world.ctxAt(x, z);
      c.prop.cylinder(x, KERB, z, 0.22, 0.16, 14, 8, VH.col(0x8e959c), true);
      roundCollider(world, x, z, 0.23, 0, KERB + 14);
      c.prop.box(x - 1.2, KERB + 14, z - 0.35, x + 1.2, KERB + 14.9, z + 0.35, VH.col(0x3f454c));
      c.screen.box(x - 1.1, KERB + 13.98, z - 0.3, x + 1.1, KERB + 14.02, z + 0.3, VH.col(0xf6f2e0, 2.4));
      world.floodlights.push({ x, z, r: 24, y: KERB + 0.03, strength: 0.5 });
    }
  }

  /** The compost windrows and the push-wall bays of wood, rubble and green waste; a turner and two loaders. */
  function buildCompost(world) {
    const WN = W();
    const P = RC, Cp = P.compost;
    for (let i = 0; i < Cp.z.length; i++) {
      heap(world, Cp.x0, Cp.x1, Cp.z[i], Cp.a, Cp.h - (i % 3) * 0.2, i % 2 ? 0x5a4430 : 0x6b4f35);
      heapBits(world, Cp.x0, Cp.x1, Cp.z[i], Cp.a, Cp.h - (i % 3) * 0.2, [0x5a7a2e, 0x8a6a3a, 0x7a6a40], 30, 'redwater-compost-' + i);
    }
    // The turner straddling the third windrow: tracks in the gaps either side, the frame and cab over the top.
    const tx = -790, tz = Cp.z[2], tc = world.ctxAt(tx, tz), yel = 0xe0b12e;
    for (const s of [-1, 1]) {
      const z = tz + s * (Cp.a + 0.9);
      WN.solid(world, tc.prop, tx - 1.6, KERB, z - 0.45, tx + 1.6, KERB + 0.9, z + 0.45, 0x2a2d30, null, 'metal');
      WN.solid(world, tc.prop, tx - 0.4, KERB + 0.9, z - 0.3, tx + 0.4, KERB + 3.6, z + 0.3, yel, null, 'metal');
    }
    tc.prop.box(tx - 1.0, KERB + 3.6, tz - Cp.a - 1.3, tx + 1.0, KERB + 4.4, tz + Cp.a + 1.3, VH.col(yel), { bottom: true });
    world.physics.addBox(tx - 1.0, KERB + 3.6, tz - Cp.a - 1.3, tx + 1.0, KERB + 4.4, tz + Cp.a + 1.3, 'metal', F().ALL);
    tc.prop.box(tx - 0.9, KERB + 4.4, tz + Cp.a - 0.6, tx + 0.9, KERB + 6.0, tz + Cp.a + 1.2, VH.col(0x2a3a44));
    loader(world, Cp.x1 + 7, Cp.z[1] + 5.5, -Math.PI / 2);
    // The bays: concrete push walls, open to the south, each with its heap and its name.
    const B = P.bays, wall = VH.col(0xb8b4ac), bw = (B.x1 - B.x0) / 3;
    const piles = [['WOOD', 0x8a6a48, [0xa8845a, 0x6b4e33, 0x8a6a48]], ['RUBBLE', 0x8a847a, [0x9a948a, 0xb8b4ac, 0x6a645a]], ['GREEN WASTE', 0x5a6a30, [0x5a7a2e, 0x7a9a3a, 0x6b4e33]]];
    const wc = (x0, z0, x1, z1) => WN.solid(world, world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2).concrete, x0, KERB, z0, x1, KERB + B.wall, z1, wall, null, 'building');
    wc(B.x0, B.z0, B.x1, B.z0 + 0.6);
    for (let k = 0; k <= 3; k++) wc(B.x0 + k * bw - (k === 3 ? 0.6 : 0), B.z0 + 0.6, B.x0 + k * bw + (k === 3 ? 0 : 0.6), B.z1);
    piles.forEach(([name, hex, bits], k) => {
      const x0 = B.x0 + k * bw + 3, x1 = B.x0 + (k + 1) * bw - 3, zc = B.z0 + 18;
      heap(world, x0, x1, zc, 12, 4.2, hex, k === 1 ? 'propMatte' : undefined); // (rubble is pale; the wood chips and green waste dark)
      heapBits(world, x0, x1, zc, 12, 4.2, bits, 40, 'redwater-bay-' + k);
      VH.Landmarks.sign(world, { x: B.x0 + (k + 0.5) * bw, y: KERB + 2.2, z: B.z0 + 0.66, yaw: 0, w: 4.4, h: 0.8, lines: [name], style: 'brand', colors: { bg: ['#2f7a3a', '#246030'], fg: '#ffffff' } });
    });
    loader(world, B.x0 + bw * 1.5, B.z1 - 6, Math.PI);
  }

  /**
   * The rest of the working yard: the lorries' painted lane, keep-clear boxes at the shed doors, a row of spare skips,
   * the white-goods canopy, a scrap-metal heap, tyre stacks, pallets, an oil tank, and new wheelie bins at the depot.
   */
  function buildYardDressing(world) {
    const WN = W();
    const P = RC, e = P.edge, Y = KERB + 0.026, yel = 0xf2c018, white = 0xf2f2ee;
    // The lorries' lane from the weighbridge east to the depot: yellow edges, arrows pointing east.
    const L = P.lorryIn, lx0 = P.x0 + e + 28, lx1 = P.depot.x0 - 2, lzc = (L.z0 + L.z1) / 2;
    for (const z of [L.z0 + 0.25, L.z1 - 0.25]) WN.mark(world, lx0, z - 0.08, lx1, z + 0.08, yel, Y);
    for (let x = lx0 + 8; x < lx1 - 6; x += 24) {
      WN.mark(world, x, lzc - 0.15, x + 3, lzc + 0.15, white, Y);
      WN.mark(world, x + 3, lzc - 0.6, x + 3.4, lzc + 0.6, white, Y);
      WN.mark(world, x + 3.4, lzc - 0.3, x + 3.8, lzc + 0.3, white, Y);
    }
    // Keep-clear boxes in front of the shed's roller doors: an outline and yellow hatching.
    const S = P.shed;
    for (const x of [S.x0 + 18, S.x0 + 41, S.x0 + 64]) {
      const z0 = S.z1 + 0.4, z1 = S.z1 + 6.5;
      WN.mark(world, x - 4, z0, x + 4, z0 + 0.15, yel, Y);
      WN.mark(world, x - 4, z1 - 0.15, x + 4, z1, yel, Y);
      WN.mark(world, x - 4, z0, x - 3.85, z1, yel, Y);
      WN.mark(world, x + 3.85, z0, x + 4, z1, yel, Y);
      for (let xx = x - 3.2; xx < x + 3.4; xx += 1.1) WN.mark(world, xx, z0 + 0.6, xx + 0.35, z1 - 0.6, yel, Y);
    }
    // Spare skips waiting by the depot, empty.
    const SPARE = [0x2f7a3a, 0x2f5a8a, 0x8a3a2a, 0xe0b12e, 0x2f7a3a, 0x6a7078];
    SPARE.forEach((hex, k) => rollSkip(world, -712 + k * 3.6, 1680, 1686, 2.0, hex, null));
    VH.Landmarks.sign(world, { x: -704.8, y: KERB + 1.3, z: 1679.92, yaw: Math.PI, w: 2.8, h: 0.5, lines: ['EMPTIES'], style: 'plaque' });

    // The white-goods canopy: an open-sided steel roof over rows of old fridges, freezers and washing machines.
    const cv = { x0: -858, x1: -840, z0: 1598, z1: 1630, h: 4.6 };
    const cc = world.ctxAt((cv.x0 + cv.x1) / 2, (cv.z0 + cv.z1) / 2);
    for (const x of [cv.x0 + 0.3, cv.x1 - 0.3]) {
      for (let z = cv.z0 + 0.3; z <= cv.z1 - 0.29; z += (cv.z1 - cv.z0 - 0.6) / 4) WN.solid(world, cc.prop, x - 0.12, KERB, z - 0.12, x + 0.12, KERB + cv.h, z + 0.12, 0x2f6a5a, null, 'pole', F().SOLID | F().SHOTS);
    }
    cc.prop.box(cv.x0 - 0.4, KERB + cv.h, cv.z0 - 0.4, cv.x1 + 0.4, KERB + cv.h + 0.3, cv.z1 + 0.4, VH.col(0x8d9094), { bottom: true }); // the roof
    world.physics.addBox(cv.x0 - 0.4, KERB + cv.h, cv.z0 - 0.4, cv.x1 + 0.4, KERB + cv.h + 0.3, cv.z1 + 0.4, 'metal', F().ALL);
    cc.prop.box(cv.x1 + 0.4, KERB + cv.h - 0.5, cv.z0 - 0.4, cv.x1 + 0.5, KERB + cv.h + 0.3, cv.z1 + 0.4, VH.col(0x2f6a5a)); // the fascia
    world.physics.addBox(cv.x1 + 0.4, KERB + cv.h - 0.5, cv.z0 - 0.4, cv.x1 + 0.5, KERB + cv.h, cv.z1 + 0.4, 'metal', F().ALL);
    VH.Landmarks.sign(world, { x: cv.x1 + 0.52, y: KERB + cv.h - 0.1, z: (cv.z0 + cv.z1) / 2, yaw: Math.PI / 2, w: 9, h: 0.55, lines: ['FRIDGES · FREEZERS · WASHING MACHINES'], style: 'brand', colors: { bg: ['#2f7a3a', '#246030'], fg: '#ffffff' } });
    const WG = [0xeeeeea, 0xe8e4d6, 0xc8ccd0, 0xeeeeea, 0xf4f2ec, 0xb8bcc0, 0xeeeeea, 0xd8dcd8];
    const za = cv.z0 + 1, zb = cv.z1 - 1;
    // Against the back: tall fridges side by side, doors facing east.
    {
      const x0 = cv.x0 + 0.6, x1 = x0 + 0.7, h = 1.8;
      let i = 0;
      for (let z = za; z + 0.8 <= zb + 0.01; z += 0.8, i++) {
        cc.propMatte.box(x0, KERB, z, x1, KERB + h, z + 0.8, VH.col(WG[(i * 3) % WG.length]));
        cc.detail.box(x1, KERB + 1.15, z + 0.04, x1 + 0.015, KERB + 1.18, z + 0.76, VH.col(0x6a7078)); // the freezer door's edge
        cc.detail.box(x1, KERB + 1.25, z + 0.66, x1 + 0.04, KERB + 1.6, z + 0.7, VH.col(0x9aa0a6)); // the handle
      }
      world.physics.addBox(x0, 0, za, x1, KERB + h, za + i * 0.8, 'metal', F().ALL);
    }
    // Down the middle: chest freezers back to back.
    {
      const xm = (cv.x0 + cv.x1) / 2 - 1, h = 0.9;
      let i = 0;
      for (let z = za; z + 1.5 <= zb + 0.01; z += 1.5, i++) {
        for (const [a, b] of [[xm - 0.75, xm], [xm, xm + 0.75]]) {
          cc.propMatte.box(a, KERB, z, b, KERB + h, z + 1.5, VH.col(WG[(i + (a < xm ? 0 : 2)) % WG.length]));
          cc.detail.box(a - 0.01, KERB + h - 0.12, z + 0.04, b + 0.01, KERB + h - 0.1, z + 1.46, VH.col(0x6a7078)); // the lid's edge
        }
      }
      world.physics.addBox(xm - 0.75, 0, za, xm + 0.75, KERB + h, za + i * 1.5, 'metal', F().ALL);
    }
    // Along the front: washing machines stacked two high, their round doors facing the yard.
    {
      const x0 = cv.x1 - 4.2, x1 = x0 + 0.62, u = 0.85;
      let i = 0;
      for (let z = za; z + 0.62 <= zb + 0.01; z += 0.62, i++) {
        for (let k = 0; k < 2; k++) {
          const yb = KERB + k * u;
          cc.propMatte.box(x0, yb, z, x1, yb + u, z + 0.62, VH.col(WG[(i + k * 3) % WG.length]), { bottom: k > 0 });
          cc.detail.box(x1, yb + 0.2, z + 0.12, x1 + 0.02, yb + 0.58, z + 0.5, VH.col(0xb8bcc0)); // the door's rim
          cc.detail.box(x1 + 0.02, yb + 0.25, z + 0.17, x1 + 0.035, yb + 0.53, z + 0.45, VH.col(0x4a5a66)); // the glass
          cc.detail.box(x1, yb + 0.68, z + 0.08, x1 + 0.015, yb + 0.78, z + 0.54, VH.col(0x9aa0a6)); // the dials
        }
      }
      world.physics.addBox(x0, 0, za, x1, KERB + 2 * u, za + i * 0.62, 'metal', F().ALL);
    }

    // The scrap-metal heap in the loaders' apron, south of the bays, with its board.
    const Sx0 = P.x0 + e + 4, Sx1 = Sx0 + 30, Sz = 1571, Sa = 8, Sh = 3.6;
    heap(world, Sx0, Sx1, Sz, Sa, Sh, 0x7a726a, 'propMatte');
    heapBits(world, Sx0, Sx1, Sz, Sa, Sh, [0x8a9097, 0x9a5a2e, 0x6a7078, 0xb8bcc0, 0x7a4a2a], 70, 'redwater-scrap');
    VH.Landmarks.sign(world, { x: (Sx0 + Sx1) / 2, y: KERB + 1.6, z: Sz + Sa + 0.9, yaw: 0, w: 3.6, h: 0.7, lines: ['SCRAP METAL'], style: 'brand', posts: true, colors: { bg: ['#8a3a2a', '#7a3020'], fg: '#ffffff' } });
    // Tyre stacks.
    const tyre = VH.col(0x1b1d20), hole = VH.col(0x0c0d0e);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const x = Sx1 + 5 + i * 0.95, z = Sz - 4 + j * 0.95 + (i % 2) * 0.3, n = 4 + ((i * 5 + j * 3) % 4), c = world.ctxAt(x, z);
        for (let k = 0; k < n; k++) c.propMatte.cylinder(x, KERB + k * 0.24, z, 0.4, 0.4, 0.23, 12, tyre, true);
        c.detail.cylinder(x, KERB + n * 0.24 - 0.005, z, 0.2, 0.2, 0.012, 10, hole, true);
        roundCollider(world, x, z, 0.4, 0, KERB + n * 0.24 - 0.01);
      }
    }
    // Pallets, stacked.
    for (let i = 0; i < 4; i++) {
      const x0 = Sx1 + 11 + i * 1.5, z0 = Sz - 3 + (i % 2) * 1.6, n = 5 + (i * 3) % 6, c = world.ctxAt(x0, z0);
      for (let k = 0; k < n; k++) {
        const y = KERB + k * 0.15;
        c.detailWood.box(x0, y, z0, x0 + 1.2, y + 0.04, z0 + 1.0, VH.col(0xb08a5a), { bottom: k > 0 });
        for (const z of [z0, z0 + 0.45, z0 + 0.9]) c.detailWood.box(x0, y + 0.04, z, x0 + 1.2, y + 0.11, z + 0.1, VH.col(0x9a7448));
        c.detailWood.box(x0, y + 0.11, z0, x0 + 1.2, y + 0.15, z0 + 1.0, VH.col(0xb89462));
      }
      world.physics.addBox(x0, 0, z0, x0 + 1.2, KERB + n * 0.15, z0 + 1.0, 'crate', F().ALL);
    }
    // The waste-oil tank in its bund.
    const ox = Sx1 + 22, oz = Sz - 1, oc = world.ctxAt(ox, oz);
    const bund = (x0, z0, x1, z1) => WN.solid(world, oc.concrete, x0, KERB, z0, x1, KERB + 0.5, z1, 0xb8b4ac, null, 'kerb', F().SOLID | F().SHOTS);
    bund(ox - 2.2, oz - 2.2, ox + 2.2, oz - 2);
    bund(ox - 2.2, oz + 2, ox + 2.2, oz + 2.2);
    bund(ox - 2.2, oz - 2, ox - 2, oz + 2);
    bund(ox + 2, oz - 2, ox + 2.2, oz + 2);
    oc.prop.cylinder(ox, KERB, oz, 1.3, 1.3, 2.2, 14, VH.col(0x2f5a3a), true);
    roundCollider(world, ox, oz, 1.3, 0, KERB + 2.2);
    VH.Landmarks.sign(world, { x: ox, y: KERB + 1.5, z: oz + 1.32, yaw: 0, w: 1.6, h: 0.4, lines: ['WASTE OIL'], style: 'plaque' });

    // New wheelie bins at the depot, in rows by colour, waiting to go out to the houses.
    // (three blocks of ten per colour, a body tapering to the foot, a lid that overhangs, a handle bar and wheels)
    const BIN = [[0x2f6a3a, -662], [0x2f5a8a, -659.6], [0x3a3f45, -657.2]];
    for (const [hex, x0] of BIN) {
      const w = 0.66, x1 = x0 + 0.74, col = VH.col(hex), lid = VH.colMul(VH.col(hex), 0.78);
      for (let g = 0; g < 3; g++) {
        const z0 = 1594 + g * 7.6, n = 10, c = world.ctxAt(x0, z0 + 3);
        for (let i = 0; i < n; i++) {
          const z = z0 + i * w;
          c.propMatte.box(x0 + 0.1, KERB + 0.08, z + 0.1, x1 - 0.06, KERB + 0.3, z + w - 0.1, col);
          c.propMatte.box(x0 + 0.06, KERB + 0.3, z + 0.06, x1 - 0.04, KERB + 0.98, z + w - 0.06, col);
          c.prop.box(x0 + 0.02, KERB + 0.98, z + 0.04, x1, KERB + 1.04, z + w - 0.04, lid, { bottom: true });
          c.detail.box(x0, KERB + 0.86, z + 0.12, x0 + 0.06, KERB + 0.92, z + w - 0.12, lid); // the handle
          for (const zz of [z + 0.1, z + w - 0.16]) c.detail.box(x0 + 0.02, KERB, zz, x0 + 0.2, KERB + 0.16, zz + 0.06, VH.col(0x1b1d20)); // the wheels
        }
        world.physics.addBox(x0, 0, z0 + 0.04, x1, KERB + 1.04, z0 + n * w - 0.04, 'bin', F().ALL);
      }
    }
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      if (!layout.plots || !layout.plots.pelican_links || !layout.plots.redwater_ranch) return;
      const P = PL, R = o.R;
      const poly = (pts, col) => {
        g.fillStyle = col;
        g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.closePath();
        g.fill();
      };
      g.fillStyle = '#86b064';
      R(P.x0 + 1.6, P.z0 + 1.6, P.x1 - 1.6, P.z1 - 1.6);
      g.fillStyle = '#7aa85a';
      R(P.range.x0, P.range.z0, P.range.bays, P.range.z1);
      for (const H of P.holes) {
        if (H.w) {
          const w0 = H.w * 0.3, w1 = H.w * 0.5;
          const m = H.L / 2;
          poly([[H.tx + H.ux * 16 - H.rx * w0, H.tz + H.uz * 16 - H.rz * w0], [H.tx + H.ux * m - H.rx * w1, H.tz + H.uz * m - H.rz * w1], [H.gx - H.rx * w0, H.gz - H.rz * w0], [H.gx + H.rx * w0, H.gz + H.rz * w0], [H.tx + H.ux * m + H.rx * w1, H.tz + H.uz * m + H.rz * w1], [H.tx + H.ux * 16 + H.rx * w0, H.tz + H.uz * 16 + H.rz * w0]], '#a6d884');
        }
        C().mapEllipse(g, H.gx, H.gz, 14, 12, '#c4f09c');
        C().mapEllipse(g, H.tx, H.tz, 6, 6, '#b0e08c');
      }
      for (const p of P.ponds) C().mapEllipse(g, p.x, p.z, p.rx, p.rz, '#4f9ac8');
      W().mapBox(g, R, P.club.x0, P.club.z0, P.club.x1, P.club.z1, '#e8e4d8');
      W().mapBox(g, R, P.park.x0, P.park.z0, P.park.x1, P.park.z1, '#8a8a88', false);
      // Redwater Ranch: paddocks, tracks, the arena, the buildings.
      const Q = RR;
      g.fillStyle = '#8ab062';
      R(Q.x0 + 1.6, Q.z0 + 1.6, Q.x1 - 1.6, Q.z1 - 1.6);
      g.fillStyle = '#9cc070';
      for (let i = 0; i < Q.paddocks.z.length - 1; i++) R(Q.paddocks.x0, Q.paddocks.z[i], Q.paddocks.x1, Q.paddocks.z[i + 1] - 4);
      g.fillStyle = '#b89a6a';
      R(Q.drive.x0, Q.gate.z0, Q.x1, Q.gate.z1);
      R(Q.spur.x0, Q.spur.z0, Q.spur.x1, Q.gate.z0);
      R(Q.yard.x0, Q.yard.z0, Q.yard.x1, Q.yard.z1);
      W().mapBox(g, R, Q.arena.x0, Q.arena.z0, Q.arena.x1, Q.arena.z1, '#c4a070', false);
      W().mapBox(g, R, Q.park.x0, Q.park.z0, Q.park.x1, Q.park.z1, '#b4aa92', false);
      W().mapBox(g, R, Q.house.x0, Q.house.z0, Q.house.x1, Q.house.z1, '#6b3a22');
      W().mapBox(g, R, Q.stables.x0, Q.stables.z0, Q.stables.x1, Q.stables.z1, '#8a3a2a');
      W().mapBox(g, R, Q.hay.x0, Q.hay.z0, Q.hay.x1, Q.hay.z1, '#7a3a2a');
      C().mapEllipse(g, Q.pen.x, Q.pen.z, Q.pen.r, Q.pen.r, '#d8c08a');
      // Willow Lake: the lake and its path, the island, the cabins, the campsite.
      if (!layout.plots.willow_lake) return;
      const Wl = WL, Lk = Wl.lake;
      g.fillStyle = '#88b062';
      R(Wl.x0 + 1.6, Wl.z0 + 1.6, Wl.x1 - 1.6, Wl.z1 - 1.6);
      const shore = lakeShore(Lk);
      g.strokeStyle = '#c4b898';
      g.lineWidth = 2.6;
      g.beginPath();
      shore.forEach((q, i) => (i ? g.lineTo(q.x + q.nx * Wl.ring, q.z + q.nz * Wl.ring) : g.moveTo(q.x + q.nx * Wl.ring, q.z + q.nz * Wl.ring)));
      g.closePath();
      g.stroke();
      poly(shore.map((q) => [q.x, q.z]), '#4f9ac8');
      C().mapEllipse(g, Wl.island.x, Wl.island.z, Wl.island.rx, Wl.island.rz, '#7aa85a');
      g.fillStyle = '#b4aa92';
      R(Wl.lane.x0, Wl.lane.z0, Wl.park.x0, Wl.lane.z1);
      R(Wl.camp.track - 3, Wl.park.z1, Wl.camp.track + 3, Wl.camp.z1 - 8);
      W().mapBox(g, R, Wl.park.x0, Wl.park.z0, Wl.park.x1, Wl.park.z1, '#a8a08c', false);
      g.fillStyle = '#a4c87c';
      for (const [px, pz] of Wl.pitches || []) R(px - 7, pz - 6, px + 7, pz + 6);
      for (const x of Wl.cabins.xs) W().mapBox(g, R, x - Wl.cabins.w / 2, Wl.cabins.z0, x + Wl.cabins.w / 2, Wl.cabins.z1, '#7a4e2e');
      for (const b of [Wl.boathouse, Wl.office]) W().mapBox(g, R, b.x0, b.z0, b.x1, b.z1, '#5a6a52');
      W().mapBox(g, R, Wl.toilets.x0, Wl.toilets.z0, Wl.toilets.x1, Wl.toilets.z1, '#e8e0cc');
      if (Wl.jetty) {
        const J = Wl.jetty;
        const [ax, az] = J.P(0, 0), [bx, bz] = J.P(J.len, 0);
        g.strokeStyle = '#a8885c';
        g.lineWidth = J.w;
        g.beginPath();
        g.moveTo(ax, az);
        g.lineTo(bx, bz);
        g.stroke();
      }
    });
  }

  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      if (!layout.plots || !layout.plots.redwater_solar || !SO.tables) return;
      const P = SO, R = o.R, Fn = P.fence, d = tableDepth();
      // Redwater Solar Farm: the rows of panels, the tracks, the compounds and the Sunhouse.
      g.fillStyle = '#8ab062';
      R(P.x0 + 1.6, P.z0 + 1.6, P.x1 - 1.6, P.z1 - 1.6);
      g.fillStyle = '#c8c2b4';
      R(Fn.x0 + 1, Fn.z0 + 1, Fn.x1 - 1, Fn.z1 - 1);
      g.fillStyle = '#8ab062';
      R(Fn.x0 + 6, Fn.z0 + 6, Fn.x1 - 6, Fn.z1 - 6);
      g.fillStyle = '#c8c2b4';
      R(P.spine - 3, Fn.z0 + 6, P.spine + 3, Fn.z1);
      R(Fn.x0 + 6, (P.aisle.z0 + P.aisle.z1) / 2 - 2.5, Fn.x1 - 6, (P.aisle.z0 + P.aisle.z1) / 2 + 2.5);
      R(Fn.x0, P.track.z0, Fn.x1, P.track.z1);
      g.fillStyle = '#2c4472';
      for (const [a, b, zf] of P.tables) R(a, zf - d, b, zf);
      g.fillStyle = '#9a9a96';
      R(P.drive.x0, P.track.z1, P.drive.x1, P.z1 - 1.6);
      W().mapBox(g, R, P.park.x0, P.park.z0, P.park.x1, P.park.z1, '#8a8a88', false);
      for (const c of [P.battery, P.sub]) W().mapBox(g, R, c.x0, c.z0, c.x1, c.z1, '#b4aea0', false);
      W().mapBox(g, R, P.house.x0, P.house.z0, P.house.x1, P.house.z1, '#2c4472');
      W().mapBox(g, R, P.tower.x0, P.tower.z0, P.tower.x1, P.tower.z1, '#8a6a48');
    });
    VH.MapPainters.push((g, layout, o) => {
      if (!layout.plots || !layout.plots.redwater_recycling || !RC.built) return;
      const P = RC, R = o.R, e = P.edge;
      // Redwater Recycling Centre: concrete yards, the deck and its lanes, the shed, the windrows and bays.
      g.fillStyle = '#8ab062';
      R(P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e);
      g.fillStyle = '#c8c4bc';
      R(P.x0 + e, P.compost.z[0] - P.compost.a - 4, P.x1 - e, P.yard.z1);
      g.fillStyle = '#9a9a96';
      R(P.inLane.x0, P.deck.z0, P.inLane.x1, P.z1 - e);
      R(P.outLane.x0, P.deck.z0, P.outLane.x1, P.z1 - e);
      R(P.deck.x0 - P.ramp, P.deck.z0, P.deck.x1 + P.ramp, P.deck.z1);
      g.fillStyle = '#6b5038';
      for (const z of P.compost.z) R(P.compost.x0, z - P.compost.a, P.compost.x1, z + P.compost.a);
      g.fillStyle = '#9a8a6a';
      const bw = (P.bays.x1 - P.bays.x0) / 3;
      for (let k = 0; k < 3; k++) R(P.bays.x0 + k * bw + 3, P.bays.z0 + 6, P.bays.x0 + (k + 1) * bw - 3, P.bays.z0 + 30);
      W().mapBox(g, R, P.park.x0, P.park.z0, P.park.x1, P.park.z1, '#8a8a88', false);
      W().mapBox(g, R, P.shed.x0, P.shed.z0, P.shed.x1, P.shed.z1, '#4f6f5f');
      W().mapBox(g, R, P.shop.x0, P.shop.z0, P.shop.x1, P.shop.z1, '#2f6a5a');
      W().mapBox(g, R, P.bales.x0, P.bales.z0, P.bales.x1, P.bales.z1, '#b4aa92', false);
      g.fillStyle = '#2f7a3a';
      for (let k = 0; k < P.skips.n; k++) R(P.skips.x0 + k * P.skips.pitch - 1.3, P.skips.z0, P.skips.x0 + k * P.skips.pitch + 1.3, P.skips.z1);
    });
  }

  // --------------------------------------------------------- moving parts
  /** The counters (lemonade at the club) and the driving range's ball machine; parked cars at the club. */
  class RedwaterLife {
    constructor(game) {
      this.game = game;
      const WN = W();
      this.saveKey = 'redwater';
      this.best = 0; // the longest drive at the range (m)
      this.tip = { loads: 0, bottles: 0, finds: 0 }; // the recycling centre: loads over the rail, bags of bottles, shop finds
      if (game.interaction && game.interaction.on) {
        game.interaction.on('redwaterBuy', (item, player) => {
          if (player.money < item.price) {
            VH.events.emit('notify', { title: 'Not enough cash', text: VH.util.formatMoney(item.price) + ', please.', icon: '✕', tone: 'bad' });
            return 1;
          }
          player.money -= item.price;
          const before = player.health;
          if (item.heal) player.heal(item.heal);
          VH.events.emit('money:changed', { delta: -item.price, reason: 'Redwater' });
          const gained = Math.round(player.health - before);
          const LINES = { lemonade: ['Pink lemonade', 'Ice-cold, on the terrace. '], corndog: ['A corn dog', 'With mustard, rodeo style. '], smores: ['Toasted marshmallows', 'Squashed between biscuits, still gooey. '] };
          const [title, text] = LINES[item.what] || ['Thanks!', ''];
          VH.events.emit('notify', { title, text: text + (item.heal ? (gained > 0 ? '+' + gained + ' health' : 'You were already feeling fine.') : ''), icon: { corndog: '🌭', smores: '🔥' }[item.what] || '🍋' });
          return 1.5;
        });
        game.interaction.on('redwaterRange', (item, player) => {
          if (player.money < item.price) {
            VH.events.emit('notify', { title: 'Not enough cash', text: 'A bucket of balls is ' + VH.util.formatMoney(item.price) + '.', icon: '✕', tone: 'bad' });
            return 1;
          }
          player.money -= item.price;
          VH.events.emit('money:changed', { delta: -item.price, reason: 'Pelican Links' });
          // Fifty balls: the best of them, a little better with practice.
          let top = 0;
          for (let i = 0; i < 50; i++) top = Math.max(top, 120 + Math.random() * 90 + Math.min(40, this.best * 0.05));
          top = Math.round(top);
          if (top > this.best) {
            const first = !this.best;
            this.best = top;
            VH.events.emit('notify', { title: first ? 'Fifty balls later…' : 'New longest drive!', text: 'Your best drive went ' + top + ' m.' + (top >= 200 ? ' It cleared the 200 board!' : ''), icon: '⛳', tone: 'good' });
          } else {
            VH.events.emit('notify', { title: 'Fifty balls later…', text: 'Best today ' + top + ' m. Your record is ' + this.best + ' m.', icon: '⛳' });
          }
          if (game.audio && game.audio.purchase) game.audio.purchase();
          return 3;
        });
        game.interaction.on('redwaterPony', (item, player) => {
          if (player.money < item.price) {
            VH.events.emit('notify', { title: 'Not enough cash', text: 'A pony ride is ' + VH.util.formatMoney(item.price) + '.', icon: '✕', tone: 'bad' });
            return 1;
          }
          player.money -= item.price;
          VH.events.emit('money:changed', { delta: -item.price, reason: 'Redwater Ranch' });
          this.rides = (this.rides || 0) + 1;
          const names = ['Biscuit', 'Duchess', 'Pepper', 'Marmalade'];
          VH.events.emit('notify', { title: 'Pony ride', text: names[this.rides % names.length] + ' takes you twice round the pen' + (this.rides === 1 ? '. Your legs are a bit too long.' : ' at a gentle trot.'), icon: '🐴', tone: 'good' });
          return 4;
        });
        game.interaction.on('redwaterBoat', (item, player) => {
          if (player.money < item.price) {
            VH.events.emit('notify', { title: 'Not enough cash', text: 'A rowing boat is ' + VH.util.formatMoney(item.price) + ' an hour.', icon: '✕', tone: 'bad' });
            return 1;
          }
          player.money -= item.price;
          VH.events.emit('money:changed', { delta: -item.price, reason: 'Willow Lake' });
          this.rows = (this.rows || 0) + 1;
          const SIGHTS = ['a heron standing on one leg by the island', 'the swans, who hiss at you', 'a kingfisher flash past the reeds', 'a pike turning under the boat', 'the ducks following you for crumbs'];
          VH.events.emit('notify', { title: 'Round the island', text: 'You row out round the island and back' + (this.rows === 1 ? ', mostly in circles at first. ' : '. ') + 'You see ' + SIGHTS[(this.rows + 2) % SIGHTS.length] + '.', icon: '🚣', tone: 'good' });
          return 5;
        });
        game.interaction.on('redwaterFish', (item, player) => {
          if (player.money < item.price) {
            VH.events.emit('notify', { title: 'Not enough cash', text: 'Bait is ' + VH.util.formatMoney(item.price) + '.', icon: '✕', tone: 'bad' });
            return 1;
          }
          player.money -= item.price;
          VH.events.emit('money:changed', { delta: -item.price, reason: 'Willow Lake' });
          // What bites: [name, lightest kg, heaviest kg, chance weight]; a welly now and then.
          const FISH = [['roach', 0.1, 0.6, 30], ['perch', 0.2, 1.4, 24], ['bream', 0.5, 3, 16], ['tench', 0.8, 3.5, 12], ['carp', 2, 12, 10], ['pike', 2, 9, 5]];
          let r = Math.random() * 100;
          if (r < 3) {
            VH.events.emit('notify', { title: 'Something heavy…', text: 'It is an old welly boot. You put it in the bin.', icon: '🥾' });
            return 4;
          }
          let f = FISH[0];
          for (const q of FISH) {
            if ((r -= q[3]) < 0) {
              f = q;
              break;
            }
          }
          const kg = Math.round((f[1] + (f[2] - f[1]) * Math.random() ** 2) * 10) / 10;
          const best = this.fish && this.fish.kg >= kg;
          if (!best) this.fish = { kg, name: f[0] };
          VH.events.emit('notify', {
            title: best ? 'A ' + f[0] + '!' : 'Your biggest catch yet!',
            text: 'A ' + kg + ' kg ' + f[0] + '. You slip it back into the lake.' + (best ? ' Your record is a ' + this.fish.kg + ' kg ' + this.fish.name + '.' : ''),
            icon: '🎣',
            tone: best ? undefined : 'good',
          });
          return 4;
        });
        game.interaction.on('redwaterSolar', (item) => {
          // What the farm makes right now follows the sun (the same sun that lights the world).
          const env = game.environment;
          const sun = env && env.sunDir ? env.sunDir.y : 0.6;
          const peak = (SO.panels * SO.watts) / 1e6;
          const k = Math.pow(Math.min(1, Math.max(0, (sun - 0.03) / 0.88)), 0.8);
          const mw = Math.round(peak * k * 10) / 10;
          const homes = Math.round((mw * 1000) / 0.45 / 10) * 10;
          if (item.what === 'view') {
            VH.events.emit('notify', { title: 'Through the viewer', text: SO.panels.toLocaleString() + ' panels in their rows, ' + SO.sheep + ' sheep between them, the substation humming by the gate' + (sun > 0.05 ? ', and far off the wind turbines of Haverly turning.' : '. The panels are dark: the sun has gone down.'), icon: '🔭' });
            return 3;
          }
          if (mw < 0.1) {
            VH.events.emit('notify', { title: 'The panels are asleep', text: 'No sun, no power. The battery store is feeding the grid until the morning. On a sunny day the farm makes up to ' + (Math.round(peak * 10) / 10) + ' MW.', icon: '🌙' });
          } else {
            VH.events.emit('notify', { title: 'Redwater Solar Farm', text: 'Right now: ' + mw + ' MW from ' + SO.panels.toLocaleString() + ' panels. That is enough for about ' + homes.toLocaleString() + ' homes.', icon: '☀', tone: 'good' });
          }
          return 3;
        });
        game.interaction.on('redwaterTip', (item, player) => {
          const T = this.tip;
          if (item.what === 'skip') {
            const JUNK = [['an old microwave', 'ELECTRICALS'], ['a wobbly bookcase', 'WOOD'], ['a rusty bike frame', 'METAL'], ['a mountain of pizza boxes', 'CARDBOARD'], ['a box of old school books', 'PAPER'], ['three bags of grass cuttings', 'GARDEN WASTE'], ['a broken paddling pool', 'PLASTICS'], ['a bag of outgrown football kits', 'TEXTILES'], ['a bucket of broken tiles', 'RUBBLE'], ['a mystery bag nobody will talk about', 'GENERAL WASTE']];
            const [what, skip] = JUNK[T.loads % JUNK.length];
            T.loads++;
            const champ = T.loads % 10 === 0;
            VH.events.emit('notify', { title: champ ? T.loads + ' loads recycled!' : 'Into the ' + skip + ' skip', text: (champ ? 'The staff give you a Champion Recycler sticker. ' : '') + 'Over the rail goes ' + what + '. Very satisfying.', icon: '♻', tone: champ ? 'good' : undefined });
            return 2;
          }
          if (item.what === 'bottles') {
            T.bottles++;
            const bank = ['green', 'brown', 'clear'][T.bottles % 3];
            VH.events.emit('notify', { title: 'Smash!', text: 'A bag of bottles into the ' + bank + ' glass bank. That makes ' + T.bottles + (T.bottles === 1 ? ' bag' : ' bags') + ' so far.', icon: '♻' });
            return 1.5;
          }
          if (player.money < item.price) {
            VH.events.emit('notify', { title: 'Not enough cash', text: 'Everything in Second Chance is ' + VH.util.formatMoney(item.price) + '.', icon: '✕', tone: 'bad' });
            return 1;
          }
          player.money -= item.price;
          VH.events.emit('money:changed', { delta: -item.price, reason: 'Second Chance' });
          const FINDS = ['a lava lamp that still works', 'a skateboard with three good wheels', 'a garden gnome holding a fishing rod', 'a jigsaw of a lighthouse with one piece missing', 'a keyboard from the 1980s with a drum button', 'a signed photo of the weather presenter', 'a snow globe of Vicehaven pier', 'a box of comics, slightly chewed'];
          VH.events.emit('notify', { title: 'Second Chance', text: 'You find ' + FINDS[T.finds++ % FINDS.length] + '. Somebody\'s junk, your treasure.', icon: '🛍', tone: 'good' });
          return 2;
        });
      }
      // Cars in the club car park.
      const list = [];
      let seed = 4242;
      // (gaps: how many bays in five stand empty; the tip's car park is quiet, its visitors are up on the deck)
      for (const [park, rows, m, gaps] of [[PL.park, PL.bayRows, 4, 2], [RR.park, RR.bayRows, 3, 2], [WL.park, WL.bayRows, 3, 2], [SO.park, SO.bayRows, 3, 2], [RC.park, RC.bayRows, 3, 4]]) {
        for (const r of rows || []) {
          for (let x = park.x0 + m + 1.35; x < park.x1 - m; x += 2.7) {
            if (r.skip && x > r.skip[0] - 1.5 && x < r.skip[1] + 1.5) continue;
            if ((seed * 7) % 5 < gaps) {
              seed++;
              continue;
            }
            list.push(WN.parkedSpot(x, r.z, r.h, seed++));
          }
        }
      }
      // Willow Lake: cars on the campsite's pitches and behind three of the cabins.
      for (const c of WL.campCars || []) list.push(WN.parkedSpot(c.x, c.z, c.h, seed++));
      if (WL.jet) {
        WL.cabins.xs.forEach((x, i) => {
          if (i !== 1) list.push(WN.parkedSpot(x, WL.lane.z1 + 5, i % 2 ? 0 : Math.PI, seed++));
        });
      }
      WN.addParkedSpots(game, list);
      WN.clearSpots(game, [[PL.gate.x0 - 3, 640, PL.gate.x1 + 3, 670], [RR.x1 - 4, RR.gate.z0 - 3, RR.x1 + 14, RR.gate.z1 + 3], [WL.gate.x0 - 3, 1178, WL.gate.x1 + 3, 1200], [SO.gate.x0 - 3, SO.z1 - 4, SO.gate.x1 + 3, SO.z1 + 14], [RC.inLane.x0 - 3, RC.z1 - 4, RC.inLane.x1 + 3, RC.z1 + 14], [RC.outLane.x0 - 3, RC.z1 - 4, RC.outLane.x1 + 3, RC.z1 + 14], [RC.x0 - 16, RC.lorryIn.z0 - 3, RC.x0 + 2, RC.lorryIn.z1 + 3]]);
    }
    update() {}
    serialize() {
      return { rangeBest: this.best, fish: this.fish || null, tip: this.tip };
    }
    load(d) {
      this.best = (d && +d.rangeBest) || 0;
      this.fish = d && d.fish && +d.fish.kg > 0 ? { kg: +d.fish.kg, name: String(d.fish.name || 'fish') } : null;
      const t = (d && d.tip) || {};
      this.tip = { loads: +t.loads || 0, bottles: +t.bottles || 0, finds: +t.finds || 0 };
    }
    reset() {}
    stop() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Redwater',
    plots: ['pelican_links', 'redwater_ranch', 'willow_lake', 'redwater_solar', 'redwater_recycling'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.pelican_links || !VH.WNKit || !VH.CountryKit) return;
      buildGolf(world);
      buildRanch(world);
      if (layout.plots.willow_lake) buildWillowLake(world);
      if (layout.plots.redwater_solar) buildSolar(world);
      if (layout.plots.redwater_recycling) {
        buildRecycling(world);
        RC.built = true;
      }
      world.redwater = true;
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      if (!world.redwater) return;
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const c = PL.club, dx = (c.x0 + c.x1) / 2;
      add('pelican_links', { name: 'Pelican Links', x: dx, z: c.z0 - 9, yaw: 0, kind: 'golf', landmark: true });
      add('redwater_ranch', { name: 'Redwater Ranch', x: RR.x1 - 12, z: (RR.gate.z0 + RR.gate.z1) / 2, yaw: -Math.PI / 2, kind: 'ranch', landmark: true });
      if (SO.tables) add('redwater_solar', { name: 'Redwater Solar Farm', x: SO.spine, z: SO.z1 - 6, yaw: Math.PI, kind: 'solar', landmark: true });
      if (RC.built) add('redwater_recycling', { name: 'Redwater Recycling Centre', x: (RC.inLane.x0 + RC.inLane.x1) / 2, z: RC.z1 - 6, yaw: Math.PI, kind: 'recycling', landmark: true });
      if (WL.jet) add('willow_lake', { name: 'Willow Lake', x: (WL.gate.x0 + WL.gate.x1) / 2, z: WL.park.z0 + 14, yaw: 0, kind: 'lake', landmark: true });
      const extra = places.extra[D];
      if (extra) {
        const H = PL.holes;
        extra.push(
          { x: dx, z: c.z1 + 3, yaw: Math.PI, kinds: ['golf', 'cafe', 'bar', 'restaurant', 'terrace'], name: 'The terrace, Pelican Links' },
          { x: PL.shed.x1 + 3, z: PL.shed.z1 + 2, yaw: -Math.PI / 2, kinds: ['golf', 'garage', 'storage'], name: 'The buggy shed, Pelican Links' },
          { x: PL.range.bays + 5, z: PL.range.z1 - 6, yaw: -Math.PI / 2, kinds: ['golf', 'range', 'sports'], name: 'The driving range, Pelican Links' },
          { x: PL.park.x0 + 30, z: PL.park.z0 + 17, yaw: 0, kinds: ['parking', 'golf'], name: 'The club car park, Pelican Links' },
          { x: PL.putt.x, z: PL.putt.z + PL.putt.rz + 3, yaw: Math.PI, kinds: ['golf', 'park'], name: 'The putting green, Pelican Links' },
          { x: H[0].tx - H[0].ux * 3, z: H[0].tz - H[0].uz * 3, yaw: H[0].yaw, kinds: ['golf', 'field', 'park'], name: 'The first tee, Pelican Links' },
          { x: H[3].tx, z: H[3].tz, yaw: H[3].yaw, kinds: ['golf', 'lake', 'park'], name: 'The fourth tee, over the water, Pelican Links' },
          { x: H[8].gx + H[8].rx * 18, z: H[8].gz + H[8].rz * 18, yaw: -H[8].yaw, kinds: ['golf', 'field', 'park'], name: 'The ninth green, Pelican Links' },
          { x: PL.ponds[0].x + PL.ponds[0].rx + 6, z: PL.ponds[0].z, yaw: -Math.PI / 2, kinds: ['golf', 'lake', 'pond', 'park'], name: 'The long pond, Pelican Links' },
          { x: H[5].gx + H[5].rx * -18, z: H[5].gz, yaw: Math.PI / 2, kinds: ['golf', 'field', 'woods'], name: 'The sixth green, Pelican Links' },
          { x: RR.arena.x1 + 4, z: RR.gate.z0 + 7, yaw: -Math.PI / 2, kinds: ['ranch', 'rodeo', 'arena', 'stadium'], name: 'The rodeo arena gate, Redwater Ranch' },
          { x: (RR.arena.x0 + RR.arena.x1) / 2, z: RR.stands.south.back - 1.2, y: RR.stands.south.y, yaw: Math.PI, kinds: ['ranch', 'rodeo', 'stands', 'overlook'], name: 'The top of the rodeo stand, Redwater Ranch' },
          { x: RR.stables.x0 + 20, z: RR.stables.z1 + 4, yaw: Math.PI, kinds: ['ranch', 'stables', 'barn', 'farm'], name: 'The stables, Redwater Ranch' },
          { x: RR.pen.x + RR.pen.r + 4, z: RR.pen.z + 7.5, yaw: Math.PI, kinds: ['ranch', 'farm', 'park'], name: 'The pony rides, Redwater Ranch' },
          { x: (RR.house.x0 + RR.house.x1) / 2, z: RR.house.z1 + 6, yaw: Math.PI, kinds: ['ranch', 'farmhouse', 'house', 'front_door'], name: 'The ranch house porch, Redwater Ranch' },
          { x: RR.paddocks.x1 + 3, z: RR.paddocks.z[1] + 8, yaw: -Math.PI / 2, kinds: ['ranch', 'field', 'farm', 'paddock'], name: 'The paddock gate, Redwater Ranch' },
          { x: RR.hay.x1 + 3, z: (RR.hay.z0 + RR.hay.z1) / 2, yaw: -Math.PI / 2, kinds: ['ranch', 'barn', 'farm', 'storage'], name: 'The hay barn, Redwater Ranch' },
          { x: (RR.park.x0 + RR.park.x1) / 2, z: RR.park.z0 + 20, yaw: 0, kinds: ['parking', 'ranch'], name: 'The car park, Redwater Ranch' },
        );
        if (WL.jet) {
          const J = WL.jetty.P, [jx, jz] = J(WL.jetty.len - 2, 0), [rx, rz] = J(-2.5, 0);
          const f = WL.fire, o = WL.office, peg = WL.pegs[0], [px, pz] = peg.P(3.5, 0);
          extra.push(
            { x: jx, z: jz, y: KERB + 0.32, yaw: WL.jet.yaw, kinds: ['lake', 'jetty', 'pier', 'overlook', 'dock'], name: 'The end of the jetty, Willow Lake' },
            { x: rx, z: rz, yaw: WL.jet.yaw, kinds: ['lake', 'jetty', 'boats', 'park'], name: 'The boat hire, Willow Lake' },
            { x: px, z: pz, y: KERB + 0.3, yaw: peg.yaw, kinds: ['lake', 'fishing', 'pond', 'overlook'], name: 'The fishing platforms, Willow Lake' },
            { x: (o.x0 + o.x1) / 2, z: o.z0 - 5, yaw: 0, kinds: ['shop', 'campsite', 'reception', 'storefront'], name: 'The camp shop, Willow Lake' },
            { x: (WL.park.x0 + WL.park.x1) / 2, z: WL.park.z0 + 14, yaw: Math.PI, kinds: ['parking', 'lake'], name: 'The car park, Willow Lake' },
            { x: f.x + 4.5, z: f.z - 4.5, yaw: -Math.PI * 0.75, kinds: ['campsite', 'campfire', 'park', 'bench'], name: 'The campfire, Willow Lake' },
            { x: WL.camp.track, z: WL.pitchZ[5], yaw: 0, kinds: ['campsite', 'tents', 'caravan', 'park'], name: 'The campsite, Willow Lake' },
            { x: WL.toilets.x0 - 3, z: (WL.toilets.z0 + WL.toilets.z1) / 2, yaw: Math.PI / 2, kinds: ['toilets', 'campsite'], name: 'The shower block, Willow Lake' },
            { x: WL.cabins.xs[3], z: WL.cabins.z1 + WL.cabins.deck + 2.5, yaw: Math.PI, kinds: ['house', 'cabin', 'front_door', 'lake'], name: 'The lakeside cabins, Willow Lake' },
            { x: WL.cabins.xs[0], z: WL.lane.z1 + 4, yaw: 0, kinds: ['house', 'cabin', 'back_door', 'lane'], name: 'Behind the first cabin, Willow Lake' },
            { x: WL.walk, z: WL.z1 - 6, yaw: Math.PI, kinds: ['park', 'lake', 'footpath', 'gate'], name: 'The footpath gate on Foundry Road, Willow Lake' },
            { x: -1500, z: WL.lake.z + WL.lake.rz + WL.ring + 6, yaw: Math.PI, kinds: ['park', 'picnic', 'bench', 'lake'], name: 'The picnic tables, Willow Lake' },
          );
        }
        if (SO.tables) {
          const H = SO.house, T = SO.tower, Fn = SO.fence, d = tableDepth();
          const zg = SO.blocks[1] - 5 * SO.pitch + (SO.pitch - d) / 2; // in a gap between two rows
          extra.push(
            { x: (H.x0 + H.x1) / 2, z: H.z1 + 4, yaw: Math.PI, kinds: ['shop', 'museum', 'visitor_centre', 'storefront', 'front_door'], name: 'The Sunhouse, Redwater Solar Farm' },
            { x: (H.x0 + H.x1) / 2, z: H.z1 + 7, yaw: Math.PI, kinds: ['cafe', 'picnic', 'terrace', 'bench'], name: 'The Sunhouse terrace, Redwater Solar Farm' },
            { x: (T.x0 + T.x1) / 2, z: T.z0 + 2.2, y: KERB + T.h, yaw: Math.PI, kinds: ['overlook', 'tower', 'stands'], name: 'The viewing tower, Redwater Solar Farm' },
            { x: (SO.park.x0 + SO.park.x1) / 2, z: SO.park.z0 + 10.5, yaw: 0, kinds: ['parking', 'solar'], name: 'The car park, Redwater Solar Farm' },
            { x: SO.park.x1 + 8, z: SO.trail, yaw: -Math.PI / 2, kinds: ['park', 'footpath', 'trail'], name: 'The Sun Trail, Redwater Solar Farm' },
            { x: SO.spine, z: Fn.z1 - 3, yaw: Math.PI, kinds: ['gate', 'farm', 'lane', 'solar'], name: 'The field gate, Redwater Solar Farm' },
            { x: SO.halves[0][0] + 20, z: zg, yaw: Math.PI / 2, kinds: ['field', 'farm', 'solar', 'sheep'], name: 'Among the panels, Redwater Solar Farm' },
            { x: SO.spine + 10, z: (SO.aisle.z0 + SO.aisle.z1) / 2, yaw: Math.PI / 2, kinds: ['industrial', 'solar', 'lane'], name: 'The inverter lane, Redwater Solar Farm' },
            { x: SO.weather.x - 3, z: SO.weather.z + 4.5, yaw: Math.PI, kinds: ['field', 'solar', 'weather'], name: 'The weather station, Redwater Solar Farm' },
            { x: SO.sub.x1 - 16, z: SO.track.z0 + 2, yaw: 0, kinds: ['industrial', 'power', 'gate', 'fence'], name: 'The substation gate, Redwater Solar Farm' },
            { x: SO.battery.x0 + 26, z: SO.track.z0 + 2, yaw: 0, kinds: ['industrial', 'power', 'gate'], name: 'The battery store, Redwater Solar Farm' },
          );
        }
        if (RC.built) {
          const Dk = RC.deck, Sh = RC.shop, Bn = RC.banks, Pk = RC.park, Sd = RC.shed, Dp = RC.depot, Cp = RC.compost, By = RC.bays;
          extra.push(
            { x: (Dk.x0 + Dk.x1) / 2, z: Dk.z0 + 1.6, y: KERB + Dk.h, yaw: Math.PI, kinds: ['recycling', 'overlook', 'industrial', 'dump'], name: 'The skip deck, Redwater Recycling Centre' },
            { x: (Sh.x0 + Sh.x1) / 2, z: Sh.z1 + 3, yaw: Math.PI, kinds: ['shop', 'storefront', 'front_door', 'thrift'], name: 'Second Chance re-use shop, Redwater Recycling Centre' },
            { x: Bn.x, z: Bn.z + 3, yaw: Math.PI, kinds: ['recycling', 'bins', 'alley'], name: 'The bottle banks, Redwater Recycling Centre' },
            { x: (Pk.x0 + Pk.x1) / 2, z: (Pk.z0 + Pk.z1) / 2, yaw: 0, kinds: ['parking', 'recycling'], name: 'The car park, Redwater Recycling Centre' },
            { x: RC.office.x1 + 1.1, z: (RC.office.z0 + RC.office.z1) / 2, yaw: -Math.PI / 2, kinds: ['office', 'gate', 'recycling'], name: 'The site office, Redwater Recycling Centre' },
            { x: RC.x0 + RC.edge + 17, z: RC.lorryIn.z1 + 2, yaw: Math.PI, kinds: ['industrial', 'gate', 'loading', 'weighbridge'], name: 'The weighbridge, Redwater Recycling Centre' },
            { x: Sd.x0 + 41, z: Sd.z1 + 9, yaw: Math.PI, kinds: ['industrial', 'warehouse', 'loading', 'back_door'], name: 'The sorting shed doors, Redwater Recycling Centre' },
            { x: RC.bales.x0 - 3, z: RC.bales.z0 + 21, yaw: -Math.PI / 2, kinds: ['industrial', 'storage', 'crates', 'hideout'], name: 'Among the bale stacks, Redwater Recycling Centre' },
            { x: Dp.x0 + 20, z: Dp.z0 + 30, yaw: Math.PI / 2, kinds: ['industrial', 'garage', 'depot', 'parking'], name: 'The lorry depot, Redwater Recycling Centre' },
            { x: Cp.x0 - 2, z: (Cp.z[2] + Cp.z[3]) / 2, yaw: -Math.PI / 2, kinds: ['industrial', 'farm', 'field', 'compost'], name: 'The compost windrows, Redwater Recycling Centre' },
            { x: (By.x0 + By.x1) / 2, z: By.z1 + 10, yaw: 0, kinds: ['industrial', 'construction', 'yard'], name: 'The push-wall bays, Redwater Recycling Centre' },
            { x: -838, z: 1614, yaw: -Math.PI / 2, kinds: ['industrial', 'storage', 'yard'], name: 'The white-goods canopy, Redwater Recycling Centre' },
          );
        }
      }
    },
    System: RedwaterLife,
  });
})();
