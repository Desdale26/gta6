// VICEHAVEN — helpers shared by the south districts (Sandpiper Beach, Vista
// Verde, Ironside, The Bowl). VH.WNKit (westnorth-kit.js) has the general
// pieces (pave, mark, solid, beam, tiltBox, building, fence, stairs, ramp,
// sign ...); this adds the few things the south needs on top of it.
(function () {
  'use strict';
  const VH = window.VH;
  const KERB = 0.15;
  const PI = Math.PI;
  const F = () => VH.COLLIDE;

  /**
   * A round collider: 4, 6 or 12 oriented boxes turned evenly round, which
   * together make a polygon hugging a circle of radius r (no square corners
   * sticking out past the drawn cylinder, no gaps inside it).
   */
  function disc(world, cx, cz, r, y0, y1, tag, flags) {
    // More boxes for bigger drums, so the polygon stays within a few cm of the
    // drawn circle (a 10 m tank with four boxes left 0.3 m of walk-in on the diagonals).
    const n = r < 1.5 ? 4 : r < 4 ? 6 : 12;
    const hx = r * 0.995, hz = r * Math.sin(PI / (2 * n)) * 1.02;
    for (let k = 0; k < n; k++) world.physics.addOrientedBox(cx, cz, hx, hz, k * PI / n, y0, y1, tag || 'metal', flags === undefined ? F().ALL : flags);
  }

  /** A solid upright cylinder drawn on `surf` with a round collider. */
  function drum(world, surf, cx, y0, cz, r, h, seg, hex, tag, flags) {
    surf.cylinder(cx, y0, cz, r, r, h, seg || 12, VH.col(hex), true);
    disc(world, cx, cz, r, y0 <= KERB + 0.01 ? 0 : y0, y0 + h, tag, flags);
  }

  /** An oriented box drawn (orientedBox) and solid. */
  function obox(world, surf, cx, cz, hx, hz, yaw, y0, y1, hex, tag, flags) {
    surf.orientedBox(cx, cz, hx, hz, yaw, y0, y1, VH.col(hex));
    world.physics.addOrientedBox(cx, cz, hx, hz, yaw, y0 <= KERB + 0.01 ? 0 : y0, y1, tag || 'building', flags === undefined ? F().ALL : flags);
  }

  /** A box drawn and solid, with its collider starting where it is drawn (for things in the air). */
  function air(world, surf, x0, y0, z0, x1, y1, z1, hex, tag, flags, opts) {
    // Off the ground its underside shows (GeometryBuilder.box leaves bottoms out by default).
    surf.box(x0, y0, z0, x1, y1, z1, VH.col(hex), y0 > KERB + 0.3 ? Object.assign({ bottom: true }, opts) : opts);
    world.physics.addBox(x0, y0 <= KERB + 0.01 ? 0 : y0, z0, x1, y1, z1, tag || 'building', flags === undefined ? F().ALL : flags);
  }

  /** The underside of an oriented box at height y (GeometryBuilder leaves box bottoms out). */
  function under(surf, cx, cz, hx, hz, yaw, y, color) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, lz) => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
    surf.quad(P(-hx, -hz), P(hx, -hz), P(hx, hz), P(-hx, hz), [0, -1, 0], color);
  }

  /** A downward-facing disc at height y: the bottom cap of a cylinder hanging in the air. */
  function capUnder(surf, cx, y, cz, r, seg, color) {
    surf.cylinder(cx, y - 0.002, cz, 0, r, 0.002, seg || 12, color, false);
  }

  /**
   * Run a district's build with undersides on: GeometryBuilder leaves the
   * bottom face of a box (and of an oriented box or an upright cylinder) out,
   * which is right for things standing on the ground but shows the sky
   * through every canopy, ceiling, light strip, catwalk and parasol seen from
   * below. While `fn` runs, anything that starts above knee height gets its
   * underside drawn (pass bottom: false to a box to keep it out).
   */
  function withUndersides(fn) {
    const GB = VH.GeometryBuilder && VH.GeometryBuilder.prototype;
    if (!GB) return fn();
    const LOW = KERB + 0.3;
    const { box, orientedBox, cylinder } = GB;
    // The wrappers are compiled with new Function so their frames carry no file
    // name: the collision audit (tools/solidity.mjs) then credits what they draw
    // to the district line that asked for it (whose `// solidity: passable` mark
    // still counts), not to this file.
    const make = (body, ...deps) => new Function(...deps.map((d) => d[0]), 'return ' + body)(...deps.map((d) => d[1]));
    GB.box = make(`function (x0, y0, z0, x1, y1, z1, color, opts) {
      if (y0 > LOW && (!opts || opts.bottom === undefined)) opts = Object.assign({}, opts, { bottom: true });
      return box.call(this, x0, y0, z0, x1, y1, z1, color, opts);
    }`, ['box', box], ['LOW', LOW]);
    GB.orientedBox = make(`function (cx, cz, hx, hz, yaw, y0, y1, color, topColor) {
      const r = orientedBox.apply(this, arguments);
      if (y0 > LOW) under(this, cx, cz, hx, hz, yaw, y0, color);
      return r;
    }`, ['orientedBox', orientedBox], ['LOW', LOW], ['under', under]);
    GB.cylinder = make(`function (cx, y0, cz, rBottom, rTop, h, segments, color) {
      const r = cylinder.apply(this, arguments);
      if (y0 > LOW && rBottom > 0.04 && h > 0.01) cylinder.call(this, cx, y0 - 0.002, cz, 0, rBottom, 0.002, segments, color, false);
      return r;
    }`, ['cylinder', cylinder], ['LOW', LOW]);
    try {
      return fn();
    } finally {
      Object.assign(GB, { box, orientedBox, cylinder });
    }
  }

  /** A flat face, its points turned so the normal points away from `inside`. */
  function face(surf, pts, color, inside) {
    const a = pts[0], b = pts[1], c = pts[2];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    let mx = 0, my = 0, mz = 0;
    for (const p of pts) { mx += p[0]; my += p[1]; mz += p[2]; }
    mx /= pts.length; my /= pts.length; mz /= pts.length;
    const out = (mx - inside[0]) * nx + (my - inside[1]) * ny + (mz - inside[2]) * nz;
    surf.polygon(out >= 0 ? pts : pts.slice().reverse(), color);
  }

  /**
   * A solid ramp with a profile: from (x, z) along `heading`, `w` wide, its
   * top following pts = [[u, y], ...] (u metres along, y height; u rising).
   * Drawn as tilted top faces, filled sides, a back face and (if it starts
   * above the ground) a front face. Each segment is a ramp collider (people
   * walk it, cars drive it); under each a box core up to the segment's lower
   * end keeps cars out of its sides and back (cars ignore ramp colliders
   * side-on) without ever poking above the riding surface.
   * o = { side: hex, top: hex, surf2 (side surface), tag, core: false }.
   */
  function profileRamp(world, surf, x, z, heading, w, pts, hex, o) {
    o = o || {};
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const rx = fz, rz = -fx;
    const hw = w / 2;
    const P = (u, s, y) => [x + fx * u + rx * s, y, z + fz * u + rz * s];
    const top = VH.col(hex);
    const side = VH.col(o.side === undefined ? hex : o.side);
    const sideSurf = o.surf2 || surf;
    const uEnd = pts[pts.length - 1][0];
    let ymax = 0;
    for (const p of pts) ymax = Math.max(ymax, p[1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [u0, y0] = pts[i];
      const [u1, y1] = pts[i + 1];
      const mid = [x + fx * (u0 + u1) / 2, -100, z + fz * (u0 + u1) / 2];
      face(surf, [P(u0, -hw, y0), P(u0, hw, y0), P(u1, hw, y1), P(u1, -hw, y1)], top, mid);
      for (const s of [-1, 1]) {
        const inside = [x + fx * (u0 + u1) / 2, Math.min(y0, y1) / 2, z + fz * (u0 + u1) / 2];
        face(sideSurf, [P(u0, s * hw, 0), P(u1, s * hw, 0), P(u1, s * hw, y1), P(u0, s * hw, y0)], side, inside);
      }
      const len = u1 - u0;
      const cx = x + fx * (u0 + u1) / 2, cz = z + fz * (u0 + u1) / 2;
      world.physics.addRamp(cx, cz, hw, len / 2, heading, 0, y0, y1, o.tag || 'concrete', F().ALL);
      const core = Math.min(y0, y1) - 0.03;
      if (o.core !== false && core > 0.3) world.physics.addOrientedBox(cx, cz, hw, len / 2, heading, 0, core, o.tag || 'concrete', F().SOLID | F().SHOTS);
    }
    const yl = pts[pts.length - 1][1];
    const inner = [x + fx * uEnd / 2, ymax / 2, z + fz * uEnd / 2];
    if (yl > 0.01) face(sideSurf, [P(uEnd, -hw, 0), P(uEnd, hw, 0), P(uEnd, hw, yl), P(uEnd, -hw, yl)], side, inner);
    const yf = pts[0][1];
    if (yf > 0.01) face(sideSurf, [P(pts[0][0], -hw, 0), P(pts[0][0], hw, 0), P(pts[0][0], hw, yf), P(pts[0][0], -hw, yf)], side, inner);
    return { P, fx, fz, rx, rz };
  }

  /** The profile of a quarter pipe: radius r, height h (h <= r), then a deck `deck` long. */
  function quarterProfile(r, h, deck, n) {
    n = n || 6;
    const pts = [];
    const aMax = Math.acos(1 - h / r);
    for (let i = 0; i <= n; i++) {
      const a = (aMax * i) / n;
      pts.push([r * Math.sin(a), r * (1 - Math.cos(a))]);
    }
    pts[pts.length - 1][1] = h;
    const uTop = pts[pts.length - 1][0];
    if (deck) pts.push([uTop + deck, h]);
    return pts;
  }

  VH.SouthKit = { disc, drum, obox, air, under, capUnder, withUndersides, face, profileRamp, quarterProfile };
})();
