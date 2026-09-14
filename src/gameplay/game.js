// game.js — wires every system together and owns the frame loop's game half.
import * as THREE from 'three';
import { clamp, lerp, damp } from '../core/mathx.js';
import { RNG } from '../core/rng.js';
import { bus } from '../core/events.js';
import { PhysicsWorld } from '../physics/world.js';
import { MaterialLibrary } from '../render/materials.js';
import { Sky } from '../render/sky.js';
import { Weather } from '../render/weather.js';
import { ParticleSystem } from '../render/particles.js';
import { DecalSystem } from '../render/decals.js';
import { LightManager } from '../render/lighting.js';
import { World } from '../world/worldgen.js';
import { TrafficManager } from '../entities/traffic.js';
import { PedestrianManager } from '../entities/pedestrians.js';
import { CombatSystem } from '../combat/combat.js';
import { Player } from './player.js';
import { CameraRig } from './camera.js';
import { PoliceSystem, CRIME } from './police.js';
import { Economy } from './economy.js';
import { ShopSystem } from './shops.js';
import { MissionSystem } from './missions.js';
import { StuntSystem } from './stunts.js';
import { Radio } from './radio.js';
import { HUD } from '../ui/hud.js';
import { Menus } from '../ui/menus.js';
import { Dialogs } from '../ui/dialogs.js';
import { saveGame, loadGame, applySave, clearSave, hasSave } from '../core/save.js';
import { validateMissions } from '../content/missionCatalog.js';
import { validateWeapons } from '../content/weaponCatalog.js';
import { validateVehicles } from '../content/vehicleCatalog.js';
import { validateShops } from '../content/shopCatalog.js';
import { validateStunts } from '../content/stuntCatalog.js';
import { validateStations } from '../content/radioCatalog.js';
import { validateDistricts } from '../content/districtCatalog.js';

const MINUTES_PER_SECOND = 0.5;     // one in-game day ≈ 48 real minutes

export class Game {
  constructor(ctx) {
    this.ctx = ctx;
    ctx.game = this;
    this.running = false;
    this.paused = false;
    this.timeScale = 1;
    this.targetTimeScale = 1;
    this.slowmo = false;
    this.bootStatus = { step: 'idle', progress: 0 };
    this.frame = 0;
    this.errors = [];
  }

  get uiCapture() { return this.ctx.menus ? this.ctx.menus.isOpen : false; }

  // -------------------------------------------------------------------------
  async boot(onProgress) {
    const ctx = this.ctx;
    const p = (frac, label) => {
      this.bootStatus = { step: label, progress: frac };
      if (onProgress) onProgress(frac, label);
    };

    ctx.bus = bus;
    ctx.rng = new RNG(ctx.settings.get('seed'));
    ctx.time = { dt: 0, elapsed: 0, scale: 1, hour: 8.5, day: 1 };

    p(0.02, 'Mixing paint');
    ctx.materials = new MaterialLibrary(ctx).init();

    p(0.08, 'Setting the sky');
    ctx.sky = new Sky(ctx);
    ctx.weather = new Weather(ctx);
    ctx.weather.setWeather('fair', true);

    p(0.12, 'Laying foundations');
    ctx.physics = new PhysicsWorld(ctx);
    ctx.particles = new ParticleSystem(ctx);
    ctx.decals = new DecalSystem(ctx);
    ctx.lights = new LightManager(ctx);

    p(0.16, 'Generating Leonida');
    ctx.world = new World(ctx);
    await ctx.world.generate(ctx.settings.get('seed'), (f, label) => p(0.16 + f * 0.58, label));
    ctx.lights.setDescriptors(ctx.world.lights);

    p(0.76, 'Hiring extras');
    ctx.economy = new Economy(ctx);
    ctx.combat = new CombatSystem(ctx);
    ctx.player = new Player(ctx);
    ctx.cameraRig = new CameraRig(ctx);
    ctx.traffic = new TrafficManager(ctx);
    ctx.peds = new PedestrianManager(ctx);
    ctx.police = new PoliceSystem(ctx);
    ctx.shops = new ShopSystem(ctx);
    ctx.stunts = new StuntSystem(ctx);
    ctx.radio = new Radio(ctx);

    p(0.84, 'Printing the map');
    ctx.hud = new HUD(ctx);
    ctx.notify = ctx.hud;
    ctx.dialogs = new Dialogs(ctx);
    ctx.missions = new MissionSystem(ctx);
    ctx.menus = new Menus(ctx);
    ctx.missions.refreshStartMarkers();

    p(0.90, 'Opening the doors');
    this._placePlayer();
    this._wireEvents();

    const save = loadGame();
    if (save) {
      try { applySave(ctx, save); ctx.hud.toast('Welcome back', 'Progress restored', 'info'); }
      catch (e) { console.warn('[game] could not apply save', e); }
    } else {
      // Starter kit so the first minute is not empty -- for a NEW game only.
      // Handing it out before the save was applied put back every weapon the
      // save did not list, and applySave only ever adds: get arrested, lose the
      // pistol, and it was waiting for you again, fully loaded, on every reload.
      this.grantStarterKit();
    }

    p(0.98, 'Ready');
    this.running = true;
    return this;
  }

