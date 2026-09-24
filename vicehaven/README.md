# VICEHAVEN

An original open-world action game built to run straight in **Microsoft
Edge**: no install, no server and no build step. Everything you see (the
city, its textures, its signs, even Jay Mercer) is generated from code when
the page loads.

This is **Phase 1 — Foundation**: the engine, a playable downtown test city
and Jay on foot, plus a first *fun pass*: a cinematic look (HDR bloom and
colour grading), fully synthesised sound and music, and two timed
challenges with medals, rewards and a ghost of your best run. Vehicles,
traffic, crowds, combat, police and missions are built on top of it in later
phases.

---

## Running it in Microsoft Edge

**Easiest: the single file.** `vicehaven/dist/vicehaven.html` is the whole
game in one 1.2 MB HTML file (every script, stylesheet and three.js inlined).
Download it anywhere, for example your Downloads folder or a USB stick, and
double-click it. It needs nothing else and works offline.

**Or run the source folder** (this is what you edit):

1. Download or clone this repository and find the **`vicehaven`** folder.
2. **Double-click `vicehaven/index.html`.** If Windows opens it in a different
   browser, right-click it → **Open with** → **Microsoft Edge** (or drag the
   file onto an Edge window).
3. Wait a couple of seconds while the city is built (the loading bar shows
   each step), then click **New Game**.
4. Click inside the game once if the mouse isn't captured. **Esc** releases
   the mouse and pauses.

That's it. The game works fully offline: three.js is bundled in
`js/lib/three.min.js`.

**Optional (a local web server).** The game doesn't need one, but it runs
just the same from any static server, for example
`npx http-server vicehaven` or `python -m http.server` inside the folder.

**If you see "Your browser can't run 3D graphics right now":** open
`edge://settings/system`, turn on *Use graphics acceleration when available*,
restart Edge, and check `edge://gpu` says WebGL2 is hardware accelerated.

### Quality and performance

On first launch the game picks a preset from your graphics hardware: *High*
for dedicated GPUs, *Medium* for integrated graphics such as Intel UHD or
Iris Xe. Change it under **Settings → Graphics**:

| Preset | Resolution | Shadows | Draw distance | Anti-aliasing | Post-processing | Good for |
|--------|-----------:|---------|--------------:|---------------|-----------------|----------|
| Low    | 75 %       | off     | 520 m         | off           | off             | older laptops |
| Medium | 90 %       | 1024², 55 m | 720 m     | off           | bloom + grade   | integrated graphics |
| High   | 100 %      | 2048², 85 m | 950 m     | on (4× MSAA)  | full + grain    | most gaming PCs |
| Ultra  | 100 % (up to 2× HiDPI) | 4096², 120 m | 1400 m | on  | full + grain    | fast dedicated GPUs |

**Resolution scale** is the biggest single lever if the frame rate is low;
**Post-processing → Off** is the next.
The FPS counter sits in the top-left (toggle it in Settings).

---

## Controls

| Key | Action |
|-----|--------|
| **W A S D** | Move (relative to the camera) |
| **Mouse** | Look around |
| **Shift** (hold) | Sprint |
| **Space** | Jump. Next to a ledge up to 1.7 m it **climbs**; running at a low wall it **vaults** |
| **Ctrl** or **C** | Crouch (toggle) |
| **Caps Lock** | Walk (toggle) |
| **Right mouse** (hold) | Aim: tight over-the-shoulder camera, crosshair, guard up |
| **V** | Camera: close → far → first person |
| **Mouse wheel** | Camera distance |
| **B** (hold) | Look behind |
| **E** | Interact: vending machines, the city guide kiosk, challenge start markers. On a results card, **E** retries |
| **Esc** | Pause menu (resume with the button or **Enter**) |
| **F8** | Developer overlay and console |

Keys for later systems (F, R, Tab, M, P, H, G, 1–6) are already bound, and
pressing them now tells you which phase adds that feature. Every key can be
rebound under **Settings → Controls** (right-click a key there to clear it).

**Controllers.** Xbox, PlayStation and most other gamepads work
automatically through the browser Gamepad API: left stick moves, right stick
looks, A/Cross jumps, B/Circle crouches, L3 sprints, LT aims, RB changes the
camera, Y/Triangle interacts, Menu/Options pauses.

