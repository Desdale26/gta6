/*
 * data/recap-act2.js — "Story so far" recaps for ACT 2: OLD ENGINES (m09 to
 * m16), and for the side chains The Wedding Car (wc1 to wc4) and The Velvet
 * Tide (vt1 to vt3, which opens after m05).
 *
 * Plain data read by js/storylog.js (pause menu → Story so far, the phone's
 * Story app and the "Previously in Vicehaven…" card). Each job has a setup
 * (present tense, before it starts), a recap (past tense, after it is done)
 * and a one-line summary. Parts are strings or { if, text } objects resolved
 * against the flags and completed jobs.
 *
 * Flags read here: gave_cut (m05; m09 and m16 play differently),
 * trusted_calder / refused_calder (m13) and mae_stay / mae_space (m16).
 * Two small beats are left out on purpose: wc4's Mae cameo (after m16) and
 * Iggy's grace note (after m21) depend on jobs that can be finished after
 * wc4, so a recap that tested them would change after the fact. Likewise the
 * m16 kerb scene is told the same way whether or not Jay has done ns3 (Mae's
 * notebook), because ns3 can come later.
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const R = (S.recap = S.recap || { prologue: null, acts: {}, jobs: {}, who: {}, updates: [], choices: {} });

  R.acts[2] = {
    title: 'Old Engines',
    intro: [
      "Nana Lu's house is paid off, and with it Jay's last reason to stay. Then Dex calls: Augie Vance, the planner who taught Jay everything and took the whole fall for Tidewater, is getting out of prison. He asked for Jay. Specifically Jay.",
    ],
    outro: [
      "Augie is home, and the secret of Tidewater is out: $2.4 million of Voss's bribe money and the Tally, Voss's own book of bribes, now hidden at Kostas Salvage.",
      'Jay knows Tommy was unarmed, and that Horne shot him.',
      { if: 'trusted_calder', text: 'Detective Calder has photos of three pages of the Tally, and has promised to bring Horne down.' },
      'Somebody close to the crew is talking to Southside, and the crew has started looking at each other. And at dawn on Meridian Boulevard, Jay and Mae finally told each other the truth.',
    ],
  };

  Object.assign(R.jobs, {
    // ------------------------------------------------------------ act 2
    m09_the_gate: {
      setup: [
        'Augie Vance, the planner who made Jay a getaway driver, walks out of prison this morning. He did three years for Tidewater and never named Jay. He asked for Jay at the gate, and Jay never opened one of his letters.',
      ],
      recap: [
        'Jay met Augie Vance at the VPD Central gate, with Captain Horne tapping his gold watch on the steps. Halberd tried to box them in on the way to breakfast; Jay lost them.',
        "Over pancakes at the Starlite, Augie said Nana Lu visited him in prison every month. Jay admitted he never opened Augie's 37 letters. Augie joked that half were about his bowels, then said the first one mattered: read it someday.",
        { if: 'gave_cut', text: 'Told the Tidewater cut went to Lourdes, he called Jay his best driver and worst thief.' },
        { if: '!gave_cut', text: "He was glad the Tidewater cut had gone on Nana Lu's roof." },
        'At St. Brigid\'s he stood alone at the vault of his late wife, Celia: “Kept it safe for you.”',
      ],
      line: ['Augie Vance walked out of prison, ate pancakes at the Starlite, and told Jay to read his first letter someday.'],
    },

    m10_sons: {
      setup: [
        'Augie wants to see his son. Teo Vance, who runs the Lantern Kings, has told Jay to tell his father not to come by. Augie is going to Lantern Alley anyway, and Jay is driving.',
      ],
      recap: [
        'In Lantern Alley, Augie tried to talk to Teo, who has never forgiven him: Augie was locked up when Teo\'s mother died, and missed her funeral. “You were the son he wanted. I\'m just the one he had.”',
        'Then Halberd swept the alley to clear it for Voss\'s Phase Two. Jay, Teo and the Lantern Kings held it while Augie shouted advice from behind the noodle cart, and Teo threw Jay a shotgun.',
        'Jay caught Halberd\'s Lucky Garza, who admitted that their director, Kessler Rourke, wants to know what Augie did with “the rest of Tidewater”. Augie went grey and walked away.',
      ],
      line: ['Augie and Teo held Lantern Alley side by side, and Halberd\'s boss turned out to want “the rest of Tidewater”.'],
    },

    m11_celias_garden: {
      setup: [
        'At half past one in the morning, Augie asks Jay to meet him at St. Brigid\'s churchyard in something he can climb in. Rourke wants the rest of Tidewater, and Augie is ready to tell Jay what that means.',
      ],
      recap: [
        "At the churchyard gate Augie confessed that Tidewater wasn't $310,000 but $2.4 million, hidden in the vault where his wife Celia is buried.",
        "Jay lured Horne's two watching cars away in a $400 car with flames down the side, then came back over the wall on foot.",
        "In the vault were two Tidewater bags and a green leather book: the Tally, fourteen years of bribes in Harlan Voss's own handwriting. Councilman Pruitt was in it, and Noor's SmartFlow contract, and “W.H. Southside, monthly”: Captain Horne.",
        "The $2.4 million was Voss's bribe to buy the Phase Two vote. Rhea Kostas agreed to hide the bags at her salvage yard.",
      ],
      line: ["In Celia's vault, Augie showed Jay the $2.4 million and the Tally: fourteen years of Voss's bribes in his own handwriting."],
    },

    m12_the_councilmans_pool: {
      setup: [
        "To prove the Tally is real, Noor has a plan. Councilman Delmar Pruitt is in the book, and he always leaves his briefcase in his car at his Sunday pool parties. So today Jay is a valet.",
      ],
      recap: [
        "In a red valet vest, Jay worked the stand at Councilman Delmar Pruitt's pool party, watched by Hollis, the valet captain, who spotted his getaway hands at once.",
        'He parked cars for a judge and a Port Authority man from the Tally, and a poodle called Bijou. Then he “parked” Pruitt\'s own car all the way down Crestline, briefcase and all, and lost Halberd and Southside.',
        "Pruitt's bank account matched the Tally to the digit. At the Crestline lookout the terrified councilman admitted that half the council, two judges and a Southside police captain are bought. Jay didn't want his money, only his vote on Phase Two, some day.",
      ],
      line: ['Jay parked a poodle, stole a councilman\'s briefcase, and proved the Tally is real.'],
    },

    m13_pension: {
      setup: [
        'Detective Ines Calder, who worked the Tidewater case, wants Jay at the seawall tonight. Horne has ordered the Tidewater evidence box burned at the Halberd depot, and Calder can\'t touch it. Jay can.',
      ],
      recap: [
        'At the seawall, Detective Ines Calder confessed that she signed the Tidewater report saying Tommy was armed, to save her pension, knowing it was a lie.',
        "With her spare revolver, Jay tailed the evidence van to the Halberd depot, beat its escort and took the box. In it was the dashcam from Horne's car: Tommy saying “I'm not armed”, one shot, Horne shouting “Drop it!” at nobody, and the clink of a planted gun.",
        'Calder offered a deal: what Augie has on Voss, for Horne.',
        { if: 'trusted_calder', text: 'Jay said yes, for Tommy, and gave her photos of three pages of the Tally.' },
        { if: 'refused_calder', text: 'Jay said no cops, not even her, and she gave him the dashcam drive to keep.' },
      ],
      line: ['Jay saved the Tidewater evidence from the fire and heard the proof: Tommy was unarmed, and Horne shot him.'],
    },

    m14_dry_run: {
      setup: [
        "Augie is babysitting Birdie at Calloway Auto, and losing to her at poker. He has a new job in mind, and he wants to teach Jay something Jay has never bothered with: how to plan one.",
      ],
      recap: [
        'At Calloway Auto, Birdie showed Jay a junior-deputy sticker: “Daddy says the policeman with the gold watch is our friend.” Jay froze for half a second. Augie, busy losing at cards, didn\'t notice.',
        "The new job was to steal a Halberd armoured van, a key on wheels for later. Augie taught Jay to learn the route, not the map, watching the van at three stops, and Jay beat Halberd's response time to Kostas Salvage by the back roads.",
        'At dusk Augie phoned Dex to cut the van key and told him the night: Tuesday. Alone in his garage, Dex looked up at his new lift.',
      ],
      line: ['Augie taught Jay to plan, Dex agreed to cut a key for Tuesday, and Birdie showed off a sticker from Horne.'],
    },

    m15_armour: {
      setup: [
        "Tuesday, three in the morning, at Kostas Salvage. Augie has the plan, Dex has cut the key, and Noor has written the route. Jay and Ansel are stealing a Halberd armoured van. Rhea wants ten per cent.",
      ],
      recap: [
        "Jay and Ansel crept along the Halberd depot fence by the water, Ansel put the gate guard gently to sleep, and Jay started Bulwark number seven with Dex's key.",
        'As the gate rose, Southside came: four units and a helicopter, called out before the crew even got there. Jay lost them in the slow, heavy van, with help from Ansel and a bin, and hid it in Rhea\'s shed.',
        'Somebody had talked. Everyone looked at Noor, who wrote the route, and she went home hurt. Dex turned up in his pyjamas and quietly asked Jay how well they knew her. Augie remembered that the police were early at Tidewater too.',
      ],
      line: ['The crew stole a Halberd van, but Southside was waiting at the gate: somebody talked, and the crew turned on Noor.'],
    },

    m16_the_starlite: {
      setup: [
        "It's two in the morning and Jay can't sleep. Mae calls: she is at the Starlite Diner, where they used to have a booth, and he isn't to make it weird. He hasn't told her about the tape yet.",
      ],
      recap: [
        'In their old Starlite booth, Jay told Mae about the tape: Tommy was unarmed, and Horne shot him.',
        "Mae confessed she let Tommy's call ring out 22 minutes before he died, because she was angry with Jay. Jay confessed he brought Tommy onto the job when Augie said no.",
        { if: 'gave_cut', text: 'She left him the rag Lourdes found the $40,000 in, washed and ironed.' },
        'She walked out. Following her, they pulled a drunk driver from a burning pickup, Jay holding the light while she worked. On the kerb at dawn he said sorry',
        { if: 'mae_stay', text: 'and asked her to come with him when this is over.' },
        { if: 'mae_space', text: 'and promised her space, for real this time.' },
        { if: ['!mae_stay', '!mae_space'], text: 'at last.' },
        "She said: ask me when it's over.",
      ],
      line: ["At the Starlite, Jay and Mae finally told each other the truth about Tommy's last night."],
    },

    // ---------------------------------------------------- The Wedding Car
    wc1_constance: {
      setup: [
        "At Big Otto's scrapyard, an old man in a chauffeur's cap is staring through the fence at a cream wedding car. She is due in the crusher at ten tonight.",
      ],
      recap: [
        "Iggy Pell drove 3,011 weddings in Constance, a cream car named after his wife. He borrowed against the car to pay for his dying wife's care, and Pelican sold Constance for scrap.",
        "Jay crept past Otto's guards and Duchess, the old guard dog, drove Constance out before the crusher came down, and hid her in Ansel's shed in Laurel Park. Iggy gave Jay the spare key, and said he once drove a Mercer.",
      ],
      line: ["Jay saved Iggy Pell's wedding car, Constance, from the crusher and hid her in Ansel's garden shed."],
    },

    wc2_cold_feet: {
      setup: [
        'Iggy is running the wedding rehearsal at the Founders Park gazebo, with Constance at the kerb and Jay at her wheel. Tasha, the bride, is ready. Marcus, the groom, is standing very still.',
      ],
      recap: [
        'At the rehearsal, Marcus said he was getting something from his car, then drove off at fifty. Jay chased him up Crestline in Constance and boxed him into a hedge, gently.',
        "At the lookout Marcus admitted his father walked out when he was nine. Jay told him about his own: leaving isn't in your blood, it's something you do with your foot. Iggy added that 205 of 206 runaway grooms came back.",
      ],
      line: ['Jay chased down the runaway groom and talked him back: leaving is something you do with your foot.'],
    },

    wc3_something_borrowed: {
      setup: [
        "On the boardwalk, a jeweller is stretching the ring every Pell bride borrows: it was Iggy's late wife's. Iggy won't let it out of his sight, so Jay has come along as the muscle.",
      ],
      recap: [
        "A young pickpocket called Pinch lifted the ring and passed it on. Jay caught her, and she sent him over the arcade roofs to cut off Socks, who was running it to Big Nell.",
        "Jay fought Nell's crew with his fists and took the ring back. Pinch followed to see if he'd really return it. Iggy told her borrowed things come back, that's how you know it was love, and invited her to the wedding.",
      ],
      line: ["Jay got Iggy's wife's ring back from Big Nell's pickpockets, and Iggy invited the pickpocket to the wedding."],
    },

    wc4_the_last_wedding: {
      setup: [
        "It's Tasha's wedding day, and Lourdes is pinning her hem in the Casa Palma courtyard. Iggy's hands aren't steady enough to drive any more, so Jay is wearing the chauffeur's cap. Iggy will supervise.",
      ],
      recap: [
        'Jay drove Tasha in Constance through the Crown motorcade gridlock to Founders Park without a scratch. On the way, Iggy told him he drove Jay\'s mother, Rhonda, to her wedding, and Cal Mercer was forty minutes late. That time, he came.',
        "Tasha and Marcus were married, Pinch threw rice in a new dress, and Iggy danced with the bride. Then he gave Jay both of Constance's keys: “Drive the ones who can't.”",
      ],
      line: ["Jay drove the bride, Iggy danced at the wedding, and then he gave Jay Constance's keys: drive the ones who can't."],
    },

    // ---------------------------------------------------- The Velvet Tide
    vt1_doors_at_ten: {
      setup: [
        "Mars Okonjo has run the Velvet Tide, a dance club on the boardwalk, for eleven years. Tonight three Halberd “community liaisons” want twenty per cent of her door, and she needs someone who doesn't work there.",
      ],
      recap: [
        "Three Halberd “liaisons” with baseball bats had walked into the Velvet Tide demanding twenty per cent of the door to keep it “safe”. Tuli, the doorman, couldn't touch them without Halberd shutting the club, so Jay threw them out.",
        'Mars Okonjo, the owner, said he was the first person in eleven years to help without asking for a cut, and warned that they would be back with bigger friends.',
      ],
      line: ["Jay threw Halberd's collectors out of the Velvet Tide, and Mars Okonjo knew they'd be back."],
    },

    vt2_bad_vinyl: {
      setup: [
        "Halberd has loaded the Velvet Tide's whole record collection into a grey van and driven off up Seawall Drive. Without music the club is just an expensive room, and Lowtide, the DJ, is sitting on the kerb.",
      ],
      recap: [
        "Halberd stole the Velvet Tide's records, crates of originals and test pressings, to shut the club without a fight. Jay caught the grey van, boxed it in, and drove the records home slowly, apologising to them over every speed bump.",
        'Lowtide, the resident DJ, greeted them like newborn babies and picked one to play first that night.',
      ],
      line: ["Jay caught the Halberd van with Lowtide's records and brought every crate back to the Velvet Tide."],
    },

    vt3_last_call: {
      setup: [
        "It's two in the morning on the Velvet Tide's closing night of the season. The last of the crowd is heading home along the boardwalk, and three charcoal cars have just pulled up outside.",
      ],
      recap: [
        "Halberd came on closing night to make sure the Velvet Tide's season ended in flames. Mars wouldn't leave her boardwalk, so Jay held the club, with Tuli on the door and Mars and Lowtide behind the bar, until Halberd gave up.",
        'Lowtide played the record Jay saved, and Mars gave Jay a black card: he is on the list for the VIP balcony, whenever he wants.',
      ],
      line: ['Jay held the Velvet Tide against Halberd on closing night, and Mars put him on the VIP list for good.'],
    },
  });

  Object.assign(R.who, {
    // Dot also turns up in The Silver Foxes, which can come before m09.
    dot: {
      intro: ['m09_the_gate', 'sf3_walt'],
      bio: ["Dorothy “Dot” Pike has worked nights at the Starlite Diner for as long as anyone can remember. She knows everybody's usual order, including the one Jay and Mae always had in the window booth."],
    },
    garza: {
      intro: 'm10_sons',
      bio: ["Lucky Garza is a Halberd field lieutenant who runs the sweeps that clear Old Market for Voss's Renewal. He prints the CONDEMNED stickers, talks very fast when he's cornered, and says the nickname is sarcastic."],
    },
    pruitt: {
      intro: 'm12_the_councilmans_pool',
      bio: ['Delmar Pruitt is a city councilman who sweats through his linen and keeps a bronze statue of his late dog, Chancellor. The Tally says Voss paid him $40,000 “for the zoning”. He is terrified of Voss.'],
    },
    hollis: {
      intro: 'm12_the_councilmans_pool',
      bio: ["Hollis Crane has run the valet stand at Councilman Pruitt's villa for nineteen years. He spotted Jay's getaway hands at once, warned him when Halberd came anyway, and would like his red vest back."],
    },
    iggy: {
      intro: 'wc1_constance',
      bio: ["Iggy Pell drove 3,011 weddings in Constance, a cream car with a chrome swan, named after his late wife. He used to nod to Nana Lu at traffic lights, one old driver to another. His granddaughter Tasha is getting married soon."],
    },
    // Otto is also Jay's truck dealer of last resort in m24.
    otto: {
      intro: ['wc1_constance', 'm24_the_notebook'],
      bio: ['Big Otto runs the scrapyard in Old Market, where wrecks are stacked four high under a magnet crane and Duchess, his very old guard dog, is mostly retired. Otto will sell anything to anybody, sometimes twice.'],
    },
    tasha: {
      intro: 'wc2_cold_feet',
      bio: ["Tasha Pell is Iggy's granddaughter, and she runs her own wedding from a clipboard. Every Pell bride for three generations has gone to the altar in Constance, and Iggy promised her the same when she was four."],
    },
    marcus: {
      intro: 'wc2_cold_feet',
      bio: ["Marcus Idowu is marrying Tasha Pell. His father went out for cigarettes when Marcus was nine and never came back, and Marcus is scared that leaving runs in the family. Jay knows the feeling."],
    },
    pinch: {
      intro: 'wc3_something_borrowed',
      bio: ["Pinch is a young boardwalk pickpocket in pink sneakers who works for Big Nell. She stole Iggy's wife's ring, then helped Jay get it back, because Iggy had called her “young lady”."],
    },
    mars: {
      intro: 'vt1_doors_at_ten',
      bio: ["Marisol “Mars” Okonjo has kept the Velvet Tide open on the boardwalk for eleven years, with a clipboard, an earpiece and no patience left for Halberd, who want a cut of her door."],
    },
    tuli: {
      intro: 'vt1_doors_at_ten',
      bio: ["Tuli Fa'alogo works the door at the Velvet Tide. He is very large and very calm, and he can't lay a finger on Halberd without the club being shut for a “licensing review”."],
    },
    lowtide: {
      intro: 'vt2_bad_vinyl',
      bio: ["Kip “Lowtide” Abernathy is the Velvet Tide's resident DJ. His record collection is his whole personality, he talks to it like a baby, and he can't breathe when it's in the back of somebody else's van."],
    },
  });

  // News that comes out in act 2 (and the side chains above), in story order.
  R.updates.push(
    { who: 'augie', after: 'm09_the_gate', text: ['Augie is out on parole after three years. He wrote Jay 37 letters, numbered like the steps of a job, and says the first one mattered: read it someday.'] },
    { who: 'teo', after: 'm10_sons', text: ["Teo has never forgiven his father for missing his mother's funeral. He still fought beside him in Lantern Alley, and called him Pop by accident. Twice."] },
    { who: 'rourke', after: 'm10_sons', text: ['According to Lucky Garza, Rourke wants to know what Augie did with “the rest of Tidewater”, and has told Halberd to follow Augie wherever he goes.'] },
    { who: 'augie', after: 'm11_celias_garden', text: ["For three years Augie kept the real Tidewater haul, $2.4 million and Voss's Tally, hidden in his wife Celia's vault, and never spent a dollar. The bags are now at Kostas Salvage."] },
    { who: 'voss', after: 'm11_celias_garden', text: ['The Tidewater van was carrying his $2.4 million bribe for the Phase Two vote, and the Tally: fourteen years of his bribes, written in his own hand. He never admitted the money existed.'] },
    { who: 'horne', after: 'm11_celias_garden', text: ['Horne is in the Tally: “W.H. Southside. Monthly.” Voss has paid him every month for fourteen years.'] },
    { who: 'rhea', after: 'm11_celias_garden', text: ['Rhea is keeping the Tidewater bags behind the propellers at Kostas Salvage, for four per cent a month. Three years ago, Augie meant to bring her the same money.'] },
    { who: 'noor', after: 'm12_the_councilmans_pool', text: ['The Tally proves Noor was right about the SmartFlow contract. Somebody wrote her name in its margin: “Problem. Resolved.”'] },
    { who: 'calder', after: 'm13_pension', text: [
      'Calder signed the false Tidewater report to keep her pension, and has wanted to put it right ever since. She is six years sober.',
      { if: 'trusted_calder', text: 'Jay took her deal and gave her photos of three Tally pages.' },
      { if: 'refused_calder', text: 'Jay turned her deal down, and she gave him the dashcam drive to keep.' },
    ] },
    { who: 'horne', after: 'm13_pension', text: ['The dashcam from his own car proves it: Tommy said he wasn\'t armed, Horne shot him, and then Horne set a gun down beside him.'] },
    { who: 'tommy', after: 'm13_pension', text: ['His last words, on Horne\'s dashcam: “I\'m not armed.” He had a yellow hoodie and a phone, and nothing else.'] },
    { who: 'teo', after: 'm14_dry_run', text: ['Teo sent his father a text with one word in it: “Noodles.” Jay says it\'s an invitation.'] },
    { who: 'noor', after: 'm15_armour', text: ['When Southside was waiting at the depot, the crew looked at Noor, who wrote the route. She went home hurt, but she says going home is not the same as leaving.'] },
    { who: 'mae', after: 'm16_the_starlite', text: [
      "Mae let Tommy's last call ring out, and has kept his voicemail ever since. Now she knows Jay was the one who brought Tommy onto the job.",
      { if: 'mae_stay', text: 'Jay asked her to come with him when this is over.' },
      { if: 'mae_space', text: 'Jay promised her space, for real this time.' },
      "Her answer: ask me when it's over.",
    ] },
    { who: 'iggy', after: 'wc4_the_last_wedding', text: ["Iggy gave Jay both of Constance's keys and asked him to drive the ones who can't: hospital runs, funerals, and the old girls at Bayview who want to see the sea."] },
    { who: 'tasha', after: 'wc4_the_last_wedding', text: ["Tasha married Marcus at the Founders Park gazebo in her grandmother's borrowed ring, and gave it back after the first dance."] },
  );

  Object.assign(R.choices, {
    m13_pension: [
      { title: "Calder's deal", options: {
        trusted_calder: ['“Deal. For Tommy.” Jay gave Calder photos of three pages of the Tally, and she promised to get him Horne.'],
        refused_calder: ['“No cops. Not even you.” Jay kept the Tally to himself, and Calder gave him the dashcam drive to keep.'],
      } },
    ],
    m16_the_starlite: [
      { title: 'Mae, at dawn', options: {
        mae_stay: ['“When this is over, come with me.” Mae said to ask her when it\'s over.'],
        mae_space: ['“I\'ll give you space. For real this time.” Mae said to ask her when it\'s over, whatever he was really going to say.'],
      } },
    ],
  });
})();
