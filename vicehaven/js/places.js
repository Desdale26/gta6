/*
 * places.js — named spots in the city that the story and activities use.
 *
 * Built-in places are the landmarks (Civic Plaza, the pier, the tower and
 * so on). Story places are defined as data ({ district, kind, desc }) and
 * resolved here to a real location of that kind: a building front on a
 * pavement, an alley, a car park, a rooftop, a corner, the waterfront, the
 * docks or a mansion. Each gets a sign with its name so it can be found
 * again. Resolution is deterministic (a hash of the id), so a place is
 * always in the same spot, and no two places share a building.
 *
 * A place: { id, name, x, y, z, yaw (facing into the spot), kind, district,
 *            roof: bool (reached by stairs → a fade to the top) }
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;

  const FRONT_KINDS = new Set(['garage', 'storefront', 'bank', 'diner', 'bar', 'motel', 'apartment_front', 'church', 'hospital_front', 'police_station_front', 'warehouse', 'street']);
  const DISTRICT_ALIASES = { oldmarket: 'oldmarket', old_market: 'oldmarket', downtown: 'downtown', palmcrescent: 'palmcrescent', palm_crescent: 'palmcrescent', harborpoint: 'harborpoint', harbor_point: 'harborpoint', saltmarsh_docks: 'saltmarsh', saltmarsh: 'saltmarsh', docks: 'saltmarsh', crestline_estates: 'crestline', crestline: 'crestline' };

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  class Places {
    constructor(game) {
      this.game = game;
      this.layout = game.layout;
      this.world = game.world;
      this.map = new Map();
      this.defs = {};
      this.usedLots = new Set();
      this.extra = { saltmarsh: [], crestline: [] }; // spots registered by the docks/estates builders
      this._builtins();
    }

    /** Story places: { id: { district, kind, desc, name? } } */
    define(defs) {
      Object.assign(this.defs, defs || {});
    }

    add(id, p) {
      p.id = id;
      if (p.y === undefined) p.y = this.game.physics.groundHeight(p.x, p.z, 60);
      this.map.set(id, p);
      return p;
    }

    /** Make `id` another name for `target` (story ids for built-in spots). */
    alias(id, target) {
      this.aliases = this.aliases || {};
      this.aliases[id] = target;
    }

    get(id) {
      if (!id) return null;
      if (typeof id === 'object') return id;
      if (this.aliases && this.aliases[id] && !this.map.has(id)) {
        const t = this.get(this.aliases[id]);
        if (t) this.map.set(id, t);
        return t;
      }
      let p = this.map.get(id);
      if (!p && this.defs[id]) p = this._resolve(id, this.defs[id]);
      return p || null;
    }

    has(id) {
      return this.map.has(id) || !!this.defs[id];
    }

    _builtins() {
      const L = this.layout;
      const blocks = L.blocks;
      const find = (kind) => blocks.find((b) => b.kind === kind);
      const plaza = find('plaza');
      const park = find('park');
      const tower = find('tower');
      const yard = find('construction');
      const pier = L.waterfront.pier;
      if (plaza) this.add('civic_plaza', { name: 'Civic Plaza', x: plaza.cx, z: plaza.cz + 12, yaw: Math.PI, kind: 'park', district: 'downtown' });
      if (park) this.add('founders_park', { name: 'Founders Park', x: park.cx, z: park.cz + 10, yaw: Math.PI, kind: 'park', district: 'palmcrescent' });
      if (tower) this.add('vicehaven_tower', { name: 'Vicehaven Tower', x: tower.cx + 8, z: tower.maxZ - 7.5, yaw: Math.PI, kind: 'storefront', district: 'downtown' });
      if (yard) this.add('meridian_yard', { name: 'Meridian Yard', x: yard.maxX + 3, z: yard.minZ + 15, yaw: -Math.PI / 2, kind: 'construction', district: 'downtown' });
      this.add('oceanview_pier', { name: 'Oceanview Pier', x: pier.x0 + 8, z: 0, yaw: Math.PI / 2, kind: 'pier', district: 'harborpoint' });
      this.add('pier_end', { name: 'The end of the pier', x: pier.x1 - 10, z: 0, yaw: Math.PI / 2, kind: 'pier', district: 'harborpoint' });
      this.add('the_boardwalk', { name: 'The Boardwalk', x: 410, z: -60, yaw: Math.PI / 2, kind: 'boardwalk', district: 'harborpoint' });
      this.add('grand_avenue', { name: 'Grand Avenue', x: -9, z: -150, yaw: Math.PI, kind: 'street', district: 'downtown' });
      this.add('meridian_boulevard', { name: 'Meridian Boulevard', x: 150, z: -11, yaw: Math.PI / 2, kind: 'street', district: 'harborpoint' });
      this.add('old_market', { name: 'Old Market', x: -296, z: -150, yaw: 0, kind: 'street', district: 'oldmarket' });
      this.add('palm_crescent', { name: 'Palm Crescent', x: -150, z: 250, yaw: 0, kind: 'street', district: 'palmcrescent' });
      this.add('harbor_point', { name: 'Harbor Point', x: 300, z: 150, yaw: 0, kind: 'street', district: 'harborpoint' });
      this.add('downtown', { name: 'Downtown', x: 0, z: -250, yaw: 0, kind: 'street', district: 'downtown' });
    }

    /** Places that need the city to be fully built (docks, estates, the precinct, the hospital). */
    finish() {
      // Story ids that are really the built-in docks and estates spots.
      this.alias('tidewater_lot', 'pier9_gate');
      this.alias('crane_row', 'the_quay');
      this.alias('police_station', 'vpd_central');
      this.alias('hospital', 'mercy_general');
      if (this.extra.saltmarsh.length && !this.map.has('saltmarsh_docks')) this.add('saltmarsh_docks', Object.assign({ name: 'Saltmarsh Docks' }, this.extra.saltmarsh[0]));
      if (this.extra.crestline.length && !this.map.has('crestline_estates')) this.add('crestline_estates', Object.assign({ name: 'Crestline Estates' }, this.extra.crestline[0]));
      if (!this.defs.vpd_central) this.defs.vpd_central = { district: 'downtown', kind: 'police_station_front', name: 'VPD Central Precinct' };
      if (!this.defs.mercy_general) this.defs.mercy_general = { district: 'palmcrescent', kind: 'hospital_front', name: 'St. Agnes Mercy General' };
    }

    // ---------------------------------------------------------- resolving
    _resolve(id, def) {
      const district = DISTRICT_ALIASES[def.district] || def.district || 'downtown';
      const kind = def.kind || 'street';
      const h = hashString(id);
      const name = def.name || Places.titleFromId(id);
      let p = null;
      if (district === 'saltmarsh' || district === 'crestline') {
        const list = this.extra[district].filter((s) => !s.used && (!s.kinds || s.kinds.includes(kind)));
        const pool = list.length ? list : this.extra[district].filter((s) => !s.used);
        if (pool.length) {
          const s = pool[h % pool.length];
          s.used = true;
          p = { x: s.x, z: s.z, y: s.y, yaw: s.yaw || 0, kind, district, name, roof: !!s.roof };
        }
      }
      if (!p && FRONT_KINDS.has(kind)) p = this._front(h, district, kind, name);
      if (!p && kind === 'alley') p = this._alley(h, district);
      if (!p && kind === 'parking') p = this._parking(h, district);
      if (!p && kind === 'rooftop') p = this._rooftop(h, district);
      if (!p && (kind === 'corner' || kind === 'street')) p = this._corner(h, district);
      if (!p && (kind === 'park' || kind === 'overlook')) p = this.get(h % 2 ? 'founders_park' : 'civic_plaza') && Object.assign({}, this.get(h % 2 ? 'founders_park' : 'civic_plaza'));
      if (!p && (kind === 'pier' || kind === 'beach')) p = this._waterfront(h, 'pier');
      if (!p && kind === 'boardwalk') p = this._waterfront(h, 'boardwalk');
      if (!p && kind === 'construction') p = Object.assign({}, this.get('meridian_yard'));
      if (!p && (kind === 'dock' || kind === 'warehouse' || kind === 'mansion')) p = this._front(h, district === 'crestline' ? 'palmcrescent' : 'harborpoint', kind, name);
      if (!p) p = this._corner(h, district) || { x: 0, z: 0, yaw: 0 };
      p.kind = kind;
      p.district = district;
      p.name = name;
      p.desc = def.desc;
      this.add(id, p);
      if (FRONT_KINDS.has(kind) || kind === 'rooftop') this._decorate(p, def);
      return p;
    }

    static titleFromId(id) {
      return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    _districtBlocks(district) {
      return this.layout.blocks.filter((b) => b.kind === 'buildings' && b.district.id === district);
    }

    /** A building's street front: stand on the pavement facing its door. */
    _front(h, district, kind, name) {
      let blocks = this._districtBlocks(district);
      if (!blocks.length) blocks = this.layout.blocks.filter((b) => b.kind === 'buildings');
      const lots = [];
      for (const b of blocks) {
        for (const lot of b.lots) {
          if (this.usedLots.has(lot.id)) continue;
          if (lot.kind !== 'building' || lot.interior) continue;
          const tall = lot.top || 0;
          if (kind === 'garage' || kind === 'warehouse' || kind === 'motel' || kind === 'diner' || kind === 'bar') {
            if (tall > 22) continue;
          }
          if (kind === 'bank' || kind === 'police_station_front' || kind === 'hospital_front') {
            if (tall < 10) continue;
          }
          lots.push(lot);
        }
      }
      if (!lots.length) return null;
      const lot = lots[h % lots.length];
      this.usedLots.add(lot.id);
      const f = lot.front;
      const side = f.s ? 's' : f.n ? 'n' : f.e ? 'e' : 'w';
      const out = 2.2; // onto the pavement
      let x = lot.cx;
      let z = lot.cz;
      let yaw = 0;
      if (side === 's') {
        z = lot.maxZ + out;
        yaw = Math.PI;
      } else if (side === 'n') {
        z = lot.minZ - out;
        yaw = 0;
      } else if (side === 'e') {
        x = lot.maxX + out;
        yaw = -Math.PI / 2;
      } else {
        x = lot.minX - out;
        yaw = Math.PI / 2;
      }
      return { x, z, y: KERB, yaw, lot, side, top: lot.top || 0 };
    }

    _alley(h, district) {
      const blocks = this._districtBlocks(district).filter((b) => b.alley);
      const pool = blocks.length ? blocks : this.layout.blocks.filter((b) => b.alley);
      if (!pool.length) return null;
      const b = pool[h % pool.length];
      const a = b.alley;
      return { x: (a.minX + a.maxX) / 2, z: (a.minZ + a.maxZ) / 2, y: KERB, yaw: a.axis === 'x' ? Math.PI / 2 : 0 };
    }

    _parking(h, district) {
      const lots = [];
      for (const b of this._districtBlocks(district)) for (const lot of b.lots) if (lot.kind === 'parking' && !this.usedLots.has(lot.id)) lots.push(lot);
      if (!lots.length) return null;
      const lot = lots[h % lots.length];
      this.usedLots.add(lot.id);
      return { x: lot.cx, z: lot.cz, y: KERB, yaw: 0, lot };
    }

    _rooftop(h, district) {
      const lots = [];
      for (const b of this._districtBlocks(district)) {
        for (const lot of b.lots) {
          if (lot.kind !== 'building' || this.usedLots.has(lot.id)) continue;
          if ((lot.top || 0) < 9 || (lot.top || 0) > 60) continue;
          lots.push(lot);
        }
      }
      if (!lots.length) return null;
      const lot = lots[h % lots.length];
      this.usedLots.add(lot.id);
      const top = this.game.physics.groundHeight(lot.cx, lot.cz, 400);
      const door = this._frontOf(lot);
      return { x: lot.cx, z: lot.cz, y: top, yaw: 0, roof: true, door, lot, top };
    }

    _frontOf(lot) {
      const f = lot.front;
      if (f.s) return { x: lot.cx, z: lot.maxZ + 2.2, yaw: Math.PI };
      if (f.n) return { x: lot.cx, z: lot.minZ - 2.2, yaw: 0 };
      if (f.e) return { x: lot.maxX + 2.2, z: lot.cz, yaw: -Math.PI / 2 };
      return { x: lot.minX - 2.2, z: lot.cz, yaw: Math.PI / 2 };
    }

    _corner(h, district) {
      const blocks = this._districtBlocks(district);
      const pool = blocks.length ? blocks : this.layout.blocks;
      const b = pool[h % pool.length];
      const c = (h >>> 8) % 4;
      const i = 2.2;
      const x = c === 0 || c === 3 ? b.minX + i : b.maxX - i;
      const z = c === 0 || c === 1 ? b.minZ + i : b.maxZ - i;
      return { x, z, y: KERB, yaw: 0 };
    }

    _waterfront(h, kind) {
      const pier = this.layout.waterfront.pier;
      if (kind === 'pier') {
        const spots = [{ x: pier.x0 + 30, z: 4 }, { x: pier.x0 + 70, z: -4 }, { x: pier.x1 - 30, z: 3 }, { x: pier.x1 - 12, z: 0 }];
        const s = spots[h % spots.length];
        return { x: s.x, z: s.z, yaw: Math.PI / 2 };
      }
      const z = -300 + (h % 12) * 50;
      return { x: 412, z, yaw: Math.PI / 2 };
    }

    // ----------------------------------------------------------- signage
    _decorate(p, def) {
      if (!p.lot && !p.door) return;
      const text = (def.sign || p.name || '').toUpperCase();
      if (!text) return;
      const style = def.kind === 'diner' || def.kind === 'bar' || def.kind === 'motel' ? 'neon' : def.kind === 'bank' || def.kind === 'police_station_front' || def.kind === 'hospital_front' ? 'monolith' : def.kind === 'church' ? 'plaque' : 'info';
      // On the facade above the door, facing the street.
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      const back = 2.2 - 0.12; // from the pavement spot back to the wall
      const x = p.x + fx * back;
      const z = p.z + fz * back;
      const spec = { x, y: 3.6, z, w: Math.min(7, 1.6 + text.length * 0.34), h: 1.0, yaw: p.yaw + Math.PI, lines: [text], style };
      const tex = VH.Signs.paint(spec, this.game.materials._anisotropy || 4);
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(0.6, 0.6, 0.6), roughness: 0.5, metalness: 0 });
      mat.userData.neon = style === 'neon';
      if (this.world.signMaterials) this.world.signMaterials.push(mat);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), mat);
      mesh.position.set(x - fx * 0.02, spec.y, z - fz * 0.02);
      mesh.rotation.y = spec.yaw;
      mesh.name = 'place sign ' + text;
      this.game.scene.add(mesh);
      // Garages get a roll-up door; shops a lit doorway.
      if (def.kind === 'garage' || def.kind === 'warehouse') {
        const door = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.1), Places._shutterMat());
        door.position.set(x - fx * 0.03, 1.7, z - fz * 0.03);
        door.rotation.y = spec.yaw;
        this.game.scene.add(door);
      }
      p.sign = mesh;
    }

    static _shutterMat() {
      if (Places._shutter) return Places._shutter;
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = '#6b7079';
      g.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 8) {
        g.fillStyle = y % 16 ? '#5a5f68' : '#7b818b';
        g.fillRect(0, y, 128, 5);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      Places._shutter = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
      return Places._shutter;
    }
  }

  VH.Places = Places;
})();
