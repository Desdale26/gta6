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
  each (plus *The Velvet Tide*, three jobs at the boardwalk club), five big choices that change who lives, who leaves and how it ends,
  and three endings: over 7,000 lines of dialogue, about 5½ hours of story
  and 2¼ hours of side stories.
- **Between jobs:** 25 taxi fares, 6 street races, 10 cars on Dex's list,
  8 bounties, 5 turf wars, 12 stunt jumps and 30 hidden lanterns.
- **The city:** downtown towers, Old Market alleys, Palm Crescent's pastel
  streets, the Harbor Point boardwalk and pier, the Saltmarsh container port
  and the walled mansions of Crestline Estates, with a running day and night.
- **18 cars, 11 weapons, police with five heat levels and a helicopter,
  traffic that obeys the lights, crowds that run, three radio stations.**
- **New in v1.2 (City life update):** rain and thunderstorms, Fresh Coat
  body shops, eight businesses to buy, 42 achievements with a Progress
  screen counting to 100%, and photo mode.

---

## Running it in Microsoft Edge

**Easiest: the single file.** `vicehaven/dist/vicehaven.html` is the whole
game in one 3 MB HTML file (every script, stylesheet, the whole story and three.js inlined).
Download it anywhere (your Downloads folder, a USB stick) and double-click
it. It needs nothing else and works offline.

**Or run the source folder** (this is what you edit):

1. Download or clone this repository and find the **`vicehaven`** folder.
2. **Double-click `vicehaven/index.html`.** If Windows opens it in a
   different browser, right-click it → **Open with** → **Microsoft Edge**.
3. Wait a few seconds while the city is built, then click **New Game**.
4. Click inside the game if the mouse isn't captured. **Esc** releases the
   mouse and pauses.

**Saving.** The game saves by itself: after every job, every 20 seconds of
play (and a few seconds after you earn money or get in or out of a car), whenever you pause, switch to another tab or window, quit to the title,
or close the tab. It keeps the car you're sitting in. If you quit in the
middle of a job, the save holds the moment just before the job began, and
the job's marker waits for you to start it again. **Continue** on the title
screen picks up where you left off. Saves live in the browser's storage for
that file: the same file in the same browser keeps your save; a different
browser or a private window starts fresh.

**Voices.** Dialogue is read aloud by the browser's built-in speech voices.
Edge has natural-sounding voices on Windows 10 and 11. Every main character
gets their own voice, lines are delivered the way their stage directions say
(shouted, whispered, breathless, close to tears), and the subtitles move on
only when the voice has finished. Turn voices off under
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
in Settings. **Film grain** (High and Ultra) is Light by default; set it to
Off or Strong in the same place.

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

**Flying** (planes and helicopters: get in with **F** like a car)

| Key | Plane | Helicopter |
|-----|-------|------------|
| **W / S** | Throttle up / down (on the ground, S brakes) | Fly forward / back |
| **A / D** | Roll left / right (on the ground: steer) | Turn |
| **Space / Ctrl** | Nose up / down | Climb / descend |
| **Mouse** | Look; let go of the keys and the plane flies towards where you look | Look; the helicopter turns to face the view |
| **Shift** | Afterburner (the Talon jet) | Faster |
| **Left mouse · right mouse** | Guns · rockets (the Talon and the Warden gunship) | Same |
| **F** | Get out. High up, Jay jumps and his parachute opens | Same |

To take off, line up on a runway, hold **W** and pull up (**Space**, or
look up) once you're fast enough. Land gently on something flat.

**The tank**

| Key | Action |
|-----|--------|
| **W / S** · **A / D** | Drive · turn on the spot |
| **Mouse** | Aim the turret |
| **Left mouse · right mouse** | Main gun (it reloads) · machine gun |

**In a shop:** **E** at the counter buys snacks; aim a gun at the clerk to hold the place up.

**At Fresh Coat (the body shop):** drive in and stop; **A / D** pick a colour, **E** sprays, drive off to leave.

**Photo mode** (pause menu → Photo mode)

| Key | Action |
|-----|--------|
| **W A S D** · **Space / C** | Move the camera · up / down (**Shift** faster) |
| **Drag the mouse** · **wheel** | Look · zoom |
| **Q / E** · **R** | Tilt · level again |
| **Enter** | Take the photo (saved as a PNG to your downloads) |
| **H** · **Esc** | Hide the panel · back to the pause menu |

