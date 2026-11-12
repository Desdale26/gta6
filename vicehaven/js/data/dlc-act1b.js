/*
 * data/dlc-act1b.js — "Chasing the Firecrest", ACT 1: LOT 17, second half
 * (d05 to d08).
 *
 * A clock tower at midnight and a TV presenter with a two-metre minute hand;
 * a purple van full of somebody else's blog; an old man with a flare gun on
 * a breakwater, and a hotel king with a cheque book; and at half past ten,
 * after the two lighthouses have said goodnight, a confession in a pickup
 * with no headlights.
 *
 * Loaded after dlc-act1a.js. See docs/DLC_BIBLE.md (sections 1, 4, 7, 11),
 * docs/dlc/beats-act1.md and docs/mission-format.md. Sets dlc_blog_on /
 * dlc_blog_off (d08). Riddle R4 is quoted word for word from the bible's
 * table: shown at the end of d05, solved by Pip in d08 (planted by line in
 * d01: the mower). Tallies: Milo's first "Jay" (d05); Pip's first "Jay"
 * (end of d08); the Halcyon clock stops at 11:14 (d05) and loses its minute
 * hand to Dash; scoreboard three parts (d05) plus the minute hand (d06);
 * subscribers back to 41 (d06, Gran); comment card 4 (d07).
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const DRIFTER_WHITE = 0xf1f0ea;
  const GS_TEAL = 0x13b5b1;
  const TV_PURPLE = 0x3b1558;
  const PICKUP_GREEN = 0x1f3a26;

  // ------------------------------------------------------------ helpers
  /** Pip's white race-shop hack, a Drifter with tiny sponsor stickers. Jay drives it; she's banned. */
  const pipCar = (at) => ({ spawnCar: 'pip_car', type: 'drifter', at, color: DRIFTER_WHITE, name: "Pip's Drifter" });
  /** Toby's old green Mesa pickup: bench seat, no headlights. */
  const tobyPickup = (at) => ({ spawnCar: 'toby_pickup', type: 'mesa', at, color: PICKUP_GREEN, name: "Toby's pickup" });
  /** A teal Guest Services Sovereign. */
  const gsCar = (id, at) => ({ spawnCar: id, type: 'sovereign', at, color: GS_TEAL });
  /** Somebody behind the wheel of a spawned car, driving to a place (or after a car Jay isn't in yet: then they shadow it). */
  const driver = (id, car, at, to, faction) => ({ id, faction: faction || 'guest_services', hostile: false, at, behavior: 'drive', car, to });
  /** A riddle on a black screen, under one line saying where it was found. */
  const rhyme = (found, lines) => ({ blackout: [['caption', found]].concat(lines.map((l) => ['caption', l])) });

  // ------------------------------------------------------------ riddles
  // Dess's rhyme, word for word (docs/DLC_BIBLE.md, "The riddle chain").
  const R4 = ['My heart is home where my baby sleeps,', 'out in the shed where the spider creeps.', 'I roar on Sundays, up and down,', 'the fastest thing in all the town.', 'And mind the road.'];

  // =====================================================================
  // d05 — Clockwork
  // =====================================================================
  D.missions.push({
    id: 'd05_clockwork',
    act: 1,
    title: 'Clockwork',
    giver: 'milo',
    start: 'quill_house',
    time: 23,
    estMinutes: 10,
    summary: "Behind the Halcyon clock's face, something has been keeping time for fifty years.",
    reward: { money: 1500 },
    failIf: ['heat:1'],
    steps: [
      { music: 'off' },
      { camera: 'halcyon_clocktower', seconds: 4, say: [['caption', 'Halcyon University. Eleven at night, give or take eleven seconds.']] },
      { camera: 'quill_house', seconds: 3, say: [['caption', "The Quills' faculty house. One upstairs window. Under the covers, a torch is on."]] },
      pipCar('quill_house'),
      {
        scene: { at: 'quill_house', cast: ['pip'] },
        say: [
          ['pip', '(sitting on the Drifter\'s bonnet under the window, the gold bird in her lap) He texted at sixteen minutes past three. "GOT IT." In capitals.'],
          ['jay', 'And?'],
          ['pip', "And then nothing. For eight hours. He says he's not allowed to tell anyone anything until his grandad's asleep."],
          ['jay', 'Is his grandad asleep?'],
          ['pip', '(pointing up at the dark window beside the torchlit one) Snoring. You can hear it from the bins. Like a boat.'],
          ['pip', "(her phone lighting up) That's him. He wants you. Not me. You. (holding it out) I'm the one who BOUGHT the box, Driver."],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', '(whispering, under a duvet) Did you know a clock face has the twelve at the top and the six at the bottom? That\'s the riddle. Probably.'],
          ['milo', "'Twelve on top and six below.' A clock face. 'The scholars' place.' Halcyon. 'I kept her laps.' A rally clock. Racing cars had them, on the dashboard."],
          ['milo', "It's in the clock tower, Mr Mercer. Behind the face. That's why the Halcyon clock is eleven seconds slow! It's a fifty-year-old clock doing a university's job!"],
          ['milo', "Grandad says it's the sundial in the botanical garden. 'Six below' is the shadow at six o'clock. He wrote it on a napkin. It isn't."],
          ['jay', 'Jay.'],
          ['milo', 'Sorry?'],
          ['jay', 'Jay. Just Jay.'],
          ['milo', '(a pause; enormously pleased; trying very hard not to sound it) Jay.'],
          ['milo', "(back to business, fast) Jay. Jay, there's a security guard called Officer Plum. He has a bicycle. He takes it very seriously."],
          ['milo', "If he sees you, he rings the police. He rang them about me once. I was reading on a bench after nine. I'm on a list."],
          ['jay', 'What kind of list?'],
          ['milo', "A laminated one. In his hut. Goodnight. I mean, I'm not going to sleep. I'm going to listen. Leave your phone on."],
        ],
      },
      { join: ['pip'], weapon: 'fists' },
      { getIn: 'pip_car', objective: 'Get in the Drifter' },
      {
        goto: 'campus_strip', vehicle: true, stop: true, radius: 12,
        objective: 'Park on the campus strip, below the clock tower',
        say: [
          ['pip', "(winding the starter key's keyring round one finger) A rally clock. Gran had a rally clock. On the dash."],
          ['jay', 'Lots of cars did.'],
          ['pip', 'Not with a poem on it.'],
          ['pip', '(looking up through the windscreen at the lit clock face over the rooftops) How high is that?'],
          ['jay', 'High enough.'],
          ['pip', "There's a scaffold. Look. Down the side. The clock men left it up."],
          ['jay', "I see it."],
          ['pip', "I could climb it. I've climbed the Speedway floodlights. Twice. Once on purpose."],
          ['jay', 'You can keep the car warm.'],
          ['pip', "Driver, I'm a junior champion. I don't keep things WARM."],
          ['jay', "You do tonight. You're banned. Banned people sit in the passenger seat and think about what they did."],
          ['pip', '(sulking at the glovebox) Ninety-two in a forty. At three in the morning. Nobody was even there.'],
          ['jay', 'You were there.'],
        ],
      },
      {
        scene: { at: 'campus_strip', cast: ['pip'] },
        say: [
          ['pip', "(leaning out of the open passenger door, whispering as loud as she can) I'll keep the engine warm. Not drive it. Warm."],
          ['jay', "You'll stay in the passenger seat."],
          ['pip', "I'll stay near the passenger seat."],
          ['jay', '(He looks at her.)'],
          ['pip', "In it. In it. God. (beat) Bring me back a clock."],
        ],
      },
      { leave: ['pip'], vanish: true },
      { music: 'tension' },
      { spawn: [{ id: 'plum', char: 'plum', at: 'halcyon_quad', faction: 'vpd', weapon: 'fists', behavior: 'patrol', hostile: false }] },
      { camera: 'plum', seconds: 3, say: [['caption', 'A bicycle lamp, wobbling slowly round the fountain.']] },
      {
        goto: 'halcyon_quad', vehicle: false, radius: 14,
        objective: 'Cross the quad. Stay out of the torchlight',
        say: [
          ['plum', '(cycling past, into his radio, to nobody) Nine past eleven. Quad secure. Lawn secure. Bin secure.'],
          ['milo', '(on the phone, whispering) He does the fountain, then the library, then the fountain.'],
          ['milo', 'He really likes the fountain.'],
          ['plum', '(stopping to shine his torch into a hedge) I see you, hedgehog. I see you. One more night, my friend. One more night.'],
          ['milo', "That's Gerald. The hedgehog. Officer Plum has written him up four times."],
        ],
      },
      {
        goto: 'clocktower_scaffold', vehicle: false, radius: 4,
        objective: "Reach the repairers' scaffold at the foot of the clock tower",
        say: [
          ['plum', '(far off, at the fountain) Fountain secure. (beat) Beautiful fountain.'],
          ['milo', '(on the phone) There should be a sign that says NO ENTRY. That means you\'re in the right place.'],
          ['jay', '(under his breath, at the sign) Evening.'],
        ],
      },
      {
        goto: 'clocktower_ledge', vehicle: false, radius: 3,
        objective: 'Climb the scaffold to the clock face',
        say: [
          ['milo', "(on the phone, as the boards creak) Don't look down. Statistically, people who look down—"],
          ['milo', "I'll stop."],
          ['jay', 'Thank you.'],
          ['milo', "(after a while, very quietly) Are you looking down?"],
          ['jay', 'No.'],
          ['milo', "Me neither. I'm in bed. But I'm not looking down in solidarity."],
          ['plum', '(far below, cycling, singing to himself) Oh the quad is quiet and the lawn is green...'],
        ],
      },
      {
        collect: ['clocktower_ledge'], item: 'rally clock',
        objective: "Find what's behind the clock face",
        say: [
          ['caption', 'Behind the great glass face, the tower\'s works: iron wheels, a long brass rod, dust like grey velvet.'],
          ['caption', 'And bolted into the middle of it all, where no clock man would ever look twice, a little racing dial. Chrome bezel. Orange needle. Ticking.'],
          ['jay', '(quietly) Keeping her laps.'],
        ],
      },
      {
        say: [
          ['caption', 'He eases it out of the mechanism. Somewhere over his head, two enormous hands shudder, and stop.'],
          ['jay', '(looking up at the hands) ...Damn.'],
          ['milo', '(on the phone, a long breath) Eleven fourteen. It says eleven fourteen. I can see it from my window.'],
          ['milo', "You stopped the university, Jay. (beat) It's the best thing that's ever happened to me."],
        ],
      },
      { spawn: [{ id: 'dash', char: 'dash', at: 'halcyon_quad', behavior: 'idle' }, { id: 'kit', char: 'kit', at: 'halcyon_quad', behavior: 'idle' }] },
      {
        camera: 'halcyon_clocktower', seconds: 5,
        say: [
          ['caption', 'Below, with a clunk, two floodlights blaze into life and light the clock face like a stage.'],
          ['dash', "(booming, to camera) Viewers, VICEHAVEN! Midnight! The clock that stopped! Kit, get my good side. The face side."],
          ['kit', "(deadpan, behind the camera) We're rolling. We're always rolling."],
        ],
      },
      {
        camera: 'dash', seconds: 7,
        say: [
          ['caption', 'Dash Lockwood is at the top of a stepladder at the bottom of the clock face, unscrewing something enormous with great ceremony.'],
          ['dash', "(holding up a two-metre minute hand, wobbling) The Firecrest's... hand... brake. Legend... FOUND!"],
          ['plum', '(pedalling across the lawn as fast as a bicycle can be pedalled) That is UNIVERSITY PROPERTY!'],
        ],
      },
      {
        say: [
          ['dash', '(off camera, instantly) Crap. Crap, crap, crap. Kit. KIT. Run.'],
          ['plum', 'Stop in the name of the Faculty!'],
          ['kit', "(walking after them, still filming) He's going round the fountain. Everyone goes round the fountain."],
          ['milo', "(on the phone, delighted) He's chasing him round the fountain! He LOVES the fountain!"],
        ],
      },
      { leave: ['plum'], vanish: true },
      { leave: ['dash', 'kit'], vanish: true },
      { music: 'off' },
      {
        goto: 'campus_strip', vehicle: false, radius: 10,
        objective: 'Climb down and get back to the car while Plum is busy',
        say: [
          ['milo', '(on the phone) Did you get it? Is it heavy? Is it orange? I bet the needle\'s orange.'],
          ['jay', "It's orange."],
          ['milo', '(muffled; a fist pumped under a duvet) Yes.'],
        ],
      },
      { join: ['pip'], weapon: 'fists' },
      {
        scene: { at: 'campus_strip', cast: ['pip'] },
        say: [
          ['caption', 'The Drifter is exactly where he left it. The engine is running. Pip Marlow is in the driver\'s seat with both hands on the wheel.'],
          ['jay', '(He looks at her.)'],
          ['pip', 'Warm. I said warm.'],
          ['jay', '(He keeps looking at her.)'],
          ['pip', "(sliding over into the passenger seat, very slowly, with dignity) It's a very cold night."],
          ['jay', "It's twenty-six degrees."],
          ['pip', 'For a car.'],
          ['caption', 'Under the courtesy light, the rally clock in Jay\'s hands. Pip turns it over. On the back plate, engraved in a careful hand:'],
          ['caption', 'FOR O.M. FROM T. BRASK'],
          ['pip', '(reading it twice) O.M. Odessa Marlow. And T. Brask... (beat) There\'s more. Under it. Smaller.'],
        ],
      },
      rhyme('Engraved on the back plate, under the dedication:', R4),
      { getIn: 'pip_car', objective: 'Get in the Drifter' },
      {
        phone: 'milo', objective: 'Drive Pip back to lot 17',
        say: [
          ['milo', "(sleepy, very proud) Did you know you're the first person to stop the Halcyon clock since a seagull, forty years ago? The seagull's in the museum. Stuffed."],
          ['milo', 'Score update: Team Firecrest three, Lockwood\'s Lost Legends nil, plus one rusty tap and a cowboy\'s spur.'],
          ['jay', 'Dash took the minute hand.'],
          ['milo', "Did he? I couldn't see properly. I was under a duvet. I'm not counting it till it's confirmed. Fairness matters."],
          ['milo', "The new one. 'My heart is home where my baby sleeps.' A shed. A baby. Sundays. (a yawn) I don't know. I need more facts."],
          ['pip', '(She says nothing. She is looking out of the window.)'],
          ['prof_quill', "(off, a door opening) Milo Quill. Is that a telephone under there?"],
          ['milo', "No. (beat) Goodnight, Jay."],
          ['caption', '(Click.)'],
        ],
      },
      {
        goto: 'lot_17', vehicle: 'pip_car', stop: true, radius: 10,
        objective: 'Drive Pip back to lot 17',
        say: [
          ['jay', 'He said Jay.'],
          ['pip', '(not turning from the window) Mm.'],
          ['jay', "He's been saying Mr Mercer for a week."],
          ['pip', 'Mm.'],
          ['jay', '(a glance at her) You all right?'],
          ['pip', "Fine. Tired. I've been keeping a car warm for an hour. It's exhausting."],
          ['pip', "(quietly, the clock in her lap, reading the back plate to herself) 'Out in the shed where the spider creeps.'"],
          ['pip', '(and then she stops, and doesn\'t read the rest, and puts the clock face-down on her knee)'],
          ['jay', 'Pip.'],
          ['pip', "It's nothing. It's late. Drive, Driver."],
          ['jay', '(He drives. He drives a bit slower than usual, and doesn\'t say why either.)'],
        ],
      },
    ],
  });

  // =====================================================================
  // d06 — Breaking News
  // =====================================================================
  D.missions.push({
    id: 'd06_breaking_news',
    act: 1,
    title: 'Breaking News',
    giver: 'pip',
    start: 'lot_17',
    time: 8.5,
    estMinutes: 9,
    summary: 'Dash Lockwood always knows where to go next. Jay runs down his van to find out why.',
    reward: { money: 1500 },
    failIf: ['wrecked:pip_car', 'dead:pip'],
    steps: [
      { music: 'off' },
      pipCar('lot_17'),
      {
        blackout: [
          ['caption', 'Lot 17. A little portable TV on the folding table, its aerial a bent coat hanger.'],
          ['caption', 'BAY BREAKFAST. 8:15 a.m.'],
          ['dash', "(on a yellow sofa, a two-metre minute hand across his knees like a canoe paddle) The Firecrest's hand brake, viewers. Found at midnight."],
          ['dash', 'Under fire. From campus security. On a bicycle. Which is somehow worse.'],
          ['dash', "And I can tell you exclusively, Sue: we know where the next piece is."],
          ['caption', 'The presenter asks how. Dash taps the side of his nose.'],
          ['caption', 'Turning to the camera, he turns the minute hand too. It hits the presenter.'],
          ['dash', "(as the picture tilts and somebody off screen shouts for ice) And THAT is live television. Back after this."],
        ],
      },
      {
        scene: { at: 'lot_17', cast: ['pip'] },
        say: [
          ['pip', '(switching the TV off by its plug, hard) HOW? How does he KNOW?'],
          ['pip', "He was at the tower. He was at the set. He was up the water tower before us! Every time! It's like he's got the map!"],
          ['jay', "Somebody's telling him."],
          ['pip', "Who? There's four of us! One's twelve. One's carsick. One's me. (pointing at him) And you don't talk to anybody."],
          ['jay', 'Then let\'s ask him.'],
          ['pip', "(already on her phone) The TV van's got a parking permit on the windscreen. I saw it at the water tower. The Halcyon app shows you every permit on campus."],
          ['pip', "(holding it up) There. The quad. Purple dot. He's doing a 'return to the scene' piece. In the scene. Of the crime. That he did."],
          ['jay', 'Car.'],
          ['pip', "(going) You're not to box him in gently. You hear me? I want it to be a lesson."],
        ],
      },
      { join: ['pip'], weapon: 'fists' },
      { getIn: 'pip_car', objective: 'Get in the Drifter' },
      {
        goto: 'halcyon_quad', vehicle: true, radius: 40,
        objective: "Find Dash's van at Halcyon",
        say: [
          ['pip', '(after a mile of silence, to the dashboard) I wrote to him once.'],
          ['jay', 'Dash?'],
          ['pip', "Two years ago. To the show. 'Dear Lockwood's Lost Legends.' Three pages. Gran, the race, the bay, all of it."],
          ['pip', 'I put in the only photo Mum\'s got. A copy. I wasn\'t daft enough to send the real one.'],
          ['jay', 'What did he say?'],
          ['pip', "Nothing. He never wrote back. Not even a signed photo."],
          ['pip', "I didn't want a signed photo. (beat) I'd have binned it. Slowly. In front of people."],
          ['jay', 'Maybe it never got to him.'],
          ['pip', "That's worse. Then it's in a sack somewhere. With a sea serpent and somebody's haunted toaster."],
          ['pip', '(rating him) That corner was a six. You can do better than a six, Driver.'],
          ['jay', "I wasn't trying."],
          ['pip', 'Well, try. We\'re going to need a nine in a minute.'],
        ],
      },
      { camera: 'halcyon_clocktower', seconds: 3, say: [['caption', 'The Halcyon clock: 11:14, with no minute hand at all. Somebody has taped a sheet of paper over the gap. BACK SOON.']] },
      { spawnCar: 'dash_van', type: 'porter', at: 'halcyon_quad', color: TV_PURPLE, name: "Dash's van" },
      { spawn: [{ id: 'kit', char: 'kit', faction: 'lockwood_tv', hostile: false, at: 'halcyon_quad', behavior: 'drive', car: 'dash_van', to: 'marina_condos' }] },
      {
        camera: 'kit', seconds: 5, // on the van itself (Kit is at the wheel)
        say: [
          ['caption', 'A purple van with a satellite dish, two wheels on the lawn. LOCKWOOD\'S LOST LEGENDS down the side in gold.'],
          ['dash', '(through the passenger window, half a croissant in his mouth) Is that... is that the stunt man? Kit. Kit, drive. Drive drive drive.'],
          ['kit', "(already turning the key) We're rolling."],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        chase: 'dash_van', mode: 'catch', route: ['campus_strip', 'marina_condos'],
        objective: "Catch Dash's van and box it in",
        say: [
          ['pip', 'GO! He\'s going! Why is he going? He\'s on TV, he can\'t just GO!'],
          ['dash', '(on the van\'s roof camera feed, to the lens, bouncing) Viewers, we\'re being pursued. By a man in a white hatchback. With stickers.'],
          ['dash', 'Kit, read the stickers.'],
          ['kit', 'Wart clinic.'],
          ['dash', "We're being pursued by a wart clinic."],
          ['pip', '(out of the window, at the top of her voice) PRAWN SHACK AS WELL!'],
          ['milo', "(on the phone, Pip's speaker, crunching cereal) Did you know vans like that have a turning circle of eleven metres? Make him turn."],
          ['jay', 'Working on it.'],
          ['milo', "Pip says it's a chase. Grandad says I'm not allowed to listen to chases at breakfast. I'm listening to it at breakfast."],
          ['pip', "(rating it, gripping the door) That's an eight. That's an eight. Do it again."],
          ['dash', '(to camera) If anything happens to me, viewers, I want series nine to be about my hat.'],
        ],
      },
      { music: 'off' },
      {
        say: [
          ['dash', '(through the window, both hands up, the croissant in one of them) All right! All right! Not here!'],
          ['dash', "There's a bus lane. I don't do interviews in a bus lane. Kit's got a thing about bus lanes."],
          ['kit', "I don't have a thing about bus lanes."],
          ['dash', 'The marina. Five minutes. The light\'s better. Follow us. (beat) Please.'],
        ],
      },
      {
        follow: 'dash_van', to: 'marina_condos', min: 0, max: 160,
        objective: 'Follow Dash to the marina front',
        say: [
          ['pip', "'The light's better.' We're not doing a SHOOT, Dash."],
          ['jay', "He's going to the marina. We're going to the marina."],
          ['pip', "He's indicating. Look at him. He's indicating like he's in a driving test."],
          ['jay', "He's nervous."],
          ['pip', 'Good.'],
          ['pip', '(after a moment) I want to hate him more than I do. He waved at a dog just then.'],
        ],
      },
      { leave: ['kit'], vanish: true },
      {
        scene: { at: 'marina_condos', cast: ['dash', 'kit', 'pip'] },
        say: [
          ['caption', 'The marina front. Gulls, white yachts, condos the colour of ice cream. The van\'s side door slides open.'],
          ['caption', 'On the dashboard, a fat ring binder: printed pages of THE FIRECREST FILES. Every riddle. Every photo. The scoreboard. A twelve-year-old\'s drawing of the car.'],
          ['jay', '(holding up one page: the water tower, a red circle round the top, "TIN MAN!!!" in Milo\'s writing)'],
          ['dash', "(cheerful, unashamed, taking off his hat to fan himself) It's a public blog, mate."],
          ['dash', "If you didn't want me reading it you should've made it boring. It's very good, by the way."],
          ['kit', "(not looking up from her camera) I read it. He doesn't read anything."],
          ['dash', "I read the scoreboard. (genuinely wounded) It's very hurtful. 'Plus one rusty tap.' The tap had a lot of history, Kit."],
          ['kit', 'It was from a garden centre.'],
          ['pip', '(turning a page; quietly, dangerously) He drew the car. He\'s twelve. He drew her, and you photocopied it.'],
          ['dash', "Colour copies. I'm not an animal."],
        ],
      },
      {
        scene: { at: 'marina_condos', cast: ['dash', 'kit', 'pip'] },
        say: [
          ['jay', "Who's paying for the special?"],
          ['dash', '(a little too fast) The network.'],
          ['jay', '(He waits.)'],
          ['dash', "(caving at once) Look, Castellane's paying for this special, all right? 'Lay the drowned-driver legend to rest.' His words. Lovely man. Great teeth."],
          ['dash', "I just turn up and find things."],
          ['jay', 'You find taps.'],
          ['dash', "I find LEGENDS. (beat) Sometimes the legends are taps. That's not on me, that's on history."],
          ['pip', '(not looking at him) I wrote to you. Two years ago. About my gran.'],
          ['dash', "(honestly blank, trying) Did you? We get a lot of letters. Mostly about a sea serpent."],
          ['kit', 'Four hundred about the sea serpent.'],
          ['dash', "It's not even a good serpent. It's a log."],
          ['pip', '(turning away to look at the yachts, jaw set) Course you don\'t remember.'],
          ['dash', "(a flicker of something; then lost again) Sorry. I'm sure it was a very good letter. Was there a photo? We keep the ones with photos."],
          ['jay', 'Phone, Pip.'],
          ['pip', "(dialling, not turning round) Ringing the kid. He'll want to know he's famous."],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', "Did you know that ninety per cent of— why is everyone quiet? Pip's never quiet."],
          ['jay', "Dash reads your blog, Milo. That's how he knows. All of it. Printed out."],
          ['milo', '(a long, horrified silence) ...Four people read it.'],
          ['milo', 'FOUR. One of them is Gran.'],
          ['jay', 'Sixty.'],
          ['milo', 'Sixty people read it and one of them is a TELEVISION.'],
          ['milo', "(beat; a click of a mouse) Fifty-nine. Gran's pressed something."],
          ['milo', "(beat) Forty-one. Gran's pressed a lot of things. Gran, stop. GRAN. Don't touch the mouse, it's not a— she's gone."],
          ['milo', "(very small) I put the photos up the day you found them. Every time. I didn't think anybody important..."],
          ['jay', "Nobody's angry, Milo."],
          ['milo', 'Pip sounds angry.'],
          ['pip', "(leaning in to the phone) I'm angry at HIM."],
          ['milo', '...OK.'],
          ['milo', "(and then, because fairness matters) Plus one minute hand. I'm counting it. It's confirmed now. It was on breakfast television."],
          ['dash', '(leaning in too, delighted) Hello, Milo! Big fan!'],
          ['milo', '(click)'],
        ],
      },
      {
        leave: ['dash', 'kit'],
        say: [
          ['dash', '(walking backwards to the van, hat back on, all teeth) No hard feelings! Great boxing-in! Nine out of ten!'],
          ['kit', "(flat, climbing in) He'll text you. I've told him not to."],
          ['dash', 'And tell the kid the drawing\'s lovely! We might use it in the credits!'],
        ],
      },
      { wait: 2 },
      { music: 'hope' },
      {
        scene: { at: 'marina_condos', cast: ['pip'] },
        say: [
          ['caption', 'Pip on the low wall by the water, the rally clock in her lap. She turns it over, and over again.'],
          ['pip', "(reading the back plate) 'For O.M. from T. Brask.'"],
          ['pip', '(beat) T. Brask. Same as the door at lot 17. Same as the man in the newsreel with the spanner.'],
          ['jay', 'Somebody built her a clock.'],
          ['pip', 'Somebody built her a CAR. Gran and somebody called Brask. And he kept a locker full of junk with his name on the door for fifty years.'],
          ['pip', "(looking up and along the marina) If he's alive he's eighty."],
        ],
      },
      { camera: 'marina_lighthouse', seconds: 4, say: [['caption', 'At the end of the long stone breakwater, the Coral Marina lighthouse. At its root, an old green pickup with a flat front tyre.']] },
      {
        say: [
          ['pip', "(following his look) The harbour office. They'll know who keeps the light. Somebody's got to know everybody's name round here."],
          ['jay', "Then we'd better go and ask him nicely."],
          ['pip', "Nicely. (beat) I can do nicely. I've seen it done."],
        ],
      },
    ],
  });

  // =====================================================================
  // d07 — Champions Since Day One
  // =====================================================================
  D.missions.push({
    id: 'd07_champions_since_day_one',
    act: 1,
    title: 'Champions Since Day One',
    giver: 'pip',
    start: 'coral_marina',
    time: 17,
    estMinutes: 10,
    summary: 'An old man with a flare gun, some polite men in teal, and a hotel king with a cheque book.',
    reward: { money: 2000 },
    failIf: ['dead:pip', 'dead:toby'],
    steps: [
      { music: 'off' },
      pipCar('toby_breakwater'),
      tobyPickup('toby_breakwater'),
      { camera: 'coral_marina', seconds: 4, say: [['caption', 'Coral Marina. 5 p.m. Masts clinking like teaspoons.']] },
      { camera: 'yacht_club', seconds: 3, say: [['caption', 'At the yacht club, the longest boat in the marina: white, sleek, and on the stern in gold letters, DAY ONE.']] },
      {
        scene: { at: 'coral_marina', cast: ['pip'] },
        say: [
          ['pip', '(coming out of the harbour office at a march, a sticky note on one finger) Toby Brask. Keeper of the Coral Marina light. Thirty-three years.'],
          ['pip', "The woman said he doesn't come in for his post. There's two years of it in a crate. Mostly seed catalogues."],
          ['pip', "She said, and I quote, 'Good luck, he bites.'"],
          ['jay', "Then we'll knock."],
          ['pip', 'From a distance?'],
          ['jay', 'Politely.'],
          ['pip', "(peeling the sticky note off her finger and sticking it on Jay's chest) I parked at the bottom of the breakwater. Well. You parked. I pointed."],
        ],
      },
      { join: ['pip'], weapon: 'fists' },
      {
        goto: 'toby_breakwater', vehicle: false, radius: 10,
        objective: 'Walk out along the breakwater to the lighthouse',
        say: [
          ['pip', "(walking fast, rehearsing under her breath) Hello, Mr Brask, I'm Dess Marlow's granddaughter, you built a car with her, I bought your locker,"],
          ['pip', "sorry, you forgot to pay, it was only three hundred and ten dollars, I've got the receipt, hello."],
          ['jay', 'Shorter.'],
          ['pip', '(thinking hard about it) Hello.'],
          ['jay', 'Better.'],
          ['pip', "(after a few steps) What if he's horrible?"],
          ['jay', "Then he's horrible and eighty. You can outrun him."],
          ['pip', "(a snort) I can't outrun anybody. I'm a driver. My legs are for pedals."],
        ],
      },
      { spawn: [{ id: 'toby', char: 'toby', at: 'marina_lighthouse', behavior: 'cower' }] },
      { camera: 'marina_lighthouse', seconds: 4, say: [['caption', 'Two men in teal blazers carry a cardboard box of photographs out of the lighthouse. In the doorway, an old man in a navy knitted hat. He has a flare gun.']] },
      {
        scene: { at: 'toby_breakwater', cast: ['pip'] },
        say: [
          ['gs_staff', "(from along the breakwater, a beaming smile, a white earpiece) Good afternoon! We're helping Mr Brask pack up his old photographs."],
          ['toby', "(off, from the lighthouse door) Hell's bells, I don't WANT help!"],
          ['caption', 'A flare goes up into the sky with a whump, high over everybody\'s heads, and hangs there fizzing pink.'],
          ['gs_staff', "(not even looking up; to Jay, smiling) Could we ask you to turn round and enjoy the marina? There's a lovely gelato stand."],
          ['pip', 'No.'],
          ['gs_staff', '(the smile staying exactly where it is) I\'m afraid that\'s the wrong answer, madam. At this time.'],
          ['jay', '(to Pip, quietly) Stay behind the lobster pots.'],
          ['pip', "I'm not twelve."],
          ['jay', "Milo's twelve. He'd stay."],
          ['pip', '(glaring; then crouching behind a stack of pots that smell of very old fish) ...Fine.'],
        ],
      },
      { leave: ['pip'], vanish: true },
      { spawn: [{ id: 'pip', char: 'pip', at: 'toby_breakwater', behavior: 'cower' }] },
      { protect: 'toby' },
      { music: 'action', checkpoint: true },
      {
        spawn: [
          { group: 'breakwater_a', faction: 'guest_services', at: 'toby_breakwater', count: 4, weapon: 'pistol', behavior: 'attack' },
          { group: 'breakwater_b', faction: 'guest_services', at: 'marina_lighthouse', count: 4, weapon: 'smg', behavior: 'guard' },
        ],
      },
      {
        kill: 'group:breakwater_a',
        objective: 'Clear Guest Services off the breakwater',
        say: [
          ['gs_staff', '(ducking behind a bollard) We\'d love your feedback!'],
          ['gs_staff', 'Sir, this is a private breakwater! Well. It\'s a public breakwater. But we feel private about it!'],
          ['toby', "(another flare, whooshing over everybody's heads into the bay) Get off my rocks!"],
          ['pip', '(from behind the lobster pots) He\'s brilliant. Driver, he\'s BRILLIANT.'],
          ['gs_staff', "(as he goes down) I'd rate this... two..."],
        ],
      },
      {
        kill: 'group:breakwater_b',
        objective: 'Push them back from the lighthouse door',
        say: [
          ['gs_staff', '(by the lighthouse, calmly, into an earpiece) Ms Graves, we have a guest. He\'s declined assistance. Twice.'],
          ['toby', '(from the doorway) And put my photographs DOWN! That one\'s a carburettor! It\'s older than you!'],
          ['gs_staff', '(edging back along the rocks) Sir, if you could just hold still while we—'],
          ['caption', 'The last of them is dragged off the end of the breakwater onto a teal launch by two colleagues, still apologising, and the launch putters away.'],
        ],
      },
      { music: 'tension' },
      {
        scene: { at: 'marina_lighthouse', cast: ['toby', 'pip'] },
        say: [
          ['caption', 'The lighthouse door. Toby Brask, eighty-one, in a pullover with holes in both elbows, the flare gun lowered but not put away.'],
          ['pip', "(all at once, much too fast) Hello Mr Brask I'm Dess Marlow's granddaughter you built a car with her I bought your locker sorry you forgot to pay hello."],
          ['caption', 'Toby looks at her. For a long time. The gulls have time to land and take off again.'],
          ['toby', "You've got her chin."],
          ['pip', '(very small) Have I?'],
          ['toby', '(beat; then, flat) Go away, trouble.'],
          ['caption', 'He goes in. The door shuts. A bolt slides, then another, then a third, which sounds like a chair.'],
          ['pip', '(staring at the door) He called me trouble.'],
          ['jay', 'He did.'],
          ['pip', "(turning, eyes shining) He knows who I am. Driver. He KNOWS who I am."],
        ],
      },
      { leave: ['toby'], vanish: true },
      { join: ['pip'], weapon: 'fists' },
      { spawn: [{ id: 'leo', char: 'leo', at: 'day_one_jetty', behavior: 'idle' }, { id: 'ottoline', char: 'ottoline', at: 'day_one_jetty', behavior: 'idle' }] },
      {
        goto: 'day_one_jetty', vehicle: false, radius: 6,
        objective: "Somebody's waving from the yacht club jetty",
        say: [
          ['pip', "(squinting) Who's that? On the big boat. Waving. Like we're friends."],
          ['jay', "Somebody who's never had to wave twice."],
          ['pip', '(going cold) Cream suit. That\'s him. That\'s Castellane. He\'s on the side of every hotel on the island.'],
          ['pip', "Driver. If I hit him, will you drive the getaway?"],
          ['jay', 'No.'],
          ['pip', "If I THINK about hitting him?"],
          ['jay', "That's allowed."],
        ],
      },
      {
        scene: { at: 'day_one_jetty', cast: ['leo', 'ottoline', 'pip'] },
        say: [
          ['caption', 'Leo Castellane steps down off the yacht DAY ONE: cream linen, open collar, a gold C on his lapel, both hands already out.'],
          ['leo', "Jay. May I call you Jay? Everybody here calls me Leo. The staff call me Mr Castellane, but I'm working on it."],
          ['jay', 'Most people call me Jay.'],
          ['leo', "(shaking his hand, warmly, for a little too long) And this must be Miss Marlow. I'm so sorry about this afternoon. Truly."],
          ['leo', 'Over-enthusiastic. We had a little concern about some photographs. Ottoline, we\'ll have a word.'],
          ['ottoline', '(a step behind him, teal suit, a radio earpiece, not a hair moving in the sea wind) We will.'],
          ['leo', '(to Jay, as if the marina were his sitting room) My family\'s name is on forty hotels. Champions since day one. You\'ll have seen it.'],
          ['leo', "I'd hate for a fifty-year-old ghost story to upset an old man. (a glance at Pip, kind) Or a young lady."],
          ['pip', "(through her teeth) It's not a ghost story."],
          ['leo', "(gently) They never are, to the people telling them."],
        ],
      },
      {
        scene: { at: 'day_one_jetty', cast: ['leo', 'ottoline', 'pip'] },
        say: [
          ['leo', 'So let me make you an offer, Jay. Nothing dramatic. I don\'t do dramatic. I do hospitality.'],
          ['leo', "Fifty thousand dollars to bring me whatever you find. Not to stop. Just to bring it to me first. That's not a bribe, that's a finder's fee."],
          ['pip', '(white with fury, opening her mouth)'],
          ['caption', 'Jay puts a hand on her shoulder. She shuts it again. Just.'],
          ['jay', "I'll think about it."],
          ['leo', '(delighted, as if Jay had said yes) That\'s all I ask. That\'s all anyone can ask, isn\'t it?'],
          ['ottoline', '(stepping forward, a printed card between two fingers) A small thing, before you go. How would you rate your visit to Coral Marina?'],
          ['ottoline', 'One to five. We\'re always looking to improve.'],
          ['jay', '(taking it) You had eight people improving on that breakwater.'],
          ['ottoline', "(the smallest smile) And we'll have more. We'll be in touch either way."],
          ['leo', '(turning back at the top of the gangway, cheerful, sure) My father won that race. It says so on forty hotels.'],
        ],
      },
      { leave: ['leo', 'ottoline'], vanish: true },
      {
        goto: 'toby_breakwater', vehicle: false, radius: 10,
        objective: 'Walk Pip back to the Drifter',
        say: [
          ['pip', "(the second they're out of earshot) You said you'd THINK about it."],
          ['jay', 'I thought about it.'],
          ['pip', 'And?'],
          ['jay', 'Done thinking.'],
          ['pip', "That's... is that a no? Tell me that's a no."],
          ['jay', "It was a no when he said 'finder's fee'."],
          ['pip', '(letting out a breath she\'s held since the jetty) God. Don\'t DO that. I nearly bit him. I nearly bit a billionaire.'],
          ['jay', "(He opens the Drifter's glovebox and drops the card in, on top of three others.)"],
          ['pip', "That's four. You're going to need a bigger glovebox."],
          ['jay', 'Four people who tried to be polite.'],
          ['pip', "(looking back at the lighthouse) We're not going, are we."],
          ['jay', "He'll come out sometime."],
        ],
      },
      { fade: 'out' },
      { setTime: 22 },
      { blackout: [['caption', 'Five hours. Two cold coffees from the yacht club. A lighthouse that does not open its door.']] },
      { fade: 'in' },
      { music: 'hope' },
      {
        scene: { at: 'toby_breakwater', cast: ['pip'] },
        say: [
          ['caption', 'Night. The root of the breakwater. The Drifter\'s windows down, the bay black and flat, the lighthouse beam turning slowly overhead.'],
          ['pip', "(half asleep, her cap over her eyes, feet on the dashboard) He's not coming out."],
          ['jay', 'Feet.'],
          ['pip', "(moving them one inch) He's not coming out, Driver."],
          ['jay', 'He looked at you for a long time.'],
          ['pip', "Everybody looks at me for a long time. I'm very annoying."],
          ['jay', "(to the Drifter's dashboard clock as it flicks over to 22:00) Damn. Ten already."],
        ],
      },
      { camera: 'paloma_fort', seconds: 3, say: [['caption', 'Across the black bay, on Isla Paloma, the old fort light flashes. Once. Twice. Three times.']] },
      { camera: 'marina_lighthouse', seconds: 3, say: [['caption', 'Above them, the Coral Marina light answers. Three flashes. Then it goes back to turning, as if nothing happened.']] },
      {
        scene: { at: 'toby_breakwater', cast: ['pip'] },
        say: [
          ['pip', '(sitting up, the cap falling off) Did you see that?'],
          ['jay', 'Somebody saying goodnight.'],
          ['pip', '(watching the far light go back to its slow sweep) Who says goodnight to a lighthouse?'],
          ['jay', 'Another lighthouse.'],
          ['caption', 'Pip settles back down. Jay keeps looking at the island for a while longer than he means to.'],
          ['pip', '(drowsy) Wake me if he comes out. And mind the...'],
          ['pip', '(beat; frowning in the dark) I don\'t know why I keep saying that.'],
        ],
      },
    ],
  });

  // =====================================================================
  // d08 — Thirty-Four Years
  // =====================================================================
  D.missions.push({
    id: 'd08_thirty_four_years',
    act: 1,
    title: 'Thirty-Four Years',
    giver: 'toby',
    start: 'marina_lighthouse',
    time: 22.5,
    estMinutes: 10,
    summary: "Toby Brask was given a tin box for a girl's seventeenth birthday. He never delivered it.",
    reward: { money: 2500 },
    failIf: ['wrecked:toby_pickup', 'dead:toby', 'dead:pip'],
    steps: [
      { music: 'off' },
      tobyPickup('toby_breakwater'),
      pipCar('toby_breakwater'),
      { camera: 'marina_lighthouse', seconds: 4, say: [['caption', 'Half past ten. The goodnight has been said. Down the breakwater comes a torch, bobbing, and a man under it.']] },
      {
        scene: { at: 'toby_breakwater', cast: ['toby', 'pip'] },
        say: [
          ['caption', "Toby Brask knocks on the Drifter's window with the end of his torch. Under his other arm, a fat roll of drawings tied with garden string."],
          ['toby', "You're still here."],
          ['jay', "You didn't come out."],
          ['toby', 'I came out. I came out now. (looking past them, across the bay, at the dark island) Had to wait for the goodnight.'],
          ['pip', 'We saw. The flashes. Three.'],
          ['toby', 'Every night at ten the fort light says goodnight. I say it back. Manners.'],
          ['caption', 'He says it as if it explains everything. He waits a long time before he says anything else.'],
          ['toby', "I've got drawings. The Firecrest. Every bolt. Only copy."],
          ['toby', "If you want them you'll have to drive. Headlights are out on the truck, and my eyes are worse."],
          ['pip', '(barely breathing) You built her.'],
          ['toby', "I built half of her. She built the other half and did all the shouting."],
        ],
      },
      { join: ['toby', 'pip'], weapon: 'fists' },
      {
        say: [
          ['toby', "(throwing the roll of drawings loose into the pickup's bed, where it rolls into a corner with a spare wheel) They've been in worse."],
          ['pip', 'That\'s the ONLY COPY.'],
          ['toby', "Then it's very lucky, isn't it. Middle seat's mine. You're by the door, trouble. Mind the handle, it bites."],
        ],
      },
      gsCar('gs_car1', 'marina_condos'),
      gsCar('gs_car2', 'marina_condos'),
      { spawn: [driver('gs_tail1', 'gs_car1', 'marina_condos', 'toby_pickup'), driver('gs_tail2', 'gs_car2', 'marina_condos', 'toby_pickup')] },
      {
        getIn: 'toby_pickup', objective: "Get behind the wheel of Toby's pickup",
        say: [
          ['jay', '(settling into the cracked bench seat; to the pickup) Easy. You\'re fifty years old, I\'m not going to rush you.'],
          ['toby', 'Forty-one.'],
          ['jay', 'Even so.'],
        ],
      },
      { music: 'tension', checkpoint: true },
      {
        deliver: 'toby_pickup', to: 'lot_17', maxDamage: 0.3,
        objective: 'Get Toby and his drawings to lot 17. Gently: they want them in one piece',
        say: [
          ['pip', "(twisting round in her seat) Driver. Teal. Two of them. Behind us since the marina."],
          ['gs_staff', '(over a loudhailer, pulling alongside, very warm) Good evening, Mr Brask! We\'d be happy to carry those for you!'],
          ['toby', "(winding his window down by hand, a full turn at a time) I'd be happy to see you in the bay!"],
          ['caption', 'The Sovereign drops back. Then it noses forward again, close enough to touch the tailgate.'],
          ['pip', "(after a while, quieter) How did you know me? On the breakwater. You looked at me and you knew."],
          ['toby', "You've got her chin. (beat) And her mouth, God help you."],
          ['pip', '(not sure whether to be offended; deciding to be pleased) ...Thanks.'],
          ['toby', "(watching the dark road where the headlights should be) She's not a car, your Firecrest. She's a promise with four wheels."],
          ['toby', "(beat) Hell's bells, I'm getting soft."],
          ['pip', 'The tin box. It was in your locker. Under a tarp. Why?'],
          ['caption', 'Toby does not answer. For a long time nobody says anything at all. In the mirrors, the teal cars drop back, and wait.'],
          ['toby', "She gave it to me. The week she went. 'On June's seventeenth birthday. Not before. Promise me.'"],
          ['pip', 'June. (beat) My mum.'],
          ['toby', 'Your mum.'],
          ['pip', "Mum's fifty-one."],
          ['toby', 'I know how old your mum is, trouble.'],
          ['toby', '(a long pause) I drove to the house. There was a car outside. I drove away.'],
          ['toby', 'Thirty-four years I\'ve been driving away.'],
          ['caption', 'Jay keeps his eyes on the road for a while. A Sovereign bumps the tailgate, gently, like a hand on a shoulder.'],
          ['jay', "You're driving back now."],
          ['toby', "You're driving."],
          ['jay', 'Same thing tonight.'],
          ['gs_staff', '(loudhailer, a little hurt) Mr Brask, we really would be very careful with them!'],
          ['toby', "(not even turning his head) You'd be very careful with them into a shredder."],
        ],
      },
      {
        spawn: [driver('gs_off1', 'gs_car1', 'lot_17', 'cinder_truckstop'), driver('gs_off2', 'gs_car2', 'lot_17', 'cinder_truckstop')],
        say: [
          ['gs_staff', "(loudhailer, peeling away into the dark) Goodnight, Mr Brask! We'll be in touch either way!"],
          ['toby', 'Hope not.'],
        ],
      },
      { music: 'sad' },
      {
        blackout: [
          ['caption', 'Thirty-four years ago. Vista Verde. A Sunday in June.'],
          ['caption', 'A green pickup, new paint, a tin box on the passenger seat with a ribbon on it.'],
          ['caption', 'A little house with a shed and a perfect lawn. Balloons on the gate. Seventeen of them.'],
          ['caption', 'Across the road, a white van with a gold C on the door. Engine running.'],
          ['toby', "(then) Not today. Next week. When they've gone."],
          ['caption', 'He never knew it was a hotel van delivering towels. He found out years later. It did not help.'],
        ],
      },
      {
        scene: { at: 'lot_17', cast: ['toby', 'pip'] },
        say: [
          ['caption', 'Lot 17. The bare bulb. Toby unrolls the drawings across the folding table and pins the corners with the steering wheel, the gold bird and the rally clock.'],
          ['toby', '(his hand going still on the wheel) Hello, old girl.'],
          ['toby', '(to the drawings, as much as to them) Ironclad chassis. Our own engine. Four carbs. The fourth one she tuned herself, nights. Wouldn\'t let me touch it.'],
          ['pip', '(picking up the rally clock) There\'s a poem on the back. Same as the others. We found it at the clock tower.'],
          ['pip', "(reading aloud, slowly) 'My heart is home where my baby sleeps,'"],
          ['pip', "'out in the shed where the spider creeps.'"],
          ['caption', 'She stops.'],
          ['toby', '(quietly) Go on.'],
          ['pip', "'I roar on Sundays, up and down,'"],
          ['pip', "'the fastest thing in all the town.'"],
          ['pip', "(beat) 'And mind the road.'"],
        ],
      },
      {
        scene: { at: 'lot_17', cast: ['toby', 'pip'] },
        say: [
          ['pip', "(very quietly) 'Where my baby sleeps.' (beat) The baby's Mum. Where Mum slept. Mum's house. It was Aunt Win's. Mum grew up there."],
          ['jay', 'The shed.'],
          ['pip', "Nobody's allowed in the shed. Nobody. Mum mows the lawn every Sunday. Up and down. You can hear it three streets away."],
          ['pip', "That mower does forty. (beat) Everybody says it. 'June's mower does forty.' Nobody ever asked why."],
          ['pip', "(the clock very still in her hands) It's the carburettor. The heart. Gran put the Firecrest's heart in my mum's lawnmower."],
          ['caption', 'She sits down on a box and says nothing at all. Toby takes his hat off, and holds it.'],
          ['toby', '(after a long time) The fourth carb. The one she tuned herself. (beat) Hell\'s bells, Dess.'],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['caption', 'A video call. Milo, in pyjamas, glasses fogged, hair flat on one side, out of breath.'],
          ['milo', "I've got it! I've got it! It's a shed! A shed with a—"],
          ['pip', "(not looking up) It's my mum's mower."],
          ['milo', '(beat) ...Yes. That. (beat) I\'d have got the mower.'],
          ['milo', "(seeing her face properly through the screen; quieter) Pip. That's your mum's house. That's... she left it right where your mum was."],
          ['milo', "(and seeing Toby) Is that— are you T. Brask? You're on the back of the clock! I've got a page about you. It's mostly question marks."],
          ['toby', "(squinting at the phone) Is this the blog boy?"],
          ['milo', '(going red) ...Yes.'],
          ['milo', "(very small) Somebody's going to read this. Aren't they. If I post it. Dash, and the teal people. And they'll go to Pip's mum's house."],
          ['milo', 'Jay. Should I stop?'],
        ],
      },
      {
        choice: {
          prompt: 'Milo asks whether he should stop posting.',
          options: [
            {
              label: 'Keep posting. Let them chase us.',
              flag: 'dlc_blog_on',
              then: [
                {
                  phone: 'milo',
                  say: [
                    ['jay', "If they're reading you, they're not thinking for themselves."],
                    ['milo', '(slowly working it out) So we let Dash chase the wrong things.'],
                    ['jay', "He's good at it."],
                    ['milo', "(sitting up, a new rule forming) I'll wait a day. Every time. A day behind. Like a newspaper."],
                    ['pip', '(a wet laugh in spite of herself) Like a very small newspaper.'],
                    ['milo', 'Forty-one subscribers is a COMMUNITY.'],
                    ['toby', '(to Jay, low) Forty-one people read about my clock?'],
                    ['jay', 'Forty-one people and a television.'],
                    ['toby', "(considering it) Huh. (beat) Tell 'em it's a good clock."],
                  ],
                },
              ],
            },
            {
              label: 'Go dark, Milo. Paper only.',
              flag: 'dlc_blog_off',
              then: [
                {
                  phone: 'milo',
                  say: [
                    ['milo', '(a long breath) Deleting.'],
                    ['milo', "(click; beat) Deleted. Gran's going to ring."],
                    ['caption', 'He holds a big sheet of card up to the camera and writes on it in marker, tongue between his teeth: TEAM FIRECREST 3 · LOCKWOOD\'S LOST LEGENDS 0.'],
                    ['caption', 'Underneath, small and careful: a tap, a spur, and a minute hand.'],
                    ['milo', "It's going on my wall. It's very exclusive now. Three readers. You, Pip and me."],
                    ['jay', 'Four. Toby.'],
                    ['toby', "I don't read."],
                    ['milo', "(holding the card closer to the camera, so it fills the whole screen) You'll read this."],
                  ],
                },
              ],
            },
          ],
        },
      },
      { music: 'hope' },
      {
        scene: { at: 'lot_17', cast: ['toby', 'pip'] },
        say: [
          ['caption', 'Pip stands up. She takes the starter key off the table, the little gold bird swinging, and puts it in her pocket.'],
          ['pip', "Mum's out on lessons tomorrow afternoon. Two till six. She's got the nervous girl at four. She always runs over with the nervous girl."],
          ['pip', '(beat; to Jay) Jay. Will you drive me to my mum\'s?'],
          ['jay', "(if he notices the name, it doesn't show) I'll drive you anywhere that isn't ninety-two in a forty."],
          ['toby', "(rolling up the drawings, very carefully this time) I'll come. Slowly. Thirty-four years late, what's another day."],
          ['pip', "You'll have to sit in the back."],
          ['toby', "I've sat in worse. I've sat in a Castellane hotel. Twelve dollars for a sandwich."],
          ['caption', 'Jay goes to the door. Pip calls after him, without thinking.'],
          ['pip', 'And mind the road.'],
          ['caption', 'Jay stops in the doorway, for half a second. Toby looks up from the drawings, very sharply, at Pip.'],
          ['caption', 'Nobody says why.'],
        ],
      },
    ],
  });

  // =====================================================================
  // Ambient texts (bible, Appendix B)
  // =====================================================================
  D.texts.push(
    { after: 'd06_breaking_news', from: 'dash', message: 'No hard feelings re: van. Your boxing-in was a 9/10, would be boxed in again. Dash. (Kit says I shouldn\'t text you. Sent anyway.)' },
    { after: 'd07_champions_since_day_one', from: 'ottoline', message: 'Thank you for visiting Coral Marina. How would you rate your experience today? Reply 1 to 5. Castellane Guest Services.' },
    { after: 'd08_thirty_four_years', from: 'toby', message: "Drawings are under your table. Don't spill tea on them. Sorry about the box. That's not enough. I know. T.B." },
  );
})();
