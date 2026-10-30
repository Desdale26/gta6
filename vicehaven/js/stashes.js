/*
 * stashes.js — hidden cash stashes: forty bank bags of money tucked away
 * round Vicehaven, in alleys and back lots, up on rooftops, on the
 * construction site's top floor, on the beach by the pier, round the docks,
 * in the Crestline gardens, behind the airport hangars and out along the
 * roads out of town. Walk over one to take it. Each is there once: found,
 * it's gone for good.
 *
 * A world system (main.js WORLD_SYSTEMS). Spots are named places plus an
 * offset, nudged onto clear ground like worldpickups.js, so they never move
 * a story place. Three are up on story rooftops: the door below (E) takes
 * the stairs up, and the landing on the roof takes them back down.
 *
 * Help finding them: a bag glows gold and glitters from about sixty metres
 * off, with a faint chime that gets louder as Jay gets close. The map only
 * shows the ones that have been revealed: a Daily Hustle reward can reveal
 * one, and every ten found reveals two more. Twenty found pays a bonus, and
 * all forty a bigger one.
 *
 *   game.stashes.found / .total    how many found, how many there are
 *   game.stashes.nearest(x, z, n)  the n nearest unfound: [{ x, z, d, id, where, revealed, heat }]
 *   game.stashes.reveal(n)         mark n more unfound stashes on the map (nearest Jay first)
 *   stash:found { id, value }      (rep.js, dailies.js, achievements.js)
 */
