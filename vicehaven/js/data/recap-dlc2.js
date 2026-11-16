/*
 * data/recap-dlc2.js — "Story so far" recaps for the story DLC "Chasing the
 * Firecrest", ACTS 3 and 4 (d17 to d30) and its four side chains (Take Two,
 * Marks Out of Ten, Summer Series, Dual Control): the intro and outro of Act 3
 * (Isla Paloma) and Act 4 (The Last Lap), every job, the people met there,
 * later news, the choices and the three endings. Read by js/storylog.js (its
 * model().dlc section: pause menu → Story so far, the DLC tab; the phone's
 * Story app; the "Previously in Chasing the Firecrest…" card). Loaded after
 * recap-dlc1.js (Acts 1 and 2).
 *
 * Parts are strings and { if, text } objects joined with single spaces; `if`
 * is a flag, '!flag', or an array of those (all must hold). Completed mission
 * ids count as flags. Branches read here: dlc_blog_on / dlc_blog_off (d08),
 * dlc_chet_told / dlc_chet_kept (d14), dlc_dash_in / dlc_dash_left (d20),
 * dlc_june_told / dlc_june_wait (d25), and the final choice in d30:
 * dlc_end_hers / dlc_end_everybody / dlc_end_gone, which is also the ending
 * (Act 4's outro is what storylog shows as the ending). Side jobs can be
 * finished before or after any main job, so neither kind of recap leans on a
 * flag that could be set later than the job it describes (only the "Hers"
 * ending mentions dsl3, as how things stand now). No spoilers past each job:
 * who Odie Wren really is waits for d23, and so on.
 */
