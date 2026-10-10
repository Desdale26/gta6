/*
 * tools/save-test.mjs — optional developer check. NOT needed to play.
 *
 * Checks that progress survives closing the tab: it plays a little, closes
 * the page the way a person does (beforeunload, then pagehide), opens the
 * game again in the same browser profile and presses Continue.
 *
 *   node vicehaven/tools/save-test.mjs
 *   TARGET=dist node vicehaven/tools/save-test.mjs   (tests dist/vicehaven.html)
 *
 * Each case plays a few seconds so an autosave lands before the tab closes:
 * that is what a person does, and on a busy machine the save made during the
 * close itself isn't guaranteed to reach the disk.
 *
 * Cases: free roam, sitting in a car, switching to another tab, the timed
 * autosave, quitting in the middle of a job (the save keeps the state from
 * before the job and its marker comes back), quitting while a chained
 * finale job was about to start, and closing from the title screen (which
 * must not overwrite anything), and the game open in two tabs (the older tab
 * must not overwrite the newer one's progress).
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}
const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.env.TARGET === 'dist' ? path.join(here, '..', 'dist', 'vicehaven.html') : path.join(here, '..', 'index.html');
if (!fs.existsSync(file)) {
  console.log('[save] ' + file + ' does not exist');
  process.exit(1);
}
const url = pathToFileURL(file).href;
const KEY = 'vicehaven.save.v1';

const problems = [];
const log = (...a) => console.log('[save]', ...a);
const check = (cond, msg, extra) => {
  if (cond) log('ok  -', msg);
  else {
    problems.push(msg);
    log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra) : '');
  }
};

// A real on-disk browser profile, like Edge's: an in-memory (incognito) test
// context can drop a file page's storage while no tab has it open.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vicehaven-save-'));
const ctx = await playwright.chromium.launchPersistentContext(profile, {
  headless: true,
  executablePath: process.env.CHROMIUM || undefined,
  viewport: { width: 960, height: 540 },
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'],
});
await ctx.addInitScript(() => {
  try {
    if (!localStorage.getItem('vicehaven.settings.v1')) localStorage.setItem('vicehaven.settings.v1', JSON.stringify({ version: 1, graphics: { quality: 'low' } }));
  } catch (e) { /* ignore */ }
});
const errors = [];

async function open() {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', (d) => d.accept()); // "Leave site?" from the confirm-close setting
  await page.goto(url);
  await page.waitForFunction(() => window.VH && VH.game && VH.game.state === 'title', null, { timeout: 300000 });
  await page.evaluate(() => VH.game.freeze(true));
  return page;
}
/**
 * Close the tab like a person: runs beforeunload (and the prompt), then
 * pagehide. A person never closes the tab within a split second of a burst
 * of scripted work; doing that in headless Chromium can drop the last
 * storage writes, so wait a moment first.
 */
async function closeTab(page) {
  await page.waitForTimeout(3000);
  const closed = new Promise((r) => page.once('close', r));
  await page.close({ runBeforeUnload: true });
  await closed;
}
const readSave = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const near = (a, b, d = 1.5) => a && b && Math.hypot(a.x - b.x, a.z - b.z) < d;
const cont = (page) => page.evaluate(() => {
  const g = VH.game;
  g.continueGame();
  g.advance(3); // the "Welcome back" intro, then playing
  return { state: g.state, money: g.player.money, pos: { x: g.player.pos.x, z: g.player.pos.z }, car: g.player.vehicle ? g.player.vehicle.type : null, run: g.missions.run ? g.missions.run.m.id : null };
});

// ------------------------------------------------------------------ 1. free roam
let page = await open();
await page.evaluate((k) => localStorage.removeItem(k), KEY);
const p1 = await page.evaluate(() => {
  const g = VH.game;
  g.noAutoStory = true;
  g.newGame();
  g.advance(3);
  g.player.teleport(-51, 86, 1.2);
  g.player.money = 777;
  g.advance(22); // a little play: the timed autosave lands
  return { state: g.state, x: g.player.pos.x, z: g.player.pos.z };
});
check(p1.state === 'playing', 'new game reaches free roam', p1);
await closeTab(page);
page = await open();
let s = await readSave(page);
check(s && s.money === 777 && near(s.pos, p1), 'play a little, close the tab: money and position are saved', s && { money: s.money, pos: s.pos });
let c = await cont(page);
check(c.state === 'playing' && c.money === 777 && near(c.pos, p1), 'Continue puts Jay back where he was', c);

