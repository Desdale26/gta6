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
- **18 cars, 23 weapons, police with five heat levels and a helicopter,
  traffic that obeys the lights, crowds that run, three radio stations.**
- **New in v2.0 (Hustle update):** Street Rep levels (1 to 50) with perks
  for everything you do, three Daily Hustles every in-game day with a
  streak bonus, Busted Spanner chop shops that buy any car (a daily hot list
  pays extra), paramedic, vigilante and courier odd jobs, street encounters
  every couple of minutes (a cash van, a mugging, a lift, a race challenge),
  40 hidden cash stashes, business upgrades, and Jay's phone (**P**) to see
  it all and set the GPS.
- **v1.3 (Arsenal update):** 12 new weapons including a rocket
  launcher, a minigun and a stun gun, Bayline Arms gun shops, ammo and
  armour round the city, and guns that kick, flinch people and leave holes.
  Doors now open as Jay gets in, and every kind of vehicle has its own way
  in (and its own carjack: drag-outs, punches, gunpoint).
- **v1.2 (City life update):** rain and thunderstorms, Fresh Coat
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
| **P** | Jay's phone: Daily Hustles, Street Rep, things to do nearby (with GPS), money |
| **F** | Get in a car (or drag the driver out) / get out |
| **V** · **mouse wheel** · **B** | Camera mode · distance · look behind |

**Fighting**

| Key | Action |
|-----|--------|
| **Right mouse** (hold) | Aim |
| **Left mouse** | Fire, swing or throw |
| **R** | Reload. With limpet charges out, sets them all off |
| **Tab** (hold) | **Weapon wheel**: the world slows down; point at a weapon and let go |
| **1 – 9** | Pick a weapon slot directly (9: heavy weapons) |

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
| **P** | Jay's phone. In a cab: taxi duty on or off. In an ambulance, a police car or a delivery van: odd-job duty on or off |
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

**Stuck?** If Jay ends up in the bay he swims back to shore by himself. Anywhere else, pause (Esc) and choose **Stuck? Back to the street**: he is put on the pavement beside the nearest road (out of any car, wanted level unchanged).

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
matters dies, the cops notice a quiet job), press **E** to retry from the
last checkpoint. **Every new objective is a checkpoint:** the retry puts
everything back as it was when that objective began (the cars and people
where they were, the ones already dealt with still gone, Jay back in the
car he was driving with his crew, the police on him if the job had raised
them, the gear the job handed out for the fight).

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

## Making money (the Hustle update, v2.0)

There is always something to do between story jobs, and most of it pays.
Press **P** for **Jay's phone**: it lists all of this, how far away it is,
and sets the GPS for you. The game pauses while the phone is open.

**Street Rep.** Everything earns Rep: story and side jobs, races, hold-ups,
taxi fares, stunt jumps, lanterns, chop shops, odd jobs, street
encounters, stashes, businesses and achievements (the small things, like
near misses, are rate-limited). Levels run from 1 to 50, quick at first.
Each level pays $200 times the new level, and 25 perks come along the way:
bigger business paydays, chop shop, odd job, taxi and stash bonuses, money
off at Bayline Arms, and up to +75 max health and +75 max armour. The
badge next to your money shows the level and XP bar.

**Daily Hustles.** Three tasks every in-game day (24 real minutes, rolling
over at 06:00), drawn from more than 30 kinds, sized to your Rep level.
Each pays $750 to $2,500 plus Rep. Finish all three for a streak bonus of
$1,000 times the streak (up to 7 days running); miss a day and the streak
starts again.

**Busted Spanner chop shops.** Three garages in the rough ends of town:
Old Market, the docks end of Harbor Point and the south side of Palm
Crescent (the spanner icon). Drive any car into the bay and stop, and the
crew strip it: about $400 for a hatchback, $600 for a saloon, $900 for a
muscle car and up to $2,500 for a Zephyr, down to 30% if it is wrecked.
The first of each model on the daily hot list (Gus texts it to you) pays
2.5 times, and the sixth car of the same model in a day pays half. A
police car sells, but its tracker brings two stars. Job cars, named cars,
aircraft and the tank are turned away.

**Odd jobs.** Press **P** in a work vehicle to go on duty, and again to go
off: **Paramedic** (the Medic One ambulance: get the injured to Mercy
General before the clock runs out, gently), **Vigilante** (any police car:
stop a fleeing suspect by boxing them in, ramming, or tailing them till
they pull over) and **Courier** (a Porter or Hauler van: parcels across the
city, a tip for speed, fragile ones hate knocks). Each has ten levels,
$150 to $500 a call plus tips; clearing level 10 pays $5,000 and a perk
for good (+25 max health, +25 max armour or +15% courier pay). The work
vehicles wait at depots (the briefcase icon) and taking one is no crime.

**Street encounters.** Every couple of minutes of free roam something
happens near Jay (the pulsing **!**): an armoured cash van doing its rounds
(crack the back doors open for $1,500 to $3,000 in bags, and two stars),
a mugging, someone who needs a lift against the clock, a street racer
looking for a wager, a lost wallet, a car thief, a tourist who wants a
photo. Help people and get thanked, or keep the money. Ignore one and it
goes away. None happen during a story job or with more than one star.