(function () {
  'use strict';
  const S = window.VH.Data.story; // created by story.js (loaded first)
  const R = (S.recap = S.recap || { prologue: null, acts: {}, jobs: {}, who: {}, updates: [], choices: {} });
  R.jobs = R.jobs || {};
  R.who = R.who || {};
  R.updates = R.updates || [];
  R.choices = R.choices || {};
  // The DLC's own prologue and act texts (storylog.js reads R.dlc).
  const DLC = (R.dlc = R.dlc || { prologue: null, acts: {} });
  DLC.acts = DLC.acts || {};

  DLC.acts[3] = {
    title: 'Isla Paloma',
    intro: [
      'Jay has the rally clock and the carburettor back, and he is on Isla Paloma, the island Leo Castellane nearly owns.',
      'Hob Finnegan has a hangar where nobody will look for the parts. In return, he has a van full of doughnuts that needs a driver.',
    ],
    outro: [
      'All seven parts of the Firecrest are found, and the last stop on Dess\'s trail was Dess herself.',
      'Odie Wren, keeper of the fort light, is Dess Marlow, alive at seventy-nine. The Firecrest is bricked up in the fort\'s old powder store.',
      'The Gorse file proves Rex Castellane stole the race, and that Leo has known.',
      { if: 'dlc_dash_in', text: 'Dash Lockwood is on the team now, and Kit has it all on camera.' },
      'Dess has said: "Let\'s finish it." June still has no idea.',
    ],
  };

  Object.assign(R.jobs, {
    // ---------------------------------------------------------------- d17
    d17_contraband: {
      setup: [
        'Only Castellane croissants may be sold on Isla Paloma. Every Tuesday Hob Finnegan sneaks in jam doughnuts for the old folk of Old Paloma.',
        'He will hide the Firecrest\'s parts in his hangar. The rent is Jay, driving the doughnut van.',
      ],
      recap: [
        'Pip clipped the Firecrest\'s starter key to Jay\'s belt: "Driver holds the key."',
        'Then Jay drove Hob\'s doughnut van through a Guest Services Welcome Check, while the guards argued about whether a croissant is bread or cake.',
        'At Ines Duarte\'s café, an old woman called Odie Wren, keeper of the fort light, bought twelve jam doughnuts. She tapped the counter three times and stared at the gold bird on Jay\'s belt.',
        'Milo solved the riddle: the box where nobody wins is the Golden Grabber claw machine, beside the big wheel at Wonder Wharf. Its prize is a gear stick.',
      ],
      line: 'Jay smuggled Hob\'s doughnuts into Old Paloma, met a sharp old lighthouse keeper called Odie Wren, and Milo found the next part.',
    },

    // ---------------------------------------------------------------- d18
    d18_ground_school: {
      setup: [
        'Guest Services watch every road on Isla Paloma, and everything on the island is easier from the air.',
        'So Hob is giving Jay a proper flying lesson in his yellow Skylark, whether Jay likes it or not.',
      ],
      recap: [
        'Hob taught Jay that a plane is a car with one more way to crash.',
        'They flew over Leo Castellane\'s huge estate, the observatory and the old fort, where Odie\'s lighthouse has a small blue door.',
        'Over Wonder Wharf they saw men in teal lifting the Golden Grabber onto a truck. Leo had bought it for his "private collection".',
        'Jay landed, and Hob gave him seven out of ten and a student pilot\'s logbook.',
        'The machine moves tonight. It won\'t fit in a plane, so Jay plans to take the whole truck.',
      ],
      line: 'Hob gave Jay his first flying lesson, and from the air they saw Castellane\'s men taking away the Golden Grabber.',
    },

    // ---------------------------------------------------------------- d19
    d19_golden_grabber: {
      setup: [
        'Castellane has bought the Golden Grabber, the claw machine with the Firecrest\'s gear stick inside, and tonight a truck is moving it.',
        'Jay is at Wonder Wharf, where the machine used to stand.',
      ],
      recap: [
        'Lorna Pike, who has run the arcade\'s change counter for forty years, said nobody has ever won the gear stick. Dash, at the next machine, won a pink teddy bear.',
        { if: 'dlc_blog_on', text: 'A blog reader called WharfGull told Milo where the truck was going.' },
        { if: 'dlc_blog_off', text: 'Hob circled overhead in the Skylark and called out the truck\'s turns.' },
        'Jay tailed it to the convention centre, then drove off in it while its crew went for coffee. Guest Services chased him to the airfield, and stopped at Hob\'s sign: MEMBERS ONLY. NO CROISSANTS.',
        'After fourteen tries, Milo said, "Unplug it." The gear stick dropped out, with another riddle inside, about a bell above a market square.',
      ],
      line: 'Jay stole the truck carrying the Golden Grabber, and when they unplugged it, the claw machine finally let go of the gear stick.',
    },

    // ---------------------------------------------------------------- d20
    d20_the_gorse_file: {
      setup: [
        'Professor Quill has found a bill from a private detective called Gorse, sent to Rex Castellane the week after the race, for "the Marlow file".',
        'The file is in Leo\'s study, and tonight Leo is having a party.',
      ],
      recap: [
        'Hob flew Jay over in the club helicopter, and Jay parachuted onto the observatory next door, crept through the gardens and took the file from Leo\'s study.',
        'Gorse had watched Dess hide her parts, then take a covered load on the ferry to the old fort. The last page, in Rex\'s writing, admitted he had paid men to stop Dess and paid the stewards to change the result. Under it Leo had written: "Dad, why?"',
        'Ottoline had handcuffed Dash to his camera crane for losing the parts.',
        { if: 'dlc_dash_in', text: 'Jay freed him, and Dash filmed their escape from the back seat.' },
        { if: 'dlc_dash_left', text: 'Jay left him there, and Dash shouted which way Jay went.' },
      ],
      line: 'Jay took the Gorse file from Leo\'s study during his party: Rex Castellane stole the race, and Leo knew.',
    },

    // ---------------------------------------------------------------- d21
    d21_ring_twice: {
      setup: [
        'Milo has solved the riddle: the church bell over Paloma Plaza, which only rings for weddings and the harbour festival.',
        'Today is the festival, and the bell rings at noon when the boats come in.',
      ],
      recap: [
        { if: 'dlc_dash_in', text: 'Dash and Kit came too.' },
        'Jay climbed the bell tower and rang the bell once. Inside its clapper he found the ignition coil, the seventh and last part of the Firecrest.',
        'Then Guest Services gunmen stood up on the roofs. Pip herded the old folk into Ines\'s café while Jay cleared the rooftops',
        { if: 'dlc_dash_in', text: 'and Dash and Kit led three of the gunmen on a chase round the church.' },
        { if: 'dlc_dash_left', text: 'one by one.' },
        'Hob picked him up at the harbour.',
        'Wrapped round the coil was one more riddle, about two lights that say goodnight at ten. All seven parts are found, so what is it for? Pip sent it to Toby.',
      ],
      line: 'Jay rang Old Paloma\'s church bell, found the last part of the car, and fought Guest Services across the rooftops.',
    },

    // ---------------------------------------------------------------- d22
    d22_two_lights: {
      setup: [
        'Dess\'s last riddle says to fly the line between two lights that say goodnight at ten.',
        'Toby Brask has come over on the evening ferry with his toolbox, "in case". He hasn\'t said in case of what.',
      ],
      recap: [
        'Toby read the riddle and went pale. Milo explained: every night at ten, the fort light flashes three times and Toby\'s Coral Marina light flashes back.',
        'Jay flew Toby along the beam between them. On the way, Toby talked about the young Dess, who called him "the spanner" and tapped her wheel three times "so it knows I\'m here".',
        'Passing the fort\'s blue door, Jay remembered Nana Lu: the driver went "somewhere she could see the sea".',
        'After a night landing (eight out of ten), they knocked on the blue door. Odie Wren opened it, looked at Toby, and Toby took off his hat.',
      ],
      line: 'Jay flew Toby along the lighthouse beam to the fort, and knocked on Odie Wren\'s blue door.',
    },

    // ---------------------------------------------------------------- d23
    d23_odie_wren: {
      setup: [
        'The blue door at the fort light is open. Odie Wren stands in it with a mug in her hand.',
        'She is looking at Toby, and Toby has taken off his hat.',
      ],
      recap: [
        'Odie Wren is Dess Marlow. "Hello, Toby. You took your time." For thirty-four years she had watched the sea for June, and nobody came.',
        'She showed them a bricked-up arch in the fort wall: "I didn\'t hide a car. I hid a road." She wanted to leave it as a story, but gave Pip her logbook and the stewards\' result sheet, which says O. Marlow came first.',
        { if: 'dlc_blog_on', text: 'Milo\'s post about "the two lights" had brought Guest Services.' },
        { if: 'dlc_blog_off', text: 'Ottoline had watched the Skylark fly the beam.' },
        'They snatched the papers, and Jay chased them down in the doughnut van.',
        { if: 'dlc_dash_in', text: 'Kit filmed it all.' },
        'Then Dess said, "Let\'s finish it."',
      ],
      line: 'Odie Wren turned out to be Dess Marlow, alive, and the Firecrest is bricked up in the fort.',
    },
  });

  // People met in Act 3 (names and roles come from dlc.js).
  Object.assign(R.who, {
    ines: { intro: 'd17_contraband', bio: 'Ines Duarte runs the café on Paloma Plaza and sells Hob\'s smuggled doughnuts from under a tea towel. She has been married three times, all to fishermen called Tomás.' },
    odie: { intro: 'd17_contraband', bio: [
      'Odie Wren keeps the old fort lighthouse on Isla Paloma. She buys twelve jam doughnuts every Tuesday and pays the exact money.',
      'She told Jay she was not a ghost, tapped the counter three times, and stared at the gold bird on his belt.',
    ] },
    lorna: { intro: 'd19_golden_grabber', bio: 'Lorna Pike has run the change counter at Wonder Wharf\'s arcade for forty years, and has watched everyone fail to win the Golden Grabber\'s gear stick.' },
    dess: { intro: 'd23_odie_wren', bio: [
      'Dess Marlow won the Southbay 500 fifty years ago and vanished. She is seventy-nine, rude, quick, and Pip\'s gran.',
      'She has kept the fort light as Odie Wren for nearly fifty years, and hid the Firecrest behind bricks in the fort wall.',
    ] },
  });

  // Later news from Act 3, shown once the job is done.
  R.updates.push(
    { who: 'pip', after: 'd17_contraband', text: 'Pip clipped the starter key to Jay\'s belt: "Driver holds the key."' },
    { who: 'hob', after: 'd18_ground_school', text: 'Hob gave Jay seven out of ten for his first proper landing, and a student pilot\'s logbook.' },
    { who: 'dash', after: 'd19_golden_grabber', text: 'At Wonder Wharf, Dash proudly pulled a pink teddy bear out of the wrong claw machine.' },
    { who: 'prof_quill', after: 'd20_the_gorse_file', text: 'In the Halcyon archive, the Professor found the detective\'s bill that led to the Gorse file.' },
    { who: 'leo', after: 'd20_the_gorse_file', text: 'Leo has read his father\'s confession in the Gorse file. He wrote "Dad, why?" under it, and kept the slogan on his hotels anyway.' },
    { who: 'ottoline', after: 'd20_the_gorse_file', text: 'Ottoline handcuffed Dash to his own camera crane for losing the parts, and left him a comment card.' },
    { who: 'dash', after: 'd20_the_gorse_file', text: [
      'Dash saw the last page of the Gorse file. He admitted he has never found anything real.',
      { if: 'dlc_dash_in', text: 'Jay freed him from the crane, and he has joined the team.' },
      { if: 'dlc_dash_left', text: 'Jay left him handcuffed to the crane, shouting.' },
    ] },
    { who: 'odie', after: 'd23_odie_wren', text: 'Odie Wren is really Dess Marlow, Pip\'s gran, who won the Southbay 500 and vanished fifty years ago.' },
    { who: 'toby', after: 'd23_odie_wren', text: 'Toby found Dess alive at the fort light, the light he has said goodnight to every night for years. He told her he never delivered the box.' },
    { who: 'hob', after: 'd23_odie_wren', text: 'Hob once saw a Southbay 500 programme on Odie\'s wall, and never asked. "Doughnuts are my business."' },
    { who: 'milo', after: 'd23_odie_wren', if: 'dlc_blog_on', text: 'Milo\'s post about "the two lights" led Guest Services to the fort. He was very sorry.' },
    { who: 'kit', after: 'd23_odie_wren', if: 'dlc_dash_in', text: 'Kit filmed Guest Services snatching Dess\'s papers at the fort, faces and all.' },
  );

  // The choices made in Act 3.
  Object.assign(R.choices, {
    d20_the_gorse_file: [
      { title: 'Dash on the crane', options: {
          dlc_dash_in: 'Jay uncuffed Dash and took him along. Dash filmed the escape, and is on the team now.',
          dlc_dash_left: 'Jay left Dash cuffed to his crane. Dash shouted after him, and an extra Guest Services car joined the chase.',
      } },
    ],
  });


  // =====================================================================
  // ACT 4: THE LAST LAP (d24 to d30)
  // =====================================================================

  DLC.acts[4] = {
    title: 'The Last Lap',
    intro: [
      'It is two days to the 50th anniversary Southbay 500, and Castellane banners hang from every lamp post.',
      'Toby Brask can rebuild the Firecrest, if Jay can fetch his tools, his engine hoist and four tyres nobody has made for fifty years.',
    ],
    // Shown when the DLC is finished (storylog uses it as the ending), so it
    // tells the ending the player chose in d30.
    outro: [
      'Fifty years late, Dess Marlow drove her lap of honour in front of forty thousand people, and Monty Sprake called her the winner of the Southbay 500.',
      'Leo Castellane said it himself over the loudspeakers: his father knew, he knew, and he was sorry. Ottoline was arrested in the Speedway tunnel, and Toby finally handed June the tin box.',
      { if: 'dlc_end_hers', text: 'Jay said the Firecrest was June\'s. It lives on her drive beside Aunt Win\'s shed, where June gives her mother driving lessons in it and marks every fault.' },
      { if: ['dlc_end_hers', 'dsl3_test_day'], text: 'She uses Jay\'s old test sheet: "He got a 94. You can get a 94."' },
      { if: 'dlc_end_hers', text: 'Pip mows the lawn, Toby is not allowed to fix third gear, and Jay stayed for lunch.' },
      { if: 'dlc_end_everybody', text: 'Jay said it belonged to everyone who was there. The Firecrest and the real cup now sit in a glass room by the start line, beside the new Marlow Stand, and O. MARLOW is back on the honours board in gold.' },
      { if: 'dlc_end_everybody', text: 'Leo unbolted CHAMPIONS SINCE DAY ONE from his hotel himself, and Milo wrote the plaque: "She won. She hid it. We found it. Mind the road."' },
      { if: 'dlc_end_gone', text: 'Jay said hide it again. That night he and Dess drove the Firecrest somewhere nobody was told, and she took seven new parts off it.' },
      { if: 'dlc_end_gone', text: 'Milo wrote the first riddle of a brand-new trail, and this time Toby delivered the tin box himself, to the Halcyon library: FOR WHOEVER ASKS.' },
      { if: 'dlc_blog_on', text: 'Milo\'s last post made the front page of the Vicehaven Courier.' },
      { if: 'dlc_blog_off', text: 'Milo is writing the whole story down in an exercise book called The Firecrest Files.' },
      { if: 'dlc_chet_told', text: 'The film is being reshot as Mind the Road, with Chet playing Toby.' },
      { if: 'dlc_chet_kept', text: 'The film was shelved, and Chet is happily watching the news in his trailer.' },
      { if: 'dlc_dash_in', text: 'Dash\'s special, his first true episode in eight series, is a hit.' },
      { if: 'dlc_dash_left', text: 'Dash\'s show was cancelled.' },
      'And mind the road.',
    ],
  };

  Object.assign(R.jobs, {
    // ---------------------------------------------------------------- d24
    d24_spare_parts: {
      setup: [
        'Toby can rebuild the Firecrest. He needs his toolkit from the lighthouse, his engine hoist from lot 17,',
        'and four old-style tyres that nobody has made for fifty years, except a film studio.',
      ],
      recap: [
        'Jay fetched Toby\'s toolkit and his hoist. On the way, Leo phoned: $250,000 for the car, the parts and the cup, and a warning that the Paloma Bridge closes tomorrow. Jay hung up.',
        'At Sunreel\'s prop yard, Guest Services were guarding the tyres, and a giant fibreglass Rex Castellane took most of their bullets.',
        { if: 'dlc_chet_told', text: 'Chet had loaded the tyres himself, "for the real one", and drove them to lot 17 at thirty while Jay kept Guest Services off him.' },
        { if: 'dlc_chet_kept', text: 'Fenella handed over the tyres. Chet was in his trailer, not taking calls.' },
        'With the bridge shut, Toby says he will need a big car. Jay has an idea.',
      ],
      line: 'Jay gathered Toby\'s tools, his hoist and the film\'s period tyres for the rebuild, and turned down Leo\'s $250,000.',
    },

    // ---------------------------------------------------------------- d25
    d25_junebug: {
      setup: [
        'June Marlow wants one driving lesson with Jay, so she knows who has been driving her daughter about.',
        'Jay knows Dess is alive. June doesn\'t.',
      ],
      recap: [
        'June took Jay round her test route and marked everything. In her boot, under the warning triangle, he found an old orange racing helmet with a gold bird on the back and O.M. inside the strap. June said it was a motorcycle helmet she had found.',
        'She gave him 94%, then asked why he kept looking at her like that.',
        { if: 'dlc_june_told', text: 'Jay told her the truth: her mother is alive and keeps the fort light. "Is she well?" "She\'s rude." "...Good."' },
        { if: 'dlc_june_wait', text: 'Jay said she reminded him of someone, and left it for Dess to tell her.' },
        'As he left, June said, "And mind the road." She doesn\'t know where she first heard it.',
      ],
      line: [
        { if: 'dlc_june_told', text: 'Jay took a driving lesson with June, found Dess\'s old helmet in her car, and told June her mother is alive.' },
        { if: 'dlc_june_wait', text: 'Jay took a driving lesson with June and found Dess\'s old helmet in her car, but left the truth for Dess to tell.' },
        { if: ['!dlc_june_told', '!dlc_june_wait'], text: 'Jay took a driving lesson with June and found Dess\'s old helmet in her car.' },
      ],
    },

    // ---------------------------------------------------------------- d26
    d26_blue_lights: {
      setup: [
        'Castellane has shut the Paloma Bridge with a roadblock, and the ferry is cancelled "for the event".',
        'Toby has a plan with one moving part: nothing gets through a roadblock like a fire engine.',
      ],
      recap: [
        { if: 'dlc_june_told', text: 'June insisted on coming, and met Toby at last: "You\'re the man with the box."' },
        'Jay took a crash tender from the airport fire station and drove it the wrong way up Grand Avenue',
        { if: 'dlc_june_told', text: 'while June marked his driving.' },
        { if: '!dlc_june_told', text: 'while June texted, "Drive safely. I mean it."' },
        'He rammed the roadblock and hosed the guards, their gazebo and their croissants off the bridge.',
        'Then he lost the police in Old Paloma\'s lanes and parked in the fort courtyard.',
        { if: 'dlc_june_told', text: 'Dess was waiting at the top of the fort steps. June stopped at the bottom.' },
        { if: '!dlc_june_told', text: 'Dess had watched it all. "Good line on the bridge. Late on the brakes."' },
      ],
      line: 'Jay stole a fire engine, smashed through Castellane\'s roadblock on the Paloma Bridge, and brought Toby to the fort.',
    },

    // ---------------------------------------------------------------- d27
    d27_the_powder_store: {
      setup: [
        'Everything for the rebuild is at the fort: the seven parts in doughnut boxes, the hoist, the toolbox and the tyres.',
        'All that is left is the bricked-up wall.',
      ],
      recap: [
        { if: 'dlc_june_told', text: 'On the fort steps June met her mother: "You\'re very late." "I know." She gave back the helmet.' },
        { if: '!dlc_june_told', text: 'Jay told Dess that June had kept her helmet. Dess laughed until she cried.' },
        'Then they blew open the wall. Under the sheet was the Firecrest, with "Junebug" painted by the door: June\'s nickname, which came from Dess. In the boot was the real cup, engraved O. MARLOW.',
        'Every Guest Services car came. Jay held the fort while Toby fitted all seven parts',
        { if: 'dlc_dash_in', text: 'and Dash blinded the last wave with TV floodlights.' },
        { if: '!dlc_dash_in', text: 'and Dash, on TV, called it all a hoax.' },
        'Jay gave Dess the key. She tapped the wheel three times, and the car started first time.',
      ],
      line: 'Toby rebuilt the Firecrest in the fort while Jay held off Guest Services, and Dess started her up first time.',
    },

    // ---------------------------------------------------------------- d28
    d28_comment_card: {
      setup: [
        'It is race day, before dawn, and the Firecrest has gone from the fort.',
        'Two Guest Services men are tied up in bunting, and on the floor where the car stood lies a comment card.',
      ],
      recap: [
        'Ottoline Graves had taken the car herself, even though Leo had asked her to stop, and was sending it to the Ironside crusher.',
        'Jay chased the transporter in Dess\'s own surprisingly quick car, with Dess calling the corners, and boxed it in just short of the scrapyard.',
        'Ottoline handed him a blank comment card ("You choose one") and drove off as the police arrived. Her men were taken away.',
        'Then Dess let Jay drive the Firecrest home along the causeway. Third gear still sticks.',
      ],
      line: 'Ottoline stole the Firecrest on race morning, and Jay, with Dess calling corners, caught her before the crusher.',
    },

    // ---------------------------------------------------------------- d29
    d29_road_closed: {
      setup: [
        'Castellane has closed every road to the Speedway for the anniversary race, and the race starts at three.',
        'Fenella Moss is waiting at the Paloma Bridge with something very large under a tarpaulin.',
      ],
      recap: [
        'Fenella\'s "prop" was a real tank, borrowed for a film.',
        { if: 'dlc_chet_told', text: 'Chet rode in it, thrilled by its top speed of twenty-eight.' },
        { if: 'dlc_chet_kept', text: 'Chet phoned, confused, to ask what the tank was for.' },
        'Jay and Pip cleared the four roadblocks: Anchor Street, Seawall Drive, the coast road and the Bowl car park.',
        { if: 'dlc_blog_on', text: 'At two of them Milo\'s readers were already sitting in the road in home-made SHE WON T-shirts.' },
        'Monty announced the tank on the radio and got Jay\'s name wrong again.',
        'Then Jay lost the police on foot.',
      ],
      line: 'Jay drove a borrowed film tank through Castellane\'s four roadblocks, so the road to the Speedway is open.',
    },

    // ---------------------------------------------------------------- d30
    d30_the_last_lap: {
      setup: [
        'It is three o\'clock, ten laps from the end of the 50th anniversary Southbay 500, and forty thousand people are watching.',
        'Dess Marlow never got her lap of honour. Today she does.',
      ],
      recap: [
        { if: 'dlc_june_told', text: 'Jay drove the Firecrest to the Speedway, with June beside him and Dess in the back holding the cup.' },
        { if: '!dlc_june_told', text: 'Jay drove the Firecrest to the Speedway, with Dess beside him holding the cup.' },
        { if: 'dlc_dash_in', text: 'Dash broadcast the chase from a wobbly helicopter, so the police were waiting at the tunnel.' },
        { if: 'dlc_dash_left', text: 'Two Guest Services cars followed him onto the infield, and Jay stopped them.' },
        'Ottoline was arrested. Dess tapped the wheel three times, and Jay drove her lap.',
        { if: 'dlc_chet_told', text: 'Chet told the crowd the true story.' },
        { if: 'dlc_chet_kept', text: 'Chet took off Rex\'s red jacket.' },
        'Monty named Dess the winner, and Leo said sorry. Dess said "And mind the road" to June, and June knew her voice. Toby gave June the tin box.',
        { if: 'dlc_end_hers', text: 'Jay said the car was June\'s.' },
        { if: 'dlc_end_everybody', text: 'Jay said it belonged to everyone.' },
        { if: 'dlc_end_gone', text: 'Jay said hide it again.' },
      ],
      line: [
        { if: 'dlc_end_hers', text: 'Jay drove Dess Marlow\'s lap of honour, fifty years late, and then gave the Firecrest to June.' },
        { if: 'dlc_end_everybody', text: 'Jay drove Dess Marlow\'s lap of honour, fifty years late, and the Firecrest stays at the Speedway for everyone.' },
        { if: 'dlc_end_gone', text: 'Jay drove Dess Marlow\'s lap of honour, fifty years late, then helped her hide the Firecrest all over again.' },
        { if: ['!dlc_end_hers', '!dlc_end_everybody', '!dlc_end_gone'], text: 'Jay drove Dess Marlow\'s lap of honour, fifty years late, and the whole Speedway learned who really won.' },
      ],
    },
  });

  // Later news from Act 4, shown once the job is done.
  R.updates.push(
    { who: 'leo', after: 'd24_spare_parts', text: 'Leo offered Jay $250,000 for the car, the parts and the cup, then closed the Paloma Bridge. Jay hung up on him.' },
    { who: 'chet', after: 'd24_spare_parts', text: [
      { if: 'dlc_chet_told', text: 'Chet gave them the film\'s period tyres "for the real one", and is going to play Rex worse now, on purpose.' },
      { if: 'dlc_chet_kept', text: 'Chet is in his trailer, not taking calls, and keeps asking Fenella who really won.' },
    ] },
    { who: 'june', after: 'd25_junebug', text: [
      'June has kept an old orange racing helmet for forty years, and tells everyone it is a motorcycle helmet.',
      { if: 'dlc_june_told', text: 'Jay has told her that her mother is alive.' },
    ] },
    { who: 'toby', after: 'd26_blue_lights', if: 'dlc_june_told', text: 'Toby met June at last, in a stolen fire engine, and tried to tell her about the box. She said it would keep.' },
    { who: 'dess', after: 'd27_the_powder_store', text: [
      'The Firecrest is rebuilt. Jay gave Dess the starter key, and she started the car first time.',
      { if: 'dlc_june_told', text: 'June met her on the fort steps and gave back the helmet.' },
    ] },
    { who: 'leo', after: 'd27_the_powder_store', text: 'Leo phoned to say he was glad Dess is well, and would ask Ottoline to stand down.' },
    { who: 'ottoline', after: 'd28_comment_card', text: 'Leo asked Ottoline to stand down. She stole the Firecrest anyway: "I simply don\'t lose." She gave Jay a blank comment card.' },
    { who: 'fenella', after: 'd29_road_closed', text: 'Fenella borrowed a real tank for Jay, and signed the forms as Chet.' },
    { who: 'ottoline', after: 'd30_the_last_lap', text: 'Ottoline was arrested in the Speedway tunnel, holding a comment card she never got to hand over. Jay gave her one star.' },
    { who: 'monty', after: 'd30_the_last_lap', text: 'Monty was eight, on his dad\'s shoulders, when Dess crossed the line. Fifty years later he called her the winner, and got Jay\'s name right.' },
    { who: 'leo', after: 'd30_the_last_lap', text: [
      'Leo told the whole Speedway that Odessa Marlow won, and that he was sorry.',
      { if: 'dlc_end_everybody', text: 'He unbolted CHAMPIONS SINCE DAY ONE from his hotel himself.' },
      { if: ['!dlc_end_everybody', 'd30_the_last_lap'], text: 'He has had the CHAMPIONS signs taken down from his hotels.' },
    ] },
    { who: 'june', after: 'd30_the_last_lap', text: [
      'June heard her mother say "And mind the road", and remembered the voice. Toby gave her the tin box, thirty-four years late.',
      { if: 'dlc_end_hers', text: 'The Firecrest is hers now, on her drive.' },
    ] },
    { who: 'chet', after: 'd30_the_last_lap', text: [
      { if: 'dlc_chet_told', text: 'Chet told forty thousand people the truth about the race. The film is being reshot as Mind the Road, with Chet as Toby.' },
      { if: 'dlc_chet_kept', text: 'Chet took off Rex\'s jacket in front of everyone. The film was shelved, and he is at peace.' },
    ] },
    { who: 'dash', after: 'd30_the_last_lap', text: [
      { if: 'dlc_dash_in', text: 'Dash said "Legend... FOUND!" about the right thing at last. His special was a hit.' },
      { if: 'dlc_dash_left', text: 'Dash turned his camera round to film the truth. His show was cancelled.' },
    ] },
    { who: 'milo', after: 'd30_the_last_lap', text: [
      { if: 'dlc_blog_on', text: 'Milo\'s last post made the front page of the Vicehaven Courier.' },
      { if: 'dlc_blog_off', text: 'Milo is writing the whole story down by hand, in a book called The Firecrest Files.' },
      { if: 'dlc_end_gone', text: 'He wrote the first riddle of the new trail.' },
      { if: 'dlc_end_everybody', text: 'He wrote the plaque by the Firecrest\'s glass room.' },
    ] },
    { who: 'prof_quill', after: 'd30_the_last_lap', text: 'The Professor held the cup for the photograph, and is writing a fourth book: I Was Wrong: A History. It will be very short.' },
    { who: 'toby', after: 'd30_the_last_lap', text: [
      'Toby handed June the tin box properly, with both hands: "Happy birthday. I\'m thirty-four years late."',
      { if: 'dlc_end_gone', text: 'Then he delivered a new tin box to the Halcyon library, on time.' },
    ] },
  );

  // The choices made in Act 4.
  Object.assign(R.choices, {
    d25_junebug: [
      { title: 'Telling June', options: {
          dlc_june_told: 'Jay told June her mother is alive and keeps the fort light. "Is she well?" "She\'s rude." "...Good."',
          dlc_june_wait: 'Jay said June reminded him of someone, and left it for Dess to tell her face to face.',
      } },
    ],
    d30_the_last_lap: [
      { title: 'Where the Firecrest goes', options: {
          dlc_end_hers: 'Jay said, "It\'s June\'s." The Firecrest went home to June\'s drive in Vista Verde.',
          dlc_end_everybody: 'Jay said it belongs to everyone who was there. The Firecrest and the cup stay at the Speedway, where everyone can see them.',
          dlc_end_gone: 'Jay said hide it again and lay a new trail. The Firecrest vanished, and a new tin box waits at the Halcyon library.',
      } },
    ],
  });

  // =====================================================================
  // SIDE CHAINS. They can be played in any order around the main jobs (and
  // after d30), so their recaps never depend on a flag that might be set
  // later than the job itself (d14's Chet choice for Take Two, d23 or d25
  // for the others): those scenes are told neutrally. dlc_blog_* is set in
  // d08, before Marks Out of Ten, Summer Series and Dual Control open.
  // =====================================================================

  Object.assign(R.jobs, {
    // ------------------------------------------- Take Two (Fenella and Chet)
    dst1_second_unit: {
      setup: [
        'Fenella Moss\'s film needs a proper car chase, and her first unit filmed Chet driving at thirty.',
        'So the second unit gets Jay, one take, and a white stunt car the crew have named Trey.',
      ],
      recap: [
        'At Sunreel Studios, Fenella showed Jay the first unit\'s chase: Chet, very slowly.',
        'Then Jay did it properly, in one take: up the ramp over the fake subway, through the sugar-glass bank window, round the western set at full lock and onto the chalk mark.',
        'Fenella called it the best chase on the lot in twenty years. Trey was meant to be blown up later by Gary, the explosives man. Trey lived.',
      ],
      line: 'Jay drove a perfect one-take film chase for Fenella, and brought Trey the stunt car back in one piece.',
    },
    dst2_night_shoot: {
      setup: [
        'Tonight Fenella is filming a chase down the Neon Strand, Castellane\'s street on Isla Paloma.',
        'Jay is to chase the villain car in Trey and wreck it for the cameras. Chet is playing Rex Castellane, in a very big wig.',
      ],
      recap: [
        'Jay chased Vince the stunt driver down the Strand and wrecked his car, while Vince jumped clear.',
        'Then Castellane\'s Guest Services joined in, uninvited and shooting for real, and so did the police. Fenella was delighted and filmed it all.',
        'Jay shook them off and brought Trey back with one bullet nick. Fenella admitted Castellane pays for her film, but says she makes it good while he isn\'t looking.',
      ],
      line: 'Jay filmed a night chase down the Neon Strand, and Castellane\'s Guest Services joined in for real.',
    },
    dst3_rain_machine: {
      setup: [
        'Fenella\'s rain machine has broken, and she needs a storm on Sandpiper Beach before the light goes.',
        'Her idea: Jay borrows a fire engine from the airport, because it has a water cannon on the roof.',
      ],
      recap: [
        'Jay drove a crash tender out of the airport fire station, lost the police and reached Sandpiper Beach just in time.',
        'He soaked Chet and seven extras with the water cannon, so Rex Castellane could shake his fist at a storm. Gully the lifeguard blew his whistle the whole time.',
        'The rain soaked the explosives on Trey\'s roof, so Trey lived again. Gully gave Jay one very full ticket.',
      ],
      line: 'Jay borrowed an airport fire engine to make a storm for Fenella\'s film, and Trey lived again.',
    },
    dst4_the_big_jump: {
      setup: [
        'It is half-time at Mariner Stadium, with forty thousand people inside. Fenella wants Trey to jump six buses in the car park.',
        'Chet Valiant has never gone over thirty in his life, and he is coming too.',
      ],
      recap: [
        'With Chet in the passenger seat, holding his one seatbelt with both hands, Jay jumped all six buses and raced round the stadium before the sun went down. The whole crowd stood up and cheered.',
        'Chet screamed the whole way, in full sentences, and then said only one word: "Again."',
        'Trey, parked safely on his mark, quietly exploded. Gary said it wasn\'t him.',
      ],
      line: 'Jay jumped six buses for Fenella\'s film with Chet beside him, and Chet went over thirty for the first time.',
    },

    // ------------------------------------------- Marks Out of Ten (Hob)
    dsf1_banner_day: {
      setup: [
        'Hob\'s flying club has a sponsor: the Sandpiper Prawn Shack, which paid in prawns.',
        'Jay is to tow its banner low along Sandpiper Beach at lunchtime, so the sunbathers can read it.',
      ],
      recap: [
        'Jay towed thirty metres of banner across the bay, down the beach, over the skate park and along the promenade.',
        'Gully, the lifeguard at Tower Seven, radioed to say he was too low, too loud and upside down. The banner was: it said SENOB REWEF HTIW WON.',
        'Hob had shown Jay how to hook it on, upside down, so he gave them both five out of ten. Jay also got a bag of prawns.',
      ],
      line: 'Jay towed the Prawn Shack\'s banner along the beach for Hob. It was upside down. Five out of ten.',
    },
    dsf2_chimney_pots: {
      setup: [
        'Hob\'s record round the Chimney Pots course at Ironside, 3 minutes 11 seconds, has stood for twenty years.',
        'He polishes the board it is painted on. He says Jay doesn\'t have to beat it.',
      ],
      recap: [
        'Jay flew the Skylark to Ironside: between the power station\'s two big chimneys, low over the rail yard and along the refinery pipes, close enough to read HOB WAS HERE on one of them.',
        'He did it in 3 minutes 4 seconds, a new record. Hob blamed a tailwind, said he was delighted, painted J. MERCER on the board, and gave Jay eight.',
      ],
      line: 'Jay beat Hob\'s twenty-year-old record round the Ironside chimneys, and Hob painted Jay\'s name on the board.',
    },
    dsf3_doughnut_drop: {
      setup: [
        'It is Tuesday, so the doughnuts must go out, but the Skylark is in for its check.',
        'Today Jay flies them in the club\'s little Sparrow helicopter, with three drops to make.',
      ],
      recap: [
        'Hob talked Jay through his first helicopter flight by radio. Jay landed boxes on a clinic roof for the night nurses, and on the observatory lawn for the astronomers.',
        'Then he flew across the bay to the Halcyon sports field, where Professor Quill had ordered twelve for Milo. Milo got the first doughnut ever delivered to him by air.',
        'Milo gave the landing nine. Hob gave it five and a half.',
      ],
      line: 'Jay delivered Hob\'s doughnuts by helicopter, and Milo got his first ever doughnut by air.',
    },
    dsf4_check_ride: {
      setup: [
        'Today is Hob\'s check ride, and he is wearing a tie. Jay must land at the big airport between the airliners, then fly home to Paloma Field in a crosswind.',
        'In forty years, Hob has never given a ten.',
      ],
      recap: [
        'Hob sat beside Jay and said nothing, loudly. Jay landed on the airport\'s main runway just ahead of an airliner, then flew home over the Coral Marina light, where Toby told him to waggle his wings.',
        'He landed at Paloma Field in a strong crosswind, so softly that Hob forgot he was in an aeroplane. Hob gave him a ten, and the blue club Skylark on Tuesdays.',
      ],
      line: 'Jay passed Hob\'s check ride with the first ten Hob has given in forty years, and got the blue Skylark on Tuesdays.',
    },

    // ------------------------------------------- Summer Series (Pip)
    dsr1_oval_sprint: {
      setup: [
        'Pip\'s team, Marlow Racing, has one old Drifter and two tiny sponsors. If it scores nothing in round one of the Summer Series, it loses its garage.',
        'Pip isn\'t allowed to race, so Jay is driving.',
      ],
      recap: [
        'Pip\'s racing licence was suspended for calling the chief steward a lamppost, so Jay raced for her, from the back of the grid.',
        'Monty kept calling him Jim Mercy. Jay passed everyone, took the inside line at turn three, and beat Teddy Castellane to win. Marlow Racing keeps its garage.',
        'Monty told Pip that the inside at three was her gran\'s move, fifty years ago, on this track.',
      ],
      line: 'Jay won round one of the Summer Series for Pip\'s team, Marlow Racing, so the team keeps its garage.',
    },
    dsr2_campus_sprint: {
      setup: [
        'The Summer Series street round is two laps of closed roads round the Halcyon campus, at night.',
        'Milo has made a flag for Marlow Racing. Officer Plum has not been told about the race.',
      ],
      recap: [
        'Milo cheered from behind a barrier, and Officer Plum said he had seen Jay\'s face somewhere near a clock. Monty commentated from an ice-cream van.',
        'On the last lap Teddy cut across the lawn, and Plum chased the wrong car on his bicycle. Jay won anyway, and Plum gave Teddy a ticket for conduct unbecoming a lawn.',
        'Pip told Milo "And mind the road". She doesn\'t know why she says it.',
      ],
      line: 'Jay won the Summer Series street round at Halcyon, and Officer Plum gave Teddy a ticket for driving on the lawn.',
    },
    dsr3_dirty_air: {
      setup: [
        'Teddy Castellane is suddenly two seconds a lap faster, and Pip says nobody finds two seconds.',
        'Now Castellane mechanics are taking his car away for a "service" on a Tuesday. Pip wants to follow it.',
      ],
      recap: [
        'With Pip hiding in the footwell, Jay tailed the gold transporter to a lock-up in Cinder Creek. Inside, Teddy\'s car was getting a banned turbo engine.',
        'Teddy turned up and found out too: his uncle had ordered it and never told him. Then Guest Services arrived to "tidy up", and started shooting.',
        'Jay got Pip and Teddy back to the Speedway, where there were too many witnesses.',
      ],
      line: 'Jay and Pip caught Castellane Racing cheating with a banned engine, and rescued Teddy from Guest Services.',
    },
    dsr4_southbay_classic: {
      setup: [
        'It is the Southbay Classic, the last round of the Summer Series: ten laps, the whole field, and a cup the size of an egg cup.',
        'A marshal is walking down the grid towards Pip with something in his hand.',
      ],
      recap: [
        'The marshal gave Pip her racing licence back, with the stewards\' apologies. She gave Jay the keys anyway: this season was his, and next season she would drive.',
        'Teddy raced on his old engine, fair and square. After a side-by-side battle, Jay won the race and the series.',
        'Pip got the egg cup, Teddy shook her hand, and Pip gave Jay the keys to the team\'s spare Drifter.',
      ],
      line: 'Jay won the Southbay Classic and the Summer Series, and Pip got her racing licence back.',
    },

    // ------------------------------------------- Dual Control (June)
    dsl1_three_point_turn: {
      setup: [
        'June Marlow wants to keep an eye on the man who has been driving her daughter about.',
        'Today Jay is to watch her most nervous pupil, Rosa Lindqvist, try her twelfth three-point turn.',
      ],
      recap: [
        'Rosa\'s turn took seven points and a hedge. When she got out to swap seats, a thief jumped into June\'s learner car and drove off, with June\'s clipboard inside.',
        'Jay borrowed a neighbour\'s car and boxed the thief in, gently. The thief ran, and Jay drove the learner car home without a scratch.',
        'June marked him anyway: boxing in, good; mirror checks, none; the verge, a minor fault.',
      ],
      line: 'A thief stole June\'s learner car in the middle of a lesson, and Jay brought it home, clipboard and all.',
    },
    dsl2_school_run: {
      setup: [
        'The Vista Verde School under-twelves have a cup final at Mariner Stadium in twenty minutes, and their bus has broken down.',
        'June has volunteered Jay to drive them in the school van. There is also a cake.',
      ],
      recap: [
        'Jay drove eleven footballers, Dougie Penn the pelican mascot, and a huge gold cake shaped like the cup to Mariner Stadium. The team sang the same one-verse song about a pelican all the way.',
        'When the cake slid on a corner, June caught it without looking up. They arrived on time, cake and all, and Dougie shook Jay\'s hand with a wing.',
        'June counted seven minor faults. And a pelican.',
      ],
      line: 'Jay drove a school football team, a pelican mascot and a giant cake to the cup final, on time.',
    },
    dsl3_test_day: {
      setup: [
        'It is Sunday in the Verde Mall car park, and time for the Marlow Test. Nobody drives June\'s daughter about who hasn\'t passed it.',
        'Pip got ninety-one. She argued with the cones.',
      ],
      recap: [
        'Jay put his hands at ten and two without thinking. His grandmother taught him that, in a car park, and June called her a sensible woman.',
        'He wove through the cones, reversed round a corner, stopped in time for a runaway trolley and parallel parked. June gave him ninety-four per cent, and kept his marked sheet "for reference".',
        'Rosa passed her real driving test too.',
      ],
      line: 'Jay passed the Marlow Test with ninety-four per cent, and Rosa passed her real driving test.',
    },
  });

  // People met in the side chains.
  Object.assign(R.who, {
    rosa: { intro: 'dsl1_three_point_turn', bio: 'Rosa Lindqvist, sixteen, is June\'s most nervous pupil. She has failed her three-point turn eleven times. June says twelve is a lucky number.' },
    dougie: { intro: 'dsl2_school_run', bio: 'Dougie Penn is in Year Seven at Vista Verde School, and he is the football team\'s pelican mascot. He has stayed in character since September. "Since the egg," he says.' },
  });

  // Later news from the side chains (and one that needs both a side job
  // and d30, whichever came first: Fenella films the real lap either way).
  R.updates.push(
    { who: 'fenella', after: 'dst4_the_big_jump', text: 'Trey the stunt car lived through every scene he was meant to die in, then exploded on his own, parked.' },
    { who: 'chet', after: 'dst4_the_big_jump', text: 'Chet rode over six buses with Jay and went over thirty for the first time in his life. He got to seventy. He wants to go again.' },
    { who: 'fenella', after: 'd30_the_last_lap', if: 'dst4_the_big_jump', text: 'Fenella filmed Dess\'s real lap of honour. She says it is the best thing she has ever shot, and not one frame of it was for the movie.' },
    { who: 'gully', after: 'dsf1_banner_day', text: 'Gully radioed Jay\'s plane to say it was too low, too loud and upside down, and then whistled at it.' },
    { who: 'gully', after: 'dst3_rain_machine', text: 'Gully gave Jay a ticket for a fire engine on the beach and rain on the beach. "It\'s one ticket. It\'s a very full ticket."' },
    { who: 'hob', after: 'dsf2_chimney_pots', text: 'Jay beat Hob\'s twenty-year-old Chimney Pots record. Hob painted his own name underneath, "where I can see it every day and grow as a person".' },
    { who: 'milo', after: 'dsf3_doughnut_drop', text: 'Milo got the first doughnut ever delivered to him by air. Hob gave him a seven, for enthusiasm.' },
    { who: 'prof_quill', after: 'dsf3_doughnut_drop', text: 'The Professor sat in Hob\'s helicopter and didn\'t feel sick at all. Helicopters, he says, don\'t corner.' },
    { who: 'hob', after: 'dsf4_check_ride', text: 'Hob gave Jay a ten, the first in forty years of teaching, and lent him the blue club Skylark on Tuesdays. Doughnuts are Tuesdays.' },
    { who: 'toby', after: 'dsf4_check_ride', text: 'Toby radioed Jay over the Coral Marina light and taught him to waggle his wings.' },
    { who: 'pip', after: 'dsr1_oval_sprint', text: 'Pip\'s racing licence was suspended along with her road one, for calling the chief steward a lamppost. She stands by it.' },
    { who: 'plum', after: 'dsr2_campus_sprint', text: 'Officer Plum chased the wrong car round the campus on his bicycle, then gave Teddy a ticket for conduct unbecoming a lawn.' },
    { who: 'teddy', after: 'dsr3_dirty_air', text: 'Teddy found out his uncle had a banned engine put in his car without telling him. "I thought I was just good."' },
    { who: 'leo', after: 'dsr3_dirty_air', text: 'Castellane Racing secretly put a banned engine in his nephew Teddy\'s car, on "your uncle\'s orders". Then Guest Services came to tidy up.' },
    { who: 'teddy', after: 'dsr4_southbay_classic', text: 'Teddy raced the Southbay Classic on his old engine, fair and square, and his uncle isn\'t speaking to him. "Next season. Me and you, Pip. No uncles."' },
    { who: 'pip', after: 'dsr4_southbay_classic', text: 'Pip has her racing licence back, laminated, with the stewards\' apologies. Marlow Racing won the Summer Series and a cup the size of an egg cup.' },
    { who: 'monty', after: 'dsr4_southbay_classic', text: 'Over the Summer Series, Monty called Jay Jim Mercy, Jem Mersey, Jack Mackerel, Joe Mercury and Jay Murphy.' },
    { who: 'june', after: 'dsl3_test_day', text: 'June gave Jay ninety-four per cent in the Marlow Test, and kept his marked sheet in her pocket, "for reference".' },
    { who: 'rosa', after: 'dsl3_test_day', text: 'Rosa passed her driving test on her third go, with a three-point turn in three points. The silent examiner spoke.' },
  );
})();
