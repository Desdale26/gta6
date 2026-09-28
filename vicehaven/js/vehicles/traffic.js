/*
 * traffic.js — AI drivers and the traffic that fills the streets.
 *
 * LaneDriver is the brain every AI car shares. It follows a queue of road
 * pieces (roadnet.js) by pure pursuit, picks a turn at each junction, keeps
 * its distance with the Intelligent Driver Model, stops at red lights, and
 * reacts when it gets hit. Police and racers use the same driver with a
 * destination, which makes it pick the turn that heads toward a target
 * instead of a random one.
 *
 * TrafficSystem keeps a density of cars around Jay: it spawns them on lanes
 * out of view, 70–200 m away, and removes them when they are far off and
 * unseen.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, smoothstep } = VH.math;
  const RoadNet = () => VH.RoadNet;

  const TRAFFIC_TYPES = [
    ['halcyon', 28], ['pipit', 16], ['cab', 10], ['mesa', 9], ['porter', 8], ['tern', 9], ['ironclad', 5],
    ['vireo', 3], ['sovereign', 3], ['hauler', 5], ['beater', 4], ['drifter', 2], ['lowrider', 2], ['zephyr', 1],
  ];

  class LaneDriver {
    constructor(sys, opts) {
      opts = opts || {};
      this.sys = sys;
      this.net = sys.net;
      this.pieces = [];
      this.t = 0;
      this.speedMul = opts.speedMul || 0.82 + Math.random() * 0.26;
      this.gap = opts.gap || 1.6 + Math.random() * 0.8; // time headway (s)
      this.obeySignals = opts.obeySignals !== false;
      this.destination = null; // { x, z } → turns head toward it
      this.state = 'drive'; // drive | shaken | stuck
      this._stateT = 0;
      this._sense = 0;
      this._blockedBy = null;
      this._gapAhead = Infinity;
      this._speedAhead = 0;
      this._stuckT = 0;
      this._honkT = 0;
      this._reverseT = 0;
      this.maxSpeed = opts.maxSpeed || null;
      this.aggressive = !!opts.aggressive;
      this.ignoreRed = !!opts.ignoreRed;
    }

    /** Start on a lane position { road, dir, lane, along }. */
    initAt(lp) {
      this.pieces.length = 0;
      const j = this.net.nextJunction(lp.road, lp.dir, lp.along);
      const end = j ? RoadNet().edges(lp.road, lp.dir, j).enter : lp.dir > 0 ? lp.road.to : lp.road.from;
      const piece = this.net.linePiece(lp.road, lp.dir, lp.lane, lp.along, end);
      piece.endJunction = j;
      this.pieces.push(piece);
      this.t = 0;
      this._fill();
    }

    /** Re-acquire the nearest lane (after being knocked off the road). */
    reacquire(v) {
      const lp = this.net.nearestLane(v.pos.x, v.pos.z, v.yaw);
      if (!lp) return false;
      // Start a little ahead so the target isn't behind us.
      lp.along = clamp(lp.along + lp.dir * 4, lp.road.from, lp.road.to);
      this.initAt(lp);
      return true;
    }

    _chooseExit(road, dir, j) {
      const exits = this.net.exits(road, dir, j);
      if (!exits.length) return null;
      if (this.destination) {
        // Head for the target: the exit whose far side is closest to it.
        let best = exits[0];
        let bestD = Infinity;
        for (const e of exits) {
          const p = this.net.lanePoint(e.road, e.dir, 0, RoadNet().edges(e.road, e.dir, j).exit + e.dir * 60);
          const d = Math.hypot(p.x - this.destination.x, p.z - this.destination.z) + (e.turn === 'straight' ? 0 : 6);
          if (d < bestD) {
            bestD = d;
            best = e;
          }
        }
        return best;
      }
      const w = { straight: 0.58, right: 0.24, left: 0.18 };
      let total = 0;
      for (const e of exits) total += w[e.turn];
      let r = Math.random() * total;
      for (const e of exits) {
        r -= w[e.turn];
        if (r <= 0) return e;
      }
      return exits[0];
    }

    /** Keep a few pieces of road queued ahead. */
    _fill() {
      let guard = 0;
      while (this.pieces.length < 4 && guard++ < 8) {
        const last = this.pieces[this.pieces.length - 1];
        if (last.type === 'line' && !last.junction) {
          const j = last.endJunction;
          if (!j) return; // end of the road
          const exit = this._chooseExit(last.road, last.dir, j);
          if (!exit) return;
          const turn = this.net.turnPiece(last.road, last.dir, last.lane, j, exit);
          turn.signal = j.signal ? RoadNet().signalGroup(last.road) : null;
          this.pieces.push(turn);
        } else {
          // After a junction: the straight run to the next one.
          const road = last.road;
          const dir = last.dir;
          const lane = clamp(last.nextLane !== undefined ? last.nextLane : last.lane, 0, road.lanesPerDirection - 1);
          const start = RoadNet().edges(road, dir, last.junction).exit;
          const j = this.net.nextJunction(road, dir, start + dir * 0.5);
          const end = j ? RoadNet().edges(road, dir, j).enter : dir > 0 ? road.to : road.from;
          const piece = this.net.linePiece(road, dir, lane, start, end);
          piece.endJunction = j;
          this.pieces.push(piece);
        }
      }
    }

    /** Point `dist` metres ahead of the current progress along the queue. */
    _ahead(dist, out) {
      let i = 0;
      let t = this.t;
      let remaining = dist;
      while (i < this.pieces.length) {
        const p = this.pieces[i];
        const left = (1 - t) * p.length;
        if (remaining <= left || i === this.pieces.length - 1) {
          const tt = p.length > 0 ? Math.min(1, t + remaining / p.length) : 1;
          return RoadNet().pointOn(p, tt, out);
        }
        remaining -= left;
        i++;
        t = 0;
      }
      return RoadNet().pointOn(this.pieces[this.pieces.length - 1], 1, out);
    }

    onBump(v, other, speed) {
      if (speed < 2.5) return;
      this.state = 'shaken';
      this._stateT = 1.2 + Math.random() * 1.5;
      if (other && other.driver === 'player' && Math.random() < 0.7) this._honkT = 0.5 + Math.random() * 0.6;
    }

    onJacked() {
      return null;
    }

    update(v, dt) {
      if (!this.pieces.length) {
        if (!this.reacquire(v)) {
          v.input.accel = -0.5;
          return;
        }
      }
      // Progress along the current piece.
      let p = this.pieces[0];
      this.t = RoadNet().project(p, v.pos.x, v.pos.z, this.t);
      while (this.t > 0.985 && this.pieces.length > 1) {
        this.pieces.shift();
        p = this.pieces[0];
        this.t = RoadNet().project(p, v.pos.x, v.pos.z, 0);
      }
      this._fill();
      if (this.t > 0.985 && this.pieces.length === 1) {
        // The end of the line (a road out of town): stop.
        v.input.accel = v.speed > 0.5 ? -1 : 0;
        v.input.steer = 0;
        this.atEnd = true;
        return;
      }

      // Off the path (knocked sideways, or bumped onto the pavement)?
      const here = RoadNet().pointOn(p, this.t, this._tmp || (this._tmp = {}));
      const off = Math.hypot(here.x - v.pos.x, here.z - v.pos.z);
      if (off > 9) {
        this.reacquire(v);
        return;
      }

      // Steering: pure pursuit on a point ahead.
      const speed = Math.max(0, v.vF);
      const look = 3.2 + speed * 0.5;
      const target = this._ahead(look, this._tmp2 || (this._tmp2 = {}));
      const l = v.worldToLocal(target.x, target.z, this._tmp3 || (this._tmp3 = {}));
      const d2 = l.x * l.x + l.z * l.z;
      const curvature = d2 > 0.01 ? (2 * l.x) / d2 : 0;
      const angle = Math.atan(v.wheelbase * curvature);
      const lock = lerp(0.62, 0.15, smoothstep(4, 46, Math.abs(v.vF))) * v.tune.steer;
      let steer = clamp(angle / Math.max(0.05, lock), -1, 1);

      // Speed: the limit, slowing for bends and red lights, and IDM behind whatever is ahead.
      let desired = p.limit * this.speedMul;
      if (this.maxSpeed) desired = Math.min(desired, this.maxSpeed);
      const next = this.pieces[1];
      const distToEnd = (1 - this.t) * p.length;
      if (next && next.type === 'curve') {
        // Brake ahead of a turn.
        const vTurn = next.limit;
        const brakeDist = Math.max(0, (speed * speed - vTurn * vTurn) / (2 * 4.5));
        if (distToEnd < brakeDist + 6) desired = Math.min(desired, lerp(vTurn, desired, clamp((distToEnd - 6) / (brakeDist + 1), 0, 1)));
      }
      let stopDist = Infinity;
      if (this.obeySignals && !this.ignoreRed && next && next.signal && p.type === 'line') {
        const state = this.sys.world.signalState[next.signal];
        const toLine = distToEnd - RoadNet().STOP_BACK - v.hz;
        if (state !== 'green' && toLine > -0.5) {
          const canStop = toLine > (speed * speed) / (2 * 6.5);
          if (state === 'red' || canStop) stopDist = Math.max(0.01, toLine);
        }
      }

      // Sense what's ahead (4 times a second; staggered).
      this._sense -= dt;
      if (this._sense <= 0) {
        this._sense = 0.12 + Math.random() * 0.06;
        this._senseAhead(v, speed);
      }
      let gap = Math.min(this._gapAhead, stopDist);
      const vLead = this._gapAhead <= stopDist ? this._speedAhead : 0;

      // Intelligent Driver Model.
      const a = 2.2 * (this.aggressive ? 1.6 : 1);
      const b = 3.2;
      const s0 = 2.2;
      const T = this.aggressive ? 0.9 : this.gap;
      const dv = speed - vLead;
      const sStar = s0 + Math.max(0, speed * T + (speed * dv) / (2 * Math.sqrt(a * b)));
      let acc = a * (1 - Math.pow(speed / Math.max(1, desired), 4));
      if (gap < 60) acc -= a * Math.pow(sStar / Math.max(0.3, gap), 2);
      if (this.state === 'shaken') {
        this._stateT -= dt;
        acc = Math.min(acc, -3);
        if (this._stateT <= 0) this.state = 'drive';
      }

      // Stuck (blocked for ages, or wedged against a wall): back up and try again.
      if (speed < 0.6 && acc > 0.5) this._stuckT += dt;
      else this._stuckT = Math.max(0, this._stuckT - dt * 2);
      if (this._reverseT > 0) {
        this._reverseT -= dt;
        v.input.accel = -0.7;
        v.input.steer = -steer;
        v.input.handbrake = 0;
        return;
      }
      if (this._stuckT > (this._gapAhead < 8 ? 7 : 2.5)) {
        this._stuckT = 0;
        this._reverseT = 1.4;
      }

      // Honk at whoever blocks us for a while.
      if (this._blockedBy && this._blockedBy.driver === 'player' && speed < 1 && Math.random() < dt * 0.4) this._honkT = 0.35 + Math.random() * 0.4;
      if (this._honkT > 0) {
        this._honkT -= dt;
        v.horn = true;
      } else v.horn = false;

      v.input.steer = steer;
      v.input.handbrake = 0;
      if (acc >= 0) v.input.accel = clamp(acc / (v.accelG * 9.81 * 0.55), 0, 1);
      else v.input.accel = clamp(acc / 6.5, -1, 0);
      if (speed < 0.3 && acc < 0) v.input.accel = 0;
      if (speed < 0.3 && gap < 3) {
        v.input.accel = 0;
        v.input.handbrake = 1;
      }
    }

    /** Nearest obstacle along the path ahead: cars, Jay on foot, pedestrians on the road. */
    _senseAhead(v, speed) {
      const reach = Math.min(48, 10 + speed * 2.4);
      let best = Infinity;
      let bestSpeed = 0;
      let blocker = null;
      const pt = this._tmp4 || (this._tmp4 = {});
      const list = this.sys.vehicles.list;
      const player = this.sys.game.player;
      const crowd = this.sys.game.crowd;
      for (let s = 2; s <= reach; s += 2.6) {
        this._ahead(s, pt);
        for (const o of list) {
          if (o === v) continue;
          const dx = o.pos.x - pt.x;
          const dz = o.pos.z - pt.z;
          const r = o.hx + 1.1;
          if (dx * dx + dz * dz > (o.hz + r) * (o.hz + r)) continue;
          const lo = o.worldToLocal(pt.x, pt.z, this._tmp5 || (this._tmp5 = {}));
          if (Math.abs(lo.x) > o.hx + 1.0 || Math.abs(lo.z) > o.hz + 0.6) continue;
          const gap = s - v.hz - Math.max(0, o.hz - Math.abs(lo.z)) - 0.3;
          if (gap < best) {
            best = gap;
            // Speed of the obstacle along our path.
            bestSpeed = Math.max(0, o.vel.x * Math.sin(pt.heading) + o.vel.z * Math.cos(pt.heading));
            blocker = o;
          }
        }
        if (player && !player.inVehicle && player.state !== 'dead') {
          const dx = player.pos.x - pt.x;
          const dz = player.pos.z - pt.z;
          if (dx * dx + dz * dz < 2.2 && Math.abs(player.pos.y - v.pos.y) < 1.5) {
            const gap = s - v.hz - 0.8;
            if (gap < best) {
              best = gap;
              bestSpeed = 0;
              blocker = { driver: 'player' };
            }
          }
        }
        if (crowd && crowd.blockingPoint && crowd.blockingPoint(pt.x, pt.z, 1.3)) {
          const gap = s - v.hz - 0.8;
          if (gap < best) {
            best = gap;
            bestSpeed = 0;
          }
        }
        if (best < s) break;
      }
      this._gapAhead = best;
      this._speedAhead = bestSpeed;
      this._blockedBy = blocker;
    }
  }

  function weightedPick(list) {
    const ok = list.filter(([id]) => VH.Vehicle.typeSpec(id));
    let total = 0;
    for (const [, w] of ok) total += w;
    let r = Math.random() * total;
    for (const [id, w] of ok) {
      r -= w;
      if (r <= 0) return id;
    }
    return ok[0][0];
  }

  class TrafficSystem {
    constructor(game) {
      this.game = game;
      this.vehicles = game.vehicles;
      this.net = game.roadnet;
      this.world = game.world;
      this.settings = game.settings;
      this._timer = 0;
      this.enabled = true;
      this.densityScale = 1;
      this._rng = Math.random;
    }

    get targetCount() {
      const q = this.settings.get('graphics.quality');
      const base = q === 'low' ? 10 : q === 'medium' ? 15 : q === 'ultra' ? 26 : 20;
      const night = this.game.environment.nightFactor || 0;
      return Math.round(base * this.densityScale * (1 - night * 0.3));
    }

    /** Make a car into AI traffic at a lane position. */
    spawnAt(lp, type) {
      const v = this.vehicles.spawn(type || weightedPick(TRAFFIC_TYPES), lp.x, lp.z, lp.heading, { role: 'traffic' });
      v.role = 'traffic';
      v.driver = 'ai';
      v.controller = new LaneDriver(this);
      v.controller.initAt(lp);
      v.setSpeed(lp.road.speedLimit * 0.75);
      return v;
    }

    update(dt, focus) {
      this._timer -= dt;
      if (this._timer > 0) return;
      this._timer = 0.4;
      const list = this.vehicles.list;
      let count = 0;
      const last = this.vehicles.lastPlayerCar;
      for (let i = list.length - 1; i >= 0; i--) {
        const v = list[i];
        if (v.persistent || v === last || v.driver === 'player') continue;
        const traffic = v.role === 'traffic' || v.role === 'abandoned' || v.role === 'wreck';
        if (!traffic) continue;
        const d = Math.hypot(v.pos.x - focus.x, v.pos.z - focus.z);
        const seen = this.game.isVisible(v.pos.x, v.pos.y + 1, v.pos.z, 3);
        const tooFar = d > 270 || (d > 170 && !seen);
        const dead = (v.wrecked && d > 60 && !seen) || (v.controller && v.controller.atEnd && !seen && d > 40);
        if (tooFar || dead) {
          this.vehicles.remove(v);
          continue;
        }
        if (v.role === 'traffic') count++;
      }
      if (!this.enabled) return;
      const want = this.targetCount;
      let spawned = 0;
      while (count < want && spawned < 3) {
        const lp = this.net.randomLanePoint(this._rng, focus.x, focus.z, 70, 200);
        if (!lp) break;
        spawned++;
        if (this.game.isVisible(lp.x, 1, lp.z, 4) && Math.hypot(lp.x - focus.x, lp.z - focus.z) < 150) continue;
        let clear = true;
        for (const v of list) {
          if (Math.hypot(v.pos.x - lp.x, v.pos.z - lp.z) < 14) {
            clear = false;
            break;
          }
        }
        if (!clear) continue;
        this.spawnAt(lp);
        count++;
      }
    }
  }

  TrafficSystem.TYPES = TRAFFIC_TYPES;
  VH.LaneDriver = LaneDriver;
  VH.TrafficSystem = TrafficSystem;
})();
