# VICEHAVEN — *Ten and Two*

An original open-world crime game that runs straight in **Microsoft Edge**:
no install, no server and no build step. Everything you see and hear (the
city, its cars and people, the guns, the radio, every voice line) is
generated from code when the page loads.

Three years ago Jay Mercer, the best getaway driver Vicehaven ever had,
drove away from a job that left his girlfriend's little brother dead in
bay 14 at Pier 9. He has come home to bury his grandmother. Her house is
padlocked, his mentor is about to walk out of prison, and a developer is
buying the city block by block with money Jay once helped steal.

- **The story:** 31 main jobs in four acts, four side stories of four jobs
  each, five big choices that change who lives, who leaves and how it ends,
  and three endings: over 7,000 lines of dialogue, about 5½ hours of story
  and 2¼ hours of side stories.
- **Between jobs:** 25 taxi fares, 6 street races, 10 cars on Dex's list,
  8 bounties, 5 turf wars, 12 stunt jumps and 30 hidden lanterns.
- **The city:** downtown towers, Old Market alleys, Palm Crescent's pastel
  streets, the Harbor Point boardwalk and pier, the Saltmarsh container port
  and the walled mansions of Crestline Estates, with a running day and night.
- **18 cars, 11 weapons, police with five heat levels and a helicopter,
  traffic that obeys the lights, crowds that run, three radio stations.**

---

## Running it in Microsoft Edge

**Easiest: the single file.** `vicehaven/dist/vicehaven.html` is the whole
game in one HTML file (every script, stylesheet and three.js inlined).
Download it anywhere (your Downloads folder, a USB stick) and double-click
it. It needs nothing else and works offline.

**Or run the source folder** (this is what you edit):

1. Download or clone this repository and find the **`vicehaven`** folder.
2. **Double-click `vicehaven/index.html`.** If Windows opens it in a
   different browser, right-click it → **Open with** → **Microsoft Edge**.
3. Wait a few seconds while the city is built, then click **New Game**.
4. Click inside the game if the mouse isn't captured. **Esc** releases the
   mouse and pauses.

**Saving.** The game saves after every job (and from the pause menu) in the
browser's storage for that file. **Continue** on the title screen picks up
where you left off. Opening the same file in the same browser keeps your
save; a different browser or a private window starts fresh.

**Voices.** Dialogue is read aloud by the browser's built-in speech voices.
Edge has natural-sounding voices on Windows 10 and 11. Turn voices off under
**Settings → Gameplay → Voiced dialogue**; subtitles are always available.
**Settings → Accessibility → Strong language** bleeps the swearing.

**If you see "Your browser can't run 3D graphics right now":** open
`edge://settings/system`, turn on *Use graphics acceleration when
available*, restart Edge, and check `edge://gpu` says WebGL2 is hardware
accelerated.

### Quality and performance

On first launch the game picks a preset from your graphics hardware: *High*
for dedicated GPUs, *Medium* for integrated graphics such as Intel Iris Xe.
Change it under **Settings → Graphics**:

| Preset | Resolution | Shadows | Draw distance | Traffic | Post-processing | Good for |
|--------|-----------:|---------|--------------:|--------:|-----------------|----------|
| Low    | 75 %       | off     | 520 m         | 10 cars | off             | older laptops |
| Medium | 90 %       | 1024², 55 m | 720 m     | 15 cars | bloom + grade   | integrated graphics |
| High   | 100 %      | 2048², 85 m | 950 m     | 20 cars | full + grain    | most gaming PCs |
| Ultra  | 100 % (up to 2× HiDPI) | 4096², 120 m | 1400 m | 26 cars | full + grain | fast GPUs |

**Resolution scale** is the biggest lever if the frame rate is low;
**Post-processing → Off** is the next. The FPS counter can be switched on
in Settings.

---

## Controls

**On foot**

| Key | Action |
|-----|--------|
| **W A S D** | Move |
| **Mouse** | Look |
| **Shift** (hold) | Sprint |
| **Space** | Jump; climbs ledges up to 1.7 m and vaults low walls |
| **Ctrl** or **C** | Crouch (toggle) |
| **Caps Lock** | Walk (toggle) |
| **E** | Talk, start a job (walk into the glowing marker), use things. On a failed job, **E** retries |
| **F** | Get in a car (or drag the driver out) / get out |
| **V** · **mouse wheel** · **B** | Camera mode · distance · look behind |

