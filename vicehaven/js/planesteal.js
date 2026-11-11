/*
 * planesteal.js — every aircraft at Vicehaven International can be stolen
 * from the ground: walk up to its door and take it, like jacking a car.
 *
 *   new VH.PlaneSteal(game)  game.planeSteal, a world system
 *
 * Which: every airliner airside.js runs that's on the ground at no more than
 * about 8 m/s (at a gate, on a remote stand, holding, taxiing, being pushed
 * back or towed, a freighter), and the two Skylarks and the visiting
 * helicopter while they're on the ground. Not one on its take-off or landing
 * roll, nor one in the air, nor a disabled or burning one. (The flyable
 * Albatross at REMOTE and the GA spots' aircraft are ordinary vehicles.)
 *
 * Where: on foot at the foot of the door: an airliner's front port door, or
 * the starboard one where a jet bridge or the air stairs are at the port
 * one; a Skylark's or the helicopter's own door. A plane on the move brakes
 * to a stop while he's there (airside.stealHold; it gives up waiting after
 * 45 s, so nothing waits for ever), and once it stands: "E  Steal the plane".
 *
 * An airliner: it comes off airside's books (airside.stealTake: its flight
 * Cancelled, its stand free and kept clear of arrivals until he's taken it
 * away) and a flyable Albatross in the same livery (a freighter keeps its
 * freighter look) stands in its place, at the same pose. The door opens
 * (vehicles/entry.js), the pilots and cabin crew come down and run, the
 * slides go out at the other doors and the passengers slide down and run
 * (a dozen or so seen; nobody hurt), then Jay goes up and in and is at the
 * controls, engines running. One parked nose in at a stand (it can't back
 * out) is turned round to face the taxilane under a short fade.
 * A light aircraft: the same swap (airside.takeLight: it's back on its spot
 * a few minutes later, out of sight), then the ordinary way in, its pilot
 * pulled out like a car's driver.
 *
 * Police: a hijack (three stars) for an airliner, a carjacking for a light
 * aircraft. Achievement "Self Check-In". Stats: "Aircraft stolen from the
 * ground".
 *
 * The camera: the aircraft camera keeps out of the terminal (and a few
 * metres over its roof) and its jet bridges (cameraRig.keepOut), so after a
 * take at the gate (from the ground here, or from the flight deck, cabin.js)
 * it doesn't start out inside the hall looking out through the glass, or
 * peering over the roof's edge: it waits just outside the airside wall.
 *
 *   events   planesteal:taken { v, kind ('airliner' 'skylark' 'sparrow'),
 *            flight (the board entry, or null), x, z }
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, smoothstep, dampAngle } = VH.math;
  const PI = Math.PI;

  // ------------------------------------------------------------ tuning
  const BOX = { x0: -1120, x1: 430, z0: -1590, z1: -1170 }; // the airfield, near enough
  const RWY = { x0: -1000, x1: 300, z: -1450, w: 60 }; //     the runway (as airside.js)
  const MAX_V = 8.5; //    faster than this, it can't stop for him (a take-off or landing roll)
  const HOLD_R = 12; //    Jay on foot this close to the foot of its door: it brakes and waits ...
  const HOLD_MAX = 45; //  ... this long at most
  const USE_R = 4.2; //    the prompt's reach
  const HIGH = 1.3; //     Jay's feet higher than this (in a jet bridge, up the stairs): not from the ground
  const GROUND = new Set(['parked', 'pushback', 'tugoff', 'taxiin', 'taxiout', 'lineup', 'towready', 'tow', 'rollout', 'takeoff']);
  // An Albatross in its own frame (nose +z, port +x, the ground at y 0): the front doors (sill
  // height, how far out the skin is), and how far out the foot of the stairs is.
  const ALB = { z: 15.0, sill: 3.0, skin: 2.15, foot: 5.9 };
  // The doors with slides (as havoc-air.js): z, side, sill.
  const SLIDES = [{ z: 15.0, s: 1, y: 3.0 }, { z: 15.0, s: -1, y: 3.0 }, { z: -11.9, s: 1, y: 3.25 }, { z: -11.9, s: -1, y: 3.25 }];
  const SLIDE_RUN = 5.6;
  const PAX_SEEN = 12; //  passengers seen sliding down (the rest went unseen)
  // A light aircraft's door: z along the body, how far out Jay stands.
  const LIGHT = { skylark: { z: 0.6, foot: 1.75, name: 'the plane' }, sparrow: { z: 1.0, foot: 2.1, name: 'the helicopter' } };
  const CREW = { top: 0x1d2a44, shirt: 0xf4f4f1, bottom: 0x1d2a44, trim: 0xf2c61f, cap: false };
  const PILOT = { top: 0x14182a, shirt: 0xf6f6f2, bottom: 0x14182a, trim: 0xd9b23a, cap: true };

  const rnd = (a, b) => a + Math.random() * (b - a);
  const _w = { x: 0, z: 0 };
  const _f = { x: 0, y: 0, z: 0 };

  /** A point in a plane's frame (x port, z forward) in the world. */
  function toWorld(px, pz, yaw, lx, lz, out) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    out.x = px + lx * c + lz * s;
    out.z = pz - lx * s + lz * c;
    return out;
  }

  // ------------------------------------------------------------ runners
  /** One of the crew or a passenger, off the plane: run from it, then slow down, look back and go. */
  class RunBrain {
    constructor(dx, dz, crew) {
      this.dx = dx;
      this.dz = dz;
      this.crew = crew;
      this.t = 0;
      this.runT = rnd(5, 8);
      this.life = rnd(24, 34);
      this.gone = false;
      this.witness = true; // (they tell the police what they saw)
      this.ph = Math.random() * 6;
    }

    update(a, dt) {
      this.t += dt;
      const an = a.anim;
      an.handsUp = an.talk = an.cower = an.aim = an.crouch = 0;
      an.phone = 0;
      a.heading = dampAngle(a.heading, Math.atan2(this.dx, this.dz) + Math.sin(this.t * 0.7 + this.ph) * 0.3, 5, dt);
      if (this.t < this.runT) {
        a.moveSpeed = 4.5 + (a.id % 4) * 0.25;
        an.sprint = true;
        if (this.t < 1.4) an.handsUp = 0.5;
      } else {
        an.sprint = false;
        a.moveSpeed = this.t < this.runT + 8 ? 1.6 : 0.9;
        if (!this.crew && a.id % 3 === 0) an.phone = 1; // phoning home, or filming it
      }
      if (this.t > this.life) this.gone = true;
    }

    expired(a, d) {
      return this.gone || d > 220;
    }
  }

  // ======================================================== the system
  class PlaneSteal {
    constructor(game) {
      this.game = game;
      this.saveKey = 'planeSteal';
      this.n = { airliners: 0, light: 0 };
      this.job = null; //       the steal under way
      this.done = []; //        steals Jay got away with: slides, sliders, the stand kept clear
      this.held = new Map(); // a plane held for him (planes() view or light record) → { t, spent }
      this.near = new Set();
      this.cand = { kind: null, q: null, k: null, side: 1, x: 0, z: 0, v: 0, d: Infinity };
      this.sliders = []; //     { a, J, d, t }: on their way down a slide
      this.descents = []; //    { a, J, t, T, lx0, ... }: the crew coming down the stairs
      this.mine = []; //        { v, idle }: the aircraft he's taken, while they're on the airfield
      this._mineT = 0;
      this.item = null;
      const A = game.airside;
      this.ok = !!(A && A.ok && typeof A.stealTake === 'function' && typeof A.lightPlanes === 'function' && game.vehicles && game.scene);
      if (!this.ok) return;
      const it = game.interaction;
      if (it) {
        it.register({ id: 'plane_steal', kind: 'planeSteal', x: 0, y: -1000, z: 0, radius: USE_R, label: 'Steal the plane', enabled: false });
        this.item = it.items[it.items.length - 1]; // (register copies it: keep the one it holds)
        it.on('planeSteal', () => {
          this._begin();
          return 2;
        });
      }
      this._camera();
      this._slideKit();
      VH.events.on('vehicle:enter', (e) => this._entered(e && e.v));
    }

    /** The aircraft camera keeps out of the terminal (the halls and a few metres over the roof, the jet bridges). */
    _camera() {
      const g = this.game;
      const T = g.world && g.world.terminal;
      const term = g.terminal;
      if (!g.cameraRig || !T || !T.bounds) return;
      const b = T.bounds;
      const top = (T.floorY || 0.45) + 17; // (the roof is 10.5-12.3 up: not just over it either, peering over its edge)
      g.cameraRig.keepOut = (x, y, z) => {
        if (x > b.x0 - 1.5 && x < b.x1 + 1.5 && z > b.z0 - 1.5 && z < b.z1 + 1.5 && y < top) return true;
        return !!(term && term.isInside && y < 9 && term.isInside(x, z, y));
      };
    }

    /** The slides: havoc-air.js's if it's there (the same yellow ramps), else a plain one. */
    _slideKit() {
      const H = this.game.airportHavoc;
      const air = H && H.air;
      if (air && air.slideGeo && air.M && air.M.slide) {
        this.slideGeo = air.slideGeo;
        this.slideMat = air.M.slide;
        return;
      }
      const k = new VH.AircraftKit();
      const len = Math.hypot(SLIDE_RUN, 3.1);
      k.box(1.7, 0.22, len, 0, -1.55, SLIDE_RUN / 2, 0xf2c61f, Math.atan2(3.1, SLIDE_RUN));
      this.slideGeo = k.geometry();
      this.slideMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 });
    }

    // ---------------------------------------------------------- update
    update(dt) {
      if (!this.ok) return;
      const A = this.game.airside;
      if (!A.inited) return;
      dt = Math.min(dt, 0.1);
      if (this.job) this._jobTick(dt);
      if (this.job && this.job.slides && this.job.slides.length) this._slidesTick(this.job, dt);
      if (this.done.length) this._doneTick(dt);
      if (this.descents.length) this._descentsTick(dt);
      if (this.sliders.length) this._slidersTick(dt);
      if (this.mine.length && (this._mineT -= dt) <= 0) this._mineTick(1 - this._mineT);
      this._scan(dt);
    }

    /** Which aircraft Jay is at the door of (the prompt), and which to hold for him. */
    _scan(dt) {
      const g = this.game;
      const A = g.airside;
      const p = g.player;
      const P = p.pos;
      const near = this.near;
      near.clear();
      const c = this.cand;
      c.kind = null;
      c.d = Infinity;
      const free = !this.job && !p.inVehicle && p.state === 'ground' && !p.frozen && !p.isDead && !g.vehicles.entering &&
        P.y < HIGH && P.x > BOX.x0 && P.x < BOX.x1 && P.z > BOX.z0 && P.z < BOX.z1 && !(g.cabin && g.cabin.aboard);
      if (free) {
        for (const q of A.planes()) {
          if (q.disabled || q.gone || !q.model || q.y > 0.5 || q.speed > MAX_V || !GROUND.has(q.state)) continue;
          if (Math.abs(q.x - P.x) > 45 || Math.abs(q.z - P.z) > 45) continue;
          const port = this._portFree(q); // (true, false, or the air stairs at it)
          for (let s = 1; s >= -1; s -= 2) {
            if (s === 1 && !port) continue;
            const truck = s === 1 && port !== true ? port : null;
            if (truck) toWorld(truck.x, truck.z, truck.yaw, 0, TRUCK.foot, _w); // (up the air stairs)
            else toWorld(q.x, q.z, q.yaw, s * ALB.foot, ALB.z, _w);
            const d = Math.hypot(_w.x - P.x, _w.z - P.z);
            if (d < HOLD_R) near.add(q);
            if (d < c.d) this._pick('airliner', q, null, s, q.speed, d, truck);
          }
        }
        for (const L of A.lightPlanes()) {
          const k = L.k;
          if (!this._lightDown(k, L.type)) continue;
          if (Math.abs(k.x - P.x) > 30 || Math.abs(k.z - P.z) > 30) continue;
          const D = LIGHT[L.type];
          for (let s = 1; s >= -1; s -= 2) {
            toWorld(k.x, k.z, k.yaw, s * D.foot, D.z, _w);
            const d = Math.hypot(_w.x - P.x, _w.z - P.z);
            if (d < HOLD_R * 0.6) near.add(k);
            if (d < c.d) this._pick(L.type, null, k, s, k.v || 0, d);
          }
        }
      }
      // Hold the ones he's at (for a while), let go of the rest.
      for (const key of near) {
        let h = this.held.get(key);
        if (!h) {
          h = { t: 0, spent: false };
          this.held.set(key, h);
          A.stealHold(key, true);
        } else if (!h.spent && (h.t += dt) > HOLD_MAX) {
          h.spent = true;
          A.stealHold(key, false);
        }
      }
      for (const [key, h] of this.held) {
        if (near.has(key)) continue;
        if (!h.spent) A.stealHold(key, false);
        this.held.delete(key);
      }
      const it = this.item;
      if (it) {
        it.enabled = !!c.kind && c.d < USE_R + 0.5 && c.v < 0.3;
        if (it.enabled) {
          it.x = c.x;
          it.z = c.z;
          it.y = P.y + 1;
          it.label = 'Steal ' + (c.kind === 'airliner' ? 'the plane' : LIGHT[c.kind].name);
        }
      }
    }

    /** The nearest door so far (at _w). */
    _pick(kind, q, k, side, v, d, truck) {
      const c = this.cand;
      c.kind = kind;
      c.truck = truck || null;
      c.q = q;
      c.k = k;
      c.side = side;
      c.x = _w.x;
      c.z = _w.z;
      c.v = v;
      c.d = d;
    }

    /**
     * Is an airliner's front port door free? true; false with a jet bridge at it (or air stairs
     * on the move); the air stairs standing at it (a remote stand: up those he goes).
     */
    _portFree(q) {
      const A = this.game.airside;
      for (let i = 1; i <= 4; i++) {
        const s = this._stand(i);
        if (s && Math.abs(q.x - s.x) < 6 && Math.abs(q.z - s.z) < 9) return false;
      }
      toWorld(q.x, q.z, q.yaw, ALB.skin + 3, ALB.z, _w);
      for (const w of A.groundVehicles()) {
        if (w.kind === 'stairs' && w.root.visible && Math.abs(w.x - _w.x) < 6 && Math.abs(w.z - _w.z) < 6) {
          return !w.taken && Math.abs(w.v || 0) < 0.2 && Math.abs(w.x - _w.x) < 1.5 && Math.abs(w.z - _w.z) < 1.5 ? w : false;
        }
      }
      return true;
    }

    /** A Skylark or the helicopter standing (or rolling slowly) on the ground. */
    _lightDown(k, type) {
      if (!k || !k.model || k.y > 0.3 || (k.v || 0) > MAX_V) return false;
      if (type === 'sparrow') return k.phase === 'down';
      return k.phase === 'parked' || k.phase === 'taxi' || k.phase === 'taxiin' || k.phase === 'hold' || k.phase === 'landroll';
    }

    // ---------------------------------------------------------- the steal
    _begin() {
      const g = this.game;
      const p = g.player;
      const c = this.cand;
      if (this.job || !c.kind || p.inVehicle || p.frozen || g.vehicles.entering) return;
      if (c.kind === 'airliner') this._beginAirliner(c);
      else this._beginLight(c);
    }

    _beginAirliner(c) {
      const g = this.game;
      const A = g.airside;
      const p = g.player;
      const q = c.q;
      const pax = q.pax || 0;
      const flight = q.flight || null;
      this._release(q);
      const pose = A.stealTake(q);
      if (!pose) return;
      // The flyable one in its place (on the apron: not on the cabin floor, which is still up this frame).
      const y = g.physics.groundHeight(pose.x, pose.z, 1.0);
      const v = g.vehicles.spawn('albatross', pose.x, pose.z, pose.yaw, { color: pose.color, look: pose.cargo ? 'albatrossFreighter' : null, persistent: true, y });
      v.persistent = true;
      v.noEnter = true; // (the steal takes him in)
      v.sleeping = true; // (standing just where the other one stood, jet bridge and all: no physics till he's in)
      this.mine.push({ v, idle: 0 });
      const J = (this.job = {
        kind: 'airliner', v, side: c.side, t: 0, pose, flight, began: false, entered: false, phase: 'open',
        pax: pose.cargo ? 0 : pax, crewN: pose.cargo ? 2 : 4, crewOut: 0, slides: [], group: null, left: 0, stand: pose.on,
        turn: this._mustTurn(pose), fade: 0, rig: null, rd: -1, rs: -1, climbK: 0, walkT: 0,
      });
      p.frozen = true;
      p.heading = Math.atan2(-c.side * Math.cos(pose.yaw), c.side * Math.sin(pose.yaw));
      // The port door as it was (open at a jet bridge, say: vehicles/models/albatross.js's plug door).
      const old = q.plane && q.plane.model && q.plane.model._plug;
      const P = VH.PlugDoor;
      if (P && old && old.door > 0) {
        const port = P.rig(v.model);
        if (port) port.set(old.door, c.side > 0 ? old.stair : 0);
      }
      // Open up: the plug door and its stair on his side (the starboard one mirrored), or failing
      // that the vehicle's own door.
      J.rig = this._rig(v, c.side);
      if (J.rig) J.rig.want('steal', 1, 1);
      else {
        const E = g.vehicles.entry;
        const door = E && E.door ? E.door(v, c.side) : null;
        if (door) door.target = 1;
        VH.events.emit('vehicle:door', { v, open: true });
      }
      if (g.crowd && g.crowd.threat) g.crowd.threat(pose.x, pose.z, 40, 'hijack');
      this._crime('hijack', pose.x, pose.z, 3);
      this.n.airliners++;
      VH.events.emit('notify', { title: 'Hijack!', text: (pose.airline ? 'The ' + pose.airline + ' ' + (pose.cargo ? 'freighter' : 'jet') : 'The jet') + ' is yours. Everyone off!', icon: '✈', tone: 'bad' });
    }

    /** Parked nose in at a stand (it can't back out): it'll be turned round once he's in. */
    _mustTurn(pose) {
      if (!pose.on) return false;
      const st = this._stand(pose.on);
      return !!st && Math.cos(pose.yaw - (st.yaw || 0)) > 0.5;
    }

    _beginLight(c) {
      const g = this.game;
      const A = g.airside;
      const k = c.k;
      // Someone at the controls? (The helicopter on its pad keeps its pilot; a Skylark parked on its spot is empty.)
      const occupied = c.kind === 'sparrow' || k.phase !== 'parked';
      this._release(k);
      const pose = A.takeLight(k);
      if (!pose) return;
      const y = g.physics.groundHeight(pose.x, pose.z, 1.0);
      const v = g.vehicles.spawn(pose.type, pose.x, pose.z, pose.yaw, { color: pose.color, persistent: true, y });
      v.persistent = true;
      if (occupied) v.driver = 'ai';
      if (pose.type === 'sparrow' && occupied) v.rotorRpm = 0.2;
      this.job = { kind: pose.type, v, side: c.side, t: 0, pose, flight: null, began: true, entered: false, stand: null };
      this.mine.push({ v, idle: 0 });
      g.vehicles.beginEnter({ v, side: c.side, x: c.x, z: c.z });
      // (With someone in it, pulling them out is a carjacking already: vehicles.js 'vehicle:jack'.)
      if (!occupied) this._crime('jack', pose.x, pose.z, 1);
      this.n.light++;
    }

    _jobTick(dt) {
      const J = this.job;
      const g = this.game;
      const p = g.player;
      const v = J.v;
      J.t += dt;
      if (v.removed || v.wrecked || p.isDead) {
        this._endJob(false);
        return;
      }
      if (J.entered) {
        if (J.turn) this._turnTick(J, dt);
        else this._endJob(true);
        return;
      }
      if (J.began) {
        // In the vehicles' hands now (entry.js): cut short if he's knocked down, arrested ...
        if (!g.vehicles.entering && !p.inVehicle && J.t > 0.5) this._endJob(false);
        return;
      }
      if (J.rig) this._stepRig(J, dt);
      if (J.t > 0.6 && J.pax > 0 && !J.slid) {
        J.slid = true;
        this._slidesOut(J);
      }
      // An airliner: the door opens and the stair comes down, the crew come down it and run,
      // then up he goes.
      const s = J.side;
      const armed = g.combat && g.combat.playerArmed;
      if (J.phase === 'open' || J.phase === 'crew') {
        // Off to one side of the foot of the stair, waving them out (or covering them).
        const at = v.localToWorld(s * (ALB.foot + 1.3), ALB.z + 2.2, _w);
        const speed = this._walkTo(at.x, at.z, dt, 4);
        const door = v.localToWorld(s * ALB.skin, ALB.z, {});
        p.heading = dampAngle(p.heading, Math.atan2(door.x - p.pos.x, door.z - p.pos.z), 8, dt);
        const wave = Math.sin(J.t * 7);
        p.enterPose = armed || speed > 0.8 ? { w: 0, aim: armed ? 1 : 0, speed } : { w: 1, shoulderR: 2.3 + 0.35 * wave, elbowR: 0.35, shoulderL: 0.4, elbowL: 0.6, lean: -0.05, speed: 0 };
        // The crew: once the stair's down (without the plug door: once the door's open).
        const ready = J.rig ? J.rig.ready || J.t > 4.5 : J.t > 0.9;
        if (ready && J.phase === 'open') {
          J.phase = 'crew';
          J.crewT = J.t;
        }
        if (J.phase === 'crew') {
          if (J.crewOut < J.crewN && J.t > J.crewT + J.crewOut * 0.42) this._crewOut(J, J.crewOut++);
          // The last one's off the stair: his turn.
          const onStair = this.descents.some((D) => D.J === J && D.t < D.T * 0.8);
          if (J.crewOut >= J.crewN && !onStair && J.t > J.crewT + J.crewN * 0.42 + 0.2) {
            J.phase = J.rig ? 'climb' : 'in';
            J.walkT = 0;
          }
        }
        return;
      }
      if (J.phase === 'climb') {
        // To the foot of the stair, then up it and in through the door.
        const P = VH.PlugDoor;
        J.walkT += dt;
        if (J.climbK <= 0) {
          const f = P.stairPoint(0, {});
          const at = v.localToWorld(s * (f.x + 0.45), f.z, _w);
          const speed = this._walkTo(at.x, at.z, dt, 5);
          p.heading = dampAngle(p.heading, v.yaw - s * (PI / 2), 9, dt);
          p.enterPose = { w: 0, aim: armed ? 0.6 : 0, speed: Math.max(speed, 1.2) };
          if (Math.hypot(at.x - p.pos.x, at.z - p.pos.z) < 0.35 || J.walkT > 1.6) J.climbK = 0.001;
          return;
        }
        J.climbK = Math.min(1.25, J.climbK + dt / 1.5);
        const f = P.stairPoint(J.climbK, {});
        const w = v.localToWorld(s * f.x, f.z, _w);
        p.pos.x = w.x;
        p.pos.z = w.z;
        p.pos.y = v.pos.y + f.y;
        p.heading = dampAngle(p.heading, v.yaw - s * (PI / 2), 9, dt);
        p.enterPose = { w: 0, aim: 0, speed: 1.4 };
        if (J.climbK < 1.25) return;
        J.phase = 'in';
      }
      // In: at the controls.
      J.began = true;
      J.t = 0;
      p.enterPose = null;
      v.noEnter = false;
      const at = v.localToWorld(s * (ALB.foot + 0.5), ALB.z, {});
      g.vehicles.beginEnter({ v, side: s, x: at.x, z: at.z });
      // (Up the stair already: straight into the seat; without the plug door, entry.js's way in.)
      if (J.rig && g.vehicles.entering) g.vehicles._finishEnter();
      if (J.turn) v.sleeping = true; // (till it's turned round)
    }

    /** Jay walks (frozen, scripted) toward (x, z); returns his speed for the legs. */
    _walkTo(x, z, dt, rate) {
      const p = this.game.player;
      const k = Math.min(1, dt * rate);
      const d = Math.hypot(x - p.pos.x, z - p.pos.z);
      const step = Math.min(d * k, 4.2 * dt);
      if (d > 1e-4) {
        p.pos.x += ((x - p.pos.x) / d) * step;
        p.pos.z += ((z - p.pos.z) / d) * step;
      }
      return Math.min(3.2, step / Math.max(dt, 1e-3));
    }

    /**
     * The plug door and stair on his side: the model's own (the port door), or for the
     * starboard door (a jet bridge at the port one) the same rig mirrored onto that side.
     */
    _rig(v, side) {
      const P = VH.PlugDoor;
      const m = v.model;
      if (!P || !P.rig || !P.stairPoint || !m || !m.root) return null;
      if (side > 0) return P.rig(m);
      const mirror = new THREE.Group();
      mirror.name = 'starboard door';
      mirror.scale.x = -1;
      (m.body || m.root).add(mirror);
      const rig = P.rig({ root: m.root, body: mirror, paint: m.paint, type: m.type });
      if (rig) rig.mirror = mirror;
      else mirror.removeFromParent();
      return rig;
    }

    /** Animate the rig (unless the vehicle's own owner, entry.js, is doing it already this frame). */
    _stepRig(J, dt) {
      const r = J.rig;
      if (r.door === J.rd && r.stair === J.rs) r.step(dt);
      J.rd = r.door;
      J.rs = r.stair;
    }

    /** Taken from a stand, nose in: turned round under a short fade to face the way out. */
    _turnTick(J, dt) {
      const g = this.game;
      J.fade += dt;
      if (J.fade < dt * 1.5 && g.hud) g.hud.setFade(1, 380);
      if (J.fade > 0.45 && !J.turned) {
        J.turned = true;
        const v = J.v;
        const yaw = v.yaw + PI;
        const x = v.pos.x - Math.sin(v.yaw) * 8;
        const z = v.pos.z - Math.cos(v.yaw) * 8;
        // (The slides and anyone still on them are down by now; the doors shut.)
        this._finishSlides(J);
        if (J.rig) J.rig.set(0, 0);
        const port = v.model && v.model._plug;
        if (port) port.set(0, 0);
        v.place(x, z, yaw, g.physics.groundHeight(x, z, 1.0));
        v.sleeping = false;
        if (g.cameraRig && g.cameraRig.snapToCar) g.cameraRig.snapToCar(v);
      }
      if (J.fade > 0.6) {
        if (g.hud) g.hud.setFade(0, 650);
        this._endJob(true);
      }
    }

    /** He's in (vehicles.js 'vehicle:enter'): at the controls. */
    _entered(v) {
      const J = this.job;
      if (!J || J.v !== v) return;
      const g = this.game;
      J.entered = true;
      J.fade = 0;
      if (J.rig) J.rig.want('steal', 0, 0); // (the stair folds up, the door shuts)
      if (g.cameraRig && g.cameraRig.snapToCar) g.cameraRig.snapToCar(v);
      if (g.achievements && g.achievements.unlock) g.achievements.unlock('self_checkin');
      VH.events.emit('planesteal:taken', { v, kind: J.kind, flight: J.flight, x: v.pos.x, z: v.pos.z });
      if (J.kind === 'airliner') VH.events.emit('notify', { title: 'Captain speaking', text: 'W for power, A and D to steer, Space to lift the nose. Find the runway!', icon: '✈' });
    }

    _endJob(ok) {
      const J = this.job;
      const g = this.game;
      this.job = null;
      const p = g.player;
      if (!J.began || ok) p.enterPose = null;
      if (!J.began) p.frozen = false;
      if (J.v && !J.v.removed) J.v.noEnter = false;
      if (J.turn && !J.turned && g.hud) g.hud.setFade(0, 300);
      if (J.rig) J.rig.want('steal', 0, 0);
      // Its slides, its stand kept clear: looked after till he's away.
      this.done.push(J);
    }

    // ------------------------------------------------- the crew and passengers
    /** One of the crew out of the door and down the stairs (pilots first). */
    _crewOut(J, i) {
      const g = this.game;
      if (!g.crowd || !g.crowd.spawn) return;
      const v = J.v;
      const s = J.side;
      const pilot = i < 2;
      const L = VH.Crowd && VH.Crowd.randomLook ? VH.Crowd.randomLook() : {};
      Object.assign(L, pilot ? PILOT : CREW);
      const w = v.localToWorld(s * (ALB.skin - 0.6), ALB.z, {});
      const a = g.crowd.spawn(w.x, w.z, { look: L, persistent: true, role: 'evacuee', name: pilot ? (i === 0 ? 'Captain' : 'First officer') : 'Cabin crew', heading: v.yaw + s * PI / 2, y: v.pos.y + ALB.sill });
      a.held = { x: w.x, y: v.pos.y + ALB.sill, z: w.z, heading: a.heading };
      // (Down the stair at a hurry: about a second and a quarter from the door to the ground.)
      this.descents.push({ a, J, t: 0, T: J.rig ? 1.25 : 1.05, i });
    }

    _descentsTick(dt) {
      const g = this.game;
      for (let i = this.descents.length - 1; i >= 0; i--) {
        const D = this.descents[i];
        const a = D.a;
        const v = D.J.v;
        D.t += dt;
        if (a.removed || a.dead || v.removed) {
          a.held = null;
          this.descents.splice(i, 1);
          continue;
        }
        const s = D.J.side;
        const k = Math.min(1, D.t / D.T);
        let w;
        let y;
        if (D.J.rig && VH.PlugDoor) {
          // Out of the door and down the stair, tread by tread (1.25: a step inside .. 0: the foot).
          const f = VH.PlugDoor.stairPoint(1.25 * (1 - k), _f);
          w = v.localToWorld(s * f.x, f.z, _w);
          y = v.pos.y + f.y;
        } else {
          // Out through the door, then down (a little aft, away from Jay at the foot).
          const out = smoothstep(0, 0.25, k);
          const down = smoothstep(0.2, 1, k);
          w = v.localToWorld(s * (ALB.skin - 0.6 + 0.8 * out + (ALB.foot - ALB.skin - 0.2) * down), ALB.z - 0.6 * down, _w);
          y = v.pos.y + ALB.sill * (1 - down);
        }
        a.held = { x: w.x, y, z: w.z, heading: v.yaw + s * PI / 2 };
        a.anim.handsUp = g.combat && g.combat.playerArmed ? 1 : 0;
        a.anim.sprint = false;
        if (k >= 1) {
          a.held = null;
          a.pos.y = g.physics.groundHeight(w.x, w.z, v.pos.y + 1);
          // Away from the plane, aft (Jay's at the front), the pilots one way, the cabin crew a little wider.
          const ox = s * Math.cos(v.yaw);
          const oz = -s * Math.sin(v.yaw);
          const fx = Math.sin(v.yaw);
          const fz = Math.cos(v.yaw);
          const back = D.i % 2 ? 0.9 : 0.5;
          a.brain = new RunBrain(ox - fx * back, oz - fz * back, true);
          this.descents.splice(i, 1);
        }
      }
    }

    /** Out with the slides at the other doors (not his, not one at a jet bridge). */
    _slidesOut(J) {
      const g = this.game;
      const v = J.v;
      const grp = (J.group = new THREE.Group());
      grp.name = 'evacuation slides';
      v.model.root.add(grp);
      const bridge = !!J.stand && !String(J.stand).startsWith('R');
      for (const d of SLIDES) {
        if (d.z > 0 && d.s === J.side) continue; // his door
        if (d.z > 0 && d.s === 1 && bridge) continue; // the bridge's
        const m = new THREE.Mesh(this.slideGeo, this.slideMat);
        m.position.set(d.s * 2.0, d.y, d.z);
        m.rotation.y = d.s * (PI / 2);
        m.scale.set(0.2, 0.05, 0.05);
        m.castShadow = true;
        grp.add(m);
        J.slides.push({ d, m, k: 0, next: rnd(1.0, 1.6) });
      }
      J.left = J.pax;
      J.seen = 0;
      this._whoosh(v.pos.x, v.pos.z);
    }

    /** The slides inflate, then everyone slides down (a dozen seen, the rest unseen), two or so a second from each. */
    _slidesTick(J, dt) {
      for (const sl of J.slides) {
        if (J.deflate) {
          sl.k = Math.max(0, sl.k - dt * 1.4);
          sl.m.scale.set(Math.max(0.2, sl.k), Math.max(0.05, sl.k), Math.max(0.05, sl.k));
          continue;
        }
        if (sl.k < 1) {
          sl.k = Math.min(1, sl.k + dt / 1.2);
          const a = Math.min(1, sl.k * 1.6);
          const b = clamp((sl.k - 0.3) / 0.7, 0, 1);
          sl.m.scale.set(lerp(0.3, 1, b), lerp(0.08, 1, b), lerp(0.08, 1, a));
          continue;
        }
        if (J.left <= 0) continue;
        sl.next -= dt;
        if (sl.next > 0) continue;
        sl.next = rnd(0.3, 0.5);
        // (the rest go down unseen, a few at a time)
        J.left -= J.seen < PAX_SEEN ? 1 : Math.max(1, Math.round(J.pax / 30));
        if (J.seen < PAX_SEEN) this._slideDown(J, sl.d);
      }
      if (J.deflate && J.slides.every((sl) => sl.k <= 0)) this._dropSlides(J);
    }

    _slideDown(J, d) {
      const g = this.game;
      if (!g.crowd || !g.crowd.spawn) return;
      J.seen++;
      const v = J.v;
      const top = v.localToWorld(d.s * 2.3, d.z, {});
      const L = VH.Crowd && VH.Crowd.randomLook ? VH.Crowd.randomLook() : undefined;
      const a = g.crowd.spawn(top.x, top.z, { look: L, persistent: true, role: 'evacuee', name: 'Passenger', heading: v.yaw + d.s * PI / 2, y: v.pos.y + d.y });
      a.held = { x: top.x, y: v.pos.y + d.y + 0.15, z: top.z, heading: a.heading };
      this.sliders.push({ a, J, d, t: 0 });
    }

    _slidersTick(dt) {
      const g = this.game;
      for (let i = this.sliders.length - 1; i >= 0; i--) {
        const S = this.sliders[i];
        const a = S.a;
        const v = S.J.v;
        S.t += dt;
        if (a.removed || a.dead || v.removed) {
          a.held = null;
          this.sliders.splice(i, 1);
          continue;
        }
        const k = Math.min(1, S.t / 1.05);
        const e = k * k * (1.6 - 0.6 * k); // (slow off the sill, then away)
        const w = v.localToWorld(S.d.s * (2.3 + (SLIDE_RUN + 0.6) * e), S.d.z, _w);
        const y = v.pos.y + lerp(S.d.y + 0.15, 0.25, e);
        a.held = { x: w.x, y, z: w.z, heading: a.heading };
        a.anim.crouch = 0.75;
        if (k >= 1) this._landed(S, i, w);
      }
    }

    /** Down: off and running, away from the plane. */
    _landed(S, i, w) {
      const g = this.game;
      const a = S.a;
      const v = S.J.v;
      a.held = null;
      a.anim.crouch = 0;
      a.pos.y = g.physics.groundHeight(w.x, w.z, v.pos.y + 1);
      const ox = S.d.s * Math.cos(v.yaw);
      const oz = -S.d.s * Math.sin(v.yaw);
      const back = S.d.z > 0 ? 0.4 : -0.5;
      a.brain = new RunBrain(ox + Math.sin(v.yaw) * back, oz + Math.cos(v.yaw) * back, false);
      this.sliders.splice(i, 1);
    }

    /** Everyone still on a slide is down; the slides go (a fade covers it). */
    _finishSlides(J) {
      for (let i = this.sliders.length - 1; i >= 0; i--) {
        const S = this.sliders[i];
        if (S.J !== J) continue;
        this._landed(S, i, S.J.v.localToWorld(S.d.s * (2.3 + SLIDE_RUN + 0.6), S.d.z, {}));
      }
      J.left = 0;
      this._dropSlides(J);
    }

    /** Done with the door: the mirrored one goes, the model's own is left to its owner. */
    _dropRig(J) {
      const r = J.rig;
      J.rig = null;
      if (!r) return;
      r.drop('steal');
      if (r.mirror) {
        if (r.dispose) r.dispose();
        r.mirror.removeFromParent();
      }
    }

    _dropSlides(J) {
      if (J.group) J.group.removeFromParent();
      J.group = null;
      J.slides = [];
    }

    /**
     * After a steal: the slides (until everyone's down, and they go once he's moving), and the
     * stand he took it from kept clear until he's taken it well away.
     */
    _doneTick(dt) {
      const A = this.game.airside;
      for (let i = this.done.length - 1; i >= 0; i--) {
        const J = this.done[i];
        const v = J.v;
        if (J.slides && J.slides.length) {
          if (!J.deflate && (v.removed || v.speed > 1.5 || (J.left <= 0 && J.t > 12))) J.deflate = true;
          this._slidesTick(J, dt);
        }
        J.t += dt;
        if (J.rig) {
          const r = J.rig;
          if (!v.removed) this._stepRig(J, dt);
          if (v.removed || (r.door <= 0 && r.stair <= 0)) this._dropRig(J);
        }
        if (J.stand) {
          const st = this._stand(J.stand);
          if (!st || v.removed || v.wrecked || Math.hypot(v.pos.x - st.x, v.pos.z - st.z) > 70) {
            A.stealFree(J.stand);
            J.stand = null;
          }
        }
        if (!J.stand && !(J.slides && J.slides.length) && !J.rig) this.done.splice(i, 1);
      }
    }

    /**
     * The aircraft he's taken and left standing about the airfield (on a taxiway, the runway,
     * a stand: in everyone's way): towed off once he's been gone from it half a minute and
     * nobody's looking. (Left anywhere else, it's a vehicle like any other.)
     */
    _mineTick(dt) {
      this._mineT = 1;
      const g = this.game;
      const V = g.vehicles;
      const p = g.player;
      const J = p.inVehicle && p.vehicle ? p.vehicle.pos : p.pos;
      for (let i = this.mine.length - 1; i >= 0; i--) {
        const m = this.mine[i];
        const v = m.v;
        const q = v.pos;
        if (v.removed) {
          this.mine.splice(i, 1);
          continue;
        }
        const on = q.x > BOX.x0 && q.x < BOX.x1 && q.z > BOX.z0 && q.z < BOX.z1 && !v.flying;
        if (!on || p.vehicle === v || V.entering || (this.job && this.job.v === v)) {
          m.idle = 0;
          continue;
        }
        m.idle += dt;
        const d = Math.hypot(J.x - q.x, J.z - q.z);
        // On the runway it shuts the airport (airside holds everything for it): after a
        // minute it's towed off even while he watches from afar.
        const rwy = q.x > RWY.x0 - 80 && q.x < RWY.x1 + 80 && Math.abs(q.z - RWY.z) < RWY.w / 2 + 12;
        const seen = d < 380 && (d < 60 || g.isVisible(q.x, 4, q.z, Math.max(6, v.hz || 6)));
        if (m.idle < 30 || (seen && !(rwy && m.idle >= 60 && d >= 100))) continue;
        if (V.lastPlayerCar === v) V.lastPlayerCar = null;
        V.remove(v);
        this.mine.splice(i, 1);
      }
    }

    // ------------------------------------------------------------ helpers
    /** A stand (contact 1..4 or remote 'R1'..'R3'): { id, x, z, yaw } (they don't move). */
    _stand(id) {
      const A = this.game.airside;
      if (!this._stands) this._stands = A.stands().concat(A.remoteStands()).map((s) => ({ id: s.id, x: s.x, z: s.z, yaw: s.yaw || 0 }));
      return this._stands.find((s) => s.id === id) || null;
    }

    /** The slides going out: a rush of air (as havoc-air.js's). */
    _whoosh(x, z) {
      const g = this.game;
      const au = g.audio;
      const fb = g.vehicleFeedback;
      if (!au || !au.ready || !au.ctx || !au._wBus || !fb) return;
      try {
        const gain = fb._gain(x, z, 30);
        if (gain < 0.03) return;
        const bus = au._wBus({ pan: fb._pan(x, z), gain, verb: 0.15, life: 2.5 });
        au._wHit({ t: au.ctx.currentTime, type: 'lowpass', freq: 700, peak: 0.3, attack: 0.08, decay: 1.2, bus });
      } catch (err) {
        /* no sound */
      }
    }

    _release(key) {
      const h = this.held.get(key);
      if (h && !h.spent) this.game.airside.stealHold(key, false);
      this.held.delete(key);
    }

    /** A crime with at least `stars` (a hijack: three, whoever saw it). */
    _crime(kind, x, z, stars) {
      const g = this.game;
      const pol = g.police;
      if (!pol || (g.missions && g.missions.suppressHeat)) return;
      pol.crime(kind, x, z);
      if (stars >= 3) {
        if (pol.level < stars) pol.setLevel(stars, kind);
        if (pol._sawPlayer) pol._sawPlayer();
        if (pol._dispatch) pol._dispatch('report', { kind, x, z, heat: stars });
      }
    }

    // ---------------------------------------------------------- lifecycle
    _clearAll() {
      this.mine = [];
      const g = this.game;
      if (this.job) {
        const J = this.job;
        this.job = null;
        if (!J.began) {
          g.player.frozen = false;
          g.player.enterPose = null;
        }
        if (J.turn && g.hud) g.hud.setFade(0, 0);
        this._dropSlides(J);
        this._dropRig(J);
        if (J.stand && g.airside) g.airside.stealFree(J.stand);
      }
      for (const J of this.done) {
        this._dropSlides(J);
        this._dropRig(J);
        if (J.stand && g.airside) g.airside.stealFree(J.stand);
      }
      this.done = [];
      for (const D of this.descents) D.a.held = null;
      for (const S of this.sliders) S.a.held = null;
      this.descents = [];
      this.sliders = [];
      for (const [key, h] of this.held) if (!h.spent && g.airside) g.airside.stealHold(key, false);
      this.held.clear();
      if (this.item) this.item.enabled = false;
    }

    reset() {
      if (!this.ok) return;
      this._clearAll();
    }

    stop() {
      if (!this.ok) return;
      this._clearAll();
    }

    blips() {}

    stats() {
      const n = this.n.airliners + this.n.light;
      return n > 0 ? [['Aircraft stolen from the ground', String(n)]] : [];
    }

    serialize() {
      return { airliners: this.n.airliners, light: this.n.light };
    }

    load(d) {
      this.n.airliners = d && typeof d.airliners === 'number' ? d.airliners : 0;
      this.n.light = d && typeof d.light === 'number' ? d.light : 0;
    }
  }

  VH.PlaneSteal = PlaneSteal;
})();
