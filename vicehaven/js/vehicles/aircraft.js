/*
 * aircraft.js — flyable aircraft: planes and helicopters.
 *
 * They are vehicles like any other (a Vehicle subclass picked by the type's
 * kind, see vehicles.spawn), so getting in, stealing, wrecking, the police
 * and the radar all just work; this file adds what a car hasn't got.
 *
 *   Plane  skylark (a light high-wing four-seater), albatross (a twin-jet
 *          airliner), talon (a fighter jet with a cannon and missiles).
 *          Arcade flight: the nose follows the mouse (the view is where the
 *          plane goes), or fly it on the keys. W/S throttle, A/D roll (steer
 *          on the ground), Space/Ctrl pull up/push down, Shift afterburner.
 *          Lift-off past stall speed; land gently on the wheels or crash.
 *   Heli   sparrow (a civil helicopter), warden (an army gunship with a
 *          minigun and rockets). Flies like a drone: it turns to face the
 *          view; W/S forward/back, A/D turn, Space up, Ctrl down, Shift fast.
 *
 * Jumping out in the air opens a parachute (vehicles._jumpOut). Models are
 * built here from simple shapes merged into one vertex-coloured mesh per
 * aircraft (plus glass, lights and the parts that spin); they are cached per
 * type and colour. VH.AircraftModels.build(type, color) gives a bare model
 * for scenery (the airliners flying over the city, ambient.js).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, damp, smoothstep, dampAngle, moveTowards, wrapAngle } = VH.math;

  const G = 9.81;
  const SEAWALL = 424;
  const WATER = -1.1;
  const AX = new THREE.Vector3(1, 0, 0);
  const AY = new THREE.Vector3(0, 1, 0);
  const AZ = new THREE.Vector3(0, 0, 1);
  const _f = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _l = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _v = new THREE.Vector3();
  const _w = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler(0, 0, 0, 'YXZ');
  const _m = new THREE.Matrix4();

  // ================================================================ specs
  // Sizes: length along the nose (+Z), width = the fuselage (for bumping into
  // cars and the door), span = wings or rotor. air = how it flies.
  const SPECS = {
    skylark: {
      kind: 'plane', name: 'Skylark S2', make: 'Ardea', cls: 'plane', length: 8.5, width: 1.5, height: 2.8, mass: 1100, seats: 4,
      palette: [0xd8262e, 0x1d4fb8, 0x13b5b1, 0xf2c500, 0x2a6a3a],
      air: {
        span: 11, stall: 22, top: 64, thrust: 6.2, pitchRate: 1.35, rollRate: 2.3, yawRate: 0.6, turnK: 2.3, align: 3.2,
        taxiTurn: 1.1, rollRes: 0.35, brakeDecel: 5, crashVs: 6.5, crashSpeed: 24, fixedGear: true,
        camDist: 15, camLift: 1.6, camUp: 1.2, cockpit: { z: 0.9, y: 2.05 }, doorZ: 0.6,
        voice: 'prop', voiceRef: 22,
        probes: [[0, 1.25, 4.3], [5.5, 2.35, 0.6], [-5.5, 2.35, 0.6], [0, 2.4, -4.1], [0, 2.3, 1.2]],
      },
    },
    albatross: {
      kind: 'plane', name: 'Albatross 300', make: 'Meridian Aero', cls: 'plane', length: 38, width: 4.2, height: 11.5, mass: 70000, seats: 180,
      palette: [0x1fa3a3, 0xff4f8b, 0x1d4fb8, 0xd29a1c],
      air: {
        span: 34, stall: 40, top: 118, thrust: 6.8, pitchRate: 0.55, rollRate: 0.85, yawRate: 0.25, turnK: 1.7, align: 2.2,
        taxiTurn: 0.45, rollRes: 0.25, brakeDecel: 3.5, crashVs: 5.5, crashSpeed: 22, rotateMax: 0.16,
        camDist: 52, camLift: 6, camUp: 4, cockpit: { z: 16.6, y: 4.55 }, doorZ: 13.5,
        voice: 'jet', voiceRef: 45,
        probes: [[0, 3.6, 19], [17, 2.9, -7.5], [-17, 2.9, -7.5], [0, 11, -17.5], [0, 3.6, -19], [6.5, 1.0, 3.5], [-6.5, 1.0, 3.5]],
      },
    },
    talon: {
      kind: 'plane', name: 'Talon F-9', make: 'Breakwater Arsenal', cls: 'plane', length: 16, width: 2.6, height: 4.6, mass: 12000, seats: 1,
      palette: [0x7a8288, 0x5d6b52, 0x3d4650],
      military: true,
      air: {
        span: 10, stall: 46, top: 150, burner: 1.65, burnerTop: 205, thrust: 11.5, pitchRate: 1.9, rollRate: 3.8, yawRate: 0.8, turnK: 3.3, align: 3.6,
        taxiTurn: 0.8, rollRes: 0.3, brakeDecel: 6, crashVs: 6.5, crashSpeed: 22, rotateMax: 0.2,
        camDist: 22, camLift: 2, camUp: 1.5, cockpit: { z: 3.3, y: 2.75 }, doorZ: 2.5,
        voice: 'jet', voiceRef: 40,
        weapons: { gunRate: 16, gunDamage: 30, gunRange: 320, gunSound: 'rifle', guns: [[0.75, 1.9, 5.5], [-0.75, 1.9, 5.5]], rocketCool: 1.1, rocketSpeed: 150, rocketBlast: 9, rocketDamage: 300, rockets: [[3, 1.3, -0.6], [-3, 1.3, -0.6]] },
        probes: [[0, 1.8, 8], [5, 1.7, -3.8], [-5, 1.7, -3.8], [1.4, 4.5, -7], [-1.4, 4.5, -7], [0, 1.8, -8]],
      },
    },
    sparrow: {
      kind: 'heli', name: 'Sparrow', make: 'Ardea', cls: 'heli', length: 11, width: 2.0, height: 3.4, mass: 1500, seats: 4,
      palette: [0xf2f2ee, 0xd8262e, 0xf2c500, 0x1d4fb8],
      air: {
        span: 10.5, rotorY: 3.1, rotorZ: 0.4, vmax: 38, boost: 1.5, climb: 9, climbAcc: 9, acc: 7, resp: 1.4, yawFollow: 3.2, spool: 3.2, crashVs: 7,
        camDist: 16, camLift: 1.8, camUp: 1.4, cockpit: { z: 1.9, y: 1.9 }, doorZ: 1.0,
        voiceRef: 30,
        probes: [[5.25, 3.1, 0.4], [-5.25, 3.1, 0.4], [0, 3.1, 5.65], [0, 3.1, -4.85], [0, 1.4, 2.6], [0, 2.0, -6.2]],
      },
    },
    warden: {
      kind: 'heli', name: 'Warden AH', make: 'Breakwater Arsenal', cls: 'heli', length: 14.5, width: 2.2, height: 4.2, mass: 6000, seats: 2,
      palette: [0x4b5320, 0x3d4650, 0x5d6b3c],
      military: true,
      air: {
        span: 14, rotorY: 3.65, rotorZ: 0.5, vmax: 46, boost: 1.4, climb: 11, climbAcc: 10, acc: 8, resp: 1.6, yawFollow: 3.0, spool: 3.5, crashVs: 7.5,
        camDist: 20, camLift: 2, camUp: 1.6, cockpit: { z: 2.8, y: 2.5 }, doorZ: 1.6,
        voiceRef: 34,
        weapons: { gunRate: 18, gunDamage: 24, gunRange: 260, gunSound: 'smg', guns: [[0, 0.75, 3.9]], rocketCool: 0.55, rocketSpeed: 110, rocketBlast: 8, rocketDamage: 260, rockets: [[2.25, 1.35, 1.0], [-2.25, 1.35, 1.0]] },
        probes: [[7, 3.65, 0.5], [-7, 3.65, 0.5], [0, 3.65, 7.5], [0, 3.65, -6.5], [0, 1.4, 4.2], [0, 2.4, -7.4]],
      },
    },
  };

  // ============================================================ model kit
  /** A smooth curve through (x, y) keys that never overshoots them (monotone cubic). */
  function monotone(xs, ys) {
    const n = xs.length;
    if (n === 1) return () => ys[0];
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1e-6));
    const m = [d[0]];
    for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
    m.push(d[n - 2]);
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        m[i] = m[i + 1] = 0;
        continue;
      }
      const a = m[i] / d[i];
      const b = m[i + 1] / d[i];
      const h = a * a + b * b;
      if (h > 9) {
        const t = 3 / Math.sqrt(h);
        m[i] = t * a * d[i];
        m[i + 1] = t * b * d[i];
      }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (i < n - 2 && x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i];
      const t = (x - xs[i]) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }

  /** Half-thickness of a symmetric NACA four-digit airfoil at chord fraction x, thickness t. */
  function naca(x, t) {
    return 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1036 * x * x * x * x);
  }
  // Chord stations of an airfoil, trailing edge → leading edge (denser at the nose).
  const FOIL = [1, 0.86, 0.68, 0.5, 0.34, 0.21, 0.11, 0.05, 0.016, 0];

  const _p0 = new THREE.Vector3();
  const _p1 = new THREE.Vector3();
  const _t0 = new THREE.Vector3();
  const _t1 = new THREE.Vector3();

  /** Collects coloured primitives and merges them into one geometry. */
  class Kit {
    constructor() {
      this.pos = [];
      this.nor = [];
      this.col = [];
    }

    add(geo, color, m) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (m) g.applyMatrix4(m);
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      const c = VH.col(color);
      for (let i = 0; i < p.length; i += 3) {
        this.pos.push(p[i], p[i + 1], p[i + 2]);
        this.nor.push(n[i], n[i + 1], n[i + 2]);
        this.col.push(c[0], c[1], c[2]);
      }
      if (g !== geo) g.dispose();
      geo.dispose();
      return this;
    }

    box(sx, sy, sz, x, y, z, color, rx, ry, rz) {
      return this.add(new THREE.BoxGeometry(sx, sy, sz), color, mat(x, y, z, rx, ry, rz));
    }

    /** A cylinder along local Z (rTop at +Z), then placed and turned. */
    cyl(rTop, rBot, len, seg, x, y, z, color, rx, ry, rz) {
      const g = new THREE.CylinderGeometry(rTop, rBot, len, seg);
      g.rotateX(Math.PI / 2);
      return this.add(g, color, mat(x, y, z, rx, ry, rz));
    }

    sphere(r, sx, sy, sz, x, y, z, color, ws, hs) {
      const g = new THREE.SphereGeometry(r, ws || 14, hs || 10);
      g.scale(sx, sy, sz);
      return this.add(g, color, mat(x, y, z));
    }

    /** A body of revolution along Z from a profile of [radius, z] pairs, squashed to an ellipse. */
    lathe(profile, seg, x, y, z, color, sx, sy) {
      const g = new THREE.LatheGeometry(profile.map(([r, pz]) => new THREE.Vector2(Math.max(r, 0.001), pz)), seg || 18);
      g.rotateX(Math.PI / 2);
      g.scale(sx || 1, sy || 1, 1);
      return this.add(g, color, mat(x, y, z));
    }

    /** A strut (round bar) between two points. */
    strut(a, b, r, color) {
      const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const len = d.length();
      const g = new THREE.CylinderGeometry(r, r, len, 6);
      const q = new THREE.Quaternion().setFromUnitVectors(AY, d.normalize());
      _m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1));
      return this.add(g, color, _m);
    }

    /**
     * A flat slab from a convex outline. plane 'xz': pts are [x, z], thick in
     * y from a to b (wings); 'zy': pts are [z, y], thick in x from a to b (fins).
     */
    slab(pts, a, b, color, plane) {
      const P = plane === 'zy'
        ? (p, t) => [t, p[1], p[0]]
        : (p, t) => [p[0], t, p[1]];
      // Outline order so the "top" (b side) faces +normal.
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const q = pts[(i + 1) % pts.length];
        area += p[0] * q[1] - q[0] * p[1];
      }
      const o = area > 0 ? pts.slice() : pts.slice().reverse();
      const pos = [];
      const tri = (A, B, C) => pos.push(...A, ...B, ...C);
      for (let i = 1; i + 1 < o.length; i++) {
        tri(P(o[0], b), P(o[i + 1], b), P(o[i], b));
        tri(P(o[0], a), P(o[i], a), P(o[i + 1], a));
      }
      for (let i = 0; i < o.length; i++) {
        const p = o[i];
        const q = o[(i + 1) % o.length];
        tri(P(p, a), P(p, b), P(q, b));
        tri(P(p, a), P(q, b), P(q, a));
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      return this.add(g, color);
    }

    /** One triangle with per-vertex normals and colours, turned to face along its normals. */
    tri(a, b, c, na, nb, nc, ca, cb, cc) {
      // Orientation from the geometry: flip if it faces against the supplied normals.
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
      if (gx * gx + gy * gy + gz * gz < 1e-14) return this;
      const sx = na[0] + nb[0] + nc[0], sy = na[1] + nb[1] + nc[1], sz = na[2] + nb[2] + nc[2];
      if (gx * sx + gy * sy + gz * sz < 0) {
        let t = b;
        b = c;
        c = t;
        t = nb;
        nb = nc;
        nc = t;
        t = cb;
        cb = cc;
        cc = t;
      }
      this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      this.nor.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]);
      this.col.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
      return this;
    }

    /**
     * A smooth body lofted through cross-sections along Z (fuselages, booms,
     * nacelles, pods). stations: [{ z, w, h, y, n }] = half width, half
     * height, centre height and squareness (a superellipse power: 2 is an
     * ellipse, 3-5 boxier), curved smoothly between. Colour `color`, with
     * hard-edged paint:
     *   opts.bands  [[s0, s1, color]] round the body, s = angle from the top
     *               (0 top, PI/2 the sides, PI the belly), both sides alike
     *   opts.zBands [[z0, z1, color]] along it (a nose cone, a tail band);
     *               these win over bands
     *   opts.seg    points round (default 28), opts.steps between stations (5)
     *   opts.caps   { front: color, back: color } closes open ends in a colour
     *   opts.x      moves it sideways (an engine pod under a wing)
     * Returns the surface, for decals: surf.at(z, s, side) → { p, n, tz, ts }.
     */
    loft(stations, color, opts) {
      opts = opts || {};
      const ox = opts.x || 0;
      const S = stations.slice().sort((a, b) => a.z - b.z);
      const zs = S.map((q) => q.z);
      const fw = monotone(zs, S.map((q) => q.w));
      const fh = monotone(zs, S.map((q) => (q.h === undefined ? q.w : q.h)));
      const fy = monotone(zs, S.map((q) => q.y || 0));
      const fn = monotone(zs, S.map((q) => q.n || 2));
      const zMin = zs[0];
      const zMax = zs[zs.length - 1];
      const P = (z, s, side, out) => {
        if (s < 0) {
          s = -s;
          side = -side;
        } else if (s > Math.PI) {
          s = 2 * Math.PI - s;
          side = -side;
        }
        const w = Math.max(fw(z), 0);
        const h = Math.max(fh(z), 0);
        const e = 2 / Math.max(fn(z), 1.2);
        const sn = Math.sin(s);
        const cs = Math.cos(s);
        out.set(ox + side * w * Math.pow(Math.abs(sn), e), fy(z) + h * Math.sign(cs) * Math.pow(Math.abs(cs), e), z);
        return out;
      };
      const frame = (z, s, side) => {
        const p = P(z, s, side, new THREE.Vector3());
        const dz = 0.01;
        const za = Math.max(zMin, z - dz);
        const zb = Math.min(zMax, z + dz);
        const tz = P(zb, s, side, _t0).sub(P(za, s, side, _t1)).clone();
        const ts = P(z, s + 0.01, side, _t0).sub(P(z, s - 0.01, side, _t1)).clone(); // "down" round the side
        const n = new THREE.Vector3().crossVectors(tz, ts).multiplyScalar(side < 0 ? -1 : 1);
        if (n.lengthSq() < 1e-12 || ts.lengthSq() < 1e-10) {
          n.set(0, 0, z >= (zMin + zMax) / 2 ? 1 : -1);
        } else {
          n.normalize();
          // Outward, whatever the maths above made of it.
          const out = _p0.set(p.x - ox, p.y - fy(z), 0);
          if (out.lengthSq() > 1e-8 && n.dot(out) < 0) n.negate();
        }
        return { p, n, tz: tz.normalize(), ts: ts.lengthSq() > 1e-10 ? ts.normalize() : new THREE.Vector3(0, -1, 0) };
      };
      const base = VH.col(color);
      const bandList = (opts.bands || []).map(([a, b, c]) => [a, b, VH.col(c)]);
      const zBandList = (opts.zBands || []).map(([a, b, c]) => [a, b, VH.col(c)]);
      const colS = (s) => {
        for (const [a, b, c] of bandList) if (s >= a && s < b) return c;
        return base;
      };
      const colZ = (z) => {
        for (const [a, b, c] of zBandList) if (z >= a && z < b) return c;
        return null;
      };
      // Columns round the body: down the +X side, then back up the -X side; band edges doubled.
      const seg = opts.seg || 28;
      const half = Math.max(4, Math.round(seg / 2));
      const cuts = new Set();
      for (const [a, b] of bandList) {
        if (a > 1e-4 && a < Math.PI - 1e-4) cuts.add(+a.toFixed(5));
        if (b > 1e-4 && b < Math.PI - 1e-4) cuts.add(+b.toFixed(5));
      }
      const sv = new Set();
      for (let k = 0; k <= half; k++) sv.add(+((Math.PI * k) / half).toFixed(5));
      for (const c of cuts) sv.add(c);
      const sList = [...sv].sort((a, b) => a - b);
      const cols = [];
      for (const s of sList) {
        if (cuts.has(s)) cols.push({ s, side: 1, c: colS(s - 1e-4) }, { s, side: 1, c: colS(s + 1e-4) });
        else cols.push({ s, side: 1, c: colS(s) });
      }
      for (let i = sList.length - 2; i >= 1; i--) {
        const s = sList[i];
        if (cuts.has(s)) cols.push({ s, side: -1, c: colS(s + 1e-4) }, { s, side: -1, c: colS(s - 1e-4) });
        else cols.push({ s, side: -1, c: colS(s) });
      }
      // Rings along Z: the stations, the steps between, and zBand edges doubled.
      const steps = opts.steps || 5;
      const zv = new Set();
      for (let i = 0; i < S.length - 1; i++) for (let k = 0; k < steps; k++) zv.add(+(S[i].z + ((S[i + 1].z - S[i].z) * k) / steps).toFixed(5));
      zv.add(+zMax.toFixed(5));
      const zc = new Set();
      for (const [a, b] of zBandList) {
        for (const v of [a, b]) if (v > zMin + 1e-4 && v < zMax - 1e-4) zc.add(+v.toFixed(5));
      }
      for (const v of zc) zv.add(v);
      const zList = [...zv].sort((a, b) => a - b);
      const rings = [];
      for (const z of zList) {
        const fr = cols.map((cl) => frame(z, cl.s, cl.side));
        if (zc.has(z)) {
          rings.push({ z, fr, cz: colZ(z - 1e-4) }, { z, fr, cz: colZ(z + 1e-4) });
        } else rings.push({ z, fr, cz: colZ(z) });
      }
      const nc = cols.length;
      const arr = (v) => [v.x, v.y, v.z];
      for (let r = 0; r < rings.length - 1; r++) {
        const A = rings[r];
        const B = rings[r + 1];
        if (B.z - A.z < 1e-6) continue;
        for (let j = 0; j < nc; j++) {
          const j2 = (j + 1) % nc;
          if (cols[j].s === cols[j2].s && cols[j].side === cols[j2].side) continue;
          const c1 = A.cz || cols[j].c;
          const c2 = A.cz || cols[j2].c;
          const c3 = B.cz || cols[j].c;
          const c4 = B.cz || cols[j2].c;
          const a = A.fr[j], b = A.fr[j2], c = B.fr[j], d = B.fr[j2];
          this.tri(arr(a.p), arr(b.p), arr(c.p), arr(a.n), arr(b.n), arr(c.n), c1, c2, c3);
          this.tri(arr(b.p), arr(d.p), arr(c.p), arr(b.n), arr(d.n), arr(c.n), c2, c4, c3);
        }
      }
      // Close open ends.
      const caps = opts.caps || {};
      for (const [ring, dir, key] of [[rings[0], -1, 'back'], [rings[rings.length - 1], 1, 'front']]) {
        if (Math.max(fw(ring.z), fh(ring.z)) < 0.01) continue;
        const cc = caps[key] !== undefined ? VH.col(caps[key]) : ring.cz || base;
        const ctr = [ox, fy(ring.z), ring.z];
        const nn = [0, 0, dir];
        for (let j = 0; j < nc; j++) {
          const j2 = (j + 1) % nc;
          this.tri(ctr, arr(ring.fr[j].p), arr(ring.fr[j2].p), nn, nn, nn, cc, cc, cc);
        }
      }
      return {
        at: (z, s, side) => frame(z, s, side || 1),
        width: (z) => fw(z),
        height: (z) => fh(z),
        centre: (z) => fy(z),
      };
    }

    /**
     * Paint on a loft (windows, doors, panels): a flat patch on the surface at
     * (z, s, side), w long (along Z) and h tall (round the body). opts.round
     * rounds the corners (0-1); opts.lift lifts it off the skin (default 1.2 cm).
     */
    decal(surf, z, s, side, w, h, color, opts) {
      opts = opts || {};
      const f = surf.at(z, s, side);
      const lift = opts.lift === undefined ? 0.012 : opts.lift;
      const o = f.p.clone().addScaledVector(f.n, lift);
      const c = VH.col(color);
      const n = [f.n.x, f.n.y, f.n.z];
      const pt = (u, v) => {
        const q = o.clone().addScaledVector(f.tz, u).addScaledVector(f.ts, v);
        return [q.x, q.y, q.z];
      };
      const r = Math.min(1, Math.max(0, opts.round || 0));
      const hw = w / 2;
      const hh = h / 2;
      let outline;
      if (r > 0) {
        const cr = Math.min(hw, hh) * r;
        outline = [];
        for (const [cx, cy, a0] of [[hw - cr, hh - cr, 0], [-hw + cr, hh - cr, Math.PI / 2], [-hw + cr, -hh + cr, Math.PI], [hw - cr, -hh + cr, Math.PI * 1.5]]) {
          for (let k = 0; k <= 3; k++) {
            const a = a0 + (k / 3) * (Math.PI / 2);
            outline.push([cx + Math.cos(a) * cr, cy + Math.sin(a) * cr]);
          }
        }
      } else outline = [[hw, hh], [-hw, hh], [-hw, -hh], [hw, -hh]];
      const ctr = pt(0, 0);
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];
        this.tri(ctr, pt(a[0], a[1]), pt(b[0], b[1]), n, n, n, c, c, c);
      }
      return this;
    }

    /**
     * A curved panel that follows a loft (windscreens, canopies' frames, big
     * painted areas): from z0 to z1, between s angles that may change along
     * it, sA = [top, bottom] at z0 and sB at z1 (a trapezoid). opts.lift as
     * for decals; opts.nz / opts.ns: how finely it bends (6 × 4).
     */
    patch(surf, z0, z1, sA, sB, side, color, opts) {
      opts = opts || {};
      const lift = opts.lift === undefined ? 0.012 : opts.lift;
      const nz = opts.nz || 6;
      const ns = opts.ns || 4;
      const c = VH.col(color);
      const G = [];
      for (let i = 0; i <= nz; i++) {
        const t = i / nz;
        const z = z0 + (z1 - z0) * t;
        const sT = sA[0] + (sB[0] - sA[0]) * t;
        const sBt = sA[1] + (sB[1] - sA[1]) * t;
        const row = [];
        for (let j = 0; j <= ns; j++) {
          const f = surf.at(z, sT + (sBt - sT) * (j / ns), side);
          const q = f.p.clone().addScaledVector(f.n, lift);
          row.push({ p: [q.x, q.y, q.z], n: [f.n.x, f.n.y, f.n.z] });
        }
        G.push(row);
      }
      for (let i = 0; i < nz; i++) {
        for (let j = 0; j < ns; j++) {
          const a = G[i][j], b = G[i][j + 1], d = G[i + 1][j], e = G[i + 1][j + 1];
          this.tri(a.p, b.p, d.p, a.n, b.n, d.n, c, c, c);
          this.tri(b.p, e.p, d.p, b.n, e.n, d.n, c, c, c);
        }
      }
      return this;
    }

    /**
     * A wing, tailplane or fin lofted through airfoil sections from the root
     * out: sections [{ x, y, z, c, t }] place the leading edge, the chord
     * (running back along -Z) and the thickness (a fraction of the chord).
     * opts.axis 'y' makes a fin (thickness across X); opts.mirror adds the
     * other side; opts.bands [[f0, f1, color]] paint spanwise (0 root, 1 tip);
     * opts.camber bows it a little (wings, not fins).
     */
    wing(sections, color, opts) {
      opts = opts || {};
      const fin = opts.axis === 'y';
      const base = VH.col(color);
      const bands = (opts.bands || []).map(([a, b, c]) => [a, b, VH.col(c)]);
      const span = (q) => (fin ? q.y : Math.abs(q.x));
      const s0 = span(sections[0]);
      const s1 = span(sections[sections.length - 1]);
      const frac = (q) => (s1 === s0 ? 0 : (span(q) - s0) / (s1 - s0));
      const colAt = (f) => {
        for (const [a, b, c] of bands) if (f >= a && f < b) return c;
        return base;
      };
      const lerpSec = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), c: lerp(a.c, b.c, t), t: lerp(a.t, b.t, t) });
      // Sections, with band edges doubled.
      const secs = [];
      for (let i = 0; i < sections.length; i++) {
        const q = sections[i];
        const f = frac(q);
        if (i > 0) {
          const p = sections[i - 1];
          const fp = frac(p);
          const edges = [];
          for (const [a, b] of bands) for (const e of [a, b]) if (e > fp + 1e-4 && e < f - 1e-4) edges.push(e);
          edges.sort((u, v) => u - v);
          for (const e of edges) {
            const t = (e - fp) / (f - fp);
            const m = lerpSec(p, q, t);
            secs.push({ q: m, c: colAt(e - 1e-4) }, { q: m, c: colAt(e + 1e-4) });
          }
        }
        secs.push({ q, c: colAt(Math.min(f, 1 - 1e-4)) });
      }
      const camber = fin ? 0 : opts.camber || 0;
      // The outline: upper surface trailing edge → nose, then the lower surface back.
      const loop = [];
      for (const x of FOIL) loop.push([x, 1]);
      for (let i = FOIL.length - 2; i >= 0; i--) loop.push([FOIL[i], -1]);
      const point = (q, x, side) => {
        const th = naca(Math.max(x, 0), q.t) * q.c * side + camber * q.c * 4 * x * (1 - x);
        return fin ? [q.x + th, q.y, q.z - x * q.c] : [q.x, q.y + th, q.z - x * q.c];
      };
      const sideSign = sections[sections.length - 1].x < sections[0].x ? -1 : 1;
      // Positions for every section × outline point, then smooth normals.
      const G = secs.map((sc) => loop.map(([x, side]) => point(sc.q, x, side)));
      const L = loop.length;
      const norms = G.map(() => loop.map(() => [0, 0, 0]));
      const quad = (i, j) => {
        const a = G[i][j], b = G[i][j + 1], c = G[i + 1][j], d = G[i + 1][j + 1];
        return [a, b, c, d];
      };
      const addN = (i, j, n) => {
        const v = norms[i][j];
        v[0] += n[0];
        v[1] += n[1];
        v[2] += n[2];
      };
      const faceN = (a, b, c) => {
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      };
      // Which way a face looks: up (or +X on a fin) on the upper surface, down on the lower, forward at the nose.
      const outward = (i, j) => {
        const side = loop[j][0] > 0 ? loop[j][1] : loop[j + 1][1];
        const nose = loop[j][0] < 0.06 && loop[j + 1][0] < 0.06 ? 0.6 : 0;
        return fin ? [side, 0, nose] : [0, side, nose];
      };
      for (let i = 0; i < G.length - 1; i++) {
        if (secs[i + 1].q === secs[i].q) continue;
        for (let j = 0; j < L - 1; j++) {
          const [a, b, c, d] = quad(i, j);
          let n1 = faceN(a, b, c);
          let n2 = faceN(b, d, c);
          const ref = outward(i, j);
          if (n1[0] * ref[0] + n1[1] * ref[1] + n1[2] * ref[2] < 0) n1 = n1.map((v) => -v);
          if (n2[0] * ref[0] + n2[1] * ref[1] + n2[2] * ref[2] < 0) n2 = n2.map((v) => -v);
          for (const [ii, jj, n] of [[i, j, n1], [i, j + 1, n1], [i + 1, j, n1], [i, j + 1, n2], [i + 1, j + 1, n2], [i + 1, j, n2]]) addN(ii, jj, n);
        }
      }
      // Band seams share normals with their twin, so the paint edge doesn't show in the shading.
      for (let i = 0; i < G.length - 1; i++) {
        if (secs[i + 1].q !== secs[i].q) continue;
        for (let j = 0; j < L; j++) {
          const a = norms[i][j], b = norms[i + 1][j];
          const m = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
          norms[i][j] = m;
          norms[i + 1][j] = m.slice();
        }
      }
      const unit = (v) => {
        const l = Math.hypot(v[0], v[1], v[2]) || 1;
        return [v[0] / l, v[1] / l, v[2] / l];
      };
      const N = norms.map((row) => row.map(unit));
      const out = new Kit();
      for (let i = 0; i < G.length - 1; i++) {
        if (secs[i + 1].q === secs[i].q) continue;
        const ca = secs[i].c, cb = secs[i + 1].c;
        for (let j = 0; j < L - 1; j++) {
          out.tri(G[i][j], G[i][j + 1], G[i + 1][j], N[i][j], N[i][j + 1], N[i + 1][j], ca, ca, cb);
          out.tri(G[i][j + 1], G[i + 1][j + 1], G[i + 1][j], N[i][j + 1], N[i + 1][j + 1], N[i + 1][j], ca, cb, cb);
        }
      }
      // Root and tip caps.
      for (const [i, dir] of [[0, -1], [G.length - 1, 1]]) {
        const ring = G[i];
        const q = secs[i].q;
        const nn = fin ? [0, dir, 0] : [dir * sideSign, 0, 0];
        const c = secs[i].c;
        const mid = [q.x, q.y, q.z - 0.35 * q.c];
        for (let j = 0; j < L - 1; j++) out.tri(mid, ring[j], ring[j + 1], nn, nn, nn, c, c, c);
      }
      this._absorb(out);
      if (opts.mirror) this._absorb(out, true);
      return this;
    }

    /** Copy another kit's triangles in (optionally mirrored across X = 0, winding fixed). */
    _absorb(k, mirror) {
      const P = k.pos, Nn = k.nor, C = k.col;
      for (let i = 0; i < P.length; i += 9) {
        const v = (o) => [mirror ? -P[i + o] : P[i + o], P[i + o + 1], P[i + o + 2]];
        const n = (o) => [mirror ? -Nn[i + o] : Nn[i + o], Nn[i + o + 1], Nn[i + o + 2]];
        const c = (o) => [C[i + o], C[i + o + 1], C[i + o + 2]];
        if (mirror) this.tri(v(0), v(6), v(3), n(0), n(6), n(3), c(0), c(6), c(3));
        else this.tri(v(0), v(3), v(6), n(0), n(3), n(6), c(0), c(3), c(6));
      }
      return this;
    }

    /** Copy another kit's triangles in, moved by a matrix (a rotor blade built once, placed four times). */
    place(src, m) {
      const nm = new THREE.Matrix3().getNormalMatrix(m);
      const P = src.pos, Nn = src.nor, C = src.col;
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();
      for (let i = 0; i < P.length; i += 9) {
        const pts = [];
        const ns = [];
        const cs = [];
        for (let o = 0; o < 9; o += 3) {
          v.set(P[i + o], P[i + o + 1], P[i + o + 2]).applyMatrix4(m);
          n.set(Nn[i + o], Nn[i + o + 1], Nn[i + o + 2]).applyMatrix3(nm).normalize();
          pts.push([v.x, v.y, v.z]);
          ns.push([n.x, n.y, n.z]);
          cs.push([C[i + o], C[i + o + 1], C[i + o + 2]]);
        }
        this.tri(pts[0], pts[1], pts[2], ns[0], ns[1], ns[2], cs[0], cs[1], cs[2]);
      }
      return this;
    }

    /** Mirror everything added after `from` (a vertex count) across X = 0. */
    mirrorFrom(from) {
      const tmp = new Kit();
      tmp.pos = this.pos.slice(from * 3);
      tmp.nor = this.nor.slice(from * 3);
      tmp.col = this.col.slice(from * 3);
      return this._absorb(tmp, true);
    }

    get count() {
      return this.pos.length / 3;
    }

    /** A tyre (a rounded ring) with its axle along X, centred at (x, y, z). */
    tyre(r, w, x, y, z, color, seg) {
      const prof = [];
      const ri = r * 0.62;
      const rr = Math.min(w * 0.42, (r - ri) * 0.5);
      prof.push(new THREE.Vector2(ri, -w / 2));
      for (let k = 0; k <= 4; k++) {
        const a = -Math.PI / 2 + (k / 4) * (Math.PI / 2);
        prof.push(new THREE.Vector2(r - rr + Math.cos(a) * rr, -w / 2 + rr + Math.sin(a) * rr));
      }
      for (let k = 0; k <= 4; k++) {
        const a = (k / 4) * (Math.PI / 2);
        prof.push(new THREE.Vector2(r - rr + Math.cos(a) * rr, w / 2 - rr + Math.sin(a) * rr));
      }
      prof.push(new THREE.Vector2(ri, w / 2));
      const g = new THREE.LatheGeometry(prof, seg || 16);
      g.rotateZ(Math.PI / 2);
      return this.add(g, color, mat(x, y, z));
    }

    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.computeBoundingSphere();
      return g;
    }
  }

  function mat(x, y, z, rx, ry, rz) {
    _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0, 'YXZ'));
    return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(1, 1, 1));
  }

  // Shared materials (made once: no shader compiles mid-game).
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    const hdr = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
    MATS = {
      glass: new THREE.MeshStandardMaterial({ color: 0x4d6a82, roughness: 0.12, metalness: 0.55 }),
      red: hdr(5, 0.25, 0.18),
      green: hdr(0.25, 5, 0.6),
      white: hdr(5, 5, 4.6),
      burner: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.2, 0.8), transparent: true, opacity: 0.85, depthWrite: false }),
      blur: new THREE.MeshBasicMaterial({ color: 0x1c1f24, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }),
      // Bare metal (engine parts, gear legs, spinners) and rubber or matte plastic.
      metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.85 }),
      matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 }),
      // Cabin windows: dark glass by day, lit from inside after dark (see setNav).
      cabin: new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 0.15, metalness: 0.4, emissive: 0xffd49a, emissiveIntensity: 0 }),
    };
    return MATS;
  }
  function paintMaterial() {
    return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.2 });
  }

  const WHITE = 0xf1f2ef;
  const DARK = 0x2a2d31;
  const GREY = 0x8a9097;
  const RUBBER = 0x161616;

  // ---------------------------------------------------- model definitions
  // Each returns { kit (paint), metal, matte, glass, lit (cabin windows that glow at night) (kits), gear (kit that
  // retracts), lights: [[mat, x, y, z, r]], prop / rotor / tailRotor (kits that
  // spin, at a pivot), strobe, beaconLow, burner }. More can be added to
  // VH.AircraftDefs from other files (loaded after this one).
  const DEFS = {
    skylark(c) {
      const k = new Kit();
      const gl = new Kit();
      k.lathe([[0.05, -4.25], [0.22, -4.0], [0.4, -2.6], [0.6, -1.0], [0.66, 0.5], [0.64, 2.0], [0.58, 3.0], [0.5, 3.7], [0.36, 4.0], [0.05, 4.05]], 16, 0, 1.2, 0, WHITE, 1, 1.08);
      k.box(1.14, 0.66, 2.3, 0, 1.92, 0.75, WHITE);
      k.box(1.16, 0.12, 6.5, 0, 1.28, -0.8, c); // the stripe
      gl.box(1.18, 0.48, 1.0, 0, 1.98, 1.45, 0x000000, -0.45);
      gl.box(1.2, 0.42, 1.25, 0, 1.94, 0.35, 0x000000);
      k.sphere(0.3, 1, 1, 1.3, 0, 1.2, 4.12, c, 10, 8); // spinner
      // High wing, struts, tail.
      k.slab([[-5.5, -0.05], [5.5, -0.05], [5.3, 1.3], [-5.3, 1.3]], 2.28, 2.42, WHITE);
      k.slab([[-5.5, 0.9], [-4.6, 0.9], [-4.6, 1.3], [-5.3, 1.3]], 2.425, 2.43, c);
      k.slab([[4.6, 0.9], [5.5, 0.9], [5.3, 1.3], [4.6, 1.3]], 2.425, 2.43, c);
      for (const s of [1, -1]) k.strut([s * 0.55, 0.95, 0.75], [s * 2.6, 2.28, 0.65], 0.045, GREY);
      k.slab([[-1.8, -4.15], [1.8, -4.15], [1.6, -3.3], [-1.6, -3.3]], 1.36, 1.44, WHITE);
      k.slab([[-4.2, 1.35], [-3.2, 1.35], [-2.85, 2.6], [-3.95, 2.75]], -0.04, 0.04, c, 'zy');
      // Fixed tricycle gear.
      for (const s of [1, -1]) {
        k.strut([s * 0.45, 0.85, 0.5], [s * 1.1, 0.3, 0.5], 0.05, GREY);
        k.cyl(0.3, 0.3, 0.2, 12, s * 1.12, 0.3, 0.5, RUBBER, 0, Math.PI / 2);
      }
      k.strut([0, 0.85, 2.95], [0, 0.25, 2.95], 0.05, GREY);
      k.cyl(0.25, 0.25, 0.16, 12, 0, 0.25, 2.95, RUBBER, 0, Math.PI / 2);
      // The propeller spins on its own.
      const prop = new Kit();
      prop.box(0.14, 2.0, 0.05, 0, 0, 0, DARK);
      return {
        kit: k, glass: gl,
        lights: [['red', 5.5, 2.36, 0.6, 0.07], ['green', -5.5, 2.36, 0.6, 0.07], ['white', 0, 2.78, -4.0, 0.06]],
        strobe: [0, 2.9, -3.9],
        prop: { kit: prop, at: [0, 1.2, 4.32], disc: 1.0 },
      };
    },
    albatross(c) {
      const k = new Kit();
      const gl = new Kit();
      k.lathe([[0.25, -19], [0.9, -17.5], [1.6, -14.5], [2.05, -11.5], [2.1, 0], [2.1, 12.5], [2.0, 14.5], [1.7, 16.5], [1.15, 18.0], [0.5, 18.8], [0.05, 19.05]], 22, 0, 3.6, 0, WHITE, 1, 1.05);
      k.box(4.25, 0.32, 27, 0, 3.15, 0.8, c); // cheat line
      gl.box(4.28, 0.3, 25, 0, 4.15, 1.0, 0x000000);
      gl.box(2.0, 0.55, 0.9, 0, 4.55, 17.2, 0x000000, -0.55);
      // Swept low wings with engines.
      for (const s of [1, -1]) {
        k.slab([[s * 1.8, 4.5], [s * 1.8, -3.5], [s * 17, -8.6], [s * 17, -6.4]], 2.2, 2.62, 0xdfe2e5);
        k.slab([[s * 16.4, -6.6], [s * 16.4, -8.4], [s * 17, -8.6], [s * 17, -6.4]], 2.63, 3.6, c);
        k.cyl(1.2, 1.25, 4.4, 16, s * 6.6, 1.45, 3.4, 0xd9dde0);
        k.cyl(0.95, 0.95, 0.1, 16, s * 6.6, 1.45, 5.62, DARK);
        k.cyl(0.6, 0.85, 1.2, 12, s * 6.6, 1.45, 0.75, GREY);
        k.box(0.35, 1.0, 2.6, s * 6.6, 2.3, 2.9, 0xdfe2e5);
      }
      // Tail.
      k.slab([[-6.4, -18.6], [6.4, -18.6], [1.4, -15.0], [-1.4, -15.0]], 4.25, 4.5, 0xdfe2e5);
      k.slab([[-14.5, 5.2], [-19.0, 5.2], [-19.6, 11.4], [-17.2, 11.4]], -0.18, 0.18, c, 'zy');
      // Gear: nose leg and two main bogies.
      k.strut([0, 1.7, 15.2], [0, 0.55, 15.2], 0.13, GREY);
      for (const s of [1, -1]) {
        k.cyl(0.55, 0.55, 0.36, 14, s * 0.32, 0.55, 15.2, RUBBER, 0, Math.PI / 2);
        k.strut([s * 3, 2.0, -0.2], [s * 3, 0.65, -0.2], 0.16, GREY);
        for (const z of [-0.9, 0.5]) k.cyl(0.62, 0.62, 0.42, 14, s * 3, 0.62, z, RUBBER, 0, Math.PI / 2);
      }
      return {
        kit: k, glass: gl,
        lights: [['red', 17, 2.7, -7.5, 0.16], ['green', -17, 2.7, -7.5, 0.16], ['white', 0, 4.0, -19.1, 0.14]],
        strobe: [0, 5.8, 0],
        beaconLow: [0, 1.5, 0],
      };
    },
    talon(c) {
      const k = new Kit();
      const gl = new Kit();
      const light = 0x9aa3ab;
      k.lathe([[0.55, -8.0], [0.75, -7.0], [0.95, -4.5], [0.95, 0.5], [0.8, 3.5], [0.5, 5.8], [0.2, 7.4], [0.02, 8.1]], 18, 0, 1.8, 0, c, 1.05, 0.85);
      gl.sphere(1, 0.42, 0.4, 1.45, 0, 2.42, 3.2, 0x000000);
      for (const s of [1, -1]) {
        k.box(0.72, 0.85, 3.4, s * 1.05, 1.62, 0.6, light);
        k.box(0.62, 0.7, 0.08, s * 1.05, 1.62, 2.31, RUBBER);
        k.slab([[s * 0.9, 1.8], [s * 0.9, -4.6], [s * 5.0, -4.7], [s * 5.0, -3.1]], 1.55, 1.72, c);
        k.slab([[s * 0.8, -6.2], [s * 0.8, -7.8], [s * 3.1, -8.0], [s * 3.1, -7.0]], 1.72, 1.82, c);
        k.slab([[-5.1, 2.1], [-7.9, 2.1], [-8.0, 4.6], [-6.9, 4.6]], s * 1.15 - 0.07, s * 1.15 + 0.07, c, 'zy');
        k.cyl(0.13, 0.13, 2.4, 8, s * 3.0, 1.3, -0.6, WHITE);
        k.box(0.08, 0.25, 1.0, s * 3.0, 1.48, -0.6, GREY);
      }
      k.cyl(0.62, 0.58, 0.7, 14, 0, 1.8, -8.1, DARK);
      // Retracting gear.
      const gear = new Kit();
      gear.strut([0, 1.2, 5.0], [0, 0.35, 5.0], 0.07, GREY);
      gear.cyl(0.35, 0.35, 0.18, 12, 0, 0.35, 5.0, RUBBER, 0, Math.PI / 2);
      for (const s of [1, -1]) {
        gear.strut([s * 1.2, 1.3, -1.5], [s * 1.4, 0.42, -1.5], 0.08, GREY);
        gear.cyl(0.42, 0.42, 0.24, 12, s * 1.42, 0.42, -1.5, RUBBER, 0, Math.PI / 2);
      }
      return {
        kit: k, glass: gl, gear,
        lights: [['red', 5.0, 1.65, -4.0, 0.08], ['green', -5.0, 1.65, -4.0, 0.08]],
        burner: [0, 1.8, -8.45],
      };
    },
    sparrow(c) {
      const k = new Kit();
      const gl = new Kit();
      k.sphere(1, 0.95, 0.95, 1.65, 0, 1.45, 0.75, c);
      gl.sphere(1, 0.86, 0.78, 0.95, 0, 1.6, 1.75, 0x000000);
      k.box(0.82, 0.48, 1.5, 0, 2.42, 0.3, c);
      k.cyl(0.14, 0.32, 5.6, 10, 0, 1.75, -3.1, c);
      k.slab([[-5.6, 1.9], [-6.4, 1.9], [-6.55, 3.0], [-6.1, 3.0]], -0.05, 0.05, WHITE, 'zy');
      k.slab([[-1.0, -5.3], [1.0, -5.3], [0.9, -4.8], [-0.9, -4.8]], 1.72, 1.8, WHITE);
      k.cyl(0.07, 0.07, 0.5, 6, 0, 2.85, 0.4, DARK, Math.PI / 2);
      for (const s of [1, -1]) {
        k.cyl(0.06, 0.06, 3.2, 6, s * 0.85, 0.08, 0.6, GREY);
        k.strut([s * 0.85, 0.08, 1.4], [s * 0.6, 0.85, 1.3], 0.045, GREY);
        k.strut([s * 0.85, 0.08, -0.2], [s * 0.6, 0.85, -0.2], 0.045, GREY);
      }
      const rotor = new Kit();
      rotor.box(10.5, 0.05, 0.32, 0, 0, 0, DARK);
      rotor.box(0.32, 0.05, 10.5, 0, 0, 0, DARK);
      rotor.cyl(0.2, 0.2, 0.25, 8, 0, 0, 0, GREY, Math.PI / 2);
      const tail = new Kit();
      tail.box(0.03, 1.6, 0.16, 0, 0, 0, DARK);
      return {
        kit: k, glass: gl,
        lights: [['red', 0.95, 1.35, 0.8, 0.06], ['green', -0.95, 1.35, 0.8, 0.06], ['white', 0, 2.0, -6.4, 0.06]],
        strobe: [0, 2.7, -0.4],
        rotor: { kit: rotor, at: [0, 3.1, 0.4], r: 5.25 },
        tailRotor: { kit: tail, at: [0.22, 2.0, -6.0] },
      };
    },
    warden(c) {
      const k = new Kit();
      const gl = new Kit();
      k.lathe([[0.3, -1.6], [0.75, -1.0], [0.85, 1.5], [0.7, 3.5], [0.35, 4.6], [0.05, 4.9]], 12, 0, 1.55, 0, c, 1.0, 1.25);
      k.box(1.55, 1.1, 3.2, 0, 1.6, 0.4, c);
      gl.box(0.95, 0.55, 1.2, 0, 2.3, 2.6, 0x000000, -0.25);
      gl.box(0.95, 0.5, 1.1, 0, 2.55, 1.35, 0x000000, -0.15);
      k.box(1.0, 0.7, 2.2, 0, 2.55, -0.3, c);
      k.cyl(0.18, 0.42, 6.4, 10, 0, 1.85, -4.3, c);
      k.slab([[-6.8, 1.9], [-7.5, 1.9], [-7.6, 3.6], [-7.0, 3.6]], -0.07, 0.07, c, 'zy');
      k.slab([[-1.4, -6.6], [1.4, -6.6], [1.3, -6.1], [-1.3, -6.1]], 1.85, 1.95, c);
      k.cyl(0.08, 0.08, 0.7, 6, 0, 3.3, 0.5, DARK, Math.PI / 2);
      k.sphere(0.3, 1, 1, 1, 0, 0.82, 3.6, DARK, 10, 8);
      k.cyl(0.05, 0.05, 1.2, 6, 0, 0.78, 4.2, DARK);
      for (const s of [1, -1]) {
        k.slab([[s * 0.75, 0.8], [s * 0.75, -0.4], [s * 2.6, -0.2], [s * 2.6, 0.6]], 1.55, 1.68, c);
        k.cyl(0.26, 0.26, 1.7, 10, s * 2.25, 1.35, 0.6, 0x2b2f24);
        k.strut([s * 0.75, 0.9, 1.5], [s * 1.15, 0.35, 1.5], 0.06, GREY);
        k.cyl(0.35, 0.35, 0.22, 12, s * 1.17, 0.35, 1.5, RUBBER, 0, Math.PI / 2);
      }
      k.strut([0, 1.5, -6.5], [0, 0.28, -6.6], 0.05, GREY);
      k.cyl(0.28, 0.28, 0.14, 10, 0, 0.28, -6.6, RUBBER, 0, Math.PI / 2);
      const rotor = new Kit();
      rotor.box(14, 0.06, 0.42, 0, 0, 0, DARK);
      rotor.box(0.42, 0.06, 14, 0, 0, 0, DARK);
      rotor.cyl(0.28, 0.28, 0.3, 8, 0, 0, 0, GREY, Math.PI / 2);
      const tail = new Kit();
      tail.box(0.03, 2.2, 0.2, 0, 0, 0, DARK);
      tail.box(0.03, 0.2, 2.2, 0, 0, 0, DARK);
      return {
        kit: k, glass: gl,
        lights: [['red', 2.6, 1.62, 0.2, 0.06], ['green', -2.6, 1.62, 0.2, 0.06]],
        strobe: [0, 3.0, -1.4],
        rotor: { kit: rotor, at: [0, 3.65, 0.5], r: 7 },
        tailRotor: { kit: tail, at: [0.25, 2.6, -7.25] },
      };
    },
  };

  // Other files may add or replace models: VH.AircraftDefs[type] = (color, Kit) => def.
  VH.AircraftDefs = VH.AircraftDefs || {};

  // Geometry is cached per type and colour; materials per aircraft (damage tint).
  const GEO = new Map();
  function geometryFor(type, color) {
    const key = type + '|' + color;
    let g = GEO.get(key);
    if (g) return g;
    const d = (VH.AircraftDefs[type] || DEFS[type])(color, Kit);
    const some = (k) => (k && k.pos.length ? k.geometry() : null);
    g = {
      body: d.kit.geometry(),
      metal: some(d.metal),
      matte: some(d.matte),
      lit: some(d.lit),
      glass: d.glass ? d.glass.geometry() : null,
      gear: d.gear ? d.gear.geometry() : null,
      prop: d.prop ? { geo: d.prop.kit.geometry(), at: d.prop.at, disc: d.prop.disc } : null,
      rotor: d.rotor ? { geo: d.rotor.kit.geometry(), at: d.rotor.at, r: d.rotor.r } : null,
      tailRotor: d.tailRotor ? { geo: d.tailRotor.kit.geometry(), at: d.tailRotor.at } : null,
      lights: d.lights || [],
      strobe: d.strobe || null,
      beaconLow: d.beaconLow || null,
      burner: d.burner || null,
    };
    GEO.set(key, g);
    return g;
  }

  /** The model of one aircraft, with the same interface as a car model. */
  class AircraftModel {
    constructor(type, opts, seed) {
      const spec = SPECS[type];
      const M = mats();
      const pal = spec.palette;
      this.color = opts.color !== undefined && opts.color !== null ? opts.color : pal[Math.floor(VH.math.hash2(seed || 1, 77) * pal.length) % pal.length];
      const g = geometryFor(type, this.color);
      this.type = type;
      this.root = new THREE.Group();
      this.root.name = 'aircraft-' + type;
      this.body = new THREE.Group();
      this.root.add(this.body);
      this.paint = paintMaterial();
      this.meshes = [];
      const add = (geo, m, parent) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        (parent || this.body).add(mesh);
        this.meshes.push(mesh);
        return mesh;
      };
      add(g.body, this.paint);
      if (g.metal) add(g.metal, M.metal);
      if (g.matte) add(g.matte, M.matte);
      if (g.lit) add(g.lit, M.cabin);
      if (g.glass) add(g.glass, M.glass);
      this.gear = g.gear ? add(g.gear, this.paint) : null;
      const spinner = (part) => {
        const grp = new THREE.Group();
        grp.position.set(part.at[0], part.at[1], part.at[2]);
        this.body.add(grp);
        add(part.geo, this.paint, grp);
        return grp;
      };
      this.prop = g.prop ? spinner(g.prop) : null;
      if (this.prop && g.prop.disc) {
        this.propDisc = new THREE.Mesh(new THREE.CircleGeometry(g.prop.disc, 20), M.blur);
        this.propDisc.visible = false;
        this.prop.add(this.propDisc);
      }
      this.rotor = g.rotor ? spinner(g.rotor) : null;
      if (this.rotor) {
        this.rotorDisc = new THREE.Mesh(new THREE.CircleGeometry(g.rotor.r, 28), M.blur);
        this.rotorDisc.rotation.x = -Math.PI / 2;
        this.rotorDisc.visible = false;
        this.rotor.add(this.rotorDisc);
      }
      this.tailRotor = g.tailRotor ? spinner(g.tailRotor) : null;
      // Navigation lights, the strobe and the beacon.
      const dot = (m, x, y, z, r) => {
        const s = new THREE.Mesh(LIGHT_GEO, m);
        s.position.set(x, y, z);
        s.scale.setScalar(r);
        this.body.add(s);
        return s;
      };
      this.navs = g.lights.map(([m, x, y, z, r]) => dot(M[m], x, y, z, r));
      this.strobe = g.strobe ? dot(M.white, g.strobe[0], g.strobe[1], g.strobe[2], 0.09) : null;
      this.beacon = g.beaconLow ? dot(M.red, g.beaconLow[0], g.beaconLow[1], g.beaconLow[2], 0.14) : null;
      if (g.burner) {
        this.burnerMesh = new THREE.Mesh(BURNER_GEO, M.burner);
        this.burnerMesh.position.set(g.burner[0], g.burner[1], g.burner[2]);
        this.burnerMesh.visible = false;
        this.body.add(this.burnerMesh);
      }
      this.wheels = [];
      this.anchors = {};
    }

    setNav(on, t) {
      // Cabin lights follow the city's lit windows (one shared material for every aircraft).
      const env = VH.game && VH.game.environment;
      const glow = env ? env.shared.uWindowGlow.value : 0;
      const M = mats();
      if (M._glow !== glow) {
        M._glow = glow;
        M.cabin.emissiveIntensity = glow * 2.4;
      }
      for (const n of this.navs) n.visible = on;
      if (this.strobe) this.strobe.visible = on && (t % 1.2) < 0.08;
      if (this.beacon) this.beacon.visible = on && (t % 1.0) < 0.5;
    }

    setHeadlights() {}
    setBrake() {}
    setReverse() {}
    setSiren() {
      return null;
    }

    setDamage(k) {
      this.paint.color.setScalar(1 - clamp(k, 0, 1) * 0.6);
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
  const LIGHT_GEO = new THREE.SphereGeometry(1, 8, 6);
  const BURNER_GEO = (() => {
    const g = new THREE.ConeGeometry(0.5, 2.6, 12, 1, true);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -1.3);
    return g;
  })();

  // ============================================================ the base
  class Aircraft extends VH.Vehicle {
    constructor(system, typeId, opts) {
      super(system, typeId, opts);
      const A = (this.air = this.spec.air);
      this.military = !!this.spec.military;
      this.q = new THREE.Quaternion();
      this.prevQ = new THREE.Quaternion();
      this.renderQ = new THREE.Quaternion();
      this.airCamera = true; // camera.js: the air camera
      this.flying = false;
      this.throttle = 0;
      this.burner = 0;
      this.ctl = { pitch: 0, roll: 0, yaw: 0, fwd: 0, side: 0, up: 0, boost: false };
      this.topSpeed = A.top || A.vmax;
      this.span = A.span;
      this.camDist = A.camDist;
      this.camLift = A.camLift;
      this.camUp = A.camUp;
      this.cockpit = A.cockpit;
      this.doorZ = A.doorZ;
      this.crosshair = !!A.weapons;
      this.voiceRange = 320;
      this.voiceRef = A.voiceRef || 30;
      this.altitude = 0;
      this._gunT = 0;
      this._rocketT = 0;
      this._gunSide = 0;
      this._altWas = false;
      this._navT = Math.random() * 2;
      this._overWater = false;
    }

    _buildModel(typeId, opts) {
      return new AircraftModel(typeId, opts, this.id);
    }

    place(x, z, heading, y) {
      super.place(x, z, heading, y);
      this.q.setFromEuler(_e.set(0, heading, 0, 'YXZ'));
      this.prevQ.copy(this.q);
      this.renderQ.copy(this.q);
      this.flying = false;
      this.throttle = 0;
      this._syncModel();
    }

    /** The surface under (x, z): roofs and the ground, or the bay's water. */
    _groundAt(x, z, y) {
      let gy = this.sys.physics.groundHeight(x, z, y + 0.6);
      this._overWater = x > SEAWALL && gy < WATER;
      if (this._overWater) gy = WATER;
      return gy;
    }

    fixedUpdate(dt) {
      this.prevPos.copy(this.pos);
      this.prevYaw = this.yaw;
      this.prevQ.copy(this.q);
      if (this.sleeping) return;
      if (this.wrecked) {
        this._wreckStep(dt);
      } else {
        const h = dt / 2;
        this._step(h);
        if (!this.wrecked) this._step(h);
        if (!this.wrecked) this._hitWorld();
      }
      this._derive();
      if (this.burning > 0) {
        this.burning += dt;
        if (this.burning > 7 && !this.wrecked) this.explode();
      }
      if (this.flying) this.airTime += dt;
      else this.airTime = 0;
      this.sirenTime += dt;
    }

    /** yaw/pitch/roll, speeds and altitude from the body. */
    _derive() {
      _e.setFromQuaternion(this.q, 'YXZ');
      this.yaw = _e.y;
      this.pitch = _e.x;
      this.roll = _e.z;
      this.grounded = !this.flying;
      _f.set(0, 0, 1).applyQuaternion(this.q);
      this.vF = this.vel.dot(_f);
      this.vL = 0;
      this.altitude = this.pos.y - this._groundAt(this.pos.x, this.pos.z, this.pos.y);
      this.rpm = this.driver ? 0.25 + this.throttle * 0.75 : Math.max(0, (this.rpm || 0) - 0.01);
    }

    /** Wrecked: fall, hit the ground, burn. */
    _wreckStep(dt) {
      const g = this._groundAt(this.pos.x, this.pos.z, this.pos.y);
      if (this.pos.y > g + 0.02 || this.vel.y > 0) {
        this.vel.y -= G * dt;
        this.pos.addScaledVector(this.vel, dt);
        _q.setFromAxisAngle(AZ, 0.6 * dt);
        this.q.multiply(_q);
        if (this.pos.y <= g) {
          this.pos.y = g;
          this.vel.set(0, 0, 0);
        }
      } else {
        this.vel.multiplyScalar(Math.exp(-3 * dt));
        this.pos.y = g;
      }
      this.flying = false;
    }

    /** Wings, rotor, nose and tail against buildings, poles and trees. */
    _hitWorld() {
      const ph = this.sys.physics;
      for (const p of this.air.probes) {
        _w.set(p[0], p[1], p[2]).applyQuaternion(this.q).add(this.pos);
        // The road and the kerbs aren't walls: a tail that dips onto the runway as the nose comes up is fine.
        if (!ph.overlaps(_w.x, _w.z, 0.22, _w.y - 0.22, _w.y + 0.22, VH.COLLIDE.SOLID, 0.35)) continue;
        const sp = this.vel.length();
        VH.events.emit('vehicle:impact', { v: this, other: null, speed: sp, slide: 0, x: _w.x, y: _w.y, z: _w.z, nx: 0, nz: 0 });
        if (sp > this.air.crashSpeed || (this.kind === 'heli' && sp > 11 && p[1] >= this.air.rotorY - 0.01)) {
          this.damage(5000, this.lastHitBy, 'crash');
          return;
        }
        this.damage(sp * sp * 1.3 + 40, null, 'crash');
        this.pos.copy(this.prevPos);
        this.vel.multiplyScalar(-0.25);
        return;
      }
    }

    damage(amount, source, kind) {
      super.damage(amount, source, kind);
    }

    explode() {
      if (this.wrecked) return;
      super.explode();
      this.vel.y = Math.max(this.vel.y, 2);
    }

    // ------------------------------------------------------------ visual
    updateVisual(dt, alpha) {
      this.renderPos.lerpVectors(this.prevPos, this.pos, alpha);
      this.renderQ.slerpQuaternions(this.prevQ, this.q, alpha);
      this._syncModel();
      const m = this.model;
      const running = !!this.driver && !this.wrecked;
      this._navT += dt;
      m.setNav(running || this.flying, this._navT);
      this._animate(dt, running);
    }

    _syncModel() {
      if (!this.renderQ) return; // during construction
      _e.setFromQuaternion(this.renderQ, 'YXZ');
      this.renderYaw = _e.y;
      const m = this.model;
      m.root.position.copy(this.renderPos);
      m.root.rotation.set(0, _e.y, 0);
      m.body.rotation.set(_e.x, 0, _e.z);
    }

    _animate() {}

    // ------------------------------------------------------------- sound
    createEngineVoice(audio) {
      if (this.air.voice === 'prop') return audio.createEngine({ kind: 'prop', player: this.driver === 'player' });
      if (this.air.voice === 'jet' && audio.createJet) return audio.createJet();
      return audio.createEngine({ kind: 'van' });
    }

    updateEngineVoice(vo, gain, pan) {
      const on = this.driver ? 1 : Math.min(1, this.vel.length() / 20);
      if (this.air.voice === 'prop') {
        vo.update({ rpm: (0.2 + this.throttle * 0.85) * on, throttle: this.throttle, load: this.throttle, gain: gain * on, pan });
      } else {
        vo.update({ gain: gain * (0.35 + 0.65 * on), pan, thrust: on * (0.2 + this.throttle * 0.8), burner: this.burner });
      }
    }

    // ----------------------------------------------------------------- HUD
    hudInfo() {
      const A = this.air;
      const alt = this.flying ? Math.max(0, Math.round(this.altitude)) : 0;
      return {
        kmh: this.vel.length() * 3.6,
        max: (A.burnerTop || A.top || A.vmax * (A.boost || 1)) * 3.6,
        gear: alt > 999 ? '999+' : '↑' + alt,
        bar: this.kind === 'heli' ? this.rotorRpm || 0 : this.throttle,
        barLabel: this.kind === 'heli' ? 'ROTOR' : this.burner ? 'AFTERBURNER' : 'THROTTLE',
      };
    }

    // ------------------------------------------------------------- weapons
    /** Guns where the view points (the middle of the crosshair); rockets with the right mouse button. */
    fireWeapon(combat, inp, firing, pressed, dt) {
      const W = this.air.weapons;
      if (!W) return;
      this._gunT -= dt;
      this._rocketT -= dt;
      if (firing && this._gunT <= 0) {
        this._gunT = 1 / W.gunRate;
        this._fireGun(combat, W);
      }
      const alt = inp.down('aim');
      if (alt && !this._altWas && this._rocketT <= 0) {
        this._rocketT = W.rocketCool;
        this._fireRocket(combat, W);
      }
      this._altWas = alt;
    }

    _aimPoint(combat, range) {
      const ray = combat._aimRay(0);
      const d = _d.copy(ray.d);
      const o = ray.o;
      // Start past the aircraft so the guns don't hit it.
      const t0 = Math.max(0, _v.subVectors(this.pos, o).dot(d) + this.hz);
      const hit = combat.trace(o.x + d.x * t0, o.y + d.y * t0, o.z + d.z * t0, d.x, d.y, d.z, range, null, this);
      const t = t0 + hit.t;
      return { hit, d, x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t };
    }

    _mount(list, out) {
      const p = list[this._gunSide++ % list.length];
      return out.set(p[0], p[1], p[2]).applyQuaternion(this.q).add(this.pos);
    }

    _fireGun(combat, W) {
      const g = this.sys.game;
      const aim = this._aimPoint(combat, W.gunRange);
      const m = this._mount(W.guns, _w);
      g.fx.tracer(m.x, m.y, m.z, aim.x, aim.y, aim.z);
      g.fx.muzzle(m.x, m.y, m.z, false);
      const hit = aim.hit;
      if (hit.type === 'agent') {
        const a = hit.agent;
        a.damage(W.gunDamage, 'player', 'bullet', { x: aim.x, y: aim.y, z: aim.z, dx: aim.d.x, dy: aim.d.y, dz: aim.d.z, head: hit.head });
        if (a.brain && a.brain.setAlert) a.brain.setAlert(a);
        g.fx.impact(aim.x, aim.y, aim.z, -aim.d.x, -aim.d.y, -aim.d.z, 'flesh');
        combat._hit(a.dead ? 'kill' : hit.head ? 'head' : 'hit', hit.head);
      } else if (hit.type === 'car') {
        hit.v.damage(W.gunDamage * 0.6, 'player', 'bullet');
        hit.v.wake();
        g.fx.impact(aim.x, aim.y, aim.z, -aim.d.x, 0, -aim.d.z, 'car');
        if (hit.v.driver === 'ai' && hit.v.controller && hit.v.controller.onBump) hit.v.controller.onBump(hit.v, { driver: 'player' }, 6);
        combat._hit('hit');
      } else if (hit.type === 'world') {
        g.fx.impact(aim.x, aim.y, aim.z, hit.hit.nx, hit.hit.ny, hit.hit.nz, 'concrete');
      }
      if (g.audio.gunshot) g.audio.gunshot('autocannon', 0, 0.9, 0, { noMech: true, pitch: W.gunSound === 'smg' ? 1.12 : 1 });
      g.cameraRig.addShake(0.05);
      VH.events.emit('gunshot', { x: this.pos.x, z: this.pos.z, byPlayer: true, loud: true });
    }

    _fireRocket(combat, W) {
      const g = this.sys.game;
      const aim = this._aimPoint(combat, 600);
      const m = this._mount(W.rockets, new THREE.Vector3());
      const dir = new THREE.Vector3(aim.x - m.x, aim.y - m.y, aim.z - m.z).normalize();
      combat.thrown.push(new Rocket(g, this, m, dir, W.rocketSpeed + Math.max(0, this.vF), W.rocketBlast, W.rocketDamage));
      g.fx.muzzle(m.x, m.y, m.z, true);
      if (g.audio.rocketLaunch) g.audio.rocketLaunch(0, 0.8);
      g.cameraRig.addShake(0.12);
      VH.events.emit('gunshot', { x: this.pos.x, z: this.pos.z, byPlayer: true, loud: true });
    }
  }

  // ================================================================ plane
  class Plane extends Aircraft {
    constructor(system, typeId, opts) {
      super(system, typeId, opts);
      this.groundPitch = 0;
      this.brake = 1;
      this.gearDown = true;
      this._gearK = 1;
    }

    /**
     * The mouse steers: the plane turns to fly where the view looks (roll
     * into the turn, pull the nose round, level the wings when on target).
     * Keys override it, and while they do the view follows the nose so
     * letting go holds the new heading. On the ground: A/D steer, the view
     * swings back behind after a moment.
     */
    playerControls(inp, dt, game) {
      flightHint(game, this.kind);
      const pad = inp.pad && inp.pad.connected ? inp.pad : null;
      const cam = game.cameraRig;
      const up = inp.down('moveForward') ? 1 : 0;
      const down = inp.down('moveBack') ? 1 : 0;
      this.throttle = clamp(this.throttle + (up * 0.55 - down * 0.8) * dt + (pad ? (pad.rt - pad.lt) * 0.7 * dt : 0), 0, 1);
      this.burner = this.air.burner && inp.down('sprint') && this.throttle > 0.6 ? 1 : 0;
      let roll = (inp.down('moveRight') ? 1 : 0) - (inp.down('moveLeft') ? 1 : 0);
      let pitch = (inp.down('jump') ? 1 : 0) - (inp.down('crouch') ? 1 : 0);
      if (pad && Math.abs(pad.move.x) > 0.12) roll = pad.move.x;
      if (pad && Math.abs(pad.move.y) > 0.12) pitch = -pad.move.y;
      if (game.frozenControls) {
        roll = 0;
        pitch = 0;
      }
      const c = this.ctl;
      if (!this.flying) {
        // S brakes once the throttle is closed; Space only ever lifts the nose.
        this.brake = down && this.throttle < 0.02 ? 1 : 0;
        c.yaw = roll;
        c.roll = 0;
        c.pitch = Math.max(0, pitch);
        // Flat out and fast enough: she lifts off on her own (Space just makes it sooner).
        if (this.throttle > 0.7 && this.vF > this.air.stall * 0.85) c.pitch = Math.max(c.pitch, 0.6);
        // Taking off by the view: look up while fast enough and the nose comes up.
        if (pitch === 0 && cam.pitch > 0.12 && this.vF > this.air.stall * 0.8) c.pitch = 1;
        if (cam._lookIdle > 1.2) {
          cam.yaw = dampAngle(cam.yaw, this.yaw, 2.5, dt);
          cam.pitch = damp(cam.pitch, -0.1, 2.5, dt);
        }
        return;
      }
      this.brake = 0;
      const f = _f.set(0, 0, 1).applyQuaternion(this.q);
      if (roll !== 0 || pitch !== 0) {
        c.roll = roll * 0.75;
        c.pitch = pitch * 0.6;
        c.yaw = 0;
        if (cam._lookIdle > 0.3) {
          cam.yaw = dampAngle(cam.yaw, Math.atan2(f.x, f.z), 7, dt);
          cam.pitch = damp(cam.pitch, Math.asin(clamp(f.y, -1, 1)), 7, dt);
        }
        return;
      }
      this._instruct(cam, c);
    }

    _instruct(cam, c) {
      const cp = Math.cos(cam.pitch);
      _d.set(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp);
      _q.copy(this.q).invert();
      _d.applyQuaternion(_q); // into the plane's frame: +x left, +y up, +z ahead
      const off = Math.acos(clamp(_d.z, -1, 1));
      const l = _l.set(1, 0, 0).applyQuaternion(this.q);
      const u = _u.set(0, 1, 0).applyQuaternion(this.q);
      // Bank to turn: lean toward the target (never past ~70 degrees), pull
      // the nose round, and level the wings once it's dead ahead. The bank is
      // measured from the horizon, so upside down rolls back upright.
      const bank = Math.atan2(l.y, u.y); // + = right wing down
      let want = clamp(-_d.x * 3.5, -1, 1) * 1.2;
      if (_d.z < 0) want = (_d.x <= 0 ? 1 : -1) * 1.2; // behind: hard round
      want *= smoothstep(0.03, 0.25, off);
      c.roll = clamp((want - bank) * 2.2, -1, 1);
      c.pitch = clamp(_d.y * 4.5, -1, 1);
      if (_d.z < 0) c.pitch = Math.max(c.pitch, 0.7);
      c.yaw = clamp(-_d.x * 2, -1, 1);
    }

    _step(h) {
      const A = this.air;
      if (!this.driver) {
        this.throttle = Math.max(0, this.throttle - h * 0.2);
        this.burner = 0;
        this.ctl.pitch = this.ctl.roll = this.ctl.yaw = 0;
        this.brake = this.flying ? 0 : 1;
      }
      const f = _f.set(0, 0, 1).applyQuaternion(this.q);
      const thrust = this.throttle * A.thrust * (this.burner ? A.burner || 1 : 1);
      const speedF = this.vel.dot(f);
      const ground = this._groundAt(this.pos.x, this.pos.z, this.pos.y);
      if (!this.flying) this._roll(h, thrust, speedF, ground);
      else this._fly(h, thrust, speedF, ground);
      this._gearK = moveTowards(this._gearK, this.gearDown ? 1 : 0, h * 0.8);
    }

    /** On the wheels: taxi, steer, take off. */
    _roll(h, thrust, speedF, ground) {
      const A = this.air;
      // Rolling speed along the ground (not along a nose that's lifting).
      const sp = Math.max(0, speedF) > 0 ? Math.hypot(this.vel.x, this.vel.z) : 0;
      if (this._overWater) {
        this.explode();
        return;
      }
      // Nosewheel steering: sharp when slow, gentle at speed, none standing still.
      const moving = smoothstep(0, 1.5, sp + (this.throttle > 0.05 ? 1 : 0));
      const turn = this.ctl.yaw * A.taxiTurn * clamp(1.25 - sp / (A.stall * 1.2), 0.2, 1) * moving;
      _e.setFromQuaternion(this.q, 'YXZ');
      const yaw = _e.y - turn * h;
      if (this.ctl.pitch > 0 && sp > A.stall * 0.72) this.groundPitch = Math.min(A.rotateMax || 0.24, this.groundPitch + this.ctl.pitch * A.pitchRate * 0.45 * h);
      else this.groundPitch = Math.max(0, this.groundPitch - 0.5 * h);
      let a = thrust - A.rollRes - (A.thrust / (A.top * A.top)) * sp * sp;
      if (this.brake) a -= A.brakeDecel;
      let ns = sp + a * h;
      if (ns < 0) ns = 0;
      this.q.setFromEuler(_e.set(-this.groundPitch, yaw, 0, 'YXZ'));
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      this.vel.set(fx * ns, 0, fz * ns);
      this.pos.x += this.vel.x * h;
      this.pos.z += this.vel.z * h;
      if (ns > A.stall && this.groundPitch > 0.05) {
        // Off we go.
        this.flying = true;
        this.vel.y = ns * Math.sin(this.groundPitch);
        this.pos.y = ground + 0.05;
        if (!A.fixedGear) this.gearDown = false;
        if (this.driver === 'player') {
          const cam = this.sys.game.cameraRig;
          cam.yaw = yaw;
          cam.pitch = Math.max(cam.pitch, 0.16);
        }
        VH.events.emit('aircraft:takeoff', { v: this });
        return;
      }
      if (this.pos.y > ground + 0.4) {
        // Rolled off a roof or a ledge.
        this.flying = true;
        return;
      }
      this.pos.y = ground;
      this.sys.collideStatic(this);
    }

    /** In the air. */
    /**
     * Flying help for Jay: climb only as steeply as the speed allows (so
     * holding Space never stalls the plane), no vertical dives, pull up when
     * plunging at the ground, and wings no further over than about 70°.
     */
    _assist(speedF, ground) {
      const A = this.air;
      const c = this.ctl;
      const f = _f.set(0, 0, 1).applyQuaternion(this.q);
      const nose = Math.asin(clamp(f.y, -1, 1));
      const margin = clamp((speedF - A.stall) / (A.stall * 0.5), 0, 1);
      const maxClimb = lerp(0.05, 0.42, margin);
      if (nose > maxClimb && c.pitch > 0) c.pitch = 0;
      if (nose > maxClimb + 0.08) c.pitch = Math.min(c.pitch, -0.5);
      if (nose < -0.7 && c.pitch < 0) c.pitch = 0;
      if (this.pos.y - ground < 30 && this.vel.y < -7) c.pitch = Math.max(c.pitch, 0.8);
      const l = _l.set(1, 0, 0).applyQuaternion(this.q);
      const u = _u.set(0, 1, 0).applyQuaternion(this.q);
      const bank = Math.atan2(l.y, u.y); // + = right wing down
      if (bank > 1.2 && c.roll > 0) c.roll = 0;
      if (bank < -1.2 && c.roll < 0) c.roll = 0;
      if (Math.abs(bank) > 1.4) c.roll = -Math.sign(bank) * 0.6;
    }

    _fly(h, thrust, speedF, ground) {
      const A = this.air;
      const q = this.q;
      const auth = smoothstep(A.stall * 0.45, A.stall * 0.95, speedF);
      const ca = 0.3 + 0.7 * auth;
      const c = this.ctl;
      if (this.driver === 'player') this._assist(speedF, ground);
      q.multiply(_q.setFromAxisAngle(AX, -c.pitch * A.pitchRate * ca * h));
      q.multiply(_q.setFromAxisAngle(AZ, c.roll * A.rollRate * ca * h));
      q.multiply(_q.setFromAxisAngle(AY, -c.yaw * A.yawRate * ca * h));
      // Banked: the lift swings the plane round (a coordinated turn).
      let l = _l.set(1, 0, 0).applyQuaternion(q);
      const bank = clamp(l.y, -0.94, 0.94);
      const vh = Math.max(14, Math.hypot(this.vel.x, this.vel.z));
      const turn = clamp((-A.turnK * G * bank) / Math.sqrt(1 - bank * bank) / vh, -1.4, 1.4) * auth;
      q.premultiply(_q.setFromAxisAngle(AY, turn * h));
      // Too slow: the nose drops.
      let f = _f.set(0, 0, 1).applyQuaternion(q);
      if (speedF < A.stall * 0.85 && f.y > -0.7) q.multiply(_q.setFromAxisAngle(AX, 0.9 * (1 - speedF / (A.stall * 0.85)) * h));
      q.normalize();
      f = _f.set(0, 0, 1).applyQuaternion(q);
      const u = _u.set(0, 1, 0).applyQuaternion(q);
      // Thrust, drag, gravity and lift.
      const vel = this.vel;
      const sp = vel.length();
      const top = this.burner ? A.burnerTop || A.top : A.top;
      vel.addScaledVector(f, thrust * h);
      vel.addScaledVector(vel, -(A.thrust * (this.burner ? A.burner || 1 : 1) / (top * top)) * sp * h);
      vel.y -= G * h;
      const lift = G * Math.min(1, Math.pow(Math.max(0, speedF) / A.stall, 2)) * lerp(u.y, 1, 0.6);
      if (lift > 0) vel.y += lift * h;
      // The airflow turns the flight path toward the nose.
      const s2 = vel.length();
      if (s2 > 0.1) {
        const k = 1 - Math.exp(-A.align * auth * h);
        _d.copy(vel).divideScalar(s2).lerp(f, k).normalize();
        vel.copy(_d).multiplyScalar(s2 * (1 - 0.015 * k));
      }
      this.pos.addScaledVector(vel, h);
      // Gear down near the ground (and when slow), up once climbing out.
      if (!A.fixedGear) {
        const alt = this.pos.y - ground;
        if (alt < 25 && speedF < A.stall * 1.6) this.gearDown = true;
        else if (alt > 40) this.gearDown = false;
      }
      if (this.pos.y <= ground) this._touchdown(ground, f, u);
    }

    _touchdown(ground, f) {
      const A = this.air;
      const vs = -this.vel.y;
      const l = _l.set(1, 0, 0).applyQuaternion(this.q);
      const bank = Math.abs(Math.asin(clamp(l.y, -1, 1)));
      this.pos.y = ground;
      if (this._overWater) {
        this.explode();
        return;
      }
      const hard = vs > A.crashVs || bank > 0.42 || f.y < -0.16 || (!this.gearDown && this._gearK < 0.5);
      VH.events.emit('vehicle:land', { v: this, impact: vs, airTime: this.airTime });
      if (hard) {
        this.damage(Math.max(0, vs - 3) * 110 + bank * 900 + (f.y < -0.16 ? 700 : 0) + (this.gearDown ? 0 : 500), null, 'landing');
        if (this.wrecked) return;
      }
      this.flying = false;
      this.vel.y = 0;
      this.groundPitch = clamp(f.y, 0, 0.2);
      _e.setFromQuaternion(this.q, 'YXZ');
      this.q.setFromEuler(_e.set(-this.groundPitch, _e.y, 0, 'YXZ'));
    }

    _animate(dt, running) {
      const m = this.model;
      if (m.prop) {
        const spin = running ? 0.25 + this.throttle * 0.75 : Math.max(0, (this._propSpin || 0) - dt * 0.4);
        this._propSpin = spin;
        m.prop.rotation.z += spin * 60 * dt;
        if (m.propDisc) m.propDisc.visible = spin > 0.3;
        m.prop.children[0].visible = spin < 0.6;
      }
      if (m.gear) {
        m.gear.visible = this._gearK > 0.05;
        m.gear.scale.y = Math.max(0.05, this._gearK);
        m.gear.position.y = (1 - this._gearK) * 0.9;
      }
      if (m.burnerMesh) {
        m.burnerMesh.visible = this.burner > 0 && running;
        if (m.burnerMesh.visible) m.burnerMesh.scale.z = 0.8 + Math.random() * 0.4;
      }
    }
  }

  // The first time Jay takes the controls of each kind: how to fly it.
  const HINTS = {
    plane: 'Hold W to speed up; she lifts off by herself at full speed (Space lifts the nose sooner). A/D roll, Space/Ctrl nose up and down, or just look where you want to go. Line up with a runway first!',
    heli: 'Space to climb, Ctrl to come down. W/S fly forward and back, A/D or the mouse turn.',
  };
  const hinted = {};
  function flightHint(game, kind) {
    if (hinted[kind] || !HINTS[kind] || !game.hud) return;
    hinted[kind] = true;
    game.hud.notify({ title: kind === 'heli' ? 'Flying a helicopter' : 'Flying a plane', text: HINTS[kind], icon: '✈', duration: 9000 });
  }

  // ========================================================== helicopter
  class Heli extends Aircraft {
    constructor(system, typeId, opts) {
      super(system, typeId, opts);
      this.rotorRpm = 0;
      this.hYaw = 0;
      this._tPitch = 0;
      this._tRoll = 0;
    }

    place(x, z, heading, y) {
      super.place(x, z, heading, y);
      this.hYaw = heading;
      this.rotorRpm = 0;
    }

    /** Drone-style: it turns to face the view; A/D swing the view (and so the helicopter). */
    playerControls(inp, dt, game) {
      flightHint(game, this.kind);
      const pad = inp.pad && inp.pad.connected ? inp.pad : null;
      const cam = game.cameraRig;
      const c = this.ctl;
      c.fwd = (inp.down('moveForward') ? 1 : 0) - (inp.down('moveBack') ? 1 : 0);
      c.side = 0;
      c.up = (inp.down('jump') ? 1 : 0) - (inp.down('crouch') ? 1 : 0);
      c.boost = inp.down('sprint');
      const turn = (inp.down('moveLeft') ? 1 : 0) - (inp.down('moveRight') ? 1 : 0);
      if (pad) {
        if (Math.abs(pad.move.y) > 0.12) c.fwd = -pad.move.y;
        if (Math.abs(pad.move.x) > 0.12) c.side = pad.move.x;
        if (pad.rt > 0.05 || pad.lt > 0.05) c.up = pad.rt - pad.lt;
      }
      if (game.frozenControls) {
        c.fwd = c.side = c.up = 0;
        return;
      }
      if (turn) cam.yaw = wrapAngle(cam.yaw + turn * 1.5 * dt);
      this._camYaw = cam.yaw;
    }

    _step(h) {
      const A = this.air;
      const powered = !!this.driver && !this.wrecked;
      this.rotorRpm = moveTowards(this.rotorRpm, powered ? 1 : 0, h / (powered ? A.spool : A.spool * 2));
      const lift = smoothstep(0.55, 0.95, this.rotorRpm);
      if (!this.driver) this.ctl.fwd = this.ctl.side = this.ctl.up = 0;
      const ground = this._groundAt(this.pos.x, this.pos.z, this.pos.y);
      const onGround = this.pos.y <= ground + 0.03;
      if (this.driver === 'player' && lift > 0.5 && this._camYaw !== undefined) {
        const d = VH.math.angleDelta(this.hYaw, this._camYaw);
        this.hYaw = wrapAngle(this.hYaw + clamp(d * A.yawFollow * h, -1.6 * h, 1.6 * h));
      }
      const a = this.hYaw;
      const fx = Math.sin(a);
      const fz = Math.cos(a);
      const vel = this.vel;
      let accF = 0;
      let accS = 0;
      if (onGround && lift < 0.85) {
        vel.x *= Math.exp(-5 * h);
        vel.z *= Math.exp(-5 * h);
      } else {
        const vmax = A.vmax * (this.ctl.boost ? A.boost : 1);
        const tF = this.ctl.fwd * vmax * lift;
        const tS = this.ctl.side * vmax * 0.6 * lift;
        // Right of heading a is (-cos a, sin a).
        const tvx = fx * tF - fz * tS;
        const tvz = fz * tF + fx * tS;
        const ax = clamp((tvx - vel.x) * A.resp, -A.acc, A.acc);
        const az = clamp((tvz - vel.z) * A.resp, -A.acc, A.acc);
        vel.x += ax * h;
        vel.z += az * h;
        accF = ax * fx + az * fz;
        accS = -ax * fz + az * fx;
      }
      let ay = -G;
      // Coming down: slower and slower near the ground, so holding "down" lands it.
      let tvy = this.ctl.up * A.climb;
      if (tvy < 0) tvy = Math.max(tvy, -(1.2 + Math.max(0, this.pos.y - ground) * 0.6));
      if (lift > 0) ay += lift * (G + clamp((tvy - vel.y) * 2.2, -A.climbAcc, A.climbAcc));
      if (onGround && ay < 0) {
        vel.y = 0;
        ay = 0;
      }
      vel.y += ay * h;
      this.pos.addScaledVector(vel, h);
      if (this.pos.y < ground) {
        const vs = -vel.y;
        this.pos.y = ground;
        if (this._overWater) {
          this.explode();
          return;
        }
        if (vs > A.crashVs) {
          this.damage((vs - A.crashVs * 0.6) * 170, null, 'landing');
          if (this.wrecked) return;
        }
        if (vs > 1) VH.events.emit('vehicle:land', { v: this, impact: vs, airTime: this.airTime });
        vel.y = 0;
      }
      this.flying = this.pos.y > ground + 0.3;
      if (!this.flying) this.sys.collideStatic(this);
      // Lean into the motion: nose down going forward, a wing down sliding sideways.
      const vf = vel.x * fx + vel.z * fz;
      const vs2 = -vel.x * fz + vel.z * fx;
      const vmax = A.vmax;
      this._tPitch = damp(this._tPitch, this.flying ? clamp(vf / vmax * 0.26 + accF * 0.025, -0.38, 0.38) : 0, 4, h);
      this._tRoll = damp(this._tRoll, this.flying ? clamp(vs2 / vmax * 0.3 + accS * 0.025, -0.4, 0.4) : 0, 4, h);
      this.q.setFromEuler(_e.set(this._tPitch, a, this._tRoll, 'YXZ'));
      this.throttle = clamp(0.35 + this.ctl.up * 0.4 + Math.abs(this.ctl.fwd) * 0.25, 0, 1) * this.rotorRpm;
    }

    _animate(dt) {
      const m = this.model;
      const r = this.rotorRpm;
      if (m.rotor) {
        m.rotor.rotation.y += r * 28 * dt;
        if (m.rotorDisc) m.rotorDisc.visible = r > 0.45;
        m.rotor.children[0].visible = r < 0.75;
      }
      if (m.tailRotor) m.tailRotor.rotation.x += r * 55 * dt;
    }

    createEngineVoice(audio) {
      return audio.createHelicopter();
    }

    updateEngineVoice(vo, gain, pan) {
      const r = this.rotorRpm;
      vo.update({ gain: gain * smoothstep(0.02, 0.4, r), pan, rate: 0.35 + r * 0.75 });
    }
  }

  // ============================================================== rockets
  /** A rocket or missile: flies straight, a smoke trail behind it, blows up on whatever it meets. */
  class Rocket {
    constructor(game, owner, pos, dir, speed, blast, damage) {
      this.game = game;
      this.owner = owner;
      this.p = pos.clone();
      this.d = dir.clone();
      this.speed = speed;
      this.blast = blast;
      this.damage = damage;
      this.t = 0;
      this.done = false;
    }

    update(dt) {
      if (this.done) return;
      const g = this.game;
      this.t += dt;
      const step = this.speed * dt;
      const p = this.p;
      const d = this.d;
      const hit = g.combat.trace(p.x, p.y, p.z, d.x, d.y, d.z, step, null, this.owner);
      if (hit.type !== 'none' && hit.t <= step) {
        this._explode(p.x + d.x * hit.t, p.y + d.y * hit.t, p.z + d.z * hit.t);
        return;
      }
      const x0 = p.x;
      const y0 = p.y;
      const z0 = p.z;
      p.addScaledVector(d, step);
      if (p.x > SEAWALL && p.y < WATER) {
        this._explode(p.x, WATER, p.z);
        return;
      }
      g.fx.tracer(x0, y0, z0, p.x, p.y, p.z);
      if (g.fx.engineSmoke) g.fx.engineSmoke(x0, y0, z0, 0.5, 0, 0);
      if (this.t > 5) this._explode(p.x, p.y, p.z);
    }

    _explode(x, y, z) {
      this.done = true;
      const g = this.game;
      g.vehicleFeedback.explosion(x, y, z, this.blast / 8, this.owner);
      g.combat.blastDamage(x, y, z, this.blast, this.damage, 'player');
    }

    _remove() {
      this.done = true;
    }
  }

  // ============================================================ register
  for (const id of Object.keys(SPECS)) {
    const s = SPECS[id];
    VH.CarModels.TYPES[id] = Object.assign({ id, siren: null, accel: 0.5, grip: 0.5, wheelRadius: 0.35 }, s, {
      wheelbase: s.length * 0.5,
      trackWidth: s.width * 0.9,
      topSpeed: s.air.top || s.air.vmax,
    });
  }
  VH.VehicleKinds = Object.assign(VH.VehicleKinds || {}, { plane: Plane, heli: Heli });
  VH.Aircraft = Aircraft;
  VH.Rocket = Rocket;
  VH.AircraftKit = Kit; // tank.js builds its model with it
  /** A bare aircraft model for scenery (no physics): { root, body, prop, rotor, ... }. */
  VH.AircraftModels = {
    build(type, color) {
      return new AircraftModel(type, { color }, 1);
    },
    spec(type) {
      return SPECS[type];
    },
  };
})();
