/*
 * data/recap-act1.js — "Story so far" recaps for ACT 1: HOMECOMING (m01 to
 * m08), the prologue, and side chain 1, Night Shift (ns1 to ns4). Read by
 * js/storylog.js (pause menu → Story so far, the phone's Story app and the
 * "Previously in Vicehaven…" card).
 *
 * Parts are strings and { if, text } objects joined with single spaces; `if`
 * is a flag, '!flag', or an array of those (all must hold). Completed mission
 * ids count as flags. Act 1's branches: kept_cut / gave_cut (m05, read in m08),
 * ns_hesitated (ns2) and ns_mercy (ns3). No spoilers past each job: later
 * revelations live in the act files where they happen.
 */
(function () {
  'use strict';
  const S = window.VH.Data.story; // created by story.js (loaded first)
  const R = (S.recap = S.recap || { prologue: null, acts: {}, jobs: {}, who: {}, updates: [], choices: {} });

  // What the player knows before m01's first scene: the opening blackout at
  // Pier 9, plus the backstory Jay carries home. Nothing about who tipped
  // whom off, what was in the van, or who fired the shot.
  R.prologue = [
    'Jay Mercer grew up on Heron Street in Vicehaven, raised by his grandmother, Nana Lu.',
    'He became the best getaway driver in the city, driving for a planner called Augie Vance.',
    'Three years ago, Augie\'s crew robbed a Tidewater Security armoured van at Pier 9, in the Saltmarsh Docks.',
    'It went wrong. There was a shot, and Tommy Reyes, nineteen, the little brother of Jay\'s girlfriend Mae, was killed.',
    'Augie shouted “Drive!”, and Jay drove.',
    'Then he left Vicehaven, before Tommy\'s funeral, and spent three years driving lettuce trucks inland, at the speed limit.',
    'Now Nana Lu has died, and Jay has come home for her funeral. He is already late.',
  ];

  R.acts[1] = {
    title: 'Homecoming',
    intro: [
      'Jay is back in Vicehaven for one week, for Nana Lu\'s funeral.',
      'He means to bury her, say as little as possible to the people he left behind, and drive away again.',
    ],
    outro: [
      'Jay\'s week is nearly up. Nana Lu\'s house is saved, paid off with the bank\'s own money, and he has a new crew in Noor and Ansel.',
      'He has met the two police officers who matter: Captain Horne, who seems to know all about him, and Detective Calder, who wants the truth about Tommy.',
      'And Augie Vance, the man who told him to drive, gets out of prison on Thursday. He has asked for Jay.',
    ],
  };

  Object.assign(R.jobs, {
    // ---------------------------------------------------------------- m01
    m01_homecoming: {
      setup: [
        'Jay is back in Vicehaven for the first time in three years, for Nana Lu\'s funeral at St. Brigid\'s church.',
        'The coach took nine hours, the funeral started forty minutes ago, and he has no car.',
      ],
      recap: [
        'Jay stole a car and reached St. Brigid\'s just in time to throw the first earth on Nana Lu\'s coffin.',
        'There he faced the people he left behind: his oldest friend, Dex Calloway, and Dex\'s daughter Birdie; Tommy\'s mother, Lourdes Reyes, who hugged him;',
        'and Tommy\'s sister Mae, Jay\'s ex, who told him to be sad somewhere else. A woman in a green car watched from across the road.',
        'At Dex\'s garage, Halberd Security men were pushing Dex to sign up to Voss Meridian\'s “Renewal”. Jay threw them out and got back Dex\'s stolen cash box.',
        'Dex gave him Nana Lu\'s car, Lulu. Jay said he would stay a week.',
      ],
      line: 'Jay came home late for Nana Lu\'s funeral, faced the people he left behind, and was given her car, Lulu.',
    },

    // ---------------------------------------------------------------- m02
    m02_what_she_left: {
      setup: [
        'Jay goes to Nana Lu\'s pink bungalow on Heron Street, the house he grew up in.',
        'Her neighbour, Grace Oyelaran, is waiting on the next porch, and there is a padlock on the front door.',
      ],
      recap: [
        'Nana Lu had borrowed money against her house from Pelican Home Equity and never told Jay.',
        'Now $62,000 was due within 30 days, or Pelican would sell the house. They had already padlocked it and taken her things to their repo yard.',
        'That night Jay sneaked past the guards and took back what he could carry: her photo tin, her recipe box, her softball bat and her old LULU 1 number plate.',
        'The plate brought back a memory of her teaching him to drive at twelve: “Hands at ten and two. Heart at twelve.”',
        'Then Dex texted. He knew a crew that needed a driver.',
      ],
      line: 'Jay found Nana Lu\'s house seized over a $62,000 debt, and stole her belongings back from the repo yard.',
    },

    // ---------------------------------------------------------------- m03
    m03_ten_and_two: {
      setup: [
        'Jay needs $62,000 to save Nana Lu\'s house, and Dex knows a crew that needs a driver.',
        'Tonight Dex is introducing him to them on the patio of the Last Resort, a bar in Harbor Point.',
      ],
      recap: [
        'Dex introduced Jay to Noor Haddad, who used to work at the city\'s Signal Office and can make traffic lights turn green,',
        'and Ansel Boateng, a gentle former heavyweight boxer who gardens and doesn\'t hit people.',
        'The job was the nightly cash run at Goldline Bullion and Pawn on Grand Avenue.',
        'Jay waited calmly beside a police car while the others took the bags, then got them away, swapped to a dentist\'s car and delivered it to Dex without a scratch.',
        'They each took $6,000, and Ansel gave Jay a pistol to carry. Oddly, Dex knew Jay\'s motel room without being told.',
      ],
      line: 'Jay drove his first job back, a cash grab on Grand Avenue, with his new crew, Noor and Ansel.',
    },

    // ---------------------------------------------------------------- m04
    m04_casa_palma: {
      setup: [
        'Lourdes Reyes has asked Jay to visit Casa Palma, the apartments where the Reyes family lives.',
        'He hasn\'t been there since Tommy died. A three-storey mural of Tommy now covers one wall.',
      ],
      recap: [
        'Lourdes showed Jay the mural of Tommy in his yellow hoodie, painted by Teo Vance, Augie\'s son.',
        'She wouldn\'t let Jay apologise: Tommy chose, she said. Jay nearly told her who brought Tommy into the job, and didn\'t.',
        'Then a Voss Meridian crew came to paint over the mural. Jay fought them, and when armed Halberd guards arrived, Teo and his Lantern Kings joined in.',
        'Jay followed the paint van to Voss Meridian\'s loading bay under Vicehaven Tower, and Teo explained: Harlan Voss owns half the city and wants the rest.',
        'Afterwards Mae stitched up Wick, a young King, and warned Jay not to get himself killed.',
      ],
      line: 'Jay and Teo\'s Lantern Kings saved Tommy\'s mural from Voss Meridian\'s painters, and Jay learned the name Harlan Voss.',
    },

    // ---------------------------------------------------------------- m05
    m05_the_toolbox: {
      setup: [
        'Dex has asked Jay to come to Calloway Auto at seven.',
        'He has something he has been keeping for Jay for three years, and a hot car that has to be delivered by nine.',
      ],
      recap: [
        'Dex opened a red toolbox holding $40,000: Jay\'s share from the Tidewater job, which Augie made Dex promise to keep for him. Jay didn\'t want money from the night Tommy died.',
        'First they delivered a stolen car to Rhea Kostas, boss of the Salts dockers. She said Augie\'s parole hearing is in two weeks, and people are asking what he did with the Tidewater money.',
        'Dex was jumpy all evening, hiding texts from someone called “H”, and a police car was leaving his garage when they got back. He called it a parking appeal.',
        { if: 'kept_cut', text: 'Then Jay chose to keep the money for Nana Lu\'s house.' },
        { if: 'gave_cut', text: 'Then Jay decided the money was Tommy\'s, and secretly left it in Lourdes\'s mailbox.' },
      ],
      line: [
        'Dex gave Jay his $40,000 share from Tidewater,',
        { if: 'kept_cut', text: 'and Jay kept it to save Nana Lu\'s house.' },
        { if: 'gave_cut', text: 'and Jay secretly left it all in Lourdes\'s mailbox.' },
        { if: ['!kept_cut', '!gave_cut'], text: 'and Jay had to decide whose it was.' },
      ],
    },

    // ---------------------------------------------------------------- m06
    m06_tick_tock: {
      setup: [
        'Noor has entered Jay in a street race at Heron and Coral tonight, for an $8,000 prize.',
        'She can\'t touch the traffic lights, because too many people are filming. It\'s just driving.',
      ],
      recap: [
        'At the race, a big man in a golf shirt was taking bets: Captain Wade Horne of the police\'s Southside division.',
        'He knew Jay\'s name, tapped his gold watch, and said, “Tick tock, Mercer. Welcome home.”',
        'Jay won the race. Then Horne\'s police raided it, just to show they could, and Jay lost them all, helicopter included.',
        'At the seawall, Detective Ines Calder, the woman from the green car, was waiting. She had worked the Tidewater case.',
        'The police report says Tommy had a gun, she said. Was it true? Jay didn\'t answer. She gave him her card.',
      ],
      line: 'Jay won a street race, then met two police officers: Captain Horne, who taunted him, and Detective Calder, who asked about Tommy.',
    },

    // ---------------------------------------------------------------- m07
    m07_signal_fire: {
      setup: [
        'The city has finally locked Noor out of its traffic lights. She needs a permanent back door: a box plugged into the signal relay on a Downtown rooftop.',
        'She can\'t climb and she can\'t drive. Jay can.',
      ],
      recap: [
        'Noor told Jay why she was fired: she reported that Voss Meridian\'s $40 million SmartFlow traffic system was a fake.',
        'Jay crossed the rooftops and plugged in her box. While it uploaded, Noor mentioned a secret police list of paid informants.',
        'One, code-named LUGNUT, has been paid by Southside every month since before Tidewater.',
        'Halberd guards caught Jay as the upload finished. He fought his way out, took an SMG, and wrecked the Halberd SUV carrying the relay\'s backup drive.',
        'Then Noor turned every light on Grand Avenue green, because she could.',
      ],
      line: 'Jay planted Noor\'s back door into the city\'s traffic lights, and heard about a police informant code-named LUGNUT.',
    },

    // ---------------------------------------------------------------- m08
    m08_your_home_our_future: {
      setup: [
        'Nana Lu\'s house needs $62,000.',
        { if: 'kept_cut', text: 'Jay has $40,000 from the toolbox, so he needs $22,000 more.' },
        { if: 'gave_cut', text: 'Jay gave his $40,000 away, so he needs all of it.' },
        'The money will come from the bank that took the house, Pelican Home Equity. The crew meets at the Last Resort to plan.',
      ],
      recap: [
        'Jay drew the plan on a napkin and Noor fixed it.',
        { if: 'kept_cut', text: 'With $40,000 from the toolbox already in hand, they only had to rob “the rest”.' },
        { if: 'gave_cut', text: 'Jay had given his $40,000 away, so they needed all $62,000. Ansel called that beautiful; Noor called it stupid.' },
        'Dex stayed away, saying it was Birdie\'s recital.',
        'In flamingo masks, Noor and Ansel robbed Pelican Home Equity while Jay waited outside. He rode Noor\'s green lights down Meridian Boulevard, past Mae\'s ambulance. She recognised him.',
        'They escaped in Lulu, and Noor paid off the house with Pelican\'s own money.',
        'On the porch, Grace told Jay that Nana Lu\'s loan had paid for Tommy\'s funeral.',
        'Then Dex called: Augie gets out of prison on Thursday, and he asked for Jay.',
      ],
      line: 'The crew robbed Pelican Home Equity and saved Nana Lu\'s house, and then Dex called: Augie Vance gets out on Thursday.',
    },

    // ------------------------------------------------- Night Shift: ns1
    ns1_medic_12: {
      setup: [
        'Lourdes has sent Jay to Mercy General with soup for Mae, who works nights on the ambulance Medic 12.',
        'Her partner, Gus, has hurt his back, and she is short of a driver.',
      ],
      recap: [
        'Mae let Jay drive Medic 12 for one call: Wick, the young Lantern King, stabbed in Lantern Alley over a pair of sneakers.',
        'Jay got him to Mercy General as smoothly as he could. Then Wick slipped out before the police came.',
        'Jay talked him back by telling him how Augie gave him a job, instead of calling the police, when Jay stole his car at seventeen.',
        'Mae saw it all. “You enjoyed it,” she said.',
      ],
      line: 'Jay drove Mae\'s ambulance for one call and got Wick, stabbed in Lantern Alley, to hospital and back into bed.',
    },

    // ------------------------------------------------- Night Shift: ns2
    ns2_pileup: {
      setup: [
        'Gus is still off with his back, and Mae asks Jay to drive Medic 12 for one more night.',
        'The relief driver they sent her brakes like he is apologising.',
      ],
      recap: [
        'Six cars crashed on Meridian Boulevard, two of them burning, with four people trapped.',
        'Jay pulled them out one by one while Mae kept them alive: a trucker, a nursing student, a best man with the wedding rings, and last, a Halberd guard.',
        { if: 'ns_hesitated', text: 'Jay hesitated over the guard until Mae grabbed his arm.' },
        { if: '!ns_hesitated', text: 'Jay wanted to stop for the guard, but he didn\'t.' },
        'They got clear just before the guard\'s car exploded. “We don\'t pick,” Mae told him. “The second we pick, we\'re just another gang with a siren.”',
      ],
      line: 'Jay and Mae pulled four people out of a burning pileup on Meridian Boulevard, a Halberd guard among them.',
    },

    // ------------------------------------------------- Night Shift: ns3
    ns3_the_list: {
      setup: [
        'Gus is back on Monday, so this is Jay\'s last night driving Medic 12.',
        'Mae is drinking terrible coffee at Heron and Coral, the corner where every street race starts.',
      ],
      recap: [
        'A street racer hit Henri Baptiste, who had swept Heron and Coral for thirty years.',
        'Mae worked on him while Jay chased the car down in the ambulance. The driver, Colby Strand, blamed the racer who never stopped, Bumper Kessel.',
        { if: 'ns_mercy', text: 'Jay held him for the police without hurting him.' },
        { if: '!ns_mercy', text: 'Jay beat him, and it didn\'t help at all.' },
        'Henri died in the ambulance, with Mae holding his hand. At dawn she showed Jay her notebook of every patient she has lost. Tommy is the first name.',
      ],
      line: 'A hit-and-run killed Henri Baptiste, and Mae showed Jay her notebook of everyone she has lost, with Tommy first.',
    },

    // ------------------------------------------------- Night Shift: ns4
    ns4_gus_last_shift: {
      setup: [
        'It is Gus\'s last shift on Medic 12, after thirty-four years.',
        'The Crown parade has filled Grand Avenue, and Mae is calling Jay.',
      ],
      recap: [
        'Mae and Gus had picked up Renata, a woman in labour, and Medic 12 was stuck in the Crown parade.',
        'Gus couldn\'t drive in his back brace, so Jay threaded the ambulance through the marching bands to hospital.',
        'The baby was born in the back, and Renata named him after Gus, not Jay. Gus gave Jay his Medic 12 patch: “Get them there. Everything else is paperwork.”',
        'Mae laughed at him for singing to the car: “You\'re still you.”',
      ],
      line: 'On Gus\'s last shift, Jay got a mother in labour through the Crown parade, and baby Gus was born in the ambulance.',
    },
  });

  // Who's who: characters introduced in Act 1 and Night Shift. Bios say only
  // what Jay knows at the intro; later news goes in R.updates.
  Object.assign(R.who, {
    // In the prologue, so always shown.
    jay: { intro: null, bio: 'The best getaway driver Vicehaven ever had. Raised by Nana Lu on Heron Street after his father drove away. After Pier 9 he left, and spent three years driving lettuce trucks at the speed limit. He talks to cars, and nobody rides with him without a seatbelt.' },
    nana_lu: { intro: null, bio: 'Lucinda “Nana Lu” Mercer, Jay\'s grandmother. She raised him in a pink bungalow on Heron Street, fed half the neighbourhood, and taught him to drive in a motel car park. She has died of a stroke, at 81.' },
    tommy: { intro: null, bio: 'Tomás “Tommy” Reyes, Mae\'s little brother, who looked up to Jay. Funny, reckless, always in a yellow hoodie, always with a plan that had no middle. He was nineteen when he died on the Pier 9 job.' },
    augie: { intro: null, bio: 'Augie Vance planned every job Jay ever drove, Pier 9 included, and gave him his start when Jay was a teenage car thief. Augie went to prison for Pier 9 and never named anyone. He writes to Jay. Jay has never opened a letter.' },

    // m01 Homecoming
    dex: { intro: 'm01_homecoming', bio: 'Dex Calloway, Jay\'s oldest friend: a big, warm mechanic who runs Calloway Auto in Old Market. A single dad to Birdie, he never swears in front of her and says “fudge” instead. His garage is falling apart, except for one shiny new lift.' },
    birdie: { intro: 'm01_homecoming', bio: 'Birdie Calloway, Dex\'s eight-year-old daughter. She asks the questions nobody wants asked, like whether Jay is a criminal. Her dad told her Jay was “between opportunities”.' },
    lourdes: { intro: 'm01_homecoming', bio: 'Lourdes Reyes, Tommy and Mae\'s mother. She lives at Casa Palma with a courtyard full of cats, and she forgave Jay before he could even say sorry, which somehow hurts him more.' },
    mae: { intro: 'm01_homecoming', bio: 'Mae Reyes, Tommy\'s big sister and Jay\'s ex. A paramedic who works nights. She came to the funeral for Nana Lu, who fed her every Sunday for six years, not for Jay, and told him to be sad somewhere else.' },
    ilunga: { intro: 'm01_homecoming', bio: 'Father Emmanuel Ilunga, the priest at St. Brigid\'s, who buried Nana Lu. Dry and kind. Nana Lu told him Jay would be late, so he waited, and he has offered to hear Jay\'s confession any day of the week.' },
    rafi: { intro: 'm01_homecoming', bio: 'Rafi Duarte, seventeen, Dex\'s apprentice at Calloway Auto. He sweeps the floor, wants to learn everything at once, and was the one Halberd had pinned against the wall.' },

    // m02 What She Left
    oyelaran: { intro: 'm02_what_she_left', bio: 'Grace Oyelaran, Nana Lu\'s next-door neighbour on Heron Street for forty years. Seventy-four, sharp and kind. She watched the repo men take Nana Lu\'s things, keeps her key under her own mat, and feeds Jay whether he likes it or not.' },

    // m03 Ten and Two
    noor: { intro: 'm03_ten_and_two', bio: 'Noor Haddad, the crew\'s eyes. She used to work at the city\'s Signal Office, and from her laptop she can make the right traffic lights turn green. She plans everything in spreadsheets with tabs, and is frightened of nearly everything else.' },
    ansel: { intro: 'm03_ten_and_two', bio: 'Ansel Boateng, a huge, gentle former heavyweight boxer who nearly won a title. He is the crew\'s muscle, but he doesn\'t hit people: he stands in doorways, and they make good decisions. He gardens, and reads poems to his plants.' },

    // m04 Casa Palma
    teo: { intro: 'm04_casa_palma', bio: 'Teo Vance, Augie\'s son, who leads the Lantern Kings, a street crew from Lantern Alley in Old Market. He painted Tommy\'s mural and wouldn\'t take a penny for it. He calls Jay “my father\'s favourite”, and doesn\'t mean it kindly.' },
    wick: { intro: 'm04_casa_palma', bio: 'Wick Adeyemi, fifteen, a runner for the Lantern Kings. Thrilled and terrified by everything, he is a big fan of “the mural guy”, which is what he calls Jay.' },
    // Named and explained by Teo in m04, though he is not seen until Act 4.
    // If recap-act4.js also defines voss, its entry (loaded later) wins.
    voss: { intro: 'm04_casa_palma', bio: 'Harlan Voss, the man behind Voss Meridian, the company buying up Old Market for its “Renewal”. Halberd Security works for him. Teo says he owns the cranes, the council and half of Tannery Row. Jay has never met him.' },

    // m05 The Toolbox
    rhea: { intro: 'm05_the_toolbox', bio: 'Rhea Kostas runs Kostas Marine Salvage on the docks and, through it, the Salts: dockers, smugglers and, as Dex puts it, a small navy. Blunt, exact and hard to impress. She knows a lot about Augie\'s business.' },

    // m06 Tick Tock
    horne: { intro: 'm06_tick_tock', bio: 'Captain Wade Horne, head of the police\'s Southside division. Off duty, he takes bets at street races in a salmon golf shirt. He taps his gold watch when he is winning, and he knew Jay\'s name before they had met.' },
    calder: { intro: 'm06_tick_tock', bio: 'Detective Ines Calder, of the police\'s Robbery-Homicide squad at Central (“never Southside”). She worked the Tidewater case and watched Nana Lu\'s funeral from her green car. She says she doesn\'t want Jay; she wants whoever wrote the report on Tommy. She swears at her car.' },
    saff: { intro: 'm06_tick_tock', bio: 'Saff Achterberg, the street racer sponsored by the radio station Pulse 96.4. Fast, loud and covered in energy-drink stickers. Her sponsor says she is not allowed to lose to a lettuce-truck driver.' },

    // Night Shift (and seen briefly in m21 by players who skip the chain)
    gus: { intro: ['ns1_medic_12', 'm21_two_ten'], bio: 'Gus Ferreira, Mae\'s partner on the ambulance Medic 12. Sixty-one, with a bad back, a coffee warmer in the cab and a joke for every emergency. He is weeks from retiring after thirty-four years on the road.' },
  });

  // Later news, in story order (the Story so far screen shows newest first).
  R.updates.push(
    { who: 'nana_lu', after: 'm02_what_she_left', text: 'Pelican Home Equity padlocked her house over a $62,000 loan she never told Jay about, and took her things to a repo yard. Jay stole back what he could carry.' },
    { who: 'tommy', after: 'm04_casa_palma', text: 'Teo Vance painted a three-storey mural of Tommy at Casa Palma. Voss Meridian\'s painters tried to cover it; Jay and the Lantern Kings stopped them.' },
    { who: 'augie', after: 'm05_the_toolbox', text: 'Rhea says Augie\'s parole hearing is in two weeks, and that people are asking what he did with the Tidewater money.' },
    { who: 'tommy', after: 'm06_tick_tock', text: 'Detective Calder says the police report claims Tommy had a gun. She asked Jay if it was true. He didn\'t answer.' },
    { who: 'noor', after: 'm07_signal_fire', text: 'Noor was fired for reporting that Voss Meridian\'s $40 million SmartFlow system was a fake, and the Renewal took her father\'s pharmacy. Now she has a back door into every traffic light in the city.' },
    { who: 'nana_lu', after: 'm08_your_home_our_future', text: 'Grace told Jay why Nana Lu borrowed the money: the first $12,000 paid for Tommy Reyes\'s funeral, because Lourdes couldn\'t. Lourdes never knew. The house is paid off now, and Jay has her key.' },
    { who: 'mae', after: 'm08_your_home_our_future', text: 'Mae saw Jay during the Pelican getaway and knew his driving at once. She texted to tell him so, rudely. He didn\'t answer, and didn\'t delete it.' },
    { who: 'augie', after: 'm08_your_home_our_future', text: 'Augie\'s parole came through. He walks out of the VPD Central gate on Thursday at eight in the morning, and he has asked for Jay.' },
    { who: 'wick', after: 'ns1_medic_12', text: 'Wick was stabbed in Lantern Alley over a pair of sneakers. Jay drove him to hospital, and talked him into staying there.' },
    { who: 'tommy', after: 'ns3_the_list', text: 'Mae keeps a notebook of every patient she has lost. She started it the day after Pier 9, so that Tommy\'s name would be first.' },
    { who: 'gus', after: 'ns4_gus_last_shift', text: 'Gus has retired after thirty-four years. The last baby he helped deliver was named after him, and he gave Jay his Medic 12 patch.' },
    { who: 'mae', after: 'ns4_gus_last_shift', text: 'After four shifts on Medic 12 together, Mae is laughing at Jay again. “You still sing to the car,” she told him. “You\'re still you.”' },
  );

  // The decisions made in Act 1 and Night Shift. Keys are the flag an option
  // sets, or its exact label when it sets none.
  Object.assign(R.choices, {
    m05_the_toolbox: [
      { title: 'The Tidewater cut', options: {
        kept_cut: 'Jay kept the $40,000 from the toolbox to save Nana Lu\'s house, leaving him $22,000 short.',
        gave_cut: 'Jay decided the $40,000 was Tommy\'s. He left it all in Lourdes\'s mailbox at night, wrapped in a Calloway Auto rag, for her knee operation.',
      } },
    ],
    ns2_pileup: [
      { title: 'The Halberd driver', options: {
        'Get him out.': 'Jay went straight for the trapped Halberd guard, no questions. “Good,” said Mae. “We don\'t pick.”',
        ns_hesitated: 'Jay hesitated over the trapped Halberd guard, remembering Rafi pinned to a wall, until Mae grabbed his arm. Then he got him out.',
      } },
    ],
    ns3_the_list: [
      { title: 'The driver who hit Henri', options: {
        'Beat him.': 'Jay beat Colby Strand, the driver who hit Henri Baptiste. It didn\'t help, not one bit.',
        ns_mercy: 'Jay tied Colby Strand to a lamp post for the police and told him to say Henri\'s name to them. Mae said good, though part of her had wanted Jay to hurt him.',
      } },
    ],
  });
})();
