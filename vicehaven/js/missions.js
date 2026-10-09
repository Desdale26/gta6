/*
 * missions.js — the story engine. Runs the missions in VH.Data.story
 * (see docs/mission-format.md), step by step:
 *
 *   start markers    available jobs glow on the street (and on the map);
 *                    walk into one and press E. You can't start one with
 *                    the police on your tail
 *   steps            scenes, blackouts, phone calls, texts, goto, cars,
 *                    people, crew, fights, waves, chases, tails, races,
 *                    deliveries, pickups, heat, choices and branches
 *   fail conditions  knocked out, arrested, a protected character killed,
 *                    a mission car wrecked, crew left behind, time up,
 *                    a target escaping or spotting you
 *   checkpoints      a failed mission can be retried from its last checkpoint
 *   cinematics       letterboxed cutscenes with an automatic camera that
 *                    cuts between speakers
 *
 * Progress (completed jobs, flags, money, weapons, stats) is saved to the
 * browser after every job, and on Save in the pause menu.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, smoothstep, dampAngle } = VH.math;
  const SAVE_KEY = 'vicehaven.save.v1';

  class MissionFailed extends Error {
    constructor(reason) {
      super(reason);
      this.reason = reason;
    }
  }

  class Aborted extends Error {}

  // ------------------------------------------------------------ brains
  /** A story character standing about: faces Jay, gestures when speaking. */
  // Story cars with names of their own ("Lulu", "Constance") don't take "the".
  const CAR_NAMES = {
    lulu: 'Lulu', medic12: 'Medic 12', constance: 'Constance', foxes_car: 'the Foxes\' car', dex_tow: 'Dex\'s tow truck',
    calder_car: 'Calder\'s car', horne_cruiser: 'Horne\'s cruiser', voss_car: 'Voss\'s Sovereign', solace_van: 'Solace\'s van', teo_ride: 'Teo\'s lowrider',
  };
  function carRef(v, capital) {
    const n = v.storyName || 'the ' + v.name;
    return capital ? n.charAt(0).toUpperCase() + n.slice(1) : n;
  }

  class IdleBrain {
    constructor(engine) {
      this.engine = engine;
    }

    update(a, dt) {
      a.moveSpeed = 0;
      const p = this.engine.game.player;
      const d = Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
      if (a.lookAt) a.heading = dampAngle(a.heading, Math.atan2(a.lookAt.x - a.pos.x, a.lookAt.z - a.pos.z), 4, dt);
      else if (d < 9) a.heading = dampAngle(a.heading, Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z), 3, dt);
      const speaking = this.engine.game.dialogue.speaker === a.charId;
      a.anim.talk = speaking ? 1 : Math.max(0, a.anim.talk - dt * 2);
      if (a.goal) {
        const gx = a.goal.x - a.pos.x;
        const gz = a.goal.z - a.pos.z;
        const gd = Math.hypot(gx, gz);
        if (gd > 0.5) {
          a.heading = dampAngle(a.heading, Math.atan2(gx, gz), 8, dt);
          a.moveSpeed = a.goal.run ? 5 : 1.5;
          a.anim.sprint = !!a.goal.run;
        } else a.goal = null;
      }
    }
  }

  /** Crew: follows Jay, rides in his car, fights beside him. */
  class CrewBrain {
    constructor(engine, weapon) {
      this.engine = engine;
      this.weapon = weapon || 'pistol';
      this._fireT = 1;
      this._think = 0;
      this.target = null;
      this.seat = null;
    }

    update(a, dt) {
      if (a.dead) return;
      const game = this.engine.game;
      const p = game.player;
      const v = p.vehicle;
      // Riding along.
      if (a.inCar) {
        const car = a.inCar;
        if (car.removed || car.wrecked || car !== v) {
          this._getOut(a, car);
        } else {
          a.pos.copy(car.pos);
          a.pos.y += 0.3;
          // Shoot out of the window at enemies and police.
          this._fireT -= dt;
          if (this._fireT <= 0) {
            this._fireT = 0.6 + Math.random() * 0.8;
            const t = this._nearestHostile(a, 30);
            if (t && game.combat) game.combat.npcFire(a, t, this.weapon, 0.35);
          }
          return;
        }
      }
      if (v && !a.inCar) {
        // Get in: run to the car, then hop in.
        const d = Math.hypot(v.pos.x - a.pos.x, v.pos.z - a.pos.z);
        if (d < v.hx + 1.8 || (d < 25 && this._waitCar > 6)) {
          const seats = (v.spec.seats || 4) - 1;
          const riders = this.engine.crewIn(v).length;
          if (riders < seats) {
            a.inCar = v;
            a.hidden = true;
            this._waitCar = 0;
            VH.events.emit('vehicle:door', { v, open: true });
            return;
          }
        }
        this._waitCar = (this._waitCar || 0) + dt;
        a.heading = dampAngle(a.heading, Math.atan2(v.pos.x - a.pos.x, v.pos.z - a.pos.z), 8, dt);
        a.moveSpeed = d > 1.5 ? 5.2 : 0;
        a.anim.sprint = true;
        a.anim.aim = 0;
        return;
      }
      this._waitCar = 0;
      // Fight nearby enemies.
      this._think -= dt;
      if (this._think <= 0) {
        this._think = 0.5;
        this.target = this._nearestHostile(a, 35);
      }
      const t = this.target;
      if (t && !t.dead) {
        const dx = t.pos.x - a.pos.x;
        const dz = t.pos.z - a.pos.z;
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 8, dt);
        a.anim.aim = 1;
        a.anim.weaponPose = this.weapon === 'pistol' || this.weapon === 'revolver' ? 'pistol' : 'rifle';
        a.moveSpeed = 0;
        this._fireT -= dt;
        if (this._fireT <= 0) {
          this._fireT = 0.45 + Math.random() * 0.6;
          if (game.combat) game.combat.npcFire(a, t, this.weapon, 0.55);
        }
        return;
      }
      // Follow Jay.
      a.anim.aim = 0;
      const dx = p.pos.x - a.pos.x;
      const dz = p.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      const slot = this.engine.crewIndex(a);
      if (d > 2.4 + slot * 0.9) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 7, dt);
        a.moveSpeed = d > 7 ? 5.3 : d > 4 ? 3.2 : 1.6;
        a.anim.sprint = d > 7;
      } else {
        a.moveSpeed = 0;
        a.anim.talk = game.dialogue.speaker === a.charId ? 1 : 0;
        if (d > 0.1) a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 3, dt);
      }
      // Too far behind (Jay drove off on foot?): catch up.
      if (d > 60 && !p.inVehicle) {
        a.pos.set(p.pos.x - Math.sin(p.heading) * 3, p.pos.y, p.pos.z - Math.cos(p.heading) * 3);
      }
    }

    _getOut(a, car) {
      a.inCar = null;
      a.hidden = false;
      const side = (this.engine.crewIndex(a) % 2 ? -1 : 1);
      const w = car.localToWorld(side * (car.hx + 0.7), -0.6 - this.engine.crewIndex(a) * 0.4, {});
      a.pos.set(w.x, this.engine.game.physics.groundHeight(w.x, w.z, car.pos.y + 1.5), w.z);
      a.heading = car.yaw;
    }

    _nearestHostile(a, r) {
      let best = null;
      let bestD = r;
      for (const b of this.engine.game.crowd.agents) {
        if (b.dead || b.hidden || !this.engine.isHostile(b)) continue;
        const d = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      return best;
    }
  }

  /** Runs, then cowers. */
  class FleeBrain {
    constructor(engine, from, seconds) {
      this.engine = engine;
      this.from = from;
      this.t = seconds || 6 + Math.random() * 3;
    }

    update(a, dt) {
      this.t -= dt;
      const p = this.from || this.engine.game.player.pos;
      if (this.t > 0) {
        a.heading = dampAngle(a.heading, Math.atan2(a.pos.x - p.x, a.pos.z - p.z), 5, dt);
        a.moveSpeed = 5;
        a.anim.sprint = true;
      } else {
        a.moveSpeed = 0;
        a.anim.cower = 1;
      }
    }
  }

  /** Someone who has left the crew: they walk off and fade out of the scene. */
  class LeaveBrain {
    constructor(engine) {
      this.engine = engine;
      this.t = 0;
    }

    update(a, dt) {
      const game = this.engine.game;
      this.t += dt;
      a.anim.talk = game.dialogue.speaker === a.charId ? 1 : Math.max(0, a.anim.talk - dt * 2);
      if (this.t < 1.2) {
        a.moveSpeed = 0;
        return;
      }
      const p = game.player.pos;
      a.heading = dampAngle(a.heading, Math.atan2(a.pos.x - p.x, a.pos.z - p.z), 2, dt);
      a.moveSpeed = 1.4;
      const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z);
      if ((d > 35 && !game.isVisible(a.pos.x, a.pos.y + 1, a.pos.z, 1)) || d > 70 || this.t > 40) {
        a.hidden = true;
        a.moveSpeed = 0;
      }
    }
  }

  // --------------------------------------------------- AI drivers for story
  /** A target car that runs through the city. */
  class FleeDriver {
    constructor(engine, v, route) {
      this.engine = engine;
      this.game = engine.game;
      this.lane = new VH.LaneDriver(this.game.traffic, { aggressive: true, speedMul: 1.4, ignoreRed: true, gap: 0.7 });
      this.lane.maxSpeed = 31;
      this.route = route || null;
      this.ri = 0;
      const lp = this.game.roadnet.nearestLane(v.pos.x, v.pos.z, v.yaw);
      if (lp) this.lane.initAt(lp);
      this._t = 0;
    }

    onBump() {}

    update(v, dt) {
      this._t -= dt;
      if (this._t <= 0) {
        this._t = 2;
        if (this.route && this.route.length) {
          const p = this.route[this.ri % this.route.length];
          if (Math.hypot(p.x - v.pos.x, p.z - v.pos.z) < 40) this.ri++;
          this.lane.destination = this.route[this.ri % this.route.length];
        } else {
          // Away from Jay.
          const pp = this.game.player.pos;
          this.lane.destination = { x: v.pos.x + (v.pos.x - pp.x) * 3, z: v.pos.z + (v.pos.z - pp.z) * 3 };
        }
        const lp = this.game.roadnet.nearestLane(v.pos.x, v.pos.z, v.yaw);
        if (lp && lp.dist > 7) this.lane.initAt(lp);
      }
      this.lane.update(v, dt);
    }
  }

  /** Drives somewhere at normal speed (the car Jay tails). */
  class TourDriver {
    constructor(engine, v, dest, opts) {
      this.game = engine.game;
      this.lane = new VH.LaneDriver(this.game.traffic, Object.assign({ speedMul: 0.95 }, opts || {}));
      this.lane.destination = dest;
      this.dest = dest;
      const lp = this.game.roadnet.nearestLane(v.pos.x, v.pos.z, v.yaw);
      if (lp) this.lane.initAt(lp);
    }

    onBump(v, other) {
      if (other && other.driver === 'player') this.bumped = true;
    }

    update(v, dt) {
      const d = Math.hypot(this.dest.x - v.pos.x, this.dest.z - v.pos.z);
      if (d < 14) {
        v.input.accel = v.speed > 0.5 ? -1 : 0;
        v.input.steer = 0;
        v.input.handbrake = 1;
        this.arrived = true;
        return;
      }
      this.lane.update(v, dt);
    }
  }

  /** A street racer: follows the checkpoints on the road network, fast. */
  class RaceDriver {
    constructor(engine, v, checkpoints, skill) {
      this.game = engine.game;
      this.cps = checkpoints;
      this.i = 0;
      this.skill = skill || 1;
      this.lane = new VH.LaneDriver(this.game.traffic, { aggressive: true, speedMul: 1.5 * this.skill, ignoreRed: true, gap: 0.6 });
      this.lane.maxSpeed = 30 + 12 * this.skill;
      const lp = this.game.roadnet.nearestLane(v.pos.x, v.pos.z, v.yaw);
      if (lp) this.lane.initAt(lp);
      this.lane.destination = this.cps[0];
      this.finished = false;
      this.go = false;
    }

    onBump() {}

    update(v, dt) {
      if (!this.go) {
        v.input.accel = 0;
        v.input.handbrake = 1;
        return;
      }
      if (this.finished) {
        v.input.accel = v.speed > 1 ? -0.6 : 0;
        return;
      }
      const cp = this.cps[this.i];
      if (Math.hypot(cp.x - v.pos.x, cp.z - v.pos.z) < 14) {
        this.i++;
        if (this.i >= this.cps.length) {
          this.finished = true;
          this.finishTime = this.game.time;
          return;
        }
        this.lane.destination = this.cps[this.i];
        const lp = this.game.roadnet.nearestLane(v.pos.x, v.pos.z, v.yaw);
        if (lp) this.lane.initAt(lp);
      }
      // Close to the checkpoint and off the lane path: aim straight at it.
      this.lane.update(v, dt);
      v.input.boost = 0;
    }
  }

  // ------------------------------------------------------------- engine
  class MissionEngine {
    constructor(game) {
      this.game = game;
      this.story = VH.Data.story || { characters: {}, places: {}, missions: [], side: [] };
      this.completed = {};
      this.flags = {};
      this.run = null; // the mission in progress
      this.markers = [];
      this.cinematic = null;
      this.suppressHeat = false;
      this._waiters = [];
      this._abort = null;
      this._markerTime = 0;
      this.stats = { missions: 0, side: 0 };
      this.game.dialogue.addCast(this.story.characters || {});
      this.game.places.define(this.story.places || {});
      this._index();
      this._buildMarkerAssets();
      this._bindEvents();
    }

    _index() {
      this.all = new Map();
      this.main = (this.story.missions || []).slice();
      this.main.forEach((m, i) => {
        m._main = true;
        m._index = i;
        if (!m.requires) m.requires = i > 0 ? [this.main[i - 1].id] : [];
        this.all.set(m.id, m);
      });
      this.side = this.story.side || [];
      for (const chain of this.side) {
        chain.missions.forEach((m, i) => {
          m._chain = chain;
          if (!m.requires) m.requires = i > 0 ? [chain.missions[i - 1].id] : chain.unlockAfter ? [chain.unlockAfter] : [];
          if (!m.giver) m.giver = chain.giver;
          this.all.set(m.id, m);
        });
      }
    }

    _bindEvents() {
      VH.events.on('player:died', () => this.fail('You were knocked out.'));
      VH.events.on('player:arrested', () => this.fail('You were arrested.'));
    }

    // --------------------------------------------------------- progress
    isAvailable(m) {
      if (this.completed[m.id] && !m.repeatable) return false;
      for (const r of m.requires || []) if (!this.completed[r]) return false;
      if (m.requiresFlag && !this.flags[m.requiresFlag]) return false;
      return true;
    }

    available() {
      const out = [];
      for (const m of this.all.values()) if (this.isAvailable(m)) out.push(m);
      return out;
    }

    get nextMain() {
      return this.main.find((m) => !this.completed[m.id]) || null;
    }

    get progress() {
      const total = this.all.size;
      const done = Object.keys(this.completed).filter((id) => this.all.has(id)).length;
      return { done, total, pct: total ? done / total : 0 };
    }

    // ---------------------------------------------------------- markers
    _buildMarkerAssets() {
      this._ringGeo = new THREE.RingGeometry(1.8, 2.3, 48).rotateX(-Math.PI / 2);
      this._beamGeo = new THREE.CylinderGeometry(0.9, 0.9, 30, 20, 1, true).translate(0, 15, 0);
      this._objGroup = new THREE.Group();
      this._objGroup.name = 'mission objective';
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.8, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.3), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      const beam = new THREE.Mesh(this._beamGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.2), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      this._objGroup.add(ring, beam);
      this._objRing = ring;
      this._objGroup.visible = false;
      this.game.scene.add(this._objGroup);
    }

    _markerFor(m) {
      const place = this.game.places.get(m.start);
      if (!place) return null;
      const color = m._main ? new THREE.Color(3, 1.3, 0.35) : new THREE.Color(0.4, 1.6, 3);
      const g = new THREE.Group();
      const ring = new THREE.Mesh(this._ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      const beam = new THREE.Mesh(this._beamGeo, new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(0.55), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      g.add(ring, beam);
      g.position.set(place.x, (place.y || 0.15) + 0.03, place.z);
      g.name = 'job marker ' + m.id;
      this.game.scene.add(g);
      const item = {
        id: 'mission:' + m.id, kind: 'mission', mission: m, x: place.x, y: (place.y || 0.15) + 1, z: place.z, radius: 2.8,
        label: (m._main ? 'Start ' : 'Side job: ') + '“' + m.title + '”',
      };
      this.game.interaction.register(item);
      return { m, g, ring, item, place };
    }

    refreshMarkers() {
      for (const mk of this.markers) {
        this.game.scene.remove(mk.g);
        mk.item.enabled = false;
      }
      this.game.interaction.items = this.game.interaction.items.filter((it) => it.kind !== 'mission');
      this.markers = [];
      if (this.run) return;
      for (const m of this.available()) {
        if (m.start === 'chain') continue;
        const mk = this._markerFor(m);
        if (mk) this.markers.push(mk);
      }
    }

    /** Minimap blips for jobs and the current objective. */
    blips(out) {
      if (!this.run) {
        for (const mk of this.markers) out.push({ x: mk.place.x, z: mk.place.z, type: mk.m._main ? 'mission' : 'challenge', label: mk.m.title });
        return;
      }
      const r = this.run;
      if (r.marker) out.push({ x: r.marker.x, z: r.marker.z, type: 'objective', label: r.objective || '' });
      for (const a of r.targets || []) if (!a.dead && !a.hidden) out.push({ x: a.pos.x, z: a.pos.z, type: 'enemy' });
      for (const c of r.targetCars || []) if (!c.removed && !c.wrecked) out.push({ x: c.pos.x, z: c.pos.z, type: 'enemy', heading: c.yaw });
      for (const id of r.crew) {
        const a = r.actors.get(id);
        if (a && !a.dead && !a.hidden) out.push({ x: a.pos.x, z: a.pos.z, type: 'mission', label: a.name });
      }
      for (const c of r.watchCars || []) if (!c.removed && !c.wrecked && c.driver !== 'player') out.push({ x: c.pos.x, z: c.pos.z, type: 'car' });
    }

    // ------------------------------------------------------------- start
    start(m, fromCheckpoint) {
      const game = this.game;
      if (this.run) return;
      if (game.police.level > 0) {
        game.hud.notify({ title: 'Too hot', text: 'Lose the police before you start a job.', icon: '✕', tone: 'bad' });
        return;
      }
      if (game.challenges && game.challenges.active) game.challenges.abandon(true);
      const run = (this.run = {
        m, actors: new Map(), cars: new Map(), groups: new Map(), crew: [], protect: new Set(), failIf: (m.failIf || []).slice(),
        marker: null, objective: '', timer: null, targets: [], targetCars: [], watchCars: [], checkpoint: fromCheckpoint || 0,
        stepIndex: 0, started: game.time, token: {}, money: game.player.money,
      });
      this._abort = run.token;
      document.body.classList.add('on-mission');
      this.refreshMarkers();
      game.hud.missionTitle(m.title, m._main ? 'Act ' + (m.act || 1) : (m._chain ? m._chain.title : 'Side job'));
      if (game.audio.missionStart) game.audio.missionStart();
      VH.events.emit('mission:start', { m });
      if (m.time !== undefined && !fromCheckpoint) this._setTime(m.time, true);
      this._runSteps(m.steps, run, fromCheckpoint || 0)
        .then(() => {
          if (this.run === run) this._pass(run);
        })
        .catch((err) => {
          if (err instanceof Aborted) return;
          if (err instanceof MissionFailed) return; // _fail already handled it
          console.error('[missions] step error', err);
          if (this.run === run) this._failNow(run, 'Something went wrong (' + err.message + ')');
        });
    }

    async _runSteps(steps, run, startAt) {
      const setupOnly = new Set(['spawnCar', 'spawn', 'join', 'leave', 'setFlag', 'protect', 'music', 'setTime']);
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (run.token !== this._abort) throw new Aborted();
        if (startAt && i < startAt) {
          // Replaying up to a checkpoint: only rebuild the world state.
          const kind = MissionEngine.kindOf(step);
          if (setupOnly.has(kind)) await this._exec(step, run, true);
          continue;
        }
        if (run.depth === undefined && steps === run.m.steps) run.stepIndex = i;
        if (step.checkpoint && steps === run.m.steps) {
          run.checkpoint = i;
          this._checkpointPos = this._snapshotPlayer();
        }
        await this._exec(step, run, false);
      }
    }

    static kindOf(step) {
      const keys = ['scene', 'blackout', 'phone', 'text', 'goto', 'spawnCar', 'getIn', 'spawn', 'join', 'leave', 'kill', 'survive', 'protect', 'chase', 'follow', 'race', 'deliver', 'collect', 'destroy', 'heat', 'loseHeat', 'wait', 'timer', 'choice', 'if', 'setFlag', 'music', 'slowmo', 'setTime', 'fade', 'teleport', 'camera', 'reward', 'objective', 'checkpoint'];
      for (const k of keys) if (step[k] !== undefined) return k;
      if (step.say) return 'say';
      return 'none';
    }

    // ------------------------------------------------------------- steps
    async _exec(step, run, setup) {
      const game = this.game;
      const kind = MissionEngine.kindOf(step);
      if (step.objective && kind !== 'objective') this._objective(step.objective);
      // Ambient lines alongside the step (car banter, radio chatter).
      if (step.say && kind !== 'say' && kind !== 'scene' && kind !== 'phone' && !setup) game.dialogue.play(step.say, { mode: 'ambient' });
      switch (kind) {
        case 'say':
          if (!setup) await game.dialogue.play(step.say, { mode: step.mode || 'ambient' });
          return;
        case 'scene':
          if (!setup) await this._scene(step, run);
          return;
        case 'blackout':
          if (!setup) await this._blackout(step.blackout);
          return;
        case 'phone':
          if (!setup) await game.dialogue.play(step.say || [], { mode: 'phone', from: step.phone });
          return;
        case 'text':
          if (!setup) game.dialogue.text(step.text, step.message || '');
          return;
        case 'objective':
          this._objective(step.objective);
          return;
        case 'checkpoint':
          return;
        case 'goto':
          return this._goto(step, run);
        case 'spawnCar':
          this._spawnCar(step, run);
          return;
        case 'getIn':
          return this._getIn(step, run);
        case 'spawn':
          this._spawnPeople(step.spawn, run);
          return;
        case 'join':
          for (const id of [].concat(step.join)) this._join(id, run, step.weapon);
          return;
        case 'leave':
          for (const id of [].concat(step.leave)) this._leave(id, run);
          return;
        case 'protect':
          for (const id of [].concat(step.protect)) run.protect.add(id);
          return;
        case 'kill':
          return this._kill(step, run);
        case 'survive':
          return this._survive(step, run);
        case 'chase':
          return this._chase(step, run);
        case 'follow':
          return this._follow(step, run);
        case 'race':
          return this._race(step, run);
        case 'deliver':
          return this._deliver(step, run);
        case 'collect':
          return this._collect(step, run);
        case 'destroy':
          return this._destroy(step, run);
        case 'heat':
          game.police.setLevel(step.heat, 'mission');
          game.police._sawPlayer();
          return;
        case 'loseHeat':
          this._objective(step.objective || 'Lose the cops');
          this._setMarker(null);
          return this._until(() => game.police.level === 0, run);
        case 'wait':
          if (!setup) await this._sleep(step.wait, run);
          return;
        case 'timer':
          run.pendingTimer = step.timer;
          return;
        case 'choice':
          return this._choice(step, run);
        case 'if': {
          const ok = MissionEngine.testFlag(Object.assign({}, this.completed, this.flags), step.if); // mission ids count as flags once passed
          const branch = ok ? step.then : step.else;
          if (branch) {
            run.depth = (run.depth || 0) + 1;
            await this._runSteps(branch, run, 0);
            run.depth--;
          }
          return;
        }
        case 'setFlag':
          for (const f of [].concat(step.setFlag)) this.flags[f] = true;
          return;
        case 'music':
          this._music(step.music);
          return;
        case 'slowmo':
          if (!setup) game.slowmo(step.slowmo, 0.3);
          return;
        case 'setTime':
          this._setTime(step.setTime, !setup);
          return;
        case 'fade':
          if (!setup) {
            game.hud.setFade(step.fade === 'out' ? 1 : 0, 700);
            await this._sleep(0.75, run);
          }
          return;
        case 'teleport':
          this._teleport(step.teleport, step.vehicle);
          return;
        case 'camera':
          if (!setup) await this._establish(step.camera, step.seconds || 4, run);
          return;
        case 'reward':
          if (!setup) this._reward(step.reward, true);
          return;
        default:
          return;
      }
    }

    static testFlag(flags, expr) {
      if (Array.isArray(expr)) return expr.every((e) => MissionEngine.testFlag(flags, e));
      if (typeof expr === 'string' && expr.startsWith('!')) return !flags[expr.slice(1)];
      return !!flags[expr];
    }

    // ---------------------------------------------------------- helpers
    _until(fn, run, timeLimit, timeoutReason) {
      return new Promise((resolve, reject) => {
        const limit = timeLimit !== undefined ? timeLimit : run.pendingTimer;
        run.pendingTimer = null;
        const w = { fn, resolve, reject, run, t: 0, limit, reason: timeoutReason || 'You ran out of time.' };
        if (limit) {
          run.timer = { left: limit };
          this.game.hud.setMissionTimer(limit);
        }
        this._waiters.push(w);
      });
    }

    _sleep(seconds, run) {
      let t = 0;
      return this._until(() => (t += this._dt || 0) >= seconds, run, 0);
    }

    _objective(text) {
      if (!this.run) return;
      this.run.objective = text;
      this.game.hud.setObjectiveText(text);
    }

    _setMarker(pos, opts) {
      const run = this.run;
      if (!run) return;
      run.marker = pos ? { x: pos.x, y: pos.y || 0, z: pos.z, r: (opts && opts.r) || 4 } : null;
      this._objGroup.visible = !!pos && !(opts && opts.noRing);
      if (pos) {
        this._objGroup.position.set(pos.x, (pos.y || this.game.physics.groundHeight(pos.x, pos.z, 50)) + 0.04, pos.z);
        const s = ((opts && opts.r) || 4) / 2.5;
        this._objRing.scale.set(s, 1, s);
      }
      this._routeTo = pos && !(opts && opts.noRoute) ? pos : null;
      this._routeT = 0;
    }

    _snapshotPlayer() {
      const p = this.game.player;
      const v = p.vehicle;
      return { x: p.pos.x, z: p.pos.z, yaw: p.heading, car: v ? { type: v.type, color: v.model.color, x: v.pos.x, z: v.pos.z, yaw: v.yaw, id: this._carIdOf(v) } : null };
    }

    _carIdOf(v) {
      if (!this.run) return null;
      for (const [id, c] of this.run.cars) if (c === v) return id;
      return null;
    }

    // --------------------------------------------------------- people
    lookFor(charId) {
      const c = (this.story.characters || {})[charId];
      if (!c) return null;
      const L = c.look || {};
      const build = L.build || 'average';
      return {
        skin: L.skin || 0xc68c64, hair: L.hair || 0x1a1410, top: L.top || 0x33415c, trim: L.trim || L.top || 0x33415c,
        shirt: L.shirt || L.top || 0xe9e7e1, bottom: L.bottom || 0x2e3f5c, shoes: L.shoes || 0x202020,
        cap: !!L.hat, longHair: L.longHair !== undefined ? !!L.longHair : (c.voice && c.voice.gender === 'female'), bag: !!L.bag,
        height: L.height || (build === 'tall' ? 1.07 : build === 'slim' ? 0.98 : 1.0),
        build: build === 'heavy' ? 1.16 : build === 'slim' ? 0.9 : 1.0,
      };
    }

    factionLook(fid, i) {
      const f = (this.story.factions || {})[fid];
      const base = VH.Crowd.randomLook();
      if (fid === 'police' || fid === 'vpd') return Object.assign({}, VH.Police.COP_LOOK, { skin: base.skin });
      if (!f || !f.colors) return base;
      const colors = f.colors;
      base.top = colors[i % colors.length];
      base.trim = base.top;
      base.shirt = colors[(i + 1) % colors.length];
      base.bottom = f.bottom || 0x1c1c1f;
      base.cap = f.caps !== undefined ? f.caps && Math.random() < 0.6 : Math.random() < 0.4;
      return base;
    }

    isHostile(a) {
      return !!a.missionHostile || (a.brain instanceof VH.CombatBrain && a.brain.hostile && a.faction !== 'civilian');
    }

    crewIn(v) {
      const out = [];
      if (!this.run) return out;
      for (const id of this.run.crew) {
        const a = this.run.actors.get(id);
        if (a && a.inCar === v) out.push(a);
      }
      return out;
    }

    crewIndex(a) {
      return this.run ? Math.max(0, this.run.crew.indexOf(a.charId)) : 0;
    }

    _spawnPeople(list, run) {
      const game = this.game;
      for (const e of [].concat(list)) {
        const place = this._place(e.at) || game.player.pos;
        const count = e.count || 1;
        for (let i = 0; i < count; i++) {
          const ang = (i / count) * Math.PI * 2 + (e.char ? 0 : Math.random() * 0.5);
          const r = count > 1 ? 1.5 + Math.random() * 3.5 : 0;
          let x = place.x + Math.cos(ang) * r + (e.offset ? e.offset[0] : 0);
          let z = place.z + Math.sin(ang) * r + (e.offset ? e.offset[1] : 0);
          const hostile = e.hostile !== undefined ? e.hostile : e.faction && e.faction !== 'civilian' && e.faction !== 'crew' && e.faction !== 'friendly';
          const look = e.char ? this.lookFor(e.char) : this.factionLook(e.faction, i);
          const opts = { look, faction: e.faction || (e.char ? 'story' : 'civilian'), role: 'story', persistent: true, health: e.health || (hostile ? 100 : 150), armor: e.armor || 0, heading: place.yaw || 0, name: e.char ? (this.story.characters[e.char] || {}).name : null };
          let a;
          const behavior = e.behavior || (hostile ? 'guard' : 'idle');
          if (hostile || behavior === 'attack' || behavior === 'guard' || behavior === 'patrol') {
            a = game.combat.spawnEnemy(x, z, Object.assign({}, opts, { weapon: e.weapon || 'pistol', alert: behavior === 'attack', guard: behavior === 'guard' ? { x, z, r: 7 } : null, accuracy: e.accuracy, hostile }));
            a.missionHostile = hostile;
            if (hostile) run.targets.push(a);
          } else {
            a = game.crowd.spawn(x, z, opts);
            a.brain = behavior === 'flee' ? new FleeBrain(this, null, e.flee) : behavior === 'cower' ? { update: (ag) => { ag.moveSpeed = 0; ag.anim.cower = 1; } } : behavior === 'wander' ? null : new IdleBrain(this);
            if (behavior === 'follow') a.brain = new CrewBrain(this, e.weapon);
          }
          a.charId = e.char || null;
          a.weapon = e.weapon || a.weapon || null;
          const id = e.char ? (e.id || e.char) : e.id ? (count > 1 ? e.id + '_' + i : e.id) : 'npc_' + a.id;
          run.actors.set(id, a);
          if (e.group) {
            if (!run.groups.has(e.group)) run.groups.set(e.group, []);
            run.groups.get(e.group).push(a);
          }
          if (e.car && behavior === 'drive') {
            const car = run.cars.get(e.car);
            if (car) {
              a.hidden = true;
              a.inCar = car;
              car.driver = 'ai';
              car.controller = new TourDriver(this, car, this._place(e.to) || { x: car.pos.x, z: car.pos.z });
            }
          }
          if (behavior === 'follow') this._join(id, run, e.weapon);
        }
      }
    }

    _join(id, run, weapon) {
      let a = run.actors.get(id);
      if (!a && (this.story.characters || {})[id]) {
        // Not placed yet: bring them in next to Jay.
        const p = this.game.player;
        a = this.game.crowd.spawn(p.pos.x - Math.sin(p.heading) * 2, p.pos.z - Math.cos(p.heading) * 2, { look: this.lookFor(id), faction: 'crew', role: 'story', persistent: true, health: 200, name: this.story.characters[id].name });
        a.charId = id;
        run.actors.set(id, a);
      }
      if (!a) return;
      a.brain = new CrewBrain(this, weapon || a.weapon || 'pistol');
      a.faction = 'crew';
      if (!run.crew.includes(id)) run.crew.push(id);
      // Hop straight into Jay's car if he's in one.
      const v = this.game.player.vehicle;
      if (v && Math.hypot(v.pos.x - a.pos.x, v.pos.z - a.pos.z) < 30) {
        a.inCar = v;
        a.hidden = true;
      }
    }

    _leave(id, run) {
      const a = run.actors.get(id);
      run.crew = run.crew.filter((c) => c !== id);
      if (!a) return;
      if (a.inCar) {
        const car = a.inCar;
        a.brain._getOut && a.brain._getOut(a, car);
      }
      a.brain = new LeaveBrain(this);
      a.faction = 'story';
      a.leaving = true;
    }

    _spawnCar(step, run) {
      const game = this.game;
      const place = this._place(step.at) || game.player.pos;
      let x = place.x;
      let z = place.z;
      let heading = step.heading !== undefined ? step.heading : place.yaw || 0;
      // Put it on the nearest lane (or kerbside) unless the place says otherwise.
      if (!step.exact) {
        const lp = game.roadnet.nearestLane(x, z);
        if (lp && lp.dist < 40) {
          const pk = lp.road.parking ? game.roadnet.parkingPoint(lp.road, lp.dir, lp.along) : lp;
          x = pk.x;
          z = pk.z;
          heading = pk.heading;
        }
      }
      if (step.offset) {
        x += step.offset[0];
        z += step.offset[1];
      }
      // Don't stack cars: slide along the kerb until the spot is free.
      if (!step.exact) {
        for (let k = 0; k < 6; k++) {
          const blocked = game.vehicles.list.some((o) => !o.removed && Math.hypot(o.pos.x - x, o.pos.z - z) < 5.6);
          if (!blocked) break;
          x += Math.sin(heading) * 6.6;
          z += Math.cos(heading) * 6.6;
        }
      }
      const type = VH.Vehicle.typeSpec(step.type) ? step.type : 'halcyon';
      const v = game.vehicles.spawn(type, x, z, heading, { color: step.color, role: 'mission', persistent: true });
      v.role = 'mission';
      v.persistent = true;
      v.missionOwned = true;
      if (step.locked) v.noEnter = true;
      if (step.police) v.isPolice = true;
      run.cars.set(step.spawnCar, v);
      if (step.name || CAR_NAMES[step.spawnCar]) v.storyName = step.name || CAR_NAMES[step.spawnCar];
      if (run.failIf.includes('wrecked:' + step.spawnCar)) v.damageScale = 0.4;
      if (step.watch !== false) run.watchCars.push(v);
      return v;
    }

    _place(id) {
      if (!id) return null;
      if (typeof id === 'object') return id;
      const run = this.run;
      if (run && run.actors.has(id)) return run.actors.get(id).pos;
      if (run && run.cars.has(id)) return run.cars.get(id).pos;
      return this.game.places.get(id);
    }

    // ------------------------------------------------------------ goto
    async _goto(step, run) {
      const game = this.game;
      const place = this._place(step.goto);
      if (!place) return;
      const radius = step.radius || (step.vehicle ? 7 : 3.2);
      const needCar = step.vehicle === true;
      const carId = typeof step.vehicle === 'string' ? step.vehicle : null;
      const onFoot = step.vehicle === false;
      const label = step.objective || 'Go to ' + (place.name || 'the marker');
      // Rooftops: the door first, then up the stairs.
      if (place.roof && place.door) {
        await this._goto(Object.assign({}, step, { goto: place.door, objective: step.objective || 'Take the stairs to the roof', vehicle: false, radius: 2.5 }), run);
        game.hud.setFade(1, 500);
        await this._sleep(0.55, run);
        game.player.teleport(place.x, place.z, place.yaw || 0, place.y);
        game.cameraRig.snapBehind(game.player);
        game.hud.setFade(0, 700);
        return;
      }
      this._setMarker(place, { r: radius });
      this._objective(label);
      await this._until(() => {
        const p = game.player;
        const v = p.vehicle;
        // Vehicle requirements change what the HUD asks for.
        if (needCar && !v) {
          this._objective('Get a car');
          return false;
        }
        if (carId) {
          const car = run.cars.get(carId);
          if (car && car.wrecked) throw new MissionFailed(carRef(car, true) + ' was wrecked.');
          if (car && v !== car) {
            this._objective('Get back in ' + carRef(car));
            return false;
          }
        }
        if (onFoot && v) {
          if (Math.hypot(p.pos.x - place.x, p.pos.z - place.z) < radius + 12) this._objective('Get out of the car');
          return false;
        }
        this._objective(label);
        const d = Math.hypot(p.pos.x - place.x, p.pos.z - place.z);
        if (d > radius) return false;
        if (step.stop !== false && v && v.speed > 2) {
          this._objective('Stop the car');
          return false;
        }
        return true;
      }, run);
      this._setMarker(null);
    }

    async _getIn(step, run) {
      const game = this.game;
      const id = step.getIn;
      if (id === 'any') {
        this._objective(step.objective || 'Get a car');
        this._setMarker(null);
        return this._until(() => !!game.player.vehicle, run);
      }
      const car = run.cars.get(id);
      if (!car) return;
      this._objective(step.objective || 'Get in ' + carRef(car));
      await this._until(() => {
        if (car.wrecked) throw new MissionFailed(carRef(car, true) + ' was wrecked.');
        this._setMarker(car.pos, { r: 3, noRing: true });
        return game.player.vehicle === car;
      }, run);
      this._setMarker(null);
    }

    // ---------------------------------------------------------- scenes
    async _scene(step, run) {
      const game = this.game;
      const sc = step.scene || {};
      const p = game.player;
      // Scenes happen on foot.
      if (p.inVehicle) {
        game.hud.setFade(1, 400);
        await this._sleep(0.45, run);
        const v = p.vehicle;
        v.vel.set(0, 0, 0);
        game.vehicles.exitVehicle();
        game.hud.setFade(0, 500);
      }
      const place = this._place(sc.at) || p.pos;
      // A scene somewhere else: cut there.
      if (Math.hypot(place.x - p.pos.x, place.z - p.pos.z) > 40) {
        game.hud.setFade(1, 400);
        await this._sleep(0.45, run);
        p.teleport(place.x - Math.sin(place.yaw || 0) * 3, place.z - Math.cos(place.yaw || 0) * 3, place.yaw || 0);
        game.hud.setFade(0, 500);
      }
      const cast = [];
      (sc.cast || []).forEach((c, i) => {
        const id = typeof c === 'string' ? c : c.id;
        if (id === 'jay') return;
        let a = run.actors.get(id);
        const ang = Math.PI * 0.6 + i * 0.9;
        const cx = place.x + Math.sin((place.yaw || 0) + ang) * 2.2;
        const cz = place.z + Math.cos((place.yaw || 0) + ang) * 2.2;
        // Someone who walked off earlier, or is across town: they're here now.
        if (a && !a.dead && !a.inCar && (a.hidden || a.leaving || Math.hypot(a.pos.x - place.x, a.pos.z - place.z) > 30)) {
          a.hidden = false;
          a.leaving = false;
          a.pos.set(cx, game.physics.groundHeight(cx, cz, a.pos.y + 20), cz);
          if (!run.crew.includes(id)) a.brain = new IdleBrain(this);
        }
        if (!a || a.dead) {
          a = game.crowd.spawn(cx, cz, { look: this.lookFor(id) || VH.Crowd.randomLook(), faction: 'story', role: 'story', persistent: true, health: 200, name: (this.story.characters[id] || {}).name });
          a.charId = id;
          a.brain = new IdleBrain(this);
          run.actors.set(id, a);
        }
        if (a.inCar) {
          a.brain._getOut && a.brain._getOut(a, a.inCar);
        }
        cast.push(a);
      });
      // Everyone faces the group's middle.
      let mx = p.pos.x;
      let mz = p.pos.z;
      for (const a of cast) {
        mx += a.pos.x;
        mz += a.pos.z;
      }
      mx /= cast.length + 1;
      mz /= cast.length + 1;
      for (const a of cast) a.lookAt = { x: mx, z: mz };
      p.frozen = true;
      game.frozenControls = true;
      document.body.classList.add('cutscene');
      game.dialogue.letterbox(true);
      this.cinematic = { cast, place, mid: { x: mx, z: mz }, shot: -1, cut: 0, t: 0, run };
      await game.dialogue.play(step.say || [], { mode: 'scene' });
      this.cinematic = null;
      for (const a of cast) a.lookAt = null;
      game.dialogue.letterbox(false);
      document.body.classList.remove('cutscene');
      p.frozen = false;
      game.frozenControls = false;
      game.cameraRig.snapBehind(p);
    }

    async _blackout(lines) {
      const game = this.game;
      game.player.frozen = true;
      game.frozenControls = true;
      document.body.classList.add('cutscene');
      await game.dialogue.play(lines || [], { mode: 'blackout' });
      document.body.classList.remove('cutscene');
      game.player.frozen = false;
      game.frozenControls = false;
    }

    async _establish(placeId, seconds, run) {
      const place = this._place(placeId);
      if (!place) return;
      this.cinematic = { establish: place, t: 0, dur: seconds };
      document.body.classList.add('cutscene');
      this.game.dialogue.letterbox(true);
      await this._sleep(seconds, run);
      this.cinematic = null;
      this.game.dialogue.letterbox(false);
      document.body.classList.remove('cutscene');
      this.game.cameraRig.snapBehind(this.game.player);
    }

    /** The cutscene camera: over the shoulder of whoever listens, on whoever speaks. */
    updateCamera(dt, cam) {
      const c = this.cinematic;
      if (!c) return false;
      c.t += dt;
      if (c.establish) {
        const p = c.establish;
        const a = c.t * 0.12 + 0.8;
        cam.position.set(p.x + Math.cos(a) * 26, (p.y || 0) + 11 + c.t * 0.6, p.z + Math.sin(a) * 26);
        cam.lookAt(p.x, (p.y || 0) + 2, p.z);
        cam.updateMatrixWorld();
        return true;
      }
      const game = this.game;
      const speakerId = game.dialogue.speaker;
      const players = [game.player].concat(c.cast);
      const posOf = (who) => (who === game.player ? game.player.renderPos : who.pos);
      let speaker = players.find((a) => a !== game.player && a.charId === speakerId) || (speakerId === 'jay' ? game.player : null);
      if (!speaker) speaker = c.cast[0] || game.player;
      if (speaker !== c.lastSpeaker) {
        c.lastSpeaker = speaker;
        c.shot++;
        c.cut = 0;
      }
      c.cut += dt;
      const sp = posOf(speaker);
      // Listener: someone else in the scene (Jay by default).
      const listener = speaker === game.player ? c.cast[c.shot % Math.max(1, c.cast.length)] || null : game.player;
      const headY = (speaker === game.player ? sp.y : sp.y) + 1.58;
      let from;
      if (c.shot === 0 && c.t < 3) {
        // Opening wide shot.
        const a = Math.atan2(sp.x - c.mid.x, sp.z - c.mid.z) + 1.9;
        from = new THREE.Vector3(c.mid.x + Math.sin(a) * 7.5, headY + 1.8 - c.t * 0.3, c.mid.z + Math.cos(a) * 7.5);
      } else if (listener) {
        const lp = posOf(listener);
        const dx = sp.x - lp.x;
        const dz = sp.z - lp.z;
        const d = Math.hypot(dx, dz) || 1;
        const side = c.shot % 2 ? 1 : -1;
        // Behind the listener's shoulder.
        from = new THREE.Vector3(lp.x - (dx / d) * 1.1 + (-dz / d) * 0.55 * side, headY + 0.05, lp.z - (dz / d) * 1.1 + (dx / d) * 0.55 * side);
      } else {
        const yaw = speaker.heading || 0;
        from = new THREE.Vector3(sp.x + Math.sin(yaw) * 2.4, headY, sp.z + Math.cos(yaw) * 2.4);
      }
      // Slow push-in on each shot.
      const look = new THREE.Vector3(sp.x, headY - 0.05, sp.z);
      const push = smoothstep(0, 6, c.cut) * 0.35;
      from.lerp(look, push * 0.25);
      if (!c.camPos || c.cut < dt * 1.5) c.camPos = from.clone();
      else c.camPos.lerp(from, 1 - Math.exp(-3 * dt));
      cam.position.copy(c.camPos);
      cam.lookAt(look);
      if (cam.fov !== 42) {
        cam.fov = 42;
        cam.updateProjectionMatrix();
      }
      cam.updateMatrixWorld();
      return true;
    }

    // ----------------------------------------------------------- fights
    _group(ref, run) {
      if (typeof ref === 'string' && ref.startsWith('group:')) return run.groups.get(ref.slice(6)) || [];
      const out = [];
      for (const id of [].concat(ref)) {
        if (run.groups.has(id)) out.push(...run.groups.get(id));
        else if (run.actors.has(id)) out.push(run.actors.get(id));
        else {
          for (const [k, a] of run.actors) if (k.startsWith(id + '_')) out.push(a);
        }
      }
      return out;
    }

    async _kill(step, run) {
      const list = this._group(step.kill, run);
      if (!list.length) return;
      run.targets = list;
      for (const a of list) if (a.brain && a.brain.setAlert && step.alert !== false) a.brain.setAlert(a);
      const need = step.count || list.length;
      const base = step.objective || 'Take them out';
      this._setMarker(null);
      await this._until(() => {
        const dead = list.filter((a) => a.dead || a.removed).length;
        this._objective(base + (list.length > 1 ? ' (' + Math.max(0, need - dead) + ' left)' : ''));
        return dead >= need;
      }, run);
      run.targets = [];
    }

    async _survive(step, run) {
      const game = this.game;
      const waves = step.waves || [];
      let t = 0;
      const spawned = new Set();
      this._objective(step.objective || 'Hold out');
      this._setMarker(null);
      run.timer = { left: step.survive };
      game.hud.setMissionTimer(step.survive);
      await this._until(() => {
        t += this._dt;
        waves.forEach((w, i) => {
          if (spawned.has(i) || t < (w.delay || 0)) return;
          spawned.add(i);
          const place = this._place(w.at) || game.player.pos;
          for (let k = 0; k < (w.count || 3); k++) {
            const ang = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * 4;
            const a = game.combat.spawnEnemy(place.x + Math.cos(ang) * r, place.z + Math.sin(ang) * r, {
              look: this.factionLook(w.faction || 'gang', k), faction: w.faction || 'gang', weapon: w.weapon || 'pistol', alert: true, accuracy: w.accuracy,
            });
            a.missionHostile = true;
            run.targets.push(a);
          }
        });
        run.timer.left = Math.max(0, step.survive - t);
        return t >= step.survive;
      }, run, 0);
      game.hud.setMissionTimer(null);
      run.timer = null;
    }

    async _chase(step, run) {
      const game = this.game;
      const car = run.cars.get(step.chase);
      if (!car) return;
      const route = (step.route || []).map((id) => this._place(id)).filter(Boolean);
      car.driver = 'ai';
      car.controller = new FleeDriver(this, car, route.length ? route : null);
      car.noEnter = true;
      run.targetCars = [car];
      const mode = step.mode || 'wreck';
      this._objective(step.objective || (mode === 'catch' ? 'Stop ' + carRef(car) : 'Take out ' + carRef(car)));
      this._setMarker(null);
      let lostT = 0;
      let boxT = 0;
      await this._until(() => {
        const p = game.player;
        const d = Math.hypot(car.pos.x - p.pos.x, car.pos.z - p.pos.z);
        if (car.wrecked || car.health < 60) return true;
        if (mode === 'catch') {
          if (car.speed < 2.5 && d < car.hz + 9) boxT += this._dt;
          else boxT = Math.max(0, boxT - this._dt);
          if (boxT > 1.8 || car.health < 300) {
            car.controller = null;
            car.driver = null;
            car.input.accel = 0;
            car.input.handbrake = 1;
            // Caught, not wrecked: it's often the car Jay has to drive next.
            car.health = Math.max(car.health, 550);
            car.burning = 0;
            return true;
          }
        }
        if (d > (step.escape || 260)) lostT += this._dt;
        else lostT = 0;
        if (lostT > 6) throw new MissionFailed('They got away.');
        return false;
      }, run);
      run.targetCars = [];
    }

    async _follow(step, run) {
      const game = this.game;
      const car = run.cars.get(step.follow);
      if (!car) return;
      const dest = this._place(step.to) || { x: car.pos.x + 300, z: car.pos.z };
      const drv = new TourDriver(this, car, dest, { speedMul: step.speed || 0.9 });
      car.driver = 'ai';
      car.controller = drv;
      car.noEnter = true;
      run.targetCars = [car];
      const min = step.min || 12;
      const max = step.max || 110;
      let close = 0;
      let far = 0;
      this._objective(step.objective || 'Follow ' + carRef(car) + ' — not too close');
      this._setMarker(null);
      await this._until(() => {
        const p = game.player;
        const d = Math.hypot(car.pos.x - p.pos.x, car.pos.z - p.pos.z);
        if (car.wrecked) throw new MissionFailed('You wrecked the car you were supposed to follow.');
        if (drv.bumped) throw new MissionFailed('You hit them. Cover blown.');
        if (d < min) close += this._dt;
        else close = Math.max(0, close - this._dt * 0.5);
        if (d > max) far += this._dt;
        else far = Math.max(0, far - this._dt);
        game.hud.setSuspicion(Math.max(close / 4, far / 8));
        if (close > 4) throw new MissionFailed('They spotted you.');
        if (far > 8) throw new MissionFailed('You lost them.');
        return drv.arrived;
      }, run);
      game.hud.setSuspicion(null);
      run.targetCars = [];
    }

    async _race(step, run) {
      const game = this.game;
      const r = step.race;
      const laps = r.laps || 1;
      const cps = [];
      for (let l = 0; l < laps; l++) for (const id of r.checkpoints) cps.push(this._place(id));
      const valid = cps.filter(Boolean);
      if (!valid.length) return;
      const p = game.player;
      // Rivals line up beside Jay.
      const rivals = [];
      const v0 = p.vehicle;
      const base = v0 ? { x: v0.pos.x, z: v0.pos.z, yaw: v0.yaw } : { x: p.pos.x, z: p.pos.z, yaw: p.heading };
      (r.rivals || []).forEach((rv, i) => {
        const side = (i % 2 ? -1 : 1) * 3.4;
        const back = Math.floor(i / 2) * 7 + (i % 2 ? 0 : 3.5);
        const x = base.x + Math.cos(base.yaw) * side - Math.sin(base.yaw) * back;
        const z = base.z - Math.sin(base.yaw) * side - Math.cos(base.yaw) * back;
        const type = VH.Vehicle.typeSpec(rv.car) ? rv.car : 'vireo';
        const v = game.vehicles.spawn(type, x, z, base.yaw, { color: rv.color, role: 'mission', persistent: true });
        v.driver = 'ai';
        v.noEnter = true;
        v.controller = new RaceDriver(this, v, valid, rv.skill || 0.85 + i * 0.05);
        v.racerName = rv.char ? (this.story.characters[rv.char] || {}).name || rv.char : rv.name || 'Rival';
        rivals.push(v);
        run.cars.set('rival' + i, v);
      });
      run.watchCars.push(...rivals);
      // Countdown.
      game.frozenControls = true;
      for (const n of [3, 2, 1]) {
        game.hud.bigText(String(n));
        if (game.audio.countdown) game.audio.countdown(n);
        await this._sleep(0.9, run);
      }
      game.hud.bigText('GO!', true);
      if (game.audio.countdown) game.audio.countdown(0);
      game.frozenControls = false;
      for (const v of rivals) v.controller.go = true;
      let i = 0;
      const startT = game.time;
      await this._until(() => {
        const cp = valid[i];
        this._setMarker(cp, { r: 9 });
        // Position: count rivals ahead.
        const myProg = i + 1 - Math.hypot(cp.x - p.pos.x, cp.z - p.pos.z) / 1000;
        let ahead = 0;
        for (const v of rivals) {
          const c = v.controller;
          if (c.finished) {
            ahead++;
            continue;
          }
          const vp = c.i + 1 - Math.hypot(valid[Math.min(c.i, valid.length - 1)].x - v.pos.x, valid[Math.min(c.i, valid.length - 1)].z - v.pos.z) / 1000;
          if (vp > myProg) ahead++;
        }
        this._objective('Race: position ' + (ahead + 1) + ' / ' + (rivals.length + 1) + ' · checkpoint ' + (i + 1) + ' / ' + valid.length);
        if (Math.hypot(cp.x - p.pos.x, cp.z - p.pos.z) < 12) {
          i++;
          if (game.audio.checkpoint) game.audio.checkpoint();
          if (i >= valid.length) {
            run.racePlace = ahead + 1;
            return true;
          }
        }
        return false;
      }, run);
      this._setMarker(null);
      const place = run.racePlace;
      const secs = game.time - startT;
      game.hud.centerBanner(place === 1 ? 'FIRST PLACE' : 'FINISHED ' + ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'][place - 1], Math.floor(secs / 60) + ':' + String(Math.floor(secs % 60)).padStart(2, '0'));
      if (r.mustWin !== false && place !== 1) throw new MissionFailed('You didn\'t win the race.');
      for (const v of rivals) v.controller.finished = true;
    }

    async _deliver(step, run) {
      const game = this.game;
      const car = run.cars.get(step.deliver) || game.player.vehicle;
      const place = this._place(step.to);
      if (!car || !place) return;
      const minHealth = 1000 * (1 - (step.maxDamage === undefined ? 0.6 : step.maxDamage));
      this._setMarker(place, { r: 7 });
      if (step.timeLimit) run.pendingTimer = step.timeLimit;
      await this._until(() => {
        if (car.wrecked || car.health < minHealth) throw new MissionFailed(carRef(car, true) + ' is too damaged.');
        if (game.player.vehicle !== car) {
          this._objective('Get back in ' + carRef(car));
          return false;
        }
        this._objective(step.objective || 'Deliver ' + carRef(car) + ' (' + Math.round(car.health / 10) + '% condition)');
        return Math.hypot(car.pos.x - place.x, car.pos.z - place.z) < 7 && car.speed < 2;
      }, run);
      this._setMarker(null);
    }

    async _collect(step, run) {
      const game = this.game;
      const places = [].concat(step.collect).map((id) => this._place(id)).filter(Boolean);
      const items = places.map((pl) => {
        const pk = game.combat.addPickup('cash', null, 0, pl.x, (pl.y || 0.15) + 0.7, pl.z, 0);
        pk.missionItem = true;
        pk.collected = false;
        pk.combat = game.combat;
        const orig = game.combat.collect.bind(game.combat);
        pk.collectOverride = true;
        return pk;
      });
      // Mission items are picked up by walking (or driving slowly) into them.
      run.watchItems = items;
      const label = step.objective || 'Collect the ' + (step.item || 'packages');
      await this._until(() => {
        let left = 0;
        for (const it of items) {
          if (it.collected) continue;
          const p = game.player;
          const d = Math.hypot(p.pos.x - it.pos.x, p.pos.z - it.pos.z);
          if (d < (p.inVehicle ? 3 : 1.4)) {
            it.collected = true;
            it.dispose();
            if (game.audio.pickup) game.audio.pickup();
            continue;
          }
          left++;
        }
        const next = items.find((it) => !it.collected);
        this._setMarker(next ? next.pos : null, { r: 2 });
        this._objective(label + ' (' + left + ' left)');
        return left === 0;
      }, run);
      this._setMarker(null);
    }

    async _destroy(step, run) {
      const cars = [].concat(step.destroy).map((id) => run.cars.get(id)).filter(Boolean);
      run.targetCars = cars;
      this._objective(step.objective || 'Destroy the ' + (cars.length === 1 ? cars[0].name : 'cars'));
      this._setMarker(null);
      await this._until(() => cars.every((c) => c.wrecked || c.removed), run);
      run.targetCars = [];
    }

    async _choice(step, run) {
      const game = this.game;
      const c = step.choice;
      const i = await game.dialogue.choice(c.prompt, c.options);
      const opt = c.options[i];
      if (opt.flag) this.flags[opt.flag] = true;
      VH.events.emit('mission:choice', { flag: opt.flag, label: opt.label });
      if (opt.then) {
        run.depth = (run.depth || 0) + 1;
        await this._runSteps(opt.then, run, 0);
        run.depth--;
      }
    }

    _music(mood) {
      const a = this.game.audio;
      if (!a.ready) return;
      if (mood === 'off' || mood === 'sad' || mood === 'hope') {
        a.stopMusic(1.5);
        if (a.moodPad) a.moodPad(mood === 'off' ? null : mood);
        return;
      }
      if (a.moodPad) a.moodPad(null);
      a.startMusic();
      a.setIntensity(mood === 'action' ? 0.9 : mood === 'triumph' ? 0.6 : 0.4);
    }

    _setTime(hours, fade) {
      const env = this.game.environment;
      if (fade) {
        this.game.hud.setFade(1, 300);
        setTimeout(() => {
          env.setTime(hours);
          this.game.world.setNightFactor(env.shared.uWindowGlow.value);
          this.game.hud.setFade(0, 800);
        }, 320);
      } else {
        env.setTime(hours);
        this.game.world.setNightFactor(env.shared.uWindowGlow.value);
      }
    }

    _teleport(id, withCar) {
      const game = this.game;
      const place = this._place(id);
      if (!place) return;
      const p = game.player;
      if (p.inVehicle && withCar !== false) {
        const v = p.vehicle;
        v.place(place.x, place.z, place.yaw || v.yaw);
      } else {
        if (p.inVehicle) game.vehicles.exitVehicle();
        p.teleport(place.x, place.z, place.yaw || 0, place.y);
      }
      game.cameraRig.snapBehind(p);
      for (const id2 of this.run ? this.run.crew : []) {
        const a = this.run.actors.get(id2);
        if (a && !a.inCar) a.pos.set(place.x + 1.5, place.y || 0.15, place.z + 1.5);
      }
    }

    _reward(r, mid) {
      const game = this.game;
      if (!r) return;
      if (r.money) game.giveMoney(r.money, 'job');
      if (r.armor) game.player.armor = Math.min(game.player.maxArmor, game.player.armor + r.armor);
      for (const w of r.weapons || []) game.combat.giveWeapon(w, undefined, !mid);
      for (const u of r.unlock || []) this.flags['unlocked:' + u] = true;
    }

    // --------------------------------------------------- pass and fail
    _pass(run) {
      const game = this.game;
      const m = run.m;
      document.body.classList.remove('on-mission');
      this._clearWaiters(run);
      this.run = null;
      this._cleanup(run, false);
      this.completed[m.id] = true;
      if (m._main) this.stats.missions++;
      else this.stats.side++;
      this._reward(m.reward, false);
      const money = (m.reward && m.reward.money) || 0;
      game.hud.missionResult(true, m.title, money ? '+' + VH.util.formatMoney(money) : '', m.reward && m.reward.weapons ? 'New: ' + m.reward.weapons.map((w) => (VH.Combat.def(w) || { name: w }).name).join(', ') : '');
      if (game.audio.missionPassed) game.audio.missionPassed();
      VH.events.emit('mission:pass', { m });
      this._music('off');
      this.save();
      setTimeout(() => this.refreshMarkers(), 2500);
      // The last main job: roll the credits.
      if (m._main && !this.nextMain && !this.completed._credits) {
        this.completed._credits = true;
        setTimeout(() => game.endCredits && game.endCredits(), 6500);
      }
      // Chained missions start straight away.
      const next = this.available().find((n) => n.start === 'chain' && (n.requires || []).includes(m.id));
      if (next) setTimeout(() => this.start(next), 4200);
      // Ambient texts after this mission.
      for (const t of this.story.texts || []) {
        if (t.after !== m.id || (t.requiresFlag && !MissionEngine.testFlag(Object.assign({}, this.completed, this.flags), t.requiresFlag))) continue;
        setTimeout(() => {
          if (!this.run || !this.run.m._main) game.dialogue.text(t.from, t.message);
        }, (t.delay || 20) * 1000);
      }
    }

    /** Fail from anywhere (events, waiters). */
    fail(reason) {
      if (!this.run) return;
      this._failNow(this.run, reason);
    }

    _failNow(run, reason) {
      const game = this.game;
      document.body.classList.remove('on-mission');
      this._clearWaiters(run, reason);
      this.run = null;
      this._abort = null;
      this.cinematic = null;
      game.dialogue.stop();
      document.body.classList.remove('cutscene');
      game.player.frozen = false;
      game.frozenControls = false;
      this._cleanup(run, true);
      game.hud.missionResult(false, run.m.title, reason, 'Press ' + game.input.labelFor('interact') + ' to retry' + (run.checkpoint ? ' from the checkpoint' : ''));
      if (game.audio.missionFailedSting) game.audio.missionFailedSting();
      else if (game.audio.fail) game.audio.fail();
      this._music('off');
      VH.events.emit('mission:fail', { m: run.m, reason });
      this._retry = { m: run.m, checkpoint: run.checkpoint, pos: this._checkpointPos, until: game.time + 14 };
      setTimeout(() => this.refreshMarkers(), 1500);
    }

    _clearWaiters(run, reason) {
      const ws = this._waiters.filter((w) => w.run === run);
      this._waiters = this._waiters.filter((w) => w.run !== run);
      for (const w of ws) w.reject(reason ? new MissionFailed(reason) : new Aborted());
      this._setMarker(null);
      this.game.hud.setObjectiveText(null);
      this.game.hud.setMissionTimer(null);
      this.game.hud.setSuspicion(null);
      this._objGroup.visible = false;
      this.game.route = null;
    }

    _cleanup(run, failed) {
      const game = this.game;
      for (const [, a] of run.actors) {
        if (a.inCar && a.brain && a.brain._getOut) a.brain._getOut(a, a.inCar);
        a.persistent = false;
        a.brain = a.dead ? null : new FleeBrain(this, game.player.pos);
        if (!a.dead) {
          a.brain.t = 0;
          a.brain = null; // back to being an ordinary pedestrian
          a.walk = null;
        }
      }
      for (const [, v] of run.cars) {
        if (v.driver === 'player') {
          v.persistent = true;
          continue;
        }
        if (failed || v.role === 'mission') {
          v.persistent = false;
          v.role = 'abandoned';
          if (v.driver === 'ai') v.controller = null;
          v.driver = null;
          v.noEnter = false;
        }
      }
      for (const it of run.watchItems || []) if (!it.gone) it.dispose();
      if (failed) game.police.reset();
    }

    /** Retry the last failed job (E within a few seconds). */
    tryRetry() {
      const r = this._retry;
      if (!r || this.run || this.game.time > r.until) return false;
      this._retry = null;
      this.game.hud.missionResult(null);
      const game = this.game;
      if (r.checkpoint && r.pos) {
        game.hud.setFade(1, 300);
        setTimeout(() => {
          const p = game.player;
          if (p.inVehicle) game.vehicles.exitVehicle();
          p.teleport(r.pos.x, r.pos.z, r.pos.yaw);
          if (r.pos.car) {
            const v = game.vehicles.spawn(r.pos.car.type, r.pos.car.x, r.pos.car.z, r.pos.car.yaw, { color: r.pos.car.color, persistent: true });
            game.vehicles.beginEnter({ v, side: 1, x: p.pos.x, z: p.pos.z });
            game.vehicles._finishEnter();
          }
          game.hud.setFade(0, 600);
          this.start(r.m, r.checkpoint);
        }, 350);
      } else {
        const place = this.game.places.get(r.m.start);
        if (place && Math.hypot(place.x - game.player.pos.x, place.z - game.player.pos.z) > 60) {
          game.hud.setFade(1, 300);
          setTimeout(() => {
            if (game.player.inVehicle) game.vehicles.exitVehicle();
            game.player.teleport(place.x, place.z, place.yaw || 0);
            game.hud.setFade(0, 600);
            this.start(r.m, 0);
          }, 350);
        } else this.start(r.m, 0);
      }
      return true;
    }

    // ------------------------------------------------------------ frame
    update(dt) {
      const game = this.game;
      this._dt = dt;
      this._markerTime += dt;
      for (const mk of this.markers) {
        mk.ring.rotation.y += dt * 0.6;
        mk.ring.material.opacity = 0.65 + 0.3 * Math.sin(this._markerTime * 2.5);
      }
      if (this._objGroup.visible) {
        this._objRing.rotation.y -= dt * 0.8;
        this._objRing.material.opacity = 0.6 + 0.35 * Math.sin(this._markerTime * 3);
      }
      if (this._retry && game.input.consume('interact') && !game.interaction.current) {
        if (this.tryRetry()) return;
      }
      if (this._retry && game.time > this._retry.until) {
        this._retry = null;
        game.hud.missionResult(null);
      }
      const run = this.run;
      if (!run) return;
      // GPS route to the marker.
      if (this._routeTo && VH.Minimap) {
        this._routeT -= dt;
        if (this._routeT <= 0) {
          this._routeT = 1;
          const p = game.player.pos;
          game.route = Math.hypot(this._routeTo.x - p.x, this._routeTo.z - p.z) > 30 ? VH.Minimap.route(game.layout, p.x, p.z, this._routeTo.x, this._routeTo.z) : null;
        }
      } else game.route = null;
      // HUD marker on screen.
      if (run.marker) game.hud.trackObjective(run.marker, game.renderer.camera);
      else game.hud.trackObjective(null);
      // Timer.
      if (run.timer) {
        if (!this._waiters.some((w) => w.run === run && w.limit)) {
          // survive() drives its own timer
        }
        game.hud.setMissionTimer(run.timer.left);
      }
      // Fail conditions.
      try {
        this._checkFails(run);
        for (const w of this._waiters.slice()) {
          if (w.run !== run) continue;
          if (w.limit) {
            w.t += dt;
            run.timer = { left: Math.max(0, w.limit - w.t) };
            if (w.t >= w.limit) throw new MissionFailed(w.reason);
          }
          let done = false;
          try {
            done = w.fn();
          } catch (err) {
            if (err instanceof MissionFailed) throw err;
            throw err;
          }
          if (done) {
            this._waiters.splice(this._waiters.indexOf(w), 1);
            if (w.limit) {
              run.timer = null;
              game.hud.setMissionTimer(null);
            }
            w.resolve();
          }
        }
      } catch (err) {
        if (err instanceof MissionFailed) this._failNow(run, err.reason);
        else throw err;
      }
    }

    _checkFails(run) {
      for (const id of run.protect) {
        const a = run.actors.get(id);
        if (a && a.dead) throw new MissionFailed((a.name || 'They') + ' died.');
      }
      for (const cond of run.failIf) {
        const [kind, id] = cond.split(':');
        if (kind === 'dead') {
          const a = run.actors.get(id);
          if (a && a.dead) throw new MissionFailed((a.name || id) + ' died.');
        } else if (kind === 'wrecked') {
          const v = run.cars.get(id);
          if (v && v.wrecked) throw new MissionFailed(carRef(v, true) + ' was destroyed.');
        } else if (kind === 'left') {
          const a = run.actors.get(id);
          if (a && !a.inCar && Math.hypot(a.pos.x - this.game.player.pos.x, a.pos.z - this.game.player.pos.z) > 160) throw new MissionFailed('You left ' + (a.name || id) + ' behind.');
        } else if (kind === 'heat') {
          if (this.game.police.level > 0) throw new MissionFailed('You drew the cops.');
        }
      }
      // Named crew dying always fails the job (extras who tag along don't).
      for (const id of run.crew) {
        const a = run.actors.get(id);
        if (a && a.dead && a.charId) throw new MissionFailed((a.name || id) + ' died.');
      }
    }

    // ------------------------------------------------------------- save
    save() {
      const g = this.game;
      const data = {
        version: 1,
        savedAt: Date.now(),
        completed: this.completed,
        flags: this.flags,
        stats: this.stats,
        money: g.player.money,
        health: g.player.health,
        armor: g.player.armor,
        playerStats: g.player.stats,
        playTime: g.playTime,
        hours: g.environment.hours,
        pos: { x: g.player.pos.x, z: g.player.pos.z, yaw: g.player.heading },
        weapons: g.combat.serialize(),
        activities: g.activities ? g.activities.serialize() : null,
      };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        g.hud.showToast('Progress saved');
        return true;
      } catch (err) {
        return false;
      }
    }

    static loadSave() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        return null;
      }
    }

    static clearSave() {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (err) {
        /* ignore */
      }
    }

    load(data) {
      const g = this.game;
      this.completed = data.completed || {};
      this.flags = data.flags || {};
      this.stats = data.stats || { missions: 0, side: 0 };
      g.player.money = data.money || 0;
      g.player.health = data.health || 100;
      g.player.armor = data.armor || 0;
      Object.assign(g.player.stats, data.playerStats || {});
      g.playTime = data.playTime || 0;
      if (data.hours !== undefined) g.environment.setTime(data.hours);
      g.combat.load(data.weapons);
      if (g.activities && data.activities) g.activities.load(data.activities);
      if (data.pos) g.player.teleport(data.pos.x, data.pos.z, data.pos.yaw);
    }

    reset() {
      if (this.run) {
        const run = this.run;
        this._clearWaiters(run);
        this.run = null;
        this._cleanup(run, true);
      }
      this.cinematic = null;
      document.body.classList.remove('on-mission');
      this.completed = {};
      this.flags = {};
      this.stats = { missions: 0, side: 0 };
      this._retry = null;
    }
  }

  MissionEngine.SAVE_KEY = SAVE_KEY;
  MissionEngine.MissionFailed = MissionFailed;
  VH.MissionEngine = MissionEngine;
  VH.MissionBrains = { IdleBrain, CrewBrain, FleeBrain, FleeDriver, TourDriver, RaceDriver };
})();
