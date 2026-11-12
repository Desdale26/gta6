# Vicehaven mission and story format

This is the contract between the story writers and the mission engine
(`js/missions.js`). Story content lives in `js/data/story*.js` as plain data.
The engine turns each step into gameplay, HUD objectives, subtitles, camera
work and fail conditions.

## The game (what the engine can do)

Vicehaven is an original open-world crime game set in a sun-bleached coastal
city. Everything the writers use must exist in this list. If a scene needs
something that isn't here, stage it differently, for example as a `blackout`
scene.

- **On foot:** walking, running, sprinting, jumping, climbing ledges up to
  1.7 m, vaulting, crouching and parkour. No swimming (the bay is fenced off).
  Most scenes happen outdoors (streets, alleys, rooftops, garages with open
  doors, car parks, parks, the pier, the boardwalk, docks, building sites,
  mansion gardens) or inside a car. **Interiors you can walk into:** the
  corner shops (a counter, a clerk, a till; hold-ups with a bag and, in some,
  a safe: see `holdup` below), the Velvet Tide club (`velvet_tide_floor`,
  `velvet_tide_bar`), Vicehaven International's terminal (the departures
  hall with check-in, the security arches, the airside concourse, the gates
  and jet bridges; arrivals and baggage reclaim: `airport_terminal`,
  `airport_arrivals`, and story places in district `airport`, below) and
  every airliner's cabin at a gate. Anything else indoors is a `blackout`
  scene on a black screen (also for memories and intimate moments).
- **Driving:** steal any car (including dragging drivers out), traffic that
  obeys signals, drifting on the handbrake, nitro, ramps and stunt jumps,
  crashes, damage, cars that catch fire and explode, a radio. No motorbikes
  or boats.
- **Flying:** Jay can fly anything with wings or rotors he can get into:
  the `skylark` (a light plane; airfields, parks, long straight roads), the
  `albatross` (the airliner, from the airport's stands), the `talon` (a jet,
  at Fort Breakwater), the `sparrow` (a small helicopter) and the `warden`
  (an attack helicopter, at the fort). Planes need a run to take off and
  land; helicopters go straight up and down. A crash or landing in the bay
  wrecks the aircraft. Sky traffic flies over the city; a police helicopter
  chases at heat 4.
- **Special vehicles:** the `bastion` tank (Fort Breakwater; its main gun
  works), and the airport's `bagtug`, `caterer`, `followme` and `firetruck`
  (the crash tender, with a water cannon that knocks people flat).
- **Police heat, 1–5:** patrol cars pursue; at 3 and above there are
  roadblocks and officers who shoot; at 4 and above the helicopter joins. Lose
  them by breaking line of sight and leaving the search zone. Getting caught
  means arrest; losing all health means hospital. Both fail the current
  mission.
- **Combat:** weapons are `fists`, `bat`, `knife`, `pistol`, `smg`,
  `shotgun`, `rifle`, `sniper`, `grenade` and `molotov`, chosen from a
  weapon wheel. Jay can shoot from cars (drive-by with pistol or SMG). Enemies
  take cover, flank and shoot. There is armour.
- **People:** crowds of pedestrians who flee from danger, gang members, police
  officers, and named story characters (with a distinct look) who can follow
  Jay, ride in his car, fight beside him, get hurt and die.
- **Time and weather:** the clock runs (roughly 36 real minutes per day), and
  a mission can jump the clock to a set hour. Clear skies with varying cloud;
  rain may be added later, but don't depend on it.
- **Presentation:** subtitles with the speaker's name (text-to-speech voices
  read them aloud if the player enables it), letterboxed cutscenes with
  automatic camera shots of characters at a place, establishing shots of a
  place, phone calls while playing, text messages, music moods, slow-motion
  moments, a choice prompt (two or three options), a mission-passed or failed
  screen, and the minimap with a GPS route.

## The city (places)

