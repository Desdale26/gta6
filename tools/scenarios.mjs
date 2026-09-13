// scenarios.mjs — drives the real game through gameplay situations in a headless browser
// and fails on any console error, page error, NaN, or broken invariant.
//
//   node tools/scenarios.mjs            run every scenario
//   node tools/scenarios.mjs drive rob  run only those
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = Number(process.env.PORT || 8106);
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SHOTS = process.argv.includes('--shots');

const IGNORE = [
  /GPU stall due to ReadPixels/i, /SwiftShader/i, /Automatic fallback/i,
  /GL_INVALID_OPERATION: Texture format does not support/i,
];

// Each scenario: { name, setup (runs in page), seconds, assert (runs in page, returns string[]) }
const SCENARIOS = [
  {
    name: 'idle',
    seconds: 8,
    setup: () => {},
    assert: (c) => {
      const bad = [];
      if (c.peds.count < 3) bad.push(`only ${c.peds.count} pedestrians spawned`);
      if (c.traffic.count < 3) bad.push(`only ${c.traffic.count} traffic vehicles spawned`);
      if (c.player.health < 100) bad.push('player lost health while standing still');
      return bad;
    },
  },
  {
    name: 'walk',
    seconds: 8,
    setup: (c) => { window.__VC.hold(['KeyW', 'ShiftLeft']); },
    assert: (c) => {
      const bad = [];
      if (c.player.distanceWalked < 10) bad.push(`walked only ${c.player.distanceWalked.toFixed(1)} m while holding W`);
      if (!Number.isFinite(c.player.position.y)) bad.push('player Y not finite');
      if (c.player.position.y < -20) bad.push('player fell through the world');
      return bad;
    },
    teardown: () => window.__VC.release(),
  },
  {
    name: 'drive',
    seconds: 14,
    setup: (c) => {
      const v = c.traffic.spawnAt('', c.player.position.x + 4, c.player.position.z + 4, 0, { ai: false })
        || c.traffic.spawnAt(c.__anyCar, c.player.position.x + 4, c.player.position.z + 4, 0, { ai: false });
      if (v) c.player.enterVehicle(v, 0);
      window.__VC.hold(['KeyW']);
    },
    assert: (c) => {
      const bad = [];
      if (!c.player.inVehicle) { bad.push('player is not in a vehicle'); return bad; }
      const sim = c.player.vehicle.sim;
      if (c.player.distanceDriven < 25) bad.push(`drove only ${c.player.distanceDriven.toFixed(1)} m at full throttle`);
      if (sim.speed > 120) bad.push(`vehicle reached ${sim.speed.toFixed(0)} m/s`);
      if (!Number.isFinite(sim.position.y)) bad.push('vehicle Y not finite');
      if (sim.position.y < -20) bad.push('vehicle fell through the world');
      if (sim.engineRpm < sim.def.engine.idleRpm * 0.8) bad.push('engine rpm below idle under throttle');
      // `wheelsOnGround === 0` is not the same as flying: a car that has rammed
      // a building and is left leaning nose-up against it has no wheel contact
      // either, and that is a crash, not a physics failure. What would be a
      // failure is a car well above where it could ever rest.
      const restY = c.physics.groundHeight(sim.position.x, sim.position.z) + sim.rideHeight;
      if (sim.airTime > 2.5 && sim.position.y > restY + 2.5) {
        bad.push(`flying: ${(sim.position.y - restY).toFixed(1)} m up after ${sim.airTime.toFixed(1)}s airborne`);
      }
      // Holding W for fourteen seconds can end in a building. A car that hits one
      // at 20 m/s, spins, and trips over its own tyres has rolled for real
      // reasons; a car that ends up inverted having hit nothing has not.
      if (sim.up.y < 0.2 && sim.health > sim.maxHealth * 0.92) {
        bad.push('car ended up on its roof without a scratch on it');
      }
      return bad;
    },
    teardown: () => window.__VC.release(),
  },
  {
    name: 'brake-and-reverse',
    seconds: 8,
    setup: (c) => {
      const v = c.traffic.nearestVehicle(c.player.position.x, c.player.position.z, 60)
        || c.traffic.spawnAt(c.__anyCar, c.player.position.x + 4, c.player.position.z + 4, 0, { ai: false });
      if (v && !c.player.inVehicle) c.player.enterVehicle(v, 0);
      window.__VC.hold(['KeyS']);
    },
    assert: (c) => {
      const bad = [];
      if (!c.player.inVehicle) return ['player is not in a vehicle'];
      const sim = c.player.vehicle.sim;
      if (sim.gear !== -1 && sim.forwardSpeed > -0.5) bad.push(`holding S did not engage reverse (gear ${sim.gear}, fwd ${sim.forwardSpeed.toFixed(2)})`);
      return bad;
    },
    teardown: () => window.__VC.release(),
  },
  {
    name: 'shoot',
    seconds: 6,
    setup: (c) => {
      if (c.player.inVehicle) c.player.exitVehicle(true);
      c.player.weapons.add('assault-rifle', 300);
      c.player.weapons.select('assault-rifle');
      c.input.mouse.right = true;
      c.input.mouse.left = true;
    },
    assert: (c) => {
      const bad = [];
      const s = c.player.weapons.slots.get('assault-rifle');
      if (!s) return ['assault rifle was not added'];
      if (s.ammoInMag + s.reserve >= 300 + s.def.magazine) bad.push('no ammo was consumed while firing');
      if (c.player.weapons.lastShotTime < 0) bad.push('no shot was ever registered');
      if (!Number.isFinite(c.player.weapons.recoil.x + c.player.weapons.recoil.y)) bad.push('recoil went non-finite');
      return bad;
    },
    teardown: (c) => { c.input.mouse.left = false; c.input.mouse.right = false; },
  },
  {
    // The bug a player actually reported was "when you aim, it aims behind
    // you", and nothing in this suite would have caught it: the shoot scenario
    // only checks that ammunition goes down. So this one asks where the bullets
    // go.
    //
    // The trap here is that the aim camera is built by pointing it along
    // player.aimDirection, so comparing the two proves nothing -- a mirrored
    // aim would mirror the camera with it and still agree with itself. That is
    // how this bug passed its own test once already. Everything below is
    // anchored on things aimDirection had no hand in: the yaw convention the
    // rest of the engine turns by, the chase camera's orbit (built from
    // player.yaw, not from the aim vector), and a car standing in the street
    // that has to be the one that gets shot.
    name: 'aim',
    seconds: 6,
    setup: (c) => {
      const p = c.player;
      const T = c.THREE;
      if (p.inVehicle) p.exitVehicle(true);
      const spot = c.world.safeRoadPoint(806, -300);
      p.body.position.set(spot.x, c.physics.groundHeight(spot.x, spot.z) + 1.0, spot.z);
      p.body.velocity.set(0, 0, 0);
      p.yaw = 0.7; p.pitch = 0;
      p.weapons.add('assault-rifle', 300);
      p.weapons.select('assault-rifle');
      c.input.mouse.right = false;                // hip fire: keep the chase camera
      window.__VC.simulate(1.5);                  // let the chase camera settle

      // Anchor 1: the engine's yaw convention. Forward is (sin y, 0, cos y) --
      // the same relation the movement basis and the camera orbit are built on.
      const convention = new T.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
      // Anchor 2: where the chase camera is actually looking, read off its world
      // matrix. It is positioned by orbiting player.yaw, so it is independent of
      // the aim vector under test.
      c.camera.updateMatrixWorld(true);
      const camFwd = new T.Vector3();
      c.camera.getWorldDirection(camFwd);
      const camFlat = camFwd.clone(); camFlat.y = 0; camFlat.normalize();

      // Pitch: looking up has to aim up, down the barrel and in the view alike.
      // The camera half is read as a change rather than an absolute, because a
      // chase camera orbits and looks back at the player, so its own forward
      // tilts down at rest — what matters is which way it moves.
      const sample = (pitch) => {
        p.pitch = pitch;
        window.__VC.simulate(0.8);
        c.camera.updateMatrixWorld(true);
        const f = new T.Vector3();
        c.camera.getWorldDirection(f);
        return { cam: f.y, aim: p.aimDirection.y };
      };
      const lookDown = sample(-0.5);
      const lookUp = sample(0.5);
      const lookLevel = sample(0);

      // The gun the player can SEE has to point where the bullets go. The barrel
      // runs from the model group's origin to its muzzle point, both read off
      // the live world matrices after the arm pose has settled.
      const barrel = (aimingOn) => {
        c.input.mouse.right = aimingOn;
        window.__VC.simulate(0.8);
        p.group.updateMatrixWorld(true);
        if (!p.weapons.model) return null;
        const breech = new T.Vector3().setFromMatrixPosition(p.weapons.modelGroup.matrixWorld);
        const muzzle = p.weapons.muzzleWorld(new T.Vector3());
        const dir = muzzle.clone().sub(breech);
        if (dir.length() < 1e-4) return null;
        return { cos: dir.normalize().dot(p.aimDirection), len: muzzle.distanceTo(breech) };
      };
      const barrelAimed = barrel(true);
      const barrelHip = barrel(false);

      // Straight ahead is sometimes a wall, so try a few distances before
      // giving up — a target that could not be parked is a harness problem,
      // not an aiming one, and should not read as either.
      let target = null, range = 0;
      for (const d of [24, 18, 30, 14]) {
        target = c.traffic.spawnAt(c.__anyCar, p.position.x + camFlat.x * d, p.position.z + camFlat.z * d,
          Math.atan2(camFlat.x, camFlat.z), { ai: false });
        if (target) { range = d; break; }
      }
      c.__aim = {
        convention: [convention.x, convention.y, convention.z],
        camFlat: [camFlat.x, camFlat.y, camFlat.z],
        lookDown,
        lookUp,
        lookLevel,
        barrelAimed,
        barrelHip,
        hits: 0,
        range,
        health0: target ? target.sim.health : 0,
        hasTarget: !!target,
      };
      c.__aimTarget = target;
      c.__aimOff = c.bus.on('combat:vehicleHit', (e) => { if (e.vehicle === c.__aimTarget) c.__aim.hits++; });
      c.input.mouse.left = true;                  // open fire
    },
    assert: (c) => {
      const bad = [];
      const a = c.__aim;
      const p = c.player;
      const T = c.THREE;
      const convention = new T.Vector3(...a.convention);
      const camFlat = new T.Vector3(...a.camFlat);
      const deg = (d) => (Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI).toFixed(1);

      // 1. The chase camera looks the way the player's yaw says they face.
      const camVsYaw = camFlat.dot(convention);
      if (camVsYaw < 0.95) bad.push(`the chase camera looks ${deg(camVsYaw)} degrees away from the player's facing`);

      // 2. The gun points that way too.
      const aimFlat = p.aimDirection.clone(); aimFlat.y = 0; aimFlat.normalize();
      const aimVsYaw = aimFlat.dot(convention);
      if (aimVsYaw < 0) bad.push(`the gun aims behind the player (dot ${aimVsYaw.toFixed(3)})`);
      else if (aimVsYaw < 0.9) bad.push(`the gun points ${deg(aimVsYaw)} degrees off the player's facing`);

      // 3. Looking up aims up, in the camera and down the barrel alike.
      //    sin(0.5) is 0.48, so a correctly signed pitch clears 0.3 easily and
      //    an inverted one lands at -0.48.
      if (!(a.lookUp.aim > 0.3)) bad.push(`looking up aimed the gun down (aimDirection.y ${a.lookUp.aim.toFixed(3)})`);
      if (!(a.lookDown.aim < -0.3)) bad.push(`looking down aimed the gun up (aimDirection.y ${a.lookDown.aim.toFixed(3)})`);
      if (!(Math.abs(a.lookLevel.aim) < 0.05)) bad.push(`a level view aims ${a.lookLevel.aim.toFixed(3)} off horizontal`);
      if (!(a.lookUp.cam - a.lookLevel.cam > 0.04)) {
        bad.push(`looking up did not raise the camera (forward.y ${a.lookLevel.cam.toFixed(3)} -> ${a.lookUp.cam.toFixed(3)})`);
      }
      if (!(a.lookLevel.cam - a.lookDown.cam > 0.04)) {
        bad.push(`looking down did not lower the camera (forward.y ${a.lookLevel.cam.toFixed(3)} -> ${a.lookDown.cam.toFixed(3)})`);
      }

      // 4. The gun in the player's hands points where the bullets go. A model
      //    angled off the aim is the difference between a game that looks like
      //    it is shooting at the thing and one that plainly is not.
      // Aimed is held tight: the arm pose is built to put the barrel on the aim,
      // and what is left over is the shoulder's deliberate sideways splay, about
      // 7 degrees. From the hip the gun is carried lowered, around 31 degrees,
      // so that one only has to stay recognisably forward.
      for (const [name, b, limit] of [['aiming down sights', a.barrelAimed, 0.9], ['from the hip', a.barrelHip, 0.6]]) {
        if (!b) { bad.push(`no weapon model to measure ${name}`); continue; }
        if (!(b.cos > limit)) {
          bad.push(`${name}, the visible barrel points ${deg(b.cos)} degrees away from where the gun shoots`);
        }
      }

      // 5. And the car standing in front of the player is the one that gets shot.
      if (!a.hasTarget) bad.push('could not park a target in front of the player');
      else {
        const v = c.__aimTarget;
        if (a.hits === 0) bad.push(`fired a full magazine at a car ${a.range} m dead ahead and never hit it`);
        if (v && v.sim.health >= a.health0) bad.push('the target took no damage');
      }
      return bad;
    },
    teardown: (c) => {
      c.input.mouse.left = false; c.input.mouse.right = false;
      if (c.__aimOff) c.__aimOff();
      c.__aimTarget = null;
    },
  },
  {
    name: 'explosions',
    seconds: 8,
    setup: (c) => {
      if (c.player.inVehicle) c.player.exitVehicle(true);
      const p = c.player.position;
      for (let i = 0; i < 6; i++) {
        c.combat.explode(p.x + (i - 3) * 9, p.y + 1, p.z + 12, { radius: 10, damage: 150, force: 18000 });
      }
      c.player.weapons.add('rpg', 10);
      c.player.weapons.select('rpg');
    },
    assert: (c) => {
      const bad = [];
      // The pool refuses to spawn at 160, so asking whether it went PAST 160
      // could never be true. What is reachable, and what the check was reaching
      // for, is a pool that fills up and then never drains.
      if (c.combat.projectiles.length >= 160) bad.push('the projectile pool is pinned full — it is not draining');
      else if (c.combat.projectiles.length > 60) bad.push(`${c.combat.projectiles.length} projectiles still live well after the blasts`);
      for (const v of c.traffic.all()) {
        if (!Number.isFinite(v.sim.position.x + v.sim.position.y + v.sim.position.z)) { bad.push('a vehicle went non-finite after an explosion'); break; }
      }
      for (const ped of c.peds.peds) {
        const b = ped.body.position;
        if (!Number.isFinite(b.x + b.y + b.z)) { bad.push('a pedestrian went non-finite after an explosion'); break; }
      }
      return bad;
    },
  },
  {
    name: 'wanted',
    seconds: 18,
    setup: (c) => {
      c.police.setStars(4);
      // Also put an armed hostile on foot right next to the player. Whether a
      // patrol car happens to pull up and disgorge its officers inside the
      // scenario's eighteen seconds is a tuning question; whether someone in a
      // firefight is holding the weapon they are firing is not, and this makes
      // the second one deterministic.
      const p = c.player.position;
      const ped = c.peds.spawn('gang-viper', p.x + 6, p.z + 6, 0, {});
      if (ped) {
        ped.armed = 'pistol-9';
        ped.threat = c.player;
        ped.stats = { ...ped.stats, bravery: 0.95, aggression: 0.9 };
        ped._setState('combat');
        c.__gunman = ped;
      }
    },
    assert: (c) => {
      const bad = [];
      if (c.police.stars < 1) bad.push('wanted level vanished immediately');
      if (c.police.units.length === 0 && c.police.officers.length === 0) bad.push('no police responded at 4 stars');
      for (const u of c.police.units) {
        if (!Number.isFinite(u.sim.position.x)) { bad.push('a police vehicle went non-finite'); break; }
      }

      // Anyone shooting at you has to be holding something. This used to be
      // mimed: `armed` was an id handed to the combat system and nothing was
      // ever put in their hand. The barrel runs down the arm, so it also has to
      // point roughly where they are facing rather than into the sky.
      const T = c.THREE;
      const all = [...c.police.officers, ...c.peds.peds];
      const fighting = all.filter((o) => !o.dead && o.armed && o.state === 'combat' && o.visible !== false);
      if (!fighting.length) bad.push('nobody armed ever entered combat, so there was nothing to check');
      let checked = 0;
      for (const o of fighting) {
        const gun = o.weaponModel;
        if (!gun) { bad.push(`a ped with ${o.armed} is in a firefight holding nothing`); break; }
        if (!gun.visible) { bad.push(`a ped's ${o.armed} is built but not drawn`); break; }
        o.group.updateMatrixWorld(true);
        const breech = new T.Vector3().setFromMatrixPosition(gun.matrixWorld);
        const muzzle = new T.Vector3(0, 0, 0.4).applyMatrix4(gun.matrixWorld);
        const barrel = muzzle.sub(breech).normalize();
        const facing = new T.Vector3(Math.sin(o.yaw), 0, Math.cos(o.yaw));
        const cos = barrel.dot(facing);
        if (!(cos > 0.75)) {
          const off = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI).toFixed(0);
          bad.push(`an armed ped's weapon points ${off} degrees away from the way they are facing`);
          break;
        }
        if (++checked >= 4) break;
      }

      // And the shots they fire have to be visible. npcFire built its origin in
      // the same module scratch vector the tracer's far end was written into,
      // so from and to arrived as the same object and every NPC tracer was a
      // point: enemy fire came out of nowhere with nothing drawn between them
      // and the player.
      const tr = c.combat.tracers || [];
      if (!tr.length) bad.push('nobody fired a visible shot in eighteen seconds of a four-star chase');
      else {
        const longest = Math.max(...tr.map((t) => Math.hypot(t.x1 - t.x0, t.y1 - t.y0, t.z1 - t.z0)));
        if (!(longest > 0.5)) bad.push(`every tracer on screen is ${longest.toFixed(3)} m long — they are drawing as points`);
      }
      return bad;
    },
    teardown: (c) => {
      c.police.clear();
      if (c.__gunman) { c.__gunman.dispose?.(); c.__gunman = null; }
    },
  },
  {
    name: 'rob',
    seconds: 26,
    setup: (c) => {
      // A till-only shop finishes inside the scenario budget.
      const shop = c.world.shops.find((s) => s.typeDef.robbery.possible && s.typeDef.robbery.safeCash[1] === 0)
        || c.world.shops[0];
      window.__scenarioShop = shop;
      c.player.spawn(shop.x, c.physics.groundHeight(shop.x, shop.z) + 0.3, shop.z, 0);
      c.player.weapons.add('combat-pistol', 100);
      c.player.weapons.select('combat-pistol');
      c.shops.startRobbery(shop);
    },
    assert: (c) => {
      const bad = [];
      if (c.shops.robbery) bad.push(`robbery never finished (state ${c.shops.robbery.state}, t=${c.shops.robbery.timer.toFixed(1)})`);
      if (!c.economy.ledger.some((l) => /Robbery/.test(l.reason))) bad.push('robbery paid out nothing');
      return bad;
    },
    teardown: (c) => { c.shops.cancelRobbery(); c.police.clear(); },
  },
  {
    name: 'mission',
    seconds: 16,
    setup: (c) => {
      const m = c.missions.available.find((x) => x.type === 'story') || c.missions.available[0];
      window.__scenarioMission = m.id;
      c.player.spawn(m.start.x, c.physics.groundHeight(m.start.x, m.start.z) + 0.3, m.start.z, 0);
      c.missions.start(m.id);
    },
    assert: (c) => {
      const bad = [];
      if (!c.missions.active && !c.missions.completed.size) bad.push('mission neither running nor completed');
      if (c.missions.active && !c.missions.hudState()) bad.push('active mission has no HUD state');
      return bad;
    },
    teardown: (c) => { if (c.missions.active) c.missions.abandon(); },
  },
  {
    name: 'stunt',
    seconds: 14,
    setup: (c) => {
      const spot = c.world.stuntSpots.find((s) => s.def.kind === 'megaramp') || c.world.stuntSpots[0];
      const yaw = spot.def.yaw || 0;
      const bx = spot.x - Math.sin(yaw) * 70;
      const bz = spot.z - Math.cos(yaw) * 70;
      const v = c.traffic.spawnAt(c.__fastCar, bx, bz, yaw, { ai: false });
      if (v) { c.player.enterVehicle(v, 0); }
      window.__VC.hold(['KeyW']);
    },
    assert: (c) => {
      const bad = [];
      if (!c.player.inVehicle) return ['not in the stunt vehicle'];
      if (!Number.isFinite(c.stunts.totalScore)) bad.push('stunt score went non-finite');
      if (c.stunts.combo.length > 40) bad.push('combo list grew unbounded');
      return bad;
    },
    teardown: () => window.__VC.release(),
  },
  {
    name: 'water',
    seconds: 10,
    setup: (c) => {
      if (c.player.inVehicle) c.player.exitVehicle(true);
      c.player.spawn(1260, 2, 0, 0);
      window.__VC.hold(['KeyW']);
    },
    assert: (c) => {
      const bad = [];
      if (!Number.isFinite(c.player.position.y)) bad.push('player Y non-finite in water');
      if (c.player.position.y < -30) bad.push('player sank through the sea bed');
      return bad;
    },
    // Put the player back on dry land. Left offshore, every scenario after this
    // one runs in an empty ocean with no traffic, no pedestrians and no city to
    // look at — which is a very easy way to pass.
    teardown: (c) => {
      window.__VC.release();
      const spot = c.world.safeRoadPoint(806, -300);
      c.player.spawn(spot.x, c.physics.groundHeight(spot.x, spot.z) + 1.0, spot.z, spot.yaw || 0);
    },
  },
  {
    name: 'menus',
    seconds: 4,
    setup: (c) => {
      c.menus.openPause();
      c.menus.menuPage = 'settings';
      c.menus._renderPause();
      for (let i = 0; i < 12; i++) { c.menus.menuIndex = i; c.menus._renderPause(); }
      c.menus._close();
      c.menus.openMap();
      c.menus._drawMap();
      c.menus._close();
      c.menus.openPhone();
      for (const app of ['missions', 'radio', 'stats']) { c.menus.phoneApp = app; c.menus._renderPhone(); }
      c.menus._close();
      c.player.weapons.add('pump-shotgun', 40);
      c.player.weapons.add('smg', 90);
      c.menus.openWheel();
      c.menus._drawWheel();
      c.menus._confirmWheel();
      c.menus.openShop();
    },
    assert: (c) => {
      const bad = [];
      if (c.menus.open !== null && c.menus.open !== 'shop') bad.push(`menu stuck open: ${c.menus.open}`);
      return bad;
    },
    teardown: (c) => { if (c.menus.open) c.menus._close(); },
  },
  {
    name: 'death-respawn',
    seconds: 12,
    setup: (c) => { c.player.kill({ source: 'test' }); },
    assert: (c) => {
      const bad = [];
      if (c.player.dead) bad.push('player never respawned');
      if (c.player.health <= 0) bad.push('player respawned with no health');
      if (!Number.isFinite(c.player.position.x)) bad.push('respawn position not finite');
      return bad;
    },
  },
  {
    name: 'weather-storm',
    seconds: 8,
    setup: (c) => { c.weather.setWeather('storm', true); c.time.hour = 15; },
    assert: (c) => {
      const bad = [];
      if (c.weather.rain < 0.4) bad.push('storm produced no rain');
      if (c.weather.wetness < 0.3) bad.push('roads never got wet in a storm');
      return bad;
    },
    teardown: (c) => c.weather.setWeather('fair', true),
  },
  {
    name: 'day-cycle',
    seconds: 10,
    setup: (c) => { c.game.timeScale = 1; c.__fastClock = true; },
    assert: (c) => {
      const bad = [];
      if (!Number.isFinite(c.sky.sunDir.y)) bad.push('sun direction went non-finite');
      if (!c.sky.envRT) bad.push('environment probe was never built');
      return bad;
    },
  },
  {
    // A thunderstorm once dimmed the scene three separate times over — cloud,
    // storm and exposure each cutting the same light — and left two in the
    // afternoon darker than midnight. Nothing else in the suite noticed,
    // because an unplayably dark frame throws no errors.
    name: 'lighting-levels',
    seconds: 2,
    setup: (c) => { c.__lightProbe = null; },
    assert: (c) => {
      const bad = [];
      const hourWas = c.time.hour, weatherWas = c.weather.type;
      const measure = (hour, weather) => {
        c.time.hour = hour;
        c.weather.setWeather(weather, true);
        c.sky.update(0.016, hour, c.weather);
        c.weather.update(0.016, hour);
        return {
          key: c.sky.sun.intensity,
          fill: c.sky.hemi.intensity + c.sky.moon.intensity,
          exposure: c.renderer.grade.uExposure.value,
        };
      };
      // Exposure is a straight multiplier on the final composite, so it is the
      // third place the same weather can dim the scene -- and it was gathered
      // here and thrown away, checked by nothing. The brightness that reaches
      // the player is the light TIMES the exposure, and that is what is
      // compared: against an absolute floor, and against a clear sky, so a
      // change that dims one of the three paths cannot hide behind the others.
      const bright = (m) => (m.key + m.fill * 1.6) * m.exposure;
      const clearDay = bright(measure(13, 'clear'));
      if (!(clearDay > 0.9)) bad.push(`a clear midday composites at ${clearDay.toFixed(2)}, too dark to play`);
      for (const w of ['clear', 'fair', 'overcast', 'drizzle', 'rain', 'storm', 'fog']) {
        const m = measure(13, w);
        // Daylight: whatever the sky is doing, you can see the road.
        const lit = m.key + m.fill * 1.6;
        if (lit < 1.2) bad.push(`${w} at midday is too dark to play (key ${m.key.toFixed(2)}, fill ${m.fill.toFixed(2)})`);
        if (m.key > 6 || m.fill > 4) bad.push(`${w} at midday is blown out (key ${m.key.toFixed(2)}, fill ${m.fill.toFixed(2)})`);
        if (!(m.exposure > 0.2 && m.exposure < 4)) bad.push(`${w} at midday sets exposure to ${m.exposure.toFixed(2)}`);
        const rel = bright(m) / clearDay;
        if (rel < 0.35) bad.push(`${w} at midday composites ${rel.toFixed(2)}x a clear sky — the weather is dimming it three times over`);
        if (rel > 1.6) bad.push(`${w} at midday composites ${rel.toFixed(2)}x a clear sky`);
      }
      for (const w of ['clear', 'rain']) {
        const m = measure(23, w);
        // Night is dark, not black: unlit back streets still need a floor.
        if (m.fill < 0.75) bad.push(`${w} at night has no ambient floor (fill ${m.fill.toFixed(2)})`);
        if (m.fill > 1.6) bad.push(`${w} at night is washed out (fill ${m.fill.toFixed(2)})`);
        if (!(m.exposure > 0.2 && m.exposure < 5)) bad.push(`${w} at night sets exposure to ${m.exposure.toFixed(2)}`);
        // Night must be darker than midday, but not by so much that nothing reads.
        const rel = bright(m) / clearDay;
        if (rel > 0.8) bad.push(`${w} at night composites ${rel.toFixed(2)}x midday — it is not night`);
        if (rel < 0.02) bad.push(`${w} at night composites ${rel.toFixed(3)}x midday — it is black`);
      }
      c.time.hour = hourWas;
      c.weather.setWeather(weatherWas, true);
      return bad;
    },
  },
];

