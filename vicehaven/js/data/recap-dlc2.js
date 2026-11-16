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
})();