**About Ctrl.** Browsers reserve Ctrl+W to close the tab, and a web page
can't block that. That's why crouch is a *toggle* (tap Ctrl, then walk), why
**C** also crouches, and why the game asks before the tab closes while you're
playing. Fullscreen mode (Settings → *Toggle fullscreen*) lets Edge hand those
keys to the game.

---

## What's in Phase 1

**The city.** Nine avenues by nine streets of downtown Vicehaven, with 430
procedurally generated buildings in four districts that each look different:

- **Downtown / Grand Avenue.** Glass towers on podiums with setbacks, crowns
  and masts, and the 300 m **Vicehaven Tower**.
- **Old Market.** Brick shophouses with striped awnings, water tanks and
  service alleys with dumpsters.
- **Palm Crescent.** Pastel apartments with balconies, villas with gable
  roofs and garden walls, and **Founders Park** with a fountain and gazebo.
- **Harbor Point.** Art-deco style hotels, the timber **boardwalk**, the
  seawall and **Oceanview Pier** reaching out into the bay.

Roads are properly marked (double yellow centre lines, dashed lane dividers,
stop lines and zebra crossings), with working traffic signals that cycle.
Kerbs are real 15 cm steps, and there are street lights, palms, trees,
benches, bins, hydrants, bollards, car parks and alleys. Windows are drawn by
a shader, so they stay crisp at any distance and light up at night.

**Civic Plaza** is where Jay starts, and it doubles as a movement test
ground: stairs and a ramp up to a terrace, crates of 0.5–2 m to climb, vault
walls of 0.6/1.0/1.4 m, a 3.4 m wall you can only reach from the top crate,
two Sunfizz vending machines (−$2, +15 health) and a city guide kiosk.

**Jay Mercer.** A jointed, procedurally animated character with walk, run,
sprint, crouch, jump, fall, land, climb, vault and a guard pose. Movement
builds up and slows down instead of snapping. It also has coyote time and
jump buffering, step-up over kerbs and stairs, mid-air ledge grabs, fall
damage, a knock-out and respawn, and slow health regeneration up to 50 %.

**Camera.** Smoothed third-person orbit with collision, so it slides in
front of walls rather than through them. Also an over-the-shoulder aim
camera, close/far/first-person modes, zoom, look-behind, sprint FOV kick and
landing shake (can be turned off).

**Light and sky.** A physically based renderer. It has a procedural sky
with drifting clouds, a late-afternoon sun with shadows that follow Jay
(their bias adapts as the sun gets low, so long shadows stay clean), sky
reflections on glass and water, height-matched fog so distant buildings melt
into the horizon, and an animated water shader for the bay. Shop fronts glow
warm from inside. The clock is held at 16:18 for this phase (see *Known
limitations*).

**The look (post-processing).** The scene is rendered in HDR and finished
in `postfx.js`: a five-level bloom so the sun, lamps, lit windows and glints
on the water glow instead of clipping; ACES filmic tone mapping; a colour
grade with cool shadows and warm highlights; a vignette; and fine film grain
at High. Checkpoint gates and medals flash the screen briefly (turned down
by *Reduce flashing*).

**Sound.** Everything is synthesised live with Web Audio; there isn't a
single audio file. There's a city hum, wind that rises when you're high up
or sprinting, surf and gulls near the bay and the odd distant horn.
Footsteps change with what's underfoot: concrete, asphalt, grass, wood,
metal and gravel. Jumps, landings (heavier for bigger drops), climbs and
purchases have their own sounds. During challenges a tension track plays
whose drums, bass and arpeggio build as time runs out. The volume sliders
(master, music, effects, ambience) work live.

**Meridian Yard.** A construction site just west of Civic Plaza, with
shipping containers, scaffolding, a half-built steel frame, a tower crane
on its own foundations, floodlights, cones and barriers.

**Challenges.** Walk into a glowing start marker and press **E**. The screen
fades, you're placed on the line, and after *3-2-1-GO* the clock runs. Each
run has checkpoint gates with split times and a direction marker on the HUD
that shows the distance to the next gate, even through walls.

