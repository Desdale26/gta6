// events.js — minimal synchronous event bus. Zero dependencies, zero allocation
// on emit when there are no listeners.
export class EventBus {
  constructor() { this._m = new Map(); }
  on(type, fn) {
    let a = this._m.get(type);
    if (!a) { a = []; this._m.set(type, a); }
    a.push(fn);
    return () => this.off(type, fn);
  }
  once(type, fn) {
    const wrap = (p) => { this.off(type, wrap); fn(p); };
    return this.on(type, wrap);
  }
  off(type, fn) {
    const a = this._m.get(type);
    if (!a) return;
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  }
  emit(type, payload) {
    const a = this._m.get(type);
    if (!a || a.length === 0) return;
    // Copy guard: listeners may unsubscribe during dispatch.
    const snapshot = a.length === 1 ? a : a.slice();
    for (let i = 0; i < snapshot.length; i++) {
      try { snapshot[i](payload); }
      catch (err) { console.error(`[bus] listener for "${type}" threw`, err); }
    }
  }
  clear(type) { if (type) this._m.delete(type); else this._m.clear(); }
}
export const bus = new EventBus();
