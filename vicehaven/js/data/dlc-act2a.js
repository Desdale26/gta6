/*
 * data/dlc-act2a.js — "Chasing the Firecrest", ACT 2: HIDING IN PLAIN SIGHT,
 * first half (d09 to d12).
 *
 * A lawnmower that does forty and the woman who mows with it; a celebrity
 * race won by somebody who isn't the celebrity, and a name painted out of
 * an honours board; two lamps on two very tall chairs behind Leo
 * Castellane's new fence; and a floor safe nobody has opened in fifty years,
 * on a promenade that used to be a speed shop.
 *
 * Loaded after dlc-act1b.js. See docs/DLC_BIBLE.md (sections 1, 4, 7, 11),
 * docs/dlc/beats-act2.md and docs/mission-format.md. Reads dlc_blog_on /
 * dlc_blog_off (d08): why Guest Services come in d09, Milo's subscriber line
 * or paper wall in d10 and d11, Dash on the beach (and the whistle) or two
 * extra guards in d11. Sets no flags. Riddles R5, R6 and R8 are quoted word
 * for word from the bible's table; R7 is not a riddle and is read on the
 * spot. Tallies: June's one "Serious fault", crossed out (d09); the gnome
 * (d09) and, blog on only, the whistle (d11) for Lockwood; scoreboard four
 * parts (d09) and five (d11, the headlamps as a pair); 900 subscribers
 * (d11, blog on); comment card 5 (d11); Monty's wrong names (d10).
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const DRIFTER_WHITE = 0xf1f0ea;
  const LEARNER_BLUE = 0x78b8e8;
  const GS_TEAL = 0x13b5b1;
  const TV_PURPLE = 0x3b1558;
  const PICKUP_GREEN = 0x1f3a26;
  const HERITAGE_YELLOW = 0xf2c500;
  const CASTELLANE_GOLD = 0xd29a1c;

  // ------------------------------------------------------------ helpers
  /** Pip's white race-shop hack, a Drifter with tiny sponsor stickers. Jay drives it; she's banned. */
  const pipCar = (at) => ({ spawnCar: 'pip_car', type: 'drifter', at, color: DRIFTER_WHITE, name: "Pip's Drifter" });
  /** June's dual-control learner Pipit: L-plates, a second brake pedal, a clipboard on the dash. */
  const learner = (at) => ({ spawnCar: 'learner', type: 'pipit', at, color: LEARNER_BLUE, name: "June's learner car" });
  /** Toby's old green Mesa pickup: bench seat, no headlights. */
  const tobyPickup = (at) => ({ spawnCar: 'toby_pickup', type: 'mesa', at, color: PICKUP_GREEN, name: "Toby's pickup" });
  /** A teal Guest Services Sovereign. */
  const gsCar = (id, at) => ({ spawnCar: id, type: 'sovereign', at, color: GS_TEAL });
  /** Dash Lockwood's purple TV van. */
  const dashVan = (at) => ({ spawnCar: 'dash_van', type: 'porter', at, color: TV_PURPLE, name: "Lockwood's Lost Legends van" });
  /** Somebody behind the wheel of a spawned car, driving to a place (or after the car Jay is in: then they hunt it). */
  const driver = (id, car, at, to, faction) => ({ id, faction: faction || 'guest_services', hostile: false, at, behavior: 'drive', car, to });
  /** A riddle on a black screen, under one line saying where it was found. */
  const rhyme = (found, lines) => ({ blackout: [['caption', found]].concat(lines.map((l) => ['caption', l])) });

  // ------------------------------------------------------------ riddles
  // Dess's rhymes, word for word (docs/DLC_BIBLE.md, "The riddle chain").
  const R5 = ['My name was painted, then painted out,', 'where only winners stand and shout.', 'Be first across, then look below', 'the board where all the winners go.', 'And mind the road.'];
  const R6 = ['Two eyes that never shut all day', 'watch the swimmers splash and play.', 'One on each of two tall chairs,', "they're bright as mine, and they're a pair.", 'And mind the road.'];
  const R8 = ["I'm in a box where nobody wins,", 'beside a wheel that turns and spins.', 'Many have tried with a coin and a claw;', 'the wheel goes round, and goes nowhere at all.', 'And mind the road.'];

  // =====================================================================
  // d09 — Minor Fault
  // =====================================================================
  D.missions.push({
    id: 'd09_minor_fault',
    act: 2,
    title: 'Minor Fault',
    giver: 'pip',
    start: 'june_house',
    time: 13,
    estMinutes: 10,
    summary: 'The carburettor is in June Marlow\'s lawnmower. June Marlow is home early.',
    reward: { money: 1500, unlock: ['dside_lessons'] },
    failIf: ['wrecked:learner', 'dead:june', 'dead:pip'],
    steps: [
      { blackout: [['caption', 'Act Two'], ['caption', 'Hiding in Plain Sight']] },
      { music: 'off' },
      pipCar('verde_culdesac'),
      tobyPickup('verde_culdesac'),
      { camera: 'june_house', seconds: 4, say: [['caption', 'Vista Verde. Aunt Win\'s house. Tuesday, one o\'clock.']] },
      {
        scene: { at: 'june_house', cast: ['pip'] },
        say: [
          ['caption', 'A bungalow with a lawn so perfect it looks ironed. A shed at the side. On the path, a garden gnome with a fishing rod stands guard.'],
          ['pip', "(whispering, although nobody is home) Not outside the house. I told you. She knows the car. She knows every car."],
          ['jay', "I parked three doors down."],
          ['pip', "She knows three doors down. (beat) Mum's on lessons till four. Don't step on the lawn. She'll know. She measures it."],
          ['jay', 'Measures it.'],
          ['pip', 'With a ruler. On Sundays. After she mows it.'],
          ['caption', 'She lifts the gnome. Underneath, in a little square of dead grass, a key.'],
          ['pip', "It's been under the gnome since I was six. Mum thinks nobody knows. Everybody knows. The postman knows."],
          ['jay', '(looking back across the road at a green pickup with an old man in it, very still behind the wheel) He\'s parked outside again.'],
          ['pip', "He said he'd wait in the truck. (beat) He said he's had practice."],
          ['caption', 'Neither of them says anything else about that.'],
        ],
      },
      { join: ['pip'], weapon: 'fists' },
      {
        goto: 'win_shed', vehicle: false, stop: true, radius: 3,
        objective: "Get into Aunt Win's shed",
        say: [
          ['pip', "(behind him, on the path, on tiptoe) Stay on the slabs. The slabs. That's lawn. That's LAWN, Jay."],
          ['jay', "It's grass."],
          ['pip', "Not in this house it isn't."],
        ],
      },
      {
        scene: { at: 'win_shed', cast: ['pip'] },
        say: [
          ['caption', 'The plank door swings in. Jay walks face-first into a cobweb the size of a tablecloth.'],
          ['jay', '(peeling it off his face) Found the spider.'],
          ['pip', "That's Gerald. Don't hurt Gerald."],
          ['caption', 'Rakes, a watering can, forty years of jam jars full of screws. And on a sack in the middle, like a sleeping animal: the mower.'],
          ['caption', 'Ancient. Red. Enormous. And bolted to its side, gleaming like a gold tooth in an old mouth, a racing carburettor.'],
          ['pip', '(on her knees beside it, already working with a spanner from her back pocket) Twin-choke. Hand-finished. Look at the float bowl. Look at it.'],
          ['jay', "I'm looking."],
          ['pip', "You're not looking properly. Nobody makes these any more. Nobody made these THEN. She made this. With her hands."],
          ['caption', 'Four bolts. A fuel line, pinched off with her fingers. The carburettor comes away into her lap, heavy and bright.'],
          ['pip', '(very quietly) That\'s why it does forty.'],
          ['jay', '(to the mower, a hand on its handle) Sorry. You\'ll be slower now.'],
          ['caption', 'Outside: tyres on the drive. A car door. Footsteps on the slabs, not the lawn.'],
          ['pip', '(going white) Crap.'],
        ],
      },
      learner('june_house'),
      { spawn: [{ id: 'june', char: 'june', at: 'june_house', behavior: 'idle', hostile: false }] },
      {
        scene: { at: 'win_shed', cast: ['june', 'pip'] },
        say: [
          ['caption', 'June Marlow in the shed doorway. Pale-blue blouse, a clipboard, a pencil behind her ear. Pip\'s face, thirty years on and much more tired.'],
          ['june', 'Pip. Why is there a man in Aunt Win\'s shed.'],
          ['pip', '(the carburettor behind her back, which does not work, because it is the size of a loaf) Lesson cancelled?'],
          ['june', 'Rosa cried. We stopped early. Rosa cries at roundabouts. (beat) Who is this?'],
          ['jay', 'I drive.'],
          ['june', 'So do I. Professionally. For thirty years.'],
          ['caption', 'She looks at the carburettor. She looks at the mower, lying on its side with a hole in it. Something in her face goes very still.'],
          ['june', "That mower does forty. On the flat. I've never asked why."],
          ['jay', "Now you know."],
          ['june', '(not to him) You told me you had a summer job at the Speedway shop.'],
          ['pip', "I do. It's a shop. Sort of. It's a sort of shop."],
          ['june', 'Pip.'],
          ['pip', 'Mum—'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', "(very fast) Jay. Jay. Did you know that eighty per cent of garden sheds in Vista Verde are the same model? That's important. It's VERY important."],
              ['milo', "I waited a day, like I said. And this morning I posted 'Is the next part in a shed?' Just that. A question. A general question."],
              ['milo', "And somebody commented 'which shed'. And somebody else commented 'I know which shed'. And their picture is a teal blazer."],
              ['milo', "I didn't say WHICH shed!"],
              ['jay', 'How long ago?'],
              ['milo', "(very small) Forty minutes. (beat) Are they there? They're there. I can hear you not saying they're there."],
            ],
          },
        ],
        else: [
          {
            phone: 'toby',
            say: [
              ['toby', "Son. (beat) Two teal cars at the end of the road."],
              ['jay', 'Coming in?'],
              ['toby', 'Taking their time about it. Like they know where they\'re going.'],
              ['toby', "(a long breath) They were behind me from the marina. I drive slow. I'm the easiest tail in the world."],
              ['toby', "I'm sorry. (beat) I'm going round the block. Don't wait for me. Never wait for me."],
            ],
          },
        ],
      },
      gsCar('gs_car1', 'verde_culdesac'),
      gsCar('gs_car2', 'verde_culdesac'),
      {
        spawn: [
          { id: 'shed_gs', group: 'shed_crew', faction: 'guest_services', at: 'verde_culdesac', count: 4, weapon: 'pistol', behavior: 'guard' },
        ],
      },
      {
        scene: { at: 'june_house', cast: ['june', 'pip', 'gs_staff'] },
        say: [
          ['caption', 'Two teal Sovereigns stop nose to nose across the end of the drive, boxing in the white Drifter three doors down. Four teal blazers get out, smiling.'],
          ['gs_staff', '(through a little loudhailer, as if announcing a raffle) Good afternoon! We\'re here about a carburettor!'],
        ],
      },
      {
        if: 'dlc_blog_off',
        then: [
          {
            scene: { at: 'june_house', cast: ['june', 'pip', 'gs_staff'] },
            say: [
              ['gs_staff', '(cheerfully, with a little wave down the road at a green pickup going very slowly round the corner) Your engineer drives very carefully, Mr Mercer!'],
              ['pip', '(under her breath) Oh, Toby.'],
            ],
          },
        ],
        else: [
          {
            scene: { at: 'june_house', cast: ['june', 'pip', 'gs_staff'] },
            say: [
              ['gs_staff', '(holding up a phone) We\'re big fans of the blog! Is this the shed? It looks like the shed!'],
              ['pip', '(under her breath) Oh, Milo.'],
            ],
          },
        ],
      },
      {
        scene: { at: 'june_house', cast: ['june', 'pip', 'gs_staff'] },
        say: [
          ['june', '(not moving from the shed door) Who are these people.'],
          ['pip', "They're sort of after us."],
          ['june', 'Sort of.'],
          ['gs_staff', "We'd be happy to take it off your hands, madam! And the young lady! And the gentleman, if he'd like to come quietly!"],
          ['caption', 'Jay looks at the Drifter, boxed in. Then at the pale-blue Pipit on the drive, with L-plates and a dent in the bumper the shape of a bollard.'],
          ['june', "That's my car."],
          ['jay', 'Get in.'],
          ['june', "(already walking to it, clipboard first) I'm in the passenger seat. I'm always in the passenger seat."],
          ['caption', 'She gets in on the instructor\'s side and puts her foot on her own brake pedal. Pip dives in the back with the carburettor in her lap like a baby.'],
        ],
      },
      { join: ['june'], weapon: 'fists' },
      { protect: 'june' },
      { getIn: 'learner', objective: "Get everybody out in June's learner car" },
      { music: 'action', checkpoint: true },
      { spawn: [driver('gs_driver1', 'gs_car1', 'gs_car1', 'learner'), driver('gs_driver2', 'gs_car2', 'gs_car2', 'learner')] },
      {
        goto: 'vista_verde_school', vehicle: 'learner', stop: false, radius: 30,
        objective: 'Out of the cul-de-sac, past the school',
        say: [
          ['june', '(pencil moving, completely calm) Mirror. Signal. Manoeuvre.'],
          ['jay', "They're shooting."],
          ['june', "I can see they're shooting. Mirror."],
          ['caption', 'The Pipit goes over a front lawn and through a sprinkler. Water everywhere. June writes.'],
          ['june', 'Minor fault. (beat) Minor fault. (beat) That was a fountain.'],
          ['jay', 'It was a sprinkler.'],
          ['june', 'It was a sprinkler until you drove through it. Now it\'s a fountain.'],
          ['pip', "(from the back, hugging the carburettor) Mum, they're SHOOTING."],
          ['june', "I don't care if they're shooting, Mr Mercer, you indicate."],
          ['caption', 'Jay indicates.'],
          ['june', 'Thank you.'],
          ['jay', '(to the Pipit, flooring it, and getting not very much) Come on. Come on. You can do better than that.'],
          ['june', "It can't. It's limited. For safety."],
          ['jay', 'Damn.'],
          ['june', 'Language. Minor fault.'],
        ],
      },
      {
        heat: 2,
        say: [
          ['caption', 'A patrol car outside the school sees a learner car being shot at by two hotel cars, and does a very quick three-point turn.'],
          ['june', '(brightening) Oh, the police. Good. I know Sergeant Oduya.'],
          ['pip', 'From what?'],
          ['june', 'I failed him twice.'],
          ['pip', "Mum, that's not GOOD."],
          ['june', "He parks beautifully now. He sent me a card."],
        ],
      },
      {
        goto: 'verde_mall', vehicle: 'learner', stop: false, radius: 40,
        objective: 'Lose them in the mall car park',
        say: [
          ['june', "(as the mall comes up) Left. Into the car park. I've taught nine hundred people to park in there. I know every bay."],
          ['jay', 'Every bay.'],
          ['june', 'Bay one-forty has a pothole. Bay two-twelve is too narrow; the lines were painted by a man with a grudge. Row F is for reversing.'],
          ['caption', 'A family of ducks steps off the kerb into the lane. June stamps on her own brake. The Pipit stops dead. The Sovereign behind does not, and goes into a trolley shelter.'],
          ['june', '(not looking up from the clipboard) Ducks have right of way.'],
          ['pip', '(staring out of the back window at the trolleys still raining down) Mum. MUM.'],
          ['june', "It's in the Highway Code, Pip. Read it some time. It's very short."],
          ['caption', 'The second Sovereign comes at June\'s door, fast. Jay throws the Pipit up the kerb onto the pavement and takes the hit on the back wing, away from her.'],
          ['june', '(writing; steadily) Mounting the kerb. Serious fault.'],
          ['pip', '(from the back) He did that for YOU.'],
          ['caption', 'June keeps writing.'],
        ],
      },
      {
        loseHeat: true,
        objective: 'Lose the police',
        say: [
          ['june', 'Next left. Then the service road behind the garden centre. Nobody knows about the service road.'],
          ['jay', 'You know.'],
          ['june', 'I know everything about this postcode, Mr Mercer. I\'ve driven every inch of it at twenty miles an hour.'],
          ['pip', '(small, from the back, as the sirens fall away behind the garden centre) Mum, you\'re quite good at this.'],
          ['june', "I'm a professional."],
        ],
      },
      { leave: ['shed_gs_0', 'shed_gs_1', 'shed_gs_2', 'shed_gs_3'], vanish: true },
      {
        goto: 'june_house', vehicle: 'learner', stop: true, radius: 10,
        clearOf: { faction: 'guest_services', radius: 100 }, clearObjective: 'Shake off the teal cars, then take June home',
        objective: 'Take June home',
        say: [
          ['caption', 'For a long time nobody says anything at all.'],
          ['june', 'Your mirror checks were acceptable.'],
          ['jay', 'Thanks.'],
          ['june', "That wasn't a compliment. It was a mark."],
        ],
      },
      { leave: ['gs_driver1', 'gs_driver2'], vanish: true },
      { music: 'sad' },
      {
        scene: { at: 'june_house', cast: ['june', 'pip'] },
        say: [
          ['caption', 'The kitchen door. June puts the clipboard on the Pipit\'s bonnet and reads down the sheet.'],
          ['june', 'Fourteen minor faults. One serious.'],
          ['caption', 'She looks at the long scrape down the back wing, where the Sovereign would have hit her door. She looks at it for a while.'],
          ['june', '(crossing it out) No. Minor.'],
          ['pip', '(quickly, before it goes) Mum. Gran won the race. The Southbay 500. She didn\'t crash. She won it. And then she hid seven parts of her car, all round the bay.'],
          ['pip', "This is one. It was in your mower. She put it there. For YOU. There's a riddle in every one, and they lead to the next one, and—"],
          ['june', '(the instructor voice, every word in its lane) Mum died. In a racing car. That\'s the end of the story.'],
          ['pip', "I didn't tell you because you'd have said no and then you'd have been right."],
          ['june', 'Then I\'m saying it. No.'],
          ['caption', 'Silence. A sprinkler ticks somewhere down the road.'],
          ['june', 'Take your carburettor. Take the... driver.'],
          ['june', '(to Jay) Phone me when you\'ve brought her home in one piece. I\'ll mark it.'],
          ['caption', 'She goes in. The door shuts gently, which is worse.'],
        ],
      },
      { leave: ['june'], vanish: true },
      {
        scene: { at: 'win_shed', cast: ['pip'] },
        say: [
          ['caption', 'Back in the shed. Gerald has rebuilt. Pip sets the carburettor on the bench and unscrews the float bowl with her thumbnail.'],
          ['caption', 'Inside, curled tight as a snail, a tiny roll of paper.'],
          ['pip', '(unrolling it on her knee, her voice not quite steady) Same handwriting. Same as the others.'],
        ],
      },
      rhyme('Rolled up in the float bowl:', R5),
      {
        scene: { at: 'win_shed', cast: ['pip'] },
        say: [
          ['pip', 'Painted out.'],
          ['jay', 'Later.'],
          ['pip', '(rolling it up again, very carefully) Later.'],
        ],
      },
      dashVan('verde_culdesac'),
      {
        spawn: [
          { id: 'dash', char: 'dash', faction: 'lockwood_tv', hostile: false, at: 'june_house', behavior: 'idle' },
          { id: 'kit', char: 'kit', faction: 'lockwood_tv', hostile: false, at: 'june_house', behavior: 'idle' },
        ],
      },
      { getIn: 'pip_car', objective: 'The teal cars have gone. Get in the Drifter' },
      {
        say: [
          ['caption', 'In the rear-view mirror: a purple van, and on June\'s perfect lawn, Dash Lockwood, holding the gnome up to Kit\'s camera like a trophy.'],
          ['dash', '(to camera) The guardian of the Firecrest! Legend... FOUND!'],
          ['kit', "It's got a fishing rod."],
          ['dash', '(off camera) Crap.'],
          ['june', '(from the kitchen window, faintly) Get OFF my LAWN.'],
        ],
      },
      { camera: 'southbay_speedway', seconds: 3 },
      {
        goto: 'speedway_pits', vehicle: 'pip_car', stop: true, radius: 12,
        objective: 'Take Pip to the Speedway. She sleeps in the pits when her mum\'s like this',
        say: [
          ['pip', '(after a mile of nothing) She came to one race. My first. I was twelve.'],
          ['jay', 'She watched?'],
          ['pip', "She sat in the car park with the engine running. Left before the end. (beat) Somebody told me she watched the first lap through the fence. She never said."],
          ['jay', 'She was there.'],
          ['pip', 'In the CAR PARK.'],
          ['jay', 'Still there.'],
          ['pip', '(looking out of the window for a long time) Fourteen minor faults. That\'s a pass, you know. With her. Fifteen\'s a fail.'],
          ['jay', 'One serious.'],
          ['pip', 'She crossed it out.'],
          ['jay', 'I saw.'],
          ['pip', "She's never crossed anything out. Not once. Not on anybody's sheet. Ever."],
        ],
      },
      { leave: ['dash', 'kit'], vanish: true },
      {
        scene: { at: 'speedway_pits', cast: ['pip'] },
        say: [
          ['caption', 'The pits, empty in the afternoon heat. A camp bed behind a stack of tyres in the bay Pip borrows. She gets out with the carburettor under her arm.'],
          ['pip', '(at the open door, without thinking) And mind the road.'],
          ['caption', 'She goes. Jay sits with the engine running a while.'],
          ['jay', '(to the Drifter) Damn.'],
        ],
      },
    ],
  });

  // =====================================================================
  // d10 — The Heritage Run
  // =====================================================================
  D.missions.push({
    id: 'd10_heritage_run',
    act: 2,
    title: 'The Heritage Run',
    giver: 'chet',
    start: 'southbay_speedway',
    time: 14,
    estMinutes: 11,
    summary: 'The only way to the honours board is to win. Jay races in Chet Valiant\'s helmet.',
    reward: { money: 3500, unlock: ['dside_speedway'] },
    failIf: ['wrecked:heritage_car'],
    steps: [
      { music: 'off' },
      {
        camera: 'southbay_speedway', seconds: 4,
        say: [
          ['caption', 'The Southbay Speedway. The Celebrity Heritage Race. Two o\'clock.'],
          ['caption', 'Bunting. CASTELLANE in gold letters along the main stand. The film unit\'s cameras up on cranes, like herons.'],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', "Did you know the Speedway's honours board has fifty-one names on it and one of them's spelled wrong? That's important. Probably."],
          ['jay', 'Which one?'],
          ['milo', "I'll tell you when I've seen it. I've only seen photos. (beat) Have you got it? Have you worked it out? You've had all night."],
          ['jay', 'I slept.'],
          ['milo', "That's not an answer, that's an excuse."],
          ['prof_quill', "(in the background, a teacup chinking) Clearly, Milo, 'the board' is the high board at the old Seawall Lido, demolished in nineteen—"],
          ['milo', "Grandad. 'Be first across.' You have to WIN."],
          ['prof_quill', '(off) ...One does dive first across, in a sense.'],
          ['milo', "Where only winners stand: the winners' enclosure at the Speedway. The board: the honours board on its back wall."],
          ['milo', "You don't get in there unless you've won something. Not with a ticket. Not with a lanyard. I checked. I rang them. I said I was a journalist."],
          ['jay', 'Did they believe you?'],
          ['milo', 'They said my voice hadn\'t broken. Rude, but fair.'],
          ['milo', "Score: Team Firecrest four, Lockwood's Lost Legends nil, plus a tap, a spur, a minute hand and a gnome."],
          ['milo', "He's still got the gnome on the news. It's wearing a little hat now. Somebody in wardrobe made it a hat."],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', 'Somebody from the gnome\'s street subscribed. He wants it back. I said I\'d pass it on. To Dash. Via the internet.'],
            ],
          },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', "It's on the wall. I've drawn the gnome. Very small. He doesn't deserve big."],
            ],
          },
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', "Grandad's bringing me to watch. From the grandstand. Like a proper spectator. I've made a sign."],
          ['prof_quill', "(nearer the phone, with dread) I'm told there are eleven bends between Halcyon and the Speedway. I intend to experience every one of them."],
          ['milo', "He's packed a bag. Not for clothes. For being sick in. He's very organised."],
        ],
      },
      { spawnCar: 'heritage_car', type: 'vireo', at: 'speedway_grid', color: HERITAGE_YELLOW, name: 'Chet\'s number 7' },
      {
        scene: { at: 'speedway_pits', cast: ['fenella', 'chet', 'pip'] },
        say: [
          ['caption', 'The pits. Fenella Moss, the director: a sun visor, a megaphone, three phones, all ringing.'],
          ['fenella', "(into one phone) No. (into another) No. (into the megaphone, at nobody) NO. (to Jay, pleasantly) Hello. Who are you?"],
          ['pip', "He's with me."],
          ['fenella', "Great. Love it. Here's the situation: the film needs the Heritage Race. Real crowd, real cars, real Chet. Chet's entered in the yellow seven."],
          ['fenella', 'Three laps, a wave from the podium, done by four. It\'s for the movie.'],
          ['chet', '(in the red racing jacket from wardrobe, enormous sunglasses, a helmet under his arm like a fishbowl) Kid. Could I borrow you? Behind the tyres. A word.'],
          ['caption', 'Behind the tyre stack, out of sight of the cranes. Chet takes his sunglasses off. Without them he looks older and much more frightened.'],
          ['chet', "I've played four racing drivers, two pilots and a submarine. Kid, I've never been over thirty in any of them."],
          ['jay', 'Thirty.'],
          ['chet', "Every car scene of my career was a stunt double. Every one. I've never sat in a race car with the engine running. They told me it vibrates."],
          ['jay', 'It vibrates.'],
          ['chet', 'Oh, God.'],
          ['pip', "(arriving round the tyres, all business) So Jay drives. In your helmet. In your jacket. You stand behind the pit wall and wave at the end."],
          ['chet', '(looking from her to Jay, measuring) He\'s a different shape.'],
          ['pip', "Nobody'll notice. You're in a helmet. And you're famous. Famous people are all sort of the same shape."],
          ['chet', "It's for the movie! (beat, quieter) It is for the movie, right?"],
          ['fenella', '(over the tyres, not looking up from any of her phones) Everything\'s for the movie, Chet.'],
        ],
      },
      {
        scene: { at: 'speedway_pits', cast: ['teddy', 'pip', 'marshal'] },
        say: [
          ['caption', 'Jay, in a red jacket a size too big and a helmet with the visor down. Walking out to the grid, he passes the Castellane Racing garage.'],
          ['teddy', '(gold-and-black overalls, a works Zephyr behind him, sunglasses pushed up into perfect hair) Pip Marlow. Thought you were banned.'],
          ['pip', "From roads. You're not a road."],
          ['teddy', '(looking past her, at the helmet) Chet Valiant\'s fifty-eight.'],
          ['pip', 'He moisturises.'],
          ['marshal', '(hurrying up with a clipboard, beaming) Mr Valiant! Loved the first one, Mr Valiant.'],
          ['jay', '(a beat; in nobody\'s voice at all) ...Thanks.'],
          ['caption', 'Teddy watches "Chet" walk to the yellow seven. He frowns, very slightly. That is all.'],
        ],
      },
      { getIn: 'heritage_car', objective: 'Get in Chet\'s number 7' },
      { music: 'action', checkpoint: true },
      {
        phone: 'pip',
        say: [
          ['pip', "(on the team radio, crackly) Can you hear me? Tap the wheel if you can hear me. Don't actually tap the wheel. Say yes."],
          ['jay', 'Yes.'],
          ['pip', "Three laps. Teddy's quick into turn one and lazy out of three. Pass him out of three. Not before. Before, he'll shut the door on you."],
          ['pip', 'And don\'t wave. Chet waves like a windscreen wiper. If you wave properly they\'ll know.'],
          ['jay', '(to the Vireo, settling in) Hello. Somebody\'s polished you. Let\'s not undo it.'],
        ],
      },
      {
        race: {
          checkpoints: ['speedway_turn1', 'speedway_back_straight', 'speedway_turn3', 'speedway_grid'],
          laps: 3,
          rivals: [
            { char: 'teddy', car: 'zephyr', color: CASTELLANE_GOLD, skill: 0.97 },
            { char: 'dash', car: 'vireo', color: TV_PURPLE, skill: 0.6 },
            { name: 'Breezy Calhoun', car: 'vireo', color: 0x78b8e8, skill: 0.84 },
            { name: 'Captain Crumble', car: 'vireo', color: 0xd8262e, skill: 0.8 },
            { name: 'Sir Rupert Trill', car: 'zephyr', color: 0x2a6a3a, skill: 0.88 },
          ],
        },
        objective: "Win the Celebrity Heritage Race. Losing isn't on the call sheet",
        say: [
          ['monty', "(on the PA, at full speed) And it's Chet Valiant in the number seven! Chet Valiant has... grown? Chet Valiant has changed shape!"],
          ['monty', "Alongside him, weather presenter Breezy Calhoun, forecasting a podium, she tells me! And children's TV's Captain Crumble, in the car, as far as I can tell, in the full costume!"],
          ['monty', "Sir Rupert Trill, who reads the news, and has never once been in it! And Dash Lockwood, who has, I'm told, found eleven legends and a gnome!"],
          ['monty', "And in the gold Castellane Zephyr, the works driver, young Teddy Castellane! The only professional out there, ladies and gentlemen, and doesn't he know it!"],
          ['monty', 'And Dash Lockwood has found the grass! Lockwood is in the grass at turn one! Legend... found!'],
          ['dash', '(on his team radio, which is somehow also on the PA) Is this live? Is this— crap. Crap. Which way is forwards?'],
          ['pip', '(radio) Ignore him. He\'s scenery. Teddy. Watch Teddy.'],
          ['monty', 'Into turn four it\'s Jim Mercy! Jake Murphy! Whoever he is, he\'s flying!'],
          ['monty', "(a pause; papers shuffling) I'm told by my producer that's Chet Valiant. My producer is also confused."],
          ['milo', "(on the phone, from the grandstand, shouting over the engines) We're in row J! Row J! Grandad's been sick in a programme!"],
          ['prof_quill', "(faintly, behind him) It was a very poor programme."],
          ['monty', "Captain Crumble has lost a sleeve! The sleeve is on the circuit! Marshals, the sleeve!"],
          ['pip', '(radio) Last lap. He\'s lazy out of three. Wait for it. Wait. Wait. NOW.'],
          ['monty', "It's the number seven! It's... Joe Mercury! It's Chet Valiant! It's somebody in a red jacket!"],
          ['pip', '(radio) Hell yes. HELL yes.'],
        ],
      },
      { music: 'triumph' },
      {
        scene: { at: 'speedway_pits', cast: ['chet'] },
        say: [
          ['caption', 'Behind the pit wall, out of sight of the cranes, the helmet swap. Chet takes the helmet back and lowers it onto his head like a crown.'],
          ['chet', "(muffled, then visor up) Kid. I've never won anything. Not even a raffle."],
          ['jay', "You still haven't."],
          ['chet', 'Let me have this.'],
          ['jay', '(handing him the red jacket) Wave like a windscreen wiper.'],
          ['chet', '(putting it on, already standing taller) I have no other way to wave.'],
        ],
      },
      {
        goto: 'winners_enclosure', vehicle: false, stop: true, radius: 6,
        objective: 'Stand where only winners stand',
        say: [
          ['monty', "(on the PA) Your winner, Chet Valiant! Who I'm told is fifty-eight, which I find very hard to believe."],
          ['monty', "Chet! Chet, what was the secret out there today?"],
          ['chet', "(on the PA, from the podium, magnificent) Moisturiser, Monty. And a very great deal of luck."],
        ],
      },
      {
        scene: { at: 'winners_enclosure', cast: ['chet', 'fenella', 'teddy', 'pip'] },
        say: [
          ['caption', 'The winners\' enclosure. Chet holds up a silver cup and bows to every side of the grandstand in turn, slowly, like a lighthouse.'],
          ['fenella', '(megaphone) Lovely. LOVELY. Chet, chin up. Higher. That\'s a cup, not a soup bowl.'],
          ['caption', 'Teddy Castellane, second, shakes Chet\'s hand. He looks at Chet\'s hand. Then he looks past Chet, to the back, at a man in a plain shirt with helmet hair. He says nothing.'],
          ['teddy', "(to Chet, quite politely) Great drive, Mr Valiant. Loved the line out of three."],
          ['chet', 'Thank you, son. I... practise.'],
        ],
      },
      {
        camera: 'winners_enclosure', seconds: 3,
        say: [
          ['caption', 'On the back wall, the old painted honours board: a winner for every year of the Southbay 500.'],
          ['caption', 'Fifty years ago: R. CASTELLANE, in gold that is a little too new.'],
        ],
      },
      { music: 'sad' },
      {
        scene: { at: 'winners_enclosure', cast: ['pip'] },
        say: [
          ['caption', 'Everybody else is round Chet. Pip goes to the board and runs her fingers over the gold letters.'],
          ['caption', 'Under R. CASTELLANE, raised in the old paint where the brush went over it, you can feel another name. Then, with the light just right, see it.'],
          ['caption', 'O. MARLOW.'],
          ['pip', '(for a long while, nothing; then) Gran won that race by a car\'s length. Then they painted her out. I want her painted back in.'],
          ['jay', '(crouching at the foot of the board) Pip.'],
          ['caption', 'Scratched into the wall underneath, small, in a hand that pressed hard. Pip kneels beside him and reads it.'],
        ],
      },
      rhyme('Scratched into the wall under the honours board:', R6),
      {
        scene: { at: 'winners_enclosure', cast: ['pip', 'fenella', 'chet'] },
        say: [
          ['pip', "(standing; quietly) They knew. Whoever painted this knew. They painted right over her. They didn't even sand it."],
          ['jay', 'Somebody always knows.'],
          ['fenella', '(megaphone, from across the enclosure) Chet! Chet, we need you to win again, the light was wrong!'],
          ['chet', 'Again? I\'ve only just won the first time!'],
          ['fenella', "It's for the movie!"],
          ['chet', "(to Jay, across the enclosure, helplessly) Kid?"],
          ['jay', '(already walking back to the pits for the helmet) Yeah. Yeah.'],
        ],
      },
    ],
  });

  // =====================================================================
  // d11 — Two Eyes on the Water
  // =====================================================================
  const gullyOnTheTower = [
    ['gully', '(sprinting across the sand in red shorts, whistle going like a kettle) Off the tower! OFF THE TOWER!'],
    ['gully', "That's MY tower! Do you have a lifeguard qualification?"],
    ['jay', '(halfway up the ladder) No.'],
    ['gully', 'Then get DOWN off my CHAIR!'],
  ];

  D.missions.push({
    id: 'd11_two_eyes',
    act: 2,
    title: 'Two Eyes on the Water',
    giver: 'milo',
    start: 'skate_park',
    time: 11,
    estMinutes: 10,
    summary: 'Two lamps on two lifeguard towers, behind Leo Castellane\'s new fence. Jay takes the scenic route.',
    reward: { money: 1500 },
    failIf: ['wrecked:pip_car'],
    steps: [
      {
        camera: 'sandpiper_beach', seconds: 5,
        say: [
          ['caption', 'Sandpiper Beach. Eleven in the morning.'],
          ['caption', 'The long beach, the bay glittering. Two white-and-red lifeguard towers, a big lamp on the rail of each, flashing in the sun. A teal fence across the sand between them.'],
        ],
      },
      pipCar('skate_park'),
      { music: 'off' },
      {
        phone: 'milo',
        say: [
          ['milo', "Did you know a lifeguard tower is technically a chair? A very tall chair. That's important. Definitely."],
          ['jay', "Not 'probably'?"],
          ['milo', "Definitely. I've been up all night. I'm past probably."],
          ['prof_quill', "(in the background) Clearly the 'two eyes' are the twin portholes of the pleasure steamer Bright Eyes, which sank off Sandpiper in 1911 with a brass band aboard."],
          ['milo', 'Grandad, it says chairs.'],
          ['prof_quill', '(off) The band had chairs.'],
          ['milo', "Two tall chairs where people swim: lifeguard towers. Eyes that never shut all day: the lamps. 'Bright as mine, and they're a pair': headlamps."],
          ['milo', "She put the Firecrest's headlamps on two lifeguard towers. Nobody's looked at them in fifty years, because nobody looks at lifeguard towers. They look at the sea."],
          ['jay', 'Good.'],
          ['milo', "(a pause, savouring it) Thank you. (beat) You said 'good'. I'm writing that down."],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', "Also. Nine hundred subscribers. NINE HUNDRED. Since the race. Somebody put the gnome on a forum."],
              ['milo', 'Gran says she\'s had to share me. She\'s taken it quite well. She sent a card.'],
              ['milo', "(darker) It does mean Dash's people will read it too. I waited a day. I always wait a day. But the race was a day ago."],
            ],
          },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', "I've drawn the beach on the wall. And two towers. And you. You're a stick man."],
              ['milo', "You've got a very good stick. It's the best stick on the wall. Pip's got a hat."],
              ['milo', "Nobody else knows. Just the wall and me. (beat) It's quite a lot of pressure for a wall."],
            ],
          },
        ],
      },
      {
        scene: { at: 'skate_park', cast: ['pip'] },
        say: [
          ['caption', 'Across the road, the Castellane Beach Club\'s new fence: teal flags, PRIVATE EVENT, Guest Services on the gate, a string trio playing to a lot of white tablecloths.'],
          ['caption', 'Both towers are inside it.'],
          ['pip', '(pointing, without looking, at the skate park\'s biggest ramp, which points straight at the fence)'],
          ['jay', 'No.'],
          ['pip', "It's a ramp. It's for jumping."],
          ['jay', "It's for skateboards."],
          ['pip', 'Skateboards jump.'],
          ['jay', "Skateboards don't weigh a ton and a half."],
          ['pip', 'Then go faster.'],
          ['caption', 'Jay looks at the ramp. He looks at the fence. He looks at the Drifter for quite a long time.'],
          ['jay', '(to the Drifter, a hand on the roof) Sorry in advance.'],
          ['pip', "I'll stay here. On the phone. Somebody has to be the brains."],
          ['jay', 'And somebody has to be the car.'],
          ['pip', 'I heard that. The car heard that.'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          dashVan('coast_road'),
          {
            spawn: [
              { id: 'dash', char: 'dash', faction: 'lockwood_tv', hostile: false, at: 'lifeguard_tower_8', behavior: 'idle' },
              { id: 'kit', char: 'kit', faction: 'lockwood_tv', hostile: false, at: 'lifeguard_tower_8', behavior: 'idle' },
            ],
          },
        ],
        else: [
          { spawn: [{ group: 'fence_patrol', faction: 'guest_services', at: 'beach_club_fence', count: 2, weapon: 'pistol', behavior: 'guard' }] },
        ],
      },
      {
        spawn: [
          { group: 'beach_gate', faction: 'guest_services', at: 'beach_club_fence', count: 4, weapon: 'pistol', behavior: 'guard' },
          { id: 'gully', char: 'gully', at: 'lifeguard_tower_7', behavior: 'idle', hostile: false },
        ],
      },
      { getIn: 'pip_car', objective: 'Get in the Drifter' },
      { music: 'tension', checkpoint: true },
      {
        goto: 'beach_club_sand', vehicle: 'pip_car', stop: false, radius: 15,
        objective: 'Hit the big ramp and clear the fence',
        say: [
          ['pip', '(on the phone, from the top of the half-pipe) Line it up. Straight. Straighter. The ramp, not the bench. The RAMP.'],
          ['pip', 'Faster. Faster than that. That was a bunny hop. Back up. More run-up.'],
          ['pip', "(as a skateboarder of about nine rolls past and gives the Drifter a thumbs up) He believes in you. Don't let him down."],
          ['jay', '(to the Drifter, reversing all the way to the far kerb) Ton and a half. Ton and a half. Come on.'],
          ['pip', 'Hell YES.'],
          ['pip', "(a breath) Three seconds in the air. That's a personal best. Mine's two and a half. (beat) I was on fire at the time."],
        ],
      },
      { music: 'action' },
      {
        if: 'dlc_blog_on',
        then: [
          {
            collect: ['lifeguard_tower_7', 'lifeguard_tower_8'], item: 'headlamp',
            objective: 'Climb both towers and unclip the headlamps',
            say: gullyOnTheTower.concat([
              ['caption', 'At tower 8, Dash Lockwood is filming the tower itself, standing on the bottom rung of the ladder with his arms spread.'],
              ['dash', "(to Kit's camera) Viewers... the Firecrest's... CHAIR!"],
              ['kit', "(filming) We're rolling. We're always rolling."],
              ['jay', '(at the foot of the ladder) Move.'],
              ['dash', "(off camera, not moving) Mate. Mate. I'm doing a piece to camera. Two minutes. Ninety seconds."],
              ['caption', 'Gully arrives, whistle shrieking, and blows it right in Dash\'s face. Dash plucks it out of his mouth and holds it up to the camera.'],
              ['dash', 'The horn of the Firecrest! Legend... FOUND!'],
              ['kit', "It's a whistle."],
              ['dash', '(off camera) Is it? Crap.'],
              ['gully', 'Give that BACK.'],
              ['gs_staff', '(from the gate, over a loudhailer, to the whole beach) Gentlemen! This is a private event! Some of you are not on the list!'],
            ]),
          },
        ],
        else: [
          {
            collect: ['lifeguard_tower_7', 'lifeguard_tower_8'], item: 'headlamp',
            objective: 'Climb both towers and unclip the headlamps',
            say: gullyOnTheTower.concat([
              ['caption', 'Gully follows Jay from tower 7 to tower 8, blowing the whistle the whole way. He does not stop to breathe. He may not need to.'],
              ['pip', '(on the phone) What is that NOISE?'],
              ['jay', 'Lifeguard.'],
              ['pip', "Is somebody drowning?"],
              ['jay', 'Me. Slowly.'],
              ['gs_staff', '(from the fence, two extra patrols closing in along the wire) Sir! Sir, we\'ll need to see your wristband!'],
              ['gully', '(between whistles) And your QUALIFICATION!'],
            ]),
          },
        ],
      },
      { getIn: 'pip_car', objective: 'Back to the Drifter' },
      {
        goto: 'coast_road', vehicle: 'pip_car', stop: false, radius: 25,
        objective: 'Drive out through the party',
        say: [
          ['gs_staff', '(over a loudhailer, running backwards) Sir! Sir, the buffet is for guests!'],
          ['jay', '(through the buffet) I\'m a guest now.'],
          ['caption', 'A teal-and-white tablecloth goes over the bonnet. Prawns go everywhere. An ice swan stays upright by some miracle. The string trio keeps playing.'],
          ['pip', '(on the phone) Did you just go through the prawns? I heard prawns.'],
          ['jay', 'There\'s sand in them now.'],
          ['pip', "Good. Castellane prawns. Twelve dollars a prawn. They deserve sand."],
          ['gs_staff', "(fading behind) We'd love your feedback!"],
        ],
      },
      { leave: ['dash', 'kit', 'gully'], vanish: true },
      { music: 'off' },
      {
        goto: 'skate_park', vehicle: 'pip_car', stop: true, radius: 12,
        objective: 'Pick up Pip',
        say: [
          ['pip', "(on the phone, as the sirens don't come) Nobody's following. Why is nobody following?"],
          ['jay', "They can't leave the party. It's a private event."],
          ['pip', '(beat) That is the stupidest rule I have ever been grateful for.'],
        ],
      },
      { join: ['pip'], weapon: 'fists' },
      {
        scene: { at: 'skate_park', cast: ['pip'] },
        say: [
          ['caption', 'Under the Drifter\'s wiper, fluttering, a printed card. Nobody saw anyone put it there.'],
          ['caption', 'CASTELLANE GUEST SERVICES. "How would you rate our private beach? One to five."'],
          ['caption', 'Jay opens the glovebox and puts it in with the others.'],
          ['pip', "How many's that?"],
          ['jay', 'Five.'],
          ['pip', "You're collecting them."],
          ['jay', "They're collecting me."],
        ],
      },
      { music: 'hope' },
      {
        scene: { at: 'skate_park', cast: ['pip'] },
        say: [
          ['caption', 'The two headlamps on the Drifter\'s bonnet: chrome rims, thick old glass, a little bird etched into each lens. Pip polishes one with her sleeve.'],
          ['pip', "(softly) Look at them. Fifty years looking at the sea. They're not even cloudy."],
          ['jay', 'Five parts.'],
          ['pip', "Five. It's a pair. It's one part. Milo'll say it's one part. (beat) It's one part."],
          ['caption', 'She tilts the second lamp into the sun. Stamped into the reflector, letters and numbers, as plain as a price tag.'],
        ],
      },
      {
        blackout: [
          ['caption', 'Stamped inside the headlamp:'],
          ['caption', 'BRASK & MARLOW SPEED SHOP, THE PROMENADE. 7 - 17 - 50.'],
        ],
      },
      {
        scene: { at: 'skate_park', cast: ['pip'] },
        say: [
          ['pip', "Brask and Marlow. Toby and Gran. They had a shop. (beat) Gran had a SHOP."],
          ['jay', 'On the promenade.'],
          ['caption', 'They both look up the road.'],
        ],
      },
      {
        camera: 'sandpiper_promenade', seconds: 3,
        say: [['caption', 'Pastel shops along the promenade. A Kwik Pik, blue and yellow, with faded letters above its sign.']],
      },
      {
        scene: { at: 'skate_park', cast: ['pip'] },
        say: [
          ['pip', "Seven, seventeen, fifty. That's a combination. That's a safe."],
          ['jay', 'Tonight. Shops are quieter at night.'],
          ['pip', "(slowly turning to look at him) That's a very specific thing to know."],
          ['jay', 'I drive.'],
        ],
      },
    ],
  });

  // =====================================================================
  // d12 — Not the Money
  // =====================================================================
  D.missions.push({
    id: 'd12_floor_safe',
    act: 2,
    title: 'Not the Money',
    giver: 'pip',
    start: 'sandpiper_promenade',
    time: 19,
    estMinutes: 8,
    summary: 'A floor safe nobody has opened in fifty years, a clerk called Benny, and a man who doesn\'t want the money.',
    reward: { money: 800 },
    failIf: ['dead:benny', 'dead:pip'],
    steps: [
      pipCar('sandpiper_promenade'),
      { music: 'off' },
      {
        camera: 'promenade_kwikpik', seconds: 4,
        say: [
          ['caption', 'The promenade. Seven in the evening.'],
          ['caption', 'The Kwik Pik\'s blue-and-yellow sign. And above it, showing through three coats of paint now the sun is low, ghost letters: BRASK & MARLOW SPEED SHOP.'],
        ],
      },
      {
        scene: { at: 'sandpiper_promenade', cast: ['pip'] },
        say: [
          ['caption', 'Pip stands on the pavement and looks up at the letters for a long time.'],
          ['pip', 'Gran stood here. Every day. Fixing cars on this pavement. Toby said there was oil on it for twenty years after.'],
          ['jay', 'Now it sells slushies.'],
          ['pip', "Blue ones. I've had about four hundred of them. I've been in this shop four hundred times. (beat) I bought my first spanner in there. It was a keyring."],
          ['jay', 'You stay out here.'],
          ['pip', "Lookout. Obviously. If anyone in teal walks past, I'll cough."],
          ['jay', 'Cough what?'],
          ['pip', "Just cough. Loudly. I'm good at coughing. I did a whole winter of it once."],
        ],
      },
      {
        goto: 'promenade_kwikpik', vehicle: false, stop: true, radius: 3,
        objective: 'Go into the Kwik Pik and ask about the safe',
      },
      {
        scene: { at: 'promenade_kwikpik', cast: ['benny'] },
        say: [
          ['caption', 'Strip lights, a slushie machine churning blue, a rack of sunglasses nobody has touched since spring. Behind the counter, a young man reading a textbook called Loads and Stresses.'],
          ['benny', '(putting it down) Evening. The blue machine\'s working. The red one isn\'t. It never has been. I think it\'s decorative.'],
          ['jay', 'That safe. Behind the counter.'],
          ['caption', 'Set into the floor behind the counter, under a rubber mat with a corner turned up: a square iron door with a brass dial, older than everything else in the shop put together.'],
          ['benny', "The floor safe? Nobody knows the combination. The owner says it's structural."],
          ['jay', 'Structural.'],
          ['benny', "If you open it the building falls down. He says. I don't think that's how buildings work. I'm doing an engineering degree. Part-time."],
          ['benny', "(tapping the textbook) I'm on chapter four. Nothing in chapter four falls down because of a safe."],
          ['jay', 'Could you open it?'],
          ['benny', "I'm not allowed to open the safe, sir. Is there anything else I can help you with today?"],
          ['caption', 'Jay looks at him. Then he goes to the crisps aisle, and starts putting bags on the counter.'],
          ['caption', 'Salt and vinegar. Prawn cocktail. Cheese and onion. Something called Flamin\' Pickle. More. And more.'],
          ['benny', '(scanning, slower and slower) Sir, that\'s nineteen bags of crisps.'],
          ['jay', 'And the safe.'],
          ['benny', "I'm still not allowed to open the safe, sir. (beat) Would you like a bag for your crisps?"],
          ['caption', 'Outside the window, Pip, who can see all of this, puts her face in her hands.'],
        ],
      },
      { music: 'tension', checkpoint: true },
      {
        holdup: 'promenade_kwikpik', safe: true,
        objective: 'Aim at Benny. Ask for the safe, not the till',
        say: [
          ['caption', 'Jay sighs, and draws.'],
          ['benny', '(hands straight up; and then, by reflex, turning to the till) Okay. Okay okay okay. Okay.'],
          ['jay', 'Not the till.'],
          ['benny', "Not the... it's always the till. Everybody wants the till. It's in the training. The till's the first thing."],
          ['jay', 'The safe. Seven. Seventeen. Fifty.'],
          ['benny', '(kneeling by the iron door, turning the dial with shaking fingers) Seven... seventeen... fifty...'],
        ],
      },
      { music: 'hope' },
      {
        scene: { at: 'promenade_kwikpik', cast: ['benny'] },
        say: [
          ['caption', 'Clunk.'],
          ['benny', "Oh. It opened. (beat) It's never opened."],
          ['caption', 'He looks up at the ceiling. So does Jay. Nothing happens.'],
          ['benny', "(quietly, deeply satisfied) The building's fine. I KNEW the building was fine."],
          ['caption', 'Inside: fifty years of dust. An old tin cashbox. Rolls of banknotes so old the faces on them have changed. And, on top, a brown envelope with a single letter on it in pencil: J.'],
          ['caption', 'Jay takes the envelope. Only the envelope. He pushes the banknotes back in with one finger and shuts the iron door.'],
          ['benny', "You're not taking the money?"],
          ['jay', 'Just the envelope.'],
          ['benny', '(a long beat) ...Can I have a photo?'],
          ['caption', 'Jay looks at him. Then he puts the pistol away, and stands beside him behind the counter for the photo. Benny does a thumbs up. Jay does not.'],
          ['jay', "Don't post it."],
          ['benny', "I won't. (beat) I'll post it a bit."],
          ['caption', 'On his way out, Jay takes one bag of crisps off the pile of nineteen, and leaves the money for it on the counter.'],
          ['benny', '(calling after him) Sir! Sir, your other eighteen bags!'],
        ],
      },
      {
        heat: 2,
        say: [
          ['benny', "(behind him, his elbow on a button under the counter) Sorry! Sorry! It's a reflex! It's in the training!"],
          ['caption', 'The little CCTV camera over the door turns to follow Jay out into the evening.'],
        ],
      },
      { join: ['pip'], weapon: 'fists' },
      { getIn: 'pip_car', objective: 'Get in the Drifter' },
      { music: 'action' },
      {
        loseHeat: true,
        objective: 'Lose the police along the coast road',
        say: [
          ['pip', "(diving in) I coughed. Did you hear me cough?"],
          ['jay', 'Was there teal?'],
          ['pip', 'No. I just coughed.'],
          ['jay', 'Why?'],
          ['pip', "Nineteen bags of CRISPS, Jay. I had to do something. (beat) Did you get it? Give me it. Drive. Give me it."],
          ['caption', 'Sirens behind. Pip tears the envelope open as Jay takes the coast road flat out. Out slides a photograph.'],
          ['caption', 'A baby, asleep on the passenger seat of a flame-orange racing car, in a blanket, with a flat cap over her face against the sun.'],
          ['pip', "(turning it over) 'J., three months, race day.' (beat; very quietly) That's Mum."],
          ['pip', "I've never seen her as a baby. There aren't any. Aunt Win said they all got lost in a move."],
          ['jay', '(eyes on the mirror) She\'s got your frown.'],
          ['pip', "She's ASLEEP."],
          ['jay', 'Still frowning.'],
          ['pip', '(looking at it again; a wet sort of laugh) ...She is, isn\'t she.'],
          ['jay', 'Hold on.'],
          ['caption', 'The Drifter goes between a bus and a bollard with a hand\'s width either side. Pip doesn\'t even look up.'],
          ['pip', "(unfolding a sheet of paper from the envelope) There's another one. Her writing. Course there is."],
        ],
      },
      { music: 'tension' },
      rhyme('Folded behind the photograph, in pencil:', R8),
      {
        scene: { at: 'pip_car', cast: ['pip'] },
        say: [
          ['caption', 'The coast road, dark now. The last siren drops away behind them. Pip reads it twice more, her lips moving.'],
          ['pip', 'A box where nobody wins.'],
          ['jay', "Don't."],
          ['pip', "I wasn't going to."],
          ['pip', '(beat) I was going to a bit.'],
        ],
      },
      {
        phone: 'toby',
        say: [
          ['toby', '(low; almost a whisper) Son.'],
          ['jay', 'Toby.'],
          ['toby', "I'm behind the storage office at Cinder Creek. Came to drop off a spanner. (a long pause) There's a teal truck outside lot 17."],
          ['toby', "The door's up. They're carrying out the boxes. Your table. My drawings. All of it."],
          ['jay', 'Stay where you are.'],
          ['toby', "I'm eighty-one. Where would I go?"],
          ['pip', '(the photograph pressed flat against her chest) The parts. Jay. The wheel and the bird and the clock and—'],
          ['jay', '(turning the Drifter north) I know.'],
        ],
      },
      { music: 'action' },
    ],
  });

  // =====================================================================
  // Ambient texts (bible, Appendix B)
  // =====================================================================
  D.texts.push(
    { after: 'd09_minor_fault', from: 'june', message: 'Mr Mercer. Your mirror checks were acceptable. Your fountain was not. J. Marlow' },
    { after: 'd10_heritage_run', from: 'monty', message: 'Cracking drive today, Jim! Or Jake. Or Chet? Who WAS that? Monty' },
  );
})();