**Cash stashes.** 40 gold-glowing bags of cash hidden round the city, on
rooftops (stairs at the doors), on the containers and the half-built frame
at Meridian Yard, by the pier, behind the airport hangars, down alleys.
$300 to $1,500 each; a chime gets louder as you get close. Every tenth
find marks two more on the map; 20 found pays $10,000 and all 40 pays
$50,000.

**Business upgrades.** At the sign of a business you own, **E** buys the
next upgrade: a new sign, a refit, an expansion (30%, 50% and 75% of the
price). Each adds half the base takings again, so a fully upgraded business
pays 2.5 times as much. The payday note breaks the pay
down by takings, upgrades and the Rep bonus.

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

**Weapons.** 23 of them in nine slots (keys 1-9, or hold Tab for the
wheel):

| Slot | Weapons |
|------|---------|
| Melee | Baseball bat, combat knife, Fairway 7-Iron golf club, pry bar |
| Pistol | Kestrel 9, Hammerhead .44, Jolt stun gun (drops someone for five seconds, no harm done) |
| SMG | Wasp, Hornet PDW |
| Shotgun | Gator 12 (loads shell by shell), Mule sawn-off (fires from a car), Bull 12 Auto |
| Rifle | Mantis AC-7, Rhino LMG (100-round box; it climbs if you hold it) |
| Sniper | Heron LR (6x scope; the wheel zooms), Osprey DMR (semi-auto, 3x scope) |
| Thrown | Frag grenades, molotovs, limpet charges (they stick; R sets them off) |
| Heavy | Thunderhead RPG (one rocket per car), Boomer grenade launcher, Buzzsaw minigun (spins up first; slows you down) |

Aimed single shots go exactly where the crosshair is; from the hip or on
the run they wander a little, automatics bloom the longer you hold the
trigger, and shotgun pellets spread round the ring. Every shot kicks the
view and leaves sparks and holes; tracers show where rounds go. Hit
markers go gold for a headshot and red for a kill. Damage falls off with
range, headshots count extra and ignore armour, and big guns throw people.
Enemies hold their guns, take cover (crouched in cover they're harder to
hit), flinch when hit, flank and shoot back.

**Ammo.** Guns that take the same rounds share them (the Kestrel and the
Wasp both take 9 mm; every shotgun takes 12 gauge). Ways to get more:
**Bayline Arms**, the gun shops (crosshair icon on the map: Old Market,
Palm Crescent and Harbor Point; walk to the counter and press **E**, W/S
to choose, A/D for a box or fill up, E to buy, Space to leave); weapons,
ammo, body armour and first aid lying round the city (35 spots, back a few
minutes after you take them; a rocket launcher waits inside Fort
Breakwater); what enemies drop (their gun if you haven't one, else their
ammo, sometimes armour); the back of a police car or army truck the first
time you get in; and story jobs, which top up guns you already carry. New
guns come into the shops as the story goes on. Nobody sells to you with
the police after you, and the clerk keeps a shotgun under the counter.

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
into with shelves, fridges, shoppers and a clerk behind the counter. Buy
snacks to heal, or hold the place up:

- **Aim a gun at the clerk.** His hands go up, he opens the till and fills
  a bank bag while you keep him covered, then throws it on the counter.
  The cash is yours when you pick the bag up (hold E to grab it early, with
  whatever is in it so far).
- **Every clerk is different.** A nervous one is quick and babbles, a
  steady one quietly hits the silent alarm if you look away, a stubborn one
  stalls ("The drawer sticks, alright?"), and a have-a-go hero reaches under
  the counter for a shotgun. The panel warns you; tap E to shout at him
  (or fire a warning shot) and he thinks better of it.
- **The safe.** In the bigger shops, make the clerk open the floor safe in
  the back for a much bigger payout, if you dare wait for it.
- **The alarm, the camera and the witnesses.** If the alarm goes, the bell
  rings and two stars arrive about eight seconds later. Shoppers cower,
  but one might bolt out of the door and phone the police; aim at them and
  they'll even hand over their wallets. Every shop has a CCTV camera above
  the door: shoot it out, keep the alarm quiet and nobody escaping, and it's
  a clean job (no stars at all, and a bonus). Leave the camera recording and
  the footage brings one star.
- **Come back too often** and the clerk knows your face; after two hold-ups
  a shop hires an armed security guard. A robbed till takes eight minutes
  of play to fill up again, a safe twenty.

The map marks the shops with a yellow shopping bag.

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

