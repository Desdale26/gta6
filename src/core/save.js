// save.js — local progress storage.
const KEY = 'vicecoast.save.v1';

export function saveGame(ctx) {
  try {
    const data = {
      version: 1,
      stamp: Date.now(),
      seed: ctx.settings.get('seed'),
      player: {
        x: ctx.player.position.x, y: ctx.player.position.y, z: ctx.player.position.z,
        yaw: ctx.player.yaw,
        health: ctx.player.health, armor: ctx.player.armor,
        weapons: [...ctx.player.weapons.slots.entries()].map(([id, s]) => ({
          id, mag: s.ammoInMag, reserve: s.reserve,
        })),
        current: ctx.player.weapons.currentId,
        kills: ctx.player.kills,
        distanceDriven: ctx.player.distanceDriven,
        distanceWalked: ctx.player.distanceWalked,
      },
      economy: ctx.economy.serialize(),
      missions: ctx.missions.serialize(),
      stunts: ctx.stunts.serialize(),
      radio: ctx.radio.serialize(),
      time: { hour: ctx.time.hour, day: ctx.time.day },
      police: { maxStarsSeen: ctx.police.maxStarsSeen, totalCrimes: ctx.police.totalCrimes },
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('[save] failed', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.version === 1 ? d : null;
  } catch (e) {
    console.warn('[save] load failed', e);
    return null;
  }
}

export function applySave(ctx, d) {
  if (!d) return false;
  const p = ctx.player;
  p.spawn(d.player.x, d.player.y, d.player.z, d.player.yaw);
  // A save written while dead stores health 0, and `??` lets a stored 0
  // through: the player came back alive on no health, and regeneration is
  // gated on health > 0, so it never ticked up and the first scratch killed
  // them again. Anything at or below zero starts the player whole.
  const savedHealth = d.player.health;
  p.health = Number.isFinite(savedHealth) && savedHealth > 0 ? savedHealth : p.maxHealth;
  p.dead = false;
  p.armor = d.player.armor ?? 0;
  p.kills = d.player.kills ?? 0;
  p.distanceDriven = d.player.distanceDriven ?? 0;
  p.distanceWalked = d.player.distanceWalked ?? 0;
  for (const w of d.player.weapons || []) {
    p.weapons.add(w.id);
    const s = p.weapons.slots.get(w.id);
    if (s) { s.ammoInMag = w.mag; s.reserve = w.reserve; }
  }
  if (d.player.current) p.weapons.select(d.player.current);
  ctx.economy.deserialize(d.economy);
  ctx.missions.deserialize(d.missions);
  ctx.stunts.deserialize(d.stunts);
  ctx.radio.deserialize(d.radio);
  if (d.time) { ctx.time.hour = d.time.hour; ctx.time.day = d.time.day; }
  if (d.police) { ctx.police.maxStarsSeen = d.police.maxStarsSeen || 0; ctx.police.totalCrimes = d.police.totalCrimes || 0; }
  return true;
}

export function clearSave() {
  try { localStorage.removeItem(KEY); return true; } catch (e) { return false; }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}
