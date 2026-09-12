// economy.js — wallet, bank, reputation and the ledger behind them.
import { clamp, formatMoney } from '../core/mathx.js';

export class Economy {
  constructor(ctx) {
    this.ctx = ctx;
    this.cash = 850;
    this.bank = 2500;
    this.dirty = 0;            // proceeds of crime — banks ask questions
    this.rep = 0;
    this.level = 1;
    this.loot = 0;             // stolen goods waiting to be fenced
    this.ledger = [];
    this.lifetimeEarned = 0;
    this.lifetimeSpent = 0;
  }

  canAfford(amount) { return this.cash >= amount; }

  earn(amount, reason = '', opts = {}) {
    if (amount <= 0) return 0;
    this.cash += amount;
    this.lifetimeEarned += amount;
    if (opts.dirty) this.dirty += amount;
    this._log('+', amount, reason);
    this.ctx.bus.emit('money:changed', { delta: amount, cash: this.cash, reason });
    return amount;
  }

  spend(amount, reason = '') {
    if (amount <= 0) return true;
    if (this.cash < amount) return false;
    this.cash -= amount;
    this.lifetimeSpent += amount;
    this._log('-', amount, reason);
    this.ctx.bus.emit('money:changed', { delta: -amount, cash: this.cash, reason });
    return true;
  }

  /** Losing money without a purchase — bribes, repairs, hospital, getting busted. */
  lose(amount, reason = '') {
    const taken = Math.min(this.cash, amount);
    this.cash -= taken;
    if (taken > 0) {
      this._log('-', taken, reason);
      this.ctx.bus.emit('money:changed', { delta: -taken, cash: this.cash, reason });
    }
    return taken;
  }

  depositAll() {
    if (this.cash <= 0) { this.ctx.notify?.toast('Nothing to deposit', '', 'info'); return 0; }
    const amount = this.cash;
    this.bank += amount;
    this.cash = 0;
    this.dirty = 0;
    this._log('>', amount, 'Deposit');
    this.ctx.bus.emit('money:changed', { delta: -amount, cash: 0, reason: 'Deposit' });
    this.ctx.notify?.toast('Deposited', formatMoney(amount), 'money');
    return amount;
  }
  withdrawAll() {
    if (this.bank <= 0) { this.ctx.notify?.toast('Account empty', '', 'info'); return 0; }
    const amount = this.bank;
    this.cash += amount;
    this.bank = 0;
    this._log('<', amount, 'Withdrawal');
    this.ctx.bus.emit('money:changed', { delta: amount, cash: this.cash, reason: 'Withdrawal' });
    this.ctx.notify?.toast('Withdrawn', formatMoney(amount), 'money');
    return amount;
  }

  addLoot(value) { this.loot += value; }
  sellLoot() {
    if (this.loot <= 0) { this.ctx.notify?.toast('Nothing to fence', '', 'info'); return 0; }
    const payout = Math.round(this.loot * 0.55);
    this.loot = 0;
    this.earn(payout, 'Fenced goods', { dirty: true });
    this.ctx.notify?.toast('Fenced', formatMoney(payout), 'money');
    return payout;
  }

  addRep(amount) {
    this.rep += amount;
    const newLevel = 1 + Math.floor(Math.sqrt(this.rep / 22));
    if (newLevel > this.level) {
      this.level = newLevel;
      this.ctx.notify?.toast('Level up', `Reputation ${this.level}`, 'good');
      this.ctx.bus.emit('level:up', { level: this.level });
    }
  }

  _log(sign, amount, reason) {
    this.ledger.push({ sign, amount, reason, t: this.ctx.time.elapsed });
    if (this.ledger.length > 60) this.ledger.shift();
  }

  serialize() {
    return { cash: this.cash, bank: this.bank, rep: this.rep, level: this.level,
      dirty: this.dirty, loot: this.loot, lifetimeEarned: this.lifetimeEarned, lifetimeSpent: this.lifetimeSpent };
  }
  deserialize(d) {
    if (!d) return;
    this.cash = d.cash ?? this.cash;
    this.bank = d.bank ?? this.bank;
    this.rep = d.rep ?? 0;
    this.level = d.level ?? 1;
    this.dirty = d.dirty ?? 0;
    this.loot = d.loot ?? 0;
    this.lifetimeEarned = d.lifetimeEarned ?? 0;
    this.lifetimeSpent = d.lifetimeSpent ?? 0;
  }
}
