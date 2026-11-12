/*
 * data/dlc-act3a.js — "Chasing the Firecrest", ACT 3: ISLA PALOMA, first
 * half (d17 to d20).
 *
 * The island has one bakery and Castellane owns it. Jay runs Hob's doughnuts
 * through a Welcome Check to the old folk of Old Paloma and meets a keeper
 * who taps the counter three times; learns to fly from a man who marks
 * everything out of ten; steals a whole truck to get at a claw machine that
 * has never let go of its prize; and drops out of a helicopter onto an
 * observatory to take a fifty-year-old detective's file from Leo
 * Castellane's study in the middle of his party.
 *
 * Loaded after dlc-act2b.js. See docs/DLC_BIBLE.md (sections 1, 4, 7, 11),
 * docs/dlc/beats-act3.md and docs/mission-format.md. Sets dlc_dash_in /
 * dlc_dash_left (d20). Reads dlc_blog_on / dlc_blog_off: Milo's last line
 * (d17), who gives the truck's route and the tail's max distance, the whistle
 * in the score and the subscribers or the paper wall (d19). Riddles: R8 is
 * re-read (d17) and solved by Milo after the drive (d17); R9 is found and
 * shown, unsolved, at the end of d19 (the bell tower was planted on camera in
 * d17). Tallies: Pip clips the starter key to Jay's belt (d17); Hob's marks
 * seven (d18) and "No mark" (d20); parts six (d19); Lockwood's teddy bear
 * (d19); comment card eight, from Dash's hatband (d20). Fair-play shots: the
 * big wheel (d17), the bell tower (d17), the fort light and its blue door
 * (d18).
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const VAN_CREAM = 0xefefea;
  const SKYLARK_YELLOW = 0xf2c500;
  const SPARROW_WHITE = 0xf2f2ee;
  const GS_TEAL = 0x13b5b1;
  const PEARL = 0xf2f2ee;

  // ------------------------------------------------------------ helpers
  /** Hob's cream doughnut van, PALOMA FLYING CLUB on the side. */
  const doughnutVan = (at) => ({ spawnCar: 'doughnut_van', type: 'porter', at, color: VAN_CREAM, name: "Hob's doughnut van" });
  /** Hob's yellow Skylark. */
  const skylark = (at) => ({ spawnCar: 'hob_skylark', type: 'skylark', at, color: SKYLARK_YELLOW, name: "Hob's Skylark" });
  /** A teal Guest Services Sovereign. */
  const gsCar = (id, at) => ({ spawnCar: id, type: 'sovereign', at, color: GS_TEAL });
  /** Somebody behind the wheel of a spawned car, driving to a place (or after the car Jay is in: then they hunt it). */
  const driver = (id, car, at, to, faction) => ({ id, faction: faction || 'guest_services', hostile: false, at, behavior: 'drive', car, to });
  /** The same, with a pistol out of the window. */
  const gunDriver = (id, car, at, to) => Object.assign(driver(id, car, at, to), { weapon: 'pistol' });

  // =====================================================================
  // d17 — Contraband
  // =====================================================================
  D.missions.push({
    id: 'd17_contraband',
    act: 3,
    title: 'Contraband',
    giver: 'hob',
    start: 'hob_hangar',
    time: 7.5,
    estMinutes: 9,
    summary: 'Isla Paloma has one bakery, and Castellane owns it. Hob Finnegan has a van.',
    reward: { money: 1200 },
    failIf: ['wrecked:doughnut_van', 'dead:hob'],
    steps: [
      { blackout: [['caption', 'Act Three'], ['caption', 'Isla Paloma']] },
      { music: 'off' },
      {
        camera: 'paloma_field', seconds: 4,
        say: [['caption', 'Isla Paloma. Paloma Field. Tuesday, half past seven in the morning. One runway, three hangars, a brand-new windsock and a flag with a green bird on it.']],
      },
      doughnutVan('hob_hangar'),
      {
        spawn: [
          { id: 'hob', char: 'hob', faction: 'flying_club', at: 'hob_hangar', behavior: 'idle', hostile: false },
          { id: 'pip', char: 'pip', at: 'hob_hangar', behavior: 'idle', hostile: false },
        ],
      },
      { music: 'hope' },
      {
        scene: { at: 'hob_hangar', cast: ['hob', 'pip'] },
        say: [
          ['caption', "The hangar mouth. Hob's yellow Skylark, the club's white Sparrow, a kettle on a camping stove, and forty boxes of doughnuts stacked like sandbags."],
          ['caption', 'Pip came over on the first ferry with a sports bag.'],
          ['caption', 'She has laid the five parts out on a doughnut box like a crime scene: the wheel, the bird, the clock, the carburettor, the two headlamps.'],
          ['pip', "Five. Wheel, bird, clock, carb, lamps. That's five. I've counted them nine times. It's still five."],
          ['hob', '(pouring tea into three mugs, one of them a jam jar) Morning, son. Sugar?'],
          ['jay', 'No.'],
          ['hob', "Good. I've run out. Castellane's got the sugar, as well."],
          ['hob', "Right then. The island. Every bakery on Isla Paloma belongs to Leo Castellane. Every single one."],
          ['hob', "Hotel bylaw. Only Castellane Croissants may be sold on the island. Butter, flakes, gold paper bag, four dollars."],
          ['hob', "And the old folk in Old Paloma, who've lived there since before there was a Castellane, want a doughnut. With jam in. Like a person."],
          ['hob', "So every Tuesday I fly them in. Mainland bakery, Skylark, forty boxes, nobody asks."],
          ['hob', "Castellane's got the croissants. I've got the doughnuts. That's the war, son. That's the whole war."],
          ['jay', "It's a doughnut war."],
          ['hob', "Every war's about something small, if you go back far enough."],
          ['pip', 'He means it. He has a map with pins.'],
          ['hob', "Here's the deal. Your bits of car live in my hangar. Nobody looks in a hangar. Too many doughnuts."],
          ['hob', "And the rent's you."],
          ['jay', "I don't do deliveries."],
          ['hob', "You landed an airliner on my driveway. You do deliveries now."],
          ['hob', '(not quite under his breath) New windsock. Forty dollars.'],
          ['pip', "(holding up the Kwik Pik envelope) Before you go. I'm reading it again. Out loud. Somebody has to get it, and it's not going to be me, and I hate that."],
          ['pip', "(reading) 'I'm in a box where nobody wins,"],
          ['pip', "beside a wheel that turns and spins."],
          ['pip', "Many have tried with a coin and a claw;"],
          ['pip', "the wheel goes round, and goes nowhere at all."],
          ['pip', "And mind the road.'"],
          ['pip', "Still nothing. Milo's thinking. I can hear him thinking from here."],
          ['hob', "A box nobody wins. That's my club's trophy cabinet."],
          ['caption', 'Pip looks at the gold bird on her belt for a moment. Then she unclips the starter key on its little keyring and clips it to Jay\'s belt loop.'],
          ['pip', 'Driver holds the key.'],
          ['jay', 'Since when?'],
          ['pip', "Since Gran. It's a rule. I've just made it up."],
          ['jay', '(looking down at it) Right.'],
          ['caption', 'He doesn\'t take it off.'],
        ],
      },
      { join: ['hob'], weapon: 'fists' },
      {
        say: [
          ['pip', "I'm not coming. Banned. Also I'm guarding the parts."],
          ['pip', "(taking a doughnut out of the nearest box) Also I'm having one of these."],
          ['hob', "That's a stock loss, that is."],
        ],
      },
      { getIn: 'doughnut_van', objective: 'Take the doughnuts to Old Paloma' },
      { music: 'tension' },
      {
        goto: 'strand_checkpoint', vehicle: 'doughnut_van', stop: true, radius: 10,
        objective: "Down the Neon Strand. There's a Welcome Check",
        say: [
          ['hob', '(buckling up, a doughnut box on his knees) Gently with her. She\'s carrying four hundred doughnuts and a grudge.'],
          ['jay', '(to the van) Easy. Nobody\'s chasing us. Yet.'],
          ['hob', "So. The Paloma Flying Club. Founded by my dad. Five members."],
          ['hob', "Me and four members. The members mostly drink tea. One of them's been dead since March. We keep him on the books for the vote."],
          ['jay', 'What does he vote for?'],
          ['hob', 'Whatever I vote for. Lovely man. Very loyal.'],
          ['caption', 'The van hits a pothole. Something in the back goes soft and final.'],
          ['hob', "That's a jam casualty, son."],
          ['hob', "You drive like you fly. I mean that as a warning."],
          ['jay', "I've flown once."],
          ['hob', 'And I was there. I had a chair out. I nearly dropped my tea.'],
          ['caption', 'Another bump. A box slides.'],
          ['hob', 'Custard down. Custard down.'],
          ['hob', '(throwing a tarpaulin over the boxes behind the seats; it is stencilled AVIATION PARTS) Right then. Welcome Check coming up. Let me do the talking. You do the looking-bored.'],
          ['jay', "I'm good at that."],
          ['hob', 'I had noticed.'],
        ],
      },
      {
        spawn: [
          { id: 'gs_staff', char: 'gs_staff', faction: 'guest_services', at: 'strand_checkpoint', behavior: 'guard', hostile: false },
          { id: 'check_gs', faction: 'guest_services', at: 'strand_checkpoint', count: 3, behavior: 'guard', hostile: false, group: 'checkpoint' },
        ],
      },
      {
        scene: { at: 'strand_checkpoint', cast: ['gs_staff', 'hob'] },
        say: [
          ['caption', 'Teal cones across two lanes, a gazebo with a Castellane flag on it, and four smiling men in teal blazers with clipboards.'],
          ['gs_staff', 'Good morning! Welcome to Isla Paloma!'],
          ['gs_staff', 'Anything to declare? Pastries? Baked goods? Croissant-adjacent products?'],
          ['hob', 'Aviation parts.'],
          ['gs_staff', '(sniffing, still smiling) They smell of jam.'],
          ['hob', 'Hydraulic jam. Very technical. Keeps the flaps moving.'],
          ['gs_staff', '(writing it down) Hydraulic... jam.'],
          ['hob', "Quick question while I've got you, lads. Is a croissant a bread or a cake?"],
          ['gs_staff', '(at once) Bread.'],
          ['caption', 'The guard behind him clears his throat.'],
          ['gs_staff', "(turning round) It's bread, Dominic. It's in the bread section."],
          ['caption', 'Dominic thinks it is a cake. He has thought about it a lot. A third guard says, quietly, that it is a lifestyle.'],
          ['gs_staff', "It's not a lifestyle, Neil, it's a breakfast."],
          ['caption', 'The argument goes on for some time. A queue builds behind the van. Somebody honks.'],
          ['gs_staff', '(waving the van through just to make it stop) Go on. Go. Enjoy your stay!'],
          ['hob', '(waving back, warmly, as the van rolls) Lovely lads. Wrong about croissants.'],
          ['jay', 'Which one was right?'],
          ['hob', 'Neil. Neil was right.'],
        ],
      },
      {
        camera: 'wonder_wharf', seconds: 3,
        say: [['caption', 'Wonder Wharf, as the van pulls away: the big wheel turning slowly in the morning sun, arcade row still shuttered beside it.']],
      },
      { getIn: 'doughnut_van', objective: 'Get back in the van' },
      { music: 'action', checkpoint: true },
      {
        deliver: 'doughnut_van', to: 'plaza_cafe', maxDamage: 0.35, timeLimit: 240,
        objective: "Get the doughnuts to Ines's café before she opens (keep them in one piece)",
        say: [
          ['hob', "Ines opens at eight. The croissant man walks past at eight. We've got till then."],
          ['jay', 'Or what?'],
          ['hob', 'Or he sees the boxes, and I get a letter. On very thick paper. I have a drawer of them.'],
          ['hob', 'Right, the orders. Mr Okafor: six glazed, no talking to him before he\'s had one.'],
          ['hob', "Mrs Abara: two custard, one for the cat. The cat's diabetic. She knows. The cat doesn't."],
          ['jay', "That's not good for the cat."],
          ['hob', "Neither's being a cat in Old Paloma, son. They all look ninety. Even the kittens."],
          ['caption', 'A kerb. A lurch. A wet noise from the back.'],
          ['hob', "We've lost a glazed."],
          ['jay', '(to the van) Sorry.'],
          ['hob', "Don't apologise to the van. Apologise to Mr Okafor."],
          ['hob', "Paloma Field's the last bit of this island Castellane doesn't own, you know. His dad tried to buy it off my dad."],
          ['hob', "My dad said no in a way I won't repeat in front of the doughnuts."],
          ['hob', 'Left here. Into the old town. Mind the steps. There are steps in the road. Nobody knows why.'],
          ['caption', 'The Strand\'s glass gives way to old stone: narrow lanes, washing lines, and over the roofs, a church tower.'],
        ],
      },
      { music: 'hope' },
      {
        camera: 'bell_tower', seconds: 3,
        say: [['caption', 'Paloma Plaza: the church on its square, and high up in the tower\'s arch, a big green-bronze bell hanging still.']],
      },
      {
        spawn: [
          { id: 'ines', char: 'ines', at: 'plaza_cafe', behavior: 'idle', hostile: false },
          { id: 'odie', char: 'odie', at: 'plaza_cafe', behavior: 'idle', hostile: false },
        ],
      },
      {
        scene: { at: 'plaza_cafe', cast: ['ines', 'odie', 'hob'] },
        say: [
          ['caption', "Ines's café: three tables outside, a striped awning, a glass cover on the counter with nothing under it yet."],
          ['ines', '(already holding the door, looking both ways along the plaza) Inside. Quick. Quick. The croissant man walks past at eight.'],
          ['caption', 'Hob and Jay carry the boxes in like ammunition in a war film. Ines stacks them under the counter and drapes a tea towel over the top.'],
          ['ines', '(to Jay, without looking up) You are new. You carry like a man who has never carried custard.'],
          ['jay', "I haven't."],
          ['ines', 'It shows.'],
          ['caption', 'Somebody is already at the counter, first in the queue before the café is even open.'],
          ['caption', 'An old woman in a faded flame-orange cardigan, white hair cropped short, a big racing watch on a man\'s strap.'],
          ['odie', 'Twelve doughnuts. The jam ones.'],
          ['caption', 'She turns her head and looks straight at Jay.'],
          ['odie', "Don't look at me like that, young man, I'm not a ghost."],
          ['jay', 'I was just looking.'],
          ['odie', 'I know. That was the look.'],
          ['caption', 'She puts the exact money on the counter in a neat pile, coins on top of the note.'],
          ['odie', '(tapping the counter three times, as if to a car) There.'],
          ['caption', 'Ines bags twelve jam doughnuts. The old woman takes them, and then her eye lands on the little gold bird hanging from Jay\'s belt. She looks at it for a long moment.'],
          ['odie', 'Pretty bird.'],
          ['caption', 'Then she goes, without hurrying, out across the plaza and down into the lanes.'],
          ['hob', "Odie Wren. Keeps the fort light. Twenty years I've done her doughnuts. Never once said thank you. Pays exact."],
          ['ines', 'She said thank you once. Nineteen years ago. I wrote it down.'],
          ['hob', 'You never told me that.'],
          ['ines', 'You never asked. You were busy telling me about croissants.'],
        ],
      },
      { leave: ['odie'] },
      {
        phone: 'milo',
        say: [
          ['milo', "Did you know Wonder Wharf's big wheel takes eleven minutes to go round and has never once gone anywhere? That's important. Definitely."],
          ['jay', 'Morning, Milo.'],
          ['milo', 'Morning. Grandad wants to go first. He always wants to go first. Go on, Grandad.'],
          ['prof_quill', "(from across the study) Clearly the rhyme refers to the paddle wheel of the island ferry Constance, which in 1931 went round in circles for an entire afternoon."],
          ['prof_quill', 'The rudder chain had snapped. The passengers were given soup. It is a very well documented afternoon.'],
          ['milo', "Grandad. No. (to Jay) A box where nobody wins: a claw machine. A wheel that turns and spins and goes nowhere: a big wheel."],
          ['milo', "Wonder Wharf has both, side by side. The Golden Grabber. It's been there since before Grandad had eyebrows."],
          ['prof_quill', 'I had eyebrows in 1931. (beat) I wasn\'t born in 1931. Never mind.'],
          ['milo', "There's a gear stick under the dome. It's the prize. Nobody's ever won it. I looked it up. There's a forum."],
          ['jay', "There's a forum."],
          ['milo', "There's a forum for everything. Probably."],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [{ phone: 'milo', say: [['milo', "I'll post it tomorrow. I wait a day now. It's agony. I've started biting my pencil."]] }],
        else: [{ phone: 'milo', say: [['milo', "It's on the wall. In pencil. In case. I've drawn the claw. It looks like a spider holding a gear stick. It's quite upsetting."]] }],
      },
      {
        scene: { at: 'plaza_cafe', cast: ['hob'] },
        say: [
          ['caption', 'Outside, the queue has grown to eleven old people and one dog. Hob takes a single jam doughnut out of the box he kept back and holds it out.'],
          ['hob', 'Wages.'],
          ['jay', 'This is a doughnut.'],
          ['hob', "That's how the war works, son."],
          ['caption', 'Jay eats it. It is, annoyingly, the best doughnut he has ever had.'],
          ['hob', "(watching him) Tuesday next week. Same time. Bring a better pair of shoes, you'll be carrying."],
        ],
      },
    ],
  });

  // =====================================================================
  // d18 — Ground School
  // =====================================================================
  D.missions.push({
    id: 'd18_ground_school',
    act: 3,
    title: 'Ground School',
    giver: 'hob',
    start: 'field_apron',
    time: 9.5,
    estMinutes: 10,
    summary: 'The bridge is watched and the island is easier from the air. Jay is having a flying lesson whether he likes it or not.',
    reward: { money: 1500, unlock: ['dside_flying'] },
    failIf: ['wrecked:hob_skylark', 'dead:hob'],
    steps: [
      skylark('field_apron'),
      {
        spawn: [
          { id: 'hob', char: 'hob', faction: 'flying_club', at: 'field_apron', behavior: 'idle', hostile: false },
          { id: 'pip', char: 'pip', at: 'field_apron', behavior: 'idle', hostile: false },
        ],
      },
      { music: 'hope' },
      {
        scene: { at: 'field_apron', cast: ['hob', 'pip'] },
        say: [
          ['caption', 'The apron at the end of the runway. Hob\'s yellow Skylark, chocks under its wheels, a doughnut box on the wing like a paperweight.'],
          ['hob', "Right then. Facts. Castellane's got men on the bridge. 'Welcome Checks.' He's got Guest Services on every road on this island."],
          ['hob', "Everything on this island is easier from the air. (beat) Except doughnuts. Doughnuts are easier from a van."],
          ['hob', "So you're having a lesson. Whether you like it or not."],
          ['jay', "I've flown."],
          ['hob', "You've landed. Once. On my windsock. That's not flying, that's an opinion."],
          ['pip', "(to Jay) He's right. I watched the video. You were very lucky and it was very loud."],
          ['hob', "First rule. A plane is a car with one more way to crash. Respect the extra way."],
          ['jay', 'Up.'],
          ['hob', 'Up. And down, which is the one that gets people.'],
          ['caption', 'The walk-round. Hob points at things. Jay looks at them. Hob points at the tyre.'],
          ['hob', 'Kick the tyre.'],
          ['caption', 'Jay kicks the tyre.'],
          ['hob', "Not that hard. It's a plane, not a debt collector."],
          ['jay', '(a hand flat on the warm yellow cowling) Easy. You\'re smaller than the last one.'],
          ['hob', "Don't tell her that. She's sensitive about it."],
          ['caption', 'Pip holds up her phone. On the screen, a video call from his grandad\'s study: Milo, in a pair of pilot\'s wings cut out of a cereal box and coloured in with gold felt-tip.'],
          ['milo', 'Did you know the Skylark has a stall speed of fifty knots? Below that it stops being a plane and starts being a brick. I made wings.'],
          ['hob', 'Who is that?'],
          ['pip', 'Milo. He solves things.'],
          ['hob', "(peering at the screen) Nice wings, son. Wrong way up."],
          ['milo', '(turning them round, quickly) That was a test.'],
          ['caption', 'Jay climbs up into the left seat. Pip, as he pulls the door to:'],
          ['pip', 'And mind the road.'],
          ['hob', "There's no road."],
          ['pip', "I know. I can't stop saying it."],
        ],
      },
      { join: ['hob'], weapon: 'fists' },
      { getIn: 'hob_skylark', objective: "Get in. Hob's in the right seat" },
      {
        fly: 'paloma_field', height: 40, radius: 60,
        objective: 'Take off and climb out over the field',
        say: [
          ['hob', '(headphones on, a pencil behind his ear) Controls. Think of it as a car.'],
          ['hob', "Stick's your steering wheel, if your steering wheel also did up and down. Throttle's your accelerator."],
          ['hob', 'Rudder pedals are... feet. Use your feet.'],
          ['jay', 'I always use my feet.'],
          ['hob', "Use them gentler. Checks. Fuel?"],
          ['jay', 'Full.'],
          ['hob', 'Mirrors?'],
          ['jay', 'There are no mirrors.'],
          ['hob', 'Exactly. Look out of the window. Right then. Full power, keep her on the line, and when she wants to fly, let her.'],
          ['caption', 'The Skylark rattles down the runway. The doughnut box slides off the wing. Somewhere behind them Pip catches it.'],
          ['hob', 'Gently. Gently. That\'s it.'],
          ['hob', '(beat) Crikey, you\'re a natural. Don\'t tell anyone.'],
        ],
      },
      {
        fly: 'paloma_observatory', height: 100, radius: 60,
        objective: 'Climb to the observatory on Paloma Heights',
        say: [
          ['hob', "Isla Paloma. Grand tour. Mind your left wing on the hill, it's got a rich man on it."],
          ['hob', "That's Leo's estate. Biggest house on the island. Thirty bathrooms. I've counted the chimneys. You can tell a lot from chimneys."],
          ['jay', 'What do his say?'],
          ['hob', "They say 'I've never cleaned a chimney.'"],
          ['hob', "That flat roof with the big H on it, that's the clinic. Helipad. Private. They do knees, mostly. Rich knees."],
          ['hob', "And there's the observatory. Astronomers. Up all night looking at things that aren't there any more. Big doughnut people."],
          ['milo', '(over the radio, from Pip\'s phone) Did you know the light from some stars left before the stars went out? You can see something that isn\'t there.'],
          ['hob', 'Is he always like that?'],
          ['jay', 'Yes.'],
          ['hob', "(approving) Good. Somebody's got to be."],
        ],
      },
      {
        fly: 'paloma_fort', height: 90, radius: 60,
        objective: 'Out to the old fort on the south shore',
        say: [
          ['hob', "Bank her round. Gentle. Gentle. Lean, don't throw. Out to the south shore."],
          ['hob', 'Old Paloma under your right wing. Church, plaza, harbour. Best fish on the island, worst parking.'],
          ['jay', "Ines's place."],
          ['hob', 'Ines. Married three times, all to fishermen, all called Tomás. She says it saves on monograms.'],
          ['caption', 'Ahead, at the very tip of the island, an old star-shaped stone fort and a white lighthouse on its seaward wall.'],
        ],
      },
      {
        camera: 'fort_light', seconds: 3,
        say: [['caption', 'The stone fort, its lighthouse, and at the foot of the tower a small blue door with a window beside it.']],
      },
      {
        say: [
          ['hob', "Fort light. Odie's. She waves at me sometimes. With one finger. I choose to think it's friendly."],
          ['caption', 'Jay looks at the blue door a beat longer than he needs to.'],
          ['hob', 'Eyes front, son. Lighthouses stay where they are. Planes don\'t.'],
        ],
      },
      { spawnCar: 'transporter', type: 'hauler', at: 'golden_grabber', color: GS_TEAL, name: 'the teal transporter' },
      { spawn: [{ id: 'grab_crew', faction: 'guest_services', at: 'golden_grabber', count: 3, behavior: 'idle', hostile: false }] },
      {
        fly: 'wonder_wharf', height: 80, radius: 60,
        objective: 'Round the big wheel at Wonder Wharf',
        say: [
          ['hob', "North up the Strand now. Neon Strand. Every hotel with a C on it is his. You'll get a crick in your neck."],
          ['hob', "Wonder Wharf. Big wheel. Go round it, not through it. They've asked me to say that to students."],
          ['jay', 'Has somebody gone through it?'],
          ['hob', 'Not all the way.'],
        ],
      },
      {
        camera: 'golden_grabber', seconds: 4,
        say: [
          ['caption', 'From high up: arcade row, a crane arm swung out, and men in teal blazers lowering a glass-domed claw machine onto a teal transporter with straps and a great deal of pointing.'],
          ['hob', "Your claw machine's going for a drive."],
          ['jay', '(to the plane, quietly) Damn.'],
          ['milo', "(over the radio from Pip's phone, much too loud) THEY'RE TAKING THE GRABBER. Pip, they're taking the— oh, you can see. Sorry. Hello, Hob."],
          ['hob', 'Hello, small person.'],
          ['pip', "(radio) Where's it going?"],
          ['hob', 'Somewhere with a guest list.'],
        ],
      },
      {
        fly: 'castellane_palace', height: 70, radius: 60,
        objective: 'Down the Strand, then turn for home',
        say: [
          ['caption', 'CHAMPIONS SINCE DAY ONE, in gold neon taller than a house, slides by under the wing.'],
          ['hob', "That sign's visible from space. I've asked an astronaut."],
          ['jay', 'You know an astronaut?'],
          ['hob', "I've asked one. He didn't answer. That's an answer."],
          ['pip', "(radio) Champions since day one. They weren't even champions on day one. That's the whole point."],
          ['hob', "(gently) I know, love. Everybody on this island knows something. Nobody says it. That's islands."],
        ],
      },
      { music: 'triumph' },
      {
        land: 'paloma_field', radius: 40,
        objective: 'Land on Paloma Field (all three wheels, if you can)',
        say: [
          ['hob', "Right then. Line her up with the runway. The long grey thing. Not the car park."],
          ['hob', 'Power off. Nose up a touch.'],
          ['hob', 'Hold it.'],
          ['hob', 'Hold it.'],
          ['pip', '(radio, cheering) GO ON, JAY!'],
          ['milo', '(radio, also cheering) Flare! FLARE! I read about flaring!'],
          ['caption', 'Hob reaches over without looking and turns the radio off.'],
          ['hob', 'Let her sit. Let her sit. (beat) There.'],
        ],
      },
      { music: 'hope' },
      {
        scene: { at: 'field_apron', cast: ['hob', 'pip'] },
        say: [
          ['caption', 'The Skylark ticks as it cools. Hob climbs out, takes the clipboard off its hook and writes on it for a long time. Pip and Milo wait. Jay waits.'],
          ['hob', 'Seven.'],
          ['pip', 'SEVEN.'],
          ['hob', "Don't tell anyone. They'll think I've gone soft."],
          ['milo', '(on the phone) Grandad got four on his driving test.'],
          ['hob', 'Out of ten?'],
          ['milo', 'Out of a hundred.'],
          ['hob', '(after a moment, respectfully) Crikey.'],
          ['caption', 'Hob takes a small green logbook out of his back pocket and gives it to Jay. STUDENT PILOT. J. MERCER. Inside, one line in pencil.'],
          ['jay', "(reading) 'Lesson one. Seven. Saw a claw machine.'"],
          ['hob', "I write what happened. That's a logbook."],
          ['pip', '(already back to business) Tonight they move it. Milo found the permit. We get it tonight.'],
          ['hob', "Not in my plane you don't. A claw machine doesn't fit in a Skylark."],
          ['hob', "I've tried. Different claw machine. Long story."],
          ['jay', "We'll take the truck."],
          ['pip', '...The whole truck?'],
          ['jay', "It's easier than the machine."],
          ['milo', "(on the phone, very quietly) That's the best sentence I've ever heard."],
        ],
      },
      { leave: ['hob', 'pip'] },
      { text: 'hob', message: 'Lesson 2 whenever you like. Bring your own doughnut. Hob' },
    ],
  });

  // =====================================================================
  // d19 — The Golden Grabber
  // =====================================================================
  /** The tail's lines under the route, the same in both branches. */
  const tailBanter = [
    ['pip', "(phone, from the hangar) Is he cornering? Tell me how he's cornering."],
    ['jay', 'Badly.'],
    ['pip', "He brakes in the corner. In the corner! Who taught him? A wardrobe?"],
    ['milo', '(joining the call) Hello. Did you know some claw machines have a dial inside? It decides how often the claw grips.'],
    ['milo', "Most of the time it's set to let go."],
    ['jay', "That's rigged."],
    ['milo', "That's arcades."],
    ['pip', "Fifty years. Fifty years that thing's been sitting on Gran's gear stick, letting go."],
    ['jay', 'Not tonight.'],
  ];

  D.missions.push({
    id: 'd19_golden_grabber',
    act: 3,
    title: 'The Golden Grabber',
    giver: 'milo',
    start: 'wonder_wharf',
    time: 20.5,
    estMinutes: 10,
    summary: 'Nobody has won the Golden Grabber in fifty years. Jay takes the whole machine.',
    reward: { money: 2000 },
    failIf: ['wrecked:transporter'],
    steps: [
      {
        camera: 'wonder_wharf', seconds: 4,
        say: [['caption', 'Wonder Wharf, Neon Strand. Half past eight. Neon in every colour, the big wheel lit up like a dial, and somewhere behind it a roller coaster rattling and screaming.']],
      },
      { music: 'tension' },
      { spawnCar: 'transporter', type: 'hauler', at: 'golden_grabber', color: GS_TEAL, name: 'the teal transporter' },
      {
        spawn: [
          { id: 'lorna', char: 'lorna', at: 'golden_grabber', behavior: 'idle', hostile: false },
          { id: 'dash', char: 'dash', faction: 'lockwood_tv', at: 'golden_grabber', behavior: 'idle', hostile: false },
          { id: 'kit', char: 'kit', faction: 'lockwood_tv', at: 'golden_grabber', behavior: 'idle', hostile: false },
          { id: 'grab_crew', faction: 'guest_services', at: 'transporter', count: 3, behavior: 'idle', hostile: false },
        ],
      },
      {
        scene: { at: 'golden_grabber', cast: ['lorna', 'dash', 'kit'] },
        say: [
          ['caption', 'Arcade row. A gap in the line of machines where something big used to stand: four dents in the carpet and a socket on the wall.'],
          ['caption', 'Out on the service road, the teal transporter, a glass dome strapped on the back under a tarp that keeps blowing off.'],
          ['caption', 'At the change counter, in a pink tabard, a woman who has been there for forty years and looks it, in a good way.'],
          ['lorna', "If you're here for the Grabber, love, you're too late. And you'd have lost."],
          ['jay', 'Has anybody ever won it?'],
          ['lorna', "The gear stick? Nobody's won the gear stick. Not once. Forty years I've watched them try."],
          ['lorna', 'Kids. Grandads. Honeymooners. A man from the council with a ruler.'],
          ['jay', 'What did he measure?'],
          ['lorna', 'His disappointment, love. Took him all afternoon.'],
          ['lorna', "The claw's got the grip of a disappointed aunt. Touches it, thinks about it, lets go."],
          ['lorna', "Mr Castellane's bought it. 'For his private collection.' Thirty years nobody from the hotel's looked at that machine, and now it's going to live in a house with thirty bathrooms."],
          ['jay', 'Where to?'],
          ['lorna', "They don't tell me things. I'm a change counter."],
          ['caption', 'Behind them, a grunt. Dash Lockwood, on his knees at the machine next door, his arm up its prize chute to the shoulder. Kit, his camera operator, films it without expression.'],
          ['caption', 'Dash comes out of the chute with something pink, gets to his feet, finds his light and turns to the lens.'],
          ['dash', '(holding it up) Legend... FOUND!'],
          ['kit', "It's a bear."],
          ['dash', "(off camera, the voice dropping straight back to normal) I know it's a bear, Kit. Crap."],
          ['dash', "Keep rolling. It's a nice bear."],
          ['kit', "We're rolling. We're always rolling."],
          ['dash', '(spotting Jay, perfectly friendly) Oh! Evening! Are you also not finding anything?'],
          ['jay', 'Yes.'],
          ['dash', "Kit had a hunch about this row. Something on the internet. She reads things. I don't read. It's bad for the hair."],
          ['caption', 'Nobody tells Dash which machine is on the truck. Lorna looks at Jay. Jay looks at Lorna. Lorna goes back to counting coins.'],
          ['lorna', '(not looking up) Good luck, love. With whatever it is you\'re not doing.'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', 'Did you know Wonder Wharf has four hundred and twelve light bulbs and nine of them are out? A reader counted.'],
              ['milo', "Same reader works nights at the convention centre. She says the truck's going along the Strand to the loading dock behind it."],
              ['milo', "Her name is WharfGull. She's my favourite reader now. Don't tell Gran."],
              ['jay', 'Your post said Golden Grabber.'],
              ['milo', "My post said 'a claw machine somewhere fun'. I waited a day. I was vague. Vague is my new thing."],
              ['jay', "Lockwood's here."],
              ['milo', '(delighted) Is he finding something?'],
              ['jay', 'A bear.'],
              ['milo', "I'm writing that down."],
            ],
          },
        ],
        else: [
          {
            phone: 'hob',
            say: [
              ['caption', 'Engine noise behind every word: Hob is up in the Skylark, circling over the Strand.'],
              ['hob', "I've got eyes on your truck, son. I'm the eyes. Big teal box, a glass dome on the back, you can't miss it."],
              ['hob', "I'll tell you if it turns. Don't get too close and don't lose it."],
              ['hob', "That's all tailing is. It's like courting."],
              ['jay', 'How did your courting go?'],
              ['hob', "Married forty years. She's in the passenger seat. Say hello, Maureen."],
              ['caption', 'A very small, very calm voice over the engine says hello.'],
            ],
          },
        ],
      },
      {
        getIn: 'any',
        objective: "Get a car. Something that doesn't look like it's following a truck",
        say: [
          ['pip', "(phone) Not the van. Don't take the van. It's got PALOMA FLYING CLUB on the side and a picture of a doughnut."],
          ['jay', 'I know what the van looks like.'],
          ['pip', 'The Palace has a valet stand. They leave the keys in. I know because I was going to... never mind what I was going to.'],
        ],
      },
      { leave: ['grab_crew_0', 'grab_crew_1', 'grab_crew_2'], vanish: true },
      { spawn: [driver('truck_driver', 'transporter', 'transporter', 'convention_dock')] },
      {
        if: 'dlc_blog_on',
        then: [
          {
            follow: 'transporter', to: 'convention_dock', min: 15, max: 140,
            objective: "Tail the transporter. Don't get close",
            say: [
              ['milo', "(phone) WharfGull says they go past the flamingo hotel and then the one shaped like a shell. Then round the back."],
              ['jay', 'Which flamingo hotel?'],
              ['milo', 'She says there are two and to take the uglier one.'],
            ].concat(tailBanter),
          },
        ],
        else: [
          {
            follow: 'transporter', to: 'convention_dock', min: 15, max: 110,
            objective: "Tail the transporter. Don't get close",
            say: [
              ['hob', "(radio) He's pulling out. Slow. He's got a glass dome on the back, he's driving like he's carrying soup."],
              ['hob', 'Left at the hotel with the flamingo on it. (beat) No, the other flamingo.'],
              ['hob', "Ease off, son, you're in his mirrors. Give him room. Let him think he's alone in the world."],
            ].concat(tailBanter, [
              ['hob', "(radio) Round the back of the convention centre. That's your loading dock. I'm going home before I run out of fuel and ideas."],
            ]),
          },
        ],
      },
      {
        camera: 'convention_dock', seconds: 3,
        say: [
          ['caption', 'Behind the Paloma Convention Centre the transporter backs into the loading dock, beeping. Two men in teal blazers climb down from the cab.'],
          ['caption', 'One of them stretches. "Ten minutes, lads. Coffee." They walk off round the corner, chatting about croissants. The engine is still running.'],
        ],
      },
      { leave: ['truck_driver'] },
      {
        phone: 'pip',
        say: [
          ['pip', "They've left it running? Who leaves it running?"],
          ['jay', "People who've never had a truck stolen."],
        ],
      },
      { goto: 'convention_dock', vehicle: false, stop: true, radius: 6, objective: 'Get to the truck' },
      { getIn: 'transporter', objective: 'Take the whole truck' },
      { music: 'action', checkpoint: true },
      {
        heat: 1,
        say: [
          ['jay', "(to the truck, easing it out of the dock) Easy. You're carrying the only thing on this island nobody's ever won."],
          ['caption', 'A patrol car on the Strand sees a teal truck come out of a loading dock driven by a man not in a teal blazer, and decides to have an opinion about it.'],
        ],
      },
      gsCar('gs_car1', 'neon_strand'),
      gsCar('gs_car2', 'neon_strand'),
      { spawn: [gunDriver('gs_driver1', 'gs_car1', 'gs_car1', 'transporter'), gunDriver('gs_driver2', 'gs_car2', 'gs_car2', 'transporter')] },
      {
        say: [
          ['gs_staff', '(over a loudhailer, from the first Sovereign) Good evening! That vehicle is a guest of the hotel!'],
          ['gs_staff', 'Please return it to the dock at your earliest convenience! Thank you!'],
        ],
      },
      {
        deliver: 'transporter', to: 'hob_hangar', maxDamage: 0.6,
        objective: "Get the machine back to Hob's hangar in one piece",
        say: [
          ['caption', 'Behind the cab the Golden Grabber rattles on its straps. Under the glass the claw swings like a pendulum.'],
          ['pip', "(phone) Mind the dome. If you crack the dome I'll... I don't know what I'll do."],
          ['pip', "I'll be disappointed in a really loud way."],
          ['jay', "(to the truck, as a Sovereign's bumper kisses the back corner) Damn. Sorry. That one wasn't you."],
          ['caption', 'The tarp finally tears loose, flies back over the roof of the cab and wraps itself round the windscreen of the Sovereign behind.'],
          ['pip', "Was that the tarp? Did the tarp just get one of them? I'm giving the tarp a nine."],
          ['hob', '(phone, from the hangar now) Bring it in the side gate. Club land. They won\'t come through the gate.'],
          ['jay', 'Why not?'],
          ['hob', "There's a sign."],
          ['jay', "A sign."],
          ['hob', "A very good sign. I painted it myself."],
        ],
      },
      { leave: ['gs_driver1', 'gs_driver2'], vanish: true },
      { loseHeat: true, objective: 'Lose the police before you go in' },
      { music: 'hope' },
      {
        spawn: [
          { id: 'hob', char: 'hob', faction: 'flying_club', at: 'hob_hangar', behavior: 'idle', hostile: false },
          { id: 'pip', char: 'pip', at: 'hob_hangar', behavior: 'idle', hostile: false },
        ],
      },
      {
        scene: { at: 'hob_hangar', cast: ['hob', 'pip'] },
        say: [
          ['caption', 'The airfield gate. Behind the truck, two teal Sovereigns pull up short, as if they had hit a wall, and sit there with their engines ticking.'],
          ['caption', 'Hob, in a dressing gown over his flying-club jumper, points at a hand-painted board wired to the fence: PALOMA FLYING CLUB. MEMBERS ONLY. NO CROISSANTS.'],
          ['hob', "Private airfield. Club rules. They can't come on without a member signing them in."],
          ['jay', 'And Ottoline obeys that.'],
          ['hob', "Ottoline knows the rules. She's a stickler. I respect that in a woman who wants me dead."],
          ['caption', 'One by one, the Sovereigns reverse, turn and go. The last one flashes its lights. It might be a threat. It might be manners.'],
          ['pip', '(already up on the back of the truck, both hands flat on the glass dome) Hello. Hello, you.'],
        ],
      },
      {
        blackout: [
          ['caption', 'The hangar. Ten past ten. The Golden Grabber stands on the concrete between the Skylark and the doughnuts, plugged into Hob\'s kettle socket, humming.'],
          ['caption', 'Attempt one.'],
          ['caption', 'Attempt four. Hob has brought a chair.'],
          ['caption', 'Attempt nine. Pip has stopped rating it.'],
          ['caption', 'Attempt thirteen. The claw touches the gear stick. The claw thinks better of it.'],
          ['caption', 'Attempt fourteen.'],
          ['jay', '(to the machine) Come on. Damn it.'],
          ['caption', 'Milo, on the video call propped against the kettle, very calm:'],
          ['milo', 'Unplug it.'],
          ['pip', 'What?'],
          ['milo', 'The dial. It lets go when it\'s powered. Unplug it.'],
          ['caption', 'Hob pulls the plug. The hum stops. Inside the dome, the little clamp that has held the gear stick upright for fifty years goes slack.'],
          ['caption', 'The stick tips, slides, and drops into the prize chute with a clunk.'],
          ['caption', 'Something rolls out of the chute that nobody has held since the night the Firecrest disappeared: a gear stick, a little chrome, a black knob worn smooth by one hand.'],
        ],
      },
      {
        scene: { at: 'hob_hangar', cast: ['pip', 'hob'] },
        say: [
          ['caption', 'Pip holds the gear stick in both hands, the way you\'d hold something that might still be warm.'],
          ['pip', '(very quietly) Fourteen goes. Fifty years. And you just... unplug it.'],
          ['hob', "Most things work better unplugged. Me, for one."],
          ['milo', '(on the video call) Score update. Team Firecrest six. Gear stick.'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', "Lockwood's Lost Legends nil, plus one tap, one spur, one minute hand, one gnome, one whistle, and one teddy bear."],
              ['milo', "Pink. I'm counting it. Fairness matters."],
              ['milo', 'Subscribers: twelve thousand and a bit. The bit is Gran\'s bridge club.'],
              ['jay', 'Your gran plays bridge?'],
              ['milo', "She says she does. Mostly they talk about me."],
            ],
          },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', "Lockwood's Lost Legends nil, plus one tap, one spur, one minute hand, one gnome, and one teddy bear."],
              ['milo', "Pink. I'm counting it. Fairness matters."],
              ['milo', "It's on the wall. I've drawn the bear. It's the best thing I've drawn. That's not fair on the car, but it's true."],
            ],
          },
        ],
      },
      {
        scene: { at: 'hob_hangar', cast: ['pip', 'hob'] },
        say: [
          ['caption', 'Pip turns the black knob. It unscrews, stiff, then easy. Inside the stick is hollow, and inside the hollow is a tight roll of paper.'],
          ['pip', '(unrolling it under the strip-light) It\'s her writing.'],
        ],
      },
      {
        blackout: [
          ['caption', 'Ring me once when the boats come in,'],
          ['caption', "I'll ring back with a spark within."],
          ['caption', 'I hang above the market square'],
          ['caption', 'and swing for every wedding there.'],
          ['caption', 'And mind the road.'],
        ],
      },
      {
        scene: { at: 'hob_hangar', cast: ['pip', 'hob'] },
        say: [
          ['milo', "(on the video call) Don't anybody say anything. I'm thinking."],
          ['pip', "I wasn't going to say anything. I haven't got anything."],
          ['hob', "I'm not thinking. I'm putting the kettle on."],
          ['caption', 'Hob plugs the kettle back into the Golden Grabber\'s socket. Somewhere in the dome, for the last time, the empty claw twitches.'],
        ],
      },
    ],
  });

  // =====================================================================
  // d20 — The Gorse File
  // =====================================================================
  D.missions.push({
    id: 'd20_the_gorse_file',
    act: 3,
    title: 'The Gorse File',
    giver: 'prof_quill',
    start: 'hob_hangar',
    time: 22,
    estMinutes: 12,
    summary: 'Fifty years ago a detective called Gorse wrote down where Dess Marlow went. The file is in Leo Castellane\'s study, and tonight Leo is having a party.',
    reward: { money: 3000 },
    failIf: ['dead:hob', 'dead:prof_quill'],
    steps: [
      {
        spawn: [
          { id: 'prof_quill', char: 'prof_quill', at: 'hob_hangar', behavior: 'idle', hostile: false },
          { id: 'hob', char: 'hob', faction: 'flying_club', at: 'hob_hangar', behavior: 'idle', hostile: false },
          { id: 'pip', char: 'pip', at: 'hob_hangar', behavior: 'idle', hostile: false },
        ],
      },
      { spawnCar: 'club_sparrow', type: 'sparrow', at: 'field_apron', color: SPARROW_WHITE, name: "the club's Sparrow" },
      { music: 'tension' },
      {
        scene: { at: 'hob_hangar', cast: ['prof_quill', 'pip', 'hob'] },
        say: [
          ['caption', 'The hangar at night. The Golden Grabber in the corner with a tea towel over its dome.'],
          ['caption', 'Professor Quill sits on a stack of doughnut boxes, the colour of old porridge, holding a briefcase on his knees like a life raft.'],
          ['prof_quill', 'The sea, Mr Mercer, is a car that never stops cornering.'],
          ['jay', 'Evening ferry?'],
          ['prof_quill', 'Forty minutes. I have seen things. I have seen a man eat a prawn sandwich at a forty-degree angle.'],
          ['hob', '(handing him a mug) Tea. Sugar in. Castellane hasn\'t got this sugar, I hid it.'],
          ['prof_quill', "Bless you. (a sip; colour returns, a little) Now. The Halcyon archive."],
          ['prof_quill', "Rex Castellane's old business accounts, given to the university in a fit of generosity by an accountant who didn't read them."],
          ['prof_quill', "An invoice. From a private detective called Gorse, to Rex Castellane, 'for services: the Marlow file'. Dated the week after the race."],
          ['pip', 'So?'],
          ['prof_quill', "So, my dear girl, a detective doesn't send an invoice for a woman who drowned on the first night."],
          ['prof_quill', 'He sends one for a week of following her.'],
          ['caption', 'Nobody says anything for a moment. Pip looks at the gear stick on the workbench.'],
          ['pip', "So where's the file?"],
          ['prof_quill', "Rex's papers went to his son. His son keeps them in his study. His study is in that house."],
          ['caption', 'He points out of the hangar mouth, up the hill: Paloma Heights, and on top of it the Castellane estate, lit up like an ocean liner.'],
          ['prof_quill', "And tonight, according to the society pages, which I read for the footnotes, Mr Castellane is having his summer party."],
          ['caption', "Pip's phone, propped on the Grabber: Milo, on a video call, in pyjamas with rockets on them."],
          ['milo', 'Did you know the Castellane summer party has a string quartet and an ice swan? I want to come.'],
          ['prof_quill', 'No.'],
          ['pip', 'No.'],
          ['hob', 'No.'],
          ['milo', "I'm twelve, not breakable."],
          ['prof_quill', "You're both. Bed."],
          ['milo', "(not moving) I'm in bed. This is a bed. I'm just in it with the light on."],
          ['hob', "Right then. The plan. That estate's got no landing spot that isn't covered by blazers. Lawn, drive, tennis court, all watched."],
          ['hob', "But next door there's the observatory. Big round dome. Only flat-ish thing on that hill Leo doesn't own."],
          ['jay', 'Flat-ish.'],
          ['hob', "You'll have a parachute. It opens itself. The ish is your problem."],
          ['prof_quill', "I'm coming in the helicopter."],
          ['pip', "You've just been sick on a ferry."],
          ['prof_quill', "A ferry is a boat. A helicopter is an aircraft. I am perfectly well in aircraft. It is a documented phenomenon. I documented it."],
        ],
      },
      { join: ['hob', 'prof_quill'], weapon: 'fists' },
      { getIn: 'club_sparrow', objective: "Take the club helicopter up. Hob's beside you, the Professor's in the back" },
      {
        fly: 'paloma_observatory', height: 150, radius: 60,
        objective: 'Fly over Paloma Heights to the observatory',
        say: [
          ['hob', "Up, straight up, nice and smooth. Helicopter's a plane that's given up on the idea of wings."],
          ['caption', 'In the back, Professor Quill is eating a jam doughnut, perfectly comfortable, as the Sparrow tilts over the dark island.'],
          ['prof_quill', 'Planes don\'t corner, you see. Cars corner.'],
          ['hob', "It's a helicopter."],
          ['prof_quill', "It doesn't corner either. It leans. I'm fine with leaning."],
          ['jay', 'Nobody understands this.'],
          ['prof_quill', 'Nobody needs to, my dear fellow. Science is mostly people being fine with things.'],
          ['hob', "Bailing out, then. Door, out, count three, the chute does the rest. Don't count to four. Four's for show-offs."],
          ['jay', 'What happens at five?'],
          ['hob', 'Nobody knows. Nobody\'s ever got to five.'],
          ['caption', 'Below: the estate. Party lights strung through the trees, a turquoise pool, two hundred guests, and a string quartet you can hear over the rotor.'],
          ['prof_quill', "Vivaldi. Badly. (beat) That's a rich man's quartet. They never practise, nobody ever stops them."],
        ],
      },
      {
        say: [
          ['hob', '(taking the controls on his side) I have control. Go on, son.'],
          ['prof_quill', 'Mr Mercer. The green lamp. Good luck. Mind the... whatever it is people mind.'],
        ],
      },
      { leave: ['hob', 'prof_quill'], vanish: true },
      {
        goto: 'paloma_observatory', vehicle: false, radius: 20,
        objective: 'Jump. Land on the observatory dome',
      },
      {
        spawn: [
          { id: 'est_patrol', faction: 'guest_services', at: 'paloma_gardens', count: 2, weapon: 'pistol', behavior: 'patrol', hostile: true, group: 'estate_guards' },
          { id: 'est_lawn', faction: 'guest_services', at: 'estate_garden', count: 2, weapon: 'pistol', behavior: 'patrol', hostile: true, group: 'estate_guards' },
          { id: 'est_steps', faction: 'guest_services', at: 'estate_study', count: 2, weapon: 'pistol', behavior: 'guard', hostile: true, group: 'estate_guards' },
          { id: 'leo', char: 'leo', at: 'estate_garden', behavior: 'idle', hostile: false },
          { id: 'ottoline', char: 'ottoline', faction: 'guest_services', at: 'estate_garden', behavior: 'idle', hostile: false },
          { id: 'party_guests', faction: 'civilian', at: 'estate_garden', count: 8, behavior: 'idle', hostile: false },
        ],
      },
      {
        phone: 'prof_quill',
        say: [
          ['hob', "(on the radio, the rotor fading off over the hill) Bailing out isn't a landing. No mark."],
          ['prof_quill', '(whispering, although he is in a helicopter half a mile away) Mr Mercer. Can you hear me? I am whispering for operational reasons.'],
        ],
      },
      {
        goto: 'paloma_gardens', vehicle: false, radius: 15,
        objective: 'Down through the botanical gardens. Keep to the hedges',
        say: [
          ['prof_quill', '(phone, whispering) The study is on the east terrace. The window with the green lamp.'],
          ['prof_quill', "I know because I've written to him eleven times for an interview, and he sent me a photograph of it. Signed."],
          ['jay', 'Signed by who?'],
          ['prof_quill', 'By the lamp, as far as I can tell. It had more personality than the letter.'],
          ['prof_quill', "There are blazers on the paths. Keep low. Hedges are your friend. I wrote a footnote about hedges once. Twelve pages."],
        ],
      },
      {
        camera: 'estate_garden', seconds: 5,
        say: [
          ['caption', 'From the hedge: the lawn, the pool, the quartet, an ice swan slowly losing its head.'],
          ['caption', 'Leo Castellane on the terrace steps in a cream suit, a glass of lemonade in his hand, Ottoline at his shoulder with a stack of cards.'],
          ['leo', 'Fifty years ago this summer, my father won the Southbay 500.'],
          ['caption', 'Applause.'],
          ['leo', 'He used to say a good story never hurt anybody.'],
          ['caption', "More applause. Ottoline doesn't applaud. She looks at the hedge for a second too long, and then away."],
        ],
      },
      {
        goto: 'estate_study', vehicle: false, stop: true, radius: 3,
        objective: 'Get to the open study window (the green lamp)',
        say: [
          ['prof_quill', "(phone) Is the window open? Rich men always leave a window open. They think the air's on their side."],
          ['jay', '(under his breath) Quiet.'],
          ['prof_quill', 'Yes. Sorry. Quiet. (beat, quieter) Very quiet.'],
        ],
      },
      { collect: ['estate_study'], item: 'the Gorse file', objective: 'Find the Gorse file in the study' },
      {
        blackout: [
          ['caption', 'Leo Castellane\'s study. Green lamp, leather chairs, a photograph of a racing car with a man beside it holding a cup. On the desk, in a locked drawer that is not very locked:'],
          ['caption', 'A brown cardboard file, string-tied. On the front, typed: MARLOW, O. — GORSE.'],
          ['caption', 'Day 1. Subject seen climbing the water tower at Cinder Creek after dark. Purpose unknown.'],
          ['caption', 'Day 3. Subject seen at the Halcyon clock tower, after dark, with a ladder. Purpose unknown.'],
          ['caption', "Day 5. Subject seen at her aunt's house, Vista Verde, in the shed. Mowing? Purpose unknown."],
          ['caption', 'Day 7. Subject seen on the night ferry to Isla Paloma with a large covered load. Load taken off at the old fort quay. Subject not seen again.'],
          ['caption', 'Conclusion: subject believed drowned. File closed.'],
          ['caption', 'The last page is in different handwriting. Old blue-black ink, a heavy hand.'],
          ['caption', '"The boys on Seawall Drive did what I paid them for. The girl was not hurt. The stewards did what Father paid them for.'],
          ['caption', 'The cup in the trophy room is a copy. Nobody gets hurt by a good story. R.C."'],
          ['caption', 'And under it, in blue ballpoint, newer, the letters pressed so hard they have gone through the paper:'],
          ['caption', '"Dad, why?"'],
          ['jay', '(very quietly) He knew.'],
        ],
      },
      {
        phone: 'prof_quill',
        say: [
          ['prof_quill', "(phone) Mr Mercer? You've gone quiet. Not the operational kind."],
          ['jay', "I've got it. Read it later. Not on a phone."],
          ['prof_quill', '(a pause) Ah. (beat) Then come home.'],
        ],
      },
      { spawn: [{ id: 'dash', char: 'dash', faction: 'lockwood_tv', at: 'estate_garden', behavior: 'idle', hostile: false }] },
      { goto: 'estate_garden', vehicle: false, radius: 12, objective: 'Back across the lawn to the gate' },
      {
        scene: { at: 'estate_garden', cast: ['dash'] },
        say: [
          ['caption', 'Behind the pool house, in the dark between two potted palms: Dash Lockwood, handcuffed by one wrist to his own camera crane, his hat askew, a printed card tucked in its band.'],
          ['dash', 'Oh thank God, a person. Not a Guest Services person. A normal criminal person.'],
          ['jay', 'What happened?'],
          ['dash', "Ottoline. I lost her parts. On the plane. Which you know, because you were there, and you took them, which, fine, fair play, good landing."],
          ['dash', "She let me run about for a day. Then tonight she said 'You'll stay here and reflect on your performance, Mr Lockwood.'"],
          ['dash', 'Then she gave me a card.'],
          ['caption', 'Jay takes the card out of the hatband and reads it.'],
          ['jay', "(reading) 'How would you rate your experience of being restrained today? One to five.'"],
          ['dash', "I'd give it a two. The crane's comfortable. The company's terrible."],
          ['caption', 'Jay puts the card in his pocket. Number eight for the glovebox.'],
          ['jay', "Where's Kit?"],
          ['dash', 'Kit has gone for bolt cutters. (beat) Forty minutes ago.'],
          ['caption', 'Jay looks at him for a moment. Then he opens the file at the last page and holds it where the pool light falls on it.'],
          ['caption', 'Dash reads it. For once there is no camera on him, and his face does nothing for an audience.'],
          ['dash', "That's... horrible. That's just horrible."],
          ['dash', '(beat) Crap.'],
          ['dash', "I was going to say the drowned driver was a legend, laid to rest. That was the episode. Mr Castellane wrote the last line himself."],
          ['dash', '(very quietly) Eight series. Eleven legends. Not one of them real.'],
          ['dash', 'Do you know what that does to a man\'s hat?'],
          ['caption', 'A torch beam swings across the lawn towards the pool house. Voices. A guard laughs at something, and stops laughing.'],
        ],
      },
      {
        choice: {
          prompt: 'Dash is cuffed to his own crane. Guards are coming.',
          options: [
            {
              label: "Uncuff him. He's coming with us.",
              flag: 'dlc_dash_in',
              then: [
                {
                  scene: { at: 'estate_garden', cast: ['dash'] },
                  say: [
                    ['jay', 'Lockpick.'],
                    ['dash', "Seventh pocket. Left side. No, the other left. It's for the show. I've never got it to work."],
                    ['caption', 'Jay gets it to work first time. The cuff falls open. Dash stares at it.'],
                    ['dash', 'Eight series I\'ve been carrying that.'],
                    ['dash', "I'll be useful. I'm very useful. Ask anyone. Don't ask Kit."],
                    ['jay', 'Stay behind me. Keep your hat on.'],
                    ['dash', 'Always.'],
                  ],
                },
                { join: ['dash'], weapon: 'fists' },
                { protect: 'dash' },
              ],
            },
            {
              label: "Leave him. He'll be fine. Probably.",
              flag: 'dlc_dash_left',
              then: [
                {
                  scene: { at: 'estate_garden', cast: ['dash'] },
                  say: [
                    ['jay', "You'll be fine. Probably."],
                    ['dash', 'Probably? PROBABLY?'],
                    ['caption', 'Jay is already walking. Behind him, getting louder:'],
                    ['dash', 'HE WENT THAT WAY!'],
                    ['dash', "I mean, he didn't! I'm on your side! (beat) Whose side am I on?!"],
                  ],
                },
              ],
            },
          ],
        },
      },
      // Leo and Ottoline are wanted in Act 4: they're inside before any shooting starts.
      { leave: ['leo', 'ottoline'], vanish: true },
      { music: 'action', checkpoint: true },
      {
        spawn: [{ id: 'est_rush', faction: 'guest_services', at: 'estate_garden', count: 3, weapon: 'pistol', behavior: 'attack', hostile: true, group: 'estate_rush' }],
        say: [['gs_staff', '(across the lawn, smiling at the top of his voice) Good evening, sir! Please remain where you are! Assistance is on its way!']],
      },
      { spawnCar: 'party_car', type: 'sovereign', at: 'estate_gate', color: PEARL, name: "a party guest's Sovereign" },
      {
        goto: 'estate_gate', vehicle: false, radius: 8,
        objective: 'Over the wall to the valet line',
        say: [
          ['caption', 'Behind them the quartet stops mid-bar. Somebody screams politely. The ice swan finally loses its head.'],
        ],
      },
      {
        getIn: 'party_car', objective: "Borrow a guest's car",
        say: [['jay', "(to the pearl-white Sovereign, the valet ticket still swinging from the mirror) Sorry. You'll be back before dessert."]],
      },
      gsCar('gs_car1', 'estate_gate'),
      gsCar('gs_car2', 'estate_gate'),
      { spawn: [gunDriver('gs_driver1', 'gs_car1', 'gs_car1', 'party_car'), gunDriver('gs_driver2', 'gs_car2', 'gs_car2', 'party_car')] },
      {
        if: 'dlc_dash_in',
        then: [
          {
            goto: 'hob_hangar', vehicle: true, stop: true, radius: 12,
            objective: 'Down the hill and back to the airfield',
            say: [
              ['caption', 'In the back seat, Dash has his phone out, the screen turned round to his own face, the TV voice switched on like a lamp.'],
              ['dash', "Viewers... I'm being rescued."],
              ['dash', "He's taking the hairpin! He's taking it! He's... we're sideways, viewers, we're sideways and I've lost a pocket."],
              ['jay', 'Stop filming.'],
              ['dash', "I can't. It's a condition."],
              ['dash', '(to the phone) Our driver tonight is a man of few words. Mainly "stop" and "filming".'],
              ['jay', '(to the car, as a teal Sovereign fills the mirror) Come on. You\'ve been to a party. Show me what you learned.'],
              ['dash', "(off camera, for a second, just to Jay) Thank you. For the cuff. (beat; back on) VIEWERS, A WALL!"],
              ['pip', "(phone) Quill just told me. Rex wrote it down? He WROTE IT DOWN?"],
              ['jay', 'And his son read it.'],
              ['pip', '(a silence, then very quiet) Come home, Jay. Bring it home.'],
              ['dash', '(to the phone) Viewers, I think that was a moment. I think we just had a moment.'],
            ],
          },
        ],
        else: [
          gsCar('gs_car3', 'paloma_gardens'),
          { spawn: [gunDriver('gs_driver3', 'gs_car3', 'gs_car3', 'party_car')] },
          {
            goto: 'hob_hangar', vehicle: true, stop: true, radius: 12,
            objective: 'Down the hill and back to the airfield',
            say: [
              ['caption', 'A third teal Sovereign comes out of the gardens behind them, lights blazing. Somebody up there has been told which way the man went, very loudly.'],
              ['pip', "(phone) Quill just told me. Rex wrote it down? He WROTE IT DOWN?"],
              ['jay', 'And his son read it.'],
              ['pip', '(a silence, then very quiet) Ten years. He\'s known for ten years and he put it on forty hotels anyway.'],
              ['pip', "What about Lockwood? Quill says you saw Lockwood."],
              ['jay', "He's fine. He's loud."],
              ['caption', 'Behind them, very faint, from the top of the hill, a voice that carries the way only a TV voice can: "HE TOOK A CAR! A WHITE ONE! I THINK! I\'M NOT GOOD WITH CARS!"'],
              ['jay', '(to the car, as the third Sovereign leans on its horn) Damn. Thanks, Dash.'],
              ['pip', 'Come home, Jay. Bring it home.'],
            ],
          },
        ],
      },
      { leave: ['gs_driver1', 'gs_driver2', 'gs_driver3'], vanish: true },
      { music: 'sad' },
      {
        scene: { at: 'hob_hangar', cast: ['pip', 'prof_quill', 'hob'] },
        say: [
          ['caption', 'The airfield gate. NO CROISSANTS. The teal cars stop at the sign, and sit, and go.'],
          ['caption', 'Inside, under the hangar strip-light, Quill reads the last page. He takes his glasses off.'],
          ['prof_quill', 'Rex wrote it down. Leo read it. Neither of them ever said it out loud.'],
          ['prof_quill', '(beat) That is the part history never forgives.'],
          ['caption', 'Pip reads over his shoulder, holding very still.'],
          ['pip', "'The girl was not hurt.'"],
          ['pip', "(beat) She wasn't hurt."],
          ['caption', 'Pip runs a finger down the page to the Day 7 line and taps it.'],
          ['pip', "Old fort quay. What's at the fort?"],
          ['hob', 'Nothing. A lighthouse and a woman who buys jam doughnuts.'],
          ['caption', 'Nobody says anything else. The kettle clicks off.'],
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [
          {
            scene: { at: 'hob_hangar', cast: ['hob', 'dash'] },
            say: [
              ['caption', 'Dash Lockwood is asleep on the doughnut boxes, hat over his face, his phone still recording on his chest.'],
              ['hob', "He can stay. He's eaten nine."],
              ['prof_quill', 'Nine?'],
              ['hob', "I'm counting the custard as two. They're bigger."],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'hob_hangar', cast: ['hob', 'prof_quill'] },
            say: [
              ['prof_quill', 'And Mr Lockwood?'],
              ['jay', 'Still on the hill, I expect. Talking.'],
              ['hob', "(putting a jam doughnut aside on a saucer, just in case) Man's got to eat. Even a loud one."],
            ],
          },
        ],
      },
    ],
  });

  // ---- END OF JOBS ----

  // =====================================================================
  // Ambient texts (bible, Appendix B)
  // =====================================================================
  D.texts.push(
    { after: 'd17_contraband', from: 'pip', message: "Hob's given me a job. I'm sorting jam from custard. I'm a Speedway champion." },
    { after: 'd19_golden_grabber', from: 'milo', message: "Update: Lockwood's Lost Legends now holds one (1) teddy bear. I'm counting it. Fairness matters." },
  );
})();
