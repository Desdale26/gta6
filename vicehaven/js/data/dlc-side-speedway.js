/*
 * data/dlc-side-speedway.js — "Chasing the Firecrest", side chain SUMMER
 * SERIES (dside_speedway, dsr1 to dsr4): Pip's racing team, Marlow Racing.
 *
 * Pip's racing licence went the same way as her road licence ("conduct
 * unbecoming": she called the chief steward a lamppost), so Jay drives the
 * team's one white Drifter to keep the points while she runs the radio from
 * a folding chair. Round one on the oval, a street round at night round the
 * Halcyon campus (Officer Plum was not consulted), a tail across the city to
 * a lock-up where somebody is putting a banned engine in Teddy Castellane's
 * car without telling Teddy, and the Southbay Classic: ten laps, the whole
 * field, a licence handed back on the grid and a fair race at last.
 *
 * Loaded after dlc-side-flying.js. See docs/DLC_BIBLE.md (sections 1, 4, 7,
 * 10, 11) and docs/dlc/beats-side.md (SUMMER SERIES, DECISIONS 1, 2, 12 to
 * 15). Side jobs float: the chain opens after d10_heritage_run and can be
 * played before or after any later main job, so Dess is mentioned only
 * inside `if: 'd23_odie_wren'`; before that "Gran" is the legend (won,
 * painted out). Race rivals are spawned by the `race` step itself on the
 * Speedway grid (or behind Jay on the campus), so they have no spawnCar.
 * Monty never gets Jay's name right here (that's d30's): Jim Mercy, Jay...
 * Mercator, Jem Mersey, Jack Mackerel, Jake Murphy, Joe Mercury, and closest
 * of all, "Jay... Mer... Murphy!". Reads dsf1_banner_day (dsr1),
 * dlc_blog_on (dsr2), d20_the_gorse_file (dsr3), d23_odie_wren and
 * dsf4_check_ride (dsr4). Sets nothing; the finale's id
 * dsr4_southbay_classic is read by d30 (Pip and Teddy as guard cars) and
 * Ending B (they lead the parade lap). No riddles, no comment cards, no
 * subscriber numbers.
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const MARLOW_WHITE = 0xf1f0ea;
  const CASTELLANE_GOLD = 0xd29a1c;
  const GS_TEAL = 0x13b5b1;

  // ------------------------------------------------------------ helpers
  /** Marlow Racing's only car: a white Drifter, a wart clinic and a prawn shack on the doors. */
  const pipCar = (at) => ({ spawnCar: 'pip_car', type: 'drifter', at, color: MARLOW_WHITE, name: 'the Marlow Drifter' });
  /** Somebody behind the wheel of a spawned car, driving to a place (or after a car). */
  const driver = (id, car, at, to, faction) => ({ id, faction: faction || 'guest_services', hostile: false, at, behavior: 'drive', car, to });
  /** The oval, one lap: shared with d10 and d30. */
  const OVAL = ['speedway_turn1', 'speedway_back_straight', 'speedway_turn3', 'speedway_grid'];
  /** The Summer Series field (privateer colours from the beat sheet). */
  const teddy = (skill) => ({ char: 'teddy', car: 'zephyr', color: CASTELLANE_GOLD, skill });
  const works = (name, skill) => ({ name, car: 'zephyr', color: CASTELLANE_GOLD, skill });
  const PRIVATEERS = [
    { name: 'Lenny Fosse', car: 'drifter', color: 0x2a55d8 },
    { name: 'Pearl Haddon', car: 'vireo', color: 0x2a6a3a },
    { name: 'Wilf Gantry', car: 'ironclad', color: 0x6b4a32 },
    { name: 'Suki Brannigan', car: 'pipit', color: 0xefefea },
    { name: 'Otto Pell', car: 'zephyr', color: 0xc8202a },
  ];
  const privateer = (i, skill) => Object.assign({ skill }, PRIVATEERS[i]);

  // =====================================================================
  // dsr1 — Oval Sprint
  // =====================================================================
  const dsr1 = {
    id: 'dsr1_oval_sprint',
    title: 'Oval Sprint',
    giver: 'pip',
    start: 'speedway_pits',
    time: 16,
    estMinutes: 9,
    summary: "Round one of the Summer Series. Marlow Racing has one car, one driver who isn't allowed to drive, and one who is.",
    reward: { money: 2000 },
    failIf: ['wrecked:pip_car'],
    steps: [
      pipCar('speedway_grid'),
      { music: 'off' },
      {
        camera: 'southbay_speedway', seconds: 4,
        say: [['caption', 'Southbay Speedway. The Summer Series, round one. Four in the afternoon, and the tarmac is hot enough to fry an egg on, which somebody in the grandstand is trying.']],
      },
      {
        scene: { at: 'speedway_pits', cast: ['pip', 'jay'] },
        say: [
          ['caption', "Pit bay nine. One white Drifter, one folding chair, one radio, and a clipboard Pip has borrowed off nobody. The Drifter's doors carry two tiny sponsor stickers."],
          ['caption', "One says DR PENHALIGON'S WART & VERRUCA CLINIC. The other says SANDPIPER PRAWN SHACK, with a drawing of a prawn that looks worried."],
          ['pip', "Right. Marlow Racing. Team principal, chief mechanic, strategist, caterer. (points at Jay) Driver."],
          ['jay', "You're the driver."],
          ['pip', "I was the driver. The stewards suspended my racing licence along with the road one. Conduct unbecoming."],
          ['jay', 'What did you do?'],
          ['pip', 'I called the chief steward a lamppost.'],
          ['jay', 'Is he a lamppost?'],
          ['pip', "He's tall, he's grey and he does nothing all night. You tell me."],
          ['jay', "(after a moment) That's a lamppost."],
          ['pip', 'Thank you. Nobody else has said that. Not even Mum, and she hates him.'],
        ],
      },
      {
        scene: { at: 'speedway_pits', cast: ['pip', 'teddy', 'jay'] },
        say: [
          ['caption', 'Teddy Castellane strolls down the pit lane in gold-and-black overalls, helmet under his arm, a mechanic carrying his water bottle for him.'],
          ['caption', 'He stops at the Drifter and reads the doors.'],
          ['teddy', 'Nice stickers. Is the wart clinic your title sponsor?'],
          ['pip', "They're the only sponsor who paid in money."],
          ['teddy', "What did the prawn shack pay in?"],
          ['pip', '(not looking at him) Prawns.'],
          ['teddy', '(nodding at Jay) Who\'s this? Your chauffeur?'],
          ['jay', 'I drive.'],
          ['teddy', 'So do I.'],
          ['jay', "We'll see."],
          ['caption', 'Teddy smiles the smile of somebody who has never once had to wait for a table, and strolls on. The mechanic with the water bottle hurries after him.'],
        ],
      },
      {
        scene: { at: 'speedway_pits', cast: ['pip', 'jay'] },
        say: [
          ['pip', "(quieter, when he's gone) It's not just a race. If we score nothing in round one, we lose the garage."],
          ['jay', 'To who?'],
          ['pip', "To a Castellane hospitality tent. With a buffet. Little sandwiches with the crusts cut off, on Gran's track."],
          ['pip', "I'm not losing Gran's track to a tent with a buffet in it."],
          ['jay', '(looking at the Drifter) How old is she?'],
          ['pip', "Older than me. The handbrake's decorative. Fourth is fine. Fifth is a rumour."],
          ['jay', "(patting the roof) Don't worry. I've driven worse for worse people."],
        ],
      },
      {
        if: 'dsf1_banner_day',
        then: [{
          camera: 'speedway_grid', seconds: 4,
          say: [
            ['caption', 'Over the PA, from the commentary box high on the main stand, a voice like a kettle coming to the boil.'],
            ['monty', '(PA) And a warm Speedway welcome to Marlow Racing, sponsored by the Sandpiper Prawn Shack, NOW WITH FEWER BONES. (beat) I\'m told to say that.'],
            ['pip', "(to Jay) Hob's banner. Everyone's seen Hob's banner. The prawn man's thrilled. He's put his prices up."],
          ],
        }],
        else: [{
          camera: 'speedway_grid', seconds: 4,
          say: [
            ['caption', 'Over the PA, from the commentary box high on the main stand, a voice like a kettle coming to the boil.'],
            ['monty', '(PA) Afternoon, Southbay! Round one of the Summer Series! Thirty years I\'ve called this track, and I have never once seen a prawn on a racing car. Today I have!'],
          ],
        }],
      },
      {
        getIn: 'pip_car', objective: 'Get in the Drifter. Grid slot six',
        say: [
          ['caption', 'The walk from the pits to the grid. Pip walks beside him, talking at the speed she drives.'],
          ['pip', "He's not bad, Teddy. He's just never been told no. I've been told no my whole life. I'm great at it."],
          ['pip', "Turn one's banked, so you can carry more than you think. Turn three's flat and it'll bite you. The back straight's just a straight. Don't overthink a straight."],
          ['jay', 'I never overthink a straight.'],
          ['pip', "Good. Overthinking's for corners. And I'll be on the radio. Don't turn me down. People turn me down. It hurts my feelings, and then I shout."],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        phone: 'pip',
        say: [
          ['pip', "(on the team radio, from the folding chair) Radio check. Say something."],
          ['jay', 'Something.'],
          ['pip', 'Funny. Five laps. Six cars ahead of you because they gave us the back of the grid. Get past the privateers in the first lap or they\'ll hold you up all day.'],
          ['pip', "The brown Ironclad's Wilf Gantry. He's seventy. He brakes for birds."],
          ['jay', '(to the Drifter, hands settling on the wheel) Right. You and me. Nobody\'s shooting. Let\'s enjoy that.'],
        ],
      },
      {
        race: {
          checkpoints: OVAL,
          laps: 5,
          rivals: [teddy(0.95), works('Bruno Sallis', 0.92), privateer(0, 0.86), privateer(1, 0.84), privateer(2, 0.8)],
        },
        objective: 'Win the sprint: five laps',
        say: [
          ['monty', "(PA, at full speed) And they're away! Teddy Castellane from pole in the gold, Bruno Sallis in the other gold, and at the back... it's... Jim Mercy for Marlow Racing!"],
          ['pip', '(radio) Jim? Who\'s Jim?'],
          ['jay', 'Leave it.'],
          ['monty', 'Lenny Fosse in the blue Drifter! Pearl Haddon in the green! And Wilf Gantry, seventy years young, who has asked me to say hello to his wife!'],
          ['pip', '(radio) Turn one, lovely. Turn three, a seven. You lifted. Don\'t lift. Lifting is for furniture.'],
          ['monty', 'Teddy Castellane in the gold, and Jim Mercy in the... is that a prawn on the bonnet? It\'s a prawn on the door! Somebody\'s sponsored by a prawn!'],
          ['pip', '(radio) Wilf\'s braking. Wilf\'s braking for a bird. Go round him. Go ROUND him. Lovely. Eight.'],
          ['monty', 'Jay... Mercator? I\'m being handed a note. The note says Jim. I\'m going with Jim!'],
          ['pip', "(radio) Teddy's two car lengths up. He's quick into one and lazy out of three. Always has been. Since we were eight."],
          ['jay', 'Lazy out of three.'],
          ['pip', "(radio) He cried when he lost, at eight. I cried more when I won. I don't know why. I was eight. Why are we talking about this? Drive."],
          ['monty', "And the Marlow car is up to second! Jim Mercy is all over the back of Teddy Castellane like a sticker on a... like a prawn on a door!"],
          ['pip', '(radio) Out of three. Wait for it. Wait. Now. NOW.'],
          ['monty', 'LAST LAP! Last lap at the Southbay Speedway, and the crowd is on its feet, except the man with the egg, who is concentrating!'],
          ['pip', '(radio, losing her cool) GO GO GO GO GO. (beat) Sorry. Go.'],
          ['monty', "It's Jim Mercy! It's Marlow Racing! A prawn has won the first round of the Summer Series!"],
          ['pip', '(radio) HELL yes. Hell yes. Oh, I\'m going to be unbearable.'],
        ],
      },
      { music: 'triumph' },
      {
        scene: { at: 'speedway_pits', cast: ['pip', 'teddy', 'jay'] },
        say: [
          ['caption', 'The Drifter rolls into bay nine ticking like a clock that has had a fright. Pip is already marking the clipboard.'],
          ['jay', '(to the Drifter, as the engine ticks down) Damn. You had that in you all along.'],
          ['pip', "Lap one, a seven. Lap two, an eight. Lap three, an eight. Lap four... (beat) Fine. Nine."],
          ['jay', 'Out of what?'],
          ['pip', "Ten. Nobody gets ten. Ten's a myth, like fifth gear."],
          ['teddy', '(pulling off his helmet, sour but fair) Where did you find him?'],
          ['pip', 'Text message.'],
          ['teddy', "(to Jay, after a second) You took the inside at three. Nobody takes the inside at three."],
          ['jay', "You leave it open."],
          ['teddy', "(frowning, as if that had never occurred to him) ...I do leave it open."],
        ],
      },
      {
        scene: { at: 'speedway_pits', cast: ['pip', 'monty', 'jay'] },
        say: [
          ['caption', "Monty Sprake comes down from the box in his yellow blazer, the headset still round his neck, and shakes Jay's hand with both of his."],
          ['monty', 'Jim! Great drive, Jim. Great drive. I said to my producer, that boy can drive.'],
          ['jay', 'Jay.'],
          ['monty', "That's what I said. (to Pip) Your grandmother would've liked that, young lady. The inside at three. That was her move, you know. Fifty years ago. On this track."],
          ['caption', 'Pip opens her mouth and finds there is nothing in it. Monty is already gone, waving at someone in the stand.'],
          ['pip', '(eventually) We keep the garage.'],
          ['jay', 'You keep the garage.'],
          ['pip', "We. Team. Marlow Racing. (beat) Next round's on the Halcyon campus. At night. On the streets."],
          ['jay', 'That sounds illegal.'],
          ['pip', "It's sanctioned. I think. It's got a banner."],
        ],
      },
      { music: 'off' },
      { text: 'pip', message: 'Dr Penhaligon rang. He wants a bigger sticker. I said the wart clinic has to earn it. Round two, Halcyon, Thursday night. Bring the face you drive with.' },
    ],
  };

  // =====================================================================
  // dsr2 — Campus Sprint
  // =====================================================================
  const dsr2 = {
    id: 'dsr2_campus_sprint',
    title: 'Campus Sprint',
    giver: 'pip',
    start: 'halcyon_quad',
    requires: ['dsr1_oval_sprint'],
    time: 21.5,
    estMinutes: 10,
    summary: 'The Summer Series street round, on closed roads round Halcyon at night. Officer Plum was not consulted.',
    reward: { money: 2000 },
    failIf: ['wrecked:pip_car'],
    steps: [
      pipCar('halcyon_quad'),
      { music: 'off' },
      {
        camera: 'halcyon_clocktower', seconds: 4,
        say: [['caption', 'Halcyon University. The Summer Series street round. 9:30 p.m. The clock tower says 11:14, as it has every hour since a certain night earlier this summer.']],
      },
      {
        camera: 'halcyon_library', seconds: 3,
        say: [['caption', 'On the library steps, behind a crowd barrier and well away from the road, a homemade flag the size of a bedsheet: MARLOW RACING, in gold paint. Under it, a twelve-year-old in a yellow T-shirt.']],
      },
      { spawn: [{ char: 'plum', at: 'halcyon_quad', behavior: 'patrol', hostile: false }] },
      {
        scene: { at: 'halcyon_quad', cast: ['pip', 'milo', 'jay'] },
        say: [
          ['caption', "Over the start line, between two lamp posts, the official banner: HALCYON STREET SPRINT'S. Somebody has put a neat strip of gaffer tape over the apostrophe."],
          ['milo', 'Did you know there are four hundred and twelve misplaced apostrophes on this campus? (beat) Now there are four hundred and eleven.'],
          ['jay', 'You did that.'],
          ['milo', "I had a ladder. Well. Grandad had a ladder. Grandad held the ladder and read me a chapter of his book while I did it. It was very motivating. I went up fast."],
          ['pip', "(squinting up the library steps at the flag) Is that glitter on your flag?"],
          ['milo', "It's not glitter. It's ambition. (beat) It's spelled right, too. Unlike some people's banners."],
          ['pip', "He's our first fan. (to Milo) You're our first fan."],
          ['milo', "I'm your only fan. I counted. There's a man by the chip van with a Castellane scarf, but he's eating, so he can't clap."],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [{
          scene: { at: 'halcyon_quad', cast: ['milo', 'jay'] },
          say: [
            ['milo', "I'm live-posting the race. Not the Firecrest stuff. Just the race. People like a race."],
            ['milo', "I've got a headline ready if you win and one if you don't. The one if you don't is longer. It's got a poem in it."],
            ['jay', 'Delete the poem.'],
            ['milo', "I'll delete the poem if you win. That's an incentive. Probably."],
          ],
        }],
        else: [{
          scene: { at: 'halcyon_quad', cast: ['milo', 'jay'] },
          say: [
            ['milo', "I'm keeping lap times on a card. On paper. Like a professional. Or a Victorian."],
            ['milo', "(showing a stopwatch on a string round his neck) It was Grandad's. It's from a sports day in nineteen-seventy-something. He came fourth in the egg and spoon."],
            ['jay', 'Out of how many?'],
            ['milo', "Four. He says the egg was faulty."],
          ],
        }],
      },
      {
        scene: { at: 'halcyon_quad', cast: ['plum', 'pip', 'jay'] },
        say: [
          ['caption', 'A bicycle bell. Officer Plum of Halcyon Campus Security rides up across the quad, torch on, although every lamp on campus is lit.'],
          ['plum', 'Nobody told me there was a race on my quad.'],
          ['pip', 'There was a letter.'],
          ['plum', "I don't read letters. I read faces. (shining the torch at Jay) I've seen your face."],
          ['jay', "I've got one of those faces."],
          ['plum', "You've got a face I've seen at night. Near a clock."],
          ['jay', 'Lots of clocks about.'],
          ['plum', "(slowly lowering the torch, not convinced) I'll be watching. I'll be watching all of you. I'm on a bicycle, so I'll be watching in a slightly delayed way."],
          ['caption', 'He pedals off to stand guard over a flowerbed, glancing back at Jay every few yards. Milo watches him go with deep interest.'],
          ['milo', "(to Jay, very quietly) He doesn't know it was us."],
          ['jay', '(just as quietly) Go and stand behind your barrier.'],
        ],
      },
      {
        getIn: 'pip_car', objective: 'Get in the Drifter. Start line, outside the quad',
        say: [
          ['pip', "(walking him to the car) The strip's bumpy, the library corner's tight, and the bit by the History building has a speed bump nobody mentions till you're on it."],
          ['pip', "And the clock tower's twice a lap, sort of. You go round it, then you go past it. Don't look at it. People look at it. It's stopped. There's nothing to see."],
          ['jay', 'I know.'],
          ['pip', '(beat) Yeah. I suppose you do.'],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        phone: 'pip',
        say: [
          ['pip', "(radio, from a folding chair outside the library) Radio check. Teddy's on pole again. Bruno beside him."],
          ['pip', "The rest are behind you, because the street's two lanes and the man doing the grid can't count."],
          ['pip', 'Two laps. No banking out here. Kerbs. Proper kerbs. They will eat a tyre and not say sorry.'],
          ['jay', '(to the Drifter, as it idles) Streets. This is more like it. You and me know streets.'],
        ],
      },
      {
        race: {
          checkpoints: ['campus_strip', 'halcyon_library', 'halcyon_clocktower', 'quill_study', 'halcyon_quad'],
          laps: 2,
          rivals: [teddy(0.95), works('Bruno Sallis', 0.9), privateer(0, 0.86), privateer(1, 0.83), privateer(3, 0.8)],
        },
        objective: 'Win the street sprint: two laps, round the clock tower twice',
        say: [
          ['caption', "Commentary tonight comes from a borrowed ice-cream van parked by the quad, its PA the only one on campus. Every time Monty keys the microphone, the van plays its jingle."],
          ['monty', "(PA; the ice-cream jingle) Good evening, Halcyon! And it's Jem Mersey for Marlow Racing! (jingle) I don't know how to turn that off."],
          ['pip', "(radio) The strip's coming up. It's bumpy. Hold her straight and let her bounce."],
          ['monty', '(jingle) Teddy Castellane leads through the student strip! (jingle) Somebody is buying a choc ice! Not now, madam! (jingle)'],
          ['pip', "(radio) Library corner. It's tight. Don't hit the boy."],
          ['jay', "I wasn't going to hit the boy."],
          ['milo', '(over the radio, Pip holding it up for him) Hello! I\'m the boy! I\'m behind the barrier! (beat) Your lap was one minute and— no, I pressed it twice. Sorry. Continue.'],
          ['monty', '(jingle) Round the clock tower! Which is stopped! Which means, technically, ladies and gentlemen, this race is taking no time at all! (jingle)'],
          ['pip', "(radio) That's an eight. Past the History building. Speed bump. SPEED BUMP. (beat) Fine. You found it."],
          ['caption', 'Lap two. On the long corner by the quad, Teddy Castellane takes the gold Zephyr straight across the lawn, two wheels on the grass, and rejoins ahead.'],
          ['monty', "(jingle) Teddy Castellane has found a short cut! It's the lawn! And— oh! Officer Plum of campus security has joined the race!"],
          ['monty', "(jingle) He's in... he's in last place, but he's gaining on a privateer who did nothing wrong! Suki Brannigan, in the white Pipit, is being pursued by a bicycle!"],
          ['pip', '(radio, laughing too hard to talk properly) He\'s after Suki. He\'s after SUKI. Suki goes to church. Pass Teddy while he\'s laughing. He\'s laughing too.'],
          ['monty', '(jingle) Last time past the clock! Jem Mersey is right on the gold car! (jingle) The van is playing Greensleeves now. I don\'t know why. Nobody knows why.'],
          ['pip', '(radio) Out of the corner, flat, flat, flat... hell YES.'],
          ['monty', "(jingle) Marlow Racing wins the street round! Jem Mersey! Or possibly Jim! I've got two notes! (jingle) And a ninety-nine with a flake. Thank you, madam."],
        ],
      },
      { music: 'triumph' },
      {
        scene: { at: 'halcyon_quad', cast: ['pip', 'plum', 'teddy', 'jay'] },
        say: [
          ['caption', 'At the finish, every engine ticking. Officer Plum arrives last of all, wheezing, and props his bicycle against the banner post.'],
          ['plum', '(out of breath, to everyone) Which one of you... was on my lawn?'],
          ['caption', 'Everybody points at Teddy. Pip points with both hands.'],
          ['teddy', 'It was a racing line.'],
          ['plum', 'It was a lawn.'],
          ['teddy', 'It was a racing line through a lawn.'],
          ['plum', '(taking out a pad and licking the pencil) Then it was conduct unbecoming a lawn.'],
          ['caption', 'He writes the ticket in slow, careful capitals, tears it off and hands it to Teddy. Teddy looks at it like nobody has ever given him anything he didn\'t want before.'],
          ['pip', '(to Jay, delighted) Conduct unbecoming. Welcome to the club, Teddy.'],
          ['teddy', "(reading it) He's spelled 'unbecoming' with two Ms."],
        ],
      },
      {
        scene: { at: 'halcyon_quad', cast: ['pip', 'milo', 'jay'] },
        say: [
          ['caption', 'Milo comes down off the library steps, flag over his shoulder like a soldier home from somewhere glorious.'],
          ['milo', 'Did you know you went round the clock tower faster than the clock does?'],
          ['jay', "It's stopped."],
          ['milo', "(beat) It's stopped. Since you. Still counts."],
          ['jay', '(to the Drifter, a hand flat on the warm bonnet) Good girl. Damn good.'],
          ['milo', "That's a swear. I'm writing it on the card. In the margin. Small."],
          ['pip', "Grandad's expecting you home, isn't he?"],
          ['milo', "He's asleep in a chair with a book on his face. He won't know. (beat) I'll go. I'm going. I'm going in."],
          ['pip', '(as he goes) And mind the road.'],
          ['milo', "(turning round, walking backwards) I'm walking."],
          ['pip', "Mind it anyway. (to Jay, frowning) I don't know why I say that."],
          ['jay', '(watching the boy all the way to the History building door) Neither do I.'],
        ],
      },
      { music: 'off' },
      { text: 'pip', message: 'Two from two. Teddy has to pay his lawn ticket in person at the campus office. Between 9 and 9:15. On a Tuesday. I love Plum now.' },
    ],
  };

  // =====================================================================
  // dsr3 — Dirty Air
  // =====================================================================
  const dsr3 = {
    id: 'dsr3_dirty_air',
    title: 'Dirty Air',
    giver: 'pip',
    start: 'speedway_pits',
    requires: ['dsr2_campus_sprint'],
    time: 13,
    estMinutes: 10,
    summary: 'Teddy Castellane is two seconds a lap faster all of a sudden. Nobody finds two seconds.',
    reward: { money: 2000 },
    failIf: ['wrecked:pip_car', 'dead:pip', 'dead:teddy'],
    steps: [
      pipCar('speedway_pits'),
      { spawnCar: 'castellane_transporter', type: 'hauler', at: 'speedway_pits', color: CASTELLANE_GOLD, name: 'the Castellane transporter' },
      { music: 'off' },
      {
        camera: 'speedway_pits', seconds: 4,
        say: [['caption', "Southbay Speedway, one in the afternoon, a practice day. In bay nine a girl in a red cap is glaring at a stopwatch as if it had said something about her mother."]],
      },
      {
        scene: { at: 'speedway_pits', cast: ['pip', 'jay'] },
        say: [
          ['pip', "(not looking up) Teddy's practice laps. Last week, fifty-one point four. This morning, forty-nine point three."],
          ['jay', 'He got better.'],
          ['pip', 'Nobody gets two seconds better in a week. Nobody finds two seconds.'],
          ['pip', "You find a tenth. You find a tenth down the back of a sofa. Two seconds is a different engine."],
          ['jay', 'Could be the tyres.'],
          ['pip', "Tyres are three tenths. Weather's a tenth. Prayer's nothing. I've tried prayer. (holding up the stopwatch) This is an engine."],
          ['caption', "Down the pit lane, the gold Castellane Racing transporter is lowering its ramp."],
          ['caption', "Two mechanics push Teddy's Zephyr up it and strap it down, quickly, the way people do things they'd rather not be asked about."],
          ['pip', "Look. They're taking it out. For a 'service'. On a Tuesday."],
          ['jay', 'People service things on Tuesdays.'],
          ['pip', "Nobody services on a Tuesday. Tuesday's for sulking about Sunday. (standing) We're following it."],
          ['jay', "You're banned."],
          ['pip', "From driving. Not from sitting. I'm an expert sitter. Get in."],
        ],
      },
      { join: ['pip'] },
      {
        getIn: 'pip_car', objective: 'Get in the Drifter. Pip rides along',
        say: [
          ['pip', "Peel the prawn sticker off. They'll know the prawn."],
          ['pip', '(as he reaches for it) No. Leave it. Nobody looks at a prawn. A car without a prawn, people wonder why.'],
          ['jay', "(to the Drifter, climbing in) Not a race today. Today you're just a car. Boring. Be boring."],
        ],
      },
      { spawn: [driver('trans_driver', 'castellane_transporter', 'castellane_transporter', 'truckstop_lockup', 'castellane_racing')] },
      { music: 'tension' },
      {
        follow: 'castellane_transporter', to: 'truckstop_lockup', min: 15, max: 120,
        objective: 'Tail the Castellane transporter. Not too close',
        say: [
          ['caption', 'The gold transporter grinds out of the Speedway gate and turns north, out of The Bowl and into the city traffic.'],
          ['caption', 'It is the size of a bungalow and the colour of a trophy. Losing it would take real effort.'],
          ['pip', "Closer. Closer. You're miles back."],
          ['jay', "The trick to a tail is to be boring. Nobody looks twice at boring."],
          ['pip', "I've never been boring in my life."],
          ['jay', 'I know. Sit lower.'],
          ['caption', 'Pip sits lower. Then a bit lower. Then she is mostly in the footwell, with her cap over her eyes.'],
          ['pip', "(from the footwell) Teddy and me, we started karting the same year. Eight. He had a gold kart. Gold. At eight."],
          ['pip', "He cried when he lost. I cried more when I won. I don't know why. I was eight. Everything's a lot when you're eight."],
          ['jay', 'Why do you race?'],
          ['pip', "(after a while) Because it's the only time nobody's telling me what to do. Mum, the stewards, the school, the man in the chip shop. In a car it's just me and the next corner."],
          ['pip', "The corner doesn't tell you anything. It just waits to see if you're any good."],
          ['jay', '(beat) Yeah.'],
          ['pip', "That's it? 'Yeah'?"],
          ['jay', "That's a lot, for me."],
          ['caption', 'Out of the city, west, the buildings thinning, dust blowing across the road.'],
          ['caption', 'The transporter signals left, carefully, a full ten seconds early, like a lorry driver with nothing to hide.'],
          ['pip', "Cinder Creek. Nobody takes a racing car to Cinder Creek. The only things in Cinder Creek are lorries, dust and a man who sells cactuses from a van."],
          ['jay', 'Cacti.'],
          ['pip', "Don't you start. You sound like Milo."],
        ],
      },
      {
        spawn: [
          { id: 'mech1', char: 'mechanic', faction: 'castellane_racing', hostile: false, at: 'truckstop_lockup', behavior: 'idle' },
          { id: 'mech2', char: 'mechanic', faction: 'castellane_racing', hostile: false, at: 'truckstop_lockup', behavior: 'idle' },
          { id: 'mech3', char: 'mechanic', faction: 'castellane_racing', hostile: false, at: 'truckstop_lockup', behavior: 'idle' },
        ],
      },
      {
        goto: 'truckstop_lockup', vehicle: false, stop: true, radius: 6,
        objective: 'Park up out of sight and get a look inside the lock-up',
        say: [
          ['caption', 'The transporter has backed up to a row of lock-ups behind the truck stop. One door is half open. Inside, a strip light and the sound of a socket wrench.'],
          ['pip', '(climbing out, whispering) Quietly. Like a mechanic. Mechanics are very quiet until they drop something.'],
        ],
      },
      {
        scene: { at: 'truckstop_lockup', cast: ['pip', 'jay', 'mechanic'] },
        say: [
          ['caption', "Through the gap under the door: Teddy's gold Zephyr up on stands, bonnet off, and on a chain hoist above it an engine going in with a turbocharger the size of a dustbin."],
          ['pip', '(whispering) That\'s banned.'],
          ['jay', 'How banned?'],
          ['pip', "That's banned in three countries and a theme park."],
          ['jay', 'A theme park.'],
          ['pip', "There was a go-kart track. There was an incident. There's a plaque."],
          ['caption', 'She takes photos on her phone, one after another, with the shutter sound on. Jay reaches over without a word and turns the sound off.'],
          ['pip', '(mouthing) Sorry.'],
        ],
      },
      {
        if: 'd20_the_gorse_file',
        then: [{
          scene: { at: 'truckstop_lockup', cast: ['pip', 'jay'] },
          say: [
            ['pip', '(very low) Castellanes. Fifty years of cheating and they still can\'t do it quietly.'],
            ['jay', 'Some families have a gift.'],
          ],
        }],
        else: [{
          scene: { at: 'truckstop_lockup', cast: ['pip', 'jay'] },
          say: [
            ['pip', "(very low) Castellanes. Of course it's Castellanes. It's always Castellanes. Their name's on the bins."],
          ],
        }],
      },
      { spawnCar: 'teddy_road', type: 'zephyr', at: 'truckstop_lockup', color: CASTELLANE_GOLD, name: "Teddy's road car" },
      { spawn: [{ char: 'teddy', at: 'truckstop_lockup', behavior: 'idle', hostile: false }] },
      {
        scene: { at: 'truckstop_lockup', cast: ['teddy', 'mechanic', 'pip', 'jay'] },
        say: [
          ['caption', "A gold road car crunches up the gravel and stops. Teddy Castellane gets out in a polo shirt and sunglasses, swinging his keys."],
          ['caption', 'He walks straight into the lock-up without seeing the two people behind the bins.'],
          ['teddy', "Morning. They said you'd moved the car out here for the— (he stops)"],
          ['caption', 'He looks at the dustbin-sized turbo for a long moment. He takes his sunglasses off.'],
          ['teddy', "That's not my engine. (beat) Where's my engine?"],
          ['mechanic', "(wiping his hands, not meeting his eye) Your uncle's orders, Mr Teddy. Don't worry about it."],
          ['teddy', 'How long has that been in there?'],
          ['mechanic', 'Since round two, Mr Teddy. Your uncle said not to trouble you with it. Said you had enough on.'],
          ['caption', 'Teddy goes white, from the collar up, like a glass filling with milk.'],
          ['teddy', '(quietly) I thought I was just good.'],
          ['pip', '(standing up from behind the bins before Jay can stop her) You are good. You\'re just not two seconds good. Nobody is.'],
          ['teddy', '(spinning round) Marlow? What are you— were you behind the BINS?'],
          ['pip', 'Yes. Focus.'],
        ],
      },
      { spawnCar: 'gs_car1', type: 'sovereign', at: 'cinder_truckstop', color: GS_TEAL },
      { spawnCar: 'gs_suv', type: 'tern', at: 'cinder_truckstop', color: GS_TEAL },
      {
        scene: { at: 'truckstop_lockup', cast: ['gs_staff', 'teddy', 'pip', 'jay'] },
        say: [
          ['caption', 'Two teal cars swing into the truck stop and stop across the lane: a Sovereign and a big Tern, Castellane Guest Services crests on the doors.'],
          ['caption', 'A man in a teal blazer leans out of the Tern with a loudhailer.'],
          ['gs_staff', '(loudhailer) Good afternoon! We\'re here to tidy up.'],
          ['teddy', 'Tidy what?'],
          ['gs_staff', "(loudhailer) Everything you've seen, Mr Castellane. Starting with your friends. (beat) It's nothing personal. We'd love your feedback afterwards."],
          ['caption', 'He holds out a printed card through the window. Nobody goes to take it.'],
          ['jay', '(to Pip, very calm) Car. Now.'],
          ['pip', '(grabbing Teddy\'s sleeve) You\'re with us. Move.'],
          ['teddy', "I've got a car!"],
          ['pip', "You've got a GOLD car. Move!"],
        ],
      },
      { join: ['teddy'] },
      { getIn: 'pip_car', objective: 'Get Pip and Teddy out of there' },
      { music: 'action', checkpoint: true },
      {
        spawn: [
          Object.assign(driver('gs_driver1', 'gs_car1', 'gs_car1', 'pip_car'), { weapon: 'pistol' }),
          Object.assign(driver('gs_driver2', 'gs_suv', 'gs_suv', 'pip_car'), { weapon: 'smg' }),
        ],
      },
      {
        goto: 'speedway_pits', vehicle: 'pip_car', stop: true,
        objective: 'Back to the Speedway pits, with the teal cars behind you',
        say: [
          ['caption', 'Out of the truck stop sideways, gravel everywhere, the Tern so close behind that Jay can read its number plate in the mirror. It says GUEST 4.'],
          ['teddy', "(in the back seat, white, both hands on Pip's headrest) They're shooting at me. I'm a Castellane. They work for me."],
          ['teddy', '(beat) Do they work for me?'],
          ['pip', 'They work for whoever\'s paying.'],
          ['teddy', "Uncle Leo's paying."],
          ['pip', "Then they work for Uncle Leo, and Uncle Leo's having a tidy-up. Get your head down."],
          ['caption', 'The Sovereign tries to nudge the Drifter\'s back wheel. Jay lets it, then doesn\'t, and the Sovereign finds itself having a long, thoughtful conversation with a fence.'],
          ['jay', '(to the Drifter) Good. That was good.'],
          ['teddy', '(watching Jay drive, the shock wearing off and something else coming in) You brake late.'],
          ['jay', 'You brake early.'],
          ['teddy', '(beat) ...I do brake early.'],
          ['caption', 'Teddy takes his phone out and starts typing.'],
          ['pip', "He's taking notes. Teddy, stop taking notes. People are shooting."],
          ['teddy', 'They can shoot. This is valuable.'],
          ['caption', 'A bullet takes the Drifter\'s wing mirror clean off. Jay looks at the empty bracket.'],
          ['jay', '(quietly) Damn. I liked that mirror.'],
          ['pip', "It's all right. There's another one. On the other side. (beat) For now."],
          ['teddy', "(still typing) 'Doesn't flinch at gunfire.' Is that a technique or a personality?"],
          ['jay', 'Yes.'],
          ['caption', "South, back into The Bowl, the grandstands rising ahead. At the Speedway gate there are TV vans, a school trip and a man selling flags."],
          ['caption', "The teal cars slow, think about it, and peel away. Too many witnesses."],
        ],
      },
      { music: 'hope' },
      { leave: ['pip', 'teddy'] },
      {
        scene: { at: 'speedway_pits', cast: ['teddy', 'pip', 'jay'] },
        say: [
          ['caption', 'Bay nine. Teddy Castellane sits on a stack of old tyres with his elbows on his knees, looking at the floor as if there might be a better engine down there somewhere.'],
          ['teddy', "Every lap this month. Every single lap, I thought, 'That's me. That's me getting good.'"],
          ['pip', "(sitting next to him, not too close) You were good. Before. You're quick into one. You're lazy out of three, but you're quick into one."],
          ['teddy', "(a short, wet laugh) Thanks."],
          ['pip', 'Tell the stewards.'],
          ['teddy', 'Uncle Leo owns the stewards.'],
          ['pip', "Then tell them loudly. In front of people. Lampposts hate being looked at."],
          ['teddy', '(a long pause) Will you be there?'],
          ['pip', "I'll be on the grid. I'm always on the grid. (beat) I'm just not allowed in a car."],
          ['caption', 'Jay picks up the Drifter\'s broken wing mirror from the passenger seat and puts it on the workbench, very neatly, as though it might want to be fixed later.'],
          ['jay', '(to Teddy, on his way out) Brake later.'],
          ['teddy', '(looking up) Right.'],
          ['pip', "(calling after Jay) And mind the road! (to Teddy, before he can ask) Don't. I don't know either."],
        ],
      },
      { music: 'off' },
      { text: 'pip', message: "Teddy's told them. He stood on the steward's table. ON IT. The lamppost had to look up. Classic is Saturday. Don't be late, I've ironed something." },
    ],
  };

  // =====================================================================
  // dsr4 — The Southbay Classic
  // =====================================================================
  const dsr4 = {
    id: 'dsr4_southbay_classic',
    title: 'The Southbay Classic',
    giver: 'pip',
    start: 'speedway_pits',
    requires: ['dsr3_dirty_air'],
    time: 18,
    estMinutes: 11,
    summary: 'The series finale. Ten laps, the whole field, and a licence handed back on the grid.',
    // The beat sheet's second reward, Pip's spare Drifter, is in the lines only:
    // the engine has no vehicle unlocks as rewards (mission-format.md).
    reward: { money: 4000 },
    failIf: ['wrecked:pip_car'],
    steps: [
      pipCar('speedway_grid'),
      { music: 'off' },
      {
        camera: 'southbay_speedway', seconds: 4,
        say: [['caption', 'The Southbay Classic. The last round of the Summer Series. Six in the evening, the sun going gold over the back straight, and a proper crowd in the main stand for once.']],
      },
      {
        scene: { at: 'speedway_grid', cast: ['pip', 'marshal', 'teddy', 'jay'] },
        say: [
          ['caption', "On the grid, a marshal in an orange tabard walks down the line of cars holding something small and laminated in front of him, like a waiter carrying a very important soup."],
          ['marshal', '(stopping at the white Drifter, clearing his throat) Miss Marlow.'],
          ['pip', "If it's about the lamppost, I stand by it."],
          ['marshal', "(holding out the card) Your racing licence. Reinstated, as of this morning. Following, er, new information about the conduct of other parties."],
          ['caption', 'Pip takes it. She turns it over. Her own photo, from when she was seventeen, looking furious. She looks at it for a long moment.'],
          ['marshal', "Stewards' apologies, Miss Marlow. They'd like you to know they're embarrassed."],
          ['pip', 'Good. Tell them to stay embarrassed. It suits them.'],
          ['marshal', "(writing it down, carefully) 'Stay... embarrassed.' I'll pass that on."],
          ['caption', "Behind him, up on the steward's balcony, a tall grey man in a grey suit looks down at the grid, does nothing, and goes inside."],
          ['jay', 'Lamppost.'],
          ['pip', 'Lamppost.'],
        ],
      },
      {
        scene: { at: 'speedway_grid', cast: ['pip', 'teddy', 'jay'] },
        say: [
          ['caption', 'Pip holds out the Drifter\'s keys. To Jay.'],
          ['jay', "You've got your licence back."],
          ['pip', 'I know. Look at it. It\'s laminated.'],
          ['pip', 'You got us here. Finish it.'],
          ['jay', '(not taking the keys yet) It\'s your team.'],
          ['pip', "And next season I'll drive it. This one's yours. (pushing the keys into his hand) Don't argue. Arguing's my thing. You'll be bad at it."],
          ['caption', 'Teddy Castellane comes over from the gold car in the slot beside them. No mechanic carrying his water bottle today. He carries it himself.'],
          ['teddy', '(to Jay) Old engine. Same as yours, near enough. No more two seconds.'],
          ['jay', 'Brake later.'],
          ['teddy', "I've been practising. (beat) On the drive to my uncle's. He wasn't pleased. He's not speaking to me."],
          ['pip', "Is that bad?"],
          ['teddy', "It's the quietest dinners I've ever had. I think I like them."],
        ],
      },
      {
        if: 'd23_odie_wren',
        then: [{
          scene: { at: 'speedway_grid', cast: ['pip', 'jay'] },
          say: [
            ['pip', "(quietly, phone in her hand) Gran's watching. On the little telly in the lighthouse. Hob fixed the aerial."],
            ['pip', 'She says take turn three wider.'],
            ['jay', 'Is she right?'],
            ['pip', "She's always right. It's unbearable. (beat) She also says 'tell the driver nobody wins a race on the grid'. I said he knows. She said tell him anyway."],
          ],
        }],
        else: [{
          scene: { at: 'speedway_grid', cast: ['pip', 'jay'] },
          say: [
            ['caption', 'Pip looks across the track to the winners\' enclosure, and the old honours board on its back wall, where fifty years ago one name was painted over.'],
            ['pip', 'One day there\'s going to be a Marlow on that board who gets to stay there.'],
            ['jay', 'Today?'],
            ['pip', "Today's not on the board. Today's the Summer Series. It gets a cup the size of an egg cup. (beat) I want the egg cup, Jay. I really want the egg cup."],
          ],
        }],
      },
      {
        if: 'dsf4_check_ride',
        then: [{
          camera: 'speedway_grid', seconds: 4,
          say: [
            ['caption', 'A small yellow plane comes in low over the main stand, rocks its wings left, right, left, and climbs away towards the island.'],
            ['pip', "Is that Hob? Is he waving the wings? (beat) He's waving the wings."],
            ['jay', '(not looking up) Showing off.'],
            ['pip', "He's allowed. You got a ten. Nobody gets a ten."],
          ],
        }],
        else: [{
          camera: 'speedway_grid', seconds: 4,
          say: [
            ['caption', 'Up in the commentary box, Monty Sprake puts on his headset, taps the foam microphone twice, and takes a deep breath, the way a diver does.'],
            ['monty', "(PA) Good evening, Southbay! It's the Southbay Classic! Ten laps! Eight cars! One cup the size of an egg cup! Let's go racing!"],
          ],
        }],
      },
      {
        getIn: 'pip_car', objective: 'Grid slot four. Ten laps',
        say: [
          ['pip', "(walking him round to the driver's door) Ten laps is long. The tyres go off after six. Don't fight her on seven and eight. Let her slide a bit. She likes a slide. She's old."],
          ['jay', 'So am I.'],
          ['pip', "You're not old. You're dry. It's different. Old is when you complain about the radio."],
          ['jay', '(climbing in) Turn the radio down.'],
          ['pip', 'Funny.'],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        phone: 'pip',
        say: [
          ['pip', '(radio, from the folding chair, which now has her name on the back in marker pen) Radio check.'],
          ['jay', 'Check.'],
          ['pip', "Teddy's on pole, then Bruno, then the new works boy, Castellane's third car. Then us. Privateers behind. Lenny, Pearl, Wilf and Otto in the red."],
          ['pip', "Wilf's seventy-one now. He had a birthday. Be nice to him. Be nice to him by going past him quickly."],
          ['jay', '(to the Drifter, two fingers tapping the wheel) Last one. Then you can rest. I promise.'],
        ],
      },
      {
        race: {
          checkpoints: OVAL,
          laps: 10,
          rivals: [
            teddy(1.0),
            works('Bruno Sallis', 0.95),
            works('Dario Venn', 0.93),
            privateer(0, 0.9),
            privateer(1, 0.88),
            privateer(2, 0.84),
            privateer(4, 0.9),
          ],
        },
        objective: 'Win the Southbay Classic',
        say: [
          ['monty', "(PA) And they're away in the Southbay Classic! Teddy Castellane leads into turn one, and from slot four, for Marlow Racing, it's... Jack Mackerel!"],
          ['pip', '(radio) Mackerel. Fine. Good. A fish. We\'re sponsored by a prawn, we can be a fish.'],
          ['monty', 'Lap two, and the field is tight, ladies and gentlemen, tight as a new shoe! Bruno Sallis, Dario Venn, Jake Murphy—'],
          ['pip', "(radio) That's an eight into one. Nine out of three. Don't let it go to your head. It's going to my head."],
          ['monty', "Joe Mercury for Marlow Racing! Up to third! He's had more names this summer than wins, and he's had a lot of wins!"],
          ['pip', "(radio) Bruno's leaving the door open at three. Same as Teddy used to. Must be the team. They teach it."],
          ['monty', 'Wilf Gantry waves to his wife from the back straight! She waves back! It\'s their anniversary! Forty-four years! Wilf, eyes on the road!'],
          ['pip', "(radio) Lap five. Halfway. You're second. Breathe. Do you breathe? I've never heard you breathe."],
          ['jay', 'Quietly.'],
          ['caption', 'Lap six. Teddy and the white Drifter side by side down the back straight, a hand\'s width apart, neither giving an inch and neither touching. The whole main stand stands up.'],
          ['monty', '(quieter, almost reverent) That is fair racing, ladies and gentlemen. Look at that. And I have seen a lot of the other kind.'],
          ['pip', "(radio) Tyres are going. Let her slide. Let her— lovely. That's a nine and a half. That's the best slide I've seen since— never mind. Lovely."],
          ['monty', 'Lap eight! Teddy Castellane leads by a whisker! A whisker! Jem Mersey— Jim Mercy— the Marlow car is on the whisker!'],
          ['pip', "(radio) Teddy's braking later. He's actually braking later. You taught him that. You IDIOT. (beat) Good. That's good. Beat him anyway."],
          ['monty', "LAST LAP of the Summer Series! The gold car and the white car! Old engines, folks, both of them, and you would not know it!"],
          ['caption', "On the radio, for a second, nothing. Then Pip, very quiet, nothing like her usual voice."],
          ['pip', '(radio) Go on, Jay.'],
          ['monty', "Out of turn three! Into the run to the line! It's the Marlow car! It's the MARLOW car! Marlow Racing win the Southbay Classic!"],
        ],
      },
      { music: 'triumph' },
      {
        scene: { at: 'speedway_grid', cast: ['pip', 'teddy', 'monty', 'jay'] },
        say: [
          ['caption', 'The Drifter stops on the line with steam coming from somewhere it shouldn\'t. Pip is over the pit wall before it has finished rolling.'],
          ['caption', 'Teddy pulls up behind. He takes off his helmet, walks to Pip, and holds out his hand. She shakes it.'],
          ['caption', 'Both of them are pretending it\'s nothing. Both of them are very bad at pretending.'],
          ['teddy', 'Good race.'],
          ['pip', 'It was all right.'],
          ['teddy', 'It was a good race, Marlow.'],
          ['pip', '(looking anywhere else) ...It was a good race.'],
          ['monty', "(PA, enormous) Ladies and gentlemen, the winner of the Southbay Classic, for Marlow Racing... Jay... Mer... (a long, agonised pause) ...Murphy!"],
          ['jay', '(under his breath) Close.'],
          ['caption', 'In the main stand, somebody shouts "IT\'S MERCER!" Monty does not hear them. Monty is waving.'],
          ['teddy', 'Next season. Me and you, Pip. No uncles.'],
          ['pip', 'No uncles.'],
          ['teddy', "(walking off, over his shoulder) And I'm still faster into one."],
          ['pip', "(shouting after him) You're LAZY out of THREE!"],
        ],
      },
      {
        scene: { at: 'speedway_grid', cast: ['pip', 'jay'] },
        say: [
          ['caption', 'The crowd thins. A marshal hands Pip a silver cup the size of an egg cup. She holds it in both hands as if it might hatch.'],
          ['pip', '(not looking at Jay, digging in her pocket) Here. For you.'],
          ['caption', 'A set of keys on a keyring shaped like a prawn.'],
          ['pip', "Team's spare Drifter. It's in the back of the garage. It's got fewer stickers. One fewer. The wart clinic dropped us."],
          ['jay', 'Why?'],
          ['pip', "We won too much. Bad for their image. They want to look like they need customers."],
          ['jay', '(turning the prawn over) Damn, Pip. Thanks.'],
          ['pip', "Don't. You'll make it weird. It's a car. You like cars. I'm being practical."],
          ['caption', 'Jay walks round the old white Drifter once, slowly, and pats her roof twice, the way you pat a horse that has done more than you asked.'],
          ['jay', '(to the car) Good car.'],
          ['pip', 'And mind the road.'],
        ],
      },
      {
        if: 'd23_odie_wren',
        then: [{
          scene: { at: 'speedway_grid', cast: ['pip', 'jay'] },
          say: [
            ['jay', "You know where that's from now."],
            ['pip', '(a small smile, at the egg cup) Gran. Apparently it\'s genetic. Like the temper.'],
            ['pip', "She's going to ring me about turn three. I didn't take it wider. I'm going to tell her you did."],
          ],
        }],
        else: [{
          scene: { at: 'speedway_grid', cast: ['pip', 'jay'] },
          say: [
            ['pip', '(frowning) I keep saying that. Where do I get that from?'],
            ['jay', '(after a moment) Somewhere good, probably.'],
          ],
        }],
      },
      { music: 'off' },
      { text: 'pip', message: 'Egg cup is on the kitchen table. Mum asked what it was. I said a trophy. She said "for what" and I said driving and she put her glasses on and looked at it for ages. Then she said "minor fault: it\'s dusty". She polished it. SHE POLISHED IT.' },
    ],
  };

  D.side.push({ id: 'dside_speedway', title: 'Summer Series', giver: 'pip', unlockAfter: 'd10_heritage_run', missions: [dsr1, dsr2, dsr3, dsr4] });
})();