**Fighting**

| Key | Action |
|-----|--------|
| **Right mouse** (hold) | Aim |
| **Left mouse** | Fire, swing or throw |
| **R** | Reload |
| **Tab** (hold) | **Weapon wheel**: the world slows down; point at a weapon and let go |
| **1 – 8** | Pick a weapon slot directly |

**Driving**

| Key | Action |
|-----|--------|
| **W / S** | Accelerate / brake and reverse |
| **A / D** | Steer |
| **Space** | Handbrake (hold it into a corner to drift) |
| **Shift** | Nitro |
| **F** | Get out (at speed Jay bails out and rolls) |
| **H** · **G** | Horn · headlights (siren in a police car) |
| **R** | Next radio station |
| **Right mouse + left mouse** | Shoot out of the window |
| **P** | In a cab: taxi duty on or off |
| **V** | Chase camera · far chase · bonnet |

**Anywhere:** **M** opens the city map (jobs, places, the GPS route),
**Space** or **Enter** skips a line in a cutscene, **1 / 2 / 3** answer a
choice, **Esc** pauses (map, job log, save, settings).

Every key can be rebound under **Settings → Controls**. **Controllers**
(Xbox, PlayStation and most others) work automatically: sticks move and
look, RT accelerates and LT brakes in a car, RT fires and LT aims on foot,
A jumps, Y talks and gets in and out of cars, the D-pad does taxi duty
(up), horn (down) and lights (left), and Menu pauses. **Aim assist** (on by default,
stronger on a controller) pulls near misses onto an enemy.

---

## The story

*Ten and Two* is told across four acts over seven weeks at the end of
hurricane season. The first job starts by itself right after **New Game**.
After that, jobs appear as glowing markers and icons on the map. Walk into
one and press **E**. **Esc → Job log** lists what's open, what's done, and
what each job is about.

| Act | Jobs | What it's about |
|-----|-----:|-----------------|
| **1 · Homecoming** | 8 | The funeral, the padlocked house, a new crew, the toolbox with the old cut in it |
| **2 · Old Engines** | 8 | Augie gets out, the vault in the churchyard, the councilman's pool, the Starlite booth |
| **3 · The Tally** | 8 | A canary trap, the top of the Crown, the first letter, two-ten, LUGNUT |
| **4 · Tidewater** | 7 | Jay plans a job for the first time. One night, one convoy, one pier at dawn |

