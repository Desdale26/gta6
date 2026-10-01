/*
 * activities.js — things to do between story jobs.
 *
 *   Taxi fares     get in a cab and press P: pick up a fare, get them there
 *                  before the meter runs out, hear their story on the way
 *   Street races   six courses round the city against named rivals
 *   Stunt jumps    ramps around the docks, the fields and the building sites.
 *                  Clear one for a slow-motion jump and a bonus
 *   Lost lanterns  thirty red paper lanterns hidden around the city
 *   Dex's list     cars Dex has buyers for: find, steal, deliver undamaged
 *   Bounties       people someone wants found
 *   Turf wars      hold a corner against a rival crew
 *
 * Races, the list, bounties and turf wars are small jobs run by the mission
 * engine; their names, lines and rewards come from VH.Data.story.activities
 * (with sensible defaults built in).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, smoothstep } = VH.math;

  // Race courses as road coordinates (checkpoints on junctions and straights).
  const COURSES = [
    { id: 'race_heron', name: 'Heron Corner Sprint', start: { x: -89, z: 292, yaw: Math.PI / 2 }, cps: [[0, 292], [96, 292], [99, 150], [99, 3], [240, 3], [384, 3], [381, 150], [381, 292], [192, 292]] },
    { id: 'race_grand', name: 'The Grand Loop', start: { x: -4, z: -40, yaw: Math.PI }, cps: [[-4, -192], [-4, -380], [96, -384], [192, -384], [195, -240], [195, -96], [96, -93], [-96, -93], [-93, -3], [0, 3]] },
    { id: 'race_market', name: 'Market Scramble', start: { x: -288, z: -60, yaw: Math.PI }, cps: [[-291, -192], [-291, -288], [-192, -291], [-189, -192], [-288, -189], [-384, -189], [-381, -96], [-381, 0], [-288, 3]] },
    { id: 'race_docks', name: 'Saltmarsh Run', start: { x: 291, z: 400, yaw: 0 }, cps: [[291, 470], [150, 473], [3, 470], [3, 580], [150, 583], [285, 580], [291, 470], [400, 473]] },
    { id: 'race_crest', name: 'Crestline Hill Climb', start: { x: -400, z: 3, yaw: -Math.PI / 2 }, cps: [[-510, 3], [-513, -150], [-513, -288], [-384, -291], [-381, -96], [-381, 96], [-381, 288], [-510, 291], [-507, 150], [-510, 3]] },
    { id: 'race_tour', name: 'The Vicehaven Grand Tour', start: { x: 3, z: 360, yaw: Math.PI }, cps: [[3, 192], [3, 0], [3, -192], [3, -380], [192, -384], [384, -384], [381, 0], [381, 384], [192, 381], [-192, 381], [-384, 381], [-381, 0], [-381, -384], [-192, -384], [-96, -381]] },
  ];

  const DEFAULT_RIVALS = [
    [{ name: 'Kit "Cinders" Álvarez', car: 'drifter' }, { name: 'Big Moss', car: 'ironclad' }, { name: 'Lena Quail', car: 'vireo' }],
    [{ name: 'Rook', car: 'vireo' }, { name: 'Tamsin Grey', car: 'zephyr' }, { name: 'Oyelaran', car: 'drifter' }],
  ];

  // Stunt ramps: position, heading of the run-up, and a name.
  const JUMPS = [
    { x: 145, z: 500, yaw: Math.PI, name: 'Over the stacks' },
    { x: 60, z: 550, yaw: Math.PI / 2, name: 'Container hop' },
    { x: 350, z: 440, yaw: -Math.PI / 2, name: 'Pier 9 leap' },
    { x: 200, z: 615, yaw: -Math.PI / 2, name: 'Boatyard launch' },
    { x: -470, z: 470, yaw: Math.PI / 2, name: 'The long field' },
    { x: -250, z: 520, yaw: 0, name: 'Hedge jumper' },
    { x: 150, z: -470, yaw: Math.PI, name: 'North pasture' },
    { x: -560, z: -470, yaw: Math.PI / 2, name: 'Outskirts rodeo' },
    { x: -140, z: 36, yaw: -Math.PI / 2, name: 'Meridian Yard flyer' },
    { x: 380, z: 500, yaw: 0, name: 'Quay jump' },
    { x: -560, z: 470, yaw: -Math.PI / 2, name: 'Estate lawn' },
    { x: 60, z: -470, yaw: -Math.PI / 2, name: 'Grand Avenue north' },
  ];

  function rngFrom(seed) {
    const r = new VH.RNG(seed);
    return () => r.next();
  }

  class Activities {
    constructor(game) {
      this.game = game;
      this.data = (VH.Data.story && VH.Data.story.activities) || {};
      this.taxi = { on: false, fare: null, done: 0, earned: 0 };
      this.jumpsDone = {};
      this.lanternsFound = {};
      this.bestRace = {};
      this._jump = null;
      this._buildJumps();
      this._buildLanterns();
      this._registerJobs();
    }

    // ------------------------------------------------------------ jobs
    _registerJobs() {
      const eng = this.game.missions;
      const addJob = (m) => {
        m.activity = true;
        if (!m.requires) m.requires = [];
        eng.all.set(m.id, m);
        (this.jobs || (this.jobs = [])).push(m);
      };
      const d = this.data;
      const races = d.races || [];
      COURSES.forEach((c, i) => {
        const info = races[i] || {};
        const rivals = (info.rivals || DEFAULT_RIVALS[i % 2]).slice(0, 3).map((r, k) => ({ name: r.name || r, car: r.car || ['vireo', 'drifter', 'ironclad'][k], skill: 0.85 + i * 0.03 + k * 0.03, color: r.color }));
        const placeId = c.id + '_start';
        this.game.places.add(placeId, { name: (info.name || c.name) + ' (race)', x: c.start.x, z: c.start.z, yaw: c.start.yaw, kind: 'street' });
        const talk = (info.lines || info.trashTalk || []).slice(0, 4).map((l) => (Array.isArray(l) ? l : ['caption', l]));
        addJob({
          id: c.id, title: info.name || c.name, giver: 'race', start: placeId, repeatable: true, estMinutes: 4,
          summary: 'Street race: ' + (info.name || c.name), requires: info.requires ? [].concat(info.requires) : ['m06_tick_tock'],
          reward: { money: info.prize || 1200 + i * 400 },
          steps: [
            { getIn: 'any', objective: 'Get a car for the race' },
            { goto: placeId, vehicle: true, radius: 9, objective: 'Line up at the start' },
            talk.length ? { say: talk } : { wait: 0.1 },
            { race: { checkpoints: c.cps.map(([x, z]) => ({ x, z })), rivals } },
          ],
        });
      });
      // Dex's list: find the car, bring it in.
      const list = d.carList || d.dexList || [];
      const DEFAULT_LIST = ['zephyr', 'lowrider', 'sovereign', 'drifter', 'ironclad', 'tern', 'vireo', 'bulwark', 'mesa', 'medic'];
      for (let i = 0; i < 10; i++) {
        const info = list[i] || {};
        const type = info.type || info.car || DEFAULT_LIST[i];
        const id = 'list_' + (i + 1);
        const where = ['old_market', 'downtown', 'harbor_point', 'palm_crescent', 'saltmarsh_docks', 'crestline_estates'][i % 6];
        addJob({
          id, title: info.title || 'Dex\'s list: ' + ((VH.Vehicle.typeSpec(type) || {}).name || type), giver: 'dex', start: 'dex_garage', estMinutes: 5,
          summary: info.reason || 'A buyer wants one. Undamaged.', requires: [info.requires || 'm05_the_toolbox'],
          reward: { money: info.pay || 1500 + i * 250 },
          steps: [
            { phone: 'dex', say: info.lines || [['dex', info.reason || 'Got a buyer for a ' + ((VH.Vehicle.typeSpec(type) || {}).name || type) + '. Somewhere around ' + VH.Places.titleFromId(where) + '. Not a scratch on it, Jay.']] },
            { spawnCar: 'target', type, at: where, color: info.color },
            { getIn: 'target', objective: 'Steal the ' + ((VH.Vehicle.typeSpec(type) || {}).name || type) },
            { deliver: 'target', to: 'dex_garage', maxDamage: 0.4, objective: 'Take it to Calloway Auto' },
          ],
        });
        if (i > 0) this.game.missions.all.get(id).requires.push('list_' + i);
      }
      // Bounties.
      const bounties = d.bounties || [];
      for (let i = 0; i < 8; i++) {
        const b = bounties[i] || {};
        const id = 'bounty_' + (i + 1);
        const where = b.place || ['lantern_alley', 'market_scrapyard', 'grand_parkade', 'harbor_beach', 'crane_row', 'drydock_slip', 'tannery_row', 'crestline_overlook'][i];
        addJob({
          id, title: b.name ? 'Bounty: ' + b.name : 'Bounty ' + (i + 1), giver: 'calder', start: 'heron_corner', estMinutes: 6,
          summary: b.dossier || 'Someone skipped bail. Bring them down.', requires: [b.requires || 'm13_pension'].concat(i > 0 ? ['bounty_' + i] : []),
          reward: { money: b.reward || 1000 + i * 350 },
          steps: [
            { text: 'caption', message: b.dossier || 'Target spotted near ' + VH.Places.titleFromId(where) + '. Armed. Paid on proof.' },
            { goto: where, radius: 30, objective: 'Find ' + (b.name || 'the target') },
            { spawn: [{ id: 'mark', at: where, faction: 'halberd', weapon: b.weapon || 'pistol', behavior: 'attack', health: 180, group: 'mark' }, { at: where, faction: 'halberd', weapon: 'pistol', count: 1 + (i % 3), behavior: 'guard', group: 'mark' }] },
            { kill: 'group:mark', objective: 'Take down ' + (b.name || 'the target') },
          ],
        });
      }
      // Turf wars.
      const turf = d.turf || d.turfWars || [];
      for (let i = 0; i < 5; i++) {
        const t = turf[i] || {};
        const id = 'turf_' + (i + 1);
        const where = t.place || ['lantern_alley', 'tannery_row', 'casa_palma', 'crane_row', 'grand_parkade'][i];
        const foe = t.faction || (i < 3 ? 'halberd' : 'halberd');
        addJob({
          id, title: t.name || 'Turf war: ' + VH.Places.titleFromId(where), giver: 'teo', start: where, estMinutes: 5, repeatable: false,
          summary: t.desc || 'Hold the corner.', requires: [t.requires || 'm10_sons'],
          reward: { money: t.reward || 900 + i * 300 },
          steps: [
            { say: t.lines || [['teo', 'They\'re coming for the corner. Hold it with us.']] },
            { survive: 75 + i * 10, objective: 'Hold the corner', waves: [
              { at: where, count: 3, weapon: 'pistol', faction: foe, delay: 2 },
              { at: where, count: 3, weapon: 'smg', faction: foe, delay: 25 },
              { at: where, count: 4, weapon: i > 2 ? 'rifle' : 'smg', faction: foe, delay: 50 },
            ] },
          ],
        });
      }
    }

    // ------------------------------------------------------------ ramps
    _buildJumps() {
      const g = this.game;
      const ph = g.physics;
      const mat = new THREE.MeshStandardMaterial({ map: Activities._chevrons(), roughness: 0.7, metalness: 0.1 });
      const side = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.8 });
      this.ramps = [];
      for (const j of JUMPS) {
        const L = 9;
        const W = 5;
        const H = 2.1;
        const y0 = ph.groundHeight(j.x, j.z, 50);
        // Wedge rising along the run-up direction (local +Z).
        const shape = new THREE.Shape();
        shape.moveTo(-L / 2, 0);
        shape.lineTo(L / 2, 0);
        shape.lineTo(L / 2, H);
        shape.lineTo(-L / 2, 0);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
        geo.translate(0, 0, -W / 2);
        geo.rotateY(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, [side, mat]);
        mesh.position.set(j.x, y0, j.z);
        mesh.rotation.y = j.yaw;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = 'stunt ramp ' + j.name;
        g.scene.add(mesh);
        ph.addRamp(j.x, j.z, W / 2, L / 2, j.yaw, y0 - 0.2, y0, y0 + H, 'ramp');
        this.ramps.push({ j, top: { x: j.x + Math.sin(j.yaw) * L / 2, z: j.z + Math.cos(j.yaw) * L / 2 }, y: y0 + H });
      }
      VH.events.on('vehicle:land', (e) => this._onLand(e));
    }

    static _chevrons() {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = '#1b1d22';
      x.fillRect(0, 0, 128, 128);
      x.fillStyle = '#f2b62e';
      for (let i = -2; i < 6; i++) {
        x.beginPath();
        x.moveTo(i * 32, 128);
        x.lineTo(i * 32 + 16, 128);
        x.lineTo(i * 32 + 16 + 64, 0);
        x.lineTo(i * 32 + 64, 0);
        x.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(0.2, 0.2);
      return t;
    }

    _checkTakeoff() {
      const v = this.game.player.vehicle;
      if (!v || this._jump) return;
      if (v.grounded || v.speed < 16) return;
      for (const r of this.ramps) {
        if (Math.hypot(v.pos.x - r.top.x, v.pos.z - r.top.z) < 6 && v.pos.y > r.y - 1.2) {
          this._jump = { r, start: { x: v.pos.x, z: v.pos.z }, t: this.game.time };
          this.game.slowmo(0.9, 0.35);
          return;
        }
      }
    }

    _onLand(e) {
      const v = e.v;
      if (v !== this.game.player.vehicle || !this._jump) return;
      const J = this._jump;
      this._jump = null;
      const dist = Math.hypot(v.pos.x - J.start.x, v.pos.z - J.start.z);
      const stats = this.game.player.stats;
      stats.longestJump = Math.max(stats.longestJump || 0, dist);
      if (e.airTime < 0.9 || dist < 18) {
        this.game.hud.popScore('JUMP ' + Math.round(dist) + ' M');
        return;
      }
      const first = !this.jumpsDone[J.r.j.name];
      this.jumpsDone[J.r.j.name] = true;
      const money = first ? 500 : 50;
      this.game.hud.centerBanner(first ? 'STUNT JUMP' : 'NICE JUMP', J.r.j.name + ' · ' + Math.round(dist) + ' m · ' + e.airTime.toFixed(1) + ' s');
      this.game.giveMoney(money, 'stunt');
      if (first) this.game.hud.notify({ title: 'Stunt jumps', text: Object.keys(this.jumpsDone).length + ' of ' + this.ramps.length + ' cleared.', icon: '★' });
    }

    // --------------------------------------------------------- lanterns
    _buildLanterns() {
      const g = this.game;
      const rnd = rngFrom('lanterns');
      const spots = [];
      // Alleys, park corners, the pier, the boardwalk, the docks, the estates.
      for (const b of g.layout.blocks) {
        if (b.alley && spots.length < 14) spots.push({ x: (b.alley.minX + b.alley.maxX) / 2 + (rnd() - 0.5) * 20, z: (b.alley.minZ + b.alley.maxZ) / 2 + (rnd() - 0.5) * 4 });
      }
      const more = [[480, 5.5], [560, -5.5], [412, -250], [412, 200], [150, 525], [360, 440], [60, 615], [-600, -150], [-450, 200], [-560, 350], [-51, 30], [-160, 60], [250, 610], [-300, 520], [100, -500], [-500, -500]];
      for (const [x, z] of more) spots.push({ x, z });
      this.lanterns = [];
      const geo = new THREE.SphereGeometry(0.28, 12, 10).scale(1, 1.25, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0x8a1010, emissive: new THREE.Color(2.4, 0.35, 0.12), roughness: 0.6 });
      spots.slice(0, 30).forEach((s, i) => {
        const y = g.physics.groundHeight(s.x, s.z, 40) + 1.1;
        const m = new THREE.Mesh(geo, mat);
        m.position.set(s.x, y, s.z);
        m.name = 'lantern ' + i;
        g.scene.add(m);
        this.lanterns.push({ id: 'lantern_' + i, m, x: s.x, y, z: s.z });
      });
    }

    // ------------------------------------------------------------ taxi
    _taxiUpdate(dt) {
      const g = this.game;
      const p = g.player;
      const v = p.vehicle;
      const T = this.taxi;
      const inCab = v && (v.type === 'cab');
      if (inCab && g.input.consume('phone') && !g.missions.run) {
        T.on = !T.on;
        g.hud.showToast(T.on ? 'Taxi: on duty' : 'Taxi: off duty');
        if (!T.on) this._endFare(false);
      }
      if (!inCab || !T.on) {
        if (T.fare && (!v || v.type !== 'cab')) this._endFare(false, 'You left the cab.');
        return;
      }
      if (!T.fare) this._newFare();
      const f = T.fare;
      if (!f) return;
      f.t -= dt;
      if (f.stage === 'pickup') {
        g.hud.trackObjective({ x: f.from.x, y: 0.2, z: f.from.z }, g.renderer.camera);
        g.hud.setObjectiveText('Pick up the fare');
        if (Math.hypot(v.pos.x - f.from.x, v.pos.z - f.from.z) < 7 && v.speed < 2) {
          f.stage = 'ride';
          f.t = f.time;
          if (f.agent) f.agent.hidden = true;
          if (g.audio.carDoor) g.audio.carDoor(false, 0);
          g.dialogue.play(f.lines, { mode: 'ambient' });
        }
      } else {
        g.hud.trackObjective({ x: f.to.x, y: 0.2, z: f.to.z }, g.renderer.camera);
        g.hud.setObjectiveText('Drive the fare to ' + f.toName);
        g.hud.setMissionTimer(Math.max(0, f.t));
        if (Math.hypot(v.pos.x - f.to.x, v.pos.z - f.to.z) < 8 && v.speed < 2) {
          const base = 18 + Math.round(f.dist * 0.07);
          const tip = f.t > 0 ? Math.round(f.t * 1.2) : 0;
          g.giveMoney(base + tip, 'fare');
          T.done++;
          T.earned += base + tip;
          g.hud.popScore('FARE ' + T.done, base + tip);
          if (g.audio.cash) g.audio.cash();
          this._endFare(true);
        } else if (f.t <= 0 && !f.late) {
          f.late = true;
          g.dialogue.play([[f.who, 'Forget the tip, man.']], { mode: 'ambient' });
        }
      }
    }

    _newFare() {
      const g = this.game;
      const p = g.player.pos;
      const vig = this.data.taxi || [];
      let best = null;
      for (let i = 0; i < 20 && !best; i++) {
        const b = g.layout.blocks[Math.floor(Math.random() * g.layout.blocks.length)];
        const c = Math.floor(Math.random() * 4);
        const x = c === 0 || c === 3 ? b.minX + 2 : b.maxX - 2;
        const z = c === 0 || c === 1 ? b.minZ + 2 : b.maxZ - 2;
        const d = Math.hypot(x - p.x, z - p.z);
        if (d > 80 && d < 260) best = { x, z };
      }
      if (!best) return;
      const dests = Array.from(g.places.map.values()).filter((pl) => pl.name && Math.hypot(pl.x - best.x, pl.z - best.z) > 250 && Math.hypot(pl.x - best.x, pl.z - best.z) < 900);
      const to = dests[Math.floor(Math.random() * dests.length)];
      if (!to) return;
      const who = 'passenger';
      const v = vig.length ? vig[Math.floor(Math.random() * vig.length)] : null;
      const lines = v ? (v.lines || v).map((l) => (Array.isArray(l) ? [l[0] === 'jay' ? 'jay' : who, l[1]] : [who, l])) : [[who, 'Just drive, yeah? I\'ve had a day.']];
      const gender = Math.random() < 0.5 ? 'female' : 'male';
      g.dialogue.cast[who] = { name: (v && v.name) || 'Fare', color: '#c9d3ff', voice: { gender, pitch: 0.9 + Math.random() * 0.3, rate: 0.95 + Math.random() * 0.15 } };
      g.dialogue._voiceMap.delete(who);
      const agent = g.crowd.spawn(best.x, best.z, { persistent: true });
      agent.brain = { update: (a) => { a.moveSpeed = 0; a.anim.handsUp = Math.sin(g.time * 3) > 0.6 ? 0.4 : 0; } };
      const dist = Math.hypot(to.x - best.x, to.z - best.z);
      this.taxi.fare = { stage: 'pickup', from: best, to, toName: to.name, dist, time: 25 + dist / 11, t: 999, who, lines, agent };
    }

    _endFare(ok, reason) {
      const g = this.game;
      const f = this.taxi.fare;
      if (!f) return;
      if (f.agent) {
        if (ok && g.player.vehicle) {
          const w = g.player.vehicle.localToWorld(-(g.player.vehicle.hx + 0.8), 0, {});
          f.agent.pos.set(w.x, f.agent.pos.y, w.z);
        }
        f.agent.hidden = false;
        f.agent.persistent = false;
        f.agent.brain = null;
      }
      this.taxi.fare = null;
      g.hud.trackObjective(null);
      g.hud.setObjectiveText(null);
      g.hud.setMissionTimer(null);
      if (!ok && reason) g.hud.showToast(reason);
    }

    // ------------------------------------------------------------ frame
    update(dt) {
      const g = this.game;
      if (!g.missions.run) this._taxiUpdate(dt);
      this._checkTakeoff();
      // Lanterns: spin, and collect by walking (or driving slowly) through them.
      const p = g.player.pos;
      for (const L of this.lanterns) {
        if (this.lanternsFound[L.id]) continue;
        L.m.rotation.y += dt * 1.5;
        L.m.position.y = L.y + Math.sin(g.time * 2 + L.x) * 0.1;
        if (Math.abs(L.x - p.x) < 1.6 && Math.abs(L.z - p.z) < 1.6 && Math.abs(L.y - 1 - p.y) < 2.2) {
          this.lanternsFound[L.id] = true;
          L.m.visible = false;
          const n = Object.keys(this.lanternsFound).length;
          g.giveMoney(n === 30 ? 5000 : 100, 'lantern');
          g.hud.notify({ title: 'Lost lantern ' + n + ' / 30', text: n === 30 ? 'Every lantern in Vicehaven is lit again.' : 'Somebody hung this for somebody.', icon: '🏮' });
          if (g.audio.pickup) g.audio.pickup();
        }
      }
    }

    reset() {
      this._endFare(false);
      this.taxi = { on: false, fare: null, done: 0, earned: 0 };
      this.jumpsDone = {};
      this.lanternsFound = {};
      for (const L of this.lanterns) L.m.visible = true;
    }

    serialize() {
      return { taxi: { done: this.taxi.done, earned: this.taxi.earned }, jumps: this.jumpsDone, lanterns: this.lanternsFound };
    }

    load(d) {
      this.reset();
      if (!d) return;
      this.taxi.done = (d.taxi && d.taxi.done) || 0;
      this.taxi.earned = (d.taxi && d.taxi.earned) || 0;
      this.jumpsDone = d.jumps || {};
      this.lanternsFound = d.lanterns || {};
      for (const L of this.lanterns) L.m.visible = !this.lanternsFound[L.id];
    }

    get completion() {
      return {
        jumps: Object.keys(this.jumpsDone).length, jumpsTotal: this.ramps.length,
        lanterns: Object.keys(this.lanternsFound).length, lanternsTotal: this.lanterns.length,
        fares: this.taxi.done,
      };
    }
  }

  Activities.COURSES = COURSES;
  Activities.JUMPS = JUMPS;
  VH.Activities = Activities;
  void clamp;
  void smoothstep;
})();