// ------------------------------------------------------------------ 2. in a car
const p2 = await page.evaluate(() => {
  const g = VH.game;
  g.player.teleport(-51, 86, Math.PI / 2);
  g.vehicles.spawn('halcyon', -51, 90.6, -Math.PI / 2, { persistent: true });
  g.advance(0.2);
  const t = g.vehicles.findEnterable(g.player.pos.x, g.player.pos.z, 6);
  if (t) g.vehicles.beginEnter(t);
  g.advance(6); // getting in saves within a few seconds
  return { car: g.player.vehicle ? g.player.vehicle.type : null, stolen: g.player.stats.carsStolen };
});
check(p2.car === 'halcyon', 'Jay got into a car', p2);
await closeTab(page);
page = await open();
s = await readSave(page);
check(s && s.vehicle && s.vehicle.type === 'halcyon', 'the save remembers the car', s && s.vehicle);
c = await cont(page);
check(c.car === 'halcyon', 'Continue puts Jay back in the same car', c);
const twin = await page.evaluate(() => {
  const g = VH.game;
  g.advance(1);
  const v = g.player.vehicle;
  return { stolen: g.player.stats.carsStolen, close: g.vehicles.list.filter((o) => o !== v && Math.hypot(o.pos.x - v.pos.x, o.pos.z - v.pos.z) < 3).length };
});
check(twin.close === 0, 'no parked car appears on top of the restored car', twin);
check(twin.stolen === p2.stolen, 'getting back into the car is not counted as a theft', { before: p2.stolen, after: twin.stolen });

// ------------------------------------------------------------------ 3. switching tabs
const hidden = await page.evaluate((k) => {
  const g = VH.game;
  g.vehicles.exitVehicle();
  g.advance(2);
  g.player.money = 4321;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  const save = JSON.parse(localStorage.getItem(k));
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  return { money: save.money, state: g.state };
}, KEY);
check(hidden.money === 4321 && hidden.state === 'paused', 'switching away saves and pauses', hidden);

// ------------------------------------------------------------------ 4. timed autosave
const timed = await page.evaluate((k) => {
  const g = VH.game;
  g.resume();
  g.player.money = 9999;
  g.advance(50);
  return JSON.parse(localStorage.getItem(k)).money;
}, KEY);
check(timed === 9999, 'autosaves on its own while playing', timed);
const soon = await page.evaluate((k) => {
  const g = VH.game;
  g.advance(1);
  g.giveMoney(250, 'test'); // earning money saves within a few seconds
  g.advance(4);
  return JSON.parse(localStorage.getItem(k)).money;
}, KEY);
check(soon === 10249, 'earning money saves within a few seconds', soon);

// ------------------------------------------------------------------ 4b. police heat
await page.evaluate(() => {
  const g = VH.game;
  g.police.setLevel(3, 'test');
  g.police._sawPlayer();
  g.advance(0.5);
  g._autoSaveSoon();
  g.advance(4);
});
await closeTab(page);
page = await open();
c = await cont(page);
const heat = await page.evaluate(() => VH.game.police.level);
check(heat === 3, 'closing the tab during a chase does not lose the police', heat);
await page.evaluate(() => VH.game.police.reset());

// ------------------------------------------------------------------ 4c. failed attempt rolls back
const rb = await page.evaluate(() => {
  const g = VH.game;
  const eng = g.missions;
  g.player.money = 2000;
  eng.start(eng.all.get('m01_homecoming'));
  g.advance(1);
  eng.flags.test_choice = true; // a choice made during the attempt
  eng._reward({ money: 500 }, true);
  eng.run.midMoney = (eng.run.midMoney || 0) + 500;
  eng.fail('test');
  g.advance(0.5);
  return { flag: !!eng.flags.test_choice, money: g.player.money };
});
check(!rb.flag && rb.money === 2000, 'a failed attempt leaves no choices or mid-job money behind', rb);

