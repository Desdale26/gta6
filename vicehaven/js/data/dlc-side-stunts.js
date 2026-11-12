/*
 * data/dlc-side-stunts.js — "Chasing the Firecrest", side chain TAKE TWO
 * (dside_stunts, dst1 to dst4): Chet Valiant and Fenella Moss's film.
 *
 * Champions Since Day One needs a stunt driver who can do more than thirty,
 * and Fenella has found one. Four shoots across the bay: a one-take chase on
 * the Sunreel backlot, a night chase down the Neon Strand that two teal cars
 * take personally, a storm on Sandpiper Beach out of a borrowed airport
 * crash tender, and six buses at half-time at Mariner Stadium, with Chet in
 * the passenger seat going over thirty for the first time in his life.
 * Running gag: Trey, the white stunt Drifter with an X of tape on the roof,
 * scheduled to explode in every scene, who keeps coming back in one piece.
 *
 * Loaded after dlc-act4b.js. See docs/DLC_BIBLE.md (sections 1, 4, 7, 10,
 * 11) and docs/dlc/beats-side.md (TAKE TWO, DECISIONS). Side jobs float:
 * the chain opens after d04_stunt_double and can be played before or after
 * any later main job, so every line that leans on a main-job flag is an
 * `if` whose `else` also covers "not chosen yet". Reads dlc_chet_told /
 * dlc_chet_kept (d14), and the job ids d14_decoy, d17_contraband,
 * d26_blue_lights and d30_the_last_lap. Sets nothing; the finale's id
 * dst4_the_big_jump is read by d30 and the endings ("a film by Fenella
 * Moss"). No riddles, no Dess, no comment cards, no subscriber numbers.
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const TREY_WHITE = 0xf1f0ea;
  const VILLAIN_BLACK = 0x0e0e10;
  const TENDER_RED = 0xc8202a;
  const GS_TEAL = 0x13b5b1;

  // ------------------------------------------------------------ helpers
  /** Trey: the white stunt Drifter with a big X of tape on the roof. Due to explode in every scene. */
  const trey = (at) => ({ spawnCar: 'trey', type: 'drifter', at, color: TREY_WHITE, name: 'Trey' });
  /** A teal Guest Services Sovereign. */
  const gsCar = (id, at) => ({ spawnCar: id, type: 'sovereign', at, color: GS_TEAL });
  /** Somebody behind the wheel of a spawned car, driving to a place (or after a car). */
  const driver = (id, car, at, to, faction, hostile) => ({ id, faction: faction || 'guest_services', hostile: !!hostile, at, behavior: 'drive', car, to });

  // =====================================================================
  // dst1 — Second Unit
  // =====================================================================
  const dst1 = {
    id: 'dst1_second_unit',
    title: 'Second Unit',
    giver: 'fenella',
    start: 'sunreel_backlot',
    time: 10,
    estMinutes: 9,
    summary: "The first unit couldn't get the chase. The first unit had Chet driving it at thirty.",
    reward: { money: 1500 },
    failIf: ['wrecked:trey'],
    steps: [
      trey('sunreel_backlot'),
      { music: 'off' },
      { camera: 'sunreel_backlot', seconds: 4, say: [['caption', 'Sunreel Studios. Second unit. 10 a.m.']] },
      { camera: 'sunreel_city_set', seconds: 3, say: [['caption', 'The city set: twelve shopfronts, a bank, a subway entrance, and nothing behind any of them.']] },
      {
        scene: { at: 'sunreel_backlot', cast: ['fenella', 'chet'] },
        say: [
          ['fenella', '(three phones, a sun visor, and a megaphone she uses from four feet away) Mercer. Good. Watch this.'],
          ['caption', 'On a monitor on a trolley: yesterday\'s rushes. A gold car goes past a fake bank. Slowly. Then, after a while, it goes past again.'],
          ['fenella', "That's the first unit's chase. I've seen faster funerals. Nice funerals. Lovely flowers. Not a chase."],
          ['chet', '(from a deckchair under a parasol with CHET printed on it) It was a respectful pace.'],
          ['fenella', 'It was a pace you could knit to, Chet.'],
          ['chet', 'My mother knitted to it. She said it was very watchable.'],
          ['fenella', '(lowering the megaphone a quarter of an inch) So. Second unit. No stars, no catering, no second takes. You.'],
          ['caption', 'Behind her, on the backlot road: a white Drifter with a big X of gaffer tape on its roof and a little paper tag on the mirror.'],
          ['fenella', "That's Trey. Trey explodes at the end of the sequence. Not today, not by you. By Gary, with a button."],
          ['fenella', 'Bring him back in one piece so Gary can do it properly.'],
          ['jay', '(to the car) Hello, Trey.'],
          ['fenella', "Don't name it. The crew named it. Now they're sad every time."],
          ['jay', 'Every time?'],
          ['fenella', 'There have been four Treys. Gary cried at the third one. Gary is a pyrotechnician. He cries at birthday candles.'],
          ['fenella', "(one of her phones rings; she looks at it; she doesn't answer) That's Bev. Bev in wardrobe. Bev would like to know where Rex Castellane's jacket is."],
          ['jay', 'Tell Bev tomorrow.'],
          ['fenella', "I've told Bev tomorrow for a week. Bev has started saying it back to me. It's very unsettling."],
        ],
      },
      {
        if: 'dlc_chet_told',
        then: [{
          scene: { at: 'sunreel_backlot', cast: ['fenella', 'chet'] },
          say: [
            ['chet', '(holding out his script like a man showing a doctor a rash) Kid. Look at this.'],
            ['caption', 'Every one of Rex Castellane\'s lines has a small, firm "no" written beside it in blue pen.'],
            ['chet', "Fenella says that's not acting. I say it's a choice."],
            ['fenella', "It's forty pages of a man saying no, Chet."],
            ['chet', 'Some of the greatest performances in history are a man saying no. (beat) Name one. I can\'t. But they exist.'],
          ],
        }],
        else: [{
          if: 'dlc_chet_kept',
          then: [{
            scene: { at: 'sunreel_backlot', cast: ['fenella', 'chet'] },
            say: [
              ['chet', '(turning a page of his script, frowning at it) Fenella. In this scene. Does Rex know he\'s...'],
              ['caption', 'He catches Jay\'s eye. He stops.'],
              ['chet', '(closing the script) Never mind. Just a film.'],
              ['fenella', "(not looking up from a phone) Rex knows his marks, Chet. That's all Rex needs to know."],
              ['chet', '(quietly, to nobody) Lucky Rex.'],
            ],
          }],
          else: [{
            scene: { at: 'sunreel_backlot', cast: ['fenella', 'chet'] },
            say: [
              ['chet', '(rising, one hand raised to the sky, rehearsing) Champions since day one!'],
              ['chet', '(lower, a growl, a man in a dark room) Champions... since... day one.'],
              ['chet', '(brightly, a man selling a sofa) Champions since day one! Ask in store.'],
              ['fenella', 'The second one.'],
              ['chet', 'The second one?'],
              ['fenella', 'No. None of them. Sit down, Chet.'],
            ],
          }],
        }],
      },
      {
        if: 'd14_decoy',
        then: [{
          scene: { at: 'sunreel_backlot', cast: ['fenella'] },
          say: [
            ['fenella', "(not looking at him) You drove my replica round a power station. I saw the scratches."],
            ['fenella', "I'm not angry. I'm taking notes."],
            ['jay', 'On what?'],
            ['fenella', 'On you. One day I want to know what that was. Today I want a chase.'],
          ],
        }],
      },
      {
        scene: { at: 'sunreel_backlot', cast: ['fenella', 'chet'] },
        say: [
          ['fenella', "Right. The run. One take, because second unit can afford one take and a sandwich."],
          ['fenella', 'Up the ramp over the subway entrance. The railings are real. The subway is not. Do not go down the subway.'],
          ['fenella', "Through the bank window. It's sugar glass. It's meant to break. It's the only thing on this lot that does what it's meant to."],
          ['fenella', 'Out, left, down to the western set, round the saloon at full lock. Back here to the chalk mark by the crane.'],
          ['fenella', 'Before the light moves. The light moves at ten-thirty. The light does not care about you.'],
          ['chet', "Kid. If you go over thirty, I can't watch. (settling his sunglasses) I'll listen."],
          ['jay', "You'll hear it."],
          ['chet', "(a hand on his heart) That's what I'm afraid of."],
        ],
      },
      {
        getIn: 'trey',
        objective: 'Get in Trey',
        say: [
          ['chet', '(calling after Jay from the deckchair) You know my work, kid? Oversteer 2: Understeer?'],
          ['jay', 'Loved the first one.'],
          ['chet', '(delighted, both hands up) Thank you! (beat) There was no first one. It\'s a long story. The short version is: lawyers.'],
          ['chet', 'The long version is also lawyers. And a pelican. But mostly lawyers.'],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        say: [
          ['fenella', '(megaphone, from the crane platform) Quiet on set! Second unit, scene forty-one, the chase. Take one. Only take.'],
          ['fenella', 'And... ACTION!'],
        ],
      },
      { timer: 150 },
      {
        race: { checkpoints: ['subway_ramp', 'fake_bank', 'sunreel_western_set', 'camera_mark'], rivals: [], laps: 1 },
        objective: 'Do the chase in one take: the ramp, the bank window, the western set, the mark',
        say: [
          ['fenella', '(on the loudspeaker on the crane) Ramp! Ramp! Lovely!'],
          ['jay', '(to the car, as the nose comes up) Easy, Trey. Up and over.'],
          ['fenella', 'Window! Glass! Glorious! That window cost me four hundred dollars and it has never looked better!'],
          ['chet', '(on the set radio, faintly) Is he over thirty? Don\'t tell me. I can hear it. He\'s over thirty.'],
          ['fenella', 'Full lock round the saloon. Mind the chicken.'],
          ['jay', '(quietly) What chicken?'],
          ['chet', "(on the set radio) Somebody swapped the sheriff's weathervane for a plastic chicken. Nobody's owned up. It's the talk of catering."],
          ['chet', 'Catering has theories. Catering thinks it was the art department. The art department says the chicken is a choice.'],
          ['caption', 'Jay says nothing at all.'],
          ['fenella', 'Home! Bring him home! The mark is a T! It is shaped like a T!'],
          ['chet', "(on the set radio) I've opened one eye, kid. It's going very well. I'm closing it again."],
        ],
      },
      {
        goto: 'camera_mark', vehicle: 'trey', stop: true, radius: 5,
        objective: 'Stop Trey on the chalk mark',
        say: [
          ['fenella', 'On the mark. On it. Not near it. On it.'],
          ['jay', '(quietly, to the car, as the backlot dust settles round them) Damn, Trey. Not bad.'],
        ],
      },
      { music: 'hope' },
      {
        scene: { at: 'camera_mark', cast: ['fenella', 'chet'] },
        say: [
          ['caption', 'Steam ticks off Trey\'s bonnet. A little sugar glass glitters in the X on the roof.'],
          ['fenella', '(standing up slowly behind the monitor, very quiet) Cut.'],
          ['fenella', 'That was perfect. That was the best chase this lot has seen in twenty years.'],
          ['fenella', '(walking round the car, touching nothing, scowling at every panel) And he\'s still in one piece.'],
          ['fenella', '(over her shoulder, megaphone, at a man nobody can see) GARY. Stand down. Trey lives.'],
          ['caption', '(somewhere behind the bank, a long disappointed sigh)'],
          ['fenella', 'Trey was supposed to die in act two.'],
          ['jay', 'Trey had other plans.'],
          ['chet', '(getting out of the deckchair, with effort, in two attempts) Kid. Kid.'],
          ['chet', 'Loved the first one.'],
          ['jay', "There's only been one."],
          ['chet', '(a hand on Jay\'s shoulder) And I loved it.'],
          ['fenella', "(already on a phone, already walking) Night shoot. On the island. The Neon Strand. I'll text you."],
          ['fenella', "(turning back) Bring a jacket. The neon's cold. (beat) Not Bev's jacket. Your own jacket."],
        ],
      },
    ],
  };

  // =====================================================================
  // dst2 — Night Shoot
  // =====================================================================
  const dst2 = {
    id: 'dst2_night_shoot',
    title: 'Night Shoot',
    giver: 'fenella',
    start: 'neon_strand',
    time: 22.5,
    estMinutes: 10,
    summary: "A film chase down the Neon Strand. Two teal cars didn't get the call sheet.",
    reward: { money: 2000 },
    failIf: ['wrecked:trey'],
    steps: [
      trey('wonder_wharf'),
      { spawnCar: 'villain_car', type: 'ironclad', at: 'wonder_wharf', color: VILLAIN_BLACK, name: 'the villain car' },
      { music: 'off' },
      { camera: 'neon_strand', seconds: 4, say: [['caption', 'Isla Paloma. The Neon Strand. 10:30 p.m. A closed set, mostly.']] },
      { camera: 'castellane_palace', seconds: 3, say: [['caption', 'The Castellane Palace. CHAMPIONS SINCE DAY ONE, in gold neon, four storeys high. Castellane\'s film. Castellane\'s street.']] },
      {
        scene: { at: 'wonder_wharf', cast: ['fenella', 'chet'] },
        say: [
          ['caption', 'Base camp under the big wheel: a catering van, two lighting rigs, a monitor on a crate, and Trey, washed, with a fresh X on his roof.'],
          ['fenella', '(megaphone, at nobody, at everybody) Lights. More lights. I want this street to look like money had a nervous breakdown.'],
          ['fenella', '(seeing Jay) Mercer. Good. Jacket? (looking him over) Fine. It\'ll do. Nobody\'s looking at you anyway. They\'re looking at the car.'],
          ['chet', "(in Rex Castellane's red racing jacket and a dark, glossy period wig) Kid. Tonight I'm Rex on the night of the big win. Look at this hair."],
          ['jay', "It's a lot of hair."],
          ['chet', "It's two hundred dollars of hair. It has its own chair."],
          ['fenella', "The scene. The villain car runs from the Wharf down the Strand. Black Ironclad. Vince is driving."],
          ['caption', 'In the black Ironclad\'s driving seat, a man in a crash helmet raises a sandwich in greeting.'],
          ['fenella', "Vince has been thrown out of better cars than this. Vince bails before you hit him. Vince always bails."],
          ['fenella', 'You chase him in Trey and you wreck him. Cameras all the way down the Strand.'],
          ['fenella', "Wreck it anywhere south of the big wheel and I'll cut it so it's the fountain. That's what editing is: lying, but with rhythm."],
          ['jay', 'And Trey?'],
          ['fenella', '(darkly) Gary has a button for Trey at the end of the night. Gary is very excited. Gary has been excited since breakfast.'],
        ],
      },
      {
        if: 'dlc_chet_told',
        then: [{
          scene: { at: 'wonder_wharf', cast: ['fenella', 'chet'] },
          say: [
            ['chet', '(leaning in to Jay, tapping the margin of his script with a fat blue pen) He didn\'t win, kid. Says so right here, in my pen.'],
            ['fenella', "(not looking up from the monitor) Chet, that's my good script."],
            ['chet', "It's a better script now. It's got the truth in the margins. That's where all the best things are. Margins, and lay-bys."],
            ['fenella', 'Say the words on the page, Chet. In the light. Then you can write whatever you like on the dark bits.'],
          ],
        }],
        else: [{
          if: 'dlc_chet_kept',
          then: [{
            scene: { at: 'wonder_wharf', cast: ['fenella', 'chet'] },
            say: [
              ['chet', '(quietly, adjusting the wig) Fenella. Was Rex a good man?'],
              ['fenella', "He's a good part."],
              ['chet', "That's not what I asked."],
              ['fenella', '(a long look at the monitor, not at him) No. It isn\'t. Places, Chet.'],
            ],
          }],
          else: [{
            scene: { at: 'wonder_wharf', cast: ['fenella', 'chet'] },
            say: [
              ['chet', "(admiring himself in Trey's wing mirror, turning his head this way and that) Every racing driver I've played had this hair."],
              ['chet', '(leaning closer) I think it\'s the same wig. I think it\'s been in four films. I think it\'s older than the kid.'],
              ['fenella', "It's older than me, Chet. It was in a western. On a horse."],
              ['chet', '(touching it, with new respect) On a horse.'],
            ],
          }],
        }],
      },
      {
        if: 'd17_contraband',
        then: [{
          scene: { at: 'wonder_wharf', cast: ['fenella'] },
          say: [
            ['fenella', "One thing. Castellane's people have put a little tent halfway down the Strand. A Welcome Check. Cones. Smiling."],
            ['fenella', "They're not on my call sheet. They're not on anybody's call sheet. Go round them."],
            ['jay', "They don't like being gone round."],
            ['fenella', '(already walking off) Then go round them quickly.'],
          ],
        }],
      },
      {
        getIn: 'trey',
        objective: 'Get in Trey',
        say: [
          ['fenella', '(megaphone) Quiet on the Strand! That means you, big wheel! Rolling!'],
          ['fenella', 'Champions Since Day One, scene sixty-two, the night chase, take one.'],
        ],
      },
      { music: 'action', checkpoint: true },
      gsCar('gs_car1', 'strand_checkpoint'),
      gsCar('gs_car2', 'castellane_palace'),
      {
        spawn: [
          Object.assign(driver('gs_driver1', 'gs_car1', 'strand_checkpoint', 'trey', 'guest_services', true), { weapon: 'pistol' }),
          Object.assign(driver('gs_driver2', 'gs_car2', 'castellane_palace', 'trey', 'guest_services', true), { weapon: 'pistol' }),
        ],
      },
      {
        say: [
          ['fenella', 'And... ACTION!'],
        ],
      },
      // Vince takes the wheel only now, so the villain car is still at the Wharf when the chase starts.
      { spawn: [{ id: 'vince', at: 'wonder_wharf', behavior: 'drive', car: 'villain_car', to: 'castellane_palace', hostile: false }] },
      {
        chase: 'villain_car', mode: 'wreck', route: ['neon_strand', 'castellane_palace'],
        objective: "Chase the villain car down the Strand and wreck it (it's for the movie)",
        say: [
          ['fenella', '(on the set radio) Lovely. Closer. Closer! Make it look like you mean it.'],
          ['fenella', 'Vince says hello. (beat) Vince says not so close.'],
          ['jay', '(to the car) Come on, Trey. Big night.'],
          ['gs_staff', '(on a loudhailer, from a teal Sovereign pulling out behind you) Good evening! This is a private street! Please stop chasing that car!'],
          ['fenella', "Who are the teal people? They're not on my call sheet. Nobody teal is on my call sheet."],
          ['gs_staff', '(loudhailer) Sir! Sir! We would like to assist you in stopping!'],
          ['chet', "(on the set radio) Fenella, there's a man in a blazer chasing the kid. Is that the second unit? Is that a new character?"],
          ['fenella', "If he's good I'll keep him. If he's bad I'll cut him. Keep going, Mercer!"],
          ['jay', "(as a bullet ticks off Trey's roof) They're not acting."],
          ['fenella', "Nobody's acting tonight! It's wonderful!"],
        ],
      },
      { slowmo: 2, say: [['caption', '(Vince rolls clear onto the pavement, stands up, dusts off his knees and bows to nobody.)']] },
      { heat: 2, say: [['fenella', '(on the set radio, faintly) Are those... are those real sirens?']] },
      {
        loseHeat: true,
        objective: 'Shake the teal cars and the police before Fenella says cut',
        say: [
          ['fenella', "(on the set radio, thrilled) Real sirens! I couldn't afford real sirens! Camera three, pan with the police! PAN WITH THE POLICE!"],
          ['chet', "(on the set radio, horrified) Kid, they've got real guns. In my films the guns were bananas painted black."],
          ['chet', "We had a whole armoury of bananas. By the end of the shoot they'd all gone brown and we had to finish the film with cucumbers."],
          ['jay', 'Chet.'],
          ['chet', "I'm just saying, kid. Nobody ever shot at me with a cucumber and meant it."],
          ['gs_staff', '(loudhailer, falling behind) We would like to remind you that the Strand is a courtesy zone!'],
          ['fenella', "Don't stop! I've still got camera five down by the convention centre! Give camera five something!"],
          ['jay', '(swinging Trey into a side street, quiet) Damn. Sorry, Trey.'],
        ],
      },
      { leave: ['gs_driver1', 'gs_driver2'], vanish: true },
      { music: 'tension' },
      {
        goto: 'wonder_wharf', vehicle: 'trey', stop: true,
        objective: 'Bring Trey back to base camp at Wonder Wharf',
        say: [
          ['gs_staff', '(on the loudhailer, as one last teal Sovereign peels off at a junction) We\'d love your feedback on tonight\'s—'],
          ['jay', "(not stopping) I've got a glovebox full."],
          ['fenella', '(on the set radio, calmer) Mercer. Are you still alive? Is Trey?'],
          ['jay', 'Both.'],
          ['fenella', '(a sigh with a laugh in it) Gary\'s going to be devastated.'],
          ['jay', 'You make films for him. Castellane.'],
          ['fenella', 'He pays. Everybody pays somebody. The trick is to make something good while they\'re not looking.'],
          ['jay', 'Are they looking?'],
          ['fenella', "Tonight? (beat) They're looking at the fountain. I told them that's where the money shot is. It isn't. It's you, coming down the Strand with a teal car on your bumper."],
          ['fenella', "It's a lie with rhythm, Mercer. I told you."],
        ],
      },
      { music: 'hope' },
      {
        scene: { at: 'wonder_wharf', cast: ['fenella', 'chet'] },
        say: [
          ['caption', 'Base camp. The big wheel turns slowly overhead, every gondola lit.'],
          ['fenella', '(raising the megaphone, very formally, a long time after the action has stopped) CUT!'],
          ['fenella', '(lowering it) There. I wanted to say it. I never get to say it at the right time any more.'],
          ['fenella', '(walking round Trey: one bullet nick in the tape on the roof, nothing else) Trey was supposed to die in this scene too.'],
          ['jay', "He's stubborn."],
          ['chet', '(holding out a paper cup of tea from catering, both hands, the wig slightly off) Kid. For the nerves.'],
          ['jay', "I'm fine."],
          ['chet', "Not your nerves. Mine. You hold it. I'm shaking."],
          ['caption', 'Jay holds the tea. Chet holds the bonnet. Above them the big wheel goes round, every gondola empty.'],
          ['fenella', "(already on a phone) No, Gary. No. He's fine. (beat) I know. I know, Gary. Next time."],
        ],
      },
    ],
  };

  // =====================================================================
  // dst3 — The Rain Machine
  // =====================================================================
  const dst3 = {
    id: 'dst3_rain_machine',
    title: 'The Rain Machine',
    giver: 'fenella',
    start: 'airport_fire_station',
    time: 13,
    estMinutes: 10,
    summary: 'The rain machine broke. The light goes in five minutes. Fenella has had an idea.',
    reward: { money: 2000 },
    failIf: ['wrecked:crash_tender'],
    steps: [
      { spawnCar: 'crash_tender', type: 'firetruck', at: 'airport_fire_station', color: TENDER_RED, name: 'Tender Two' },
      { music: 'off' },
      { camera: 'airport_fire_station', seconds: 3, say: [['caption', 'Vicehaven International. The fire station. 1 p.m. Nobody is on fire.']] },
      {
        phone: 'fenella',
        say: [
          ['fenella', "Mercer. Are you near something red and big?"],
          ['jay', "I'm where you told me. There's a fire station."],
          ['fenella', 'Good. The rain machine has died. It made a noise like a goose and then it made no noise at all.'],
          ['fenella', "The scene is Rex in the storm, the night before the race. A biblical storm. On Sandpiper Beach. The light goes in five minutes."],
          ['jay', 'And?'],
          ['fenella', 'And a crash tender has a water cannon on the roof. I looked it up. It does nine hundred gallons a minute. That\'s biblical. That\'s Old Testament.'],
          ['fenella', "Borrow one. Nobody's on fire at the airport today, I checked."],
          ['jay', 'You checked.'],
          ['fenella', 'I asked a man in a hat.'],
          ['jay', 'What kind of hat?'],
          ['fenella', "A confident one. Five minutes, Mercer. It's for the movie."],
        ],
      },
      {
        if: 'd26_blue_lights',
        then: [{ say: [['jay', '(looking up at the tender, its big square cab, its cannon) We\'ve met.']] }],
        else: [{ say: [['jay', '(looking up at the tender, its big square cab, its cannon; to it) You\'re very big.']] }],
      },
      {
        getIn: 'crash_tender',
        objective: 'Borrow a crash tender',
      },
      { heat: 2 },
      { music: 'action', checkpoint: true },
      {
        say: [
          ['caption', '(Airport radio) Tender Two is... leaving? Tender Two, who\'s driving Tender Two?'],
          ['caption', '(Airport radio, another voice) Is there a fire? Did anybody order a fire?'],
        ],
      },
      {
        loseHeat: true,
        objective: "Lose the police before the beach, or they'll stop the shoot (siren on L)",
        say: [
          ['chet', '(on the phone) Kid. Kid, is that you on the news in a fire engine?'],
          ['jay', 'Probably.'],
          ['chet', '(on the phone) Are you going over thirty in it?'],
          ['jay', 'Sixty.'],
          ['chet', '(on the phone, a long breath) I need to sit down.'],
          ['chet', '(beat) I am sitting down. I need to sit down more.'],
          ['fenella', '(on the phone, distant, then close) Give me the phone, Chet.'],
          ['chet', "(on the phone) He's MY stunt double."],
          ['fenella', "(on the phone) He's the film's stunt double."],
          ['chet', "(on the phone) I'm the film!"],
          ['fenella', '(on the phone, winning) Mercer. Lose the police. If they follow you onto my beach they\'ll stop the shoot, and then they\'ll want permits.'],
          ['fenella', "(on the phone) I can't stand a permit. A permit is a cop that's been written down."],
          ['jay', '(leaning on the horn as the tender clears a junction like a red wall) Working on it.'],
        ],
      },
      { music: 'tension' },
      {
        deliver: 'crash_tender', to: 'sandpiper_beach', timeLimit: 240, radius: 25,
        objective: 'Get the rain to Sandpiper Beach before the light goes',
        say: [
          ['fenella', '(on the phone) Right. While you drive. I want you to understand the scene.'],
          ['fenella', '(reading, with enormous feeling) "A storm the like of which Southbay had never seen. Rex stands alone on the shore. He raises his fist to the heavens."'],
          ['fenella', '(normal voice) We have a hose. We have a very big hose.'],
          ['jay', 'Where do you want it?'],
          ['fenella', 'On Chet. On the extras. Near the sea, so it looks like the sea is joining in.'],
          ['fenella', "Not on the camera. The camera's rented. The camera has feelings and a deposit."],
          ['jay', '(to the tender, as it leans through a bend) Damn. Easy. You\'re not a car. Nobody told you that, but you\'re not.'],
          ['fenella', 'Three minutes of light. The sun is going behind a cloud. The cloud is not on my call sheet either.'],
          ['fenella', 'I can see the beach. I can see the sky. I can see a lifeguard with a whistle looking at me like I\'m a jellyfish.'],
        ],
      },
      Object.assign(trey('sandpiper_beach'), { offset: [10, 6] }),
      {
        spawn: [
          { id: 'gully', char: 'gully', at: 'sandpiper_beach', behavior: 'idle' },
          { id: 'chet', char: 'chet', at: 'sandpiper_beach', behavior: 'idle' },
          { id: 'fenella', char: 'fenella', at: 'sandpiper_beach', behavior: 'idle' },
          { group: 'extras', at: 'sandpiper_beach', count: 7, behavior: 'idle', hostile: false },
        ],
      },
      {
        scene: { at: 'sandpiper_beach', cast: ['fenella', 'chet', 'gully'] },
        say: [
          ['caption', 'Sandpiper Beach. Seven extras in yellow raincoats stand in a line on dry sand under a blue sky. Trey is parked by the waterline with a pyro rig on his roof.'],
          ['gully', '(sprinting up the sand, whistle going, waving both arms at the fire engine) No! No! No vehicles on the beach!'],
          ['fenella', "It's for the movie."],
          ['gully', "It's a fire engine."],
          ['fenella', "It's a cloud."],
          ['gully', 'No vehicles on the beach. No rain on the beach.'],
          ['fenella', "Rain's natural."],
          ['gully', "Not out of a lorry it's not."],
          ['chet', "(in Rex's red jacket, holding a little umbrella over his wig) Kid. You made it. I watched you on a phone."],
          ['chet', 'A man in a raincoat held it up for me. I watched with my hands over my eyes.'],
          ['jay', 'Then how did you watch?'],
          ['chet', 'Between the fingers. Like a professional.'],
          ['fenella', '(megaphone) Umbrella OUT, Chet. Rex does not own an umbrella. Rex has never owned an umbrella.'],
          ['fenella', '(to Jay) Back in the cloud, Mercer. Cannon on the actors. Make it rain.'],
        ],
      },
      { getIn: 'crash_tender', objective: 'Back in the tender' },
      {
        wait: 20,
        objective: 'Make it rain on Chet (hold the water cannon on the actors)',
        say: [
          ['fenella', '(megaphone) And... STORM!'],
          ['fenella', 'More rain! Biblical! I said biblical, not drizzle!'],
          ['gully', '(whistle) Phweeeeet! (whistle) Phweet! That\'s my lifeguard tower! You\'ve soaked my tower!'],
          ['chet', '(drenched, fist to the heavens, booming) Tomorrow we race! And tomorrow we... (spits out water) ...win, apparently.'],
          ['fenella', 'Without "apparently", Chet!'],
          ['chet', '(soaked to the wig) Apparently is a very wet word, Fenella! It got in my mouth!'],
          ['gully', '(whistle) No shouting on the beach either!'],
          ['fenella', "Lightning cue in three! Gary! Gary, are you ready? Lightning on Trey in three, two..."],
        ],
      },
      { slowmo: 2, say: [['caption', '(Lightning cue. Gary presses the button. The pyro on Trey\'s roof is soaked through. It fizzles. Trey does not explode.)']] },
      { music: 'hope' },
      {
        scene: { at: 'sandpiper_beach', cast: ['fenella', 'chet', 'gully'] },
        say: [
          ['caption', 'Steam drifts off the wet sand. One wisp of grey smoke comes out of the pyro rig on Trey\'s roof and gives up.'],
          ['fenella', '(quietly, looking at Trey) Trey was supposed to die in this scene.'],
          ['jay', "It's raining."],
          ['fenella', 'You did that.'],
          ['caption', 'Somewhere behind the catering van, a man called Gary says something that is not suitable for this film.'],
          ['gully', '(writing on a little pad, ripping a page off, tucking it under the tender\'s wiper) Vehicle on the beach. Fire engine on the beach. Rain on the beach.'],
          ['jay', 'Three things.'],
          ['gully', "It's one ticket. It's a very full ticket."],
        ],
      },
      {
        if: 'dlc_chet_told',
        then: [{
          scene: { at: 'sandpiper_beach', cast: ['chet'] },
          say: [
            ['chet', "(wringing out Rex's jacket over the sand) In my version Rex stands in the rain and admits it. Fenella cut the page."],
            ['chet', '(pulling a folded page out of the jacket pocket) I\'ve got it here. In my pocket.'],
            ['chet', '(unfolding it; it comes apart in his hands) It\'s wet now.'],
            ['jay', 'You remember it?'],
            ['chet', '(tapping his temple) Every word, kid. I just need somewhere to say it.'],
          ],
        }],
        else: [{
          scene: { at: 'sandpiper_beach', cast: ['chet'] },
          say: [
            ['chet', '(wringing out his wig like a dishcloth) Kid. Take the fire engine back before somebody needs it. I couldn\'t live with myself.'],
            ['chet', '(beat) I could. But it\'d be a smaller life.'],
          ],
        }],
      },
      {
        scene: { at: 'sandpiper_beach', cast: ['fenella'] },
        say: [
          ['jay', 'The tender.'],
          ['fenella', '(waving a hand at it, at the airport, at the whole idea of consequences) Leave it there. Somebody will collect it. Somebody always does.'],
          ['fenella', '(turning back, megaphone up) Chet! Dry the wig! Next week we jump some buses!'],
          ['chet', '(from very far away, a small voice) Some what?'],
        ],
      },
    ],
  };

  // =====================================================================
  // dst4 — The Big Jump
  // =====================================================================
  const dst4 = {
    id: 'dst4_the_big_jump',
    title: 'The Big Jump',
    giver: 'chet',
    start: 'mariner_stadium',
    time: 19.5,
    estMinutes: 11,
    summary: 'Six buses, one Drifter, forty thousand free extras, and Chet Valiant in the passenger seat.',
    reward: { money: 3000 },
    // Trey's last explosion is the job's very last step: the job has passed by the time he's wrecked.
    failIf: ['wrecked:trey', 'dead:chet'],
    steps: [
      trey('bowl_car_park'),
      { music: 'off' },
      { camera: 'mariner_stadium', seconds: 4, say: [['caption', 'Mariner Stadium. Half-time. The sun has eleven minutes left in it.']] },
      { camera: 'stadium_bus_ramp', seconds: 3, say: [['caption', 'In the car park: a take-off ramp, six buses parked nose to tail, and a landing ramp on the far side. Somebody has measured it. Somebody has measured it twice.']] },
      {
        scene: { at: 'mariner_stadium', cast: ['fenella', 'chet'] },
        say: [
          ['caption', 'Through the marathon gate comes the roar of a full stadium: the Mariners, one-nil down, and forty thousand people with nothing to do for fifteen minutes.'],
          ['fenella', '(megaphone, beaming, at a range of one foot) Half-time at the Mariners. Forty thousand people already here. And they\'re free extras.'],
          ['jay', 'Do they know?'],
          ['fenella', "They will in a minute. It's the best kind of extra. They don't want lunch and they don't have agents."],
          ['fenella', 'The stunt. Trey goes over the buses. Through the marathon gate, round the stadium apron, north side, south side, and back across my line in the car park.'],
          ['fenella', 'Before the sun goes. When the sun goes, the shot goes, and the shot is the whole film. No pressure.'],
          ['jay', "That's pressure."],
          ['fenella', "It's a little pressure. It's for the movie."],
          ['chet', '(arriving at speed, for Chet, which is a brisk walk, holding a brand-new white helmet with the price sticker still on it) Kid. I\'m coming with you.'],
          ['jay', 'Why?'],
          ['chet', "For research. Rex goes over the buses in the film. Rex would know what it feels like. (beat) I don't know what it feels like. I've never known what anything feels like over thirty."],
          ['fenella', 'Your insurers will kill me.'],
          ['chet', 'My mother will kill you first. Then my insurers. In that order. It\'s in the contract.'],
          ['fenella', '(pinching the bridge of her nose) Clause nine.'],
          ['chet', 'Clause nine. Mother first.'],
        ],
      },
      {
        if: 'dlc_chet_told',
        then: [{
          scene: { at: 'mariner_stadium', cast: ['fenella', 'chet'] },
          say: [
            ['chet', "(to Jay, quietly proud) I've rewritten the last scene. Rex loses. Fenella hasn't read it yet."],
            ['fenella', "I've read it."],
            ['chet', '(braced) And?'],
            ['fenella', '(a long beat) It\'s better.'],
            ['chet', '(to Jay, in a whisper that carries to the back row) It\'s better.'],
          ],
        }],
        else: [{
          if: 'dlc_chet_kept',
          then: [{
            scene: { at: 'mariner_stadium', cast: ['fenella', 'chet'] },
            say: [
              ['chet', '(turning the helmet in his hands) Fenella, why does Rex never look at the trophy? In any scene? Not once. I\'ve checked.'],
              ['chet', "I'm asking for Rex."],
              ['fenella', '(not answering; not able to) Get in the car, Chet.'],
            ],
          }],
          else: [{
            scene: { at: 'mariner_stadium', cast: ['fenella', 'chet'] },
            say: [
              ['chet', 'Thirty-one years in pictures, kid. Four racing drivers, two pilots and a submarine.'],
              ['chet', 'Never been over thirty in any of them. Not even the submarine.'],
              ['jay', 'How fast does a submarine go?'],
              ['chet', "I don't know, kid. We filmed it in a car park. We were the car park's fastest submarine."],
            ],
          }],
        }],
      },
      { join: ['chet'] },
      {
        getIn: 'trey',
        objective: "Get in Trey (Chet's coming)",
        say: [
          ['chet', '(lowering himself into the passenger seat, the helmet on backwards, then forwards) Seatbelt. Where\'s the... there it is. Two seatbelts? Can I have two?'],
          ['jay', "There's one."],
          ['chet', 'I\'ll hold it with both hands. That\'s like two.'],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        say: [
          ['fenella', '(on the set radio) Champions Since Day One. Scene ninety. The jump. Take one. Forty thousand witnesses.'],
          ['fenella', 'And... ACTION!'],
        ],
      },
      {
        goto: 'stadium_bus_ramp', vehicle: 'trey', stop: false, radius: 12,
        objective: 'Jump the buses (clear all six and land on the far ramp)',
        say: [
          ['chet', '(eyes on the speedo) Twenty-five. Twenty-eight. Twenty-nine. This is where I usually stop. This is my... this is the edge of my world, kid.'],
          ['chet', 'THIRTY-ONE.'],
          ['chet', 'Thirty-one. I\'m fine. I\'m fine. I\'m absolutely fine.'],
          ['chet', 'THIRTY-FIVE.'],
          ['jay', '(to the car, the ramp coming up white in the windscreen) Straight, Trey. Nice and straight.'],
          ['chet', "WHY ARE YOU TALKING TO THE CAR. TALK TO ME. I'M THE ONE WHO'S FRIGHTENED."],
        ],
      },
      {
        slowmo: 2,
        say: [
          ['chet', '(in the air over six buses, eyes wide, both hands on one seatbelt) I CAN SEE MY WHOLE CAREER!'],
          ['jay', 'Seatbelt.'],
        ],
      },
      { timer: 90 },
      {
        race: { checkpoints: ['stadium_gate', 'stadium_apron_north', 'stadium_apron_south', 'bowl_car_park'], rivals: [], laps: 1 },
        objective: 'Through the gate and round the stadium before the sun goes',
        say: [
          ['chet', '(screaming, but in full sentences, like a trained actor) THIS IS WHAT THEY FEEL LIKE? ALL OF THEM? ALL THE CARS I PRETENDED TO DRIVE?'],
          ['fenella', '(on the set radio) Keep screaming, Chet, it\'s gold. It\'s pure gold.'],
          ['chet', 'I AM NOT SCREAMING FOR YOU, FENELLA. I AM SCREAMING FOR ME.'],
          ['caption', 'Through the marathon gate, and forty thousand people on the north stand rise to their feet at once with a noise like the sea.'],
          ['chet', "(waving out of the window, still screaming) THEY'RE CHEERING. KID, THEY'RE CHEERING. HELLO. HELLO. I'M IN FILMS."],
          ['jay', 'Hold on.'],
          ['chet', "I'M HOLDING ON. I'M HOLDING ON TO EVERYTHING. I'M HOLDING ON TO THINGS THAT AREN'T EVEN IN THE CAR."],
          ['fenella', 'South side! The sun\'s on the roof of the stand! Go, go, go!'],
          ['chet', '(suddenly calm, a small voice, looking at the speedo) Kid. It says seventy.'],
          ['jay', 'It does.'],
          ['chet', '(a beat; then, at the top of his lungs) SEVENTYYYYYY!'],
        ],
      },
      {
        goto: 'bowl_car_park', vehicle: 'trey', stop: true, radius: 8,
        objective: "Stop on Fenella's mark",
        say: [
          ['fenella', '(on the set radio) The mark! Hit the mark! Hit it like you\'re angry with it!'],
        ],
      },
      { leave: ['chet'] },
      { music: 'triumph' },
      { spawn: [{ id: 'camera_crew', at: 'bowl_car_park', offset: [24, 16], behavior: 'idle', hostile: false }] },
      { goto: 'camera_crew', vehicle: false, radius: 4, objective: "Leave Trey on the mark and walk over to Fenella's monitor" },
      {
        scene: { at: 'camera_crew', cast: ['chet', 'fenella'] },
        say: [
          ['caption', 'Behind them the stadium is still on its feet. Somebody has started a chant. It is, mostly, the word "AGAIN".'],
          ['caption', 'Chet Valiant stands in the car park with one hand flat on the roof of a stranger\'s car, his helmet on crooked, shaking from his shoes up.'],
          ['chet', '(after a long time, very quietly) Again.'],
          ['fenella', 'Chet—'],
          ['chet', 'Again.'],
          ['fenella', '(to Jay) That\'s five scenes Trey was meant to die in.'],
          ['jay', "He's got a good agent."],
          ['chet', '(still holding the roof, to nobody) Seventy. My mother\'s never been seventy. My mother is seventy-nine and she\'s never been seventy.'],
        ],
      },
      {
        if: 'd30_the_last_lap',
        then: [{
          scene: { at: 'camera_crew', cast: ['fenella'] },
          say: [
            ['fenella', '(putting the megaphone down on the monitor, carefully, as if it might go off) Mercer.'],
            ['fenella', "I filmed it, you know. The real thing. From the commentary box. It's the best thing I've ever shot."],
            ['fenella', "And not one frame of it was for the movie. (beat) Don't tell Castellane. He'd want it lit."],
          ],
        }],
        else: [{
          scene: { at: 'camera_crew', cast: ['fenella'] },
          say: [
            ['fenella', '(putting the megaphone down on the monitor, carefully, as if it might go off) Mercer.'],
            ['fenella', "Whatever it is you're really doing round here, Mercer. One day I'm filming that."],
            ['jay', "I just drive."],
            ['fenella', "Everybody just does something. That's where all the good films come from."],
          ],
        }],
      },
      { camera: 'bowl_car_park', seconds: 4, say: [['caption', 'Trey, alone on his mark in the evening light. The X on his roof. A little sugar glass still in the tape. Parked, empty, in no danger at all.']] },
      { music: 'off' },
      // Last step on purpose: Trey's wreck can't fail a job that has already passed.
      {
        explode: 'trey',
        say: [
          ['caption', '(Trey quietly explodes.)'],
          ['caption', '(Somewhere behind the stand, a man called Gary shouts "THAT WASN\'T ME!")'],
          ['chet', '(watching the smoke go up, after a respectful pause) ...Loved the first one.'],
        ],
      },
    ],
  };

  D.side.push({ id: 'dside_stunts', title: 'Take Two', giver: 'chet', unlockAfter: 'd04_stunt_double', missions: [dst1, dst2, dst3, dst4] });
})();
