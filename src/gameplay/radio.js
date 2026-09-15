// radio.js — station selection and what the player hears in a car.
import { STATIONS, getStation } from '../content/radioCatalog.js';
import { districtAt } from '../content/districtCatalog.js';

// How loud the radio sits when the player is not in a car. Low enough to hear
// the city over, loud enough that the game is never silent.
const ON_FOOT_VOLUME = 0.42;

export class Radio {
  constructor(ctx) {
    this.ctx = ctx;
    this.stationId = null;
    this.playing = false;
    this.autoPick = true;
    // Music follows the player, not the car.
    //
    // This used to start on entering a vehicle and STOP on leaving one, so the
    // whole game outside a car — every mission on foot, every shop, every walk
    // between jobs — was silent, and the first thing a new player heard was
    // nothing at all. Nine stations of generated music existed and most of a
    // session never reached them. Getting out now ducks the radio to a personal
    // player's volume instead of switching it off, and the only thing that stops
    // it is being asked to.
    ctx.bus.on('player:enteredVehicle', () => { this._onEnter(); this._applyDuck(); });
    ctx.bus.on('player:exitedVehicle', () => this._applyDuck());
  }

  /** In a car it is the car stereo; on foot it is headphones. */
  _applyDuck() {
    const p = this.player;
    if (!p || !this.playing) return;
    p.setVolume(this.ctx.player?.inVehicle ? 1 : ON_FOOT_VOLUME);
  }

  /** Put something on as soon as the world is up, rather than waiting for a car. */
  startAmbient() {
    if (this.playing || !this.player) return;
    this._onEnter();
    this._applyDuck();
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
    this._duck = null;
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
    // The station controls work on foot too now, because the radio plays there.
    if (input.pressed('radioNext')) this.next();
    if (input.pressed('radioPrev')) this.prev();
    // Re-assert the duck after a station change or a track roll, both of which
    // set the player's volume back to full on their way in.
    const want = this.ctx.player?.inVehicle ? 1 : ON_FOOT_VOLUME;
    if (this.playing && this._duck !== want) { this._duck = want; this.player?.setVolume(want); }
  }

  serialize() { return { stationId: this.stationId }; }
  deserialize(d) { if (d && d.stationId) this.stationId = d.stationId; }
}
