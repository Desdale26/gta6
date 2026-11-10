/*
 * vehicles/airsidecars.js — the airside vehicles Jay can drive at Vicehaven
 * International:
 *
 *   bagtug     the baggage tug (its carts are left where it stood)
 *   caterer    the catering truck, its box down on the scissor lift
 *   followme   the follow-me car: a yellow Mesa with the chequered board
 *   firetruck  the airport fire service's crash tender: a light bar and a
 *              siren (L, as in a patrol car), a water monitor on the roof
 *              that Jay plays where he's looking while he holds fire (it
 *              puts fires out and bowls people over: havoc-air.js reads
 *              v.jet, the arc of water this frame)
 *
 * The ones out on the apron are airside.js's scenery (no physics). When Jay
 * walks up to one, havoc-air.js puts one of these in its place, at its pose,
 * and puts the scenery one back if he walks off again. The fire engines are
 * these from the start (havoc-air.js drives them out to fires along a path,
 * with no physics, until Jay takes one: then it's an ordinary vehicle).
 *
 * Each is a Vehicle that drives like a van (its kind is 'car' once built)
 * with its own model, built from airside.js's ground-vehicle shapes
 * (VH.Airside.gseGeometry), except the follow-me, which is a Mesa. Their
 * entry profiles (how Jay climbs in) are in vehicles/entry.js.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp } = VH.math;
  const HALF = Math.PI / 2;

  // The specs (as carmodels.js's TYPES). top: the real top speed (Vehicle clamps its own to 28+).
  const SPECS = {
    bagtug: {
      name: 'Baggage Tug', make: 'Hask', cls: 'compact', length: 2.6, width: 1.44, height: 2.05, mass: 1600, topSpeed: 28, top: 13,
      accel: 0.3, grip: 0.55, seats: 1, wheelbase: 1.7, trackWidth: 1.24, wheelRadius: 0.34, palette: [0xeceae4],
    },
    caterer: {
      name: 'Catering Truck', make: 'Hask', cls: 'van', length: 7.4, width: 2.4, height: 3.45, mass: 7200, topSpeed: 28, top: 22,
      accel: 0.18, grip: 0.4, seats: 2, wheelbase: 4.8, trackWidth: 1.84, wheelRadius: 0.48, palette: [0xeceae4],
    },
    followme: {
      name: 'Follow-Me Car', make: 'Dunmore', cls: 'pickup', length: 0, width: 0, height: 0, mass: 2150, topSpeed: 50,
      accel: 0.45, grip: 0.5, seats: 2, wheelbase: 0, trackWidth: 0, wheelRadius: 0, palette: [0xf2c61f], base: 'mesa',
    },
    firetruck: {
      name: 'Crash Tender', make: 'Hask', cls: 'van', length: 9.4, width: 2.6, height: 3.4, mass: 12000, topSpeed: 28, top: 27,
      accel: 0.3, grip: 0.42, seats: 2, wheelbase: 5.6, trackWidth: 2.1, wheelRadius: 0.55, palette: [0xc8202a], siren: 'fire',
    },
  };

  // ------------------------------------------------------------ materials
  let M = null;
  function mats() {
    if (M) return M;
    const hdr = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
    M = {
      headOn: hdr(5, 4.8, 4.2),
      headOff: new THREE.MeshStandardMaterial({ color: 0xd8dcdf, roughness: 0.2, metalness: 0.5 }),
      tailOn: hdr(5, 0.15, 0.08),
      tailRun: hdr(1.4, 0.04, 0.02),
      tailOff: new THREE.MeshStandardMaterial({ color: 0x5a0d0b, roughness: 0.3 }),
      redOn: hdr(7, 0.3, 0.15),
      blueOn: hdr(0.3, 0.6, 8),
      amberOn: hdr(6, 2.7, 0.35),
      lampOff: new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.3, metalness: 0.3 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.1, metalness: 0.5 }),
      tyre: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 }),
    };
    return M;
  }

  const TYRES = new Map();
  /** A wheel (tyre and hub) on its axle along X, cached per size. */
  function wheelGeo(r, w) {
    const key = r + '|' + w;
    if (TYRES.has(key)) return TYRES.get(key);
    const k = new VH.AircraftKit();
    k.tyre(r, w, 0, 0, 0, 0x161616, 16);
    k.cyl(r * 0.5, r * 0.5, w + 0.02, 12, 0, 0, 0, 0xb4b9bf, 0, HALF);
    const g = k.geometry();
    TYRES.set(key, g);
    return g;
  }

  const GEO = {};
  /** The crash tender: red, a yellow band, roller shutters, the cab forward, the monitor on the roof. */
  function fireGeo() {
    if (GEO.fire) return GEO.fire;
    const k = new VH.AircraftKit();
    const RED = 0xc8202a;
    const DARK = 0x2a2d31;
    const GREY = 0x8a9097;
    k.box(2.5, 0.5, 9.1, 0, 0.78, 0, DARK); //                        chassis
    k.box(2.5, 2.0, 2.2, 0, 1.95, 3.45, RED); //                      cab
    k.box(2.52, 0.22, 2.24, 0, 2.98, 3.45, 0xf1f2ef); //             white cab roof
    k.box(2.55, 2.25, 6.6, 0, 2.03, -1.1, RED); //                    body
    k.box(2.62, 0.2, 9.05, 0, 1.32, 0.05, 0xf2c61f); //              the yellow band
    k.box(2.6, 0.06, 6.62, 0, 2.6, -1.1, 0xf1f2ef); //               a thin white line
    for (const s of [1, -1]) {
      for (const z of [1.25, -0.35, -1.95, -3.55]) k.box(0.04, 1.45, 1.42, s * 1.29, 2.0, z, GREY); // roller shutters
      k.box(0.06, 0.08, 6.4, s * 1.3, 3.0, -1.1, 0xb4b9bf); //       grab rails
    }
    k.box(2.56, 0.08, 6.5, 0, 3.17, -1.1, GREY); //                  roof deck
    k.box(0.55, 0.12, 4.6, -0.75, 3.27, -1.4, 0xb4b9bf); //          a ladder
    k.box(2.3, 0.25, 0.35, 0, 0.78, 4.62, DARK); //                  front bumper
    k.box(2.2, 0.55, 0.06, 0, 1.25, 4.56, 0x1b1d21); //              grille
    k.box(2.3, 0.18, 0.3, 0, 3.08, 3.7, DARK); //                    light-bar base
    k.cyl(0.36, 0.42, 0.3, 14, 0, 3.32, 1.35, GREY, -HALF); //       the monitor's turret
    k.cyl(0.08, 0.12, 1.5, 10, 0, 3.62, 2.0, 0xb4b9bf, -0.32); //     its nozzle, aimed up ahead
    k.box(2.0, 0.35, 0.05, 0, 0.98, -4.42, DARK); //                 rear step
    GEO.fire = k.geometry();
    return GEO.fire;
  }

  // --------------------------------------------------------------- model
  /**
   * A model built from kit shapes, with what a Vehicle asks of its model: root and body,
   * wheels that steer and spin, lamps, a light bar or beacon, damage, shadows.
   */
  class KitCarModel {
    constructor(type, spec) {
      this.id = type;
      this.spec = spec;
      this.color = spec.palette[0];
      this.livery = true; // (no respray: the colours are the job's)
      this.root = new THREE.Group();
      this.root.name = 'car-' + type;
      this.body = new THREE.Group();
      this.root.add(this.body);
      this.meshes = [];
      this.wheels = [];
      this.paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 });
      this.anchors = { driverSeat: new THREE.Vector3(0.45, 1.3, 0), headlights: [], taillights: [], exhaust: [], siren: null };
      this.state = { head: false, brake: false, damage: 0 };
      this.bar = null; //    [red mesh, blue mesh] (the fire engine)
      this.beacon = null; // an amber flasher (the tug, the catering truck)
      this.paintMesh = null;
    }

    mesh(geo, mat, parent) {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      (parent || this.body).add(m);
      this.meshes.push(m);
      return m;
    }

    /** A pair (or more) of lamps as one mesh: boxes of size (w, h) at [x, y, z]. */
    lamps(list, w, h, mat) {
      const k = new VH.AircraftKit();
      for (const [x, y, z] of list) k.box(w, h, 0.06, x, y, z, 0xffffff);
      const m = this.mesh(k.geometry(), mat);
      m.castShadow = false;
      return m;
    }

    wheel(r, w, x, z, front) {
      const pivot = new THREE.Group();
      pivot.position.set(x, r, z);
      const spin = new THREE.Object3D();
      pivot.add(spin);
      const m = new THREE.Mesh(wheelGeo(r, w), mats().tyre);
      m.castShadow = true;
      spin.add(m);
      this.meshes.push(m);
      this.root.add(pivot);
      this.wheels.push({ pivot, spin, mesh: m, x, z, radius: r, width: w, front });
    }

    setHeadlights(on) {
      on = !!on;
      if (on === this.state.head) return;
      this.state.head = on;
      if (this.head) this.head.material = on ? mats().headOn : mats().headOff;
      this._tail();
    }

    setBrake(on) {
      on = !!on;
      if (on === this.state.brake) return;
      this.state.brake = on;
      this._tail();
    }

    _tail() {
      if (this.tail) this.tail.material = this.state.brake ? mats().tailOn : this.state.head ? mats().tailRun : mats().tailOff;
    }

    setReverse() {}

    /** The light bar (t: seconds the siren's been on, or null), alternating red and blue. */
    setSiren(t) {
      if (!this.bar) return null;
      const on = t !== null && t !== undefined && isFinite(t);
      const cyc = on ? (((t * 1.6) % 1) + 1) % 1 : 0;
      const k = (cyc % 0.5) * 2 * 3;
      const flash = on && k - Math.floor(k) < 0.55;
      const red = flash && cyc < 0.5;
      const blue = flash && cyc >= 0.5;
      this.bar[0].material = red ? mats().redOn : mats().lampOff;
      this.bar[1].material = blue ? mats().blueOn : mats().lampOff;
      return { red: red ? 1 : 0, blue: blue ? 1 : 0 };
    }

    /** The amber beacon: flashing while it's working (t: a clock, or null for off). */
    setBeacon(t) {
      if (!this.beacon) return;
      const on = t !== null && t !== undefined && (t * 1.6) % 1 < 0.35;
      this.beacon.material = on ? mats().amberOn : mats().lampOff;
    }

    setDamage(k) {
      k = clamp(+k || 0, 0, 1);
      this.state.damage = k;
      this.paint.color.setScalar(1 - k * 0.6);
    }

    setColor() {
      return false;
    }

    setVisible(v) {
      this.root.visible = !!v;
    }

    setShadows(cast) {
      for (const m of this.meshes) if (m.material !== mats().headOn) m.castShadow = !!cast;
    }

    dispose() {
      if (this.root.parent) this.root.parent.remove(this.root);
      this.paint.dispose();
    }
  }

  const BUILD = {
    bagtug(spec) {
      const m = new KitCarModel('bagtug', spec);
      const G = VH.Airside.gseGeometry;
      m.paintMesh = m.mesh(G('bagtug'), m.paint);
      m.head = m.lamps([[0.5, 0.75, 1.32], [-0.5, 0.75, 1.32]], 0.22, 0.14, mats().headOff);
      m.tail = m.lamps([[0.55, 0.7, -1.32], [-0.55, 0.7, -1.32]], 0.16, 0.12, mats().tailOff);
      m.beacon = m.mesh(new THREE.SphereGeometry(0.13, 8, 6), mats().lampOff);
      m.beacon.position.set(0, 2.08, -0.4);
      m.anchors.driverSeat.set(0, 1.12, -0.5);
      return m;
    },
    caterer(spec) {
      const m = new KitCarModel('caterer', spec);
      const G = VH.Airside.gseGeometry;
      m.paintMesh = m.mesh(G('cater'), m.paint);
      const box = m.mesh(G('caterbox'), m.paint);
      box.position.set(0, 1.0, -1.25);
      const sc = m.mesh(G('scissor'), m.paint);
      sc.position.set(0, 0.98, -0.6);
      sc.scale.y = 0.02;
      m.head = m.lamps([[0.8, 0.95, 3.88], [-0.8, 0.95, 3.88]], 0.3, 0.18, mats().headOff);
      m.tail = m.lamps([[0.95, 0.8, -3.72], [-0.95, 0.8, -3.72]], 0.22, 0.2, mats().tailOff);
      m.beacon = m.mesh(new THREE.SphereGeometry(0.15, 8, 6), mats().lampOff);
      m.beacon.position.set(0, 2.55, 3.4);
      m.anchors.driverSeat.set(0.5, 1.45, 2.9);
      return m;
    },
    firetruck(spec) {
      const m = new KitCarModel('firetruck', spec);
      m.paintMesh = m.mesh(fireGeo(), m.paint);
      const gl = new VH.AircraftKit();
      gl.box(2.2, 0.85, 0.05, 0, 2.35, 4.56, 0xffffff); // windscreen
      for (const s of [1, -1]) gl.box(0.05, 0.75, 1.3, s * 1.26, 2.38, 3.65, 0xffffff);
      const glass = m.mesh(gl.geometry(), mats().glass);
      glass.castShadow = false;
      m.head = m.lamps([[0.85, 1.12, 4.6], [-0.85, 1.12, 4.6]], 0.38, 0.22, mats().headOff);
      m.tail = m.lamps([[1.05, 1.05, -4.46], [-1.05, 1.05, -4.46]], 0.26, 0.34, mats().tailOff);
      const red = m.lamps([[0.55, 3.24, 3.7]], 0.85, 0.2, mats().lampOff);
      const blue = m.lamps([[-0.55, 3.24, 3.7]], 0.85, 0.2, mats().lampOff);
      red.scale.z = blue.scale.z = 5; // (a bar, not a sliver)
      m.bar = [red, blue];
      for (const [z, front] of [[3.2, true], [-1.8, false], [-3.1, false]]) for (const s of [1, -1]) m.wheel(0.55, 0.42, s * 1.05, z, front);
      m.anchors.driverSeat.set(0.55, 1.75, 3.5);
      m.anchors.siren = new THREE.Vector3(0, 3.3, 3.7);
      // Where the water comes out (havoc-air.js).
      m.nozzle = new THREE.Vector3(0, 3.85, 2.7);
      return m;
    },
    followme(spec, opts) {
      const m = VH.CarModels.build('mesa', { color: spec.palette[0], seed: opts && opts.seed });
      const h = VH.CarModels.TYPES.mesa.height;
      const sign = new THREE.Mesh(VH.Airside.gseGeometry('sign'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
      sign.position.set(0, h + 0.05, -0.4);
      sign.rotation.y = HALF;
      m.body.add(sign);
      const bar = [0.45, -0.45].map((x) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mats().lampOff);
        b.position.set(x, h + 0.08, 0.4);
        m.body.add(b);
        return b;
      });
      // Two amber flashers on the roof, turn about.
      m.setBeacon = (t) => {
        const on = t !== null && t !== undefined;
        const ph = on ? (t * 1.6) % 1 : 0;
        bar[0].material = on && ph < 0.35 ? mats().amberOn : mats().lampOff;
        bar[1].material = on && ph >= 0.5 && ph < 0.85 ? mats().amberOn : mats().lampOff;
      };
      return m;
    },
  };

  // ---------------------------------------------------------------- the type
  function register() {
    if (!VH.Vehicle || !VH.CarModels) return;
    const T = VH.CarModels.TYPES;
    for (const id of Object.keys(SPECS)) {
      const s = SPECS[id];
      const spec = Object.assign({ id, kind: 'airside', siren: null }, s);
      if (s.base && T[s.base]) {
        // (The follow-me is a Mesa underneath: its size and handling.)
        const b = T[s.base];
        for (const k of ['length', 'width', 'height', 'wheelbase', 'trackWidth', 'wheelRadius']) spec[k] = b[k];
        // (Its doors and windows are the Mesa's: entry.js fits Jay's way in to them.)
        const D = VH.CarModels.DEFS;
        if (D && D[s.base] && !D[id]) D[id] = D[s.base];
      }
      T[id] = spec;
    }

    class AirsideCar extends VH.Vehicle {
      constructor(system, typeId, opts) {
        super(system, typeId, opts);
        this.kind = 'car'; // (it drives, and counts, like any car)
        if (this.spec.top) this.topSpeed = this.spec.top;
        this.script = null; // havoc-air.js: (v, dt) → drives it along a path, no physics, while nobody's at the wheel
        this.beaconOn = false;
        this._beaconT = Math.random() * 3;
        // The crash tender's own weapon (combat.js asks a vehicle that has one): the water cannon.
        if (typeId === 'firetruck') {
          this.jet = null; // [{ x, y, z }] along the arc while it's on
          this.fireWeapon = (combat, inp, held) => this._cannon(combat, held);
        }
      }

      /** Hold fire: an arc of water from the monitor where the camera points (forward, and up a little). */
      _cannon(combat, held) {
        this.jet = null;
        if (!held || this.wrecked) return;
        const g = this.sys.game;
        const fx = g.fx;
        const d = combat._aimRay(0, true).d;
        let dx = d.x;
        let dz = d.z;
        const l = Math.hypot(dx, dz) || 1;
        dx /= l;
        dz /= l;
        const up = clamp(d.y + 0.22, 0.05, 0.7);
        const m = this.model.nozzle;
        const n = this.localToWorld(0, m ? m.z : 2.7, {});
        const ny = this.pos.y + (m ? m.y : 3.8);
        const sp = 24;
        const vx = dx * sp * Math.cos(up) + this.vel.x;
        const vy = sp * Math.sin(up);
        const vz = dz * sp * Math.cos(up) + this.vel.z;
        if (fx && fx.soft) {
          for (let k = 0; k < 3; k++) {
            fx.soft.emit({
              x: n.x, y: ny, z: n.z, vx: vx * (0.96 + Math.random() * 0.08), vy: vy + (Math.random() - 0.5) * 0.6, vz: vz * (0.96 + Math.random() * 0.08),
              life: 1.7, size: 0.3, size1: 1.6, r: 0.78, g: 0.88, b: 1.0, a: 0.7, drag: 0.05, grav: 9.8,
            });
          }
        }
        // Where it goes: a few points along the arc (for what it puts out or knocks over).
        const jet = [];
        for (let t = 0.2; t <= 1.7; t += 0.25) {
          const y = ny + vy * t - 4.9 * t * t;
          jet.push({ x: n.x + vx * t, y: Math.max(0, y), z: n.z + vz * t });
          if (y <= 0) break;
        }
        this.jet = jet;
        if (g.audio && g.audio.ready && g.vehicleFeedback && Math.random() < 0.1 && g.audio._wHit && g.audio._wBus) {
          try {
            const bus = g.audio._wBus({ pan: 0, gain: 0.25, verb: 0.1, life: 0.6 });
            g.audio._wHit({ t: g.audio.ctx.currentTime, type: 'highpass', freq: 1800, peak: 0.2, attack: 0.05, decay: 0.4, bus });
          } catch (err) {
            /* no hiss */
          }
        }
      }

      _buildModel(typeId, opts) {
        return BUILD[typeId](this.spec, opts || {});
      }

      fixedUpdate(dt) {
        if (this.script && this.driver !== 'player' && !this.wrecked && !this.removed) {
          this.prevPos.copy(this.pos);
          this.prevYaw = this.yaw;
          this.sleeping = false;
          this.script(this, dt);
          this.wheelSpin += (this.vF / (this.wheelRadius || 0.4)) * dt;
          if (this.siren) this.sirenTime += dt;
          return;
        }
        super.fixedUpdate(dt);
      }

      updateVisual(dt, alpha, night) {
        super.updateVisual(dt, alpha, night);
        const m = this.model;
        // Jay at the wheel of the fire engine: the siren goes with the lights (L).
        if (this.spec.siren && this.driver === 'player') this.siren = this.lightsOn && !this.wrecked;
        if (m.bar) m.setSiren(this.siren && !this.wrecked ? this.sirenTime : null);
        if (m.setBeacon) {
          // The amber beacon flashes while it's at work (or Jay's driving it with its lights on).
          this._beaconT += dt;
          const on = !this.wrecked && (this.beaconOn || (this.driver === 'player' && (this.lightsOn || this.speed > 0.5)));
          m.setBeacon(on ? this._beaconT : null);
        }
      }
    }

    VH.VehicleKinds = Object.assign(VH.VehicleKinds || {}, { airside: AirsideCar });
    VH.AirsideCar = AirsideCar;
  }

  register();
  VH.AirsideCars = { SPECS, types: Object.keys(SPECS) };
})();