(function () {
  'use strict';

  const VH = window.VH;
  const SEEN = 160; //      metres: bags further off than this aren't drawn
  const NEAR = 60; //       metres: the glitter and the chime start here
  const REVEAL_EVERY = 10; // every ten found reveals...
  const REVEAL_N = 2; //    ...two more on the map
  const REWARDS = { 20: 10000, 40: 50000 }; // found count → bonus
  // Cash by how hard a spot is to reach: [least, most] (rounded to $50).
  const PAY = { 1: [300, 600], 2: [600, 1000], 3: [1000, 1500] };

  // [id (saved: never rename), place, offset x, offset z, how hard (1-3), where (for the notes and the phone), options]
  // options: roof — on the place's roof (its door takes the stairs); top: h — the highest floor up to h metres
  // above the place (a terrace, a gazebo); course: [id, checkpoint] — anchored on a parkour course checkpoint.
  const SPOTS = [
    // Old Market.
    ['lantern_alley', 'lantern_alley', 3, -5, 1, 'Lantern Alley, Old Market'],
    ['fish_alley', 'tannery_fish_alley', -2, -4, 1, 'the fish alley off Tannery Row'],
    ['scrapyard', 'market_scrapyard', 1.6, 7, 1, 'the scrapyard wall, Old Market'],
    ['anchor_roof', 'anchor_rooftops', 5, 3, 3, 'a rooftop in Old Market', { roof: true }],
    ['st_brigid', 'st_brigid_church', -0.8, 7, 1, 'by the wall of St Brigid\'s Church'],
    ['loading_bay', 'tannery_loading_bay', 1.6, -8, 1, 'the tannery loading bay'],
    ['dex_garage', 'dex_garage', 4, -3, 1, 'round the side of Dex\'s garage'],
    // Downtown.
    ['civic_terrace', 'civic_plaza', -31, -44, 1, 'the terrace at Civic Plaza', { top: 3.5 }],
    ['yard_containers', 'meridian_yard', 0, 0, 2, 'on the containers at Meridian Yard', { course: ['yard_run', 3], dz: -2.4 }],
    ['yard_frame', 'meridian_yard', 0, 0, 3, 'the top floor of the Meridian Yard frame', { course: ['yard_run', 7], dx: 4, dz: 6 }],
    ['signal_roof', 'signal_office', 3, 3, 3, 'a rooftop downtown', { roof: true }],
    ['nells_yard', 'nells_yard', 2, -3, 1, 'Nell\'s Yard'],
    ['signal_alley', 'signal_alley', -2, 4, 1, 'Signal Alley'],
    ['parkade', 'grand_parkade', 6, -6, 1, 'the Grand Parkade'],
    ['tower', 'vicehaven_tower', -8, 6, 1, 'the foot of Vicehaven Tower'],
    ['vpd', 'vpd_central', 7, 4, 2, 'right under the police\'s noses'],
    // Palm Crescent.
    ['gazebo', 'founders_park', 20, -30, 1, 'the gazebo in Founders Park', { top: 1.5 }],
    ['laurel_park', 'laurel_park', 6, 8, 1, 'Laurel Park'],
    ['magnolia', 'magnolia_motel', -4, -6, 1, 'the Magnolia Motel'],
    ['repo_yard', 'pelican_repo_yard', 5, 6, 2, 'Pelican\'s repo yard'],
        // Harbor Point and the waterfront.
    ['under_pier', 'harbor_beach', 6, 27, 2, 'Harbor Beach, in the shadow of the pier'],
    ['pier_end', 'pier_end', -3, 4, 1, 'the end of Oceanview Pier'],
    ['boardwalk', 'the_boardwalk', -3, -10, 1, 'the boardwalk'],
    ['arcade_roof', 'arcade_roofs', -4, 4, 3, 'a rooftop in Harbor Point', { roof: true }],
    ['seawall', 'seawall_overlook', 3, -4, 1, 'Seawall Overlook'],
    ['starlite', 'starlite_diner', -1.5, -9, 1, 'round the side of the Starlite Diner'],
    ['last_resort', 'last_resort_bar', 9, -1.4, 1, 'along the front of the Last Resort'],
    // Saltmarsh Docks.
    ['container_maze', 'container_maze', 3, -4, 2, 'deep in the container maze'],
    ['freighter', 'freighter_berth', -4, -3, 2, 'Freighter Berth'],
    ['boatworks', 'boatworks', 4, -3, 1, 'the boatyard'],
    ['fish_market', 'fish_market', -4, -4, 1, 'the fish market'],
    ['quay_end', 'quay_end', 2, 2, 2, 'the very end of the quay'],
    // Crestline.
    ['voss_pool', 'voss_pool', 3, 6, 2, 'the gardens of the Voss estate'],
    ['horne_garden', 'horne_house', -6, 5, 2, 'the Horne garden, Crestline'],
    ['overlook', 'crestline_overlook', -3, -3, 1, 'Crestline Overlook'],
    ['pruitt_garden', 'pruitt_house', -8, 12, 2, 'the Pruitt garden, Crestline'],
    // The airport and the roads out of town.
    ['hangars', 'airport_hangars', 0, 85, 2, 'behind the airport hangars'],
    ['strip_yards', 'store_15', 0, 15, 2, 'behind the yards out on Meridian Boulevard'],
    ['motel_strip', 'store_16', -18, 5, 2, 'out the back of the motels up Grand Avenue'],
    ['northgate', 'northgate_plaza', -6, 8, 1, 'Northgate Plaza'],
  ];

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ------------------------------------------------------------- the look
  // Shared by every bag: a soft gold glow on the ground, a ring round it and
  // a glitter of sparks that rise past the bag (only drawn near Jay).
  let LOOK = null;

  function softTexture(size, stops) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const q = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [at, col] of stops) q.addColorStop(at, col);
    g.fillStyle = q;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function look() {
    if (LOOK) return LOOK;
    const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
    LOOK = {
      glowGeo: new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2),
      glowMat: new THREE.MeshBasicMaterial(Object.assign({ map: softTexture(64, [[0, 'rgba(255,214,110,0.9)'], [0.35, 'rgba(255,190,70,0.35)'], [1, 'rgba(255,170,40,0)']]), opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, add)),
      ringGeo: new THREE.RingGeometry(0.62, 0.74, 40).rotateX(-Math.PI / 2),
      ringMat: new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(2.2, 1.55, 0.45), opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }, add)),
      sparkMat: new THREE.PointsMaterial(Object.assign({ map: softTexture(32, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,236,170,0.85)'], [1, 'rgba(255,200,80,0)']]), color: new THREE.Color(2.0, 1.6, 0.7), size: 0.16, sizeAttenuation: true, opacity: 0.9 }, add)),
      fallback: null,
    };
    return LOOK;
  }

  const SPARKS = 9;

  /** One stash's model: the bag (stuffed full), the glow, the ring and its sparks. */
  function buildModel(s) {
    const L = look();
    const grp = new THREE.Group();
    grp.name = 'stash-' + s.id;
    const spin = new THREE.Group();
    let bag = null;
    try {
      bag = VH.HoldupModels && VH.HoldupModels.cashBag ? VH.HoldupModels.cashBag() : null;
    } catch (e) {
      bag = null;
    }
    if (bag) {
      if (bag.userData.setFill) bag.userData.setFill(1);
      bag.scale.setScalar(2);
      bag.rotation.z = 0.08;
    } else {
      if (!L.fallback) L.fallback = { geo: new THREE.BoxGeometry(0.42, 0.34, 0.3), mat: new THREE.MeshStandardMaterial({ color: 0x6b5a3a, emissive: new THREE.Color(0.5, 0.35, 0.1), roughness: 0.8 }) };
      bag = new THREE.Mesh(L.fallback.geo, L.fallback.mat);
      bag.position.y = 0.17;
    }
    spin.add(bag);
    grp.add(spin);
    const glow = new THREE.Mesh(L.glowGeo, L.glowMat);
    glow.position.y = 0.04;
    glow.renderOrder = 2;
    const ring = new THREE.Mesh(L.ringGeo, L.ringMat);
    ring.position.y = 0.05;
    ring.renderOrder = 3;
    grp.add(glow, ring);
    // The glitter: a few sparks, each with its own phase, that rise and wrap.
    const pos = new Float32Array(SPARKS * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sparks = new THREE.Points(geo, L.sparkMat);
    sparks.frustumCulled = false;
    sparks.visible = false;
    sparks.renderOrder = 4;
    grp.add(sparks);
    const phase = [];
    let h = hashString(s.id);
    for (let i = 0; i < SPARKS; i++) {
      h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
      phase.push({ a: (h % 628) / 100, r: 0.25 + ((h >>> 10) % 50) / 100, t: ((h >>> 4) % 100) / 100, v: 0.35 + ((h >>> 20) % 40) / 100 });
    }
    grp.position.set(s.x, s.y, s.z);
    grp.visible = false;
    return { grp, spin, ring, glow, sparks, pos, phase };
  }

  /** A faint glint of a chime: two or three high bell notes (audio.js tones). */
  function chime(a, gain, pan) {
    if (!a || !a.ready || !a._tone || !a.ctx) return;
    const t = a.ctx.currentTime + 0.01;
    const notes = [2093, 2637, 3136, 3520, 3951];
    const k = Math.floor(Math.random() * 3);
    for (let i = 0; i < 3; i++) {
      const f = notes[(k + i * 2) % notes.length];
      a._tone({ t: t + i * 0.085, freq: f, wave: 'sine', peak: 0.045 * gain, attack: 0.004, decay: 0.5, bus: a.sfx, pan });
      a._tone({ t: t + i * 0.085, freq: f * 2.01, wave: 'sine', peak: 0.012 * gain, attack: 0.003, decay: 0.25, bus: a.sfx, pan });
    }
  }

  // ================================================================ system
  class Stashes {
    constructor(game) {
      this.game = game;
      this.saveKey = 'stashes';
      this.list = [];
      this.found = 0;
      this.total = 0;
      this.cash = 0; //       taken from stashes (this save)
      this.hinted = false; // the first-glint tip has been shown
      this._t = 0;
      this._time = 0;
      this._chimeT = 2;
      this._near = []; //    stashes drawn right now
      this._pops = []; //    bags flying up as they're taken
      this._stairs = null; // a fade to or from a roof under way
      this.ok = !!(game.places && game.physics && game.scene);
      if (!this.ok) return;
      this._place();
      this.total = this.list.length;
      for (const s of this.list) {
        s.view = buildModel(s);
        game.scene.add(s.view.grp);
      }
      this._roofAccess();
    }

    /** Find each spot's floor (clear of walls and props) and work out what it pays. */
    _place() {
      const g = this.game;
      const ph = g.physics;
      for (const [id, place, ox, oz, tier, where, o] of SPOTS) {
        const opt = o || {};
        let x;
        let z;
        let y;
        let fixed = false; // a raised floor: stay on it while nudging
        let pl = null;
        if (opt.course) {
          const c = g.world && g.world.courses && g.world.courses[opt.course[0]];
          const cp = c && c.checkpoints[opt.course[1]];
          if (!cp) continue;
          x = cp.x + (opt.dx || 0);
          z = cp.z + (opt.dz || 0);
          y = ph.groundHeight(x, z, cp.surfaceY + 1);
          fixed = true;
        } else {
          pl = g.places.get(place);
          if (!pl) continue;
          x = pl.x + ox;
          z = pl.z + oz;
          if (opt.roof) {
            if (!pl.roof || !pl.door || pl.y === undefined) continue;
            y = ph.groundHeight(x, z, pl.y + 2);
            fixed = true;
          } else if (opt.top) {
            y = ph.groundHeight(x, z, (pl.y || 0) + opt.top);
            fixed = true;
          } else y = ph.groundHeight(x, z, (pl.y || 0) + 2);
        }
        // A spiral out from the spot until there's room for the bag.
        const bx = x;
        const bz = z;
        const base = y;
        const bad = () => ph.overlaps(x, z, 0.5, y + 0.2, y + 1.6) || (fixed && Math.abs(y - base) > 0.4);
        for (let i = 0; i < 30 && bad(); i++) {
          const a = i * 2.4;
          const r = 0.8 + i * 0.3;
          x = bx + Math.cos(a) * r;
          z = bz + Math.sin(a) * r;
          y = ph.groundHeight(x, z, base + (fixed ? 0.6 : 2));
        }
        if (bad()) {
          x = bx;
          z = bz;
          y = base;
        }
        if (y < -2) continue; // in the water: no good
        const [lo, hi] = PAY[tier] || PAY[1];
        const value = Math.round((lo + (hashString(id + ':stash') % (hi - lo + 1))) / 50) * 50;
        this.list.push({ id, x, y, z, tier, value, where, roof: !!opt.roof, place: pl, found: false, revealed: false });
      }
    }

    /**
     * The stairs to the rooftop stashes: E at the building's door goes up
     * (while the stash up there is still to find), E on the roof comes down.
     * Not while a story job is on: those take Jay up and down themselves.
     */
    _roofAccess() {
      const g = this.game;
      if (!g.interaction) return;
      this._doors = [];
      for (const s of this.list) {
        if (!s.roof) continue;
        const pl = s.place;
        const d = pl.door;
        const gy = g.physics.groundHeight(d.x, d.z, 3);
        const up = { id: 'stash_up_' + s.id, kind: 'stashStairs', x: d.x, y: gy + 1, z: d.z, radius: 2.2, label: 'Take the stairs to the roof', to: { x: pl.x, z: pl.z, y: pl.y, yaw: d.yaw || 0 }, stash: s, up: true };
        const down = { id: 'stash_down_' + s.id, kind: 'stashStairs', x: pl.x, y: pl.y + 1, z: pl.z, radius: 2.2, label: 'Take the stairs down', to: { x: d.x, z: d.z, y: gy, yaw: (d.yaw || 0) + Math.PI }, stash: s, up: false };
        for (const it of [up, down]) {
          g.interaction.register(it);
          this._doors.push(g.interaction.items[g.interaction.items.length - 1]); // register() keeps its own copy
        }
      }
      g.interaction.on('stashStairs', (item) => {
        this._takeStairs(item);
        return 1.5;
      });
    }

    _takeStairs(item) {
      const g = this.game;
      if (this._stairs || (g.missions && g.missions.run) || g.player.inVehicle) return;
      if (g.hud.setFade) g.hud.setFade(1, 350);
      this._stairs = { t: 0.45, to: item.to, up: item.up };
    }

    _stairsStep(dt) {
      const st = this._stairs;
      st.t -= dt;
      if (st.t > 0) return;
      const g = this.game;
      this._stairs = null;
      g.player.teleport(st.to.x, st.to.z, st.to.yaw, st.to.y);
      if (g.cameraRig && g.cameraRig.snapBehind) g.cameraRig.snapBehind(g.player);
      if (g.hud.setFade) g.hud.setFade(0, 600);
      if (st.up) g.hud.showToast('Press ' + g.input.labelFor('interact') + ' here to take the stairs back down');
    }

    // ---------------------------------------------------------- finding
    _find(s) {
      const g = this.game;
      if (s.found) return;
      s.found = true;
      s.revealed = false;
      this.found++;
      const rep = g.rep;
      const mult = rep && rep.perk ? rep.perk('stash') || 1 : 1;
      const value = Math.round((s.value * mult) / 10) * 10;
      this.cash += value;
      g.giveMoney(value, 'stash');
      g.hud.popScore('CASH STASH', value);
      const au = g.audio;
      if (au.bagGrab) au.bagGrab();
      else if (au.cash) au.cash();
      // The bag jumps up, spins and vanishes.
      const v = s.view;
      v.ring.visible = false;
      v.glow.visible = false;
      v.sparks.visible = false;
      this._pops.push({ s, t: 0 });
      VH.events.emit('stash:found', { id: s.id, value });
      this._afterFind();
    }

    /** Notes and rewards as the count goes up. */
    _afterFind() {
      const g = this.game;
      const n = this.found;
      const N = this.total;
      const left = N - n;
      const lines = [];
      let revealed = 0;
      if (n % REVEAL_EVERY === 0 && left > 0) revealed = this.reveal(REVEAL_N);
      if (revealed) lines.push((revealed === 1 ? 'Another stash is' : revealed + ' more stashes are') + ' marked on your map.');
      const bonus = REWARDS[n] || (n === N && N < 40 ? REWARDS[40] : 0);
      if (bonus) {
        g.giveMoney(bonus, 'stash');
        const all = n >= N;
        const title = all ? 'Every Last Note' : 'Stash Hunter';
        const sub = all ? 'All ' + N + ' hidden cash stashes found' : n + ' of ' + N + ' hidden cash stashes found';
        const rep = g.rep;
        if (rep && rep.banner) rep.banner({ kicker: 'CASH STASHES', title, big: '+' + VH.util.formatMoney(bonus), sub, lines, tone: 'daily', sound: 'streak' });
        else {
          g.hud.centerBanner(title, sub + '  +' + VH.util.formatMoney(bonus));
          if (g.audio.success) g.audio.success('gold');
        }
        return;
      }
      if (n === 1) {
        g.hud.notify({ title: 'Stashes ' + n + '/' + N, text: N + ' bags of cash are hidden round Vicehaven. Look for the gold glow and listen for the glint. Every ten you find marks two more on your map.', icon: '💰', duration: 8000 });
      } else if (n % 5 === 0 || revealed) {
        const more = REWARDS[20] && n < 20 ? ' Find 20 for a ' + VH.util.formatMoney(REWARDS[20]) + ' bonus.' : left > 0 ? ' ' + left + ' to go.' : '';
        g.hud.notify({ title: 'Stashes ' + n + '/' + N, text: (lines.length ? lines.join(' ') : 'Nice find.') + more, icon: '💰', duration: 6000 });
      }
    }

    /**
     * Mark `n` more unfound stashes on the map, the nearest to Jay first.
     * Quiet: whoever asked says so (dailies.js puts it in its reward note).
     * Returns how many it marked.
     */
    reveal(n) {
      if (!this.ok) return 0;
      const p = this.game.player.pos;
      const pool = this.list.filter((s) => !s.found && !s.revealed);
      pool.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
      const k = Math.max(0, Math.min(pool.length, Math.floor(n === undefined ? 1 : n)));
      for (let i = 0; i < k; i++) pool[i].revealed = true;
      return k;
    }

    /** The n nearest unfound stashes to (x, z): [{ x, z, d, id, where, revealed, heat }]. */
    nearest(x, z, n) {
      const out = [];
      for (const s of this.list) {
        if (s.found) continue;
        const d = Math.hypot(s.x - x, s.z - z);
        out.push({ x: s.x, z: s.z, d, id: s.id, where: s.where, revealed: s.revealed, heat: d < NEAR ? 'hot' : d < 200 ? 'warm' : 'cold' });
      }
      out.sort((a, b) => a.d - b.d);
      return out.slice(0, n === undefined ? 1 : n);
    }

    // ---------------------------------------------------------- per frame
    update(dt) {
      if (!this.ok) return;
      const g = this.game;
      if (this._stairs) this._stairsStep(dt);
      this._time += dt;
      const P = g.player;
      const p = P.pos;
      // Which bags are drawn, and the stairs, a few times a second.
      this._t -= dt;
      if (this._t <= 0) {
        this._t = 0.25;
        this._near.length = 0;
        for (const s of this.list) {
          const show = !s.found && Math.abs(s.x - p.x) < SEEN && Math.abs(s.z - p.z) < SEEN && Math.hypot(s.x - p.x, s.z - p.z) < SEEN;
          if (!s.popping) s.view.grp.visible = show;
          if (show) this._near.push(s);
        }
        if (this._doors) {
          const busy = !!(g.missions && g.missions.run);
          for (const it of this._doors) it.enabled = !busy && (!it.up || !it.stash.found);
        }
      }
      // Animate the near ones, take the one Jay's standing on, chime for the closest.
      const L = LOOK;
      const t = this._time;
      if (L) {
        L.ringMat.opacity = 0.45 + 0.25 * Math.sin(t * 3.1);
        L.glowMat.opacity = 0.45 + 0.15 * Math.sin(t * 2.3 + 1);
      }
      let reach = 1.3;
      let base = p;
      // Not while a timed course (challenges.js) is on: the bag waits for Jay to come back.
      let can = P.state !== 'dead' && !P.noclip && !(g.challenges && g.challenges.active);
      if (P.inVehicle) {
        const v = P.vehicle;
        if (!v || v.kind !== 'car' || Math.abs(v.speed || 0) > 10) can = false;
        else {
          reach = 2.4;
          base = v.pos;
        }
      }
      let best = null;
      let bestD = Infinity;
      for (let i = 0; i < this._near.length; i++) {
        const s = this._near[i];
        if (s.found) continue;
        const v = s.view;
        const d = Math.hypot(s.x - p.x, s.z - p.z);
        v.spin.rotation.y = t * 1.2 + s.x;
        v.spin.position.y = 0.12 + Math.sin(t * 2 + s.z) * 0.06;
        const glitter = d < NEAR;
        v.sparks.visible = glitter;
        if (glitter) this._glitter(v, t);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
        if (can && Math.hypot(s.x - base.x, s.z - base.z) < reach && Math.abs(base.y - s.y) < 1.6) this._find(s);
      }
      this._pop(dt);
      this._cue(dt, best, bestD);
    }

    /** Move one bag's sparks: up through the glow, round the bag, and back to the ground. */
    _glitter(v, t) {
      const pos = v.pos;
      for (let i = 0; i < SPARKS; i++) {
        const ph = v.phase[i];
        const k = (ph.t + t * ph.v * 0.5) % 1;
        const a = ph.a + t * 0.6;
        const r = ph.r * (1 - k * 0.5);
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = 0.1 + k * 1.5;
        pos[i * 3 + 2] = Math.sin(a) * r;
      }
      v.sparks.geometry.attributes.position.needsUpdate = true;
    }

    /** Bags being taken: up, a spin, gone. */
    _pop(dt) {
      for (let i = this._pops.length - 1; i >= 0; i--) {
        const q = this._pops[i];
        const v = q.s.view;
        q.t += dt;
        q.s.popping = true;
        const k = Math.min(1, q.t / 0.45);
        v.spin.position.y = 0.12 + k * 1.1;
        v.spin.rotation.y += dt * 14;
        v.spin.scale.setScalar(Math.max(0.001, k < 0.3 ? 1 + k : 1.3 * (1 - (k - 0.3) / 0.7)));
        if (k >= 1) {
          v.grp.visible = false;
          v.spin.scale.setScalar(1);
          q.s.popping = false;
          this._pops.splice(i, 1);
        }
      }
    }

    /** The chime (and the first-time tip) when a stash is near. */
    _cue(dt, s, d) {
      const g = this.game;
      if (!s || d > NEAR || (g.missions && g.missions.run) || document.body.classList.contains('cutscene')) return;
      if (!this.hinted && d < 30 && this.found === 0) {
        this.hinted = true;
        g.hud.notify({ title: 'Something glinting', text: 'There\'s a bag of cash hidden somewhere near here. Look for the gold glow.', icon: '💰', duration: 6000 });
      }
      this._chimeT -= dt;
      if (this._chimeT > 0) return;
      const k = 1 - d / NEAR; // 0 at the edge, 1 on top of it
      this._chimeT = 4.5 - 2.5 * k + Math.random() * 0.8;
      const P = g.player;
      const dx = s.x - P.pos.x;
      const dz = s.z - P.pos.z;
      const n = Math.max(0.01, Math.hypot(dx, dz));
      const pan = Math.max(-0.8, Math.min(0.8, (-dx * Math.cos(P.heading) + dz * Math.sin(P.heading)) / n));
      chime(g.audio, 0.25 + 0.75 * k * k, pan);
    }

    // ---------------------------------------------------------- contract
    blips(out) {
      if (!this.ok) return;
      for (const s of this.list) {
        if (s.found || !s.revealed) continue;
        out.push({ x: s.x, z: s.z, type: 'stash', label: 'Cash stash · ' + s.where, noRim: true });
      }
    }

    stats() {
      if (!this.ok) return [];
      return [['Cash stashes found', this.found + ' / ' + this.total], ['Cash from stashes', VH.util.formatMoney(this.cash)]];
    }

    serialize() {
      return {
        found: this.list.filter((s) => s.found).map((s) => s.id),
        revealed: this.list.filter((s) => s.revealed && !s.found).map((s) => s.id),
        cash: this.cash,
        hinted: this.hinted,
      };
    }

    load(d) {
      if (!this.ok) return;
      this.reset();
      d = d || {};
      const found = new Set(d.found || []);
      const revealed = new Set(d.revealed || []);
      for (const s of this.list) {
        s.found = found.has(s.id);
        s.revealed = !s.found && revealed.has(s.id);
        if (s.found) s.view.grp.visible = false;
      }
      this.found = this.list.filter((s) => s.found).length;
      this.cash = d.cash || 0;
      this.hinted = !!d.hinted;
    }

    reset() {
      if (!this.ok) return;
      this._clear();
      for (const s of this.list) {
        s.found = false;
        s.revealed = false;
        const v = s.view;
        v.ring.visible = true;
        v.glow.visible = true;
        v.grp.visible = false;
      }
      this.found = 0;
      this.cash = 0;
      this.hinted = false;
      this._t = 0;
      this._chimeT = 2;
    }

    _clear() {
      for (const q of this._pops) {
        q.s.popping = false;
        q.s.view.spin.scale.setScalar(1);
        q.s.view.grp.visible = false;
      }
      this._pops.length = 0;
      this._near.length = 0;
      if (this._stairs) {
        this._stairs = null;
        if (this.game.hud.setFade) this.game.hud.setFade(0, 0);
      }
    }

    stop() {
      if (this.ok) this._clear();
    }
  }

  VH.Stashes = Stashes;
})();
