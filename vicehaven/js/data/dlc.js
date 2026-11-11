/*
 * dlc.js — the header of the story DLC "Chasing the Firecrest" (id dlc1).
 *
 * Fifty years ago Dess Marlow won the Southbay 500 in the Firecrest, took
 * seven parts off the car, hid them round the bay with a riddle on each, and
 * vanished. This file holds the cast, the story places and the factions; the
 * jobs live in dlc-act1a.js … dlc-act4b.js and dlc-side-<chain>.js, which all
 * start the same way and add to D. docs/DLC_BIBLE.md is the source of truth.
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  D.title = 'Chasing the Firecrest';
  D.tagline = 'Seven parts. Seven riddles. One lost racing car somewhere across the bay. And mind the road.';
  D.unlockAfter = ''; // the engine agent sets this to the main story's third job

  D.acts = {
    1: { title: 'Lot 17' },
    2: { title: 'Hiding in Plain Sight' },
    3: { title: 'Isla Paloma' },
    4: { title: 'The Last Lap' },
  };

  // ------------------------------------------------------------- the cast
  // Jay and Nana Lu (memories only) come from the main story; nobody else does.
  Object.assign(D.characters, {
    pip: {
      name: 'Pip Marlow', role: 'Speedway junior champion, banned from the roads; hires Jay', age: 19,
      look: { skin: 0xc68a5e, hair: 0xd8471f, top: 0xf2f2ee, bottom: 0x1d2e52, shoes: 0xd8262e, build: 'slim', hat: true },
      voice: { gender: 'female', pitch: 1.18, rate: 1.12 },
      bio: "Dess Marlow's granddaughter: mechanic's hands, a temper and no patience at all. Banned from public roads for six months for doing 92 in a 40 at three in the morning, so she needs a driver.",
    },
    milo: {
      name: 'Milo Quill', role: 'The riddle-solver, twelve', age: 12,
      look: { skin: 0x8d5a3b, hair: 0x1a1410, top: 0xf2c500, bottom: 0x3a3d42, shoes: 0x2a55d8, build: 'slim' },
      voice: { gender: 'male', pitch: 1.38, rate: 1.12 },
      bio: "Professor Quill's grandson, at Halcyon for the summer. Reads everything, forgets nothing, solves Dess's riddles before the grown-ups, and runs a blog called The Firecrest Files with 41 subscribers.",
    },
    prof_quill: {
      name: 'Professor Ambrose Quill', role: 'Halcyon historian, expert on the drowned driver', age: 63,
      look: { skin: 0xe0b48f, hair: 0xd8d4cc, top: 0xb59a70, bottom: 0x5c4a32, shoes: 0x3a2a1a, build: 'tall' },
      voice: { gender: 'male', pitch: 0.82, rate: 0.92 },
      bio: 'Professor of Local History and author of three books proving the Firecrest is at the bottom of the bay. Gets carsick in every car ever made; perfectly fine in aircraft.',
    },
    june: {
      name: 'June Marlow', role: "Driving instructor, Dess's daughter, Pip's mum", age: 51,
      look: { skin: 0xc68a5e, hair: 0x6b4a32, top: 0x78b8e8, bottom: 0xcbbd9c, shoes: 0xefefea, build: 'average' },
      voice: { gender: 'female', pitch: 1.02, rate: 0.94 },
      bio: "Vista Verde's driving instructor for thirty years, raised by her Aunt Win and told her mother died in a racing car. Marks everything on a clipboard and has never forgiven a racing car.",
    },
    toby: {
      name: 'Toby Brask', role: 'Keeper of the Coral Marina light; built the Firecrest', age: 81,
      look: { skin: 0xd9a37c, hair: 0xeeeeea, top: 0x1d2e52, bottom: 0x3a3d42, shoes: 0x111111, build: 'slim', hat: true },
      voice: { gender: 'male', pitch: 0.78, rate: 0.88 },
      bio: "Built the Firecrest with Dess Marlow fifty years ago and has kept the Coral Marina lighthouse for thirty-three. Dess gave him the tin box for her daughter's seventeenth birthday. He never delivered it.",
    },
    odie: {
      name: 'Odie Wren', role: 'Keeper of the Paloma fort light', age: 79,
      look: { skin: 0xc68a5e, hair: 0xe8e4dc, top: 0xd8471f, bottom: 0x2b2f35, shoes: 0x3a2a1a, build: 'slim' },
      voice: { gender: 'female', pitch: 0.96, rate: 1.0 },
      bio: 'Keeps the old lighthouse on the Paloma fort, buys twelve jam doughnuts every Tuesday and taps the counter three times when she pays. Nobody on the island knows where she came from.',
    },
    dess: {
      name: 'Dess Marlow', role: 'Winner of the Southbay 500, fifty years ago', age: 79,
      look: { skin: 0xc68a5e, hair: 0xe8e4dc, top: 0xd8471f, bottom: 0x2b2f35, shoes: 0x3a2a1a, build: 'slim' },
      voice: { gender: 'female', pitch: 0.96, rate: 1.0 },
      bio: 'Won the Southbay 500 in the Firecrest, hid the car and herself, and laid a trail of seven riddles for her baby daughter. Has spent nearly fifty years as Odie Wren, watching the sea.',
    },
    dash: {
      name: 'Dash Lockwood', role: "Host of TV's Lockwood's Lost Legends", age: 44,
      look: { skin: 0xe8c39e, hair: 0xd29a1c, top: 0x6b4a32, bottom: 0xcbbd9c, shoes: 0x6b4a32, build: 'average', hat: true },
      voice: { gender: 'male', pitch: 1.0, rate: 1.08 },
      bio: 'The bay\'s favourite TV treasure hunter: eleven legends found in eight series, every one of them the wrong thing. Castellane is paying for his Firecrest special. "Legend... FOUND!"',
    },
    leo: {
      name: 'Leo Castellane', role: 'Owner of the Neon Strand, the Speedway and forty hotels', age: 58,
      look: { skin: 0xd9a37c, hair: 0x3a3d42, top: 0xeeeae2, bottom: 0xeeeae2, shoes: 0x6b4a32, build: 'tall' },
      voice: { gender: 'male', pitch: 0.88, rate: 0.96 },
      bio: 'Owns most of Isla Paloma under a slogan that says his family have been "Champions Since Day One". Charming, generous, and unable to afford the slogan being a lie.',
    },
    ottoline: {
      name: 'Ottoline Graves', role: 'Head of Castellane Guest Services', age: 47,
      look: { skin: 0xf0d5be, hair: 0x111111, top: 0x13b5b1, bottom: 0x13b5b1, shoes: 0x0e0e10, build: 'tall' },
      voice: { gender: 'female', pitch: 0.92, rate: 0.9 },
      bio: 'Runs the polite people in teal blazers who make problems leave the island. Has never once raised her voice. Leaves a comment card wherever she has been.',
    },
    hob: {
      name: 'Hob Finnegan', role: 'Paloma Flying Club instructor and doughnut smuggler', age: 67,
      look: { skin: 0xe0b48f, hair: 0xb8bcc0, top: 0x2a6a3a, bottom: 0x6b6545, shoes: 0x3a2a1a, build: 'heavy', hat: true },
      voice: { gender: 'male', pitch: 0.86, rate: 1.04 },
      bio: "Chief (and only) instructor of the Paloma Flying Club, on the last bit of the island Castellane doesn't own. Flies real doughnuts past the Castellane bakery monopoly and marks every landing out of ten.",
    },
    chet: {
      name: 'Chet Valiant', role: 'Film star; Jay is his stunt double', age: 58,
      look: { skin: 0xe8c39e, hair: 0x1a1410, top: 0xa8101c, bottom: 0x111214, shoes: 0xf2f2ee, build: 'heavy' },
      voice: { gender: 'male', pitch: 0.8, rate: 0.95 },
      bio: 'Star of Oversteer 2: Understeer (there was no Oversteer 1), now playing Rex Castellane in Champions Since Day One. Lives in a trailer in Cinder Creek and will not drive over thirty.',
    },
    monty: {
      name: 'Monty Sprake', role: 'The voice of the Southbay Speedway', age: 55,
      look: { skin: 0xd9a37c, hair: 0x8f8a73, top: 0xf2c500, bottom: 0x2b2f35, shoes: 0x111111, build: 'heavy' },
      voice: { gender: 'male', pitch: 0.92, rate: 1.14 },
      bio: "Thirty years the voice of the Speedway and of every police chase on the coast road. Knows every lap record and nobody's name.",
    },

    // Minor characters
    fenella: {
      name: 'Fenella Moss', role: 'Director of Champions Since Day One', age: 42,
      look: { skin: 0xe0b48f, hair: 0x6e1a1a, top: 0x2b2f35, bottom: 0x6b6545, shoes: 0x111111, build: 'slim', hat: true },
      voice: { gender: 'female', pitch: 1.05, rate: 1.12 },
      bio: 'Megaphone, sun visor, three phones. Hates the script, loves a good stunt, and says "It\'s for the movie" before anyone else does.',
    },
    kit: {
      name: 'Kit Ambrose', role: "Dash's camera operator and researcher", age: 31,
      look: { skin: 0xa86b4c, hair: 0x1a1410, top: 0x3b1558, bottom: 0x2b2f35, shoes: 0x111111, build: 'average', hat: true },
      voice: { gender: 'female', pitch: 0.98, rate: 0.95 },
      bio: 'Films everything Dash does and reads everything Dash doesn\'t, including Milo\'s blog. "We\'re rolling. We\'re always rolling."',
    },
    clem: {
      name: 'Clem Ruddock', role: 'Cinder Creek Storage manager and auctioneer', age: 70,
      look: { skin: 0xd9a37c, hair: 0xb8bcc0, top: 0x9c6d5a, bottom: 0x3a3d42, shoes: 0x3a2a1a, build: 'heavy', hat: true },
      voice: { gender: 'male', pitch: 0.9, rate: 1.15 },
      bio: 'The fastest mouth in Cinder Creek. Sells dead men\'s lockers on Saturdays.',
    },
    plum: {
      name: 'Officer Plum', role: 'Halcyon campus security', age: 59,
      look: { skin: 0xc48a62, hair: 0x3a3d42, top: 0x2b4a6e, bottom: 0x2b2f35, shoes: 0x111111, build: 'heavy', hat: true },
      voice: { gender: 'male', pitch: 0.85, rate: 0.9 },
      bio: 'Torch, bicycle, and a deep personal commitment to the Halcyon quad.',
    },
    benny: {
      name: 'Benny Akande', role: 'Clerk at the Sandpiper Kwik Pik', age: 24,
      look: { skin: 0x6b4430, hair: 0x111111, top: 0xc8202a, bottom: 0x2b2f35, shoes: 0xf2f2ee, build: 'slim', hat: true },
      voice: { gender: 'male', pitch: 1.05, rate: 1.05 },
      bio: 'Has worked the promenade Kwik Pik for two summers and has never been asked to open the floor safe. Until now.',
    },
    gully: {
      name: 'Gully', role: 'Sandpiper lifeguard', age: 22,
      look: { skin: 0xd9a37c, hair: 0xe0c070, top: 0xc8202a, bottom: 0xd8262e, shoes: 0xefefea, build: 'average' },
      voice: { gender: 'male', pitch: 1.0, rate: 1.1 },
      bio: 'A whistle, a red vest and a grudge against anyone who has fun on his beach without him.',
    },
    daventry: {
      name: 'Captain Daventry', role: 'Castellane charter pilot (Guest Services)', age: 50,
      look: { skin: 0xe8c39e, hair: 0x7a8288, top: 0xf2f2ee, bottom: 0x1d2e52, shoes: 0x111111, build: 'tall', hat: true },
      voice: { gender: 'male', pitch: 0.86, rate: 0.95 },
      bio: 'A Guest Services man in a pilot\'s hat. Polite to the passengers. Less so to Jay.',
    },
    lorna: {
      name: 'Lorna Pike', role: 'Wonder Wharf arcade attendant', age: 66,
      look: { skin: 0xf0d5be, hair: 0xd8d4cc, top: 0xff3d8b, bottom: 0x2b2f35, shoes: 0x111111, build: 'average' },
      voice: { gender: 'female', pitch: 1.0, rate: 0.95 },
      bio: 'Has watched people fail at the Golden Grabber for forty years. Has opinions about the claw.',
    },
    ines: {
      name: 'Ines Duarte', role: 'Café owner on Paloma Plaza', age: 70,
      look: { skin: 0xc48a62, hair: 0xd8d4cc, top: 0xefefea, bottom: 0x1f3a26, shoes: 0x3a2a1a, build: 'heavy' },
      voice: { gender: 'female', pitch: 0.95, rate: 1.05 },
      bio: "Runs the café on Paloma Plaza and is Hob's best doughnut customer. Knows everybody's order.",
    },
    teddy: {
      name: 'Teddy Castellane', role: "Castellane Racing works driver, Leo's nephew", age: 21,
      look: { skin: 0xe0b48f, hair: 0x3a2a1a, top: 0xd29a1c, bottom: 0x0e0e10, shoes: 0xf2f2ee, build: 'slim' },
      voice: { gender: 'male', pitch: 1.05, rate: 1.05 },
      bio: "Talented, spoilt and fast. Pip's rival on the track. Not a villain; just never been told no.",
    },
    rosa: {
      name: 'Rosa Lindqvist', role: "June's most nervous pupil", age: 16,
      look: { skin: 0xf0d5be, hair: 0xe0c070, top: 0x9fe0c4, bottom: 0x2b4a6e, shoes: 0xf2f2ee, build: 'slim' },
      voice: { gender: 'female', pitch: 1.25, rate: 1.1 },
      bio: 'Has failed her three-point turn eleven times. Believes in herself on alternate days.',
    },
    gs_staff: {
      name: 'Guest Services', role: 'Castellane Guest Services staff', age: 35,
      look: { skin: 0xd9a37c, hair: 0x1a1410, top: 0x13b5b1, bottom: 0x13b5b1, shoes: 0x0e0e10, build: 'average' },
      voice: { gender: 'male', pitch: 0.92, rate: 0.95 },
      bio: 'Teal blazer, earpiece, a smile. "Good afternoon."',
    },
    marshal: {
      name: 'Marshal', role: 'Speedway marshal', age: 45,
      look: { skin: 0xc48a62, hair: 0x3a3d42, top: 0xe0a81a, bottom: 0x2b2f35, shoes: 0x111111, build: 'average', hat: true },
      voice: { gender: 'male', pitch: 0.95, rate: 1.0 },
      bio: 'Orange tabard, flags, a clipboard of his own.',
    },
    studio_guard: {
      name: 'Studio Guard', role: 'Sunreel gate guard', age: 52,
      look: { skin: 0xa86b4c, hair: 0x2a1a14, top: 0x7a8288, bottom: 0x2b2f35, shoes: 0x111111, build: 'heavy', hat: true },
      voice: { gender: 'male', pitch: 0.88, rate: 0.95 },
      bio: 'Has let in eleven Chet Valiants this summer. Only one was real.',
    },
    popcorn_kid: {
      name: 'Popcorn Kid', role: 'Starview drive-in projectionist', age: 17,
      look: { skin: 0xe8c39e, hair: 0x6b4a32, top: 0xc8202a, bottom: 0x2b2f35, shoes: 0xf2f2ee, build: 'slim', hat: true },
      voice: { gender: 'male', pitch: 1.15, rate: 1.1 },
      bio: 'Runs the projector, the popcorn and the sprinklers at the Starview.',
    },
  });

  // ------------------------------------------------------------ the places
  // Story places only. The district landmarks (cinder_storage, starview_drivein,
  // halcyon_clocktower, sunreel_western_set, southbay_speedway, paloma_fort …)
  // are built in by places.js and are used by id directly.
  Object.assign(D.places, {
    // Cinder Creek
    lot_17: { district: 'cindercreek', kind: 'garage', desc: 'Cinder Creek Storage, lot 17: a dented roll-up door stencilled BRASK, a bare bulb, a folding table; the hunt\'s HQ' },
    cinder_water_tower: { district: 'cindercreek', kind: 'overlook', desc: 'the old silver water tower over the trailer park: a ladder, a catwalk, a brass valve wheel on top' },
    chet_trailer: { district: 'cindercreek', kind: 'parking', desc: "Chet Valiant's silver trailer in the trailer park, a gold star on the door, a deckchair, a cardboard cut-out of himself" },
    drivein_rows: { district: 'cindercreek', kind: 'parking', desc: 'the back rows of the Starview drive-in, speakers on posts, parked cars for cover' },
    // Halcyon University
    quill_study: { district: 'halcyon', kind: 'storefront', desc: "the steps of the History building, Professor Quill's open study window above, books piled on the sill" },
    quill_house: { district: 'halcyon', kind: 'apartment_front', desc: "the Quills' faculty house at the edge of campus; Milo's bedroom window with a hand-drawn Firecrest poster" },
    campus_strip: { district: 'halcyon', kind: 'street', desc: 'the student strip of cafés and bookshops beside the campus' },
    halcyon_field: { district: 'halcyon', kind: 'park', desc: 'the university sports field and running track' },
    // Sunreel Studios
    sunreel_city_set: { district: 'sunreel', kind: 'street', desc: 'the fake big-city street set: shopfronts with nothing behind them, a fake bank, a fake subway entrance' },
    sunreel_prop_yard: { district: 'sunreel', kind: 'warehouse', desc: 'the prop yard: fibreglass statues, crates, the replica Firecrest under a sheet, a tank on a low-loader' },
    stage_nine: { district: 'sunreel', kind: 'warehouse', desc: "Sound Stage 9 with its big doors open; the film's base camp and catering truck" },
    // Coral Marina
    toby_breakwater: { district: 'coralmarina', kind: 'pier', desc: "the breakwater out to the Coral Marina light, Toby's old pickup parked at its root" },
    day_one_jetty: { district: 'coralmarina', kind: 'dock', desc: "the yacht-club jetty where Leo Castellane's white yacht Day One ties up" },
    marina_condos: { district: 'coralmarina', kind: 'apartment_front', desc: 'the luxury condos on the marina front and their car park' },
    // Vista Verde
    june_house: { district: 'vistaverde', kind: 'garage', desc: "June Marlow's bungalow: a perfect lawn, a learner Pipit on the drive, Aunt Win's shed at the side with the mower in it" },
    verde_culdesac: { district: 'vistaverde', kind: 'street', desc: 'a quiet cul-de-sac of identical houses, sprinklers, a basketball hoop' },
    verde_ballfield: { district: 'vistaverde', kind: 'park', desc: 'the ball field behind the school' },
    // The Bowl
    speedway_pits: { district: 'thebowl', kind: 'garage', desc: "the Speedway pit garages, Pip's borrowed bay, tyres stacked" },
    winners_enclosure: { district: 'thebowl', kind: 'storefront', desc: 'the winners\' enclosure by the start-finish line, the old painted honours board on its back wall' },
    speedway_tunnel: { district: 'thebowl', kind: 'street', desc: 'the vehicle tunnel under the main stand into the Speedway infield' },
    bowl_car_park: { district: 'thebowl', kind: 'parking', desc: 'the vast stadium and Speedway car park' },
    // Sandpiper Beach
    lifeguard_tower_7: { district: 'sandpiper', kind: 'beach', desc: 'lifeguard tower 7, white and red, a big lamp on its rail' },
    lifeguard_tower_8: { district: 'sandpiper', kind: 'beach', desc: 'lifeguard tower 8, its twin further along the sand, the other lamp' },
    beach_club_fence: { district: 'sandpiper', kind: 'beach', desc: "the Castellane Beach Club's new fence across the sand, teal flags, a private party" },
    promenade_kwikpik: { district: 'sandpiper', kind: 'storefront', desc: 'the Kwik Pik on the promenade; ghost letters above the sign read BRASK & MARLOW SPEED SHOP; an old floor safe behind the counter' },
    coast_road: { district: 'sandpiper', kind: 'street', desc: 'the coast road along the back of the beach' },
    causeway_south: { district: 'sandpiper', kind: 'street', desc: 'the Sandpiper end of the Southbay Causeway' },
    // Ironside
    crusher_belt: { district: 'ironside', kind: 'warehouse', desc: 'the scrapyard crusher, its conveyor belt and a crane with a magnet' },
    scrapyard_gate: { district: 'ironside', kind: 'street', desc: "the scrapyard's access road and gate" },
    ironside_pipes: { district: 'ironside', kind: 'construction', desc: 'the refinery pipe racks beside the power station, a service road beneath them' },
    // Vicehaven International
    charter_stand: { district: 'airport', kind: 'parking', desc: 'the remote stand west of the gates where the Castellane charter Albatross waits with its stairs down' },
    airport_fire_station: { district: 'airport', kind: 'garage', desc: 'the airport fire station east of the hangars, crash tenders inside' },
    // Neon Strand
    strand_checkpoint: { district: 'neonstrand', kind: 'street', desc: 'a Guest Services "Welcome Check" on the Neon Strand: teal cones, a gazebo, smiling men' },
    castellane_palace: { district: 'neonstrand', kind: 'storefront', desc: 'the Castellane Palace hotel, CHAMPIONS SINCE DAY ONE in gold neon, a doorman, a fountain' },
    golden_grabber: { district: 'neonstrand', kind: 'storefront', desc: 'arcade row at Wonder Wharf beside the big wheel: the Golden Grabber claw machine, a gear stick under its glass dome' },
    convention_dock: { district: 'neonstrand', kind: 'warehouse', desc: 'the loading dock behind the Paloma Convention Centre' },
    bridge_island_end: { district: 'neonstrand', kind: 'street', desc: 'the island end of the Paloma Bridge, where Guest Services put their roadblock' },
    // Old city (guest spots)
    bridge_mainland: { district: 'harborpoint', kind: 'street', desc: 'Anchor Street, the mainland approach to the Paloma Bridge' },
    harbor_roadblock: { district: 'harborpoint', kind: 'street', desc: 'a Guest Services roadblock on Seawall Drive, trucks across the road' },
    // Old Paloma
    plaza_cafe: { district: 'oldpaloma', kind: 'diner', desc: "Ines's café on Paloma Plaza: three tables outside, doughnuts under a glass cover, a counter Odie taps" },
    bell_tower: { district: 'oldpaloma', kind: 'church', desc: 'the church on Paloma Plaza and its bell tower, the bell visible in the arch' },
    plaza_roofs: { district: 'oldpaloma', kind: 'rooftop', desc: 'the flat roofs round the plaza, washing lines and festival bunting' },
    old_lanes: { district: 'oldpaloma', kind: 'alley', desc: 'the narrow lanes of Old Paloma, steps and arches' },
    fort_light: { district: 'oldpaloma', kind: 'overlook', desc: "the fort lighthouse and Odie Wren's blue door" },
    powder_store: { district: 'oldpaloma', kind: 'warehouse', desc: "the powder store in the fort's wall, bricked up fifty years ago; later an open arch with the Firecrest inside" },
    // Paloma Heights
    estate_garden: { district: 'palomaheights', kind: 'mansion', desc: "Leo Castellane's back lawn: party lights, a swimming pool, a string quartet, Dash's camera crane" },
    estate_gate: { district: 'palomaheights', kind: 'street', desc: "the estate's gates and the road down the hill" },
    paloma_clinic: { district: 'palomaheights', kind: 'hospital_front', desc: 'the private clinic with a rooftop helipad' },
    // Paloma Field
    hob_hangar: { district: 'palomafield', kind: 'garage', desc: "the Paloma Flying Club hangar: doughnut boxes, a kettle, Hob's Skylark and the club's Sparrow" },
    field_apron: { district: 'palomafield', kind: 'parking', desc: 'the apron at the end of the runway where the aircraft are parked' },
  });

  // ---------------------------------------------------------- the factions
  Object.assign(D.factions, {
    guest_services: { name: 'Castellane Guest Services', colors: [0x13b5b1, 0xf2f2ee], desc: "Leo Castellane's private security under Ottoline Graves: teal blazers, earpieces, polite greetings, pistols and SMGs. They say good afternoon, then they shoot, then they leave a comment card." },
    lockwood_tv: { name: "Lockwood's Lost Legends", colors: [0x3b1558, 0xd29a1c], desc: "Dash Lockwood's TV crew: a camera, a purple van with a dish, always filming, always in the way. Never hostile." },
    castellane_racing: { name: 'Castellane Racing', colors: [0xd29a1c, 0x0e0e10], desc: "The Speedway's works team in gold-and-black Zephyrs, led by Teddy Castellane. Rivals on the track." },
    flying_club: { name: 'Paloma Flying Club', colors: [0x2a6a3a, 0xefefea], desc: 'Hob Finnegan and four retired members who mostly drink tea. Friendly.' },
    firecrest_fans: { name: 'Readers of The Firecrest Files', colors: [0xe0481c, 0xf2c500], desc: "Milo's readers in home-made Firecrest T-shirts. A friendly crowd that sits in the road; never fights." },
  });
})();
