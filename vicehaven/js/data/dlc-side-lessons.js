/*
 * data/dlc-side-lessons.js — "Chasing the Firecrest", side chain DUAL CONTROL
 * (dside_lessons, dsl1 to dsl3): June Marlow's driving school.
 *
 * June has decided that the man driving her daughter about "needs
 * supervision", and she is going to provide it. Three lessons in Vista
 * Verde: a stolen learner car chased through the cul-de-sacs, the school's
 * under-twelves (and a cake, and a pelican) driven to the cup final at
 * Mariner Stadium against the clock, and the Marlow Test in the Verde Mall
 * car park. Every job has June's clipboard and a mark. June says "Minor
 * fault", never "Serious fault" here (d09 owns that), and never "And mind
 * the road" (d25 owns that).
 *
 * Loaded after dlc-act4b.js. See docs/DLC_BIBLE.md (sections 1, 4, 7, 10,
 * 11) and docs/dlc/beats-side.md (DUAL CONTROL, DECISIONS 16 to 18). Side
 * jobs float: the chain opens after d09_minor_fault and can be played before
 * or after any later main job. June does not know her mother is alive, so no
 * line refers to Dess as living except one in dsl3 inside `if:
 * 'dlc_june_told'`. Reads d25_junebug (dsl1, dsl3), dst4_the_big_jump
 * (dsl2) and dlc_june_told (dsl3). Sets nothing; the finale's id
 * dsl3_test_day is read by d25 and Ending A ("He got a 94. You can get a
 * 94."). No riddles, no comment cards, no subscriber numbers.
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const LEARNER_BLUE = 0x78b8e8;
  const NEIGHBOUR_BEIGE = 0xcbbd9c;
  const SCHOOL_YELLOW = 0xf2c61f;

  // ------------------------------------------------------------ helpers
  /** June's pale-blue dual-control Pipit, MARLOW SCHOOL OF MOTORING on the doors. */
  const learner = (at) => ({ spawnCar: 'learner', type: 'pipit', at, color: LEARNER_BLUE, name: "June's learner car" });

  // =====================================================================
  // dsl1 — Three-Point Turn
  // =====================================================================
  const dsl1 = {
    id: 'dsl1_three_point_turn',
    title: 'Three-Point Turn',
    giver: 'june',
    start: 'june_house',
    time: 10,
    estMinutes: 9,
    summary: "Rosa Lindqvist is on her twelfth three-point turn. Somebody else has stolen the car she's doing it in.",
    reward: { money: 1200 },
    failIf: ['wrecked:learner'],
    steps: [
      learner('verde_culdesac'),
      { spawnCar: 'neighbour_car', type: 'vireo', at: 'verde_culdesac', color: NEIGHBOUR_BEIGE },
      { music: 'off' },
      { camera: 'verde_culdesac', seconds: 4, say: [['caption', "Vista Verde. A cul-de-sac. Saturday, 10 a.m. Rosa Lindqvist's twelfth three-point turn."]] },
      {
        if: 'd25_junebug',
        then: [{
          scene: { at: 'verde_culdesac', cast: ['june', 'rosa'] },
          say: [
            ['june', '(on the pavement, clipboard up, not turning round) Mr Mercer. Good. You came.'],
            ['june', "I've marked you once. I'm going to keep marking you until one of us dies, and it won't be me. I indicate."],
            ['jay', 'Morning, Mrs Marlow.'],
            ['june', "It's a lesson. Lessons don't have mornings. Stand there. Watch how it's done."],
          ],
        }],
        else: [{
          scene: { at: 'verde_culdesac', cast: ['june', 'rosa'] },
          say: [
            ['june', '(on the pavement, clipboard up, not turning round) Mr Mercer.'],
            ['june', "You've been driving my daughter about. I'm going to supervise you."],
            ['jay', 'Supervise me.'],
            ['june', "It's a word, Mr Mercer. It means 'watch you very closely and write things down'. You can start by watching how it's done."],
          ],
        }],
      },
      {
        scene: { at: 'verde_culdesac', cast: ['june', 'rosa'] },
        say: [
          ['caption', "Rosa Lindqvist, sixteen, sits in the driver's seat of the learner car with both hands on the wheel and her shoulders up by her ears. The engine is running. So, slightly, is she."],
          ['rosa', "(through the open window, very small) I've failed this eleven times."],
          ['june', 'Twelve is a lucky number, Rosa.'],
          ['rosa', 'Is it?'],
          ['june', 'For somebody.'],
          ['rosa', '(to Jay) Hi. Sorry. Hi. Are you the man from the shed?'],
          ['jay', 'I was in the shed. Briefly.'],
          ['june', "Don't talk to the pupil, Mr Mercer, she's concentrating. Rosa. Mirror."],
          ['rosa', 'Mirror.'],
          ['june', 'Signal.'],
          ['rosa', "There's nobody here. It's a cul-de-sac. Who am I signalling to?"],
          ['june', 'The world, Rosa. You signal to the world.'],
          ['caption', '(The turn begins. It goes forward. It goes back. It goes forward again. It thinks about it. It goes back.)'],
          ['caption', '(Seven points.)'],
          ['june', '(writing) Minor fault. Minor fault. (beat) That was a hedge.'],
          ['rosa', "It's still a hedge. It's just a bit further back now."],
          ['june', "Mrs Pell will see it that way, I'm sure. Out you get. I'll do a demonstration. Watch my hands, both of you."],
          ['caption', "(Rosa gets out to swap seats. She leaves the engine running. June's clipboard is on the passenger seat, where it always is.)"],
        ],
      },
      {
        spawn: [{ id: 'thief', faction: 'civilian', hostile: false, at: 'verde_culdesac', behavior: 'drive', car: 'learner', to: 'verde_mall' }],
      },
      {
        camera: 'verde_culdesac', seconds: 3,
        say: [
          ['caption', '(A man in a tracksuit comes out of nowhere, drops into the driver\'s seat, and is gone up the cul-de-sac in a perfectly executed one-point turn.)'],
        ],
      },
      {
        getIn: 'any', checkpoint: true,
        objective: 'Get in a car',
        say: [
          ['june', '(very calm) My clipboard.'],
          ['rosa', '...The car, Mrs Marlow.'],
          ['june', 'The car is insured. The clipboard has thirty years on it.'],
          ['caption', '(Next door, a man with a hose watches Jay walk towards his beige Vireo, and sighs like it has happened before.)'],
          ['rosa', '(to the man with the hose) He\'s a professional. I think. Of something.'],
        ],
      },
      { music: 'action' },
      {
        phone: 'june',
        say: [
          ['june', "Mr Mercer, it's June Marlow. I'm staying with my pupil. I don't abandon pupils."],
          ['jay', 'I know who it is.'],
          ['june', "Then you'll know I want that car back in the condition it left in. He's heading for the mall. They always head for the mall."],
        ],
      },
      {
        chase: 'learner', mode: 'catch', route: ['verde_mall'], escape: 400,
        objective: "Catch June's learner car. Box it in, gently: it's June's",
        say: [
          ['june', '(on the phone, pencil audibly moving) He hasn\'t indicated once.'],
          ['june', 'Not once. Not at the turning, not at the sprinklers. A man who will steal a car will not indicate. I have always said so.'],
          ['rosa', '(in the background) Can I watch? Can we follow? Mrs Marlow, can I drive us?'],
          ['june', 'No.'],
          ['june', "Mirror check: none. Speed on approach to the school sign: excessive. He's going to fail, Mr Mercer."],
          ['jay', 'He stole it. He failed a while ago.'],
          ['june', '(as the learner car swerves round the little island at the end of Heron Way) Wrong way round the mini-roundabout. That\'s a fail. That\'s an instant fail.'],
          ['jay', 'Should I tell him?'],
          ['june', 'Box him in. Gently. That car has dual controls and a box of my good pencils.'],
          ['rosa', '(further away) Mrs Marlow, is this a lesson? Is this part of the lesson?'],
          ['june', 'Everything is part of the lesson, Rosa. Sit on the wall.'],
          ['jay', '(to the Vireo, as the hedges go past at the wrong speed) Sorry. You\'ll be home by lunch.'],
          ['june', "He's touching the brake in the bends. He's frightened. Good. Fear is the beginning of driving."],
          ['june', '(a little later) Mr Mercer, was that you or him on the verge?'],
          ['jay', 'Him.'],
          ['june', "It was you. I can hear a verge. Minor fault."],
        ],
      },
      { music: 'hope' },
      { leave: ['thief'] },
      {
        wait: 1.5,
        say: [
          ['caption', '(The thief gets out with his hands up, looks at Jay, looks at the learner car with MARLOW SCHOOL OF MOTORING on the door, and runs.)'],
          ['jay', '(after him, not very loud) Mirror.'],
        ],
      },
      {
        getIn: 'learner',
        objective: "Get in June's learner car",
        say: [
          ['caption', "(On the passenger seat: one clipboard, intact. One box of pencils, good. On the dashboard, a sticker: 'THIS CAR HAS DUAL CONTROLS. SO DOES THE INSTRUCTOR.')"],
        ],
      },
      {
        goto: 'june_house', vehicle: 'learner', stop: true, radius: 8,
        objective: "Bring June's car home. Drive it like she's watching",
        say: [
          ['jay', "(to the car, easing off the handbrake) Easy. She'll know if we scratch you."],
          ['jay', "She'll know if we think about scratching you."],
          ['caption', "(The learner car has a second brake pedal on the passenger side. Jay's left foot keeps looking at it, like there's somebody sitting there.)"],
          ['caption', "(Today's sheet for Rosa is clipped to the top of the board. It is full of small, neat handwriting. The last line reads: 'Twelve. Lucky.')"],
          ['jay', '(at the junction, indicating to an empty road) There. Happy?'],
          ['caption', '(Nobody answers. The car seems happy.)'],
          ['jay', "(after a moment, quietly) She wrote 'lucky' before Rosa had done it."],
          ['jay', '(to the car) Damn. She was going to pass her anyway, wasn\'t she.'],
        ],
      },
      { music: 'off' },
      {
        scene: { at: 'june_house', cast: ['june', 'rosa'] },
        say: [
          ['caption', "June is waiting on the drive. She doesn't look at Jay. She walks round her car slowly, touching each corner with the end of her pencil, like a vet with a nervous horse."],
          ['june', 'Front left. Front right. (beat) Rear right. (beat) Rear left.'],
          ['june', "(holding out her hand, not for the keys) Clipboard."],
          ['jay', '(handing it over) He didn\'t touch it.'],
          ['june', "Nobody touches it. (she checks it anyway, page by page) Thank you, Mr Mercer."],
          ['rosa', '(staring up the road, where the thief went) At least I\'ve never done THAT.'],
          ['june', "That's the spirit, Rosa. There is always somebody worse. Very often they're in a tracksuit."],
          ['caption', '(June tears off a sheet she has, somehow, been filling in the whole time, and hands it to Jay.)'],
          ['june', "Boxing in: good. Mirror checks: none. Mounting a verge: minor fault. Returning the car: I'll allow it."],
          ['jay', "That's a pass?"],
          ['june', "That's a sheet. You'll get more."],
          ['rosa', 'Mrs Marlow, do I still get my demonstration?'],
          ['june', "(already walking to the driver's door) Watch my hands, Rosa. Mr Mercer, you can go. (beat) Not that way. That's a hedge."],
        ],
      },
    ],
  };

  // =====================================================================
  // dsl2 — School Run
  // =====================================================================
  const dsl2 = {
    id: 'dsl2_school_run',
    title: 'School Run',
    giver: 'june',
    start: 'vista_verde_school',
    requires: ['dsl1_three_point_turn'],
    time: 14.5,
    estMinutes: 9,
    summary: 'The school bus has broken down on cup final day. June has volunteered somebody.',
    reward: { money: 1500 },
    failIf: ['wrecked:school_van'],
    steps: [
      { spawnCar: 'school_van', type: 'porter', at: 'vista_verde_school', color: SCHOOL_YELLOW, name: 'the school van' },
      { music: 'off' },
      { camera: 'vista_verde_school', seconds: 4, say: [['caption', 'Vista Verde School. The under-twelves are in the cup final at Mariner Stadium in twenty minutes. The bus is not.']] },
      {
        scene: { at: 'vista_verde_school', cast: ['june', 'dougie'] },
        say: [
          ['caption', "At the school gates: a broken-down bus with its bonnet up, eleven children in green kit, and June Marlow, who is not a teacher here and has somehow ended up in charge."],
          ['june', 'Mr Mercer. The bus has broken down. I\'ve volunteered you.'],
          ['jay', "You didn't ask."],
          ['june', "You'd have said yes. I saved us both the time."],
          ['jay', 'Why are you here? You teach driving.'],
          ['june', "I taught the headmaster. I taught the bus driver. I taught the caretaker, twice. When this school has a vehicle problem, Mr Mercer, it rings me."],
          ['june', "(pointing with her pencil at a yellow van) The school van. Eleven players, their kit, one cake. The final kicks off at three. If they're late, they forfeit."],
          ['jay', 'One cake.'],
          ['june', "Mrs Pell made it. It's a cake. It's a cup. It's a cake cup."],
          ['caption', "(It is a sponge cake the size of a car tyre, iced gold, shaped like the Southbay Schools Cup, with handles. It wobbles when anybody breathes.)"],
          ['caption', '(Beside it, a boy in a full white-and-yellow pelican costume is flapping. He does not stop flapping.)'],
          ['dougie', "(flapping) I'm the Pelican. I have to stay in character."],
          ['june', 'Douglas, wings in.'],
          ['dougie', "Pelicans don't have wings in."],
          ['june', "This one does, or he walks to Mariner Stadium. (to Jay) Douglas Penn. Year Seven. The mascot. He's been in character since September."],
          ['dougie', '(gravely, to Jay) The Pelican has been in character since the egg.'],
          ['jay', "(after a moment) Right."],
          ['june', "I'll be in the passenger seat. I'm always in the passenger seat."],
        ],
      },
      { join: ['june', 'dougie'], weapon: 'fists' },
      {
        getIn: 'school_van', checkpoint: true,
        objective: 'Drive the team to Mariner Stadium. Gently: there\'s a cake',
        say: [
          ['caption', '(Eleven children climb into the van at once, all of them talking. The cake goes in last, carried by four of them, like something from a museum.)'],
          ['june', '(buckling up, clipboard on her knee) Seatbelts, everybody. Douglas, that includes the beak.'],
        ],
      },
      { music: 'hope' },
      {
        deliver: 'school_van', to: 'mariner_stadium', maxDamage: 0.2, timeLimit: 240,
        objective: 'Get the team to the final: on time, with the cake',
        say: [
          ['june', 'Mirror. Signal. Off you go. (beat) Not like that. Like that. Yes.'],
          ['caption', '(In the back, eleven voices start a song. It is about a pelican. It has one verse.)'],
          ['caption', '("Oh, the Pelican, the Pelican, he holds it in his beak! He holds it in his beak, oh, the Pelican!")'],
          ['caption', '(The verse ends. There is a short, hopeful silence. The verse begins again.)'],
          ['june', 'Speed bump, Mr Mercer.'],
          ['jay', 'I saw it.'],
          ['june', 'Then why are we in the air?'],
          ['dougie', "(from the back, leaning into the mirror) Mr Mercer can't see out the back."],
          ['june', 'Douglas, wings DOWN.'],
          ['dougie', "The Pelican is assisting with the mirror. The Pelican is a team player."],
          ['dougie', 'Are you a racing driver?'],
          ['jay', 'No.'],
          ['dougie', 'Are you a getaway driver?'],
          ['jay', '(a pause) I\'m a van driver.'],
          ['june', '(writing) Minor fault. Hesitation.'],
          ['jay', "That wasn't driving."],
          ['june', "Everything is driving, Mr Mercer."],
          ['caption', '(The verse begins again. Somebody in the back has found a second part to sing. It is the same as the first part, but higher.)'],
          ['caption', '(Halfway down the hill, the cake begins to slide. June puts out one hand and stops it, without looking up from her clipboard.)'],
          ['june', '(still writing) Cornering. Minor fault.'],
          ['jay', 'You caught a cake without looking.'],
          ['june', "Thirty years in the passenger seat. I've caught worse. I once caught a goldfish bowl on the Coast Road. The goldfish passed. The pupil didn't."],
          ['dougie', 'Is it far? The Pelican is getting hot.'],
          ['june', "It's eleven minutes, Douglas, if Mr Mercer stops treating the amber lights as a suggestion."],
          ['jay', '(to the van, gently, as the engine labours up the rise) Come on. You\'ve done worse. You\'ve done the school trip to the zoo.'],
          ['june', 'It did. It came back with a goat. Nobody has ever explained the goat.'],
          ['caption', '(At the Heron Way lights, Jay brakes early and smoothly. The cake does not move. June looks at him, then writes something, then underlines it.)'],
          ['dougie', '(quietly, to the cake) Hold on, cup. Hold on.'],
          ['caption', '(The verse begins again.)'],
          ['june', "(as Mariner Stadium's floodlights come up over the roofs) There. You see? A van, a cake and eleven children. None of them in the air. Mostly."],
        ],
      },
      { music: 'triumph' },
      {
        scene: { at: 'mariner_stadium', cast: ['june', 'dougie'] },
        say: [
          ['caption', '(The doors open. Eleven children pour out of the van and run for the players\' gate in a single green blur, still singing.)'],
          ['caption', '(Four of them come back for the cake.)'],
          ['june', '(inspecting it, like a car after a lesson) Handles. Base. Lid. (beat) It\'s a cake cup. It\'s still a cake cup.'],
          ['caption', '(Dougie Penn is last out of the van. He walks up to Jay, stands very straight, and solemnly shakes his hand with a wing.)'],
          ['dougie', 'Thank you, driver. The Pelican thanks you.'],
          ['jay', 'Win.'],
          ['dougie', "The Pelican doesn't play. The Pelican is a symbol."],
        ],
      },
      {
        if: 'dst4_the_big_jump',
        then: [{
          scene: { at: 'mariner_stadium', cast: ['june', 'dougie'] },
          say: [
            ['dougie', '(looking round the car park) Is this where the bus jump was? My cousin saw a car jump six buses.'],
            ['dougie', 'He said a man in a red jacket screamed the whole way. He said it was the best thing he ever saw. He said the screaming was in full sentences.'],
            ['jay', '(after a moment) I heard about that.'],
            ['june', "(not looking up) Six buses. And not one of them indicating. Go in, Douglas."],
          ],
        }],
        else: [{
          scene: { at: 'mariner_stadium', cast: ['june', 'dougie'] },
          say: [
            ['dougie', '(looking up at the stadium) It\'s very big. The Pelican has never been in anything this big.'],
            ['jay', "You'll be fine. Stay in character."],
            ['dougie', '(deeply moved) The Pelican will.'],
          ],
        }],
      },
      { leave: ['dougie'] },
      {
        scene: { at: 'mariner_stadium', cast: ['june'] },
        say: [
          ['caption', "June turns over the page on her clipboard, totals a column of little ticks and crosses, and draws a line under it."],
          ['june', 'Seven minor faults. And a pelican.'],
          ['jay', "The pelican's not a fault."],
          ['june', "Douglas is always a fault. It's not his fault."],
          ['june', "(tucking the pencil behind her ear) I'm going in to watch. Somebody has to tell the referee he's standing in the wrong place."],
          ['jay', "Do you know anything about football?"],
          ['june', 'No. But I know where people should stand, Mr Mercer. It\'s the same thing.'],
        ],
      },
      { leave: ['june'] },
      { music: 'off' },
      { wait: 3 },
      { text: 'june', message: 'Lost 4-1. The cake won. They ate it on the pitch. Your braking at Heron Way was acceptable. J. Marlow' },
      { wait: 2 },
    ],
  };

  // =====================================================================
  // dsl3 — Test Day
  // =====================================================================
  const dsl3 = {
    id: 'dsl3_test_day',
    title: 'Test Day',
    giver: 'june',
    start: 'verde_mall',
    requires: ['dsl2_school_run'],
    time: 11,
    estMinutes: 10,
    summary: "The Marlow Test. Nobody drives June's daughter about who hasn't passed it.",
    reward: { money: 2000 },
    failIf: ['heat:1', 'wrecked:learner'],
    steps: [
      learner('verde_mall'),
      { music: 'off' },
      {
        camera: 'verde_mall', seconds: 4,
        say: [
          ['caption', 'Verde Mall car park. Sunday, 11 a.m. The Marlow Test.'],
          ['caption', '(In a far corner of the car park: a line of orange cones, a trolley shelter, and two parked cars with exactly one car\'s length and a bit between them. None of it is an accident.)'],
        ],
      },
      { camera: 'mall_cone_slalom', seconds: 3, say: [['caption', '(The cones have been laid out with a tape measure. The tape measure is still there, in case of disputes.)']] },
      {
        scene: { at: 'verde_mall', cast: ['june', 'rosa'] },
        say: [
          ['june', '(clipboard, pencil, a fresh sheet with MERCER, J. at the top) The Marlow Test.'],
          ['june', 'Nobody drives my daughter about who hasn\'t passed it. That includes her.'],
          ['jay', "Pip's passed it?"],
          ['june', 'Ninety-one. She argued with the cones.'],
          ['caption', "(In the next bay, Rosa Lindqvist sits behind the wheel of her mum's car with a silent examiner beside her. She is as white as the paper on his clipboard. She waves.)"],
          ['rosa', "(through the window) Mrs Marlow! It's today! It's my real one!"],
          ['june', 'I know, Rosa. I booked it. Breathe, Rosa. Mirror, signal, breathe.'],
          ['rosa', 'Which comes first?'],
          ['june', 'Breathe. Always breathe first.'],
          ['rosa', '(breathing in, and not out) Okay.'],
          ['june', 'Out as well, Rosa.'],
          ['rosa', '(out) Okay.'],
          ['caption', '(The examiner writes something down. Nobody has ever heard him speak. Rosa believes he can\'t.)'],
          ['june', '(to Jay, quietly) Third time. She knows how. She just doesn\'t know that she knows.'],
          ['jay', 'And me?'],
          ['june', '(a look over the top of the clipboard) You know that you know, Mr Mercer. That\'s a different problem.'],
        ],
      },
      { join: ['june'], weapon: 'fists' },
      {
        getIn: 'learner', checkpoint: true,
        objective: 'Get in. June\'s in the passenger seat, with the other brake',
        say: [
          ['june', '(settling in, both feet over her own pedals) Hands.'],
          ['caption', '(Jay puts his hands at ten and two without thinking. June notices.)'],
          ['june', 'Who taught you that?'],
          ['jay', 'My grandmother. In a car park.'],
          ['june', '(a beat) Sensible woman.'],
          ['june', '(turning back a page) Last time: mounting a verge. Let\'s see.'],
        ],
      },
      {
        goto: 'mall_cone_slalom', vehicle: 'learner', stop: false, radius: 5,
        objective: 'Slalom through the cones',
        say: [
          ['june', 'Indicate, Mr Mercer. Even when nobody\'s shooting.'],
          ['jay', "Nobody's shooting."],
          ['june', "Not yet. You're the sort of driver people shoot at. I can tell from your mirrors."],
          ['jay', "What's wrong with my mirrors?"],
          ['june', "Nothing. You check them like somebody's behind you. Somebody usually is, I expect."],
          ['caption', '(Left of the first cone. Right of the second. Left. Right. Left. The car rocks gently, like a boat on a pond.)'],
          ['june', "(writing) Smooth. Don't let it go to your head. Heads are where accidents start."],
        ],
      },
      {
        goto: 'mall_reverse_corner', vehicle: 'learner', stop: true, radius: 4,
        objective: 'Reverse round the corner and stop by the kerb',
        say: [
          ['june', 'Round the corner, in reverse, and stop by the kerb. Not on it. By it.'],
          ['june', 'Mirror. Mirror. Other mirror.'],
          ['june', "That's three mirrors. Good."],
          ['jay', 'There are only two mirrors.'],
          ['june', "There's the one inside, Mr Mercer. Always three. Some people count the one in their head. I don't encourage that."],
        ],
      },
      {
        goto: 'mall_trolley_lane', vehicle: 'learner', stop: false, radius: 8,
        objective: 'Drive down the lane at walking pace',
        say: [
          ['june', '(conversationally, looking out of the window) Lovely day for it.'],
          ['jay', 'It is.'],
          ['june', 'They\'re doing a two-for-one on hanging baskets at the garden centre. I might get one for the porch.'],
          ['caption', '(A shopping trolley. Out of nowhere. With a pot plant in it.)'],
        ],
      },
      {
        goto: 'mall_trolley_stop', vehicle: 'learner', stop: true, radius: 3,
        objective: 'EMERGENCY STOP!',
        say: [
          ['june', '(not raising her voice even slightly) Stop.'],
        ],
      },
      {
        wait: 2,
        say: [
          ['caption', '(The learner car rocks to a halt. The trolley rolls on across the lane, past the bonnet, and comes to rest against a bollard. The pot plant does not lose a leaf.)'],
          ['june', 'Good.'],
          ['caption', '(She writes for a long time.)'],
          ['june', 'Good.'],
          ['jay', 'Did you push that trolley?'],
          ['june', "A trolley rolls out in this car park every eleven minutes, Mr Mercer. I've timed them. I don't need to push anything."],
        ],
      },
      {
        deliver: 'learner', to: 'mall_parallel_bay', maxDamage: 0.05, radius: 2.5,
        objective: 'Parallel park between the two cars. Don\'t touch either',
        say: [
          ['caption', '(June says nothing at all. Not a word. Not a mirror. The pencil hovers. It is much worse than talking.)'],
          ['rosa', '(from the next bay, loudly, through two windows) I\'M DOING IT TOO.'],
          ['caption', '(Somewhere behind them, the silent examiner writes something down.)'],
        ],
      },
      { music: 'triumph' },
      { leave: ['june'] },
      {
        scene: { at: 'verde_mall', cast: ['june', 'rosa'] },
        say: [
          ['caption', '(Rosa runs over across six empty bays, holding her test sheet above her head like a cup.)'],
          ['rosa', 'I PASSED! I did a three-point turn in THREE POINTS!'],
          ['june', '(marking Rosa\'s sheet, with a smile she doesn\'t let reach her voice) Three points. I always said twelve was lucky.'],
          ['rosa', 'He said "pass"! He spoke! He has a really deep voice!'],
          ['june', "He saves it. Well done, Rosa. Go and show your mother. Walk. Don't run in a car park."],
          ['caption', '(Rosa runs. June lets it go.)'],
          ['caption', "(Then June turns to Jay's sheet, adds up a column of small, neat numbers, checks it, and adds it up again.)"],
        ],
      },
      {
        if: 'd25_junebug',
        then: [{
          scene: { at: 'verde_mall', cast: ['june'] },
          say: [
            ['june', "Ninety-four. Again. That's either very good or very boring."],
            ['jay', 'What were the six?'],
            ['june', "Hesitation, at the van. And your face when I said 'emergency'."],
            ['jay', "I didn't make a face."],
            ['june', "You made a small face, Mr Mercer. I mark small faces."],
          ],
        }],
        else: [{
          scene: { at: 'verde_mall', cast: ['june'] },
          say: [
            ['june', 'Ninety-four per cent. Nobody gets a hundred. I didn\'t.'],
            ['jay', 'What were the six?'],
            ['june', "Hesitation, at the van. And your face when I said 'emergency'."],
            ['jay', "I didn't make a face."],
            ['june', "You made a small face, Mr Mercer. I mark small faces."],
          ],
        }],
      },
      {
        scene: { at: 'verde_mall', cast: ['june'] },
        say: [
          ['caption', '(June takes a certificate from the back of the clipboard. MARLOW SCHOOL OF MOTORING across the top in blue, MERCER, J. underneath. It has been typed in advance.)'],
          ['jay', 'You typed this before I took the test.'],
          ['june', "I type them all before. It saves time. I've only had to throw away four hundred."],
          ['caption', '(She hands him the certificate. She keeps the marked sheet, folds it once, and slides it into her blouse pocket.)'],
          ['june', "I'll keep this. For reference."],
        ],
      },
      {
        if: 'dlc_june_told',
        then: [{
          scene: { at: 'verde_mall', cast: ['june'] },
          say: [
            ['june', '(quietly, one hand on the pocket) Somebody I know might need a lesson.'],
            ['june', 'Somebody old. And very sure of herself.'],
            ['jay', "She'll hate it."],
            ['june', '(and for a second it isn\'t the instructor voice at all) Good.'],
          ],
        }],
        else: [{
          scene: { at: 'verde_mall', cast: ['june'] },
          say: [
            ['june', 'Now drive my daughter wherever she\'s going. Carefully.'],
            ['june', '(not looking at him) And bring her back.'],
            ['jay', 'I always bring her back.'],
            ['june', "I know. I've been marking that too."],
          ],
        }],
      },
      { music: 'off' },
    ],
  };

  D.side.push({ id: 'dside_lessons', title: 'Dual Control', giver: 'june', unlockAfter: 'd09_minor_fault', missions: [dsl1, dsl2, dsl3] });
})();
