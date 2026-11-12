/*
 * data/dlc-act4a.js — "Chasing the Firecrest", ACT 4: THE LAST LAP, first
 * half (d24 to d27).
 *
 * Toby needs his tools, his hoist and four tyres nobody has made for fifty
 * years; Leo makes his last offer and gets hung up on. June gives Jay one
 * lesson and asks him why he keeps looking at her like that. Castellane
 * shuts the Paloma Bridge, so Jay takes a fire engine through the
 * roadblock. At the fort Toby knocks through the bricks, the dust sheet
 * comes off, and the Firecrest starts on the first turn of the key.
 *
 * Loaded after dlc-act3b.js. See docs/DLC_BIBLE.md (sections 1, 4, 7, 11),
 * docs/dlc/beats-act4.md and docs/mission-format.md. Sets dlc_june_told /
 * dlc_june_wait (d25). Reads dlc_chet_told / dlc_chet_kept (d24: Chet brings
 * the tyres at thirty, or Fenella hands them over and Chet's voicemail),
 * dlc_blog_on / dlc_blog_off (d24, d26, d27: Milo's subscribers or the
 * bedroom wall), dlc_june_told / dlc_june_wait (d26: June in the cab or her
 * text; d27: the fort steps or "She marks everything"), dlc_dash_in /
 * dlc_dash_left (d27: floodlights on the last wave, or Dash calling the fort
 * a hoax on Castellane's channel) and dsl3_test_day (d25: "Ninety-four.
 * Again." or the first "Nobody gets a hundred"). No riddles in this half.
 * Tallies: subscribers 81,000 (d24), past 100,000 (d26); the starter key
 * goes from Jay's belt to Dess (d27); third gear stays sticky; Dess taps the
 * wheel three times (d27); June says "And mind the road" (d25).
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const PICKUP_GREEN = 0x1f3a26;
  const LEARNER_BLUE = 0x78b8e8;
  const TENDER_RED = 0xc8202a;
  const GS_TEAL = 0x13b5b1;
  const BULWARK_WHITE = 0xdcdad2;
  const VAN_CREAM = 0xefefea;
  const LOWLOADER_CREAM = 0xefe6d0;
  const FIRECREST_ORANGE = 0xe0481c;

  // ------------------------------------------------------------ helpers
  /** Toby's old green pickup, bench seat and all. */
  const pickup = (at) => ({ spawnCar: 'toby_pickup', type: 'mesa', at, color: PICKUP_GREEN, name: "Toby's pickup" });
  /** June's dual-control learner Pipit, MARLOW SCHOOL OF MOTORING on the roof sign. */
  const learner = (at) => ({ spawnCar: 'learner', type: 'pipit', at, color: LEARNER_BLUE, name: "June's learner car" });
  /** A teal Guest Services Sovereign. */
  const gsCar = (id, at) => ({ spawnCar: id, type: 'sovereign', at, color: GS_TEAL });
  /** A teal Guest Services Tern. */
  const gsSuv = (id, at) => ({ spawnCar: id, type: 'tern', at, color: GS_TEAL });
  /** A white Guest Services Bulwark (the roadblock trucks). */
  const gsTruck = (id, at) => ({ spawnCar: id, type: 'bulwark', at, color: BULWARK_WHITE });
  /** Hob's cream doughnut van, PALOMA FLYING CLUB on the side. */
  const doughnutVan = (at) => ({ spawnCar: 'doughnut_van', type: 'porter', at, color: VAN_CREAM, name: "Hob's doughnut van" });
  /** Somebody behind the wheel of a spawned car, driving to a place (or after a car). */
  const driver = (id, car, at, to, faction) => ({ id, faction: faction || 'guest_services', hostile: false, at, behavior: 'drive', car, to });
  /** The same, with a pistol out of the window. */
  const gunDriver = (id, car, at, to) => Object.assign(driver(id, car, at, to), { weapon: 'pistol', hostile: true });
  /** A friendly named character standing about at a place. */
  const friend = (id, at, faction) => (faction ? { id, char: id, faction, at, behavior: 'idle', hostile: false } : { id, char: id, at, behavior: 'idle', hostile: false });
  /** A Guest Services wave for a hold-out. */
  const gsWave = (at, delay, count, weapon) => ({ at, delay, count, weapon, faction: 'guest_services' });

  // =====================================================================
  // d24 — Spare Parts
  // =====================================================================
  D.missions.push({
    id: 'd24_spare_parts',
    act: 4,
    title: 'Spare Parts',
    giver: 'toby',
    start: 'marina_lighthouse',
    time: 10,
    estMinutes: 10,
    summary: "Toby can rebuild the Firecrest. He needs his tools, his hoist and four tyres that haven't been made for fifty years.",
    reward: { money: 2000 },
    failIf: ['wrecked:toby_pickup', 'dead:toby', 'dead:pip', 'wrecked:film_lowloader'],
    steps: [
      { blackout: [['caption', 'Act Four'], ['caption', 'The Last Lap']] },
      { music: 'off' },
      pickup('toby_breakwater'),
      { spawn: [friend('toby', 'marina_lighthouse'), friend('pip', 'marina_lighthouse')] },
      {
        camera: 'marina_lighthouse', seconds: 4,
        say: [
          ['caption', 'Coral Marina. The next morning. Two days to the 50th anniversary Southbay 500.'],
          ['caption', 'A banner on every lamp post along the marina front: CASTELLANE PRESENTS THE SOUTHBAY 500. FIFTY YEARS OF CHAMPIONS.'],
        ],
      },
      {
        scene: { at: 'marina_lighthouse', cast: ['toby', 'pip'] },
        say: [
          ['caption', 'Toby and Pip came over on the first ferry. Toby has a list on the back of an envelope and the look of a man who has not slept.'],
          ['toby', 'Fifty years I\'ve dreamt about this list, son. In the dream I had more hair.'],
          ['pip', '(reading over his shoulder) He\'s underlined "tyres" four times.'],
          ['toby', "Because there's four of them, trouble. (tapping the envelope) Toolkit. That's here, up in the lamp room."],
          ['toby', 'Engine hoist. Still at lot seventeen, at the back. They took the boxes, not the furniture.'],
          ['toby', 'And four tyres. Cross-ply, period, the right size. Nobody\'s made them for fifty years.'],
          ['toby', "Nobody except a film studio that wanted her to look right while it lied about her."],
          ['pip', 'Sunreel. The prop yard.'],
          ['jay', 'Three stops.'],
          ['toby', 'Four. I need a sandwich.'],
          ['pip', "(to Jay) He's had two sandwiches. On the ferry. I watched him."],
          ['toby', 'Those were ferry sandwiches. They don\'t count. They\'re mostly ferry.'],
        ],
      },
      { join: ['toby', 'pip'] },
      {
        collect: ['marina_lighthouse'], item: 'toolkit',
        objective: "Fetch Toby's toolkit from the lamp-room door",
        say: [
          ['toby', "Top of the stairs, by the door. I'd come, but I've done those stairs once today and my knees have filed a complaint."],
          ['pip', "Don't drop it. He's been talking about that box since six o'clock."],
        ],
      },
      {
        say: [
          ['caption', 'A wooden box, heavier than it looks, its corners worn round. Burnt into the lid: T.B. & O.M.'],
          ['jay', '(weighing it) What\'s in it?'],
          ['toby', 'Every spanner that ever touched her. And one that didn\'t, that I keep for luck.'],
        ],
      },
      {
        getIn: 'toby_pickup',
        objective: "Get in Toby's pickup. Drive it gently",
        say: [
          ['caption', 'It is a bench seat. Toby takes the window. Pip is squeezed into the middle, knees round the gear stick.'],
          ['toby', 'This is how we did it fifty years ago. Three across.'],
          ['pip', 'Fifty years ago you were thinner.'],
          ['toby', 'Fifty years ago everybody was thinner.'],
        ],
      },
      {
        goto: 'lot_17', vehicle: 'toby_pickup', stop: true, radius: 8,
        objective: 'Lot 17, Cinder Creek: the hoist',
        say: [
          ['jay', '(to the pickup, as it coughs into second) Easy. Nobody\'s chasing us. Yet.'],
          ['pip', "So what does she need? Really? Besides the seven bits."],
          ['toby', 'The seven bits are what she needs. Everything else is just me being fussy.'],
          ['toby', "(like a man introducing guests at a wedding) The steering wheel. Obviously. Nobody gets anywhere without the steering wheel."],
          ['toby', 'The bird. Does nothing. Matters most.'],
          ['toby', 'The clock. Kept her laps. Never kept good time, mind. Neither did she.'],
          ['toby', 'The carburettor, who has been mowing a lawn, and is probably the fittest of all of us.'],
          ['toby', 'The headlamps. A pair. Like an old married couple, they only work together.'],
          ['toby', 'The gear stick. And the coil, for the spark. And that\'s her.'],
          ['pip', 'What was third gear like? On the gear stick. Honestly.'],
          ['toby', '(long pause) Sticky.'],
          ['pip', 'Did you ever fix it?'],
          ['toby', 'I never fixed it. She never let me. Said it kept her honest.'],
        ],
      },
      {
        phone: 'milo',
        objective: 'Pull up at lot 17',
        say: [
          ['milo', 'Did you know cross-ply tyres were invented before the electric toaster? (beat) I\'m not sure that\'s true. Probably.'],
          ['jay', 'Morning, Milo.'],
          ['milo', "Grandad says the period tyres were a Bulwark-Gale Mark Two. He's very excited. He's written a footnote about it. To himself."],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', 'Also, eighty-one thousand subscribers. Gran\'s back. She resubscribed by accident. Again.'],
              ['pip', '(leaning over to the phone) Tell your gran she\'s our biggest fan.'],
              ['milo', "She thinks it's a knitting blog. I've stopped correcting her. She's very happy."],
            ],
          },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', "I've drawn the rebuild on the wall. Seven boxes. I've coloured in none of them. It's very tense."],
              ['milo', 'I\'ve got a pen ready for each one. The bird box is gold. I had to borrow the gold.'],
              ['jay', 'From who?'],
              ['milo', 'Grandad\'s Christmas cards. He won\'t notice until December.'],
            ],
          },
        ],
      },
      {
        collect: ['lot_17'], item: 'hoist',
        objective: 'Load the engine hoist from the back of the unit',
        say: [
          ['caption', 'The empty unit. A bare bulb, the folding table, the BRASK door, the outlines in the dust where the boxes stood.'],
          ['pip', '(quietly, at the door) First time I opened this door, I thought it was full of junk.'],
          ['jay', 'It was.'],
          ['pip', 'Best junk I ever bought.'],
        ],
      },
      {
        say: [
          ['caption', 'The hoist goes in the pickup\'s bed, groaning. Toby supervises from a deckchair he has also found at the back of the unit.'],
          ['toby', 'Left a bit. Your left. My left. Anybody\'s left.'],
          ['caption', 'The deckchair goes in the bed too. Toby says it is a tool. Nobody argues.'],
        ],
      },
      { music: 'tension' },
      {
        phone: 'leo',
        objective: 'Head for Sunreel Studios: the tyres',
        say: [
          ['leo', "Jay. Good morning. I hope I'm not interrupting anything. I hope I'm interrupting a sandwich."],
          ['jay', 'Leo.'],
          ['leo', "I'll be quick. I know you're busy. Everybody I employ tells me how busy you are."],
          ['leo', "Two hundred and fifty thousand dollars, Jay. For the car, the parts and the cup. Not a bribe. A retirement."],
          ['leo', 'Mr Brask could have a new lighthouse. Miss Marlow could have a new everything. You could have... whatever drivers have.'],
          ['jay', 'Is that it?'],
          ['leo', "One more thing. The Paloma Bridge closes tomorrow morning, I'm afraid. A private event. I'd hate for you to be on the wrong side of it."],
          ['leo', 'Think about it. Take all day. My father won that race, Jay. It says so on forty—'],
          ['caption', 'Jay hangs up.'],
        ],
      },
      {
        goto: 'sunreel_gate', vehicle: 'toby_pickup', radius: 15,
        objective: 'Sunreel Studios: the tyres',
        say: [
          ['caption', 'A long silence in the cab.'],
          ['pip', '(reverently) That is the most beautiful thing I have ever heard.'],
          ['toby', 'Two hundred and fifty thousand. (beat) I\'d have taken fifty.'],
          ['pip', 'You would NOT.'],
          ['toby', 'No. I wouldn\'t.'],
          ['pip', "He said the bridge shuts tomorrow. Can he do that? Shut a bridge?"],
          ['jay', 'He owns the end of it.'],
          ['toby', "Then we'll need to come at it from the other end. With something bigger than his end."],
          ['pip', "(to Jay) You've got that face. The face where you've had an idea and you're not going to tell anyone."],
          ['jay', "That's my face."],
          ['pip', 'It is, isn\'t it. Crap.'],
        ],
      },
      {
        scene: { at: 'sunreel_gate', cast: ['studio_guard'] },
        say: [
          ['studio_guard', '(leaning out of his booth, squinting) Mr Valiant\'s double. You\'re back.'],
          ['jay', "I'm back."],
          ['studio_guard', "You're the only one of you I like. Mr Valiant tips in signed photographs."],
          ['caption', 'The barrier goes up.'],
        ],
      },
      // The one who speaks in the scene is the group's own 'gs_staff', so the cutscene doesn't add a third.
      {
        spawn: [
          { id: 'gs_staff', group: 'yard_gs', faction: 'guest_services', at: 'sunreel_prop_yard', weapon: 'pistol', behavior: 'guard' },
          { id: 'yard_gs2', group: 'yard_gs', faction: 'guest_services', at: 'sunreel_prop_yard', weapon: 'pistol', behavior: 'guard' },
        ],
      },
      {
        goto: 'sunreel_prop_yard', vehicle: 'toby_pickup', stop: true, radius: 10,
        objective: 'Drive round to the prop yard',
        say: [
          ['pip', 'Past the saloon, left at the spaceship, right at the giant fibreglass lemon.'],
          ['toby', 'Why is there a giant lemon?'],
          ['pip', "Film about a lemon. Didn't do well."],
        ],
      },
      {
        scene: { at: 'sunreel_prop_yard', cast: ['gs_staff', 'toby', 'pip'] },
        say: [
          ['caption', 'Fibreglass statues, crates, a cardboard sunset. Between them, two teal blazers who stand up very straight when they see the pickup.'],
          ['gs_staff', "Good morning! I'm afraid the film's tyres have been reserved by Castellane Hospitality."],
          ['gs_staff', 'Would you like assistance leaving?'],
          ['toby', "(to Jay, low) They're the right tyres. I can see them from here. Hell's bells, they've even got the white stripe."],
          ['jay', 'Stay behind the truck. Both of you.'],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        kill: 'group:yard_gs',
        objective: 'Deal with Guest Services',
        say: [
          ['pip', '(from behind the pickup) Behind the statue! The big one!'],
          ['caption', 'The big one is a twelve-foot fibreglass Rex Castellane in a racing helmet, one arm raised in victory. It takes most of the bullets.'],
          ['toby', 'Nobody\'s sorry about that.'],
          ['pip', "That's the most use he's ever been."],
        ],
      },
      { music: 'off' },
      {
        if: 'dlc_chet_told',
        then: [
          { spawnCar: 'film_lowloader', type: 'hauler', at: 'sunreel_prop_yard', color: LOWLOADER_CREAM, name: "the film unit's low-loader" },
          { spawn: [{ id: 'chet', char: 'chet', at: 'sunreel_prop_yard', behavior: 'idle', hostile: false, health: 600 }] },
          {
            scene: { at: 'sunreel_prop_yard', cast: ['chet', 'toby', 'pip'] },
            say: [
              ['caption', 'A cream low-loader backs out from behind the hangar, very slowly. Four tyres chained on the bed, white stripes gleaming.'],
              ['caption', 'Chet Valiant climbs down from the cab. Red jacket. Hair perfect. Eyes red. He has been up all night and loaded them himself.'],
              ['chet', "(holding out a hand to Toby) Kid. (to Jay) And kid. (to Pip) And kid. They're yours. For the real one."],
              ['toby', 'You played Rex.'],
              ['chet', "I'm going to play him worse now. On purpose. I've been practising in the mirror. He looks terrible."],
              ['toby', '(shaking his hand, and not letting go for a while) Thank you.'],
              ['chet', "I'll drive them to Cinder Creek myself. At thirty. I've got a reputation."],
              ['pip', "There are two men with guns lying down over there."],
              ['chet', 'Then I shall drive past them at thirty, with dignity. Follow me, kid. Not too far behind. I get lonely.'],
            ],
          },
          { protect: 'chet' },
          { spawn: [{ id: 'chet', char: 'chet', at: 'film_lowloader', behavior: 'drive', car: 'film_lowloader', to: 'lot_17', hostile: false, health: 600 }] },
          {
            follow: 'film_lowloader', to: 'cinder_truckstop', min: 0, max: 80, speed: 0.55,
            objective: "Escort Chet's low-loader. He won't go over thirty",
            say: [
              ['pip', '(watching the speedo) Twenty-nine. Thirty. Twenty-nine.'],
              ['pip', "I've seen faster glaciers."],
              ['toby', "I've driven faster glaciers."],
              ['chet', '(phone, in a trailer voice) In a world... where one man... indicates.'],
              ['chet', '(phone) One man... checked his mirrors. This summer... he will come to a complete stop at the junction.'],
              ['jay', 'Chet, the light was green.'],
              ['chet', '(phone, normal voice) It might change, kid. They do that.'],
              ['pip', "He's so slow the satnav fell asleep."],
              ['toby', "Leave him be. Fifty years ago they'd have hired him to carry the cup. Nobody'd catch him, but nothing would ever fall off."],
            ],
          },
          { music: 'action' },
          gsCar('gs_car1', 'film_lowloader'),
          { spawn: [gunDriver('gs_driver1', 'gs_car1', 'film_lowloader', 'film_lowloader')] },
          {
            destroy: ['gs_car1'],
            objective: 'Keep Guest Services off Chet',
            say: [
              ['pip', 'Teal car! Coming up on the lorry! He\'s got a gun out!'],
              ['chet', '(phone, perfectly calm) Kid, there\'s a man shooting at my lorry. I\'m not speeding up. It\'s the principle.'],
              ['chet', '(phone) In Oversteer 2 a man shot at my lorry and I sped up. It was a stuntman called Raoul. I was in my trailer. Having a soup.'],
              ['toby', 'Get him off it, son!'],
              ['jay', '(to the pickup, foot flat down) Come on. Damn it, you\'re a truck, not a pension.'],
            ],
          },
          { music: 'tension' },
          {
            follow: 'film_lowloader', to: 'lot_17', min: 0, max: 80, speed: 0.55,
            objective: 'Stay with Chet to lot 17',
            say: [
              ['chet', '(phone) Is he gone? Did you do something dramatic? I was concentrating on my lane.'],
              ['jay', "He's gone."],
              ['chet', '(phone) Wonderful. Remind me to put that in the film. The new film. The one that\'s true.'],
              ['pip', "He's indicating. There's nothing to turn into. He's indicating at a cactus."],
              ['toby', 'Manners.'],
            ],
          },
        ],
        else: [
          { spawn: [friend('fenella', 'sunreel_prop_yard')] },
          {
            scene: { at: 'sunreel_prop_yard', cast: ['fenella', 'toby', 'pip'] },
            say: [
              ['caption', 'Fenella Moss steps out from behind a fibreglass sphinx, three phones in one hand, a megaphone round her neck, completely unbothered.'],
              ['fenella', "Those two have been sitting on my tyres since seven. Thank you. I had a crane shot scheduled."],
              ['fenella', '(pointing with a phone) They\'re on the pallet. Four. Period. Take them.'],
              ['toby', "You're giving them away?"],
              ['fenella', "It's for the movie. (beat) A different movie. A better one."],
              ['jay', 'Where\'s Chet?'],
              ['fenella', "In his trailer. Not taking calls. He keeps asking me questions I'm not paid to answer."],
              ['pip', '(quietly) What questions?'],
              ['fenella', '"Who won." Mostly. (beat) Off you go. I have to go and lie to a producer.'],
            ],
          },
          {
            collect: ['sunreel_prop_yard'], item: 'tyres',
            objective: 'Load the four period tyres',
            say: [['toby', '(rolling one, like a man walking a dog he loves) White stripe. Hell\'s bells. They got it right.']],
          },
          {
            phone: 'chet',
            objective: 'Back to lot 17',
            say: [
              ['caption', 'Jay rings Chet. It goes straight through.'],
              ['chet', "(voicemail, a recording, warm and grand) This is Chet Valiant. Loved the first one? Leave a message."],
              ['caption', 'The beep. Jay doesn\'t leave one.'],
            ],
          },
          {
            goto: 'lot_17', vehicle: 'toby_pickup', stop: true, radius: 8,
            objective: 'Back to lot 17 with the tyres',
            say: [
              ['toby', "He's playing Rex? (beat) Rex had a worse quiff. Tell him that. It's the only good thing I've got to say about Rex."],
              ['pip', '(guiltily, after a while) Should we tell him? Chet?'],
              ['jay', 'We had our chance.'],
              ['pip', '...Yeah.'],
              ['toby', "He'll find out. Everybody's going to find out, trouble. That's the whole idea."],
              ['pip', 'Fifty years of the wrong name on the cup, and the man playing the wrong name doesn\'t know. That\'s sad.'],
              ['toby', "That's showbusiness."],
            ],
          },
        ],
      },
      { music: 'hope' },
      {
        if: 'dlc_chet_told',
        then: [
          {
            scene: { at: 'lot_17', cast: ['toby', 'pip', 'chet'] },
            say: [
              ['caption', 'Everything for the rebuild, stacked in the empty unit: the toolbox, the hoist, four tyres, and a deckchair.'],
              ['toby', '(a hand flat on a tyre) Right. Tomorrow I\'ll need her, and a fort, and a lot of luck.'],
              ['pip', 'And the bridge is shut tomorrow.'],
              ['toby', 'Then I\'ll need a big car.'],
              ['chet', '(climbing back into his cab, at thirty) Tell her I\'m sorry about the film. Tell her the tyres are period-correct. Tell her in that order.'],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'lot_17', cast: ['toby', 'pip'] },
            say: [
              ['caption', 'Everything for the rebuild, stacked in the empty unit: the toolbox, the hoist, four tyres, and a deckchair.'],
              ['toby', '(a hand flat on a tyre) Right. Tomorrow I\'ll need her, and a fort, and a lot of luck.'],
              ['pip', 'And the bridge is shut tomorrow.'],
              ['toby', 'Then I\'ll need a big car.'],
            ],
          },
        ],
      },
      {
        camera: 'vicehaven_international', seconds: 3,
        say: [['caption', 'Past the self-storage rows, far off across the flats, a plane lifts out of Vicehaven International into the haze.']],
      },
      {
        scene: { at: 'lot_17', cast: ['pip', 'toby'] },
        say: [
          ['toby', 'What are you looking at, son?'],
          ['jay', 'Nothing.'],
          ['pip', "He's doing the face again."],
          ['pip', '(as Jay goes) And mind the road.'],
        ],
      },
    ],
  });

  // =====================================================================
  // d25 — Junebug
  // =====================================================================
  D.missions.push({
    id: 'd25_junebug',
    act: 4,
    title: 'Junebug',
    giver: 'june',
    start: 'june_house',
    time: 15,
    estMinutes: 10,
    summary: "June Marlow wants one lesson, so she knows who's been driving her daughter about.",
    reward: { money: 1000 },
    failIf: ['heat:1', 'wrecked:learner', 'dead:june'],
    steps: [
      learner('june_house'),
      { spawn: [friend('june', 'june_house')] },
      { music: 'off' },
      {
        scene: { at: 'june_house', cast: ['june'] },
        say: [
          ['caption', "Vista Verde. Three in the afternoon. The lawn is perfect. The shed has a new padlock, a bigger one."],
          ['caption', 'June Marlow waits on the drive beside the learner car, clipboard on her arm, pencil behind her ear.'],
          ['june', "Pip tells me things now. A little. Coral Marina. An aeroplane. Something with a doughnut van, which she wouldn't explain."],
          ['june', "One lesson, Mr Mercer. So I know who's been driving my daughter about."],
          ['jay', "I've had one. In this car. With people shooting."],
          ['june', 'That was a pursuit. This is a lesson.'],
          ['june', '(opening the passenger door) A pursuit is easier.'],
        ],
      },
      {
        if: 'dsl3_test_day',
        then: [
          {
            say: [
              ['june', "You've passed the Marlow Test once. People pass once. That's luck."],
              ['june', 'Twice is driving.'],
            ],
          },
        ],
        else: [
          {
            say: [
              ['june', "My test route. It's the one the examiners use. I know because I wrote it for them."],
              ['jay', 'They let you?'],
              ['june', "They didn't stop me."],
            ],
          },
        ],
      },
      { join: ['june'] },
      {
        getIn: 'learner',
        objective: 'Get in. Mirror, seatbelt, mirror',
        say: [
          ['june', '(the moment he sits down; writing) You checked the mirror after the seatbelt. Minor fault.'],
          ['jay', "We haven't moved."],
          ['june', 'And yet.'],
        ],
      },
      {
        goto: 'verde_culdesac', vehicle: 'learner', stop: true, radius: 6,
        objective: 'Take the first left into the cul-de-sac',
        say: [
          ['june', 'Moving off. Mirror. Signal. Look over your shoulder. Nobody ever looks over their shoulder.'],
          ['jay', '(looking over his shoulder) Clear.'],
          ['june', 'Good. Most people only do that when someone\'s following them.'],
          ['jay', 'Someone usually is.'],
          ['june', '(a pause; she lets that go) When Pip was seven I came out into the garden and the lawnmower was in forty pieces on the lawn.'],
          ['june', 'Forty. I counted. She was sitting in the middle of them eating a sandwich.'],
          ['jay', 'Did she put it back together?'],
          ['june', 'By teatime. It went faster afterwards. I never asked how.'],
          ['june', "(the instructor voice, flat) I don't like racing, Mr Mercer. A racing car took my mother. I don't see why it should have my daughter."],
          ['caption', 'Jay looks at her a beat too long.'],
          ['june', 'Eyes on the road.'],
        ],
      },
      { objective: 'Turn the car round in the road. Forward, reverse, forward' },
      {
        say: [
          ['june', 'Pull up on the left, please. Thank you.'],
          ['june', 'Turn in the road, please. Using forward and reverse gears.'],
          ['june', 'Without mounting the kerb, the lawn, or Mr Okafor.'],
          ['caption', 'Mr Okafor is watering his roses in a dressing gown, three feet from the kerb. He does not move. He has seen June Marlow\'s pupils before.'],
          ['june', '(watching the kerb, the lawn and Mr Okafor in turn, pencil ready) Take your time.'],
        ],
      },
      { wait: 4 },
      {
        say: [
          ['june', '(writing) Four points. Minor fault.'],
          ['jay', "It's called a three-point turn. It doesn't say you can't do four."],
          ['june', 'It says three. In the name. (beat) Mr Okafor survived. I\'ll note that.'],
        ],
      },
      gsSuv('gs_suv', 'verde_culdesac'),
      { spawn: [{ id: 'gs_watcher', faction: 'guest_services', at: 'gs_suv', behavior: 'idle', hostile: false }] },
      {
        camera: 'verde_culdesac', seconds: 3,
        say: [['caption', 'Across the road, a teal Tern. A man in a teal blazer leans on it with a coffee, not looking at them very hard.']],
      },
      {
        say: [
          ['june', 'Friend of yours?'],
          ['jay', 'No.'],
          ['june', "He's parked eleven inches from the kerb. I've been looking at it for two days."],
          ['jay', "Two days?"],
          ['june', 'He arrived yesterday morning. He has a coffee at nine and a coffee at three. I nearly went out and marked him.'],
        ],
      },
      { music: 'tension' },
      {
        goto: 'vista_verde_school', vehicle: 'learner', radius: 12,
        objective: 'Drive past the school. Walking pace',
        say: [
          ['june', 'School ahead. What speed?'],
          ['jay', 'Slow.'],
          ['june', 'Slower than that.'],
          ['caption', 'The lollipop lady steps out into the road, sign held high like a lighthouse. A crocodile of very small children crosses, holding hands, in no hurry at all.'],
          ['june', '(softly) Wait. Wait. Wait for the last one. There\'s always a last one.'],
          ['caption', 'There is always a last one. He waves at the car. June waves back without looking up from the clipboard.'],
        ],
      },
      { say: [['caption', 'A football bounces out from between two parked cars, straight across the bonnet: boing.']] },
      { slowmo: 1.5 },
      {
        say: [
          ['june', 'Emergency stop.'],
          ['june', '(beat) Good. That was good. Don\'t let it go to your head.'],
          ['jay', "(to the car, quietly) Easy. They're small. We're smaller than we look."],
          ['june', 'Do you always talk to the car?'],
          ['jay', 'It listens.'],
          ['june', '(writing something, then crossing it out) So did my last car. Then it didn\'t.'],
        ],
      },
      { music: 'off' },
      {
        goto: 'verde_mall', vehicle: 'learner', radius: 25,
        objective: 'On to the Verde Mall car park',
        say: [
          ['jay', '(carefully) The shed.'],
          ['june', 'What about it?'],
          ['jay', 'New padlock.'],
          ['june', 'Somebody broke into it. Some men. Some time ago. With my daughter. You may have heard about it.'],
          ['jay', 'I may have.'],
          ['june', "Win's shed is nobody's business but Win's. And Win's dead. So it's mine."],
          ['caption', 'A long red light. June taps the pencil on the clipboard, once.'],
          ['june', "When we get to the car park I'll want the warning triangle checked. Examiners ask. It's in the boot."],
          ['jay', 'Has an examiner ever asked?'],
          ['june', 'Not since I started telling them to.'],
        ],
      },
      {
        goto: 'mall_reverse_corner', vehicle: 'learner', stop: true, radius: 4,
        objective: 'Reverse into the marked bay by the trolley shelter. Inside the lines',
        say: [
          ['june', 'Bay on your right, by the trolleys. Reverse in. Inside the lines, Mr Mercer. Not near the lines. Inside.'],
          ['june', 'You can use your mirrors. You can turn round. You cannot use the trolley shelter as a guide by hitting it.'],
        ],
      },
      {
        say: [
          ['june', '(leaning out to look at the white line, then back in; writing) Hm.'],
          ['jay', 'Hm?'],
          ['june', 'Hm is not a mark. Hm is a noise. Check the triangle, please.'],
        ],
      },
      {
        scene: { at: 'mall_reverse_corner', cast: ['june'] },
        say: [
          ['caption', 'Jay opens the boot. The warning triangle is there, in its plastic case. Under it, in a string bag, something round.'],
          ['caption', 'An old open-face racing helmet. Orange, the paint worn through to the shell. A small gold bird painted on the back. Inside the strap, in faded pen: O.M.'],
          ['june', '(too quickly) Motorcycle helmet. I found it.'],
          ['jay', 'Where?'],
          ['june', "In Win's shed. Years ago. (beat) Forty years ago."],
          ['june', "I keep it in the car since your... since the lawnmower. In case the shed gets burgled again."],
          ['caption', 'Jay holds it a moment longer than he should. Then he puts it back exactly where it was, and the triangle on top of it.'],
          ['jay', "Triangle's fine."],
          ['june', '(not looking at him) Good.'],
        ],
      },
      {
        deliver: 'learner', to: 'june_house', maxDamage: 0.15,
        objective: "Back to June's. Gently",
        say: [
          ['june', '(marking, under her breath) Minor fault... minor fault... no. That was fine. That was fine.'],
          ['caption', 'Then nothing for a long time. Vista Verde goes by: sprinklers, a dog, somebody washing a car that is already clean.'],
          ['june', "You're very quiet, Mr Mercer."],
          ['jay', "I'm concentrating."],
          ['june', 'Nobody concentrates that hard on a roundabout.'],
          ['caption', 'Jay says nothing. On the next corner he looks at her again. June notices, and doesn\'t say "eyes on the road".'],
        ],
      },
      { music: 'off' },
      {
        say: [
          ['caption', "Outside June's bungalow. Engine off. June signs a certificate on the clipboard on her knee and tears it off."],
        ],
      },
      {
        if: 'dsl3_test_day',
        then: [
          {
            say: [
              ['june', '(handing it over) Ninety-four. Again. That\'s either very good or very boring.'],
              ['jay', 'Which?'],
              ['june', 'I haven\'t decided. I\'ll write to you.'],
            ],
          },
        ],
        else: [
          {
            say: [
              ['june', '(handing it over) Ninety-four per cent. Nobody gets a hundred. I didn\'t.'],
              ['jay', 'Who marked you?'],
              ['june', 'My aunt. She had a little book.'],
            ],
          },
        ],
      },
      {
        say: [
          ['june', '(not looking at him; the clipboard face down on her knee) Why do you keep looking at me like that?'],
          ['june', "You've done it all afternoon. Like you're reading something written on me."],
        ],
      },
      {
        choice: {
          prompt: 'June asks why you keep looking at her.',
          options: [
            {
              label: 'Tell her now.',
              flag: 'dlc_june_told',
              then: [
                {
                  say: [
                    ['jay', "There's a fort on the island. An old one. A lighthouse on the wall."],
                    ['jay', 'An old woman keeps it. She buys a dozen jam doughnuts on Tuesdays.'],
                    ['jay', "(beat) Your mother didn't die, June. She hid. She's on the island. Her name's Dess, and she keeps the fort light."],
                    ['caption', 'June marks nothing for a long time. The pencil stays behind her ear.'],
                    ['june', '(eventually) Is she well?'],
                    ['jay', "She's rude."],
                    ['june', '...Good.'],
                    ['june', '(the instructor voice gone) Fifty years.'],
                    ['jay', 'She watched the sea for you. Somebody was meant to bring you a box.'],
                    ['june', 'Who?'],
                    ['jay', "He'll tell you himself."],
                  ],
                },
                {
                  scene: { at: 'june_house', cast: ['june'] },
                  say: [
                    ['caption', 'June gets out. She walks round to the boot, opens it, and lifts out the helmet in its string bag.'],
                    ['caption', 'She holds it against her chest, the way you hold something that has been yours a long time without your knowing why.'],
                  ],
                },
              ],
            },
            {
              label: 'Let Dess tell her.',
              flag: 'dlc_june_wait',
              then: [
                {
                  say: [
                    ['jay', 'Nothing. You remind me of someone.'],
                    ['june', '(a pause; then she takes the pencil from behind her ear and writes) Minor fault.'],
                    ['caption', "She doesn't believe him. She decides not to ask. It is the first thing all afternoon she hasn't marked out loud."],
                  ],
                },
                {
                  scene: { at: 'june_house', cast: ['june'] },
                  say: [['caption', 'June gets out and stands on the drive with the clipboard against her chest, looking at the shed.']],
                },
              ],
            },
          ],
        },
      },
      {
        scene: { at: 'june_house', cast: ['june'] },
        say: [
          ['caption', 'Jay walks down the drive. June is in the doorway, the clipboard down by her side.'],
          ['june', 'And mind the road.'],
          ['caption', 'Jay stops dead, and turns.'],
        ],
      },
      {
        if: 'dlc_june_told',
        then: [
          {
            scene: { at: 'june_house', cast: ['june'] },
            say: [
              ['june', '(quietly, looking down at the helmet in her other hand; working it out) Somebody used to say that to me. "Mind the road." I don\'t know who.'],
              ['jay', 'Somebody who meant it.'],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'june_house', cast: ['june'] },
            say: [
              ['june', '(quietly, no clipboard, puzzled at herself) Somebody used to say that to me. "Mind the road." I don\'t know who.'],
              ['jay', 'Somebody who meant it.'],
            ],
          },
        ],
      },
      { fade: 'out' },
      {
        if: 'dlc_june_told',
        then: [{ text: 'milo', message: 'Pip says you told her mum. Pip is crying in a good way. I didn\'t know there was a good way. I\'m learning a lot this summer.' }],
        else: [{ text: 'milo', message: 'Pip says her mum gave you 94%. That\'s the highest she\'s ever given anyone. Pip got 91. Pip is FURIOUS.' }],
      },
    ],
  });

  // =====================================================================
  // d26 — Blue Lights
  // =====================================================================
  D.missions.push({
    id: 'd26_blue_lights',
    act: 4,
    title: 'Blue Lights',
    giver: 'toby',
    start: 'airport_fire_station',
    time: 6.5,
    estMinutes: 10,
    summary: 'Castellane has shut the Paloma Bridge. Nothing gets through a roadblock like a fire engine.',
    reward: { money: 2500 },
    failIf: ['wrecked:crash_tender', 'dead:toby'],
    steps: [
      { music: 'off' },
      {
        camera: 'bridge_island_end', seconds: 5,
        say: [
          ['caption', 'The Paloma Bridge. Half past six in the morning.'],
          ['caption', 'Two white Bulwarks nose to nose across the island end. A line of teal Terns behind them. A gazebo.'],
          ['caption', 'A sign: CLOSED FOR A PRIVATE EVENT. CASTELLANE HOSPITALITY APOLOGISES FOR ANY INCONVENIENCE.'],
        ],
      },
      pickup('airport_fire_station'),
      { spawn: [friend('toby', 'airport_fire_station')] },
      {
        if: 'dlc_june_told',
        then: [{ spawn: [friend('june', 'airport_fire_station')] }],
        else: [],
      },
      {
        phone: 'pip',
        say: [
          ['pip', "I'm on the fort wall. Gran's binoculars. I can see the whole bridge."],
          ['pip', 'Two Bulwarks. Six Terns. They\'ve got a gazebo. They\'ve got a GAZEBO, Jay.'],
          ['pip', '(off the phone) What? (back) Gran says they\'ve got croissants in it.'],
          ['jay', 'Ferry?'],
          ['pip', "Cancelled. \"For the event.\" There's no event. The event is us not getting across."],
          ['pip', '(beat) Gran says good morning. She says it like a dare.'],
        ],
      },
      {
        if: 'dlc_june_told',
        then: [
          {
            scene: { at: 'airport_fire_station', cast: ['toby', 'june'] },
            say: [
              ['caption', 'The airport fire station. Doors open. Two red crash tenders inside, enormous, polished. At the back, the crew are at breakfast.'],
              ['caption', "Toby has his toolbox on a sack truck. Beside him, June Marlow, with her clipboard and a flask. She phoned Toby at five o'clock. Pip gave her the number."],
              ['toby', 'Nothing gets through those but a fire engine.'],
              ['jay', "I've never stolen a fire engine."],
              ['toby', "You'd never landed an airliner. You're having a summer."],
              ['june', "I'm coming. I'm a qualified instructor. I've driven worse."],
              ['jay', "You've driven worse than a fire engine?"],
              ['june', "I've taught a lot of sixteen-year-olds, Mr Mercer. Every one of them was a fire engine."],
              ['caption', 'Toby has taken his hat off. He has been trying to say something to June since she arrived, and he still can\'t.'],
              ['june', '(looking at him properly) You\'re the man with the box.'],
              ['toby', '(a long pause) I\'m the man without the box. (beat) I\'ll explain on the way.'],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'airport_fire_station', cast: ['toby'] },
            say: [
              ['caption', 'The airport fire station. Doors open. Two red crash tenders inside, enormous, polished. At the back, the crew are at breakfast.'],
              ['caption', 'Toby has his toolbox on a sack truck, and the look of a man who has had a very good idea at four in the morning.'],
              ['toby', 'Nothing gets through those but a fire engine.'],
              ['jay', "I've never stolen a fire engine."],
              ['toby', "You'd never landed an airliner. You're having a summer."],
              ['jay', 'What if they need it? For a fire?'],
              ['toby', "There's two. I counted. I'm a fair man. We'll take the one with the dent."],
            ],
          },
        ],
      },
      { spawnCar: 'crash_tender', type: 'firetruck', at: 'airport_fire_station', color: TENDER_RED, name: 'the crash tender' },
      {
        getIn: 'crash_tender',
        objective: 'Take a crash tender',
        say: [['toby', 'The red one. (beat) They\'re all red. The big red one.']],
      },
      { heat: 2 },
      {
        say: [
          ['caption', 'The station alarm goes off. A firefighter in a dressing gown runs out after them, waving a toast rack.'],
          ['jay', '(to the tender, as it rolls out like a building leaving) Damn. You\'re bigger on the inside.'],
          ['caption', "Toby's toolbox rides on the back, lashed to the ladder with a tow strap and a prayer."],
        ],
      },
      { join: ['toby'] },
      {
        if: 'dlc_june_told',
        then: [{ join: ['june'] }, { protect: 'june' }],
        else: [],
      },
      { music: 'action', checkpoint: true },
      {
        if: 'dlc_june_told',
        then: [
          {
            goto: 'harbor_point', vehicle: 'crash_tender', radius: 30,
            objective: 'South down Grand Avenue North. Siren is on L',
            say: [
              ['june', '(clipboard on her knee, at seventy) Red light.'],
              ['jay', "It's a fire engine."],
              ['june', 'A blue-light vehicle may proceed with caution. (beat) That wasn\'t caution. That was a lifestyle.'],
              ['toby', '(to June, carefully) Mrs Marlow. About the box. Thirty-four years ago, I—'],
              ['caption', 'A police car swings in front of them, lights going. Jay goes round it. Through a flowerbed.'],
              ['june', 'Minor fault.'],
              ['toby', 'Mrs Marlow. The box. Your seventeenth birthday, I—'],
              ['caption', 'Another police car. Jay goes round that one too, on the pavement, past a man with a newspaper who doesn\'t look up.'],
              ['june', "Mr Brask. Whatever it is, it'll keep until we've stopped committing a crime."],
              ['toby', '(sitting back) Right. Yes. Fair.'],
              ['june', 'And Mr Mercer, you are allowed to use the horn. That is what it\'s for.'],
              ['jay', 'I have a siren.'],
              ['june', 'Then use that. Politely.'],
            ],
          },
        ],
        else: [
          { text: 'june', message: 'Drive safely. I mean it.' },
          {
            goto: 'harbor_point', vehicle: 'crash_tender', radius: 30,
            objective: 'South down Grand Avenue North. Siren is on L',
            say: [
              ['toby', '(reading the text over Jay\'s shoulder) She means it.'],
              ['jay', 'I know.'],
              ['toby', 'How did she look? Yesterday. June.'],
              ['jay', "Tired. Sharp. Pip's face."],
              ['toby', "(long pause) Dess's face."],
              ['caption', 'A police car pulls out of a side street. The tender goes round it. So does a bus shelter, mostly.'],
              ['toby', "Dess drove like this. Fifty years ago. She'd go into a corner like she was owed money by it."],
              ['jay', 'Did she get paid?'],
              ['toby', 'Every time. With interest.'],
              ['toby', "(watching the mirror) You've got two of them behind. I'd say lose them, but you're a fire engine. They're going to find you."],
            ],
          },
        ],
      },
      {
        phone: 'milo',
        objective: 'Anchor Street. The bridge',
        say: [
          ['milo', "Did you know a crash tender carries twelve thousand litres of water? That's sixty bathtubs. I've done the maths."],
          ['milo', "I had to do something. It's half past six."],
          ['jay', 'Why are you awake?'],
          ['milo', 'Why are YOU driving a fire engine?'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', "Someone's filmed you from a bus. \"FIRE ENGINE GOES THE WRONG WAY UP GRAND AVENUE.\" It's trending."],
              ['milo', "We've gone past a hundred thousand subscribers. A hundred thousand and forty. I'm having a lie-down."],
              ['milo', '(beat) I\'m not actually lying down. I\'m standing on my bed. It feels like a standing-on-the-bed number.'],
            ],
          },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', "I've added a fire engine to the wall. In red. I had to sharpen the red."],
              ['milo', "It's a good fire engine. It's got a ladder. I don't know if yours has a ladder. I gave it one anyway."],
              ['jay', 'It has a ladder.'],
              ['milo', '(very satisfied) Accuracy.'],
            ],
          },
        ],
      },
      {
        goto: 'bridge_mainland', vehicle: 'crash_tender', radius: 20,
        objective: 'Anchor Street. The bridge',
        say: [
          ['toby', 'Left. Anchor Street. Then straight on till you hit something.'],
          ['jay', 'That\'s the plan?'],
          ['toby', 'That\'s the whole plan. I\'m an engineer, son. I like a plan with one moving part.'],
        ],
      },
      gsTruck('gs_truck1', 'bridge_island_end'),
      gsTruck('gs_truck2', 'bridge_island_end'),
      gsSuv('gs_suv', 'bridge_island_end'),
      {
        spawn: [
          { id: 'bridge_gs_p', group: 'bridge_gs', faction: 'guest_services', at: 'bridge_island_end', count: 3, weapon: 'pistol', behavior: 'guard' },
          { id: 'bridge_gs_s', group: 'bridge_gs', faction: 'guest_services', at: 'bridge_island_end', count: 3, weapon: 'smg', behavior: 'guard' },
        ],
      },
      {
        camera: 'bridge_mainland', seconds: 3,
        say: [['caption', 'The long, low bridge. The towers in the morning haze. And at the far end, small and neat, a line of teal.']],
      },
      {
        if: 'dlc_june_told',
        then: [
          {
            goto: 'bridge_island_end', vehicle: 'crash_tender', stop: false, radius: 14,
            objective: 'Ram through the roadblock',
            say: [
              ['june', '(tightening her seatbelt) Both hands on the wheel. Ten and two.'],
              ['toby', 'Hold on to something, Mrs Marlow.'],
              ['june', "I am holding on to my clipboard. It's been through worse than this."],
            ],
          },
          { slowmo: 2, say: [['caption', 'The tender hits the gap between the Bulwarks at fifty and makes it bigger.']] },
          {
            kill: 'group:bridge_gs',
            objective: 'Hose them off the bridge (water cannon: fire)',
            say: [
              ['june', 'Minor fault.'],
              ['toby', 'MINOR?!'],
              ['june', 'He indicated.'],
              ['caption', 'The water cannon knocks the teal blazers over like skittles. They get up. They slip. They sit down on the wet tarmac and decide that is where they live now.'],
              ['gs_staff', "(from behind a Tern, dripping) Sir! Sir! I'm afraid this is a private event!"],
              ['toby', "Hell's bells! Do it again! (pointing) The one with the gazebo!"],
              ['caption', 'The gazebo goes over the railing. The croissants go with it, one by one, like little lifeboats.'],
              ['toby', '(sincerely) That is the best thing I\'ve seen since she crossed the line.'],
            ],
          },
        ],
        else: [
          {
            goto: 'bridge_island_end', vehicle: 'crash_tender', stop: false, radius: 14,
            objective: 'Ram through the roadblock',
            say: [
              ['toby', "Don't slow down. Whatever you do. They're expecting you to slow down."],
              ['jay', 'Everybody expects me to slow down.'],
            ],
          },
          { slowmo: 2, say: [['caption', 'The tender hits the gap between the Bulwarks at fifty and makes it bigger.']] },
          {
            kill: 'group:bridge_gs',
            objective: 'Hose them off the bridge (water cannon: fire)',
            say: [
              ['toby', "(looking back) There goes the gazebo's dignity."],
              ['caption', 'The water cannon knocks the teal blazers over like skittles. They get up. They slip. They sit down on the wet tarmac and decide that is where they live now.'],
              ['gs_staff', "(from behind a Tern, dripping) Sir! Sir! I'm afraid this is a private event!"],
              ['toby', "Hell's bells! Do it again! (pointing) The one with the gazebo!"],
              ['caption', 'The gazebo goes over the railing. The croissants go with it, one by one, like little lifeboats.'],
              ['toby', '(sincerely) That is the best thing I\'ve seen since she crossed the line.'],
            ],
          },
        ],
      },
      {
        say: [
          ['caption', 'As the last blazer sits down in a puddle, a tannoy speaker on the gazebo pole crackles into life.'],
          ['leo', '(a recording, warm and unhurried) Welcome to Isla Paloma. Let us take care of everything.'],
          ['leo', '(the recording, stuck) Let us take care of— take care of— take care of— take care of—'],
          ['caption', 'Jay hoses the speaker until it stops.'],
          ['toby', 'Manners.'],
        ],
      },
      { heat: 3 },
      {
        loseHeat: true,
        objective: 'Lose the police on the island',
        say: [
          ['toby', 'Thirty-three years looking at this island across the water. First time I\'ve been on it in a fire engine.'],
          ['toby', 'First time I\'ve been on it in anything with a siren, come to that.'],
          ['jay', 'Hold on.'],
          ['toby', "I've been holding on since the airport, son. My hands have set."],
        ],
      },
      {
        if: 'dlc_june_told',
        then: [
          {
            say: [
              ['june', 'Turn the siren off, Mr Mercer. We\'re not on fire. Anything that was on fire is behind us.'],
              ['jay', 'Nothing was on fire.'],
              ['june', 'Then you have no excuse at all.'],
            ],
          },
        ],
        else: [],
      },
      { music: 'hope' },
      {
        goto: 'paloma_fort', vehicle: 'crash_tender', stop: true, radius: 12,
        objective: 'Up through the old lanes. Park in the fort courtyard',
        say: [
          ['toby', 'Through the lanes. Up the hill. She fits. (beat) She probably fits.'],
          ['caption', 'She fits. Just. A market awning loses an argument with the ladder. Somebody\'s washing comes along for the ride.'],
          ['toby', "Somebody's going to want their vest back."],
        ],
      },
      { spawn: [friend('dess', 'paloma_fort'), friend('pip', 'paloma_fort')] },
      {
        if: 'dlc_june_told',
        then: [
          {
            camera: 'paloma_fort', seconds: 6,
            say: [
              ['caption', 'Dess Marlow stands at the top of the fort steps in her orange cardigan. Pip is beside her, and has stopped breathing.'],
              ['caption', 'June gets down from the cab with the helmet under her arm. She walks to the bottom step, and stops there.'],
              ['caption', 'Nobody says anything at all.'],
            ],
          },
          { fade: 'out' },
        ],
        else: [
          {
            scene: { at: 'paloma_fort', cast: ['dess', 'pip', 'toby'] },
            say: [
              ['dess', '(walking down the steps, looking at the tender) Where\'s the fire?'],
              ['jay', 'Behind us.'],
              ['dess', '(walking round it slowly, like a buyer) Twelve thousand litres? (beat) Good line on the bridge. Late on the brakes.'],
              ['pip', 'You WATCHED?'],
              ['dess', "I've been watching that bridge for fifty years. That's the most interesting thing it's ever done."],
              ['toby', 'Morning, Dess.'],
              ['dess', 'Morning, Toby. You brought a fire engine.'],
              ['toby', 'I brought a toolbox. The fire engine came with it.'],
            ],
          },
        ],
      },
    ],
  });

  // =====================================================================
  // d27 — The Powder Store
  // =====================================================================
  D.missions.push({
    id: 'd27_the_powder_store',
    act: 4,
    title: 'The Powder Store',
    giver: 'dess',
    start: 'paloma_fort',
    time: 9,
    estMinutes: 11,
    summary: 'Fifty years behind a brick wall. Toby knocks it down.',
    reward: { money: 4000, weapons: ['grenade'] },
    failIf: ['dead:toby', 'dead:dess', 'dead:pip', 'wrecked:firecrest'],
    steps: [
      // Resume safety: everybody where d26 left them.
      { spawn: [friend('dess', 'paloma_fort'), friend('toby', 'paloma_fort'), friend('pip', 'paloma_fort')] },
      { spawnCar: 'crash_tender', type: 'firetruck', at: 'paloma_fort', color: TENDER_RED, name: 'the crash tender' },
      doughnutVan('paloma_fort_gate'),
      { spawn: [friend('hob', 'paloma_fort_gate', 'flying_club')] },
      {
        if: 'dlc_june_told',
        then: [{ spawn: [friend('june', 'paloma_fort')] }],
        else: [],
      },
      {
        if: 'dlc_dash_in',
        then: [{ spawn: [friend('dash', 'paloma_fort_gate', 'lockwood_tv'), friend('kit', 'paloma_fort_gate', 'lockwood_tv')] }],
        else: [],
      },
      { music: 'off' },
      {
        camera: 'paloma_fort', seconds: 5,
        say: [
          ['caption', 'The Paloma fort. Nine in the morning. One day to the race.'],
          ['caption', "Bunting left over from the festival. Gulls on the wall. The crash tender parked in the courtyard like it's always lived there. And in the wall, the bricked-up arch."],
        ],
      },
      {
        if: 'dlc_june_told',
        then: [
          {
            scene: { at: 'paloma_fort', cast: ['june', 'dess'] },
            say: [
              ['caption', 'The fort steps. June at the bottom, the helmet in its string bag. Dess at the top, in the orange cardigan.'],
              ['caption', 'Pip and Toby have found something very interesting to look at on the far wall.'],
              ['caption', 'Nobody speaks for a long time. A gull lands on the step between them, considers the situation, and leaves.'],
              ['june', "You're very late."],
              ['dess', 'I know.'],
              ['caption', 'June comes up the steps, one at a time, and holds out the helmet.'],
              ['dess', '(turning it over; finding the scuff on the back) Turn four. The year before you. I told Toby it was the wall\'s fault.'],
              ['june', 'Was it?'],
              ['dess', 'No.'],
              ['june', '(no clipboard; the instructor voice gone, which is how you know) I kept it in a shed for forty years and told everyone it was a motorcycle helmet.'],
              ['dess', 'Was anyone fooled?'],
              ['june', "Everyone. I'm very convincing."],
              ['dess', '(beat) You were always going to be.'],
              ['caption', 'Toby comes forward with his hat in his hands. He gets as far as "June, I—".'],
              ['june', 'Later. Pip told me. (beat) Later, Mr Brask. Today we\'re building a car.'],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'paloma_fort', cast: ['dess', 'pip'] },
            say: [
              ['dess', '(not quite looking at him) You met her. June.'],
              ['jay', 'Yesterday.'],
              ['dess', 'And?'],
              ['jay', "She's well. She marks everything."],
              ['caption', 'Dess laughs. She keeps laughing until it turns into crying, and then she keeps both going for a while, and Pip does not know where to look.'],
              ['dess', "(wiping her eyes on the orange cardigan) Win did that. Win had a little book. She marked the milkman."],
              ['jay', "There's a helmet in her car. In the boot, under the warning triangle. Orange. A bird on the back."],
              ['dess', '(very still) She kept it.'],
              ['jay', 'She says it\'s a motorcycle helmet.'],
              ['dess', '(beat) Don\'t tell her I cried. She\'d mark it.'],
            ],
          },
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [
          {
            scene: { at: 'paloma_fort_gate', cast: ['hob', 'pip', 'dash', 'kit'] },
            say: [
              ['caption', 'Hob unloads the doughnut van. The seven parts come out in doughnut boxes, one part per box, labelled in marker pen: WHEEL. BIRD. CLOCK (SLOW). CARB. LAMPS x2. GEAR STICK. COIL.'],
              ['hob', "Right then. Seven parts, one hoist, a toolbox, four tyres, and a jam doughnut for the driver."],
              ['hob', "Which is Toby, because I've seen him drive."],
              ['pip', 'What does Jay get?'],
              ['hob', "Jay gets nothing. Jay's had a fire engine. It was on the radio. That's plenty for one week."],
              ['caption', 'Dash Lockwood climbs down from the van\'s roof rack, where he has been for the whole drive, holding his hat on.'],
              ['dash', '(to camera, recovering) Viewers... I am about to witness history. Kit, are we rolling?'],
              ['kit', "We're rolling. We're always rolling."],
              ['dash', '(off camera) Is my hair all right? It came up the hill on a van. (on camera) LEGENDS... are about to be... BUILT!'],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'paloma_fort_gate', cast: ['hob', 'pip'] },
            say: [
              ['caption', 'Hob unloads the doughnut van. The seven parts come out in doughnut boxes, one part per box, labelled in marker pen: WHEEL. BIRD. CLOCK (SLOW). CARB. LAMPS x2. GEAR STICK. COIL.'],
              ['hob', "Right then. Seven parts, one hoist, a toolbox, four tyres, and a jam doughnut for the driver."],
              ['hob', "Which is Toby, because I've seen him drive."],
              ['pip', 'What does Jay get?'],
              ['hob', "Jay gets nothing. Jay's had a fire engine. It was on the radio. That's plenty for one week."],
              ['jay', 'Fair.'],
              ['hob', "And you didn't mark me. I'll mark me. (squinting at the van) Doughnuts arrived upright. Six. One jam's dented."],
            ],
          },
        ],
      },
      {
        goto: 'powder_store', vehicle: false, stop: true, radius: 4,
        objective: 'To the powder store',
        say: [['pip', '(carrying the box marked BIRD in both arms, like a cake) Nobody bump me. Nobody even look at me.']],
      },
      {
        scene: { at: 'powder_store', cast: ['dess', 'toby', 'pip'] },
        say: [
          ['caption', 'The bricked arch in the fort wall. Toby lays his hand on it the way he laid it on the tyre.'],
          ['toby', "Old bricks. Good mortar. She did a proper job. Of course she did."],
          ['caption', 'Dess goes into the store\'s side vault and comes out with a wooden crate: fifty-year-old flares, and some grenades the army forgot.'],
          ['dess', 'For the wall.'],
          ['toby', '(peering in) Are those safe?'],
          ['dess', 'Probably fine.'],
          ['toby', 'Probably.'],
          ['pip', "That's two probablies."],
          ['toby', "That's one more than we usually get."],
          ['dess', '(handing Jay the rest of the crate) You\'ll want these later. Don\'t drop them. (beat) Or do. Away from me.'],
        ],
      },
      { reward: { weapons: ['grenade'] } },
      { music: 'tension' },
      {
        say: [
          ['toby', 'Everybody round the corner. Further. Further than that, trouble.'],
          ['pip', "I'm round the corner."],
          ['toby', 'Be round a different corner.'],
        ],
      },
      { wait: 1.5 },
      { slowmo: 2, say: [['caption', 'A muffled thump, deep in the wall. Then the whole fort breathes out dust.']] },
      { fade: 'out' },
      { spawnCar: 'firecrest', type: 'ironclad', at: 'powder_store', color: FIRECREST_ORANGE, name: 'the Firecrest' },
      { fade: 'in' },
      { music: 'hope' },
      {
        scene: { at: 'powder_store', cast: ['dess', 'toby', 'pip'] },
        say: [
          ['caption', 'The dust settles. Where the bricks were there is a dark arch, and in the arch, a long low shape under a canvas sheet.'],
          ['caption', 'Toby and Dess take a corner each. They pull it off together, in one go. They have done this before.'],
          ['caption', 'Flame orange under fifty years of dust. A hole on the bonnet where the bird should be. A hole in the dash where the clock went. No wheel. No lamps. Beautiful.'],
          ['toby', '(a long silence) Hello, old girl.'],
          ['caption', 'Pip crouches by the driver\'s door and rubs the dust away with her sleeve. Underneath, painted small in gold:'],
          ['pip', "...'Junebug.'"],
        ],
      },
      {
        if: 'dlc_june_told',
        then: [
          {
            scene: { at: 'powder_store', cast: ['june', 'dess', 'pip'] },
            say: [
              ['june', '(very quietly) Aunt Win called me that.'],
              ['dess', 'Win got it from me.'],
              ['caption', 'June has to sit down. The only thing to sit on is a doughnut box marked CARB. She sits on it anyway.'],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'powder_store', cast: ['dess', 'pip'] },
            say: [
              ['pip', "That's what Great-Aunt Win called Mum. Junebug. Mum never knew where she got it."],
              ['dess', 'Win got it from me.'],
              ['caption', 'Pip looks at her grandmother for a long time. Dess lets her.'],
            ],
          },
        ],
      },
      {
        scene: { at: 'powder_store', cast: ['dess', 'toby', 'pip'] },
        say: [
          ['caption', 'Dess opens the boot. Inside, wrapped in an old racing blanket: a silver cup. A dent in the lid. And on the base, cut by the Speedway engraver fifty years ago: O. MARLOW.'],
          ['caption', "Nobody touches it. Pip has her hands behind her back, like it's a museum."],
          ['jay', "So the one in Castellane's trophy room..."],
          ['toby', 'Is a copy, made that week. Rex couldn\'t let the engraver do it twice.'],
          ['dess', "(closing the boot, gently) She's been keeping it warm."],
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [
          {
            scene: { at: 'powder_store', cast: ['dash', 'kit'] },
            say: [
              ['dash', '(to camera, holding his hat) Viewers. That\'s... (beat) I haven\'t got a word.'],
              ['dash', "(giving up on the camera) Kit, I haven't got a word. Eight series. I've always had a word."],
              ['kit', '(still filming) Keep not having one. It\'s working.'],
            ],
          },
        ],
        else: [],
      },
      {
        phone: 'milo',
        say: [
          ['caption', "A video call on Pip's phone. Milo, at his grandad's desk, sees the car. He doesn't say anything at all for eleven seconds."],
          ['milo', 'Can you turn the phone round? I want to see the bird bit.'],
          ['milo', "(beat) There's no bird. Why is there no bird? Is the bird in a box? Which box?"],
          ['pip', "Box marked BIRD, Milo."],
          ['milo', '(settling, voice wobbling only slightly) Right. Rebuild scoreboard. Seven parts. Nought fitted. Go.'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['pip', "Are you going to post it? A hundred thousand people would lose their minds."],
              ['milo', "(a pause) I'm not posting this. Not today."],
              ['milo', 'This is ours today.'],
            ],
          },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', "I'm drawing her on the wall. Life size. (beat) Not life size. The wall isn't big enough. Life size of a hamster."],
            ],
          },
        ],
      },
      {
        scene: { at: 'powder_store', cast: ['dess', 'toby'] },
        say: [
          ['caption', 'On a shelf in the vault, an old shortwave set, crackling. Dess turns it up.'],
          ['dess', "Guest Services' channel. A keeper hears everything. I've listened to them for ten years. They talk about lunch a lot."],
          ['ottoline', '(on the radio, calm as a closing door) All units to the fort, please. We\'d like to assist Mrs Marlow with her property.'],
          ['dess', 'Mrs. Cheek.'],
          ['jay', 'How many?'],
          ['dess', 'All of them.'],
          ['toby', '(taking his jacket off, rolling his sleeves up) Then you\'ll have to be quick, son. Because I won\'t be.'],
        ],
      },
      {
        if: 'dlc_june_told',
        then: [
          {
            say: [
              ['june', "I'm not going anywhere. I'll be in the lighthouse, where I can see the car."],
              ['dess', '(to June) Lock the door. Mind the stairs. Number nine wobbles.'],
            ],
          },
          { leave: ['june'], into: 'fort_light' },
          { protect: 'june' },
        ],
        else: [],
      },
      { protect: 'toby' },
      { join: ['dess', 'pip'], weapon: 'pistol' },
      gsSuv('gs_suv1', 'paloma_fort_gate'),
      gsSuv('gs_suv2', 'paloma_fort_gate'),
      { music: 'action', checkpoint: true },
      {
        survive: 95,
        objective: 'Hold the fort while Toby rebuilds the Firecrest',
        waves: [
          gsWave('paloma_fort_gate', 0, 4, 'pistol'),
          gsWave('old_lanes', 25, 4, 'pistol'),
          gsWave('paloma_fort_gate', 50, 4, 'smg'),
          gsWave('old_lanes', 75, 3, 'smg'),
        ],
        say: [
          ['gs_staff', '(through a megaphone at the gate) Good morning! Guest Services! Please remain where you are while we assist you!'],
          ['toby', '(from under the bonnet) Steering wheel. On. Fifty years on a water tower and not a spot of rust. Show-off.'],
          ['pip', "They're coming up the ramp! Four! Five! I can't count, I'm a driver!"],
          ['jay', '(as a teal Tern noses through the gate) Damn. They brought the big ones.'],
          ['toby', 'The bird. (beat) She\'s facing the right way. Dess, she\'s facing the right way.'],
          ['dess', '(from the wall, with a flare pistol) She always knew where the wind was.'],
          ['toby', "The clock. Still eleven seconds slow. I'm not fixing that either. Halcyon can stay stopped. Serves it right."],
          ['dess', 'Good line, Jay. Late on the brakes. Do that again with the next one.'],
          ['toby', 'Carburettor. Mowed a lawn for fifty years. Best-maintained carb on the island.'],
          ['pip', '(reloading) More in the lanes! Coming up the steps by the bakery!'],
          ['toby', 'Headlamps. Both. Somebody\'s polished them. Was that you, lifeguard?'],
          ['pip', "There's no lifeguard here, Toby!"],
          ['toby', "Then somebody's very tidy."],
          ['toby', "Gear stick. Third's still sticky. I'm not fixing it now. I've got principles and no time."],
        ],
      },
      {
        if: 'dlc_dash_in',
        then: [
          {
            survive: 55,
            objective: 'Hold the fort. One more wave',
            waves: [gsWave('paloma_fort_gate', 5, 3, 'shotgun'), gsWave('paloma_fort_gate', 20, 2, 'smg')],
            say: [
              ['caption', 'Dash and Kit drag two TV floodlights up onto the fort wall and switch them on, full beam, straight into the faces of the last wave.'],
              ['dash', '(to camera, shouting) Viewers, we are providing... lighting support!'],
              ['kit', "It's ten in the morning."],
              ['dash', "It's very bright lighting support!"],
              ['gs_staff', '(shielding his eyes) Sir, could you possibly— I can\'t see a— thank you for your patience—'],
              ['toby', '(from under the bonnet) Ignition coil. Last one. (beat) That\'s seven.'],
              ['milo', "(phone, from Pip's pocket, at the top of his voice) That's SEVEN!"],
            ],
          },
        ],
        else: [
          {
            survive: 55,
            objective: 'Hold the fort. The last wave',
            waves: [gsWave('paloma_fort_gate', 5, 4, 'shotgun'), gsWave('old_lanes', 15, 3, 'smg'), gsWave('paloma_fort_gate', 30, 3, 'smg')],
            say: [
              ['milo', "(phone, from Pip's pocket) Jay? Dash is on the Castellane breakfast channel. Live. I'm reading the caption off the telly."],
              ['milo', '(phone) He says the fort is "a hoax, frankly, a fibreglass hoax. I\'ve seen the replica, viewers. I\'ve touched it."'],
              ['pip', "(reloading) He's touched the REPLICA."],
              ['jay', "He's touched a lot of things."],
              ['gs_staff', '(coming through the gate with a shotgun) Good morning! Final call for assistance!'],
              ['toby', '(from under the bonnet) Ignition coil. Last one. (beat) That\'s seven.'],
              ['milo', "(phone, at the top of his voice) That's SEVEN!"],
            ],
          },
        ],
      },
      { music: 'off' },
      {
        scene: { at: 'powder_store', cast: ['dess', 'toby', 'pip'] },
        say: [
          ['caption', 'The courtyard is full of dust and smoke and abandoned teal Terns. Somewhere, somebody in a blazer is asking for a plaster.'],
          ['caption', 'In the arch, the Firecrest stands on four period tyres, white stripes clean, the gold bird back on the bonnet.'],
          ['caption', 'Jay unclips the starter key from his belt, on its little gold bird keyring, and holds it out. Not to Toby. To Dess.'],
          ['dess', '(looking at it, not taking it yet) Pip gave you that.'],
          ['jay', 'Driver holds the key.'],
          ['dess', '(taking it) Then I\'d better drive.'],
          ['caption', 'Dess gets into the driver\'s seat. She puts both hands on the wheel, ten and two, and sits there a moment.'],
          ['caption', 'She taps the wheel three times.'],
          ['dess', "Right. Let's see if I've still got it."],
        ],
      },
      { slowmo: 1.5, say: [['caption', 'First turn of the key. The engine catches, coughs once, and ROARS under the old stone vault.']] },
      {
        scene: { at: 'powder_store', cast: ['dess', 'toby', 'pip'] },
        say: [
          ['dess', '(over the engine, to the car) Hello, Junebug.'],
          ['toby', "(his hat in both hands, crying, a bit) First time. First turn of the key. Hell's bells."],
          ['pip', '(both fists in the air) HELL YES!'],
          ['caption', 'Nobody mentions that Toby is crying. Nobody mentions that Dess is, either.'],
        ],
      },
      {
        phone: 'leo',
        say: [
          ['leo', "Jay. (a pause; the voice warm, slightly cracked) I'm told Mrs Marlow is alive. I'm told she's well."],
          ['jay', "She's rude."],
          ['leo', '(almost a laugh) I\'m going to ask Ottoline to stand down. I\'m going to ask nicely.'],
          ['jay', 'Ask her loudly.'],
          ['leo', "I don't do loudly, Jay. I never have. (beat) Good morning."],
        ],
      },
      {
        scene: { at: 'powder_store', cast: ['dess', 'pip'] },
        say: [
          ['pip', 'Do we believe him?'],
          ['dess', "(switching off the engine, listening to it tick) I believe he'll ask."],
        ],
      },
    ],
  });

  // ---- END OF JOBS ----

  // =====================================================================
  // Ambient texts (bible, Appendix B)
  // =====================================================================
  D.texts.push(
    { after: 'd24_spare_parts', from: 'leo', message: "I don't believe we finished our call. My door is always open. Leo." },
    { after: 'd27_the_powder_store', from: 'toby', message: 'First turn of the key. Fifty years, and she started first time. Hell\'s bells, son.' },
  );
})();