- **Yard Run** (Meridian Yard, free-run, clock counts up). Vault the
  barriers, leap the gap between containers, climb the scaffold, cross a
  steel beam half a metre wide nine metres up, then sprint-jump a 3 m gap
  between the frame's top floors. Fall and you go back to the last
  checkpoint with +3 s. Gold under 0:36, silver under 0:46, bronze under
  1:02.
- **Courier Rush** (Civic Plaza → the end of Oceanview Pier, countdown).
  You start with 32 seconds, and every checkpoint adds a few more. The
  route runs over the terrace wall, past Vicehaven Tower, along the avenues
  and down the pier. Under ten seconds the clock turns amber and starts
  ticking; under five it goes red and the ticks get sharper. Gold with 18 s left, silver with 10, bronze for just making it.

Medals pay out $100 / $250 / $500 (Courier Rush $150 / $400 / $750). Each
reward pays once: beating silver after bronze pays the difference. Your
best time, medal and splits are saved in the browser. The best run is
recorded and races you as a **translucent ghost** on every retry. The
results card shows your time, your medal, the next medal's target, the
splits against your best and falls or time left. **Esc → Abandon challenge**
quits a run.

**Interface.** Loading screen, title screen (a slow orbit over the city),
intro title card, HUD (money, health and armour, location readout with place
· street · district, district banners, notifications, interaction prompts,
crosshair, FPS), a *Getting started* checklist that ticks off as you try
each move, pause menu, statistics, credits, and a full settings screen.
Settings covers graphics, gameplay, audio levels, accessibility (text size,
colour-blind friendly HUD, reduced flashing, camera shake, subtitle options)
and key rebinding. Settings save automatically in the browser.

---

## Developer overlay (F8)

Shows FPS and a frame-time graph, draw calls, triangles, GPU memory
counters, the JS heap, Jay's position, speed and state, district and street,
and world counts. While playing, press **Enter** to type a command:

| Command | Does |
|---------|------|
| `help` | list commands |
| `tp <x> <z>` or `tp plaza\|park\|tower\|pier\|boardwalk\|market\|downtown\|palm\|harbor\|yard\|roof` | teleport. It lands on the highest surface, so `tp` into a building puts you on its roof; `tp roof` picks the nearest low one |
| `noclip` | fly (WASD, Space up, Ctrl down, Shift fast) |
| `god` | no damage |
| `heal` / `hurt <n>` / `armor <n>` | health and armour |
| `money <n>` | add money |
| `time <0-24>` | set the time of day (try `time 21`) |
| `clouds <0-1>` | cloud cover |
| `fov <deg>` / `quality <low\|medium\|high\|ultra>` | graphics |
| `colliders` | draw nearby collision boxes |
| `respawn`, `pos`, `clear` | |

The console only works while the overlay is open, so it never affects normal
play. `VH.game` is also available from the browser's own console (F12).

---

## How it's built

