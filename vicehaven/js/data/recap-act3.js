/*
 * data/recap-act3.js — "Story so far" recaps for ACT 3: THE TALLY (m17 to
 * m24), and for side chain 2, The Silver Foxes (sf1 to sf4, which opens
 * after m06). Read by js/storylog.js (pause menu → Story so far, the phone's
 * Story app and the "Previously in Vicehaven…" card).
 *
 * Parts are strings and { if, text } objects joined with single spaces; `if`
 * is a flag, '!flag', or an array of those (all must hold). Completed mission
 * ids count as flags. Act 3's branches: saved_teo / chased_rourke (m18, read
 * through m24), dex_forgiven / dex_banished / dex_to_calder (m22, read in m23
 * and m24), and from earlier acts kept_cut / gave_cut, trusted_calder /
 * refused_calder and mae_stay / mae_space. Each test mirrors the mission's
 * own (`if: 'saved_teo' … else`), so every branch, even an impossible one,
 * reads as a sentence. The Foxes' sf3 sets sf_frankie / sf_truth.
 *
 * Left out on purpose, because they can be set after the job is played, so a
 * recap that tested them would change after the fact: nightshift_done in m21
 * (who drives Medic 12, Gus's patch on the dash) and m22, and otis_free /
 * otis_taken in sf4 (a bounty). Walt's death (a text after m25 and sf4, in
 * either order) is here because the Foxes are; its text is empty unless sf4
 * is done.
 */