Districts: **Downtown** (glass towers along Grand Avenue, the business
district), **Old Market** (brick shophouses, market stalls, back alleys,
north-west), **Palm Crescent** (pastel apartments, villas and gardens,
south-west to centre), **Harbor Point** (art-deco hotels, the timber
boardwalk and the seawall along the bay, east), **Saltmarsh Docks** (new:
container port, warehouses, cranes and a shipyard, far south) and
**Crestline Estates** (new: gated mansions with big lawns and pools, far west).

Avenues (north–south, west to east): Cypress Parkway, Tannery Avenue, Market
Avenue, Coral Avenue, **Grand Avenue** (the main boulevard), Bayshore Avenue,
Flamingo Avenue, Pelican Avenue, Seawall Drive. Streets (east–west, north to
south): Northgate Street, Anchor Street, Palisade Street, Lantern Street,
**Meridian Boulevard** (the main east–west boulevard, running out to the
pier), Laurel Street, Magnolia Street, Heron Street, Southshore Boulevard.

Round the old city: **Northgate** (the skyscraper heights north of
downtown), **Vicehaven International** (district `airport`, far north:
terminal, runways, stands, hangars, the fire station) and **Fort
Breakwater** (district `fort`, the army base out west: airstrip, tank,
jet, attack helicopter; walking in raises heat).

The bigger city (3.0, see `docs/WORLD.md`) adds twelve districts, with these
ids (use them as a place's `district`) and landmark place ids (use directly,
never redefine):

| district | what it is | landmark place ids |
|---|---|---|
| `sandpiper` | beach town south-east: hotels, shophouses | `sandpiper_beach`, `sandpiper_promenade`, `skate_park` |
| `vistaverde` | suburbs south-west: houses, a mall, a school | `verde_mall`, `vista_verde_school` |
| `ironside` | industry far south-west: sheds, yards | `ironside_scrapyard`, `ironside_power`, `ironside_railyard` |
| `thebowl` | stadium quarter far south | `mariner_stadium`, `southbay_speedway`, `expo_hall` |
| `sunreel` | the film studios west | `sunreel_gate`, `sunreel_backlot`, `sunreel_western_set` |
| `cindercreek` | the dusty edge of town north-west | `starview_drivein`, `cinder_truckstop`, `cinder_storage` |
| `halcyon` | the university north | `halcyon_clocktower`, `halcyon_quad`, `halcyon_library` |
| `coralmarina` | condos and yachts north-east | `coral_marina`, `marina_lighthouse`, `yacht_club` |
| `neonstrand` | Isla Paloma's resort strip | `wonder_wharf`, `neon_strand`, `paloma_convention` |
| `oldpaloma` | the island's old town | `paloma_plaza`, `paloma_harbour`, `paloma_fort` |
| `palomaheights` | the island's villas on the hill | `paloma_gardens`, `paloma_observatory`, `paloma_estate` |
| `palomafield` | the island airfield (a ~1 km runway) | `paloma_field` |

Aliases are accepted for districts (`isla_paloma`, `vista_verde`,
`the_bowl`, `cinder_creek`, `coral_marina`, ...).

Built-in place ids:
`civic_plaza` (a big paved square with a golden obelisk, "The Beacon", and a
raised terrace), `meridian_yard` (a construction site with shipping
containers, scaffolding, a half-built steel frame and a tower crane),
`founders_park` (lawns, a fountain and a gazebo), `vicehaven_tower` (the
300 m skyscraper and its forecourt), `oceanview_pier` (a long timber pier
with an arch at the start and the end over open water), `the_boardwalk`
(timber promenade along the seawall), `grand_avenue`, `meridian_boulevard`,
`old_market`, `palm_crescent`, `harbor_point`, `downtown`, `saltmarsh_docks`,
`crestline_estates`, `pier_end`, `velvet_tide`, `velvet_tide_floor`,
`velvet_tide_bar`; the airport: `vicehaven_international` (the kerb in front
of the terminal), `airport_terminal` (departures hall, inside),
`airport_arrivals` (arrivals, inside), `airport_apron`, `airport_gate`,
`airport_hangars`, `airport_helipad`; the fort: `fort_breakwater`,
`fort_gate`, `fort_airstrip`, `fort_helipad`, `fort_motor_pool`;
`northgate_heights`; and the twelve districts' landmarks above.

