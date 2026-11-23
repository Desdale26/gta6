/*
 * data/recap-dlc1.js — "Story so far" recaps for the story DLC "Chasing the
 * Firecrest", ACTS 1 and 2 (d01 to d16): the DLC's prologue, the intro and
 * outro of Act 1 (Lot 17) and Act 2 (Hiding in Plain Sight), every main job,
 * the people met there and the choices made. Read by js/storylog.js (its
 * model().dlc section: pause menu → Story so far, the DLC tab; the phone's
 * Story app; the "Previously in Chasing the Firecrest…" card).
 *
 * Parts are strings and { if, text } objects joined with single spaces; `if`
 * is a flag, '!flag', or an array of those (all must hold). Completed mission
 * ids count as flags. Branches here: dlc_blog_on / dlc_blog_off (d08, read in
 * d09, d10, d11, d13 and d16) and dlc_chet_told / dlc_chet_kept (d14, read
 * later). The DLC never mentions the main story's people except Nana Lu, so
 * nor do these. No spoilers past each job: who Odie Wren is, the Gorse file
 * and the rest belong to the Act 3 and 4 recaps.
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

  // What the player knows before d01's first scene: a text from a stranger.
  DLC.prologue = [
    'Jay Mercer is in Vicehaven this summer, between things, and good at driving.',
    'If anyone asks what he does, he says, "I drive."',
    'Today he has no plans at all.',
    'A little after noon, a number Jay doesn\'t know sends him a text: "Driver wanted. One afternoon. Cash. Cinder Creek Storage. Bring a car with a big boot."',
  ];

  DLC.acts[1] = {
    title: 'Lot 17',
    intro: [
      'A banned teenager has bought an old storage unit, and found a tin box inside with a key and a riddle in it.',
      'She needs a driver. Jay needs something to do this summer.',
    ],
    outro: [
      'The hunt has three parts of the Firecrest so far: the steering wheel, the bonnet bird and the rally clock.',
      'Toby Brask, who built the car with Dess, has admitted he never delivered the tin box to June, Dess\'s daughter.',
      'Leo Castellane has offered Jay $50,000, and Jay said no. Dash Lockwood reads Milo\'s blog to stay one step ahead.',
      'And the next riddle points to the lawnmower in June\'s shed, at the house where she grew up.',
    ],
  };


  DLC.acts[2] = {
    title: 'Hiding in Plain Sight',
    intro: [
      'The next part is in the lawnmower in June Marlow\'s shed. June is Pip\'s mum, and she has no idea any of this is going on.',
      'Pip has not told her. She is about to find out.',
    ],
    outro: [
      'Jay has five parts of the Firecrest: the steering wheel, the bonnet bird, the rally clock, the carburettor and the two headlamps.',
      'June knows about the hunt now, and wants no part of it. Pip has seen her gran\'s name under the paint on the Speedway honours board.',
      { if: 'dlc_chet_told', text: 'Chet Valiant knows the truth about the race, and has started rewriting his film.' },
      { if: 'dlc_chet_kept', text: 'Chet Valiant has asked if his film is true. Jay told him to stay out of it.' },
      'Now Jay has landed an airliner on Isla Paloma, the island Leo Castellane nearly owns, and the next riddle is about a box where nobody wins.',
    ],
  };

  Object.assign(R.jobs, {
    // ---------------------------------------------------------------- d01
    d01_lot_17: {
      setup: [
        'A stranger has texted Jay asking for a driver for one afternoon, cash, at Cinder Creek Storage.',
        'An auction is on when he arrives, and a girl in a red cap is bidding on lot 17 like her life depends on it.',
      ],
      recap: [
        'The girl was Pip Marlow, nineteen, a Speedway junior champion banned from the roads for doing 92 in a 40. She won lot 17 for $310.',
        'Inside, among boxes of photos, was a tin box: an old starter key on a gold bird keyring, and a poem.',
        'A polite woman in teal from Castellane Hospitality tried to buy the box, then gave Jay a comment card. Jay lost her cars and the police.',
        'Pip\'s gran, Dess Marlow, vanished after winning a race. The poem said "Firecrest", and Jay remembered Nana Lu\'s bedtime story about that very car.',
      ],
      line: 'Jay met Pip Marlow, who bought a storage unit and found a tin box holding the Firecrest\'s key and a riddle.',
    },

    // ---------------------------------------------------------------- d02
    d02_the_tin_man: {
      setup: [
        'Pip has stayed up all night with the riddle. A professor at Halcyon University wrote three books about her gran.',
        'They all say Dess drowned in the bay. Pip wants Jay to drive her there to ask him anyway.',
      ],
      recap: [
        'Professor Ambrose Quill was sure the riddle meant a sunken paddle steamer. His grandson Milo, twelve, said "tin man" meant the Cinder Creek water tower.',
        'Milo was right, and he posted the riddle on his blog, The Firecrest Files.',
        'TV treasure hunter Dash Lockwood got to the tower first and proudly left with a rusty tap.',
        'Jay climbed up and found the Firecrest\'s wooden steering wheel hidden under a valve cap. Inside the horn button was a new riddle about a bird where cowboys play.',
        'Milo worked out that Dess had hidden her car\'s parts in a trail.',
      ],
      line: 'Milo solved the first riddle, and Jay found the Firecrest\'s steering wheel on top of the Cinder Creek water tower.',
    },

    // ---------------------------------------------------------------- d03
    d03_double_feature: {
      setup: [
        'Professor Quill has a confession: he owns the only film of the Southbay 500.',
        'He has hired the old Starview drive-in to show it tonight, and has told rather a lot of people that he has it.',
      ],
      recap: [
        'At the drive-in, everyone watched Dess win the race: she tapped her wheel three times, and a gold bird sat on her bonnet. A young T. Brask was her chief engineer.',
        'A western on the big screen gave Milo the answer: cowboys who never die are actors, so the bird is a weathervane on the Sunreel Studios western set.',
        'Then Guest Services men in teal came for the film. Jay held them off until the projectionist turned on the sprinklers.',
        'Castellane is making a film about the race. To get on set, Jay took a job as a stunt double.',
      ],
      line: 'The newsreel of Dess\'s win showed Milo the next clue, and Jay saved the film from Guest Services at the drive-in.',
    },

    // ---------------------------------------------------------------- d04
    d04_stunt_double: {
      setup: [
        'Castellane\'s film, Champions Since Day One, needs a stunt double for its star, Chet Valiant.',
        'Jay is starting at Sunreel Studios this morning. The bird he wants is on the sheriff\'s office roof.',
      ],
      recap: [
        'Director Fenella Moss hired Jay on the spot, and Chet Valiant, who never drives over thirty, lent him his red jacket.',
        'Jay drove Rex Castellane\'s gold car through a hat shop twice and earned $3,000.',
        'At lunch he swapped the gold bird on the roof for a plastic chicken. Dash grabbed a cowboy\'s spur instead.',
        'Under the bird\'s base, Pip found the next riddle, which pointed to Halcyon.',
        'She also learned the film makes Rex the winner and Dess\'s car the one that crashes, which isn\'t true.',
      ],
      line: 'Working as a film stunt double, Jay took the Firecrest\'s bonnet bird from the roof of a fake sheriff\'s office.',
    },

    // ---------------------------------------------------------------- d05
    d05_clockwork: {
      setup: [
        'Milo has solved the riddle from under the bird, but won\'t say anything until his grandad is asleep.',
        'It is late at night at Halcyon, and the campus guard, Officer Plum, takes his bicycle very seriously.',
      ],
      recap: [
        'Milo explained: twelve on top and six below is a clock face, so the part was hidden behind the Halcyon clock. He started calling Jay "Jay" instead of "Mr Mercer".',
        'Jay sneaked past Officer Plum, climbed the scaffold and found Dess\'s rally clock inside the clock tower. Taking it stopped the big clock.',
        'Dash took the giant minute hand and got chased by Plum.',
        'On the back it said "For O.M. from T. Brask", with a riddle about a baby, a shed and something that roars on Sundays. Pip went very quiet.',
      ],
      line: 'Jay found the Firecrest\'s rally clock hidden behind the Halcyon clock face, and accidentally stopped the university\'s clock.',
    },

    // ---------------------------------------------------------------- d06
    d06_breaking_news: {
      setup: [
        'Dash Lockwood is on breakfast TV saying he knows where the next part is.',
        'He always gets there first, and Pip wants to know how. His purple TV van is parked at Halcyon.',
      ],
      recap: [
        'Jay chased Dash\'s van and boxed it in. At the marina Dash showed them a binder of Milo\'s blog: every riddle, printed out. That was how he always knew.',
        'Dash admitted that Castellane is paying for his special. He didn\'t remember a letter Pip once sent his show about her gran.',
        'Milo was horrified, and his gran accidentally unsubscribed.',
        'Pip worked out that T. Brask built the Firecrest with Dess. They spotted the Coral Marina lighthouse, where Brask might be.',
      ],
      line: 'Jay caught Dash Lockwood and learned he had been following Milo\'s blog all along; Castellane is paying for his show.',
    },

    // ---------------------------------------------------------------- d07
    d07_champions_since_day_one: {
      setup: [
        'Toby Brask has kept the Coral Marina lighthouse for thirty-three years and never collects his post.',
        'Pip wants to meet the man who built her gran\'s car. The harbour office says he bites.',
      ],
      recap: [
        'Guest Services were taking Toby Brask\'s photos away. Toby fired flares, and Jay cleared them off the breakwater.',
        'Toby told Pip she had her gran\'s chin, called her "trouble", and locked his door.',
        'Then Leo Castellane, whose hotels say "Champions Since Day One", offered Jay $50,000 to bring him whatever they found first. Jay said he would think about it. He meant no.',
        'At ten that night, the old fort light across the bay flashed three times, and Toby\'s lighthouse flashed back.',
      ],
      line: 'Jay found Toby Brask, the Firecrest\'s engineer, and turned down Leo Castellane\'s $50,000 offer.',
    },

    // ---------------------------------------------------------------- d08
    d08_thirty_four_years: {
      setup: [
        'Jay and Pip waited outside the lighthouse half the night. Now Toby Brask has come out with his drawings of the Firecrest.',
        'He wants a lift to lot 17, and his truck has no headlights.',
      ],
      recap: [
        'With Guest Services following, Toby told them the truth: Dess gave him the tin box for June\'s seventeenth birthday. June is Pip\'s mum.',
        'Toby drove to the house but saw a car outside and left. For thirty-four years he never went back.',
        'At lot 17 Pip read the clock\'s riddle and understood it: the next part is the carburettor in her mum\'s lawnmower, in the shed nobody may touch.',
        'Milo asked if he should stop posting.',
        { if: 'dlc_blog_on', text: 'Jay told him to keep going and let the others chase them. Milo now waits a day before he posts.' },
        { if: 'dlc_blog_off', text: 'Jay told him to go dark. Milo took the blog down and keeps the score on card on his wall.' },
        'Pip called Jay "Jay" for the first time.',
      ],
      line: 'Toby admitted he never delivered the tin box to June, and Pip realised the next part is in her mum\'s lawnmower.',
    },

    // ---------------------------------------------------------------- d09
    d09_minor_fault: {
      setup: [
        'The carburettor is in the old lawnmower in Aunt Win\'s shed, at the house where Pip\'s mum, June, grew up.',
        'June is out giving driving lessons until four. Pip knows where the spare key is.',
      ],
      recap: [
        'Pip took the gleaming racing carburettor off the mower. Then her mum, June Marlow, came home early.',
        { if: 'dlc_blog_on', text: 'Milo\'s post asking "Is the next part in a shed?" brought Guest Services straight to the house.' },
        { if: 'dlc_blog_off', text: 'Guest Services had followed Toby\'s slow pickup straight to the house.' },
        'Jay escaped in June\'s learner car while she calmly marked his driving: "Minor fault." When he took a hit to protect her, she marked it serious, then crossed it out.',
        'June refused to hear about the hunt. Inside the carburettor was a riddle about a painted-out name and a board for winners.',
      ],
      line: 'Jay and Pip took the carburettor from June\'s mower, June caught them, and she marked Jay\'s getaway driving on her clipboard.',
    },

    // ---------------------------------------------------------------- d10
    d10_heritage_run: {
      setup: [
        'Milo says the riddle means the honours board in the Speedway\'s winners\' enclosure, and you only get in there by winning.',
        'Today is the Celebrity Heritage Race, and Chet Valiant has entered.',
      ],
      recap: [
        'Chet admitted he has never driven over thirty in his life. Every racing scene in his films was a stunt double.',
        'So Jay raced in Chet\'s helmet and jacket, passed works driver Teddy Castellane on the last lap and won. Monty Sprake, the Speedway announcer, kept getting his name wrong.',
        'In the winners\' enclosure, Pip found her gran\'s name, O. MARLOW, hidden under fresh gold paint saying R. CASTELLANE.',
        'Scratched under the board was a riddle about two eyes on two tall chairs.',
      ],
      line: 'Jay won a celebrity race in Chet Valiant\'s helmet, and Pip found Dess\'s name painted over on the honours board.',
    },

    // ---------------------------------------------------------------- d11
    d11_two_eyes: {
      setup: [
        'Milo has worked it out: the two eyes are the Firecrest\'s headlamps, on two lifeguard towers at Sandpiper Beach.',
        'But Castellane\'s new fence and a private party surround both towers.',
      ],
      recap: [
        'Jay jumped the Drifter off a skate ramp, over the fence and into the party. An angry lifeguard called Gully blew his whistle at him from tower to tower.',
        { if: 'dlc_blog_on', text: 'Dash was there too, filming the wrong thing, and grabbed Gully\'s whistle as his latest "legend".' },
        { if: 'dlc_blog_off', text: 'With no blog to follow, Dash never turned up, but extra Guest Services patrolled the fence.' },
        'Jay took both headlamps and drove out through the buffet.',
        'Stamped inside one lamp was "BRASK & MARLOW SPEED SHOP, THE PROMENADE. 7 - 17 - 50": a shop, and a safe\'s combination.',
      ],
      line: 'Jay jumped a fence into a private beach party and took the Firecrest\'s two headlamps from the lifeguard towers.',
    },

    // ---------------------------------------------------------------- d12
    d12_floor_safe: {
      setup: [
        'Dess and Toby\'s old speed shop on the promenade is now a Kwik Pik.',
        'Behind the counter is an iron floor safe that nobody has opened in fifty years. Jay has the combination.',
      ],
      recap: [
        'Femi Akande, the clerk, wasn\'t allowed to open the safe, even after Jay bought nineteen bags of crisps. So Jay pointed his gun and asked again.',
        'Inside was old money, which Jay left, and an envelope, which he took. In it was a photo of baby June asleep in the Firecrest on race day, and another riddle about a claw and a wheel.',
        'Jay lost the police on the coast road.',
        'Then Toby rang: Guest Services were emptying lot 17, and all the parts were in it.',
      ],
      line: 'Jay opened the speed shop\'s fifty-year-old safe and found a photo of baby June, but Guest Services raided lot 17.',
    },

    // ---------------------------------------------------------------- d13
    d13_the_crusher: {
      setup: [
        'Guest Services have taken everything from lot 17, including every part of the Firecrest found so far.',
        'Toby thinks the truck is going to Castellane\'s crusher at the Ironside scrapyard.',
      ],
      recap: [
        { if: 'dlc_blog_on', text: 'Milo\'s blog photo of the parts had shown the LOT 17 sign on the wall.' },
        { if: 'dlc_blog_off', text: 'Castellane had simply bought Cinder Creek Storage that morning.' },
        'At Ironside, Ottoline Graves of Guest Services was waiting with her staff. Jay fought his way to the crusher and grabbed the boxes off the belt just in time.',
        'He saved the wheel, the bird and the lamps. But Dash and Kit drove off with the rally clock and June\'s carburettor "for safekeeping", on Castellane\'s orders.',
        'Then Guest Services chained the gate shut. Pip phoned Chet.',
      ],
      line: 'Jay saved most of the parts from the Ironside crusher, but Dash drove off with the rally clock and the carburettor.',
    },

    // ---------------------------------------------------------------- d14
    d14_decoy: {
      setup: [
        'Jay and Pip are trapped in the Ironside scrapyard with the parts, and Guest Services are waiting at the gate.',
        'Chet Valiant is on his way, at exactly thirty miles an hour, with the film\'s fake Firecrest.',
      ],
      recap: [
        'Chet drove the film\'s replica Firecrest through the gate. Jay drove it out, and every Guest Services car chased him through the rail yard and the power station.',
        'Meanwhile Pip slipped out the back with the real parts.',
        'Ottoline knew it was a fake all along, and only chased it to be polite.',
        'Driving home, Chet asked if his film was true.',
        { if: 'dlc_chet_told', text: 'Jay told him the truth: Dess won, and the Castellanes stole it. Chet began rewriting his scenes.' },
        { if: 'dlc_chet_kept', text: 'Jay told him it was just a film. Chet didn\'t believe him.' },
        'Then Dash posted a photo: he was flying the clock and carburettor to Isla Paloma tomorrow.',
      ],
      line: 'Jay drove the film\'s fake Firecrest as a decoy so Pip could escape Ironside with the real parts.',
    },

    // ---------------------------------------------------------------- d15
    d15_departures: {
      setup: [
        'Dash is flying the rally clock and June\'s carburettor to Isla Paloma on Castellane\'s private plane, at a quarter past eleven.',
        'Jay is at Vicehaven International with a boarding pass from a man who wasn\'t using it.',
      ],
      recap: [
        'Jay got through airport security, and Kit, Dash\'s camera operator, quietly pointed him the right way.',
        'At the plane, the pilot, Captain Daventry, turned out to be another Guest Services man with a gun. He soon left down the emergency slide.',
        'Dash locked himself in the toilet with the metal case.',
        'With the police arriving, Jay sat down in the pilot\'s seat, found the button marked START, and fired up the engines.',
      ],
      line: 'Jay took over Castellane\'s charter airliner at the airport, with Dash and the missing parts locked in its toilet.',
    },

    // ---------------------------------------------------------------- d16
    d16_four_out_of_ten: {
      setup: [
        'Jay is sitting in the pilot\'s seat of an airliner, and he has never flown anything.',
        'The police are at the foot of the stairs, and Pip has found a video.',
      ],
      recap: [
        'With Pip and Milo shouting advice down the phone, Jay took off, followed the Paloma Bridge to Isla Paloma and landed on the tiny runway at Paloma Field.',
        'The police turned back at the island, because Castellane\'s security runs it.',
        'Hob Finnegan of the Paloma Flying Club gave the landing four out of ten for bending his windsock, and agreed to teach Jay to fly.',
        'Dash handed over the case with the clock and carburettor.',
        { if: 'dlc_blog_on', text: 'A video of the landing got Milo\'s blog to 12,000 subscribers.' },
        { if: 'dlc_blog_off', text: 'Milo drew the plane on his wall.' },
      ],
      line: 'Jay landed an airliner on Isla Paloma\'s tiny airfield, got the clock and carburettor back, and met flying instructor Hob Finnegan.',
    },
  });

  // People met in Acts 1 and 2 (names and roles come from dlc.js).
  Object.assign(R.who, {
    pip: { intro: 'd01_lot_17', bio: [
      'Pip Marlow, nineteen, is a Speedway junior champion with a temper and no patience. She is banned from the roads for doing 92 in a 40, so she hired Jay to drive.',
      'Her gran, Dess Marlow, raced, won something, and vanished.',
    ] },
    clem: { intro: 'd01_lot_17', bio: 'Clem Ruddock runs Cinder Creek Storage and talks faster than anyone in the west. He sold Pip lot 17 for $310 and wrote the receipt on a napkin.' },
    ottoline: { intro: 'd01_lot_17', bio: [
      'A woman in a teal suit from Castellane Hospitality, with an earpiece and very good manners.',
      'She tried to buy the tin box, and leaves Jay a printed comment card everywhere she causes trouble. He keeps them all.',
    ] },
    prof_quill: { intro: 'd02_the_tin_man', bio: [
      'Professor of Local History at Halcyon University. He wrote three books proving the Firecrest is at the bottom of the bay.',
      'He gets carsick in every car, says "Great Scott" and is usually wrong about riddles.',
    ] },
    milo: { intro: 'd02_the_tin_man', bio: [
      'The Professor\'s grandson, twelve, staying at Halcyon for the summer. He reads everything and solves Dess\'s riddles before the grown-ups.',
      'He runs a blog called The Firecrest Files and phones Jay a lot, always starting with a fact.',
    ] },
    dash: { intro: 'd02_the_tin_man', bio: [
      'Host of the TV show Lockwood\'s Lost Legends. He always gets to the next place first, then proudly holds up the wrong thing and shouts "Legend... FOUND!"',
      'Somehow he never seems to find anything real.',
    ] },
    kit: { intro: 'd02_the_tin_man', bio: 'Dash\'s camera operator. Deadpan, always filming ("We\'re rolling. We\'re always rolling."), and usually the first to point out that his latest find is a tap.' },
    fenella: { intro: 'd04_stunt_double', bio: 'The director of Castellane\'s film, Champions Since Day One. She has a megaphone, three phones and no patience, loves a good stunt, and hired Jay as a stunt double on the spot.' },
    chet: { intro: 'd04_stunt_double', bio: [
      'Film star of Oversteer 2: Understeer (there was no Oversteer 1). He plays Rex Castellane in the film, wears a red racing jacket, calls everyone "kid" and never drives over thirty.',
    ] },
    plum: { intro: 'd05_clockwork', bio: 'Halcyon campus security. He patrols on a bicycle, loves the fountain and keeps a laminated list of troublemakers. Milo is on it.' },
    toby: { intro: 'd07_champions_since_day_one', bio: [
      'Toby Brask, eighty-one, keeper of the Coral Marina lighthouse for thirty-three years. He built the Firecrest with Dess fifty years ago.',
      'He fires flares at visitors, calls Pip "trouble", and talks more to engines than to people.',
    ] },
    leo: { intro: 'd07_champions_since_day_one', bio: [
      'Leo Castellane owns forty hotels, all saying his family have been "Champions Since Day One", because his father Rex is said to have won the Southbay 500.',
      'Warm and charming, he offered Jay $50,000 to bring him whatever they find.',
    ] },
    june: { intro: 'd09_minor_fault', bio: [
      'June Marlow is Pip\'s mum and Dess\'s daughter, and has been Vista Verde\'s driving instructor for thirty years.',
      'She was raised by her Aunt Win and told her mother died in a racing crash. She marks everything: "Minor fault."',
    ] },
    monty: { intro: 'd10_heritage_run', bio: 'Monty Sprake, the voice of the Southbay Speedway for thirty years. He knows every driver and every lap record, and never gets Jay\'s name right.' },
    teddy: { intro: 'd10_heritage_run', bio: 'Teddy Castellane, Leo\'s nephew and the Castellane Racing works driver. Talented, a bit spoilt, and Pip\'s rival at the Speedway.' },
    gully: { intro: 'd11_two_eyes', bio: 'A young Sandpiper Beach lifeguard with red shorts, a loud whistle and very strong feelings about people who climb his tower without a lifeguard qualification.' },
    benny: { intro: 'd12_floor_safe', bio: 'Femi Akande, the clerk at the Sandpiper Kwik Pik, is studying engineering part-time. He opened a safe nobody had opened in fifty years, and asked Jay for a photo.' },
    daventry: { intro: 'd15_departures', bio: 'Captain Daventry flies Castellane\'s charter plane. He is also a Guest Services man with a gun, and says he can do either job.' },
    hob: { intro: 'd16_four_out_of_ten', bio: [
      'Hob Finnegan runs the Paloma Flying Club: chief instructor, only instructor, and cleaner. He gives every landing a mark out of ten.',
      'He gave Jay four, then agreed to teach him to fly.',
    ] },
  });

  // Later news about the people above, shown once the job is done.
  R.updates.push(
    { who: 'dash', after: 'd06_breaking_news', text: 'Dash always knew where to go because he was reading Milo\'s blog. Castellane is paying for his TV special.' },
    { who: 'milo', after: 'd06_breaking_news', text: 'Milo found out his blog was how Dash kept getting ahead, and was mortified.' },
    { who: 'ottoline', after: 'd07_champions_since_day_one', text: 'Her name is Ottoline Graves. She runs Castellane Guest Services, the polite people in teal who work for Leo Castellane.' },
    { who: 'toby', after: 'd08_thirty_four_years', text: 'Dess gave Toby the tin box for June\'s seventeenth birthday. He drove to the house, saw a car outside and left, and never delivered it.' },
    { who: 'milo', after: 'd08_thirty_four_years', text: [
      { if: 'dlc_blog_on', text: 'Milo kept the blog going, but now waits a day before posting anything.' },
      { if: 'dlc_blog_off', text: 'Milo took the blog down. He keeps the score on a sheet of card on his bedroom wall.' },
    ] },
    { who: 'pip', after: 'd09_minor_fault', text: 'June caught Pip in the shed and found out about the hunt. Pip had told her she had a summer job at the Speedway shop.' },
    { who: 'chet', after: 'd10_heritage_run', text: 'Chet admitted he has never driven over thirty, or sat in a race car with the engine running. Every racing scene of his career was a stunt double.' },
    { who: 'leo', after: 'd10_heritage_run', text: 'On the Speedway honours board, his father\'s name, R. CASTELLANE, has been painted over Dess Marlow\'s.' },
    { who: 'dash', after: 'd13_the_crusher', text: 'On Castellane\'s orders, Dash took the rally clock and June\'s carburettor from Ironside "for safekeeping".' },
    { who: 'chet', after: 'd14_decoy', text: [
      'Chet brought the film\'s replica Firecrest to Ironside so Jay could use it as a decoy.',
      { if: 'dlc_chet_told', text: 'Jay told him the truth about the race, and he started rewriting his scenes.' },
      { if: 'dlc_chet_kept', text: 'He asked if his film was true, and Jay told him to stay out of it.' },
    ] },
    { who: 'kit', after: 'd15_departures', text: 'At the airport Kit pointed Jay to Castellane\'s plane. She says Milo\'s blog is better than their show.' },
    { who: 'dash', after: 'd16_four_out_of_ten', text: 'After a flight locked in a plane toilet, Dash handed Jay the clock and the carburettor. He said it was a relief.' },
  );

  // The choices made in Acts 1 and 2.
  Object.assign(R.choices, {
    d08_thirty_four_years: [
      { title: 'Milo\'s blog', options: {
          dlc_blog_on: 'Jay told Milo to keep posting and let the others chase them. Milo now waits a day before he posts.',
          dlc_blog_off: 'Jay told Milo to go dark. Milo took the blog down and keeps the scoreboard on his bedroom wall.',
      } },
    ],
    d14_decoy: [
      { title: 'Telling Chet', options: {
          dlc_chet_told: 'Jay told Chet the truth: Dess won the race and the Castellanes stole it. Chet started rewriting his scenes.',
          dlc_chet_kept: 'Jay told Chet it was just a film and to stay out of it. Chet didn\'t believe him.',
      } },
    ],
  });
})();
