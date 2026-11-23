/*
 * data/dlc-side-flying.js — "Chasing the Firecrest", side chain MARKS OUT OF
 * TEN (dside_flying, dsf1 to dsf4): Hob Finnegan's flying school.
 *
 * Hob has decided that a man who once landed an airliner on his runway had
 * better learn to fly properly, and he has a sponsor, a record, a doughnut
 * round and forty years of never giving anybody a ten. A banner along
 * Sandpiper Beach (upside down), the club record round the Ironside chimneys
 * (broken, to Hob's enormous and badly hidden grief), a doughnut round by
 * helicopter to the clinic, the observatory and a twelve-year-old at Halcyon,
 * and the check ride: a landing at Vicehaven International between the
 * airliners, home past the clock and the light, and a crosswind at the end.
 *
 * Loaded after dlc-side-lessons.js. See docs/DLC_BIBLE.md (sections 1, 4, 7,
 * 10, 11) and docs/dlc/beats-side.md (MARKS OUT OF TEN, DECISIONS 9 to 12).
 * Side jobs float: the chain opens after d18_ground_school and can be played
 * before or after any later main job, so Dess is mentioned only inside `if:
 * 'd23_odie_wren'`. Radio is the `phone` step (or `say` lines marked
 * "(radio)"); Hob rides in the plane only in dsf4. Marks, in order: 5 (dsf1),
 * 8 (dsf2), 6, 7 and a disputed five and a half (dsf3), then the first ten
 * in forty years (dsf4). Reads dsr1_oval_sprint (dsf1), d23_odie_wren (dsf3,
 * dsf4) and dlc_blog_on (dsf3). Sets nothing; the finale's id
 * dsf4_check_ride is read by d30 (the SHE WON banner, "Ten. Again.").
 * No riddles, no comment cards, no subscriber numbers.
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const CLUB_YELLOW = 0xf2c500;
  const CLUB_WHITE = 0xf2f2ee;

  // ------------------------------------------------------------ helpers
  /** Hob's yellow Skylark, PALOMA FLYING CLUB on the cowling in green. */
  const skylark = (at) => ({ spawnCar: 'hob_skylark', type: 'skylark', at, color: CLUB_YELLOW, name: "Hob's Skylark" });
  /** The club's little white Sparrow helicopter. */
  const sparrow = (at) => ({ spawnCar: 'club_sparrow', type: 'sparrow', at, color: CLUB_WHITE, name: "the club's Sparrow" });

  // =====================================================================
  // dsf1 — Banner Day
  // =====================================================================
  const dsf1 = {
    id: 'dsf1_banner_day',
    title: 'Banner Day',
    giver: 'hob',
    start: 'field_apron',
    time: 11,
    estMinutes: 9,
    summary: 'The Sandpiper Prawn Shack has paid for a banner. In prawns.',
    reward: { money: 1500 },
    failIf: ['wrecked:hob_skylark'],
    steps: [
      skylark('field_apron'),
      { music: 'off' },
      {
        camera: 'field_apron', seconds: 4,
        say: [['caption', 'Paloma Field, eleven in the morning. Heat coming off the runway in sheets. The hangar kettle is on. The hangar kettle is always on.']],
      },
      {
        scene: { at: 'field_apron', cast: ['hob'] },
        say: [
          ['caption', 'Hob, by the yellow Skylark, with a long roll of canvas under one arm and a coil of tow rope over the other shoulder. He looks like a man about to propose to an aeroplane.'],
          ['hob', "Right then. Good news. The club's got a sponsor."],
          ['jay', 'Who?'],
          ['hob', 'The Sandpiper Prawn Shack. On the promenade. Blue hut, big prawn on the roof, the prawn has a face.'],
          ['hob', 'They want a banner towed along the beach at lunchtime. Low and slow, so the sunbathers can read it.'],
          ['jay', "What's the banner say?"],
          ['hob', 'NOW WITH FEWER BONES.'],
          ['jay', 'Fewer than what?'],
          ['hob', "Didn't ask. They paid in prawns. Freezer's full. I've had prawns for breakfast three days running. I've started to dream in prawns."],
          ['caption', 'He unrolls a yard of it on the apron to show off the lettering. Red capitals, a bit wobbly on the B. Somebody has drawn a small smiling prawn at the end.'],
          ['hob', 'Hand-painted. By the owner. With a mop, I think.'],
          ['hob', "Brief's simple. Over the bay to the causeway, down the beach past the towers, over the skate park, along the promenade where he can see it, and home."],
          ['hob', "Low means low. Fifty metres, give or take. Not low like 'into the sea'."],
          ['hob', "The sea's the one bit of the bay I can't get my deposit back on."],
          ['jay', "You're not coming?"],
          ['hob', "Somebody's got to mind the kettle. I'll be on the radio. With a biscuit. Watching you through these."],
          ['caption', 'He taps a pair of binoculars round his neck so old the strap has been mended with a shoelace.'],
          ['hob', "And if you miss a ring, go round again. The sea's not going anywhere. Neither's the beach. Neither am I."],
        ],
      },
      {
        if: 'dsr1_oval_sprint',
        then: [{
          scene: { at: 'field_apron', cast: ['hob'] },
          say: [
            ['jay', "The prawn shack sponsors Pip's car too."],
            ['hob', "They sponsor everything. They've got more prawns than sense. Last week they sponsored a pigeon."],
            ['jay', 'A pigeon.'],
            ['hob', 'Racing pigeon. It came fourth. They gave it a prawn. It was sick on the trophy.'],
          ],
        }],
        else: [{
          scene: { at: 'field_apron', cast: ['hob'] },
          say: [
            ['jay', 'Why does a prawn shack want a plane?'],
            ['hob', "Because Castellane's hotels have got a blimp, son. A gold one. It goes up and down the Strand saying CHAMPIONS SINCE DAY ONE."],
            ['hob', "The prawn man can't afford a blimp. He can afford me. That's the story of my life in one sentence."],
          ],
        }],
      },
      { music: 'hope' },
      { getIn: 'hob_skylark', objective: "Get in the Skylark (the banner's hooked on)" },
      {
        phone: 'hob',
        say: [
          ['hob', '(radio, crackling, a teaspoon going round a mug somewhere behind him) Paloma Base to Skylark. Radio check. Say something. Over.'],
          ['jay', 'Something.'],
          ['hob', "No, you say 'loud and clear' and then you say 'over'. Say 'over' when you're done talking. Over."],
          ['jay', 'Loud and clear. Over.'],
          ['hob', "Good. Lovely. You're cleared to go. Over."],
          ['jay', 'Going. Over.'],
          ['hob', "You don't have to say 'over' after 'going'. Over."],
          ['jay', 'You just did.'],
          ['hob', "I'm allowed. I'm the base. Over. (beat) Over and out. Go on, she's waiting."],
        ],
      },
      {
        fly: 'causeway_south', height: 90, radius: 60,
        objective: 'Cross the bay to Sandpiper Beach',
        say: [
          ['caption', 'The Skylark rattles down the runway and lifts. Behind it, thirty metres of canvas unrolls off the grass and snaps out straight in the slipstream.'],
          ['hob', "(radio) Banner's out. I can see it from here. It's... out. That's the main thing. Over."],
          ['hob', '(radio) Now, a banner. A banner is a sail you\'re not allowed to use. It wants to pull you back and down. Respect the banner. Over.'],
          ['jay', 'Respecting it. Over.'],
          ['hob', "(radio) It'll feel like flying with a wardrobe on a string. Be gentle with the turns or it'll swing round and read itself. Over."],
          ['jay', 'What do prawns taste like after three days?'],
          ['hob', "(radio) Like regret, son. With a bit of lemon. Over."],
          ['hob', '(radio) They gave me a bucket of the little ones as a bonus. The little ones are worse. They look at you.'],
          ['jay', '(to the plane, quietly) Easy. Just a big flag. You\'ve got this.'],
          ['caption', 'Ahead, the long pale curve of Sandpiper Beach, striped with towels and umbrellas, and the causeway running out to it over the water.'],
        ],
      },
      {
        fly: 'sandpiper_beach', height: 50, radius: 50,
        objective: 'Down the beach, low',
        say: [
          ['hob', "(radio) Down you go. Fifty. Throttle back, nose level, let the banner settle. Nice and lazy, like you're a Sunday."],
          ['caption', '(Below, a whole beach looks up and reads it.)'],
          ['caption', '(A man under a striped umbrella lowers his newspaper. A girl on a lilo points. Somebody waves a sandwich.)'],
          ['hob', '(radio) They\'re waving! They\'re waving at the banner! That\'s advertising, that is. That\'s commerce. Over.'],
        ],
      },
      {
        fly: 'lifeguard_tower_7', height: 45, radius: 45,
        objective: 'Past lifeguard tower 7',
        say: [
          ['caption', 'Ahead, a white-and-red lifeguard tower on stilts, a big lamp on its rail, and on the platform a young man in red shorts with a whistle and a pair of binoculars of his own.'],
          ['hob', "(radio) Tower Seven coming up. That's Gully's. He's a stickler. Wave if you like. Don't, actually."],
        ],
      },
      {
        phone: 'gully',
        say: [
          ['gully', '(on the beach channel, very official) Sandpiper Tower Seven to the yellow plane. Sandpiper Tower Seven to the yellow plane.'],
          ['jay', 'Go ahead.'],
          ['gully', "You're too low. You're too loud. And you're upside down."],
          ['jay', "I'm not upside down."],
          ['gully', 'Your banner is. It says SENOB REWEF HTIW WON.'],
          ['jay', '(to the plane, quietly) You could have said.'],
          ['caption', '(A pause on the radio while three people look out of three windows.)'],
          ['hob', "(cutting in from the hangar) That's not your fault, Skylark. Over."],
          ['gully', "Whose fault is it, then?"],
          ['hob', 'A man with a mop. Over.'],
          ['gully', "There are kids on my beach trying to sound it out. One of them thinks it's a spell. Over."],
        ],
      },
      {
        fly: 'skate_park', height: 50, radius: 45,
        objective: 'Over the skate park',
        say: [
          ['caption', '(At the skate park, a row of kids on the lip of the bowl see the banner and hold their boards up over their heads like a guard of honour.)'],
          ['hob', '(radio) Skaters like it. Skaters like anything that\'s upside down. It\'s a whole culture.'],
          ['caption', '(Behind the plane, faint but unmistakable over the radio: a long, furious blast on a lifeguard\'s whistle.)'],
          ['jay', 'Is he whistling at me?'],
          ['gully', "(radio) I'm whistling at you."],
          ['jay', "You can't whistle at a plane."],
          ['gully', '(radio) I can whistle at anything on my beach. I whistled at a seagull for an hour once. It left.'],
          ['hob', '(radio) Did it?'],
          ['gully', '(radio) Eventually.'],
        ],
      },
      {
        fly: 'sandpiper_promenade', height: 55, radius: 45,
        objective: 'Along the promenade, then home',
        say: [
          ['caption', '(Along the promenade: surf shops, pastel motels, ice-cream queues. And outside a blue hut with a big smiling prawn on its roof, a man in an apron.)'],
          ['caption', '(The Prawn Shack\'s owner, on the promenade, salutes it with a prawn.)'],
          ['hob', "(radio) That's him. That's the sponsor. Waggle at him. No, don't waggle, you'll tie the banner in a knot. Just think kindly at him."],
          ['jay', 'Thinking kindly.'],
          ['hob', "(radio) Lovely. He's thrilled. He's got no idea it's backwards. Nobody tell him. Over."],
        ],
      },
      {
        land: 'paloma_field', radius: 40,
        objective: 'Back across the bay and land at Paloma Field',
        say: [
          ['hob', '(radio) Right then. Home. Long way round the big wheel, please, the funfair people complain.'],
          ['jay', 'How many members has the club got?'],
          ['hob', '(radio) Four. All retired. They mostly drink tea and argue about clouds.'],
          ['hob', "(radio) Mr Okafor thinks every cloud is a cumulonimbus. Every one. You could show him a cotton bud. 'Cumulonimbus, Hob.'"],
          ['jay', 'Anyone ever get a ten off you?'],
          ['hob', '(radio, a long crackle) Once. Back in... (beat) No. Never. I was thinking of a dream I had.'],
          ['jay', 'What happened in the dream?'],
          ['hob', "(radio) Man landed so soft I didn't notice. I woke up and gave him a seven anyway. Out of habit. Over."],
          ['hob', '(radio) Line her up. Drop the banner on the grass before the threshold, there\'s a lever by your knee. The red one. Not the other red one.'],
          ['caption', '(Thirty metres of upside-down advertising settles on the grass of Paloma Field like a very long, very tired snake.)'],
          ['hob', '(radio) Now the plane. Gently. Gently.'],
        ],
      },
      { music: 'off' },
      {
        scene: { at: 'field_apron', cast: ['hob'] },
        say: [
          ['caption', 'Hob walks out with his clipboard, a mug in the other hand. He stops by the banner, which lies in a heap on the apron. He looks at the banner. He looks at Jay. He looks at the banner.'],
          ['hob', '(turning one corner of it over with his boot) Huh. So it is.'],
          ['caption', 'He writes. It takes a while. He licks the pencil once, which nobody has done since pencils were invented.'],
          ['hob', 'Five.'],
          ['hob', "The banner was upside down. That's not your fault."],
          ['hob', "(beat) That's not not your fault."],
          ['jay', 'I hooked it on the way you showed me.'],
          ['hob', "I know. That's the 'not not' part. I showed you upside down. I'm sharing the five. I'm giving myself a five as well."],
          ['jay', 'Generous.'],
          ['hob', "I'm a generous man. Take some prawns."],
          ['jay', 'No.'],
          ['hob', '(already loading a carrier bag) Take some prawns.'],
        ],
      },
      { text: 'gully', message: 'Your banner said HTIW WON all morning. Kids think it\'s a code. My supervisor took my whistle. Thanks for nothing. Gully (Tower 7)' },
    ],
  };

  // =====================================================================
  // dsf2 — Chimney Pots
  // =====================================================================
  const dsf2 = {
    id: 'dsf2_chimney_pots',
    title: 'Chimney Pots',
    giver: 'hob',
    start: 'field_apron',
    time: 15,
    estMinutes: 10,
    summary: "Hob's record round the Ironside chimneys has stood for twenty years. Hob would like it to stand for twenty more.",
    reward: { money: 2000 },
    failIf: ['wrecked:hob_skylark'],
    steps: [
      skylark('field_apron'),
      { music: 'off' },
      {
        scene: { at: 'hob_hangar', cast: ['hob'] },
        say: [
          ['caption', 'The flying club hangar. Doughnut boxes, a kettle, a dartboard with no darts. On the back wall, a photograph of a much younger Hob beside the Skylark, with hair.'],
          ['caption', 'Beside it, a hand-painted board, recently polished: CHIMNEY POTS RECORD. 3 MIN 11 SEC. H. FINNEGAN.'],
          ['jay', "You've polished that."],
          ['hob', "I dust it. Everything in here gets dusted. (beat) Fine. I polished it. It's my board."],
          ['hob', "The Chimney Pots. Club tradition. Twenty years nobody's touched my time. Mostly because nobody tries. Mostly because they're seventy."],
          ['hob', 'Course is simple. Out to Ironside. Clock starts over the scrapyard.'],
          ['hob', "Through the gap between the power station's two big chimneys. Low over the rail yard. Then along the refinery pipe racks at a height I'll call brave."],
          ['jay', 'How brave?'],
          ['hob', "Brave enough to read the labels on the pipes. Not brave enough to read the small print."],
          ['hob', "When I set it there were two chimneys. They built a third one in my way. I took it personally. I wrote to the council."],
          ['jay', 'What did they say?'],
          ['hob', "They said, 'It's a power station, Mr Finnegan.'"],
          ['hob', "I wrote back. I said, 'I know what it is.' That was the end of the correspondence."],
        ],
      },
      {
        scene: { at: 'hob_hangar', cast: ['hob'] },
        say: [
          ['hob', '(tapping the board, not quite casually) Course, you don\'t have to beat it. Nobody has to beat anything.'],
          ['hob', "It's just a board."],
          ['caption', 'He breathes on a corner of it and rubs it with his sleeve.'],
          ['hob', "From four out of ten to my record in a few weeks. A man could get dizzy. (beat) I'm dizzy. Off you go."],
        ],
      },
      { music: 'hope' },
      { getIn: 'hob_skylark', objective: 'Get in the Skylark' },
      {
        fly: 'ironside_scrapyard', height: 80, radius: 60,
        objective: 'Fly to Ironside. The clock starts at the scrapyard',
        say: [
          ['hob', '(radio) Paloma Base to Skylark. You\'re a long way from anywhere. Enjoy the view while it\'s free. Over.'],
          ['jay', 'How did you learn to fly?'],
          ['hob', '(radio) Crop-spraying. Out past the old orchards when I was nineteen. Mostly on the crops.'],
          ['jay', 'Mostly.'],
          ['hob', '(radio) There was a vicar. He was very good about it. He said it was the cleanest the church roof had been in years.'],
          ['caption', 'The bay slides away under the wing. The city comes up ahead: towers, the long grey ribbon of Grand Avenue, and far off to the south-west, a smudge of chimneys and smoke.'],
          ['jay', 'Why does Castellane want your field?'],
          ['hob', '(radio) He wants a helipad for his hotels. Guests land, guests get a gold golf buggy, guests never see a doughnut again.'],
          ['hob', '(radio) I want a field for my aeroplanes. Only one of us has forty hotels.'],
          ['jay', 'Only one of you has a record.'],
          ['hob', '(radio, pleased, then suspicious) ...For now. Over.'],
          ['jay', "(after a while, to the plane) I'll say this. You're growing on me."],
          ['hob', '(radio) Heard that. What\'s a plane, son?'],
          ['jay', "A car with one more way to crash."],
          ['hob', "(radio) Now you're listening. Over."],
          ['caption', 'Ironside comes up under the nose: refinery tanks like giant biscuit tins, rows of freight wagons, a scrapyard of crushed cars stacked like books, and three tall chimneys trailing grey.'],
          ['hob', "(radio) Stopwatch is in my hand. When you're over the scrapyard, I press it. Don't think about it. Think about it a bit."],
        ],
      },
      { music: 'action' },
      { timer: 35 },
      {
        fly: 'power_chimney_gap', height: 70, radius: 25,
        objective: 'Sector 1: between the chimneys',
        say: [
          ['hob', '(radio) Clock\'s running! Go!'],
          ['hob', "(radio) Line up the two big ones. Not the third one. The third one is a liar."],
          ['hob', '(radio) Wings level through the gap. Level. Level. LEVEL. Nice.'],
          ['hob', "(radio) Sector one. (beat) Up on me. Don't get excited."],
        ],
      },
      { timer: 30 },
      {
        fly: 'ironside_railyard', height: 35, radius: 35,
        objective: 'Sector 2: low over the rail yard',
        say: [
          ['hob', '(radio) Down, down, down to the rail yard. Under the gantry if you\'re mad, over it if you\'re me.'],
          ['caption', '(A freight driver leaning out of his cab waves a flask at the little yellow plane.)'],
          ['hob', '(radio) Level. Level. That\'s two-tenths down on me.'],
          ['hob', "(radio) (beat) Up. Two-tenths UP. Oh, for crying out loud."],
        ],
      },
      { timer: 30 },
      {
        fly: 'ironside_pipes', height: 25, radius: 30,
        objective: 'Sector 3: along the pipe racks, low',
        say: [
          ['hob', '(radio) Pipe racks. Last sector. Brave height. Remember what I said about the labels.'],
          ['hob', "(radio) Don't look at the labels. I said read them, I didn't say look at them."],
          ['jay', '(to the plane, the pipes flicking by under the wheels) Damn. Okay. Brave height.'],
        ],
      },
      {
        slowmo: 2,
        say: [['caption', '(Close enough to read the pipe labels. One of them says DO NOT CLIMB. Another, underneath, in marker pen, says HOB WAS HERE.)']],
      },
      { music: 'off' },
      {
        phone: 'hob',
        say: [
          ['caption', '(A long silence on the radio. Long enough to hear the kettle click off.)'],
          ['hob', '...Three minutes four.'],
          ['hob', '(very small) Crikey.'],
          ['hob', "That's a record. (beat) That's the record."],
          ['jay', 'Sorry.'],
          ['hob', "Don't be sorry. Sorry is for people who hit chimneys."],
          ['hob', "Be on the ground. Bring my aeroplane home. Over."],
        ],
      },
      { music: 'hope' },
      {
        land: 'paloma_field', radius: 40,
        objective: 'Home to Paloma Field',
        say: [
          ['hob', "(radio) It's a good time. (beat) It's a very good time."],
          ['hob', "(radio) Was there a tailwind?"],
          ['jay', "I don't know."],
          ['hob', "(radio) There was probably a tailwind. Ironside gets a tailwind in the afternoon. Off the chimneys. Warm air. Very helpful air."],
          ['jay', 'You set yours in the afternoon.'],
          ['hob', '(radio) ...In a headwind. Very famous headwind. People talked about it for weeks.'],
          ['hob', "(radio) I'm not upset. I want that understood. I'm delighted. I'm a delighted man. I've just put the kettle on again for no reason."],
          ['hob', "(radio) Over the island now. Runway's where you left it. I checked."],
        ],
      },
      { music: 'off' },
      {
        scene: { at: 'hob_hangar', cast: ['hob'] },
        say: [
          ['caption', 'The hangar. Hob, on a stepladder at the board with a tin of white paint and a small brush, painting out H. FINNEGAN. Very slowly. Every letter.'],
          ['caption', 'He changes tins. In red, carefully, he paints 3 MIN 04 SEC. J. MERCER.'],
          ['hob', '(without turning round) Eight.'],
          ['hob', "I'm not upset. I'm a grown man."],
          ['caption', 'He paints the R very hard.'],
          ['jay', 'You could keep your name up there too.'],
          ['hob', "I'll put mine underneath. Second place. Where I can see it every day and grow as a person."],
          ['jay', 'Why eight?'],
          ['hob', "Two off. One for scaring a man with a flask. One for being better than me. That one's not in the rules. I'm adding it to the rules."],
          ['caption', 'He climbs down, stands back and looks at the board with his head on one side for a long time.'],
          ['hob', "(quietly) Looks good, that. (beat) Don't tell anyone I said that either. I've got a list of things you can't tell anyone. It's getting long."],
        ],
      },
      { text: 'hob', message: 'Board is dry. I may have dusted it. Doughnut round Tuesday, Skylark is in for its check, bring a strong stomach and no opinions. Hob' },
    ],
  };

  // =====================================================================
  // dsf3 — Doughnut Drop
  // =====================================================================
  const dsf3 = {
    id: 'dsf3_doughnut_drop',
    title: 'Doughnut Drop',
    giver: 'hob',
    start: 'hob_hangar',
    time: 8,
    estMinutes: 10,
    summary: "Tuesday. The Skylark's in for its check. The doughnuts are going by helicopter.",
    reward: { money: 2000 },
    failIf: ['wrecked:club_sparrow'],
    steps: [
      sparrow('field_apron'),
      { music: 'off' },
      {
        scene: { at: 'hob_hangar', cast: ['hob'] },
        say: [
          ['caption', 'The hangar, eight in the morning. Doughnut boxes stacked to Hob\'s chin. Behind him the Skylark sits with its cowling off and its engine out on a trolley, like a patient in a very relaxed hospital.'],
          ['hob', '(from behind the boxes) Tuesday.'],
          ['jay', 'I know.'],
          ['hob', "The doughnuts go out on Tuesday. The war doesn't stop because a magneto's tired."],
          ['jay', "What's a magneto?"],
          ['hob', "It's a thing that's tired. Skylark's in for her check. So today, we go by Sparrow."],
          ['caption', 'Out on the apron, the club\'s helicopter: small, white, round, with a bubble canopy and a dent in one skid that Hob refers to as "character".'],
          ['hob', "Three drops. One: the night nurses at the private clinic. Rooftop helipad. They've been up all night doing knees. They need sugar."],
          ['hob', "Two: the astronomers at the observatory. Up all night looking at things that aren't there any more. They need jam."],
          ['hob', "Three. (He reads off a slip of paper, holding it at arm's length.) 'A special order across the bay. Halcyon sports field. A Professor Quill. Twelve.'"],
          ['hob', "'With a note.' (reading) 'One for the boy. He's never had a doughnut delivered by air. Please make it memorable.'"],
          ['jay', 'I know them.'],
          ['hob', "I gathered. The professor rang me four times to check I was real. Then he asked me how helicopters work. We were on the phone an hour. I still don't know."],
        ],
      },
      {
        if: 'd23_odie_wren',
        then: [{
          scene: { at: 'hob_hangar', cast: ['hob'] },
          say: [
            ['hob', "And a dozen jam for the fort. She says the helicopter's vulgar."],
            ['hob', "She'll eat them. She ate the last lot standing up so she could complain about them better."],
            ['jay', 'Sounds like her.'],
          ],
        }],
        else: [{
          scene: { at: 'hob_hangar', cast: ['hob'] },
          say: [
            ['hob', "And twelve jam for the lighthouse lady. I'll do those myself, on the bicycle. She doesn't like strangers."],
            ['hob', "She doesn't like me either. But she's used to me. That's as good as it gets with her."],
          ],
        }],
      },
      { music: 'hope' },
      { getIn: 'club_sparrow', objective: "Get in the club's Sparrow" },
      {
        phone: 'hob',
        say: [
          ['hob', "(radio) Paloma Base to Sparrow. Right then. Helicopters. It's a plane that's given up on going forwards. Over."],
          ['hob', '(radio) Up is up. Down is down. Everything else is a negotiation. Little bit of lift, little bit of nose, and don\'t do anything sudden.'],
          ['jay', 'Like what?'],
          ['hob', "(radio) Like anything. Helicopters hate surprises. So do doughnuts. That's why they get on. Over."],
          ['hob', "(radio) Clinic first. Big H on the roof. You can't miss it. People have. Over."],
        ],
      },
      {
        land: 'clinic_helipad', radius: 15,
        objective: "Drop 1: the clinic's rooftop helipad",
        say: [
          ['caption', 'The Sparrow lifts off the apron in a cloud of grass clippings and one escaped napkin, and noses up the hill towards the villas of Paloma Heights.'],
          ['hob', "(radio) Lovely. Now, a bit of history while you go. Castellane's hotels have a bakery. One bakery. The only bakery on the island."],
          ['hob', "(radio) Croissants. Every morning, every hotel, every café that wants his business. No doughnuts. Not one. Doughnuts are 'off-brand'."],
          ['jay', 'Croissants are fine.'],
          ['hob', "(radio, wounded) Croissants are just doughnuts that gave up. Over."],
          ['hob', '(radio) Look for the H. On the flat roof. Not the H on the hotel sign, that\'s an H for Hotel and it\'s on a wall.'],
          ['caption', 'Ahead, a white clinic among palm trees, and on its flat roof, a big painted H with two figures in pale-green scrubs waiting beside it.'],
          ['jay', "(to the Sparrow) Damn, that's a small H."],
          ['hob', "(radio) Bring her down soft. Doughnuts don't like bouncing. Neither do nurses."],
        ],
      },
      {
        say: [
          ['caption', '(Two nurses in scrubs duck under the rotor and take the box like it\'s a transplant.)'],
          ['caption', '(One of them opens the lid, closes her eyes, and breathes in for a long time.)'],
          ['hob', '(radio) That was a landing in the legal sense. Six.'],
          ['jay', 'Why six?'],
          ['hob', "(radio) You hit the H. You hit it twice. Once is a landing. Twice is a conversation. Over."],
        ],
      },
      {
        land: 'observatory_lawn', radius: 25,
        objective: 'Drop 2: the observatory lawn',
        say: [
          ['hob', "(radio) Up and over to the observatory. White dome, top of the hill. They'll be on the lawn in dressing gowns. They always are."],
          ['caption', 'The Sparrow skims the hill. Below, walled villas, swimming pools like dropped sweets, and at the top the white dome of the observatory with its slot half open.'],
          ['hob', "(radio) Hang on. I've got them on the phone. (muffled) Yes. Yes. (beat) They say you scared a comet."],
          ['jay', 'What?'],
          ['hob', "(radio) They're joking. (muffled) Are you joking? (beat) They don't joke. (beat) They might not be joking. Over."],
          ['hob', '(radio) Anyway they\'d like their jam. Flat lawn, left of the dome. Not the flower bed. The flower bed has a name. It\'s called Gerald.'],
        ],
      },
      {
        say: [
          ['caption', '(Three astronomers in dressing gowns and one in a woolly hat come across the lawn at a careful jog, holding out their hands for the box like it might be a meteorite.)'],
          ['hob', '(radio) Seven.'],
          ['hob', '(radio) Tidy. Suspiciously tidy. Who\'ve you been practising with?'],
          ['jay', 'You.'],
          ['hob', "(radio) Hm. Then that's a very good teacher. Put that in my seven."],
          ['hob', "(radio) Right then. Last one. Across the bay to Halcyon. Long hop. Mind the gulls. Over."],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', 'Jay! Did you know a Sparrow can carry four hundred doughnuts? I worked it out. With the seats out. Probably.'],
          ['jay', 'Morning, Milo.'],
          ['milo', "We're on the sports field. Grandad's wearing his jacket even though it's hot because he says it's an occasion."],
          ['prof_quill', '(in the background) It IS an occasion, Milo. One doesn\'t receive aerial catering in shirtsleeves.'],
          ['milo', "He's been here since seven. He brought a flask and a folding chair. He's measured the field."],
          ['jay', "Stay at the edge. Both of you. Rotors don't care how clever you are."],
          ['milo', "We're at the edge. We're behind the long-jump pit. I can see the sand from here. It's very safe sand."],
        ],
      },
      {
        land: 'halcyon_field', radius: 30,
        objective: 'Drop 3: across the bay to the Halcyon sports field',
        say: [
          ['caption', 'The Sparrow crosses the bay low and fast, its shadow skipping over the water, past the yachts of Coral Marina and in over the campus roofs.'],
          ['caption', 'The clock tower goes by on the left, still stopped at fourteen minutes past eleven.'],
          ['milo', "(phone) I can see you. You're a dot."],
          ['milo', "(phone) Now you're a bigger dot."],
          ['milo', "(phone) Grandad's waving his whole jacket."],
          ['prof_quill', "(phone, distantly) Over here, my dear fellow! By the long jump! Mind the hurdles, they're the university's!"],
          ['hob', '(radio) Is that the professor? He sounds exactly like he did on the phone. That\'s rare. Most people sound smaller.'],
          ['caption', 'On the running track, an old man in a corduroy jacket swinging it round his head like a lasso, and a boy in a yellow T-shirt jumping up and down beside him.'],
        ],
      },
      { music: 'triumph' },
      {
        scene: { at: 'halcyon_field', cast: ['milo', 'prof_quill'] },
        say: [
          ['caption', 'The rotors wind down. Grass settles. Milo comes across the field at a run that is trying very hard to be a walk.'],
          ['milo', '(before anyone else can speak) Nine!'],
          ['hob', '(radio, from the cockpit speaker) He\'s not qualified. Five.'],
          ['milo', "I'm a very strict nine."],
          ['hob', '(radio) Five and a half. Final offer.'],
          ['milo', 'Eight and a half.'],
          ['hob', "(radio) This isn't a market, son. Five and a half. I'm writing it in pen."],
          ['milo', '(to Jay, outraged on his behalf) He was AT the hangar. He couldn\'t even SEE it.'],
          ['jay', "He's never seen a landing he liked."],
          ['hob', "(radio) I heard that. Five and a half stands. And the boy gets a mark too. Seven. For enthusiasm. Over."],
          ['milo', '(quietly delighted) I got a seven.'],
        ],
      },
      {
        scene: { at: 'halcyon_field', cast: ['milo', 'prof_quill'] },
        say: [
          ['caption', 'Jay hands down the last box. Milo opens it, takes out the jam doughnut on top, and holds it up in both hands like a cup.'],
          ['milo', "The first doughnut ever delivered to me by air. (beat) I'm going to eat it slowly. For history."],
          ['caption', 'He takes an enormous bite. Jam goes down the hand-drawn Firecrest on his T-shirt.'],
          ['milo', '(with his mouth full) Hiftory.'],
          ['prof_quill', '(beaming up at the helicopter, one hand on the bubble) My dear fellow. May I? Just to sit?'],
          ['jay', 'Go on.'],
          ['caption', 'The professor climbs into the passenger seat with enormous care, folds his hands on his knees and looks out at the field with the expression of a man at a concert.'],
          ['prof_quill', 'Marvellous. Not the faintest twinge. Helicopters don\'t corner, you see.'],
          ['jay', 'They do a bit.'],
          ['prof_quill', 'Not the way cars corner. Cars corner with malice.'],
          ['milo', "Grandad was sick in the university minibus last week. It was parked."],
          ['prof_quill', 'It was idling, Milo. There is a difference, and I felt every bit of it.'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [{
          scene: { at: 'halcyon_field', cast: ['milo', 'prof_quill'] },
          say: [
            ['milo', "I'm posting this. Not the location. Just the doughnut."],
            ['milo', '(beat) Mostly the doughnut.'],
            ['jay', 'Wait a day.'],
            ['milo', "I always wait a day now. I'll post it tomorrow. The doughnut will be gone, but its memory will be online."],
          ],
        }],
        else: [{
          scene: { at: 'halcyon_field', cast: ['milo', 'prof_quill'] },
          say: [
            ['milo', "I'm drawing it on the card on my wall. A doughnut with a helicopter. It's the best thing on the wall."],
            ['jay', 'Better than the scoreboard?'],
            ['milo', '...Different.'],
          ],
        }],
      },
      {
        scene: { at: 'halcyon_field', cast: ['milo', 'prof_quill'] },
        say: [
          ['caption', 'The professor is gently but firmly unloaded from the passenger seat. He pats the helicopter twice on the way out, like a horse.'],
          ['jay', 'Hob wants his helicopter back.'],
          ['milo', 'Jay?'],
          ['jay', 'Yeah.'],
          ['milo', '(beat, jam on his chin) Thanks.'],
          ['jay', "(climbing back in, quietly, to the Sparrow) Don't tell anyone."],
        ],
      },
      { music: 'off' },
      { text: 'hob', message: 'Nurses say ta. Astronomers say the comet is fine. The boy says nine, I say five and a half, the pen says five and a half. Bring her home whenever. Hob' },
    ],
  };

  // =====================================================================
  // dsf4 — Check Ride
  // =====================================================================
  const dsf4 = {
    id: 'dsf4_check_ride',
    title: 'Check Ride',
    giver: 'hob',
    start: 'field_apron',
    time: 17,
    estMinutes: 11,
    summary: "Hob's check ride: a landing at the big airport, between the airliners, and home in a crosswind.",
    reward: { money: 3000 },
    failIf: ['wrecked:hob_skylark', 'dead:hob'],
    steps: [
      skylark('field_apron'),
      { music: 'off' },
      {
        camera: 'field_apron', seconds: 4,
        say: [['caption', 'Paloma Field, five in the afternoon. The windsock is standing straight out sideways, like it has somewhere better to be.']],
      },
      {
        scene: { at: 'field_apron', cast: ['hob'] },
        say: [
          ['caption', 'Hob, by the Skylark, in a tie. The club tie: green, a little short, with a small embroidered doughnut where a crest would be.'],
          ['jay', "You're wearing a tie."],
          ['hob', "It's a check ride. You wear a tie to a check ride. It's in the rules. I wrote the rules, so I'd know."],
          ['hob', "Here's how it goes. I sit there. I say nothing. I write things down. You do everything."],
          ['hob', "Out along the bridge. Up Grand Avenue to the big airport. Full-stop landing on the real runway, between the real aeroplanes."],
          ['hob', "Taxi off, take off again. Home past the Halcyon clock and the Coral Marina light. And a landing here. In whatever the wind feels like."],
          ['caption', 'They both look at the windsock. The windsock does not look back.'],
          ['hob', "You landed an airliner on my runway. Today we find out if that was a fluke."],
          ['jay', 'It was a fluke.'],
          ['hob', "I know. That's why we're doing this."],
          ['hob', "(quieter, buttoning his cardigan over the tie) Forty years I've been instructing. I've never given a ten."],
          ['jay', 'Why not?'],
          ['hob', "Nobody's earned one. Also I'm mean. Both."],
        ],
      },
      { join: ['hob'], weapon: 'fists' },
      { music: 'hope' },
      { getIn: 'hob_skylark', objective: "Get in. Hob's in the right seat" },
      {
        fly: 'bridge_island_end', height: 110, radius: 60,
        objective: 'Out along the Paloma Bridge',
        say: [
          ['caption', 'Hob settles into the right seat, puts the clipboard on his knee, a pencil behind his ear, folds his arms and looks straight ahead.'],
          ['caption', 'The Skylark climbs out over the Neon Strand. Hob says nothing. Hob goes on saying nothing.'],
          ['hob', "(after a while) I'm saying nothing."],
          ['jay', 'I noticed.'],
          ['hob', 'Note how much nothing I\'m saying. It\'s a lot of nothing. It\'s taking a lot out of me.'],
          ['caption', 'He writes something down. Jay glances across. Hob turns the clipboard over.'],
        ],
      },
      {
        fly: 'bridge_mainland', height: 120, radius: 60,
        objective: 'Over the bridge to the mainland',
        say: [
          ['caption', 'The Paloma Bridge runs under the wing, a long grey line over blue water, traffic crawling across it like beads on a string.'],
          ['hob', "I'll tell you one thing, since you're not asking. You're holding the stick like it owes you money."],
          ['jay', 'How should I hold it?'],
          ['hob', 'Like it\'s lending you some.'],
        ],
      },
      {
        fly: 'grand_avenue', height: 150, radius: 70,
        objective: 'North up Grand Avenue to the airport',
        say: [
          ['jay', "What's a ten, then?"],
          ['hob', "A ten is when I forget I'm in an aeroplane."],
          ['hob', "I've never forgotten. Not once in forty years. I've come close."],
          ['hob', "Once a man landed so softly I thought we'd stopped for tea. Then he ran over a hare. Six."],
          ['jay', 'My nan taught me to drive in a car park.'],
          ['hob', 'Did she now.'],
          ['jay', "Sundays. Big empty car park. She'd sit there with her handbag on her knee and say 'Ten and two.' Every time I took a hand off."],
          ['hob', "Ten and two. (nodding slowly) Sensible woman. Planes are the same. Ten and two on the yoke and keep your heart out of it."],
          ['jay', 'Keep your heart out of it.'],
          ['hob', "Out of the hands, I mean. Put it anywhere else you like. (beat) That's not for the clipboard, that."],
          ['caption', 'Downtown slides by under them, glass towers burning orange in the low sun, and ahead to the north the long runways of Vicehaven International.'],
        ],
      },
      {
        phone: 'tower',
        say: [
          ['hob', '(taking the radio, in his best voice) Vicehaven Tower, Skylark from Paloma, inbound for a full-stop landing, please.'],
          ['hob', "And if you've got a moment, a cup of tea."],
          ['tower', "(a pause, then very calm, the voice of a man holding a mug very tightly) Skylark, Vicehaven Tower. Cleared to land, runway in front of you."],
          ['tower', "Skylark, there's an Albatross four miles behind you."],
          ['tower', 'Please hurry. Please, please hurry.'],
          ['hob', 'Lovely. Ta. (to Jay) He sounds nice.'],
          ['jay', '(to the Skylark, under his breath) Damn. No pressure, then.'],
        ],
      },
      { music: 'tension' },
      {
        land: 'vicehaven_international', radius: 60,
        objective: "Land on the big runway (there's an airliner behind you)",
        say: [
          ['caption', 'The runway comes up ahead, wide enough to land the Skylark on sideways, with a row of jet bridges and parked airliners along one side like a herd of something big and grumpy.'],
          ['hob', "Plenty of room. Don't let the size of it fool you into floating. Put her down at the start and get off."],
          ['tower', "(radio) Skylark, the Albatross is three miles. Three miles. That's very close for an Albatross."],
          ['caption', 'Touchdown. A tiny chirp on a runway built for wheels the size of the Skylark.'],
          ['tower', '(radio) Skylark, vacate the runway. Any exit. Any exit at all.'],
          ['tower', '(radio) Any exit, Skylark. Any. Exit.'],
        ],
      },
      {
        goto: 'airport_apron', vehicle: 'hob_skylark', stop: true, radius: 20,
        objective: 'Taxi off onto the apron',
        say: [
          ['caption', '(A two-hundred-seat Albatross lands behind them with a roar like the end of the world. Its passengers press their faces to the windows to look at the little yellow plane.)'],
          ['caption', '(A child in a window seat waves. Hob waves back with the pencil.)'],
          ['caption', 'Hob writes something on the clipboard.'],
          ['jay', 'What did you write?'],
          ['hob', "'Taxi.'"],
          ['jay', 'Just that?'],
          ['hob', "It's a thing you did. I wrote it down. That's what a clipboard's for."],
        ],
      },
      { music: 'hope' },
      {
        fly: 'halcyon_clocktower', height: 90, radius: 50,
        objective: 'Take off again and head for the Halcyon clock tower',
        say: [
          ['tower', '(radio) Skylark, you are cleared to... (beat) You\'re already going.'],
          ['tower', '(radio) Fine. Goodbye. Lovely plane.'],
          ['hob', '(into the radio) Thanks, Tower. Tea next time. Over.'],
          ['tower', '(radio, quietly, before the click) There won\'t be a next time.'],
          ['caption', 'South-west from the airport, over the campus of Halcyon University: lawns, red-brick halls, and the clock tower standing up from the quad.'],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', "Jay! Did you know you can see the Skylark's registration from the quad with binoculars? I can see you. I'm on the quad."],
          ['milo', "The clock's still stopped at fourteen minutes past eleven, so technically you're very early. Or very late. It depends how you feel about clocks."],
          ['jay', "How'd you know I'd be here?"],
          ['milo', 'Hob emailed Grandad the route. Grandad printed it. He laminated it.'],
          ['milo', '(beat, much more quietly) Is Hob there? (louder) Hello, Hob. Is he going to get a ten?'],
          ['hob', '(leaning to the microphone) No comment. Over.'],
          ['milo', "That's not a no."],
          ['hob', "It's not a yes either, small person. Over and out."],
        ],
      },
      {
        fly: 'marina_lighthouse', height: 80, radius: 50,
        objective: 'East over the Coral Marina light',
        say: [
          ['caption', 'East along the coast: yachts in rows, white condos, and out at the end of the breakwater the Coral Marina lighthouse, its lamp not yet lit.'],
          ['hob', "There's Toby's. You'll go over the top. Not through it. Lighthouses take a dim view of being gone through."],
        ],
      },
      {
        phone: 'toby',
        say: [
          ['toby', "(on the radio, gruff and slow) Son. You're on my light."],
          ['jay', 'Just passing.'],
          ['toby', 'Waggle your wings if you\'re all right.'],
          ['caption', '(Jay waggles the wings. Left, right, left. The clipboard slides off Hob\'s knee.)'],
          ['toby', "(beat) Hell's bells. He waggled."],
          ['hob', "(retrieving the clipboard) Crikey. I didn't teach him that."],
          ['toby', 'I did. Just now.'],
          ['hob', "That's going on your record, Toby Brask."],
          ['toby', "I haven't got a record."],
          ['hob', "You have now. Over."],
        ],
      },
      { music: 'tension' },
      {
        land: 'paloma_field', radius: 30,
        objective: "Home to Paloma Field. There's a crosswind",
        say: [
          ['caption', 'Back across the bay. The island comes up green and gold in the late sun, and at its eastern end the runway of Paloma Field, and beside it the windsock, still standing straight out sideways.'],
          ['caption', 'Hob puts the pencil behind his ear. For the first time all afternoon, he speaks quietly and usefully.'],
          ['hob', "Crosswind from the left. She'll want to drift. Don't fight it."],
          ['hob', 'Dance with it.'],
          ['hob', 'Lean in. Wing down a touch into the wind. Keep her nose on the line with your feet.'],
          ['hob', "Now hold it. Hold it. Let her come down to you."],
          ['hob', 'Now straighten.'],
          ['hob', '(beat) Now.'],
        ],
      },
      { wait: 2 },
      { music: 'triumph' },
      { leave: ['hob'] },
      {
        scene: { at: 'field_apron', cast: ['hob'] },
        say: [
          ['caption', 'The Skylark ticks as it cools. Hob climbs out. He doesn\'t say anything.'],
          ['caption', 'He walks a little way off and looks at the windsock for a long time. He looks at the clipboard. He looks at the windsock again.'],
          ['caption', 'He takes the pencil from behind his ear.'],
          ['hob', 'Ten.'],
          ['caption', '(A gull lands on the wing, thinks better of it, and leaves.)'],
          ['jay', 'Say that again.'],
          ['hob', 'No. Once. Forty years.'],
          ['caption', 'He tears the sheet off the clipboard and holds it out. In pencil, at the bottom, under "Taxi", a single figure: 10. Circled. Twice.'],
          ['jay', '(taking it) You forgot you were in an aeroplane.'],
          ['hob', "I forgot I was in an aeroplane. Somewhere over the fence. I thought we were in a lift. A very nice lift."],
        ],
      },
      {
        scene: { at: 'field_apron', cast: ['hob'] },
        say: [
          ['caption', 'Hob digs in his cardigan pocket and brings out a set of keys on a doughnut-shaped keyring.'],
          ['hob', "Second club Skylark. The blue one at the back of the hangar. It's yours on Tuesdays."],
          ['jay', 'What about the other days?'],
          ['hob', "Other days it's mine. Tuesdays it's yours."],
          ['hob', 'Doughnuts are Tuesdays. You see where this is going.'],
          ['jay', "(weighing the keys) That's not a present. That's a job."],
          ['hob', "It's both. That's the best kind of present. Ask anyone who's had a puppy."],
        ],
      },
      {
        if: 'd23_odie_wren',
        then: [{
          scene: { at: 'field_apron', cast: ['hob'] },
          say: [
            ['caption', 'Hob looks across the island to the south shore, where the fort light is just coming on.'],
            ['hob', 'Somebody up at the fort was watching through a telescope. Rang the hangar before you\'d stopped rolling.'],
            ['hob', "She says nine. I've told her she's not qualified either."],
            ['jay', 'What did she say to that?'],
            ['hob', "She said she was landing on worse than this before I was born. (beat) Then she said 'tell him it was a good line'. So. It was a good line."],
          ],
        }],
        else: [{
          scene: { at: 'field_apron', cast: ['hob'] },
          say: [
            ['hob', '(clearing his throat, looking hard at the windsock) Right then. Now go away before I cry on the clipboard.'],
            ['hob', "It's the only one I've got."],
          ],
        }],
      },
      { music: 'off' },
      { text: 'hob', message: 'Told the members. Mr Okafor says it was a cumulonimbus. Board in the hangar now says J. MERCER, TEN. In red. I bought more red. Tuesdays, don\'t forget. Hob' },
    ],
  };

  D.side.push({ id: 'dside_flying', title: 'Marks Out of Ten', giver: 'hob', unlockAfter: 'd18_ground_school', missions: [dsf1, dsf2, dsf3, dsf4] });
})();