```
vicehaven/
├── index.html            page shell, loading screen, error overlay, script order
├── css/
│   ├── style.css         design tokens, loading/error screens, buttons, dialogs, debug overlay
│   ├── hud.css           heads-up display
│   └── menus.css         title, pause, settings, statistics, credits
├── js/
│   ├── lib/three.min.js  three.js r186 as a classic script (MIT; see tools/build-three.md)
│   ├── core.js           VH namespace, event bus, maths, seeded RNG + noise, time slicing, feature detection
│   ├── settings.js       all options, quality presets, key bindings, localStorage
│   ├── input.js          keyboard, mouse, pointer lock, gamepad → named actions
│   ├── postfx.js         HDR target, bloom, tone mapping, colour grade, vignette, grain
│   ├── renderer.js       WebGL2 renderer, camera, resolution scaling, context loss
│   ├── geometry.js       GeometryBuilder: merges thousands of boxes into one mesh per material
│   ├── textures.js       procedural canvas textures (asphalt, paving, grass, wood, grime…)
│   ├── materials.js      shared materials: the window-drawing building shader, foliage sway, water
│   ├── environment.js    time-of-day sky, sun/moon, fog, reflections, shadow placement
│   ├── physics.js        collision world: boxes and ramps in a spatial hash, raycasts
│   ├── data/districts.js districts, street names and landmarks, as data
│   ├── data/challenges.js the challenges: names, medal times, rewards, penalties
│   ├── citygen.js        lays out roads, junctions, blocks, lots and the waterfront (pure data)
│   ├── buildings.js      building archetypes: tower, office, shophouse, apartment, hotel, villa
│   ├── props.js          instanced street furniture and trees, traffic-signal lamps
│   ├── signs.js          paints sign faces onto canvases
│   ├── landmarks.js      Civic Plaza, Founders Park, Vicehaven Tower, waterfront and pier
│   ├── construction.js   Meridian Yard and the Yard Run course
│   ├── world.js          turns the layout into chunked meshes, colliders and props
│   ├── humanoid.js       the jointed character model and its procedural animation
│   ├── player.js         Jay's character controller
│   ├── camera.js         the camera rig
│   ├── interaction.js    the universal [E] interaction system
│   ├── audio.js          synthesised ambience, footsteps, cues and challenge music
│   ├── challenges.js     challenge runs: markers, checkpoints, medals, records, ghost
│   ├── hud.js            the HUD
│   ├── ui.js             menus, settings screen, dialogs, intro card
│   ├── debug.js          the F8 developer overlay
│   └── main.js           boot sequence, game states, main loop, scheduler
├── assets/               (empty for now; see assets/README.md)
├── dist/vicehaven.html   the single-file build (generated; don't edit it)
└── tools/
    ├── bundle.mjs        builds dist/vicehaven.html (plain Node, no packages)
    ├── smoke.mjs         optional automated test (Node + Playwright), not needed to play
    └── build-three.md    how to rebuild js/lib/three.min.js
```

**The single-file build.** `node vicehaven/tools/bundle.mjs` reads
`index.html` and inlines every local stylesheet and script in order, into
`dist/vicehaven.html`. Each script keeps a `//# sourceURL`, so errors still
name the original file. Run it after changing any source file.

**Why classic scripts and not ES modules?** Edge blocks `import` on pages
opened from `file://`. Each file is therefore an IIFE that adds one thing to
the single global `VH` namespace, and `index.html` loads them in dependency
order. No file touches `THREE` at load time, which is what lets `main.js`
fall back to a CDN copy of three.js if the bundled one is missing.

**How the systems talk to each other.**

- **Events.** `VH.events` is a small publish/subscribe bus, so systems don't
  hold references to each other. Examples: `settings:changed` (renderer,
  environment and HUD react), `notify` (anyone can post a HUD
  notification), `money:changed`, `interaction:focus`/`interaction:used`,
  `player:step`/`jump`/`land`/`climb`/`damaged`/`died` (the audio engine
  listens to these), `camera:mode`, `ui:dialog`, `ui:click`,
  `input:lockchange`, `challenge:start`/`finish`.
- **Actions, not keys.** Game code asks `input.down('sprint')` or
  `input.consume('jump')`. Presses queue until the fixed-rate simulation
  consumes them, so a quick tap is never lost between steps.
- **Data first.** Districts, street names, landmarks, key bindings, quality
  presets, prop definitions and the settings screen itself are data objects.
  Adding a district or a setting doesn't touch the systems that use them.
- **Update rates.** `main.js` runs Jay's physics at a fixed 60 Hz,
  interpolated when drawn. The camera, animation and rendering run every
  frame; interaction checks run at 15 Hz; location lookups and prop culling
  at 4 Hz. Traffic, pedestrians and world events will join the same
  scheduler at their own rates.

**Performance techniques already in place.** The city is cut into 192 m
chunks and each chunk becomes one mesh per material, so the whole city is
around 250 meshes. Props are instanced per chunk and hidden beyond a
per-type draw distance. Colour variation travels in vertex colours so meshes
share materials. Three.js frustum-culls whole chunks. The shadow map covers
only the area around Jay and is snapped to its texel grid so it doesn't
shimmer. Windows are procedural, which costs no texture memory. World
generation is time-sliced so the tab never freezes, and shaders are compiled
before the first frame so it doesn't hitch.

World conventions: metres and seconds; +Y is up, +X is east, −Z is north.

---

## Testing checklist (Phase 1)

- [ ] `dist/vicehaven.html` opens by double-click, from any folder, with no other files next to it

