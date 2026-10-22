/*
 * achievements.js — trophies for the things worth doing in Vicehaven, and
 * the 100% completion tally (pause menu → Progress).
 *
 * A world system (main.js WORLD_SYSTEMS). Achievements belong to the player,
 * not the save: they're kept in this browser across new games. Completion
 * is per save: story jobs, side stories, other jobs, stunt jumps, lanterns,
 * districts visited, properties owned, and the achievements themselves.
 *
 * Unlocking shows a banner at the top of the screen with a chime. Most are
 * checked twice a second from the game's state; some come from events.
 *
 *   game.achievements.unlock(id)      (other systems may call it)
 *   game.achievements.progress()      → { percent, cats, list }
 */
(function () {
  'use strict';

  const VH = window.VH;

  const PROFILE_KEY = 'vicehaven.achievements.v1';

  // [id, category, icon, title, how]
  const LIST = [
    ['first_job', 'Story', '🎬', 'Back in Business', 'Finish your first story job.'],
    ['story_10', 'Story', '📈', 'Making a Name', 'Finish 10 story jobs.'],
    ['story_all', 'Story', '👑', "Vicehaven's Finest", 'Finish the story.'],
    ['side_story', 'Story', '🤝', 'Side Hustle', 'Finish a job in one of the side stories.'],
    ['race_win', 'Story', '🏁', 'Street King', 'Win a street race.'],
    ['challenge_gold', 'Story', '🥇', 'Gold Standard', 'Win a gold medal in a challenge.'],
    ['first_steal', 'Driving', '🚗', 'Borrowed, Not Stolen', 'Take your first car.'],
    ['steal_25', 'Driving', '🔑', 'Joyrider', 'Take 25 cars.'],
    ['speed_200', 'Driving', '⚡', 'Speed Demon', 'Hit 200 km/h in a car.'],
    ['big_air', 'Driving', '🚀', 'Big Air', 'Stay in the air for 3 seconds in a car.'],
    ['stunt_5', 'Driving', '🎯', 'Daredevil', 'Clear 5 stunt jumps.'],
    ['stunt_all', 'Driving', '🔥', 'Fearless', 'Clear every stunt jump.'],
    ['near_miss', 'Driving', '😬', 'Close Shave', 'Make 25 near misses in traffic.'],
    ['road_trip', 'Driving', '🛣', 'Road Trip', 'Drive 50 km.'],
    ['taxi_10', 'Driving', '🚕', 'Fare Play', 'Finish 10 taxi fares.'],
    ['respray', 'Driving', '🎨', 'Fresh Coat', 'Respray a car at a spray shop.'],
    ['first_flight', 'Flying', '✈', 'Wheels Up', 'Take off in a plane.'],
    ['heli', 'Flying', '🚁', 'Rotorhead', 'Take off in a helicopter.'],
    ['jet', 'Flying', '🛩', 'Afterburner', 'Take off in the Talon jet.'],
    ['airliner', 'Flying', '🛫', 'Captain Mercer', 'Take off in the Albatross airliner.'],
    ['skydive', 'Flying', '🪂', 'Leap of Faith', 'Bail out of an aircraft in the air.'],
    ['first_star', 'Crime', '⭐', 'Wanted', 'Get a wanted level.'],
    ['five_stars', 'Crime', '🌟', 'Most Wanted', 'Reach five stars.'],
    ['evade', 'Crime', '💨', 'Getaway', 'Lose the police.'],
    ['evade_3', 'Crime', '👻', 'Ghost', 'Lose a wanted level of three stars or more.'],
    ['holdup', 'Crime', '💰', 'Hands Up', 'Hold up a corner shop.'],
    ['tank', 'Crime', '🪖', 'Heavy Metal', 'Take the tank for a drive.'],
    ['busted', 'Crime', '🚓', 'Bad Day', 'Get arrested.'],
    ['gunshop', 'Combat', '🛒', 'Shopping Spree', 'Buy something at Bayline Arms.'],
    ['headshots', 'Combat', '🎯', 'Sharpshooter', 'Land 25 headshots.'],
    ['stun', 'Combat', '⚡', 'Shocking', 'Drop someone with the Jolt stun gun.'],
    ['rocket_car', 'Combat', '🚀', 'Special Delivery', 'Blow up a car with a rocket.'],
    ['scavenger', 'Combat', '📦', 'Scavenger', 'Pick up 25 weapons, ammo, armour or first-aid kits.'],
    ['arsenal', 'Combat', '🧰', 'Arsenal', 'Carry every weapon at once.'],
    ['tourist', 'Explorer', '🗺', 'Tourist', 'Visit 6 districts.'],
    ['explorer', 'Explorer', '🧭', 'Explorer', 'Visit every district.'],
    ['pier_end', 'Explorer', '🌊', 'End of the Line', 'Walk to the end of Oceanview Pier.'],
    ['sky_high', 'Explorer', '🏙', 'On Top of the World', 'Stand on the roof of one of the tallest towers.'],
    ['lanterns_10', 'Explorer', '🏮', 'Lantern Keeper', 'Find 10 lost lanterns.'],
    ['lanterns_all', 'Explorer', '✨', 'Every Last Light', 'Find every lost lantern.'],
    ['storm', 'Explorer', '⛈', 'Singing in the Rain', 'Spend a minute out in a thunderstorm.'],
    ['dance', 'Life', '💃', 'Dance Machine', 'Finish a dance at the Velvet Tide.'],
    ['rich_100k', 'Life', '💵', 'Six Figures', 'Have $100,000.'],
    ['rich_1m', 'Life', '💎', 'Millionaire', 'Have $1,000,000.'],
    ['landlord', 'Life', '🏢', 'Landlord', 'Buy a property.'],
    ['mogul', 'Life', '🏦', 'Mogul', 'Own every property in town.'],
    ['photo', 'Life', '📷', 'Shutterbug', 'Take a picture in photo mode.'],
    ['hundred', 'Life', '🏆', 'Vicehaven 100%', 'Reach 100% completion.'],
  ].map(([id, cat, icon, title, how]) => ({ id, cat, icon, title, how }));
  const BY_ID = new Map(LIST.map((a) => [a.id, a]));

  function loadProfile() {
    try {
      const d = JSON.parse(localStorage.getItem(PROFILE_KEY));
      if (d && typeof d === 'object') return { unlocked: d.unlocked || {}, n: d.n || {} };
    } catch (e) {
      // Fall through to a fresh profile.
    }
    return { unlocked: {}, n: {} };
  }

  class Achievements {
    constructor(game) {
      this.game = game;
      this.saveKey = 'progress';
      this.profile = loadProfile();
      this.visited = new Set(); // districts seen in this save
      this.driven = 0; //         metres driven in this save
      this._t = 0;
      this._dirty = false;
      this._queue = [];
      this._later = new Set(); // earned in photo mode: awarded back in the game
      this._showing = false;
      this._maxHeat = 0;
      this._stormT = 0;
      this._buildDom();
      this._bind();
    }

    // ------------------------------------------------------------ profile
    get count() {
      return Object.keys(this.profile.unlocked).length;
    }

    has(id) {
      return !!this.profile.unlocked[id];
    }

    unlock(id) {
      const a = BY_ID.get(id);
      if (!a || this.has(id)) return false;
      const g = this.game;
      if (g.state === 'photo') this._later.add(id);
      if (g.state !== 'playing' && g.state !== 'dialog') return false;
      this.profile.unlocked[id] = new Date().toISOString().slice(0, 10);
      this._save();
      this._queue.push(a);
      this._next();
      VH.events.emit('achievement:unlocked', { id, title: a.title });
      return true;
    }

    _bump(key, by) {
      this.profile.n[key] = (this.profile.n[key] || 0) + by;
      this._dirty = true;
      return this.profile.n[key];
    }

    _save() {
      this._dirty = false;
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
      } catch (e) {
        // Private mode: they last until the tab closes.
      }
    }

    // ------------------------------------------------------------- banner
    _buildDom() {
      const el = (tag, cls, text) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
      };
      const b = el('div', 'ach-banner');
      this._bIcon = el('div', 'ach-icon');
      const text = el('div', 'ach-text');
      this._bTitle = el('div', 'ach-title');
      this._bHow = el('div', 'ach-how');
      text.append(el('div', 'ach-kicker', 'Achievement unlocked'), this._bTitle, this._bHow);
      b.append(this._bIcon, text);
      (this.game.hud && this.game.hud.root ? this.game.hud.root : document.body).append(b);
      this._banner = b;
    }

    _next() {
      if (this._showing || !this._queue.length) return;
      const a = this._queue.shift();
      this._showing = true;
      this._bIcon.textContent = a.icon;
      this._bTitle.textContent = a.title;
      this._bHow.textContent = a.how;
      this._banner.classList.add('is-on');
      this._chime();
      setTimeout(() => {
        this._banner.classList.remove('is-on');
        setTimeout(() => {
          this._showing = false;
          this._next();
        }, 450);
      }, 4200);
    }

    _chime() {
      const au = this.game.audio;
      if (!au || !au.ready || !au._tone) return;
      const t = au.ctx.currentTime;
      [659, 880, 1175].forEach((f, i) => au._tone({ t: t + i * 0.09, freq: f, wave: 'triangle', peak: 0.09, attack: 0.01, decay: 0.45 }));
    }

    // ------------------------------------------------------------- events
    _bind() {
      const g = this.game;
      const mine = (v) => v && v === g.player.vehicle;
      VH.events.on('mission:pass', (e) => {
        const m = e.m || {};
        if (m._chain) this.unlock('side_story');
        if (m.giver === 'race') this.unlock('race_win');
      });
      VH.events.on('challenge:finish', (e) => {
        if (e.medal === 'gold') this.unlock('challenge_gold');
      });
      VH.events.on('vehicle:land', (e) => {
        if (mine(e.v) && e.v.kind === 'car' && e.airTime >= 3) this.unlock('big_air');
      });
      VH.events.on('vehicle:nearMiss', (e) => {
        if (mine(e.v) && this._bump('nearMiss', 1) >= 25) this.unlock('near_miss');
      });
      VH.events.on('aircraft:takeoff', (e) => {
        const v = e.v;
        if (!v || v.driver !== 'player') return;
        if (v.kind === 'heli') this.unlock('heli');
        else this.unlock('first_flight');
        if (v.type === 'talon') this.unlock('jet');
        if (v.type === 'albatross') this.unlock('airliner');
      });
      VH.events.on('vehicle:exit', (e) => {
        if (e.air && e.v && (e.v.kind === 'plane' || e.v.kind === 'heli')) this.unlock('skydive');
      });
      VH.events.on('vehicle:enter', (e) => {
        if (e.v && e.v.kind === 'tank') this.unlock('tank');
      });
      VH.events.on('police:level', (e) => {
        if (e.level >= 1) this.unlock('first_star');
        if (e.level >= 5) this.unlock('five_stars');
        if (e.level > 0) this._maxHeat = Math.max(this._maxHeat, e.level);
        else if (e.reason !== 'evaded') this._maxHeat = 0;
      });
      VH.events.on('police:evaded', () => {
        this.unlock('evade');
        if (this._maxHeat >= 3) this.unlock('evade_3');
        this._maxHeat = 0;
      });
      VH.events.on('player:arrested', () => this.unlock('busted'));
      VH.events.on('respray:done', () => this.unlock('respray'));
      VH.events.on('property:bought', () => this.unlock('landlord'));
      VH.events.on('photo:taken', () => this.unlock('photo'));
      VH.events.on('gunshop:buy', () => this.unlock('gunshop'));
      VH.events.on('agent:stunned', (e) => {
        if (e.source === 'player') this.unlock('stun');
      });
      VH.events.on('combat:hit', (e) => {
        if (e.head && this._bump('headshots', 1) >= 25) this.unlock('headshots');
      });
      VH.events.on('combat:rocketCar', () => this.unlock('rocket_car'));
      VH.events.on('pickup:collected', () => {
        if (this._bump('pickups', 1) >= 25) this.unlock('scavenger');
      });
    }

    // ------------------------------------------------------------- update
    update(dt) {
      const g = this.game;
      if (this._later.size) {
        for (const id of this._later) this.unlock(id);
        this._later.clear();
      }
      const p = g.player;
      const v = p.inVehicle ? p.vehicle : null;
      if (v && v.kind === 'car' && !v.wrecked) {
        const d = Math.abs(v.speed) * dt;
        this.driven += d;
        if (this._bump('driven', d) >= 50000) this.unlock('road_trip');
        if (Math.abs(v.speed) * 3.6 >= 200) this.unlock('speed_200');
      }
      // Out in a storm, on foot and not under a roof.
      const w = g.weather;
      if (w && w.cur && w.cur.storm && !w.sheltered && !v) {
        this._stormT += dt;
        if (this._stormT >= 60) this.unlock('storm');
      }
      this._t -= dt;
      if (this._t > 0) return;
      this._t = 0.5;
      this._check();
      if (this._dirty) this._save();
    }

    /** The checks that read the game's state (twice a second). */
    _check() {
      const g = this.game;
      const p = g.player;
      const lay = g.layout;
      const pos = p.pos;
      const d = lay.districtAt ? lay.districtAt(pos.x, pos.z) : null;
      if (d && !this.visited.has(d.id)) {
        this.visited.add(d.id);
        this._bump('district:' + d.id, 1);
      }
      const seen = (VH.Data.districts || []).filter((x) => this.profile.n['district:' + x.id]).length;
      if (seen >= 6) this.unlock('tourist');
      if (seen >= (VH.Data.districts || []).length) this.unlock('explorer');
      const c = this._counts();
      if (c.story >= 1) this.unlock('first_job');
      if (c.story >= 10) this.unlock('story_10');
      if (c.storyTotal && c.story >= c.storyTotal) this.unlock('story_all');
      const s = p.stats;
      if (s.carsStolen >= 1) this.unlock('first_steal');
      if (s.carsStolen >= 25) this.unlock('steal_25');
      if ((s.dances || 0) >= 1) this.unlock('dance');
      if (p.money >= 100000) this.unlock('rich_100k');
      if (p.money >= 1000000) this.unlock('rich_1m');
      if (g.stores && g.stores.robbed >= 1) this.unlock('holdup');
      if (g.combat && (VH.Data.weapons || []).every((w) => g.combat.has(w.id))) this.unlock('arsenal');
      if (c.jumps >= 5) this.unlock('stunt_5');
      if (c.jumpsTotal && c.jumps >= c.jumpsTotal) this.unlock('stunt_all');
      if (c.lanterns >= 10) this.unlock('lanterns_10');
      if (c.lanternsTotal && c.lanterns >= c.lanternsTotal) this.unlock('lanterns_all');
      if (c.fares >= 10) this.unlock('taxi_10');
      if (c.propsTotal && c.props >= c.propsTotal) this.unlock('mogul');
      // The end of the pier, and the top of the skyline.
      const pier = lay.waterfront && lay.waterfront.pier;
      if (pier && pos.x > pier.x1 - 10 && pos.z > pier.z0 && pos.z < pier.z1) this.unlock('pier_end');
      const tallest = (g.world && g.world.stats && g.world.stats.tallest) || 150;
      if (!p.inVehicle && pos.y >= Math.min(150, tallest * 0.75)) this.unlock('sky_high');
      if (this.progress().percent >= 100) this.unlock('hundred');
    }

    /** Raw counts for completion and the checks. */
    _counts() {
      const g = this.game;
      const m = g.missions;
      const out = { story: 0, storyTotal: 0, side: 0, sideTotal: 0, jobs: 0, jobsTotal: 0, jumps: 0, jumpsTotal: 0, lanterns: 0, lanternsTotal: 0, fares: 0, props: 0, propsTotal: 0 };
      if (m && m.all) {
        for (const [id, def] of m.all) {
          const done = !!(m.completed && m.completed[id]);
          if (def._main) {
            out.storyTotal++;
            if (done) out.story++;
          } else if (def._chain) {
            out.sideTotal++;
            if (done) out.side++;
          } else if (def.activity && !def.repeatable) {
            out.jobsTotal++;
            if (done) out.jobs++;
          }
        }
      }
      const a = g.activities && g.activities.completion;
      if (a) Object.assign(out, { jumps: a.jumps, jumpsTotal: a.jumpsTotal, lanterns: a.lanterns, lanternsTotal: a.lanternsTotal, fares: a.fares });
      const pr = g.properties;
      if (pr && pr.list) {
        out.propsTotal = pr.list.length;
        out.props = pr.list.filter((x) => pr.owned[x.id]).length;
      }
      return out;
    }

    /** Completion, by category, and every achievement (for the Progress screen). */
    progress() {
      const c = this._counts();
      const districts = (VH.Data.districts || []).length;
      const ach = LIST.filter((a) => a.id !== 'hundred');
      const cats = [
        { label: 'Story jobs', done: c.story, total: c.storyTotal, weight: 35 },
        { label: 'Side stories', done: c.side, total: c.sideTotal, weight: 12 },
        { label: 'Races and other jobs', done: c.jobs, total: c.jobsTotal, weight: 8 },
        { label: 'Stunt jumps', done: c.jumps, total: c.jumpsTotal, weight: 7 },
        { label: 'Lost lanterns', done: c.lanterns, total: c.lanternsTotal, weight: 7 },
        { label: 'Districts visited', done: this.visited.size, total: districts, weight: 5 },
        { label: 'Properties owned', done: c.props, total: c.propsTotal, weight: 8 },
        { label: 'Achievements', done: ach.filter((a) => this.has(a.id)).length, total: ach.length, weight: 18 },
      ];
      let sum = 0;
      let wsum = 0;
      for (const k of cats) {
        if (!k.total) continue;
        sum += k.weight * Math.min(1, k.done / k.total);
        wsum += k.weight;
      }
      const percent = wsum ? Math.floor((sum / wsum) * 1000) / 10 : 0;
      return {
        percent,
        cats,
        list: LIST.map((a) => Object.assign({ unlocked: this.profile.unlocked[a.id] || null }, a)),
        unlocked: this.count,
        total: LIST.length,
      };
    }

    stats() {
      return [['Achievements', this.count + ' / ' + LIST.length], ['Distance driven', (this.driven / 1000).toFixed(1) + ' km'], ['Completion', this.progress().percent + '%']];
    }

    serialize() {
      return { visited: [...this.visited], driven: Math.round(this.driven) };
    }

    load(d) {
      this.visited = new Set((d && d.visited) || []);
      this.driven = (d && +d.driven) || 0;
      this._maxHeat = 0;
      this._stormT = 0;
    }

    /** A new game (or before loading one): this save's tallies start again; the trophies stay. */
    reset() {
      this.visited = new Set();
      this.driven = 0;
      this._maxHeat = 0;
      this._stormT = 0;
    }
  }

  Achievements.LIST = LIST;
  VH.Achievements = Achievements;
})();