**The map (M).** A full-screen road atlas; the game pauses while it is open.
It opens on Jay at street level. **Drag** to move (flick it and it glides),
the **wheel** (or **Q / E**) zooms, **WASD** or the arrows pan, **C** finds
Jay, **G** shows the GPS waypoint, **Z** shows the whole map.

- **Click** anything (a shop, a plane, a landmark) or anywhere to set the
  GPS there. An info card says what it is, how far it is by road, how long
  the drive or the walk takes, and what to do there. Click the waypoint (or
  **Backspace**) to clear it.
- **Right-click** (or **P**) drops a coloured pin flag; right-click it again
  to remove it. Pins stay in this browser and show on the radar too.
- **The side panel** (**Tab** hides it): where you are, a search box (**/**:
  places, shops, streets, districts), filters with counts (**1-7**: story,
  side jobs, shops, vehicles, places, police, pins), overlays (**O**
  district colours, **N** street names, **R** an atlas grid with squares
  like C4), every place nearest first with a GPS button, and a map key.
- Icons that crowd together merge into one with a count: click it to zoom
  in. Names only show where they fit and when you are close enough.
- The bar at the top shows the GPS target, the distance by road and the
  drive time; the overview in the corner shows the whole map (click it to
  look somewhere else); an off-screen objective gets an arrow at the edge.
- **On a controller:** the left stick moves the map under a reticle, the
  triggers or right stick zoom, **A** sets the GPS, **X** clears it, **Y**
  finds Jay, **LB / RB** step through the places, **B** closes.

**M** or **Esc** closes it.

**Anywhere:** **M** opens the city map (jobs, places, the GPS route),
**T** switches daytime on or off (D-pad right on a controller),
**Space** or **Enter** skips a line in a cutscene, **1 / 2 / 3** answer a
choice, **Esc** pauses (map, daytime, job log, save, settings).

Every key can be rebound under **Settings → Controls**. **Controllers**
(Xbox, PlayStation and most others) work automatically: sticks move and
look, RT accelerates and LT brakes in a car, RT fires and LT aims on foot,
A jumps, Y talks and gets in and out of cars, the D-pad does taxi duty
(up), horn (down) and lights (left), and Menu pauses. **Aim assist** (on by default,
stronger on a controller) pulls near misses onto an enemy.

**Bodies and blood.** People who die fall as ragdolls, thrown by whatever
hit them, and bleed: sprays, splats and pools. **Settings → Gameplay →
Blood** has Lots, Some and Off.

**Respawning resets every car.** Waking up at the hospital, getting out
on bail or retrying a job puts the city's cars back as if it had just
loaded: wrecks, abandoned and stolen cars, police, traffic and parked cars
all go and fresh ones fill the streets. The car Jay is sitting in comes
back repaired, and the King of the Road prize waits at Heron Corner.

**Cars you tail or chase don't get stuck, and don't go on forever.** A van
Jay is following, or a car running from him, runs red lights, swerves round
queues and parked cars, and shoves through anything that's still in the
way. A car you tail pulls up at the kerb by where it's going, and the tail
ends. A car you chase gives up and pulls over if you stay on its tail for
about a minute (sooner if you've knocked it about): get alongside to stop it.

**Health.** Get out of trouble for a few seconds and Jay's health refills
on its own, all the way. **Settings → Gameplay → Difficulty** sets how much
damage he takes and how quickly it comes back (Easy: least damage, fastest
recovery).

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
*The Velvet Tide* (three jobs at the boardwalk dance club) opens after
*The Toolbox*.

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
  Pick up a fare (on the radar and map, with a GPS route), get them there
  before the meter runs out, and hear their story. 25 passengers, some of
  whom only turn up later in the story.
- **Esc → Stats** counts stunt jumps, lanterns and fares; **Job log** lists
  the races, the list, bounties and turf wars.

### The Velvet Tide

An open-air dance club on the boardwalk just north of the pier (the pink
neon sign on Seawall Drive; it's on the map). Inside: a light-up dance
floor and sweeping beams in time with the club's own house track, a DJ on
the decks, a juice bar (**E**: a Tide Fizz, $5, +40 health) and a VIP
balcony. Tuli on the door won't let you in with the police after you.

- **Dance.** Stand on the floor and press **E**. Arrows fall on the beat:
  hit them with the **arrow keys** (or **W A S D**) as they reach the
  targets. Perfect, Good and OK hits score more with a combo; you get paid
  for your score and your best goes in **Esc → Stats**. Jay's moves change
  as the combo builds.
- **The Velvet Tide** (side story, after *The Toolbox*): the owner, Mars
  Okonjo, has Halberd leaning on her. Three jobs: throw out the collectors,
  get DJ Lowtide's records back, and hold the club on closing night. Finish
  it and you're on the list for the VIP balcony.
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

**Vehicles.** 19 cars, from the Pipit hatchback to the Bulwark armoured van
and Nana Lu's long teal Duchess, plus five aircraft and a tank (below). Each has its own handling: a tyre model
with grip, slip and drift, weight transfer, gears, and suspension that
leaves the ground on ramps. Cars dent, smoke, catch fire and explode.
Street lights, hydrants, bollards, benches, bins and barriers break when
you hit them. Nitro,
skid marks and tyre smoke come with every car.

**Traffic and people.** Traffic drives on the right, keeps its lane, stops
at red lights, queues, overtakes parked cars and honks at you. Pedestrians
walk the blocks, wait at crossings, and scatter from gunfire and
pavement-driving.

**Police.** Crimes that someone sees raise your heat (1–5). If a passer-by
phones it in, the police know where you are for the first 12 seconds or so
(longer at higher heat) and come straight for you. Patrol cars
chase and try to box you in, officers shoot from heat 3, roadblocks go up,
and from heat 4 a helicopter's searchlight follows you. Break line of sight
and get out of the search area to lose them. Getting caught costs a fine
and your ammo; getting knocked out costs a hospital bill.

**Losing the helicopter.** It flies at about 90 km/h and only keeps you
within about 115 m, so a fast car flat out (or on nitro) pulls away from
it. Once it has lost you it doesn't know where you are: it circles the
search area. After about 75 seconds it goes back to refuel, and the next
one is 40 seconds away, which is your best window.

**Weapons.** Fists, a baseball bat, a combat knife, the Kestrel 9 pistol,
the Hammerhead .44, the Wasp SMG, the Gator 12 shotgun, the Mantis AC-7
rifle, the Heron LR sniper rifle, frag grenades and molotovs. Shots go
exactly where the crosshair is; only the automatics (the Wasp and the
Mantis) wander a little, more the longer you hold the trigger, and a
shotgun's pellets spread round the centre. Recoil kicks the view up and
settles back. Damage falls off with range, and headshots count extra.
Enemies take cover, flank and shoot back.

**The radio.** Three stations of original, procedurally composed music:
**VHR 88.1 Sunset Drive** (synthwave, with Del Starr), **Pulse 96.4**
(house, with Benji Blue) and **Harbor Heat 103.7** (dark beats, with Sable).
Between songs the hosts talk, and they react to what you've done.

**Northgate Heights.** A new financial district north of downtown, on
Skyline Drive: eight towers of 130 to 250 m, each its own shape (Coral
Spire, The Harbinger, The Wedge, The Corkscrew, The Drum with its rooftop
helipad, The Twins and their sky bridge, The Sail and Meridian Heights),
with glass lobbies, plazas, palms, office workers on their lunch break,
and crowns and aircraft beacons that light up at night.

**Vicehaven International.** Up Grand Avenue past Northgate: a 1.3 km
runway, taxiways, a terminal with jet bridges, a control tower, hangars
and a helipad. Airliners take off and land every couple of minutes (they
wait, or go round, if Jay is on the runway). Parked and ready to steal: an
Albatross airliner, two Skylark light planes and a Sparrow helicopter.

**Fort Breakwater.** The army base at the west end of Meridian Boulevard:
walls and razor wire, watchtowers, barracks, a motor pool, two helipads
and an airstrip. Walk in and you get three seconds' warning; stay, shoot
or steal something and every soldier opens fire and the police come at
four stars (five if you take a vehicle). Worth it for the Bastion tank,
the Scout 4x4s, the Talon fighter jet and the Warden gunship.

**Aircraft.** Planes take off from a runway (or any long straight road,
if you're brave) and bank to turn; helicopters lift straight up. The
military ones have guns and rockets. Bail out high up and Jay's
parachute opens. The haze thins as you climb, so the whole city shows
from the air.

**Corner shops and petrol stations.** Fourteen across Old Market, Harbor
Point, Palm Crescent and downtown (Sunrise 24/7, Gull Mart, Hi-Lo Market,
Kwik Pik and three Tidal Fuel stations), each one a real room you can walk
into with shelves, fridges and a clerk behind the counter. Buy snacks to
heal, or aim a gun at the clerk: the till pays out while you keep him
covered, someone hits the silent alarm (two stars), and one clerk in five
has a shotgun under the counter. A robbed till takes eight minutes to
fill up again. The map marks them with a yellow shopping bag.

**A city that carries on without you.** Every few quiet minutes a getaway
car comes tearing past with a police cruiser on its tail, siren going
(take the car and the police take an interest). Travellers walk the
terminal forecourt and a sightseeing helicopter flies laps over the bay.

**The roads out of town are streets, not fields.** Grand Avenue North (to
the airport), Meridian West (to the army base) and Airport Road are lined
with pavements, street lights, palms and 79 buildings: offices and flats
near Northgate, motels, diners and hotels toward the airport, yards and
workshops toward the base, plus another Tidal Fuel and a Kwik Pik. People
walk the pavements, cars park in the car parks, and traffic drives all
the way out (turning round at the fort's gate and the ends of Airport
Road). Green signs and gantries point the way to the airport, the base,
Northgate and back downtown, and taxi fares now go to and from all of it.

**Daytime on / off.** Press **T** (D-pad right on a controller) at any time:
the sun comes straight up and stays up, even in story scenes. Press it again
for the day and night cycle. The pause menu has the same switch, and so does
**Settings → Gameplay → Always daytime**. The first time it gets dark, a
notice reminds you.

**Weather.** The sky changes every few minutes: clear, cloudy, overcast,
rain and thunderstorms, easing from one to the next. Rain falls round the
camera (not under a roof), the roads go dark and shiny and a little
slippery, and storms bring lightning and thunder. **Settings → Gameplay →
Weather** picks Changing, Always clear, Rainy or Stormy.

**Fresh Coat body shops.** Four of them, one in each of Old Market, Palm
Crescent, downtown and Harbor Point (a pink spray can on the map). Drive in
and stop: a colour card comes up with 13 paints and the bill (the paint,
the repairs, and a fee for each wanted star). The roller door comes down,
and the car rolls out repainted and good as new. If the police couldn't see
you go in, they lose you too. Cars only, and not police cars, cabs, buses
or vans in a fleet livery.

**Businesses for sale.** Eight of them, from a laundromat ($25,000) to
Meridian Office Suites ($300,000): walk up to the **For Sale** sign and
press **E**. Every eight minutes of play is payday, and the takings from
everything Jay owns go straight into his pocket. Gold houses on the map are
for sale, green ones are yours.

**Achievements and 100%.** 42 achievements (story, driving, flying, crime,
exploring and life) pop up as you earn them and stay earned across new
games. **Pause → Progress** shows your completion: story jobs, side
stories, races and jobs, stunt jumps, lanterns, districts, businesses and
achievements, with every achievement and how to get it.

**Photo mode.** Pause and choose **Photo mode**: the world freezes and the
camera comes loose (up to 60 m from Jay). Pick a filter (Vivid, Noir,
Sunset, Retro, Cool, Dream), a frame (Cinema, Wide, Square), the time of
day, the weather, the zoom, a tilt and a vignette; hide Jay if you like (the job markers are hidden unless you turn them on).
**Enter** saves the shot as a PNG.

**Time and light.** The clock runs (a full day is about 24 minutes) unless
you fix the time in Settings. Night is moonlit blue rather than black, with
street-light pools, headlights, lit windows and neon. If nights are still too
dark (or too bright) on your screen, change **Settings → Graphics → Night
brightness**. Jobs set their own hour.

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
├── css/                    style, hud, menus, map, dialogue, weapon wheel, world (shop and base overlays)
├── js/
│   ├── lib/three.min.js    three.js r186 as a classic script (MIT)
│   ├── core.js · settings.js · input.js        namespace, events, maths; options; keyboard/mouse/pad
│   ├── renderer.js · postfx.js · environment.js   WebGL2, HDR bloom and grade, sky, sun, clock
│   ├── geometry.js · textures.js · materials.js    merged meshes, procedural textures, shaders
│   ├── physics.js · roadnet.js                     collision world; lanes, junctions and signals
│   ├── citygen.js · buildings.js · props.js · signs.js · landmarks.js · construction.js
│   ├── outskirts.js        Saltmarsh docks (Pier 9, the cranes, the freighter) and Crestline Estates
│   ├── skyline.js · airfield.js · fort.js   Northgate Heights; the airport and its air traffic;
│   │                       Fort Breakwater, its soldiers and the alarm
│   ├── stores.js · ambient.js   corner shops and hold-ups; chases, walkers, the coast tour
│   ├── suburbs.js · roadsigns.js   the roadside strips on the roads out of town; direction signs
│   ├── world.js            turns the layout into chunked meshes, colliders and props
│   ├── humanoid.js · player.js · camera.js · crowd.js    people, Jay, the camera, the crowds
│   ├── vehicles/           carmodels (19 cars), vehicle (physics), vehicles (spawning, collisions),
│   │                       traffic (lane AI), feedback (smoke, skids, lights, sound),
│   │                       aircraft (planes, helicopters, rockets), tank
│   ├── weapons-data.js · weapons-models.js · combat.js · ui-wheel.js   guns, fighting, the wheel
│   ├── police.js · fx.js   heat, pursuit, helicopter; particles, explosions, light pools
│   ├── audio.js · audio-drive.js · audio-weapons.js    synthesised sound, engines, the radio
│   ├── dialogue.js · places.js · missions.js · activities.js   voices and subtitles; story places;
│   │                       the mission engine and save system; the jobs between jobs
│   ├── data/               districts, challenges, weapons, the story (story.js = cast, places,
│   │                       factions; story-act1…4*.js = the jobs, by act; story-extras.js = fares, races,
│   │                       bounties, turf wars, texts, radio hosts)
│   ├── minimap.js (radar) · mapview.js (full map) · hud.js · ui.js · debug.js · main.js
│   ├── vehicles/models/    one file per aircraft model (albatross, skylark, talon, sparrow, warden), built with the kit in aircraft.js
├── docs/STORY_BIBLE.md     the whole story: characters, timeline, every job, choices, endings
├── docs/mission-format.md  the data format the story is written in
├── dist/vicehaven.html     the single-file build (generated; don't edit it)
└── tools/
    ├── bundle.mjs          builds dist/vicehaven.html (plain Node, no packages)
    ├── validate-story.mjs  checks the story data (ids, places, cars, flags) and counts it
    ├── save-test.mjs       optional test: close the tab, reopen, Continue
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
- [ ] Get hit by a thug: a short red flash, the picture stays clear, and health refills a few seconds after the fight
- [ ] Commit a crime in front of a police car: heat rises, police chase; lose them
- [ ] Run someone over with nobody official around: a star comes a few seconds later and patrol cars turn up within about 15 seconds
- [ ] Fail a job (die or get caught) and retry with E: every car is fresh, the last attempt's cars and people are gone
- [ ] Tail the paint van in *Casa Palma*: it never sits stuck at a red light or behind a queue, it shoves through
- [ ] Shoot someone: they fall as a ragdoll and bleed; Settings → Gameplay → Blood turns it down or off
- [ ] With voices on, each line is spoken in full before the next subtitle, shouts and whispers sound different
- [ ] Drive fast with a crew member in the car: they stay in their seat
- [ ] In *Your Home, Our Future*, pick Noor and Ansel up in a two-seat sports car: both climb in, nobody is left on the roof
- [ ] In *The Gate*, the Halberd SUVs come after Lulu and ram it; pull the lead SUV's driver out and take it: the objective completes and the driver runs off
- [ ] Steal any car with someone in it: the driver lands on the road by the door and runs (a cop gets out and fights)
- [ ] Esc → Save game; reload the page; Continue resumes with the same jobs done
- [ ] Drive somewhere, close the tab, open the file again: Continue puts you back in the same car
- [ ] Close the tab in the middle of a job: Continue says so and the job's marker is there to restart it
- [ ] M opens the map with job icons and the route
- [ ] In a cab, P starts taxi duty and a fare tells you their story
- [ ] The Velvet Tide: neon outside, music gets louder at the door, the floor and beams flash on the beat; E on the floor starts the dance game and pays out
- [ ] Night falls: street-light pools, headlights, lit windows, the helicopter's searchlight; Jay, cars and roads stay easy to see
- [ ] Settings → Graphics → Night brightness changes how bright nights are, live
- [ ] Settings change live and persist (quality presets, voices, strong language)
- [ ] Northgate Heights: eight different towers on Skyline Drive, walkers on the plazas, lit crowns at night
- [ ] Airport: take a Skylark from the general aviation apron, take off down the runway, turn, land again; an airliner takes off or lands within a few minutes
- [ ] Fly the Sparrow from the helipad: climb, fly, land without damage; jump out high up and the parachute opens
- [ ] Fort Breakwater: walk in, get the warning, stay and the alarm goes; steal the tank (five stars), drive it, fire the main gun
- [ ] Walk into a corner shop, buy snacks at the counter (+health), then aim a gun at the clerk: the meter fills and pays out, two stars follow
- [ ] Wait a few minutes away from jobs and heat: a car chased by a police cruiser comes past
- [ ] Press M: the map fills the screen and opens on Jay; the game pauses
- [ ] On the map: click a shop (info card, GPS bar, route), search "air" and press Enter, right-click to drop a pin, Tab hides the panel, Z shows the whole map
- [ ] Zoomed out, crowded icons show a count; click one and the map zooms in on them
- [ ] Drive up Grand Avenue North and along Meridian West: buildings, people and traffic all the way, green signs pointing the way
- [ ] In a cab out by the airport, press P: a fare is waiting nearby and may want the terminal, the fort gate or Northgate
- [ ] Settings → Gameplay → Always daytime: night turns to midday at once and stays that way
- [ ] At night press T: midday at once, with a notice; T again brings the cycle back; the pause menu button says On / Off to match
- [ ] Settings → Graphics → Film grain: Off, Light (default) and Strong change the picture live
- [ ] Settings → Gameplay → Weather → Stormy: rain streaks, wet shiny roads, lightning and thunder; under a bridge the rain stops in front of you
- [ ] Drive into a Fresh Coat with a star or two and nobody watching: pick a colour, E, the door comes down, the car comes out repainted and repaired and the stars are gone
- [ ] With a police car right behind you, the colour card says to lose them first
- [ ] Buy a business at its For Sale sign: the sign changes, the map icon turns green, and a payday arrives within eight minutes
- [ ] Earn an achievement (get a wanted star): the banner drops in at the top; Pause → Progress lists it with the date
- [ ] Pause → Photo mode: fly round, change the filter, time and weather, press Enter: a PNG downloads; Esc puts everything back
- [ ] The title screen says v1.2 and What's new lists the update

For developers, the automated checks need Node.js and Playwright:

```bash
node vicehaven/tools/validate-story.mjs --summary   # story data: 0 problems expected
node vicehaven/tools/smoke.mjs                      # boots the game from file:// and plays it
node vicehaven/tools/save-test.mjs                  # closes the tab mid-game, reopens, checks Continue
node vicehaven/tools/bundle.mjs && TARGET=dist node vicehaven/tools/smoke.mjs   # test the single file
```

---

## Known limitations

- **The corner shops are the only interiors; no swimming, boats or
  motorbikes.** Indoor moments in the story are told on a black screen with
  text and voices.
- **Aircraft physics is arcade-simple,** and nothing in the story uses the
  airport, the base or the shops yet: they're for free roam.
- **Voices depend on the browser.** Edge on Windows sounds best. Without
  installed voices the game shows subtitles only.
- **Sound needs one click or key press first.** Browsers don't allow a
  page to play audio before that.
- **Ctrl+W can't be blocked outside fullscreen** (it closes the tab). The
  game asks before closing while you're playing.
- **Software rendering.** If Edge falls back to software WebGL (no working
  GPU driver) the game runs, but at a few frames per second.