- [ ] Game loads from a double-clicked `index.html` (loading bar → title screen)
- [ ] New Game → intro card → Jay standing in Civic Plaza facing the towers
- [ ] Clicking captures the mouse and the mouse turns the camera
- [ ] W/A/S/D move relative to the camera, speeding up and slowing down smoothly
- [ ] Shift sprints, Space jumps, Ctrl/C toggles crouch, Caps Lock toggles walking
- [ ] Space at the plaza crates climbs them; running at the low walls vaults them
- [ ] Stairs and the ramp lead up to the terrace; kerbs are stepped over automatically
- [ ] Buildings, walls and poles are solid, and Jay slides along walls
- [ ] With Jay's back to a wall, the camera slides in front of it instead of through it
- [ ] Right mouse gives the aim camera and crosshair; V cycles cameras; the wheel zooms
- [ ] E at a vending machine costs $2 and heals; E at the kiosk opens the city guide
- [ ] A big drop hurts (in the F8 console, `tp roof` puts you on the nearest low rooftop; walk off the edge)
- [ ] Esc pauses; Resume and Enter return to the game; Quit to Menu works
- [ ] Settings change live (try the quality presets) and persist after a refresh
- [ ] F8 opens the overlay; `tp pier`, `time 21` and `noclip` work
- [ ] Districts announce themselves as you walk between them
- [ ] Sound starts on the first click: footsteps change between the plaza (concrete), the park (grass) and the boardwalk (wood); wind rises on a rooftop
- [ ] Lamps, lit windows and the sun glow (bloom); Settings → Post-processing → Off removes it
- [ ] Walk west from the plaza into Meridian Yard; E at the cyan marker starts the Yard Run with 3-2-1-GO
- [ ] Gates tick off with split times; the HUD arrow points to the next gate; falling off the beam puts you back with +3 s
- [ ] Finishing shows the results card with a medal and pays the reward; E retries and a ghost of your best run races you
- [ ] E at the orange marker in Civic Plaza starts Courier Rush; the clock ticks under 10 s and turns red under 5 s
- [ ] Esc → Abandon challenge ends a run

For developers there's also an automated check. It is optional and needs
Node.js with Playwright:

```bash
node vicehaven/tools/smoke.mjs                # ~60 assertions, fails on any console error
SHOTS=1 node vicehaven/tools/smoke.mjs        # plus screenshots in /tmp/vicehaven-shots
node vicehaven/tools/bundle.mjs && TARGET=dist node vicehaven/tools/smoke.mjs   # test the single file
```

It boots the game from its `file://` URL in headless Chromium, the engine
inside Edge. It then checks, among other things: the city builds; W moves
Jay away from the camera and D to the right of the screen; buildings stop
him and he slides along them; the camera stays out of walls; sprint, jump,
climb, ledge-grab, vault, stairs, ramp and crouch behave; the vending
machine and kiosk work; falls hurt and knock-outs recover; presets apply;
and rebound keys work. A bot then plays both challenges start to finish
(gold on the Yard Run, in time on Courier Rush), and the suite checks the
reward, the saved ghost, the slip penalty, running out of time,
abandoning, footsteps and switching post-processing off.

---

## Known limitations of this phase

- **The clock is stopped at 16:18.** Lighting already follows the time of
  day (try `time 21`), but the running day/night cycle, street-light pools
  and night traffic arrive in Phase 12.
- **No vehicles, traffic, pedestrians, combat, police, missions, shops,
  interiors, weather, map, phone, voice acting or saving yet.** Each has its
  own phase. Only settings and challenge records are saved for now.
- **Sound needs one click or key press first.** Browsers don't allow a page
  to play audio before that.
- **The bay isn't swimmable yet.** The seawall and pier railings keep Jay
  out of the water until swimming and boats arrive.
- **Browser rules.** Pointer lock can only be re-acquired from a click or a
  key such as Enter, never from Esc, so the pause menu resumes that way.
  Ctrl+W can't be blocked outside fullscreen (see *About Ctrl*).
- **Software rendering.** If Edge falls back to software WebGL (no working
  GPU driver) the game runs, but at a few frames per second.

## Next: Phase 2

Phase 2 deepens the third-person camera: a cinematic camera, interior-aware
framing, camera presets per activity and smoother collision against props.
It builds on `camera.js` without changing how the other systems use it.
