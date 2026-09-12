# Vice Coast: Leonida

An open-world action game that runs entirely in a browser tab. No build step, no
asset downloads, no network at runtime — the city, its textures, its music and
its sound effects are all generated procedurally from code when you press Start.

![](shots/01-shadows.png)

## Running it

```bash
npm install      # only dependency is three.js, vendored into vendor/ on install
npm start        # serves the game at http://localhost:8080
```

Open <http://localhost:8080>, click **Start**, and click once more to capture the
mouse. Everything after that is in the game.

There is no bundler and no transpiler. `index.html` declares an import map and
the browser loads the ES modules directly, so editing a file and refreshing is
the whole development loop.

To hand somebody a copy, `node tools/bundle.mjs` flattens the whole module
graph, three.js and the stylesheet into a single `vice-coast.html` that runs
straight off the filesystem with no server at all.

## Controls

| | On foot | Driving |
|---|---|---|
| **W A S D** | move | throttle / steer / brake |
| **Shift** | sprint | nitro (where fitted) |
| **Space** | jump | handbrake |
| **F** | — | enter / exit the vehicle |
| **E** | interact, rob a till | — |
| **Mouse** | look / aim | look |
| **Left click** | fire | fire |
| **Right click** | aim down sights | — |
| **R** | reload | — |
| **Q / Z / Tab** | next / previous weapon, weapon wheel | — |
| **C** | crouch | — |
| **V / B** | camera mode / look behind | camera mode / look behind |
| **H / L** | — | horn / headlights |
| **[ ]** | radio station | radio station |
| **K** | respawn | flip the car back over |
| **M / P / Esc** | map / phone / pause | map / phone / pause |
| **T / O / F2 / F3** | slow motion / cinematic camera / screenshot / debug overlay | |

## What is in the world

| | |
|---|---|
| Vehicles | 63 across 23 classes — hatchbacks to hypercars, bikes, buses, a fire engine, an APC, boats |
| Weapons | 80 across 10 slots — fists, melee, sidearms, SMGs, shotguns, rifles, precision, heavy, thrown, specials |
| Pedestrian archetypes | 40, with generated names, outfits, gangs and daily routines |
| Districts | 16, each with its own architecture, traffic mix and crowd |
| Shops | 16 types, ~80 placed — all robbable |
| Stunt spots | 28, with 23 named tricks to land |
| Radio | 9 stations, 36 generated tracks |
| Missions | 136 — a six-act story of 74 missions and heists, five interludes, and 57 side jobs across 16 job types |
| Story | ~20 hours, 478 objectives, 995 lines of written dialogue |

The city is roughly 3.2 km square: a heightfield with roads carved into it (roads
are genuinely flat ground, not painted stripes), ~2,200 buildings, ~1,000 road
nodes and ~2,600 light sources, generated in about 4.5 seconds at load.

## How it is put together

```
src/core/       maths, RNG and noise, event bus, input, settings, save games
src/engine/     renderer, HDR post-processing chain
src/render/     procedural textures, materials, sky, weather, particles, decals, lights
src/physics/    collision world, raycast vehicle physics, character controller, ragdolls
src/world/      terrain, road graph, buildings, props, stunt geometry, world generation
src/entities/   vehicles and their bodywork, pedestrians, traffic and police AI
src/combat/     weapons, ballistics, explosions, fire
src/gameplay/   the game loop, player, camera, police, economy, shops, missions, radio
src/ui/         HUD, minimap, menus, dialogs
src/audio/      synthesised SFX bank, engine synthesis, generative music
src/content/    the catalogs — vehicles, weapons, peds, districts, shops, stunts, radio, missions
```

`docs/ARCHITECTURE.md` is the contract each module is written against: exported
names, data schemas and units (metres, kilograms, seconds; +Y is up; a vehicle's
forward is +Z).

Some details worth knowing:

- **Rendering** is a HDR pipeline — scene → bloom → a composite pass doing ACES
  tonemapping, colour grading, depth-reprojected motion blur, depth of field,
  chromatic aberration, haze, grain, vignette and wet-lens droplets → SMAA.
- **Textures** are 82 named procedural textures built on a canvas at load: noise,
  Worley cells, and facade builders that lay out real windows at real floor and
  bay spacing.
- **Vehicles** use raycast suspension at 120 Hz with Pacejka tyre curves, a real
  gearbox and differential, Ackermann steering, a friction circle, closed-loop
  ABS holding 14% slip, traction control and hull deformation from impacts.
- **Tyres and brakes have temperature.** Heat comes from sliding at the contact
  patch and from the carcass flexing as it rolls, so a cruise settles near 45 °C,
  hard driving sits in the grip window and a long drift cooks the driven corners
  past 100 °C and wears them out. Brakes have their own thermal mass and fade
  from around 310 °C. Shoot a tyre out and the car keeps going, badly.
- **Aerodynamics** work against airspeed, not ground speed, with reference areas
  taken from each body's own box — so wind is real (a storm shoves a motorcycle
  four times as far as a truck), a slide presents the flank to the air, and
  downforce costs induced drag instead of being free.
- **Audio** is synthesised sample by sample: an 80-sound effects bank, real-time
  engine noise built from the actual crank speed, and a lookahead-scheduled
  generative radio.
- **Draw calls** stay around 650 for the whole city, because static geometry is
  merged into per-material spatial chunks and colour variation is carried in
  vertex colours so meshes can share one material.

## Testing

```bash
npm run smoke              # boots the game headless and runs 600 frames
node tools/scenarios.mjs   # 16 gameplay scenarios: driving, shooting, robbing, stunts, weather, lighting…
node tools/shots.mjs       # writes screenshots to shots/
node tools/diag.mjs        # one-shot diagnostic dump
node tools/bundle.mjs      # writes a standalone vice-coast.html
```

All of these drive a real browser through Playwright and fail on any console
error, page error, failed request or NaN that appears along the way. The content
catalogs additionally validate themselves at import time.
