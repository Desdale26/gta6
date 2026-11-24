# VICEHAVEN 3.0 — the bigger city, as built

This is the plan of the world after the 3.0 expansion, for the district
builders. Everything here is generated from data: `js/data/districts.js`
(districts, the new roads `VH.Data.roads3`, Isla Paloma `VH.Data.island`, the
new blocks `VH.Data.cells3`, the new landmarks `VH.Data.landmarks3`) and
`js/citygen.js` (`layout.blocks3`, `layout.plots`). The numbers below were
printed from the generator, so they are the truth; if you change the data,
re-check them. The 4.0 fill (six more districts, the strips along the
edges and Paloma Cove's islet) is at the end: "VICEHAVEN 4.0 — no empty
spaces".

## Conventions

- The world is flat. Ground is y = 0, every pavement slab is y = 0.15
  (`KERB`), roads are y = 0. +X is east, **−Z is north**. Roads are
  axis-aligned. Avenues run north–south (axis `'z'`, `coord` = x), streets
  east–west (axis `'x'`, `coord` = z).
- A heading/yaw `a` points along (sin a, cos a): yaw 0 faces south (+Z),
  π faces north, π/2 faces east, −π/2 faces west.
- The playable world is x −1600..1560, z −1800..1800 (`layout.config.bounds`).
  A hedge and an invisible wall close the west, north and south edges on the
  mainland; the bay (x > 424, except Isla Paloma) is the east edge.
  Anyone in the water swims back to the nearest street (main.js).
- The mainland seawall is x = 424 from z −1800 to 1800. Isla Paloma is land
  at y = 0 inside its rectangles (`VH.CityGen.isLand(x, z)`), water elsewhere
  (sea floor y = −8, water surface y = −1.1).
- The world is cut into 192 m chunks (origin −768); geometry you add through
  `world.ctxAt(x, z)` lands in the chunk containing (x, z) and is merged into
  one mesh per material per chunk.

## The districts

| id | Name | rect (districtAt) x | z | generic fill (archetypes, floors) |
|---|---|---|---|---|
| `sandpiper` | Sandpiper Beach | 13..470 | 641..1190 | lowrise 1–2, shophouse 1–2, hotel 4–7, apartment 3–5; palmTall street trees |
| `vistaverde` | Vista Verde | −640..13 | 641..1190 | house 1 (driveway, lawn, garage door), villa 2, apartment 2–3; one park block |
| `ironside` | Ironside | −640..0 | 1190..1800 | shed 1–2 (forecourt, roller doors), office 2–3; 25% yards |
| `thebowl` | The Bowl | 0..470 | 1190..1800 | shophouse 1–2, lowrise 1–2, shed 2–3; 35% car parks |
| `sunreel` | Sunreel Studios | −1080..−640 | 55..680 | shed 2–3 (sound stages), office 2–4, lowrise |
| `cindercreek` | Cinder Creek | −1080..−640 | −700..−55 | shed 1, lowrise 1, shophouse 1; 30% open lots |
| `halcyon` | Halcyon University | −640..−80 | −1100..−670 | office 3–5 (brick), apartment 4–6 (dorms), shophouse 2–3 |
| `coralmarina` | Coral Marina | 60..470 | −1100..−661 | apartment 6–14 (condos), hotel 8–14, shophouse 1–2 |
| `neonstrand` | Neon Strand | 700..1300 | −288..180 | hotel 10–24, shophouse 1–3, lowrise 2 |
| `oldpaloma` | Old Paloma | 700..1300 | 180..900 | shophouse 2–4, apartment 3–4; alleys |
| `palomaheights` | Paloma Heights | 700..1300 | −700..−288 | villa 2, house 1 |
| `palomafield` | Paloma Field | 1300..1700 | −700..900 | nothing generic (the whole district is the airfield plot) |

Each district has `palette`, `trees` ({ type, spacing, chance }) and
`ambient` ({ peds, cars } multipliers for crowd.js and traffic.js) in
districts.js. New archetypes in buildings.js: `house`, `shed`, `lowrise`.
The old districts (and the Grand Avenue North / Meridian West roadside
strips, Northgate, the airport and the fort) are unchanged.

## Roads

New and extended roads (every one starts and ends on another road; no dead
ends, so no barriers). New crossroads with four legs have traffic lights
(`intersection.v3`, `signal`). `spans` give a stretch its own name in the
HUD (the bridges).

| Road | axis | at | from .. to | width (median) | |
|---|---|---|---|---|---|
| Coral Avenue | N-S, x | -96 | -1070 .. 384 | 14 | extended (was -512..384) |
| Grand Avenue | N-S, x | 0 | -1180 .. 1760 | 26 (4) | extended (was -1180..620) |
| Pelican Avenue | N-S, x | 288 | -1070 .. 660 | 14 | extended (was -512..620) |
| Seawall Drive | N-S, x | 384 | -1070 .. 384 | 14 | extended (was -384..384) |
| Anchor Street (Paloma Bridge 391..780, Bridge Street 780..1300) | E-W, z | -288 | -636 .. 1300 | 14 | extended (was -620..384) |
| Heron Street | E-W, z | 288 | -636 .. 384 | 14 | extended (was -620..384) |
| Westgate Parkway | N-S, x | -636 | -1070 .. 1760 | 22 (2) | new |
| South Coast Highway | E-W, z | 1760 | -636 .. 330 | 22 (2) | new |
| Sandpiper Drive | N-S, x | 330 | 660 .. 1760 | 18 (3) | new |
| Southbay Road | E-W, z | 660 | -1050 .. 330 | 18 (3) | new |
| Seabreeze Street (Southbay Causeway 424..780) | E-W, z | 790 | -636 .. 980 | 14 | new |
| Dune Street | E-W, z | 920 | -636 .. 330 | 14 | new |
| Orchard Street | E-W, z | 1050 | -636 .. 330 | 14 | new |
| Mariner Way | E-W, z | 1190 | -636 .. 330 | 18 (3) | new |
| Foundry Road | E-W, z | 1470 | -636 .. 330 | 14 | new |
| Linden Avenue | N-S, x | -480 | 660 .. 1190 | 14 | new |
| Birchwood Avenue (Smelter Avenue 1190..1760) | N-S, x | -320 | 660 .. 1760 | 14 | new |
| Hollyhock Avenue | N-S, x | -160 | 660 .. 1190 | 14 | new |
| Surfrider Avenue | N-S, x | 160 | 660 .. 1190 | 14 | new |
| Studio Road | E-W, z | 200 | -1050 .. -636 | 14 | new |
| Klieg Street | E-W, z | 440 | -1050 .. -636 | 14 | new |
| Backlot Avenue | N-S, x | -1050 | 200 .. 660 | 14 | new |
| Premiere Avenue | N-S, x | -850 | 200 .. 660 | 14 | new |
| Cinder Road | E-W, z | -660 | -1050 .. -636 | 14 | new |
| Starview Road | E-W, z | -440 | -1050 .. -636 | 14 | new |
| Haulers Road | E-W, z | -200 | -1050 .. -636 | 14 | new |
| Dustbowl Lane | N-S, x | -1050 | -660 .. -200 | 14 | new |
| Juniper Avenue | N-S, x | -850 | -660 .. -200 | 14 | new |
| College Road | E-W, z | -1070 | -636 .. -96 | 14 | new |
| Varsity Road | E-W, z | -760 | -636 .. -96 | 14 | new |
| Chancellor Avenue | N-S, x | -360 | -1070 .. -760 | 14 | new |
| Marina Boulevard | E-W, z | -750 | 0 .. 384 | 16 | new |
| Lighthouse Road | E-W, z | -1070 | 288 .. 384 | 14 | new |
| Mirador Road | E-W, z | -470 | 800 .. 1300 | 14 | new |
| The Strand | E-W, z | -60 | 800 .. 1300 | 18 (3) | new |
| Mission Street | E-W, z | 180 | 800 .. 1300 | 14 | new |
| Harbour Street | E-W, z | 420 | 800 .. 1300 | 14 | new |
| Bayfront Drive | N-S, x | 800 | -470 .. 420 | 14 | new |
| Paloma Way | N-S, x | 980 | -470 .. 790 | 14 | new |
| Lantana Avenue | N-S, x | 1160 | -470 .. 420 | 14 | new |
| Airfield Road | N-S, x | 1300 | -470 .. 420 | 14 | new |

Widths: 14 m roads have one lane each way plus kerbside parking; 18 m and
wider have two lanes each way (and a planted median where shown).

Driving loop: Grand Avenue runs the whole map north–south; Westgate Parkway
(x −636) is the western bypass from Halcyon to Ironside; the South Coast
Highway (z 1760) and Sandpiper Drive (x 330, the coast road) close the loop
in the south; Southbay Road (z 660) links the west to the beach; the Paloma
Bridge and the Southbay Causeway make a loop through Isla Paloma.

## Isla Paloma and the bridges

- Land: x 780..1520, z −580..580, plus the old town's spur x 780..1160,
  z 580..840 (`VH.Data.island.land`). Seawall faces down to the sea floor,
  a coping, a railing and an invisible wall all round (js/island.js), open
  only where the bridges land.
- **Paloma Bridge**: Anchor Street, z = −288, x 424..780 (deck 14 m + 2.2 m
  walkways each side, parapets and railings cars can't jump, piers every
  36 m, two suspension towers at x 530 and 674, 52 m high, with cables).
  It continues on the island as Bridge Street to Airfield Road (x 1300).
- **Southbay Causeway**: Seabreeze Street, z = 790, x 424..780 (same deck,
  no towers), from Sandpiper Drive to Paloma Way at the spur.
- The mainland boardwalk and seawall are cut where the bridge leaves
  Harbor Point (z −297..−279); the causeway leaves from the Sandpiper beach
  strip.
- `VH.Island.bridgeAt(x, z)` tells you if a point is on a bridge (the HUD
  shows the bridge's name). The ISLAND-A builder dresses the bridge (lights,
  signs, flags): add to it, don't rebuild its deck or colliders.

## Landmark plots (reserved for the district builders)

Each plot is a whole block: a kerbed pavement slab (top y = 0.15, collider
tag `'kerb'`) inside the rectangle given, with roads (or the shore) round it.
The generic fill leaves plots empty: no lots, no street lamps, no trees on
them. Until a builder claims a plot it shows a placeholder (a lawn, sand on
the beach, and a "Coming soon" board). "Front" is the side on the widest
road: the landmark's default story place stands on that pavement, facing in.

| Place id | Name | District | Plot rectangle x0, z0 .. x1, z1 (pavement slab) | Size m | Front (widest road) | Roads round it |
|---|---|---|---|---|---|---|
| `sandpiper_beach` | Sandpiper Beach | sandpiper | 339, 797 .. 421, 1187 | 82 x 390 | west | north: Seabreeze Street; west: Sandpiper Drive |
| `sandpiper_promenade` | Sandpiper Promenade | sandpiper | point 346, 980 | - | - | GPS to 330, 980 |
| `skate_park` | Sandpiper Skate Park | sandpiper | 167, 927 .. 321, 1043 | 154 x 116 | east | north: Dune Street; south: Orchard Street; west: Surfrider Avenue; east: Sandpiper Drive |
| `verde_mall` | Verde Mall | vistaverde | -153, 669 .. -13, 783 | 140 x 114 | east | north: Southbay Road; south: Seabreeze Street; west: Hollyhock Avenue; east: Grand Avenue |
| `vista_verde_school` | Vista Verde School | vistaverde | -473, 927 .. -327, 1043 | 146 x 116 | north | north: Dune Street; south: Orchard Street; west: Linden Avenue; east: Birchwood Avenue |
| `ironside_scrapyard` | Ironside Scrapyard | ironside | -625, 1477 .. -327, 1749 | 298 x 272 | south | north: Foundry Road; south: South Coast Highway; west: Westgate Parkway; east: Smelter Avenue |
| `ironside_power` | Ironside Power Station | ironside | -313, 1477 .. -13, 1749 | 300 x 272 | east | north: Foundry Road; south: South Coast Highway; west: Smelter Avenue; east: Grand Avenue |
| `ironside_railyard` | Ironside Rail Yard | ironside | -625, 1199 .. -327, 1463 | 298 x 264 | west | north: Mariner Way; south: Foundry Road; west: Westgate Parkway; east: Smelter Avenue |
| `mariner_stadium` | Mariner Stadium | thebowl | 13, 1199 .. 321, 1463 | 308 x 264 | west | north: Mariner Way; south: Foundry Road; west: Grand Avenue; east: Sandpiper Drive |
| `southbay_speedway` | Southbay Speedway | thebowl | 13, 1477 .. 321, 1749 | 308 x 272 | west | north: Foundry Road; south: South Coast Highway; west: Grand Avenue; east: Sandpiper Drive |
| `expo_hall` | Southbay Expo Hall | thebowl | 339, 1193 .. 421, 1467 | 82 x 274 | west | west: Sandpiper Drive |
| `sunreel_gate` | Sunreel Studios Gate | sunreel | -843, 207 .. -647, 433 | 196 x 226 | east | north: Studio Road; south: Klieg Street; west: Premiere Avenue; east: Westgate Parkway |
| `sunreel_backlot` | Sunreel Backlot | sunreel | -1043, 207 .. -857, 433 | 186 x 226 | north | north: Studio Road; south: Klieg Street; west: Backlot Avenue; east: Premiere Avenue |
| `sunreel_western_set` | The Western Set | sunreel | -1043, 447 .. -857, 651 | 186 x 204 | south | north: Klieg Street; south: Southbay Road; west: Backlot Avenue; east: Premiere Avenue |
| `starview_drivein` | Starview Drive-In | cindercreek | -1043, -653 .. -857, -447 | 186 x 206 | north | north: Cinder Road; south: Starview Road; west: Dustbowl Lane; east: Juniper Avenue |
| `cinder_truckstop` | Cinder Creek Truck Stop | cindercreek | -843, -433 .. -647, -207 | 196 x 226 | east | north: Starview Road; south: Haulers Road; west: Juniper Avenue; east: Westgate Parkway |
| `cinder_storage` | Cinder Creek Self Storage | cindercreek | -1043, -433 .. -857, -207 | 186 x 226 | north | north: Starview Road; south: Haulers Road; west: Dustbowl Lane; east: Juniper Avenue |
| `halcyon_clocktower` | Halcyon Clock Tower | halcyon | point -228, -915 | - | - | GPS to -228, -1070 |
| `halcyon_quad` | The Quad | halcyon | -353, -1063 .. -103, -767 | 250 x 296 | north | north: College Road; south: Varsity Road; west: Chancellor Avenue; east: Coral Avenue |
| `halcyon_library` | Halcyon Library | halcyon | -625, -1063 .. -367, -767 | 258 x 296 | west | north: College Road; south: Varsity Road; west: Westgate Parkway; east: Chancellor Avenue |
| `coral_marina` | Coral Marina | coralmarina | 391, -1067 .. 421, -753 | 30 x 314 | west | west: Seawall Drive |
| `marina_lighthouse` | Marina Lighthouse | coralmarina | point 400, -1064 (water reserved x 430..600, z -1092..-1048) | - | - | GPS to 384, -1070 |
| `yacht_club` | Coral Yacht Club | coralmarina | 295, -1063 .. 377, -758 | 82 x 305 | south | north: Lighthouse Road; south: Marina Boulevard; west: Pelican Avenue; east: Seawall Drive |
| `wonder_wharf` | Wonder Wharf | neonstrand | 807, -51 .. 973, 173 | 166 x 224 | north | north: The Strand; south: Mission Street; west: Bayfront Drive; east: Paloma Way |
| `neon_strand` | The Neon Strand | neonstrand | point 1070, -48 | - | - | GPS to 1070, -60 |
| `paloma_convention` | Paloma Convention Centre | neonstrand | 987, -281 .. 1153, -69 | 166 x 212 | south | north: Bridge Street; south: The Strand; west: Paloma Way; east: Lantana Avenue |
| `paloma_plaza` | Plaza Paloma | oldpaloma | 987, 187 .. 1153, 413 | 166 x 226 | north | north: Mission Street; south: Harbour Street; west: Paloma Way; east: Lantana Avenue |
| `paloma_harbour` | Paloma Harbour | oldpaloma | 783, 583 .. 973, 783 | 190 x 200 | south | south: Seabreeze Street; east: Paloma Way |
| `paloma_fort` | Fort San Paloma | oldpaloma | 987, 427 .. 1157, 837 | 170 x 410 | north | north: Harbour Street; west: Paloma Way |
| `paloma_gardens` | Paloma Botanical Gardens | palomaheights | 987, -463 .. 1153, -295 | 166 x 168 | north | north: Mirador Road; south: Bridge Street; west: Paloma Way; east: Lantana Avenue |
| `paloma_observatory` | Paloma Observatory | palomaheights | 1167, -463 .. 1293, -295 | 126 x 168 | north | north: Mirador Road; south: Bridge Street; west: Lantana Avenue; east: Airfield Road |
| `paloma_estate` | The Paloma Estate | palomaheights | 807, -463 .. 973, -295 | 166 x 168 | north | north: Mirador Road; south: Bridge Street; west: Bayfront Drive; east: Paloma Way |
| `paloma_field` | Paloma Field | palomafield | 1307, -577 .. 1517, 577 | 210 x 1154 | west | west: Airfield Road |

Notes:
- `coral_marina` is the 30 m strip between Seawall Drive and the seawall:
  the marina itself (jetties, pontoons, moored boats) goes out over the bay,
  x 424..~620 between z −1067 and −753. The water at x 430..600,
  z −1092..−1048 is kept for the lighthouse breakwater (`marina_lighthouse`;
  its place is at the shore end of Lighthouse Road until you move it).
- `paloma_harbour` faces the bay on its west side (the shore is x = 780); the
  quays go along/over the water there. `paloma_fort` is the tip of the spur:
  its south (z 840) and east (x 1160) sides are the shore.
- `paloma_field` (210 x 1154 m) is the whole east of the island: room for a
  north–south runway of ~1000 m. `wonder_wharf` faces the bay on its west
  side too (Bayfront Drive between it and the seawall).
- The stunt ramps' field north of Northgate (x 30..185, z −840..−765) is not
  in any block; keep it clear.
- Points without a plot: `sandpiper_promenade` (on the beach plot's west
  edge), `halcyon_clocktower` (inside the quad plot), `neon_strand` (on The
  Strand's pavement), `marina_lighthouse`.

## Generic blocks

The blocks the generic fill built (pavement rectangles, lot count). Story
places of ordinary kinds resolve on these.

| District | Generic blocks (x0, z0 .. x1, z1, lots) |
|---|---|
| vistaverde | -625,669..-487,783 (18); -625,797..-487,913 (16); -625,927..-487,1043 (18); -625,1057..-487,1181 (16); -473,669..-327,783 (12); -473,797..-327,913 (17); -473,1057..-327,1181 (16); -313,669..-167,783 (20); -313,797..-167,913 (20); -313,927..-167,1043 park; -313,1057..-167,1181 (16); -153,797..-13,913 (16); -153,927..-13,1043 (20); -153,1057..-13,1181 (16) |
| sandpiper | 13,669..153,783 (24); 13,797..153,913 (26); 13,927..153,1043 (22); 13,1057..153,1181 (24); 167,669..321,783 (26); 167,797..321,913 (24); 167,1057..321,1181 (32); 339,663..421,783 (12) |
| ironside | -313,1199..-13,1463 (38) |
| thebowl | 339,1473..421,1757 (16) |
| sunreel | -1047,63..-853,193 (10); -847,63..-647,193 (12); -843,447..-647,651 (16) |
| cindercreek | -843,-653..-647,-447 (27); -1047,-193..-853,-63 (18); -847,-193..-647,-63 (16) |
| halcyon | -625,-753..-363,-683 (12); -357,-753..-103,-683 (12) |
| coralmarina | 63,-1067..281,-853 (36); 203,-847..281,-758 (4); 63,-742..281,-667 (12); 295,-742..377,-667 (4) |
| palomaheights | 783,-577..977,-477 (8); 983,-577..1157,-477 (8); 1163,-577..1297,-477 (4) |
| neonstrand | 807,-281..973,-69 (18); 1167,-281..1293,-69 (12); 987,-51..1153,173 (16); 1167,-51..1293,173 (11) |
| oldpaloma | 807,187..973,413 (94); 1167,187..1293,413 (78); 783,427..973,577 (78); 1163,427..1297,577 (51); 783,797..977,837 (20) |

## How to build a district

1. Create `js/districts/<id>.js` (one per district; a group may also keep a
   shared helper file of its own). Use the same IIFE pattern as the other
   files:

```js
(function () {
  'use strict';
  const VH = window.VH;
  const KERB = 0.15;
  VH.Districts.register({
    id: 'sandpiper',
    name: 'Sandpiper Beach',
    plots: ['sandpiper_beach', 'skate_park'],   // plots you build (no placeholder there)
    build(world, layout) {                        // at load time, after the generic fill
      const b = layout.plots.skate_park;          // { minX, maxX, minZ, maxZ, cx, cz, district, ... }
      const ctx = world.ctxAt(b.cx, b.cz);
      // ... geometry, colliders, props, signs
    },
    registerPlaces(world, places) {               // after build, before story places resolve
      places.add('skate_park', { name: 'Sandpiper Skate Park', x, z, yaw, kind: 'park', district: 'sandpiper' });
      places.extra.sandpiper.push({ x, z, yaw, kinds: ['beach', 'boardwalk'], name: 'Lifeguard tower 3' });
    },
    System: SandpiperLife,                        // optional: moving parts at run time (see below)
  });
})();
```

2. Add its script tag to `index.html` right after
   `<script src="js/island.js" ...>` (same `onerror="VHBoot.missing(this)"`
   form). It must load after citygen.js and before world.js builds (any spot
   in that block is fine). `tools/bundle.mjs` picks it up from index.html.

### The chunk builder (`world.ctxAt(x, z)`)

`ctx` belongs to the chunk containing (x, z). Draw each piece through the ctx
of the chunk it stands in (split anything longer than ~100 m into pieces,
as island.js does), or it is culled with the wrong chunk. Surfaces (each is
one merged mesh per chunk): `ctx.b` (buildings: walls with window grids via
`b.wall` / facade vectors, see buildings.js), `concrete`, `wood`, `prop`
(painted metal/plastic), `propMatte`, `plaza`/`plazaTop`, `grass`/`grassTop`,
`asphaltTop`, `sidewalk`, `road`, `marks` (road paint), `decal`, `hedge`
(foliage), `screen` (emissive, lit at night), `interior`. Use the `...Top`
variants for surfaces lying on the 0.15 m slab (they are polygon-offset, no
z-fighting). Builder methods (geometry.js): `box(x0, y0, z0, x1, y1, z1, color, { skip: { top, n, s, e, w }, bottom, uvScale })`,
`topRect(x0, z0, x1, z1, y, color, uvScale)`, `polygon(points, color)`,
`cylinder(cx, y0, cz, rBottom, rTop, h, segments, color, capTop)`,
`orientedBox(cx, cz, hx, hz, yaw, y0, y1, color)`, `wall(...)`,
`merge(threeGeometry, matrix4, color)` (anything sloped or rotated). Colours
are `VH.col(0xRRGGBB)`; `VH.colMul(c, k)` shades.

Also on ctx: `addProp(type, x, z, yaw, scale, y)`, `addLawn(x0, z0, x1, z1)`
(grass footsteps), `addBeacon(x, y, z)` (blinking aircraft light),
`addInteractable(def)`, `physics`.

### Physics

`world.physics.addBox(minX, minY, minZ, maxX, maxY, maxZ, tag, flags)`,
`addOrientedBox(cx, cz, hx, hz, yaw, minY, maxY, tag, flags)`,
`addRamp(cx, cz, hx, hz, yaw, baseY, yLow, yHigh, tag, flags)` (drivable
slopes: skate ramps, stands, a banked track). Flags `VH.COLLIDE.SOLID`
(things stand on / bump into it), `SHOTS` (stops bullets), `CAMERA` (keeps
the camera out), `ALL`. Default (no flags) = ALL. Tags drive footsteps and
behaviour: `'road'` (asphalt, AI lanes don't care), `'kerb'`, `'building'`,
`'wall'`, `'railing'`, `'boundary'` (invisible wall), `'dirt'` (gravel),
`'boardwalk'`/`'pier'`/`'plank'` (wood), `'metal'`/`'container'`. Anything a
car can drive on needs a SOLID collider whose top is the surface (the ground
itself is y = 0 everywhere on land; on water there is nothing).
`VH.Landmarks.railing(world, ctx, x0, z0, x1, z1, y, { height, color })` and
`VH.Landmarks.invisibleWall(world, x0, z0, x1, z1)` keep people out of the
bay at quays and jetties: every edge over water needs one.

### Props, signs, lights

- `world.addProp(type, x, y, z, yaw, scale)`: `streetlight` (lit at night,
  feeds the light pools), `signal6`/`signal11`, `palm`, `palmTall`, `tree`,
  `treeB`, `bench`, `bin`, `hydrant`, `bollard`, `dumpster`, `planter`,
  `barrier`, `beacon`. Props are instanced and carry their own colliders.
- `VH.Landmarks.sign(world, { x, y, z, yaw, w, h, lines: ['HEADLINE', 'smaller'], style, posts, twoSided })`;
  styles `plaque`, `info`, `welcome`, `brand`, `park`, `monolith`, `neon`
  (glows at night), `road`. Each sign is its own material: use them for
  names that matter, not for every shopfront (draw calls).
- Night: `screen` surfaces glow; neon signs brighten; streetlights light up.

### Places (story scenes)

- Your landmark ids get a default place on the plot's front pavement
  (`places._builtins3`). To put one somewhere better, `places.add(id, {...})`
  in `registerPlaces`; yours wins.
- Story places are written as `{ district, kind, desc }`. In a new district
  a place first takes a free spot you registered in
  `places.extra[<district>]` whose `kinds` lists that kind (a spot whose
  first kind matches is preferred), then falls back to the generic fill:
  shop fronts (`storefront`, `diner`, `bar`, `motel`, `garage`, `warehouse`,
  `street`, ...), `alley`, `parking`, `rooftop`, `corner`, and special kinds
  at the landmarks (`beach` → sandpiper_beach, `boardwalk`/`pier`/`dock` →
  promenade, marina, harbour, wharf, rail yard; `mansion` → a villa or the
  Paloma Estate; `park`, `overlook`; `construction` → a cleared lot).
  Register spots for the kinds your district's story will use: the beach
  and boardwalk at Sandpiper, docks and warehouses at Ironside, piers and
  docks at the marina and the harbour, mansions in Paloma Heights, a real
  construction site somewhere. Every spot: on the ground (or `y` given),
  clear of walls, reachable on foot from a road.
- District aliases (`isla_paloma` → neonstrand, `vista_verde`, `the_bowl`,
  ...) are in places.js. `places.define(defs, { late: true })` resolves
  those ids after all others (the DLC's places use it so they never take a
  spot an older story place would have had).

### Map

Paint your landmark onto the minimap and the full map with
`VH.MapPainters.push((g, layout, { R, on, circle, px, hair, PAL }) => { ... })`
(world metres; `R(x0, z0, x1, z1)` fills a rectangle with `g.fillStyle`;
see airfield.js and fort.js). Plots show as a lawn with a gold outline
until you paint over them. Badges and names for the landmarks are already
there (mapview.js, from `VH.Data.landmarks3`).

### Moving parts (`System`)

If the district needs anything at run time (a turning big wheel, a crusher,
parked aircraft that respawn, a race), give `register` a `System` class:
`new System(game)` after the game is built; `update(dt)` every frame
(allocate nothing per frame); optional `reset()`, `stop()`,
`blips(out, inMission)`, `stats()`, `saveKey` + `serialize()`/`load(data)`.
Useful game APIs: `game.vehicles.addFixedSpot({ type, x, z, yaw })`
(a vehicle that always waits there: `skylark`, `sparrow`, any car type),
`game.vehicles.spawn(type, x, z, yaw, opts)`, `game.places.get(id)`,
`VH.events.on(...)`, `game.isVisible(x, y, z, r)`.

## Performance rules

- The smoke test's budget is 1,400 draw calls anywhere (downtown is ~750).
  Every surface you use in a chunk is one draw call there; every sign is
  one or two; every separate `THREE.Mesh` you add is one. Prefer the ctx
  surfaces (merged) and props (instanced) over your own meshes.
- Keep triangle counts sensible (cylinders with 8–12 segments, no per-brick
  detail); hide small things by distance (props do it per type).
- Nothing may allocate per frame in `update`; build at load time.
- Load time: everything in `build()` runs while the loading bar moves;
  keep it to a few hundred ms per district (measure with `performance.now()`).

## What must not be touched

- The old city: its blocks, lots, roads, places, props and their RNG
  streams. Never change `VH.Data.districts` entries that aren't yours, the
  order of the lists in districts.js, the road data or `cells3` (block ids
  feed the generator; changing one moves things).
- The 4.0 data the same way: `FILL_DISTRICTS`, `districtOver`, `roads4`,
  `extend4`, `cells4` (append new cells at the end; an index is a block
  id and an RNG stream) and `open4`.
- Other builders' plots and districts; js/island.js's deck, shore and
  colliders; the stunt ramps' field; the lighthouse water rectangle is
  ISLAND/WEST-NORTH's only.
- Keep each plot's pavement slab (it is the kerb everyone walks on); build
  on it, cut ramps into it with `addRamp`, or cover it with your own surface.
- No real names: invent every brand, shop, team and film title.

## Testing

Boot headless with the helper in the scratchpad (`boot()`), teleport
(`VH.game.player.teleport(x, z, yaw)`), `VH.game.advance(seconds)` and take
stills. Check: no errors in the console, `renderer.stats().calls` at your
landmark from the ground and from 300 m up, the story places you
registered (`VH.game.places.get(id)`), and that a car can drive in and out.

### Collision audit (`tools/solidity.mjs`)

Nothing Jay can see should be walk-through, and nothing he can't see should
stop him on a street. Run the audit on your district before you call it done
(about a minute per district; one browser, so not while the smoke test runs):

```
cd /home/user/gta6
node vicehaven/tools/solidity.mjs sunreel               # one or more district ids
node vicehaven/tools/solidity.mjs 800,-60,980,150       # a rectangle x0,z0,x1,z1
node vicehaven/tools/solidity.mjs new                   # all twelve districts and both bridges
  --step 1.5  grid spacing (m)      --range 2.6  ray length (m)
  --min 3     smallest cluster worth listing (hits)
  --only ghost|invisible            --file sunreel.js (clusters from that file only)
  --json out.json                   the same report as data
```

It boots the game headless, records which source line drew every triangle
and added every collider, and from a grid of points Jay can reach on foot
from a road (at 0.4, 1.0 and 1.6 m above the ground) casts rays in eight
directions against the drawn scene and against `physics.raycast`. Places
behind a fence too tall to vault are not tested (so a fenced ride's
machinery may be scenery). Output, per area:

```
== sunreel  x -1080..-640, z 55..680  (163835 points, 0 out of reach, ...): 2 ghost, 0 invisible
  GHOST     at -962.9, 319.9  size 0.5 x 12.8  y 0.55..1.9  hits 213  levels 0.4/1/1.6
       116  districts/sunreel.js:121 < districts/sunreel.js:360 < districts/sunreel.js:796
```

- `GHOST`: something drawn with nothing solid behind it (walk-through).
  `INVISIBLE`: something solid on a road, pavement or plaza where nothing is
  drawn (an invisible wall; the `boundary` walls are left out).
- `at` is the centre, `size` the extent in x by z, `y` the heights it was
  hit at, `hits` how many rays saw it. Under it, the source lines that drew
  it, most hits first: `file:line < caller < caller`. A mesh you added
  yourself shows as `mesh "<name>" added at file:line`; a prop as
  `props.js (<type>)`.
- Never tested: foliage, decals and road paint, water, glows, anything wholly
  above 2.3 m, vehicles, people, effects, collectibles.
- Fix a ghost with a collider of the same shape (`addBox`, `addOrientedBox`,
  `addRamp` for slopes; a round thing wants a round-ish collider, not its
  bounding square). Low things (benches, kerbs, rails up to ~1.1 m) get a
  collider too: Jay vaults them. If something really is meant to be walked
  through (a bead curtain, spray, frangible runway edge lights), put
  `// solidity: passable` at the end of the line that draws it and the audit
  skips it (the summary counts those as "marked passable").
- Re-run until your district says `0 ghost, 0 invisible`.

### Emptiness scan (`tools/emptiness.mjs`)

Is any of the world still plain empty land? The scan boots the game
headless, looks straight down through a grid of cells (24 m by default) and
lays everything static that is drawn (chunk meshes, builders' own meshes,
instanced props) onto a 4 m sub-grid, leaving out the plain ground grass,
the bare pavement slab under a block and the trees (scattered trees on
grass are exactly what "empty" looks like). A cell is

- `EMPTY`: land with less than a quarter of it covered by anything;
- `OPEN`: empty, but inside ground a builder declared deliberate open space
  with `VH.Districts.open(x0, z0, x1, z1, label)` (call it from `build()`:
  a runway's grass strips, a pitch, a fairway left as plain grass);
- `PLOT`: a reserved landmark plot nobody has claimed yet (the placeholder);
- `BUILT`, `ROAD`, `WATER`.

```
cd /home/user/gta6
node vicehaven/tools/emptiness.mjs                          # the whole world
node vicehaven/tools/emptiness.mjs haverly redwater         # district ids ('new' = the six 4.0 districts)
node vicehaven/tools/emptiness.mjs --region -1600,-1800,-1100,-1100
  --cell 24      cell size (m)          --cover 0.25  share of a cell that must be covered
  --png out.png  the picture (default emptiness.png in the current folder; --png none)
  --json out.json   --top 15  largest empty rectangles to list   --min 4  their least cells
```

It prints a summary, a table per district (land, empty, open, plot, built,
road cells and % empty) and the largest empty rectangles in world metres
(x0, z0 .. x1, z1), largest first. The PNG: red = empty, green = open,
orange = unclaimed plot, grey = built, dark = road, blue = water, white
district outlines with their ids, gold dashed plot outlines, the listed
rectangles numbered in yellow. It is a report, not a test (exit code 0).
One browser, about a minute; not while the smoke test runs.

## VICEHAVEN 4.0 — no empty spaces (the fill, as built)

The countryside ring round the city and the gaps between the old districts
are now six more districts, strips of greens and allotments along the
edges, and a new islet. Strictly additive again: nothing older moved (a
dump of every block, lot, road, place, prop and collider before and after
compares equal outside the new land; the only things gone are the
scattered countryside trees that stood where the new blocks are, and
junction splits and median palms where a new road meets an old one).

Where it lives:

- `js/data/districts.js`, the 4.0 block at its end: the districts
  (`FILL_DISTRICTS`, inserted before `outskirts`, flagged `v3` and `v4`),
  `VH.Data.districtOver`, `VH.Data.archSets4`, `VH.Data.roads4`,
  `VH.Data.extend4`, the islet and its causeway (pushed onto
  `VH.Data.island`), `VH.Data.cells4`, `VH.Data.open4` and the landmarks
  (pushed onto `VH.Data.landmarks3` with `v4: true`).
- `js/citygen.js`: blocks `f_<district>_<n>` (n = the index in cells4)
  after the 3.0 blocks in `layout.blocks3`, RNG `'vicehaven-4'` forked per
  block id, `block.v4`, `block.arch`, `block.low`, `block.strip`; the old
  roads' former ends are kept as `v3From`/`v3To` so nothing laid out
  against them moves; `districtAt` checks `VH.Data.districtOver` first.
- `js/fill4.js` builds the country blocks (fields, farms, paddocks,
  allotments, greens) and registers their story spots; the town blocks
  use the generic fill in world.js like 3.0.
- `js/buildings.js`: the new archetypes `farmhouse`, `barn`, `silo`,
  `warehouse`, `depot`, `terrace`, `bigbox` and `VH.Buildings.hayBale`.
- `js/world.js`: the chunk builders' detail surfaces (below).

### The 4.0 districts

`districtAt` takes the first match: the `first:` rectangles
(`VH.Data.districtOver`, land inside an older district's rectangle that
only a 4.0 district uses), then every district's rectangles in list order.
`ambient.mix` in districts.js is each district's traffic ([type, weight]):
types that don't exist yet (`bus`, `tractor`) are skipped until a
vehicles builder adds them under those ids.

| id | Name | rects (districtAt) x0..x1, z0..z1 | lots | archetypes (floors) | ambient peds/cars |
|---|---|---|---|---|---|
| `haverly` | Haverly Farms | -1600..470, -1800..-1600; -1600..-1110, -1600..-1180; first: -1110..400, -1600..-1512; -1110..-1032, -1512..-1189 | 34–60 | farmhouse 1–2, barn 1–1, silo 1–1 | 0.15 / 0.3 |
| `gateway` | Gateway Park | -1600..-640, -1180..-700; -1600..-1080, -700..-430; first: -1110..-60, -1171..-1100; 60..384, -1134..-1100 | 34–60 | warehouse 1–2, depot 1–1, shed 1–2, lowrise 1–2 | 0.4 / 0.9 |
| `lantern` | Lantern Heights | -640..-96, -680..-392; -80..-60, -1100..-655 | 12–22 | terrace 2–3, apartment 4–5, shophouse 2–3 | 1.2 / 0.8 |
| `southgate` | Southgate | -640..-12, 392..641; first: -640..-12, 641..651 | 20–34 | apartment 5–9, shophouse 2–4, office 4–7 | 1.3 / 1 |
| `redwater` | Redwater | -1600..-640, 680..1800; -1600..-1080, 430..680 | 26–44 | house 1–1, farmhouse 1–2, shophouse 1–2, barn 1–1 | 0.3 / 0.4 |
| `palomacove` | Paloma Cove | 470..1100, 1440..1800 | 18–30 | lowrise 1–2, shophouse 1–2 | 0.9 / 0.4 |

Archetype sets a block can ask for instead of its district's own
(`archSets4`, cells4 `arch`): `farm` (farmhouse, barn, silo; an empty lot
is a dirt yard or, inside the block, a paddock), `hotels`, `carhire`
(mostly car-park lots), `trade` (bigbox and warehouses).

### Roads

Country lanes are 10–12 m (one lane each way, no parked cars: parking is
only on roads 14 m and wider), town streets 14 m. Every road starts and
ends on another road; four-leg crossroads get traffic lights like 3.0.
The roads' names show in the HUD, on the maps and in the GPS.

| Road | id | axis | at | from .. to | width |
|---|---|---|---|---|---|
| Haverly Lane | `haverly_ln` | x | -1700 | -1588 .. 384 | 10 |
| Westfield Road | `westfield_rd` | z | -1588 | -1700 .. 1760 | 12 |
| Mill Lane | `mill_ln` | z | -1300 | -1700 .. -440 | 12 |
| Thresher Lane | `thresher_ln` | x | -1560 | -1588 .. -1300 | 10 |
| Hayrick Lane | `hayrick_ln` | x | -1320 | -1588 .. -1300 | 10 |
| Freight Road | `freight_rd` | x | -870 | -1588 .. -636 | 14 |
| School Lane | `school_ln` | z | -510 | -660 .. -530 | 14 |
| Lamplighter Street | `lamplighter_st` | x | -530 | -636 .. -96 | 14 |
| Tramway Street | `tramway_w` | x | 520 | -384 .. -320 | 14 |
| Tramway Street | `tramway_e` | x | 520 | -160 .. 0 | 14 |
| Redwater High Street | `redwater_high` | z | -1300 | 440 .. 660 | 12 |
| Willow Lane | `willow_ln` | z | -1300 | 1190 .. 1760 | 10 |
| Tipper Lane | `tipper_ln` | z | -870 | 1470 .. 1760 | 14 |
| Cove Road (Cove Causeway 424..600) | `cove_rd` | x | 1784 | 330 .. 940 | 14 |
| Lagoon Road | `lagoon_rd` | z | 760 | 1600 .. 1784 | 14 |
| Shell Street | `shell_st` | x | 1600 | 760 .. 940 | 14 |
| Dolphin Road | `dolphin_rd` | z | 940 | 1600 .. 1784 | 14 |

| Older road, now longer | id | old from .. to | new from .. to |
|---|---|---|---|
| Seawall Drive | `ave384` | -1070 .. 384 | -1700 .. 384 |
| Airport Road | `airport_rd` | -760 .. 340 | -1588 .. 340 |
| College Road | `college_rd` | -636 .. -96 | -1588 .. -96 |
| Cinder Road | `cinder_rd` | -1050 .. -636 | -1588 .. -96 |
| Starview Road | `starview_rd` | -1050 .. -636 | -1588 .. -636 |
| Dustbowl Lane | `dustbowl_ln` | -660 .. -200 | -1180 .. -200 |
| Juniper Avenue | `juniper_ave` | -660 .. -200 | -1180 .. -200 |
| Cypress Parkway | `ave-384` | -384 .. 384 | -660 .. 660 |
| Tannery Avenue | `ave-288` | -384 .. 384 | -660 .. 384 |
| Market Avenue | `ave-192` | -384 .. 384 | -660 .. 384 |
| Coral Avenue | `ave-96` | -1070 .. 384 | -1070 .. 520 |
| Birchwood Avenue | `birchwood` | 660 .. 1760 | 384 .. 1760 |
| Hollyhock Avenue | `hollyhock` | 660 .. 1190 | 384 .. 1190 |
| Klieg Street | `klieg_st` | -1050 .. -636 | -1588 .. -636 |
| Southbay Road | `southbay_rd` | -1050 .. 330 | -1588 .. 330 |
| Dune Street | `dune_st` | -636 .. 330 | -1050 .. 330 |
| Mariner Way | `mariner_way` | -636 .. 330 | -1588 .. 330 |
| Foundry Road | `foundry_rd` | -636 .. 330 | -1588 .. 330 |
| South Coast Highway | `southcoast` | -636 .. 330 | -1588 .. 330 |
| Backlot Avenue | `backlot_ave` | 200 .. 660 | 200 .. 1760 |
| Sandpiper Drive | `sandpiper_dr` | 660 .. 1760 | 660 .. 1784 |

The Cove Causeway (on Cove Road, x 424..600, 14 m) is a bridge
(`VH.Data.island.bridges`, id `cove_causeway`) from Sandpiper Drive's new
south end to the islet; the seawall railing is open where it leaves the mainland.

### Paloma Cove's islet

The island's south end could not take Paloma Cove: Paloma Field's runway
runs to z 545 and Old Paloma's blocks and plots reach the shore, and
x 1160..1520, z 580..840 is water. So Paloma Cove is an islet of its own,
land x 600..1040, z 1480..1796 (`VH.Data.island.land`, 'Paloma Cove'),
south of Isla Paloma and clear of it (Isla Paloma's shore is unchanged),
with its own shore edges from island.js.

### Landmark plots (for FILL-COUNTRY and FILL-TOWN)

Each plot is a kerbed block (the pavement slab, y 0.15) with a placeholder
lawn and sign until a builder claims it (`plots: [...]` in
`VH.Districts.register`). The rectangle is the slab's edge. "front" is the
side on the widest road: the landmark's default place stands on the
pavement in the middle of that side (`places._plotFront`); register your
own with `places.add(id, ...)` to move it. "open" means no road on that
side (a neighbour block, the shore or open ground).

| Plot (landmark id) | block | x0 .. x1 | z0 .. z1 | size (m) | sides (road, width) | front | place |
|---|---|---|---|---|---|---|---|
| `haverly_windfarm` Haverly Wind Farm | f_haverly_2 | -1067 .. 381 | -1797 .. -1705 | 1448 x 92 | N: open; S: Haverly Lane (10); W: open; E: open | S | windfarm |
| `corn_maze` Haverly Corn Maze | f_haverly_10 | -1582 .. -1306 | -1422 .. -1325 | 276 x 97 | N: open; S: Hayrick Lane (10); W: Westfield Road (12); E: Mill Lane (12) | W | maze; low z -1505..-1395 |
| `haverly_farm_shop` Haverly Farm Shop | f_haverly_12 | -1582 .. -1306 | -1315 .. -1189 | 276 x 126 | N: Hayrick Lane (10); S: Airport Road (18); W: Westfield Road (12); E: Mill Lane (12) | S | farmshop |
| `longstay_parking` Gateway Long Stay | f_gateway_20 | -1294 .. -1057 | -1063 .. -877 | 237 x 186 | N: College Road (14); S: Freight Road (14); W: Mill Lane (12); E: Dustbowl Lane (14) | N | parking |
| `gateway_cargo` Gateway Cargo Terminal | f_gateway_21 | -1043 .. -857 | -1063 .. -877 | 186 x 186 | N: College Road (14); S: Freight Road (14); W: Dustbowl Lane (14); E: Juniper Avenue (14) | N | cargo |
| `redline_mx` Redline MX | f_gateway_23 | -1582 .. -1306 | -863 .. -667 | 276 x 196 | N: Freight Road (14); S: Cinder Road (14); W: Westfield Road (12); E: Mill Lane (12) | N | motocross |
| `gateway_pound` Gateway Vehicle Pound | f_gateway_27 | -1582 .. -1306 | -653 .. -447 | 276 x 206 | N: Cinder Road (14); S: Starview Road (14); W: Westfield Road (12); E: Mill Lane (12) | N | pound |
| `lantern_school` Lantern Heights Primary School | f_lantern_31 | -503 .. -391 | -653 .. -537 | 112 x 116 | N: Cinder Road (14); S: Lamplighter Street (14); W: School Lane (14); E: Cypress Parkway (14) | N | school |
| `kingfisher_park` Kingfisher Park | f_lantern_35 | -625 .. -391 | -523 .. -395 | 234 x 128 | N: Lamplighter Street (14); S: open; W: Westgate Parkway (22); E: Cypress Parkway (14) | W | park |
| `lantern_fire_station` Lantern Heights Fire Station | f_lantern_38 | -185 .. -103 | -523 .. -391 | 82 x 132 | N: Lamplighter Street (14); S: Northgate Street (14); W: Market Avenue (14); E: Coral Avenue (14) | N | firestation |
| `southgate_retail` Southgate Retail Park | f_southgate_39 | -625 .. -391 | 395 .. 651 | 234 x 256 | N: open; S: Southbay Road (18); W: Westgate Parkway (22); E: Cypress Parkway (14) | W | retail |
| `southgate_market` Southgate Market Hall | f_southgate_42 | -313 .. -167 | 391 .. 651 | 146 x 260 | N: Southshore Boulevard (14); S: Southbay Road (18); W: Birchwood Avenue (14); E: Hollyhock Avenue (14) | S | market |
| `southgate_cinema` Southgate Multiplex | f_southgate_44 | -89 .. -13 | 391 .. 513 | 76 x 122 | N: Southshore Boulevard (14); S: Tramway Street (14); W: Coral Avenue (14); E: Grand Avenue (26) | E | cinema |
| `southgate_depot` Southgate Bus and Tram Depot | f_southgate_45 | -153 .. -13 | 527 .. 651 | 140 x 124 | N: Tramway Street (14); S: Southbay Road (18); W: Hollyhock Avenue (14); E: Grand Avenue (26) | E | depot |
| `pelican_links` Pelican Links | f_redwater_48 | -1582 .. -1057 | 669 .. 1181 | 525 x 512 | N: Southbay Road (18); S: Mariner Way (18); W: Westfield Road (12); E: Backlot Avenue (14) | N | golf |
| `redwater_ranch` Redwater Ranch | f_redwater_49 | -1043 .. -647 | 669 .. 913 | 396 x 244 | N: Southbay Road (18); S: Dune Street (14); W: Backlot Avenue (14); E: Westgate Parkway (22) | E | ranch |
| `willow_lake` Willow Lake | f_redwater_51 | -1582 .. -1305 | 1199 .. 1463 | 277 x 264 | N: Mariner Way (18); S: Foundry Road (14); W: Westfield Road (12); E: Willow Lane (10) | N | lake |
| `redwater_solar` Redwater Solar Farm | f_redwater_54 | -1582 .. -1305 | 1477 .. 1749 | 277 x 272 | N: Foundry Road (14); S: South Coast Highway (22); W: Westfield Road (12); E: Willow Lane (10) | S | solar |
| `redwater_recycling` Redwater Recycling Centre | f_redwater_57 | -863 .. -647 | 1477 .. 1749 | 216 x 272 | N: Foundry Road (14); S: South Coast Highway (22); W: Tipper Lane (14); E: Westgate Parkway (22) | S | recycling |
| `cove_campsite` Cove Campsite | f_palomacove_58 | 603 .. 753 | 1483 .. 1777 | 150 x 294 | N: open; S: Cove Road (14); W: open; E: Lagoon Road (14) | S | campsite |
| `cove_beach_club` Cove Beach Club | f_palomacove_59 | 763 .. 937 | 1483 .. 1593 | 174 x 110 | N: open; S: Shell Street (14); W: open; E: open | S | club |
| `paloma_cove` Paloma Cove | f_palomacove_60 | 947 .. 1037 | 1483 .. 1781 | 90 x 298 | N: open; S: open; W: Dolphin Road (14); E: open | W | beach |

What must stay as it is on and round the plots:

- **Stunt ramps** (activities.js) already stand on four plots; keep each
  ramp, its run-up (about 60 m before it, along its heading) and its
  landing (about 50 m after it) clear and driveable: 'Outskirts rodeo'
  (−560, −470, heading east) in `kingfisher_park`; 'Estate lawn'
  (−560, 470, heading west) and 'The long field' (−470, 470, heading
  east) in `southgate_retail` (in the car park is fine); 'Hedge jumper'
  (−250, 520, heading south) in `southgate_market`.
- **Runway 09's approach**: arrivals come in from the west along z −1450,
  descending (airside.js), over the approach lights (x −1360..−1090) that
  stand in the open strip x −1582..−1039, z −1478..−1422 (`open4`, with a
  farm track). In z −1505..−1395 nothing may stand taller than the corn
  (about 3 m); `corn_maze` reaches into that band. Keep the wind farm's
  turbines on `haverly_windfarm` (250 m north of the approach line) under
  about 70 m to the blade tips.
- The fort's airstrip ends at z ±380 inside the walls: the allotments
  along the fort's north and south walls are `low` (no trees or lamps).
- `paloma_cove`, `cove_campsite` and `cove_beach_club` reach the islet's
  shore (3 m in): every edge over water needs a railing or an invisible
  wall (`VH.Landmarks.railing` / `invisibleWall`). The toll plaza goes at
  the causeway's island end on Cove Road (x 600..640): booths and a
  canopy on the verges and over the road, never blocking a lane (traffic
  drives through). Cove Crazy Golf and the lifeguard station go on the
  `paloma_cove` beach plot or the campsite.

### Generic blocks

The blocks the generic fill built (block id `f_<district>_<n>` shortened to
#n; rectangle = pavement or verge edge). Town blocks have lots like 3.0;
`farm`/`hotels`/`carhire`/`trade` use those archetype sets; `fields` are
crop strips; `park` a green; `allotments` plots of veg beds and sheds.
`low` blocks keep trees and lamps out of their low z band; `strip` blocks
are the greens and allotments along the edges (not where the maps write a
district's name).

| District | blocks (id, x0,z0..x1,z1, what: fields / park / allotments / farm, hotels, carhire, trade or town + lot count) |
|---|---|
| haverly | #0 -1585,-1797..-1303,-1705 farm 10; #1 -1297,-1797..-1073,-1705 fields; #3 -1582,-1695..-1306,-1565 farm 17; #4 -1294,-1695..-1039,-1563 fields; #5 -1033,-1695..-563,-1519 fields low; #6 -557,-1695..-83,-1519 fields low; #7 -77,-1695..377,-1519 fields low; #8 -1582,-1555..-1306,-1478 fields low; #9 -1294,-1557..-1039,-1478 fields low; #11 -1294,-1422..-1039,-1323 fields low; #13 -1294,-1317..-1039,-1189 farm 13 |
| gateway | #14 -1582,-1171..-1306,-1077 town 12; #15 -1294,-1171..-1057,-1077 hotels 8; #16 -1043,-1171..-857,-1077 carhire 8; #17 -843,-1171..-763,-1077 carhire 4; #18 -757,-1131..-639,-1077 town 2; #19 -1582,-1063..-1306,-877 town 24; #22 -843,-1063..-647,-877 town 16; #24 -1294,-863..-1057,-667 trade 7; #25 -1043,-863..-857,-667 town 16; #26 -843,-863..-647,-667 town 16; #28 -1294,-653..-1057,-447 town 22; #74 -633,-1131..-413,-1077 carhire 6 strip; #75 -407,-1105..-99,-1077 carhire 7 strip; #76 -93,-1159..-53,-1073 carhire 2 strip; #77 50,-1131..285,-1073 carhire 6 strip; #78 291,-1131..377,-1077 carhire 2 strip |
| lantern | #29 -625,-683..-103,-667 park; #30 -625,-653..-517,-537 town 40; #32 -377,-653..-295,-537 town 34; #33 -281,-653..-199,-537 town 26; #34 -185,-653..-103,-537 town 26; #36 -377,-523..-295,-391 town 34; #37 -281,-523..-199,-391 town 34; #79 -89,-1067..-53,-663 town 48 strip |
| southgate | #40 -377,391..-327,513 town 8; #41 -377,527..-327,651 town 8; #43 -153,391..-103,513 town 9 |
| redwater | #46 -1582,447..-1306,651 town 37; #47 -1294,447..-1057,651 town 35; #50 -1043,927..-647,1181 farm 47; #52 -1295,1199..-1057,1463 farm 21; #53 -1043,1199..-647,1463 town 74; #55 -1295,1477..-1057,1749 fields; #56 -1043,1477..-877,1749 town 24; #65 -1585,1771..-1303,1797 park strip; #66 -1297,1771..-873,1797 park strip; #67 -867,1771..-639,1797 park strip |
| palomacove | #61 767,1607..933,1777 town 42 |
| outskirts | #62 -1582,-433..-1506,-153 allotments strip; #63 -1582,-147..-1506,147 park strip; #64 -1582,153..-1506,433 allotments strip; #68 -633,1771..-323,1797 park strip; #69 -317,1771..-3,1797 park strip; #70 3,1771..321,1797 park strip; #71 391,-1797..421,-1079 park low strip; #72 391,-742..421,-393 park strip; #73 295,-661..377,-391 park strip; #80 -1085,-190..-1053,-49 park strip; #81 -1085,49..-1053,190 park strip; #82 339,1763..421,1777 park strip; #83 -1115,-433..-1057,-203 park strip; #84 -1115,203..-1057,433 park strip; #85 -1497,-433..-1121,-404 allotments low strip; #86 -1497,404..-1121,433 allotments low strip |

Open ground on purpose (`VH.Data.open4`, declared with
`VH.Districts.open` by fill4.js so the emptiness scan counts it as a
place): the runway 09 approach-light strip (x −1582..−1039,
z −1478..−1422) and the stunt ramps' field north of Northgate
(x 13..200, z −853..−747).

### The generic fill (what the blocks are made of)

- **Fields** (`fields` blocks): crop strips 14–24 m wide across the
  block with grass tractor tracks between them: wheat, barley, oilseed,
  lettuce, cabbage, ploughed furrows, hay with round bales (solid), corn
  and sunflowers taller than Jay, lavender. Crops are drawn as rows on
  tilled earth and are walk-through (marked `// solidity: passable`). A
  hedge (solid, 1.55 m) runs round each field 3.2 m in, with open field
  gates (posts and a swung-back steel gate) every ~110 m on the lane
  sides; hedgerow trees in the hedge line.
- **Farms** (`farm` blocks): farmhouses (porch, lawn, picket fence),
  barns (gambrel roof, great doors, a dirt yard with bales and a trough),
  silos (round bins with caged ladders on a pad, a machine shed), dirt
  yards; the block's inner lots are paddocks (post-and-rail fence, cows,
  sheep or horses grazing (static, solid), a water trough). A
  post-and-rail fence round the block with gates on the lanes.
- **Greens** (`park`): lawn on a kerbed slab, a paved path down the
  middle, trees both sides, benches, bins, lamps.
- **Allotments**: plots either side of a gravel path, timber-edged beds
  of veg rows or bean canes, sheds and water butts, a fence and gates.
- Country blocks stand on a raised grass verge (kerbed, 0.15 m) instead
  of a concrete pavement, with a lamp every 60 m on the sides that face a
  lane. Town blocks are the 3.0 fill (pavements, street trees, lamps,
  bins, hydrants, car parks with bays).
- **Detail surfaces** (world.js): `ctx.detail` (prop paint),
  `ctx.detailMatte`, `ctx.detailWood` draw like `prop`, `propMatte` and
  `wood` but are hidden when the camera is more than 320 m from the chunk
  (`DETAIL_FAR`). Put fences, gates, animals, bales, troughs, small
  sheds, crates and clutter on them: a chunk seen from the air then costs
  a handful of draw calls. Keep anything you can see from far (buildings,
  big roofs, towers, turbines, hedges, crops) on the ordinary surfaces.

### Life, places and the maps

- Pedestrians and traffic per district come from `ambient` (crowd.js and
  traffic.js read `peds` and `cars` for every v3 district; traffic.js also
  picks from `mix` in v4 districts). Parked cars stand on the 14 m+
  streets. Police, the GPS and road names work everywhere (the roads are
  ordinary `layout.roads`).
- The HUD names the district from `districtAt`; the full map writes each
  district's name over its blocks (strips left out) and badges the
  `major` landmarks; the minimap and the full map paint fields and
  allotments as strips of colour.
- Story spots registered by fill4.js in `places.extra[<district>]`:
  field gates (`fields`, `field`, `farm`, `lane`), the allotments gate
  (`allotments`, `garden`, `park`), the end of each green (`park`,
  `garden`, `bench`), and a spot in front of each lot by archetype:
  farmhouse (`farmhouse`, `farm`, `house`, `front_door`), barn (`barn`,
  `farm`, `garage`, `storage`), silo (`farm`, `yard`, `silo`), warehouse
  (`warehouse`, `loading_bay`, `cargo`, `depot`), depot (`depot`, `yard`,
  `truckstop`, `garage`), terrace (`house`, `front_door`, `terrace`),
  house, bigbox (`retail`, `storefront`, `superstore`), hotel (`hotel`,
  `motel`), apartment (`flats`, `apartment`, `front_door`), office
  (`office`, `front_door`), shophouse and lowrise (`shop`, `storefront`,
  `cafe`). Builders add the landmark kinds (`maze`, `golf`, `ranch`,
  `lake`, `motocross`, `market`, `beach` ...) on their plots.
- The landmarks' place ids are in the plot table; all 26 resolve inside
  their own district and the GPS reaches each from Civic Plaza.

### What is left for the builders

From the emptiness scan after this step (`node vicehaven/tools/emptiness.mjs`;
before the fill it found 6,020 empty cells of 24 m, about 3.5 km², after it
605): the six new districts have no empty land; what remains is the
reserved plots (orange, 2,466 cells with the Isla Paloma ones) and these
dressing jobs:

| Job | Where (x0..x1, z0..z1) | Empty cells (24 m) | Who |
|---|---|---|---|
| Every 4.0 landmark plot | the plot table above | 2,072 plot cells | FILL-COUNTRY: Haverly Farms and Redwater; FILL-TOWN: Gateway Park, Lantern Heights, Southgate, Paloma Cove |
| Fort Breakwater interior (read js/fort.js first, only add) | inside the walls, x −1500..−1120, z −400..400: the biggest gaps −1384..−1312, −96..240; −1480..−1432, −312..120; −1240..−1120, −240..−120; −1384..−1264, 264..384; −1240..−1096, 72..144; −1384..−1264, −384..−312; −1312..−1264, 72..240; the strips just inside the walls | 259 | FILL-TOWN |
| Airport infield and edges (read js/airfield.js and js/airside.js first) | −1024..−760, −1344..−1200; the strip inside the north fence −1024..368, −1512..−1488; −760..−448, −1248..−1200; the grass beside the taxiways at z −1416..−1392 (x −928..80); the strip between the fence's east end and Seawall Drive, x 344..368, z −1416..−1128; small bits of landside west of Grand Avenue North (z −1176..−1104) | 232 + 2 | FILL-TOWN |
| Crestline estate gardens (read js/outskirts.js `Estates` first, only add inside the garden walls) | the walled lawns of the mansions, x −640..−392, z −392..392 | 110 | FILL-TOWN |
| The bay (moving scenery) | the water east of the seawall | — | FILL-TOWN |

Run the scan on your own districts (`emptiness.mjs haverly redwater`,
`... gateway lantern southgate palomacove`, `... fort airport crestline`)
until only deliberate open ground is left; declare that with
`VH.Districts.open` and a label that says what it is.

**Done since (FILL-COUNTRY):** the eight Haverly Farms and Redwater plots
are built, in js/districts/haverly.js (farm shop, corn maze, wind farm) and
js/districts/redwater.js (Pelican Links, Redwater Ranch, Willow Lake, the
solar farm, the recycling centre), with their shared parts in
js/districts/country-kit.js (`VH.CountryKit`). Each file's header lists
what is on each plot. The scan now finds 0 empty and 0 plot cells in both
districts (the golf course and the driving range are also declared open
ground with `VH.Districts.open`).
