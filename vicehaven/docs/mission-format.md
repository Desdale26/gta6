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
  There are **no interiors**: every scene happens outdoors (streets, alleys,
  rooftops, garages with open doors, car parks, parks, the pier, the
  boardwalk, docks, building sites, mansion gardens), inside a car, or as a
  `blackout` scene on a black screen for interiors, memories and intimate
  moments.
- **Driving:** steal any car (including dragging drivers out), traffic that
  obeys signals, drifting on the handbrake, nitro, ramps and stunt jumps,
  crashes, damage, cars that catch fire and explode, a radio. No motorbikes,
  boats or aircraft for the player (a police helicopter does chase you).
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

Built-in place ids:
`civic_plaza` (a big paved square with a golden obelisk, "The Beacon", and a
raised terrace), `meridian_yard` (a construction site with shipping
containers, scaffolding, a half-built steel frame and a tower crane),
`founders_park` (lawns, a fountain and a gazebo), `vicehaven_tower` (the
300 m skyscraper and its forecourt), `oceanview_pier` (a long timber pier
with an arch at the start and the end over open water), `the_boardwalk`
(timber promenade along the seawall), `grand_avenue`, `meridian_boulevard`,
`old_market`, `palm_crescent`, `harbor_point`, `downtown`, `saltmarsh_docks`,
`crestline_estates`.

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
};
```

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