(function () {
  'use strict';
  const S = window.VH.Data.story; // created by story.js (loaded first)
  const R = (S.recap = S.recap || { prologue: null, acts: {}, jobs: {}, who: {}, updates: [], choices: {} });

  R.acts[3] = {
    title: 'The Tally',
    intro: [
      'Somebody close to the crew is talking to Southside. The police were waiting at the Halberd depot before the crew got there, and everybody looked at Noor.',
      'Augie still has the Tally and Voss\'s $2.4 million hidden at Kostas Salvage. First he means to find out who sang.',
    ],
    outro: [
      'Augie is dead, shot in bay 14 where Tommy died, and Voss has his Tally back.',
      'Dex was LUGNUT all along.',
      { if: 'dex_forgiven', text: 'Jay told him to get in the car anyway.' },
      { if: 'dex_banished', text: 'He has gone north with Birdie.' },
      { if: ['!dex_forgiven', '!dex_banished'], text: 'He is telling Calder everything.' },
      'Calloway Auto has burned down, and the crew lives among the propellers at Kostas Salvage.',
      'But Augie left Jay his notebook, and its last page was a plan: when Voss gets scared he moves the book, so hit it on the road.',
      'The gala is on the 11th. Jay has planned his first job, and named it Tidewater.',
    ],
  };

  Object.assign(R.jobs, {
    // ---------------------------------------------------------------- m17
    m17_canary: {
      setup: [
        'Somebody told Southside about the depot job, and the crew turned on Noor.',
        'Augie has laid four paper napkins out on a table at the Last Resort. He has an old trick for finding out who talked, and he hates it.',
      ],
      recap: [
        'Augie set a canary trap, telling each person a different fake place where the money would move.',
        'Noor\'s spot on the Grand Parkade, Ansel\'s in Laurel Park and Dex\'s on Crane Row all stayed quiet. Teo\'s, Lantern Alley, didn\'t.',
        'Halberd scouts came hunting “the old man” and cornered Wick, and Jay took them down from the rooftops with Celia\'s father\'s old rifle.',
        'A phone in their car named the source as “T.V.”: Teo. He had been meeting Voss\'s lawyer to sell the alley\'s leases, and had told him Augie had “something of yours”. He never knew about the depot.',
        'Augie forgave him. Dex waited up for them with two beers.',
      ],
      line: 'Augie\'s canary trap caught his own son: Teo had tipped off Voss\'s lawyer, but he never knew about the depot.',
    },

    // ---------------------------------------------------------------- m18
    m18_the_crown: {
      setup: [
        'Wick has rung Augie: Teo told Voss\'s lawyer no and tore up the lease papers, and Halberd threw him in a van.',
        'They have taken him up the Crown, Voss\'s half-built tower at Meridian Yard. Augie is waiting by the hoardings in Lulu.',
      ],
      recap: [
        'Jay fought through Meridian Yard and climbed the Crown\'s steel frame. Over a guard\'s radio, Halberd\'s director, Kessler Rourke, gave him a choice.',
        'Below, a van was taking Teo to the docks for “an accident with the water”. And Rourke was driving off with his phone: Halberd\'s codes, and the address of Augie\'s money at Kostas Salvage.',
        { if: '!chased_rourke', text: 'Jay went for Teo, beat the van crew and pulled the bag off his head. Rourke got away with the address. In Lulu, Teo said, “You came back for me,” and called Jay brother.' },
        { if: 'chased_rourke', text: 'Jay wrecked Rourke\'s car and took the phone. Augie saved Teo himself by standing in front of the van, and cracked two ribs. “You chose the phone, brother,” said Teo.' },
      ],
      line: [
        'On top of the Crown, Jay had to pick:',
        { if: '!chased_rourke', text: 'he saved Teo, and let Rourke drive off with the address of the money.' },
        { if: 'chased_rourke', text: 'he took Rourke\'s phone, and Augie saved Teo with two cracked ribs.' },
      ],
    },

    // ---------------------------------------------------------------- m19
    m19_the_first_letter: {
      setup: [
        'It\'s half past five in the morning. Augie is waiting under the arch of Oceanview Pier with two fishing rods he can\'t use and a thermos of Dex\'s terrible coffee.',
        'Jay still carries Augie\'s 37 letters, unopened.',
      ],
      recap: [
        'At dawn, Augie walked Jay down Oceanview Pier,',
        { if: 'chased_rourke', text: 'nursing his ribs,' },
        { if: '!chased_rourke', text: 'glowing because Teo had rung him about nothing,' },
        'talking about Nana Lu\'s plum cake and why he never used guns.',
        'At the far end, Jay opened letter one. Augie had seen Tommy die before Jay even put the car in gear: “There was nobody there to leave.” Three years of guilt broke.',
        'Then the plan: sell Voss his Tally for $5 million and his word to leave Old Market alone, at Pier 9 at 02:10 on the 30th.',
        'Driving home, Augie rang Del Starr on VHR 88.1 for Celia\'s song, and asked Jay to look after Teo if anything happened.',
      ],
      line: 'Jay opened Augie\'s first letter at dawn and learned Tommy was already gone when he drove, and Augie planned to sell back the Tally.',
    },

    // ---------------------------------------------------------------- m20
    m20_overwatch: {
      setup: [
        'Augie wants Rhea Kostas\'s Salts on the cranes with rifles for the Tally exchange. Rhea wants something first.',
        'Halberd has been photographing her dockers, and she has called Jay to Kostas Salvage at eleven at night.',
      ],
      recap: [
        'Halberd was photographing Rhea\'s dockers, to pick who loses their job first when Voss sells the port.',
        'Rhea gave Jay her late husband Stavros\'s rifle (“He shot gulls. Badly.”) and sent him onto a shed roof at Pier 9, above bay 14, where Tommy died.',
        'He shot the five spotters, then wrecked the van carrying their camera cards.',
        { if: 'saved_teo', text: 'Because Rourke now had her address, Halberd attacked Kostas Salvage, and Jay held it with Rhea and her dockers, Deb and Kostya. Her price went up from four per cent to eight.' },
        'At dawn the cards went in the sea, and Rhea promised her cranes for the 30th: neutral ground.',
      ],
      line: 'Jay sniped Halberd\'s spotters off Rhea\'s quay, and Rhea agreed to watch Augie\'s exchange from her cranes.',
    },

    // ---------------------------------------------------------------- m21
    m21_two_ten: {
      setup: [
        'It\'s 1 a.m. on 30 September, three years to the night since Tidewater. The crew meets at the Last Resort before Augie hands over the Tally in bay 14 at Pier 9.',
        'His one rule: if it goes wrong, Jay drives.',
      ],
      recap: [
        'At 02:10, three years to the minute after Tidewater, Augie walked into bay 14, where Tommy died, to sell Voss his Tally. Voss sent Horne and Rourke instead.',
        'Horne tapped his watch, a Halberd sniper on Rhea\'s orange crane shot Augie, and Rourke walked off with the book and the money.',
        'This time Jay didn\'t drive away. He went back across the lot under fire and got Augie into Lulu, and Mae, waiting nearby because Jay had planned for it, worked on him.',
        { if: 'trusted_calder', text: 'Calder smashed Horne\'s roadblock to clear the way.' },
        { if: '!trusted_calder', text: 'Southside hunted them all the way.' },
        { if: 'saved_teo', text: 'Teo held his father\'s hand.' },
        'Augie died in the ambulance bay at Mercy General.',
      ],
      line: 'Three years to the minute after Tidewater, Voss\'s men ambushed the exchange. Jay went back for Augie, but Augie died.',
    },

    // ---------------------------------------------------------------- m22
    m22_lugnut: {
      setup: [
        'Two nights after Pier 9, Jay is in room 12 at the Magnolia with Augie\'s letters. Somebody cleaned Lulu\'s back seat.',
        { if: 'trusted_calder', text: 'Detective Calder' },
        { if: '!trusted_calder', text: 'Noor' },
        'has traced the money Southside pays LUGNUT, its informant, and is about to call.',
      ],
      recap: [
        'The LUGNUT payments led to Calloway Auto.',
        'Jay tailed Dex to the Grand Parkade roof, watched Horne pay him, and heard it all.',
        'Four years ago Horne caught Dex with stolen parts and threatened him with prison and Birdie in foster care. Dex gave up Tidewater for a promise of no guns, then pointed the crew at Noor, and gave up Pier 9 when Horne showed him a photo of Birdie at her school gate.',
        'Halberd came up the ramp to silence him, and Jay fought them off with Dex beside him.',
        { if: 'dex_forgiven', text: 'Then Jay told Dex to get in the car, and hid him at Kostas Salvage.' },
        { if: 'dex_banished', text: 'Then Jay sent Dex north with Birdie that night.' },
        { if: ['!dex_forgiven', '!dex_banished'], text: 'Then Jay took Dex to Calder to tell everything on the record.' },
      ],
      line: [
        'Dex was LUGNUT: he sold out Tidewater and Pier 9 to Horne, and Jay',
        { if: 'dex_forgiven', text: 'told him to get in the car anyway.' },
        { if: 'dex_banished', text: 'sent him out of town with Birdie.' },
        { if: ['!dex_forgiven', '!dex_banished'], text: 'handed him to Calder as a witness.' },
      ],
    },

    // ---------------------------------------------------------------- m23
    m23_ashes: {
      setup: [
        'It\'s Friday, and Augie is being buried beside his wife, Celia, at St. Brigid\'s.',
        'Teo has told Jay to come at five and be normal for once. Jay is early, with everything Augie owned in a paper bag.',
      ],
      recap: [
        'Augie was buried beside Celia. He had planned the funeral himself: short, nobody sings.',
        { if: 'saved_teo', text: 'Teo gave Jay his father\'s notebook: “He left you the plans. He left me the watch.”' },
        { if: '!saved_teo', text: 'Teo threw his father\'s notebook at Jay, and Jay handed him Celia\'s watch.' },
        'In a library book, Augie had kept every drawing Teo did as a boy.',
        { if: 'dex_forgiven', text: 'Dex stood apart by the gate.' },
        { if: 'kept_cut', text: 'Mae learned Nana Lu\'s house was bought with Jay\'s Tidewater cut: “my brother\'s blood money.”' },
        { if: '!kept_cut', text: 'Mae held Jay\'s hand.' },
        'Voss sent lilies at five. At six his men set fire to Calloway Auto. Ansel stood in the doorway, guarding',
        { if: 'dex_forgiven', text: 'Birdie,' },
        { if: '!dex_forgiven', text: 'three children,' },
        'until Jay drove the arsonists off. The garage burned down anyway. “I\'m done running,” Jay said. “I\'m going to take everything he has.”',
      ],
      line: 'They buried Augie beside Celia, and that evening Voss\'s men burned Calloway Auto to the ground.',
    },

    // ---------------------------------------------------------------- m24
    m24_the_notebook: {
      setup: [
        'The night after the fire, the crew is living among the propellers at Kostas Salvage.',
        'Jay has read every page of Augie\'s notebook except the last one.',
      ],
      recap: [
        'Augie\'s last page was a plan. When Voss gets scared he moves the book, and that means another Tidewater: armoured vans, Crestline to the port. Hit it on the road. “You drive. You plan. You\'re better than me at both now.”',
        'So Jay planned his first job. Noor found the date, the night of Voss\'s gala on the 11th, and Rhea found the ship.',
        'Jay stole three cars: Big Otto\'s tow truck, a Halberd van and Councilman Pruitt\'s Vireo.',
        { if: 'saved_teo', text: 'Teo was in.' },
        { if: '!saved_teo', text: 'Noor could stop a van with Rourke\'s codes.' },
        { if: 'dex_forgiven', text: 'Jay gave Dex the second car.' },
        'On Lulu\'s bonnet it was the same job as Tidewater, so Jay named it Tidewater.',
      ],
      line: 'Augie\'s last page was a plan, so Jay planned his first job: take Voss\'s book off him on the road on gala night.',
    },

    // --------------------------------------------- The Silver Foxes: sf1
    sf1_old_hands: {
      setup: [
        'At Bayview Gardens, the retirement home under a Pelican “Golden Years Equity” banner, three old people are waiting.',
        'Lefty, who plays canasta with Grace Oyelaran, needs a driver who doesn\'t drive like a hearse.',
      ],
      recap: [
        'Lefty, Duke and Walt were the Silver Foxes, robbers famous since 1979. Pelican had taken their neighbours\' homes and was charging them cash fees.',
        'Jay drove them in their old mint-green car, tailing Pelican\'s collections boy to an office on Tannery Row.',
        'Marvin Teague, a guard whose hat they stole in 1979, recognised them, and Jay lost the police. Walt kept calling Jay “Frankie”.',
      ],
      line: 'Jay became the driver for the Silver Foxes, three old robbers out to rob Pelican, and Walt kept calling him Frankie.',
    },

    // --------------------------------------------- The Silver Foxes: sf2
    sf2_the_walker_job: {
      setup: [
        'It\'s two o\'clock on Thursday on Tannery Row. The Pelican office has every envelope on the coast in an old safe, and the Foxes have brought three walking frames.',
      ],
      recap: [
        'Lefty gave Marvin Teague back his 1979 hat, and he went on a very long break.',
        'Duke charmed the receptionist, Walt opened the safe “with a fork”, and the Foxes came out of three different doors. Jay picked them up one by one under Halberd fire and lost the police.',
        'They took $186,000 in envelopes with residents\' names on, all to be given back. Lefty paid Jay in banknotes from 1980.',
      ],
      line: 'The Foxes robbed Pelican\'s collections office on walking frames, and Jay got all three home with $186,000 to give back.',
    },

    // --------------------------------------------- The Silver Foxes: sf3
    sf3_walt: {
      setup: [
        'It\'s Friday night, and Walt has walked out of Bayview Gardens in his good jacket to meet his wife, Ruthie.',
        'Lefty is waiting under the banner in her dressing gown. Ruthie isn\'t meeting him.',
      ],
      recap: [
        'In Walt\'s head it was 1981. Jay and Lefty followed his old Friday nights with Ruthie: the boardwalk, pie at the Starlite, then the pier.',
        'Dot said the window booth was theirs before it was Jay and Mae\'s.',
        { if: 'sf_truth', text: 'Jay told Walt that Ruthie was gone. Walt heard it for the first time, then forgot, so Jay said she was running late.' },
        { if: '!sf_truth', text: 'Jay played Frankie and said Ruthie would meet him at home.' },
        'Later Lefty explained: in 1983 Frankie drove off with the money and left Walt on the kerb.',
      ],
      line: 'Jay found Walt waiting for his late wife at the end of the pier, and learned why Walt calls him Frankie.',
    },

    // --------------------------------------------- The Silver Foxes: sf4
    sf4_returns: {
      setup: [
        'The Foxes are giving Pelican\'s money back. Bayview\'s residents have theirs; five envelopes are left, for people Pelican moved out.',
        'Today Walt doesn\'t know who Jay is.',
      ],
      recap: [
        'Jay drove Lefty and Duke round the last five envelopes, to Dot Pike, a flower seller, a woman living at the Magnolia, a Casa Palma neighbour and, last, Grace Oyelaran, whom Pelican had robbed too.',
        'They caught the collections boy and let him go. When Halberd raided Bayview, the residents fought back from their balconies.',
        'Walt had a clear moment: “Thanks, Jay. It is Jay, isn\'t it?” Lefty gave Jay the Foxes\' car.',
      ],
      line: 'The Foxes gave every envelope back and saw off Pelican\'s men, and Lefty gave Jay their mint-green car.',
    },
  });

  // Who's who: characters introduced in Act 3 and The Silver Foxes. Bios
  // say only what Jay knows at the intro; later news goes in R.updates.
  Object.assign(R.who, {
    // Named and explained by Lucky Garza in m10, first heard in m18. If
    // recap-act4.js also defines rourke, its entry (loaded later) wins.
    rourke: { intro: ['m10_sons', 'm18_the_crown'], bio: 'Kessler Rourke is the director of Halberd Security, the private guards who work for Voss. Nobody ever sees him. Lucky Garza says he sends emails that just say “Thank you,” and that he wants to know what Augie did with the rest of Tidewater.' },

    // m19 The First Letter. (Her voice is on the radio in m16; m19 is where
    // she becomes somebody.)
    dj_del: { intro: 'm19_the_first_letter', bio: 'Del Starr hosts the night show on VHR 88.1 Sunset Drive, Nana Lu\'s old station. For twenty years Augie rang her every Tuesday to request the same song, and while he was in prison she kept playing it, in case he had a radio.' },

    // m20 Overwatch (also rivals in a dock street race, which is not a job).
    deb: { intro: 'm20_overwatch', bio: 'Deb “Forklift” Mahone drives a forklift for Rhea\'s Salts on the Saltmarsh quay. Big, blunt and cheerful, she peels oranges with a box cutter and calls Jay “our guy”.' },
    kostya: { intro: 'm20_overwatch', bio: '“Big Kostya” Lemaire is a huge, quiet Salts docker who mostly nods. Halberd photographed him eating a sandwich seven times. He once sat on one of Rhea\'s rudders, and they had to call a man.' },

    // The Silver Foxes
    lefty: { intro: 'sf1_old_hands', bio: 'Loretta “Lefty” Marchetti, 71, the brains of the Silver Foxes, a robbery crew the papers named in 1979. She plays canasta with Grace Oyelaran, keeps the plan in a tiny notebook, and has one rule: nobody gets hurt, and everybody gets home.' },
    duke: { intro: 'sf1_old_hands', bio: 'Duke Fairweather, 75, the Silver Foxes\' charmer: a cream cardigan, a cravat and a very old kind of handsome. He once wore a stolen silver-fox coat to his mother\'s funeral, in August. He has a pacemaker.' },
    walt: { intro: 'sf1_old_hands', bio: 'Walt Pomeroy, 78, tall in a good hat, was the best safecracker on the coast. His memory is going. Some mornings it is 1981 in his head: he calls Jay “Frankie”, the Foxes\' old driver, and asks him to tell Ruthie he\'ll be late.' },
    teague: { intro: 'sf1_old_hands', bio: 'Marvin Teague is a security guard at the Tannery Row market. In 1979, in his first week as a policeman, the Silver Foxes took his hat, and it was in the papers. He has never got over it.' },
    ruthie: { intro: 'sf3_walt', bio: 'Ruthie Pomeroy, Walt\'s wife, who laughed like a dropped tray. Every Friday in 1981 he took her out: a red carnation, lemon meringue in the Starlite\'s window booth, then the pier. She died a long time ago. Walt doesn\'t remember that.' },
  });

  // Later news, in story order (the Story so far screen shows newest first).
  // Every text has at least one part that holds whatever the flags.
  R.updates.push(
    // ---------------------------------------------------------------- m17
    { who: 'teo', after: 'm17_canary', text: 'Teo had been meeting Ashby, Voss Meridian\'s lawyer, to sell the Lantern Alley leases for $400,000. Out of spite he told him “the old man\'s out, and he\'s got something of yours”, which put Halberd onto Augie. He knew nothing about the depot.' },
    { who: 'wick', after: 'm17_canary', text: 'Halberd scouts hunting for Augie cornered Wick on Anchor Street. Jay covered him from the rooftops with a rifle, and Wick shouted, “That\'s my guy!”' },

    // ---------------------------------------------------------------- m18
    { who: 'teo', after: 'm18_the_crown', text: [
      'After Teo told Ashby no, Halberd put a bag over his head and took him up the Crown.',
      { if: '!chased_rourke', text: 'Jay let Rourke get away to save him. Teo called him brother, and meant it.' },
      { if: 'chased_rourke', text: 'Jay went after Rourke\'s phone instead, and his father lay down in front of the van for him. “You chose the phone, brother.”' },
    ] },
    { who: 'rourke', after: 'm18_the_crown', text: [
      'Jay has heard him now, calm on a Halberd radio: “You drive. I plan for drivers.”',
      { if: '!chased_rourke', text: 'He got away with the address of Augie\'s money at Kostas Salvage.' },
      { if: 'chased_rourke', text: 'Jay wrecked his car and took his phone: Halberd\'s codes, a secret second budget, and texts to someone called Maggie who hasn\'t answered in two years.' },
    ] },

    // ---------------------------------------------------------------- m19
    { who: 'augie', after: 'm19_the_first_letter', text: [
      { if: 'chased_rourke', text: 'He cracked two ribs saving Teo from a Halberd van.' },
      'His first letter told Jay the truth about Tommy. His plan: sell the Tally back to Voss for $5 million, a million each for Lourdes, Teo\'s children, Noor\'s father\'s pharmacy and Ansel\'s flowers, and one for after, at Pier 9 at 02:10 on the 30th.',
    ] },
    { who: 'tommy', after: 'm19_the_first_letter', text: 'Augie saw Tommy go down before Jay put the car in gear. He was already gone: “You didn\'t leave Tommy. There was nobody there to leave.”' },
    { who: 'nana_lu', after: 'm19_the_first_letter', text: 'She forwarded every one of Augie\'s 37 letters to Jay\'s motels, and wrote on the first: OPEN THIS ONE, BABY. The morning after Jay stole and returned Augie\'s car, she was on Augie\'s doorstep with plum cake and her softball bat: “You can have him for the driving.”' },

    // ---------------------------------------------------------------- m20
    { who: 'rhea', after: 'm20_overwatch', text: [
      'Her late husband Stavros drove the orange gantry crane on Crane Row for twenty-two years. She gave Jay his rifle, and her cranes for the 30th.',
      { if: 'saved_teo', text: 'Halberd attacked her yard for Augie\'s money, so her price went up to eight per cent.' },
      { if: '!saved_teo', text: 'Her price stayed at four per cent.' },
    ] },

    // ---------------------------------------------------------------- m21
    { who: 'augie', after: 'm21_two_ten', text: [
      'Augie was shot in bay 14 at 02:11:04, the same second Tommy died three years before. Jay went back for him, but he died in the back of Lulu at Mercy General, with Mae working on him.',
      { if: 'gave_cut', text: 'He called the $40,000 in Lourdes\'s mailbox the best job Jay ever pulled.' },
      { if: '!gave_cut', text: 'He told Jay to keep Nana Lu\'s house, and sit on the swing.' },
      { if: 'saved_teo', text: 'His last words were to Teo.' },
      { if: '!saved_teo', text: 'His last message was for Teo: he kept every one of his drawings.' },
    ] },
    { who: 'teo', after: 'm21_two_ten', text: [
      { if: 'saved_teo', text: 'Teo was in Lulu\'s back seat when his father died. Augie gave him Celia\'s watch, three turns every morning, and said he was a bad father. “You were fine, Pop.”' },
      { if: '!saved_teo', text: 'Teo wasn\'t at Pier 9. Jay rang him from the hospital kerb. Augie had given Jay Celia\'s watch to pass on to him.' },
    ] },
    { who: 'mae', after: 'm21_two_ten', text: [
      'Mae was waiting in Medic 12 on Harbor Road, by Pier 9, because Jay had asked Gus how long the ambulance takes to get there. She worked on Augie in Lulu\'s back seat, and she was the one who told Jay he was gone.',
      { if: 'mae_stay', text: 'On the kerb she held his hand: “Don\'t go anywhere tonight.”' },
      { if: '!mae_stay', text: 'On the kerb she took back some of the space he gave her, and put her head on his shoulder.' },
    ] },
    { who: 'horne', after: 'm21_two_ten', text: 'He came to bay 14 instead of Voss and stood on the new paint where Tommy died. “They repainted it. I asked them to.” Then he tapped his watch, and Augie was shot.' },
    { who: 'rourke', after: 'm21_two_ten', text: 'At Pier 9 he brought $5 million and Voss\'s promise, then walked away with the Tally and the money after Augie was shot. “Mr. Voss keeps his word. That\'s why he isn\'t here.”' },
    { who: 'voss', after: 'm21_two_ten', text: 'He sent a card to the exchange: OLD MARKET STANDS. YOU HAVE MY WORD. H.V. Then he sent an ambush. He has his Tally back.' },
    { who: 'kostya', after: 'm21_two_ten', text: 'At Pier 9, Halberd took Kostya\'s crane and tied him to the seat. He was found alive and furious. He bit one of them.' },

    // ---------------------------------------------------------------- m22
    { who: 'dex', after: 'm22_lugnut', text: [
      'Dex was LUGNUT. Four years ago Horne caught him with stolen parts and threatened him with prison and Birdie in foster care.',
      'His first payment bought the lift. He gave up Tidewater for a promise of no guns, and Pier 9 after Horne showed him a photo of Birdie at her school gate.',
      { if: 'dex_forgiven', text: 'Jay told him to get in the car anyway.' },
      { if: 'dex_banished', text: 'Jay sent him north with Birdie, at the speed limit.' },
      { if: ['!dex_forgiven', '!dex_banished'], text: 'Now he is telling Calder everything, on the record.' },
    ] },
    { who: 'horne', after: 'm22_lugnut', text: 'He ran Dex as LUGNUT for four years and paid him on the Grand Parkade roof, two days after Pier 9: “Nobody got hurt who mattered.” Then he sent Halberd to make sure Dex never talked.' },
    { who: 'birdie', after: 'm22_lugnut', text: [
      { if: 'dex_forgiven', text: 'Birdie is safe at home over the garage, with Ansel guarding the door on a kitchen chair.' },
      { if: 'dex_banished', text: 'Birdie has gone north with her dad. He told her it\'s a holiday, somewhere with snow.' },
      { if: ['!dex_forgiven', '!dex_banished'], text: 'Birdie is staying with Mae while her dad talks to Calder.' },
    ] },
    { who: 'dj_del', after: 'm22_lugnut', text: 'On the first Tuesday after Pier 9, Augie\'s reminder went off on Jay\'s phone, so Jay rang her instead. Del played “Porchlight” for Augustine Vance. Not the remix.' },

    // ---------------------------------------------------------------- m23
    { who: 'augie', after: 'm23_ashes', text: 'Augie is buried beside Celia at St. Brigid\'s. His plate says HE PLANNED. He planned his own funeral, too, and the sixth item, which Father Ilunga passed on afterwards, was that he was proud of Jay.' },
    { who: 'teo', after: 'm23_ashes', text: [
      { if: 'saved_teo', text: 'Teo gave Jay his father\'s notebook: “He left you the plans. He left me the watch.”' },
      { if: '!saved_teo', text: 'Teo threw his father\'s notebook at Jay: “You were always his favourite plan.”' },
      'He learned that Augie kept every drawing he ever did as a boy, on the backs of parking tickets.',
    ] },
    { who: 'dex', after: 'm23_ashes', text: [
      'Halberd burned Calloway Auto to the ground on the day of Augie\'s funeral.',
      { if: 'dex_forgiven', text: 'Dex came running for Birdie, and they watched the lift burn.' },
      { if: 'dex_banished', text: 'From somewhere with snow, he sent Birdie\'s spark plug for Augie\'s coffin. Rafi won\'t tell him about the garage.' },
      { if: ['!dex_forgiven', '!dex_banished'], text: 'When he heard, he asked first if the children got out, then about the lift.' },
    ] },
    { who: 'ansel', after: 'm23_ashes', text: [
      'He stood in the doorway of the burning garage, guarding',
      { if: 'dex_forgiven', text: 'Birdie,' },
      { if: '!dex_forgiven', text: 'three children,' },
      'and every time Halberd knocked him down he stood back up. Both his palms are burned.',
    ] },
    { who: 'mae', after: 'm23_ashes', text: [
      { if: 'kept_cut', text: 'At Augie\'s funeral she found out the $40,000 that saved Nana Lu\'s house was Jay\'s Tidewater cut. “You bought your grandmother\'s house with my brother\'s blood money.” “Yes.” She stayed till the end.' },
      { if: '!kept_cut', text: 'She held Jay\'s hand all through Augie\'s funeral, and didn\'t let go until the dirt was done.' },
    ] },
    { who: 'lourdes', after: 'm23_ashes', text: [
      'At Augie\'s funeral she took coffee to the Southside cruisers watching from across the road, as she did at Tommy\'s.',
      { if: 'gave_cut', text: 'Augie told her he had never owned a rag in his life, so she has worked out whose money was in her mailbox.' },
    ] },
    { who: 'calder', after: 'm23_ashes', text: [
      { if: 'trusted_calder', text: 'At Pier 9 she broke Horne\'s roadblock, and two days later she traced LUGNUT\'s payments to Calloway Auto.' },
      { if: 'dex_to_calder', text: 'Dex is her witness now, and has told her Horne keeps a second phone in his cruiser.' },
      'At Augie\'s funeral she parked right behind the Southside cruisers, watching the people who were watching Jay.',
    ] },
    { who: 'voss', after: 'm23_ashes', text: 'He sent white lilies to Augie\'s funeral at five, and his men to burn Calloway Auto at six. The lilies went on somebody else\'s grave.' },
    { who: 'noor', after: 'm23_ashes', text: 'The arsonists had a list, and her father\'s old pharmacy on Tannery Row was next. Jay stopped their van first.' },
    { who: 'rhea', after: 'm23_ashes', text: 'At Augie\'s funeral she said Voss once sent her flowers, with the same card, when his crane killed her husband. With Calloway Auto gone, the whole crew lives with her now, among the propellers at Kostas Salvage.' },

    // ---------------------------------------------------------------- m24
    { who: 'augie', after: 'm24_the_notebook', text: 'The last page of his notebook was a plan, written two days before Pier 9: Voss will move the book, so hit it on the road. “You drive. You plan. You\'re better than me at both now.”' },
    { who: 'tommy', after: 'm24_the_notebook', text: 'In the margin of Augie\'s Tidewater plan, written from his cell: “J asked me to take the Reyes boy. I said no once. I should have said it louder. That\'s mine. Not his. Mine.”' },
    { who: 'noor', after: 'm24_the_notebook', text: [
      { if: '!trusted_calder', text: 'She was the one who traced LUGNUT\'s payments to Dex, checking her own bank dates first.' },
      'She has secretly recorded two years of Signal Office meetings, including Voss\'s people teaching her old boss to fake the SmartFlow contract. With the Tally, she says, it\'s a noose.',
    ] },
    { who: 'voss', after: 'm24_the_notebook', text: 'He is scared. He rang Pruitt at two in the morning to ask if he had ever photocopied anything, and somebody has booked Rhea\'s best berth on Crane Row for the night of his gala, and paid early.' },
    { who: 'teo', after: 'm24_the_notebook', text: [
      { if: 'saved_teo', text: 'Teo is in on Jay\'s job, with forty Lantern Kings and a riot to pull Halberd across town.' },
      { if: '!saved_teo', text: 'Teo is staying out of Jay\'s job. “Good name. Still not for you.”' },
    ] },
    { who: 'pruitt', after: 'm24_the_notebook', text: 'He handed Jay the key to his own black Vireo and asked him to tell them, afterwards, that Delmar Pruitt cooperated. He is on six pages of the Tally.' },
    { who: 'otto', after: 'm24_the_notebook', text: 'He let Jay take his yellow tow truck for the job. He will report it stolen, claim the insurance and sell it again. He wants it back with a full tank, the way Jay once brought back Augie\'s car.' },

    // ---------------------------------------------------- The Silver Foxes
    { who: 'teague', after: 'sf2_the_walker_job', text: 'Lefty gave him back the hat the Foxes took in 1979. It still fits. He took a twenty-minute break while they robbed Pelican.' },
    { who: 'walt', after: 'sf3_walt', text: 'Frankie, the Foxes\' old driver, drove off with the money on the Pembroke job in 1983 and left Walt on the kerb. Walt did five years, and Ruthie brought him pie every Sunday. He never said Frankie\'s name again, until his memory went.' },
    { who: 'dot', after: 'sf3_walt', text: 'Ruthie Pomeroy was Dot\'s first regular. The Starlite\'s window booth was Walt and Ruthie\'s before it was Jay and Mae\'s: there is a W and an R under their J and M.' },
    { who: 'nana_lu', after: 'sf3_walt', text: 'Lefty remembers her driving the 22 school bus for six years without losing a child. Once she stopped the bus to apologise to a mailbox, in front of forty children.' },
    { who: 'oyelaran', after: 'sf4_returns', text: 'Pelican\'s Golden Years scheme took Grace\'s money too, the same week as Nana Lu\'s. She never told Jay. He put her envelope in her mailbox himself, and she is making oxtail.' },
    { who: 'dot', after: 'sf4_returns', text: 'Pelican took the house Dot\'s mother left her, a month at a time. The Foxes gave it back in an envelope.' },
    { who: 'walt', after: 'sf4_returns', text: 'For a moment Walt knew Jay: “You came back for the old men. Nobody comes back for the old men. Thanks, Jay. It is Jay, isn\'t it?”' },
    { who: 'lefty', after: 'sf4_returns', text: 'She gave Jay the Foxes\' mint-green car and wants it back on Sundays. Why Lefty? “Mostly because I\'m what\'s left. Somebody has to remember for everybody.”' },
    // Lefty's text arrives after both m25 and sf4, in either order.
    { who: 'walt', after: 'm25_iron', text: [
      { if: 'sf4_returns', text: 'Walt died in his sleep. He thought it was 1981, and Ruthie was making coffee.' },
    ] },
  );

  // The decisions made in Act 3 and The Silver Foxes. Keys are the flag an
  // option sets.
  Object.assign(R.choices, {
    m18_the_crown: [
      { title: 'Teo or the phone', options: {
        saved_teo: '“Get Teo.” Jay let Rourke drive off with Halberd\'s codes and the address of the money, and went down for Teo. “You came back for me.”',
        chased_rourke: '“Stop Rourke.” Jay wrecked Rourke\'s car for his phone, codes, secret budget and all. Augie stood in front of the van to save Teo, and cracked two ribs.',
      } },
    ],
    m22_lugnut: [
      { title: 'Dex\'s fate', options: {
        dex_forgiven: '“Get in the car, Dex.” It wasn\'t okay, and never would be. Jay took him to hide at Kostas Salvage, and sent Ansel to stand in Birdie\'s doorway.',
        dex_banished: '“Take Birdie and get out of Vicehaven. Tonight.” Dex left Rafi the keys and drove north at the speed limit, with Birdie asleep beside him.',
        dex_to_calder: '“You\'re going to tell Calder everything. On the record.” Jay drove Dex to VPD Central, and Mae came for Birdie.',
      } },
    ],
    sf3_walt: [
      { title: 'Where is Ruthie?', options: {
        sf_frankie: 'Jay played Frankie: Ruthie was running late, and would meet Walt at home. Lefty thanked him.',
        sf_truth: 'Jay told Walt that Ruthie was gone. Walt heard it for the first time, and lost it a moment later, so Jay said she was running late. Lefty did that for a year before she stopped.',
      } },
    ],
  });
})();
