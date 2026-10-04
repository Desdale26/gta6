/*
 * data/story-act4.js — ACT 4: TIDEWATER (m25 to m31, the finale and all
 * three endings) and side chain 3, Dead Air (da1 to da4), for "Ten and Two".
 * See docs/STORY_BIBLE.md, sections 7 to 10, and docs/mission-format.md.
 *
 * The finale runs over one night: m28 (the gala) chains into m29 (the hit),
 * m30 (the siege, the crane, bay 14) and m31 (the pier at dawn, the choice,
 * the epilogues). Every chained mission ends with the heat at zero, or the
 * next one could not start.
 */
(function () {
  'use strict';
  const S = window.VH.Data.story; // created by story.js (loaded first)

  // ------------------------------------------------------------ colours
  const LULU_TEAL = 0x1f6f6a;
  const HALBERD = 0x3a3f45;
  const RUST = 0xc4561d;
  const MUSTARD = 0xc9a227;
  const PEARL = 0xf5f5f0;
  const CALDER_GREEN = 0x2f4a3a;

  // ------------------------------------------------------------ helpers
  /** Nana Lu's car, Jay's car for the whole game. */
  const lulu = (at, extra) => Object.assign({ spawnCar: 'lulu', type: 'lowrider', at, color: LULU_TEAL }, extra || {});
  /** A charcoal Halberd patrol Ironclad. */
  const halberdSuv = (id, at, extra) => Object.assign({ spawnCar: id, type: 'ironclad', at, color: HALBERD }, extra || {});
  /** A Halberd armoured van (a Bulwark), charcoal with the teal stripe. */
  const halberdVan = (id, at, extra) => Object.assign({ spawnCar: id, type: 'bulwark', at, color: HALBERD }, extra || {});
  /** Somebody behind the wheel of a spawned car, driving to a place. */
  const driver = (id, car, at, to, faction) => ({ id, faction: faction || 'halberd', hostile: false, at, behavior: 'drive', car, to });

  // Two spots the finale needs that no place id covers: the stretch of
  // Southshore Boulevard (z = 384) between Flamingo and Pelican where the
  // convoy is hit, and the north end of Cypress Parkway (x = -384), where
  // the city runs out.
  const SOUTHSHORE = { name: 'Southshore Boulevard', x: 240, z: 384, yaw: Math.PI / 2 };
  const CITY_LIMITS = { name: 'Cypress Parkway, northbound', x: -384, z: -360, yaw: Math.PI };

  // ---------------------------------------------- extra minor characters
  Object.assign(S.characters, {
    horne_robe: {
      name: 'Wade Horne', role: 'Captain, VPD Southside (at two in the morning)', age: 52,
      look: { skin: 0xd9a88a, hair: 0xc8c0b0, top: 0xeae6dc, bottom: 0xeae6dc, shoes: 0x7a5a44, build: 'heavy' },
      voice: { gender: 'male', pitch: 0.8, rate: 0.92 },
      bio: 'Horne at home: a white bathrobe monogrammed W.H., corduroy slippers, the gold watch, and a pump shotgun.',
    },
    lina: {
      name: 'Lina Solano', role: "Reggie Solano's daughter", age: 21,
      look: { skin: 0x6b3f28, hair: 0x14100e, top: 0x78b8e8, bottom: 0x2e3f5c, shoes: 0xefefef, build: 'slim', longHair: true, bag: true },
      voice: { gender: 'female', pitch: 1.15, rate: 1.05 },
      bio: 'Marine biology, third year. Believes a scholarship fund has been paying her rent since she was fifteen.',
    },
    ashby: {
      name: 'Corinne Ashby', role: 'Chief executive, Halberd Security', age: 49,
      look: { skin: 0xf1d0b0, hair: 0x2a1d14, top: 0x2a2e33, bottom: 0x2a2e33, shoes: 0x111111, build: 'slim', longHair: true },
      voice: { gender: 'female', pitch: 0.95, rate: 1.0 },
      bio: "Rourke's replacement. Shakes hands like she is signing something.",
    },
    mulgrew: {
      name: 'Captain Dale Mulgrew', role: 'VPD Southside (new)', age: 41,
      look: { skin: 0xe8c4a8, hair: 0x8a6a4a, top: 0x1c2a44, bottom: 0x1c2a44, shoes: 0x0e0e0e, build: 'average', hat: true },
      voice: { gender: 'male', pitch: 0.9, rate: 1.0 },
      bio: "Southside's new captain. Bought himself a gold watch the week he got the job.",
    },
    fisk: {
      name: 'Ogden Fisk', role: 'Halberd signals contractor', age: 44,
      look: { skin: 0xe0b08a, hair: 0x6e4a2c, top: 0x3a3f45, bottom: 0x2a2e33, shoes: 0x111111, build: 'heavy', hat: true },
      voice: { gender: 'male', pitch: 1.05, rate: 1.0 },
      bio: 'Hunts pirate transmitters for Halberd. Listens to Radio Free Vicehaven every night, strictly for work.',
    },
    hattie: {
      name: 'Hattie Brand', role: 'Night editor, the Vicehaven Ledger', age: 63,
      look: { skin: 0xf1c8a8, hair: 0xd8d4cc, top: 0x6b1f2a, bottom: 0x1c1c1f, shoes: 0x3a2a20, build: 'slim', longHair: true },
      voice: { gender: 'female', pitch: 0.9, rate: 1.05 },
      bio: 'Forty years on the night desk. Has never once been surprised, and would like it noted.',
    },
  });

  const act4 = [];

  // ===================================================================
  // m25 IRON
  // ===================================================================
  act4.push({
    id: 'm25_iron',
    act: 4,
    title: 'Iron',
    giver: 'rhea',
    start: 'kostas_salvage',
    time: 15,
    estMinutes: 10,
    summary: "Rhea's containers have a price: Halberd's checkpoint on Crane Row.",
    reward: { money: 8000, weapons: ['grenade'], armor: 100 },
    steps: [
      { music: 'off' },
      lulu('kostas_salvage'),
      { scene: { at: 'kostas_salvage', cast: ['rhea', 'kostya', 'deb'] }, say: [
        ['caption', '(Kostas Marine Salvage at three in the afternoon. The doors are rolled up on a cathedral of rust: anchors, propellers taller than a man, a lifeboat full of pigeons.)'],
        ['caption', "(Since Calloway Auto burned, this is the crew's kitchen, office and church. On Rhea's pallet desk, open at the last page, a battered notebook in Augie Vance's handwriting.)"],
        ['rhea', '(not looking up from her ledger, a pencil behind her ear) Augie used to come in here with a bottle and a speech. Twenty minutes of speech. The bottle was the apology for the speech.'],
        ['jay', "I didn't bring a bottle."],
        ['rhea', 'I can see that. (She turns his list round with one finger.) “Three containers. Southshore Boulevard. Twenty-three hundred, the eleventh. Four minutes.”'],
        ['rhea', "Four minutes of my cranes. On a public road. With the Port Authority's cameras on every gantry."],
        ['jay', 'Four minutes. Then you can have the road back.'],
        ['rhea', "You've been reading his notebook."],
        ['jay', 'Page forty-one. “Rhea. Never ask her for a favour. Offer a trade. Favours make her feel like family, and she hates it.”'],
        ['rhea', '(a long pause) He wrote that.'],
        ['jay', 'He also wrote that you cheat at cards.'],
        ['rhea', 'Only with him. He deserved it. (She closes the notebook, gently, and pushes it back across the pallet.) Fine. A trade.'],
        ['rhea', 'Halberd put a post on Crane Row in September. A boom gate, a portakabin, three of those charcoal tanks. Every docker in and out, they stop.'],
        ['rhea', 'They photograph faces. They open lunchboxes. They have a list of my people with little red dots on it, for the day the port is sold and nobody needs us.'],
        ['kostya', '(from the forks of a forklift, deeply wounded) They took my sandwich.'],
        ['rhea', "They took Kostya's sandwich."],
        ['kostya', 'Pastrami. My mother made it. They said it was a security risk.'],
        ['deb', 'It was a big sandwich.'],
        ['kostya', 'It was a NORMAL sandwich, Deb.'],
        ['rhea', "The post sees everything that comes off my quay. If it's standing on the eleventh, your three boxes are on Voss's desk before they touch the road."],
        ['rhea', 'Then they come here. Then I have a war in my warehouse instead of a warehouse.'],
        ['jay', 'So the post goes.'],
        ['rhea', "Today, while the light's good. That's the price."],
        ['jay', 'Done.'],
        ['rhea', "You didn't haggle. Augie haggled. It was the only fun I had all year."],
        ['jay', '(beat) Twenty per cent, Rhea, you old pirate.'],
        ['rhea', '(the corner of her mouth, barely) Too late. (She takes a claw hammer to a crate stencilled SS ANDROMEDA, PIRAEUS.)'],
        ['caption', '(Inside, packed in straw that smells of the sea floor: grenades. Old green ones, in rows, like a box of very bad eggs.)'],
        ['rhea', 'Stavros pulled these off a Greek freighter that went down off the breakwater in eighty-nine. Grenades. From a shipwreck. Mostly dry.'],
        ['jay', 'Mostly.'],
        ['rhea', "Throw them far. If one doesn't go off, don't go and look at it. Stavros went and looked at one once."],
        ['rhea', '(beat) He had very small eyebrows for the rest of that year.'],
        ['deb', 'Rhea says take Kostya.'],
        ['kostya', "Kostya says it's his day off."],
        ['deb', "It's Thursday."],
        ['kostya', "I'm taking it as a day off."],
        ['rhea', "Nobody goes with him. If a Salt is seen on Crane Row today, it's my war. If a Mercer is seen, it's his. (to Jay) I'll be in the cab of the blue crane. My cranes, my eyes."],
      ] },
      { reward: { weapons: ['grenade'] }, say: [
        ['caption', '(Jay fills his jacket pockets with shipwreck. He walks to the car very, very carefully.)'],
      ] },
      halberdSuv('post_suv_a', 'crane_row'),
      halberdSuv('post_suv_b', 'crane_row', { offset: [0, 9] }),
      halberdSuv('post_suv_c', 'crane_row', { offset: [0, -9] }),
      { spawn: [
        { id: 'post_rifle', faction: 'halberd', at: 'crane_row', count: 4, weapon: 'rifle', behavior: 'guard', group: 'post' },
        { id: 'post_smg', faction: 'halberd', at: 'crane_row', count: 2, weapon: 'smg', behavior: 'patrol', group: 'post', offset: [-10, 6] },
      ] },
      { phone: 'noor', objective: 'Drive to the fish market. Walk the rest of the way in.', say: [
        ['noor', 'Rhea says you have grenades. In your pockets. In the car. Loose.'],
        ['jay', "They're in my jacket."],
        ['noor', 'Your jacket is IN the car. You are in the car. I made a spreadsheet of grenade safety. It has one tab. The tab is called DON\'T.'],
        ['noor', "Okay. The post. Three Ironclads, one portakabin, six men with real guns. Two of them were soldiers somewhere. You can tell. They stand like furniture."],
        ['noor', 'Park at the fish market. Walk in through the stalls. Nobody ever looks at a man near fish.'],
        ['jay', "Who's on the clipboard?"],
        ['noor', '(a little too happy) Funny you should ask. They transferred Luis Garza to the docks in August. His file says “for his own safety”.'],
        ['jay', 'Lucky Garza.'],
        ['noor', 'I think they meant safety from you. I think his file is about you, honestly. There are a lot of exclamation marks.'],
      ] },
      { goto: 'fish_market', vehicle: true, objective: 'Park at the Saltmarsh fish market', say: [
        ['jay', '(to the car, taking a speed bump at a crawl) Easy. Easy. We have eggs in the back.'],
        ['rhea', "(over a Salts radio, crackling) I can see you from the cab, Mercer. You're driving like a hearse."],
        ['jay', "I'm driving like a man with forty-year-old grenades in his pocket."],
        ['rhea', "(over the radio) Stavros drove with them in the glovebox for a month. He said they kept the car honest."],
      ] },
      { goto: 'fish_market', vehicle: false, radius: 10, objective: 'Out of the car. On foot through the fish stalls.' },
      { music: 'tension' },
      { camera: 'crane_row', seconds: 5, say: [
        ['caption', '(Crane Row. A red-and-white boom gate across the quay road, a portakabin with a teal halberd on the door, three charcoal Ironclads parked nose to tail.)'],
        ['caption', '(A man with a clipboard and a sunburn is photographing a docker\'s lunchbox. He looks like he is having the worst year of his life. He is.)'],
      ] },
      { destroy: ['post_suv_a', 'post_suv_b', 'post_suv_c'], checkpoint: true, objective: 'Blow up the three Halberd SUVs at the post. Throw far.', say: [
        ['rhea', '(over the radio) Wind off the water. Throw a little left of where you think.'],
        ['rhea', "(over the radio) That's one. Kostya just cheered in the canteen. Kostya never cheers."],
        ['rhea', '(over the radio) Two. They are running in circles. Halberd trains them very hard to run in circles.'],
        ['rhea', '(over the radio) Three. Good. Now the men. They will be angry. Angry men shoot high.'],
      ] },
      { music: 'action' },
      { spawn: [{ char: 'garza', at: 'crane_row', offset: [6, -4], behavior: 'flee', flee: 14 }] },
      { kill: 'group:post', objective: 'Take out the Halberd post', say: [
        ['garza', '(sprinting past the fish stalls, clipboard over his head) Every time! EVERY TIME it is YOU!'],
        ['jay', 'Hi, Lucky.'],
        ['garza', "(fading into the distance) I asked for a DESK! I said I'd do NIGHTS!"],
        ['rhea', "(over the radio) Let him run. A man like that is more use to us telling the story than lying in it."],
      ] },
      { music: 'tension' },
      { phone: 'rhea', objective: 'Get back to Kostas Salvage. Halberd is going for the doors.', say: [
        ['rhea', 'Good. The post is gone. Now be quiet and listen.'],
        ['caption', '(Engines. Over the container stacks, from the direction of the Halberd depot: a lot of engines, going the wrong way. Not to the quay.)'],
        ['rhea', "Two vans out of the depot and they're not coming to Crane Row. They're coming to my door. They know who sold them the wind."],
        ['jay', "I'm coming."],
        ['rhea', "Of course you're coming. It's your fault."],
      ] },
      { timer: 90 },
      { goto: 'kostas_salvage', vehicle: true, objective: 'Get back to Kostas Salvage before Halberd does' },
      { join: ['rhea'], weapon: 'shotgun', say: [
        ['rhea', '(racking a long-barrelled pump shotgun) Stavros\'s. He shot gulls with it.'],
        ['jay', 'Everything Stavros owned, he shot gulls with.'],
        ['rhea', 'He hated gulls. He said they had the eyes of landlords. Hold the doors, Mercer.'],
      ] },
      { spawn: [
        { char: 'kostya', at: 'kostas_salvage', offset: [-4, 5], behavior: 'cower' },
        { char: 'deb', at: 'kostas_salvage', offset: [4, 6], behavior: 'cower' },
      ] },
      { survive: 90, checkpoint: true, objective: 'Hold the doors of Kostas Salvage with Rhea', waves: [
        { at: 'kostas_salvage', count: 3, weapon: 'smg', faction: 'halberd', delay: 2 },
        { at: 'container_maze', count: 3, weapon: 'rifle', faction: 'halberd', delay: 18 },
        { at: 'kostas_salvage', count: 4, weapon: 'smg', faction: 'halberd', delay: 38 },
        { at: 'fish_market', count: 3, weapon: 'rifle', faction: 'halberd', delay: 55 },
        { at: 'kostas_salvage', count: 3, weapon: 'shotgun', faction: 'halberd', delay: 70 },
      ], say: [
        ['deb', '(from behind a forklift) Kostya! Kostya, get DOWN!'],
        ['kostya', '(already down) I am the most down I have ever been, Deb!'],
        ['rhea', '(firing) Not my propellers! Those are bronze, you animals!'],
        ['rhea', "They brought a van with a ram on the front. To a salvage yard. Everything here is already broken. You can't threaten it."],
        ['rhea', '(reloading, calm as a kitchen) Augie never fired a shot in thirty years. I used to think he was a coward. I was wrong. He was just very, very organised.'],
        ['rhea', "That's the last of them. Listen. Hear that? That's the sound of the port being ours for an evening."],
      ] },
      { leave: ['rhea'] },
      { music: 'off' },
      { setTime: 19 },
      { scene: { at: 'quay_end', cast: ['rhea'] }, say: [
        ['caption', '(Sunset at the end of the quay. The freighter ESPERANZA rides high at her berth with her rail lights coming on. Behind them, the Halberd portakabin is still on fire, and nobody is in any hurry about it.)'],
        ['rhea', '(on a bollard, the shotgun across her knees like knitting) You held my door.'],
        ['jay', 'You held mine.'],
        ['rhea', "Don't make it a thing."],
        ['jay', '(sitting on the next bollard along) The boxes.'],
        ['rhea', 'Three. Southshore. Twenty-three hundred. Four minutes. (beat) Five, if you need five.'],
        ['jay', 'That sounds like a favour.'],
        ['rhea', "It's a discount. I give discounts to people who blow things up on my behalf. It's in the ledger."],
        ['jay', 'Why do you do it? Really. You could sell him the port tomorrow. Retire somewhere with a dry bed.'],
        ['rhea', 'Sentiment is for people with dry feet, Mercer.'],
        ['jay', 'Your feet look pretty dry.'],
        ['rhea', "They're wet on the inside. (She takes a folded envelope out of the old watch cap in her pocket. Stavros's cap.)"],
        ['caption', '(A cheque, soft as cloth from nine years of folding. VOSS MERIDIAN PORT SERVICES. One hundred and eighty thousand dollars. In full and final settlement.)'],
        ['rhea', 'Number four crane. Bad sling, bad inspection, bad Tuesday. They paid inside a week. Very fast. Very sorry.'],
        ['jay', 'You never cashed it.'],
        ['rhea', "If I cash it, it's a price. If I keep it, it's a debt. I prefer him owing me."],
        ['rhea', '(folding it back along its old lines) Everyone in this port has sold something, Mercer. Me too.'],
        ['jay', 'What did you sell?'],
        ['rhea', '(a long time looking at the water) A name. An inspector who was going to fail number four. Voss\'s people asked me who he was. I wanted a quiet year. I told them.'],
        ['rhea', 'They moved him to the airport. Number four passed. (beat) Three months later it came down on my husband.'],
        ['caption', "(She doesn't say anything else about it. She doesn't have to.)"],
        ['jay', '(after a while) Augie knew?'],
        ['rhea', 'Augie knew everything about everybody. He never once used it. That was what was wrong with him. (beat) That was what was right with him.'],
        ['rhea', "(standing, knees cracking like a deck in the cold) When this is over I'm cashing it. I'm buying a crane. I'm calling it Stavros, and I'm painting it pink so he hates it."],
        ['jay', 'He shot gulls with everything else.'],
        ['rhea', "(the closest she has ever come to a laugh in front of him) He'd have shot the crane."],
      ] },
    ],
  });

  // ===================================================================
  // m26 GOLD WATCH
  // ===================================================================
  act4.push({
    id: 'm26_gold_watch',
    act: 4,
    title: 'Gold Watch',
    giver: 'noor',
    start: 'horne_house',
    time: 2,
    estMinutes: 10,
    summary: "Jay steals the police captain's phone, and then the police captain's car.",
    reward: { money: 5000 },
    failIf: ['dead:horne_robe', 'wrecked:horne_cruiser'],
    steps: [
      { music: 'tension' },
      { spawnCar: 'horne_cruiser', type: 'interceptor', at: 'horne_house', exact: true, offset: [3, 3], police: true },
      { spawn: [
        { id: 'door_cop', faction: 'vpd', at: 'horne_house', weapon: 'pistol', behavior: 'guard', group: 'garden', offset: [-5, -6] },
      ] },
      { camera: 'horne_house', seconds: 5, say: [
        ['caption', '(Crestline. Four minutes past two in the morning.)'],
        ['caption', "(Captain Wade Horne's too-nice house: a flagpole with the flag still up in the dark, a boat on a trailer that has never touched water, and in the drive, his own VPD cruiser.)"],
      ] },
      { if: 'trusted_calder', then: [
        { phone: 'calder', say: [
          ['calder', "You're outside his house."],
          ['jay', 'You said two.'],
          ['calder', 'I said “hypothetically, around two.” I was very clear about the hypothetically. (beat) Okay. Listen.'],
          ['calder', 'Horne has a second phone. Not department. Cheap, black, prepaid. He calls Voss on it. He called his informant on it.'],
          ['calder', "I need it for a warrant. I can't get a warrant without it, and I can't touch it without a warrant."],
          ['calder', "That's the law. The law is a snake eating its own tail and calling it lunch."],
          ['jay', 'So you need a raccoon.'],
          ['calder', "Legally, you're a raccoon who found a phone. Raccoons don't need warrants. Raccoons have hands."],
          ['calder', 'One Southside uniform on overtime by the side door. Motion lights on the lawn. Stay out of the light and keep the boat between you and the house.'],
        ] },
        { if: 'dex_to_calder', then: [
          { phone: 'calder', say: [
            ['calder', "And Mercer. Your friend's statement says glovebox. Not the console. Glovebox."],
            ['calder', 'He was very specific. He was specific about everything. He cried for an hour, and then he drew me a map of the inside of that car from memory.'],
            ['jay', '(a long beat) He would.'],
          ] },
        ] },
      ], else: [
        { phone: 'noor', say: [
          ['noor', "Okay. I'm in the Southside duty roster, which is protected by a password that is literally the word password. With a capital P. For security."],
          ['noor', 'One uniform on the side door, on overtime. Motion lights on the lawn. And the captain, who goes to bed at eleven in a sleep mask that says DO NOT DISTURB.'],
          ['noor', 'I know about the mask because he bought it with a department card. It was nineteen ninety-nine. The mask, not the year.'],
          ['noor', "The phone. Prepaid, black, cheap. If the convoy plan exists anywhere it's in that phone, because men like Horne don't trust email. They think email is for wives."],
          ['jay', 'Where does he keep it?'],
          ['noor', "In the car, somewhere. That's all I've got. Nobody writes down where they hide things. That's the whole point of hiding things."],
        ] },
        { if: 'dex_to_calder', then: [
          { text: 'calder', message: "Your friend's statement says glovebox. Not the console. I'm not asking what you're doing tonight. I'm asleep. I'm extremely asleep." },
        ] },
      ] },
      { if: 'dex_banished', then: [
        { text: 'dex', message: "Glovebox, not the console. I owe you more than that. Don't answer." },
        { say: [['caption', "(He reads it twice. Somewhere north of here, on a road with snow on the verges, Dex is awake at two in the morning too. Jay doesn't answer.)"]] },
      ] },
      { if: 'dex_forgiven', then: [
        { spawn: [{ char: 'dex', at: 'horne_cruiser', offset: [1.6, -1.2], behavior: 'idle' }] },
      ] },
      { goto: 'horne_cruiser', vehicle: false, radius: 2.6, checkpoint: true, objective: "Stay out of the light. Get to the cruiser in Horne's drive.", say: [
        ['caption', "(The lawn is cut to the length of a regulation. The motion lights sit in the hedges like dogs that haven't decided yet.)"],
        ['jay', '(barely a breath, to himself) Behind the boat. Behind the boat.'],
        ['caption', '(The boat on the trailer is called WADE IN. Its hull is spotless. There are still stickers on the outboard.)'],
        ['caption', '(By the side door, a Southside officer on overtime eats crisps out of the bag and watches a game on his phone with the sound off.)'],
      ] },
      { if: 'dex_forgiven', then: [
        { scene: { at: 'horne_cruiser', cast: ['dex'] }, say: [
          ['caption', "(Crouched against the cruiser's back wheel in navy coveralls, reading glasses on their cord, a slim jim in his fist like a sword: Dex Calloway.)"],
          ['dex', '(whispering) Hey.'],
          ['jay', '(whispering) I told you to stay with Birdie.'],
          ['dex', "Birdie's asleep at Lourdes's. Lourdes is asleep on Birdie. Nobody in that apartment is waking up before Christmas."],
          ['dex', "(looking up at the cruiser, at the lightbar, at all of it) Of all the cars in this city. Of all the cars, Jay."],
          ['jay', "It's a car."],
          ['dex', "It's HIS car. I sat in the passenger seat of this car once a month for four years. He used to give me butterscotch. Like I was a kid at the bank."],
          ['dex', '(He pops the lock with the slim jim in one movement, the way he has a thousand times. Then his hands start to shake.) Glovebox. Not the console. He keeps the console for show.'],
          ['jay', '(quietly) Breathe.'],
          ['dex', "I'm breathing. I'm a world-class breather. (beat) Get the phone, Jay. I can't put my hand in there. I'll be sick on his upholstery."],
        ] },
        { join: ['dex'], weapon: 'pistol' },
      ] },
      { wait: 4, objective: "Glovebox. Find the second phone. Quietly.", say: [
        ['caption', '(Under the registration, a tyre gauge and a bag of butterscotch: a cheap black phone with a cracked corner.)'],
        ['caption', '(It lights up in his hand. The lock screen is a photograph of a gold watch.)'],
      ] },
      { music: 'action' },
      { spawn: [{ char: 'horne_robe', at: 'horne_house', offset: [-7, 3], weapon: 'shotgun', behavior: 'attack', health: 3000, accuracy: 0.18 }] },
      { getIn: 'horne_cruiser', checkpoint: true, objective: "Horne's awake. Take his cruiser. GO.", say: [
        ['caption', '(Every motion light on the lawn comes on at once. The front door bangs open on a big man in a white bathrobe, monogrammed W.H., with a pump shotgun.)'],
        ['horne_robe', 'MERCER!'],
        ['horne_robe', "(firing into the night, mostly at his own hedge) That's MY CAR! That's a POLICE VEHICLE, you piece of—"],
        ['horne_robe', '(the slippers losing their grip on the wet lawn) Get out of my CAR!'],
      ] },
      { if: 'dex_forgiven', then: [{ join: ['dex'], weapon: 'pistol' }] },
      { heat: 3, say: [
        ['DISPATCH', 'All Southside units. Captain Horne reports his vehicle stolen from his residence. Suspect is... (a pause) Suspect is described as, quote, an asshole. End quote.'],
        ['DISPATCH', '(off the mic, not quite) Who wrote that down? Did you write that down? Okay. All units respond.'],
      ] },
      { loseHeat: true, objective: 'Lose Southside. In their own captain\'s car.', say: [
        ['jay', '(to the cruiser, flicking switches until the siren screams) Sorry. Sorry. Which one is the... okay. That one.'],
        ['DISPATCH', 'Unit four, the stolen vehicle is running lights and siren. Repeat, the suspect has turned the siren ON.'],
        ['jay', '(to the cruiser, taking a red at seventy with traffic pulling politely out of his way) Oh. Oh, they move. They just move for you.'],
      ] },
      { if: 'dex_forgiven', then: [
        { say: [
          ['dex', "(in the passenger seat, gripping the dash) You're enjoying this. I can see it in your neck."],
          ['jay', "I'm not enjoying it."],
          ['dex', "(after a while, staring at the radio with Horne's call sign taped above it) Four years I sat here. You know what he talked about? His boat. Every month. The boat he never takes out."],
          ['dex', "And I'd say, sounds great, Captain. And I'd take the envelope. (beat) I'd eat the butterscotch, Jay. Every time. I'm a grown man."],
          ['jay', '(eyes on the road) Throw them out the window.'],
          ['caption', "(Dex winds down the window and throws the bag of butterscotch into the night at sixty miles an hour. For a second, they're both kids.)"],
        ] },
      ], else: [
        { say: [
          ['jay', "(to the empty passenger seat, out of habit) Seatbelt."],
          ['caption', "(Nobody there. Taped above the radio, in Horne's handwriting: 1-ADAM-9. The unit on the dashcam tape. The car that was in bay fourteen.)"],
          ['jay', '(very quietly, to the car) Were you there? (beat) You were there.'],
        ] },
      ] },
      { music: 'triumph' },
      { goto: 'civic_plaza', vehicle: 'horne_cruiser', objective: 'Park the captain\'s cruiser under the Beacon. Leave the lights on.', say: [
        ['jay', '(slowing, then all the way down to walking pace across the plaza, the lightbar turning) Easy. Easy. You did nothing wrong. He did.'],
      ] },
      { goto: 'civic_plaza', vehicle: false, radius: 9, objective: 'Get out. Leave it running.', say: [
        ['caption', "(From his jacket, Jay takes a yellow slip he has carried since the day he came home: Nana Lu's parking ticket. Cemetery car park. Unpaid, on principle.)"],
        ['caption', '(He tucks it under the cruiser\'s wiper. “The dead don\'t charge,” she said. “So why should the city?”)'],
      ] },
      { camera: 'civic_plaza', seconds: 7, say: [
        ['caption', "(Civic Plaza at three in the morning. Under the golden Beacon, Captain Wade Horne's cruiser sits with its engine running and its lights going round: blue, red, blue, on the gold.)"],
        ['caption', '(The pigeons are not impressed. Somebody on a balcony on Lantern Street starts filming.)'],
      ] },
      { if: 'dex_forgiven', then: [
        { leave: ['dex'], say: [
          ['dex', "I'll get a cab. (beat) I've never been in a cab. I'm a mechanic. We don't pay people to drive us. It's a principle."],
          ['jay', 'Get a cab, Dex.'],
          ['dex', '(walking backwards across the plaza, grinning for the first time in weeks) Lights on! You left the lights ON!'],
        ] },
      ] },
      { music: 'off' },
      { if: 'trusted_calder', then: [
        { goto: 'vpd_central', objective: "Take the phone to Calder at Central's back gate", say: [
          ['calder', "(on the phone) I'm at the back gate. Under the camera that doesn't work. They've been meaning to fix it since the Olympics."],
        ] },
        { scene: { at: 'vpd_central', cast: ['calder'] }, say: [
          ['caption', "(The back gate of VPD Central. A strip of car park, a bin store, and a camera that has been pointing at a wall since before the Olympics.)"],
          ['calder', '(holding out an evidence bag for the phone, not touching it) Drop it in. Raccoon.'],
          ['caption', "(He drops it in. She seals it, signs the strip, and looks at the photograph of the gold watch on the screen through the plastic.)"],
          ['calder', "His PIN's going to be something stupid. They always are. (She tries. Twice.) His birthday. No. His badge number. No."],
          ['jay', '(quietly) Zero two one one.'],
          ['caption', '(She looks at him. Then she types it. The phone opens.)'],
          ['calder', '(after a long time) Two-eleven. Bay fourteen. He made it his PIN.'],
          ['calder', "(scrolling, her jaw working) Here. Three days ago. From a contact saved as “H.V.”: “Gala the eleventh. Book and freight leave Belvedere 23:00. Three cars. You lead. Esperanza sails at first light.”"],
          ['calder', "Three Halberd armoured vans. Horne in front, escorting. Down Crestline, through Palm Crescent, along Southshore to the docks. The freighter at Crane Row. The Esperanza."],
          ['jay', 'Esperanza.'],
          ['calder', "It means hope. He's put his book and his exit money on a boat called Hope. Registered in Panama, owned by a fund in Luxembourg, owned by a fund owned by a man in a white suit."],
          ['calder', '(scrolling) Voss rides separately. White Sovereign. He never travels with his money. Too many photographers.'],
          ['jay', 'How much money?'],
          ['calder', "Every bribe he's still got to pay, and every bribe he'll need wherever he goes next. Thirty million, give or take a councilman."],
          ['calder', '(She finds one more message, and goes still.) And this. From H.V., after the vote: a photograph of a commissioner\'s badge. No words. He didn\'t need words.'],
          ['calder', "I can't use any of this. A judge would laugh me out of the building. Stolen phone, no warrant, a raccoon. But now I know where to be."],
          ['jay', 'Where?'],
          ['calder', "Wherever he is when it falls apart. (She puts the bag in her blazer.) Don't tell me the plan, Mercer. If I know the plan, I'm in it."],
          ['calder', '(walking away, then turning back) The cruiser under the Beacon. With the lights on.'],
          ['jay', 'I thought it needed some light.'],
          ['calder', "(not quite managing not to smile) I'm going to watch the morning news tomorrow like it's the Super Bowl."],
        ] },
      ], else: [
        { goto: 'last_resort_bar', objective: 'Take the phone to Noor at the Last Resort', say: [
          ['noor', "(on the phone) I'm at the Last Resort. Under the flamingo. Ansel's here. Ansel brought soup. It's three in the morning. Why does Ansel have soup at three in the morning?"],
          ['ansel', "(faintly, in the background) Because it's three in the morning, Noor."],
        ] },
        { scene: { at: 'last_resort_bar', cast: ['noor', 'ansel'] }, say: [
          ['caption', '(The Last Resort, closed. The neon flamingo buzzes like a wasp over an empty patio, three chairs, a laptop and a thermos.)'],
          ['noor', '(taking the phone with two pens, like tongs) Is it warm? Why is it warm? Has it been in your armpit?'],
          ['jay', 'Jacket.'],
          ['noor', "(plugging it into the laptop) Okay. It's locked. Of course it's locked. Four digits. His badge, his birthday, his boat's registration—"],
          ['jay', '(quietly) Try zero two one one.'],
          ['caption', '(She looks at him. She types it. The phone opens. Nobody says anything for a while.)'],
          ['ansel', "(very softly) He made it his PIN."],
          ['noor', "(scrolling, her voice gone small and careful) “H.V.” Three days ago. “Gala the eleventh. Book and freight leave Belvedere 23:00. Three cars. You lead. Esperanza sails at first light.”"],
          ['noor', "Three Halberd vans. Horne in front. Down Crestline, through Palm Crescent, along Southshore to the docks. And a freighter at Crane Row called the Esperanza."],
          ['noor', "(typing) Registered in Panama. Owned by a fund in Luxembourg. Owned by a fund that is owned by a fund that is owned by a man in a white suit."],
          ['ansel', 'Esperanza. It means hope.'],
          ['noor', "He named his getaway boat Hope. I hate him so much I'm going to need a bigger spreadsheet."],
          ['noor', "Voss rides separately. White Sovereign. He never travels with the money. He's a very careful man."],
          ['jay', 'How much money?'],
          ['noor', "(a pause while she does it properly) Thirty million. Give or take. Fourteen years of paying people to look away, and here's the bill for leaving."],
          ['noor', "(scrolling) And this. From H.V. A photo of a commissioner's badge. No words. (beat) Horne's not doing this for money. He's doing it for a hat."],
          ['ansel', '(setting down a cup of soup in front of Jay, who has not asked for it) Eat.'],
          ['jay', "I'm not hungry."],
          ['ansel', "It's not for hunger. It's for the next forty-eight hours. Soup is a plan."],
          ['noor', '(not looking up) The cruiser. Under the Beacon. With the lights on. It\'s on six live streams already. Somebody has set it to music.'],
          ['jay', 'Is it good music?'],
          ['noor', "(finally laughing, helplessly, the laptop shaking on her knees) It's SO good, Jay."],
        ] },
      ] },
    ],
  });

  // ===================================================================
  // m27 THE NIGHT BEFORE
  // ===================================================================
  act4.push({
    id: 'm27_the_night_before',
    act: 4,
    title: 'The Night Before',
    giver: 'ansel',
    start: 'harbor_beach',
    time: 20,
    estMinutes: 9,
    summary: 'The night before the job: a bonfire, a driving lesson, a race for the ouzo, and three doors to knock on.',
    failIf: ['wrecked:lulu'],
    steps: [
      { music: 'hope' },
      lulu('harbor_beach'),
      { scene: { at: 'harbor_beach', cast: ['ansel', 'noor', 'rhea'] }, say: [
        ['caption', '(Harbor Beach, eight at night. A bonfire in a ring of stones under the seawall, driftwood popping, the pier lights out on the water. Two fires down, kids with a speaker are playing Sunset Drive too loud.)'],
        ['caption', '(Ansel has brought folding chairs that nobody sits in. Noor has brought a laptop she has sworn not to open. Rhea has brought a bottle with no label.)'],
        ['rhea', '(pouring into paper cups) Ouzo. My grandmother made it in a bathtub on Kos.'],
        ['noor', '(sniffing) It smells like a bathtub.'],
        ['rhea', "It tastes like the bathtub. It's a family recipe. The family is the bathtub."],
        ['ansel', '(sipping, then going very still for a moment) That is... a great deal of aniseed.'],
        ['rhea', 'It strips paint. Stavros did the boat with it.'],
        ['jay', '(drinking, eyes watering) Wow.'],
        ['rhea', 'Wow is correct.'],
        ['noor', 'Can I say the plan one more time? Out loud? Just once? I find it calming.'],
        ['ansel', 'No.'],
        ['rhea', 'No.'],
        ['jay', 'No.'],
        ['noor', "(to the fire, wounded) Fine. I'll say it in my head. (Her lips move.)"],
        ['ansel', '(standing, unfolding a square of paper from his breast pocket, next to the seed packet) I wrote something. For the garden. And the people in it.'],
        ['noor', 'You read poems to plants.'],
        ['ansel', "The plants have been very supportive. It's time I tried a harder room."],
        ['ansel', "(reading it plainly, the way you'd read a shopping list you loved) “The tomatoes don't know whose fence they're on. The lemon doesn't ask who planted it.”"],
        ['ansel', '“Things grow where somebody knelt down. The ground keeps a list of everyone who knelt there.”'],
        ['ansel', "“It isn't a long list. I checked. You're all on it.”"],
        ['caption', '(Nobody says anything. Rhea looks at the fire very hard. Noor makes a small noise she will deny until she dies.)'],
        ['rhea', '(finally) Terrible. Read it again.'],
        ['jay', "Who's it really for?"],
        ['ansel', '(sitting, folding the paper back along its creases) There is a girl at the university. Lina Solano. Marine biology. Twenty-one.'],
        ['ansel', "Her father was Reggie Solano. Light heavyweight. A good chin. I hit him in the eleventh round, a long time ago. A legal punch. He didn't get up."],
        ['ansel', 'Every month since she was fifteen she gets a cheque from the Harbor Point Scholarship Fund. She sends thank-you letters to a post-office box.'],
        ['ansel', "(beat) There is no fund. There's a box. And me."],
        ['noor', '(very quietly) Ansel.'],
        ['ansel', 'She studies coral. Coral is the slowest thing alive. A hundred years to build a wall a metre high. (beat) I like that she likes it.'],
        ['rhea', 'Does she know?'],
        ['ansel', 'No. If she knew, it would be a different kind of money.'],
      ] },
      { if: 'saved_teo', then: [
        { scene: { at: 'harbor_beach', cast: ['teo', 'ansel', 'noor', 'rhea'] }, say: [
          ['caption', "(Teo comes down the seawall steps late: red bomber, gold sneakers, paint on his knuckles, and Augie's watch on his wrist, too big for him, the strap on its last hole.)"],
          ['teo', 'You started without me.'],
          ['rhea', "We started without everybody. It's a bonfire. Not a wedding."],
          ['teo', '(taking a cup, sniffing it, recoiling) What is this?'],
          ['rhea', 'Heritage.'],
          ['teo', "(holding his wrist up to the fire so the watch catches the light) To the old man. Who'd have made a twenty-minute speech about how this is a terrible plan."],
          ['teo', 'And then helped anyway. And complained the whole time. And cheated Birdie at cards.'],
          ['jay', 'She cheated him.'],
          ['teo', "She cheated him. (He looks at the watch.) It still keeps time. Doesn't lose a second. He used to say it was the only thing in the family that ever did."],
          ['teo', "(to Jay, lower) Tomorrow I've got forty Kings and a truck full of fireworks on the other side of town. You want half of Halberd looking the wrong way? They'll look the wrong way."],
          ['jay', 'Teo.'],
          ['teo', "Don't make it weird. It's a diversion, not a hug."],
        ] },
      ], else: [
        { text: 'teo', message: "Heard there's a fire. Not coming. Noor says Rourke's phone kills a van engine tomorrow. The phone you picked. Good. Make it worth it." },
        { say: [['caption', "(Jay reads it twice and puts the phone face down in the sand. Ansel sees, and says nothing, and refills his cup.)"]] },
      ] },
      { if: 'dex_forgiven', then: [
        { scene: { at: 'harbor_beach', cast: ['dex', 'birdie'] }, say: [
          ['caption', "(Birdie is asleep on Ansel's coat on the sand with a spark plug in her fist. Dex sits a little way off from the fire, not in the circle and not out of it, cleaning the same spanner he has been cleaning for twenty minutes.)"],
          ['dex', "(low, as Jay sits down next to him) I'm not at the fire. I'm near the fire. There's a difference."],
          ['jay', 'Come and sit at the fire, Dex.'],
          ['dex', "Ansel looks at me like I'm a plant that might not make it."],
          ['jay', "That's how he looks at everybody."],
          ['dex', "(beat) Tomorrow. The second car. I'll be there. I'll be where you need me. I'll be early. (beat) I'm never early. I'll be early."],
          ['jay', 'I know.'],
          ['birdie', '(asleep, mumbling into the coat) A week is seven days...'],
          ['dex', "(a laugh that turns into something else halfway) She still says that. In her sleep. She's still counting."],
        ] },
      ] },
      { if: 'dex_banished', then: [
        { phone: 'birdie', say: [
          ['birdie', "Daddy let me use his phone. He's inside the gas station buying the bad coffee."],
          ['birdie', "We're somewhere with snow. I'm not allowed to say where. It's very cold and everybody's polite."],
          ['jay', 'Are you okay, Birdie?'],
          ['birdie', 'Daddy cries in the car when he thinks I\'m asleep. So I pretend I\'m asleep. So he can.'],
          ['birdie', "Is it tomorrow? The thing? Daddy said there's a thing tomorrow and he's not allowed to help."],
          ['jay', "It's tomorrow."],
          ['birdie', "Be careful. (beat) A week is seven days. You've been there like forty-five. I checked."],
        ] },
      ] },
      { scene: { at: 'harbor_beach', cast: ['noor', 'ansel', 'rhea'] }, say: [
        ['rhea', "(to Noor, refilling her cup without asking) You. You'll get your pharmacy whether you come tomorrow or not. The money doesn't care. Why come?"],
        ['noor', "Because I was right. About SmartFlow, about Voss, about all of it. And nobody believed me. And being right on your own is just being lonely with evidence."],
        ['noor', "And because Augie looked at my spreadsheets like they were paintings. And Ansel brings soup to things. And Jay says seatbelt like it's a whole sentence."],
        ['noor', "(louder, to the fire, the ouzo talking) Because you're my family, okay?"],
        ['caption', '(Silence. The fire pops. Two fires down, the kids change the song.)'],
        ['noor', '(mortified) Nobody heard that. That was the bathtub. Ansel, you did not hear that.'],
        ['ansel', "I didn't hear anything. I'm a plant."],
        ['rhea', "I heard it. I'm going to put it on a sign over the door."],
        ['jay', '(looking at the fire, smiling, not hiding it fast enough) Seatbelt.'],
        ['noor', "(throwing a paper cup at him) THAT'S NOT A WHOLE SENTENCE."],
      ] },
      { if: 'foxes_done', then: [
        { say: [
          ['noor', '(squinting at his feet) Why are you wearing church shoes on a beach?'],
          ['jay', "Walt's funeral. Saturday. Lefty said wear the good shoes."],
          ['noor', "That was two days ago."],
          ['jay', "(looking at them) I haven't taken them off."],
        ] },
      ] },
      { blackout: [
        ['caption', '(The beach car park, later. Empty, except for Lulu under one sodium light, and a lot of white lines nobody has to stay inside.)'],
        ['caption', "(Noor Haddad is in the driver's seat of a thirty-year-old land-yacht, holding the wheel at a quarter to three like it owes her rent.)"],
        ['noor', 'I want it on record that this was not my idea.'],
        ['jay', 'It was your idea.'],
        ['noor', "It was my idea in a moment of ouzo. Ouzo ideas aren't legally binding."],
        ['jay', 'Hands at ten and two.'],
        ['noor', '(moving them) Ten. Two. Like a clock. Why is it like a clock?'],
        ['jay', 'Because somebody very old said so. (beat) Heart at twelve.'],
        ['noor', '(looking down at herself) What\'s at twelve?'],
        ['jay', '(a long beat; he can hear exactly how she said it) Wherever you\'re going.'],
        ['caption', '(Noor looks at him. Then at the windscreen, and the dark, and the long white lines.)'],
        ['noor', 'Okay. Okay. Wherever I\'m going. (beat) Which pedal is wherever I\'m going?'],
        ['jay', 'The right one. Gently.'],
        ['caption', "(Lulu moves. Eleven kilometres an hour. Then fourteen. A whole lap of the car park, and Noor doesn't breathe once.)"],
        ['noor', "I'm driving. I'm DRIVING. ANSEL! I'M DRIVING!"],
        ['ansel', '(from the beach, a long way off) You\'re in first gear, Noor!'],
        ['noor', "(laughing and crying at the same time) I'm in first gear and I'm DRIVING!"],
        ['jay', '(quietly, to the car) Easy, Lulu. Easy. She\'s new.'],
        ['caption', "(She stalls it at the exit. She doesn't care. Neither does he.)"],
      ] },
      { getIn: 'lulu', objective: 'Get back in Lulu. Somebody has challenged you for the ouzo.' },
      { if: 'saved_teo', then: [
        { say: [
          ['teo', "(leaning out of a candy-red lowrider, revving it so the whole car shrugs) Old man's car against mine. Seawall to the Last Resort to Meridian. Loser buys Rhea's bathtub."],
          ['jay', "That's not a prize, that's a punishment."],
          ['teo', "That's why it's for the loser. Don't make it weird. Just lose."],
        ] },
        { race: { checkpoints: ['harbor_point', 'last_resort_bar', 'meridian_boulevard'], mustWin: false, rivals: [{ char: 'teo', car: 'lowrider', color: 0xb3202a, skill: 0.95 }] }, objective: 'Race Teo for the ouzo', say: [
          ['teo', '(over the open windows, side by side) Two land-yachts! This is the slowest race in the history of Vicehaven!'],
          ['jay', '(to Lulu) Come on. Come on, old girl. Show him where he got it from.'],
        ] },
        { say: [
          ['teo', "(at the finish, both cars ticking, both drivers laughing like idiots) Okay. Okay. Somebody owes Rhea a bottle. I'm not saying who."],
          ['jay', "It's you."],
          ['teo', "(tapping his father's watch) Check the time, brother. It's always me."],
        ] },
      ], else: [
        { say: [
          ['ansel', '(leaning out of a Salts box truck that Rhea has lent him, very solemn) Seawall to the Last Resort to Meridian. Loser buys the ouzo.'],
          ['jay', "You're in a truck."],
          ['ansel', "I'm in a truck that has never lost a race. Because it has never been in one. It's undefeated."],
        ] },
        { race: { checkpoints: ['harbor_point', 'last_resort_bar', 'meridian_boulevard'], mustWin: false, rivals: [{ char: 'ansel', car: 'hauler', color: RUST, skill: 1.0 }] }, objective: 'Race Ansel for the ouzo', say: [
          ['ansel', '(over the open window, at a stately pace, entirely serene) Most races end when you stand up.'],
          ['jay', "That's fights!"],
          ['ansel', "I'm finding out it's both."],
        ] },
        { say: [
          ['ansel', "(at the finish, the truck's brakes hissing like a disappointed cat) Somebody owes Rhea a bottle. I won't say who. I'm a gentleman."],
          ['jay', "It's you."],
          ['ansel', "(smiling) I'll buy it. I like to buy things for people who'll hate them."],
        ] },
      ] },
      { setTime: 21.5 },
      { if: 'trusted_calder', then: [
        { text: 'calder', message: "Tomorrow night I'll be where I need to be. Don't tell me where that is until it is. Get some sleep. That's not police advice. It's from someone who never did." },
      ], else: [
        { say: [
          ['caption', '(At the seawall overlook, under the one dead street lamp, a dark green unmarked car is parked facing the bay. A woman with an empty coffee cup lifts two fingers off the steering wheel as Lulu passes.)'],
        ] },
        { text: 'calder', message: "I'm not following you. I'm parked. There's a difference. Whatever it is tomorrow, I'm not in it. Make it something I'd sign." },
      ] },
      { if: 'iggy_done', then: [
        { text: 'iggy', message: "Tasha says you've got something big tomorrow. Constance is polished. If you need a car nobody would ever suspect, she has done three thousand weddings and never once been pulled over." },
      ] },
      { goto: 'casa_palma', vehicle: 'lulu', objective: 'Go to Casa Palma. Lourdes is up. Lourdes is always up.', say: [
        ['jay', '(to the car, on the long straight down Laurel, alone again) Three doors. Then sleep. Three doors.'],
        ['caption', "(He goes the long way. He doesn't notice he's doing it until he's done it.)"],
      ] },
      { if: 'dex_to_calder', then: [
        { spawn: [{ char: 'birdie', at: 'casa_palma', offset: [2, 1], behavior: 'idle' }] },
      ] },
      { if: 'gave_cut', then: [
        { scene: { at: 'casa_palma', cast: ['lourdes'] }, say: [
          ['caption', "(The Casa Palma courtyard. The dry fountain, the cats, and three storeys up, Tommy Reyes in his yellow hoodie, painted, laughing at something just past the edge of the wall.)"],
          ['lourdes', '(on the bench with a saucer of milk and four cats who are pretending they are not together) I knew it was you. You park like your grandmother. Like the kerb is a suggestion.'],
          ['jay', "I can't stay."],
          ['lourdes', "Nobody ever can. Sit for one minute. One. I'll time you. I'm very good at minutes."],
          ['caption', '(She goes up the stairs, slowly, on the bad knee. She comes down slower. She is carrying something yellow folded over her arm.)'],
          ['lourdes', "(holding it out) I've washed it four times. It still smells like him. I don't know how. Boys are a mystery."],
          ['caption', "(Tommy's yellow hoodie. A hole in one cuff where his thumb went through.)"],
          ['jay', '(not taking it) Lourdes. I can\'t.'],
          ['lourdes', "You left forty thousand dollars in my mailbox in a dirty rag. You can take a hoodie."],
          ['lourdes', "He'd want it driven somewhere nice. (She puts it in his hands and folds his fingers round it.) Not tomorrow. After. Somewhere with a view."],
          ['jay', '(holding it, his voice almost gone) Somewhere nice.'],
          ['lourdes', "(patting his face, the way she did at the funeral) There. That's a minute. Go to bed, mijo. Go and do your stupid thing."],
        ] },
      ], else: [
        { scene: { at: 'casa_palma', cast: ['lourdes'] }, say: [
          ['caption', "(The Casa Palma courtyard. The dry fountain, the cats, and three storeys up, Tommy Reyes in his yellow hoodie, painted, laughing at something just past the edge of the wall.)"],
          ['lourdes', '(on the bench with a saucer of milk and four cats) I knew it was you. You park like your grandmother.'],
          ['jay', '(taking a folded envelope out of his jacket and holding it out) This is for you.'],
          ['lourdes', '(not taking it) What is it?'],
          ['jay', "The deed. Nana's house. It's paid off. It's... I paid it off with the toolbox money. Tommy's money. It should be yours."],
          ['caption', "(Lourdes looks at the envelope for a long time. Then at him. Then up at the wall, at her son, laughing.)"],
          ['lourdes', 'Keep it.'],
          ['jay', 'Lourdes—'],
          ['lourdes', "I don't want a house, Jay. I have a house. I have cats and a bad knee and a daughter who works nights. I don't want your grandmother's house."],
          ['lourdes', "(pushing the envelope back against his chest, gently) Keep it. Pay it back to somebody else. That's how you pay back a thing like that. Sideways."],
          ['jay', '(after a long time) Sideways.'],
          ['lourdes', "(patting his face) Go to bed, mijo. Go and do your stupid thing."],
        ] },
      ] },
      { if: 'dex_to_calder', then: [
        { scene: { at: 'casa_palma', cast: ['birdie', 'lourdes'] }, say: [
          ['birdie', '(in pyjamas, at the foot of the stairs, holding a cat that does not want to be held) Mrs. Lourdes lets me feed the cats. This one is Señor Bigotes. He bites.'],
          ['jay', 'Hey, Birdie.'],
          ['birdie', 'Daddy is in a hotel with a policeman outside the door. He called me. He says the soap is tiny. He says he is telling the truth to a lady with a grey stripe in her hair.'],
          ['birdie', "(beat) Is telling the truth why he's in a hotel?"],
          ['jay', '(crouching to her height) Telling the truth is why he gets to come home.'],
          ['birdie', '(considering this with total seriousness) Okay. (beat) Tell him the cat bit me. He likes to know things.'],
        ] },
      ] },
      { setTime: 23 },
      { goto: 'nana_lu_house', vehicle: 'lulu', objective: 'Go home to Heron Street', say: [
        ['caption', "(Heron Street at eleven. Every house on it has a Voss Meridian SOLD board in the yard except one. The pink one. The lemon tree Ansel planted has three small green lemons on it.)"],
      ] },
      { scene: { at: 'nana_lu_house', cast: [] }, say: [
        ['caption', '(The porch. The swing. He sits on it, and it squeaks on the left, the way it always has.)'],
        ['caption', "(From inside, through the screen door, the kitchen smells of nothing. A house smells of nothing when nobody's been baking in it.)"],
        ['jay', '(to the street, quietly) Big day tomorrow, Nana.'],
      ] },
      { blackout: [
        ['caption', '(Heron Street. Fifteen years ago. A Sunday afternoon in August, and the whole street smells of plums and cloves.)'],
        ['nana_lu', "(cutting a plum cake on the porch rail with a butter knife) End piece is yours. End piece has the most crust. A boy should know what he wants."],
        ['jay', '(twelve, mouth full) Why do you always make two?'],
        ['nana_lu', "One for us. One for whoever turns up. Somebody always turns up."],
        ['nana_lu', "(wrapping the second cake in wax paper, slow, the way she did everything she meant) I caught a boy in my tomatoes once. Long before you. Skinny thing. All elbows. Shirt full of my best Brandywines."],
        ['jay', 'Did you call the police?'],
        ['nana_lu', "On a hungry child? (She snorts.) I sat him on that step and I fed him cake till he couldn't stand up. Gave him the end piece."],
        ['nana_lu', '(looking down Heron Street, at nothing, smiling) Never saw him again. Hope he grew up nice.'],
      ] },
      { setTime: 0.5 },
      { if: 'solace_done', then: [
        { say: [
          ['caption', '(On the radio, as Lulu pulls away from Heron Street, Harbor Heat clicks over at midnight into something stolen.)'],
          ['solace', "(on the radio) This is Solace, and this frequency is stolen, like everything else in this town. Tonight's dedication is for a getaway driver with a busy day tomorrow."],
          ['solace', "(on the radio) You know who you are. The whole city knows who you are, baby. Ten and two."],
        ] },
      ] },
      { goto: 'starlite_diner', vehicle: 'lulu', objective: "The Starlite. She said she'd be there after her shift.", say: [
        ['jay', '(to the car) Last one. Last door.'],
      ] },
      { scene: { at: 'starlite_diner', cast: ['dot', 'mae'] }, say: [
        ['caption', '(The Starlite at half past midnight. The star on the roof sputters. Through the window: chrome, red vinyl, and in the window booth, Mae Reyes with two coffees in front of her, one untouched.)'],
        ['dot', '(at the door with the coffee pot, as if he comes in every night) She ordered yours. Twenty minutes ago. It\'s cold. I told her it would go cold. She said you\'d drink it anyway.'],
        ['jay', 'I would.'],
        ['dot', "(holding the door) I know. That's what I told her."],
      ] },
      { if: 'mae_stay', then: [
        { blackout: [
          ['caption', '(The booth. J+M under her thumb, where it has been for nine years. She traces the plus sign without looking at it.)'],
          ['mae', 'You asked me something. On the kerb. That morning.'],
          ['jay', 'I remember.'],
          ['mae', "I'm still thinking. (beat) Don't look like that. Still thinking isn't no. Still thinking is the most I've given anybody in three years."],
        ] },
      ], else: [
        { blackout: [
          ['caption', '(The booth. J+M under her thumb, where it has been for nine years. She traces the plus sign without looking at it.)'],
          ['mae', 'You actually gave me space.'],
          ['jay', 'I said I would.'],
          ['mae', "You actually did it, though. Three weeks. Not one text. (She looks at him like he's a stranger she might like.) Who are you?"],
        ] },
      ] },
      { blackout: [
        ['mae', "I'm coming tomorrow."],
        ['jay', 'Mae.'],
        ['mae', "In the truck with Ansel. With my bag. I've cleared it. I've lied to three supervisors and a union rep."],
        ['mae', "Somebody has to be there when you do something stupid. That was always my job. (beat) I'm not letting someone else do my job."],
        ['caption', "(He doesn't argue. He has known her since she was nineteen. He knows when a door is shut.)"],
        ['jay', "(after a long time, turning his cup round on the table) There's something I need to tell you. About the letter. Augie's first letter."],
        ['mae', '(very still) Okay.'],
        ['jay', "He saw Tommy go down. Before I touched the gear stick. He saw his eyes. He said..."],
        ['jay', '(It takes him two tries.) He said Tommy was gone. Right there. Before I drove. There was nobody there to leave.'],
        ['caption', '(Mae puts her coffee down very carefully, as if it might go off.)'],
        ['mae', "I never read the autopsy. I've read a thousand. I read them on my breaks. Never his."],
        ['mae', "For three years I've been seeing it. Him on the ground in that bay. Alone. Waiting for somebody. Waiting for me to call back."],
        ['jay', 'Nobody left him, Mae.'],
        ['mae', '(her voice going) Nobody left him.'],
        ['caption', '(She cries the way people cry in diners at one in the morning: with her hand over her mouth, so Dot won\'t come. Dot comes anyway, and refills both cups, and goes.)'],
        ['caption', '(He cries too. A little. Mostly at the window. She lets him have the window.)'],
      ] },
      { if: 'nightshift_done', then: [
        { blackout: [
          ['mae', "(wiping her face with a napkin, taking a small battered notebook out of her shirt pocket) First page. First name. Tomás Reyes. And next to it, I wrote “alone.”"],
          ['mae', "Because I thought... (She clicks a pen. She draws one line through the word, slowly, very straight, the way they teach you.)"],
          ['mae', "There. (beat) Don't you dare make me start a new page tomorrow, Jay. I mean it. I'll come and find you and I'll be so angry."],
        ] },
      ] },
      { blackout: [
        ['mae', '(standing, leaving money on the table that is far too much) Go to sleep somewhere. Not the motel. The motel has bedbugs that have unionised.'],
        ['jay', "I'll sleep in the car."],
        ['mae', "(at the end of the booth, her hand on his shoulder for one second) Of course you will. (beat) Ten and two."],
      ] },
      { music: 'off' },
      { setTime: 1 },
      { camera: 'voss_estate', seconds: 7, say: [
        ['caption', "(One in the morning. On the Crestline lookout, a long teal two-door is parked facing the city, and the man in the driver's seat is asleep with his hands at ten and two.)"],
        ['caption', "(Below him, across the dark lawns, Belvedere is lit up like a ship. In twenty hours, three armoured vans are going to leave through those gates.)"],
      ] },
    ],
  });

  // --- end of main missions ---

  S.missions.push(...act4);

  // ===================================================================
  // SIDE CHAIN 3: DEAD AIR (giver solace, after m12)
  // ===================================================================
  const deadair = [];

  S.side.push({
    id: 'side_deadair',
    title: 'Dead Air',
    giver: 'solace',
    unlockAfter: 'm12_the_councilmans_pool',
    missions: deadair,
  });
})();