  _placePlayer() {
    const ctx = this.ctx;
    // Start on the strip, on a pavement, facing the road.
    const spot = ctx.world.safeRoadPoint(806, -300);
    const y = ctx.physics.groundHeight(spot.x, spot.z);
    ctx.player.spawn(spot.x, y + 0.2, spot.z, spot.yaw + Math.PI * 0.5);
    ctx.camera.position.set(spot.x, y + 6, spot.z - 8);
  }

  _wireEvents() {
    const ctx = this.ctx;
    ctx.bus.on('player:died', () => this._onDeath());
    ctx.bus.on('mission:completed', () => this.save());
    ctx.bus.on('ped:killed', (e) => {
      if (e.source === ctx.player) {
        ctx.player.kills++;
        ctx.economy.addLoot(e.ped.money || 0);
        ctx.economy.earn(Math.round((e.ped.money || 0) * 0.5), 'Pocket change', { dirty: true });
      }
    });
    ctx.bus.on('vehicle:explode', (e) => {
      if (e.vehicle === ctx.player.vehicle) ctx.player.exitVehicle(true);
    });
  }

  // -------------------------------------------------------------------------
  update(rawDt) {
    if (!this.running) return;
    const ctx = this.ctx;
    this.frame++;

    // --- time ---
    this.timeScale = damp(this.timeScale, this.paused || this.uiCapture ? 0 : this.targetTimeScale, 14, rawDt);
    const dt = clamp(rawDt, 0, 0.05) * this.timeScale;
    ctx.time.dt = dt;
    ctx.time.scale = this.timeScale;
    ctx.time.elapsed += dt;
    ctx.time.hour += (dt * MINUTES_PER_SECOND) / 60;
    while (ctx.time.hour >= 24) { ctx.time.hour -= 24; ctx.time.day++; }

    ctx.input.beginFrame();
    this._adaptQuality(rawDt);

    // Menus and the pause state run on unscaled time so the UI stays responsive.
    ctx.menus.update(rawDt);

    if (dt > 0) {
      ctx.physics.update();
      ctx.player.update(dt);
      ctx.world.update(dt);
      ctx.traffic.update(dt);
      ctx.peds.update(dt);
      ctx.police.update(dt);
      ctx.combat.update(dt);
      ctx.shops.update(dt);
      ctx.missions.update(dt);
      ctx.stunts.update(dt);
      ctx.radio.update(dt);
      ctx.dialogs.update(dt);
      ctx.particles.update(dt);
      ctx.decals.update(dt);
      ctx.world.updateTrafficLights(ctx.camera.position.x, ctx.camera.position.z);
      this._handleGlobalInput(dt);
      this._updateDeath(dt);
    }

    // Camera, sky and audio always advance so the world never freezes visually.
    ctx.cameraRig.update(Math.max(dt, rawDt * 0.15));
    ctx.sky.update(rawDt * 0.35 + dt, ctx.time.hour, ctx.weather);
    ctx.weather.update(dt || rawDt * 0.2, ctx.time.hour);
    ctx.lights.update(rawDt, ctx.sky.palette.night);
    ctx.ambience?.update(rawDt);
    ctx.audio.update(rawDt);
    ctx.hud.update(rawDt);

    ctx.input.endFrame();
  }

