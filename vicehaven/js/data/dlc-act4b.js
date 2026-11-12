/*
 * data/dlc-act4b.js — "Chasing the Firecrest", ACT 4: THE LAST LAP, second
 * half (d28 to d30, and the three endings).
 *
 * Race day. Before dawn the powder store is empty but for a comment card:
 * Ottoline Graves has put the Firecrest on a transporter for the Ironside
 * crusher, and Jay runs it down over the Southbay Causeway in Dess's own
 * car. At ten Castellane closes every road to the Speedway, and Fenella has
 * a prop (it is a tank). At three the Firecrest comes off the island, over
 * the bridge, down the coast road and out of the Speedway tunnel into the
 * 50th anniversary Southbay 500, for the lap of honour Dess never had. On
 * the line Jay decides where the car goes: Hers, Everybody's or Gone Again.
 *
 * Loaded after dlc-act4a.js. See docs/DLC_BIBLE.md (sections 1, 4, 7, 8, 11),
 * docs/dlc/beats-act4.md and docs/mission-format.md. Sets dlc_end_hers /
 * dlc_end_everybody / dlc_end_gone (d30). Reads every flag: dlc_blog_on/off
 * (d28, d29, d30, endings), dlc_chet_told/kept (d29, d30, endings),
 * dlc_dash_in/left (d30, endings), dlc_june_told/wait (d28, d30, endings),
 * and the side-chain finales dst4_the_big_jump, dsf4_check_ride,
 * dsr4_southbay_classic and dsl3_test_day. No riddles here except Ending
 * C's new one (Milo's), which is never solved on screen.
 * Tallies: comment cards nine (the floor, d28) plus the blank tenth in
 * Jay's shirt pocket, filled in on the line in d30; subscribers 200,000
 * (d29) and 400,000 (d30); Monty's "Jay... Mercator?" (d29), "Joe
 * Mercury!" and at last "JAY MERCER!" (d30); Hob's nine without dsf4;
 * third gear still sticks; Dess taps the wheel three times (d30).
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const FIRECREST_ORANGE = 0xe0481c;
  const KEEPER_GREEN = 0x1f3a26;
  const GS_TEAL = 0x13b5b1;
  const BULWARK_WHITE = 0xdcdad2;
  const LOWLOADER_CREAM = 0xefe6d0;
  const DRIFTER_WHITE = 0xf1f0ea;
  const CASTELLANE_GOLD = 0xd29a1c;
  const SKYLARK_YELLOW = 0xf2c500;
  const DASH_PURPLE = 0x3b1558;
  const LEARNER_BLUE = 0x78b8e8;

  // ------------------------------------------------------------ helpers
  /** The Firecrest: a flame-orange Ironclad, a gold bird on the bonnet, Junebug under the driver's door. */
  const firecrest = (at) => ({ spawnCar: 'firecrest', type: 'ironclad', at, color: FIRECREST_ORANGE, name: 'the Firecrest' });
  /** Dess's own car: a bottle-green Vireo with a lighthouse-authority crest, "kept quick". */
  const keeperCar = (at) => ({ spawnCar: 'keeper_car', type: 'vireo', at, color: KEEPER_GREEN, name: "Dess's Vireo" });
  /** Sunreel's cream low-loader, SUNREEL STUDIOS on the doors. */
  const lowloader = (at) => ({ spawnCar: 'film_lowloader', type: 'hauler', at, color: LOWLOADER_CREAM, name: "Fenella's low-loader" });
  /** A teal Guest Services Sovereign. */
  const gsCar = (id, at) => ({ spawnCar: id, type: 'sovereign', at, color: GS_TEAL });
  /** A teal Guest Services Tern. */
  const gsSuv = (id, at) => ({ spawnCar: id, type: 'tern', at, color: GS_TEAL });
  /** A white Guest Services Bulwark (the roadblock trucks). */
  const gsTruck = (id, at) => ({ spawnCar: id, type: 'bulwark', at, color: BULWARK_WHITE });
  /** Somebody behind the wheel of a spawned car, driving to a place (or after a car). */
  const driver = (id, car, at, to, faction) => ({ id, faction: faction || 'guest_services', hostile: false, at, behavior: 'drive', car, to });
  /** The same, with a pistol out of the window. */
  const gunDriver = (id, car, at, to) => Object.assign(driver(id, car, at, to), { weapon: 'pistol', hostile: true });
  /** A friendly named character standing about at a place. */
  const friend = (id, at, faction) => (faction ? { id, char: id, faction, at, behavior: 'idle', hostile: false } : { id, char: id, at, behavior: 'idle', hostile: false });
  /** Guest Services on foot at a roadblock. */
  const gsGuards = (group, at, count, weapon) => ({ group, char: 'gs_staff', faction: 'guest_services', at, count, weapon, behavior: 'attack' });
  /** Milo's readers sitting in the road, in home-made T-shirts, with signs. */
  const fans = (at, count) => ({ faction: 'firecrest_fans', at, count: count || 16, behavior: 'idle', hostile: false });

  // =====================================================================
  // d28 — Comment Card
  // =====================================================================
  D.missions.push({
    id: 'd28_comment_card',
    act: 4,
    title: 'Comment Card',
    giver: 'pip',
    start: 'paloma_fort',
    time: 4.5,
    estMinutes: 10,
    summary: 'How would you rate your stay? Ottoline Graves has taken the Firecrest to the crusher.',
    reward: { money: 2500 },
    // The transporter stands in for the car until the catch; the Firecrest
    // doesn't exist until she comes off the back (DECISIONS 5).
    failIf: ['wrecked:transporter', 'wrecked:firecrest', 'dead:dess', 'dead:pip'],
    steps: [
      { music: 'off' },
      {
        blackout: [
          ['caption', 'Race day. Twenty-five past four in the morning.'],
          ['caption', 'The fort. A camp bed in the keeper\'s store room, and a man on it who has slept in a lot of worse places.'],
          ['pip', '(a whisper) Jay.'],
          ['pip', '(a louder whisper) Jay.'],
          ['pip', '(not a whisper) JAY. Get up. She\'s gone.'],
          ['jay', '(not moving) Who\'s gone?'],
          ['pip', 'The CAR, Jay. The car\'s gone.'],
        ],
      },
      { spawn: [friend('pip', 'powder_store'), friend('dess', 'powder_store'), friend('toby', 'powder_store')] },
      keeperCar('paloma_fort_gate'),
      { camera: 'paloma_fort', seconds: 4, say: [['caption', 'The Paloma fort, before dawn. Across the bay the Coral Marina light turns, patient as ever.']] },
      {
        scene: { at: 'powder_store', cast: ['pip', 'dess', 'toby', 'gs_staff'] },
        say: [
          ['caption', 'The arch is open. The vault is empty. Tyre marks in fifty years of dust run straight out of the door and down the ramp.'],
          ['caption', 'In the corner, two Guest Services men sit back to back, tied up with the fort\'s festival bunting, half asleep.'],
          ['toby', '(standing where the car stood, cap in his hands) Hell\'s bells. Fifty years in here and she lasts one night out.'],
          ['dess', '(crouching by the tyre marks, perfectly calm) Somebody reversed her out. Badly. Look at that. Three goes.'],
          ['pip', '(to the tied men) Who did this? Who TOOK her?'],
          ['gs_staff', '(sleepily) Ms Graves. She sent us for coffee. Then she came back and tied us up herself.'],
          ['gs_staff', '(with a yawn) She said it was a team-building exercise.'],
          ['pip', 'Did you BUILD a team?'],
          ['gs_staff', "(looking at the bunting) We're very close now."],
          ['caption', 'On the floor, exactly where the Firecrest\'s front wheel stood, lies a small printed card. Jay picks it up.'],
          ['caption', 'CASTELLANE GUEST SERVICES. How would you rate your stay? 1 to 5.'],
          ['jay', '(turning it over) That\'s nine.'],
          ['pip', 'Nine WHAT?'],
          ['jay', 'Cards. I keep them in the glovebox.'],
          ['pip', 'WHY?'],
          ['jay', 'Seemed rude not to.'],
        ],
      },
      {
        scene: { at: 'powder_store', cast: ['pip', 'dess', 'toby'] },
        say: [
          ['caption', 'Dess has the keeper\'s shortwave set on her knee. She turns the dial a hair, the way you\'d turn a safe, and a voice comes out of it.'],
          ['ottoline', "(on the shortwave, calm as a lift) Southbay Causeway, then the coast road. I'd like it at the Ironside crusher before the gates open."],
          ['ottoline', "(shortwave) Mr Castellane has asked me to stand down. He asked very nicely."],
          ['ottoline', "(shortwave, a pause) I'm afraid I don't work for nicely."],
          ['toby', 'Ironside. Again. That woman loves a crusher.'],
          ['pip', 'We need a car. The pickup\'s at the bottom of the hill with no petrol in it, I checked, I KICKED it—'],
          ['dess', '(already walking, already putting her coat on) Take my car. It\'s quick. I\'ve been keeping it quick.'],
          ['pip', 'You\'ve got a CAR?'],
          ['dess', "I've got a lighthouse, Pip. You can't drive a lighthouse to the shops."],
          ['dess', '(to Jay) I\'ll sit in front. I call corners. You listen. Toby, you stay and mind the light.'],
          ['toby', "(quietly, to the empty arch) I'll be here. Bring her back without a scratch, son. Or with one. I'll take one."],
        ],
      },
      {
        if: 'dlc_june_told',
        then: [
          { spawn: [friend('june', 'paloma_fort_gate')] },
          {
            scene: { at: 'paloma_fort_gate', cast: ['june', 'pip', 'dess'] },
            say: [
              ['caption', 'June comes down the lighthouse steps in a borrowed keeper\'s jumper, her clipboard under her arm out of pure habit.'],
              ['pip', '(calling up) Mum, stay with Toby. Somebody should be here.'],
              ['caption', 'June looks at her mother. Her mother looks back. It is the second day they have had, and they are still finding out how.'],
              ['dess', 'Somebody should be here when we bring her back. I\'d like it to be you.'],
              ['caption', 'June nods, once. Then, to Jay, in the instructor voice, because it is the voice she has: "Mirrors."'],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'paloma_fort_gate', cast: ['pip', 'dess'] },
            say: [
              ['caption', 'Toby stands in the gate with a torch, alone, the way he has stood in a lighthouse door for thirty-three years.'],
              ['pip', '(calling back) Back by breakfast, Toby!'],
              ['dess', '(not looking back) He knows. He always knew how to wait. It\'s the only thing he was ever better at than me.'],
            ],
          },
        ],
      },
      { join: ['dess', 'pip'] },
      { getIn: 'keeper_car', objective: "Take Dess's car. Catch the transporter" },
      { music: 'action', checkpoint: true },
      {
        spawnCar: 'transporter', type: 'hauler', at: 'old_lanes', color: GS_TEAL, name: 'the transporter',
      },
      gsCar('gs_car1', 'transporter'),
      gsCar('gs_car2', 'transporter'),
      {
        spawn: [
          { id: 'ottoline', char: 'ottoline', faction: 'guest_services', at: 'transporter', behavior: 'drive', car: 'transporter', to: 'scrapyard_gate', hostile: false },
          gunDriver('gs_driver1', 'gs_car1', 'gs_car1', 'keeper_car'),
          gunDriver('gs_driver2', 'gs_car2', 'gs_car2', 'keeper_car'),
        ],
      },
      {
        chase: 'transporter', mode: 'catch',
        route: ['causeway_south', 'coast_road', 'scrapyard_gate'],
        escapeTo: 'scrapyard_gate', escapeRadius: 30,
        escapeReason: 'The transporter made it through the scrapyard gate. The crusher is warm.',
        objective: "Box the transporter in before the scrapyard. Don't wreck it: she's on the back",
        say: [
          ['caption', 'Ahead, through the lanes: a teal car transporter, a dust sheet strapped over something car-shaped on the top deck.'],
          ['dess', '(belt on, hands in her lap, completely calm) There. Brake late. Later. (the tyres squeal) Good.'],
          ['pip', "(from the back) That's my GRAN'S car on that truck. That's my gran next to you."],
          ['pip', "This is the weirdest morning of my life, and I've had a LOT of weird mornings this month."],
          ['dess', "Don't follow him, Jay. Overtake him. Following's for funerals."],
          ['jay', 'He\'s got two friends.'],
          ['dess', 'Then overtake them too. Left here. No, my left.'],
          ['jay', 'Your left is my left.'],
          ['dess', "Not at my age it isn't. (beat) There. Good line."],
          ['caption', 'A teal Sovereign slams into the Vireo\'s flank.'],
          ['dess', '(not even turning her head) Rude.'],
          ['caption', 'Jay leans on it, and the Sovereign kisses the railing and spins away into the dark.'],
          ['dess', 'Better.'],
          ['dess', "Inside line on the causeway. He'll go wide. Trucks always go wide."],
          ['pip', 'How do you KNOW all this?'],
          ['dess', "(dry) I used to do it for a living, love. Before I was dead."],
          ['jay', '(to the Vireo, as the needle climbs) Easy. You\'re quick. I can feel it.'],
          ['dess', "Course she's quick. I service her every Sunday. Nobody on that island knows why the lighthouse lady needs a car that does a hundred and thirty."],
          ['pip', 'Does it DO a hundred and thirty?'],
          ['dess', "(a glance at Jay) Let's find out."],
          ['caption', 'The transporter swings west along the coast road. Ironside\'s chimneys stand black against the first grey of the morning.'],
          ['dess', "Now. He's slowing for the bend. Put her nose in under his cab and keep it there. Gently. Like parking."],
          ['pip', 'NOTHING about this is like parking!'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [{ text: 'milo', message: 'Readers on the causeway say a teal truck went past with a sheet on it doing 70. One of them has a sign. It says GO JAY. She made it at 4 a.m. She\'s 71.' }],
        else: [{ text: 'milo', message: "I'm awake. I've drawn the causeway on the wall. I can't help. I'm helping by being awake." }],
      },
      { music: 'tension' },
      firecrest('transporter'),
      { camera: 'scrapyard_gate', seconds: 3, say: [['caption', 'A hundred metres short of the scrapyard gate, the transporter shudders to a stop with a green Vireo jammed under its cab.']] },
      {
        scene: { at: 'transporter', cast: ['ottoline', 'dess', 'pip'] },
        say: [
          ['caption', 'The cab door opens. Ottoline Graves steps down onto the coast road, smooths her teal jacket, and looks at Dess Marlow for the first time.'],
          ['ottoline', 'Mrs Marlow. You\'re shorter than your legend.'],
          ['dess', "You're exactly as tall as yours."],
          ['ottoline', '(a small, real smile) Thank you. (to Jay) Mr Mercer. Good morning. You drive very well for somebody so badly organised.'],
          ['jay', "You stole a car out of a fort at three in the morning."],
          ['ottoline', 'I relocated an asset. There\'s a form.'],
          ['caption', 'She takes a card from her breast pocket and holds it out between two fingers. Jay takes it. It is blank. Nothing printed on it at all.'],
          ['ottoline', "We'd love your feedback."],
          ['jay', "(turning it over) There's no question."],
          ['ottoline', "I've run out of questions, Mr Mercer. You choose one."],
          ['pip', "(from behind Jay) Why did you even DO this? Leo told you to stop. We heard him. He said please."],
          ['ottoline', '(with something close to pity) It was never about his father, Miss Marlow. Mr Castellane has feelings about his father.'],
          ['ottoline', 'I have a job. (beat) I simply don\'t lose.'],
          ['dess', "(mildly) You just did."],
          ['ottoline', "(glancing up the road, where blue lights are coming) Not yet. Not at this time."],
          ['caption', 'A teal Sovereign pulls up beside her. She gets in without hurrying, and it drives away west towards Ironside as the sirens come round the bend.'],
        ],
      },
      { leave: ['ottoline'], vanish: true },
      {
        scene: { at: 'transporter', cast: ['gs_staff', 'officer', 'pip', 'dess'] },
        say: [
          ['caption', 'Two police officers get out of a patrol car and look at the scene: a car transporter, a dented green Vireo, and four men in matching teal blazers standing in a row at dawn.'],
          ['officer', '(after a long look) Are you lads a band?'],
          ['gs_staff', '(with great dignity) We\'re Guest Services.'],
          ['officer', 'Never heard of you. Get in the car.'],
          ['pip', '(whispering to Jay) I would actually listen to that band.'],
        ],
      },
      { leave: ['gs_staff', 'officer', 'gs_driver1', 'gs_driver2'], vanish: true },
      { music: 'hope' },
      {
        scene: { at: 'firecrest', cast: ['dess', 'pip'] },
        say: [
          ['caption', 'Down the ramps, unstrapped, the dust sheet folded and dropped in the road: the Firecrest, flame orange, not a scratch on her.'],
          ['pip', "Gran's car's stuck under the truck. I'll get the ferry with it. I'll push it."],
          ['dess', "Don't push it. I've just had it polished."],
          ['pip', "Then I'm in the back. Of HER. (climbing in) Oh, wow. It smells like a museum. A good museum."],
          ['dess', '(holding out the starter key to Jay) Your turn, Jay. Drive her home. I want to watch the sea.'],
        ],
      },
      { getIn: 'firecrest', objective: 'Drive her home' },
      {
        deliver: 'firecrest', to: 'powder_store', maxDamage: 0.4,
        objective: 'Back over the causeway to the fort. Gently. She\'s fifty',
        say: [
          ['jay', "(to the car, at the first corner) Easy. You're fifty years old, I'm not going to rush you."],
          ['caption', 'Into third. A grinding clunk, and the lever fights his hand like it has an opinion.'],
          ['dess', 'Third gear sticks. Always did.'],
          ['jay', 'Toby said.'],
          ['dess', 'Toby was supposed to fix it.'],
          ['dess', '(a beat) Toby was supposed to do a lot of things.'],
          ['caption', 'She looks out at the sea for a while.'],
          ['dess', "He'd have got there. He always got there. Just late."],
          ['pip', '(from the back, very quietly, for her) Rating your cornering, Jay. Nine. Gran, what would you give him?'],
          ['dess', "Seven. He brakes like he's apologising. (beat) That's a compliment, from me."],
          ['caption', 'On the causeway the sun comes up out of the bay. At one end the Coral Marina light, at the other the fort, both still turning, both pale now in the day.'],
          ['dess', 'You said a funny thing at the fort, Jay. You said you knew about this car before any of them.'],
          ['jay', 'My nana. She told me the story when I was six. Bedtime.'],
          ['jay', 'Her version had you driving off into the night.'],
          ['dess', '(interested) Did she get the ending right?'],
          ['jay', 'She said you went somewhere you could see the sea.'],
          ['dess', '(a long beat) Clever woman.'],
          ['pip', "(asleep, suddenly, in the back seat, the way only nineteen-year-olds can)"],
          ['dess', '(quietly) Look at her. Out like a light. I used to do that. Race all day, sleep in the back of the transporter.'],
          ['jay', 'Damn. (as third sticks again) Sorry.'],
          ['dess', "Don't apologise to me. Apologise to her."],
          ['jay', '(to the car) Sorry.'],
        ],
      },
      { music: 'off' },
      {
        scene: { at: 'powder_store', cast: ['dess', 'toby', 'pip'] },
        say: [
          ['caption', 'The Firecrest rolls back under the arch. Toby is waiting with a lamp, and walks round her twice before he says a word.'],
          ['toby', '(crouching at the back wing) There. A scratch. (he looks at it a long time) I forgive it.'],
          ['dess', '(getting out, stiffly) Ten hours to the race. I\'m going to have a nap. I\'m seventy-nine.'],
          ['toby', "You're seventy-nine and you just did a pursuit."],
          ['dess', "(already walking) I sat in a car and was rude to people. I've done that all my life."],
          ['pip', '(holding up the card from the floor, yawning) Nine.'],
          ['jay', '(touching his shirt pocket, where the blank one is) Ten.'],
        ],
      },
    ],
  });

  // =====================================================================
  // d29 — Road Closed
  // =====================================================================
  D.missions.push({
    id: 'd29_road_closed',
    act: 4,
    title: 'Road Closed',
    giver: 'pip',
    start: 'bridge_mainland',
    time: 10,
    estMinutes: 10,
    summary: 'Castellane has closed every road to the Speedway for the anniversary. Fenella has a prop.',
    reward: { money: 3000 },
    failIf: ['wrecked:war_tank', 'dead:pip'],
    steps: [
      { music: 'off' },
      lowloader('bridge_mainland'),
      { spawnCar: 'war_tank', type: 'bastion', at: 'bridge_mainland', name: 'the tank' },
      gsTruck('gs_truck1', 'bridge_mainland'),
      {
        camera: 'harbor_roadblock', seconds: 5,
        say: [
          ['caption', 'Race day. Ten in the morning. Five hours to the start.'],
          ['caption', 'Seawall Drive: two white Bulwarks across the road, cones, a teal gazebo, and a sign. ROAD CLOSED FOR THE ANNIVERSARY. CASTELLANE HOSPITALITY: CHAMPIONS SINCE DAY ONE.'],
          ['monty', "(on the radio) ...and Castellane Hospitality tell me the coast road, Seawall Drive, Anchor Street and the Bowl car park are all closed for the big day,"],
          ['monty', "(radio) which means, folks, if you want to see the Southbay 500 this afternoon, you'd better be a seagull."],
        ],
      },
      { spawn: [friend('fenella', 'bridge_mainland'), friend('pip', 'bridge_mainland')] },
      {
        scene: { at: 'bridge_mainland', cast: ['fenella', 'pip'] },
        say: [
          ['caption', 'The end of Anchor Street, by the Paloma Bridge. A Guest Services Bulwark sits across both lanes. Behind it, a teal gazebo. Behind that, a man in a blazer eating a croissant.'],
          ['caption', 'Parked on the kerb: Sunreel\'s cream low-loader, and on it something very large under a tarpaulin.'],
          ['fenella', '(megaphone under one arm, two phones ringing) Jay. Pip. Good. I\'ve been told the roads are closed. I don\'t accept that. I\'m a director.'],
          ['pip', "Every road to the Speedway. All four. Gran's car is on the island and the race is at three. We need—"],
          ['fenella', 'I know what you need.'],
          ['caption', 'She pulls the tarpaulin off in one long, practised tug.'],
          ['fenella', "It's a prop."],
          ['caption', 'Jay looks at it for a while.'],
          ['jay', "It's a tank."],
          ['fenella', "It's a prop tank. It's on loan from Fort Breakwater for Sergeant Sandcastle. I need it back by six or a colonel cries."],
          ['pip', 'Does it... work?'],
          ['fenella', 'Everything works if you sign enough forms. I signed them all as Chet.'],
          ['jay', 'Does Chet know?'],
          ['fenella', 'Chet has never read anything he signed. It\'s why he\'s so happy.'],
          ['pip', '(walking round it, glowing) Can I ride in it? It\'s not a road vehicle. I checked. The ban\'s for road vehicles.'],
          ['jay', 'It is today.'],
          ['pip', '(climbing up the side) Hell yes.'],
        ],
      },
      {
        if: 'dlc_chet_told',
        then: [
          { spawn: [friend('chet', 'bridge_mainland')] },
          {
            scene: { at: 'bridge_mainland', cast: ['chet', 'fenella', 'pip'] },
            say: [
              ['caption', 'The hatch on top of the turret swings up. Chet Valiant climbs halfway out, an army helmet balanced on top of the quiff, beaming.'],
              ['chet', 'Kid! Top speed twenty-eight. (he pats the turret) Finally, a vehicle that respects me.'],
              ['fenella', 'He slept in it. I didn\'t ask him to. I came in this morning and he was in it.'],
              ['chet', 'I told you the truth matters, Fenella. A man has to be part of it. Even at twenty-eight.'],
              ['jay', 'Can you sit still in a tank, Chet?'],
              ['chet', "Kid, I sat still through all of Oversteer 2. Two hours and ten minutes. I'm a professional."],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'bridge_mainland', cast: ['fenella', 'pip'] },
            say: [
              ['pip', "Where's Chet? He'd love this."],
              ['fenella', '(not quite looking at them) In his trailer. Not taking calls. He keeps asking me questions, and I keep not answering them.'],
              ['fenella', "(a beat, quieter) He's on the podium at three. In the red jacket. For the publicity. That's his contract."],
            ],
          },
        ],
      },
      { getIn: 'war_tank', objective: 'Get in the tank' },
      { join: ['pip'] },
      {
        if: 'dlc_chet_told',
        then: [{ join: ['chet'] }, { protect: 'chet' }],
      },
      { music: 'action', checkpoint: true },
      { spawn: [{ group: 'anchor_block', char: 'gs_staff', faction: 'guest_services', at: 'bridge_mainland', count: 3, behavior: 'flee', hostile: false }] },
      {
        destroy: ['gs_truck1'],
        objective: 'Clear the Anchor Street roadblock',
        say: [
          ['caption', 'The men at the roadblock look at the tank. They look at each other. One of them puts his croissant down very carefully on the bonnet of the Bulwark.'],
          ['gs_staff', '(backing away) Good morning! We\'re... we\'re going to go and get some assistance!'],
          ['pip', "(from the commander's hatch) Jay. JAY. Use the big gun. You've got a big gun. When will you EVER have a big gun again?"],
          ['jay', "(to the tank) Right. Let's see what you think of roadblocks."],
        ],
      },
      { heat: 3 },
      {
        phone: 'milo',
        say: [
          ['milo', "Did you know a Bastion weighs as much as eleven elephants? I checked with Grandad. He said 'Great Scott' and then 'which elephants'."],
          ['jay', 'Milo. Busy.'],
          ['milo', "I know. You're on the news. Not the real news, Monty's radio. That's real enough. He's very excited."],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', '(the guilty voice) Also. Jay. I put a post up this morning. Just the roadblocks. With a map.'],
              ['milo', "I asked them not to. I said 'please don't'. I said it in bold."],
              ['milo', "They're sitting in the road. At Seawall Drive and on the coast road. In T-shirts they've made. With signs."],
              ['milo', "There's two hundred thousand of them now. Readers, I mean, not in the road. Some of them have sandwiches."],
              ['jay', "(after a moment) Tell them thanks. And to stay out of the way of the tank."],
              ['milo', "I've already put that in bold too."],
            ],
          },
          { spawn: [fans('harbor_roadblock', 18), fans('coast_road', 18)] },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', "It's on the wall. Four roadblocks. I've drawn them as little gazebos. Anchor Street's got a cross through it already."],
              ['milo', "I'm rooting for you in pencil. Grandad's rooting for you in pen. He says pencil is for people who aren't sure."],
            ],
          },
          gsTruck('gs_truck2', 'harbor_roadblock'),
          gsTruck('gs_truck3', 'coast_road'),
          { spawn: [gsGuards('seawall_block', 'harbor_roadblock', 3, 'smg'), gsGuards('coast_block', 'coast_road', 3, 'smg')] },
        ],
      },
      {
        if: 'dlc_chet_told',
        then: [
          {
            goto: 'harbor_roadblock', vehicle: 'war_tank', radius: 25, stop: false,
            objective: 'Down Seawall Drive',
            say: [
              ['monty', "(on the radio) ...I'm getting reports... I'm being told... ladies and gentlemen, there is a tank on Seawall Drive."],
              ['monty', '(radio) A TANK. On SEAWALL DRIVE. Folks, I have been doing this job for thirty years, and that is a first.'],
              ['chet', '(in the trailer voice, from the gunner\'s seat) In a world... where the roads are closed... one tank... at twenty-eight...'],
              ['pip', 'Can you NOT.'],
              ['chet', '(undeterred) ...one tank... must go the distance...'],
              ['pip', "Chet. I will throw you out of the hatch. I'm a racing driver. I've got very good arms."],
              ['chet', '(beaming at the speedometer) We\'re doing twenty-eight. I feel alive. I feel NEARLY alive.'],
              ['jay', "That's as fast as it goes, Chet."],
              ['chet', "Don't tell me that, kid. Let me have this."],
              ['caption', 'Along the seafront the lampposts carry gold banners: CASTELLANE: 50 YEARS OF CHAMPIONS.'],
              ['pip', '(looking up at them) Coming down by teatime.'],
              ['chet', "I'll take one home. For the trailer. As a reminder of what kind of man I almost was."],
            ],
          },
        ],
        else: [
          {
            phone: 'chet',
            say: [
              ['chet', "Kid. It's Chet. Fenella's left a note on my trailer that says 'borrowed the tank, back by six'."],
              ['chet', "What's the tank for? (beat) Is it for the movie?"],
              ['chet', "(a beat, quieter) It isn't for the movie, is it?"],
              ['jay', 'Watch the race, Chet.'],
              ['chet', "I'm in the race. Well. I'm on the podium. In the jacket. For the publicity."],
              ['jay', 'Then watch it from there.'],
              ['chet', '(after a long time) Okay, kid. (beat) Okay.'],
            ],
          },
          {
            goto: 'harbor_roadblock', vehicle: 'war_tank', radius: 25, stop: false,
            objective: 'Down Seawall Drive',
            say: [
              ['monty', "(on the radio) ...I'm getting reports... I'm being told... ladies and gentlemen, there is a tank on Seawall Drive."],
              ['monty', '(radio) A TANK. On SEAWALL DRIVE. Folks, I have been doing this job for thirty years, and that is a first.'],
              ['pip', '(head out of the hatch, wind in her plait) He sounded sad, Chet. Did he sound sad?'],
              ['jay', 'He sounded like somebody working something out.'],
              ['pip', "Good. About time somebody in that film did."],
              ['caption', 'Along the seafront the lampposts carry gold banners: CASTELLANE: 50 YEARS OF CHAMPIONS.'],
              ['pip', '(looking up at them) Coming down by teatime.'],
              ['pip', "This is the slowest I've ever gone anywhere and the best I've ever felt. Is that growing up? I hate it."],
            ],
          },
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            scene: { at: 'harbor_roadblock', cast: ['pip'] },
            say: [
              ['caption', 'Seawall Drive is full of people sitting cross-legged in the road in home-made orange T-shirts. Signs: SHE WON. LET HER IN. MIND THE ROAD.'],
              ['caption', 'As the tank rolls up they part like a very polite sea, and cheer it through.'],
              ['caption', 'Behind the abandoned Bulwark, a Guest Services man in a deckchair raises half a sandwich in salute.'],
              ['pip', "Milo's readers are sitting on Castellane's road. Eating Castellane's lunch. With Castellane's men."],
              ['jay', 'Big blog.'],
            ],
          },
        ],
        else: [
          {
            destroy: ['gs_truck2'],
            objective: 'Clear the Seawall Drive roadblock',
            say: [
              ['gs_staff', '(from behind the gazebo, firing) Good morning! I\'m afraid this road is closed at this time!'],
              ['pip', "They're shooting at a TANK. With little guns. That's so polite it's rude."],
              ['jay', '(lining up the gun) Road\'s open.'],
            ],
          },
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            goto: 'coast_road', vehicle: 'war_tank', radius: 25, stop: false,
            objective: 'Along the coast road',
            say: [
              ['caption', 'More of them on the coast road, sitting in the sun with flasks and signs. The Guest Services gazebo has been turned into a sun shade.'],
              ['caption', 'From the beach, a lifeguard\'s whistle. Gully, in the crowd, a SHE WON T-shirt pulled on over his vest, blows it once, for the tank, with feeling.'],
              ['pip', 'Is that the lifeguard? The one whose whistle Dash took?'],
              ['jay', 'He got a new one.'],
              ['pip', "Everybody's here. Everybody's actually here."],
            ],
          },
        ],
        else: [
          {
            goto: 'coast_road', vehicle: 'war_tank', radius: 40, stop: false,
            objective: 'Along the coast road',
            say: [
              ['pip', "Two down. Milo'll be crossing out gazebos."],
              ['jay', 'Two to go.'],
              ['pip', "You know what Gran said about the coast road? She said it was the only road in Vicehaven worth driving fast. I've been banned for doing exactly that."],
            ],
          },
          {
            destroy: ['gs_truck3'],
            objective: 'Clear the coast road roadblock',
            say: [
              ['gs_staff', '(over a loudhailer) We\'d love your feedback on this road closure!'],
              ['pip', 'Give them some feedback, Jay.'],
            ],
          },
        ],
      },
      gsTruck('gs_truck4', 'bowl_car_park'),
      { spawn: [gsGuards('bowl_block', 'bowl_car_park', 4, 'shotgun')] },
      {
        camera: 'expo_hall', seconds: 3,
        say: [['caption', 'The Bowl. On the exhibition hall, a banner three storeys high: CASTELLANE: 50 YEARS OF CHAMPIONS. In the doorway, a cardboard Rex Castellane, waving.']],
      },
      {
        goto: 'bowl_car_park', vehicle: 'war_tank', radius: 40, stop: false,
        objective: 'The Bowl car park: the last roadblock',
        say: [
          ['pip', "There's the Speedway. Listen. You can hear the warm-up laps from here."],
          ['jay', '(to the tank, as it crawls past a bus) Damn, you\'re slow. (beat) Last one.'],
        ],
      },
      {
        destroy: ['gs_truck4'],
        objective: 'Clear the Bowl roadblock',
        say: [
          ['monty', '(on the radio, now live from the Speedway) The tank has entered the car park. Folks, the tank is in the Bowl car park.'],
          ['monty', '(radio) The tank... is parking. Ladies and gentlemen, the tank is parking. In a disabled bay. No. Next to it. Good tank.'],
          ['monty', "(radio) I'm told... I'm told the tank is being driven by a Jay... Mercator? Jay Somebody!"],
          ['pip', "I told a marshal it was you. I SPELLED it."],
          ['jay', "He's had worse goes."],
        ],
      },
      { spawnCar: 'film_lowloader2', type: 'hauler', at: 'bowl_car_park', color: LOWLOADER_CREAM, name: "Fenella's low-loader" },
      {
        goto: 'film_lowloader2', vehicle: 'war_tank', stop: true, radius: 8,
        objective: 'Park the tank by the low-loader',
        say: [
          ['caption', 'Across the car park the cream low-loader comes in hot, Fenella at the wheel, horn going.'],
          ['pip', "She's driven round behind us. How fast was she going?"],
          ['jay', 'Sixty.'],
          ['pip', "(impressed) She's not Chet."],
        ],
      },
      { music: 'off' },
      {
        scene: { at: 'bowl_car_park', cast: ['fenella', 'pip'] },
        say: [
          ['fenella', "(jumping down, checking her watch) Twenty to twelve. The colonel will be thrilled. Well. He'll be something."],
          ['pip', '(climbing down the side of the tank, legs wobbling) That was the best morning of my whole life.'],
          ['fenella', "You've had a very short life."],
        ],
      },
      {
        if: 'dst4_the_big_jump',
        then: [
          {
            scene: { at: 'bowl_car_park', cast: ['fenella'] },
            say: [
              ['fenella', "I promised I'd film the real thing one day, Jay. Today's the day."],
              ['fenella', "Crew's already inside. Pit wall, grandstand, the roof of the commentary box. Whatever happens at three, it's in focus."],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'bowl_car_park', cast: ['fenella'] },
            say: [
              ['caption', 'She hands Jay a card. Her business card, this time. SUNREEL STUDIOS. FENELLA MOSS. DIRECTOR. Three phone numbers.'],
              ['fenella', "Call me when you're doing whatever it is you're really doing. I want to film it."],
              ['jay', "I've got a glovebox full of cards."],
              ['fenella', "Mine's the only one that isn't a threat. Keep it at the front."],
            ],
          },
        ],
      },
      {
        if: 'dlc_chet_told',
        then: [
          {
            scene: { at: 'bowl_car_park', cast: ['chet', 'fenella', 'pip'] },
            say: [
              ['caption', 'Sirens. Chet climbs out of the hatch, still in the army helmet, sees blue lights, and freezes behind the low-loader with one arm in the air.'],
              ['caption', 'A police officer jogs past him, glances at him, and keeps going: "Stunt mannequin." Chet holds the pose until the car park is empty.'],
              ['chet', "(not moving his lips) Kid. I've been playing dead since my second film. I'll see you at three."],
            ],
          },
        ],
      },
      {
        loseHeat: true,
        objective: 'Get out of the tank and lose the police on foot round the car park',
        say: [
          ['pip', "(jogging beside him) Walking. On a road. Legally. This is a big day for me."],
          ['pip', "Left. Through the coaches. No one ever looks between coaches."],
          ['jay', 'How do you know that?'],
          ['pip', "Junior championship, aged fourteen. I hid from my mum between coaches for an hour. She found me anyway. She marked it."],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [{ text: 'milo', message: "TEAM FIRECREST: 4 roadblocks, 1 tank, 0 Lockwoods. Subscribers: 200,000. I've had to stop counting and start estimating. Grandad says that's how history works." }],
        else: [{ text: 'milo', message: "Wall updated. Four gazebos crossed out. Grandad came in and said 'Great Scott' at the wall. He says that at most walls now." }],
      },
    ],
  });

  // =====================================================================
  // d30 — The Last Lap
  // =====================================================================
  // The endings are the `then` lists of d30's final choice (bible section 8,
  // beats-act4 "The endings"). The shared beats (Leo's statement, Ottoline's
  // arrest, Toby's box) play once in d30 before the choice (DECISIONS 14).

  /** "a film by Fenella Moss": the last caption of every ending with Take Two done. */
  const fenellaCredit = { if: 'dst4_the_big_jump', then: [{ blackout: [['caption', 'a film by Fenella Moss']] }] };

  /** Milo's line about the blog, for whichever ending: the news story, or the book in longhand. */
  const miloBlogLine = (at, cast) => ({
    if: 'dlc_blog_on',
    then: [{
      scene: { at, cast },
      say: [
        ['milo', "My last post is on the front of the Vicehaven Courier. They spelt Firecrest with two Rs. I've written to them."],
        ['milo', "Everybody's sharing it. Gran shared it four times. I think by accident. I'm counting all four."],
      ],
    }],
    else: [{
      scene: { at, cast },
      say: [
        ['milo', "(holding up a school exercise book, written to the edges) I'm writing it all down. Longhand. It's called The Firecrest Files."],
        ['milo', 'Chapter one: The Tin Man. It\'s very good. (beat) Probably.'],
      ],
    }],
  });

  /** Chet's ending: the reshoot as Mind the Road, or the shelved film and a trailer at peace. */
  const chetEndingLine = (at, cast) => ({
    if: 'dlc_chet_told',
    then: [{
      scene: { at, cast },
      say: [
        ['caption', 'A text from Chet, with a photograph: Chet in a navy knitted hat, frowning at a spanner.'],
        ['chet', "(on the phone) They're reshooting it, kid. It's called Mind the Road. I'm playing Toby."],
        ['chet', "(phone) I've got the hat. I've got the silence. I'm working on the spanners."],
      ],
    }],
    else: [{
      scene: { at, cast },
      say: [
        ['caption', 'In a trailer in Cinder Creek, a red racing jacket hangs on the back of the door. Chet Valiant watches the news with his feet up, at peace.'],
        ['chet', "(on the phone) They shelved it. The whole film. (beat) Loved it. Loved every minute. Wasn't in it. Best thing I've ever not been in."],
      ],
    }],
  });

  /** Hob's mark for the ending: a ten again with Marks Out of Ten done, otherwise the nine stands. */
  const hobEndingLine = {
    if: 'dsf4_check_ride',
    then: [{ phone: 'hob', say: [['hob', "(over an engine) Saw you on the telly, son. Ten. Again. Don't frame it. Right then."]] }],
    else: [{ phone: 'hob', say: [['hob', "(over an engine) Saw you on the telly, son. Still a nine. I'm a man of principle. (beat) A very high nine."]] }],
  };

  // ------------------------------------------------- Ending A: "Hers"
  const endingHers = [
    {
      scene: { at: 'speedway_grid', cast: ['dess', 'june', 'leo', 'pip', 'toby'] },
      say: [
        ['jay', "It's June's."],
        ['june', "(the instructor voice, because the other one has gone) I don't... I can't... It's a racing car. I hate racing cars."],
        ['dess', 'So did I, by the end. Take it anyway.'],
        ['june', '(holding the tin box very tight) Where would I even put it?'],
        ['toby', "Next to Win's shed. Where she was going in the first place. Fifty years late. (beat) Bit like me."],
        ['leo', '(quietly, to nobody) It\'ll look nice on a drive.'],
        ['caption', 'He means it.'],
        ['pip', '(to the sky, both arms up) Hell YES.'],
      ],
    },
    { fade: 'out' },
    { setTime: 12 },
    { teleport: 'june_house' },
    { blackout: [['caption', 'Six weeks later.'], ['caption', 'A Sunday. Vista Verde.']] },
    firecrest('june_house'),
    { spawnCar: 'learner', type: 'pipit', at: 'june_house', color: LEARNER_BLUE, name: "June's learner car" },
    { spawn: [friend('june', 'june_house'), friend('dess', 'june_house'), friend('pip', 'june_house'), friend('toby', 'june_house')] },
    { fade: 'in' },
    {
      camera: 'june_house', seconds: 4,
      say: [['caption', "The Firecrest on the drive beside Aunt Win's shed, flame orange in the suburban sun. The learner Pipit parked behind it, looking embarrassed."]],
    },
    {
      scene: { at: 'verde_culdesac', cast: ['june', 'dess'] },
      say: [
        ['caption', 'June Marlow is giving her seventy-nine-year-old mother a driving lesson, in the Firecrest, round the cul-de-sac.'],
        ['dess', '(pointing at a stalk) What\'s this for?'],
        ['june', "That's an indicator, Mum."],
        ['dess', "We didn't have those. We had arms."],
        ['june', 'Hands at ten and two, Mum. No, ten and two. (beat) Oh, for heaven\'s sake.'],
        ['caption', 'Dess takes the corner at the end of the cul-de-sac like it owes her money. Mr Okafor, watering his roses, does not move. He has stopped moving for this car.'],
      ],
    },
    {
      if: 'dlc_june_told',
      then: [{
        scene: { at: 'verde_culdesac', cast: ['june', 'dess'] },
        say: [
          ['caption', 'They have had weeks. They argue like they have done it forever.'],
          ['dess', '(reaching for the radio) Not that station.'],
          ['june', "It's my car."],
          ['dess', "It's MY car."],
          ['june', 'You gave it to me.'],
          ['dess', 'I gave it to you to keep, not to retune.'],
        ],
      }],
      else: [{
        scene: { at: 'verde_culdesac', cast: ['june', 'dess'] },
        say: [
          ['caption', 'It is their first week. They are careful with each other, the way you are careful with something you have only just been handed.'],
          ['june', '(writing, with a small smile) Minor fault.'],
          ['dess', '(pretending to mind) Minor what?'],
          ['june', 'Fault. You get those. Everybody gets those.'],
        ],
      }],
    },
    {
      if: 'dsl3_test_day',
      then: [{
        scene: { at: 'verde_culdesac', cast: ['june', 'dess'] },
        say: [
          ['caption', "On June's clipboard, clipped over the lesson sheet: an old test sheet with JAY MERCER at the top."],
          ['june', 'He got a 94. You can get a 94.'],
          ['dess', 'I won the Southbay 500.'],
          ['june', "Not on my course you didn't."],
        ],
      }],
    },
    {
      if: 'dlc_chet_told',
      then: [{
        camera: 'verde_culdesac', seconds: 3,
        say: [['caption', 'At the end of the road, a film crew. A clapperboard snaps: MIND THE ROAD, scene 41, take 1. Chet, in a navy knitted hat, waves at the Firecrest.']],
      }],
    },
    {
      scene: { at: 'june_house', cast: ['pip', 'toby', 'dess'] },
      say: [
        ['caption', "Pip is mowing the lawn with Win's mower, and its new, very ordinary carburettor."],
        ['pip', 'It does ELEVEN now. Eleven. I\'ve been robbed.'],
        ['caption', 'Toby is under the Firecrest\'s bonnet, only his boots showing.'],
        ['toby', "I'm fixing third gear. Fifty years. Today's the day."],
        ['dess', '(from the car, sharp) Don\'t you dare.'],
        ['toby', '(sliding back out at once) Right you are.'],
        ['caption', 'It stays unfixed forever.'],
      ],
    },
    { spawn: [friend('milo', 'june_house'), friend('prof_quill', 'june_house')] },
    {
      scene: { at: 'june_house', cast: ['milo', 'prof_quill', 'pip'] },
      say: [
        ['caption', 'Milo and the Professor come up the drive with a cake shaped like a cup. The Professor is a delicate shade of green.'],
        ['prof_quill', 'Good afternoon. (beat) Is there somewhere I could sit very still?'],
        ['milo', "He was sick in a cul-de-sac. He says it's the most suburban thing he's ever done."],
        ['prof_quill', 'It was a very clean cul-de-sac. I felt dreadful about it.'],
      ],
    },
    miloBlogLine('june_house', ['milo', 'pip']),
    {
      if: 'dlc_dash_in',
      then: [{
        scene: { at: 'june_house', cast: ['pip', 'milo'] },
        say: [
          ['caption', "Through the lounge window, Dash Lockwood's special is on the television: the first true episode in eight series."],
          ['pip', "(reading her phone) Dash texted. 'Number one. NUMBER ONE. Kit cried.'"],
          ['pip', "(reading on) Then Kit texted. 'I had something in my eye. It was the number one.'"],
        ],
      }],
      else: [{
        scene: { at: 'june_house', cast: ['pip', 'milo'] },
        say: [
          ['caption', 'On the fridge, under a magnet shaped like a lighthouse, a postcard.'],
          ['milo', "(reading it) 'No hard feelings re: everything. Dash.' (beat) 'PS: Series cancelled.'"],
          ['pip', "He'll be fine. He'll find something. Probably the wrong thing."],
        ],
      }],
    },
    chetEndingLine('june_house', ['pip', 'milo']),
    {
      scene: { at: 'june_house', cast: ['june'] },
      say: [
        ['june', '(coming up the drive, clipboard under her arm) Mr Mercer. You\'ll stay for lunch.'],
        ['jay', "I've got a car to..."],
        ['caption', 'June looks at him over the clipboard.'],
        ['jay', "I'll stay."],
      ],
    },
    { fade: 'out' },
    { text: 'leo', message: "The car is where it belongs. I've had the signs taken down. All forty. It took a week. Leo." },
    hobEndingLine,
    { fade: 'in' },
    { spawnCar: 'pip_car', type: 'drifter', at: 'june_house', color: DRIFTER_WHITE, name: "Pip's Drifter" },
    {
      scene: { at: 'june_house', cast: ['pip', 'june'] },
      say: [
        ['caption', 'After lunch. The sun has moved round to the shed.'],
        ['pip', '(dropping the Drifter\'s keys in his hand) Keep it. I\'m banned for another three months.'],
        ['pip', "And I've got a Firecrest to borrow. Sometimes. In three months. (glancing at her mother) Maybe four."],
      ],
    },
    { getIn: 'pip_car', objective: "Get in Pip's Drifter" },
    {
      goto: 'verde_culdesac', vehicle: 'pip_car', radius: 15, stop: false,
      objective: 'Drive home',
      say: [
        ['caption', 'June stands on the drive with the tin box under her arm, Dess beside her, Toby\'s boots sticking out from under the Firecrest.'],
        ['june', '(calling after him, without the clipboard) And mind the road.'],
        ['jay', '(to his car) You heard her.'],
      ],
    },
    fenellaCredit,
  ];

  // ------------------------------------------- Ending B: "Everybody's"
  const endingEverybody = [
    {
      scene: { at: 'speedway_grid', cast: ['dess', 'leo', 'monty', 'june', 'pip'] },
      say: [
        ['jay', 'It belongs to everyone who was here.'],
        ['dess', '(looking up at forty thousand people) That\'s a lot of people to give a car to.'],
        ['leo', '(after a long moment) Then it stays here. With the cup. Where everyone can see it.'],
        ['leo', "(a beat) And my father's name comes off the stand."],
        ['dess', 'Keep your name, Leo. Just put it in the right place.'],
        ['monty', "(into the microphone, which is still live) Can I say something? (beat) I've been waiting fifty years to say something."],
        ['caption', 'He doesn\'t. He just cries into the microphone, and it goes out over the whole Speedway. Nobody minds.'],
      ],
    },
    { fade: 'out' },
    { setTime: 11 },
    { blackout: [['caption', 'One month later.']] },
    { teleport: 'castellane_palace' },
    { spawn: [friend('leo', 'castellane_palace')] },
    { fade: 'in' },
    {
      scene: { at: 'castellane_palace', cast: ['leo'] },
      say: [
        ['caption', 'The Castellane Palace, Neon Strand. Leo Castellane is up a ladder in his linen suit, unbolting the gold letters of CHAMPIONS SINCE DAY ONE himself.'],
        ['caption', 'A pile of letters on the pavement. The doorman holds the ladder and looks worried about all of it.'],
        ['leo', '(climbing down, a screwdriver in his hand) Jay. Good morning. (he hands him the screwdriver) You\'ll want to keep one.'],
        ['caption', 'Jay looks at the pile, and picks up the D.'],
        ['leo', '(watching him choose) D. For Dess?'],
        ['jay', 'For driver.'],
        ['leo', "My father used to say a good story never hurt anyone. (beat) I'm going to find out what a true one does."],
      ],
    },
    { teleport: 'winners_enclosure' },
    {
      camera: 'winners_enclosure', seconds: 4,
      say: [
        ['caption', 'The Southbay Speedway. On the honours board, O. MARLOW, repainted in gold where it was painted out.'],
        ['caption', 'Beside the start-finish line a new glass room: the Firecrest inside, the real Mariner Cup on a plinth by her front wheel. On the main stand, new letters: THE MARLOW STAND.'],
        ['caption', 'Kids press their noses to the glass.'],
      ],
    },
    {
      spawn: [
        friend('dess', 'winners_enclosure'), friend('june', 'winners_enclosure'), friend('pip', 'winners_enclosure'), friend('toby', 'winners_enclosure'),
        friend('monty', 'winners_enclosure'), friend('prof_quill', 'winners_enclosure'), friend('milo', 'winners_enclosure'),
      ],
    },
    {
      scene: { at: 'winners_enclosure', cast: ['monty', 'prof_quill', 'milo', 'dess'] },
      say: [
        ['monty', '(with a ribbon and a giant pair of scissors) Ladies and gentlemen, our guest of honour, Dess Marlow!'],
        ['monty', 'And the man who drove her: Jay Mercer! (beat, to himself) Twice. Twice in a row.'],
        ['monty', 'And the scholar who found the... Professor Ambrose... Quilt. Quill. QUILL. (beat) Thirty years, folks. I was on a roll.'],
        ['caption', 'Snip. The ribbon falls. The Professor draws a velvet cloth off a brass plaque by the glass.'],
        ['milo', '(reading it aloud) "She won. She hid it. We found it. Mind the road."'],
        ['prof_quill', 'Four sentences. I wrote three books, and he wrote four sentences, and his are better.'],
        ['milo', "Yours had footnotes, Grandad. Footnotes are very hard."],
      ],
    },
    miloBlogLine('winners_enclosure', ['milo', 'prof_quill']),
    {
      if: 'dlc_dash_in',
      then: [{
        scene: { at: 'winners_enclosure', cast: ['milo'] },
        say: [
          ['caption', "On the big screen, Dash Lockwood's special: LEGEND... FOUND. In the crowd, Dash watches himself, and his face crumples."],
          ['dash', "(sniffing, to Kit) I'm not crying, Kit. It's humid."],
          ['milo', "That's MY line."],
          ['kit', "(filming him) We're rolling."],
        ],
      }],
      else: [{
        camera: 'winners_enclosure', seconds: 3,
        say: [['caption', 'At the back of the crowd, Dash Lockwood, not filming, for once. His hat in his hands.']],
      }],
    },
    {
      if: 'dsr4_southbay_classic',
      then: [{
        camera: 'southbay_speedway', seconds: 3,
        say: [['caption', 'On the oval, the parade lap: Pip and Teddy Castellane side by side at the front, a white Drifter and a gold Zephyr, nobody leading.']],
      }],
    },
    {
      if: 'dsf4_check_ride',
      then: [{
        camera: 'southbay_speedway', seconds: 3,
        say: [['caption', 'Overhead, a yellow Skylark drags a banner across the sky, the right way up. It says TEN.']],
      }],
    },
    {
      if: 'dlc_june_told',
      then: [{
        scene: { at: 'winners_enclosure', cast: ['june', 'dess'] },
        say: [
          ['june', '(at the glass, beside her mother) She needs a wash.'],
          ['dess', "She's had fifty years in a cave. She's allowed to be dusty."],
          ['june', "It's a glass room, Mum. People can SEE her."],
          ['dess', "(to Jay) She's been like this since she was born. I'm told."],
        ],
      }],
      else: [{
        scene: { at: 'winners_enclosure', cast: ['june', 'dess'] },
        say: [
          ['caption', 'June stands a step behind her mother, still new at it, the tin box held in both hands.'],
          ['caption', 'Dess reaches back without looking, and June takes her hand.'],
        ],
      }],
    },
    chetEndingLine('winners_enclosure', ['pip', 'milo']),
    hobEndingLine,
    {
      scene: { at: 'winners_enclosure', cast: ['dess'] },
      say: [
        ['caption', 'A small girl presses her hands and nose to the glass, staring at the Firecrest as if it might start by itself.'],
        ['caption', "Dess crouches beside her, stiffly, and puts the girl's hands on an imaginary wheel."],
        ['caption', 'Jay watches, and for a second looks like a boy of six.'],
        ['dess', 'Hands at ten and two, and mind the road.'],
      ],
    },
    fenellaCredit,
  ];

  // ---------------------------------------------- Ending C: "Gone Again"
  const endingGone = [
    {
      scene: { at: 'speedway_grid', cast: ['dess', 'leo', 'pip', 'milo', 'toby'] },
      say: [
        ['jay', 'Hide it again. Lay a new trail.'],
        ['caption', 'Dess Marlow grins slowly, and for the first time looks her age minus fifty.'],
        ['dess', "Now you're talking."],
        ['pip', 'We just FOUND it!'],
        ['dess', 'And now everybody knows who won. The car doesn\'t have to prove anything to anybody. It can go and have fun.'],
        ['caption', 'Leo opens his mouth, and closes it, and finally laughs.'],
        ['leo', "Then I'll see it on the news."],
        ['milo', '(hand up, like in class) Can I write the first riddle? Please. I\'ve been practising since the water tower.'],
        ['dess', "You'd better be good."],
        ['milo', "I'm very good. (beat) Probably."],
        ['toby', '(quietly) And this time I\'m delivering it. Myself. On the day.'],
      ],
    },
    { fade: 'out' },
    { setTime: 23 },
    firecrest('speedway_pits'),
    { spawn: [friend('dess', 'speedway_pits')] },
    { fade: 'in' },
    {
      camera: 'southbay_speedway', seconds: 3,
      say: [['caption', 'Eleven at night. The stands empty. The floodlights going off one by one.']],
    },
    { join: ['dess'] },
    { getIn: 'firecrest', objective: 'Take her out the back way. Lights off' },
    { music: 'tension' },
    {
      goto: 'speedway_back_gate', vehicle: 'firecrest', radius: 10, stop: false,
      objective: 'Out through the service gate',
      say: [
        ['dess', "Don't tell me where we're going. I'll only tell Toby."],
        ['jay', "I don't know where we're going."],
        ['dess', "Good. That's how you hide something. Nobody knows, including you."],
      ],
    },
    {
      goto: 'coast_road', vehicle: 'firecrest', radius: 25, stop: false,
      objective: "Somewhere nobody's told",
      say: [
        ['dess', "You're a good driver, Jay. You'd have been a terrible racer."],
        ['jay', 'Why?'],
        ['dess', "You don't care who's behind you. Racers can't think about anything else."],
        ['caption', 'Into third. It sticks, one last time, and comes free.'],
        ['dess', '(fond) There she is.'],
        ['jay', '(to the car) One more trip. Then you can rest.'],
        ['dess', "She doesn't rest. She waits."],
      ],
    },
    { music: 'off' },
    {
      blackout: [
        ['caption', 'Somewhere nobody was told.'],
        ['caption', 'Dess takes seven new parts off the Firecrest, one at a time, and doesn\'t say what any of them are.'],
        ['toby', '(holding the torch) Hell\'s bells. We\'re doing it again.'],
        ['dess', "We're doing it properly this time. You're delivering."],
        ['toby', "(a long silence) I'll deliver."],
        ['caption', 'In the torchlight, Milo, cross-legged on an upturned crate, writes in a notebook, crosses out, writes again.'],
      ],
    },
    { setTime: 10 },
    { teleport: 'halcyon_library' },
    { spawn: [friend('toby', 'halcyon_library')] },
    {
      scene: { at: 'halcyon_library', cast: ['toby'] },
      say: [
        ['caption', 'The Halcyon library. Toby Brask walks up the steps with a new tin box under his arm and hands it in at the desk himself.'],
        ['caption', 'On the lid, in his square engineer\'s capitals: FOR WHOEVER ASKS. The librarian puts it on the shelf behind her, where everyone can see it.'],
        ['toby', '(coming back down the steps, lighter) Delivered. On time, this time.'],
        ['jay', 'How do you know?'],
        ['toby', "Because nobody's asked yet."],
      ],
    },
    {
      if: 'dlc_dash_in',
      then: [{
        scene: { at: 'halcyon_library', cast: ['toby'] },
        say: [
          ['caption', 'Dash Lockwood and Kit are already on the library steps, camera up.'],
          ['dash', 'Viewers... SERIES NINE!'],
          ['kit', "We haven't been commissioned."],
          ['dash', 'Series nine, PROBABLY.'],
        ],
      }],
      else: [{
        camera: 'cinder_water_tower', seconds: 3,
        say: [['caption', 'Far away in Cinder Creek, a man in an explorer\'s hat is at the top of the water tower with a spanner, following the new clue entirely the wrong way.']],
      }],
    },
    { text: 'leo', message: "The fort is empty on every channel. I find I don't mind. I've taken the signs down. Leo." },
    {
      if: 'dsf4_check_ride',
      then: [{ phone: 'hob', say: [['hob', 'Heard about the getaway, son. Ten. Again. For the getaway. Right then.']] }],
      else: [{ phone: 'hob', say: [['hob', "Heard about the getaway, son. Still a nine. I'm a man of principle. Getaways don't count. (beat) It was a good getaway."]] }],
    },
    { spawn: [friend('milo', 'halcyon_library')] },
    miloBlogLine('halcyon_library', ['toby', 'milo']),
    chetEndingLine('halcyon_library', ['toby', 'milo']),
    {
      scene: { at: 'halcyon_library', cast: ['toby', 'milo'] },
      say: [
        ['caption', 'Toby sits down on the library steps in the sun and does nothing at all, for the first time in thirty-four years.'],
        ['milo', "(sitting beside him) Did you know nobody's ever asked for anything at that desk on a Sunday? I checked. (beat) It might take a while."],
        ['toby', "(pulling his cap down over his eyes) I'm good at a while, son."],
      ],
    },
    { setTime: 22 },
    {
      if: 'dlc_june_told',
      then: [{
        blackout: [
          ['caption', 'Later. Somewhere dark. Two torches.'],
          ['caption', 'June and Dess, hiding the last part together, laughing in the dark like girls.'],
          ['june', 'Not THERE, Mum.'],
          ['dess', 'Why not?'],
          ['june', "Because it's obvious."],
          ['dess', "It's obvious to YOU. You're a Marlow."],
        ],
      }],
      else: [
        { teleport: 'fort_light' },
        { spawn: [friend('june', 'fort_light'), friend('dess', 'fort_light')] },
        { camera: 'marina_lighthouse', seconds: 3, say: [['caption', 'Ten at night. The Coral Marina light, turning.']] },
        {
          camera: 'paloma_fort', seconds: 4,
          say: [['caption', 'On the wall of the Paloma fort, two women, not talking much. June has come to the fort for the first time.']],
        },
        {
          scene: { at: 'fort_light', cast: ['june', 'dess'] },
          say: [
            ['caption', 'At ten the fort light flashes three times. Across the bay, the Coral Marina light flashes back.'],
            ['june', "Who's that?"],
            ['dess', 'The other keeper. Saying goodnight.'],
          ],
        },
      ],
    },
    {
      blackout: [
        ['caption', 'Halcyon. A bedroom, a torch, a notebook. Milo Quill, reading the first riddle of the new trail aloud, to whoever is twelve next.'],
        ['milo', 'Wide as a house and white as a sheet,'],
        ['milo', "I've never had a single seat."],
        ['milo', 'Come after dark and dim your light;'],
        ['milo', 'I tell the stars a tale each night.'],
        ['milo', '...And mind the road.'],
      ],
    },
    fenellaCredit,
  ];

  D.missions.push({
    id: 'd30_the_last_lap',
    act: 4,
    title: 'The Last Lap',
    giver: 'dess',
    start: 'paloma_fort',
    time: 15,
    estMinutes: 18,
    summary: 'Fifty years ago Dess Marlow won the Southbay 500 and never got her lap of honour. Today she does.',
    reward: { money: 25000 },
    failIf: ['wrecked:firecrest', 'dead:dess'],
    steps: [
      { music: 'off' },
      { blackout: [['caption', 'The 50th anniversary Southbay 500.'], ['caption', "Three o'clock. Forty thousand people. Ten laps to go."]] },
      {
        camera: 'southbay_speedway', seconds: 5,
        say: [
          ['caption', 'Every seat full. CASTELLANE banners on every stand. A gold works Zephyr leads the field into turn one.'],
          ['monty', "(on the PA) ...and it's lap ninety, folks, ninety of a hundred, and it's Castellane, Castellane, Castellane, as the founder intended..."],
          ['monty', "(PA) ...and on the podium already, in the red jacket, it's Chet Valiant, here for the film! Loved the first one, Chet!"],
        ],
      },
      firecrest('powder_store'),
      { spawn: [friend('dess', 'powder_store'), friend('pip', 'powder_store')] },
      {
        if: 'dlc_june_told',
        then: [
          { spawn: [friend('june', 'powder_store')] },
          {
            scene: { at: 'powder_store', cast: ['dess', 'june', 'pip'] },
            say: [
              ['caption', "The powder store. Dess Marlow in her old racing helmet, the one June kept in the shed for forty years and gave back on the fort steps."],
              ['caption', 'The real Mariner Cup, O. MARLOW engraved on its side, in her lap.'],
              ['pip', "Toby went at noon. With the tin box. I gave it to him. He said he's got a delivery to make."],
              ['pip', 'He said it like a man in a film.'],
              ['dess', "(to Jay) You drive. I've not driven a race for fifty years, and I've never driven on a road with a roundabout. I'll do the end."],
              ['caption', 'June gets into the passenger seat, out of habit, clipboard and all. Dess climbs into the back with the cup.'],
              ['jay', "Your mother's in the back, June."],
              ['june', '(not missing a beat) Mirror, signal.'],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'powder_store', cast: ['dess', 'pip'] },
            say: [
              ['caption', "The powder store. Dess Marlow in an old keeper's cap, the real Mariner Cup in her hands, O. MARLOW engraved on its side."],
              ['pip', "Toby went at noon. With the tin box. I gave it to him. He said he's got a delivery to make."],
              ['pip', 'He said it like a man in a film.'],
              ['pip', "Gran, where's your helmet? You should have a helmet."],
              ['dess', "(a look at Jay) My helmet's with someone. Let's go and get it."],
              ['dess', "(to Jay) You drive. I've not driven a race for fifty years, and I've never driven on a road with a roundabout. I'll do the end."],
              ['caption', "She gets into the passenger seat and puts the cup on her knee, exactly as she drove out of the Speedway fifty years ago."],
            ],
          },
        ],
      },
      {
        if: 'dsr4_southbay_classic',
        then: [
          { spawn: [friend('teddy', 'paloma_fort_gate')] },
          {
            scene: { at: 'paloma_fort_gate', cast: ['pip', 'teddy', 'dess'] },
            say: [
              ['caption', "At the fort gate: Pip's spare white Drifter, and beside it a gold Castellane Racing Zephyr with Teddy Castellane leaning on the door."],
              ['pip', "(pulling on gloves) Castellane closed every road for a race. A road closed for a race is a racetrack. I've got my racing licence back. I'm LEGAL."],
              ['dess', '(to Jay, under her breath) She gets that from me.'],
              ['pip', 'Teddy, stay on her left. Anything teal comes near her, you lean on it.'],
              ['teddy', 'Copy. (beat, to Dess) Sorry about my uncle. And my grandad. And, you know. All of it.'],
              ['dess', "(looking him up and down) You drive a good line, I'm told. Do that and we're square."],
            ],
          },
          { leave: ['pip', 'teddy'], vanish: true },
          { spawnCar: 'pip_spare', type: 'drifter', at: 'paloma_fort_gate', color: DRIFTER_WHITE, name: "Pip's spare Drifter" },
          { spawnCar: 'castellane_racer', type: 'zephyr', at: 'paloma_fort_gate', color: CASTELLANE_GOLD, name: "Teddy's Zephyr" },
          {
            spawn: [
              { id: 'pip_guard', char: 'pip', at: 'pip_spare', behavior: 'drive', car: 'pip_spare', to: 'firecrest', hostile: false, health: 600 },
              { id: 'teddy_guard', char: 'teddy', faction: 'castellane_racing', at: 'castellane_racer', behavior: 'drive', car: 'castellane_racer', to: 'firecrest', hostile: false, health: 600 },
            ],
          },
        ],
        else: [
          {
            scene: { at: 'powder_store', cast: ['pip', 'dess'] },
            say: [
              ['pip', '(climbing into the back) Back seat. Fine. (settling in) Best seat in history.'],
              ['dess', 'It is, you know. I sat in it once. Watched your great-aunt drive me to a dance. Terrible driver. Lovely woman.'],
            ],
          },
        ],
      },
      // Seats: June in front with told (Dess in the back with the cup),
      // otherwise Dess in front; Pip in the back unless she's driving guard.
      {
        if: 'dlc_june_told',
        then: [{ join: ['june'] }, { protect: 'june' }, { join: ['dess'] }],
        else: [{ join: ['dess'] }],
      },
      {
        if: 'dsr4_southbay_classic',
        then: [{ protect: 'pip_guard' }],
        else: [{ join: ['pip'] }, { protect: 'pip' }],
      },
      {
        getIn: 'firecrest', objective: 'Take her to the Speedway',
        say: [
          ['caption', 'The engine catches first time.'],
          ['dess', 'Third gear sticks.'],
          ['jay', 'I know.'],
        ],
      },
      { music: 'action', checkpoint: true },
      gsCar('gs_car1', 'old_lanes'),
      gsCar('gs_car2', 'old_lanes'),
      gsCar('gs_car3', 'neon_strand'),
      gsCar('gs_car4', 'neon_strand'),
      gsSuv('gs_suv', 'paloma_fort_gate'),
      {
        spawn: [
          gunDriver('gs_driver1', 'gs_car1', 'gs_car1', 'firecrest'),
          gunDriver('gs_driver2', 'gs_car2', 'gs_car2', 'firecrest'),
          gunDriver('gs_driver3', 'gs_car3', 'gs_car3', 'firecrest'),
          gunDriver('gs_driver4', 'gs_car4', 'gs_car4', 'firecrest'),
          { id: 'ottoline', char: 'ottoline', faction: 'guest_services', at: 'gs_suv', behavior: 'drive', car: 'gs_suv', to: 'firecrest', hostile: false },
        ],
      },
      {
        say: [
          ['caption', "The keeper's shortwave crackles in Dess's lap."],
          ['ottoline', "(shortwave, calm) Good afternoon, Mrs Marlow. We'd like to assist you back to your lighthouse."],
          ['dess', '(into the handset) No, thank you, dear. I\'ve been. (she switches it off)'],
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [{
          goto: 'castellane_palace', vehicle: 'firecrest', radius: 25, stop: false,
          objective: 'Up the Neon Strand',
          say: [
            ['dess', '(as the island goes by) That was a fish market. Now it\'s a hotel. That was a better hotel. Now it\'s a worse hotel.'],
            ['caption', 'Overhead, a purple helicopter wobbles into view, a camera hanging out of the door.'],
            ['dash', "(on the car radio, live) Viewers, VICEHAVEN! This is Dash Lockwood, flying cover. I've had a lesson."],
            ['dash', '(radio) Well. I\'ve watched a lesson.'],
            ['hob', '(on the same channel, from the Paloma Field radio hut) That wobble was a four, Lockwood.'],
            ['dash', "(radio) Who's that? Who's MARKING me?"],
            ['hob', '(radio) Three. You took your hand off to wave.'],
            ['dess', 'I like him. The marking one.'],
          ],
        }],
        else: [{
          goto: 'castellane_palace', vehicle: 'firecrest', radius: 25, stop: false,
          objective: 'Up the Neon Strand',
          say: [
            ['dess', '(as the island goes by) That was a fish market. Now it\'s a hotel. That was a better hotel. Now it\'s a worse hotel.'],
            ['dess', 'That was a dance hall. I won a jive contest there. Don\'t tell anyone, it\'s bad for my image.'],
            ['jay', "You've been dead fifty years. What image?"],
            ['dess', 'A very mysterious one.'],
            ['caption', 'Teal cars in the mirror, closing.'],
            ['dess', "Here they come. Don't look at them. Look where you're going. They're only interesting if you're scared of them."],
          ],
        }],
      },
      {
        camera: 'castellane_palace', seconds: 3,
        say: [
          ['caption', 'The Castellane Palace. CHAMPIONS SINCE DAY ONE, three metres high, in gold neon.'],
          ['dess', 'Not for long.'],
        ],
      },
      {
        goto: 'bridge_island_end', vehicle: 'firecrest', radius: 30, stop: false,
        objective: 'Onto the Paloma Bridge',
        say: [
          ['dess', "Fifty years ago I took this car across the bay on the night ferry. In the rain. Under a tarpaulin. Toby cried."],
          ['jay', 'He does that.'],
          ['dess', '(fondly) He always did. Never where you could see.'],
        ],
      },
      {
        if: 'dsf4_check_ride',
        then: [{
          camera: 'bridge_island_end', seconds: 3,
          say: [
            ['caption', "Low over the bridge, Hob's yellow Skylark, towing a banner in big red letters: SHE WON."],
            ['hob', "(on the radio) Banner's the right way up today. Don't tell anyone."],
          ],
        }],
        else: [{
          say: [
            ['hob', "(on the radio, from the field) Can't fly today, son, the Skylark's having her check. I'll be listening."],
            ['hob', "(radio) I'll be marking."],
          ],
        }],
      },
      {
        goto: 'bridge_mainland', vehicle: 'firecrest', radius: 25, stop: false,
        objective: 'Over the Paloma Bridge',
        say: [
          ['caption', 'Halfway over, the whole bay opens up: the Coral Marina light at one end, the fort light at the other.'],
          ['dess', 'Look at that. Both of them. You can only see them together from the middle.'],
          ['jay', "That's what Toby said."],
          ['dess', '(a beat) He would.'],
          ['caption', 'A teal Sovereign comes up fast on the outside.'],
          ['dess', "He's going to try and lean on you at the end of the bridge. Let him. Then don't be there."],
        ],
      },
      {
        goto: 'harbor_roadblock', vehicle: 'firecrest', radius: 25, stop: false,
        objective: 'Through Harbor Point, down Seawall Drive',
        say: [
          ['caption', 'The old city: the boardwalk, the art-deco hotels, people turning on the pavement to watch an orange car go by with half of Guest Services behind it.'],
          ['dess', 'This was all hotels when I was a girl. Different hotels. Same seagulls.'],
          ['caption', 'A Sovereign rams the back wing. The cup rattles.'],
          ['dess', "They never could take a corner, Castellanes. Rex used to brake for the view."],
          ['jay', "(to the car, as the tail steps out) Damn. Easy. I've got you."],
          ['dess', "She knows. She's just showing off. She's been in a cave for fifty years."],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          { spawn: [fans('coast_road', 24)] },
          {
            say: [
              ['caption', 'The coast road is lined with people. Hundreds of them, on walls and car roofs, in orange T-shirts, with home-made signs.'],
              ['caption', 'SHE WON. MIND THE ROAD. GO JAY. One that just says JAY? in case Monty gets it wrong.'],
              ['caption', 'As the Firecrest goes by they close the road behind her, arms linked, and two teal Sovereigns stand on their brakes and stop dead.'],
            ],
          },
          { leave: ['gs_driver3', 'gs_driver4'], vanish: true },
          { text: 'milo', message: '400,000.' },
          { text: 'milo', message: "That's more than the Speedway. That's ten Speedways. I'm in the grandstand. I can SEE you." },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', "Did you know the grandstand holds forty thousand and I'm in seat 14, row F? I'm holding up the scoreboard."],
              ['milo', "Team Firecrest: seven parts, one car, one Gran. Lockwood: a tap, a spur, a minute hand, a gnome and a teddy."],
              ['milo', "Nobody can see it. It's A4. (beat) It's still true."],
              ['jay', 'Hold it up anyway.'],
              ['milo', "I am. Grandad's holding my other arm up so I don't get tired."],
            ],
          },
        ],
      },
      {
        if: 'dlc_chet_told',
        then: [{
          deliver: 'firecrest', to: 'speedway_tunnel', maxDamage: 0.75, radius: 20, stop: false,
          objective: 'Down the coast road and into the Speedway tunnel',
          say: [
            ['dess', 'Last lap, fifty years ago. Rex had the inside. I had the outside and a better reason.'],
            ['jay', 'What reason?'],
            ['dess', "(a glance back at June) Somebody at home who'd want to know I won."],
            ['chet', "(on the car radio, from the Speedway) Hello? This is Chet Valiant. I'm not supposed to be up here."],
            ['chet', "(radio) Monty's let me have the microphone, because I told him I'd cry if he didn't. I would have. I'm very good at it."],
            ['dess', '(to June) Is that the film star?'],
            ['june', "Mum, I have no idea who anybody is any more. Mirror, Mr Mercer."],
            ['dess', 'Still in my helmet, I was, when I came out of that tunnel with the cup. Win was going to cook.'],
            ['caption', 'Ahead: the Bowl, the stands, the noise. The mouth of the tunnel under the main stand.'],
          ],
        }],
        else: [{
          deliver: 'firecrest', to: 'speedway_tunnel', maxDamage: 0.75, radius: 20, stop: false,
          objective: 'Down the coast road and into the Speedway tunnel',
          say: [
            ['dess', 'Last lap, fifty years ago. Rex had the inside. I had the outside and a better reason.'],
            ['jay', 'What reason?'],
            ['dess', "Somebody at home who'd want to know I won. (beat) She was one. She didn't care."],
            ['dess', 'Still in my helmet, I was, when I came out of that tunnel with the cup on this seat. Win was going to cook.'],
            ['jay', 'What was she cooking?'],
            ['dess', '(a long beat) I never found out. (beat) Drive faster, Jay. I\'m getting sentimental.'],
            ['caption', 'Ahead: the Bowl, the stands, the noise. The mouth of the tunnel under the main stand.'],
          ],
        }],
      },
      {
        camera: 'speedway_tunnel', seconds: 4,
        say: [['caption', 'The Firecrest dives into the Speedway tunnel. The roar of forty thousand people comes down it like weather.']],
      },
      {
        if: 'dlc_dash_in',
        then: [
          {
            say: [
              ['caption', 'Behind her, as the last teal car reaches the tunnel, four police cars swing across its mouth. They have been watching Dash Lockwood\'s live broadcast for twenty minutes.'],
              ['caption', "The Guest Services cars stop. Ottoline's Tern is boxed in by two patrol cars and goes nowhere at all."],
            ],
          },
          { leave: ['gs_driver1', 'gs_driver2', 'gs_driver3', 'gs_driver4'], vanish: true },
        ],
        else: [
          {
            say: [
              ['caption', "A marshal's tractor rolls across the tunnel behind the Firecrest. Ottoline's Tern stalls against its back wheel, and blue lights pull up behind her."],
              ['caption', 'But two teal Sovereigns squeeze past the tractor and come out onto the infield grass after the orange car.'],
            ],
          },
          { leave: ['gs_driver3', 'gs_driver4'], vanish: true },
          {
            destroy: ['gs_car1', 'gs_car2'],
            objective: 'Two of them followed you in. Stop them before the last lap',
            say: [
              ['monty', "(PA) There's a fight in the infield! There's a classic car in a fight in the infield!"],
              ['monty', "(PA) Folks, I've called a lot of races. I've never called this."],
              ['caption', 'Up in the grandstand, Dash Lockwood stops presenting in the middle of a sentence and stares.'],
              ['dess', "(holding the cup on with both arms) Don't spill me, Jay."],
            ],
          },
        ],
      },
      {
        scene: { at: 'speedway_tunnel', cast: ['ottoline', 'officer'] },
        say: [
          ['caption', "In the tunnel mouth, Ottoline Graves stands beside her Tern in handcuffs, perfectly composed, a printed card between two fingers that she never gets to hand over."],
          ['caption', 'It reads: How would you rate your arrest today? 1 to 5.'],
          ['officer', '(looking at the blazer) Are you in the band?'],
          ['ottoline', "I'm afraid I'm the manager."],
          ['caption', 'She is put in the back of a police car, under arrest. She does not look back.'],
        ],
      },
      { leave: ['ottoline', 'officer'], vanish: true },
      { spawnCar: 'field1', type: 'zephyr', at: 'speedway_grid', color: CASTELLANE_GOLD },
      { spawnCar: 'field2', type: 'zephyr', at: 'speedway_turn1', color: CASTELLANE_GOLD },
      { spawnCar: 'field3', type: 'vireo', at: 'speedway_back_straight', color: 0x2a55d8 },
      { spawnCar: 'field4', type: 'drifter', at: 'speedway_turn3', color: 0xf2f2ee },
      {
        spawn: [
          driver('field_driver1', 'field1', 'field1', 'speedway_turn1', 'castellane_racing'),
          driver('field_driver2', 'field2', 'field2', 'speedway_back_straight', 'castellane_racing'),
          driver('field_driver3', 'field3', 'field3', 'speedway_turn3', 'castellane_racing'),
          driver('field_driver4', 'field4', 'field4', 'speedway_grid', 'castellane_racing'),
        ],
      },
      { music: 'tension' },
      {
        say: [
          ['caption', 'In the mouth of the tunnel, the field slowing on the main straight under a yellow flag. The crowd going quiet, row by row, as they see her.'],
        ],
      },
      {
        if: 'dlc_june_told',
        then: [
          {
            say: [
              ['jay', '(to the back seat, not turning round) My nana told me about you when I was six. She said you drove into the night and nobody ever saw you again.'],
              ['jay', 'I asked where you went. She said somewhere you could see the sea.'],
              ['jay', "She said some stories aren't finished. They're just waiting for a driver."],
              ['jay', '(hands at ten and two) So. Let\'s finish it.'],
            ],
          },
          { blackout: [['nana_lu', "Some stories aren't finished, Jay. They're just waiting for a driver."]] },
        ],
        else: [
          {
            say: [
              ['caption', 'Jay says nothing at all. He waits, hands on the wheel, engine ticking over.'],
              ['dess', "(after a while) Well? It's a race. Drive it."],
            ],
          },
        ],
      },
      {
        say: [
          ['caption', 'Dess leans over and taps the steering wheel three times.'],
          ['dess', 'Right.'],
        ],
      },
      { music: 'triumph' },
      {
        if: 'dlc_chet_told',
        then: [{
          goto: 'speedway_turn1', vehicle: 'firecrest', radius: 22, stop: false,
          objective: 'One lap. Her lap',
          say: [
            ['monty', "(PA) ...and there's a car coming out of the tunnel, folks, an orange car, an OLD orange car, and it's... it's Joe Mercury! Jake Murphy! It's..."],
            ['chet', '(PA, beside him in the commentary box) Monty. Let me.'],
            ['chet', '(PA) Fifty years ago a mechanic\'s daughter called Dess Marlow won this race by a car\'s length.'],
            ['chet', "(PA) I know, because I've been paid to say she didn't. I've been wearing the other fella's jacket all summer."],
            ['chet', '(PA, his voice going) She did. That\'s her. In the orange car.'],
            ['chet', "(PA) Somebody give her a round of applause. I've only got two hands."],
            ['caption', 'Forty thousand people stand up.'],
          ],
        }],
        else: [
          {
            goto: 'speedway_turn1', vehicle: 'firecrest', radius: 22, stop: false,
            objective: 'One lap. Her lap',
            say: [
              ['monty', "(PA) ...and there's a car coming out of the tunnel, folks, an orange car, an OLD orange car, and it's... it's Joe Mercury! Jake Murphy! It's..."],
              ['monty', '(PA, suddenly quiet, off the script, into the microphone) I was eight. I was on my dad\'s shoulders.'],
              ['caption', 'The field pulls to the outside, car by car, to let her through. A gold works Zephyr flashes its lights.'],
            ],
          },
          {
            camera: 'winners_enclosure', seconds: 3,
            say: [['caption', "On the podium, Chet Valiant in Rex Castellane's red jacket hears it. He takes the jacket off, folds it, and lays it on the step."]],
          },
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [{
          goto: 'speedway_back_straight', vehicle: 'firecrest', radius: 22, stop: false,
          objective: 'One lap. Her lap',
          say: [
            ['caption', 'Over the back straight a purple helicopter hangs, crooked, a microphone held out of the door.'],
            ['dash', '(radio, live, at the top of his voice) Legend... FOUND!'],
            ['dash', "(off camera, much quieter) Kit. Kit, that's the right one. I said it about the RIGHT ONE."],
            ['kit', "We're rolling."],
            ['hob', '(radio) Your hover\'s a five, Lockwood. Your moment\'s a ten.'],
          ],
        }],
        else: [
          {
            camera: 'southbay_speedway', seconds: 2,
            say: [['caption', "In the grandstand, Dash Lockwood, presenting Castellane's version live, sees the car, stops talking, and turns his camera round to film it. He keeps filming."]],
          },
          {
            goto: 'speedway_back_straight', vehicle: 'firecrest', radius: 22, stop: false,
            objective: 'One lap. Her lap',
            say: [
              ['pip', '(on the radio, or from the back, either way at the top of her voice) GO ON, GRAN!'],
              ['dess', "(to Jay, flat calm) Don't listen to her. Listen to the car."],
            ],
          },
        ],
      },
      {
        if: 'dsf4_check_ride',
        then: [
          {
            camera: 'southbay_speedway', seconds: 3,
            say: [['caption', 'Over the stands, a yellow Skylark trails its banner across the sky: SHE WON. Forty thousand people read it at once.']],
          },
          { if: 'dst4_the_big_jump', then: [{ camera: 'speedway_pits', seconds: 2, say: [['caption', 'On the pit wall, Fenella Moss stands on a crate with a megaphone and three cameras rolling. It\'s for the movie.']] }] },
          {
            goto: 'speedway_turn3', vehicle: 'firecrest', radius: 22, stop: false,
            objective: 'One lap. Her lap',
            say: [
              ['dess', '(watching the banner go over) That Hob. Twenty years of doughnuts and he never asked me one question.'],
              ['jay', 'He knew.'],
              ['dess', 'Course he knew. Good manners, that is.'],
            ],
          },
        ],
        else: [
          { if: 'dst4_the_big_jump', then: [{ camera: 'speedway_pits', seconds: 2, say: [['caption', 'On the pit wall, Fenella Moss stands on a crate with a megaphone and three cameras rolling. It\'s for the movie.']] }] },
          {
            goto: 'speedway_turn3', vehicle: 'firecrest', radius: 22, stop: false,
            objective: 'One lap. Her lap',
            say: [
              ['monty', "(PA) Folks, I've got a gentleman here from the Paloma Flying Club who says he has to say one thing. One thing, Hob."],
              ['hob', '(PA, over the whole Speedway) Nine. Don\'t let it go to your head.'],
              ['dess', '(delighted) Who was THAT?'],
              ['jay', 'Hob. He marks things.'],
            ],
          },
        ],
      },
      {
        goto: 'speedway_grid', vehicle: 'firecrest', radius: 22, stop: false,
        objective: 'Bring her home',
        say: [
          ['monty', "(PA, at full speed) ...and into the last bend, and the whole field's let her by, and it's... it's..."],
          ['monty', "(PA) It's JAY MERCER! It's Jay Mercer in the Firecrest!"],
          ['caption', 'The crowd picks it up, all of it, all round the bowl: JAY! MER-CER! JAY! MER-CER!'],
          ['jay', "(to the car) Don't let it go to your head."],
        ],
      },
      {
        slowmo: 3,
        say: [
          ['caption', 'The Firecrest crosses the line. Fifty years late. Nobody in the Speedway is sitting down.'],
          ['monty', '(PA, gone soft) I was eight. I was on my dad\'s shoulders. I saw her cross that line.'],
          ['monty', '(PA, a beat) Ladies and gentlemen, the winner of the Southbay 500: Dess Marlow.'],
        ],
      },
      { music: 'hope' },
      { spawn: [friend('leo', 'speedway_grid'), friend('monty', 'speedway_grid'), friend('toby', 'speedway_grid'), friend('milo', 'speedway_grid'), friend('prof_quill', 'speedway_grid')] },
      {
        scene: { at: 'speedway_grid', cast: ['dess', 'leo', 'monty'] },
        say: [
          ['caption', 'Leo Castellane comes down from his box onto the track. Alone. No staff, no blazers. He stops in front of Dess.'],
          ['leo', '(quietly, to her) He told me it was a good story. He said nobody gets hurt by a good story.'],
          ['dess', 'Somebody always does. Usually somebody small.'],
          ['caption', 'Leo holds out his hand to Monty. Monty gives him the microphone.'],
          ['leo', '(on the PA, steady) The winner of the Southbay 500, fifty years ago today, was Odessa Marlow.'],
          ['leo', '(PA) My father knew. I knew. I\'m sorry.'],
          ['caption', 'Silence. Then the stands.'],
          ['caption', 'Behind the infield fence, a police car rolls slowly past. The back window winds down.'],
          ['ottoline', "(from the back seat, through the window) Mr Castellane, I'd like to register a—"],
          ['leo', 'OTTOLINE.'],
          ['caption', 'The window goes up.'],
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [{
          scene: { at: 'speedway_grid', cast: ['dess', 'pip'] },
          say: [
            ['caption', 'Jay takes the blank comment card out of his shirt pocket, writes on it against the Firecrest\'s roof, and as the police car goes by tucks it under its wiper.'],
            ['caption', 'One star. Staff were very attentive.'],
            ['dash', '(landed, badly, on the infield, reading it over the bonnet, live) Viewers... (beat) ...one star.'],
          ],
        }],
        else: [{
          scene: { at: 'speedway_grid', cast: ['dess', 'pip'] },
          say: [
            ['caption', 'Jay takes the blank comment card out of his shirt pocket, writes on it against the Firecrest\'s roof, and as the police car goes by tucks it under its wiper.'],
            ['caption', 'One star. Staff were very attentive.'],
            ['caption', 'Pip reads it over his shoulder and laughs until she has to sit down on the kerb.'],
            ['pip', '(from the kerb) ATTENTIVE.'],
          ],
        }],
      },
      {
        if: 'dlc_june_told',
        then: [{
          scene: { at: 'speedway_grid', cast: ['dess', 'june', 'toby'] },
          say: [
            ['caption', 'June gets out of the Firecrest and helps her mother out of the back, cup and all. They stand on the line together.'],
            ['dess', '(to June\'s face) And mind the road.'],
            ['june', '(very still) I remember now.'],
            ['june', '(a beat) I remember the voice.'],
            ['caption', 'Across the infield, slowly, comes Toby Brask, with a tin box held in both hands.'],
          ],
        }],
        else: [
          { spawn: [friend('june', 'speedway_grid')] },
          {
            scene: { at: 'speedway_grid', cast: ['dess', 'june', 'pip'] },
            say: [
              ['caption', 'June Marlow comes down from the grandstand onto the track, an old racing helmet in a string bag, and stops by the car.'],
              ['caption', 'Dess gets out. Neither of them can speak.'],
              ['dess', '(at last, to her daughter\'s face) And mind the road.'],
              ['caption', 'June knows the voice.'],
              ['june', '...You.'],
              ['dess', "Me. I'm very late."],
              ['june', "Minor— (she stops; she can't)"],
              ['jay', 'She didn\'t leave you. She left you a road.'],
              ['jay', 'Seven stops and a door at the end. Every one of them had your name on it.'],
              ['jay', 'Somebody just forgot to hand you the map.'],
              ['jay', '(nodding at Toby, coming across the grass with a tin box) He\'s bringing it now.'],
            ],
          },
        ],
      },
      {
        scene: { at: 'speedway_grid', cast: ['dess', 'june', 'toby', 'prof_quill', 'milo'] },
        say: [
          ['caption', 'Jay takes the starter key out of the Firecrest\'s ignition. Dess slips the little gold bird off the keyring and closes his hand round it.'],
          ['dess', "The key's hers. The bird's yours."],
          ['caption', 'Toby puts the key back in the tin box, beside the first rhyme, folded, and holds the box out to June properly. Both hands.'],
          ['toby', "Happy birthday. I'm thirty-four years late."],
          ['june', '(holding it) You are.'],
          ['june', '(a beat) Thank you, Mr Brask.'],
          ['caption', 'The Professor steps in to hold the cup for the photograph, Milo beside him.'],
          ['prof_quill', 'I shall have to write a fourth book. I Was Wrong: A History. It will be very short. Milo is doing the pictures.'],
          ['milo', 'And the footnotes.'],
          ['prof_quill', 'Blast.'],
          ['june', '(to Jay, quietly, just once) Thank you, Jay.'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [{ text: 'milo', message: "FINAL SCORE: TEAM FIRECREST 7 · LOCKWOOD'S LOST LEGENDS 0 (+1 tap, 1 spur, 1 minute hand, 1 gnome, 1 whistle, 1 teddy). GG." }],
        else: [{ text: 'milo', message: "FINAL SCORE: TEAM FIRECREST 7 · LOCKWOOD'S LOST LEGENDS 0 (+1 tap, 1 spur, 1 minute hand, 1 gnome, 1 teddy). GG." }],
      },
      { music: 'off' },
      {
        scene: { at: 'speedway_grid', cast: ['dess', 'leo', 'june'] },
        say: [
          ['caption', 'Dess holds out the cup. Not to the crowd. To Jay.'],
          ['dess', 'You drove it here. You say where it goes.'],
          ['caption', 'Leo, beside her, says nothing. He\'s done.'],
        ],
      },
      {
        choice: {
          prompt: 'Where does the Firecrest go?',
          options: [
            { label: "It's June's.", flag: 'dlc_end_hers', then: endingHers },
            { label: 'It belongs to everyone who was here.', flag: 'dlc_end_everybody', then: endingEverybody },
            { label: 'Hide it again. Lay a new trail.', flag: 'dlc_end_gone', then: endingGone },
          ],
        },
      },
    ],
  });

  // ---- END OF JOBS ----

  // =====================================================================
  // Ambient texts (bible, Appendix B)
  // =====================================================================
  D.texts.push(
    { after: 'd28_comment_card', from: 'ottoline', message: "We notice you haven't completed our survey. We'll be in touch either way." },
    { after: 'd30_the_last_lap', from: 'milo', message: 'GG. That means good game. Grandad asked. Then he asked what a game was. Then he wrote it down.' },
  );
})();
