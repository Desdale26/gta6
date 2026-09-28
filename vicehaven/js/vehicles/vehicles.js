/*
 * vehicles.js — every car in the city, and Jay's relationship with them.
 *
 *   spawning      traffic, police and mission cars are spawned by their
 *                 systems through spawn(); parked cars are streamed in
 *                 from kerbside parking spots around Jay
 *   collisions    car vs city (in vehicle.js via collideStatic), car vs
 *                 car (oriented boxes, impulses with spin), car vs Jay
 *   street props  benches, bins, bollards, hydrants, barriers and lamp
 *                 posts get knocked flying instead of stopping the car
 *   Jay           entering (F) empty cars, pulling drivers out of occupied
 *                 ones, driving (W/S/A/D, Space handbrake, Shift nitro),
 *                 bailing out, standing on roofs
 *   nitro         a meter that fills from drifting, near misses and
 *                 airtime, and empties while boosting
 *
 * It emits events other systems react to (police, pedestrians, audio, HUD):
 *   vehicle:enter { v, jacked }   vehicle:exit { v }
 *   vehicle:impact { v, other, speed, x, y, z }   vehicle:smash { v, type }
 *   vehicle:land { v, impact, airTime }   vehicle:explode { v }
 *   vehicle:nearMiss { v, other }   player:hitByCar { v, speed }
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, smoothstep } = VH.math;

  /** Street furniture a car ploughs through: minimum speed, speed kept, car damage. */
  const SMASH = {
    bench: { speed: 3, keep: 0.9, dmg: 8 },
    bin: { speed: 2, keep: 0.95, dmg: 3 },
    hydrant: { speed: 4, keep: 0.82, dmg: 25, water: true },
    bollard: { speed: 5, keep: 0.8, dmg: 20 },
    planter: { speed: 6, keep: 0.72, dmg: 35 },
    barrier: { speed: 4, keep: 0.85, dmg: 12 },
    streetlight: { speed: 8, keep: 0.72, dmg: 45, pole: true },
  };

  const PARKED_TYPES = [
    ['halcyon', 38], ['pipit', 20], ['mesa', 12], ['porter', 9], ['ironclad', 8], ['vireo', 5], ['cab', 5],
  ];

  function weightedPick(list, r) {
    let total = 0;
    for (const [, w] of list) total += w;
    let x = r * total;
    for (const [id, w] of list) {
      x -= w;
      if (x <= 0) return id;
    }
    return list[0][0];
  }

  class VehicleSystem {
    constructor(game) {
      this.game = game;
      this.scene = game.scene;
      this.physics = game.physics;
      this.world = game.world;
      this.net = game.roadnet;
      this.settings = game.settings;
      this.list = [];
      this.time = 0;
      this.nitro = 0.6;
      this.player = game.player;
      this.entering = null;
      this._hits = [];
      this._nearMiss = new Map();
      this._streamTimer = 0;
      this._tmp = { x: 0, z: 0 };
      this._tmp2 = { x: 0, z: 0 };
      this.voices = new Map(); // vehicle id → { engine, skid, siren, horn, fire }
      this._buildParkingSpots();
    }

    // ---------------------------------------------------------- lifecycle
    spawn(type, x, z, heading, opts) {
      const v = new VH.Vehicle(this, type, opts);
      v.place(x, z, heading, opts && opts.y);
      this.list.push(v);
      return v;
    }

    remove(v) {
      const i = this.list.indexOf(v);
      if (i < 0) return;
      this.list.splice(i, 1);
      this._releaseVoices(v);
      if (v.spot) {
        v.spot.vehicle = null;
      }
      v.removed = true;
      v.dispose();
    }

    /** Is the player driving? */
    get playerVehicle() {
      return this.player.vehicle || null;
    }

    boostAvailable(v) {
      return v.driver === 'player' && this.nitro > 0.02;
    }

    // --------------------------------------------------------- simulation
    fixedUpdate(dt) {
      this.time += dt;
      const pv = this.playerVehicle;
      if (pv) this._playerControls(pv, dt);
      if (this.entering) this._enterStep(dt);
      for (const v of this.list) {
        if (v.controller && v.driver === 'ai' && !v.wrecked) v.controller.update(v, dt);
      }
      for (const v of this.list) v.fixedUpdate(dt);
      this._collidePairs();
      if (pv) this._playerExtras(pv, dt);
      else this._nitroRegen(dt, 0);
    }

    _playerControls(v, dt) {
      const inp = this.game.input;
      const pad = inp.pad;
      let accel = 0;
      if (inp.down('moveForward')) accel += 1;
      if (inp.down('moveBack')) accel -= 1;
      if (pad && pad.connected && (pad.rt > 0.05 || pad.lt > 0.05)) accel = (pad.rt || 0) - (pad.lt || 0);
      let steer = 0;
      if (inp.down('moveLeft')) steer += 1;
      if (inp.down('moveRight')) steer -= 1;
      if (pad && pad.connected && Math.abs(pad.move.x) > 0.02) steer = -pad.move.x;
      if (this.game.frozenControls) {
        accel = 0;
        steer = 0;
      }
      v.input.accel = accel;
      v.input.steer = steer;
      v.input.handbrake = inp.down('jump') ? 1 : 0;
      v.input.boost = (inp.down('sprint') || inp.down('crouch')) && this.nitro > 0.02 ? 1 : 0;
      v.horn = inp.down('horn');
      if (inp.consume('lights')) {
        v.lightsOn = !v.lightsOn;
        if (v.isPolice) v.siren = !v.siren;
        this.game.hud.showToast(v.isPolice ? (v.siren ? 'Siren on' : 'Siren off') : (v.lightsOn ? 'Headlights on' : 'Headlights auto'));
      }
      inp.discard('jump');
      inp.discard('crouch');
    }

    _playerExtras(v, dt) {
      // Nitro drains while boosting and fills from style.
      const boosting = v.boostFx > 0.9 && v.input.boost;
      if (boosting) this.nitro = Math.max(0, this.nitro - dt * 0.3);
      let gain = 0.01;
      if (v.drifting > 0.5 && v.speed > 12) gain += 0.13 * v.drifting;
      if (!v.grounded) gain += 0.12;
      this._nitroRegen(dt, gain);
      // Near misses: pass close to another car at speed.
      if (v.speed > 14) {
        for (const o of this.list) {
          if (o === v || o.wrecked) continue;
          const dx = o.pos.x - v.pos.x;
          const dz = o.pos.z - v.pos.z;
          if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue;
          const rel = Math.hypot(v.vel.x - o.vel.x, v.vel.z - o.vel.z);
          if (rel < 12) continue;
          const l = v.worldToLocal(o.pos.x, o.pos.z, this._tmp);
          const gap = Math.abs(l.x) - v.hx - o.hx;
          if (Math.abs(l.z) < v.hz + o.hz && gap > 0.05 && gap < 1.25) {
            const last = this._nearMiss.get(o.id) || -99;
            if (this.time - last > 3 && this.time - (o.lastContact || -99) > 2) {
              this._nearMiss.set(o.id, this.time);
              this.nitro = Math.min(1, this.nitro + 0.12);
              VH.events.emit('vehicle:nearMiss', { v, other: o });
            }
          }
        }
      }
    }

    _nitroRegen(dt, gain) {
      this.nitro = Math.min(1, this.nitro + dt * gain);
    }

    // ------------------------------------------------ car vs static city
    /** Separating-axis collision of a car against the colliders around it. */
    collideStatic(v) {
      const ph = this.physics;
      const c = Math.cos(v.yaw);
      const s = Math.sin(v.yaw);
      const ex = Math.abs(v.hx * c) + Math.abs(v.hz * s);
      const ez = Math.abs(v.hx * s) + Math.abs(v.hz * c);
      const y0 = v.pos.y + VH.Vehicle.STEP;
      const y1 = v.pos.y + v.height;
      const hits = this._hits;
      hits.length = 0;
      ph.query(v.pos.x - ex - 0.5, v.pos.z - ez - 0.5, v.pos.x + ex + 0.5, v.pos.z + ez + 0.5, (col) => {
        if (!(col.flags & VH.COLLIDE.SOLID) || col.disabled) return;
        if (col.type === VH.CollisionWorld.RAMP) return;
        if (col.maxY <= y0 || col.minY >= y1) return;
        hits.push(col);
      });
      for (const col of hits) {
        const r = this._satBox(v.pos.x, v.pos.z, c, s, v.hx, v.hz, col.cx, col.cz, col.cos, col.sin, col.hx, col.hz);
        if (!r) continue;
        // Street furniture gets knocked over instead.
        if (col.propType && SMASH[col.propType] && !col.disabled) {
          const def = SMASH[col.propType];
          const speed = v.speed;
          if (speed > def.speed) {
            this._smash(v, col, def);
            continue;
          }
        }
        this._resolveStatic(v, r, col);
      }
    }

    /**
     * SAT between box A (centre, cos/sin of yaw, half extents) and box B.
     * Returns { nx, nz, depth, px, pz } with the normal pointing from B to A, or null.
     */
    _satBox(ax, az, ac, as, ahx, ahz, bx, bz, bc, bs, bhx, bhz) {
      // Axes: A left (c, -s), A forward (s, c), same for B.
      const axes = [ac, -as, as, ac, bc, -bs, bs, bc];
      const dx = ax - bx;
      const dz = az - bz;
      let best = Infinity;
      let bnx = 0;
      let bnz = 0;
      let bi = 0;
      for (let i = 0; i < 4; i++) {
        const nx = axes[i * 2];
        const nz = axes[i * 2 + 1];
        const rA = ahx * Math.abs(ac * nx - as * nz) + ahz * Math.abs(as * nx + ac * nz);
        const rB = bhx * Math.abs(bc * nx - bs * nz) + bhz * Math.abs(bs * nx + bc * nz);
        const dist = dx * nx + dz * nz;
        const o = rA + rB - Math.abs(dist);
        if (o <= 0) return null;
        if (o < best) {
          best = o;
          const sg = dist >= 0 ? 1 : -1;
          bnx = nx * sg;
          bnz = nz * sg;
          bi = i;
        }
      }
      // Contact point: the deepest corner of whichever box didn't provide the face.
      let px;
      let pz;
      if (bi >= 2) {
        const sx = -(bnx * ac - bnz * as) >= 0 ? 1 : -1; // along A left
        const sz = -(bnx * as + bnz * ac) >= 0 ? 1 : -1; // along A forward
        px = ax + ac * ahx * sx + as * ahz * sz;
        pz = az - as * ahx * sx + ac * ahz * sz;
      } else {
        const sx = bnx * bc - bnz * bs >= 0 ? 1 : -1;
        const sz = bnx * bs + bnz * bc >= 0 ? 1 : -1;
        px = bx + bc * bhx * sx + bs * bhz * sz;
        pz = bz - bs * bhx * sx + bc * bhz * sz;
      }
      return { nx: bnx, nz: bnz, depth: best, px, pz };
    }

    _resolveStatic(v, r, col) {
      v.pos.x += r.nx * (r.depth + 0.002);
      v.pos.z += r.nz * (r.depth + 0.002);
      const rx = r.px - v.pos.x;
      const rz = r.pz - v.pos.z;
      // Velocity of the contact point: v + omega × r.
      const vpx = v.vel.x + v.omega * rz;
      const vpz = v.vel.z - v.omega * rx;
      const vn = vpx * r.nx + vpz * r.nz;
      if (vn >= 0) return;
      const rn = rz * r.nx - rx * r.nz;
      const invM = 1 / v.mass;
      const invI = 1 / v.inertia;
      const e = 0.18;
      const j = (-(1 + e) * vn) / (invM + rn * rn * invI);
      v.vel.x += r.nx * j * invM;
      v.vel.z += r.nz * j * invM;
      v.omega += rn * j * invI * 0.85;
      // Friction along the wall (scraping).
      const tx = -r.nz;
      const tz = r.nx;
      const vt = vpx * tx + vpz * tz;
      const rt = rz * tx - rx * tz;
      let jt = -vt / (invM + rt * rt * invI);
      const maxT = 0.35 * j;
      jt = clamp(jt, -maxT, maxT);
      v.vel.x += tx * jt * invM;
      v.vel.z += tz * jt * invM;
      v.omega += rt * jt * invI * 0.6;
      this._impact(v, null, -vn, r.px, v.pos.y + 0.6, r.pz, r.nx, r.nz, Math.abs(vt));
    }

    _impact(v, other, speed, x, y, z, nx, nz, slide) {
      v.lastContact = this.time;
      if (speed < 1.2 && (slide || 0) < 3) return;
      if (speed > 5.5) {
        const mul = v.driver === 'player' ? 0.6 : v.isPolice ? 0.75 : 1;
        v.damage(Math.min(650, Math.pow(speed - 5.5, 1.6) * 14 * mul), other && other.driver === 'player' ? 'player' : other ? other : null, 'crash');
        v.wake();
      }
      if (this.time - (v._lastImpactEvt || -9) < 0.12 && speed < 8) return;
      v._lastImpactEvt = this.time;
      VH.events.emit('vehicle:impact', { v, other, speed, slide: slide || 0, x, y, z, nx, nz });
    }

    _smash(v, col, def) {
      col.disabled = true;
      col.flags = 0;
      const keep = def.keep + (1 - def.keep) * smoothstep(20, 40, v.speed) * 0.5;
      v.vel.x *= keep;
      v.vel.z *= keep;
      v.damage(def.dmg, null, 'smash');
      this.world.props.smash(col, v);
      VH.events.emit('vehicle:smash', { v, type: col.propType, x: col.cx, z: col.cz, water: !!def.water, pole: !!def.pole });
    }

    // --------------------------------------------------------- car vs car
    _collidePairs() {
      const L = this.list;
      for (let i = 0; i < L.length; i++) {
        const a = L[i];
        for (let k = i + 1; k < L.length; k++) {
          const b = L[k];
          const reach = a.hz + b.hz + 0.3;
          const dx = a.pos.x - b.pos.x;
          const dz = a.pos.z - b.pos.z;
          if (dx * dx + dz * dz > reach * reach) continue;
          if (Math.abs(a.pos.y - b.pos.y) > Math.min(a.height, b.height) * 0.85) continue;
          if (a.sleeping && b.sleeping) continue;
          const r = this._satBox(a.pos.x, a.pos.z, Math.cos(a.yaw), Math.sin(a.yaw), a.hx, a.hz,
            b.pos.x, b.pos.z, Math.cos(b.yaw), Math.sin(b.yaw), b.hx, b.hz);
          if (!r) continue;
          this._resolvePair(a, b, r);
        }
      }
    }

    _resolvePair(a, b, r) {
      // Parked cars are heavy until hit (so they don't drift), then fully dynamic.
      const ma = a.mass;
      const mb = b.mass;
      const total = ma + mb;
      a.pos.x += r.nx * r.depth * (mb / total);
      a.pos.z += r.nz * r.depth * (mb / total);
      b.pos.x -= r.nx * r.depth * (ma / total);
      b.pos.z -= r.nz * r.depth * (ma / total);
      const rax = r.px - a.pos.x;
      const raz = r.pz - a.pos.z;
      const rbx = r.px - b.pos.x;
      const rbz = r.pz - b.pos.z;
      const vax = a.vel.x + a.omega * raz;
      const vaz = a.vel.z - a.omega * rax;
      const vbx = b.vel.x + b.omega * rbz;
      const vbz = b.vel.z - b.omega * rbx;
      const rvx = vax - vbx;
      const rvz = vaz - vbz;
      const vn = rvx * r.nx + rvz * r.nz;
      if (vn >= 0) return;
      a.wake();
      b.wake();
      const rna = raz * r.nx - rax * r.nz;
      const rnb = rbz * r.nx - rbx * r.nz;
      const k = 1 / ma + 1 / mb + (rna * rna) / a.inertia + (rnb * rnb) / b.inertia;
      const e = 0.22;
      const j = (-(1 + e) * vn) / k;
      a.vel.x += (r.nx * j) / ma;
      a.vel.z += (r.nz * j) / ma;
      b.vel.x -= (r.nx * j) / mb;
      b.vel.z -= (r.nz * j) / mb;
      a.omega += (rna * j) / a.inertia;
      b.omega -= (rnb * j) / b.inertia;
      // Friction.
      const tx = -r.nz;
      const tz = r.nx;
      const vt = rvx * tx + rvz * tz;
      const rta = raz * tx - rax * tz;
      const rtb = rbz * tx - rbx * tz;
      const kt = 1 / ma + 1 / mb + (rta * rta) / a.inertia + (rtb * rtb) / b.inertia;
      let jt = -vt / kt;
      jt = clamp(jt, -0.4 * j, 0.4 * j);
      a.vel.x += (tx * jt) / ma;
      a.vel.z += (tz * jt) / ma;
      b.vel.x -= (tx * jt) / mb;
      b.vel.z -= (tz * jt) / mb;
      a.omega += (rta * jt) / a.inertia;
      b.omega -= (rtb * jt) / b.inertia;
      const speed = -vn;
      if (a.controller && a.controller.onBump) a.controller.onBump(a, b, speed);
      if (b.controller && b.controller.onBump) b.controller.onBump(b, a, speed);
      this._impact(a, b, speed, r.px, a.pos.y + 0.6, r.pz, r.nx, r.nz, Math.abs(vt));
      if (speed > 5.5) {
        const mul = b.driver === 'player' ? 0.6 : b.isPolice ? 0.75 : 1;
        b.damage(Math.min(650, Math.pow(speed - 5.5, 1.6) * 14 * mul), a.driver === 'player' ? 'player' : a, 'crash');
      }
      b.lastContact = this.time;
    }

    // ------------------------------------------------------ car vs Jay
    /**
     * Push Jay's capsule out of cars (called by the player controller after
     * the static world). Returns the car that ran him over, if any.
     */
    resolvePlayer(pos, r, y0, y1, out) {
      let hitBy = null;
      for (const v of this.list) {
        if (v.driver === 'player') continue;
        const dx = pos.x - v.pos.x;
        const dz = pos.z - v.pos.z;
        const reach = v.hz + r + 0.5;
        if (dx * dx + dz * dz > reach * reach) continue;
        if (y1 < v.pos.y + 0.1 || y0 > v.pos.y + v.height - 0.12) continue;
        const l = v.worldToLocal(pos.x, pos.z, this._tmp);
        const px = v.hx + r - Math.abs(l.x);
        const pz = v.hz + r - Math.abs(l.z);
        if (px <= 0 || pz <= 0) continue;
        // Standing on the roof or bonnet is handled by roofHeight().
        if (y0 > v.pos.y + v.height * 0.55) continue;
        const c = Math.cos(v.yaw);
        const s = Math.sin(v.yaw);
        let nx;
        let nz;
        let depth;
        if (px < pz) {
          const sg = l.x >= 0 ? 1 : -1;
          nx = c * sg;
          nz = -s * sg;
          depth = px;
        } else {
          const sg = l.z >= 0 ? 1 : -1;
          nx = s * sg;
          nz = c * sg;
          depth = pz;
        }
        pos.x += nx * depth;
        pos.z += nz * depth;
        if (out) {
          out.x += nx;
          out.z += nz;
          out.hit = true;
        }
        // Speed of the car towards Jay.
        const toward = -(v.vel.x * nx + v.vel.z * nz);
        if (toward > 3.5 && !hitBy) hitBy = { v, speed: toward, nx, nz };
      }
      return hitBy;
    }

    /** Top of any car under (x, z), for standing on roofs and bonnets. */
    roofHeight(x, z, maxY) {
      let best = -Infinity;
      for (const v of this.list) {
        const dx = x - v.pos.x;
        const dz = z - v.pos.z;
        if (dx * dx + dz * dz > (v.hz + 0.2) * (v.hz + 0.2)) continue;
        const l = v.worldToLocal(x, z, this._tmp2);
        if (Math.abs(l.x) > v.hx - 0.05 || Math.abs(l.z) > v.hz - 0.05) continue;
        const cabin = Math.abs(l.z + v.hz * 0.05) < v.hz * 0.4;
        const top = v.pos.y + (cabin ? v.height : v.height * 0.62);
        if (top <= maxY && top > best) best = top;
      }
      return best;
    }

    /** Cars overlapping a circle (pedestrians use this). */
    forEachNear(x, z, radius, fn) {
      for (const v of this.list) {
        const dx = v.pos.x - x;
        const dz = v.pos.z - z;
        const r = radius + v.hz;
        if (dx * dx + dz * dz < r * r) fn(v);
      }
    }

    // ------------------------------------------------------------ Jay
    /** The car Jay would get into from where he stands, with the door side. */
    findEnterable(px, pz, maxDist) {
      let best = null;
      let bestD = maxDist || 3.2;
      for (const v of this.list) {
        if (v.wrecked || v.driver === 'player' || v.noEnter) continue;
        if (v.speed > 5) continue;
        for (const side of [1, -1]) {
          const d0 = v.localToWorld(side * (v.hx + 0.5), v.hz * 0.1, this._tmp);
          const d = Math.hypot(d0.x - px, d0.z - pz);
          if (d < bestD) {
            bestD = d;
            best = { v, side, x: d0.x, z: d0.z };
          }
        }
        // Anywhere along the car's flank is close enough too.
        const l = v.worldToLocal(px, pz, this._tmp2);
        if (Math.abs(l.z) < v.hz && Math.abs(l.x) < v.hx + 1.4) {
          const d = Math.abs(l.x) - v.hx;
          if (d < bestD) {
            bestD = d;
            const side = l.x >= 0 ? 1 : -1;
            const d0 = v.localToWorld(side * (v.hx + 0.5), v.hz * 0.1, this._tmp);
            best = { v, side, x: d0.x, z: d0.z };
          }
        }
      }
      return best;
    }

    /** Start getting into a car (F). */
    beginEnter(target) {
      const p = this.player;
      const v = target.v;
      const occupied = v.driver === 'ai';
      this.entering = {
        v, side: target.side, t: 0, phase: 'walk', jacked: occupied,
        fromX: p.pos.x, fromZ: p.pos.z, toX: target.x, toZ: target.z,
      };
      p.frozen = true;
      p.enteringVehicle = true;
      if (occupied) {
        v.controller = v.controller && v.controller.onJacked ? v.controller.onJacked(v) || null : null;
        v.input.accel = 0;
        v.input.handbrake = 1;
      }
      v.wake();
      VH.events.emit('vehicle:enterStart', { v, jacked: occupied });
    }

    _enterStep(dt) {
      const e = this.entering;
      const p = this.player;
      const v = e.v;
      if (v.removed || v.wrecked) {
        this.entering = null;
        p.frozen = false;
        p.enteringVehicle = false;
        return;
      }
      e.t += dt;
      // Keep the target door where the car is now.
      const door = v.localToWorld(e.side * (v.hx + 0.45), v.hz * 0.1, this._tmp);
      if (e.phase === 'walk') {
        const k = smoothstep(0, 0.32, e.t);
        p.pos.x = lerp(e.fromX, door.x, k);
        p.pos.z = lerp(e.fromZ, door.z, k);
        p.heading = Math.atan2(v.pos.x - p.pos.x, v.pos.z - p.pos.z);
        if (e.t >= 0.32) {
          e.phase = e.jacked ? 'jack' : 'in';
          e.t = 0;
          VH.events.emit('vehicle:door', { v, open: true });
          if (e.jacked) VH.events.emit('vehicle:jack', { v, side: e.side, x: door.x, z: door.z });
        }
      } else if (e.phase === 'jack') {
        if (e.t >= 0.75) {
          e.phase = 'in';
          e.t = 0;
        }
      } else if (e.phase === 'in') {
        if (e.t >= 0.22) this._finishEnter();
      }
    }

    _finishEnter() {
      const e = this.entering;
      const p = this.player;
      const v = e.v;
      this.entering = null;
      p.frozen = false;
      p.enteringVehicle = false;
      p.vehicle = v;
      p.state = 'vehicle';
      p.model.setVisible(false);
      v.driver = 'player';
      v.controller = null;
      v.role = 'player';
      v.persistent = true;
      v.sleeping = false;
      v.input.handbrake = 0;
      if (v.spot) {
        v.spot.vehicle = null;
        v.spot.used = true;
        v.spot = null;
      }
      VH.events.emit('vehicle:door', { v, open: false });
      VH.events.emit('vehicle:enter', { v, jacked: e.jacked });
    }

    /** Get out (F). Bails out when moving fast. */
    exitVehicle() {
      const p = this.player;
      const v = p.vehicle;
      if (!v) return false;
      const fast = v.speed > 9;
      // Find a free spot: driver door, passenger door, behind, on the roof.
      const ph = this.physics;
      const tries = [[v.hx + 0.75, 0.2], [-(v.hx + 0.75), 0.2], [v.hx + 0.75, -v.hz * 0.6], [0, -(v.hz + 0.9)], [0, v.hz + 0.9]];
      let spot = null;
      for (const [lx, lz] of tries) {
        const w = v.localToWorld(lx, lz, {});
        const g = ph.groundHeight(w.x, w.z, v.pos.y + 1.2);
        if (Math.abs(g - v.pos.y) > 1.2) continue;
        if (ph.overlaps(w.x, w.z, 0.3, g + 0.3, g + 1.7)) continue;
        spot = { x: w.x, z: w.z, y: g };
        break;
      }
      if (!spot) spot = { x: v.pos.x, z: v.pos.z, y: v.pos.y + v.height + 0.05 };
      p.vehicle = null;
      v.driver = null;
      v.input.accel = 0;
      v.input.steer = 0;
      v.input.boost = 0;
      v.input.handbrake = fast ? 0 : 1;
      v.horn = false;
      v.role = 'abandoned';
      p.state = 'ground';
      p.model.setVisible(true);
      p.teleport(spot.x, spot.z, v.yaw + (fast ? 0 : Math.PI / 2), spot.y);
      if (fast) {
        // Bail out: tumble clear of the car, carrying some of its speed.
        p.vel.x = v.vel.x * 0.45 + Math.cos(v.yaw) * 3;
        p.vel.z = v.vel.z * 0.45 - Math.sin(v.yaw) * 3;
        p.vel.y = 3;
        p.grounded = false;
        p.state = 'air';
        p.knock(Math.min(35, v.speed * 1.2), 'bail');
      }
      VH.events.emit('vehicle:door', { v, open: true });
      VH.events.emit('vehicle:exit', { v, bail: fast });
      return true;
    }

    // ------------------------------------------------------ parked cars
    _buildParkingSpots() {
      const spots = (this.spots = []);
      const net = this.net;
      for (const r of net.roads) {
        if (!r.parking) continue;
        const cuts = [r.from];
        for (const j of r.junctions) {
          const c = VH.RoadNet.junctionAlong(r, j);
          const h = VH.RoadNet.junctionHalf(r, j);
          cuts.push(c - h, c + h);
        }
        cuts.push(r.to);
        for (let i = 0; i + 1 < cuts.length; i += 2) {
          const a0 = cuts[i];
          const a1 = cuts[i + 1];
          for (const dir of [1, -1]) {
            for (let a = a0 + 15; a < a1 - 15; a += 6.6) {
              const h = VH.math.hash2(Math.round(a * 10) + dir * 7, Math.round(r.coord) * 13 + (r.axis === 'z' ? 1 : 2));
              if (h > 0.34) continue;
              const p = net.parkingPoint(r, dir, a);
              // Keep clear of hydrants' kerbs and driveways: a second hash thins clumps.
              spots.push({
                x: p.x, z: p.z, heading: p.heading, road: r,
                type: weightedPick(PARKED_TYPES, VH.math.hash2(Math.round(a * 3), Math.round(r.coord) + 99)),
                seed: Math.floor(h * 1e6), vehicle: null, used: false,
              });
            }
          }
        }
      }
    }

    _streamParked(focusX, focusZ) {
      let active = 0;
      for (const v of this.list) if (v.role === 'parked') active++;
      // Despawn untouched parked cars far away.
      for (let i = this.list.length - 1; i >= 0; i--) {
        const v = this.list[i];
        if (v.role !== 'parked' || v.persistent) continue;
        const d = Math.hypot(v.pos.x - focusX, v.pos.z - focusZ);
        if (d > 150) {
          this.remove(v);
          active--;
        }
      }
      if (active >= 18) return;
      const cand = [];
      for (const s of this.spots) {
        if (s.vehicle || s.used) continue;
        const d = Math.hypot(s.x - focusX, s.z - focusZ);
        if (d < 105) cand.push([d, s]);
      }
      cand.sort((a, b) => a[0] - b[0]);
      for (const [d, s] of cand) {
        if (active >= 18) break;
        if (d < 30 && this.game.isVisible && this.game.isVisible(s.x, 1, s.z, 3)) continue; // don't pop in under Jay's nose
        const v = this.spawn(s.type, s.x, s.z, s.heading, { seed: s.seed, sleeping: true, role: 'parked' });
        v.role = 'parked';
        v.spot = s;
        s.vehicle = v;
        active++;
      }
    }

    // ------------------------------------------------------------- frame
    update(dt, alpha, focus) {
      this._streamTimer -= dt;
      if (this._streamTimer <= 0) {
        this._streamTimer = 0.5;
        this._streamParked(focus.x, focus.z);
      }
      const night = this.game.environment.shared.uWindowGlow.value;
      const cam = this.game.renderer.camera.position;
      for (const v of this.list) {
        v.updateVisual(dt, alpha, night);
        const d = Math.hypot(v.renderPos.x - cam.x, v.renderPos.z - cam.z);
        const cast = d < 70;
        if (cast !== v._castShadow) {
          v._castShadow = cast;
          v.model.setShadows(cast);
        }
      }
    }

    _releaseVoices(v) {
      const vo = this.voices.get(v.id);
      if (!vo) return;
      for (const k of Object.keys(vo)) if (vo[k] && vo[k].stop) vo[k].stop();
      this.voices.delete(v.id);
    }

    /** Remove every non-persistent car (new game, quit to title). */
    clear(all) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const v = this.list[i];
        if (all || !v.persistent) this.remove(v);
      }
      for (const s of this.spots) {
        s.used = false;
        s.vehicle = null;
      }
      this.nitro = 0.6;
    }
  }

  VehicleSystem.SMASH = SMASH;
  VH.VehicleSystem = VehicleSystem;
})();
