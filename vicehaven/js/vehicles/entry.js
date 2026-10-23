/*
 * entry.js — getting into vehicles: Jay walks to the door, opens it (or the
 * canopy, the hatch, the sliding door), climbs in and the door shuts behind
 * him. If someone is at the wheel, he takes the car off them, and how depends
 * on the vehicle and on what Jay has in his hands:
 *
 *   yank      open the door, grab the driver, haul them out onto the road
 *   punch     a couple of jabs through the door first, then the yank
 *   low       a low sports car: crouch, drag them up and fling them behind
 *   drag      a van or truck: up on the step, pull them down out of the cab
 *   shove     an open jeep: grab them by the collar and heave them over the side
 *   cop       a patrol car: the officer is yanked out, but gets straight back up
 *   gunpoint  Jay has a gun out: the driver opens the door and gets out with
 *             their hands up, then runs
 *
 * Doors are separate panels (the body mesh has them merged in): built the
 * first time a door opens, hinged on the vehicle's model, hidden when shut.
 *
 *   const entry = new VH.VehicleEntry(game, vehicles)
 *   entry.begin(e)        e = vehicles.entering ({ v, side, jacked, ... })
 *   entry.step(e, dt)     → true once Jay is in his seat
 *   entry.abort(e)        the car was wrecked or removed midway
 *   entry.exitDoor(v, side)  getting out: the door swings open, then shut
 *   entry.update(dt)      every frame: doors swinging
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, smoothstep } = VH.math;

  // How each vehicle opens and how Jay gets in. door: swing | scissor | gull |
  // slide | canopy | hatch | none. len: door length (m). open: how far it
  // swings (radians). climb: how high Jay steps up. low: crouch to get in.
  // jack: how a driver is pulled out. stuck: the door sticks (a tug or two).
  const DEFAULT = { door: 'swing', len: 1.05, open: 1.15, climb: 0, low: 0.15, jack: 'yank', openT: 0.42, inT: 0.5 };
  const BY_TYPE = {
    vireo: { len: 1.25, open: 1.25, low: 0.45, jack: 'low' },
    drifter: { len: 1.15, open: 1.2, low: 0.4, jack: 'low' },
    zephyr: { door: 'scissor', len: 1.2, open: 1.2, low: 0.5, jack: 'low', openT: 0.55 },
    lowrider: { len: 1.4, open: 1.0, low: 0.35, openT: 0.6, inT: 0.6 },
    ironclad: { len: 1.3, open: 1.1, low: 0.25 },
    pipit: { len: 0.95, open: 1.2 },
    beater: { len: 0.95, open: 1.05, stuck: true, openT: 0.85 },
    halcyon: {},
    cab: {},
    sovereign: { len: 1.15, open: 1.05, openT: 0.5 },
    tern: { len: 1.05, climb: 0.12, low: 0.05 },
    interceptor: { jack: 'cop' },
    unmarked: { jack: 'cop' },
    porter: { len: 0.95, climb: 0.3, low: 0, jack: 'drag', inT: 0.6 },
    medic: { len: 0.95, climb: 0.3, low: 0, jack: 'drag', inT: 0.6 },
    mesa: { len: 1.05, climb: 0.22, low: 0, jack: 'drag' },
    scout: { door: 'none', climb: 0.25, low: 0, jack: 'shove', openT: 0.2, inT: 0.55 },
    bulwark: { len: 0.95, climb: 0.55, low: 0, jack: 'drag', openT: 0.5, inT: 0.7 },
    hauler: { len: 1.0, climb: 0.7, low: 0, jack: 'drag', openT: 0.5, inT: 0.75 },
    // Aircraft and the tank: x/z place the door on the model, y0/y1 its height.
    skylark: { door: 'gull', len: 1.05, open: 1.35, climb: 0.45, low: 0.2, y0: 0.95, y1: 1.95, openT: 0.55, inT: 0.6 },
    albatross: { door: 'swing', len: 1.1, open: 1.5, climb: 2.2, low: 0, y0: 3.3, y1: 5.2, openT: 0.6, inT: 1.0 },
    talon: { door: 'canopy', len: 1.9, open: 0.85, climb: 1.9, low: 0.3, openT: 0.9, inT: 0.8 },
    sparrow: { door: 'slide', len: 1.2, climb: 0.35, low: 0.25, y0: 0.55, y1: 1.85, openT: 0.45, inT: 0.55 },
    warden: { door: 'gull', len: 1.0, open: 1.3, climb: 0.9, low: 0.2, y0: 1.0, y1: 2.3, openT: 0.6, inT: 0.7 },
    bastion: { door: 'hatch', len: 0.75, open: 1.9, climb: 2.35, low: 0, openT: 1.0, inT: 0.75 },
  };
  const BY_CLS = { van: 'porter', pickup: 'mesa', police: 'interceptor', sports: 'vireo', plane: 'skylark', heli: 'sparrow', tank: 'bastion' };

  function profileFor(v) {
    const own = BY_TYPE[v.type] || BY_TYPE[BY_CLS[v.cls]] || {};
    return Object.assign({}, DEFAULT, own);
  }

  let GLASS = null;
  function glassMat() {
    if (!GLASS) GLASS = new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.72 });
    return GLASS;
  }
  let TRIM = null;
  function trimMat() {
    if (!TRIM) TRIM = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.6, metalness: 0.2 });
    return TRIM;
  }

  /** Local-space spots on a vehicle: the door's hinge line, the seat. */
  function layout(v, side, pr) {
    const m = v.model || {};
    const A = m.anchors;
    const seatY = A && A.driverSeat ? A.driverSeat.y : 0.6;
    const seatZ = A && A.driverSeat ? A.driverSeat.z : v.doorZ !== undefined ? v.doorZ : v.hz * 0.1;
    // The door's middle sits by the seat, a little forward of the hips.
    let midZ = v.doorZ !== undefined ? v.doorZ : seatZ + 0.25;
    const sill = A && A.driverSeat ? seatY - 0.34 : pr.y0 || 0.4;
    // A car: the front door runs from the windscreen pillar back to the end of
    // the front side window, its top along the window line.
    const D = VH.CarModels && VH.CarModels.DEFS && VH.CarModels.DEFS[v.type];
    const win = D && D.glass && D.glass.side && D.glass.side[0];
    if (win && D.glass.ws && typeof win.r === 'number') {
      const front = D.glass.ws[0][0] - 0.04;
      const rear = win.r - 0.05;
      return {
        seatX: side * (A && A.driverSeat ? Math.abs(A.driverSeat.x) : 0.35),
        seatY,
        seatZ,
        midZ: (front + rear) / 2,
        len: Math.max(0.7, front - rear),
        x: side * (v.hx - 0.05),
        y0: sill + 0.06,
        belt: win.b,
        y1: win.t + 0.03,
      };
    }
    return {
      seatX: side * (A && A.driverSeat ? Math.abs(A.driverSeat.x) : 0.35),
      seatY,
      seatZ: v.cockpit ? v.cockpit.z : seatZ,
      midZ,
      x: side * (v.hx - 0.02),
      y0: pr.y0 !== undefined ? pr.y0 : sill + 0.06,
      y1: pr.y1 !== undefined ? pr.y1 : Math.max(sill + 0.7, v.height * 0.94),
      belt: pr.y1 !== undefined ? lerp(pr.y0, pr.y1, 0.5) : lerp(sill, v.height, 0.62),
    };
  }

  /** A door panel for one side: a pivot at the hinge, the panel hanging off it. */
  function buildDoor(v, side, pr) {
    const m = v.model;
    if (!m || !m.root || pr.door === 'none') return null;
    const L = layout(v, side, pr);
    const pivot = new THREE.Group();
    pivot.name = 'door';
    const panel = new THREE.Group();
    pivot.add(panel);
    // The body's paint; a livery (the colours painted into the body) gets its main colour.
    let paint = m.paintMesh ? m.paintMesh.material : trimMat();
    if (m.livery && m.color !== undefined) {
      paint = new THREE.MeshStandardMaterial({ color: m.color, vertexColors: true, roughness: 0.35, metalness: 0.4 });
    }
    const add = (geo, mat, x, y, z) => {
      // White vertex colours: the car paint multiplies them in.
      const n = geo.attributes.position.count;
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      panel.add(mesh);
      if (mat === paint) painted.push(mesh);
      return mesh;
    };
    const painted = [];
    const len = L.len || pr.len;
    const T = 0.06;
    let parent = m.root;
    if (pr.door === 'hatch') {
      // A round hatch on the turret roof, hinged on its back edge.
      const turret = m.turret || m.root;
      parent = turret;
      pivot.position.set(side * 0.55, turret === m.root ? v.height : 1.28, -0.25 - len / 2);
      add(new THREE.CylinderGeometry(len / 2, len / 2, 0.08, 18), m.metal || trimMat(), 0, 0.04, len / 2);
      add(new THREE.BoxGeometry(0.08, 0.05, len * 0.5), trimMat(), 0, 0.1, len / 2);
    } else if (pr.door === 'canopy') {
      // A bubble over the cockpit, hinged at its back.
      const c = v.cockpit || { z: 2, y: 2.4 };
      pivot.position.set(0, c.y + 0.05, c.z - len * 0.55);
      const dome = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      dome.scale(1.1, 0.8, len);
      add(dome, glassMat(), 0, 0, len * 0.5);
      add(new THREE.TorusGeometry(0.55, 0.035, 6, 20, Math.PI), trimMat(), 0, 0, len * 0.5).rotation.set(0, Math.PI / 2, 0);
    } else {
      const y0 = L.y0;
      const belt = L.belt;
      const y1 = L.y1;
      // Hinge on the front edge (a gull door's on the top edge).
      const front = L.midZ + len / 2;
      if (pr.door === 'gull') {
        pivot.position.set(L.x, y1, L.midZ);
        add(new THREE.BoxGeometry(T, belt - y0, len), paint, 0, (y0 + belt) / 2 - y1, 0);
        add(new THREE.BoxGeometry(T * 0.6, y1 - belt - 0.05, len - 0.12), glassMat(), 0, (belt + y1) / 2 - y1, 0);
      } else {
        pivot.position.set(L.x, 0, front);
        add(new THREE.BoxGeometry(T, belt - y0, len), paint, 0, (y0 + belt) / 2, -len / 2);
        if (y1 > belt + 0.15) {
          // The window, in a thin frame.
          const h = y1 - belt;
          add(new THREE.BoxGeometry(T * 0.5, h - 0.06, len - 0.14), glassMat(), 0, belt + h / 2, -len / 2);
          add(new THREE.BoxGeometry(T * 0.7, 0.04, len - 0.06), trimMat(), 0, y1 - 0.02, -len / 2);
          add(new THREE.BoxGeometry(T * 0.7, h, 0.05), trimMat(), 0, belt + h / 2, -len + 0.04);
        }
        // The handle.
        add(new THREE.BoxGeometry(0.03, 0.035, 0.16), trimMat(), side * 0.04, belt - 0.08, -len + 0.18);
      }
    }
    pivot.visible = false;
    parent.add(pivot);
    return { v, side, pr, pivot, painted, angle: 0, target: 0, closeIn: 0 };
  }

  class VehicleEntry {
    constructor(game, vehicles) {
      this.game = game;
      this.vehicles = vehicles;
      this.doors = new Map(); // v.id:side → door
      this._p = new THREE.Vector3();
    }

    // ------------------------------------------------------------ doors
    door(v, side) {
      const key = v.id + ':' + side;
      let d = this.doors.get(key);
      if (d && d.v !== v) d = null;
      if (!d) {
        d = buildDoor(v, side, profileFor(v));
        if (!d) return null;
        this.doors.set(key, d);
      }
      return d;
    }

    /** Pose a door: 0 shut .. 1 wide open. */
    _poseDoor(d) {
      const a = d.angle;
      const p = d.pivot;
      // Opening: in the car's paint as it is now (a respray, damage).
      const m = d.v.model;
      if (!p.visible && a > 0.004 && m && m.paintMesh && !m.livery) for (const mesh of d.painted) mesh.material = m.paintMesh.material;
      p.visible = a > 0.004;
      const pr = d.pr;
      const s = d.side;
      const k = smoothstep(0, 1, a);
      if (pr.door === 'swing') p.rotation.set(0, -s * pr.open * k, 0);
      else if (pr.door === 'scissor') p.rotation.set(pr.open * k, -s * 0.18 * k, 0, 'YXZ');
      else if (pr.door === 'gull') p.rotation.set(0, 0, s * pr.open * k);
      else if (pr.door === 'canopy') p.rotation.set(-pr.open * k, 0, 0);
      else if (pr.door === 'hatch') p.rotation.set(-pr.open * k, 0, 0);
      else if (pr.door === 'slide') {
        p.rotation.set(0, 0, 0);
        p.position.x = s * (d.v.hx - 0.02 + 0.08 * Math.min(1, k * 4));
        p.position.z = (d.base === undefined ? (d.base = p.position.z) : d.base) - pr.len * 0.95 * k;
      }
    }

    update(dt) {
      for (const [key, d] of this.doors) {
        if (d.v.removed || !d.v.model) {
          if (d.pivot.parent) d.pivot.parent.remove(d.pivot);
          this.doors.delete(key);
          continue;
        }
        if (d.closeIn > 0) {
          d.closeIn -= dt;
          if (d.closeIn <= 0) d.target = 0;
        }
        if (d.angle === d.target && !d.jiggle) continue;
        const was = d.angle;
        const rate = d.target > d.angle ? 3.2 : 4.2;
        d.angle = d.target > d.angle ? Math.min(d.target, d.angle + dt * rate) : Math.max(d.target, d.angle - dt * rate);
        // Shutting: a thunk as it closes.
        if (was > 0 && d.angle === 0 && d.target === 0) VH.events.emit('vehicle:door', { v: d.v, open: false });
        this._poseDoor(d);
      }
    }

    /** Out of a vehicle: the door swings open, then shut a moment later. */
    exitDoor(v, side) {
      const d = this.door(v, side || 1);
      if (!d) return;
      d.angle = Math.max(d.angle, 0.85);
      d.target = 1;
      d.closeIn = 0.55;
      this._poseDoor(d);
    }

    // ------------------------------------------------------------ Jay
    /** Where a local point is in the world (y above the car's origin). */
    _w(v, lx, ly, lz, out) {
      const o = v.localToWorld(lx, lz, out || {});
      o.y = v.pos.y + ly;
      return o;
    }

    begin(e) {
      const g = this.game;
      const v = e.v;
      e.pr = profileFor(v);
      e.L = layout(v, e.side, e.pr);
      e.door = this.door(v, e.side);
      e.lift = 0;
      // A gun out: the driver gets out on their own, hands up.
      const c = g.combat;
      const w = c && c.weapon;
      e.style = e.jacked ? (c && c.playerArmed && w && w.kind !== 'thrown' && w.kind !== 'melee' ? 'gunpoint' : e.pr.jack) : null;
      if (e.style === 'yank' && Math.random() < 0.4) e.style = 'punch';
      const d = Math.hypot(e.toX - e.fromX, e.toZ - e.fromZ);
      e.walkT = clamp(d / 3.2, 0.18, 0.7);
    }

    /** Jay's pose this frame: joint targets and how strongly they apply. */
    _pose(o) {
      const p = this.game.player;
      p.enterPose = o;
    }

    step(e, dt) {
      const g = this.game;
      const p = g.player;
      const v = e.v;
      const pr = e.pr;
      const L = e.L;
      e.t += dt;
      const s = e.side;
      // Jay stands just outside the door, facing in.
      const out = s * (v.hx + 0.42);
      const at = this._w(v, out, 0, L.midZ, this._p);
      const face = Math.atan2(-s * Math.cos(v.yaw), s * Math.sin(v.yaw)); // toward the car's middle
      if (e.phase === 'walk') {
        const k = smoothstep(0, e.walkT, e.t);
        p.pos.x = lerp(e.fromX, at.x, k);
        p.pos.z = lerp(e.fromZ, at.z, k);
        p.heading = e.t < e.walkT * 0.6 ? Math.atan2(at.x - e.fromX, at.z - e.fromZ) || face : face;
        this._pose({ w: 0, speed: 2.6 * (1 - smoothstep(e.walkT * 0.7, e.walkT, e.t)) });
        if (e.t >= e.walkT) this._next(e, e.style === 'gunpoint' ? 'gunpoint' : 'open');
        return false;
      }
      p.pos.x = at.x;
      p.pos.z = at.z;
      if (e.phase === 'open') return this._open(e, face);
      if (e.phase === 'jack') return this._jack(e, face, dt);
      if (e.phase === 'gunpoint') return this._gunpoint(e, face);
      if (e.phase === 'in') return this._in(e, face);
      return false;
    }

    _next(e, phase) {
      e.phase = phase;
      e.t = 0;
      if (phase === 'jack' || phase === 'gunpoint') this._grabDriver(e);
    }

    _open(e, face) {
      const p = this.game.player;
      const pr = e.pr;
      const T = pr.openT;
      const t = e.t;
      const k = t / T;
      p.heading = face;
      const high = pr.door === 'hatch' || pr.door === 'canopy';
      if (high) {
        // Climb up the hull / the ladder first, then lift the hatch.
        const up = smoothstep(0, 0.65, k);
        e.lift = pr.climb * up;
        // Hand over hand up the side, then reach for the handle and heave it open.
        if (k < 0.65) this._pose({ w: 0, climb: (k / 0.65) % 0.5 * 2 * 0.8 });
        else {
          const heave = smoothstep(0.65, 1, k);
          this._pose({ w: 1, crouch: 0.35, shoulderR: 1.2 + 1.2 * heave, elbowR: 0.5, shoulderL: 0.5, elbowL: 0.8, lean: 0.35 - 0.25 * heave });
        }
        if (e.door) {
          e.door.target = 0;
          e.door.angle = Math.max(e.door.angle, smoothstep(0.62, 1, k));
          this._poseDoor(e.door);
        }
        if (!e._doorSnd && k > 0.62) {
          e._doorSnd = true;
          VH.events.emit('vehicle:door', { v: e.v, open: true });
        }
      } else {
        // Step up (vans, trucks), reach for the handle, pull it open.
        e.lift = pr.climb * smoothstep(0, 0.5, k);
        const reach = smoothstep(0, 0.35, k);
        const pull = smoothstep(0.35, 0.8, k);
        let open = pull;
        if (pr.stuck) {
          // The old Pipit's door sticks: a tug, a jolt, then it gives.
          const tug = Math.sin(clamp((k - 0.3) / 0.35, 0, 1) * Math.PI);
          open = 0.12 * tug + smoothstep(0.66, 0.95, k);
          if (!e._tug && k > 0.45) {
            e._tug = true;
            VH.events.emit('vehicle:door', { v: e.v, open: false });
            this.game.cameraRig && this.game.cameraRig.kick && this.game.cameraRig.kick(0.006, 0, 0);
          }
        }
        this._pose({
          w: 1,
          crouch: pr.low * reach,
          shoulderR: lerp(0.25, 1.15 - pr.low * 0.4, reach) - 0.45 * pull,
          elbowR: lerp(0.3, 0.25, reach) + 0.6 * pull,
          splayR: 0.12 + 0.25 * pull,
          twist: -0.25 * pull * e.side,
          lean: 0.08 * reach - 0.12 * pull,
          hipR: pr.climb > 0.2 ? 0.7 * (1 - smoothstep(0.3, 0.6, k)) : 0,
          kneeR: pr.climb > 0.2 ? 1.1 * (1 - smoothstep(0.3, 0.6, k)) : 0,
        });
        if (e.door) {
          e.door.target = 0;
          e.door.angle = Math.max(e.door.angle * (pr.stuck ? 0 : 1), open);
          this._poseDoor(e.door);
        }
        if (!e._doorSnd && k > (pr.stuck ? 0.66 : 0.35)) {
          e._doorSnd = true;
          VH.events.emit('vehicle:door', { v: e.v, open: true });
        }
      }
      if (t >= T) {
        if (e.door) e.door.target = 1;
        this._next(e, e.jacked ? 'jack' : 'in');
      }
      return false;
    }

    // ---------------------------------------------------------- the jack
    /** Out comes the driver (vehicles.js 'vehicle:jack'), held in the seat for now. */
    _grabDriver(e) {
      const v = e.v;
      const at = this._w(v, e.side * (v.hx + 0.42), 0, e.L.midZ, {});
      const ev = { v, side: e.side, x: at.x, z: at.z, style: e.style };
      VH.events.emit('vehicle:jack', ev);
      e.driver = (ev.agents && ev.agents[0]) || null;
      const a = e.driver;
      if (a && !a.dead) {
        a.held = { x: 0, y: 0, z: 0, heading: v.yaw };
        a.anim.crouch = 1;
        this._holdAt(e, 0);
      } else e.driver = null;
    }

    /** Hold the driver along the way out: 0 in the seat .. 1 standing at the door. */
    _holdAt(e, k, lift) {
      const a = e.driver;
      if (!a || !a.held) return;
      const v = e.v;
      const L = e.L;
      const lx = lerp(L.seatX, e.side * (v.hx + 0.25), k);
      const ly = lerp(Math.max(0, L.seatY - 0.62), 0, k) + (lift || 0);
      const w = this._w(v, lx, ly, lerp(L.seatZ, L.midZ, k), {});
      a.held.x = w.x;
      a.held.y = w.y;
      a.held.z = w.z;
      a.held.heading = k < 0.5 ? v.yaw : v.yaw + e.side * Math.PI / 2;
      a.pos.set(w.x, w.y, w.z);
    }

    /** Let go: thrown down (a knock that does no harm), or just released to run. */
    _release(e, vx, vy, vz, throwIt) {
      const a = e.driver;
      if (!a) return;
      a.held = null;
      a.anim.crouch = 0;
      a.anim.cower = 0;
      a.anim.handsUp = 0;
      e.driver = null;
      if (a.dead) return;
      if (throwIt) a.knock(vx, vy, vz, 0, 'player', e.style === 'cop' ? 0 : 0.8);
      else {
        const crowd = this.game.crowd;
        if (!a.brain && crowd && crowd._flee) crowd._flee(a, e.v.pos.x, e.v.pos.z, 7);
      }
      VH.events.emit('vehicle:jacked', { v: e.v, agent: a, style: e.style });
    }

    _jack(e, face, dt) {
      const g = this.game;
      const v = e.v;
      const s = e.side;
      const t = e.t;
      const st = e.style;
      // Which way "out" is in the world, and "back" (away from the car's nose).
      const ox = s * Math.cos(v.yaw);
      const oz = -s * Math.sin(v.yaw);
      const fx = Math.sin(v.yaw);
      const fz = Math.cos(v.yaw);
      const p = g.player;
      p.heading = face;
      const lean = (k) => {
        // Jay leans into the doorway.
        const w = this._w(v, s * (v.hx + 0.42 - 0.3 * k), 0, e.L.midZ, this._p);
        p.pos.x = w.x;
        p.pos.z = w.z;
      };
      let dur = 1.0;
      if (st === 'punch') {
        dur = 1.35;
        const jab = (c) => Math.max(0, 1 - Math.abs(t - c) / 0.09);
        const j = Math.max(jab(0.14), jab(0.38));
        this._pose({ w: 1, shoulderR: 0.4 + 1.2 * j, elbowR: 1.6 - 1.5 * j, shoulderL: 1.0, elbowL: 1.9, twist: 0.3 * j * -s, lean: 0.12 + 0.1 * j });
        lean(0.3 + 0.4 * j);
        for (const c of [0.14, 0.38]) {
          if (t >= c && !(e._jab || (e._jab = {}))[c]) {
            e._jab[c] = true;
            if (g.audio.meleeHit) g.audio.meleeHit('fist');
            if (e.driver) {
              e.driver.flinchT = 0.28;
              e.driver.flinch = s;
              e.driver.anim.cower = 1;
            }
          }
        }
        if (t > 0.5) this._yank(e, t - 0.5, 0.85, ox, oz, fx, fz, lean, false);
      } else if (st === 'low') {
        dur = 1.05;
        this._yank(e, t, 1.05, ox, oz, fx, fz, lean, true);
      } else if (st === 'drag') {
        dur = 1.15;
        this._yank(e, t, 1.15, ox, oz, fx, fz, lean, false, true);
      } else if (st === 'shove') {
        dur = 0.95;
        const grab = smoothstep(0, 0.35, t);
        const heave = smoothstep(0.35, 0.6, t);
        this._pose({ w: 1, shoulderR: 1.3 + 1.2 * heave, elbowR: 0.6 - 0.4 * heave, shoulderL: 1.3 + 1.2 * heave, elbowL: 0.6 - 0.4 * heave, lean: 0.2 * grab - 0.25 * heave, twist: -0.4 * heave * s });
        lean(grab * (1 - heave));
        if (e.driver) {
          e.driver.anim.cower = 1;
          this._holdAt(e, 0.35 * grab + 0.4 * heave, 0.5 * heave);
        }
        if (t >= 0.6 && e.driver) this._release(e, ox * 3.6 - fx * 0.5, 3.2, oz * 3.6 - fz * 0.5, true);
      } else {
        // yank, cop
        dur = st === 'cop' ? 1.1 : 1.0;
        this._yank(e, t, dur, ox, oz, fx, fz, lean, false);
      }
      if (t >= dur) {
        if (e.driver) this._release(e, ox * 2.5, 1.5, oz * 2.5, true);
        this._next(e, 'in');
      }
      return false;
    }

    /** Reach in, grab, haul back: the driver comes out with Jay and is thrown down. */
    _yank(e, t, dur, ox, oz, fx, fz, lean, low, high) {
      const k = t / dur;
      const reach = smoothstep(0, 0.3, k);
      const haul = smoothstep(0.3, 0.62, k);
      const after = smoothstep(0.62, 1, k);
      const crouch = low ? 0.7 * reach * (1 - haul * 0.6) : 0;
      this._pose({
        w: 1,
        crouch,
        shoulderR: lerp(0.4, high ? 2.0 : 1.35, reach) - (high ? 1.2 : 0.8) * haul,
        shoulderL: lerp(0.3, high ? 1.9 : 1.25, reach) - (high ? 1.1 : 0.75) * haul,
        elbowR: 0.35 + 1.1 * haul * (1 - after),
        elbowL: 0.35 + 1.1 * haul * (1 - after),
        splayL: 0.15,
        splayR: 0.15,
        lean: 0.28 * reach * (1 - haul) - 0.3 * haul * (1 - after),
        twist: (low ? 0.6 : 0.35) * haul * (1 - after) * -e.side,
      });
      lean(reach * (1 - haul) - 0.35 * haul * (1 - after));
      const a = e.driver;
      if (!a) return;
      a.anim.cower = haul > 0.05 ? 1 : 0;
      a.anim.crouch = haul > 0.05 ? 0 : 1;
      // Out they come, then Jay throws them down.
      if (k < 0.62) this._holdAt(e, 0.85 * haul, low ? 0.35 * haul : 0);
      else if (a.held) {
        if (low) this._release(e, ox * 2.4 - fx * 2.6, 3.6, oz * 2.4 - fz * 2.6, true); // flung behind him
        else if (high) this._release(e, ox * 2.2, 0.6, oz * 2.2, true); // a drop from the cab
        else if (e.style === 'cop') this._release(e, ox * 2.4, 1.2, oz * 2.4, true);
        else this._release(e, ox * 3.0 + fx * 0.6, 1.8, oz * 3.0 + fz * 0.6, true);
      }
    }

    /** Gun out: the driver opens up, climbs out with their hands up, backs off and runs. */
    _gunpoint(e, face) {
      const t = e.t;
      const p = this.game.player;
      p.heading = face;
      this._pose({ w: 0, aim: 1 });
      const a = e.driver;
      if (e.door) {
        e.door.target = 0;
        e.door.angle = Math.max(e.door.angle, smoothstep(0.15, 0.55, t));
        this._poseDoor(e.door);
      }
      if (!e._doorSnd && t > 0.15) {
        e._doorSnd = true;
        VH.events.emit('vehicle:door', { v: e.v, open: true });
      }
      // Jay stands back a step while they get out.
      const w = this._w(e.v, e.side * (e.v.hx + 1.15), 0, e.L.midZ - 0.6, this._p);
      const k = smoothstep(0, 0.3, t);
      p.pos.x = lerp(p.pos.x, w.x, k);
      p.pos.z = lerp(p.pos.z, w.z, k);
      if (a) {
        a.anim.crouch = t < 0.5 ? 1 - smoothstep(0.3, 0.6, t) : 0;
        a.anim.handsUp = smoothstep(0.2, 0.5, t);
        const out = smoothstep(0.35, 0.95, t);
        // Out and a couple of steps toward the back of the car.
        this._holdAt(e, out, 0);
        if (a.held && out > 0.9) {
          const b = this._w(e.v, e.side * (e.v.hx + 0.5), 0, e.L.midZ - 1.2 * smoothstep(0.95, 1.35, t), {});
          a.held.x = b.x;
          a.held.z = b.z;
          a.pos.x = b.x;
          a.pos.z = b.z;
        }
        if (t >= 1.35) this._release(e, 0, 0, 0, false);
      }
      if (t >= 1.45) {
        if (e.door) e.door.target = 1;
        this._next(e, 'in');
      }
      return false;
    }

    // ------------------------------------------------------------ in
    _in(e, face) {
      const g = this.game;
      const p = g.player;
      const v = e.v;
      const pr = e.pr;
      const L = e.L;
      const T = pr.inT;
      const k = clamp(e.t / T, 0, 1);
      const s = e.side;
      const high = pr.door === 'hatch' || pr.door === 'canopy';
      let lx, lz;
      if (high) {
        // Across to the hatch / into the cockpit, then down inside.
        const across = smoothstep(0, 0.5, k);
        const down = smoothstep(0.45, 1, k);
        lx = lerp(s * (v.hx + 0.42), pr.door === 'hatch' ? s * 0.55 : 0, across);
        lz = lerp(L.midZ, pr.door === 'hatch' ? -0.25 : L.seatZ, across);
        e.lift = pr.climb - (pr.door === 'hatch' ? 1.6 : 1.0) * down;
        this._pose({ w: 1, crouch: 0.3 + 0.5 * down, hipL: 0.6 * across, kneeL: 1.2 * across * (1 - down), shoulderL: 0.5, shoulderR: 0.5, speed: 0 });
      } else {
        // A leg in, duck under the roof, slide across onto the seat.
        const leg = smoothstep(0, 0.35, k);
        const duck = smoothstep(0.15, 0.7, k);
        const slide = smoothstep(0.3, 1, k);
        lx = lerp(s * (v.hx + 0.42), L.seatX, slide);
        lz = lerp(L.midZ, L.seatZ, slide);
        const seatLift = Math.max(0, L.seatY - 0.55);
        e.lift = lerp(pr.climb, seatLift, slide);
        this._pose({
          w: 1,
          crouch: (0.35 + pr.low) * duck,
          hipL: 1.15 * leg,
          kneeL: 1.25 * leg,
          shoulderR: 0.9 * (1 - slide) + 0.4,
          elbowR: 0.6,
          shoulderL: 0.6,
          lean: 0.25 * duck,
          speed: 0,
        });
      }
      const w = this._w(v, lx, 0, lz, this._p);
      p.pos.x = w.x;
      p.pos.z = w.z;
      // Turn to face forward as he sits.
      const turn = smoothstep(0.25, 0.8, k);
      const dh = Math.atan2(Math.sin(v.yaw - face), Math.cos(v.yaw - face));
      p.heading = face + dh * turn;
      // He disappears into the car; the door follows him shut.
      if (k > 0.9 && p.model.root.visible) p.model.setVisible(false);
      if (e.door && k > 0.72 && e.door.target > 0) e.door.target = 0;
      return k >= 1;
    }

    /** Back to normal (finished, or cut short). */
    end(e) {
      const p = this.game.player;
      p.enterPose = null;
      p.enterLift = 0;
      if (e && e.driver) this._release(e, 0, 0, 0, false);
    }

    abort(e) {
      const p = this.game.player;
      this.end(e);
      p.model.setVisible(true);
      if (e && e.door) e.door.target = 0;
    }

    /** Called by vehicles.js each frame of an entry, after step(): Jay's lift for the renderer. */
    apply(e) {
      this.game.player.enterLift = e.lift || 0;
    }

    reset() {
      for (const d of this.doors.values()) if (d.pivot.parent) d.pivot.parent.remove(d.pivot);
      this.doors.clear();
    }
  }

  VehicleEntry.profileFor = profileFor;
  VehicleEntry.PROFILES = BY_TYPE;
  VH.VehicleEntry = VehicleEntry;
})();