function startServer() {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ['tools/serve.js'], {
      env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let done = false;
    p.stdout.on('data', (d) => { if (!done && String(d).includes('http://')) { done = true; resolve(p); } });
    setTimeout(() => { if (!done) { done = true; resolve(p); } }, 2500);
  });
}

const results = [];
let errors = [];

// The renderer is SwiftShader on a throttled container, and it does sometimes
// die partway through a long run. That used to take the whole report with it:
// all sixteen scenarios ran, the final page.evaluate threw "target closed", and
// the process exited 2 having printed nothing but the scenario names. So the
// session is rebuildable, each verdict prints the moment it lands, and a dead
// page is recorded as a failure rather than swallowing the results.
let browser = null, page = null, alive = false;

async function openSession() {
  browser = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  });
  page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  alive = true;
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() !== 'error' || IGNORE.some((r) => r.test(t))) return;
    errors.push('[console] ' + t.slice(0, 400));
  });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + (e.stack || e.message).slice(0, 600)));
  page.on('crash', () => { alive = false; errors.push('[crash] the renderer process died'); });
  page.on('close', () => { alive = false; });
  browser.on('disconnected', () => { alive = false; });

  await page.goto(`http://localhost:${PORT}/index.html?smoke=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__VC && window.__VC.ready, { timeout: 240000 });

  // Pick a couple of representative vehicles once.
  await page.evaluate(async () => {
    const m = await import('/src/content/vehicleCatalog.js');
    const c = window.__VC.ctx;
    c.__anyCar = m.VEHICLES.find((v) => v.cls === 'sedan')?.id || m.VEHICLES[0].id;
    c.__fastCar = m.VEHICLES.find((v) => v.cls === 'super' || v.cls === 'sports')?.id || c.__anyCar;
  });
}

async function closeSession() {
  try { await browser?.close(); } catch { /* already gone */ }
  browser = null; page = null; alive = false;
}

function line(r) {
  const issues = r.bad.length + r.errors.length;
  process.stdout.write(`${issues ? 'FAIL' : 'ok  '}  ${r.name.padEnd(18)} ${(r.ms / 1000).toFixed(1)}s\n`);
  for (const b of r.bad.slice(0, 8)) process.stdout.write('        ! ' + b.slice(0, 300) + '\n');
  for (const e of r.errors.slice(0, 6)) process.stdout.write('        × ' + e.slice(0, 300) + '\n');
}

async function main() {
  const server = await startServer();
  await openSession();

  if (SHOTS) fs.mkdirSync('shots', { recursive: true });

  let relaunches = 0;
  for (const s of SCENARIOS) {
    if (ONLY.length && !ONLY.includes(s.name)) continue;
    if (!alive) {
      // Something killed the page. Note it, start again, and keep going —
      // the remaining scenarios still have something to say.
      await closeSession();
      relaunches++;
      try {
        await openSession();
      } catch (e) {
        results.push({ name: s.name, ms: 0, bad: ['could not restart the browser: ' + String(e).slice(0, 200)], errors: [] });
        line(results[results.length - 1]);
        break;
      }
    }
    const errBefore = errors.length;
    const t0 = Date.now();
    try {
      await page.evaluate(`(${s.setup.toString()})(window.__VC.ctx)`);
      const chunk = 2;
      let bad = [];
      for (let t = 0; t < s.seconds; t += chunk) {
        await page.evaluate((n) => window.__VC.simulate(n, 10), chunk);
        const v = await page.evaluate(() => window.__VC.validate());
        if (v && v.length) bad.push(...v);
      }
      const asserted = await page.evaluate(`(${s.assert.toString()})(window.__VC.ctx)`);
      bad.push(...(asserted || []));
      if (s.teardown) await page.evaluate(`(${s.teardown.toString()})(window.__VC.ctx)`);
      if (SHOTS) await page.screenshot({ path: `shots/sc-${s.name}.png` });
      const scenarioErrors = errors.slice(errBefore);
      results.push({ name: s.name, ms: Date.now() - t0, bad: [...new Set(bad)], errors: [...new Set(scenarioErrors)] });
    } catch (e) {
      results.push({ name: s.name, ms: Date.now() - t0, bad: ['scenario threw: ' + String(e).slice(0, 300)], errors: [] });
    }
    line(results[results.length - 1]);
  }

  let report = null;
  try {
    if (alive) report = await page.evaluate(() => window.__VC.report());
  } catch (e) {
    errors.push('[report] could not read the final state: ' + String(e).slice(0, 200));
  }
  await closeSession();
  server.kill();

  console.log('\n=== SCENARIO REPORT ===');
  let failures = 0;
  for (const r of results) {
    const issues = r.bad.length + r.errors.length;
    if (issues) failures++;
    console.log(`\n${issues ? 'FAIL' : 'ok  '}  ${r.name.padEnd(18)} ${(r.ms / 1000).toFixed(1)}s`);
    for (const b of r.bad.slice(0, 8)) console.log('        ! ' + b.slice(0, 300));
    for (const e of r.errors.slice(0, 6)) console.log('        × ' + e.slice(0, 300));
  }
  console.log('\nfinal state:', report ? JSON.stringify(report) : 'unavailable — the page did not survive the run');

  // A run that lost its browser is not a pass, however clean the scenarios were.
  const expected = SCENARIOS.filter((s) => !ONLY.length || ONLY.includes(s.name)).length;
  const hard = [];
  if (relaunches) hard.push(`${relaunches} browser relaunch(es) — the page died mid-run`);
  if (results.length < expected) hard.push(`only ${results.length} of ${expected} scenarios ran`);
  if (!report) hard.push('the final state could not be read');
  for (const h of hard) console.log('  ! ' + h);

  console.log(failures || hard.length
    ? `\n${failures}/${results.length} scenarios have issues${hard.length ? ` (plus ${hard.length} harness problem(s))` : ''}`
    : `\nall ${results.length} scenarios clean`);
  process.exit(failures || hard.length ? 1 : 0);
}

main().catch((e) => {
  // Even a crash in the harness itself should leave behind what it learned.
  console.error('harness crashed', e);
  if (results.length) {
    console.log('\n=== PARTIAL SCENARIO REPORT ===');
    for (const r of results) line(r);
  }
  process.exit(2);
});
