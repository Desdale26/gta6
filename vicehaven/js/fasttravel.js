/*
 * fasttravel.js — the Sunloop Shuttle: eight shuttle stops round the map
 * (the user asked for fast travel points, "but not too many").
 *
 *   VH.FastTravel.STOPS          the eight stops (one per big region)
 *   district builder 'fasttravel' builds the shelters into the chunks at load
 *                                time (merged surfaces), their colliders, and
 *                                ONE shared mesh for every board and sign
 *   new VH.FastTravel(game)      → game.fastTravel: unlocking, the prompt, the
 *                                panel, the trip, the map icons, the save
 *
 * The Civic Plaza stop is open from the start; every other stop opens the
 * first time Jay walks up to it. At an open stop, on foot, E brings up the
 * panel: pick a stop, pay the fare, and after a short fade Jay is standing
 * beside that stop, facing the road. Not with the police after him, not on
 * a job, a race or a ride.
 *
 * Each stop is laid out in its own frame: B is the middle of the shelter's
 * back (just off the wall or fence behind the pavement), n points to the road
 * (yaw), u runs along it. a is metres along u, v metres from the back to the
 * road. Every yaw is a quarter turn, so boxes stay axis-aligned.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const PI = Math.PI;
  const KERB = 0.15;
  const SAVE_KEY = 'fasttravel';
  const FIRST = 'civic'; //  open from the start
  const UNLOCK_R = 7; //     metres: walking up to a stop opens it
  const FARE_MIN = 10; //    dollars, up to FARE_NEAR metres
  const FARE_MAX = 60;
  const FARE_NEAR = 500;
  const FARE_FAR = 2600; //  metres for the top fare
  const CLOCK_MAX = 40; //   in-game minutes for the longest trip
  const CLOCK_MIN = 5;
  // The trip (seconds): fade out, black (the card), fade back in. Under three seconds in all.
  const T_OUT = 0.45;
  const T_HOLD = 1.25;
  const T_IN = 0.5;
  const STICK = 0.55;
  const NO_COPS = "The driver won't stop while the police are after you.";
  const BUSY = 'Not now — you\u2019re busy.';
  const BRAND = { name: 'SUNLOOP', sub: 'SHUTTLE', teal: '#0f8f8c', deep: '#0a5f5d', sun: '#ffc83d', coral: '#ff6f59', ink: '#0d2230' };

  // x, z: the middle of the shelter's back; yaw: the way it faces (to the road);
  // kerb: metres from the back to the kerb. See NOTES (FT-BUILD) for why each spot.
  const STOPS = [
    { id: 'civic', name: 'Civic Plaza', area: 'Downtown', x: -18.4, z: 41.6, yaw: PI / 2, kerb: 5.4 },
    { id: 'airport', name: 'Airport Terminal', area: 'Vicehaven International', x: -70, z: -1193.75, yaw: 0, kerb: 4.75 },
    { id: 'strand', name: 'Neon Strand', area: 'Isla Paloma · Wonder Wharf', x: 870, z: -72.85, yaw: 0, kerb: 3.85 },
    { id: 'oldpaloma', name: 'Old Paloma', area: 'Isla Paloma · the fort', x: 969.15, z: 490.5, yaw: PI / 2, kerb: 3.85 },
    { id: 'sunreel', name: 'Sunreel Studios', area: 'Sunreel · Cinder Creek', x: -650.85, z: 94, yaw: PI / 2, kerb: 3.85 },
    { id: 'halcyon', name: 'Halcyon University', area: 'Halcyon', x: -186.3, z: -749.15, yaw: PI, kerb: 3.85 },
    { id: 'sandpiper', name: 'Sandpiper Beach', area: 'Sandpiper · Southbay Speedway', x: 317.15, z: 1094, yaw: PI / 2, kerb: 3.85 },
    { id: 'redwater', name: 'Redwater', area: 'Redwater · the countryside', x: -963, z: 1202.85, yaw: PI, kerb: 3.85 },
  ];
  for (const s of STOPS) {
    s.nx = Math.round(Math.sin(s.yaw));
    s.nz = Math.round(Math.cos(s.yaw));
    s.ux = Math.round(Math.cos(s.yaw));
    s.uz = Math.round(-Math.sin(s.yaw));
  }
  for (const s of STOPS) {
    s.mid = [s.x + s.nx * 1.2, s.z + s.nz * 1.2]; // under the roof
    const label = s.name + ' stop';
    s.blipOn = { x: s.mid[0], z: s.mid[1], type: 'shuttle', label, noRim: true };
    s.blipOff = { x: s.mid[0], z: s.mid[1], type: 'shuttleLocked', label, noRim: true };
  }
  const BY_ID = new Map(STOPS.map((s) => [s.id, s]));
  // The order the line on the maps joins them in: round the map, through the middle.
  const LOOP = ['airport', 'strand', 'oldpaloma', 'sandpiper', 'redwater', 'sunreel', 'civic', 'halcyon'];

  /** World x, z of the point (a, v) in a stop's frame. */
  function at(s, a, v) {
    return [s.x + s.ux * a + s.nx * v, s.z + s.uz * a + s.nz * v];
  }

  /** The world rectangle [minX, minZ, maxX, maxZ] of a frame rectangle. */
  function rect(s, a0, v0, a1, v1) {
    const [x0, z0] = at(s, a0, v0);
    const [x1, z1] = at(s, a1, v1);
    return [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)];
  }

  // ------------------------------------------------------------ the atlas
  // One canvas for every lit board (256 x 512 each), pole flag (256 x 320) and
  // the roof fascia (2048 x 150): one material, one mesh for all eight stops.
  const ATLAS = { w: 2048, h: 1024, bw: 256, bh: 512, fy: 512, fh: 320, sy: 850, sh: 150 };

  function logo(g, cx, cy, r) {
    g.save();
    g.fillStyle = BRAND.sun;
    g.beginPath();
    g.arc(cx, cy, r, 0, PI * 2);
    g.fill();
    g.fillStyle = BRAND.teal;
    g.beginPath();
    g.arc(cx, cy, r * 0.62, 0, PI * 2);
    g.fill();
    // A wave across the lower half of the ring.
    g.strokeStyle = '#ffffff';
    g.lineWidth = Math.max(2, r * 0.16);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - r * 0.5, cy + r * 0.12);
    g.quadraticCurveTo(cx - r * 0.25, cy - r * 0.18, cx, cy + r * 0.12);
    g.quadraticCurveTo(cx + r * 0.25, cy + r * 0.42, cx + r * 0.5, cy + r * 0.12);
    g.stroke();
    g.restore();
  }

  function fitText(g, text, maxW, size, weight) {
    let px = size;
    g.font = weight + ' ' + px + 'px Arial, sans-serif';
    while (g.measureText(text).width > maxW && px > 10) g.font = weight + ' ' + --px + 'px Arial, sans-serif';
    return px;
  }

  /** The schematic network map on a board: land, the loop, every stop, this one ringed. */
  function boardMap(g, x0, y0, w, h, here) {
    const B = { minX: -1620, maxX: 1580, minZ: -1820, maxZ: 1820 };
    const k = Math.min(w / (B.maxX - B.minX), h / (B.maxZ - B.minZ));
    const ox = x0 + (w - (B.maxX - B.minX) * k) / 2;
    const oy = y0 + (h - (B.maxZ - B.minZ) * k) / 2;
    const X = (x) => ox + (x - B.minX) * k;
    const Y = (z) => oy + (z - B.minZ) * k;
    g.fillStyle = '#16597a';
    g.fillRect(x0, y0, w, h);
    g.fillStyle = '#e9e2cf';
    g.fillRect(X(-1600), Y(-1800), (424 + 1600) * k, 3600 * k);
    const isl = VH.Data && VH.Data.island;
    for (const r of (isl && isl.land) || []) g.fillRect(X(r.minX), Y(r.minZ), (r.maxX - r.minX) * k, (r.maxZ - r.minZ) * k);
    // The loop, round the map (LOOP order, so the line never crosses itself).
    g.strokeStyle = BRAND.teal;
    g.lineWidth = 4;
    g.lineJoin = 'round';
    g.beginPath();
    LOOP.forEach((id, i) => {
      const s = BY_ID.get(id);
      if (i) g.lineTo(X(s.x), Y(s.z));
      else g.moveTo(X(s.x), Y(s.z));
    });
    g.closePath();
    g.stroke();
    for (const s of STOPS) {
      g.fillStyle = s === here ? BRAND.coral : '#ffffff';
      g.strokeStyle = BRAND.ink;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(X(s.x), Y(s.z), s === here ? 8 : 5.5, 0, PI * 2);
      g.fill();
      g.stroke();
    }
    g.strokeStyle = BRAND.coral;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(X(here.x), Y(here.z), 14, 0, PI * 2);
    g.stroke();
  }

  function paintAtlas() {
    const cv = document.createElement('canvas');
    cv.width = ATLAS.w;
    cv.height = ATLAS.h;
    const g = cv.getContext('2d');
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    STOPS.forEach((s, i) => {
      // The lit map board.
      const bx = i * ATLAS.bw;
      const W = ATLAS.bw;
      g.fillStyle = '#f7f5ee';
      g.fillRect(bx, 0, W, ATLAS.bh);
      g.fillStyle = BRAND.teal;
      g.fillRect(bx, 0, W, 92);
      logo(g, bx + 44, 46, 30);
      g.fillStyle = '#ffffff';
      g.textAlign = 'left';
      fitText(g, BRAND.name, 160, 40, '900');
      g.fillText(BRAND.name, bx + 84, 38);
      g.font = '700 20px Arial, sans-serif';
      g.fillStyle = BRAND.sun;
      g.fillText(BRAND.sub, bx + 86, 70);
      g.textAlign = 'center';
      g.fillStyle = BRAND.ink;
      g.fillRect(bx, 92, W, 70);
      g.fillStyle = '#ffffff';
      fitText(g, s.name, W - 24, 34, '800');
      g.fillText(s.name, bx + W / 2, 127);
      boardMap(g, bx + 10, 172, W - 20, 262, s);
      g.fillStyle = BRAND.ink;
      g.font = '700 19px Arial, sans-serif';
      g.fillText('You are here', bx + W / 2, 455);
      g.font = '600 16px Arial, sans-serif';
      g.fillStyle = '#4b5a63';
      g.fillText('8 stops · fares $10 to $60', bx + W / 2, 486);
      // The flag on the pole.
      const fy = ATLAS.fy;
      g.fillStyle = BRAND.teal;
      g.fillRect(bx, fy, W, ATLAS.fh);
      g.fillStyle = '#ffffff';
      g.fillRect(bx + 14, fy + 150, W - 28, 120);
      logo(g, bx + W / 2, fy + 62, 44);
      g.fillStyle = '#ffffff';
      g.font = '900 34px Arial, sans-serif';
      g.fillText(BRAND.name, bx + W / 2, fy + 128);
      g.fillStyle = BRAND.ink;
      const words = s.name.split(' ');
      if (words.length > 1 && fitText(g, s.name, W - 44, 40, '800') < 30) {
        const half = Math.ceil(words.length / 2);
        const l1 = words.slice(0, half).join(' ');
        const l2 = words.slice(half).join(' ');
        const px = Math.min(fitText(g, l1, W - 44, 36, '800'), fitText(g, l2, W - 44, 36, '800'));
        g.font = '800 ' + px + 'px Arial, sans-serif';
        g.fillText(l1, bx + W / 2, fy + 188);
        g.fillText(l2, bx + W / 2, fy + 232);
      } else {
        fitText(g, s.name, W - 44, 40, '800');
        g.fillText(s.name, bx + W / 2, fy + 210);
      }
      g.fillStyle = BRAND.sun;
      g.font = '800 22px Arial, sans-serif';
      g.fillText('SHUTTLE STOP', bx + W / 2, fy + 297);
    });
    // The roof fascia: the same for every stop.
    const sy = ATLAS.sy;
    g.fillStyle = BRAND.teal;
    g.fillRect(0, sy, ATLAS.w, ATLAS.sh);
    g.fillStyle = BRAND.sun;
    g.fillRect(0, sy + ATLAS.sh - 14, ATLAS.w, 14);
    logo(g, 300, sy + 68, 50);
    logo(g, ATLAS.w - 300, sy + 68, 50);
    g.fillStyle = '#ffffff';
    g.font = '900 92px Arial, sans-serif';
    g.fillText(BRAND.name + '  ' + BRAND.sub, ATLAS.w / 2, sy + 70);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /** The quads for one stop: [u0, v0, u1, v1, cx, cy, cz, faceYaw, w, h]. */
  function quadsFor(s, i, out) {
    const A = ATLAS;
    const bu0 = (i * A.bw) / A.w;
    const bu1 = ((i + 1) * A.bw) / A.w;
    const board = [bu0, 1 - A.bh / A.h, bu1, 1];
    const flag = [bu0, 1 - (A.fy + A.fh) / A.h, bu1, 1 - A.fy / A.h];
    const fascia = [0, 1 - (A.sy + A.sh) / A.h, 1, 1 - A.sy / A.h];
    const yu = s.yaw + PI / 2; // facing +u
    const yd = s.yaw - PI / 2; // facing -u
    let p = at(s, 1.79 + 0.006, 0.62);
    out.push(board.concat([p[0], KERB + 1.2, p[1], yu, 0.96, 1.92]));
    p = at(s, 1.69 - 0.006, 0.62);
    out.push(board.concat([p[0], KERB + 1.2, p[1], yd, 0.96, 1.92]));
    const pv = s.kerb - 0.45;
    p = at(s, -2.35 + 0.036, pv - 0.02);
    out.push(flag.concat([p[0], KERB + 2.52, p[1], yu, 0.6, 0.75]));
    p = at(s, -2.35 - 0.036, pv - 0.02);
    out.push(flag.concat([p[0], KERB + 2.52, p[1], yd, 0.6, 0.75]));
    p = at(s, 0, 1.58 + 0.006);
    out.push(fascia.concat([p[0], KERB + 2.51, p[1], s.yaw, 3.86, 0.28]));
  }

  function buildSignMesh(world) {
    const quads = [];
    STOPS.forEach((s, i) => quadsFor(s, i, quads));
    const pos = [];
    const uv = [];
    const idx = [];
    for (const [u0, v0, u1, v1, x, y, z, fy, w, h] of quads) {
      // Right along the face as you look at it, and up.
      const rx = Math.cos(fy);
      const rz = -Math.sin(fy);
      const n = pos.length / 3;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pos.push(x + (rx * su * w) / 2, y + (sv * h) / 2, z + (rz * su * w) / 2);
        uv.push(su < 0 ? u0 : u1, sv < 0 ? v0 : v1);
      }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mat = new THREE.MeshBasicMaterial({ map: paintAtlas(), fog: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'sunloop-signs';
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    world.scene.add(mesh);
    return mesh;
  }

  // ------------------------------------------------------------ the shelters
  /** One stop: posts, glass back, roof with a lit strip, bench, the map board, the pole flag. */
  function buildStop(world, s) {
    const ctx = world.ctxAt(s.x, s.z);
    const ph = world.physics;
    const F = VH.COLLIDE;
    const K = KERB;
    const C = (hex, k) => VH.col(hex, k);
    const frame = C(0x2b3940);
    const glass = C(0x8db8c1);
    const teal = C(0x0f8f8c);
    const roof = C(0xdfe3e2);
    const pole = C(0x8d969c);
    const box = (surf, a0, v0, y0, a1, v1, y1, col, opts) => {
      const r = rect(s, a0, v0, a1, v1);
      surf.box(r[0], y0, r[1], r[2], y1, r[3], col, opts);
    };
    const solid = (a0, v0, y0, a1, v1, y1, tag, flags) => {
      const r = rect(s, a0, v0, a1, v1);
      ph.addBox(r[0], y0, r[1], r[2], y1, r[3], tag, flags);
    };
    // Four posts.
    for (const a of [-1.74, 1.74]) {
      for (const v of [0.06, 1.32]) {
        box(ctx.prop, a - 0.045, v - 0.045, K, a + 0.045, v + 0.045, K + 2.42, frame);
        if (v > 1) solid(a - 0.05, v - 0.05, 0, a + 0.05, v + 0.05, K + 2.42, 'pole', F.ALL);
      }
    }
    // The glass back between rails (one collider with the back posts).
    box(ctx.prop, -1.7, 0.04, K + 0.1, 1.7, 0.08, K + 2.28, glass);
    box(ctx.prop, -1.7, 0.03, K + 0.05, 1.7, 0.09, K + 0.12, frame);
    box(ctx.prop, -1.7, 0.03, K + 2.26, 1.7, 0.09, K + 2.32, frame);
    solid(-1.79, 0.01, 0, 1.79, 0.11, K + 2.42, 'metal', F.ALL);
    // The roof, its teal fascia (the name strip goes on its front) and a lit strip underneath.
    box(ctx.prop, -1.95, -0.1, K + 2.42, 1.95, 1.5, K + 2.54, roof, { bottom: true });
    box(ctx.prop, -1.95, 1.5, K + 2.36, 1.95, 1.58, K + 2.66, teal, { bottom: true });
    box(ctx.screen, -1.5, 0.5, K + 2.4, 1.5, 0.82, K + 2.42, C(0xfff1d8, 1.5), { bottom: true });
    solid(-1.95, -0.1, K + 2.36, 1.95, 1.58, K + 2.66, 'metal', F.SOLID | F.CAMERA);
    // The map board: the shelter's end at +a, between its posts (faces from the atlas).
    box(ctx.prop, 1.69, 0.11, K + 0.22, 1.79, 1.275, K + 2.2, frame);
    solid(1.69, 0.11, K + 0.22, 1.79, 1.275, K + 2.2, 'metal', F.ALL);
    // The bench: slats on two legs, against the glass.
    box(ctx.wood, -1.4, 0.16, K + 0.42, 0.9, 0.56, K + 0.47, C(0xb27a46));
    for (const a of [-1.25, 0.75]) box(ctx.prop, a - 0.04, 0.22, K, a + 0.04, 0.5, K + 0.42, frame);
    solid(-1.4, 0.16, 0, 0.9, 0.56, K + 0.47, 'plank', F.SOLID | F.SHOTS);
    // The flag on its pole at the kerb, side on to the road so drivers can read it.
    const pv = s.kerb - 0.45;
    const pa = -2.35;
    box(ctx.prop, pa - 0.05, pv - 0.05, K, pa + 0.05, pv + 0.05, K + 2.95, pole);
    box(ctx.prop, pa - 0.03, pv - 0.34, K + 2.13, pa + 0.03, pv + 0.3, K + 2.91, teal, { bottom: true });
    solid(pa - 0.06, pv - 0.06, 0, pa + 0.06, pv + 0.06, K + 2.95, 'pole', F.ALL);
    solid(pa - 0.04, pv - 0.34, K + 2.13, pa + 0.04, pv + 0.3, K + 2.91, 'metal', F.SOLID | F.SHOTS | F.CAMERA);
    // A pool of light on the pavement at night.
    const [lx, lz] = at(s, 0, 1.1);
    (world.floodlights || (world.floodlights = [])).push({ x: lx, z: lz, r: 3.2, y: K + 0.03 });
    // The airport stop stands on the grass verge east of the terminal's forecourt: a paved apron
    // from the forecourt's end to past the lamp, kerb height, between the airside fence and the road.
    if (s.id === 'airport') {
      const x0 = -80;
      const x1 = -50;
      const z0 = -1193.9;
      const z1 = -1189;
      ctx.concrete.box(x0, 0, z0, x1, K, z1, C(0xcfcac0), { skip: { top: true, w: true } });
      ctx.sidewalk.topRect(x0, z0, x1, z1, K, C(0xffffff), 3);
      ph.addBox(x0, -0.5, z0, x1, K, z1, 'kerb', F.SOLID);
    }
  }

  VH.Districts.register({
    id: 'fasttravel',
    name: 'Sunloop Shuttle stops',
    build(world) {
      for (const s of STOPS) buildStop(world, s);
      world.sunloopSigns = buildSignMesh(world);
    },
  });

  // ------------------------------------------------------------ map icons
  // A white shuttle on a teal tile for an open stop; a grey outline for one Jay
  // hasn't walked up to yet. Added to the radar's and the big map's tables
  // before either draws its first sprite.
  const MK = VH.MapKit;
  if (MK && MK.GLYPHS) {
    const INK = 'rgba(6, 9, 20, 0.92)';
    const bus = (g, fill, glass, line) => {
      MK.roundRectPath(g, -4.4, -4.9, 8.8, 8.6, 1.8);
      if (fill) {
        g.fillStyle = fill;
        g.fill();
      }
      if (line) {
        g.lineWidth = 1.3;
        g.strokeStyle = line;
        g.stroke();
      }
      g.fillStyle = glass;
      g.fillRect(-3.2, -3.7, 6.4, 3.1);
      g.fillRect(-3.9, 3.7, 2, 1.7);
      g.fillRect(1.9, 3.7, 2, 1.7);
    };
    MK.GLYPHS.shuttle = (g) => {
      MK.roundRectPath(g, -7.2, -7.2, 14.4, 14.4, 3.4);
      g.lineJoin = 'round';
      g.lineWidth = 3;
      g.strokeStyle = INK;
      g.stroke();
      g.fillStyle = BRAND.teal;
      g.fill();
      bus(g, '#ffffff', BRAND.deep, null);
      g.fillStyle = BRAND.sun;
      g.fillRect(-3.4, 1.1, 1.5, 1.2);
      g.fillRect(1.9, 1.1, 1.5, 1.2);
    };
    MK.GLYPHS.shuttleLocked = (g) => {
      MK.roundRectPath(g, -7.2, -7.2, 14.4, 14.4, 3.4);
      g.lineJoin = 'round';
      g.lineWidth = 3;
      g.strokeStyle = INK;
      g.stroke();
      g.fillStyle = 'rgba(70, 76, 86, 0.6)';
      g.fill();
      g.lineWidth = 1.4;
      g.strokeStyle = '#b9c0c8';
      g.stroke();
      bus(g, null, '#b9c0c8', '#b9c0c8');
    };
    MK.PRIORITY.shuttle = 1;
    MK.PRIORITY.shuttleLocked = 0;
    MK.LEGEND.push(['shuttle', 'Sunloop shuttle stop'], ['shuttleLocked', 'Shuttle stop (walk up to unlock)']);
  }
  const MV = VH.MapView;
  if (MV && MV.TYPES) {
    MV.TYPES.shuttle = { name: 'Shuttle stop', cat: 'places', labelAt: 0.35, tip: 'A Sunloop Shuttle stop. Walk up on foot and press E to ride to any stop you have unlocked.' };
    MV.TYPES.shuttleLocked = { name: 'Shuttle stop (locked)', cat: 'places', labelAt: 0.6, tip: 'Walk up to this stop once to add it to the Sunloop Shuttle.' };
  }

  /** Straight-line metres between two stops. */
  function metres(a, b) {
    return Math.hypot(a.mid[0] - b.mid[0], a.mid[1] - b.mid[1]);
  }

  /** The fare: $10 for a short hop, growing with distance to $60 across the map. */
  function fareFor(a, b) {
    const k = Math.min(1, Math.max(0, (metres(a, b) - FARE_NEAR) / (FARE_FAR - FARE_NEAR)));
    return Math.round(FARE_MIN + (FARE_MAX - FARE_MIN) * k);
  }

  /** In-game minutes the ride takes. */
  function minutesFor(a, b) {
    return Math.round(Math.max(CLOCK_MIN, Math.min(CLOCK_MAX, (CLOCK_MAX * metres(a, b)) / FARE_FAR)));
  }

  function km(m) {
    return m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1) + ' km';
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // ------------------------------------------------------------ the system
  class FastTravel {
    constructor(game) {
      this.game = game;
      this.saveKey = SAVE_KEY;
      this.unlocked = new Set([FIRST]);
      this.trips = 0;
      this.spent = 0;
      this._t = 0; // the next check for a stop to unlock
      // The prompt at each stop (on foot only: interaction.js shows nothing in a vehicle).
      this.items = STOPS.map((s) => {
        const [x, z] = s.mid;
        const it = { id: 'shuttle_' + s.id, kind: 'shuttle', x, y: KERB + 1, z, radius: 2.8, label: 'Take the shuttle', stop: s, enabled: false };
        game.interaction.register(it);
        return game.interaction.items[game.interaction.items.length - 1];
      });
      game.interaction.on('shuttle', (it) => {
        this.request(it.stop);
        return 0.4;
      });
      this._sync();
      this.isOpen = false; // the panel is up
      this.here = null; //    the stop it was opened at
      this.pick = -1; //      the highlighted row (index into STOPS)
      this.trip = null; //    a ride under way
      this._padPrev = new Set();
      this._hold = { dir: 0, t: 0 };
      this._onKeyBound = (e) => this._onKey(e);
      this._buildHud();
    }

    // ------------------------------------------------------------ the panel
    _buildHud() {
      const root = this.game.hud.root;
      const P = (this.panel = el('div', 'ft-panel'));
      P.setAttribute('role', 'dialog');
      P.setAttribute('aria-label', 'Sunloop Shuttle');
      const head = el('div', 'ft-head');
      const title = el('div', 'ft-title');
      title.append(el('b', '', 'SUNLOOP SHUTTLE'));
      this.whereEl = el('span');
      title.append(this.whereEl);
      this.cashEl = el('div', 'ft-cash');
      const x = el('button', 'ft-x', '×');
      x.type = 'button';
      x.title = 'Close';
      x.addEventListener('click', () => this.close());
      head.append(el('i', 'ft-logo'), title, this.cashEl, x);
      const body = el('div', 'ft-body');
      this.mapEl = el('canvas', 'ft-map');
      this.listEl = el('ul', 'ft-list');
      this.rows = STOPS.map((st, i) => {
        const li = el('li', 'ft-row');
        const name = el('div', 'ft-name', st.name);
        name.append(el('small', '', st.area));
        const dist = el('span', 'ft-dist');
        const fare = el('span', 'ft-fare');
        li.append(el('i'), name, dist, fare);
        li.addEventListener('mouseenter', () => {
          if (this._selectable(i)) this._select(i);
        });
        li.addEventListener('click', () => {
          if (this._selectable(i)) {
            this._select(i);
            this.go();
          }
        });
        this.listEl.append(li);
        return { li, dist, fare };
      });
      body.append(this.mapEl, this.listEl);
      const foot = el('div', 'ft-foot');
      this.warnEl = el('span', 'ft-warn');
      this.keysEl = el('span', 'ft-keys');
      foot.append(this.warnEl, this.keysEl);
      P.append(head, body, foot);
      root.appendChild(P);
      const C = (this.card = el('div', 'ft-card'));
      const t = el('div');
      this.cardTitle = el('b');
      this.cardLine = el('span');
      t.append(this.cardTitle, this.cardLine);
      C.append(el('i', 'ft-logo'), t);
      root.appendChild(C);
    }

    /** Why the shuttle won't take Jay right now (null: it will). */
    _why() {
      const g = this.game;
      const p = g.player;
      if (g.police && g.police.level > 0) return NO_COPS;
      if (p.inVehicle) return 'Get out of the vehicle first.';
      if (g.missions && g.missions.run) return BUSY;
      if (g.challenges && g.challenges.run) return BUSY;
      if (g.activities && g.activities.taxi && g.activities.taxi.on) return BUSY;
      if (g.oddJobs && g.oddJobs.shift) return BUSY;
      if (g.stores && g.stores.holdup && g.stores.holdup.active) return BUSY;
      if (g.planeSteal && g.planeSteal.job) return BUSY;
      if (g.carnival && (g.carnival.session || g.carnival._card)) return BUSY;
      if (g.state !== 'playing' || p.state === 'dead' || p.frozen || g.frozenControls || g._arresting) return BUSY;
      const b = document.body.classList;
      if (b.contains('cutscene') || (!this.isOpen && b.contains('shop-open')) || b.contains('photo-mode') || b.contains('phone-open')) return BUSY;
      if (g.minimap && g.minimap.isFullOpen) return BUSY;
      if (g.dialogue && g.dialogue._choice) return BUSY;
      if (g.ui && g.ui.dialogOpen) return BUSY;
      return null;
    }

    /** E at an open stop: the panel, or a word from the driver. */
    request(s) {
      const g = this.game;
      if (this.isOpen || this.trip) return;
      const why = this._why();
      if (why) {
        g.hud.showToast(why);
        if (g.audio && g.audio.fail) g.audio.fail();
        return;
      }
      this.open(s);
    }

    open(s) {
      const g = this.game;
      const inp = g.input;
      this.isOpen = true;
      this.here = s;
      inp.exitLock();
      inp.releaseAll();
      inp.clearPresses();
      inp.takeMouseDelta();
      inp.enabled = false; // the panel reads its own keys; nothing reaches Jay
      this._padPrev = new Set(inp.pad && inp.pad.down ? inp.pad.down : []);
      this._hold.dir = 0;
      window.addEventListener('keydown', this._onKeyBound, true);
      // The nearest open stop is highlighted first.
      let best = -1;
      let bestD = Infinity;
      STOPS.forEach((st, i) => {
        if (!this._selectable(i)) return;
        const d = metres(s, st);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      this.pick = best;
      this._openedAt = performance.now();
      this._fill();
      this.panel.classList.add('visible');
      document.body.classList.add('shop-open'); // the checklist and weapon panel step aside
      if (g.audio && g.audio.click) g.audio.click();
    }

    /** Put the panel away. `travelling`: the trip takes over (no mouse lock request, no click). */
    close(travelling) {
      if (!this.isOpen) return;
      const g = this.game;
      this.isOpen = false;
      window.removeEventListener('keydown', this._onKeyBound, true);
      this.panel.classList.remove('visible');
      document.body.classList.remove('shop-open');
      const inp = g.input;
      inp.clearPresses();
      inp.releaseAll();
      inp.takeMouseDelta();
      inp.takeWheel();
      inp.enabled = g.state === 'playing' || g.state === 'dialog';
      if (g.state === 'playing' && !inp.locked) inp.requestLock();
      if (!travelling && g.audio && g.audio.click) g.audio.click();
    }

    _selectable(i) {
      const st = STOPS[i];
      return !!st && st !== this.here && this.unlocked.has(st.id);
    }

    _select(i) {
      if (i === this.pick) return;
      this.pick = i;
      if (this.game.audio && this.game.audio.click) this.game.audio.click();
      this._fill();
    }

    /** Up or down the list, over the stops Jay can go to. */
    _move(dir) {
      const n = STOPS.length;
      let i = this.pick < 0 ? (dir > 0 ? -1 : 0) : this.pick;
      for (let k = 0; k < n; k++) {
        i = (i + dir + n) % n;
        if (this._selectable(i)) {
          this._select(i);
          return;
        }
      }
    }

    /** Rows, cash, the warning and the keys, for what's highlighted now. */
    _fill() {
      const g = this.game;
      const here = this.here;
      const money = g.player.money;
      const fmt = VH.util.formatMoney;
      this.whereEl.innerHTML = '';
      this.whereEl.append('You are at ', el('em', '', here.name), ' · ' + this.unlocked.size + ' of ' + STOPS.length + ' stops found');
      this.cashEl.textContent = fmt(money);
      STOPS.forEach((st, i) => {
        const r = this.rows[i];
        const open = this.unlocked.has(st.id);
        const fare = fareFor(here, st);
        r.li.classList.toggle('here', st === here);
        r.li.classList.toggle('locked', !open && st !== here);
        r.li.classList.toggle('on', i === this.pick);
        r.li.classList.toggle('short', open && st !== here && money < fare);
        r.dist.textContent = st === here ? '' : km(metres(here, st));
        r.fare.textContent = st === here ? 'You are here' : open ? fmt(fare) : 'Not found yet';
      });
      const pick = STOPS[this.pick];
      let warn = '';
      if (!pick) warn = 'No other stops yet: walk up to a stop to add it (grey on the map).';
      else if (money < fareFor(here, pick)) warn = 'Not enough cash';
      this.warnEl.textContent = warn;
      this._keys();
      this._drawMap();
      const row = this.rows[this.pick];
      if (row && row.li.scrollIntoView) row.li.scrollIntoView({ block: 'nearest' });
    }

    _keys() {
      const inp = this.game.input;
      const pad = inp.lastDevice === 'gamepad';
      const keys = pad
        ? [['Stick', 'choose'], ['A', 'travel'], ['B', 'close']]
        : [['W S', 'choose'], [inp.labelFor('interact') + ' / Enter', 'travel'], ['Esc', 'close']];
      const sig = keys.join('|');
      if (sig === this._keySig) return;
      this._keySig = sig;
      this.keysEl.innerHTML = '';
      for (const [k, t] of keys) {
        const span = el('span');
        span.append(el('kbd', '', k), t);
        this.keysEl.append(span);
      }
    }

    /** The little map: land, the loop, every stop (grey if not found), here and the pick marked. */
    _drawMap() {
      const cv = this.mapEl;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const B = { minX: -1640, maxX: 1600, minZ: -1840, maxZ: 1840 };
      const k = Math.min(w / (B.maxX - B.minX), h / (B.maxZ - B.minZ));
      const ox = (w - (B.maxX - B.minX) * k) / 2;
      const oy = (h - (B.maxZ - B.minZ) * k) / 2;
      const X = (x) => ox + (x - B.minX) * k;
      const Y = (z) => oy + (z - B.minZ) * k;
      g.fillStyle = '#123f57';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#2f4a3c';
      g.fillRect(X(-1600), Y(-1800), (424 + 1600) * k, 3600 * k);
      const isl = VH.Data && VH.Data.island;
      for (const r of (isl && isl.land) || []) g.fillRect(X(r.minX), Y(r.minZ), (r.maxX - r.minX) * k, (r.maxZ - r.minZ) * k);
      // The big roads, faintly.
      g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      g.lineWidth = 1;
      g.beginPath();
      for (const r of this.game.layout.roads || []) {
        if (r.width < 18) continue;
        const a = Math.min(r.from, r.to);
        const b = Math.max(r.from, r.to);
        if (r.axis === 'z') {
          g.moveTo(X(r.coord), Y(a));
          g.lineTo(X(r.coord), Y(b));
        } else {
          g.moveTo(X(a), Y(r.coord));
          g.lineTo(X(b), Y(r.coord));
        }
      }
      g.stroke();
      g.strokeStyle = 'rgba(53, 224, 208, 0.55)';
      g.lineWidth = 2.5;
      g.lineJoin = 'round';
      g.beginPath();
      LOOP.forEach((id, i) => {
        const st = BY_ID.get(id);
        if (i) g.lineTo(X(st.x), Y(st.z));
        else g.moveTo(X(st.x), Y(st.z));
      });
      g.closePath();
      g.stroke();
      const pick = STOPS[this.pick];
      if (pick) {
        g.strokeStyle = '#ffc83d';
        g.setLineDash([4, 4]);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(X(this.here.x), Y(this.here.z));
        g.lineTo(X(pick.x), Y(pick.z));
        g.stroke();
        g.setLineDash([]);
      }
      g.textAlign = 'center';
      g.font = '600 11px ' + "'Segoe UI', Arial, sans-serif";
      for (const st of STOPS) {
        const open = this.unlocked.has(st.id);
        const x = X(st.x);
        const y = Y(st.z);
        g.beginPath();
        g.arc(x, y, st === this.here || st === pick ? 6.5 : 5, 0, PI * 2);
        if (st === this.here) g.fillStyle = BRAND.coral;
        else if (open) g.fillStyle = st === pick ? BRAND.sun : BRAND.teal;
        else g.fillStyle = 'rgba(40, 46, 56, 0.9)';
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = open || st === this.here ? '#ffffff' : '#9aa3ad';
        g.stroke();
        if (st === this.here || st === pick) {
          g.fillStyle = '#ffffff';
          g.strokeStyle = 'rgba(0, 0, 0, 0.7)';
          g.lineWidth = 3;
          const label = st === this.here ? 'You · ' + st.name : st.name;
          const ty = y < 24 ? y + 18 : y - 11;
          const tx = Math.max(40, Math.min(w - 40, x));
          g.strokeText(label, tx, ty);
          g.fillText(label, tx, ty);
        }
      }
    }

    _onKey(e) {
      if (!this.isOpen) return;
      const code = e.code;
      const binds = this.game.input.bindings || {};
      const is = (action) => (binds[action] || []).includes(code);
      if (/^F\d+$/.test(code) || is('debug')) return; // the browser's keys and the developer overlay
      e.preventDefault();
      e.stopPropagation();
      if (code === 'ArrowUp' || code === 'KeyW') this._move(-1);
      else if (code === 'ArrowDown' || code === 'KeyS') this._move(1);
      else if (e.repeat) return;
      else if (code === 'Escape' || code === 'Backspace') this.close();
      else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space' || is('interact')) this.go();
    }

    /** The controller, read straight from the pad (the game's own presses are off while the panel is up). */
    _pad(dt) {
      const pad = this.game.input.pad;
      if (!pad || !pad.connected) {
        this._padPrev.clear();
        return;
      }
      const now = pad.down;
      const hit = (a) => now.has(a) && !this._padPrev.has(a);
      if (hit('jump')) this.go();
      else if (hit('crouch') || hit('pause')) this.close();
      let dir = 0;
      if (now.has('phone') || pad.move.y > STICK) dir = -1;
      else if (now.has('horn') || pad.move.y < -STICK) dir = 1;
      const h = this._hold;
      if (dir && dir !== h.dir) {
        h.dir = dir;
        h.t = 0.4;
        this._move(dir);
      } else if (dir) {
        h.t -= dt;
        if (h.t <= 0) {
          h.t = 0.14;
          this._move(dir);
        }
      } else h.dir = 0;
      if (now.size) this._keys();
      this._padPrev = new Set(now);
    }

    // ------------------------------------------------------------ the trip
    /** Ride to the highlighted stop: pay, fade, and off. */
    go() {
      const g = this.game;
      if (!this.isOpen || this.trip) return;
      if (performance.now() - this._openedAt < 350) return; // a double tap of E opens the panel, it doesn't ride
      const to = STOPS[this.pick];
      if (!to || !this._selectable(this.pick)) {
        if (g.audio && g.audio.fail) g.audio.fail();
        return;
      }
      const from = this.here;
      const fare = fareFor(from, to);
      if (g.player.money < fare) {
        this.warnEl.textContent = 'Not enough cash';
        g.hud.showToast('Not enough cash: the fare is ' + VH.util.formatMoney(fare) + '.');
        if (g.audio && g.audio.fail) g.audio.fail();
        return;
      }
      this.close(true);
      g.player.money -= fare;
      VH.events.emit('money:changed', { delta: -fare, reason: 'Sunloop Shuttle' });
      this.spent += fare;
      const minutes = minutesFor(from, to);
      this.trip = { from, to, fare, minutes, t: 0, landed: false, lit: false };
      g.frozenControls = true;
      g.hud.setFade(1, T_OUT * 1000);
      this.cardTitle.textContent = 'Travelling to ' + to.name + '\u2026';
      this.cardLine.textContent = 'Sunloop Shuttle · ' + km(metres(from, to)) + ' · ' + minutes + ' min · ' + VH.util.formatMoney(fare);
      this.card.classList.add('visible');
      this._busSound();
    }

    /** Doors hiss shut, the engine pulls away. */
    _busSound() {
      const a = this.game.audio;
      if (!a || !a.ready || !a._tone) return;
      const t = a.ctx.currentTime;
      a._hit({ t, type: 'highpass', freq: 2400, q: 0.5, peak: 0.08, attack: 0.02, decay: 0.45 });
      a._tone({ t: t + 0.05, freq: 659, wave: 'triangle', peak: 0.07, decay: 0.3, bus: a.ui });
      a._tone({ t: t + 0.25, freq: 523, wave: 'triangle', peak: 0.07, decay: 0.45, bus: a.ui });
      a._tone({ t: t + 0.35, freq: 48, freqEnd: 96, wave: 'sawtooth', peak: 0.12, attack: 0.35, decay: 1.5, lowpass: 320 });
      a._tone({ t: t + 0.35, freq: 72, freqEnd: 140, wave: 'sawtooth', peak: 0.05, attack: 0.4, decay: 1.4, lowpass: 420, detune: 9 });
    }

    /** Where Jay steps off: on the pavement past the map board, turned to look across the road and back along it. */
    landing(s) {
      const [x, z] = at(s, 3.4, s.kerb - 1.2);
      return { x, z, yaw: s.yaw - 0.75 };
    }

    /** At black: Jay to the stop, the clock on, the streets round him filled. */
    _arrive() {
      const g = this.game;
      const T = this.trip;
      const p = g.player;
      const L = this.landing(T.to);
      p.teleport(L.x, L.z, L.yaw, KERB);
      if (g.cameraRig && g.cameraRig.snapBehind) g.cameraRig.snapBehind(p);
      const env = g.environment;
      if (env && env.setTime) env.setTime(env.hours + T.minutes / 60);
      this._fillStreets(L.x, L.z);
    }

    /** Traffic and walkers round the destination, before the picture comes back. */
    _fillStreets(x, z) {
      const g = this.game;
      const V = g.vehicles;
      const run = g.missions && g.missions.run;
      if (V && V.list) {
        for (const v of V.list.slice()) {
          if (v.persistent || v.missionOwned || v === V.lastPlayerCar || v.driver === 'player') continue;
          if (run && run.cars && Array.from(run.cars.values()).includes(v)) continue;
          const d = Math.hypot(v.pos.x - x, v.pos.z - z);
          // Nothing left standing on the stop; the old streets' traffic goes, the new ones' comes.
          if (d < 4 || (v.role === 'traffic' && d > 220)) V.remove(v);
        }
        V._streamTimer = 0;
      }
      if (g.traffic && g.traffic.repopulate) g.traffic.repopulate(x, z);
      const C = g.crowd;
      if (C && C.agents && C._spawnWalker) {
        const focus = g.player.pos;
        for (let i = C.agents.length - 1; i >= 0; i--) {
          const a = C.agents[i];
          if (!a.persistent && !a.brain && Math.hypot(a.pos.x - x, a.pos.z - z) > 140) C.remove(a);
        }
        let walkers = C.agents.filter((a) => !a.persistent && !a.brain).length;
        for (let n = 0; walkers < C.targetCount && n < 40; n++) if (C._spawnWalker(focus)) walkers++;
      }
    }

    _runTrip(dt) {
      const g = this.game;
      const T = this.trip;
      T.t += dt;
      if (!T.landed && T.t >= T_OUT) {
        T.landed = true;
        this._arrive();
      }
      if (!T.lit && T.t >= T_OUT + T_HOLD) {
        T.lit = true;
        g.hud.setFade(0, T_IN * 1000);
        this._chime();
      }
      if (T.t >= T_OUT + T_HOLD + T_IN * 0.6) this._endTrip();
    }

    _endTrip() {
      const g = this.game;
      if (!this.trip) return;
      const T = this.trip;
      this.trip = null;
      this.card.classList.remove('visible');
      g.frozenControls = false;
      if (T.landed) {
        this.trips++;
        VH.events.emit('fasttravel:arrived', { from: T.from.id, to: T.to.id, fare: T.fare });
      }
    }

    /** The prompts follow what's unlocked. */
    _sync() {
      for (const it of this.items) it.enabled = this.unlocked.has(it.stop.id);
    }

    isUnlocked(id) {
      return this.unlocked.has(id);
    }

    update(dt) {
      if (this.trip) {
        this._runTrip(dt);
        return;
      }
      if (this.isOpen) {
        // A job, the police or a scene starting puts the panel away.
        const why = this._why();
        if (why) {
          this.close();
          if (why === NO_COPS) this.game.hud.showToast(why);
        } else this._pad(dt);
        return;
      }
      this._t -= dt;
      if (this._t > 0) return;
      this._t = 0.25;
      const g = this.game;
      const p = g.player;
      if (g.state !== 'playing' || !p || p.state === 'dead') return;
      // Walking up to a stop opens it (driving slowly past counts too).
      const v = p.inVehicle ? p.vehicle : null;
      if (v && Math.abs(v.speed || 0) > 8) return;
      const pos = v ? v.pos : p.pos;
      const r = v ? UNLOCK_R + 2 : UNLOCK_R;
      for (const s of STOPS) {
        if (this.unlocked.has(s.id)) continue;
        const dx = pos.x - s.mid[0];
        const dz = pos.z - s.mid[1];
        if (dx * dx + dz * dz < r * r) this.unlock(s.id);
      }
    }

    /** A stop joins Jay's network. */
    unlock(id) {
      const s = BY_ID.get(id);
      if (!s || this.unlocked.has(id)) return false;
      const g = this.game;
      this.unlocked.add(id);
      this._sync();
      g.hud.showToast('Shuttle stop unlocked: ' + s.name);
      this._chime();
      if (this.unlocked.size === 2) g.hud.notify({ title: 'Sunloop Shuttle', text: 'Walk up to any open stop and press ' + g.input.labelFor('interact') + ' to ride to another. Grey stops on the map are still to find.', icon: '🚏', duration: 6500 });
      if (this.unlocked.size === STOPS.length && g.achievements) g.achievements.unlock('shuttle_all');
      VH.events.emit('fasttravel:unlocked', { id, count: this.unlocked.size });
      return true;
    }

    /** Two soft notes, like a bus's bell. */
    _chime() {
      const a = this.game.audio;
      if (!a || !a.ready || !a._tone) return;
      const t = a.ctx.currentTime;
      a._tone({ t, freq: 784, wave: 'triangle', peak: 0.12, decay: 0.5, bus: a.ui });
      a._tone({ t: t + 0.16, freq: 1046.5, wave: 'triangle', peak: 0.1, decay: 0.7, bus: a.ui });
    }

    blips(out) {
      for (const s of STOPS) out.push(this.unlocked.has(s.id) ? s.blipOn : s.blipOff);
    }

    stats() {
      return [['Shuttle stops unlocked', this.unlocked.size + '/' + STOPS.length], ['Shuttle trips', String(this.trips)]];
    }

    serialize() {
      return { unlocked: STOPS.filter((s) => this.unlocked.has(s.id)).map((s) => s.id), trips: this.trips, spent: this.spent };
    }

    load(d) {
      d = d || {};
      this.unlocked = new Set([FIRST]);
      for (const id of Array.isArray(d.unlocked) ? d.unlocked : []) if (BY_ID.has(id)) this.unlocked.add(id);
      this.trips = d.trips | 0;
      this.spent = d.spent | 0;
      if (this.items) this._sync();
    }

    /** A forced end (death, arrest, a scene, a new game): no panel, no half-done trip. */
    stop() {
      if (this.isOpen) this.close(true);
      if (this.trip) {
        const T = this.trip;
        // Cut short before the stop: the fare comes back, Jay stays where he is.
        if (!T.landed) {
          this.game.player.money += T.fare;
          this.spent -= T.fare;
        }
        this.game.hud.setFade(0, 200);
        this._endTrip();
      }
    }

    reset() {
      this.stop();
      this.load(null);
    }
  }

  FastTravel.STOPS = STOPS;
  FastTravel.at = at;
  FastTravel.fareFor = fareFor;
  FastTravel.minutesFor = minutesFor;
  VH.FastTravel = FastTravel;
})();
