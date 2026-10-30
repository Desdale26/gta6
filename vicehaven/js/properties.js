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
 * Once a business is his, its sign sells him upgrades (E again): a new
 * sign out front, a refit, then an expansion, each costing a share of what
 * the place cost and each adding half the base takings again. Street Rep's payday
 * perk (rep.js) adds its share on top of the lot, and the payday note
 * shows where the money came from.
 *
 *   game.properties.list        every business: { id, name, price, income (base takings), ... }
 *   game.properties.owned[id]   true once bought
 *   game.properties.tier(p)     upgrades bought for p (a business or its id): 0..3
 *   game.properties.upgradeCost(p)  the next upgrade's price (0 when not owned or all done)
 *   game.properties.income(p)   what p pays a payday, upgrades and the Rep perk included;
 *                               income() with no business: everything Jay owns
 *   game.properties.nextPayday()    seconds to the next payday (null when Jay owns nothing)
 *   game.properties.paydayLine()    'Payday in 7:42 · $5,980' for the phone ('' when none)
 *   property:bought { p }       (achievements.js, rep.js)
 *   property:upgraded { p, tier }   (achievements.js, rep.js, dailies.js)
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
  // Upgrades, in order: [name, share of the business's price it costs].
  const UPGRADES = [
    ['New sign', 0.3],
    ['Refit', 0.5],
    ['Expansion', 0.75],
  ];
  const UPGRADE_BOOST = 0.5; // each upgrade adds this share of the base takings
  const BOOST_TEXT = '+' + Math.round(UPGRADE_BOOST * 100) + '%';

  /** "7:42" */
  function clock(s) {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ------------------------------------------------------------- the sign
  /** A five-pointed star, filled gold for an upgrade bought, an outline for one to come. */
  function star(g, x, y, r, on) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const k = i % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
    }
    g.closePath();
    if (on) {
      g.fillStyle = '#ffd84a';
      g.fill();
    }
    g.lineWidth = 3;
    g.strokeStyle = on ? '#ffd84a' : 'rgba(255, 255, 255, 0.5)';
    g.stroke();
  }

  /** owned: null while it's for sale, else { tier, takings, next: { name, cost } | null }. */
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
      const tier = owned.tier || 0;
      const full = tier >= UPGRADES.length;
      g.fillStyle = p.colors[1];
      g.font = font('800', 44);
      g.fillText(p.name, W / 2, 58, W - 40);
      for (let i = 0; i < UPGRADES.length; i++) star(g, W / 2 + (i - 1) * 46, 108, 17, i < tier);
      g.fillStyle = '#ffffff';
      g.font = font('600', 28);
      const done = UPGRADES.slice(0, tier).map((u) => u[0]);
      g.fillText(full ? 'Fully upgraded' : tier ? 'Upgraded: ' + done.join(', ') : 'Under new management', W / 2, 152, W - 40);
      g.fillStyle = 'rgba(255, 255, 255, 0.75)';
      g.font = font('600', 24);
      g.fillText('Owner: Jay Mercer  ·  pays ' + money(owned.takings) + ' a payday', W / 2, 194, W - 40);
      if (owned.next) {
        g.fillStyle = '#ffb347';
        g.font = font('700', 24);
        g.fillText('Next upgrade: ' + owned.next.name + '  ·  ' + money(owned.next.cost) + '  ·  ' + BOOST_TEXT + ' takings', W / 2, 236, W - 40);
      }
      g.strokeStyle = full ? '#ffd84a' : '#ffb347';
      g.lineWidth = full ? 14 : 10;
      g.strokeRect(7, 7, W - 14, H - 14);
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
      this.tiers = {}; // id → upgrades bought (0..3)
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
      // The same sign sells the business, then its upgrades.
      game.interaction.on('property', (item) => {
        if (this.owned[item.propertyId]) this.upgrade(item.propertyId);
        else this.buy(item.propertyId);
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
            if (l.kind !== 'building' || l.district.id !== district || used.has(l.id) || l.store || l.spray || l.gun || l.chop) continue;
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
      g.giveMoney(-p.price, 'property');
      this._own(p);
      if (g.audio.purchase) g.audio.purchase();
      const n = Object.keys(this.owned).length;
      const up = UPGRADES[0];
      g.hud.notify({ title: p.name + ' is yours', text: 'It pays ' + VH.util.formatMoney(p.income) + ' every payday (every ' + PAYDAY / 60 + ' minutes of play). ' + n + ' of ' + this.list.length + ' businesses owned. Its sign sells upgrades too: ' + up[0] + ' for ' + VH.util.formatMoney(this.upgradeCost(p)) + ', ' + BOOST_TEXT + ' takings.', icon: '🏢', duration: 8000 });
      VH.events.emit('property:bought', { p });
      this._refocus(p);
    }

    _own(p) {
      this.owned[p.id] = true;
      this._refresh(p);
    }

    /** Buy the next upgrade for a business Jay owns. */
    upgrade(id) {
      const g = this.game;
      const p = this.get(id);
      if (!p || !this.owned[id]) return;
      const t = this.tier(p);
      if (t >= UPGRADES.length) return;
      const cost = this.upgradeCost(p);
      const name = UPGRADES[t][0];
      if (g.player.money < cost) {
        g.hud.showToast('You need ' + VH.util.formatMoney(cost) + ' for the ' + name.toLowerCase() + ' at ' + p.name + '.');
        if (g.audio.fail) g.audio.fail();
        return;
      }
      g.giveMoney(-cost, 'upgrade');
      this.tiers[id] = t + 1;
      this._refresh(p);
      if (g.audio.purchase) g.audio.purchase();
      const money = VH.util.formatMoney;
      const next = UPGRADES[t + 1];
      g.hud.notify({
        title: p.name + ': ' + name,
        text: 'Takings up to ' + money(this._takings(p)) + ' a payday (' + BOOST_TEXT + '). ' + (next ? 'Next: ' + next[0].toLowerCase() + ' for ' + money(this.upgradeCost(p)) + '.' : 'Fully upgraded: ★★★'),
        icon: '🏢',
        duration: 7000,
      });
      VH.events.emit('property:upgraded', { p, tier: t + 1 });
      this._refocus(p);
    }

    /** Redraw a business's sign and set what its E does now (buy, upgrade, or nothing). */
    _refresh(p) {
      const it = p.item;
      if (!this.owned[p.id]) {
        drawSign(p.view.canvas, p, null);
        it.enabled = true;
        it.label = 'Buy ' + p.name;
        it.price = p.price;
      } else {
        const t = this.tier(p);
        const next = t < UPGRADES.length ? { name: UPGRADES[t][0], cost: this.upgradeCost(p) } : null;
        drawSign(p.view.canvas, p, { tier: t, takings: this._takings(p), next });
        it.enabled = !!next;
        if (next) {
          it.label = 'Upgrade ' + p.name + ': ' + next.name;
          it.price = next.cost;
        }
      }
      p.view.tex.needsUpdate = true;
    }

    /** The HUD's prompt is set when Jay walks up: put the new one up if he's still there. */
    _refocus(p) {
      const I = this.game.interaction;
      if (I && I.current === p.item) VH.events.emit('interaction:focus', { item: p.item.enabled ? p.item : null });
    }

    /** Upgrades bought for a business (or its id): 0..3. */
    tier(p) {
      const id = p && typeof p === 'object' ? p.id : p;
      return Math.max(0, Math.min(UPGRADES.length, this.tiers[id] || 0));
    }

    /** The next upgrade's price, or 0 when it isn't Jay's or there's nothing left to buy. */
    upgradeCost(p) {
      if (p && typeof p !== 'object') p = this.get(p);
      if (!p || !this.owned[p.id]) return 0;
      const t = this.tier(p);
      if (t >= UPGRADES.length) return 0;
      return Math.round((p.price * UPGRADES[t][1]) / 500) * 500;
    }

    /** A business's takings with its upgrades (before Street Rep's perk). */
    _takings(p) {
      return Math.round(p.income * (1 + UPGRADE_BOOST * this.tier(p)));
    }

    /** Street Rep's payday multiplier (1 until the perk comes). */
    _perk() {
      const rep = this.game.rep;
      const m = rep && rep.perk ? rep.perk('payday') : 1;
      return m > 0 ? m : 1;
    }

    /**
     * What a business pays each payday, upgrades and the Rep perk included;
     * with no business, what everything Jay owns pays.
     */
    income(p) {
      if (p !== undefined && p !== null) {
        if (typeof p !== 'object') p = this.get(p);
        if (!p || !this.owned[p.id]) return 0;
        return Math.round(this._takings(p) * this._perk());
      }
      let sum = 0;
      for (const q of this.list) if (this.owned[q.id]) sum += this.income(q);
      return sum;
    }

    /** Seconds to the next payday, or null while Jay owns nothing (the clock only runs then). */
    nextPayday() {
      if (!this.ok || !this.income()) return null;
      return Math.max(0, Math.ceil(this.paydayT));
    }

    /** 'Payday in 7:42 · $5,980' for the phone, or '' while Jay owns nothing. */
    paydayLine() {
      const s = this.nextPayday();
      return s === null ? '' : 'Payday in ' + clock(s) + ' · ' + VH.util.formatMoney(this.income());
    }

    update(dt) {
      if (!this.ok) return;
      const pay = this.income();
      if (!pay) return;
      this.paydayT -= dt;
      if (this.paydayT > 0) return;
      this.paydayT = PAYDAY;
      this._payday();
    }

    /** Pay out, and say where it came from: the takings, the upgrades, the Rep perk. */
    _payday() {
      const g = this.game;
      const money = VH.util.formatMoney;
      let base = 0;
      let boosted = 0;
      let n = 0;
      for (const p of this.list) {
        if (!this.owned[p.id]) continue;
        n++;
        base += p.income;
        boosted += this._takings(p);
      }
      const pay = this.income();
      if (!pay) return;
      g.giveMoney(pay, 'payday');
      this.earned += pay;
      const parts = [money(base) + ' takings from ' + (n === 1 ? 'your business' : 'your ' + n + ' businesses')];
      if (boosted > base) parts.push('+' + money(boosted - base) + ' from upgrades');
      if (pay > boosted && this._perk() > 1) parts.push('+' + money(pay - boosted) + ' Street Rep bonus (+' + Math.round((this._perk() - 1) * 100) + '%)');
      g.hud.notify({ title: 'Payday  +' + money(pay), text: parts.join(' · ') + '. Next payday in ' + PAYDAY / 60 + ' minutes.', icon: '💵', duration: 7000 });
      if (g.audio.purchase) g.audio.purchase();
    }

    // ---------------------------------------------------------- contract
    blips(out) {
      if (!this.ok) return;
      const money = VH.util.formatMoney;
      for (const p of this.list) {
        if (this.owned[p.id]) {
          const cost = this.upgradeCost(p);
          out.push({ x: p.sign.x, z: p.sign.z, type: 'owned', label: p.name + (cost ? ' · upgrade ' + money(cost) : ' · fully upgraded'), noRim: true });
        } else out.push({ x: p.sign.x, z: p.sign.z, type: 'property', label: p.name + ' · ' + money(p.price), noRim: true });
      }
    }

    stats() {
      if (!this.ok) return [];
      const n = Object.keys(this.owned).length;
      const rows = [['Businesses owned', n + ' / ' + this.list.length], ['Business takings', VH.util.formatMoney(this.earned)]];
      if (n) {
        let ups = 0;
        for (const id of Object.keys(this.owned)) ups += this.tier(id);
        rows.push(['Business upgrades', ups + ' / ' + n * UPGRADES.length]);
        rows.push(['Next payday', clock(this.paydayT) + ' · ' + VH.util.formatMoney(this.income())]);
      }
      return rows;
    }

    serialize() {
      const tiers = {};
      for (const id of Object.keys(this.owned)) if (this.tier(id)) tiers[id] = this.tier(id);
      return { owned: Object.keys(this.owned), tiers, earned: this.earned, payday: Math.round(this.paydayT) };
    }

    load(d) {
      if (!this.ok) return;
      d = d || {};
      this.reset();
      const tiers = d.tiers || {}; // saves from before the upgrades have none
      for (const id of d.owned || []) {
        const p = this.get(id);
        if (!p) continue;
        this.tiers[id] = Math.max(0, Math.min(UPGRADES.length, Math.floor(+tiers[id] || 0)));
        this._own(p);
      }
      this.earned = d.earned || 0;
      this.paydayT = d.payday > 0 ? Math.min(PAYDAY, d.payday) : PAYDAY;
    }

    reset() {
      if (!this.ok) return;
      const was = this.owned;
      this.owned = {};
      this.tiers = {};
      for (const p of this.list) if (was[p.id]) this._refresh(p);
      this.earned = 0;
      this.paydayT = PAYDAY;
    }

    stop() {}
  }

  VH.Properties = Properties;
})();