  _handleGlobalInput(dt) {
    const ctx = this.ctx;
    const input = ctx.input;
    if (this.uiCapture) return;

    if (input.pressed('enter') && ctx.player.enterCooldown <= 0 && !ctx.player.dead) {
      if (ctx.player.inVehicle) ctx.player.exitVehicle();
      else {
        const near = ctx.player.findNearbyVehicle();
        if (near) {
          const stolen = !!near.vehicle.aiDriver && near.seat === 0;
          ctx.player.enterVehicle(near.vehicle, near.seat);
          if (stolen && !near.vehicle.missionVehicle) ctx.police.report(CRIME.carTheft, { quiet: true });
        }
      }
    }
    if (input.pressed('debug')) ctx.settings.set('showFps', !ctx.settings.get('showFps'));
    if (input.pressed('slowmo')) {
      this.slowmo = !this.slowmo;
      this.targetTimeScale = this.slowmo ? 0.35 : 1;
      ctx.hud.toast('Time', this.slowmo ? 'Slow motion on' : 'Normal speed', 'info');
    }
    if (input.pressed('cinematic')) ctx.cameraRig.setMode('cinematic');
  }

  _updateDeath(dt) {
    const ctx = this.ctx;
    const p = ctx.player;
    if (!p.dead) return;
    if (p.deathTimer < 3.2) return;
    // Respawn at a hospital or police station equivalent — the nearest road.
    const busted = p.busted;
    const fee = busted ? Math.round(ctx.economy.cash * 0.25) : Math.round(ctx.economy.cash * 0.15);
    ctx.economy.lose(fee, busted ? 'Bail' : 'Hospital bill');
    if (busted) {
      // Confiscate everything but the basics.
      for (const id of [...p.weapons.slots.keys()]) {
        if (id !== 'fists' && id !== 'baseball-bat') p.weapons.slots.delete(id);
      }
      p.weapons.order = [...p.weapons.slots.keys()];
      p.weapons.currentId = 'fists';
      p.weapons._buildModel();
    }
    ctx.police.clear();
    const target = ctx.world.safeRoadPoint(
      p.lastSafePoint.x + (Math.random() - 0.5) * 90,
      p.lastSafePoint.z + (Math.random() - 0.5) * 90,
    );
    p.respawn(target.x, ctx.physics.groundHeight(target.x, target.z) + 0.2, target.z, target.yaw);
    p.armor = 0;
    ctx.hud.toast(busted ? 'Released' : 'Discharged', fee > 0 ? `-${fee}` : '', 'bad');
    if (ctx.missions.active) ctx.missions.abandon();
  }

  _onDeath() {
    const ctx = this.ctx;
    ctx.audio?.play('missionFail', { ui: true, volume: 0.5 });
    this.targetTimeScale = 0.5;
    setTimeout(() => { this.targetTimeScale = this.slowmo ? 0.35 : 1; }, 2200);
  }

  // -------------------------------------------------------------------------
  setTimeScale(s) { this.targetTimeScale = s; }
  setPaused(p) { this.paused = p; }

  /**
   * Adaptive quality preset. Adaptive *resolution* alone cannot rescue a machine
   * that simply cannot draw this many cars, pedestrians and lights, so when the
   * frame time stays bad after the resolution has already bottomed out, drop a
   * preset; climb back only after a long, comfortable stretch, and never past
   * where we last had to come down.
   */
  _adaptQuality(rawDt) {
    const ctx = this.ctx;
    if (!ctx.settings.get('autoQuality') || this.paused) return;
    this._qualityTimer = (this._qualityTimer || 0) + rawDt;
    if (this._qualityTimer < 3) return;
    this._qualityTimer = 0;
    // Give the world a few seconds after loading before judging it.
    if (ctx.time.elapsed < 8) return;

    const target = 1000 / (ctx.settings.get('targetFps') || 60);
    const avg = ctx.renderer.frameMs.avg;
    const order = ['potato', 'low', 'medium', 'high', 'ultra'];
    const at = order.indexOf(ctx.settings.data.quality);

    if (avg > target * 1.5 && ctx.renderer.resolutionScale <= 0.62) {
      this._qualityCeiling = Math.max(0, at - 1);
      if (ctx.settings.stepDown()) { this.applyQuality(); this._goodStreak = 0; }
      return;
    }
    if (avg < target * 0.62) {
      this._goodStreak = (this._goodStreak || 0) + 3;
      if (this._goodStreak > 25 && at < (this._qualityCeiling ?? order.length - 1)
          && ctx.renderer.resolutionScale >= 0.98) {
        if (ctx.settings.stepUp()) { this.applyQuality(); this._goodStreak = 0; }
      }
    } else {
      this._goodStreak = 0;
    }
  }