**Side stories** unlock as the main story goes on: *Night Shift* (riding
nights with Mae on Medic 12), *The Silver Foxes* (three robbers in their
seventies and one last job), *Dead Air* (a pirate DJ and the city's voice)
and *The Wedding Car* (a chauffeur, his late wife's car, and his
granddaughter's wedding). Each one changes something about the endings.

**Choices.** Five decisions are remembered for the rest of the game: what
Jay does with the money in the toolbox, whether he trusts the detective,
who he saves at the top of the Crown, what happens to Dex, and what he asks
Mae. They change scenes, who turns up when it counts, and which of the
three endings you can reach.

**Failing.** If a job fails (Jay is arrested or knocked out, someone who
matters dies, the cops notice a quiet job), press **E** to retry, from the
last checkpoint if there was one.

### Between jobs

- **Taxi fares** (after *Ten and Two*). Get in any cab and press **P**.
  Pick up a fare, get them there before the meter runs out, and hear their
  story. 25 passengers, some of whom only turn up later in the story.
- **Street races** (after *Tick Tock*). Six races from Heron Corner to
  Crestline. Win all six for a gold Drifter.
- **Dex's list** (after *The Toolbox*). Ten cars somebody wants. Steal them
  and bring them in without a scratch.
- **Bounties** (after *Sons*). Honor Blackwood of Blackwood Bail Bonds has
  eight people who skipped bail. Each one is a story of its own.
- **Turf wars** (after *Sons*). Hold a street against Halberd's crews.
  Winning changes the street (and what the radio says about it).
- **Stunt jumps.** Twelve ramps around the docks, building sites and the
  outskirts. Hit one fast for a slow-motion jump.
- **Lanterns.** Thirty red paper lanterns hidden around the city.

---

## What's in the city

**Vehicles.** 18 cars, from the Pipit hatchback to the Bulwark armoured van
and Nana Lu's long teal Duchess. Each has its own handling: a tyre model
with grip, slip and drift, weight transfer, gears, and suspension that
leaves the ground on ramps. Cars dent, smoke, catch fire and explode.
Street lights, hydrants, bollards, benches, bins and barriers break when
you hit them. Nitro,
skid marks and tyre smoke come with every car.

**Traffic and people.** Traffic drives on the right, keeps its lane, stops
at red lights, queues, overtakes parked cars and honks at you. Pedestrians
walk the blocks, wait at crossings, and scatter from gunfire and
pavement-driving.

**Police.** Crimes that someone sees raise your heat (1–5). Patrol cars
chase and try to box you in, officers shoot from heat 3, roadblocks go up,
and from heat 4 a helicopter's searchlight follows you. Break line of sight
and get out of the search area to lose them. Getting caught costs a fine
and your ammo; getting knocked out costs a hospital bill.

**Weapons.** Fists, a baseball bat, a combat knife, the Kestrel 9 pistol,
the Hammerhead .44, the Wasp SMG, the Gator 12 shotgun, the Mantis AC-7
rifle, the Heron LR sniper rifle, frag grenades and molotovs. Guns have
recoil, spread that grows as you fire, damage that falls off with range,
and headshots. Enemies take cover, flank and shoot back.

**The radio.** Three stations of original, procedurally composed music:
**VHR 88.1 Sunset Drive** (synthwave, with Del Starr), **Pulse 96.4**
(house, with Benji Blue) and **Harbor Heat 103.7** (dark beats, with Sable).
Between songs the hosts talk, and they react to what you've done.

**Time and light.** The clock runs (a full day is about 24 minutes) unless
you fix the time in Settings. Night brings street-light pools, headlights,
lit windows and neon. Jobs set their own hour.

---

## Developer overlay (F8)

Shows FPS, draw calls, memory, Jay's position and state. Press **Enter** to
type a command:

| Command | Does |
|---------|------|
| `help` | List commands |
| `tp <x> <z>` or `tp plaza\|park\|tower\|pier\|boardwalk\|market\|downtown\|palm\|harbor\|yard\|roof` | Teleport |
| `car <type>` | A car beside Jay (`car` alone lists the types) |
| `give <weapon\|all>` | Weapons and ammo |
| `heat <0-5>` | Set the police heat |
| `job <id>` · `pass <id>` · `complete` | Start a job · mark jobs up to that one done · pass the current job |
| `flag <name>` | Set a story flag (for example `flag saved_teo`) |
| `spawn <faction>` | An enemy in front of Jay |
| `noclip` · `god` · `heal` · `money <n>` · `armor <n>` | The usual |
| `time <0-24>` · `clouds <0-1>` · `fov <deg>` · `quality <preset>` | World and graphics |

`VH.game` is also available from the browser's own console (F12).

---

## How it's built

```
vicehaven/
├── index.html              page shell, loading and error screens, script order
├── css/                    style, hud, menus, map, dialogue, weapon wheel
├── js/
│   ├── lib/three.min.js    three.js r186 as a classic script (MIT)
│   ├── core.js · settings.js · input.js        namespace, events, maths; options; keyboard/mouse/pad
│   ├── renderer.js · postfx.js · environment.js   WebGL2, HDR bloom and grade, sky, sun, clock
│   ├── geometry.js · textures.js · materials.js    merged meshes, procedural textures, shaders
│   ├── physics.js · roadnet.js                     collision world; lanes, junctions and signals
│   ├── citygen.js · buildings.js · props.js · signs.js · landmarks.js · construction.js
│   ├── outskirts.js        Saltmarsh docks (Pier 9, the cranes, the freighter) and Crestline Estates
│   ├── world.js            turns the layout into chunked meshes, colliders and props
│   ├── humanoid.js · player.js · camera.js · crowd.js    people, Jay, the camera, the crowds
│   ├── vehicles/           carmodels (18 cars), vehicle (physics), vehicles (spawning, collisions),
│   │                       traffic (lane AI), feedback (smoke, skids, lights, sound)
│   ├── weapons-data.js · weapons-models.js · combat.js · ui-wheel.js   guns, fighting, the wheel
│   ├── police.js · fx.js   heat, pursuit, helicopter; particles, explosions, light pools
│   ├── audio.js · audio-drive.js · audio-weapons.js    synthesised sound, engines, the radio
│   ├── dialogue.js · places.js · missions.js · activities.js   voices and subtitles; story places;
│   │                       the mission engine and save system; the jobs between jobs
│   ├── data/               districts, challenges, weapons, the story (story.js = cast, places,
│   │                       factions; story-act1…4*.js = the jobs, by act; story-extras.js = fares, races,
│   │                       bounties, turf wars, texts, radio hosts)
│   ├── minimap.js · hud.js · ui.js · debug.js · main.js
├── docs/STORY_BIBLE.md     the whole story: characters, timeline, every job, choices, endings
├── docs/mission-format.md  the data format the story is written in
├── dist/vicehaven.html     the single-file build (generated; don't edit it)
└── tools/
    ├── bundle.mjs          builds dist/vicehaven.html (plain Node, no packages)
    ├── validate-story.mjs  checks the story data (ids, places, cars, flags) and counts it
    └── smoke.mjs           optional automated test (Node + Playwright)
```

**The single-file build.** `node vicehaven/tools/bundle.mjs` inlines every
local stylesheet and script into `dist/vicehaven.html`. Run it after
changing any source file.

**Why classic scripts and not ES modules?** Edge blocks `import` on pages
opened from `file://`. Each file is an IIFE that adds one thing to the
global `VH` namespace, and `index.html` loads them in order.

**The story is data.** Every job is a list of steps (`scene`, `goto`,
`chase`, `choice`, `blackout`, `survive`…) in `js/data/story-act*.js`. The
mission engine turns them into gameplay, objectives, cutscenes, phone calls
and checkpoints. `node vicehaven/tools/validate-story.mjs --summary` checks
it all and counts the lines. See `docs/mission-format.md`.

World conventions: metres and seconds; +Y is up, +X is east, −Z is north.

---

## Testing checklist

- [ ] `dist/vicehaven.html` opens by double-click with no other files beside it
- [ ] New Game: the cold open plays, then Jay is in Civic Plaza and Dex is on the phone
- [ ] Steal a car (F next to it; F again by an occupied car drags the driver out)
- [ ] Drive: accelerate, brake, reverse, handbrake drift, nitro (Shift), crash, smoke, fire
- [ ] The radio plays in a car; R changes station; a host talks between songs
- [ ] Traffic stops at red lights; pedestrians wait at crossings and run from gunfire
- [ ] Get to St. Brigid's for the funeral; cutscenes letterbox; Space skips a line
- [ ] Shoot (aim with right mouse); hold Tab for the weapon wheel; R reloads
- [ ] Commit a crime in front of a police car: heat rises, police chase; lose them
- [ ] Fail a job (die or get caught) and retry with E
- [ ] Esc → Save game; reload the page; Continue resumes with the same jobs done
- [ ] M opens the map with job icons and the route
- [ ] In a cab, P starts taxi duty and a fare tells you their story
- [ ] Night falls: street-light pools, headlights, lit windows, the helicopter's searchlight
- [ ] Settings change live and persist (quality presets, voices, strong language)

For developers, the automated checks need Node.js and Playwright:

```bash
node vicehaven/tools/validate-story.mjs --summary   # story data: 0 problems expected
node vicehaven/tools/smoke.mjs                      # boots the game from file:// and plays it
node vicehaven/tools/bundle.mjs && TARGET=dist node vicehaven/tools/smoke.mjs   # test the single file
```

---

## Known limitations

- **No interiors, swimming, boats, motorbikes or aircraft for Jay.** Indoor
  moments in the story are told on a black screen with text and voices.
- **Voices depend on the browser.** Edge on Windows sounds best. Without
  installed voices the game shows subtitles only.
- **Sound needs one click or key press first.** Browsers don't allow a
  page to play audio before that.
- **Ctrl+W can't be blocked outside fullscreen** (it closes the tab). The
  game asks before closing while you're playing.
- **Software rendering.** If Edge falls back to software WebGL (no working
  GPU driver) the game runs, but at a few frames per second.