// ------------------------------------------------------------------ 5. mid-job
const p5 = await page.evaluate(() => {
  const g = VH.game;
  g.police.reset();
  g.player.teleport(6, 70, 0);
  g.player.money = 1500;
  g.advance(0.3);
  const before = { x: g.player.pos.x, z: g.player.pos.z, money: g.player.money };
  g.missions.start(g.missions.all.get('m01_homecoming'));
  g.advance(4);
  g.player.money = 3; // mid-job changes must not reach the save
  g.advance(22); // an autosave lands mid-job
  return { before, run: g.missions.run ? g.missions.run.m.id : null };
});
check(p5.run === 'm01_homecoming', 'a job is running', p5);
await closeTab(page);
page = await open();
s = await readSave(page);
check(s && s.interrupted === 'm01_homecoming' && s.money === 1500 && near(s.pos, p5.before), 'quitting mid-job keeps the state from before the job', s && { interrupted: s.interrupted, money: s.money, pos: s.pos });
c = await cont(page);
const m5 = await page.evaluate(() => ({ markers: VH.game.missions.markers.map((m) => m.m.id), notes: Array.from(document.querySelectorAll('.notify')).map((e) => e.textContent).join(' | ') }));
check(c.run === null && c.money === 1500, 'Continue after a mid-job quit is back in free roam with the old money', c);
check(m5.markers.includes('m01_homecoming'), 'the interrupted first job has a marker to restart it', m5.markers);
check(/left off/i.test(m5.notes), 'a note says the job will start again', m5.notes.slice(0, 200));

// ------------------------------------------------------------------ 6. chained finale
const p6 = await page.evaluate(() => {
  const g = VH.game;
  const m = g.missions;
  // Everything up to the garden party is done; the next job starts by itself.
  for (const j of m.main) {
    if (j.id === 'm29_tidewater_again') break;
    m.completed[j.id] = true;
  }
  m.flags.ending_path = 'test';
  m.refreshMarkers();
  m._chainPending = 'm29_tidewater_again'; // the 4-second gap after the previous job
  m.refreshMarkers();
  g._autoSaveSoon();
  g.advance(4);
  return { pending: m.markers.some((k) => k.m.id === 'm29_tidewater_again') };
});
check(!p6.pending, 'no marker while the chained job is about to start', p6);
await closeTab(page);
page = await open();
c = await cont(page);
const m6 = await page.evaluate(() => VH.game.missions.markers.map((m) => m.m.id));
check(m6.includes('m29_tidewater_again'), 'after a quit, the chained finale job has a marker', m6);

// ------------------------------------------------------------------ 7. failed chained job
await page.evaluate(() => {
  const g = VH.game;
  g.police.reset();
  g.missions.start(g.missions.all.get('m29_tidewater_again'));
  g.advance(2);
  g.missions.fail('test');
  g.advance(20); // the retry window runs out
});
await page.waitForTimeout(2500); // markers come back on a real-time timer
const m7 = await page.evaluate(() => VH.game.missions.markers.map((m) => m.m.id));
check(m7.includes('m29_tidewater_again'), 'a failed chained job can be started again from its marker', m7);

// ------------------------------------------------------------------ 8. title screen
const before8 = await page.evaluate(() => {
  const g = VH.game;
  g.quitToTitle();
  return { state: g.state };
});
check(before8.state === 'title', 'quit to title');
const saved8 = await readSave(page);
await page.evaluate((k) => {
  const d = JSON.parse(localStorage.getItem(k));
  d.money = 31337;
  localStorage.setItem(k, JSON.stringify(d));
}, KEY);
await closeTab(page);
page = await open();
s = await readSave(page);
check(saved8 && s && s.money === 31337, 'closing from the title screen leaves the save alone', s && s.money);
await closeTab(page);

// ------------------------------------------------------------------ 9. two tabs
// An old tab must not overwrite newer progress made in another one.
const tabA = await open();
await cont(tabA);
await tabA.evaluate(() => { VH.game.player.money = 100; VH.game._autoSave(); VH.game.pause(); });
const tabB = await open();
await cont(tabB);
const b9 = await tabB.evaluate(() => { VH.game.player.money = 99999; return VH.game._autoSave(); });
check(b9, 'the newer tab saves');
await tabB.waitForTimeout(2000);
await closeTab(tabA); // its unload handlers try to save its old state
await tabB.waitForTimeout(1000);
const m9 = await tabB.evaluate((k) => JSON.parse(localStorage.getItem(k)).money, KEY);
check(m9 === 99999, 'closing an older tab keeps the newer progress from the other tab', m9);
await closeTab(tabB);

const real = errors.filter((e) => !/favicon|ERR_FILE_NOT_FOUND/.test(e));
check(real.length === 0, 'no page errors', real.slice(0, 5));
await ctx.close();
fs.rmSync(profile, { recursive: true, force: true });
if (problems.length) {
  log(problems.length + ' problem(s)');
  process.exit(1);
}
log('all save checks passed');
