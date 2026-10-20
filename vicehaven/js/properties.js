/*
 * properties.js — businesses for sale across Vicehaven. Buy one at its
 * For Sale sign (walk up, E) and it pays out every payday: every eight
 * minutes of play, the takings from everything Jay owns land in his pocket.
 *
 * A world system (main.js WORLD_SYSTEMS). Each business takes a building
 * on a street front in its district that no story place, shop or body shop
 * is using; the sign stands on the pavement in front of it. The map shows
 * the ones for sale and the ones Jay owns.
 *
 *   game.properties.list        every business: { id, name, price, income, ... }
 *   game.properties.owned[id]   true once bought
 *   property:bought { p }       (achievements.js)
 */
(function () {
  'use strict';

  const VH = window.VH;
  const PAYDAY = 480; // seconds of play between paydays
  const SALT = 'realty-2';
  // [id, name, district, price, income per payday, what it is, colours]
  const DEFS = [
    ['lucky_lantern', 'Lucky Lantern Noodle Bar', 'oldmarket', 60000, 1600, 'Noodle bar', ['#c8102e', '#ffd27a']],
    ['pawn_loan', 'Old Market Pawn & Loan', 'oldmarket', 45000, 1200, 'Pawn shop', ['#2f6b3a', '#f2e6c4']],
    ['sunny_side', 'Sunny Side Car Wash', 'palmcrescent', 35000, 900, 'Car wash', ['#1f8fd1', '#fff27a']],
    ['neon_palms', 'Neon Palms Arcade', 'palmcrescent', 80000, 2200, 'Arcade', ['#7a2bd0', '#35e0d0']],
    ['harbor_lights', 'Harbor Lights Laundromat', 'harborpoint', 25000, 650, 'Laundromat', ['#14a3a0', '#ffffff']],
    ['tidewater_shack', 'Tidewater Seafood Shack', 'harborpoint', 55000, 1500, 'Seafood restaurant', ['#ff6a1f', '#fff1dc']],
    ['coastline_cabs', 'Coastline Cab Co.', 'downtown', 150000, 4000, 'Taxi firm', ['#f2c500', '#16181c']],
    ['meridian_suites', 'Meridian Office Suites', 'downtown', 300000, 8000, 'Office block', ['#1b2a55', '#b7c6e8']],
  ];

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ------------------------------------------------------------- the sign
  function drawSign(c, p, owned) {
    const g = c.getContext('2d');
    const W = c.width;
    const H = c.height;
    const font = (w, s) => w + ' ' + s + "px 'Bahnschrift', 'Arial Narrow', 'Segoe UI', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const money = VH.util.formatMoney;
    if (!owned) {
      g.fillStyle = '#f6f3ee';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff4f8b';
      g.fillRect(0, 0, W, 64);
      g.fillStyle = '#ffffff';
      g.font = font('700', 30);
      g.fillText('VICEHAVEN REALTY', W / 2, 34);
      g.fillStyle = '#d6224f';
      g.font = font('800', 88);
      g.fillText('FOR SALE', W / 2, 128);
      g.fillStyle = '#1b1d24';
      g.font = font('700', 30);
      g.fillText(p.name, W / 2, 196, W - 40);
      g.fillStyle = '#454a57';
      g.font = font('600', 26);
      g.fillText(money(p.price) + '  ·  pays ' + money(p.income) + ' a payday', W / 2, 244, W - 40);
      g.strokeStyle = '#ff4f8b';
      g.lineWidth = 10;
      g.strokeRect(5, 5, W - 10, H - 10);
    } else {
      const q = g.createLinearGradient(0, 0, 0, H);
      q.addColorStop(0, p.colors[0]);
      q.addColorStop(1, '#14161d');
      g.fillStyle = q;
      g.fillRect(0, 0, W, H);
      g.fillStyle = p.colors[1];
      g.font = font('800', 44);
      g.fillText(p.name, W / 2, 74, W - 40);
      g.fillStyle = '#ffffff';
      g.font = font('600', 28);
      g.fillText('Under new management', W / 2, 136);
      g.fillStyle = 'rgba(255, 255, 255, 0.75)';
      g.font = font('600', 24);
      g.fillText('Owner: Jay Mercer', W / 2, 186);
      g.fillText('Pays ' + money(p.income) + ' every payday', W / 2, 226);
      g.strokeStyle = '#ffb347';
      g.lineWidth = 10;
      g.strokeRect(5, 5, W - 10, H - 10);
    }
  }

  function buildSign(p) {
    const grp = new THREE.Group();
    grp.name = 'sale-sign-' + p.id;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 288;
    const tex = new THREE.CanvasTexture(c);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const face = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.7 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.6, metalness: 0.4 });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.07), face);
    board.position.set(0, 1.85, 0.035);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.98, 1.15, 0.06), frame);
    back.position.set(0, 1.85, 0);
    for (const x of [-0.8, 0.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.4, 0.07), frame);
      post.position.set(x, 1.2, -0.05);
      grp.add(post);
    }
    grp.add(back, board);
    grp.traverse((m) => {
      if (m.isMesh) m.castShadow = true;
    });
    grp.position.set(p.sign.x, p.sign.y, p.sign.z);
    grp.rotation.y = p.sign.yaw;
    return { grp, canvas: c, tex };
  }

  // ================================================================ system
  class Properties {
    constructor(game) {
      this.game = game;
      this.saveKey = 'properties';
      this.owned = {};
      this.earned = 0;
      this.paydayT = PAYDAY;
      this.list = this._place();
      this.ok = this.list.length > 0;
      if (!this.ok) return;
      for (const p of this.list) {
        p.view = buildSign(p);
        drawSign(p.view.canvas, p, false);
        p.view.tex.needsUpdate = true;
        game.scene.add(p.view.grp);
        game.interaction.register({ id: 'property_' + p.id, kind: 'property', propertyId: p.id, x: p.stand.x, y: p.sign.y + 1, z: p.stand.z, radius: 2.4, label: 'Buy ' + p.name, price: p.price });
        p.item = game.interaction.items[game.interaction.items.length - 1]; // register() keeps its own copy
      }
      game.interaction.on('property', (item) => {
        this.buy(item.propertyId);
        return 1;
      });
    }

    /** Pick a building for each business: on a street front, nobody else's. */
    _place() {
      const g = this.game;
      const K = VH.Stores && VH.Stores.kit;
      if (!K || !g.layout) return [];
      const used = (g.places && g.places.usedLots) || new Set();
      const spots = g.places ? Array.from(g.places.map.values()) : [];
      const taken = [];
      for (const s of g.layout.stores || []) taken.push(s.centre);
      for (const s of g.layout.sprays || []) taken.push(s.centre);
      const out = [];
      for (const [id, name, district, price, income, kind, colors] of DEFS) {
        const lots = [];
        for (const b of g.layout.blocks) {
          if (b.kind !== 'buildings' || K.AVOID_BLOCKS.has(b.id)) continue;
          for (const l of b.lots) {
            if (l.kind !== 'building' || l.district.id !== district || used.has(l.id) || l.store || l.spray) continue;
            if ((l.top || 0) < 5 || (l.top || 0) > 45) continue;
            lots.push(l);
          }
        }
        lots.sort((a, b) => hashString(id + a.id + SALT) - hashString(id + b.id + SALT));
        for (const l of lots) {
          const side = ['s', 'n', 'e', 'w'].find((sd) => l.front[sd]);
          if (!side) continue;
          const f = K.frameFor(l, side);
          if (f.W < 8) continue;
          const [x, z] = K.P(f, f.W / 2 + 1.5, -1.1);
          if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 20)) continue;
          if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < 70)) continue;
          const [sx, sz] = K.P(f, f.W / 2 + 1.5, -2.4);
          const y = g.physics.groundHeight(x, z, 2);
          out.push({
            id, name, district, price, income, kind, colors,
            lot: l.id,
            sign: { x, y, z, yaw: Math.atan2(-f.vx, -f.vz) },
            stand: { x: sx, z: sz },
          });
          taken.push({ x, z });
          break;
        }
      }
      return out;
    }

    get(id) {
      return this.list.find((p) => p.id === id) || null;
    }

    buy(id) {
      const g = this.game;
      const p = this.get(id);
      if (!p || this.owned[id]) return;
      if (g.player.money < p.price) {
        g.hud.showToast('You need ' + VH.util.formatMoney(p.price) + ' for ' + p.name + '.');
        if (g.audio.fail) g.audio.fail();
        return;
      }
      g.player.money -= p.price;
      this._own(p);
      if (g.audio.purchase) g.audio.purchase();
      const n = Object.keys(this.owned).length;
      g.hud.notify({ title: p.name + ' is yours', text: 'It pays ' + VH.util.formatMoney(p.income) + ' every payday (every ' + PAYDAY / 60 + ' minutes of play). ' + n + ' of ' + this.list.length + ' businesses owned.', icon: '🏢', duration: 7000 });
      VH.events.emit('property:bought', { p });
    }

    _own(p) {
      this.owned[p.id] = true;
      p.item.enabled = false;
      drawSign(p.view.canvas, p, true);
      p.view.tex.needsUpdate = true;
    }

    /** What everything Jay owns pays each payday. */
    income() {
      let sum = 0;
      for (const p of this.list) if (this.owned[p.id]) sum += p.income;
      return sum;
    }

    update(dt) {
      if (!this.ok) return;
      const pay = this.income();
      if (!pay) return;
      this.paydayT -= dt;
      if (this.paydayT > 0) return;
      this.paydayT = PAYDAY;
      const g = this.game;
      g.player.money += pay;
      this.earned += pay;
      const n = Object.keys(this.owned).length;
      g.hud.notify({ title: 'Payday', text: VH.util.formatMoney(pay) + ' from your ' + (n === 1 ? 'business' : n + ' businesses') + '.', icon: '💵', duration: 5000 });
      if (g.audio.purchase) g.audio.purchase();
    }

    // ---------------------------------------------------------- contract
    blips(out) {
      if (!this.ok) return;
      const money = VH.util.formatMoney;
      for (const p of this.list) {
        if (this.owned[p.id]) out.push({ x: p.sign.x, z: p.sign.z, type: 'owned', label: p.name, noRim: true });
        else out.push({ x: p.sign.x, z: p.sign.z, type: 'property', label: p.name + ' · ' + money(p.price), noRim: true });
      }
    }

    stats() {
      if (!this.ok) return [];
      const n = Object.keys(this.owned).length;
      const rows = [['Businesses owned', n + ' / ' + this.list.length], ['Business takings', VH.util.formatMoney(this.earned)]];
      if (n) rows.push(['Next payday', Math.ceil(this.paydayT / 60) + ' min']);
      return rows;
    }

    serialize() {
      return { owned: Object.keys(this.owned), earned: this.earned, payday: Math.round(this.paydayT) };
    }

    load(d) {
      if (!this.ok) return;
      d = d || {};
      this.reset();
      for (const id of d.owned || []) {
        const p = this.get(id);
        if (p) this._own(p);
      }
      this.earned = d.earned || 0;
      this.paydayT = d.payday > 0 ? Math.min(PAYDAY, d.payday) : PAYDAY;
    }

    reset() {
      if (!this.ok) return;
      for (const p of this.list) {
        if (!this.owned[p.id]) continue;
        p.item.enabled = true;
        drawSign(p.view.canvas, p, false);
        p.view.tex.needsUpdate = true;
      }
      this.owned = {};
      this.earned = 0;
      this.paydayT = PAYDAY;
    }

    stop() {}
  }

  VH.Properties = Properties;
})();
