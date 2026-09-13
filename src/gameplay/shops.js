// shops.js — shopping, and the much more interesting alternative to shopping.
import * as THREE from 'three';
import { clamp, lerp, formatMoney } from '../core/mathx.js';
import { getShopType } from '../content/shopCatalog.js';
import { getWeapon } from '../content/weaponCatalog.js';
import { CRIME } from './police.js';

const _v1 = new THREE.Vector3();

export const ROB_STATE = { NONE: 'none', HOLDUP: 'holdup', TILL: 'till', SAFE: 'safe', DONE: 'done' };

export class ShopSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.open = null;            // shop currently being browsed
    this.selection = 0;
    this.robbery = null;
    this.nearby = null;
    this.holdProgress = 0;
    this.rng = ctx.rng.fork('shops');
    this.restockTimer = 0;
  }

  /**
   * The shop whose door the player is standing in -- or, at a filling station or
   * a garage, the one they have pulled up to. Refuelling, repairs, tuning and a
   * respray all act on `player.vehicle`, and shops could only ever be entered on
   * foot, where that is null: every one of those nine items answered "Drive one
   * in first" and could never be bought. Drive-in shops are marked in the
   * catalogue, and validateShops now insists the two stay paired.
   */
  _nearestShop() {
    const world = this.ctx.world;
    if (!world) return null;
    const p = this.ctx.player.position;
    if (!this.ctx.player.inVehicle) return world.nearestShop(p.x, p.z, 3.4);
    // A car needs more room to count as "at the pump" than a pair of feet.
    const shop = world.nearestShop(p.x, p.z, 8);
    return shop && shop.typeDef && shop.typeDef.driveIn ? shop : null;
  }

  update(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    if (!player || player.dead) { this.nearby = null; this.holdProgress = 0; return; }

    this.nearby = this.open ? this.open : this._nearestShop();

    if (this.robbery) { this._updateRobbery(dt); return; }
    if (this.open) return;

    if (!this.nearby) { this.holdProgress = 0; return; }

    const input = ctx.input;
    const armed = player.weapons.def.slot !== 'fists' && player.weapons.def.slot !== 'melee';
    const canRob = this.nearby.typeDef?.robbery?.possible && armed;

    if (canRob && input.down('interact') && player.weapons.aiming) {
      // Holding E while aiming a gun at the place starts a robbery.
      this.holdProgress += dt / 0.7;
      if (this.holdProgress >= 1) {
        this.holdProgress = 0;
        this.startRobbery(this.nearby);
      }
    } else {
      this.holdProgress = Math.max(0, this.holdProgress - dt * 2.5);
      if (input.pressed('interact')) this.enter(this.nearby);
    }
  }

  // -------------------------------------------------------------------------
  // Shopping
  // -------------------------------------------------------------------------
  enter(shop) {
    if (!shop || this.open || this.robbery) return false;
    const hour = this.ctx.time.hour;
    const [o, c] = shop.typeDef.hours;
    const openNow = o === 0 && c === 24 ? true : (o <= c ? (hour >= o && hour < c) : (hour >= o || hour < c));
    if (!openNow) {
      this.ctx.notify?.toast('Closed', `${shop.name} opens at ${o}:00`, 'info');
      return false;
    }
    this.open = shop;
    this.selection = 0;
    this.ctx.audio?.play('uiConfirm', { ui: true, volume: 0.5 });
    this.ctx.bus.emit('shop:opened', { shop });
    return true;
  }

  leave() {
    if (!this.open) return;
    const shop = this.open;
    this.open = null;
    this.ctx.audio?.play('uiCancel', { ui: true, volume: 0.5 });
    this.ctx.bus.emit('shop:closed', { shop });
  }

  buy(item) {
    const ctx = this.ctx;
    const player = ctx.player;
    const econ = ctx.economy;
    if (!this.open || !item) return false;
    if (item.kind === 'service' && item.id === 'deposit') { econ.depositAll(); return true; }
    if (item.kind === 'service' && item.id === 'withdraw') { econ.withdrawAll(); return true; }
    if (item.id && item.id.startsWith('bet-')) return this._gamble(item);

    if (!econ.canAfford(item.price)) {
      ctx.notify?.toast('Declined', 'Not enough cash', 'bad');
      ctx.audio?.play('uiCancel', { ui: true });
      return false;
    }

    let ok = true;
    switch (item.kind) {
      case 'weapon': {
        const w = getWeapon(item.weaponId);
        if (!w) { ok = false; break; }
        if (player.weapons.has(item.weaponId) && !item.amount) {
          // Already own it — sell ammo instead.
          player.weapons.addAmmo(item.weaponId, Math.ceil(w.magazine * 2));
          ctx.notify?.toast('Ammo', `${w.name} topped up`, 'good');
        } else {
          player.weapons.add(item.weaponId, item.amount ? item.amount : w.magazine * 2);
          player.weapons.select(item.weaponId);
          ctx.notify?.toast('Acquired', w.name, 'good');
        }
        ctx.audio?.play('pickupWeapon', { ui: true });
        break;
      }
      case 'ammo': {
        if (item.amount === -1) {
          for (const id of player.weapons.order) player.weapons.addAmmo(id, -1);
          ctx.notify?.toast('Restocked', 'All ammo topped up', 'good');
        } else {
          player.weapons.addAmmo(item.weaponId || player.weapons.currentId, item.amount || 24);
          ctx.notify?.toast('Ammo', `+${item.amount || 24} rounds`, 'good');
        }
        ctx.audio?.play('pickupWeapon', { ui: true });
        break;
      }
      case 'health': {
        player.heal(item.value ?? 25);
        ctx.audio?.play('pickupHealth', { ui: true });
        ctx.notify?.toast('Health', `+${item.value ?? 25}`, 'good');
        break;
      }
      case 'armor': {
        player.addArmor(item.value ?? 50);
        ctx.audio?.play('pickupArmor', { ui: true });
        ctx.notify?.toast('Armour', `+${item.value ?? 50}`, 'good');
        break;
      }
      case 'clothing': {
        ctx.notify?.toast('Looking sharp', item.label, 'good');
        ctx.audio?.play('uiConfirm', { ui: true });
        break;
      }
      case 'upgrade': {
        this._applyUpgrade(item);
        break;
      }
      case 'service': {
        this._applyService(item);
        break;
      }
      default: ok = false;
    }
    if (!ok) return false;
    econ.spend(item.price, item.label);
    ctx.audio?.play('cashRegister', { ui: true, volume: 0.5 });
    return true;
  }

  _applyUpgrade(item) {
    const ctx = this.ctx;
    const v = ctx.player.vehicle;
    if (item.id === 'phone-up' || item.id === 'jammer' || item.id === 'adrenaline') {
      ctx.player[item.id] = true;
      ctx.notify?.toast('Upgraded', item.label, 'good');
      return;
    }
    if (!v) { ctx.notify?.toast('No vehicle', 'Drive one in first', 'bad'); return; }
    switch (item.id) {
      case 'tune-engine': v.sim.def.engine.peakPowerKw *= 1.12; v.sim.def.engine.peakTorqueNm *= 1.12; break;
      case 'tune-brakes': v.sim.def.handling.brakeTorque *= 1.25; break;
      case 'tune-grip': v.sim.def.handling.tireGrip = Math.min(1.6, v.sim.def.handling.tireGrip * 1.1); break;
      case 'tune-nitro': v.nitro = 1; break;
      default: break;
    }
    ctx.notify?.toast('Installed', item.label, 'good');
  }

  _applyService(item) {
    const ctx = this.ctx;
    const v = ctx.player.vehicle;
    switch (item.id) {
      case 'refuel':
        if (!v) { ctx.notify?.toast('No vehicle', 'Pull up to a pump', 'bad'); return; }
        v.sim.fuel = 1;
        ctx.notify?.toast('Fuelled', 'Tank full', 'good');
        break;
      case 'repair-light':
      case 'repair-full':
        if (!v) { ctx.notify?.toast('No vehicle', 'Drive one in first', 'bad'); return; }
        v.sim.health = v.sim.maxHealth;
        v.sim.engineHealth = 1;
        v.sim.onFire = 0;
        v.sim.deformation.fill(0);
        ctx.notify?.toast('Repaired', 'Good as new', 'good');
        break;
      case 'respray':
        if (!v) { ctx.notify?.toast('No vehicle', 'Drive one in first', 'bad'); return; }
        ctx.police.heat = Math.max(0, ctx.police.heat - 120);
        ctx.police._recalcStars();
        ctx.notify?.toast('Resprayed', 'Heat reduced', 'good');
        break;
      case 'sell-loot':
        ctx.economy.sellLoot();
        break;
      default:
        ctx.notify?.toast('Purchased', item.label, 'good');
        break;
    }
  }

  _gamble(item) {
    const ctx = this.ctx;
    if (!ctx.economy.canAfford(item.price)) {
      ctx.notify?.toast('Declined', 'Not enough cash', 'bad');
      return false;
    }
    ctx.economy.spend(item.price, 'Casino');
    // Honest odds: 46% to roughly double, 12% to hit a multiplier.
    const roll = this.rng.float();
    let payout = 0;
    if (roll < 0.12) payout = item.price * 4;
    else if (roll < 0.46) payout = item.price * 2;
    if (payout > 0) {
      ctx.economy.earn(payout, 'Casino win');
      ctx.notify?.toast('Winner', `+${formatMoney(payout)}`, 'money');
      ctx.audio?.play('pickupCash', { ui: true });
    } else {
      ctx.notify?.toast('House wins', `-${formatMoney(item.price)}`, 'bad');
      ctx.audio?.play('uiCancel', { ui: true });
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Robbery
  // -------------------------------------------------------------------------
  startRobbery(shop) {
    if (this.robbery || !shop) return false;
    const def = shop.typeDef.robbery;
    if (!def.possible) return false;
    const ctx = this.ctx;
    const now = ctx.time.elapsed;
    if (now - shop.robbedAt < shop.typeDef.restockHours * 60) {
      ctx.notify?.toast('Empty', 'This place has nothing left', 'bad');
      return false;
    }
    this.robbery = {
      shop, def, state: ROB_STATE.HOLDUP, timer: 0,
      tillTaken: 0, safeTaken: 0, alarm: false,
      grabTime: def.grabTime, safeTime: def.safeTime,
      guardsSpawned: false,
    };
    this.open = null;
    ctx.notify?.toast('HOLD-UP', `${shop.name} — keep the gun on them`, 'bad');
    ctx.audio?.play('uiWanted', { volume: 0.5 });
    ctx.peds?.panic(shop.x, shop.z, def.panicRadius, ctx.player, 1.4);
    ctx.bus.emit('robbery:started', { shop });

    // The clerk may reach for a weapon, and guards react.
    if (this.rng.float() < def.clerkArmed) this._spawnDefender(shop, 'security-guard');
    for (let i = 0; i < def.guards; i++) this._spawnDefender(shop, 'security-guard');
    return true;
  }

  _spawnDefender(shop, archetype) {
    const ctx = this.ctx;
    if (!ctx.peds) return;
    const a = this.rng.range(0, Math.PI * 2);
    const x = shop.x + Math.cos(a) * 3.2;
    const z = shop.z + Math.sin(a) * 3.2;
    const ped = ctx.peds.spawn(archetype, x, z, 0, {});
    ped.armed = ped.armed || 'pistol-9';
    ped.threat = ctx.player;
    ped._setState('combat');
    ped.stats = { ...ped.stats, bravery: 0.95 };
  }

  _updateRobbery(dt) {
    const ctx = this.ctx;
    const r = this.robbery;
    const player = ctx.player;
    const shop = r.shop;
    const dist = Math.hypot(player.position.x - shop.x, player.position.z - shop.z);

    // Walking away cancels it.
    if (dist > 9 || player.dead || player.inVehicle) {
      this._finishRobbery(dist <= 9);
      return;
    }

    r.timer += dt;

    if (r.state === ROB_STATE.HOLDUP) {
      if (!r.alarm && this.rng.float() < r.def.alarmChance * dt * 0.8) this._triggerAlarm();
      if (r.timer > 0.8) { r.state = ROB_STATE.TILL; r.timer = 0; }
    } else if (r.state === ROB_STATE.TILL) {
      const frac = clamp(r.timer / r.grabTime, 0, 1);
      const total = lerp(r.def.tillCash[0], r.def.tillCash[1], this.rng.float() * 0.0 + 0.5);
      r.tillTaken = Math.round(total * frac);
      if (!r.alarm && this.rng.float() < r.def.alarmChance * dt * 1.4) this._triggerAlarm();
      if (frac >= 1) {
        if (r.def.safeCash[1] > 0) { r.state = ROB_STATE.SAFE; r.timer = 0; }
        else { this._finishRobbery(true); return; }
      }
    } else if (r.state === ROB_STATE.SAFE) {
      const frac = clamp(r.timer / r.safeTime, 0, 1);
      const total = lerp(r.def.safeCash[0], r.def.safeCash[1], 0.5);
      r.safeTaken = Math.round(total * frac);
      if (!r.alarm && r.timer > r.safeTime * 0.3) this._triggerAlarm();
      if (frac >= 1) { this._finishRobbery(true); return; }
    }
    ctx.bus.emit('robbery:progress', { robbery: r });
  }

  _triggerAlarm() {
    const r = this.robbery;
    if (!r || r.alarm) return;
    r.alarm = true;
    const ctx = this.ctx;
    ctx.audio?.playAt('alarmShop', { x: r.shop.x, y: r.shop.y + 3, z: r.shop.z }, { volume: 0.7, maxDistance: 140 });
    ctx.police.report(r.shop.type === 'bank' ? CRIME.bankRobbery : CRIME.shopRobbery);
    ctx.police.setStars(Math.max(ctx.police.stars, r.def.wanted));
    ctx.notify?.toast('ALARM', 'Silent alarm tripped — move', 'bad');
    ctx.bus.emit('robbery:alarm', { shop: r.shop });
  }

  _finishRobbery(success) {
    const ctx = this.ctx;
    const r = this.robbery;
    if (!r) return;
    this.robbery = null;
    const take = Math.round((r.tillTaken + r.safeTaken) * (r.def.payoutMultiplier || 1));
    if (take > 0) {
      ctx.economy.earn(take, `Robbery: ${r.shop.name}`, { dirty: true });
      ctx.notify?.toast('TAKE', formatMoney(take), 'money');
      ctx.audio?.play('pickupCash', { volume: 0.7 });
      r.shop.robbedAt = ctx.time.elapsed;
      r.shop.robbed++;
    }
    if (!r.alarm && take > 0 && this.rng.bool(0.5)) {
      // Clean getaway — the report comes in late.
      setTimeout(() => ctx.police.report(CRIME.shopRobbery * 0.5), 4000);
    }
    ctx.bus.emit('robbery:finished', { shop: r.shop, take, alarm: r.alarm, success });
  }

  cancelRobbery() { if (this.robbery) this._finishRobbery(false); }

  /** The prompt shown when standing at a shop door. */
  promptText() {
    if (this.robbery) {
      const r = this.robbery;
      if (r.state === ROB_STATE.TILL) return `Emptying the till — ${formatMoney(r.tillTaken)}`;
      if (r.state === ROB_STATE.SAFE) return `Cracking the safe — ${formatMoney(r.tillTaken + r.safeTaken)}`;
      return 'Hold them up';
    }
    if (!this.nearby) return null;
    const s = this.nearby;
    const armed = this.ctx.player.weapons.def.slot !== 'fists' && this.ctx.player.weapons.def.slot !== 'melee';
    const canRob = s.typeDef?.robbery?.possible && armed;
    return canRob
      ? `<b>E</b> enter ${s.name} &middot; aim + hold <b>E</b> to rob it`
      : `<b>E</b> enter ${s.name}`;
  }
}