  applyQuality() {
    const ctx = this.ctx;
    const hadShadows = ctx.renderer.renderer.shadowMap.enabled;
    ctx.renderer.applyQuality();
    if (hadShadows !== ctx.renderer.renderer.shadowMap.enabled) {
      // Shadow support is compiled into each program, so every material needs rebuilding.
      ctx.scene.traverse((o) => {
        if (!o.material) return;
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of list) m.needsUpdate = true;
      });
    }
    ctx.sky.setQuality(ctx.settings.preset);
    ctx.traffic.budget = ctx.settings.preset.trafficBudget;
    ctx.peds.budget = ctx.settings.preset.pedBudget;
  }

  save() { return saveGame(this.ctx); }

  /** What a brand-new game starts with. */
  grantStarterKit() {
    const w = this.ctx.player.weapons;
    w.add('pistol-9', 60);
    w.add('baseball-bat');
    w.select('fists');
  }

  restart() {
    clearSave();
    const ctx = this.ctx;
    ctx.missions.completed.clear();
    ctx.missions._cleanup();
    ctx.economy = new Economy(ctx);
    ctx.player.weapons.slots.clear();
    ctx.player.weapons.order = [];
    ctx.player.weapons.add('fists');
    // A new game is a new game: the same kit a first boot gets, not fists only.
    this.grantStarterKit();
    ctx.player.health = ctx.player.maxHealth;
    ctx.player.armor = 0;
    ctx.player.dead = false;
    // Lifetime totals and stunt records are on the Statistics page and in the
    // save, so leaving them behind meant "Wipes your progress" kept your medals
    // -- and, worse, left every stunt challenge already beaten and therefore
    // unearnable, with the next autosave baking the old numbers into the new
    // save two minutes later.
    ctx.player.kills = 0;
    ctx.player.distanceDriven = 0;
    ctx.player.distanceWalked = 0;
    if (ctx.stunts) {
      ctx.stunts.totalScore = 0;
      ctx.stunts.bestCombo = 0;
      ctx.stunts.maxAirTime = 0;
      // Reset each record rather than clearing the map: _scoreChallenge looks
      // its spot up and bails if there is no entry, so an emptied map would
      // make every challenge unscorable instead of unbeaten.
      if (ctx.stunts.challenges) {
        for (const rec of ctx.stunts.challenges.values()) { rec.best = 0; rec.medal = 'none'; }
      }
    }
    ctx.police.clear();
    ctx.time.hour = 8.5;
    ctx.time.day = 1;
    this._placePlayer();
    ctx.hud.toast('New game', 'Fresh off the bus', 'info');
  }

  /** Everything the smoke test wants to know. */
  report() {
    const ctx = this.ctx;
    const r = ctx.renderer.stats();
    return {
      frame: this.frame,
      elapsed: +ctx.time.elapsed.toFixed(1),
      hour: +ctx.time.hour.toFixed(2),
      fps: r.fps, ms: r.ms, calls: r.calls, tris: r.tris,
      world: ctx.world.stats,
      peds: ctx.peds.count,
      traffic: ctx.traffic.count,
      parked: ctx.traffic.parked.length,
      particles: ctx.particles.liveCount,
      lights: ctx.lights.activeCount,
      police: ctx.police.stats(),
      playerPos: [Math.round(ctx.player.position.x), Math.round(ctx.player.position.y), Math.round(ctx.player.position.z)],
      inVehicle: ctx.player.inVehicle ? ctx.player.vehicle.def.id : null,
      health: Math.round(ctx.player.health),
      cash: ctx.economy.cash,
      missions: ctx.missions.completed.size,
      errors: this.errors.length,
    };
  }

  /**
   * Floors on what generation actually produced. Everything else in validate()
   * asks whether the world is behaving; this asks whether there is a world at
   * all. Without it a run that generated an empty map -- no buildings, no
   * roads, no colliders -- reports no problems, because nothing that does not
   * exist can misbehave.
   */
  _validateWorld() {
    const bad = [];
    const st = this.ctx.world && this.ctx.world.stats;
    if (!st) return ['world generated no stats at all'];
    // Deliberately far below what the generator produces (thousands of
    // buildings, tens of thousands of colliders). These are "is it there",
    // not "is it the right size".
    const FLOOR = { buildings: 200, shops: 12, roadNodes: 60, roadEdges: 60, blocks: 20,
      colliders: 500, lights: 50, parkedSlots: 100 };
    for (const [key, min] of Object.entries(FLOOR)) {
      const got = st[key];
      if (!Number.isFinite(got)) bad.push(`world.stats.${key} is missing`);
      else if (got < min) bad.push(`the city only generated ${got} ${key} (expected at least ${min})`);
    }
    // A swallowed generation failure is content the player will never see.
    const f = st.failures;
    if (f) {
      const total = (f.buildings || 0) + (f.props || 0) + (f.stuntSpots || 0);
      if (total > 0) {
        bad.push(`worldgen dropped ${total} object(s): ${f.buildings} building(s), ${f.props} prop(s),`
          + ` ${f.stuntSpots} stunt spot(s) — first: ${f.first}`);
      }
    } else {
      bad.push('world.stats.failures is missing — generation failures are not being counted');
    }
    return bad;
  }

  /**
   * The city has to actually be populated. Traffic and pedestrians stream in
   * around the player, so this tracks the high-water mark rather than the
   * instantaneous count -- a momentary dip while a district unloads is normal,
   * never having spawned anything is not -- and reports once.
   */
  _validatePopulation() {
    const ctx = this.ctx;
    if (!this._popPeak) this._popPeak = { traffic: 0, peds: 0, parked: 0, reported: false };
    const peak = this._popPeak;
    peak.traffic = Math.max(peak.traffic, ctx.traffic ? ctx.traffic.count : 0);
    peak.peds = Math.max(peak.peds, ctx.peds ? ctx.peds.count : 0);
    // Parked cars stream in and out around the player exactly like traffic
    // does, capped at a fraction of the traffic budget, so the instantaneous
    // count says more about where the player is standing than about the city.
    peak.parked = Math.max(peak.parked, ctx.traffic ? ctx.traffic.parked.length : 0);
    // Give the streamers time to fill in; the budgets are 22 cars and 24 peds
    // even on the cheapest preset, so these floors clear by a wide margin.
    if (peak.reported || ctx.time.elapsed < 15) return [];
    const bad = [];
    if (peak.traffic < 4) bad.push(`no traffic: ${peak.traffic} car(s) at peak after ${ctx.time.elapsed.toFixed(0)}s`);
    if (peak.peds < 5) bad.push(`no pedestrians: ${peak.peds} at peak after ${ctx.time.elapsed.toFixed(0)}s`);
    if (peak.parked < 4) bad.push(`nothing ever parks: ${peak.parked} parked car(s) at peak`);
    if (bad.length) peak.reported = true;
    return bad;
  }

  /**
   * The content catalogues check themselves. Running them once, on the first
   * validate call, means a smoke run fails on a broken mission graph or an
   * out-of-band weapon instead of only on something the physics notices.
   */
  _validateContent() {
    const bad = [];
    const run = (name, fn) => {
      try {
        for (const p of fn()) bad.push(`${name}: ${p}`);
      } catch (e) {
        bad.push(`${name}: threw ${e && e.message ? e.message : e}`);
      }
    };
    run('missions', validateMissions);
    run('weapons', validateWeapons);
    run('vehicles', validateVehicles);
    run('shops', validateShops);
    run('stunts', validateStunts);
    run('radio', validateStations);
    run('districts', validateDistricts);
    return bad;
  }

  /** Consistency checks the smoke test runs every couple of seconds. */
  validate() {
    const ctx = this.ctx;
    const bad = [];
    if (!this._contentChecked) {
      this._contentChecked = true;
      bad.push(...this._validateContent());
      bad.push(...this._validateWorld());
    }
    bad.push(...this._validatePopulation());
    const finite = (v, name) => { if (!Number.isFinite(v)) bad.push(`${name} is not finite (${v})`); };
    const p = ctx.player;
    finite(p.position.x, 'player.x'); finite(p.position.y, 'player.y'); finite(p.position.z, 'player.z');
    // The character controller puts a non-finite position back together inside
    // its own step, so the checks above can never see one. It counts them now,
    // and the count is the thing worth reporting.
    if (p.body && p.body.nonFiniteFixes) {
      bad.push(`the player's position went non-finite ${p.body.nonFiniteFixes} time(s)`);
      p.body.nonFiniteFixes = 0;
    }
    finite(p.health, 'player.health');
    if (p.position.y < -200) bad.push(`player fell out of the world (y=${p.position.y.toFixed(1)})`);
    if (p.health > p.maxHealth + 0.01) bad.push('player health above maximum');

    let trafficAlive = 0, trafficRolled = 0, trafficWrecked = 0;
    for (const v of ctx.traffic.all()) {
      if (v.dead) continue;
      trafficAlive++;
      // A motorcycle on its side is a motorcycle someone knocked over, not
      // evidence of broken physics. Counting them made a clipped bike read as
      // "a third of the traffic is on its roof".
      if (v.sim.up.y < 0.2 && v.def.body.kind !== 'bike') trafficRolled++;
      if (v.sim.health < v.sim.maxHealth * 0.5) trafficWrecked++;
      const s = v.sim;
      if (!Number.isFinite(s.position.x + s.position.y + s.position.z)) { bad.push(`vehicle ${v.def.id} has a non-finite position`); break; }
      if (!Number.isFinite(s.velocity.x + s.velocity.y + s.velocity.z)) { bad.push(`vehicle ${v.def.id} has a non-finite velocity`); break; }
      if (s.position.y < -300) { bad.push(`vehicle ${v.def.id} fell out of the world`); break; }
      // 114 m/s is the fastest thing in the catalogue, and the sim clamps at
      // 140, so the old `> 200` could never be true. This sits between the two
      // where it can actually fire.
      if (s.speed > 125) { bad.push(`vehicle ${v.def.id} is doing ${s.speed.toFixed(0)} m/s`); break; }
      // The sim's safety clamps are silent by design, which made every range
      // check below unreachable: it asked about states the clamps had already
      // made impossible. A clamp having to bite IS the fault, so the sim counts
      // them and this reads the count.
      const cl = s.clamped;
      if (cl) {
        // A non-finite transform, a car past 140 m/s or negative wear are always
        // faults. The thermal ceilings are different: a single substep over the
        // line is the clamp doing its job on a transient -- measured across
        // burnouts, thirty-second drifts, wall impacts and spun-up landings,
        // none of them touch it at all -- so what is worth reporting is a tyre
        // or a disc that STAYS there. 60 substeps is half a second.
        const HELD = 60;
        const hit = cl.nonFinite ? `went non-finite ${cl.nonFinite} time(s)`
          : cl.speed ? `hit the 140 m/s ceiling ${cl.speed} time(s)`
          : cl.wear ? `computed negative tyre wear ${cl.wear} time(s)`
          : cl.tyreTemp > HELD ? `held a tyre at the 220 C ceiling for ${(cl.tyreTemp / 120).toFixed(1)}s (peak ${cl.tyrePeak.toFixed(0)} C)`
          : cl.brakeTemp > HELD ? `held a brake disc at the 900 C ceiling for ${(cl.brakeTemp / 120).toFixed(1)}s (peak ${cl.brakePeak.toFixed(0)} C)`
          : null;
        if (hit) { bad.push(`vehicle ${v.def.id} ${hit}`); break; }
      }
      // Thermal state has to stay physical: a tyre or a disc that runs away is
      // a sign the tyre model is feeding on its own numerical noise.
      // clamp(NaN, lo, hi) returns NaN, so these three DO survive the clamps and
      // are worth asking. The numeric bands that used to sit here did not.
      let thermalBad = null;
      for (const w of s.wheels) {
        if (!Number.isFinite(w.temp) || !Number.isFinite(w.brakeTemp) || !Number.isFinite(w.wear)) {
          thermalBad = 'non-finite tyre state'; break;
        }
      }
      if (thermalBad) { bad.push(`vehicle ${v.def.id}: ${thermalBad}`); break; }
      // A car whose roof is under the ground has fallen through the terrain.
      if (s.position.y + v.def.height * 0.5 < ctx.physics.groundHeight(s.position.x, s.position.z) - 0.1) {
        bad.push(`vehicle ${v.def.id} is buried in the terrain`); break;
      }
    }
    // Ambient traffic that is mostly upside-down or mostly wrecked means the
    // drivers or the physics are failing, not that the city is having a bad day.
    if (trafficAlive >= 6) {
      if (trafficRolled / trafficAlive > 0.25) {
        const ex = ctx.traffic.all().find((v) => !v.dead && v.sim.up.y < 0.2 && v.def.body.kind !== 'bike');
        const d = ex ? ` e.g. ${ex.def.id} at ${ex.sim.position.x.toFixed(0)},${ex.sim.position.z.toFixed(0)}`
          + ` doing ${(ex.sim.speed * 3.6).toFixed(0)} km/h, up.y=${ex.sim.up.y.toFixed(2)},`
          + ` wheels=${ex.sim.wheelsOnGround}, hp=${Math.round(ex.sim.health)}, age=${(ctx.time.elapsed - (ex.spawnedAt ?? 0)).toFixed(0)}s` : '';
        bad.push(`${trafficRolled} of ${trafficAlive} traffic cars are on their roof${d}`);
      }
      if (trafficWrecked / trafficAlive > 0.5) bad.push(`${trafficWrecked} of ${trafficAlive} traffic cars are wrecked`);
    }

    for (const ped of ctx.peds.peds) {
      const b = ped.body.position;
      if (!Number.isFinite(b.x + b.y + b.z)) { bad.push(`ped ${ped.def.id} has a non-finite position`); break; }
      if (ped.body.nonFiniteFixes) {
        bad.push(`ped ${ped.def.id} went non-finite ${ped.body.nonFiniteFixes} time(s)`);
        ped.body.nonFiniteFixes = 0;
        break;
      }
      if (b.y < -200) { bad.push(`ped ${ped.def.id} fell out of the world`); break; }
      if (ped.inVehicle && ped.visible) { bad.push(`ped ${ped.def.id} is visible while riding in a car`); break; }
      if (b.y < ctx.physics.groundHeight(b.x, b.z) - 0.6) { bad.push(`ped ${ped.def.id} is under the ground`); break; }
    }
    // The two pools together ARE the ceiling, so the old test against the
    // settings budget could never be true. Counting past the buffers would be a
    // real bookkeeping fault, and a pool pinned full for a minute means effects
    // are being cut short every frame rather than merely during a big bang.
    const pcap = ctx.particles.capacity;
    if (pcap && ctx.particles.liveCount > pcap) {
      bad.push(`particle count ${ctx.particles.liveCount} is past the pool's own ${pcap}`);
    }
    if (pcap && ctx.particles.liveCount >= pcap) this._particleFullFor = (this._particleFullFor || 0) + 1;
    else this._particleFullFor = 0;
    if (this._particleFullFor > 30) {
      bad.push(`the particle pool has been full for ${this._particleFullFor} checks running — effects are being truncated`);
      this._particleFullFor = 0;
    }
    if (this.errors.length) {
      for (const e of this.errors.splice(0, 4)) bad.push('runtime error: ' + e);
    }
    return bad;
  }

  dispose() {
    this.running = false;
    const ctx = this.ctx;
    ctx.traffic?.clear();
    ctx.peds?.clear();
    ctx.combat?.clear();
    ctx.player?.dispose();
    ctx.world?.dispose();
    ctx.sky?.dispose();
    ctx.weather?.dispose();
    ctx.particles?.dispose();
    ctx.decals?.dispose();
    ctx.lights?.dispose();
    ctx.ambience?.dispose();
    ctx.audio?.dispose();
  }
}
