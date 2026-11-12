/*
 * districts/westnorth-kit.js — shared helpers for the west and north
 * district builders (VICEHAVEN 3.0): Sunreel Studios, Cinder Creek, Halcyon
 * University and Coral Marina.
 *
 * Everything here draws into the chunk builders (world.ctxAt: one merged
 * mesh per material per chunk) and adds colliders; nothing makes a mesh of
 * its own. Exposed as VH.WNKit.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const CHUNK = 192;
  const ORIGIN = -768;
  const F = () => VH.COLLIDE;

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const X1 = new THREE.Vector3(1, 0, 0);
  const Y1 = new THREE.Vector3(0, 1, 0);
  let UNIT = null;
  const unit = () => UNIT || (UNIT = new THREE.BoxGeometry(1, 1, 1));

  /** Call fn(x0, z0, x1, z1, ctx) for each piece of a rectangle cut on the chunk grid. */
  function tiles(world, x0, z0, x1, z1, fn) {
    const cut = (a0, a1) => {
      const out = [];
      let a = a0;
      while (a < a1 - 1e-6) {
        const edge = ORIGIN + (Math.floor((a - ORIGIN) / CHUNK) + 1) * CHUNK;
        const b = Math.min(a1, edge);
        out.push([a, b]);
        a = b;
      }
      return out;
    };
    for (const [xa, xb] of cut(x0, x1)) for (const [za, zb] of cut(z0, z1)) fn(xa, za, xb, zb, world.ctxAt((xa + xb) / 2, (za + zb) / 2));
  }

  /** A flat surface lying on the plot's slab ('asphaltTop', 'plazaTop', 'grassTop', 'sidewalk', 'marks', 'decal'). */
  function pave(world, x0, z0, x1, z1, hex, surf, y, uv) {
    const yy = y === undefined ? KERB + 0.012 : y;
    tiles(world, x0, z0, x1, z1, (a, b, c, d, ctx) => ctx[surf || 'asphaltTop'].topRect(a, b, c, d, yy, VH.col(hex), uv || 6));
  }
  /** Road paint on top of a pave(). */
  function mark(world, x0, z0, x1, z1, hex, y) {
    tiles(world, Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), (a, b, c, d, ctx) => ctx.marks.topRect(a, b, c, d, y === undefined ? KERB + 0.022 : y, VH.col(hex || 0xf4f4ef)));
  }

  /** A box drawn into a surface and made solid. */
  function solid(world, surf, x0, y0, z0, x1, y1, z1, hex, opts, tag, flags) {
    surf.box(x0, y0, z0, x1, y1, z1, Array.isArray(hex) ? hex : VH.col(hex), opts);
    world.physics.addBox(x0, Math.min(y0, 0), z0, x1, y1, z1, tag || 'building', flags === undefined ? F().ALL : flags);
  }

  /** A beam of square section t from a to b, merged into a builder surface. */
  function beam(surf, ax, ay, az, bx, by, bz, t, color) {
    _d.set(bx - ax, by - ay, bz - az);
    const len = _d.length();
    if (len < 1e-3) return;
    _q.setFromUnitVectors(X1, _d.multiplyScalar(1 / len));
    _v.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    _s.set(len, t, t);
    _m.compose(_v, _q, _s);
    surf.merge(unit(), _m, Array.isArray(color) ? color : VH.col(color));
  }

  /** A box of size (sx, sy, sz) centred at (x, y, z), turned yaw about Y and tilted roll about its own X. */
  function tiltBox(surf, x, y, z, sx, sy, sz, yaw, roll, color) {
    _q.setFromAxisAngle(Y1, yaw || 0);
    if (roll) _q.multiply(new THREE.Quaternion().setFromAxisAngle(X1, roll));
    _v.set(x, y, z);
    _s.set(sx, sy, sz);
    _m.compose(_v, _q, _s);
    surf.merge(unit(), _m, Array.isArray(color) ? color : VH.col(color));
  }

  /**
   * A pitched roof over x0..x1, z0..z1 at height y: the ridge runs along X
   * (axis 'x') or Z, rising `rise` metres. Two tilted slabs, gables filled.
   */
  function gable(surf, x0, z0, x1, z1, y, rise, axis, roofHex, gableHex) {
    const alongX = axis !== 'z';
    const span = alongX ? z1 - z0 : x1 - x0;
    const len = alongX ? x1 - x0 : z1 - z0;
    const half = span / 2;
    const ang = Math.atan2(rise, half);
    const slope = Math.hypot(rise, half);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const roof = Array.isArray(roofHex) ? roofHex : VH.col(roofHex);
    for (const s of [-1, 1]) {
      if (alongX) {
        _q.setFromAxisAngle(X1, s * ang);
        _v.set(cx, y + rise / 2, cz + (s * half) / 2);
        _s.set(len + 0.6, 0.25, slope + 0.5);
      } else {
        _q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -s * ang);
        _v.set(cx + (s * half) / 2, y + rise / 2, cz);
        _s.set(slope + 0.5, 0.25, len + 0.6);
      }
      _m.compose(_v, _q, _s);
      surf.merge(unit(), _m, roof);
    }
    if (gableHex !== undefined) {
      const g = Array.isArray(gableHex) ? gableHex : VH.col(gableHex);
      if (alongX) {
        for (const x of [x0, x1]) surf.polygon(x === x0 ? [[x, y, z1], [x, y + rise, cz], [x, y, z0]] : [[x, y, z0], [x, y + rise, cz], [x, y, z1]], g);
      } else {
        for (const z of [z0, z1]) surf.polygon(z === z0 ? [[x0, y, z], [cx, y + rise, z], [x1, y, z]] : [[x1, y, z], [cx, y + rise, z], [x0, y, z]], g);
      }
    }
  }

  /**
   * A building: solid box with window grids on its walls (ctx.b), a flat
   * roof. o = { wall, roof, style (1 punched, 3 bands, 4 glass), ww, wh,
   * bay, floorH, sides: { n|s|e|w: 'win'|'blank'|'skip' }, seed, y0 }.
   */
  function building(world, x0, z0, x1, z1, h, o) {
    o = o || {};
    const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
    const y0 = o.y0 === undefined ? KERB : o.y0;
    const wall = Array.isArray(o.wall) ? o.wall : VH.col(o.wall || 0xd8d0c0);
    const Fd = { style: o.style === undefined ? 1 : o.style, ww: o.ww || 0.5, wh: o.wh || 0.58, bay: o.bay || 3.4, floorH: o.floorH || 3.4, seed: o.seed || 0.37 };
    const faces = [
      ['s', [x0, y0, z1], 1, 0, x1 - x0],
      ['n', [x1, y0, z0], -1, 0, x1 - x0],
      ['e', [x1, y0, z1], 0, -1, z1 - z0],
      ['w', [x0, y0, z0], 0, 1, z1 - z0],
    ];
    for (const [side, p, ux, uz, len] of faces) {
      const mode = (o.sides && o.sides[side]) || 'win';
      if (mode === 'skip') continue;
      const blank = mode === 'blank' || Fd.style === 0;
      const bays = Math.max(1, Math.round(len / Fd.bay));
      ctx.b.wall(p, ux, uz, len, h, wall, null, [0, bays, 0, h / Fd.floorH], blank ? [0, 0, 0, Fd.seed] : [Fd.ww, Fd.wh, Fd.style, Fd.seed]);
    }
    const roof = Array.isArray(o.roof) ? o.roof : VH.col(o.roof || 0x8d8a84);
    ctx.b.quad([x0, y0 + h, z1], [x1, y0 + h, z1], [x1, y0 + h, z0], [x0, y0 + h, z0], [0, 1, 0], roof, null, null, [0, 0, o.gravel === false ? 0 : -1, Fd.seed]);
    // A parapet.
    if (o.parapet !== false) {
      const pc = VH.colMul(wall, 0.85);
      const t = 0.3;
      const ph = o.parapet || 0.7;
      ctx.b.box(x0, y0 + h, z0, x1, y0 + h + ph, z0 + t, pc);
      ctx.b.box(x0, y0 + h, z1 - t, x1, y0 + h + ph, z1, pc);
      ctx.b.box(x0, y0 + h, z0, x0 + t, y0 + h + ph, z1, pc);
      ctx.b.box(x1 - t, y0 + h, z0, x1, y0 + h + ph, z1, pc);
    }
    if (o.solid !== false) world.physics.addBox(x0, 0, z0, x1, y0 + h, z1, 'building');
    world.stats && world.stats.buildings !== undefined && world.stats.buildings++;
    return ctx;
  }

  /** A collider only (posts, tables, rails drawn elsewhere): solid to people, cars and shots. */
  function block(world, x0, y0, z0, x1, y1, z1, tag, flags) {
    world.physics.addBox(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1), tag || 'pole', flags === undefined ? F().SOLID | F().SHOTS : flags);
  }

  /** A small light: a stalk and a glowing head (screen surface). */
  function lamp(world, x, z, hex, mul, h, y) {
    const ctx = world.ctxAt(x, z);
    const base = y === undefined ? KERB : y;
    const top = base + (h || 0.35);
    ctx.prop.box(x - 0.05, base, z - 0.05, x + 0.05, top - 0.08, z + 0.05, VH.col(0x5a5f66));
    ctx.screen.box(x - 0.16, top - 0.1, z - 0.16, x + 0.16, top + 0.08, z + 0.16, VH.col(hex, mul || 2.4));
  }

  /** A string of bulbs sagging between two points (they glow at night). */
  function festoon(world, ax, ay, az, bx, by, bz, sag, hex, step) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(2, Math.round(len / (step || 1.6)));
    const wire = VH.col(0x2a2d33);
    let px = ax, py = ay, pz = az;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const y = ay + (by - ay) * t - sag * 4 * t * (1 - t);
      const ctx = world.ctxAt(x, z);
      beam(ctx.prop, px, py, pz, x, y, z, 0.03, wire);
      if (i < n) {
        const c = Array.isArray(hex) ? hex[i % hex.length] : hex;
        ctx.screen.box(x - 0.13, y - 0.28, z - 0.13, x + 0.13, y - 0.04, z + 0.13, VH.col(c, 2));
      }
      px = x; py = y; pz = z;
    }
  }

  /**
   * A fence along a straight axis-aligned line, with gaps [[a0, a1], ...]
   * along it. kind: 'chain' (posts, rails, mesh), 'wood' (boards), 'picket'.
   */
  function fence(world, x0, z0, x1, z1, gaps, kind, h) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
    const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const c = alongX ? z0 : x0;
    const segs = [];
    let cur = a0;
    for (const [g0, g1] of (gaps || []).slice().sort((p, q) => p[0] - q[0])) {
      if (g0 > cur) segs.push([cur, g0]);
      cur = Math.max(cur, g1);
    }
    if (cur < a1) segs.push([cur, a1]);
    const H = h || (kind === 'picket' ? 1.1 : 2.4);
    const post = VH.col(kind === 'wood' ? 0x6b4e33 : kind === 'picket' ? 0xf1ece0 : 0x7d838a);
    const fill = VH.col(kind === 'wood' ? 0x8a6a48 : kind === 'picket' ? 0xf1ece0 : 0x3a3f45);
    const R = (a, b, cc0, cc1, y0, y1) => (alongX ? [a, y0, cc0, b, y1, cc1] : [cc0, y0, a, cc1, y1, b]);
    for (const [s0, s1] of segs) {
      const piece = (p0, p1) => {
        const mid = (p0 + p1) / 2;
        const ctx = alongX ? world.ctxAt(mid, c) : world.ctxAt(c, mid);
        const step = kind === 'picket' ? 2 : 3;
        for (let a = Math.ceil(p0 / step) * step; a <= p1; a += step) ctx.prop.box(...R(a - 0.06, a + 0.06, c - 0.06, c + 0.06, KERB, KERB + H + 0.1), post);
        if (kind === 'chain') {
          for (const y of [0.3, H - 0.1]) ctx.prop.box(...R(p0, p1, c - 0.03, c + 0.03, KERB + y, KERB + y + 0.05), post);
          ctx.prop.box(...R(p0, p1, c - 0.01, c + 0.01, KERB + 0.3, KERB + H - 0.1), fill);
        } else if (kind === 'picket') {
          ctx.prop.box(...R(p0, p1, c - 0.03, c + 0.03, KERB + 0.65, KERB + 0.75), post);
          for (let a = p0 + 0.1; a < p1; a += 0.22) ctx.prop.box(...R(a, a + 0.1, c - 0.02, c + 0.02, KERB + 0.1, KERB + H), fill);
        } else {
          ctx.wood.box(...R(p0, p1, c - 0.05, c + 0.05, KERB + 0.1, KERB + H), fill);
        }
      };
      // Pieces no longer than 60 m, each drawn into its own chunk.
      for (let p = s0; p < s1 - 1e-6; p += 60) piece(p, Math.min(s1, p + 60));
      const box = alongX ? [s0, 0, c - 0.1, s1, KERB + H, c + 0.1] : [c - 0.1, 0, s0, c + 0.1, KERB + H, s1];
      world.physics.addBox(box[0], box[1], box[2], box[3], box[4], box[5], 'fence', F().SOLID | F().CAMERA | (kind === 'chain' ? 0 : F().SHOTS));
    }
  }

  /**
   * A straight flight of stairs people can walk up (a ramp collider under
   * drawn steps), from (x, z) at height y0 to height y1, running `len`
   * metres along `dir` ('n', 's', 'e', 'w'), `w` wide, with a rail each side.
   */
  function stairs(world, surf, x, z, dir, len, w, y0, y1, hex, opts) {
    opts = opts || {};
    const dx = dir === 'e' ? 1 : dir === 'w' ? -1 : 0;
    const dz = dir === 's' ? 1 : dir === 'n' ? -1 : 0;
    const steps = Math.max(2, Math.round((y1 - y0) / 0.22));
    const run = len / steps;
    const col = Array.isArray(hex) ? hex : VH.col(hex);
    const hw = w / 2;
    for (let i = 0; i < steps; i++) {
      const a = i * run;
      const b = (i + 1) * run;
      const top = y0 + ((i + 1) * (y1 - y0)) / steps;
      const bot = opts.open ? top - 0.12 : y0;
      if (dx) surf.box(Math.min(x + dx * a, x + dx * b), bot, z - hw, Math.max(x + dx * a, x + dx * b), top, z + hw, col);
      else surf.box(x - hw, bot, Math.min(z + dz * a, z + dz * b), x + hw, top, Math.max(z + dz * a, z + dz * b), col);
    }
    // The ramp collider: local +Z is up the stairs.
    const yaw = dir === 's' ? 0 : dir === 'n' ? Math.PI : dir === 'e' ? Math.PI / 2 : -Math.PI / 2;
    const cx = x + (dx * len) / 2;
    const cz = z + (dz * len) / 2;
    world.physics.addRamp(cx, cz, hw, len / 2, yaw, opts.base === undefined ? Math.min(y0, 0) : opts.base, y0, y1, opts.tag || 'stairs', F().SOLID);
    if (opts.rails !== false) {
      // Solid rails each side (people go up the stairs, not through the rails).
      for (const s of [-1, 1]) {
        if (dx) block(world, x, 0, z + s * hw - 0.08, x + dx * len, Math.max(y0, y1) + 1.0, z + s * hw + 0.08, 'railing', F().SOLID | F().SHOTS);
        else block(world, x + s * hw - 0.08, 0, z, x + s * hw + 0.08, Math.max(y0, y1) + 1.0, z + dz * len, 'railing', F().SOLID | F().SHOTS);
      }
      const rc = VH.col(opts.railHex || 0x3f454c);
      for (const s of [-1, 1]) {
        const ox = dx ? 0 : s * (hw - 0.05);
        const oz = dz ? 0 : s * (hw - 0.05);
        beam(surf, x + ox, y0 + 1.0, z + oz, x + ox + dx * len, y1 + 1.0, z + oz + dz * len, 0.06, rc);
        for (let k = 0; k <= 2; k++) {
          const t = k / 2;
          const px = x + ox + dx * len * t;
          const pz = z + oz + dz * len * t;
          const py = y0 + (y1 - y0) * t;
          surf.box(px - 0.04, py, pz - 0.04, px + 0.04, py + 1.0, pz + 0.04, rc);
        }
      }
    }
  }

  /**
   * A drivable ramp: a sloped slab on trestles from its low end (x, z) at
   * height y0 running `len` metres along `heading` up to height y1, `w` wide.
   * Returns the high end.
   */
  function ramp(world, surf, x, z, heading, w, len, y0, y1, hex, tag) {
    const sx = Math.sin(heading), sz = Math.cos(heading);
    const cx = x + (sx * len) / 2, cz = z + (sz * len) / 2;
    const rise = y1 - y0;
    const ang = Math.atan2(rise, len);
    const slope = Math.hypot(rise, len);
    const col = Array.isArray(hex) ? hex : VH.col(hex);
    // The deck (tilted about its own X so its far end is the high one).
    _q.setFromAxisAngle(Y1, heading);
    _q.multiply(new THREE.Quaternion().setFromAxisAngle(X1, -ang));
    _v.set(cx, (y0 + y1) / 2 - 0.1, cz);
    _s.set(w, 0.2, slope);
    _m.compose(_v, _q, _s);
    surf.merge(unit(), _m, col);
    // Trestles under it.
    const leg = VH.colMul(col, 0.7);
    for (let k = 1; k <= 3; k++) {
      const t = k / 3.2;
      const px = x + sx * len * t, pz = z + sz * len * t;
      const py = y0 + rise * t - 0.2;
      if (py < 0.3) continue;
      surf.orientedBox(px, pz, w / 2 - 0.1, 0.12, heading, 0, py, leg);
    }
    world.physics.addRamp(cx, cz, w / 2, len / 2, heading, 0, y0, y1, tag || 'plank', F().SOLID);
    return { x: x + sx * len, z: z + sz * len, y: y1 };
  }

  /** A flat walkable deck (a landing, a catwalk floor). */
  function deck(world, surf, x0, z0, x1, z1, y, hex, tag, t) {
    surf.box(x0, y - (t || 0.2), z0, x1, y, z1, Array.isArray(hex) ? hex : VH.col(hex), { bottom: true });
    world.physics.addBox(x0, y - (t || 0.2), z0, x1, y, z1, tag || 'metal', F().SOLID | F().SHOTS);
  }

  /** Railings round a deck's edges, leaving openings [{ side, a0, a1 }]. */
  function deckRails(world, x0, z0, x1, z1, y, open, hex) {
    const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
    const edges = { n: [x0, z0, x1, z0], s: [x0, z1, x1, z1], w: [x0, z0, x0, z1], e: [x1, z0, x1, z1] };
    for (const side of Object.keys(edges)) {
      const [ax, az, bx, bz] = edges[side];
      const alongX = side === 'n' || side === 's';
      let pieces = [[alongX ? ax : az, alongX ? bx : bz]];
      for (const o of open || []) {
        if (o.side !== side) continue;
        const next = [];
        for (const [p0, p1] of pieces) {
          if (o.a1 <= p0 || o.a0 >= p1) next.push([p0, p1]);
          else {
            if (o.a0 > p0) next.push([p0, o.a0]);
            if (o.a1 < p1) next.push([o.a1, p1]);
          }
        }
        pieces = next;
      }
      for (const [p0, p1] of pieces) {
        if (p1 - p0 < 0.3) continue;
        if (alongX) VH.Landmarks.railing(world, ctx, p0, az, p1, az, y, { color: hex || 0x3f454c });
        else VH.Landmarks.railing(world, ctx, ax, p0, ax, p1, y, { color: hex || 0x3f454c });
      }
    }
  }

  /**
   * A zig-zag stair in a steel frame (flights of about 4.4 m rise), its
   * north edge on z = sz0, centred on x = sx, from the ground up to yTop.
   * Returns { foot, fx0, fx1, fz0, fz1 }.
   */
  function stairFrame(world, ctx, sx, sz0, yTop, legHex) {
    const legC = VH.col(legHex || 0x8f969c);
    const fw = 1.6;
    const flights = Math.ceil((yTop - KERB) / 4.4);
    const rise = (yTop - KERB) / flights;
    const run = rise * 1.9;
    const fx0 = sx - run / 2 - 1.8, fx1 = sx + run / 2 + 1.8;
    const fz0 = sz0, fz1 = sz0 + fw * 2 + 0.2;
    for (let f = 0; f < flights; f++) {
      const yA = KERB + f * rise;
      const yB = yA + rise;
      const east = f % 2 === 0;
      const lane = east ? fz1 - fw / 2 : fz0 + fw / 2; // first flight on the outer lane
      const startX = east ? sx - run / 2 : sx + run / 2;
      // The first flight is closed underneath (its collider reaches the ground); the rest float.
      stairs(world, ctx.prop, startX, lane, east ? 'e' : 'w', run, fw, yA, yB, 0x8f969c, { open: f > 0, rails: false, base: f > 0 ? yA - 0.4 : undefined, tag: 'metal' });
      // Landing at the top end of this flight, across both lanes.
      const lx0 = east ? sx + run / 2 : fx0;
      const lx1 = east ? fx1 : sx - run / 2;
      deck(world, ctx.prop, lx0, fz0, lx1, fz1, yB, 0x8f969c, 'metal', 0.15);
    }
    // The frame: corner posts and an outer rail per storey.
    for (const px of [fx0, fx1]) for (const pz of [fz0, fz1]) ctx.prop.box(px - 0.08, KERB, pz - 0.08, px + 0.08, yTop + 1.05, pz + 0.08, legC);
    for (let f = 1; f <= flights; f++) {
      const yy = KERB + f * rise + 1.0;
      beam(ctx.prop, fx0, yy, fz1, fx1, yy, fz1, 0.06, legC);
      beam(ctx.prop, fx0, yy, fz0, fx0, yy, fz1, 0.06, legC);
      beam(ctx.prop, fx1, yy, fz0, fx1, yy, fz1, 0.06, legC);
    }
    // Guard bars on the outer side and both ends, all the way up (the colliders below are this cage).
    for (let yy = KERB + 0.55; yy < yTop + 1.0; yy += 1.1) {
      beam(ctx.prop, fx0, yy, fz1, fx1, yy, fz1, 0.05, legC);
      if (yy > KERB + 0.6) for (const px of [fx0, fx1]) beam(ctx.prop, px, yy, fz0, px, yy, fz1, 0.05, legC);
    }
    world.physics.addBox(fx0 - 0.1, 0, fz1, fx1 + 0.1, yTop + 1.05, fz1 + 0.12, 'railing', F().SOLID);
    world.physics.addBox(fx0 - 0.12, KERB + 0.6, fz0, fx0, yTop + 1.05, fz1, 'railing', F().SOLID);
    world.physics.addBox(fx1, KERB + 0.6, fz0, fx1 + 0.12, yTop + 1.05, fz1, 'railing', F().SOLID);
    // The last landing (the top of the stair) is at the east end when the flight count is odd.
    const eastTop = flights % 2 === 1;
    const top = eastTop ? { x0: sx + run / 2, x1: fx1 } : { x0: fx0, x1: sx - run / 2 };
    return { foot: { x: sx - run / 2 - 1, z: fz1 - fw / 2 }, fx0, fx1, fz0, fz1, top, run, flights, rise };
  }

  /**
   * A water tower: four legs with cross-bracing, a round tank with a conical
   * cap, a catwalk round the tank's foot. o = { tank, cap, leg, word,
   * stair: true (a zig-zag stair up the side so Jay can reach the catwalk) }.
   * Returns { catwalkY, stairFoot: { x, z } }.
   */
  function waterTower(world, x, z, o) {
    o = o || {};
    const ctx = world.ctxAt(x, z);
    const H = o.h || 22; // catwalk height
    const R = o.r || 6;
    const legC = VH.col(o.leg || 0x8f969c);
    const tankC = VH.col(o.tank || 0xc9ced3);
    const L = R * 0.8;
    const legs = [[-L, -L], [L, -L], [L, L], [-L, L]];
    for (const [lx, lz] of legs) {
      beam(ctx.prop, x + lx * 1.15, KERB, z + lz * 1.15, x + lx, H, z + lz, 0.45, legC);
      ctx.concrete.box(x + lx * 1.15 - 0.6, 0, z + lz * 1.15 - 0.6, x + lx * 1.15 + 0.6, KERB + 0.5, z + lz * 1.15 + 0.6, VH.col(0xb8b2a6));
      world.physics.addBox(x + lx * 1.15 - 0.85, 0, z + lz * 1.15 - 0.85, x + lx * 1.15 + 0.85, H, z + lz * 1.15 + 0.85, 'metal', F().SOLID | F().SHOTS);
    }
    // Cross-bracing on each face, two tiers.
    for (let i = 0; i < 4; i++) {
      const [ax, az] = legs[i];
      const [bx, bz] = legs[(i + 1) % 4];
      for (const [y0, y1] of [[KERB + 1, H * 0.5], [H * 0.5, H - 0.5]]) {
        const k0 = 1.15 - 0.15 * ((y0 - KERB) / H);
        const k1 = 1.15 - 0.15 * ((y1 - KERB) / H);
        beam(ctx.prop, x + ax * k0, y0, z + az * k0, x + bx * k1, y1, z + bz * k1, 0.12, legC);
        beam(ctx.prop, x + bx * k0, y0, z + bz * k0, x + ax * k1, y1, z + az * k1, 0.12, legC);
      }
      const k = 1.15 - 0.15 * 0.5;
      beam(ctx.prop, x + ax * k, H * 0.5, z + az * k, x + bx * k, H * 0.5, z + bz * k, 0.18, legC);
    }
    // Catwalk ring (an octagon of planks) and its rail.
    const cw = R + 1.4;
    ctx.prop.cylinder(x, H - 0.25, z, cw, cw, 0.25, 16, legC, true);
    ctx.prop.cylinder(x, H, z, cw, cw, 1.05, 16, VH.col(0x6a7078), false);
    world.physics.addBox(x - cw, H - 0.25, z - cw, x + cw, H, z + cw, 'metal', F().SOLID | F().SHOTS);
    // The rail ring blocks walking off; a ring of thin colliders.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rx = x + Math.cos(a) * (cw - 0.1);
      const rz = z + Math.sin(a) * (cw - 0.1);
      if (o.stair && rz > z + cw * 0.45 && Math.abs(rx - x) > cw * 0.25 && Math.abs(rx - x) < cw * 0.95 && (rx > x) === (Math.ceil((H - KERB) / 4.4) % 2 === 1)) continue; // the opening onto the stair's bridge
      world.physics.addBox(rx - 0.5, H, rz - 0.5, rx + 0.5, H + 1.05, rz + 0.5, 'railing', F().SOLID);
    }
    // Tank, cap, finial.
    const th = o.th || 9;
    ctx.prop.cylinder(x, H, z, R, R, th, 18, tankC, false);
    ctx.prop.cylinder(x, H + th, z, R + 0.15, 0.6, R * 0.55, 18, VH.col(o.cap || 0xaab0b6), true);
    ctx.prop.cylinder(x, H + th + R * 0.55, z, 0.25, 0.1, 1.4, 6, legC, true);
    for (const yb of [H + 0.4, H + th - 0.4]) ctx.prop.cylinder(x, yb, z, R + 0.08, R + 0.08, 0.25, 18, VH.colMul(tankC, 0.8), false);
    world.physics.addBox(x - R * 0.72, H, z - R * 0.72, x + R * 0.72, H + th, z + R * 0.72, 'metal');
    world.beacons.push({ x, y: H + th + R * 0.55 + 1.5, z });
    const out = { catwalkY: H, stairFoot: null };
    if (o.stair) {
      const sf = stairFrame(world, ctx, x, z + cw + 0.2, H, o.leg || 0x8f969c);
      // A bridge from the top landing to the catwalk ring.
      const bx0 = sf.top.x0, bx1 = sf.top.x1;
      const near = Math.max(Math.abs(bx0 - x), 0);
      const zr = Math.sqrt(Math.max(1, cw * cw - near * near));
      deck(world, ctx.prop, bx0, z + zr - 1.0, bx1, sf.fz0 + 0.2, H, 0x8f969c, 'metal', 0.15);
      out.stairFoot = sf.foot;
      out.bridge = { x: (bx0 + bx1) / 2, z: (z + zr - 1 + sf.fz0) / 2 };
    }
    return out;
  }

  /** Spots for parked cars (added to the traffic system's kerbside spots by a System). */
  const PARKED_TYPES = ['halcyon', 'pipit', 'mesa', 'porter', 'vireo', 'halcyon', 'pipit'];
  function parkedSpot(x, z, heading, seed) {
    return { x, z, heading, road: null, type: PARKED_TYPES[Math.abs(seed | 0) % PARKED_TYPES.length], seed: Math.abs(seed | 0) * 7919 + 13, vehicle: null, used: false };
  }

  /** Add spots to the game's parked-car streamer (called once from a System). */
  function addParkedSpots(game, list) {
    const V = game && game.vehicles;
    if (!V || !V.spots || !list) return;
    for (const s of list) V.spots.push(s);
  }

  /** Keep kerbside parked cars out of driveways and gates: rects [[x0, z0, x1, z1], ...]. */
  function clearSpots(game, rects) {
    const V = game && game.vehicles;
    if (!V || !V.spots) return;
    for (const s of V.spots) {
      if (s.road && rects.some((r) => s.x > r[0] && s.x < r[2] && s.z > r[1] && s.z < r[3])) s.used = true;
    }
  }

  /** A simple moored boat (hull, cabin, maybe a mast) merged into surfaces. dir: +1 bow east, -1 west; along 'x' or 'z'. */
  function boat(world, x, z, len, axis, dir, o) {
    o = o || {};
    const ctx = world.ctxAt(x, z);
    const hullC = VH.col(o.hull || 0xf4f2ec);
    const trimC = VH.col(o.trim || 0x1f4f7a);
    const deckC = VH.col(o.deck || 0xc8a878);
    const w = o.w || len * 0.34;
    const y0 = -1.3;
    const fh = o.fh || 1.6; // freeboard above y0
    const along = axis === 'x';
    const P = (a, c, y) => (along ? [x + a * dir, y, z + c] : [x + c, y, z + a * dir]);
    const hl = len / 2;
    // Hull: a box for the stern two-thirds and a wedge for the bow.
    const sternEnd = hl * 0.35;
    const B = (a0, a1, c0, c1, yA, yB, col) => {
      const p = P(a0, c0, yA), q = P(a1, c1, yB);
      ctx.prop.box(Math.min(p[0], q[0]), yA, Math.min(p[2], q[2]), Math.max(p[0], q[0]), yB, Math.max(p[2], q[2]), col);
    };
    B(-hl, sternEnd, -w / 2, w / 2, y0, y0 + fh, hullC);
    B(-hl, sternEnd, -w / 2 - 0.02, w / 2 + 0.02, y0 + fh * 0.55, y0 + fh * 0.7, trimC);
    // Bow wedge (polygons).
    const top = y0 + fh;
    const tip = P(hl, 0, top + 0.15);
    const tipLow = P(hl - 0.6, 0, y0 + 0.3);
    const l = P(sternEnd, -w / 2, top), r = P(sternEnd, w / 2, top);
    const lb = P(sternEnd, -w / 2, y0), rb = P(sternEnd, w / 2, y0);
    const flip = (pts) => (dir * (along ? 1 : -1) > 0 ? pts : pts.slice().reverse());
    ctx.prop.polygon(flip([l, tip, r]), deckC);
    ctx.prop.polygon(flip([r, tip, tipLow, rb]), hullC);
    ctx.prop.polygon(flip([lb, tipLow, tip, l]), hullC);
    // Deck and cabin.
    const dk = P(-hl + 0.2, -w / 2 + 0.2, top), dk2 = P(sternEnd, w / 2 - 0.2, top);
    ctx.prop.topRect(Math.min(dk[0], dk2[0]), Math.min(dk[2], dk2[2]), Math.max(dk[0], dk2[0]), Math.max(dk[2], dk2[2]), top + 0.01, deckC);
    const cab = o.cabin === undefined ? 0.5 : o.cabin;
    if (cab) {
      const c0 = -hl * 0.35, c1 = hl * 0.3;
      B(c0, c1, -w * 0.33, w * 0.33, top, top + 1.2 * cab * 2, VH.col(o.cabinHex || 0xf4f2ec));
      B(c0 + 0.3, c1 + 0.05, -w * 0.34, w * 0.34, top + 0.55 * cab * 2, top + 1.0 * cab * 2, VH.col(0x2a3a4a));
      if (o.flybridge) B(c0 + 0.6, c1 - 0.4, -w * 0.28, w * 0.28, top + 2.4 * cab, top + 2.4 * cab + 0.9, VH.col(o.cabinHex || 0xf4f2ec));
    }
    if (o.mast) {
      const m = P(hl * 0.1, 0, top);
      ctx.prop.cylinder(m[0], top, m[2], 0.09, 0.06, o.mast, 6, VH.col(0xd8d8d8), true);
      const bEnd = P(-hl * 0.7, 0, top + 1.8);
      beam(ctx.prop, m[0], top + 1.8, m[2], bEnd[0], bEnd[1], bEnd[2], 0.1, VH.col(0xd8d8d8));
      ctx.prop.box(Math.min(m[0], bEnd[0]) - (along ? 0 : 0.18), top + 1.9, Math.min(m[2], bEnd[2]) - (along ? 0.18 : 0), Math.max(m[0], bEnd[0]) + (along ? 0 : 0.18), top + 2.3, Math.max(m[2], bEnd[2]) + (along ? 0.18 : 0), VH.col(o.sail || 0x2f5f8f));
      // Masthead light (glows at night).
      ctx.screen.box(m[0] - 0.1, top + o.mast, m[2] - 0.1, m[0] + 0.1, top + o.mast + 0.2, m[2] + 0.1, VH.col(0xfff2c8, 2));
      block(world, m[0] - 0.15, top, m[2] - 0.15, m[0] + 0.15, top + o.mast + 0.2, m[2] + 0.15, 'pole');
    }
    // A collider so nobody walks through it from the jetty.
    const a = P(-hl, -w / 2, 0), b = P(hl, w / 2, 0);
    // Tall enough that nobody stands on it and walks through the cabin, mast or boom.
    world.physics.addBox(Math.min(a[0], b[0]), y0, Math.min(a[2], b[2]), Math.max(a[0], b[0]), top + (cab || o.mast ? 3.2 : 0.3), Math.max(a[2], b[2]), 'metal', F().SOLID | F().SHOTS);
  }

  /** A cactus (saguaro): trunk and two arms, merged. */
  function cactus(world, x, z, h, seed) {
    const ctx = world.ctxAt(x, z);
    const g = VH.col(0x4f7a3a);
    ctx.prop.cylinder(x, KERB, z, 0.35, 0.3, h, 8, g, true);
    const s = seed % 2 ? 1 : -1;
    ctx.prop.cylinder(x + 0.9 * s, KERB + h * 0.45, z, 0.22, 0.2, h * 0.35, 8, g, true);
    beam(ctx.prop, x, KERB + h * 0.45, z, x + 0.9 * s, KERB + h * 0.45, z, 0.4, g);
    if (seed % 3) {
      ctx.prop.cylinder(x - 0.8 * s, KERB + h * 0.6, z, 0.2, 0.18, h * 0.25, 8, g, true);
      beam(ctx.prop, x, KERB + h * 0.6, z, x - 0.8 * s, KERB + h * 0.6, z, 0.36, g);
    }
    world.physics.addBox(x - 0.35, 0, z - 0.35, x + 0.35, KERB + h, z + 0.35, 'pole', F().SOLID | F().SHOTS);
    // The arms (and the elbow up to each arm's tip).
    block(world, Math.min(x, x + 1.15 * s), KERB + h * 0.45 - 0.25, z - 0.3, Math.max(x, x + 1.15 * s), KERB + h * 0.8, z + 0.3, 'pole');
    if (seed % 3) block(world, Math.min(x, x - 1.05 * s), KERB + h * 0.6 - 0.25, z - 0.3, Math.max(x, x - 1.05 * s), KERB + h * 0.85, z + 0.3, 'pole');
  }

  /** A trailer home: a long box with a window band, a door, an awning and a little deck. */
  function trailer(world, x, z, len, hex, o) {
    o = o || {};
    const ctx = world.ctxAt(x, z);
    const w = 3.8;
    const x0 = x - len / 2, x1 = x + len / 2;
    const z0 = z - w / 2, z1 = z + w / 2;
    const y0 = KERB + 0.6, y1 = y0 + 3.0;
    const body = VH.col(hex);
    ctx.prop.box(x0, y0, z0, x1, y1, z1, body);
    // Rounded-ish ends: a narrower cap at each end.
    ctx.prop.box(x0 - 0.35, y0 + 0.25, z0 + 0.35, x0, y1 - 0.25, z1 - 0.35, body);
    ctx.prop.box(x1, y0 + 0.25, z0 + 0.35, x1 + 0.35, y1 - 0.25, z1 - 0.35, body);
    // Skirt, roof strip, trim band.
    ctx.prop.box(x0 + 0.2, KERB, z0 + 0.2, x1 - 0.2, y0, z1 - 0.2, VH.col(0x7d7466));
    ctx.prop.box(x0 + 0.3, y1, z0 + 0.4, x1 - 0.3, y1 + 0.18, z1 - 0.4, VH.colMul(body, 0.85));
    ctx.prop.box(x0 - 0.02, y0 + 0.75, z0 - 0.02, x1 + 0.02, y0 + 0.95, z1 + 0.02, VH.col(o.trim || 0x2f4f6f));
    // Windows (both long sides), one of them lit at night.
    const glass = VH.col(0x26323e);
    for (let a = x0 + 1.2; a < x1 - 1.6; a += 2.6) {
      const lit = o.lit && Math.abs(a - x) < 2;
      for (const s of [-1, 1]) {
        const zz = s < 0 ? z0 - 0.04 : z1 + 0.04;
        (lit ? ctx.screen : ctx.prop).box(a, y0 + 1.25, Math.min(zz, zz + s * 0.02), a + 1.4, y0 + 2.25, Math.max(zz, zz + s * 0.02), lit ? VH.col(0xffd9a0, 0.9) : glass);
      }
    }
    // Door on the lane side (dz: which side faces the lane) with steps.
    const s = o.side || 1;
    const dz = s > 0 ? z1 : z0;
    const dx = x + len * 0.2;
    ctx.prop.box(dx - 0.5, y0, dz - 0.06, dx + 0.5, y0 + 2.1, dz + 0.06, VH.col(o.door || 0xe9e4d8));
    ctx.wood.box(dx - 0.9, KERB, Math.min(dz, dz + s * 1.6), dx + 0.9, KERB + 0.3, Math.max(dz, dz + s * 1.6), VH.col(0x8b6a45));
    ctx.wood.box(dx - 0.9, KERB, Math.min(dz + s * 1.6, dz + s * 2.3), dx + 0.9, KERB + 0.15, Math.max(dz + s * 1.6, dz + s * 2.3), VH.col(0x8b6a45));
    // Striped awning over the door side.
    const aw0 = x - len * 0.35, aw1 = x + len * 0.42;
    for (let a = aw0, k = 0; a < aw1; a += 1.0, k++) {
      tiltBox(ctx.prop, a + 0.5, y1 - 0.45, dz + s * 1.1, 1.0, 0.08, 2.2, 0, s * 0.22, k % 2 ? 0xf4efe2 : o.awning || 0x3f8f6f);
    }
    for (const ax of [aw0 + 0.2, aw1 - 0.2]) {
      ctx.prop.box(ax - 0.04, KERB, dz + s * 2.1 - 0.04, ax + 0.04, y1 - 0.7, dz + s * 2.1 + 0.04, VH.col(0xcfd3d6));
      block(world, ax - 0.15, 0, dz + s * 2.1 - 0.15, ax + 0.15, y1 - 0.4, dz + s * 2.1 + 0.15);
    }
    world.physics.addBox(x0 - 0.35, 0, z0, x1 + 0.35, y1 + 0.2, z1, 'metal');
    // The door steps.
    world.physics.addBox(dx - 0.9, 0, Math.min(dz, dz + s * 1.6), dx + 0.9, KERB + 0.3, Math.max(dz, dz + s * 1.6), 'plank', F().SOLID);
  }

  /** Paint a building or yard onto the minimap and the full map. */
  function mapBox(g, R, x0, z0, x1, z1, col, shadow) {
    if (shadow !== false) {
      g.fillStyle = 'rgba(0, 0, 0, 0.3)';
      R(x0 + 2, z0 + 2, x1 + 2, z1 + 2);
    }
    g.fillStyle = col;
    R(x0, z0, x1, z1);
  }

  VH.WNKit = {
    KERB, tiles, pave, mark, solid, beam, tiltBox, gable, building, lamp, festoon, fence, stairs, deck, deckRails,
    waterTower, parkedSpot, addParkedSpots, boat, cactus, mapBox, trailer, ramp, stairFrame, clearSpots,
    block,
    // Signs: the board itself is solid too (world.js only gives posts colliders).
    sign: (world, spec) => {
      VH.Landmarks.sign(world, spec);
      if (!spec.flat) world.physics.addOrientedBox(spec.x, spec.z, spec.w / 2 + 0.06, 0.12, spec.yaw || 0, spec.y - spec.h / 2 - 0.06, spec.y + spec.h / 2 + 0.06, 'sign', F().SOLID | F().SHOTS);
    },
  };
})();
