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
 * (Act 4's outro is what storylog shows as the ending). Side-chain finales
 * (dst4, dsf4, dsr4, dsl3) colour d30 and the endings. No spoilers past each
 * job: who Odie Wren really is waits for d23, and so on.
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
        { if: 'dlc_dash_in', text: 'Dash and Kit came to the festival too, delighted to be on a team.' },
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
      { if: 'dsf4_check_ride', text: 'Hob gave Jay another ten.' },
      { if: '!dsf4_check_ride', text: 'Hob still gives Jay a nine. A very high nine.' },
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
        'Jay took a driving lesson with June and found Dess\'s helmet in her car',
        { if: 'dlc_june_told', text: ', then told June her mother is alive.' },
        { if: 'dlc_june_wait', text: ', but left it to Dess to tell June the truth.' },
        { if: ['!dlc_june_told', '!dlc_june_wait'], text: '.' },
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
        { if: 'dst4_the_big_jump', text: 'Fenella\'s film crew is inside the Speedway, ready to film the real thing.' },
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
        { if: 'dsr4_southbay_classic', text: 'Pip and Teddy Castellane drove alongside as guards.' },
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
        'Jay drove Dess Marlow\'s lap of honour, fifty years late, and the whole Speedway learned who really won',
        { if: 'dlc_end_hers', text: '; the Firecrest went home to June.' },
        { if: 'dlc_end_everybody', text: '; the Firecrest stays at the Speedway for everyone.' },
        { if: 'dlc_end_gone', text: '; then the Firecrest vanished again.' },
        { if: ['!dlc_end_hers', '!dlc_end_everybody', '!dlc_end_gone'], text: '.' },
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
})();
