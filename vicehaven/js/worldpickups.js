/*
 * worldpickups.js — weapons, ammo, body armour and first-aid kits left
 * round the city: in alleys, on rooftops, at the docks, in the army base.
 * Walk (or drive slowly) over one to take it; it comes back a few minutes
 * of play later. Some only turn up once the story has got that far (the
 * same jobs that put a gun in the shops), so nothing appears too early.
 *
 * A world system (main.js WORLD_SYSTEMS). Spots are named places plus an
 * offset (built after every place has been resolved, so they never move a
 * story place), nudged onto clear ground. The pickups themselves are
 * combat.js Pickups; this keeps their timers (in play time, saved) and
 * shows the near ones on the radar.
 */
(function () {
  'use strict';

  const VH = window.VH;

  // [place, offset x, offset z, kind, weapon (or null), amount, respawn seconds, story job needed]
  const SPOTS = [
    // First aid near the hospital, the plazas, the parks and the beach.
    ['mercy_general', 4, 3, 'health', null, 60, 90, null],
    ['civic_plaza', -10, 8, 'health', null, 50, 90, null],
    ['founders_park', 6, -6, 'health', null, 50, 90, null],
    ['the_boardwalk', 0, 4, 'health', null, 50, 90, null],
    ['laurel_park', -4, 5, 'health', null, 50, 120, null],
    ['northgate_plaza', 6, 4, 'health', null, 50, 120, null],
    ['airport_terminal', -8, 6, 'health', null, 50, 120, null],
    // Body armour.
    ['meridian_yard', 4, -4, 'armor', null, 50, 180, null],
    ['lantern_alley', 2, 1, 'armor', null, 100, 180, 'turf_1'], // the Kings' noodle cart
    ['kostas_salvage', -3, 3, 'armor', null, 100, 180, 'm20_overwatch'],
    ['fort_motor_pool', 8, -12, 'armor', null, 100, 180, null],
    ['halberd_depot', 3, -3, 'armor', null, 50, 240, 'm10_sons'],
    // Weapons (a weapon Jay already has gives its ammo instead).
    ['tannery_fish_alley', 1, 2, 'weapon', 'knife', 0, 300, null],
    ['heron_corner', -3, 4, 'weapon', 'bat', 0, 300, null],
    ['crestline_overlook', 4, 2, 'weapon', 'golfclub', 0, 300, null],
    ['nells_yard', 2, -2, 'weapon', 'crowbar', 0, 300, null],
    ['market_scrapyard', 3, 2, 'weapon', 'pistol', undefined, 300, 'm02_what_she_left'],
    ['tannery_row', -2, 2, 'weapon', 'smg', undefined, 300, 'm07_signal_fire'],
    ['the_quay', 4, -2, 'weapon', 'shotgun', undefined, 300, 'm10_sons'],
    ['seawall_overlook', -3, 2, 'weapon', 'revolver', undefined, 300, 'm13_pension'],
    ['meridian_yard', -6, 6, 'weapon', 'rifle', undefined, 300, 'm17_canary'],
    ['anchor_rooftops', 1, 1, 'weapon', 'sniper', undefined, 300, 'm20_overwatch'],
    ['harbor_beach', 2, -3, 'weapon', 'molotov', 2, 300, 'm23_ashes'],
    ['container_maze', 2, 3, 'weapon', 'grenade', 2, 300, 'm25_iron'],
    ['fort_motor_pool', -6, 10, 'weapon', 'rpg', undefined, 600, null], // a prize, if you can get in and out
    ['fort_helipad', -10, 4, 'weapon', 'lmg', undefined, 600, null],
    ['airport_hangars', 6, 4, 'weapon', 'taser', undefined, 300, 'm03_ten_and_two'],
    ['drydock_slip', 3, 3, 'weapon', 'sawnoff', undefined, 300, 'm07_signal_fire'],
    // Ammo in the alleys and back lots.
    ['signal_alley', 1, -2, 'ammo', 'pistol', 30, 240, 'm03_ten_and_two'],
    ['pruitt_lower_lot', -2, 2, 'ammo', 'pistol', 30, 240, 'm03_ten_and_two'],
    ['tannery_loading_bay', 2, 1, 'ammo', 'smg', 64, 240, 'm07_signal_fire'],
    ['crane_row', -3, 2, 'ammo', 'shotgun', 12, 240, 'm10_sons'],
    ['freighter_berth', 2, 3, 'ammo', 'rifle', 60, 240, 'm17_canary'],
    ['parkade_ramp', 2, 2, 'ammo', 'sniper', 10, 300, 'm20_overwatch'],
    ['fort_airstrip', -8, 6, 'ammo', 'rifle', 90, 240, null],
  ];

  class WorldPickups {
    constructor(game) {
      this.game = game;
      this.saveKey = 'worldPickups';
      this.until = {}; // spot id → playTime it comes back
      this.spots = [];
      this._t = 0;
      this.ok = !!(game.combat && game.places);
      if (!this.ok) return;
      this._place();
      VH.events.on('pickup:collected', (e) => {
        const p = e.p;
        if (!p || !p.wid) return;
        const s = this.spots.find((q) => q.id === p.wid);
        if (!s) return;
        this.until[s.id] = this.game.playTime + s.respawn;
        p.enabled = false;
        p.group.visible = false;
      });
    }

    /** Find each spot's ground (clear of walls and props) and lay the pickup there. */
    _place() {
      const g = this.game;
      const ph = g.physics;
      const counts = {};
      for (const [place, ox, oz, kind, weapon, amount, respawn, after] of SPOTS) {
        const pl = g.places.get(place);
        if (!pl) continue;
        if (weapon && !(VH.Data.weaponsById && VH.Data.weaponsById[weapon])) continue;
        let x = pl.x + ox;
        let z = pl.z + oz;
        let y = pl.roof && pl.y !== undefined ? pl.y : ph.groundHeight(x, z, (pl.y || 0) + 2);
        // A spiral out from the spot until there's room to stand.
        const base = y;
        for (let i = 0; i < 24 && ph.overlaps(x, z, 0.5, y + 0.2, y + 1.6); i++) {
          const a = i * 2.4;
          const r = 0.8 + i * 0.35;
          x = pl.x + ox + Math.cos(a) * r;
          z = pl.z + oz + Math.sin(a) * r;
          y = ph.groundHeight(x, z, base + 2);
        }
        const n = (counts[place] = (counts[place] || 0) + 1);
        const id = place + ':' + kind + (weapon ? ':' + weapon : '') + (n > 1 ? ':' + n : '');
        const p = g.combat.addPickup(kind, weapon, amount, x, y + 0.7, z, 1);
        p.wid = id;
        this.spots.push({ id, p, kind, weapon, respawn, after, x, z, label: this._label(kind, weapon) });
      }
    }

    _label(kind, weapon) {
      if (kind === 'health') return 'First aid';
      if (kind === 'armor') return 'Body armour';
      const w = VH.Data.weaponsById[weapon];
      if (kind === 'ammo') return 'Ammo: ' + ((VH.Data.ammoTypes[w.ammoType] || {}).name || w.name);
      return w.name;
    }

    /** Whether a spot is out: its story job done and its timer run. */
    _active(s) {
      const g = this.game;
      if (s.after && !(g.missions && g.missions.completed && g.missions.completed[s.after])) return false;
      return g.playTime >= (this.until[s.id] || 0);
    }

    update(dt) {
      if (!this.ok) return;
      this._t -= dt;
      if (this._t > 0) return;
      this._t = 0.5;
      const p = this.game.player.pos;
      for (const s of this.spots) {
        const on = this._active(s);
        const near = Math.hypot(p.x - s.x, p.z - s.z) < 160;
        s.p.enabled = on;
        s.p.hiddenT = 0;
        s.p.group.visible = on && near;
      }
    }

    blips(out) {
      if (!this.ok) return;
      const p = this.game.player.pos;
      for (const s of this.spots) {
        if (!s.p.enabled || Math.hypot(p.x - s.x, p.z - s.z) > 120) continue;
        out.push({ x: s.x, z: s.z, type: 'pickup', label: s.label, noRim: true });
      }
    }

    stats() {
      return [];
    }

    serialize() {
      const until = {};
      const now = this.game.playTime;
      for (const k of Object.keys(this.until)) if (this.until[k] > now) until[k] = Math.round(this.until[k]);
      return { until };
    }

    load(d) {
      this.until = Object.assign({}, (d && d.until) || {});
      this._t = 0;
    }

    reset() {
      this.until = {};
      this._t = 0;
    }

    stop() {}
  }

  VH.WorldPickups = WorldPickups;
})();
