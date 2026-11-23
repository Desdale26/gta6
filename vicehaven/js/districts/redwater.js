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
    WN.pave(world, p.x0, p.z0, p.x1, p.z1, 0x8a8a88, 'asphaltTop', KERB + 0.012);
    WN.pave(world, PL.gate.x0, PL.z0 + PL.edge, PL.gate.x1, p.z0, 0x8a8a88, 'asphaltTop', KERB + 0.012);
    // A drive from the car park to the club's forecourt.
    WN.pave(world, PL.shed.x1 + 10, PL.club.z0 - 18, p.x0, PL.club.z0 - 6, 0x8a8a88, 'asphaltTop', KERB + 0.012);
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
          const LINES = { lemonade: ['Pink lemonade', 'Ice-cold, on the terrace. '], corndog: ['A corn dog', 'With mustard, rodeo style. '] };
          const [title, text] = LINES[item.what] || ['Thanks!', ''];
          VH.events.emit('notify', { title, text: text + (item.heal ? (gained > 0 ? '+' + gained + ' health' : 'You were already feeling fine.') : ''), icon: item.what === 'corndog' ? '🌭' : '🍋' });
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
      }
      // Cars in the club car park.
      const list = [];
      let seed = 4242;
      for (const [park, rows, m] of [[PL.park, PL.bayRows, 4], [RR.park, RR.bayRows, 3]]) {
        for (const r of rows || []) {
          for (let x = park.x0 + m + 1.35; x < park.x1 - m; x += 2.7) {
            if ((seed * 7) % 5 < 2) {
              seed++;
              continue;
            }
            list.push(WN.parkedSpot(x, r.z, r.h, seed++));
          }
        }
      }
      WN.addParkedSpots(game, list);
      WN.clearSpots(game, [[PL.gate.x0 - 3, 640, PL.gate.x1 + 3, 670], [RR.x1 - 4, RR.gate.z0 - 3, RR.x1 + 14, RR.gate.z1 + 3]]);
    }
    update() {}
    serialize() {
      return { rangeBest: this.best };
    }
    load(d) {
      this.best = (d && +d.rangeBest) || 0;
    }
    reset() {}
    stop() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Redwater',
    plots: ['pelican_links', 'redwater_ranch'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.pelican_links || !VH.WNKit || !VH.CountryKit) return;
      buildGolf(world);
      buildRanch(world);
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
      }
    },
    System: RedwaterLife,
  });
})();
