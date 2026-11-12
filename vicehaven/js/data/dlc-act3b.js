/*
 * data/dlc-act3b.js — "Chasing the Firecrest", ACT 3: ISLA PALOMA, second
 * half (d21 to d23).
 *
 * Old Paloma's bell rings for the harbour festival and drops the ignition
 * coil into Jay's hand, with the last rhyme wrapped round it and Guest
 * Services on every roof. Jay takes old Toby up in the Skylark at ten at
 * night and flies the line between two lighthouses to a blue door. Behind
 * it is the keeper Hob has sold jam doughnuts to for twenty years, and
 * behind the bricks of the fort's powder store is the Firecrest.
 *
 * Loaded after dlc-act3a.js. See docs/DLC_BIBLE.md (sections 1, 4, 7, 11),
 * docs/dlc/beats-act3.md and docs/mission-format.md. Sets no flags. Reads
 * dlc_dash_in / dlc_dash_left (d21: two rooftop groups or three; d23: Kit
 * films the snatch) and dlc_blog_on / dlc_blog_off (d21: eighty thousand
 * subscribers or the bedroom ceiling; d23: who comes to the fort and why).
 * Riddles: R9 is answered by Milo at the start of d21; R10 is found in d21
 * and re-read by Pip at its end, and answered by Milo at the start of d22
 * (both lights were seen in d07 and d18). Tallies: parts seven (d21),
 * "seven plus one driver" (d23); Hob's mark eight (d22); no comment card
 * (d23, blog off: "I'll post one"). Speaker switch: `odie` has no line in
 * d22; from Toby's "Hello, Dess." in d23 she is `dess`.
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const VAN_CREAM = 0xefefea;
  const SKYLARK_YELLOW = 0xf2c500;
  const GS_TEAL = 0x13b5b1;

  // ------------------------------------------------------------ helpers
  /** Hob's cream doughnut van, PALOMA FLYING CLUB on the side. */
  const doughnutVan = (at) => ({ spawnCar: 'doughnut_van', type: 'porter', at, color: VAN_CREAM, name: "Hob's doughnut van" });
  /** Hob's yellow Skylark. */
  const skylark = (at) => ({ spawnCar: 'hob_skylark', type: 'skylark', at, color: SKYLARK_YELLOW, name: "Hob's Skylark" });
  /** A teal Guest Services Sovereign. */
  const gsCar = (id, at) => ({ spawnCar: id, type: 'sovereign', at, color: GS_TEAL });
  /** A teal Guest Services Tern. */
  const gsSuv = (id, at) => ({ spawnCar: id, type: 'tern', at, color: GS_TEAL });
  /** Somebody behind the wheel of a spawned car, driving to a place (or after the car Jay is in: then they hunt it). */
  const driver = (id, car, at, to, faction) => ({ id, faction: faction || 'guest_services', hostile: false, at, behavior: 'drive', car, to });
  /** The same, with a pistol out of the window. */
  const gunDriver = (id, car, at, to) => Object.assign(driver(id, car, at, to), { weapon: 'pistol', hostile: true });
  /** A friendly named character standing about at a place. */
  const friend = (id, at, faction) => (faction ? { id, char: id, faction, at, behavior: 'idle', hostile: false } : { id, char: id, at, behavior: 'idle', hostile: false });
  /** A group of Guest Services gunmen on the plaza roofs: two with SMGs, one with a rifle. */
  const roofGroup = (group) => [
    { id: group + '_smg', group, faction: 'guest_services', at: 'plaza_roofs', count: 2, weapon: 'smg', behavior: 'attack', hostile: true },
    { id: group + '_rifle', group, faction: 'guest_services', at: 'plaza_roofs', count: 1, weapon: 'rifle', behavior: 'attack', hostile: true },
  ];

  // =====================================================================
  // d21 — Ring Twice
  // =====================================================================
  D.missions.push({
    id: 'd21_ring_twice',
    act: 3,
    title: 'Ring Twice',
    giver: 'milo',
    start: 'paloma_plaza',
    time: 11.5,
    estMinutes: 10,
    summary: "Old Paloma's bell only swings for weddings and the harbour festival. Today is the harbour festival.",
    reward: { money: 2500, weapons: ['rifle'] },
    failIf: ['dead:pip', 'dead:hob'],
    steps: [
      { music: 'hope' },
      {
        camera: 'paloma_plaza', seconds: 4,
        say: [
          ['caption', 'Old Paloma. The harbour festival. Half past eleven.'],
          ['caption', 'Bunting zig-zagged across the plaza, a brass band of nine playing something in three different keys, stalls selling grilled sardines and paper flags. Ines has put out a fourth table. It is also full.'],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', 'Did you know Old Paloma\'s church bell weighs as much as a small car and has only been rung forty-one times in fifty years?'],
          ['milo', "Weddings and the harbour festival. That's important. Extremely."],
          ['jay', "Morning, Milo."],
          ['milo', "Morning. Grandad's here. He's got a theory. I said he could have one go."],
          ['prof_quill', '(from somewhere behind Milo, with a mouth full of toast) Clearly the rhyme refers to the old customs-house fog bell, which hung above the fish market until 1958...'],
          ['prof_quill', '...when it was sold to a gentleman who wanted it for his boat. The boat sank. The bell, I believe, is still ringing, very quietly, at the bottom of the bay.'],
          ['milo', "Grandad. It says 'swing for every wedding'. Nobody gets married on a fish market."],
          ['prof_quill', '(a pause) People have.'],
          ['milo', "Hangs above the market square, swings for every wedding: it's the church bell over Paloma Plaza. 'Ring me once when the boats come in.' They come in at noon. Today."],
          ['milo', "'A spark within.' The ignition coil makes the spark. It's in the bell. Probably in the clapper. Definitely probably."],
          ['jay', "Definitely probably."],
          ['milo', "It's a scientific term. I'm making it one."],
        ],
      },
      {
        spawn: [friend('pip', 'plaza_cafe'), friend('hob', 'plaza_cafe', 'flying_club'), friend('ines', 'plaza_cafe')],
      },
      {
        if: 'dlc_dash_in',
        then: [{ spawn: [friend('dash', 'paloma_plaza', 'lockwood_tv'), friend('kit', 'paloma_plaza', 'lockwood_tv')] }],
        else: [],
      },
      {
        goto: 'plaza_cafe', vehicle: false, stop: true, radius: 6,
        objective: "Find Pip at Ines's café",
      },
      {
        scene: { at: 'plaza_cafe', cast: ['ines', 'pip', 'hob'] },
        say: [
          ['caption', "Ines's café. Pip has a doughnut in one hand and the festival programme in the other, and is reading it like a race card."],
          ['pip', "Band, band, sardines, children's sack race, band, 'blessing of the boats'. Noon. That's us."],
          ['ines', '(setting down a coffee nobody ordered, in front of Jay) The bell? Father Anselmo rings it when the first boat comes round the harbour wall. Noon, near enough.'],
          ['ines', "(beat) His back's gone this year. He was going to ask a tourist."],
          ['caption', 'Jay looks up at the bell tower. A long way up. The bell hangs in its arch, green-bronze and patient.'],
          ['ines', '(looking Jay up and down: the jacket, the sunglasses, the key on his belt) You look like a tourist.'],
          ['jay', "I've been told."],
          ['hob', '(a doughnut in each hand, pointing with the jam one) Ring it once. Properly. Don\'t swing on it. People have.'],
          ['jay', 'What happened to them?'],
          ['hob', "They rang it a lot more than once. Bloody racket. The gulls didn't come back till March."],
          ['pip', "(to Jay, quietly, the programme folded small) It's the last one, Jay. Seven parts. The last part."],
          ['jay', 'I know.'],
          ['pip', '(beat) Ring it nicely.'],
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [
          {
            scene: { at: 'paloma_plaza', cast: ['dash', 'kit', 'pip'] },
            say: [
              ['caption', 'Dash Lockwood, in a straw festival hat over his TV hair, delighted beyond reason to be on a team.'],
              ['dash', "Right. Plan. Kit and I will provide a distraction."],
              ['kit', "We're going to film the band."],
              ['dash', "That's the distraction."],
              ['kit', 'They asked for a fee.'],
              ['dash', "(off camera, wounded) The tuba asked for a fee. The tuba, Kit."],
              ['pip', 'Just stay out of the way.'],
              ['dash', "I'm brilliant at that. Ask anyone. (beat) Don't ask Kit."],
            ],
          },
        ],
        else: [],
      },
      { setTime: 12 },
      {
        camera: 'paloma_harbour', seconds: 4,
        say: [
          ['caption', 'Noon. Round the harbour wall come the fishing boats, flags up, horns going, one behind another like ducklings. The whole plaza cheers.'],
          ['pip', "(at Jay's elbow) That's you."],
        ],
      },
      {
        goto: 'bell_tower', vehicle: false, stop: true, radius: 3,
        objective: 'Climb the bell tower and ring the bell',
        say: [
          ['hob', '(calling after him) Once! ONCE!'],
          ['ines', '(to Hob) He has a nice face. He will ring it once.'],
          ['hob', "They all have nice faces. Then they get up there and it goes to their heads."],
        ],
      },
      {
        scene: { at: 'bell_tower', cast: [] },
        say: [
          ['caption', 'The belfry. Pigeons, wind, the whole plaza below like a tablecloth. The rope is as thick as Jay\'s wrist and smells of a hundred years of hands.'],
          ['caption', 'One ring.'],
          ['caption', 'The bell swings. The note goes out over the roofs and the harbour, and the entire plaza goes "Ohhh".'],
          ['caption', 'And on the backswing, inside the bell, something goes clunk that isn\'t bell.'],
        ],
      },
      { slowmo: 2 },
      {
        scene: { at: 'bell_tower', cast: [] },
        say: [
          ['caption', 'Jay steadies the bell with his shoulder and reaches up into the hollow clapper. Tape, old and brittle. A cloth bundle the size of a fist, heavy for its size.'],
          ['caption', 'Inside: an ignition coil, black and copper, fifty years old, wrapped in a sheet of paper.'],
          ['jay', '(to the bell) Thanks. Sorry about your ear.'],
        ],
      },
      { collect: ['bell_tower'], item: 'the ignition coil', objective: 'Take the ignition coil' },
      {
        blackout: [
          ['caption', 'Wrapped round the coil, in the same handwriting:'],
          ['caption', 'When two lights say goodnight at ten,'],
          ['caption', 'fly the line between them then.'],
          ['caption', "Where the light comes from, I'll be,"],
          ['caption', "the last part is the part that's me."],
          ['caption', 'And mind the road.'],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        spawn: [...roofGroup('roofs_a'), ...roofGroup('roofs_b')],
      },
      {
        if: 'dlc_dash_left',
        then: [{ spawn: roofGroup('roofs_c') }],
        else: [],
      },
      {
        scene: { at: 'plaza_roofs', cast: [] },
        say: [
          ['caption', 'Between the washing lines on the flat roofs round the square, men in teal blazers stand up. Rifles. A lot of them.'],
          ['gs_staff', '(through a loudhailer, pleasantly) Good afternoon! Please remain where you are!'],
          ['caption', 'The band stops in the middle of a note. The crowd does not remain where it is.'],
          ['hob', '(from the van behind the café, hauling out a long canvas bag and throwing it up to the belfry ledge) Club rifle! For the gulls!'],
          ['hob', "Never shot a gull. Don't start."],
        ],
      },
      { reward: { weapons: ['rifle'] } },
      {
        phone: 'milo',
        say: [
          ['milo', 'Did you know a church bell can be heard eleven kilometres away? I heard it on the live stream. (beat) Jay? Is that shooting? I can hear shooting.'],
          ['jay', 'Milo, hang up.'],
          ['milo', "I'm not in danger, I'm in Halcyon."],
          ['jay', 'Hang up anyway.'],
          ['milo', '(a pause; the sound of a twelve-year-old deciding to be brave about being sent away) ...Fewer goons, Jay. Fewer. You can count goons.'],
        ],
      },
      {
        kill: 'group:roofs_a',
        objective: 'Clear the roofs on the west side',
        say: [
          ['caption', 'Off the belfry ledge and onto the roofs: chimney pots, bunting, somebody\'s best shirts drying on a line.'],
          ['pip', '(down in the square, arms wide, herding the old folk) Everybody inside! Doughnuts are inside!'],
          ['caption', 'It works instantly. Forty pensioners move faster than the gunmen.'],
          ['pip', '(on the radio) Jay. Jay. And mind the... roofs. Mind the roofs.'],
          ['jay', 'Minding them.'],
          ['ines', "(from the café door, to a gunman on the next roof, furious) That's my sister's tablecloth!"],
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [
          {
            kill: 'group:roofs_b',
            objective: 'Clear the last roofs',
            say: [
              ['caption', 'In the middle of the empty plaza: Dash Lockwood, in his straw hat, in full voice, and Kit behind him with the camera up.'],
              ['dash', 'Viewers! Gunmen! On the roofs! Of a FESTIVAL!'],
              ['caption', 'The three men on the east roofs look at each other, look at the camera, and climb down to take it off them.'],
              ['caption', 'Dash and Kit run into the church, round the font, and out of the other door, three teal blazers behind them.'],
              ['kit', "(somewhere out of sight, flat) We're rolling."],
              ['dash', "(further away, much louder) We're RUNNING."],
              ['pip', "(radio) Lockwood just took three of them for a run round the church. On purpose. I think on purpose."],
              ['jay', "Remind me to say thank you."],
              ['pip', 'I will not.'],
            ],
          },
        ],
        else: [
          {
            kill: 'group:roofs_b',
            objective: 'Clear the roofs on the east side',
            say: [
              ['pip', '(radio) East side. Two by the chimney with the stork on it. One behind the sheets.'],
              ['jay', 'Which sheets.'],
              ['pip', "The flowery ones! They're ALL flowery! It's a festival!"],
            ],
          },
          {
            kill: 'group:roofs_c',
            objective: 'One more lot. Over the market',
            say: [
              ['hob', "(radio, somewhere below) Three more over the fish market! Mind the awning, it's Gianni's, he'll want it back."],
              ['jay', '(under his breath, ducking a burst into the chimney pots) Damn. How many blazers does one hotel need.'],
              ['pip', '(radio) Forty hotels, Jay.'],
            ],
          },
        ],
      },
      { music: 'tension' },
      {
        goto: 'old_lanes', vehicle: false, radius: 12,
        objective: 'Down off the roofs into the lanes',
        say: [
          ['caption', 'Over a low wall, down a drainpipe, onto a staircase that turns into somebody\'s balcony that turns into a lane.'],
          ['hob', "(radio) Van's round the back. Harbour. I've got the engine running and a box of custard on the passenger seat. Don't sit on it."],
        ],
      },
      doughnutVan('paloma_harbour'),
      {
        goto: 'paloma_harbour', vehicle: false, stop: true, radius: 6,
        objective: "Hob's waiting at the harbour with the van",
        say: [
          ['pip', '(radio) I\'m coming down. Ines is coming too. She says she\'s "not missing the end".'],
          ['jay', "It's not a film."],
          ['pip', "She says everything's a film if you've got a good seat."],
        ],
      },
      { music: 'hope' },
      {
        scene: { at: 'paloma_harbour', cast: ['hob', 'pip', 'ines'] },
        say: [
          ['caption', 'The harbour. Behind them, up the lanes, the band is tentatively starting again, a bit quieter, from the inside of the café.'],
          ['caption', 'Ines has followed them down with a tray. She hands Jay a doughnut through the window as if he had ordered it.'],
          ['ines', 'Best festival in years.'],
          ['hob', "(checking the canvas bag) You didn't shoot any gulls."],
          ['jay', 'No.'],
          ['hob', "Good man. (beat) You shot a chimney pot. Gianni's. He'll want it back."],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', "Did you know the clapper's the only part of a bell that isn't the bell? You're not hurt. Pip said you're not hurt. I asked four times."],
          ['milo', "Score. Team Firecrest seven. That's all seven. Wheel, bird, clock, carburettor, headlamps, gear stick, coil."],
          ['milo', "Lockwood's Lost Legends nil, plus a rusty tap, a spur, a minute hand, a gnome and a teddy bear. Plus a museum."],
          ['jay', 'A museum.'],
          ['milo', "That's what it is now. It's not a score any more. It's a collection."],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', "And eighty thousand subscribers. Eighty THOUSAND. Someone filmed you ringing the bell."],
              ['milo', "The video's called 'MAN RINGS BELL, ENTIRE TOWN GOES OHHH.' It's got a million views. You're a moment, Jay. You're a meme."],
              ['jay', "I'm not a meme."],
              ['milo', "You don't get to choose. That's the whole thing about memes."],
            ],
          },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', "I've drawn the bell on the scoreboard. It's a big bell. I've run out of wall."],
              ['milo', "I've started on the ceiling. Gran says it's very good, and also please stop drawing on the ceiling."],
              ['jay', 'Listen to your gran.'],
              ['milo', "I am. I'm doing it in pencil."],
            ],
          },
        ],
      },
      {
        scene: { at: 'paloma_harbour', cast: ['pip', 'hob', 'ines'] },
        say: [
          ['caption', 'Pip holds out her hand for the paper. Jay gives it to her. She unfolds it on the van\'s warm bonnet and reads it aloud, slowly, to everyone.'],
          ['pip', 'When two lights say goodnight at ten,'],
          ['pip', 'fly the line between them then.'],
          ['pip', "Where the light comes from, I'll be,"],
          ['pip', "the last part is the part that's me."],
          ['pip', '(beat) And mind the road.'],
          ['pip', "Seven parts. That's the car. That's the whole car. (beat) So what's this one for?"],
          ['caption', 'Nobody answers.'],
          ['hob', 'Lights are a pilot\'s business.'],
          ['pip', "Lights are a lighthouse man's business."],
          ['caption', 'She is already taking a photo of it. She is already sending it to Toby.'],
          ['ines', "(to Hob, under her breath) Who's Toby?"],
          ['hob', 'No idea. Sounds like a man who answers his phone, though.'],
        ],
      },
      { join: ['pip', 'hob'] },
      { getIn: 'doughnut_van', objective: 'Get in the van. Time to go' },
      {
        camera: 'bell_tower', seconds: 4,
        say: [
          ['caption', 'The van pulls away along the harbour. Behind it, over the roofs, the bell rings again: once, twice, a dozen times, joyfully, badly.'],
          ['caption', 'Father Anselmo, whose back has made a miraculous recovery.'],
          ['hob', "(not looking round) That's not once."],
        ],
      },
    ],
  });

  // =====================================================================
  // d22 — Two Lights
  // =====================================================================
  D.missions.push({
    id: 'd22_two_lights',
    act: 3,
    title: 'Two Lights',
    giver: 'toby',
    start: 'field_apron',
    time: 21.5,
    estMinutes: 10,
    summary: 'Every night at ten two lighthouses say goodnight across the bay. Dess\'s last rhyme says fly the line between them.',
    reward: { money: 1500 },
    failIf: ['wrecked:hob_skylark', 'dead:toby'],
    steps: [
      { music: 'sad' },
      {
        camera: 'paloma_field', seconds: 4,
        say: [
          ['caption', 'Paloma Field. Half past nine.'],
          ['caption', 'The sky going purple over the bay. Along the runway the lights come on one by one, as if somebody is walking down it with a match.'],
        ],
      },
      skylark('field_apron'),
      {
        spawn: [friend('toby', 'field_apron'), friend('pip', 'field_apron'), friend('hob', 'field_apron', 'flying_club')],
      },
      {
        goto: 'field_apron', vehicle: false, stop: true, radius: 8,
        objective: 'Meet Toby on the apron',
      },
      {
        scene: { at: 'field_apron', cast: ['toby', 'pip', 'hob'] },
        say: [
          ['caption', 'Toby Brask came over on the evening ferry with his toolbox, "in case". He has not said in case of what.'],
          ['caption', 'Pip holds her phone up on a video call. Milo, in pyjamas, in his grandad\'s study, and somewhere behind him the Professor in a dressing gown.'],
          ['pip', "(handing Toby the paper) Toby. This was round the coil."],
          ['caption', 'Toby reads it under the apron light. He reads it twice. The colour goes out of his face like a tide.'],
          ['prof_quill', "(from Milo's end) Clearly the two lights are the gas lamps of the old Halcyon gatehouse, extinguished in 1922 by a student with a cricket bat."],
          ['prof_quill', 'He was sent down. He became a bishop. History is full of surprises.'],
          ['milo', 'Grandad. No.'],
          ['toby', '(a long pause) Two lights that say goodnight at ten.'],
          ['milo', "The Coral Marina light and the fort light. Every night at ten the fort light flashes three times and Toby's flashes back."],
          ['milo', "'Fly the line between them': start at Toby's, follow the beam across the bay to the fort. That's the line."],
          ['milo', "Then: 'Where the light comes from, I'll be.' (beat) I don't know what the last line means. I always know. I don't know."],
          ['toby', 'Every night at ten the fort light says goodnight. I say it back. Manners.'],
          ['pip', "Toby. What does 'the part that's me' mean?"],
          ['caption', 'Toby folds the paper very carefully along its old creases and puts it in his pullover.'],
          ['toby', 'Take me up, son.'],
          ['hob', '(to Jay, low) He all right?'],
          ['jay', "No."],
          ['hob', "Right then. Fly him smooth."],
        ],
      },
      { join: ['toby'] },
      {
        getIn: 'hob_skylark',
        objective: 'Take Toby up. Into the Skylark',
        say: [
          ['hob', "Night flying. Same as day flying, but the ground's a rumour."],
          ['pip', "(to Toby, helping him up onto the wing) Hands there. Foot there. Don't touch the red one."],
          ['toby', "I built a racing car, trouble. I know not to touch the red one."],
          ['pip', '(beat) Touch nothing, then.'],
        ],
      },
      {
        fly: 'marina_lighthouse', height: 100, radius: 60, vehicle: 'hob_skylark',
        objective: 'Across the bay to the Coral Marina light',
        say: [
          ['toby', "(gripping the seat with both hands) Last time I flew I was twenty-two and the pilot was sick in a bucket."],
          ['toby', "The pilot was Hob's dad, I expect. Everybody's somebody's dad on this island."],
          ['hob', '(radio) It was my uncle. My dad was the bucket man.'],
          ['toby', "(to Jay) That's worse."],
          ['caption', 'Below, the bay black and wide, the mainland a long line of lights. Somewhere in it, a small white lighthouse turning.'],
          ['toby', "There she is. Thirty-three years I've kept her. (beat) She's simple, a light. She's there, and she says so."],
          ['toby', 'People should be more like it.'],
          ['jay', 'Most people would hate that.'],
          ['toby', "Most people do. That's why I live on a breakwater."],
        ],
      },
      { setTime: 22 },
      {
        camera: 'fort_light', seconds: 4,
        say: [
          ['caption', 'Ten o\'clock. Far across the black water, on the island\'s tip, the fort light blinks. Once. Twice. Three times.'],
        ],
      },
      {
        camera: 'marina_lighthouse', seconds: 3,
        say: [
          ['caption', 'And directly below the Skylark, on the end of the breakwater, Toby\'s light blinks back. Once. Twice. Three times.'],
          ['toby', "Automatic. I set a timer, twenty years back. Didn't want to be rude when I was asleep."],
          ['toby', '(very quietly) Fly the line, son.'],
        ],
      },
      { music: 'hope' },
      {
        fly: 'day_one_jetty', height: 80, radius: 60, vehicle: 'hob_skylark',
        objective: 'Follow the beam. Low over the water',
        say: [
          ['caption', 'Low over the marina, the yachts asleep. Ahead, the beam lies across the water like a road somebody has painted.'],
          ['jay', 'How did you meet her?'],
          ['caption', 'A long time before Toby answers.'],
          ['toby', "She came into the Speedway shop with a gearbox in a pram. She'd carried it two miles. She wanted to know why it whined."],
          ['toby', "I told her. She said 'Wrong.' (beat) She was right."],
          ['toby', "Everything we owned went in that car. I slept under it for a month. She slept in it."],
        ],
      },
      {
        fly: 'neon_strand', height: 80, radius: 60, vehicle: 'hob_skylark',
        objective: 'Follow the beam',
        say: [
          ['caption', 'Across the open bay, then the island: the Neon Strand all pink and green below, a fairground wheel turning in its lights.'],
          ['toby', "She called me 'the spanner'. Nobody else ever did. I'd have answered to anything."],
          ['toby', "Three taps on the wheel before every race. I asked her once what for."],
          ['toby', "She said, 'So it knows I'm here.'"],
          ['jay', '(after a moment, both hands on the yoke) Makes sense.'],
          ['toby', "(looking at him sideways) You talk to cars."],
          ['jay', 'Only the good ones.'],
        ],
      },
      {
        fly: 'paloma_fort', height: 80, radius: 50, vehicle: 'hob_skylark',
        objective: 'Follow the beam to the fort',
        say: [
          ['toby', "There was something I meant to tell her. Before the race."],
          ['caption', 'The engine hums. The beam slides by under the wing. Toby looks at it for a long time.'],
          ['toby', '(long pause) Third gear stuck. I never fixed the third gear.'],
          ['caption', 'Jay says nothing. Jay is very good at saying nothing.'],
          ['toby', "Fifty years I've said goodnight to that light. Thirty-three. Whatever it is."],
          ['toby', "I've lost count, son. I've lost count of a lot."],
        ],
      },
      {
        camera: 'fort_light', seconds: 3,
        say: [
          ['caption', 'Close now: the lighthouse, the dark fort wall, and at the foot of the tower a small blue door with a lit window beside it.'],
        ],
      },
      {
        blackout: [
          ['caption', 'Long ago. A bedroom with a nightlight shaped like a moon.'],
          ['nana_lu', 'And she drove into the night, and nobody ever saw her again.'],
          ['caption', 'Six-year-old Jay, under the covers:'],
          ['jay', 'Where did she go?'],
          ['nana_lu', 'Somewhere she could see the sea, I expect.'],
        ],
      },
      {
        land: 'paloma_field', radius: 40, vehicle: 'hob_skylark',
        objective: "Back to Paloma Field. It's dark. Land anyway",
        say: [
          ['jay', '(to nobody, looking down at the blue door going by under the wing) Somewhere she could see the sea.'],
          ['toby', "What's that?"],
          ['jay', 'Something my nana said.'],
          ['hob', "(radio) Paloma Field to yellow Skylark. Runway lights are on. All of them. I checked. Twice."],
          ['hob', "(radio) Line her up on the lights, not on the dark bit. The dark bit's the sea."],
        ],
      },
      {
        wait: 4,
        say: [
          ['hob', "(radio) Night landing. Eight. Don't let it go to your head."],
          ['toby', '(letting go of the seat, finger by finger) Hell\'s bells.'],
        ],
      },
      { music: 'off' },
      doughnutVan('field_apron'),
      { join: ['pip', 'hob'] },
      { getIn: 'doughnut_van', objective: 'Get in the van' },
      {
        goto: 'fort_light', vehicle: 'doughnut_van', stop: true, radius: 8,
        objective: 'Drive to the fort light',
        say: [
          ['caption', 'Nobody turns the radio on. The van ticks along the Strand and up into the old town, the lanes empty, the festival bunting still up.'],
          ['pip', "Toby. What does 'the part that's me' mean?"],
          ['toby', "I don't know."],
          ['caption', 'He does. Everybody in the van can hear that he does.'],
          ['pip', '(after a while) Okay.'],
          ['caption', 'The fort gate. Hob slows the van down without being asked, as if he is driving it with his eyes.'],
          ['hob', '(half to himself) Funny. This is Odie\'s light. I bring her jam doughnuts.'],
          ['caption', 'Nobody answers him.'],
        ],
      },
      { spawn: [friend('odie', 'fort_light')] },
      {
        scene: { at: 'fort_light', cast: ['odie', 'toby', 'pip', 'hob'] },
        say: [
          ['caption', 'The blue door. Jay knocks.'],
          ['caption', 'It opens. An old woman in a faded flame-orange cardigan, a mug in one hand, a racing driver\'s watch on a man\'s strap. The light turning over all their heads.'],
          ['caption', 'Nobody speaks.'],
          ['caption', "She looks at Jay's keyring: a little gold bird. She looks at Pip, who has her face."],
          ['caption', "Then she looks at Toby, and doesn't look away."],
        ],
      },
      { slowmo: 2 },
      {
        scene: { at: 'fort_light', cast: ['odie', 'toby'] },
        say: [
          ['caption', 'Toby Brask takes off his hat.'],
        ],
      },
      { fade: 'out' },
    ],
  });

  // =====================================================================
  // d23 — Odie Wren
  // =====================================================================
  // Chained straight on from d22's blue door. The keeper is spawned as
  // `dess` (the same look as `odie`): she says nothing until Toby's "Hello,
  // Dess.", and every line after it is hers under her own name.
  D.missions.push({
    id: 'd23_odie_wren',
    act: 3,
    title: 'Odie Wren',
    giver: 'toby',
    start: 'chain',
    resumeAt: 'fort_light',
    time: 22.3,
    estMinutes: 10,
    summary: 'Odie Wren has kept the fort light for nearly fifty years. Toby knows her before she says a word.',
    reward: { money: 3000 },
    failIf: ['dead:pip', 'dead:dess', 'dead:toby', 'dead:hob'],
    steps: [
      { music: 'off' },
      doughnutVan('fort_light'),
      {
        spawn: [friend('dess', 'fort_light'), friend('toby', 'fort_light'), friend('pip', 'fort_light'), friend('hob', 'fort_light', 'flying_club')],
      },
      {
        if: 'dlc_dash_in',
        then: [{ spawn: [friend('dash', 'fort_light', 'lockwood_tv'), friend('kit', 'fort_light', 'lockwood_tv')] }],
        else: [],
      },
      {
        scene: { at: 'fort_light', cast: ['dess', 'toby', 'pip', 'hob'] },
        say: [
          ['caption', 'The blue door. The lit window. The mug. The light going round over all their heads, patient as a clock.'],
          ['caption', 'The silence goes on a beat longer than anyone can stand.'],
          ['toby', 'Hello, Dess.'],
          ['dess', 'Hello, Toby. You took your time.'],
          ['caption', 'A long silence. Toby turns his hat round and round in his hands.'],
          ['toby', 'I had the box, Dess. I drove to the house. I saw a car. I drove away.'],
          ['dess', 'Thirty-four years I watched that sea for a girl in a car.'],
          ['dess', "(beat) Nobody came. I thought she'd read it and decided not to."],
          ['toby', "She never got it. That's on me."],
          ['caption', "Dess looks at him for a long time. She doesn't say it's all right."],
          ['dess', "You've got old."],
          ['toby', "You've got rude."],
          ['dess', 'I was always rude. You were too polite to notice.'],
        ],
      },
      {
        scene: { at: 'fort_light', cast: ['dess', 'pip', 'hob'] },
        say: [
          ['caption', "Pip hasn't moved since the door opened."],
          ['pip', "I'm Pip. I'm... June's."],
          ['dess', 'I know who you are. Your first race, you were twelve. You spun at the hairpin, got out and kicked the tyre.'],
          ['pip', '...You were THERE?'],
          ['dess', 'I left before the end.'],
          ['dess', '(beat) You won.'],
          ['caption', 'Then, dry, to the whole doorway:'],
          ['dess', "Fifty years I've been dead. It's very restful. I don't recommend coming back."],
          ['hob', '(staring, cap in both hands) Twenty years of jam doughnuts.'],
          ['dess', "Twelve. Jam. Don't look at me like that, Hob."],
          ['hob', "I'm not looking at you like anything."],
          ['dess', "You're looking at me like I owe you for twenty years of doughnuts."],
          ['hob', '(beat) Well. Now you mention it.'],
        ],
      },
      { join: ['dess', 'toby', 'pip'] },
      {
        goto: 'powder_store', vehicle: false, stop: true, radius: 4,
        objective: 'Follow Dess along the fort wall',
        say: [
          ['dess', "(walking, not looking back) Mind the cannon. It's not loaded. It's not been loaded since 1871, but people trip on it."],
          ['pip', '(half-running to keep up) Are you... are you all right? Do you need a hand?'],
          ['dess', "I've walked this wall every night for fifty years, young lady. You'll need a hand before I do."],
          ['jay', "(to Pip, low) She's quick."],
          ['pip', "(low, slightly appalled) She's ME."],
          ['dess', "(without turning round) And you, young man, can stop looking at my watch. It's a man's strap. It was cheaper."],
        ],
      },
      {
        scene: { at: 'powder_store', cast: ['dess', 'toby', 'pip', 'hob'] },
        say: [
          ['caption', 'The powder store: an arch in the old fort wall, bricked up. The bricks are a different colour from the stone, and fifty years have not quite made them match.'],
          ['caption', 'Dess taps the bricks three times, the way she tapped the café counter.'],
          ['dess', "I didn't hide a car. I hid a road. Seven stops and a door at the end. It was for her."],
          ['pip', 'Then open it.'],
          ['dess', "Some things are better as stories. This one's a good one. Leave it."],
          ['pip', "It's not a story, it's my GRAN."],
          ['dess', "(not unkindly) Your gran's standing right here, and she says leave it."],
          ['caption', 'Toby puts his hand flat on the bricks, the way you would on the flank of a horse. He says nothing.'],
          ['caption', 'Instead Dess reaches inside her door and brings out a logbook: lap times in pencil, a pressed flower from Win\'s garden, and a sheet folded very small.'],
          ['caption', 'The stewards\' original result sheet. SOUTHBAY 500. 1st: O. MARLOW, No. 17, FIRECREST. Three signatures.'],
          ['pip', '(reading it twice, then a third time) First. It says first. In ink.'],
          ['dess', "Stewards always used ink. They thought it meant something."],
          ['caption', "Pip puts the logbook and the Gorse file together in a canvas satchel and holds it to her chest like a baby."],
        ],
      },
      { leave: ['dess', 'toby'] },
      {
        scene: { at: 'powder_store', cast: ['pip', 'dess', 'hob'] },
        say: [
          ['caption', 'Pip\'s phone buzzes: a video call. Milo, in bed, very much not asleep. Pip turns the phone round.'],
          ['caption', 'Milo sees Dess. A long pause. Somewhere in Halcyon, a twelve-year-old takes his glasses off and puts them back on.'],
          ['milo', '...Oh.'],
          ['milo', "'The last part is the part that's me.' (beat) It's her. The last part's the driver."],
          ['milo', '(to Dess, very polite, sitting up straight) Hello. I\'m Milo. I solved most of your riddles. They were very good. The tin man one was my favourite.'],
          ['dess', 'Hello, Milo. The tin man one took me a week.'],
          ['milo', "(to Jay, recovering) Team Firecrest seven. Plus one driver. (beat) I don't know how to score a driver."],
          ['dess', 'Nobody ever has.'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            scene: { at: 'powder_store', cast: ['pip', 'hob'] },
            say: [
              ['milo', "(his face falling) Jay. This afternoon I posted 'The two lights!' I waited a day. I always wait a day."],
              ['milo', "(very small) It's been a day. It's been exactly a day."],
              ['caption', 'Behind them, down the fort road, headlights. Three pairs. Coming fast.'],
              ['jay', 'Milo. Hang up.'],
              ['milo', "(already hanging up) I'm sorry. I'm sorry, I'm—"],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'powder_store', cast: ['pip', 'hob'] },
            say: [
              ['caption', 'Hob has wandered to the wall and is looking down the fort road, where something is shining.'],
              ['hob', 'Car. (beat) No. Three.'],
              ['jay', 'Milo. Hang up.'],
              ['milo', "But I haven't told anyone! I haven't told ANYONE! It's on my WALL!"],
              ['jay', "I know. Hang up."],
            ],
          },
        ],
      },
      { music: 'tension' },
      gsCar('gs_car1', 'fort_light'),
      {
        if: 'dlc_blog_on',
        then: [gsCar('gs_car2', 'old_lanes'), gsCar('gs_car3', 'old_lanes')],
        else: [gsCar('gs_car2', 'old_lanes'), gsSuv('gs_suv', 'fort_light'), { spawn: [{ id: 'ottoline', char: 'ottoline', faction: 'guest_services', at: 'fort_light', behavior: 'idle', hostile: false }] }],
      },
      {
        scene: { at: 'fort_light', cast: ['gs_staff', 'pip'] },
        say: [
          ['caption', 'A teal Sovereign pulls up hard at the blue door. Doors open. Teal blazers, earpieces, smiles.'],
          ['gs_staff', "Good evening! We'll take those papers, thank you!"],
          ['caption', 'Before anyone can move, a second man yanks the satchel out of Pip\'s arms, throws himself into the Sovereign, and it bolts back down the fort road.'],
          ['pip', 'HEY! That\'s my GRAN\'S!'],
        ],
      },
      {
        if: 'dlc_blog_off',
        then: [
          {
            scene: { at: 'fort_light', cast: ['ottoline'] },
            say: [
              ['caption', 'Beside the Tern, perfectly calm, a stack of nothing in one hand: Ottoline Graves.'],
              ['ottoline', 'Good evening, Mr Mercer. I watched a little yellow plane fly the beam from Mr Castellane\'s terrace. It was very pretty.'],
              ['caption', 'She feels in her jacket pocket. The other pocket. A small frown.'],
              ['ottoline', "I'm afraid I've run out of comment cards. (beat) I'll post one."],
              ['caption', 'She gets into the Tern. A man in a teal blazer drives her away, without hurry.'],
            ],
          },
          { leave: ['ottoline'], vanish: true },
        ],
        else: [],
      },
      {
        if: 'dlc_dash_in',
        then: [
          {
            scene: { at: 'fort_light', cast: ['kit', 'dash'] },
            say: [
              ['caption', 'On the fort steps, camera on her shoulder, red light on: Kit. She has the whole thing. Faces and all.'],
              ['kit', "We're rolling. We're always rolling."],
              ['dash', "(beside her, crouched behind a cannon, whispering) Kit. KIT. Are we in danger?"],
              ['kit', 'Some.'],
            ],
          },
        ],
        else: [],
      },
      { leave: ['gs_staff'], vanish: true },
      { music: 'action', checkpoint: true },
      {
        spawn: [{ id: 'fort_gs', group: 'fort_gs', faction: 'guest_services', at: 'fort_light', count: 4, weapon: 'pistol', behavior: 'attack', hostile: true }],
      },
      { protect: 'pip' },
      { join: ['pip'] },
      {
        getIn: 'doughnut_van',
        objective: 'Get after that car',
        say: [
          ['caption', 'Pip is in the passenger seat before Jay has his door shut.'],
          ['pip', "Not the van. Jay. JAY. You're not taking the—"],
          ['jay', "It's what we had."],
        ],
      },
      { spawn: [gunDriver('gs_driver2', 'gs_car2', 'gs_car2', 'doughnut_van')] },
      {
        if: 'dlc_blog_on',
        then: [{ spawn: [gunDriver('gs_driver3', 'gs_car3', 'gs_car3', 'doughnut_van')] }],
        else: [],
      },
      {
        chase: 'gs_car1', mode: 'wreck',
        route: ['old_lanes', 'paloma_gardens', 'estate_gate'],
        escapeTo: 'estate_gate', escapeRadius: 25, escapeReason: 'They made it through the Castellane gates with the papers.',
        objective: 'Wreck it before it gets to the Castellane estate',
        say: [
          ['pip', "That's Gran's LOGBOOK. That's my GRAN'S logbook. I've had a gran for eleven minutes!"],
          ['caption', 'Down through the old lanes: steps, arches, washing, a cat that has seen everything and is unimpressed by this too.'],
          ['pip', "It's a doughnut van! You're chasing a Sovereign in a DOUGHNUT VAN!"],
          ['jay', "It's what we had."],
          ['pip', 'Hell yes it is. Go. GO.'],
          ['caption', 'Behind them, in the back, every box of custard slides from one side of the van to the other, and back again.'],
          ['jay', '(to the van, on the hill, foot flat down) Come on. You\'ve carried worse. You\'ve carried custard.'],
          ['pip', "Left! Left! The gardens! He's going for the gate!"],
          ['pip', '(as a teal car fills the mirror) And another one. Hello. Good evening to YOU.'],
        ],
      },
      { music: 'tension' },
      {
        scene: { at: 'paloma_gardens', cast: ['pip', 'gs_staff'] },
        say: [
          ['caption', 'The Sovereign lies on its roof against the garden railings, wheels still turning, smoking gently.'],
          ['caption', 'Pip gets the satchel out through the back window. Scorched at one corner. Whole.'],
          ['pip', '(checking inside, breathing again) Logbook. File. Result sheet. Flower. (beat) The flower\'s fine.'],
          ['caption', 'The driver crawls out of the wreck, stands up, straightens his blazer, and says, from habit:'],
          ['gs_staff', 'Good evening.'],
          ['jay', 'Is it.'],
        ],
      },
      { leave: ['gs_staff', 'gs_driver2', 'gs_driver3', 'fort_gs_0', 'fort_gs_1', 'fort_gs_2', 'fort_gs_3'], vanish: true },
      {
        goto: 'fort_light', vehicle: true, stop: true, radius: 10,
        objective: 'Back to the fort',
        say: [
          ['jay', '(patting the dashboard) Good van.'],
          ['caption', 'Pip sits with the satchel on her knees, both arms round it.'],
          ['pip', "(coming down, slowly) She called my driving 'enthusiastic'. Before. At the door. She's never even seen my driving."],
          ['jay', "She's seen your face."],
          ['caption', 'Pip says nothing for a long time. The lanes go by, dark and quiet, the bunting still up.'],
          ['pip', 'Do I tell Mum?'],
          ['jay', 'Not tonight.'],
          ['pip', '(beat) Not tonight.'],
        ],
      },
      { music: 'hope' },
      {
        scene: { at: 'fort_light', cast: ['dess', 'toby', 'hob', 'pip'] },
        say: [
          ['caption', 'Pip gives Dess the satchel. Dess holds it a moment, then puts it inside the blue door, as if putting a cat out for the night in reverse.'],
          ['caption', 'Hob has his cap in his hands. He has been waiting to say something for twenty minutes, and for twenty years.'],
          ['hob', "There was a programme on your wall. Twenty years back, when I first brought the doughnuts. Southbay 500. I saw it."],
          ['hob', "I never asked. (beat) None of my business. Doughnuts are my business."],
          ['dess', '(drily) And you were very good at it.'],
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [
          {
            scene: { at: 'fort_light', cast: ['kit', 'dash', 'dess'] },
            say: [
              ['caption', 'Kit plays back the footage on the little screen: the blazers, the satchel, the faces, perfectly lit by the lighthouse.'],
              ['caption', 'Dash watches it. Then he looks at Dess. For once in his life he says nothing to camera at all.'],
              ['dash', "(quietly, off camera) That's a real one. Isn't it. That's a real legend."],
              ['dess', "I'm not a legend. I'm seventy-nine and I've had a long day."],
              ['kit', "(still filming) That's the title."],
            ],
          },
        ],
        else: [],
      },
      {
        scene: { at: 'powder_store', cast: ['dess', 'toby', 'pip', 'hob'] },
        say: [
          ['caption', 'Dess looks at Pip, who has her face, for a long time.'],
          ['caption', 'She looks at Toby, who is looking at the bricked-up arch the way he looked at the beam.'],
          ['caption', 'She taps the door frame three times.'],
          ['dess', "All right. Let's finish it."],
          ['toby', "Hell's bells."],
          ['caption', 'He is crying, a bit. Nobody mentions it.'],
          ['dess', '(to Jay, for the first time by name) Jay, is it? You drive?'],
          ['jay', 'I drive.'],
          ['dess', "We'll see."],
        ],
      },
      {
        scene: { at: 'fort_light', cast: ['pip', 'dess'] },
        say: [
          ['caption', 'Later. The van, the engine running, Hob at the wheel. Pip leans out of the window as they go.'],
          ['pip', 'And mind the road.'],
          ['caption', 'Dess turns, sharp.'],
          ['dess', 'Where did you get that?'],
          ['pip', "Off your riddles. I can't stop saying it."],
          ['caption', 'A beat. For the first time all night, Dess Marlow looks unsure.'],
          ['dess', 'Good.'],
        ],
      },
      { fade: 'out' },
      { blackout: [['caption', 'End of Act Three.']] },
    ],
  });

  // ---- END OF JOBS ----

  // =====================================================================
  // Ambient texts (bible, Appendix B)
  // =====================================================================
  D.texts.push(
    { after: 'd23_odie_wren', from: 'dess', message: "This is Odie. Or Dess. Haven't decided. Toby gave me your number. Don't text back. (Text back.)" },
  );
})();
