// radio.js — station selection and what the player hears in a car.
import { STATIONS, getStation } from '../content/radioCatalog.js';
import { districtAt } from '../content/districtCatalog.js';

export class Radio {
  constructor(ctx) {
    this.ctx = ctx;
    this.stationId = null;
    this.playing = false;
    this.autoPick = true;
    ctx.bus.on('player:enteredVehicle', () => this._onEnter());
    ctx.bus.on('player:exitedVehicle', () => this.stop());
  }

  get player() { return this.ctx.audio?.music || null; }
  get nowPlaying() { return this.player ? this.player.nowPlaying : null; }

  _onEnter() {
    if (!this.stationId && this.autoPick) {
      // Default to whatever the neighbourhood listens to.
      const d = districtAt(this.ctx.player.position.x, this.ctx.player.position.z);
      this.setStationById(d ? d.radio : STATIONS[0].id);
    } else if (this.stationId) {
      this.setStationById(this.stationId);
    }
  }

  setStationById(id) {
    const s = getStation(id) || STATIONS[0];
    if (!s || !this.player) return false;
    this.stationId = s.id;
    this.playing = true;
    this.player.setStation(s);
    this.ctx.bus.emit('radio:station', { station: s });
    return true;
  }

  next() { this._cycle(1); }
  prev() { this._cycle(-1); }
  _cycle(dir) {
    const n = STATIONS.length;
    // Slot n is "off". Which slot we are on has to come from `playing`, not from
    // `stationId`: stop() leaves stationId pointing at the last station, so
    // cycling off the end found that station again, computed "off" again, and
    // the radio could never be switched back on.
    const found = STATIONS.findIndex((s) => s.id === this.stationId);
    const cur = this.playing && found >= 0 ? found : n;
    const next = (cur + dir + n + 1) % (n + 1);
    if (next === n) this.stop();
    else this.setStationById(STATIONS[next].id);
  }
  nextTrack() { this.player?.next(); }

  stop() {
    this.playing = false;
    this.player?.stop();
    this.ctx.bus.emit('radio:station', { station: null });
  }

  update(dt) {
    const input = this.ctx.input;
    if (this.ctx.game?.uiCapture) return;
    if (!this.ctx.player?.inVehicle) return;
    if (input.pressed('radioNext')) this.next();
    if (input.pressed('radioPrev')) this.prev();
  }

  serialize() { return { stationId: this.stationId }; }
  deserialize(d) { if (d && d.stationId) this.stationId = d.stationId; }
}
