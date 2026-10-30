/*
 * oddjobs.js — odd jobs: shifts in the city's work vehicles.
 *
 *   Paramedic   get in a Medic One ambulance and press P. Somebody is hurt
 *               on a pavement across town: pull up next to them, let them
 *               climb in the back, and get them to St. Agnes Mercy General
 *               before the clock runs out. Every knock costs their
 *               condition. From level 3 there are two or three to collect.
 *   Vigilante   any police car (a Halcyon Interceptor or Detective). A
 *               suspect in a car is reported nearby: stop them by boxing
 *               them in, ramming the car until it gives up, shooting the
 *               driver or wrecking it. Keep on their tail long enough and
 *               they pull over. From level 4 they bring armed friends; from
 *               level 7 two cars at once.
 *   Courier     a Porter or Hauler van: parcels for addresses round the
 *               city, against the clock, with a tip for speed. From level 4
 *               two or three drops a call; some parcels are fragile, and a
 *               knock costs the tip.
 *
 * Each job has ten levels. A call at level N is a little longer and harder
 * and pays more ($150 at level 1 up to $500 at level 10, plus tips, times
 * the Street Rep 'oddjob' perk). Finishing a call clears its level, and the
 * level reached is kept (and saved) for the next shift. Failing a call (out
 * of time, the vehicle wrecked, Jay out of it for too long, the suspect
 * gone) ends the shift with a summary. Clearing level 10 pays $5,000 and a
 * perk for good: +25 max health (paramedic), +25 max armour (vigilante) or
 * +15% courier pay. After that the calls carry on at the top rate.
 *
 * P in a work vehicle goes on duty and off again (P anywhere else is the
 * phone, phone.js). The work vehicles wait at depots so the jobs are always
 * there: an ambulance outside Mercy General, cruisers outside the two VPD
 * stations, Swiftline vans in Old Market and Saltmarsh. A depot vehicle is
 * the job's to lend: no heat for taking one. Everything stands down while a
 * story job runs.
 *
 *   game.oddJobs.jobs()       [{ id, name, level, maxLevel, active, how, depot: { x, z, name },
 *                               mastered, perk, calls, earned, cleared }] for the phone
 *                               (level: the one being played; cleared: levels done, 0..10)
 *   game.oddJobs.dutyFor(v)   'paramedic' | 'vigilante' | 'courier' | null
 *   game.oddJobs.shift        the shift under way, or null
 *
 * Events: oddjob:start { job }   oddjob:stop { job, reason, calls, pay }
 *         oddjob:done { job, level, pay } (each call)   oddjob:level { job, level }
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, dampAngle } = VH.math;
  const money = (n) => VH.util.formatMoney(n);

  const MAX_LEVEL = 10;
  const BONUS = 5000; //        clearing level 10
  const GAP = 5; //             seconds between calls
  const ESCAPE = 380; //        metres a suspect needs on Jay to get away
  const PERK_HEALTH = 25; //    paramedic: extra max health
  const PERK_ARMOR = 25; //     vigilante: extra max armour
  const PERK_COURIER = 0.15; // courier: extra courier pay
  const NO_ROUTE = Object.freeze([]); // the GPS line while on top of the target

  // out: seconds Jay may be out of the vehicle before the shift ends; tip: said on the first shift.
  const JOBS = {
    paramedic: {
      name: 'Paramedic', vehicle: 'ambulance', icon: '✚', out: 20, perk: '+25 max health', how: 'Get in an ambulance and press ',
      tip: 'Stop beside each patient so they can climb in, then get them to hospital. Every knock costs their condition.',
    },
    vigilante: {
      name: 'Vigilante', vehicle: 'police car', icon: '★', out: 60, perk: '+25 max armour', how: 'Get in a police car and press ',
      tip: 'Box the suspect in, ram the car until it gives up, or shoot the driver. Bring them in alive for a bonus.',
    },
    courier: {
      name: 'Courier', vehicle: 'van', icon: '▣', out: 25, perk: '+15% courier pay', how: 'Get in a delivery van and press ',
      tip: 'Pull up at each address. The quicker the drop, the bigger the tip; fragile parcels hate knocks.',
    },
  };
  const IDS = ['paramedic', 'vigilante', 'courier'];

  // Where the work vehicles wait: at the kerb outside a place, a few bays along from its door.
  const DEPOTS = [
    { job: 'paramedic', place: 'mercy_general', type: 'medic', name: 'Mercy General ambulance bay' },
    { job: 'vigilante', place: 'vpd_central', type: 'interceptor', name: 'VPD Central Precinct' },
    { job: 'vigilante', place: 'southside_lot', type: 'unmarked', name: 'VPD Southside Division' },
    { job: 'courier', place: 'old_market', type: 'porter', name: 'Swiftline Parcels, Old Market', color: 0x2a5fb0 },
    { job: 'courier', place: 'boatworks', type: 'porter', name: 'Swiftline Parcels, Saltmarsh', color: 0x2a5fb0 },
  ];

  // The calls.
  const INJURIES = [
    'a skateboarder with a broken wrist', 'a jogger with a twisted ankle', 'somebody who fainted in the heat',
    'a cyclist knocked off their bike', 'a pensioner who took a tumble', 'a window cleaner who fell off his ladder',
    'a footballer with a bad knee', 'a busker who dropped his tuba on his foot', 'a tourist with heatstroke',
    'a delivery rider who came off his scooter', 'a kid who fell out of a tree', 'a juggler with a bump on the head',
  ];
  const CRIMES = [
    'a stolen car', 'a getaway car from a jewellery job', 'a hit-and-run driver', 'shoplifters doing a runner',
    'a car that rammed a patrol unit', 'robbers from a bank job', 'a carjacker', 'a smash-and-grab crew',
  ];
  const PARCELS = [
    'a box of vinyl records', 'a signed football', 'a crate of mangoes', 'a garden gnome', 'spare parts',
    'a birthday present', 'concert tickets', 'a new laptop', 'a guitar', 'a box of comics', 'a toolbox', 'a stack of pizzas',
  ];
  const FRAGILE = [
    'a wedding cake', 'a tray of eggs', 'a glass chandelier', 'a fish tank (with fish)', 'Grandma\'s best china',
    'a box of light bulbs', 'a stained-glass window',
  ];
  // The suspects' cars, by level: ordinary at first, quick later.
  const CROOK_CARS = [
    ['halcyon', 'pipit', 'beater', 'mesa', 'tern'],
    ['halcyon', 'tern', 'sovereign', 'lowrider', 'ironclad'],
    ['ironclad', 'drifter', 'vireo', 'zephyr', 'sovereign'],
  ];

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  /** Pay for a call at a level before tips: $150 at level 1 up to $500 at level 10. */
  function basePay(level) {
    return 150 + (350 * (clamp(level, 1, MAX_LEVEL) - 1)) / (MAX_LEVEL - 1);
  }

  function clock(s) {
    const t = Math.max(0, Math.ceil(s));
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  // ------------------------------------------------------------ brains
  /** A patient sitting hunched on the kerb, waiting for the ambulance. */
  class SitBrain {
    update(a) {
      a.moveSpeed = 0;
      a.anim.cower = 1;
    }
  }

  /** A patient getting up and climbing into the back of the ambulance. */
  class BoardBrain {
    constructor(van) {
      this.van = van;
      this.t = 0;
      this.d = 99;
      this._p = { x: 0, z: 0 };
    }

    update(a, dt) {
      const v = this.van;
      this.t += dt;
      const back = v.localToWorld(0, -(v.hz + 0.8), this._p);
      const dx = back.x - a.pos.x;
      const dz = back.z - a.pos.z;
      this.d = Math.hypot(dx, dz);
      a.anim.cower = 0;
      a.anim.sprint = false;
      // Only while the ambulance waits for them.
      if (this.d > 0.5 && Math.hypot(v.pos.x - a.pos.x, v.pos.z - a.pos.z) < 16) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 8, dt);
        a.moveSpeed = 1.5;
      } else a.moveSpeed = 0;
    }
  }

  /** In the back of the vehicle (hidden): keeps up with it. */
  class RideBrain {
    constructor(v) {
      this.v = v;
    }

    update(a) {
      a.pos.set(this.v.pos.x, this.v.pos.y + 0.3, this.v.pos.z);
      a.moveSpeed = 0;
    }
  }

  /** Off at the hospital, or a suspect in custody (hands up): gone once nobody's looking. */
  class LeaveBrain {
    constructor(to, life, handsUp) {
      this.to = to;
      this.life = life;
      this.handsUp = !!handsUp;
      this.t = 0;
    }

    update(a, dt) {
      this.t += dt;
      if (this.handsUp || !this.to) {
        a.moveSpeed = 0;
        a.anim.handsUp = this.handsUp ? 1 : 0;
        return;
      }
      const dx = this.to.x - a.pos.x;
      const dz = this.to.z - a.pos.z;
      if (Math.hypot(dx, dz) > 1.2) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 6, dt);
        a.moveSpeed = 1.3;
      } else a.moveSpeed = 0;
    }

    expired(a, d) {
      return this.t > this.life && (d > 40 || !a.visible || this.t > this.life * 3);
    }
  }

  /**
   * An armed passenger in a suspect's car (hidden). From level 5 they shoot
   * at Jay out of the window when he gets close; once the car stops they get
   * out and fight (their combat brain, kept from combat.spawnEnemy).
   */
  class RiderBrain {
    constructor(game, car, level, seat) {
      this.game = game;
      this.car = car;
      this.level = level;
      this.seat = seat;
      this.shoots = level >= 5;
      this._fireT = 2 + Math.random() * 2;
      this._l = { x: 0, z: 0 };
      this._w = { x: 0, z: 0 };
    }

    update(a, dt) {
      const v = this.car;
      const g = this.game;
      const p = g.player;
      // At the window on Jay's side (a shot from there clears the car's own bodywork).
      const l = v.worldToLocal(p.pos.x, p.pos.z, this._l);
      const side = l.x >= 0 ? 1 : -1;
      const w = v.localToWorld(side * (v.hx + 0.35), this.seat ? -0.9 : 0.3, this._w);
      a.pos.set(w.x, v.pos.y, w.z);
      a.moveSpeed = 0;
      if (!this.shoots || v.wrecked || p.isDead || !g.combat) return;
      this._fireT -= dt;
      if (this._fireT > 0) return;
      this._fireT = 0.9 + Math.random() * 1.3;
      if (Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z) > 38) return;
      a.heading = Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
      g.combat.npcFire(a, p.inVehicle && p.vehicle ? p.vehicle : p, a.weapon || 'pistol', 0.2 + this.level * 0.012);
    }
  }

  // ------------------------------------------------------------ drivers
  /**
   * A suspect at the wheel: cruises until Jay gets close (or touches the
   * car), then runs for it, away from him, through the lights. Bullets
   * through the bodywork add up: enough, and the driver is hit and the car
   * rolls to a stop. Given up: pulls over.
   */
  class CrookDriver {
    constructor(game, v, level) {
      this.game = game;
      this.level = level;
      this.lane = new VH.LaneDriver(game.traffic, { speedMul: 0.95, plow: true, aggressive: true, gap: 0.8 });
      this.lane.maxSpeed = 24 + level * 0.8;
      this.fleeing = false;
      this.hits = 0; //    bullets through the bodywork
      this.gaveUp = false;
      this.coast = false; // the driver's hit: no hands on the wheel
      this._t = 0;
      this._dest = { x: 0, z: 0 };
      this._stuckT = 0;
      this._reverseT = 0;
      this._revSteer = 1;
      const lp = game.roadnet.nearestLane(v.pos.x, v.pos.z, v.yaw);
      if (lp) this.lane.initAt(lp);
    }

    onBump(v, other) {
      if (!other || other.driver !== 'player') return;
      if (!other.pos) this.hits++; // a bullet (combat.js passes a bare { driver }), not a car
      this.fleeing = true;
    }

    giveUp(v) {
      this.gaveUp = true;
      v.plow = false;
    }

    update(v, dt) {
      if (this.gaveUp || this.coast) {
        v.input.boost = 0;
        if (this.coast) {
          // Foot off, hands off: it rolls to a stop.
          v.input.accel = v.speed > 0.5 ? -0.35 : 0;
          v.input.steer *= 0.97;
          v.input.handbrake = v.speed < 2 ? 1 : 0;
        } else {
          v.input.accel = v.speed > 0.5 ? -1 : 0;
          v.input.steer = 0;
          v.input.handbrake = v.speed < 4 ? 1 : 0;
        }
        return;
      }
      if (this._reverseT > 0) {
        this._reverseT -= dt;
        v.input.accel = -0.8;
        v.input.steer = this._revSteer;
        v.input.handbrake = 0;
        return;
      }
      this._t -= dt;
      if (this._t <= 0) {
        this._t = 1;
        const p = this.game.player.pos;
        if (Math.hypot(p.x - v.pos.x, p.z - v.pos.z) < 85) this.fleeing = true;
        if (this.fleeing) {
          this.lane.speedMul = 1.25 + this.level * 0.025;
          this._dest.x = v.pos.x + (v.pos.x - p.x) * 3;
          this._dest.z = v.pos.z + (v.pos.z - p.z) * 3;
          this.lane.destination = this._dest;
        }
        const lp = this.game.roadnet.nearestLane(v.pos.x, v.pos.z, v.yaw);
        if (lp && lp.dist > 7) this.lane.initAt(lp);
      }
      this.lane.update(v, dt);
      v.input.boost = 0;
      // Nose in a wall: back out and go again.
      if (v.speed < 1 && v.input.accel > 0.3) this._stuckT += dt;
      else this._stuckT = Math.max(0, this._stuckT - dt);
      if (this._stuckT > 1.6) {
        this._stuckT = 0;
        this._reverseT = 1.1;
        this._revSteer = -Math.sign(v.input.steer || 1);
      }
    }
  }

  // ------------------------------------------------------------ odd jobs
  class OddJobs {
    constructor(game) {
      this.game = game;
      this.saveKey = 'oddjobs';
      this.shift = null;
      this.depots = [];
      this._depotCars = [];
      this._cache = {};
      this._hpOn = 0;
      this._armorOn = 0;
      this._quietOn = false;
      this._tidyT = 0;
      this._routeT = 0;
      this._mark = { x: 0, y: 0.2, z: 0 };
      this.data = OddJobs.fresh();
      this.seen = {};
      const cast = game.dialogue && game.dialogue.cast;
      if (cast && !cast.oj_dispatch) cast.oj_dispatch = { name: 'Dispatch', color: '#9fd3ff', voice: { gender: 'female', pitch: 1.05, rate: 1.08 } };
      this._buildDepots();
      this._buildHud();
      VH.events.on('vehicle:impact', (e) => this._onImpact(e));
      VH.events.on('vehicle:enter', (e) => this._onEnter(e));
    }

    static fresh() {
      const d = {};
      for (const id of IDS) d[id] = { level: 1, calls: 0, earned: 0, best: 0, mastered: false };
      return d;
    }

    // ------------------------------------------------------------ API
    /** Which odd job a vehicle is for (null for anything else). */
    dutyFor(v) {
      if (!v || v.wrecked || v.removed || (v.kind && v.kind !== 'car')) return null;
      if (v.type === 'medic') return 'paramedic';
      if (v.cls === 'police') return 'vigilante';
      if (v.type === 'porter' || v.type === 'hauler') return 'courier';
      return null;
    }

    /** The three jobs for the phone: level reached, on duty or not, and the nearest depot. */
    jobs() {
      const p = this.game.player.pos;
      const key = this._key();
      return IDS.map((id) => {
        const d = this.data[id];
        const J = JOBS[id];
        let best = null;
        let bd = Infinity;
        for (const dp of this.depots) {
          if (dp.job !== id) continue;
          const k = Math.hypot(dp.x - p.x, dp.z - p.z);
          if (k < bd) {
            bd = k;
            best = dp;
          }
        }
        return {
          id, name: J.name, level: d.level, maxLevel: MAX_LEVEL, active: !!(this.shift && this.shift.job === id),
          how: J.how + key, depot: best ? { x: best.x, z: best.z, name: best.name } : null,
          mastered: d.mastered, perk: J.perk, calls: d.calls, earned: d.earned, cleared: d.mastered ? MAX_LEVEL : d.level - 1,
        };
      });
    }

    _key() {
      const k = this.game.input.labelFor('phone');
      return k && k !== '—' ? k : 'P';
    }

    // ---------------------------------------------------------- depots
    _buildDepots() {
      const g = this.game;
      const V = g.vehicles;
      if (!V || !V.addFixedSpot || !g.places) return;
      for (const def of DEPOTS) {
        if (!VH.Vehicle.typeSpec(def.type)) continue;
        const pl = g.places.get(def.place);
        if (!pl) continue;
        const q = this._depotSpot(pl);
        if (!q) continue;
        // The bay is the job's: no parked car streams in on top of it.
        const spots = V.spots || [];
        for (let i = spots.length - 1; i >= 0; i--) if (Math.hypot(spots[i].x - q.x, spots[i].z - q.z) < 6) spots.splice(i, 1);
        const spot = V.addFixedSpot({ type: def.type, x: q.x, z: q.z, yaw: q.heading, color: def.color, r: 6, onSpawn: (v) => this._onDepotSpawn(v, def) });
        this.depots.push({ job: def.job, name: def.name, x: q.x, z: q.z, spot });
      }
    }

    /** A free kerbside bay on the place's side of the road, a few bays along from its door. */
    _depotSpot(pl) {
      const g = this.game;
      const net = g.roadnet;
      const ph = g.physics;
      const lp = net.nearestLane(pl.x, pl.z, undefined, 45);
      if (!lp || !lp.road.parking) return null;
      const r = lp.road;
      const off = (dir) => {
        const q = net.parkingPoint(r, dir, lp.along);
        return Math.hypot(q.x - pl.x, q.z - pl.z);
      };
      const dir = off(1) <= off(-1) ? 1 : -1;
      for (const k of [9, -9, 16, -16, 23, -23, 30, -30]) {
        const along = lp.along + k;
        if (along < r.from + 10 || along > r.to - 10) continue;
        const q = net.parkingPoint(r, dir, along);
        if (net.junctionAt(q.x, q.z, 6)) continue;
        const gh = ph.groundHeight(q.x, q.z, 50);
        if (gh > 0.8 || gh < -0.1) continue;
        const fx = Math.sin(q.heading);
        const fz = Math.cos(q.heading);
        let blocked = false;
        for (const s of [-2, 0, 2]) if (ph.overlaps(q.x + fx * s, q.z + fz * s, 1.05, gh + 0.35, gh + 1.5)) blocked = true;
        if (blocked) continue;
        if (g.vehicles.fixedSpots.some((s) => Math.hypot(s.x - q.x, s.z - q.z) < 8)) continue;
        return q;
      }
      return null;
    }

    _onDepotSpawn(v, def) {
      v.missionOwned = true; // lent by the job: no heat for taking it, and no chop shop will touch it
      v.dutyDepot = def.job;
      this._depotCars.push(v);
    }

    /**
     * Depot vehicles Jay drove off and left far away go back to being
     * ordinary cars (and stream out like any other).
     */
    _tidyDepots() {
      const g = this.game;
      const p = g.player.pos;
      const S = this.shift;
      for (let i = this._depotCars.length - 1; i >= 0; i--) {
        const v = this._depotCars[i];
        if (v.removed) {
          this._depotCars.splice(i, 1);
          continue;
        }
        if (v === g.player.vehicle || (S && v === S.v)) continue;
        const home = v.fixedSpot;
        const atHome = home && home.v === v && Math.hypot(v.pos.x - home.x, v.pos.z - home.z) < 12;
        if (atHome || Math.hypot(v.pos.x - p.x, v.pos.z - p.z) < 220) continue;
        v.missionOwned = false;
        v.persistent = false;
        v.keep = false;
        this._depotCars.splice(i, 1);
      }
    }

    // ---------------------------------------------------------- events
    _onEnter(e) {
      const g = this.game;
      const job = this.dutyFor(e.v);
      if (!job || this.shift || (g.missions && g.missions.run)) return;
      const J = JOBS[job];
      const text = 'Press ' + this._key() + ' for ' + J.name.toLowerCase() + ' duty';
      if (!this.seen[job]) {
        this.seen[job] = true;
        const lv = this.data[job];
        g.hud.notify({ title: J.name + ' odd jobs', text: text + '. Ten levels, ' + money(150) + ' to ' + money(500) + ' a call, and ' + money(BONUS) + ' plus ' + J.perk + ' for clearing them all.' + (lv.level > 1 ? ' You\'re on level ' + lv.level + '.' : ''), icon: J.icon, duration: 8000 });
      } else g.hud.showToast(text);
    }

    _onImpact(e) {
      const S = this.shift;
      const c = S && S.call;
      if (!c || (e.v !== S.v && e.other !== S.v) || e.speed < 4) return;
      if (c.kind === 'paramedic' && c.aboard > 0) {
        const hurt = (e.speed - 3) * 2.2 * (1 + 0.15 * (c.aboard - 1));
        c.cond = Math.max(0, c.cond - hurt);
        c.ouch = 1.2;
      } else if (c.kind === 'courier' && c.fragile && c.cond > 0 && !c.drops[0].done) {
        // Only while the fragile parcel (always the first drop) is still in the back.
        c.cond = Math.max(0, c.cond - (e.speed - 3) * 4);
        c.ouch = 1.2;
        if (c.cond <= 0) this.game.hud.showToast('Smash. ' + c.fragile.charAt(0).toUpperCase() + c.fragile.slice(1) + ' won\'t earn a tip now.');
      }
    }

    // ------------------------------------------------------------ frame
    update(dt) {
      const g = this.game;
      this._tidyT -= dt;
      if (this._tidyT <= 0) {
        this._tidyT = 1;
        this._tidyDepots();
      }
      const run = g.missions && g.missions.run;
      const p = g.player;
      const v = p.vehicle;
      const duty = run ? null : this.dutyFor(v);
      // P in a work vehicle: on duty, off duty (anywhere else P is the phone's).
      if (duty && g.input.consume('phone')) this._toggle(duty, v);
      const S = this.shift;
      if (S) {
        if (run) this.endShift('story', 'A story job came up.');
        else if (g.state === 'playing') this._step(dt);
      }
      this._hud();
    }

    _toggle(job, v) {
      const g = this.game;
      const S = this.shift;
      if (S && S.job === job) {
        this.endShift('off', 'Off duty.');
        return;
      }
      if (S) this.endShift('off', 'Off duty.');
      const J = JOBS[job];
      if (g.police && g.police.level > 0) {
        g.hud.showToast('Lose the police first, then go on ' + J.name.toLowerCase() + ' duty.');
        return;
      }
      if (v.health < 250) {
        g.hud.showToast('This ' + J.vehicle + ' is too smashed up for work.');
        return;
      }
      this.startShift(job, v);
    }

    startShift(job, v) {
      const g = this.game;
      const d = this.data[job];
      const J = JOBS[job];
      this.shift = { job, v, level: d.level, calls: 0, pay: 0, call: null, gap: 2.5, outT: 0 };
      document.body.classList.add('oj-on');
      VH.events.emit('oddjob:start', { job });
      const first = d.calls === 0 ? J.tip + ' ' : '';
      g.hud.notify({ title: J.name + ': on duty', text: first + 'Level ' + d.level + ' of ' + MAX_LEVEL + (d.mastered ? ' (top rate)' : '') + '. ' + this._key() + ' again to go off duty.', icon: J.icon, duration: first ? 9000 : 4500 });
      if (g.audio.missionStart) g.audio.missionStart();
    }

    /** End the shift. why: 'off' (Jay's choice), 'fail', 'story', or 'reset' (silent). */
    endShift(why, reason) {
      const g = this.game;
      const S = this.shift;
      if (!S) return;
      this.shift = null;
      this._clearCall(S);
      this._quiet(false);
      document.body.classList.remove('oj-on');
      this._hud();
      VH.events.emit('oddjob:stop', { job: S.job, reason: why, calls: S.calls, pay: S.pay });
      if (why === 'reset') return;
      const J = JOBS[S.job];
      const d = this.data[S.job];
      const next = d.mastered ? 'All ten levels cleared: calls pay the top rate.' : 'Level ' + d.level + ' next time.';
      const tally = S.calls ? S.calls + (S.calls === 1 ? ' call · ' : ' calls · ') + money(S.pay) + '. ' : 'No calls finished. ';
      g.hud.notify({ title: J.name + (why === 'fail' ? ': shift over' : ': off duty'), text: (why === 'off' ? '' : reason + ' ') + tally + next, icon: J.icon, tone: why === 'fail' ? 'bad' : '', duration: 7000 });
      if (why === 'fail') {
        g.hud.centerBanner('SHIFT OVER', reason);
        if (g.audio.fail) g.audio.fail();
      }
    }

    _fail(reason) {
      this.endShift('fail', reason);
    }

    _step(dt) {
      const g = this.game;
      const S = this.shift;
      const p = g.player;
      const J = JOBS[S.job];
      if (p.isDead || p.state === 'dead') return this._fail('You were knocked out.');
      if (g._arresting) return this._fail('Busted.');
      // Another vehicle of the same kind will do (the patients move over too).
      const v = p.vehicle;
      if (v && v !== S.v && this.dutyFor(v) === S.job) this._swap(v);
      if (S.v.wrecked || S.v.removed) return this._fail('The ' + J.vehicle + ' is wrecked.');
      if (p.vehicle === S.v) S.outT = 0;
      else {
        S.outT += dt;
        if (S.outT > J.out) return this._fail('You left the ' + J.vehicle + '.');
      }
      if (!S.call) {
        S.gap -= dt;
        if (S.gap <= 0 && !document.body.classList.contains('cutscene')) {
          if (!this._newCall()) S.gap = 2;
        }
        return;
      }
      const c = S.call;
      c.t -= dt;
      if (c.ouch > 0) c.ouch -= dt;
      const r = c.kind === 'paramedic' ? this._paramedicStep(c, dt) : c.kind === 'vigilante' ? this._vigilanteStep(c, dt) : this._courierStep(c, dt);
      if (!this.shift) return;
      if (r === 'done') return this._callDone(c);
      if (r) return this._fail(r);
      if (c.t <= 0) return this._fail(c.late);
      this._guide(c, dt);
    }

    _swap(v) {
      const S = this.shift;
      S.v = v;
      const c = S.call;
      if (c && c.patients) {
        for (const pt of c.patients) {
          if (pt.state === 'aboard') {
            pt.a.inCar = v;
            pt.a.brain = new RideBrain(v);
          } else if (pt.state === 'board') pt.a.brain.van = v;
        }
      }
    }

    /** The marker, the GPS line and the objective text for the current target. */
    _guide(c, dt) {
      const g = this.game;
      const t = c.target;
      if (!t) {
        g.hud.trackObjective(null);
        g.route = null;
        return;
      }
      const m = this._mark;
      m.x = t.x;
      m.z = t.z;
      m.y = t.y || 0.2;
      g.hud.trackObjective(m, g.renderer.camera);
      g.hud.setObjectiveText(c.objective);
      this._routeT -= dt;
      if (this._routeT <= 0 && VH.Minimap && VH.Minimap.route) {
        this._routeT = 1;
        const p = g.player.pos;
        // Close in, an empty route: nothing to draw, and Jay's own GPS waypoint doesn't cut in either.
        g.route = Math.hypot(t.x - p.x, t.z - p.z) > 30 ? VH.Minimap.route(g.layout, p.x, p.z, t.x, t.z) : NO_ROUTE;
      }
    }

    // ----------------------------------------------------------- calls
    _newCall() {
      const S = this.shift;
      const c = S.job === 'paramedic' ? this._paramedicCall(S.level) : S.job === 'vigilante' ? this._vigilanteCall(S.level) : this._courierCall(S.level);
      if (!c) return false;
      c.level = S.level;
      c.total = c.t;
      c.ouch = 0;
      c.target = null;
      c.objective = '';
      S.call = c;
      this._routeT = 0;
      if (this.game.audio.checkpoint) this.game.audio.checkpoint();
      return true;
    }

    _say(text) {
      const g = this.game;
      if (g.dialogue && g.dialogue.play) g.dialogue.play([['oj_dispatch', text]], { mode: 'ambient' });
    }

    _roadName(x, z) {
      const g = this.game;
      const r = g.world.roadNameAt ? g.world.roadNameAt(x, z) : null;
      if (r) return r;
      const d = g.world.districtAt ? g.world.districtAt(x, z) : null;
      return d && d.name ? d.name : 'the street';
    }

    /** A spot on the pavement by a road between minD and maxD from (x, z): in the city if it can be. */
    _pavementSpot(x, z, minD, maxD, avoid) {
      const g = this.game;
      const net = g.roadnet;
      const cb = g.layout.config.cityBounds || g.layout.config.bounds;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < 14; i++) {
          const lp = net.randomLanePoint(Math.random, x, z, minD, maxD);
          if (!lp) return null;
          if (pass === 0 && (lp.x < cb.minX + 30 || lp.x > cb.maxX - 30 || lp.z < cb.minZ + 30 || lp.z > cb.maxZ - 30)) continue;
          if (net.junctionAt(lp.x, lp.z, 6)) continue;
          const s = g.safeSpotNear(lp.x, lp.z);
          if (!s || Math.hypot(s.x - lp.x, s.z - lp.z) > 14) continue;
          if (avoid && avoid.some((o) => Math.hypot(o.x - s.x, o.z - s.z) < 45)) continue;
          return { x: s.x, z: s.z };
        }
      }
      return null;
    }

    // ------------------------------------------------------- paramedic
    _hospitals() {
      if (this._hosp) return this._hosp;
      const g = this.game;
      const out = [];
      const seen = new Set();
      for (const pl of g.places.map.values()) {
        if (seen.has(pl) || (pl.kind !== 'hospital_front' && !/^(hospital|clinic)/.test(pl.id || ''))) continue;
        seen.add(pl);
        const lp = g.roadnet.nearestLane(pl.x, pl.z, undefined, 40);
        if (!lp) continue;
        const q = lp.road.parking ? g.roadnet.parkingPoint(lp.road, lp.dir, lp.along) : lp;
        out.push({ x: q.x, z: q.z, name: pl.name, door: { x: pl.x, z: pl.z } });
      }
      return (this._hosp = out);
    }

    _paramedicCall(level) {
      const g = this.game;
      const p = g.player.pos;
      const hosp = this._hospitals();
      if (!hosp.length) return null;
      const n = level >= 7 ? 3 : level >= 3 ? 2 : 1;
      const spots = [];
      const first = this._pavementSpot(p.x, p.z, 150, 500);
      if (!first) return null;
      spots.push(first);
      for (let i = 1; i < n; i++) {
        const s = this._pavementSpot(first.x, first.z, 50, 240, spots);
        if (s) spots.push(s);
      }
      // The nearest hospital to where they'll be picked up.
      const last = spots[spots.length - 1];
      let to = hosp[0];
      for (const h of hosp) if (Math.hypot(h.x - last.x, h.z - last.z) < Math.hypot(to.x - last.x, to.z - last.z)) to = h;
      const patients = spots.map((s) => {
        const a = g.crowd.spawn(s.x, s.z, { persistent: true, role: 'oddjob', heading: Math.random() * 6.28 });
        const lying = Math.random() < 0.6;
        if (lying) this._layDown(a);
        else a.brain = new SitBrain();
        return { a, lying, state: 'wait' };
      });
      // How long: the drive round them all and on to the hospital, at a pace that rises with the level.
      let route = 0;
      let fx = p.x;
      let fz = p.z;
      for (const s of spots) {
        route += Math.hypot(s.x - fx, s.z - fz);
        fx = s.x;
        fz = s.z;
      }
      route += Math.hypot(to.x - fx, to.z - fz);
      const t = (route * 1.3) / (10.5 + level * 0.35) + spots.length * 10 + Math.max(12, 32 - level * 2);
      const where = this._roadName(first.x, first.z);
      this._say(spots.length === 1
        ? 'Medic One, we have ' + pick(INJURIES) + ' on ' + where + '. Hospital is ' + to.name + '.'
        : 'Medic One, ' + spots.length + ' casualties near ' + where + ', starting with ' + pick(INJURIES) + '. Take them all to ' + to.name + '.');
      return { kind: 'paramedic', patients, to, cond: 100, aboard: 0, t, late: 'Out of time: another crew got there first.' };
    }

    /** Flat on the pavement, and staying there (the crowd's knocked-over state, without the getting up). */
    _layDown(a) {
      a.state = 'down';
      a.down = { t: -1e6, vx: 0, vy: 0, vz: 0, spin: 0, rest: true, flip: 1, stun: 0 };
      a.moveSpeed = 0;
    }

    _paramedicStep(c, dt) {
      const g = this.game;
      const S = this.shift;
      const v = g.player.vehicle;
      const inVan = v && v === S.v;
      let waiting = 0;
      let next = null;
      let nextD = Infinity;
      c.aboard = 0;
      for (const pt of c.patients) {
        const a = pt.a;
        if (pt.state === 'aboard') {
          c.aboard++;
          continue;
        }
        if (a.dead || a.removed) return 'You lost a patient.';
        if (pt.state === 'wait') {
          if (pt.lying && (a.state !== 'down' || !a.down)) this._layDown(a);
          if (inVan && v.speed < 3 && Math.hypot(v.pos.x - a.pos.x, v.pos.z - a.pos.z) < 9) {
            pt.state = 'board';
            a.down = null;
            a.state = 'walk';
            a.brain = new BoardBrain(S.v);
          }
        } else if (pt.state === 'board') {
          const b = a.brain;
          const near = Math.hypot(S.v.pos.x - a.pos.x, S.v.pos.z - a.pos.z) < 12;
          if (b && (b.d < 1.7 || (b.t > 6 && near))) {
            pt.state = 'aboard';
            a.hidden = true;
            a.inCar = S.v;
            a.brain = new RideBrain(S.v);
            c.aboard++;
            if (g.audio.carDoor) g.audio.carDoor(false, 0);
            g.hud.popScore(c.patients.length > 1 ? 'PATIENT ' + this._aboard(c) + ' / ' + c.patients.length + ' ABOARD' : 'PATIENT ABOARD');
            continue;
          }
        }
        waiting++;
        const d = Math.hypot(a.pos.x - g.player.pos.x, a.pos.z - g.player.pos.z);
        if (d < nextD) {
          nextD = d;
          next = a.pos;
        }
      }
      // On board: their condition slips a little all the time, and a lot with every knock (_onImpact).
      if (c.aboard > 0) {
        c.cond = Math.max(0, c.cond - dt * (0.12 + c.level * 0.025));
        if (c.cond <= 0) return 'Your patient took a turn for the worse. The air ambulance took over.';
      }
      if (waiting) {
        c.target = next;
        c.objective = c.patients.length === 1 ? 'Pick up the patient' : 'Pick up the patients (' + waiting + ' to go)';
        return null;
      }
      c.target = c.to;
      c.objective = 'Get ' + (c.patients.length === 1 ? 'the patient' : 'them') + ' to ' + c.to.name;
      if (inVan && v.speed < 3 && Math.hypot(v.pos.x - c.to.x, v.pos.z - c.to.z) < 11) {
        this._unload(c);
        return 'done';
      }
      return null;
    }

    _aboard(c) {
      let n = 0;
      for (const pt of c.patients) if (pt.state === 'aboard') n++;
      return n;
    }

    /** At the hospital: out of the back and in through the doors. */
    _unload(c) {
      const g = this.game;
      const v = this.shift.v;
      let k = 0;
      for (const pt of c.patients) {
        const a = pt.a;
        if (a.removed) continue;
        const w = v.localToWorld((k++ % 2 ? -0.7 : 0.7), -(v.hz + 1.0), {});
        a.hidden = false;
        a.inCar = null;
        a.pos.set(w.x, g.physics.groundHeight(w.x, w.z, v.pos.y + 1.5), w.z);
        a.heading = v.yaw + Math.PI;
        a.brain = new LeaveBrain(c.to.door, 7);
        pt.state = 'done';
      }
      if (g.audio.carDoor) g.audio.carDoor(true, 0);
      // A paramedic patches Jay up between calls.
      const p = g.player;
      if (!p.isDead) p.health = Math.min(p.maxHealth, p.health + 10 * c.patients.length);
    }

    // ------------------------------------------------------- vigilante
    _vigilanteCall(level) {
      const g = this.game;
      const V = g.vehicles;
      const p = g.player.pos;
      const net = g.roadnet;
      const cars = level >= 7 ? 2 : 1;
      const riders = level >= 8 ? 2 : level >= 4 ? 1 : 0;
      const types = CROOK_CARS[level >= 7 ? 2 : level >= 4 ? 1 : 0];
      const crooks = [];
      let first = null;
      for (let i = 0; i < cars; i++) {
        let lp = null;
        for (let k = 0; k < 14 && !lp; k++) {
          const q = i === 0 ? net.randomLanePoint(Math.random, p.x, p.z, 160, 320) : net.randomLanePoint(Math.random, first.x, first.z, 25, 90);
          if (!q || (g.isVisible(q.x, 1, q.z, 5) && Math.hypot(q.x - p.x, q.z - p.z) < 200)) continue;
          if (V.list.some((o) => !o.removed && Math.hypot(o.pos.x - q.x, o.pos.z - q.z) < 7)) continue;
          lp = q;
        }
        if (!lp) break;
        if (!first) first = lp;
        const ok = types.filter((t) => VH.Vehicle.typeSpec(t));
        const type = ok.length ? pick(ok) : 'halcyon';
        const car = V.spawn(type, lp.x, lp.z, lp.heading, { role: 'oddjob', persistent: true });
        car.role = 'oddjob';
        car.driver = 'ai';
        car.plow = true;
        car.noEnter = true; // stopped first, then it's anybody's
        const drv = new CrookDriver(g, car, level);
        car.controller = drv;
        if (car.setSpeed) car.setSpeed(10);
        const crew = [];
        for (let k = 0; k < riders && g.combat && g.combat.spawnEnemy; k++) {
          const a = g.combat.spawnEnemy(car.pos.x, car.pos.z, { weapon: level >= 9 && k === 0 ? 'smg' : 'pistol', faction: 'gang', health: 90, accuracy: 0.35 });
          const fight = a.brain;
          a.hidden = true;
          a.inCar = car;
          a.brain = new RiderBrain(g, car, level, k);
          crew.push({ a, fight });
        }
        // Enough bullets through the bodywork and the driver's hit: more from higher levels.
        crooks.push({ v: car, drv, crew, state: 'run', need: 5 + Math.floor(level / 3), box: 0, tail: 0, far: 0 });
      }
      if (!crooks.length) return null;
      const where = this._roadName(first.x, first.z);
      this._say('All units: ' + pick(CRIMES) + ' on ' + where + '.' + (crooks.length > 1 ? ' Two vehicles.' : '') + (riders ? ' Suspects are armed.' : ' Stop that car.'));
      const t = 160 - level * 4 + (crooks.length - 1) * 50;
      return { kind: 'vigilante', crooks, enemies: [], custody: 0, t, late: 'Too slow: the suspects went to ground.' };
    }

    _vigilanteStep(c, dt) {
      const g = this.game;
      const p = g.player.pos;
      let left = 0;
      let near = false;
      let next = null;
      let nextD = Infinity;
      let inside = null; // a stopped car with its armed passengers still in it
      for (const k of c.crooks) {
        const v = k.v;
        if (k.state === 'run') {
          if (v.removed) return 'The suspect got away.';
          const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z);
          // Boxed in: stopped with Jay right on them.
          if (v.speed < 2 && d < v.hz + 8) k.box += dt;
          else k.box = Math.max(0, k.box - dt);
          if (v.wrecked) this._stopCrook(c, k, 'wrecked');
          else if (k.drv.hits >= k.need) this._stopCrook(c, k, 'shot');
          else if (v.health < 420) this._stopCrook(c, k, 'disabled');
          else if (k.box > 1.6 || (k.drv.gaveUp && d < 16 && v.speed < 1.5)) this._stopCrook(c, k, 'boxed');
          else {
            // Stay on their tail long enough and they give up and pull over (sooner when knocked about).
            if (d < 60) k.tail += dt * (v.health < 750 ? 2 : 1);
            if (!k.drv.gaveUp && k.tail > 40) {
              k.drv.giveUp(v);
              g.hud.showToast('The suspect is pulling over: get alongside.');
            }
            // Only a suspect on the run gets away (one still cruising hasn't seen Jay yet).
            if (d > ESCAPE && k.drv.fleeing) {
              k.far += dt;
              if (k.far > 6) return 'The suspect got away.';
            } else k.far = 0;
            if (d < 120) near = true;
            if (d < nextD) {
              nextD = d;
              next = v.pos;
            }
            left++;
            continue;
          }
        }
        // Stopped: the passengers get out once the car has.
        if (k.crew.length && (v.wrecked || v.removed || v.speed < 3)) this._unloadCrew(c, k);
        if (k.crew.length) {
          inside = v.pos;
          near = true;
        }
      }
      // Their friends, out on the street: down, or long gone.
      let armed = null;
      for (let i = c.enemies.length - 1; i >= 0; i--) {
        const a = c.enemies[i];
        const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z);
        if (a.dead || a.removed || d > 160) {
          c.enemies.splice(i, 1);
          if (!a.dead) this._release(a, true); // ran for it: just somebody in the street now
          continue;
        }
        if (d < 80) near = true;
        if (!armed) armed = a.pos;
      }
      // Stopping them is police work: shots fired near the suspects bring no heat.
      this._quiet(near);
      c.left = left;
      if (next) {
        c.target = next;
        c.objective = c.crooks.length > 1 ? 'Stop the suspects (' + left + ' left)' : 'Stop the suspect';
        return null;
      }
      if (armed || inside) {
        c.target = armed || inside;
        c.objective = 'Take out the armed suspects';
        return null;
      }
      return 'done';
    }

    /** A suspect's car is stopped: how decides what happens to the driver. */
    _stopCrook(c, k, how) {
      const g = this.game;
      const v = k.v;
      k.state = how;
      v.plow = false;
      v.noEnter = false;
      if (how === 'shot') k.drv.coast = true;
      else if (!v.wrecked) k.drv.giveUp(v);
      if (how === 'boxed' || how === 'disabled') {
        // Out with their hands up: in custody, and worth a bonus.
        const w = v.localToWorld(-(v.hx + 0.9), 0.4, {});
        const a = g.crowd.spawn(w.x, w.z, { persistent: true, role: 'oddjob', heading: v.yaw - Math.PI / 2, y: v.pos.y });
        a.brain = new LeaveBrain(null, 14, true);
        c.custody++;
        g.hud.popScore('SUSPECT IN CUSTODY');
      } else g.hud.popScore(how === 'shot' ? 'SUSPECT DOWN' : 'SUSPECT STOPPED');
      if (g.audio.checkpoint) g.audio.checkpoint();
    }

    _unloadCrew(c, k) {
      const g = this.game;
      const v = k.v;
      for (let i = 0; i < k.crew.length; i++) {
        const r = k.crew[i];
        const a = r.a;
        if (a.removed || a.dead) continue;
        if (v.wrecked || v.removed) {
          g.crowd.remove(a); // went up with the car
          continue;
        }
        const w = v.localToWorld(i % 2 ? -(v.hx + 0.8) : v.hx + 0.8, i < 2 ? 0.3 : -0.9, {});
        a.inCar = null;
        a.hidden = false;
        a.pos.set(w.x, g.physics.groundHeight(w.x, w.z, v.pos.y + 1.5), w.z);
        a.brain = r.fight;
        if (a.brain && a.brain.setAlert) a.brain.setAlert(a);
        c.enemies.push(a);
      }
      k.crew.length = 0;
    }

    /** Shots fired while stopping a suspect are police work (no heat); restored when it's over. */
    _quiet(on) {
      const m = this.game.missions;
      if (!m) return;
      if (on && !this._quietOn) {
        this._quietPrev = m.suppressHeat;
        m.suppressHeat = true;
        this._quietOn = true;
      } else if (!on && this._quietOn) {
        m.suppressHeat = !!this._quietPrev;
        this._quietOn = false;
      }
    }

    // --------------------------------------------------------- courier
    /** Named places with a kerb to pull up at: the courier's addresses. */
    _addresses() {
      if (this._addr) return this._addr;
      const g = this.game;
      const out = [];
      const seen = new Set();
      const SKIP = /^(pier|rooftop|beach|boardwalk|club|fort|mansion|airport)$/;
      for (const pl of g.places.map.values()) {
        if (seen.has(pl)) continue;
        seen.add(pl);
        if (!pl.name || !pl.kind || pl.roof || pl.y > 1 || SKIP.test(pl.kind) || /\((race|stunt)\)|roof/i.test(pl.name)) continue;
        const lp = g.roadnet.nearestLane(pl.x, pl.z, undefined, 40);
        if (!lp) continue;
        const q = lp.road.parking ? g.roadnet.parkingPoint(lp.road, lp.dir, lp.along) : lp;
        const gh = g.physics.groundHeight(q.x, q.z, 50);
        if (gh > 0.8 || gh < -0.1) continue;
        out.push({ x: q.x, z: q.z, name: pl.name, id: pl.id });
      }
      return (this._addr = out);
    }

    _courierCall(level) {
      const g = this.game;
      const p = g.player.pos;
      const all = this._addresses();
      const n = level >= 7 ? 3 : level >= 4 ? 2 : 1;
      const maxD = level <= 3 ? 750 : 1000;
      const drops = [];
      let fx = p.x;
      let fz = p.z;
      let route = 0;
      for (let i = 0; i < n; i++) {
        const cand = all.filter((a) => {
          const d = Math.hypot(a.x - fx, a.z - fz);
          return d > 220 && d < maxD && Math.hypot(a.x - p.x, a.z - p.z) > 150 && !drops.some((o) => o.id === a.id || Math.hypot(o.x - a.x, o.z - a.z) < 120);
        });
        if (!cand.length) break;
        const to = pick(cand);
        drops.push({ x: to.x, z: to.z, name: to.name, id: to.id, item: '', done: false });
        route += Math.hypot(to.x - fx, to.z - fz);
        fx = to.x;
        fz = to.z;
      }
      if (!drops.length) return null;
      // From level 2 about one call in three is fragile.
      const fragile = level >= 2 && Math.random() < 0.35 ? pick(FRAGILE) : null;
      for (const d of drops) d.item = pick(PARCELS);
      if (fragile) drops[0].item = fragile;
      const t = (route * 1.3) / (11 + level * 0.35) + drops.length * 6 + Math.max(10, 28 - level * 1.8);
      this._say(drops.length === 1
        ? 'Swiftline to the van: ' + drops[0].item + ' for ' + drops[0].name + '.' + (fragile ? ' Fragile, so go easy.' : '')
        : 'Swiftline to the van: ' + drops.length + ' drops this run. First up, ' + drops[0].name + '.' + (fragile ? ' One of them is ' + fragile + ', so go easy.' : ''));
      return { kind: 'courier', drops, fragile, cond: 100, t, late: 'Too late: the customer cancelled.' };
    }

    _courierStep(c) {
      const g = this.game;
      const S = this.shift;
      const v = g.player.vehicle;
      const inVan = v && v === S.v;
      let left = 0;
      let next = null;
      let nextD = Infinity;
      for (const d of c.drops) {
        if (d.done) continue;
        const dist = Math.hypot(S.v.pos.x - d.x, S.v.pos.z - d.z);
        if (inVan && v.speed < 3 && dist < 10) {
          d.done = true;
          g.hud.popScore('DELIVERED: ' + d.name.toUpperCase());
          if (g.audio.carDoor) g.audio.carDoor(true, 0);
          continue;
        }
        left++;
        const dj = Math.hypot(g.player.pos.x - d.x, g.player.pos.z - d.z);
        if (dj < nextD) {
          nextD = dj;
          next = d;
        }
      }
      c.left = left;
      if (!left) return 'done';
      c.target = next;
      c.objective = c.drops.length === 1 ? 'Deliver ' + next.item + ' to ' + next.name : 'Next drop: ' + next.name;
      return null;
    }

    // ------------------------------------------------------ call done
    _callDone(c) {
      const g = this.game;
      const S = this.shift;
      const job = S.job;
      const d = this.data[job];
      const base = basePay(c.level) * (c.kind === 'courier' && c.fragile ? 1.25 : 1);
      const timeLeft = clamp(c.t / c.total, 0, 1);
      let tip = 0;
      if (c.kind === 'paramedic') tip = base * (0.3 * (c.cond / 100) + 0.2 * timeLeft);
      else if (c.kind === 'courier') tip = base * 0.45 * timeLeft * (c.fragile ? c.cond / 100 : 1);
      else tip = base * 0.2 * timeLeft + 75 * c.custody; // brought in alive: a bonus each
      const rep = g.rep && g.rep.perk ? g.rep.perk('oddjob') : 1; // Street Rep perk (rep.js)
      const own = job === 'courier' && d.mastered ? 1 + PERK_COURIER : 1;
      const pay = Math.max(5, Math.round(((base + tip) * rep * own) / 5) * 5);
      g.giveMoney(pay, 'oddjob');
      if (g.audio.cash) g.audio.cash();
      g.hud.popScore(JOBS[job].name.toUpperCase() + ' · LEVEL ' + c.level, pay);
      d.calls++;
      d.earned += pay;
      S.calls++;
      S.pay += pay;
      d.best = Math.max(d.best, S.calls);
      this._clearCall(S);
      this._quiet(false);
      S.gap = GAP;
      VH.events.emit('oddjob:done', { job, level: c.level, pay });
      if (!d.mastered && c.level >= d.level) {
        VH.events.emit('oddjob:level', { job, level: c.level });
        if (c.level >= MAX_LEVEL) this._master(job);
        else {
          d.level = c.level + 1;
          g.hud.showToast(JOBS[job].name + ': level ' + c.level + ' cleared');
        }
      }
      S.level = d.level;
      if (g._autoSaveSoon) g._autoSaveSoon();
    }

    /** All ten levels: the bonus and the perk, for good. */
    _master(job) {
      const g = this.game;
      const d = this.data[job];
      const J = JOBS[job];
      d.mastered = true;
      d.level = MAX_LEVEL;
      g.giveMoney(BONUS, 'oddjob');
      this._applyVitals(true);
      g.hud.centerBanner(J.name.toUpperCase() + ' MASTERED', 'All ten levels · ' + money(BONUS) + ' bonus · ' + J.perk);
      g.hud.notify({ title: J.name + ' mastered', text: 'A ' + money(BONUS) + ' bonus, and ' + J.perk + ' for good. The calls keep coming at the top rate.', icon: J.icon, duration: 9000 });
      if (g.audio.success) g.audio.success('gold');
      else if (g.audio.missionPassed) g.audio.missionPassed();
    }

    /** Put the paramedic and vigilante perks on the player (only the difference from what's there). */
    _applyVitals(topUp) {
      const p = this.game.player;
      if (!p) return;
      const hp = this.data.paramedic.mastered ? PERK_HEALTH : 0;
      const ar = this.data.vigilante.mastered ? PERK_ARMOR : 0;
      const dh = hp - this._hpOn;
      if (dh) {
        p.maxHealth = Math.max(1, p.maxHealth + dh);
        this._hpOn = hp;
        if (topUp && dh > 0 && !p.isDead) p.health = Math.min(p.maxHealth, p.health + dh);
        else p.health = Math.min(p.health, p.maxHealth);
      }
      const da = ar - this._armorOn;
      if (da) {
        p.maxArmor = Math.max(1, p.maxArmor + da);
        this._armorOn = ar;
        if (topUp && da > 0) p.armor = Math.min(p.maxArmor, p.armor + da);
        else p.armor = Math.min(p.armor, p.maxArmor);
      }
    }

    /** Take the current call's people and cars out of the world (or let them go). */
    _clearCall(S) {
      const g = this.game;
      const c = S.call;
      S.call = null;
      g.route = null;
      g.hud.trackObjective(null);
      g.hud.setObjectiveText(null);
      if (!c) return;
      if (c.patients) for (const pt of c.patients) this._release(pt.a);
      if (c.crooks) {
        for (const k of c.crooks) {
          for (const r of k.crew) this._release(r.a);
          this._releaseCar(k.v);
        }
        for (const a of c.enemies) this._release(a, true);
      }
    }

    _release(a, flee) {
      const g = this.game;
      if (!a || a.removed) return;
      if (a.hidden || a.inCar) {
        g.crowd.remove(a);
        return;
      }
      if (a.brain instanceof LeaveBrain) return; // walking off already
      a.persistent = false;
      if (a.dead) return;
      const d = Math.hypot(a.pos.x - g.player.pos.x, a.pos.z - g.player.pos.z);
      if (d > 70 || !g.isVisible(a.pos.x, a.pos.y + 1, a.pos.z, 1.2)) {
        g.crowd.remove(a);
        return;
      }
      // In sight: up and away.
      a.brain = null;
      a.down = null;
      a.state = 'flee';
      a.flee = { x: g.player.pos.x, z: g.player.pos.z, t: flee ? 8 : 4 };
      a.anim.cower = 0;
      a.anim.handsUp = 0;
      a.anim.sprint = !!flee;
    }

    _releaseCar(v) {
      const g = this.game;
      if (!v || v.removed || v.driver === 'player') return;
      const d = Math.hypot(v.pos.x - g.player.pos.x, v.pos.z - g.player.pos.z);
      if (d > 120 || !g.isVisible(v.pos.x, v.pos.y + 1, v.pos.z, 3)) {
        g.vehicles.remove(v);
        return;
      }
      v.controller = null;
      v.driver = null;
      v.input.accel = 0;
      v.input.steer = 0;
      v.input.boost = 0;
      v.input.handbrake = 1;
      v.plow = false;
      v.noEnter = false;
      v.role = v.wrecked ? 'wreck' : 'abandoned';
      v.persistent = false;
    }

    // ------------------------------------------------------------ HUD
    _buildHud() {
      const hud = this.game.hud;
      if (!hud || !hud.root) return;
      const el = document.createElement('div');
      el.className = 'vh-jobs';
      el.innerHTML =
        '<div class="oj-head"><span class="oj-icon"></span><span class="oj-name"></span><span class="oj-level">LEVEL <b></b><em>/' + MAX_LEVEL + '</em></span></div>' +
        '<div class="oj-pips">' + '<i></i>'.repeat(MAX_LEVEL) + '</div>' +
        '<div class="oj-main"><div class="oj-clock"><small class="oj-tlabel">CALL</small><span class="oj-timer"></span></div>' +
        '<div class="oj-earn"><small>THIS SHIFT</small><span class="oj-pay"></span></div></div>' +
        '<div class="oj-meter"><span class="oj-mlabel"></span><div class="oj-bar"><i></i></div><span class="oj-mval"></span></div>' +
        '<div class="oj-status"></div>';
      hud.root.appendChild(el);
      const q = (s) => el.querySelector(s);
      this.ui = {
        el, icon: q('.oj-icon'), name: q('.oj-name'), level: q('.oj-level b'), pips: Array.from(el.querySelectorAll('.oj-pips i')),
        tlabel: q('.oj-tlabel'), timer: q('.oj-timer'), pay: q('.oj-pay'), meter: q('.oj-meter'), mlabel: q('.oj-mlabel'), fill: q('.oj-bar i'), mval: q('.oj-mval'), status: q('.oj-status'),
      };
    }

    _set(key, value, apply) {
      if (this._cache[key] === value) return;
      this._cache[key] = value;
      apply(value);
    }

    _hud() {
      const U = this.ui;
      if (!U) return;
      const S = this.shift;
      this._set('on', !!S, (v) => {
        if (v) this._cache = { on: true }; // a new shift: draw everything afresh
        U.el.classList.toggle('visible', v);
      });
      if (!S) return;
      const g = this.game;
      const J = JOBS[S.job];
      const d = this.data[S.job];
      const c = S.call;
      this._set('job', S.job, (v) => {
        U.el.className = 'vh-jobs visible oj-' + v;
        U.icon.textContent = J.icon;
        U.name.textContent = J.name.toUpperCase();
      });
      const lvl = c ? c.level : S.level;
      this._set('lvl', lvl, (v) => (U.level.textContent = String(v)));
      // Pips: the levels cleared, and the one being played.
      const cleared = d.mastered ? MAX_LEVEL : d.level - 1;
      this._set('pips', cleared * 100 + lvl, () => {
        U.pips.forEach((p, i) => {
          p.className = i < cleared ? 'on' : i === lvl - 1 ? 'now' : '';
        });
      });
      this._set('mastered', d.mastered, (v) => U.el.classList.toggle('oj-mastered', v));
      // The call's clock, or the wait for the next call.
      this._set('wait', !c, (v) => {
        U.el.classList.toggle('oj-wait', v);
        U.tlabel.textContent = v ? 'NEXT CALL' : 'CALL';
      });
      this._set('t', Math.max(0, Math.ceil(c ? c.t : S.gap)), (v) => (U.timer.textContent = clock(v)));
      this._set('urgent', !!c && c.t < 15, (v) => U.el.classList.toggle('oj-urgent', v));
      this._set('pay', S.pay, (v) => (U.pay.textContent = money(v)));
      // The meter: condition (paramedic, a fragile parcel), parcels or suspects.
      let label = '';
      let k = -1;
      let val = '';
      if (c && c.kind === 'paramedic') {
        label = 'CONDITION';
        k = c.cond / 100;
        val = Math.ceil(c.cond) + '%';
      } else if (c && c.kind === 'courier') {
        const done = c.drops.length - (c.left === undefined ? c.drops.length : c.left);
        if (c.fragile) {
          label = 'FRAGILE';
          k = c.cond / 100;
          val = Math.ceil(c.cond) + '%';
        } else {
          label = 'PARCELS';
          k = done / c.drops.length;
          val = done + '/' + c.drops.length;
        }
      } else if (c && c.kind === 'vigilante') {
        const n = c.crooks.length;
        const done = n - (c.left === undefined ? n : c.left);
        label = 'SUSPECTS';
        k = done / n;
        val = done + '/' + n;
      }
      this._set('mlabel', label, (v) => {
        U.mlabel.textContent = v;
        U.meter.classList.toggle('visible', !!v);
      });
      const kk = k < 0 ? -1 : Math.round(k * 100);
      this._set('mfill', kk, (v) => {
        U.fill.style.width = Math.max(0, v) + '%';
        U.meter.classList.toggle('low', label !== 'PARCELS' && label !== 'SUSPECTS' && v >= 0 && v < 35);
      });
      this._set('mval', val, (v) => (U.mval.textContent = v));
      this._set('ouch', !!(c && c.ouch > 0), (v) => U.meter.classList.toggle('ouch', v));
      // The status line: what to do now, or the warning that matters most.
      let status;
      let warn = false;
      const p = g.player;
      if (p.vehicle !== S.v) {
        status = 'Get back in the ' + J.vehicle + ': ' + clock(J.out - S.outT);
        warn = true;
      } else if (!c) status = S.calls ? 'Next call coming in…' : 'Waiting for a call…';
      else if (c.kind === 'paramedic') {
        const n = c.patients.length;
        status = c.aboard < n ? (n > 1 ? 'Patients aboard ' + c.aboard + '/' + n + ' · stop beside them' : 'Stop beside the patient') : 'Drive smoothly: every knock hurts';
      } else if (c.kind === 'courier') {
        const n = c.drops.length;
        const fr = !c.fragile ? 'Quicker means a bigger tip' : c.cond <= 0 ? 'Broken: no tip' : c.drops[0].done ? 'Fragile parcel delivered safely' : 'Fragile: knocks cost the tip';
        status = (n > 1 ? 'Parcels ' + (n - (c.left === undefined ? n : c.left)) + '/' + n + ' · ' : '') + fr;
      } else {
        const armed = c.enemies.length;
        status = armed ? armed + ' armed suspect' + (armed > 1 ? 's' : '') + ' on foot' : 'Box them in, ram them or shoot the driver';
      }
      this._set('status', status, (v) => (U.status.textContent = v));
      this._set('warn', warn, (v) => U.status.classList.toggle('warn', v));
    }

    // ------------------------------------------------------------ world
    blips(out, missionRunning) {
      if (missionRunning) return;
      const S = this.shift;
      const c = S && S.call;
      if (c) {
        if (c.kind === 'paramedic') {
          let waiting = 0;
          for (const pt of c.patients) {
            if (pt.state === 'wait' || pt.state === 'board') {
              waiting++;
              out.push({ x: pt.a.pos.x, z: pt.a.pos.z, type: 'objective', label: 'Patient' });
            }
          }
          if (!waiting) out.push({ x: c.to.x, z: c.to.z, type: 'objective', label: c.to.name });
        } else if (c.kind === 'courier') {
          for (const d of c.drops) if (!d.done) out.push({ x: d.x, z: d.z, type: 'objective', label: 'Drop-off: ' + d.name });
        } else {
          for (const k of c.crooks) if (k.state === 'run' && !k.v.removed) out.push({ x: k.v.pos.x, z: k.v.pos.z, type: 'objective', label: 'Suspect' });
          for (const a of c.enemies) out.push({ x: a.pos.x, z: a.pos.z, type: 'enemy', label: 'Armed suspect' });
        }
      }
      for (const dp of this.depots) {
        if (S && S.job === dp.job) continue;
        out.push({ x: dp.x, z: dp.z, type: 'oddjob', label: JOBS[dp.job].name + ': ' + dp.name, noRim: true });
      }
    }

    stats() {
      const rows = [];
      let total = 0;
      for (const id of IDS) {
        const d = this.data[id];
        total += d.earned;
        rows.push([JOBS[id].name + ' level', (d.mastered ? MAX_LEVEL + ' / ' + MAX_LEVEL + ' ★' : d.level + ' / ' + MAX_LEVEL) + (d.calls ? ' · ' + d.calls + (d.calls === 1 ? ' call' : ' calls') : '')]);
      }
      rows.push(['Odd-job pay', money(total)]);
      return rows;
    }

    // ------------------------------------------------------------- save
    serialize() {
      const jobs = {};
      for (const id of IDS) {
        const d = this.data[id];
        jobs[id] = { level: d.level, calls: d.calls, earned: d.earned, best: d.best, mastered: d.mastered };
      }
      return { v: 1, jobs, seen: Object.keys(this.seen) };
    }

    load(d) {
      this.reset();
      if (!d || !d.jobs) return;
      for (const id of IDS) {
        const s = d.jobs[id];
        if (!s) continue;
        const o = this.data[id];
        o.mastered = !!s.mastered;
        o.level = o.mastered ? MAX_LEVEL : clamp(Math.floor(s.level) || 1, 1, MAX_LEVEL);
        o.calls = Math.max(0, Math.floor(s.calls) || 0);
        o.earned = Math.max(0, Math.floor(s.earned) || 0);
        o.best = Math.max(0, Math.floor(s.best) || 0);
      }
      for (const id of d.seen || []) this.seen[id] = true;
      this._applyVitals(false);
    }

    reset() {
      this.endShift('reset');
      this._quiet(false);
      this.data = OddJobs.fresh();
      this.seen = {};
      this._depotCars.length = 0;
      this._applyVitals(false);
      this._hud();
    }

    stop() {
      this.endShift('reset');
    }
  }

  OddJobs.JOBS = JOBS;
  OddJobs.MAX_LEVEL = MAX_LEVEL;
  OddJobs.basePay = basePay;
  VH.OddJobs = OddJobs;
})();
