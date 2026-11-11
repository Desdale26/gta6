# VICEHAVEN 3.0 — the bigger city, as built

This is the plan of the world after the 3.0 expansion, for the district
builders. Everything here is generated from data: `js/data/districts.js`
(districts, the new roads `VH.Data.roads3`, Isla Paloma `VH.Data.island`, the
new blocks `VH.Data.cells3`, the new landmarks `VH.Data.landmarks3`) and
`js/citygen.js` (`layout.blocks3`, `layout.plots`). The numbers below were
printed from the generator, so they are the truth; if you change the data,
re-check them.

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
