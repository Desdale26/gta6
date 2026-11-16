/*
 * carnival-midway.js — Wonder Wharf's midway: the stall booths, the way a
 * stall game runs (VH.Carnival.stall), the signs, and the tickets' other
 * half, the Prize Shack. The fair system itself is js/carnival.js (its header
 * documents the attraction API); the games are js/carnival-games.js and the
 * arcade cabinets js/carnival-arcade.js.
 *
 * ------------------------------------------------------------ the booths
 * BOOTHS (below) are striped stalls in the fair's north-west corner, round
 * the Skyhook: a back wall, two sides, a counter Jay stands at and a canopy
 * with bulbs and the stall's name. They are static (merged into the chunk
 * builders by a builder registered with VH.Districts, which runs when the
 * world is built) and solid. Every stall name, and the arcade cabinets'
 * marquees, is painted on one canvas: all the signs are one draw call.
 * A game works in its booth's own frame: u across (to the right as Jay faces
 * it), y up from the plaza, v towards Jay (the counter's front is v = d / 2).
 *
 * ------------------------------------------------------- a stall game
 *   VH.Carnival.stall({
 *     id, name, price, unit,      as for VH.Carnival.define (kind 'game', scored)
 *     booth: 'hoopla',            a BOOTHS key, or frame: { x, z, yaw, w, d } for a stall of its own
 *     stand: [u, v],              where Jay stands (default: in front of the counter's middle)
 *     cam: [u, y, v, tu, ty, tv, fov]   the camera while he plays, in the frame
 *     seconds: 45,                a go's length (null: the game ends a go itself, g.over = true)
 *     howto: ['line', ...],       the rules, on the card before the first go
 *     keys: 'Mouse  aim · ...',   the controls (the top strip while playing, and on the card)
 *     prize: 'line',              what it pays, on the card ('A ticket for every 40 points')
 *     tickets(score),             tickets for one go (at least 1 for a go played to the end)
 *     build(kit),                 once: meshes into this.group (frame coordinates); kit below
 *     begin(g, s),                a go starts: g = { n: 1 | 2, score, t, over, ... } is the go's own
 *     play(dt, g, s),             every frame of a go
 *     after(dt, g, s),            every frame after the go's whistle (things still falling)
 *     idle(dt),                   while nobody plays it (and Jay is near): the fair's own life
 *     pose(g, s),                 Jay's pose this frame (a joint-target object; default: hands on the counter)
 *     verdict(g),                 a line for the results ('3 ducks, 2 gold')
 *     reset(),                    put the props back (after a go, or a forced end)
 *   });
 * The framework walks Jay to the counter, swings the camera to the stall,
 * shows the card (rules, controls, best, tickets; E / Space / A to play,
 * R / X to challenge a friend), counts down, runs the go with a clock, and
 * after the whistle either hands over to Player 2 or finishes with the
 * results card (the winner named on a two-player go). Esc stops a go.
 *
 * The kit (also this.kit): kit.frame (to world: kit.wx(u, v), kit.wz(u, v)),
 * kit.cursor(g, dt, speed, x0, x1, y0, y1) (mouse / right stick / keys move
 * g.cx, g.cy), kit.reticle(u, y, v) / kit.reticle(null), kit.burst(u, y, v,
 * colour, n) (confetti), kit.mesh(geometry, max) (an instanced mesh in the
 * group), kit.solid(...) (a builder).
 *
 * --------------------------------------------------------- the Prize Shack
 * Tickets in, prizes out (PRIZES below): plush toys for the shelf (counted
 * in the stats, the phone and the shelf of the shack itself), and a few that
 * do something: the Wonder Wharf cap (Jay wears it), armour, a cash voucher,
 * the gold paint at the body shops, and the giant plush crab.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const Carnival = VH.Carnival;
  if (!Carnival) return;
  const KERB = 0.15;
  const HIP = Carnival.HIP;
  const PI = Math.PI;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const el = (tag, cls, text) => VH.util.el(tag, cls, text);
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  // ---------------------------------------------------------------- layout
  // The booths: middle (x, z), the way the front faces (yaw), width across, depth; colours; the sign.
  const BOOTHS = {
    shoot: { x: 819, z: -42.6, yaw: 0, w: 12, d: 6, a: 0xe0403a, b: 0xf6f1e4, sign: ['SHARPSHOOTER ALLEY', 'Cork rifles · Ducks · Targets'] },
    hoopla: { x: 830, z: -42.6, yaw: 0, w: 8, d: 6, a: 0x37b8ff, b: 0xffffff, sign: ['RING FLING', 'Hoopla · Ring a peg'] },
    cans: { x: 839, z: -42.6, yaw: 0, w: 8, d: 6, a: 0x3fae5a, b: 0xffffff, sign: ['TIN CAN TUMBLE', 'Three balls · Knock \'em flat'] },
    hoops: { x: 848, z: -42.6, yaw: 0, w: 8, d: 6, a: 0xff8a3c, b: 0xffffff, sign: ['BOARDWALK HOOPS', 'Sink it, win it'] },
    shack: { x: 857.5, z: -42.6, yaw: 0, w: 9, d: 6, a: 0xb45cff, b: 0xffd24a, sign: ['PRIZE SHACK', 'Tickets in · Prizes out'] },
    crab: { x: 815.4, z: -30.5, yaw: PI / 2, w: 7, d: 6, a: 0xff5c95, b: 0xffffff, sign: ['CRAB BONKERS', 'Bonk a crab · Spare the gulls'] },
    duck: { x: 815.4, z: -20.5, yaw: PI / 2, w: 9, d: 6, a: 0xffd24a, b: 0x2fb7b0, sign: ['HOOK-A-DUCK', 'Hook a duck · Gold ones pay big'] },
  };
  // Stalls with no booth (their own frames): the strongman's bell, the claw machine.
  const STANDS = {
    striker: { x: 858, z: -22, yaw: PI / 2, w: 3, d: 2, a: 0xe0403a, b: 0xffd24a, sign: ['THE BELL RINGER', 'Test your strength'] },
    grabber: { x: 874.6, z: 88, yaw: PI / 2, w: 1.9, d: 1.9 },
  };
  // The sign atlas: 2 columns × 8 rows of 512 × 128 px.
  const ATLAS = { w: 1024, h: 1024, cw: 512, ch: 128 };
  const SIGN_SLOTS = {}; // key → slot index (filled as signs are painted)
  const SIGNS = []; //      [key, lines, colour a, colour b] waiting for the atlas
  let atlasTex = null;

  /** A frame: a stall's own coordinates (u across, v towards the front) to the world. */
  function frame(F) {
    const c = Math.round(Math.cos(F.yaw) * 1e6) / 1e6, s = Math.round(Math.sin(F.yaw) * 1e6) / 1e6;
    return {
      x: F.x, z: F.z, yaw: F.yaw, w: F.w, d: F.d, c, s,
      wx(u, v) { return F.x + u * c + v * s; },
      wz(u, v) { return F.z - u * s + v * c; },
      /** A box in the frame, as world min/max (the frame turns by right angles only). */
      box(u0, v0, u1, v1, out) {
        const ax = this.wx(u0, v0), az = this.wz(u0, v0), bx = this.wx(u1, v1), bz = this.wz(u1, v1);
        out[0] = Math.min(ax, bx); out[1] = Math.min(az, bz); out[2] = Math.max(ax, bx); out[3] = Math.max(az, bz);
        return out;
      },
    };
  }
  const _r = [0, 0, 0, 0];

  // ------------------------------------------------------------ the signs
  function paintAtlas() {
    if (atlasTex) return atlasTex;
    const cv = document.createElement('canvas');
    cv.width = ATLAS.w;
    cv.height = ATLAS.h;
    const g = cv.getContext('2d');
    g.fillStyle = '#20123a';
    g.fillRect(0, 0, ATLAS.w, ATLAS.h);
    SIGNS.forEach(([key, lines, a, b], i) => {
      SIGN_SLOTS[key] = i;
      const x = (i % 2) * ATLAS.cw, y = Math.floor(i / 2) * ATLAS.ch;
      if (typeof lines === 'function') {
        // A painter of its own (the strongman's scale): it draws into the slot.
        g.save();
        lines(g, x, y, ATLAS.cw, ATLAS.ch);
        g.restore();
      } else paintSign(g, x, y, ATLAS.cw, ATLAS.ch, lines, a, b);
    });
    atlasTex = new THREE.CanvasTexture(cv);
    atlasTex.colorSpace = THREE.SRGBColorSpace;
    atlasTex.anisotropy = 4;
    return atlasTex;
  }

  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

  function paintSign(g, x, y, w, h, lines, a, b) {
    g.save();
    g.translate(x, y);
    // A board in the stall's colour, a darker rim and bulbs all round.
    g.fillStyle = '#1a0f2e';
    g.fillRect(0, 0, w, h);
    const r = 18;
    g.fillStyle = hex(a);
    g.beginPath();
    g.roundRect(6, 6, w - 12, h - 12, r);
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = hex(b);
    g.stroke();
    for (let k = 0; k < 2; k++) {
      const n = k ? 7 : 22;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const pts = k ? [[12, 12 + t * (h - 24)], [w - 12, 12 + t * (h - 24)]] : [[12 + t * (w - 24), 12], [12 + t * (w - 24), h - 12]];
        for (const [px, py] of pts) {
          g.fillStyle = (i + k) % 2 ? '#fff6c8' : '#ffd24a';
          g.beginPath();
          g.arc(px, py, 4.2, 0, PI * 2);
          g.fill();
        }
      }
    }
    // The name, white with a dark outline; the line under it smaller.
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    const fit = (text, size, maxW) => {
      let s = size;
      do {
        g.font = '900 ' + s + 'px "Arial Black", Impact, "Segoe UI", sans-serif';
        s -= 2;
      } while (g.measureText(text).width > maxW && s > 12);
    };
    fit(lines[0], lines[1] ? 50 : 64, w - 60);
    g.lineWidth = 9;
    g.strokeStyle = '#1a0f2e';
    const ty = lines[1] ? h * 0.42 : h * 0.52;
    g.strokeText(lines[0], w / 2, ty);
    g.fillStyle = '#ffffff';
    g.fillText(lines[0], w / 2, ty);
    if (lines[1]) {
      fit(lines[1], 24, w - 80);
      g.font = g.font.replace('900', '700');
      g.lineWidth = 5;
      g.strokeText(lines[1], w / 2, h * 0.76);
      g.fillStyle = '#fff1a8';
      g.fillText(lines[1], w / 2, h * 0.76);
    }
    g.restore();
  }

  /**
   * Ask for a sign: [key, lines, a, b]; returns the key (painted when the atlas is built).
   * lines may be a painter instead, f(ctx, x, y, w, h), for a slot drawn some other way.
   */
  function wantSign(key, lines, a, b) {
    if (!SIGNS.find((s) => s[0] === key)) SIGNS.push([key, lines, a, b]);
    return key;
  }

  /**
   * The signs' one mesh: quads [key, x, y, z, yaw, w, h, upright] (the quad's middle, facing
   * yaw); upright: the slot runs up the quad (its left edge at the bottom), for a tall board.
   * Built at the end of the world's build, once every quad is known.
   */
  const QUADS = [];
  function buildSignMesh(world) {
    if (!QUADS.length) return null;
    const tex = paintAtlas();
    const pos = [], uv = [], idx = [];
    for (const [key, x, y, z, yaw, w, h, upright] of QUADS) {
      const slot = SIGN_SLOTS[key];
      if (slot === undefined) continue;
      const u0 = ((slot % 2) * ATLAS.cw) / ATLAS.w, u1 = u0 + ATLAS.cw / ATLAS.w;
      const v1 = 1 - (Math.floor(slot / 2) * ATLAS.ch) / ATLAS.h, v0 = v1 - ATLAS.ch / ATLAS.h;
      // Right along the face (as you look at it), up.
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const fx = Math.sin(yaw) * 0.01, fz = Math.cos(yaw) * 0.01;
      const n = pos.length / 3;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pos.push(x + fx + (rx * su * w) / 2, y + (sv * h) / 2, z + fz + (rz * su * w) / 2);
        if (upright) uv.push(sv < 0 ? u0 : u1, su < 0 ? v1 : v0);
        else uv.push(su < 0 ? u0 : u1, sv < 0 ? v0 : v1);
      }
      // Face the quad towards yaw.
      idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    mesh.name = 'midway-signs';
    world.scene.add(mesh);
    return mesh;
  }

  // ------------------------------------------------------------ the booths
  /** One booth: walls, counter, canopy, bulbs, its sign; solid where it should be. */
  function buildBooth(world, key, B) {
    const F = frame(B);
    const ctx = world.ctxAt(B.x, B.z);
    const ph = world.physics;
    const C = VH.COLLIDE;
    const w2 = B.w / 2, d2 = B.d / 2;
    const A = VH.col(B.a), W = VH.col(B.b), wood = VH.col(0x9b6a3c), dark = VH.col(0x3a2a22);
    const put = (surf, u0, y0, v0, u1, y1, v1, col, opts) => {
      F.box(u0, v0, u1, v1, _r);
      surf.box(_r[0], y0, _r[1], _r[2], y1, _r[3], col, opts);
    };
    const hard = (u0, y0, v0, u1, y1, v1, tag, flags) => {
      F.box(u0, v0, u1, v1, _r);
      ph.addBox(_r[0], y0, _r[1], _r[2], y1, _r[3], tag || 'wall', flags === undefined ? C.SOLID | C.SHOTS | C.CAMERA : flags);
    };
    const H = 3.3; // the walls' height above the plaza
    // Floor boards inside.
    F.box(-w2 + 0.15, -d2 + 0.2, w2 - 0.15, d2, _r);
    ctx.wood.topRect(_r[0], _r[1], _r[2], _r[3], KERB + 0.02, VH.col(0x6b4a32));
    // Back wall: white outside, stripes inside.
    put(ctx.prop, -w2, KERB, -d2, w2, KERB + H, -d2 + 0.2, W);
    hard(-w2, 0, -d2, w2, KERB + H, -d2 + 0.2);
    const n = Math.max(2, Math.round(B.w / 0.8));
    for (let i = 0; i < n; i++) {
      const u0 = -w2 + 0.15 + ((B.w - 0.3) * i) / n, u1 = -w2 + 0.15 + ((B.w - 0.3) * (i + 1)) / n;
      put(ctx.prop, u0, KERB + 0.9, -d2 + 0.2, u1, KERB + H - 0.1, -d2 + 0.24, i % 2 ? W : A);
    }
    // The sides.
    for (const s of [-1, 1]) {
      const ua = s < 0 ? -w2 : w2 - 0.15, ub = s < 0 ? -w2 + 0.15 : w2;
      put(ctx.prop, ua, KERB, -d2, ub, KERB + H, d2, A);
      hard(ua, 0, -d2, ub, KERB + H, d2);
      // The canopy's front posts.
      const pu = s * (w2 - 0.08);
      put(ctx.prop, pu - 0.07, KERB, d2 + 0.78, pu + 0.07, KERB + H, d2 + 0.92, W);
      hard(pu - 0.09, 0, d2 + 0.76, pu + 0.09, KERB + H, d2 + 0.94, 'pole', C.SOLID | C.SHOTS);
    }
    // The counter: striped front, a wooden top.
    put(ctx.prop, -w2 + 0.15, KERB, d2 - 0.55, w2 - 0.15, KERB + 0.98, d2, A);
    for (let i = 0; i < n; i += 2) {
      const u0 = -w2 + 0.15 + ((B.w - 0.3) * i) / n, u1 = -w2 + 0.15 + ((B.w - 0.3) * (i + 1)) / n;
      put(ctx.prop, u0, KERB + 0.12, d2, u1, KERB + 0.86, d2 + 0.02, W);
    }
    put(ctx.wood, -w2 + 0.1, KERB + 0.98, d2 - 0.6, w2 - 0.1, KERB + 1.04, d2 + 0.06, wood);
    hard(-w2 + 0.15, 0, d2 - 0.55, w2 - 0.15, KERB + 1.04, d2 + 0.06, 'plank', C.SOLID | C.SHOTS);
    // The canopy: stripes running front to back, out over the counter, a scalloped valance with bulbs.
    const m = Math.max(3, Math.round((B.w + 0.2) / 0.9));
    for (let i = 0; i < m; i++) {
      const u0 = -w2 - 0.1 + ((B.w + 0.2) * i) / m, u1 = -w2 - 0.1 + ((B.w + 0.2) * (i + 1)) / m;
      put(ctx.prop, u0, KERB + H, -d2 - 0.1, u1, KERB + H + 0.14, d2 + 1.0, i % 2 ? W : A, { bottom: true });
      put(ctx.prop, u0, KERB + H - 0.38, d2 + 0.94, u1, KERB + H, d2 + 1.0, i % 2 ? A : W, { bottom: true });
    }
    for (let u = -w2 + 0.25; u <= w2 - 0.2; u += 0.5) put(ctx.screen, u - 0.05, KERB + H - 0.47, d2 + 0.95, u + 0.05, KERB + H - 0.37, d2 + 1.02, VH.col(Math.round(u * 2) % 2 ? 0xfff1c8 : 0xffd24a, 2));
    // A strip light along the inside of the canopy, so the stall reads at night.
    put(ctx.screen, -w2 + 0.3, KERB + H - 0.06, -d2 + 0.6, w2 - 0.3, KERB + H - 0.02, -d2 + 0.75, VH.col(0xfff4dc, 1.4));
    put(ctx.screen, -w2 + 0.3, KERB + H - 0.06, d2 - 0.4, w2 - 0.3, KERB + H - 0.02, d2 - 0.25, VH.col(0xfff4dc, 1.4));
    // The name over the front.
    if (B.sign) {
      wantSign(key, B.sign, B.a, B.b);
      const sw = Math.min(B.w - 0.6, 5.6);
      QUADS.push([key, F.wx(0, d2 + 1.03), KERB + H + 0.62, F.wz(0, d2 + 1.03), B.yaw, sw, sw / 4]);
      put(ctx.prop, -sw / 2 - 0.05, KERB + H + 0.1, d2 + 0.9, sw / 2 + 0.05, KERB + H + 1.38, d2 + 1.02, dark);
    }
    return F;
  }

  // The stall kit's shapes: plush toys (also the shack's shelf), drawn into a builder at (0, 0, 0).
  const PLUSH = {
    /** A plush animal sitting up, about `s` tall: body, head, ears; colour c, belly b. */
    sit(g, x, y, z, s, c, b, yaw) {
      const k = s / 0.3;
      const P = (px, pz) => [x + (px * Math.cos(yaw || 0) + pz * Math.sin(yaw || 0)) * k, z + (-px * Math.sin(yaw || 0) + pz * Math.cos(yaw || 0)) * k];
      const bx = (x0, y0, z0, x1, y1, z1, col) => {
        const [ax, az] = P(x0, z0), [cx, cz] = P(x1, z1);
        g.box(Math.min(ax, cx), y + y0 * k, Math.min(az, cz), Math.max(ax, cx), y + y1 * k, Math.max(az, cz), col);
      };
      bx(-0.09, 0, -0.07, 0.09, 0.16, 0.07, c);
      bx(-0.05, 0.02, 0.07, 0.05, 0.13, 0.08, b);
      bx(-0.075, 0.16, -0.06, 0.075, 0.28, 0.06, c);
      bx(-0.07, 0.27, -0.02, -0.035, 0.32, 0.02, c);
      bx(0.035, 0.27, -0.02, 0.07, 0.32, 0.02, c);
      bx(-0.03, 0.19, 0.06, 0.03, 0.23, 0.075, b);
    },
  };

  // ------------------------------------------------------- the world build
  VH.Districts.register({
    id: 'wharf_midway',
    name: 'the midway',
    plots: [],
    build(world, layout) {
      if (!(layout.plots && layout.plots.wonder_wharf)) return;
      for (const key in BOOTHS) buildBooth(world, key, BOOTHS[key]);
      for (const f of Midway.builders) {
        try {
          f(world, { frame, BOOTHS, STANDS, wantSign, QUADS, PLUSH, buildBooth });
        } catch (e) {
          console.error('[midway] build', e);
        }
      }
      Midway.signs = buildSignMesh(world);
    },
  });

  // ----------------------------------------------------------- the screen
  /** The stall games' own bits of screen: the rules card, the reticle, the "Player 2" tag. */
  class StallUI {
    constructor(overlay) {
      this.overlay = overlay;
      this.root = el('div', 'cv-stall');
      this.card = el('div', 'cv-howto');
      this.reticle = el('div', 'cv-reticle');
      this.tag = el('div', 'cv-player');
      this.pops = [];
      for (let i = 0; i < 8; i++) {
        const d = el('div', 'cv-pop');
        this.pops.push(d);
        this.root.append(d);
      }
      this._popI = 0;
      // A timing gauge: a bar with a zone to hit and a needle running along it.
      this.gaugeEl = el('div', 'cv-gauge');
      this.gaugeZone = el('div', 'cv-gauge-zone');
      this.gaugeNeedle = el('div', 'cv-gauge-needle');
      this.gaugeLabel = el('div', 'cv-gauge-label');
      this.gaugeEl.append(this.gaugeZone, this.gaugeNeedle, this.gaugeLabel);
      this._g = { k: -1, z0: -1, z1: -1, label: null, cls: null };
      this.root.append(this.card, this.reticle, this.tag, this.gaugeEl);
      overlay.root.append(this.root);
      this._rx = -1;
      this._ry = -1;
      this._style = '';
    }

    /** The card: { title, lines: [...], keys, rows: [[label, value]], foot }. */
    showCard(o) {
      const c = this.card;
      c.textContent = '';
      c.append(el('div', 'cv-howto-title', o.title || ''));
      if (o.sub) c.append(el('div', 'cv-howto-sub', o.sub));
      if (o.lines && o.lines.length) {
        const ul = el('ul', 'cv-howto-rules');
        for (const l of o.lines) ul.append(el('li', '', l));
        c.append(ul);
      }
      if (o.keys) c.append(el('div', 'cv-howto-keys', o.keys));
      for (const [l, v] of o.rows || []) {
        const r = el('div', 'cv-howto-row');
        r.append(el('span', '', l), el('b', '', String(v)));
        c.append(r);
      }
      if (o.buttons) {
        const b = el('div', 'cv-howto-buttons');
        for (const [k, t, cls] of o.buttons) {
          const btn = el('span', 'cv-howto-btn' + (cls ? ' ' + cls : ''));
          btn.append(el('kbd', '', k), el('span', '', t));
          b.append(btn);
        }
        c.append(b);
      }
      c.classList.add('on');
    }

    hideCard() {
      this.card.classList.remove('on');
    }

    /** The aiming ring at a point on screen (px), or hidden (x null). */
    ring(x, y, style) {
      if (x === null || x === undefined) {
        if (this._rx !== -1) {
          this.reticle.classList.remove('on');
          this._rx = -1;
        }
        return;
      }
      const rx = Math.round(x), ry = Math.round(y);
      if (rx !== this._rx || ry !== this._ry) {
        this._rx = rx;
        this._ry = ry;
        this.reticle.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      }
      if (style !== this._style) {
        this._style = style || '';
        this.reticle.className = 'cv-reticle on' + (style ? ' ' + style : '');
      } else if (!this.reticle.classList.contains('on')) this.reticle.classList.add('on');
    }

    /** A score that floats up from a point on screen and fades ('+10'). */
    pop(x, y, text, cls) {
      const d = this.pops[this._popI++ % this.pops.length];
      d.textContent = text;
      d.className = 'cv-pop';
      d.style.left = Math.round(x) + 'px';
      d.style.top = Math.round(y) + 'px';
      void d.offsetWidth;
      d.className = 'cv-pop on' + (cls ? ' ' + cls : '');
    }

    /**
     * The timing gauge: the needle at k (0..1), the zone z0..z1 to stop it in, a label; cls
     * 'hit' / 'miss' colours it for a moment. gauge(null) hides it.
     */
    gauge(k, z0, z1, label, cls) {
      const G = this._g;
      if (k === null || k === undefined) {
        if (G.k !== -1) {
          this.gaugeEl.classList.remove('on');
          G.k = -1;
        }
        return;
      }
      const kk = Math.round(clamp(k, 0, 1) * 1000) / 10;
      if (kk !== G.k) {
        this.gaugeNeedle.style.left = kk + '%';
        if (G.k === -1) this.gaugeEl.classList.add('on');
        G.k = kk;
      }
      if (z0 !== G.z0 || z1 !== G.z1) {
        G.z0 = z0;
        G.z1 = z1;
        this.gaugeZone.style.left = (z0 * 100).toFixed(1) + '%';
        this.gaugeZone.style.width = ((z1 - z0) * 100).toFixed(1) + '%';
      }
      if (label !== G.label) this.gaugeLabel.textContent = G.label = label || '';
      if ((cls || '') !== G.cls) {
        G.cls = cls || '';
        this.gaugeEl.className = 'cv-gauge on' + (G.cls ? ' ' + G.cls : '');
      }
    }

    player(n) {
      this.tag.textContent = n ? 'Player ' + n : '';
      this.tag.classList.toggle('on', !!n);
      this.tag.classList.toggle('p2', n === 2);
    }

    clear() {
      this.hideCard();
      this.ring(null);
      this.player(0);
      this.gauge(null);
      for (const d of this.pops) d.className = 'cv-pop';
    }
  }

  // ------------------------------------------------------------- the kit
  const _v = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _s = new THREE.Vector3(1, 1, 1);
  const _p = new THREE.Vector3();
  let SHARED_MAT = null;
  let UNIT_BOX = null;
  const _sp = { x: 0, y: 0 };
  const sharedMat = () => SHARED_MAT || (SHARED_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 }));

  /** The helpers a stall game builds and plays with (one per stall). */
  class Kit {
    constructor(def, carnival, F) {
      this.def = def;
      this.c = carnival;
      this.game = carnival.game;
      this.frame = F;
      this.group = new THREE.Group();
      this.group.name = 'stall-' + def.id;
      this.group.position.set(F.x, 0, F.z);
      this.group.rotation.y = F.yaw;
      this.group.updateMatrixWorld(true);
      this.game.scene.add(this.group);
      this.mat = sharedMat();
      this._aimYaw = null;
      this._aimPitch = 0;
    }

    /** A builder for a shape (frame or local coordinates). */
    builder() {
      return new VH.GeometryBuilder({});
    }

    /** An instanced mesh of `max` copies of a geometry, in the stall's frame. */
    mesh(geo, max, mat) {
      const m = new THREE.InstancedMesh(geo, mat || this.mat, max);
      m.count = max;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.castShadow = false;
      m.receiveShadow = false;
      // The stall's whole space as the bounds (the instances move about inside it).
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), Math.max(this.frame.w, this.frame.d, 3) + 2);
      m.frustumCulled = true;
      this.group.add(m);
      return m;
    }

    /** One plain mesh in the stall's frame. */
    single(geo, mat) {
      const m = new THREE.Mesh(geo, mat || this.mat);
      this.group.add(m);
      return m;
    }

    /** Instance i of mesh m at (u, y, v), turned by (rx, ry, rz) (XYZ Euler), scaled s. */
    set(m, i, u, y, v, rx, ry, rz, s) {
      _p.set(u, y, v);
      _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0));
      const k = s === undefined ? 1 : s;
      _s.set(k, k, k);
      _m.compose(_p, _q, _s);
      m.setMatrixAt(i, _m);
    }

    /** Instance i with a quaternion. */
    setQ(m, i, u, y, v, q, s) {
      _p.set(u, y, v);
      const k = s === undefined ? 1 : s;
      _s.set(k, k, k);
      _m.compose(_p, q, _s);
      m.setMatrixAt(i, _m);
    }

    hide(m, i) {
      _m.makeScale(0, 0, 0);
      m.setMatrixAt(i, _m);
    }

    /**
     * A set of tinted boxes, one instanced mesh (one draw call) for a stall's
     * blocky parts, still or moving: set.box(i, u0, y0, v0, u1, y1, v1, colour)
     * places one by its corners; set.part(i, u, y, v, sx, sy, sz, rx, ry, rz,
     * colour) by its middle, size and turn (colour optional after the first time).
     * Call set.done() after moving any.
     */
    boxes(max) {
      if (!UNIT_BOX) UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
      const m = this.mesh(UNIT_BOX.clone(), max, this.flatMat || (this.flatMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 })));
      const kit = this;
      const col = new THREE.Color();
      for (let i = 0; i < max; i++) {
        m.setColorAt(i, col.set(0xffffff));
        kit.hide(m, i);
      }
      return {
        mesh: m,
        box(i, u0, y0, v0, u1, y1, v1, c) {
          this.part(i, (u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2, Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0), 0, 0, 0, c);
        },
        part(i, u, y, v, sx, sy, sz, rx, ry, rz, c) {
          _p.set(u, y, v);
          _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0));
          _s.set(sx, sy, sz);
          _m.compose(_p, _q, _s);
          m.setMatrixAt(i, _m);
          if (c !== undefined && c !== null) {
            m.setColorAt(i, col.set(c));
            m.instanceColor.needsUpdate = true;
          }
        },
        /** By a quaternion. */
        partQ(i, u, y, v, sx, sy, sz, q) {
          _p.set(u, y, v);
          _s.set(sx, sy, sz);
          _m.compose(_p, q, _s);
          m.setMatrixAt(i, _m);
        },
        hide(i) {
          kit.hide(m, i);
        },
        done() {
          m.instanceMatrix.needsUpdate = true;
        },
      };
    }

    /** World position of a frame point, into out (a Vector3). */
    world(u, y, v, out) {
      const F = this.frame;
      return out.set(F.wx(u, v), y, F.wz(u, v));
    }

    /**
     * Move a cursor (g.cx, g.cy) by the mouse, the right stick and the move keys / left stick.
     * speed: frame units per second for the keys; the mouse moves `mouse` units a radian.
     */
    cursor(g, dt, speed, x0, x1, y0, y1, mouse) {
      const rig = this.game.cameraRig;
      if (this._aimYaw === null) this._aimYaw = rig.yaw;
      let dyaw = rig.yaw - this._aimYaw;
      dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      const dp = rig.pitch - this._aimPitch;
      this._aimYaw = rig.yaw;
      rig.pitch = 0;
      this._aimPitch = 0;
      const k = mouse || speed * 0.9;
      const inp = this.game.input;
      let mx = (inp.down('moveRight') ? 1 : 0) - (inp.down('moveLeft') ? 1 : 0);
      let my = (inp.down('moveForward') ? 1 : 0) - (inp.down('moveBack') ? 1 : 0);
      const pad = inp.pad;
      if (pad && pad.connected && (pad.move.x || pad.move.y)) {
        mx = pad.move.x;
        my = pad.move.y;
      }
      g.cx = clamp(g.cx - dyaw * k + mx * speed * dt, x0, x1);
      g.cy = clamp(g.cy + dp * k + my * speed * dt, y0, y1);
    }

    /** Forget the mouse's last place (a go starts: the cursor doesn't jump). */
    aimReset() {
      this._aimYaw = null;
      this._aimPitch = 0;
      this.game.cameraRig.pitch = 0;
    }

    /** A frame point on screen: into out { x, y } (px); false if behind the camera. */
    screen(u, y, v, out) {
      const cam = this.game.renderer.camera;
      this.world(u, y, v, _v).project(cam);
      if (_v.z > 1) return false;
      const r = this.game.renderer.canvas;
      const W = (r && r.clientWidth) || innerWidth, H = (r && r.clientHeight) || innerHeight;
      out.x = (_v.x * 0.5 + 0.5) * W;
      out.y = (-_v.y * 0.5 + 0.5) * H;
      return true;
    }

    /** The aiming ring over a frame point; null hides it. */
    reticle(u, y, v, style) {
      const ui = Midway.ui;
      if (!ui) return;
      if (u === null || !this.screen(u, y, v, _sp)) return ui.ring(null);
      ui.ring(_sp.x, _sp.y, style);
    }

    /** A score floating up from a frame point ('+10'; cls 'gold', 'bad'). */
    pop(u, y, v, text, cls) {
      const ui = Midway.ui;
      if (ui && this.screen(u, y, v, _sp)) ui.pop(_sp.x, _sp.y, text, cls);
    }

    /** A world point (x, z) in the frame: into out { u, v }. */
    local(x, z, out) {
      const F = this.frame;
      const dx = x - F.x, dz = z - F.z;
      out.u = dx * F.c - dz * F.s;
      out.v = dx * F.s + dz * F.c;
      return out;
    }

    /** Confetti from a frame point. */
    burst(u, y, v, colour, n) {
      const fx = this.game.fx;
      if (!fx || !fx.glow) return;
      this.world(u, y, v, _v);
      const c = colour === undefined ? 0xffd24a : colour;
      const r = ((c >> 16) & 255) / 255, gg = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
      for (let i = 0; i < (n || 14); i++) {
        const a = Math.random() * PI * 2, sp = 1 + Math.random() * 2.2;
        const tint = i % 3 === 0 ? 1 : 0;
        fx.glow.emit({
          x: _v.x, y: _v.y, z: _v.z, vx: Math.cos(a) * sp, vy: 1.5 + Math.random() * 2.5, vz: Math.sin(a) * sp,
          life: 0.6 + Math.random() * 0.5, size: 0.07, size1: 0.04,
          r: tint ? 2.4 : r * 2.4, g: tint ? 2.2 : gg * 2.4, b: tint ? 1.2 : b * 2.4, a: 1, drag: 1.2, grav: 6,
        });
      }
    }

    /** The night's glow (0 day .. 1 night), for lamps in a stall. */
    get night() {
      const env = this.game.environment;
      return env && env.nightFactor ? env.nightFactor : 0;
    }
  }

  // --------------------------------------------------------- stall games
  const ARMS_REST = { w: 1, shoulderL: 0.55, shoulderR: 0.55, elbowL: 0.75, elbowR: 0.75, lean: 0.12, splayL: 0.12, splayR: 0.12 };

  /** Default flow, shared by every stall game (VH.Carnival.stall). */
  const FLOW = {
    kind: 'game',
    scored: true,
    unit: 'points',
    sleep: 90,
    radius: 2.2,
    hint: 'Esc / B  stop',

    setup(c) {
      const B = BOOTHS[this.booth] || STANDS[this.stand0] || this.frameDef;
      this.F = frame(B);
      this.c = c;
      this.kit = new Kit(this, c, this.F);
      this.group = this.kit.group;
      if (!Midway.ui) Midway.ui = new StallUI(c.overlay);
      if (this.build) this.build(this.kit);
      this.group.visible = false;
      Midway.games.push(this);
      // The prompt at the counter's front (unless the game says otherwise).
      if (this.x === undefined) {
        const pv = this.promptV === undefined ? this.F.d / 2 + 0.25 : this.promptV;
        this.x = this.F.wx(0, pv);
        this.z = this.F.wz(0, pv);
      }
    },

    idle(dt, c) {
      this.group.visible = true;
      this._seen = c.game.time || 0;
      this.figure();
      if (this.idleGame) this.idleGame(dt);
    },

    sleepNow() {
      this.group.visible = false;
    },

    /** The stallholder behind the counter. */
    figure() {
      if (this.holder === false) return;
      const F = this.F;
      const h = this.holder || [F.w / 2 - 1, F.d / 2 - 1.1];
      this.c.figures.add('stand', F.wx(h[0], h[1]), KERB, F.wz(h[0], h[1]), F.yaw + (h[2] || 0), this.tint || 0);
    },

    /** Where Jay stands, in the world. */
    standAt(out) {
      const F = this.F;
      const st = this.standUV || [0, F.d / 2 + 0.75];
      out.x = F.wx(st[0], st[1]);
      out.z = F.wz(st[0], st[1]);
      out.yaw = F.yaw + PI;
      return out;
    },

    start(s) {
      const D = s.data;
      D.phase = 'walk';
      D.t = 0;
      D.goes = [];
      D.players = s.opts.players === 2 ? 2 : 1;
      D.choose = !(s.opts.players || s.opts.story);
      D.stand = this.standAt({});
      const cam = this.game0(s).renderer.camera;
      D.from = [cam.position.x, cam.position.y, cam.position.z];
      cam.getWorldDirection(_v);
      D.fromT = [cam.position.x + _v.x * 8, cam.position.y + _v.y * 8, cam.position.z + _v.z * 8];
      D.fromFov = cam.fov;
      D.camT = 0;
      this.group.visible = true;
      if (this.reset) this.reset();
      s.ui.title(this.name, '');
    },

    game0(s) {
      return s.game;
    },

    /** The camera: from where it was to the stall's shot, then held there. */
    camera(dt, s) {
      const D = s.data;
      const F = this.F, K = this.cam;
      D.camT = Math.min(1, D.camT + dt / 0.9);
      const k = ease(D.camT);
      const px = F.wx(K[0], K[2]), pz = F.wz(K[0], K[2]), tx = F.wx(K[3], K[5]), tz = F.wz(K[3], K[5]);
      const L = (a, b) => a + (b - a) * k;
      s.shot(L(D.from[0], px), L(D.from[1], K[1]), L(D.from[2], pz), L(D.fromT[0], tx), L(D.fromT[1], K[4]), L(D.fromT[2], tz), L(D.fromFov, K[6] || 55));
    },

    /** Jay at the counter, in this frame's pose. */
    jay(s, g) {
      const st = s.data.stand;
      const pose = (g && this.pose && this.pose(g, s)) || ARMS_REST;
      s.seat(st.x, KERB + HIP, st.z, st.yaw, pose);
    },

    update(dt, s) {
      const D = s.data;
      D.t += dt;
      this.group.visible = true;
      this._seen = s.game.time || 0;
      this.figure();
      const g = D.go;
      switch (D.phase) {
        case 'walk': {
          if (s.walk(D.stand.x, D.stand.z)) {
            D.phase = D.choose ? 'card' : 'count';
            D.t = 0;
            if (D.choose) this.card(s);
            else this.newGo(s);
          }
          break;
        }
        case 'card':
          this.jay(s, null);
          if (this.idleGame) this.idleGame(dt);
          if (s.pressed('interact') || s.pressed('jump') || s.pressed('fire')) {
            Midway.ui.hideCard();
            this.newGo(s);
          } else if (s.pressed('reload')) {
            const p = s.game.player;
            if (!s.opts.free && p.money < this.price) {
              s.ui.caption('Not enough cash for a second go: ' + VH.util.formatMoney(this.price), 2400);
              s.sound('buzz', { gain: 0.6 });
            } else {
              if (!s.opts.free && this.price) {
                p.money -= this.price;
                VH.events.emit('money:changed', { delta: -this.price, reason: this.name });
              }
              D.players = 2;
              D.paid2 = !s.opts.free && this.price ? this.price : 0;
              Midway.ui.hideCard();
              this.newGo(s);
            }
          }
          break;
        case 'count': {
          this.jay(s, g);
          const before = D.t - dt;
          const words = D.players === 2 ? [[0.1, 'PLAYER ' + g.n], [1.3, '3'], [2.1, '2'], [2.9, '1'], [3.7, 'GO!']] : [[0.3, '3'], [1.1, '2'], [1.9, '1'], [2.7, 'GO!']];
          for (const [at, word] of words) {
            if (before < at && D.t >= at) {
              s.ui.big(word, word.length > 2 ? 1100 : 750);
              s.sound(word === 'GO!' ? 'ding' : 'tick');
            }
          }
          if (this.idleGame && this.countIdle !== false) this.idleGame(dt);
          if (D.t >= words[words.length - 1][0]) {
            D.phase = 'play';
            D.t = 0;
            g.t = 0;
            this.kit.aimReset();
            if (this.seconds) s.ui.timer(this.seconds);
            if (this.keys) s.ui.title(this.name, this.keys + '   ·   Esc / B  stop');
          }
          break;
        }
        case 'play': {
          g.t += dt;
          if (this.seconds) {
            const left = this.seconds - g.t;
            s.ui.timer(left);
            if (left <= 0) g.over = 'time';
          }
          if (s.leaving) g.over = 'stop';
          this.play(dt, g, s);
          this.jay(s, g);
          s.ui.stat('score', this.unitLabel(), g.score);
          if (g.over) {
            D.phase = 'whistle';
            D.t = 0;
            s.ui.timer(null);
            this.kit.reticle(null);
            const word = g.over === 'stop' ? 'STOP' : g.over === 'time' ? 'TIME!' : typeof g.over === 'string' ? g.over : 'DONE!';
            s.ui.big(word, 1200);
            s.sound(g.over === 'stop' ? 'buzz' : 'klaxon', { gain: 0.6 });
          }
          break;
        }
        case 'whistle':
          if (this.after) this.after(dt, g, s);
          this.jay(s, g);
          if (D.t > (s.leaving ? 0.8 : 1.8)) this.endGo(s);
          break;
        case 'swap':
          this.jay(s, null);
          if (this.idleGame) this.idleGame(dt);
          if (s.pressed('interact') || s.pressed('jump') || s.pressed('fire')) {
            Midway.ui.hideCard();
            this.newGo(s);
          }
          break;
      }
      if (D.phase !== 'walk' || D.t > 0.2) this.camera(dt, s);
      else {
        const P = s.game.player.pos;
        s.chase(P.x, P.y, P.z, s.game.player.heading, 4, { height: 1.3 });
      }
    },

    unitLabel() {
      const u = this.unit || 'points';
      return u.charAt(0).toUpperCase() + u.slice(1);
    },

    /** The rules card, with the choice of one player or two. */
    card(s) {
      const c = s.carnival;
      const best = c.best[this.id];
      const rows = [];
      if (this.prize) rows.push(['Tickets', this.prize]);
      rows.push(['Your best', best ? best + ' ' + (this.unit || 'points') : 'Not played yet']);
      const second = s.opts.free || !this.price ? '' : ' (+' + VH.util.formatMoney(this.price) + ')';
      Midway.ui.showCard({
        title: this.name,
        sub: this.tagline || '',
        lines: this.howto,
        keys: this.keys,
        rows,
        buttons: [['E / Space / A', 'Play'], ['R / X', 'Challenge a friend' + second, 'two'], ['Esc / B', 'Leave', 'quiet']],
      });
      s.ui.title(this.name, '');
    },

    newGo(s) {
      const D = s.data;
      const n = D.goes.length + 1;
      const g = (D.go = { n, score: 0, t: 0, over: false });
      s.player2 = n === 2;
      D.phase = 'count';
      D.t = 0;
      if (this.reset) this.reset();
      this.begin(g, s);
      Midway.ui.player(D.players === 2 ? n : 0);
      s.ui.stat('score', this.unitLabel(), 0);
      s.ui.title(this.name, this.keys ? this.keys + '   ·   Esc / B  stop' : '');
    },

    endGo(s) {
      const D = s.data;
      const g = D.go;
      D.goes.push(g);
      const early = g.over === 'stop';
      if (D.players === 2 && D.goes.length === 1 && !early) {
        // Player 2's turn.
        D.phase = 'swap';
        D.t = 0;
        Midway.ui.player(2);
        for (const k of Object.keys(this.statKeys || {})) s.ui.stat(k, null);
        Midway.ui.showCard({
          title: 'Player 1: ' + g.score + ' ' + (this.unit || 'points'),
          sub: this.verdict ? this.verdict(g) : '',
          lines: ['Pass the controller to Player 2.', 'Beat ' + g.score + ' to win!'],
          buttons: [['E / Space / A', 'Player 2, go!']],
        });
        s.ui.caption('Player 2, your go!', 2500);
        if (this.reset) this.reset();
        return;
      }
      if (D.players === 2 && D.goes.length === 1 && early && D.paid2) s.game.player.money += D.paid2; // the second go never happened
      this.done(s, early);
    },

    done(s, early) {
      const D = s.data;
      const goes = D.goes;
      const T = (g) => (g.over === 'stop' ? Math.max(0, Math.round(this.tickets(g.score) * 0.5)) : Math.max(1, Math.round(this.tickets(g.score))));
      const tickets = goes.reduce((n, g) => n + T(g), 0);
      const score = goes.reduce((m, g) => Math.max(m, g.score), 0);
      Midway.ui.clear();
      if (this.reset) this.reset();
      let text = null, rows = null;
      if (goes.length === 2) {
        const [a, b] = goes;
        const unit = this.unit || 'points';
        text = a.score === b.score ? 'It\'s a draw!' : a.score > b.score ? 'Player 1 wins!' : 'Player 2 wins!';
        rows = [['Player 1', a.score + ' ' + unit, a.score >= b.score ? 'big' : ''], ['Player 2', b.score + ' ' + unit, b.score >= a.score ? 'big' : '']];
        VH.events.emit('carnival:duel', { id: this.id, p1: a.score, p2: b.score });
      } else if (this.verdict) text = this.name + ': ' + this.verdict(goes[0]);
      if (!early) Midway.note(s.carnival, this.id, tickets);
      s.finish({ score, tickets, completed: !early, text, rows });
    },

    escape(s) {
      const D = s.data;
      if (D.phase === 'walk' || D.phase === 'card') {
        if (!s.opts.free && this.price) s.game.player.money += this.price;
        Midway.ui.clear();
        if (this.reset) this.reset();
        s.end('left');
        return true;
      }
      if (D.phase === 'swap') {
        if (D.paid2) s.game.player.money += D.paid2;
        D.players = 1;
        Midway.ui.hideCard();
        this.done(s, false);
        return true;
      }
      return false;
    },

    stop() {
      Midway.ui && Midway.ui.clear();
      if (this.reset) this.reset();
    },
  };

  // ------------------------------------------------------------ the shack
  // PRIZES: [id, name, tickets, kind, colour, line]; kinds: 'plush' (for the shelf), 'cap', 'armour', 'cash', 'paint', 'giant'.
  const PRIZES = [
    ['gull', 'Plush seagull', 12, 'plush', 0xf2efe6, 'Squawks when you squeeze it. Steals nothing.'],
    ['duck', 'Rubber-duck plush', 15, 'plush', 0xffd24a, 'Yellow, soft, unsinkable.'],
    ['flamingo', 'Plush flamingo', 20, 'plush', 0xff7ab0, 'Stands on one leg if you prop it up.'],
    ['octopus', 'Plush octopus', 30, 'plush', 0xb45cff, 'Eight arms, all for hugging.'],
    ['dolphin', 'Plush dolphin', 40, 'plush', 0x5ab8e8, 'Grinning, as dolphins do.'],
    ['turtle', 'Plush sea turtle', 55, 'plush', 0x5aa85a, 'Slow and steady. Mostly slow.'],
    ['shark', 'Plush shark', 75, 'plush', 0x8a96a3, 'Soft teeth. Harmless.'],
    ['cap', 'Wonder Wharf cap', 60, 'cap', 0xe0403a, 'Red, with the wheel on the front. Jay wears it.'],
    ['armour', 'Bumper-car body armour', 45, 'armour', 0x37b8ff, 'A padded vest from the dodgems crew: full armour.'],
    ['voucher', '$50 cash voucher', 70, 'cash', 0x7dcf6a, 'Fifty dollars, cash, from the office.'],
    ['gold', 'Gold paint card', 150, 'paint', 0xd4a017, 'Wharf Gold at any Fresh Coat body shop.'],
    ['crab', 'GIANT plush crab', 600, 'giant', 0xff5a3c, 'As big as Jay. The top prize. Nobody wins it.'],
  ].map(([id, name, cost, kind, color, line]) => ({ id, name, cost, kind, color, line }));

  const Midway = {
    BOOTHS,
    STANDS,
    PRIZES,
    PLUSH,
    games: [],
    builders: [],
    ui: null,
    signs: null,
    frame,
    wantSign,
    quads: QUADS,
    /** A stall game won tickets: remember it (the "every stall" achievement, the phone). */
    note(c, id, tickets) {
      const own = (c.midway = c.midway || { won: {} });
      if (tickets > 0) own.won[id] = (own.won[id] || 0) + tickets;
      VH.events.emit('midway:won', { id, tickets });
    },
  };

  // The midway's housekeeping: a stall Jay has walked away from stops drawing its moving parts.
  Carnival.define({
    id: 'midway_life',
    name: 'the midway',
    kind: 'life',
    sleep: 0,
    setup(c) {
      this.c = c;
    },
    idle() {
      const c = this.c;
      const t = c.game.time || 0;
      const s = c.session;
      for (const d of Midway.games) {
        if (d.group.visible && t - (d._seen || 0) > 0.5 && !(s && s.def === d)) d.group.visible = false;
      }
    },
    sleepNow() {
      for (const d of Midway.games) d.group.visible = false;
    },
  });

  /** Define a stall game on the shared flow (see the header). */
  Carnival.stall = function (def) {
    const d = Object.assign({}, FLOW, def);
    if (def.stand) d.standUV = def.stand;
    if (def.frame) d.frameDef = def.frame;
    d.stand0 = def.id;
    return Carnival.define(d);
  };
  Carnival.Midway = Midway;
  Carnival.Kit = Kit;
  Carnival.ARMS_REST = ARMS_REST;
})();