Writers can define new places in the story file's `places` map with a
district, a kind and a short description. The engine maps each one to a real
spot of that kind in that district and builds props there where needed
(garage doors, market stalls, a bank front, crates and so on):

```js
places: {
  dex_garage: { district: 'oldmarket', kind: 'garage', desc: "Dex's body shop: roll-up doors, a lift, a tired neon sign reading CALLOWAY AUTO" },
}
```

Place kinds: `garage`, `alley`, `rooftop`, `parking`, `storefront`, `bank`,
`diner`, `bar`, `motel`, `corner`, `park`, `pier`, `boardwalk`, `warehouse`,
`dock`, `mansion`, `construction`, `church`, `hospital_front`,
`police_station_front`, `apartment_front`, `beach`, `overlook`, `street`.

Story places in district `airport` are matched by the words in their id:
`security`, `concourse`/`airside`, `gate`/`lounge`, `checkin`/`hall` (inside
the terminal, on its floor), `fire` (the fire station's doors), `charter`/
`remote`/`stand` (beside the flyable Albatross's remote stand),
`hangar`/`flying`/`private`, `runway`/`tower`, `parking`/`kerb`/`taxi`;
otherwise by kind (`storefront` = the concourse, `garage` = the fire
station, `parking` = the kerb). Places in the new districts take spots the
district builders registered for that kind, then the generic fill.

## Data shape

```js
VH.Data.story = {
  characters: { id: { name, role, age, look, voice, bio } },
  places: { id: { district, kind, desc } },
  factions: { id: { name, colors, desc } },
  missions: [ /* the main story, in order */ ],
  side: [ /* side-story chains: { id, title, giver, unlockAfter, missions: [...] } */ ],
  activities: { taxi, races, bounties, carList, turf },   // flavour text and data for repeatables
  texts: [ /* ambient text messages: { after: missionId, from, message } */ ],
  dlc: { /* the story DLC: below */ },
};
```

### The story DLC (`S.dlc`, `js/data/dlc*.js`)

`dlc.js` is the header; `dlc-act1a.js` … `dlc-act4b.js` and
`dlc-side-<chain>.js` each start with the same lines and add to `D`:

```js
(function () {
  'use strict';
  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });
  D.missions.push({ id: 'd01_snake_case', act: 1, title, giver, start: 'cinder_storage', estMinutes, summary, reward, steps: [ ... ] });
  D.side.push({ id: 'dside_stunts', title, giver, unlockAfter: 'd05_…', missions: [ { id: 'dst1_…', … } ] });
  D.texts.push({ after: 'd03_…', from, message });
})();
```

- **Characters, places, factions** merge with the main story's (ids must not
  clash). DLC places resolve after every main-story place, so they never
  take its spot.
- **Main jobs** (`d01_` … `d30_`, in story order) are a chain of their own:
  `requires` defaults to the previous DLC job, and the first one to
  `D.unlockAfter` (`m03_ten_and_two`, the main story's third job). The main
  story's next job, its credits and its completion don't count them. They
  get a crimson marker and their own map icon with the giver's initial;
  the HUD title reads "<DLC title> · Act n".
- **Unlock:** when `unlockAfter` is passed (or a save already past it loads)
  the first job's marker appears and, once per save, a "New story" note and
  a text from the first job's giver arrive ("Got a job for a driver. Come
  and find me: <start place>."). To write that text yourself:
  `D.unlockText = { from, message }`.
- **Side chains** (`dside_<chain>`, jobs `ds<letter><n>_…`) work like the
  main story's: `unlockAfter` a DLC job, then in order; blue markers with
  the giver's initial.
- **Flags** set by DLC choices are prefixed `dlc_`. Flags and completed job
  ids are shared with the main story (`if`, `requiresFlag`, texts'
  `requiresFlag`), so a DLC job may test `m12_…` and the other way round.
- **Texts:** `{ after, from, message, delay?, requiresFlag? }` as in the
  main story.
- Passing the last main DLC job emits `dlc:complete` (the DLC's own ending
  and credits); `missions.dlcProgress` and `stats.dlc` / `stats.dlcSide`
  count it apart from the main game.

### Character

```js
dex: {
  name: 'Dex Calloway', role: 'Mechanic, Jay\'s oldest friend', age: 34,
  look: { skin: 0x8d5a3b, hair: 0x1a1410, top: 0x2f4f6f, bottom: 0x3a3a3a, shoes: 0x222222, build: 'heavy' },
  voice: { gender: 'male', pitch: 0.85, rate: 0.95 },
  bio: 'Two sentences for the character sheet.'
}
```
`build` is one of `slim`, `average`, `heavy` or `tall`. `look.hat: true` gives a cap.

### Mission

```js
{
  id: 'm01_homecoming',
  act: 1,
  title: 'Homecoming',
  giver: 'dex',                 // whose icon marks the start on the map
  start: 'civic_plaza',         // a place id; the mission starts when Jay walks into its marker. 'chain' = starts right after the previous one, 'auto' = starts a new game
  resumeAt: 'pier9_gate',       // 'chain' / 'auto' jobs only (required): where their marker waits if that moment was missed (a quit, or a failed attempt)
  requires: ['m00_prologue'],   // missions that must be done first (default: the previous one)
  time: 20.5,                   // optional: jump the clock to this hour when it starts
  estMinutes: 10,               // realistic play time
  summary: 'One line for the mission log.',
  reward: { money: 2500, weapons: ['pistol'], armor: 50, unlock: ['side_marisol'] },
  failIf: ['dead:rico', 'wrecked:getaway'],    // mission-wide fail conditions
  steps: [ ... ],
}
```

### Steps

Each step is an object and runs in order. Any step can carry `say: [...]`,
ambient lines that play while the step runs (car banter), and `objective:
'Text shown on the HUD'`.

| step | meaning |
|------|---------|
| `{ scene: { at, cast: [{ id, at?, face? }] }, say: [...] }` | Letterboxed cutscene at a place with those characters; the lines play, the camera cuts between speakers |
| `{ blackout: [['caption','Saltmarsh, three years ago.'], ['mae','...']] }` | Text on a black screen: memories, interiors, intimate moments |
| `{ phone: 'dex', say: [...] }` | Phone call while Jay keeps playing |
| `{ text: 'dex', message: '...' }` | A text message pops up |
| `{ goto: 'place', vehicle: true\|false\|'carId', stop: true, radius: 6 }` | Get to the place (in a car, on foot, or in a specific car; `stop` means come to a stop there) |
| `{ spawnCar: 'getaway', type: 'vireo', at: 'place', color: 0xff5a1f }` | Put a car there, and give it a mission id |
| `{ getIn: 'getaway' }` or `{ getIn: 'any' }` | Jay gets into that car, or any car |
| `{ spawn: [{ id?, char?, faction?, at, count?, weapon?, behavior }] }` | Place people. `behavior`: `idle`, `guard`, `patrol`, `attack`, `flee`, `cower`, `follow`, `drive` (in a spawned car, with `car: 'carId'`), `wander`. `hostile` defaults from the faction |
| `{ join: ['rico'] }` / `{ leave: ['rico'] }` | Characters become crew: they follow Jay, ride in his car and fight |
| `{ leave: ['leon'], vanish: true }` | Gone at once, no getting out (a disappearing act) |
| `{ leave: ['otis'], into: 'vpd_central' }` | Gets out and walks in through that place's door (a prisoner handed in) |
| `{ kill: ['goon1','goon2'] }` or `{ kill: 'group:docks_crew' }` | Take them down. `spawn` entries with `group: 'docks_crew'` form a group |
| `{ survive: 90, waves: [{ at, count, weapon, faction, delay }] }` | Hold out |
| `{ protect: 'mae' }` | Adds a fail condition for the rest of the mission |
| `{ chase: 'carId', mode: 'wreck'\|'catch' }` | The target flees through the city; wreck it, or box it in until it stops |
| `{ follow: 'carId', to: 'place', min: 12, max: 110 }` | Tail at a distance; too close for too long means spotted (fail), too far means lost (fail) |
| `{ race: { checkpoints: ['place', ...], rivals: [{ char?, car: 'type' }], laps: 1 } }` | A street race |
| `{ deliver: 'carId', to: 'place', maxDamage: 0.4, timeLimit: 150 }` | Bring a car in, undamaged enough and in time |
| `{ collect: ['place','place'], item: 'package' }` | Pick up items at those places, in any order |
| `{ destroy: ['carId'] }` | Blow up or wreck cars |
| `{ heat: 3 }` | Set the police heat level |
| `{ loseHeat: true }` | Lose the cops before continuing |
| `{ wait: 2.5 }` | Pause (a beat before the next line) |
| `{ timer: 120 }` | A time limit for the next step |
| `{ choice: { prompt, options: [{ label, flag, then: [steps] }] } }` | The player picks (keys 1 to 3). The flag is remembered for the rest of the game |
| `{ if: 'flag', then: [steps], else: [steps] }` | Branch on an earlier choice or event |
| `{ setFlag: 'name' }` | Remember something |
| `{ music: 'tension'\|'action'\|'sad'\|'hope'\|'triumph'\|'off' }` | Score mood |
| `{ slowmo: 2 }` | A slow-motion beat (seconds) |
| `{ setTime: 22 }`, `{ fade: 'out'\|'in' }`, `{ teleport: 'place' }` | Transitions |
| `{ camera: 'place', seconds: 4 }` | An establishing shot |
| `{ reward: { money } }` | A mid-mission payout |

Lines are `[speakerId, text]`. The speaker `jay` is the player character.
Use `caption` for narration or captions in blackouts. Keep each line under
about 180 characters; split long speeches over several lines. Stage
directions go in parentheses at the start, like `'(quietly) You came back.'`.
They are shown in italics and are not read aloud.

## New steps and options (DLC)

Built into `js/missions.js` for the story DLC; the main story may use them
too. Places can be a place id, a story car or actor id, or `{ x, z }`.

### Aircraft and special vehicles

| step | meaning |
|------|---------|
| `{ spawnCar: 'hob_skylark', type: 'skylark', at: 'paloma_field', color: 0xf2c500 }` | Any vehicle type: cars, `skylark`, `albatross`, `talon`, `sparrow`, `warden`, `bastion`, `bagtug`, `caterer`, `followme`, `firetruck`. An aircraft is put on the nearest flat, open ground at the place where its wings or rotor fit, a plane facing its longest clear run (along a runway or open ground). `heading` fixes the facing; `exact: true` puts it exactly on the place |
| `{ spawnCar: 'gs_car2', type: 'sovereign', at: 'transporter' }` | `at` a car (or actor) id: spawns beside that car where it is now |
| `{ getIn: 'hob_skylark' }` / `{ getIn: 'aircraft' }` | Get into that aircraft, or into any plane or helicopter |
| `{ goto: 'paloma_field', vehicle: 'aircraft' }` | `vehicle: 'aircraft'`: in any plane or helicopter. With `stop` (the default) a flying aircraft must land there: the HUD says "Land", then "Bring it to a stop" |
| `{ fly: 'marina_lighthouse', height: 120, radius: 60 }` | Fly through a glowing ring in the sky: centred `height` m (default 120) above the ground or roof at that place, `radius` m (default 60). The objective reads "Fly through the ring over <place>" with "(climb)" or "(lower)" when close and off its height; the HUD marker sits on the ring with its distance. A chain of `fly` steps makes a route. `vehicle: 'hob_skylark'` means that aircraft only. Not a checkpoint |
| `{ fly: { x: 600, z: -900 }, height: 80, radius: 50 }` | A ring over open water or anywhere without a place |
| `{ land: 'paloma_field', radius: 40 }` | Bring the aircraft down within `radius` m (default 40) of the place and to a stop ("Land at <place>", then "Bring it to a stop"). `{ x, z }` works; `vehicle` as for `fly`. Not a checkpoint |
| `{ deliver: 'charter', to: 'paloma_field', radius: 60, stop: false }` | Delivers aircraft too (on the ground). `radius` (default 7) and `stop: false` (no need to stop) are new for any car |

During `fly` and `land` Jay may get out on the ground and back in ("Get back
in the Skylark"). The job fails if the aircraft is wrecked ("The Skylark was
wrecked."), and if he bails out in the air: an aircraft of the job left
flying with nobody at the controls disappears once he is 70 m from it, and a
`fly` or `land` step then fails ("You abandoned the Sparrow."). After a bail-
out the job's later steps should not need that aircraft. `failIf:
['wrecked:hob_skylark']` works for aircraft. A retry never starts in the
air: checkpoints are skipped while Jay is flying.

### Other new steps and options

| step / option | meaning |
|------|---------|
| `{ holdup: 'promenade_kwikpik', safe: true }` | Hold up a corner shop with the game's hold-up (aim at the clerk). The shop: a store id (`store_N`), else the shop nearest that place (`'any'`: nearest Jay); `safe: true` picks one with a safe and the step is done when the safe is handed over (`holdup:safe`), otherwise when Jay picks up the bag (`holdup:bag`). The shop is opened and restocked first. Objective: "Hold up <shop>", inside "Aim at the clerk" / "Aim at the clerk. Make him open the safe". Hold-ups at any other shop stay off during jobs |
| `{ goto: 'paloma_field', clearOf: { faction: 'guest_services', radius: 100 }, clearObjective: 'Lose Guest Services' }` | Arrival only counts with nobody of that faction (on foot or driving one of the job's cars) within `radius` m (default 100); until then the objective reads `clearObjective` (default "Lose them") |
| `{ chase: 'gs_car1', mode: 'wreck', escapeTo: 'estate_gate', escapeRadius: 25, escapeReason: 'They made it to the estate.' }` | The target drives for that place (unless `route` is given) and reaching it within `escapeRadius` m (default 25) fails the job with `escapeReason` (default "They got away.") |
| `{ chase: 'dash_van', mode: 'catch', route: ['marina_condos'] }` | (already there) `route` steers the fleeing driver through those places |
| `{ follow: 'film_lowloader', to: 'sunreel_gate', min: 0, max: 80 }` | `min: 0` is a friendly escort: no "too close", bumping it doesn't blow the tail; too far still fails |
| `{ kill: 'group:gs_staff' }` in the crash tender | Someone knocked flat by the `firetruck`'s water cannon counts as down: they get up, give up and leave |
| `{ explode: 'trey' }` | Blow up a job's car now (whoever is in it gets out first) |
| `{ reward: { weapons: ['smg'] } }` | (already there) mid-job weapons and money |
| `{ heat: 1 }` then `{ loseHeat: true }` | (already there) |

Not built (use the beat sheets' written fallbacks): AI-flown aircraft (an
aircraft only moves with Jay at the controls: stage others' flights with
`camera`, `blackout` or `spawnCar` at the destination), a non-hostile patrol
that raises heat on sight (Officer Plum: use `heat` and `failIf: ['heat:1']`
after a staged spotting), stopping the clerk from filling the bag (`till:
false` is ignored), carrying one car on another, and vehicle unlocks as
rewards.
