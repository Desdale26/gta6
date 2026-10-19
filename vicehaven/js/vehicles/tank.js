/*
 * tank.js — the Bastion main battle tank (Fort Breakwater's motor pool).
 *
 * A Vehicle subclass picked by the type's kind (see vehicles.spawn). Tracks
 * instead of tyres: W/S drive, A/D turn the hull (on the spot, too). The
 * turret swings to wherever the view points, the gun lifts to the crosshair,
 * and the left mouse button fires a shell (one every few seconds); hold the
 * right button for the coaxial machine gun. Fifty-odd tonnes: cars get
 * shoved aside and crushed, bullets barely scratch it, and only explosions
 * really hurt.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, damp, moveTowards, wrapAngle } = VH.math;

  const G = 9.81;
  const RELOAD = 2.6; // seconds between shells
  const MAX_F = 15; // m/s forward (54 km/h)
  const MAX_R = 6;

  const SPEC = {
    id: 'bastion', kind: 'tank', name: 'Bastion MBT', make: 'Breakwater Arsenal', cls: 'tank',
    length: 9.6, width: 3.7, height: 2.9, mass: 52000, topSpeed: 28, accel: 0.4, grip: 1, seats: 3,
    wheelbase: 6.2, trackWidth: 3.1, wheelRadius: 0.4, siren: null,
    palette: [0x5d6b3c, 0x6b6545, 0x4b5320], military: true,
  };

  // ------------------------------------------------------------- model
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    MATS = {
      lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.24, 0.2) }),
      lampOn: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.8, 4.2) }),
      metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.7 }),
      matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.05 }),
    };
    return MATS;
  }
  const GEO = new Map();

  function shadeHex(hex, k) {
    const r = Math.round(((hex >> 16) & 255) * k);
    const g = Math.round(((hex >> 8) & 255) * k);
    const b = Math.round((hex & 255) * k);
    return (r << 16) | (g << 8) | b;
  }

  /** A solid between two convex outlines ([x, z] points, the same count) at two heights: turret faces, a bustle. */
  function frustum(kit, lower, y0, upper, y1, color) {
    const c = VH.col(color);
    const B = lower.map(([x, z]) => [x, y0, z]);
    const T = upper.map(([x, z]) => [x, y1, z]);
    const all = B.concat(T);
    const ctr = [0, 0, 0];
    for (const p of all) for (let i = 0; i < 3; i++) ctr[i] += p[i] / all.length;
    const face = (pts) => {
      const [a, b, d] = pts;
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      n = n.map((q) => q / l);
      const mid = pts.reduce((m, p) => [m[0] + p[0] / pts.length, m[1] + p[1] / pts.length, m[2] + p[2] / pts.length], [0, 0, 0]);
      if (n[0] * (mid[0] - ctr[0]) + n[1] * (mid[1] - ctr[1]) + n[2] * (mid[2] - ctr[2]) < 0) n = n.map((q) => -q);
      for (let i = 1; i + 1 < pts.length; i++) kit.tri(pts[0], pts[i], pts[i + 1], n, n, n, c, c, c);
    };
    face(T);
    face(B);
    for (let i = 0; i < B.length; i++) {
      const j = (i + 1) % B.length;
      face([B[i], B[j], T[j], T[i]]);
    }
  }

  /** A small seeded random generator, so the camouflage is the same on every tank of a colour. */
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Hull, turret and gun, built with the aircraft model kit (aircraft.js):
   * paint, bare metal and matte (tracks, rubber) for each part.
   */
  function buildGeometry(color) {
    const K = () => new VH.AircraftKit();
    const hull = K();
    const hullM = K();
    const hullR = K();
    const PI = Math.PI;
    const dark = 0x1f211c;
    const steel = 0x5b5f58;
    const track = 0x2a2b28;
    const rubber = 0x18191a;
    const shade = shadeHex(color, 0.8);
    const camoA = shadeHex(color, 0.62);
    const camoB = 0x6e6247;
    const rnd = seeded(color);

    // ----------------------------------------------------------- hull
    // Lower hull between the tracks, and the upper hull over them (sloped glacis, flat deck, raked back).
    hull.slab([[-3.9, 0.55], [3.35, 0.55], [4.05, 1.0], [3.6, 1.15], [-3.95, 1.15], [-3.98, 0.9]], -1.3, 1.3, shade, 'zy');
    hull.slab([[-3.98, 1.0], [3.75, 1.0], [4.18, 1.12], [3.45, 1.62], [-3.78, 1.62], [-4.02, 1.3]], -1.98, 1.98, color, 'zy');
    // Side skirts with panel joints, a little proud of the hull.
    for (const s of [1, -1]) {
      hull.slab([[-3.95, 0.62], [3.55, 0.62], [3.9, 0.9], [3.9, 1.2], [-3.95, 1.2]], s > 0 ? 1.98 : -2.04, s > 0 ? 2.04 : -1.98, color, 'zy');
      for (let z = -2.85; z < 3.4; z += 1.1) hull.box(0.012, 0.56, 0.035, s * 2.046, 0.91, z, shade);
      hull.box(0.012, 0.03, 7.6, s * 2.046, 0.66, -0.2, shade);
    }

    // Tracks: a dark loop round the drive sprocket (back) and idler (front), with the tread links on it.
    const loop = [];
    loop.push([-3.25, 0.02], [3.15, 0.02]);
    for (let a = -1.2; a <= 1.41; a += 0.32) loop.push([3.52 + Math.cos(a) * 0.42, 0.55 + Math.sin(a) * 0.42]);
    for (let a = PI - 1.45; a <= PI + 1.01; a += 0.3) loop.push([-3.72 + Math.cos(a) * 0.44, 0.58 + Math.sin(a) * 0.44]);
    const per = [];
    for (let i = 0; i < loop.length; i++) per.push([loop[i], loop[(i + 1) % loop.length]]);
    const lc = loop.reduce((m, p) => [m[0] + p[0] / loop.length, m[1] + p[1] / loop.length], [0, 0]);
    for (const s of [1, -1]) {
      const x0 = s * 1.32;
      const x1 = s * 1.93;
      hullR.slab(loop, Math.min(x0, x1), Math.max(x0, x1), track, 'zy');
      // Tread links every 20 cm round the loop.
      let carry = 0;
      for (const [a, b] of per) {
        const dz = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = Math.hypot(dz, dy);
        const th = Math.atan2(dy, dz);
        let nz = -dy / len;
        let ny = dz / len;
        const mz = (a[0] + b[0]) / 2 - lc[0];
        const my = (a[1] + b[1]) / 2 - lc[1];
        if (nz * mz + ny * my < 0) {
          nz = -nz;
          ny = -ny;
        }
        for (let t = carry; t < len; t += 0.2) {
          const z = a[0] + (dz * t) / len + nz * 0.018;
          const y = a[1] + (dy * t) / len + ny * 0.018;
          hullR.box(0.64, 0.05, 0.1, s * 1.625, y, z, 0x34352f, -th);
        }
        carry = (carry + 0.2 - (len % 0.2)) % 0.2;
      }
      // Road wheels (their lower halves show under the skirts), idler and drive sprocket.
      for (let i = 0; i < 7; i++) {
        const z = -3.08 + i * 1.03;
        hullR.tyre(0.37, 0.09, s * 1.97, 0.4, z, rubber, 16);
        hull.cyl(0.25, 0.25, 0.1, 14, s * 1.99, 0.4, z, shade, 0, PI / 2);
        hullM.cyl(0.07, 0.07, 0.12, 8, s * 2.02, 0.4, z, steel, 0, PI / 2);
      }
      hull.cyl(0.36, 0.36, 0.12, 16, s * 1.96, 0.55, 3.52, shade, 0, PI / 2);
      hullM.cyl(0.1, 0.1, 0.16, 8, s * 2.0, 0.55, 3.52, steel, 0, PI / 2);
      hullM.cyl(0.42, 0.42, 0.14, 18, s * 1.95, 0.58, -3.72, steel, 0, PI / 2);
      for (let k = 0; k < 11; k++) {
        const a = (k / 11) * PI * 2;
        hullM.box(0.14, 0.09, 0.12, s * 1.95, 0.58 + Math.sin(a) * 0.45, -3.72 + Math.cos(a) * 0.45, steel, -a);
      }
      hullM.cyl(0.16, 0.16, 0.18, 10, s * 2.0, 0.58, -3.72, dark, 0, PI / 2);
      // Headlight housings, tow hooks, mudguards, tools and exhausts.
      hull.box(0.28, 0.22, 0.2, s * 1.25, 1.38, 3.77, shade);
      hullM.box(0.12, 0.2, 0.16, s * 0.8, 0.86, 4.08, steel);
      hull.box(0.62, 0.04, 0.5, s * 1.62, 1.12, 3.95, shade, 0.25);
      hullM.box(0.06, 0.05, 1.6, s * 1.75, 1.66, -1.2, 0x6e5a3e); // shovel handle
      hullM.box(0.24, 0.03, 0.34, s * 1.75, 1.655, -0.25, steel); // shovel blade
      hullM.box(0.05, 0.05, 1.8, s * 1.55, 1.655, 0.6, steel); // crowbar
      hullM.box(0.36, 0.22, 0.42, s * 1.35, 1.38, -4.0, 0x2c2d2a);
      hullR.box(0.28, 0.14, 0.04, s * 1.35, 1.38, -4.22, 0x0c0c0c);
    }
    // Driver's hatch and periscopes, engine deck grilles, stowage at the back.
    hull.cyl(0.36, 0.36, 0.06, 14, 0, 1.65, 2.75, shade, PI / 2);
    for (const x of [-0.24, 0, 0.24]) {
      hullM.box(0.16, 0.1, 0.12, x, 1.67, 3.15, steel);
      hullR.box(0.13, 0.06, 0.01, x, 1.68, 3.215, 0x1a2a33);
    }
    hullR.box(2.3, 0.025, 1.7, 0, 1.63, -2.75, dark);
    for (let i = 0; i < 9; i++) hull.box(2.2, 0.05, 0.06, 0, 1.655, -3.5 + i * 0.19, shade);
    hull.box(1.5, 0.36, 0.42, 0, 1.36, -4.15, color);
    for (const s of [1, -1]) hull.box(0.08, 0.08, 0.35, s * 0.55, 1.75, -1.6, steel); // lifting eyes
    // Camouflage on the top and the skirts.
    const blot = (cx, cz, rad, col, plane, x) => {
      const pts = [];
      const n = 6;
      const ph = rnd() * PI;
      for (let i = 0; i < n; i++) {
        const a = ph + (i / n) * PI * 2;
        const rr = rad * (0.7 + rnd() * 0.45);
        pts.push(plane === 'zy' ? [cz + Math.cos(a) * rr * 1.6, cx + Math.sin(a) * rr * 0.55] : [cx + Math.cos(a) * rr, cz + Math.sin(a) * rr * 1.4]);
      }
      if (plane === 'zy') hull.slab(pts, Math.min(x, x + Math.sign(x) * 0.004), Math.max(x, x + Math.sign(x) * 0.004), col, 'zy');
      else hull.slab(pts, 1.622, 1.627, col);
    };
    for (let i = 0; i < 9; i++) blot(-1.5 + rnd() * 3, -3.2 + rnd() * 6.2, 0.25 + rnd() * 0.3, i % 2 ? camoA : camoB, 'xz');
    for (const s of [1, -1]) for (let i = 0; i < 5; i++) blot(0.8 + rnd() * 0.25, -3.4 + i * 1.6 + rnd() * 0.5, 0.2 + rnd() * 0.12, i % 2 ? camoA : camoB, 'zy', s * 2.0425);

    // ---------------------------------------------------------- turret
    const turret = K();
    const turretM = K();
    const turretR = K();
    turretM.cyl(1.25, 1.25, 0.2, 18, 0, 0.0, 0, steel, PI / 2);
    frustum(turret, [[-1.6, -2.0], [1.6, -2.0], [1.95, 0.1], [1.25, 2.0], [-1.25, 2.0], [-1.95, 0.1]], 0.08,
      [[-1.38, -1.86], [1.38, -1.86], [1.66, 0.05], [0.96, 1.7], [-0.96, 1.7], [-1.66, 0.05]], 0.92, color);
    frustum(turret, [[-1.45, -2.85], [1.45, -2.85], [1.6, -1.95], [-1.6, -1.95]], 0.24,
      [[-1.3, -2.75], [1.3, -2.75], [1.4, -1.9], [-1.4, -1.9]], 0.88, color);
    // Bustle rack with kit in it.
    turretM.box(3.0, 0.04, 0.06, 0, 0.84, -3.15, steel);
    turretM.box(3.0, 0.04, 0.06, 0, 0.4, -3.15, steel);
    for (const x of [-1.45, -0.5, 0.5, 1.45]) turretM.box(0.04, 0.48, 0.06, x, 0.62, -3.15, steel);
    turret.box(0.9, 0.34, 0.36, -0.75, 0.6, -3.0, camoB);
    turret.box(0.7, 0.3, 0.34, 0.55, 0.58, -3.0, shade);
    turretR.cyl(0.16, 0.16, 0.9, 10, 0.45, 0.82, -3.0, 0x3a3f2c, 0, PI / 2);
    // Commander's cupola with periscopes and a machine gun; the loader's hatch.
    turret.cyl(0.4, 0.42, 0.24, 16, 0.65, 1.04, -0.55, shade, PI / 2);
    turret.cyl(0.33, 0.33, 0.06, 14, 0.65, 1.19, -0.55, color, PI / 2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      turretM.box(0.12, 0.09, 0.08, 0.65 + Math.cos(a) * 0.36, 1.1, -0.55 + Math.sin(a) * 0.36, steel, 0, -a);
    }
    turretM.box(0.1, 0.18, 0.1, 0.25, 1.26, -0.4, steel);
    turretM.box(0.12, 0.12, 0.55, 0.25, 1.38, -0.25, dark);
    turretM.cyl(0.025, 0.025, 0.85, 8, 0.25, 1.4, 0.4, dark);
    turret.box(0.18, 0.16, 0.28, 0.42, 1.32, -0.3, shade); // ammo box
    turret.cyl(0.32, 0.32, 0.06, 14, -0.62, 0.96, -0.3, shade, PI / 2);
    // Gunner's sight, smoke launchers, aerials.
    turret.box(0.42, 0.34, 0.52, 1.0, 1.1, 0.85, shade);
    turretR.box(0.34, 0.24, 0.02, 1.0, 1.12, 1.115, 0x1a2a33);
    for (const s of [1, -1]) {
      for (let i = 0; i < 4; i++) turretM.cyl(0.065, 0.065, 0.34, 8, s * (1.5 - i * 0.04), 0.78 + i * 0.09, 0.9 + i * 0.04, dark, -0.5, s * 0.55);
      turretM.strut([s * 1.25, 0.9, -1.75], [s * 1.3, 3.2, -1.85], 0.015, dark);
    }
    // Camouflage on the roof.
    for (let i = 0; i < 5; i++) {
      const cx = -1.0 + rnd() * 2.0;
      const cz = -1.6 + rnd() * 3.0;
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * PI * 2;
        const rr = 0.22 + rnd() * 0.18;
        pts.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr * 1.3]);
      }
      turret.slab(pts, 0.922, 0.927, i % 2 ? camoA : camoB);
    }

    // ------------------------------------------------------------- gun
    // Mantlet, barrel with thermal sleeve bands, fume extractor and muzzle (from the trunnion along +Z).
    const gun = K();
    const gunM = K();
    frustum(gun, [[-0.6, -0.15], [0.6, -0.15], [0.55, 0.55], [-0.55, 0.55]], -0.38,
      [[-0.55, -0.12], [0.55, -0.12], [0.48, 0.5], [-0.48, 0.5]], 0.38, color);
    gun.cyl(0.15, 0.17, 5.3, 14, 0, 0, 3.15, color);
    for (const z of [1.4, 2.4, 4.4, 5.2]) gun.cyl(0.165, 0.165, 0.08, 14, 0, 0, z, shade);
    gun.cyl(0.21, 0.21, 0.85, 14, 0, 0, 3.4, shade);
    gunM.cyl(0.17, 0.17, 0.3, 14, 0, 0, 5.88, dark);
    gunM.cyl(0.11, 0.11, 0.04, 12, 0, 0, 6.04, 0x0a0a0a);
    gunM.box(0.12, 0.1, 0.12, 0, 0.18, 5.6, steel); // muzzle reference sensor
    gunM.box(0.16, 0.12, 0.5, 0.44, 0.15, 0.6, dark); // coaxial MG
    gunM.cyl(0.025, 0.025, 0.4, 8, 0.44, 0.15, 1.0, dark);
    return {
      hull: hull.geometry(), hullM: hullM.geometry(), hullR: hullR.geometry(),
      turret: turret.geometry(), turretM: turretM.geometry(), turretR: turretR.geometry(),
      gun: gun.geometry(), gunM: gunM.geometry(),
    };
  }

  class TankModel {
    constructor(opts, seed) {
      const pal = SPEC.palette;
      this.color = opts.color !== undefined && opts.color !== null ? opts.color : pal[Math.floor(VH.math.hash2(seed || 1, 31) * pal.length) % pal.length];
      let g = GEO.get(this.color);
      if (!g) {
        g = buildGeometry(this.color);
        GEO.set(this.color, g);
      }
      this.root = new THREE.Group();
      this.root.name = 'tank';
      this.body = new THREE.Group();
      this.root.add(this.body);
      this.paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.1 });
      this.meshes = [];
      const M0 = mats();
      const add = (geo, parent, material) => {
        const m = new THREE.Mesh(geo, material || this.paint);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        this.meshes.push(m);
        return m;
      };
      add(g.hull, this.body);
      add(g.hullM, this.body, M0.metal);
      add(g.hullR, this.body, M0.matte);
      this.turret = new THREE.Group();
      this.turret.position.set(0, 1.6, -0.3);
      this.body.add(this.turret);
      add(g.turret, this.turret);
      add(g.turretM, this.turret, M0.metal);
      add(g.turretR, this.turret, M0.matte);
      this.gun = new THREE.Group();
      this.gun.position.set(0, 0.45, 1.75);
      this.turret.add(this.gun);
      add(g.gun, this.gun);
      add(g.gunM, this.gun, M0.metal);
      const M = mats();
      this.lamps = [1, -1].map((s) => {
        const l = new THREE.Mesh(LAMP_GEO, M.lamp);
        l.position.set(s * 1.25, 1.38, 3.875);
        this.body.add(l);
        return l;
      });
      this.wheels = [];
      this.anchors = {};
      this._lit = false;
    }

    setHeadlights(on) {
      if (on === this._lit) return;
      this._lit = on;
      const M = mats();
      for (const l of this.lamps) l.material = on ? M.lampOn : M.lamp;
    }

    setBrake() {}
    setReverse() {}
    setSiren() {
      return null;
    }

    setDamage(k) {
      this.paint.color.setScalar(1 - clamp(k, 0, 1) * 0.65);
    }

    setVisible(v) {
      this.root.visible = v;
    }

    setShadows(cast) {
      for (const m of this.meshes) m.castShadow = cast;
    }

    dispose() {
      if (this.root.parent) this.root.parent.remove(this.root);
      this.paint.dispose();
    }
  }
  const LAMP_GEO = new THREE.CircleGeometry(0.08, 10);

  // -------------------------------------------------------------- tank
  class Tank extends VH.Vehicle {
    constructor(system, typeId, opts) {
      super(system, typeId, opts);
      this.military = true;
      this.aimCamera = true; // camera.js: never swing the view (and the turret) back behind
      this.crosshair = true;
      this.topSpeed = MAX_F;
      this.turretYaw = 0;
      this.gunPitch = 0;
      this.reload = 0;
      this._mgT = 0;
      this._aimT = 0;
      this._aimYaw = 0;
      this._aimPitch = 0;
      this.voiceRange = 160;
      this.voiceRef = 18;
    }

    _buildModel(typeId, opts) {
      return new TankModel(opts, this.id);
    }

    playerControls(inp, dt, game) {
      const pad = inp.pad && inp.pad.connected ? inp.pad : null;
      let accel = (inp.down('moveForward') ? 1 : 0) - (inp.down('moveBack') ? 1 : 0);
      let steer = (inp.down('moveLeft') ? 1 : 0) - (inp.down('moveRight') ? 1 : 0);
      if (pad && (pad.rt > 0.05 || pad.lt > 0.05)) accel = pad.rt - pad.lt;
      if (pad && Math.abs(pad.move.x) > 0.05) steer = -pad.move.x;
      if (game.frozenControls) accel = steer = 0;
      this.input.accel = accel;
      this.input.steer = steer;
      this.input.handbrake = inp.down('jump') ? 1 : 0;
      if (inp.consume('lights')) this.lightsOn = !this.lightsOn;
      // Where the crosshair points: the turret and gun turn to it.
      this._aimT -= dt;
      if (this._aimT <= 0 && game.combat) {
        this._aimT = 0.05;
        const ray = game.combat._aimRay(0);
        const o = ray.o;
        const d = ray.d;
        const t0 = Math.max(0, (this.pos.x - o.x) * d.x + (this.pos.y - o.y) * d.y + (this.pos.z - o.z) * d.z + this.hz);
        const hit = game.combat.trace(o.x + d.x * t0, o.y + d.y * t0, o.z + d.z * t0, d.x, d.y, d.z, 450, null, this);
        const t = t0 + hit.t;
        const px = o.x + d.x * t;
        const py = o.y + d.y * t;
        const pz = o.z + d.z * t;
        const pv = this._pivot();
        this._aimYaw = Math.atan2(px - pv.x, pz - pv.z);
        this._aimPitch = Math.atan2(py - pv.y, Math.hypot(px - pv.x, pz - pv.z));
      }
    }

    /** The trunnion, in the world. */
    _pivot() {
      const w = this.localToWorld(0, -0.3 + 1.75, this._pv || (this._pv = {}));
      w.y = this.pos.y + 1.6 + 0.45;
      return w;
    }

    fixedUpdate(dt) {
      this.prevPos.copy(this.pos);
      this.prevYaw = this.yaw;
      if (this.sleeping) return;
      const inp = this.input;
      if (this.wrecked || !this.driver) {
        inp.accel = 0;
        inp.steer = 0;
      }
      // Tracks: no sliding, turns on the spot.
      const tgt = inp.accel >= 0 ? inp.accel * MAX_F : inp.accel * MAX_R;
      const rate = Math.abs(tgt) > Math.abs(this.vF) && Math.sign(tgt) === Math.sign(this.vF || tgt) ? 3.2 : 6;
      this.vF = moveTowards(this.vF, inp.handbrake ? 0 : tgt, rate * dt);
      const turn = inp.steer * (0.95 - 0.4 * Math.min(1, Math.abs(this.vF) / MAX_F));
      this.omega = turn;
      this.yaw = wrapAngle(this.yaw + turn * dt);
      const s = Math.sin(this.yaw);
      const c = Math.cos(this.yaw);
      // Pushed by a collision last step? Keep a little of it, then the tracks win.
      const along = this.vel.x * s + this.vel.z * c;
      const sideX = this.vel.x - s * along;
      const sideZ = this.vel.z - c * along;
      const keep = Math.exp(-8 * dt);
      this.vel.x = s * this.vF + sideX * keep;
      this.vel.z = c * this.vF + sideZ * keep;
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      // Ground: follow it over kerbs and ramps, fall off ledges.
      this._ground4();
      const g = this._groundAvg;
      if (this.pos.y - g > 0.35 || this.vel.y > 0.5) {
        this.grounded = false;
        this.vel.y -= G * 1.2 * dt;
        this.pos.y += this.vel.y * dt;
        if (this.pos.y <= g) {
          const impact = -this.vel.y;
          this.pos.y = g;
          this.vel.y = 0;
          this.grounded = true;
          if (impact > 3) this.sys.onLand(this, impact, this.airTime);
        }
      } else {
        this.grounded = true;
        this.pos.y = g;
        this.vel.y = 0;
        const gr = this._ground;
        const front = (gr[0] + gr[1]) / 2;
        const rear = (gr[2] + gr[3]) / 2;
        const left = (gr[0] + gr[2]) / 2;
        const right = (gr[1] + gr[3]) / 2;
        this.pitch = damp(this.pitch, Math.atan2(rear - front, this.a + this.b), 10, dt);
        this.roll = damp(this.roll, Math.atan2(left - right, this.track), 10, dt);
      }
      this.sys.collideStatic(this);
      // Against a wall the tracks stall rather than grind on at full speed.
      this.vF = clamp(this.vel.x * s + this.vel.z * c, -MAX_R, MAX_F);
      this._crush(dt);
      // Turret and gun follow the aim.
      if (this.driver === 'player') {
        const want = VH.math.angleDelta(this.turretYaw, wrapAngle(this._aimYaw - this.yaw));
        this.turretYaw = wrapAngle(this.turretYaw + clamp(want, -1.1 * dt, 1.1 * dt));
        this.gunPitch = moveTowards(this.gunPitch, clamp(this._aimPitch, -0.12, 0.36), 0.7 * dt);
      }
      this.reload = Math.max(0, this.reload - dt);
      this._mgT -= dt;
      // Sound and the HUD.
      this.rpm = 0.15 + Math.min(1, Math.abs(this.vF) / MAX_F) * 0.6 + Math.abs(inp.accel) * 0.25;
      this.gear = 1;
      this.reversing = this.vF < -0.3;
      this.ax = 0;
      this._afterStep(dt);
    }

    /** Cars under the tracks get flattened. */
    _crush(dt) {
      if (Math.abs(this.vF) < 1.5) return;
      const ahead = this.vF > 0 ? 1 : -1;
      const p = this.localToWorld(0, ahead * (this.hz - 0.6), this._cp || (this._cp = {}));
      for (const o of this.sys.list) {
        if (o === this || o.wrecked || o.kind === 'tank' || Math.abs(o.pos.y - this.pos.y) > 2) continue;
        if (Math.hypot(o.pos.x - p.x, o.pos.z - p.z) > o.hz + 1.4) continue;
        o.damage(260 * dt * (1 + Math.abs(this.vF) / 5), this.driver === 'player' ? 'player' : null, 'crush');
        o.wake();
      }
    }

    damage(amount, source, kind) {
      // Bullets barely scratch it; bumps don't do much; explosions are what count.
      const k = kind === 'bullet' ? 0.06 : kind === 'blast' ? 0.5 : kind === 'crash' || !kind ? 0.2 : 0.35;
      super.damage(amount * k, source, kind);
    }

    updateVisual(dt, alpha, night) {
      super.updateVisual(dt, alpha, night);
      const m = this.model;
      m.turret.rotation.y = this.turretYaw;
      m.gun.rotation.x = -this.gunPitch;
      if (this._recoilT > 0) {
        this._recoilT = Math.max(0, this._recoilT - dt * 3);
        m.gun.position.z = 1.75 - this._recoilT * 0.5;
      }
    }

    /** The gun's direction and its muzzle, in the world. */
    _barrel(out) {
      const a = this.yaw + this.turretYaw;
      const cp = Math.cos(this.gunPitch);
      const d = out.d.set(Math.sin(a) * cp, Math.sin(this.gunPitch), Math.cos(a) * cp);
      const pv = this._pivot();
      out.m.set(pv.x + d.x * 6.0, pv.y + d.y * 6.0, pv.z + d.z * 6.0);
      return out;
    }

    fireWeapon(combat, inp, firing, pressed, dt) {
      const g = this.sys.game;
      const b = this._barrel(this._b || (this._b = { d: new THREE.Vector3(), m: new THREE.Vector3() }));
      if (pressed && this.reload <= 0) {
        this.reload = RELOAD;
        this._recoilT = 1;
        combat.thrown.push(new VH.Rocket(g, this, b.m, b.d, 190, 10, 380));
        g.fx.muzzle(b.m.x, b.m.y, b.m.z, true);
        if (g.fx.dust) g.fx.dust(b.m.x, this.pos.y + 0.3, b.m.z, 14);
        if (g.audio.explosion) g.audio.explosion(0.55, 0);
        if (g.audio.gunshot) g.audio.gunshot('sniper', 0, 1, false);
        g.cameraRig.addShake(0.45);
        this.vF -= 0.8;
        VH.events.emit('gunshot', { x: this.pos.x, z: this.pos.z, byPlayer: true, loud: true });
      }
      // Coaxial machine gun on the right button.
      if (inp.down('aim') && this._mgT <= 0) {
        this._mgT = 1 / 11;
        const d = b.d;
        const hit = combat.trace(b.m.x, b.m.y, b.m.z, d.x, d.y, d.z, 220, null, this);
        const x = b.m.x + d.x * hit.t;
        const y = b.m.y + d.y * hit.t;
        const z = b.m.z + d.z * hit.t;
        g.fx.tracer(b.m.x, b.m.y, b.m.z, x, y, z);
        if (hit.type === 'agent') {
          hit.agent.damage(18, 'player', 'bullet', { x, y, z, dx: d.x, dy: d.y, dz: d.z, head: hit.head });
          if (hit.agent.brain && hit.agent.brain.setAlert) hit.agent.brain.setAlert(hit.agent);
          g.fx.impact(x, y, z, -d.x, -d.y, -d.z, 'flesh');
          combat.hitMarkerT = 0.18;
        } else if (hit.type === 'car') {
          hit.v.damage(9, 'player', 'bullet');
          g.fx.impact(x, y, z, -d.x, 0, -d.z, 'car');
        } else if (hit.type === 'world') g.fx.impact(x, y, z, hit.hit.nx, hit.hit.ny, hit.hit.nz, 'concrete');
        if (g.audio.gunshot) g.audio.gunshot('rifle', 0, 0.8, false);
        VH.events.emit('gunshot', { x: this.pos.x, z: this.pos.z, byPlayer: true, loud: true });
      }
    }

    hudInfo() {
      return {
        kmh: Math.abs(this.vF) * 3.6,
        max: MAX_F * 3.6 * 1.2,
        gear: this.reload > 0 ? '…' : this.vF < -0.3 ? 'R' : 'D',
        bar: 1 - this.reload / RELOAD,
        barLabel: this.reload > 0 ? 'RELOADING' : 'CANNON READY',
      };
    }

    createEngineVoice(audio) {
      return audio.createEngine({ kind: 'tank', player: this.driver === 'player' });
    }

    updateEngineVoice(vo, gain, pan) {
      vo.update({ rpm: this.driver ? this.rpm : 0.12, throttle: Math.abs(this.input.accel), load: Math.abs(this.input.accel) * 0.8, gain, pan });
    }
  }

  VH.CarModels.TYPES.bastion = SPEC;
  VH.VehicleKinds = Object.assign(VH.VehicleKinds || {}, { tank: Tank });
  VH.Tank = Tank;
})();
