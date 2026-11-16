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
   * A round collider: four oriented boxes turned 45 degrees apart, which
   * together make an octagon hugging a circle of radius r (no square corners
   * sticking out past the drawn cylinder, no gaps inside it).
   */
  function disc(world, cx, cz, r, y0, y1, tag, flags) {
    const hx = r * 0.97, hz = r * 0.4;
    for (let k = 0; k < 4; k++) world.physics.addOrientedBox(cx, cz, hx, hz, k * PI / 4, y0, y1, tag || 'metal', flags === undefined ? F().ALL : flags);
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
    surf.box(x0, y0, z0, x1, y1, z1, VH.col(hex), opts);
    world.physics.addBox(x0, y0 <= KERB + 0.01 ? 0 : y0, z0, x1, y1, z1, tag || 'building', flags === undefined ? F().ALL : flags);
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

  VH.SouthKit = { disc, drum, obox, air, face, profileRamp, quarterProfile };
})();