**Achievements and 100%.** 68 achievements (story, driving, flying,
combat, crime, the hustle, exploring and life) pop up as you earn them and stay earned across new
games. **Pause → Progress** shows your completion: story jobs, side
stories, races and jobs, stunt jumps, lanterns, districts, businesses,
cash stashes, odd job levels and achievements, with every achievement and
how to get it.

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
├── css/                    style, hud, menus, map, dialogue, weapon wheel, world (shop and base overlays),
│                           hustle (Rep, dailies), phone, jobs (odd jobs), street (encounters)
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
│   ├── holdup.js · holdup-models.js · audio-holdup.js · data/holdup-lines.js
│   │                            hold-ups: clerks, the bag, the safe, alarm, CCTV, shoppers, guard
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
│   ├── rep.js · dailies.js · phone.js    Street Rep and perks; the Daily Hustles; Jay's phone (P)
│   ├── chopshops.js · oddjobs.js · encounters.js · stashes.js   Busted Spanner garages; paramedic,
│   │                       vigilante and courier duty; street encounters; the 40 cash stashes
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
- [ ] Getting in: the door opens and shuts behind Jay; the Zephyr's doors go up, vans have a step, the jet's canopy and the tank's hatch open; an occupied car's driver is dragged out (or gets out hands up if Jay has a gun out)
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
- [ ] Walk into a corner shop (the door chimes), buy snacks at the counter (+health), then aim a gun at the clerk: hands up, the till slides open, the bag fills while covered, lands on the counter and pays when picked up
- [ ] Hold-up extras: tap E to shout (a hero reaching under the counter backs down), hold E to grab early, shoot out the CCTV camera for a clean job, open the safe in a petrol station, a shopper bolting brings two stars
- [ ] Wait a few minutes away from jobs and heat: a car chased by a police cruiser comes past
- [ ] Press M: the map fills the screen and opens on Jay; the game pauses
- [ ] On the map: click a shop (info card, GPS bar, route), search "air" and press Enter, right-click to drop a pin, Tab hides the panel, Z shows the whole map
- [ ] Zoomed out, crowded icons show a count; click one and the map zooms in on them
- [ ] Drive up Grand Avenue North and along Meridian West: buildings, people and traffic all the way, green signs pointing the way
- [ ] In a cab out by the airport, press P: a fare is waiting nearby and may want the terminal, the fort gate or Northgate
- [ ] Settings → Gameplay → Always daytime: night turns to midday at once and stays that way
- [ ] At night press T: midday at once, with a notice; T again brings the cycle back; the pause menu button says On / Off to match
- [ ] Walk or drive into the bay: after a second or two Jay swims back and stands on Seawall Drive; pause → "Stuck? Back to the street" puts him on the nearest pavement from anywhere
- [ ] Settings → Graphics → Film grain: Off, Light (default) and Strong change the picture live
- [ ] Settings → Gameplay → Weather → Stormy: rain streaks, wet shiny roads, lightning and thunder; under a bridge the rain stops in front of you
- [ ] Drive into a Fresh Coat with a star or two and nobody watching: pick a colour, E, the door comes down, the car comes out repainted and repaired and the stars are gone
- [ ] With a police car right behind you, the colour card says to lose them first
- [ ] Buy a business at its For Sale sign: the sign changes, the map icon turns green, and a payday arrives within eight minutes
- [ ] Earn an achievement (get a wanted star): the banner drops in at the top; Pause → Progress lists it with the date
- [ ] Pause → Photo mode: fly round, change the filter, time and weather, press Enter: a PNG downloads; Esc puts everything back
- [ ] Bayline Arms (crosshair icon on the map): E at the counter, W/S to choose, A/D box or fill, E to buy ammo, armour and a new gun; Space to leave
- [ ] Aim a rifle: Jay holds it level at the shoulder; fire from the hip: he turns to face the crosshair dot
- [ ] Shots kick the view, leave bullet holes and sparks; hit markers go gold for headshots and red for kills
- [ ] The sniper rifle and the Osprey DMR show a scope when aimed; the wheel zooms the sniper's scope
- [ ] Rocket launcher (9): one rocket wrecks a car; the minigun spins up before it fires; limpets stick and go off on R
- [ ] The Jolt stun gun drops someone for five seconds with no blood
- [ ] Enemies hold visible guns, flinch when hit and drop their weapon or ammo; police cars have ammo in the back
- [ ] Walk over an armour pickup at Meridian Yard: +50 armour, gone for three minutes
- [ ] Press P on foot: the phone rises from the bottom right and the game pauses; Hustles, Rep, Jobs and Bank open; Set GPS on a job draws the route; P or Esc closes it
- [ ] Earn Rep (finish a taxi fare): the badge by the money fills, and a level-up banner pays $200 x the level
- [ ] Finish all three Daily Hustles: the streak bonus pays $1,000 x the streak
- [ ] Drive a car into a Busted Spanner bay (spanner icon) and stop: cash on the spot; a hot-list car pays 2.5x; a police car brings two stars
- [ ] Get in the ambulance at Mercy General and press P: paramedic duty starts with a timer; P again goes off duty
- [ ] Wait a couple of minutes in free roam: a street encounter (pulsing !) starts nearby; ignore it and it goes away
- [ ] Find the cash stash on the Civic Plaza terrace near the start: a chime as you get close, then the CASH STASH pop
- [ ] Upgrade a business at its sign with E: the sign shows a star and the payday note itemises the upgrade
- [ ] The title screen says v2.0 and What's new lists the Hustle update

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
