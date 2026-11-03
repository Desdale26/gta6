/*
 * data/recap-act4.js — "Story so far" recaps for ACT 4: TIDEWATER (m25 to
 * m31, the finale and all three endings), and for the side chain Dead Air
 * (da1 to da4, which opens after m12).
 *
 * Plain data read by js/storylog.js (pause menu → Story so far, the phone's
 * Story app and the "Previously in Vicehaven…" card). Each job has a setup
 * (present tense, before it starts), a recap (past tense, after it is done)
 * and a one-line summary. Parts are strings or { if, text } objects resolved
 * against the flags and completed jobs.
 *
 * Flags read here: gave_cut / kept_cut (m05), trusted_calder /
 * refused_calder (m13), mae_stay / mae_space (m16), saved_teo /
 * chased_rourke (m18), dex_forgiven / dex_banished / dex_to_calder (m22),
 * ending_a / ending_b / ending_c and a_mae_rides (m31: Mae rides north only
 * with mae_stay and gave_cut or nightshift_done), and da_spoke / da_silent
 * (da4).
 *
 * The side-chain flags (nightshift_done, foxes_done, solace_done, iggy_done)
 * are never read, though they colour m27, m30 and the endings: every side
 * chain stays playable after the credits, and a recap that tested them would
 * change after the fact. So the endings leave out Iggy and the Foxes at the
 * gate and their texts, Mae's notebook, and Solace's broadcasts, and ending
 * B's phone call is told the same way whether Jay rang Solace or the Ledger.
 * a_mae_rides is safe because m31 sets it itself. For the same reason da3
 * and da4 leave out the beats that depend on m21, m25 and m30 (Augie's name
 * on the air, Lefty's balcony, Garza's new boss).
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const R = (S.recap = S.recap || { prologue: null, acts: {}, jobs: {}, who: {}, updates: [], choices: {} });

  R.acts[4] = {
    title: 'Tidewater',
    intro: [
      'Augie is gone, and Calloway Auto is ash. But Augie left Jay his notebook, and on its last page, a plan: when Voss is scared, he moves the Tally by road to the sea. Hit it on the move.',
      "So on the 11th, the night of the Crown gala, Jay will. For the first time in his life he is the planner, and he has named the job Tidewater.",
    ],
    outro: [
      // ---- Ending A: Taillights
      { if: 'ending_a', text: 'Jay took the money and drove. Voss sailed away on his launch, Hope, and the Phase Two vote passed.' },
      { if: 'ending_a', text: 'Jay shared the $30 million by phone: Haddad Pharmacy reopened, Boateng Blooms opened on Tannery Row, the Lantern Kings bought every lease in their alley, and Rhea bought a crane, painted it pink and called it Stavros.' },
      { if: ['ending_a', 'kept_cut'], text: "Nana Lu's house went to the Casa Palma tenants, by way of Lourdes's mailbox." },
      { if: ['ending_a', 'dex_forgiven'], text: 'Dex and Birdie waved him off from the ashes of the garage.' },
      { if: ['ending_a', 'dex_banished'], text: 'Dex and Birdie sent a postcard from somewhere cold.' },
      { if: ['ending_a', 'dex_to_calder'], text: "Dex served eighteen months, and Rhea paid Birdie's school fees." },
      { if: ['ending_a', 'a_mae_rides'], text: 'Mae rode beside him with her feet on the dash. At the city limits he finally read Augie\'s last letter, and she let him.' },
      { if: ['ending_a', '!a_mae_rides'], text: 'Mae stayed. “Drive safe,” she texted. “I mean it this time.” At the city limits he finally read Augie\'s last letter, alone.' },
      { if: 'ending_a', text: 'The best wheelman Vicehaven ever had. Last seen northbound.' },

      // ---- Ending B: The Long Way Home
      { if: 'ending_b', text: 'Jay gave the Tally to the city.' },
      { if: ['ending_b', 'trusted_calder'], text: 'Calder arrested Voss at the end of the pier, and he went on trial.' },
      { if: ['ending_b', 'refused_calder'], text: 'He read it down the phone, and the whole city heard it. Voss escaped by sea and was charged in his absence.' },
      { if: 'ending_b', text: 'The Phase Two vote was never held. Jay pleaded guilty to Tidewater and served' },
      { if: ['ending_b', 'trusted_calder'], text: 'fourteen months.' },
      { if: ['ending_b', '!trusted_calder'], text: 'twenty-two months.' },
      { if: 'ending_b', text: 'When he walked out of the gate, Teo, Noor and Ansel were waiting.' },
      { if: ['ending_b', 'mae_stay'], text: 'So was Mae, who had worn his jacket on every shift.' },
      { if: ['ending_b', '!mae_stay'], text: 'Mae came flying in late in Medic 12, straight from a call.' },
      { if: ['ending_b', 'dex_forgiven'], text: 'Dex and Birdie came too: Calloway Auto was rebuilt, mostly by Ansel.' },
      { if: ['ending_b', 'dex_to_calder'], text: 'Dex, free a month already, brought Birdie.' },
      { if: ['ending_b', 'dex_banished'], text: 'Birdie came alone on the coach, with a note from Dex.' },
      { if: 'ending_b', text: "They took the long way home to Heron Street, past Tommy's mural, repainted with Augie beside him. On the porch swing, Jay could almost hear Tommy: “Took you long enough.”" },

      // ---- Ending C: Wheelman
      { if: 'ending_c', text: 'Jay finished it. He shot Harlan Voss at the end of the pier and kept the $30 million and the Tally, and with them every councilman in the book.' },
      { if: 'ending_c', text: "Eleven days later, at the Crown, Halberd's new chief offered him her services and Councilman Pruitt called him sir." },
      { if: ['ending_c', 'saved_teo'], text: 'Teo stood behind him as his lieutenant, hollow-eyed.' },
      { if: ['ending_c', 'chased_rourke'], text: 'Teo walked away: “You\'re him now.”' },
      { if: 'ending_c', text: 'Noor quit by text, and Ansel left a single rose on Lulu\'s windscreen.' },
      { if: ['ending_c', 'dex_forgiven'], text: 'Dex rang to tell him it doesn\'t get lighter.' },
      { if: ['ending_c', 'dex_to_calder'], text: "Dex added Jay's name to his statement." },
      { if: 'ending_c', text: "At three in the morning Jay sat alone in the Starlite booth, Augie's last letter still sealed, and let Mae's call ring out. The best wheelman Vicehaven ever had. He stayed. The city kept him." },
    ],
  };

  Object.assign(R.jobs, {
    // ------------------------------------------------------------ act 4
    m25_iron: {
      setup: [
        "Jay's plan needs Rhea's cranes to drop three containers across Southshore Boulevard on the night. Augie's notebook warns him: never ask Rhea Kostas for a favour. Offer her a trade.",
      ],
      recap: [
        "Jay's plan needed Rhea's cranes to drop three containers across Southshore Boulevard. Her price was Halberd's new post on Crane Row, which watched every docker in the port (and took Kostya's sandwich). With old grenades from a shipwreck, Jay blew up its three SUVs and took out the guards. Lucky Garza ran, again.",
        'Then Halberd came for Kostas Salvage, and Jay and Rhea held the doors together.',
        "At sunset Rhea showed him an uncashed $180,000 cheque from Voss Meridian: payment for her husband, Stavros, who died when crane number four came down. Years ago she gave Voss's people the name of the inspector who would have failed it.",
      ],
      line: ["Jay blew up Halberd's dock post with shipwreck grenades to pay for Rhea's containers, and learned how her husband Stavros died."],
    },

    m26_gold_watch: {
      setup: [
        { if: 'trusted_calder', text: "Calder needs Captain Horne's secret second phone for a warrant, and can't touch it without one. Legally, she says, Jay is a raccoon who found a phone." },
        { if: '!trusted_calder', text: "Noor thinks Captain Horne's secret second phone holds Voss's convoy plan." },
        "It's two in the morning, and Jay is outside Horne's house.",
      ],
      recap: [
        "Jay crept across Captain Horne's lawn to his police cruiser and took Horne's secret phone from the glovebox.",
        { if: 'dex_forgiven', text: 'Dex was there to pop the lock.' },
        { if: 'dex_banished', text: 'Dex had texted from the north to tell him where to look.' },
        { if: 'dex_to_calder', text: "Dex's statement to Calder had said where to look." },
        "Horne came out in a bathrobe with a shotgun, so Jay stole the cruiser too, lost Southside, and left it under the Beacon with its lights on.",
        { if: 'trusted_calder', text: 'He took the phone to Calder at the back gate of VPD Central.' },
        { if: '!trusted_calder', text: 'He took the phone to Noor at the Last Resort.' },
        "Jay knew the PIN: 0211, the minute Horne shot Tommy. Inside was Voss's plan: on the gala night, Horne would lead three Halberd vans carrying the Tally and $30 million from Voss's estate to a freighter, the Esperanza.",
      ],
      line: ["Jay stole Horne's secret phone, then Horne's own cruiser, and learned how Voss planned to move the Tally and $30 million to sea."],
    },

    m27_the_night_before: {
      setup: [
        "It's the night before the job. Ansel has lit a bonfire on Harbor Beach, Rhea has brought her grandmother's terrible ouzo, and the whole crew is together.",
      ],
      recap: [
        "At the bonfire Ansel read a poem and told his secret: he pays the rent of Lina Solano, whose father died after a fight with him in the ring. Noor, full of ouzo, called them all family.",
        { if: 'saved_teo', text: 'Teo toasted his father and offered the Kings for a diversion.' },
        { if: 'chased_rourke', text: "Teo texted that he wasn't coming." },
        'Jay taught Noor to drive.',
        { if: 'gave_cut', text: "At Casa Palma, Lourdes gave him Tommy's yellow hoodie, to drive somewhere nice." },
        { if: 'kept_cut', text: 'At Casa Palma, Lourdes refused Nana Lu\'s house: “Pay it back to somebody else.”' },
        "On Nana Lu's porch he remembered her feeding a hungry boy who stole her tomatoes. At the Starlite he told Mae what Augie's first letter said: Tommy was gone before Jay drove. Mae said she was coming tomorrow, as the crew's medic.",
      ],
      line: ["On the night before the job, the crew became a family, and Jay told Mae that nobody left Tommy."],
    },

    m28_the_garden_party: {
      setup: [
        "October 11, the night of the Crown gala at Belvedere, Voss's estate. Jay is back in his red valet vest, with three of Noor's trackers: one for each armoured van.",
      ],
      recap: [
        "In the red vest again, Jay drove a poodle called Bijou up to Voss's motor court. A sweating Councilman Pruitt said everyone would vote yes tomorrow, then: “Ask me in the morning.”",
        "Jay put Noor's trackers on all three armoured vans. Then, by the pool, Harlan Voss told him a story: at sixteen, starving, he stole Nana Lu's tomatoes, and she fed him plum cake. Jay told him Pelican, Voss's own bank, had taken her house.",
        "Voss called Jay “weather” and set Rourke's men on him. Jay escaped over the wall, and the convoy rolled early.",
      ],
      line: ['At the gala Jay tagged the convoy, and Voss told him Nana Lu once fed him plum cake when he was a starving boy.'],
    },

    m29_tidewater_again: {
      setup: [
        "The convoy is rolling early: Horne's cruiser and three Halberd armoured vans, coming down from Belvedere. The lead van has the Tally and the money. The crew is in place. Same job. Same driver.",
      ],
      recap: [
        'Jay tailed the convoy down from Crestline. On Meridian Boulevard Noor turned the lights green for the vans and red for Horne. On Southshore, Rhea\'s cranes dropped three containers across the road, and Ansel\'s tow truck, with Mae aboard, closed the road behind them.',
        { if: 'saved_teo', text: "Across town, Teo's Lantern Kings pulled half of Halberd away with fireworks." },
        { if: 'chased_rourke', text: "Noor used Rourke's own codes to lock the second van's crew inside." },
        { if: 'dex_forgiven', text: 'Dex came in the second car, early.' },
        'After the shootout Jay and Mae caught the lead van, and Lucky Garza handed over the keys. With all of Southside after him, Jay drove it to Kostas Salvage. Inside: $30 million and the Tally.',
      ],
      line: ['The crew hit the convoy on Southshore, and Jay drove the armoured van home: $30 million and the Tally.'],
    },

    m30_salt_and_iron: {
      setup: [
        "It's half past three in the morning, and Kostas Salvage is surrounded: Halberd at the gate, Southside behind them, and Kessler Rourke on a loudhailer. Inside are the crew, $30 million and the Tally.",
      ],
      recap: [
        'Halberd and Horne\'s police besieged Kostas Salvage.',
        { if: 'dex_forgiven', text: 'Dex rammed the barricade open with his tow truck, and Jay kept him alive.' },
        { if: 'dex_banished', text: 'Dex appeared from nowhere, rammed the barricade open, and drove away.' },
        { if: 'dex_to_calder', text: 'With no Dex this time, the crew blew the barricade open with grenades.' },
        "Jay drew every cop in the city after Lulu while Mae played Horne's dashcam tape of Tommy on every police radio. The officers listened, and went home.",
        'Halberd crept in the back and took the Tally. Ansel stood up to protect Noor, was shot in the shoulder, and lived. On the orange crane, a rotten handrail gave way and Rourke fell.',
        { if: 'trusted_calder', text: 'In bay 14, where Tommy died, Calder arrested Horne for his murder.' },
        { if: '!trusted_calder', text: 'Horne ran. Jay caught him and chained him to the Tidewater gate with his own handcuffs, for Calder to arrest.' },
        'By dawn, Voss himself had the book.',
      ],
      line: ['Mae played Tommy\'s tape to every cop in the city, Rourke fell from the crane, and Horne was arrested for Tommy\'s murder.'],
    },

    m31_last_light: {
      setup: [
        'Dawn. Horne is under arrest, but Harlan Voss has the Tally, and a launch is coming for him at the end of Oceanview Pier. One last chase.',
      ],
      recap: [
        'At dawn Jay chased Voss to the end of Oceanview Pier, where he had once opened Augie\'s first letter. As his launch came in, Voss offered Jay the $30 million, every house on Heron Street, even the Tally, if he would just drive.',
        // Ending A
        { if: 'ending_a', text: 'Jay drove. Voss sailed away on a launch called Hope, and Jay shared the money with the crew by phone.' },
        { if: ['ending_a', 'a_mae_rides'], text: 'Mae got in beside him and told him to ask. He asked her to come with him. “Then drive,” she said.' },
        { if: ['ending_a', '!a_mae_rides'], text: 'Mae stayed, and texted: “Drive safe. I mean it this time.”' },
        { if: 'ending_a', text: "At the city limits he read Augie's last letter: what's at twelve isn't a place. It's people. Then he drove north." },
        // Ending B
        { if: 'ending_b', text: 'Jay took the Tally out of Voss\'s hands.' },
        { if: ['ending_b', 'trusted_calder'], text: 'Calder walked down the pier and arrested Voss, and Jay gave her the book and his own confession.' },
        { if: ['ending_b', 'refused_calder'], text: 'Voss sailed away, but Jay read it down the phone for the whole city to hear, then handed himself in.' },
        { if: 'ending_b', text: 'He served' },
        { if: ['ending_b', 'trusted_calder'], text: 'fourteen months' },
        { if: ['ending_b', '!trusted_calder'], text: 'twenty-two months' },
        { if: 'ending_b', text: 'for Tidewater. When he walked out, his family was waiting to drive him home to Heron Street.' },
        // Ending C
        { if: 'ending_c', text: 'Jay finished it: he shot Harlan Voss. He took the money and the Tally, and the bought councilmen answered to him now.' },
        { if: ['ending_c', 'saved_teo'], text: 'Teo became his lieutenant.' },
        { if: ['ending_c', 'chased_rourke'], text: 'Teo walked away.' },
        { if: 'ending_c', text: 'Noor quit. At three in the morning Jay sat alone in the Starlite booth and let Mae\'s call ring out.' },
      ],
      line: [
        { if: ['ending_a', 'a_mae_rides'], text: 'Jay took the money and drove north with Mae beside him, while Voss sailed away and the vote passed.' },
        { if: ['ending_a', '!a_mae_rides'], text: 'Jay took the money and drove north alone, while Voss sailed away and the vote passed.' },
        { if: 'ending_b', text: 'Jay gave the Tally to the city, served his time for Tidewater, and his family drove him home to Heron Street.' },
        { if: 'ending_c', text: 'Jay shot Voss at the end of the pier and took his place, alone in the Starlite booth.' },
      ],
    },

    // ---------------------------------------------------------- Dead Air
    da1_frequency: {
      setup: [
        'Every night after midnight a pirate DJ called Solace takes over Harbor Heat 103.7. Tonight she asked on air for “getaway hands” at Harbor Beach, half past twelve. Jay has come to see why.',
      ],
      recap: [
        "Solace broadcasts from Dolly, her late father's ice-cream van, and Halberd's dish trucks were closing in on her signal. Jay drove Dolly gently to the old drydock in Saltmarsh, while Solace told the city how beautifully he drove.",
        'Voss\'s people bought her old station and cut her off mid-call, so now she never stops talking. Three years ago she said Tomás Reyes on air. Next time, she promised, she\'ll say Tommy.',
      ],
      line: ["Jay drove a pirate DJ's ice-cream van to safety while she told the whole city how beautifully he took the corners."],
    },

    da2_call_in: {
      setup: [
        "Somebody at City Hall has been mailing Solace paper, and tonight she wants to hand over the rest in person. Solace doesn't do in person, so Jay is meeting her under the Beacon.",
      ],
      recap: [
        "The source was Priya Venkataraman, a council aide with a cat called Quorum. She had the Phase Two whip list: nine bought votes, and the price of each.",
        'Halberd came for her at the Beacon. Jay got her clear, dodged an ambush at the seawall, and found Solace at Bayview Gardens. Solace kept the list for one big night, and Priya left for her sister\'s couch.',
      ],
      line: ['Jay got a frightened council aide and her cat to Solace, with the list of every vote Voss bought.'],
    },

    da3_jammer: {
      setup: [
        "Two nights of dead air. Halberd vans are jamming Solace's signal, and Noor has found them on a map. Solace has brought a bag of her sister's rum, with rags in the necks.",
      ],
      recap: [
        "Three parked Halberd vans had drowned 103.7 in static, while a fourth hunted for where Solace parks. With Noor turning the lights green, Jay torched the jammers with bathtub rum: on the boardwalk, outside the Starlite (Dot approved), and under Pelican's banner at Bayview.",
        'Then he wrecked the fourth van. Lucky Garza crawled out with six weeks of Solace\'s movements on a laptop, and a warning: Halberd was “done listening”.',
      ],
      line: ["Jay burned Halberd's jamming vans and wrecked the one hunting Solace, and her voice came back to the city."],
    },

    da4_signal_boost: {
      setup: [
        'Priya is back from Marrow Springs, and she wants to read the whip list on air herself, under her own name. Solace is putting a mast on the Lantern Kings\' roofs for one big night.',
      ],
      recap: [
        "From the Kings' roofs, Solace broadcast to the whole city, and Priya read the whip list under her own name while Jay held off Halberd on the fire escapes.",
        'Then the phones lit up: Hollis, Pruitt asking for a song for his dog, and Marguerite, the caller cut off two years ago, ringing back to finish her sentence.',
        { if: 'da_spoke', text: 'Jay pressed the talkback and said a few words for Nana Lu.' },
        { if: 'da_silent', text: 'Solace offered Jay the microphone. He shook his head.' },
      ],
      line: ['Priya read the list of bought votes to the whole city, and Jay held the roof.'],
    },
  });

  // Characters who first matter in these jobs. What Jay knows at the intro;
  // later news goes in R.updates.
  Object.assign(R.who, {
    lina: {
      intro: 'm27_the_night_before',
      bio: ["Lina Solano is twenty-one and studies coral at the university. Her father, the boxer Reggie Solano, died after a legal punch from Ansel in the ring, long ago. She thinks a scholarship fund pays her rent. It's Ansel."],
    },
    solace: {
      intro: 'da1_frequency',
      bio: ["Solace is a pirate DJ. Every night after midnight she takes over Harbor Heat 103.7 from Dolly, her late father's purple ice-cream van, to read anonymous tips about the Renewal. Voss's people bought her old station. She calls everybody baby."],
    },
    // Sable's voice is on the radio from m13, but he only matters as a
    // person in Dead Air.
    dj_sable: {
      intro: 'da1_frequency',
      bio: ['Sable is the late-night DJ on Harbor Heat 103.7. Every night at midnight he loses his transmitter to Solace and says he is furious about it. He leaves the door unlocked, and a coffee at four, two sugars.'],
    },
    priya: {
      intro: 'da2_call_in',
      bio: ["Priya Venkataraman is an aide to Councilman Pruitt, and writes his speeches. She smuggled out the Phase Two whip list because her grandmother on Tannery Row circled one of her lines in red. She has a cat called Quorum, and doesn't drive."],
    },
  });

  // News that comes out in act 4 and Dead Air, in story order. The last
  // batch is what each ending did to everyone (one part per ending).
  R.updates.push(
    { who: 'rhea', after: 'm25_iron', text: ["Rhea never cashed Voss Meridian's $180,000 cheque for her husband Stavros: “If I keep it, it's a debt.” She gave Voss's people the name of the inspector who would have failed crane number four. When this is over she will buy a crane, paint it pink and call it Stavros."] },
    { who: 'dex', after: 'm26_gold_watch', text: [
      { if: 'dex_forgiven', text: 'Dex helped Jay rob Horne\'s cruiser, where he once took Horne\'s envelopes every month, and threw Horne\'s butterscotch out of the window.' },
      { if: 'dex_banished', text: 'From somewhere north with snow on the verges, Dex texted Jay where Horne keeps his phone: “I owe you more than that. Don\'t answer.”' },
      { if: ['dex_to_calder', 'trusted_calder'], text: 'Dex is telling Calder everything. He cried for an hour, then drew her a map of the inside of Horne\'s car from memory.' },
      { if: ['dex_to_calder', '!trusted_calder'], text: 'Dex is telling Calder everything, and his statement told Jay where Horne keeps his secret phone: the glovebox, not the console.' },
    ] },
    { who: 'horne', after: 'm26_gold_watch', text: ['The PIN on Horne\'s secret phone is 0211: two-eleven, the minute he shot Tommy in bay 14. Voss had promised to make him police commissioner. His cruiser was on the morning news, under the Beacon with its lights on.'] },
    { who: 'voss', after: 'm26_gold_watch', text: ['Horne\'s phone gave away Voss\'s plan: on the night of the Crown gala, the Tally and $30 million would leave his estate in three Halberd vans, for a freighter called Esperanza. Esperanza means hope. Voss would ride separately, in a white Sovereign.'] },
    { who: 'ansel', after: 'm27_the_night_before', text: ['Ansel has secretly paid Lina Solano\'s rent since she was fifteen, through a scholarship fund that is really a post-office box and him. Her father died after a fight with Ansel in the ring. She doesn\'t know.'] },
    { who: 'noor', after: 'm27_the_night_before', text: ['At the bonfire Noor told the crew they are her family, then said nobody heard that. Jay taught her to drive in the beach car park: ten and two, heart at twelve.'] },
    { who: 'lourdes', after: 'm27_the_night_before', text: [
      { if: 'gave_cut', text: 'Lourdes gave Jay Tommy\'s yellow hoodie, washed four times: “He\'d want it driven somewhere nice.”' },
      { if: 'kept_cut', text: 'Jay offered Lourdes the deed to Nana Lu\'s house. She refused it: pay it back to somebody else. Sideways.' },
    ] },
    { who: 'birdie', after: 'm27_the_night_before', text: [
      { if: 'dex_forgiven', text: 'Birdie fell asleep on Ansel\'s coat at the bonfire, still counting the days in her sleep.' },
      { if: 'dex_banished', text: 'Birdie phoned Jay from somewhere with snow. Her dad cries in the car when he thinks she is asleep, so she pretends to be.' },
      { if: 'dex_to_calder', text: 'Birdie is staying with Lourdes and feeding her cats, while her dad tells the truth in a hotel with a policeman at the door.' },
    ] },
    { who: 'teo', after: 'm27_the_night_before', text: [
      { if: 'saved_teo', text: 'Teo wears his father\'s watch now. For the job he promised forty Lantern Kings and a truck full of fireworks.' },
      { if: 'chased_rourke', text: 'Teo stayed away from the bonfire. His text: Rourke\'s phone, the one Jay picked, would stop a van on the night. “Make it worth it.”' },
    ] },
    { who: 'mae', after: 'm27_the_night_before', text: [
      'Jay told Mae what Augie\'s first letter said: Tommy was gone before Jay drove. Nobody left him. She insisted on coming on the job as the crew\'s medic.',
      { if: 'mae_stay', text: 'About coming with him, she is still thinking.' },
      { if: 'mae_space', text: 'He really did give her space, and she wonders who he is now.' },
    ] },
    { who: 'nana_lu', after: 'm27_the_night_before', text: ['Long before Jay, Nana Lu caught a skinny boy stealing her tomatoes, sat him on the step and fed him plum cake. She never saw him again, and hoped he grew up nice.'] },
    { who: 'nana_lu', after: 'm28_the_garden_party', text: ['The boy in her tomatoes was Harlan Voss.'] },
    { who: 'voss', after: 'm28_the_garden_party', text: ['Voss\'s father died on the docks when he was sixteen. Starving, he stole Nana Lu\'s tomatoes and she fed him cake. He has bought every house on Heron Street but hers, and never went back: she would have fed him again.'] },
    { who: 'pruitt', after: 'm28_the_garden_party', text: ['At the gala Pruitt told Jay that everybody in the book would vote yes on Phase Two. Then: “Ask me in the morning.”'] },
    { who: 'hollis', after: 'm28_the_garden_party', text: ['Jay brought back the red vest, washed twice. Nobody had ever brought back the vest.'] },
    { who: 'teo', after: 'm29_tidewater_again', text: [
      { if: 'saved_teo', text: 'On the night of the job, Teo\'s Lantern Kings set Tannery Row alight with fireworks and kept half of Halberd busy.' },
      { if: 'chased_rourke', text: 'Teo heard about the job on the scanner. His text said one word: “Good.”' },
    ] },
    { who: 'garza', after: 'm29_tidewater_again', text: ['Garza drove the lead van with the Tally in it. When Jay boxed him in, he handed over the keys and ran, still asking for a desk.'] },
    { who: 'tommy', after: 'm30_salt_and_iron', text: ['Mae played the dashcam tape of Tommy saying “I\'m not armed” on every police radio in the city. The officers Horne sent after Jay listened, turned off their lights and went home.'] },
    { who: 'mae', after: 'm30_salt_and_iron', text: ['Mae pressed play on the tape of her brother for every cop in Vicehaven. Then, face to face with Horne, she told him that Tommy had double-knotted his laces, the way he did when he was scared: “You saw a gun. I saw his laces.”'] },
    { who: 'ansel', after: 'm30_salt_and_iron', text: ['When Halberd pointed a rifle at Noor, Ansel stood up and fought for the first time in twelve years. He was shot through the shoulder, Mae stitched him on Rhea\'s desk, and he lived. “I still can.”'] },
    { who: 'rourke', after: 'm30_salt_and_iron', text: ['Rourke died on the night of the job, when the rotten handrail on the orange crane gave way, the one Halberd billed the port for and never fixed. Before he fell, he gave Jay his wife\'s wedding ring for his daughter, Margaret.'] },
    { who: 'horne', after: 'm30_salt_and_iron', text: [
      { if: 'trusted_calder', text: 'Calder arrested Horne in bay 14 for the murder of Tommy Reyes, and took his gold watch as evidence.' },
      { if: '!trusted_calder', text: 'Horne ran. Jay caught him, chained him to the Tidewater gate with his own handcuffs and his phone taped over his badge, and waited. Calder arrested him for the murder of Tommy Reyes.' },
    ] },
    { who: 'calder', after: 'm30_salt_and_iron', text: [
      { if: 'trusted_calder', text: 'Calder hid in the back of Horne\'s own cruiser all night, ate his butterscotch, and arrested him in bay 14.' },
      { if: '!trusted_calder', text: 'Jay never trusted her, but Calder still turned up at the Tidewater gate to read Horne his rights, slowly, every word.' },
    ] },
    { who: 'dex', after: 'm30_salt_and_iron', text: [
      { if: 'dex_forgiven', text: 'Dex rammed the Halberd barricade at Kostas Salvage, totalled his tow truck, and gave Horne back Birdie\'s junior-deputy sticker.' },
      { if: 'dex_banished', text: 'Dex came back for one minute, rammed the Halberd barricade open, and drove away without a wave. His text: “We\'re square. We\'re never square.”' },
      { if: 'dex_to_calder', text: 'Dex was still telling Calder the truth when the crew needed the gate opened, so they blew it with grenades.' },
    ] },

    // ---- Dead Air
    { who: 'noor', after: 'da3_jammer', text: ['Noor finally met Solace, her favourite voice in the city, and was exactly as embarrassing as she feared. She is never washing that water jug.'] },
    { who: 'solace', after: 'da3_jammer', text: ['Solace\'s real name is Lorna. Her old overnight show was called Solace Hours, and nobody tells their secrets to a Lorna.'] },
    { who: 'garza', after: 'da3_jammer', text: ['Halberd moved Garza to Signals, listening to Solace every night. He kept listening after work, too. He liked her hour on loneliness.'] },
    { who: 'priya', after: 'da4_signal_boost', text: ['Priya read the whip list on air under her own name, and said sorry to her grandmother for the line she wrote. Now she is a name, and names are harder to make disappear.'] },
    { who: 'solace', after: 'da4_signal_boost', text: ['Marguerite, the caller who was cut off on Solace\'s last legal show, rang back to finish her sentence: her son is fine. Solace let four seconds of silence go out: the first dead air she ever chose.'] },
    { who: 'dj_sable', after: 'da4_signal_boost', text: ['Sable brought Solace her coffee in person, for once. She called him Marcus.'] },
    { who: 'pruitt', after: 'da4_signal_boost', text: ['Pruitt rang Solace\'s show to request a song for his dog. Somebody once wrote him a line about loyalty, and he would like to deserve it one day.'] },

    // ---- The endings
    { who: 'voss', after: 'm31_last_light', text: [
      { if: 'ending_a', text: 'Voss sailed away on his launch, Hope. The Phase Two vote passed, and he sent a recorded message to the Crown opening: he was travelling.' },
      { if: ['ending_b', 'trusted_calder'], text: 'Calder arrested Voss at the end of Oceanview Pier. He went on trial in a grey suit, and Pruitt testified first.' },
      { if: ['ending_b', '!trusted_calder'], text: 'Voss escaped by sea, but the whole city heard his book. He was charged in his absence.' },
      { if: 'ending_c', text: 'Jay shot Harlan Voss at the end of Oceanview Pier, beside a bench Voss had paid for himself.' },
    ] },
    { who: 'augie', after: 'm31_last_light', text: [
      { if: '!ending_c', text: 'Augie\'s last letter, number 37, said what he would think if Jay was at the prison gate: “There he is. Late.” And what\'s at twelve isn\'t a place. It\'s people.' },
      { if: 'ending_a', text: 'Jay read it at the city limits.' },
      { if: 'ending_b', text: 'Jay read it in prison, over Grace\'s plum cake.' },
      { if: 'ending_c', text: 'Augie\'s last letter, number 37, is still sealed, on the table by the sugar in Jay\'s Starlite booth. He has never opened it.' },
    ] },
    { who: 'mae', after: 'm31_last_light', text: [
      { if: ['ending_a', 'a_mae_rides'], text: 'Mae left Medic 12 at the pier and drove north with Jay, her feet on the dash.' },
      { if: ['ending_a', '!a_mae_rides'], text: 'Mae stayed in Vicehaven. Her text: “Drive safe. I mean it this time.”' },
      { if: ['ending_b', 'mae_stay'], text: 'Mae wore Jay\'s jacket on every shift while he was inside, and met him at the gate with it: “Where do you think we\'re all going?”' },
      { if: ['ending_b', '!mae_stay'], text: 'The day Jay came out, Mae texted “Home?” and arrived late in Medic 12, straight from a call: “Get in the car, Jay. Ask me on the way.”' },
      { if: 'ending_c', text: 'Mae rang Jay at the Starlite at three in the morning. He didn\'t answer.' },
    ] },
    { who: 'dex', after: 'm31_last_light', text: [
      { if: ['ending_a', 'dex_forgiven'], text: 'Dex and Birdie waved Jay off from the ashes of the garage, under a sign: CALLOWAY AUTO (UNDER NEW INVESTMENT).' },
      { if: ['ending_a', 'dex_banished'], text: 'Dex sent a postcard from somewhere cold: he fixed a snowplough, and they think he is a genius.' },
      { if: ['ending_a', 'dex_to_calder'], text: 'Dex served eighteen months. Rhea paid Birdie\'s school fees every term, with Jay\'s money.' },
      { if: ['ending_b', 'dex_forgiven'], text: 'Dex and Ansel rebuilt Calloway Auto. The new lift is paid for, every cent, and Dex can look at it.' },
      { if: ['ending_b', 'dex_to_calder'], text: 'Dex walked out of the same prison gate a month before Jay, and was waiting for him with Birdie.' },
      { if: ['ending_b', 'dex_banished'], text: 'Dex stayed away, but sent Birdie on the coach with a note: “We\'re never square. Welcome home anyway.”' },
      { if: ['ending_c', 'dex_forgiven'], text: 'Dex rang Jay: “I\'ve been what you are now. It doesn\'t get lighter.”' },
      { if: ['ending_c', 'dex_to_calder'], text: 'Dex added a page to his statement, naming Jay for Tidewater and the pier.' },
    ] },
    { who: 'teo', after: 'm31_last_light', text: [
      { if: ['ending_a', 'saved_teo'], text: 'With his share, Teo bought back every lease in Lantern Alley: “Somebody in this family should get out. Seatbelt, brother.”' },
      { if: ['ending_a', 'chased_rourke'], text: 'Teo took a share for the Alley, “not for you”, then stayed on the line: “Go on, then. Brother.”' },
      { if: 'ending_b', text: 'Teo runs the tenants\' union now, and repainted Tommy\'s mural with Augie beside him. He met Jay at the gate wearing his father\'s watch: “There he is. Late.”' },
      { if: ['ending_c', 'saved_teo'], text: 'Teo stands behind Jay now, in a suit that doesn\'t fit, and calls him Mr. Mercer.' },
      { if: ['ending_c', 'chased_rourke'], text: 'Teo walked away from Jay at the Crown: “You\'re him now. Congratulations.”' },
    ] },
    { who: 'noor', after: 'm31_last_light', text: [
      { if: 'ending_a', text: 'Haddad Pharmacy reopened on Tannery Row, with a little teal car in neon over the door. Nobody knows what it means but Noor.' },
      { if: 'ending_b', text: 'Haddad Pharmacy reopened. Noor\'s dad does the counter and tells everybody what\'s wrong with them, for free.' },
      { if: 'ending_c', text: 'Noor quit by text: “I did this for a pharmacy, not a new Voss.”' },
    ] },
    { who: 'ansel', after: 'm31_last_light', text: [
      { if: 'ending_a', text: 'Boateng Blooms opened on Tannery Row. Ansel keeps a bucket of flowers by the door for Jay, and nobody else may buy from it.' },
      { if: 'ending_b', text: 'Boateng Blooms opened on Tannery Row, with sunflowers out front. Lina Solano buys flowers there every Saturday. He has never told her.' },
      { if: 'ending_c', text: 'Ansel left a single red rose on Lulu\'s windscreen, thorns and all, and no note.' },
    ] },
    { who: 'lina', after: 'm31_last_light', text: [
      { if: 'ending_b', text: 'Lina comes to Ansel\'s flower stall every Saturday and asks him the names of things. He wraps her lilies as if they might break, and never charges her.' },
    ] },
    { who: 'rhea', after: 'm31_last_light', text: [
      { if: 'ending_a', text: 'Rhea took her cut, cashed Stavros\'s cheque and bought a crane. It is pink, it is called Stavros, and it is the ugliest crane on the coast.' },
      { if: 'ending_b', text: 'Rhea doesn\'t do prison gates, so she sent Kostya to lean on the horn for eleven seconds. Down on Crane Row, a pink crane called Stavros unloads the ships.' },
      { if: 'ending_c', text: 'Rhea kept her cut and cashed Stavros\'s cheque at last. It felt like a price. She gave Jay one nod: business.' },
    ] },
    { who: 'calder', after: 'm31_last_light', text: [
      { if: ['ending_a', 'trusted_calder'], text: 'Calder let a teal car heading north get lost for a day.' },
      { if: ['ending_a', '!trusted_calder'], text: 'Calder watched Jay leave the way she watched him come home: from her green car, unseen.' },
      { if: ['ending_b', 'trusted_calder'], text: 'Calder took Jay\'s confession at the end of the pier and let him drive himself to Central. She met him at the gate, off duty, with a full cup of coffee.' },
      { if: ['ending_b', '!trusted_calder'], text: 'Calder took Jay\'s confession on the bench at Central. When he came out, she left a card: SIGNED.' },
      { if: ['ending_c', 'trusted_calder'], text: 'Calder can\'t prove the pier. Yet. She has decided to spend her pension on trying.' },
      { if: ['ending_c', '!trusted_calder'], text: 'Calder\'s green car parks across the road from the Starlite every night now.' },
    ] },
    { who: 'pruitt', after: 'm31_last_light', text: [
      { if: 'ending_a', text: 'Phase Two passed eleven votes to two. Pruitt voted no, and nobody, including Pruitt, can say why.' },
      { if: ['ending_b', 'trusted_calder'], text: 'The Phase Two vote was never held. Pruitt testified first, with his own lawyer and a photograph of his dog.' },
      { if: ['ending_b', '!trusted_calder'], text: 'The Phase Two vote was never held. Eleven councilmen resigned, and Pruitt resigned twice, to be sure.' },
      { if: 'ending_c', text: 'Pruitt calls Jay sir now, and wants to know how he would like the vote to go.' },
    ] },
    { who: 'lourdes', after: 'm31_last_light', text: [
      { if: ['ending_a', 'kept_cut'], text: 'Lourdes found Nana Lu\'s house in her mailbox, in an envelope, and gave it to the tenants.' },
      { if: ['ending_b', 'kept_cut'], text: 'Jay signed Nana Lu\'s house over to the tenants\' fund. The fund rents it back to him, for $49 a night.' },
      { if: ['ending_b', 'gave_cut'], text: 'Jay laid Tommy\'s yellow hoodie over Nana Lu\'s porch rail. “Is this somewhere nice?” Lourdes asked. “It\'s the best I\'ve got.”' },
    ] },
    { who: 'oyelaran', after: 'm31_last_light', text: [
      { if: 'ending_a', text: 'Grace put Nana Lu\'s porch light on, and is leaving it on. She waters the lemon tree.' },
      { if: 'ending_b', text: 'Grace visited Jay in prison on two buses with a plum cake, the way Nana Lu visited Augie, and kept the porch light on every night he was away.' },
    ] },
  );

  // The decisions made in act 4 and Dead Air. Keys are the flag an option
  // sets, or its exact label when it sets none.
  Object.assign(R.choices, {
    m30_salt_and_iron: [
      { title: 'Rourke on the walkway', options: {
        'Reach for him.': ['Jay lay flat on the walkway and caught Rourke\'s wrist: nobody gets left in the lot. Rourke pressed his wife\'s ring into Jay\'s fist, then opened Jay\'s fingers himself, one at a time, and fell.'],
        'Let him hang.': ['Jay stood still and let Rourke hang. Rourke said that was exactly what he would have done, set his wife\'s ring by Jay\'s boot, and let go.'],
      } },
    ],
    m31_last_light: [
      { title: 'The end of the pier', options: {
        ending_a: ['“Drive.” Jay took the money and the Tally, let Voss sail away, and drove north out of Vicehaven.'],
        ending_b: ['“Give it to the city.” Jay took the Tally out of Voss\'s hands, made it public, and handed himself in for Tidewater.'],
        ending_c: ['“Finish it.” Jay shot Harlan Voss at the end of the pier and took his money, his book and his city.'],
      } },
    ],
    da4_signal_boost: [
      { title: 'The red button', options: {
        da_spoke: ['Jay pressed the talkback and spoke to the whole city: “This is for Lucinda Mercer.” She drove the school bus for thirty-one years and never once ran a red. “I\'ve run all of them. Sorry, Nana.”'],
        da_silent: ['Jay looked at the button for a long time, and left it. Solace told the city he was shaking his head: some people talk with their hands.'],
      } },
    ],
  });
})();
