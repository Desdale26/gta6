/*
 * data/dlc-act2b.js — "Chasing the Firecrest", ACT 2: HIDING IN PLAIN SIGHT,
 * second half (d13 to d16).
 *
 * Guest Services empty lot 17 and feed it to the Ironside crusher; a
 * fibreglass Firecrest leads every teal car in Ironside round the power
 * station while the real parts slip out of the back gate; Dash flies the
 * rally clock and the carburettor to the island in Castellane's charter,
 * with Jay on board; and Jay lands a 180-seat airliner on a runway built
 * for a lawnmower with wings, in front of a man with a clipboard.
 *
 * Loaded after dlc-act2a.js. See docs/DLC_BIBLE.md (sections 1, 4, 7, 11),
 * docs/dlc/beats-act2.md and docs/mission-format.md. Sets dlc_chet_told /
 * dlc_chet_kept (d14). Reads dlc_blog_on / dlc_blog_off: how Guest Services
 * found lot 17 (d13), Milo's subscribers or paper wall and the whistle in
 * the score (d16). No riddles are shown or solved here (R8 stays unsolved
 * until Act 3; Wonder Wharf is planted on camera in d16). Tallies: the
 * clock and the carburettor go "into custody" (d13) and come back (d16);
 * comment cards 6 (d13) and 7 (d14); Hob's first mark, four (d16); Jay
 * picks up the shotgun mid-fight (d13).
 */
(function () {
  'use strict';

  const S = window.VH.Data.story;
  const D = (S.dlc = S.dlc || { id: 'dlc1', title: '', tagline: '', unlockAfter: '', acts: {}, characters: {}, places: {}, factions: {}, missions: [], side: [], texts: [] });

  // ------------------------------------------------------------ colours
  const DRIFTER_WHITE = 0xf1f0ea;
  const GS_TEAL = 0x13b5b1;
  const GS_TRUCK = 0xdcdad2;
  const TV_PURPLE = 0x3b1558;
  const REPLICA_ORANGE = 0xe0481c;
  const LOWLOADER_CREAM = 0xefe6d0;
  const CHARTER_TEAL = 0x1fa3a3;

  // ------------------------------------------------------------ helpers
  /** Pip's white race-shop hack, a Drifter with tiny sponsor stickers. Jay drives it; she's banned. */
  const pipCar = (at) => ({ spawnCar: 'pip_car', type: 'drifter', at, color: DRIFTER_WHITE, name: "Pip's Drifter" });
  /** A teal Guest Services Sovereign. */
  const gsCar = (id, at) => ({ spawnCar: id, type: 'sovereign', at, color: GS_TEAL });
  /** Somebody behind the wheel of a spawned car, driving to a place (or after the car Jay is in: then they hunt it). */
  const driver = (id, car, at, to, faction) => ({ id, faction: faction || 'guest_services', hostile: false, at, behavior: 'drive', car, to });

  // =====================================================================
  // d13 — The Crusher
  // =====================================================================
  D.missions.push({
    id: 'd13_the_crusher',
    act: 2,
    title: 'The Crusher',
    giver: 'toby',
    start: 'lot_17',
    time: 19.5,
    estMinutes: 10,
    summary: 'Guest Services empty lot 17 and take everything to the Ironside crusher. Jay gets there first. Nearly.',
    reward: { money: 2500, weapons: ['shotgun'] },
    failIf: ['dead:pip'],
    steps: [
      pipCar('lot_17'),
      { music: 'tension' },
      {
        camera: 'lot_17', seconds: 4,
        say: [
          ['caption', 'Cinder Creek Storage. Lot 17. The roll-up door is all the way up, the BRASK stencil upside down at the top of it.'],
          ['caption', 'The bare bulb is still swinging. The folding table is still there. Everything that was on it is not.'],
          ['caption', 'At the very back, under a tarpaulin nobody bothered with, something tall and heavy with a hook hanging off it.'],
        ],
      },
      {
        scene: { at: 'lot_17', cast: ['toby', 'pip'] },
        say: [
          ['toby', '(coming round the end of the row, out of breath, a spanner in each hand) Son.'],
          ['jay', 'How many?'],
          ['toby', 'Six of them. Blazers. Very polite. Said "good evening" to me. Then they took the lot.'],
          ['toby', "Boxes, drawings, the table's cloth. My tea. I'd only had half of it."],
          ['pip', '(staring at the empty table) The wheel. The bird. The clock. Mum\'s carburettor. The lamps. All of it?'],
          ['toby', 'All of it, trouble. Into a teal truck. Big one.'],
          ['pip', 'How did they even know which unit? There are two hundred units. They all look the same. They all smell of the same dead mouse.'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            scene: { at: 'lot_17', cast: ['toby', 'pip'] },
            say: [
              ['caption', 'Toby takes a folded printout from his back pocket. The Firecrest Files, yesterday\'s post. A photograph of the parts laid out on the folding table.'],
              ['caption', 'And behind them, on the breeze-block wall, clear as day, a tin sign: LOT 17.'],
              ['toby', 'Library printed it for me. Ten cents a page. Nice lad on the desk.'],
              ['pip', '(very quietly) Oh, Milo.'],
            ],
          },
          {
            phone: 'milo',
            say: [
              ['milo', "Did you know a camera sees everything in the frame, not just the thing you're pointing it at? (beat) I know that now."],
              ['milo', "I waited a DAY. Like we agreed. I cropped Pip out. I cropped my own thumb out. I didn't crop the WALL."],
              ['jay', 'Next time, crop the wall.'],
              ['milo', '(a pause; small) There\'s a next time?'],
              ['jay', 'Yes.'],
              ['milo', '(not small at all) Thank you. I\'ll crop everything. I\'ll crop the SKY.'],
            ],
          },
        ],
        else: [
          { spawn: [{ id: 'clem', char: 'clem', at: 'lot_17', behavior: 'idle', hostile: false }] },
          {
            scene: { at: 'lot_17', cast: ['clem', 'toby', 'pip'] },
            say: [
              ['clem', "(arriving at a fast walk with a clipboard, already talking) Evening-evening-evening. Bad news, good news, bad news. In that order. Here we go."],
              ['clem', 'Bad news: Cinder Creek Storage has a new owner as of nine this morning. Castellane Hospitality. Lovely people. Teal.'],
              ['clem', "Good news: they've repainted the gate. Bad news: your rent has gone up."],
              ['pip', 'To what?'],
              ['clem', "To 'leave'."],
              ['clem', "(softening, very slightly) I sold that box for forty dollars, young lady. Best forty dollars I ever took. Shame about the rest. Going, going, gone."],
              ['caption', 'He bangs the clipboard on the door frame like a gavel, out of habit, and walks off.'],
            ],
          },
          { leave: ['clem'] },
        ],
      },
      {
        scene: { at: 'lot_17', cast: ['toby', 'pip'] },
        say: [
          ['toby', "Truck went south. Out on the old road, past the truck stop. I know where it's going."],
          ['jay', 'Where?'],
          ['toby', 'Castellane crushes what he can\'t buy. Ironside.'],
          ['pip', 'The scrapyard? They\'re going to CRUSH her? She\'s fifty years old!'],
          ['toby', "They've got a crusher there that'll fold a bus into a suitcase. I've seen it. Didn't sleep for a week."],
          ['jay', "Then we're going. Now."],
          ['pip', "You're coming, Toby?"],
          ['toby', "(sitting down on the folding table's one good chair) No. I'll mind the room."],
          ['toby', "Somebody has to guard an empty room. (a long pause) I've done it for years."],
          ['caption', 'He isn\'t talking about the storage unit. Nobody says so.'],
          ['toby', 'Go on. Hell\'s bells. Go.'],
        ],
      },
      { join: ['pip'], weapon: 'fists' },
      { getIn: 'pip_car', objective: 'Get in the Drifter' },
      { music: 'action', checkpoint: true },
      { timer: 200 },
      {
        goto: 'ironside_scrapyard', vehicle: 'pip_car', stop: false, radius: 40,
        objective: 'Get to the Ironside scrapyard before they crush it',
        say: [
          ['pip', "(counting on her fingers as the Drifter swings out of the gate) Wheel. Three hundred hours on that wheel. Gran stitched the leather herself. Toby said."],
          ['pip', 'The bird. Hand-cast. One of one. There is no other bird. The clock. The clock was off a plane.'],
          ['pip', 'The carburettor mowed my mother\'s lawn for twenty years and never missed a Sunday. The LAMPS—'],
          ['jay', 'Seatbelt.'],
          ['pip', "I'm WEARING it."],
          ['jay', 'Wear it harder.'],
          ['pip', '(pulling it tight across her chest, glaring) ...Happy?'],
          ['jay', 'No. But you\'re in the car.'],
          ['caption', 'The Drifter goes through the Cinder Creek lights on the last of the orange. Pip doesn\'t even rate it.'],
          ['pip', 'What if they\'ve already done it? What if we get there and it\'s a cube? A little orange cube?'],
          ['jay', "Then we'll have a cube."],
          ['pip', "That's not COMFORTING, Jay."],
          ['jay', "Wasn't meant to be. It was meant to be quiet."],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', "Did you know the Ironside crusher can do a car in forty seconds? It's on the scrapyard's website. They have a website. It has music."],
          ['jay', 'Milo.'],
          ['milo', "Sorry. Scoreboard. Do we lose points if they crush them? (beat) We don't lose points. I've decided."],
          ['milo', "They're not crushed. They're in... custody. Temporarily. Team Firecrest five, two of them in custody."],
          ['pip', "Milo, they're not in CUSTODY, they're in a TRUCK."],
          ['milo', "A truck can be custody. Grandad says I'm not allowed to come. I said I wasn't asking. He's standing in the doorway. He's quite wide."],
          ['jay', 'Stay in.'],
          ['milo', "(sigh) I'm staying in. I'm not happy. Write that down somewhere."],
        ],
      },
      {
        camera: 'ironside_power', seconds: 3,
        say: [
          ['caption', 'Ironside comes up out of the dusk: four chimneys, the refinery pipe racks lit like a ship, and at the end of the road, stacks of flattened cars ten high.'],
        ],
      },
      {
        goto: 'scrapyard_gate', vehicle: 'pip_car', radius: 20,
        objective: 'Into the scrapyard',
        say: [
          ['pip', "There. The truck. That's the truck. It's empty. It's EMPTY, Jay."],
          ['jay', "Then it's on the belt. Get down."],
        ],
      },
      {
        spawn: [
          { group: 'yard_front', faction: 'guest_services', at: 'ironside_scrapyard', count: 3, weapon: 'pistol', behavior: 'attack' },
          { group: 'yard_stacks', faction: 'guest_services', at: 'crusher_belt_foot', count: 2, weapon: 'pistol', behavior: 'attack' },
          { group: 'yard_stacks', faction: 'guest_services', at: 'crusher_belt_foot', count: 1, weapon: 'smg', behavior: 'attack' },
        ],
      },
      { leave: ['pip'] },
      {
        scene: { at: 'scrapyard_gate', cast: ['pip'] },
        say: [
          ['pip', "(already out, crouched behind the Drifter's back wheel) I'm staying with the car. I'm GOOD with cars."],
          ['jay', 'Stay low.'],
          ['pip', "I'm five foot two, Jay. I'm always low."],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        kill: 'group:yard_front',
        objective: 'Fight through to the crusher',
        say: [
          ['gs_staff', '(stepping out from between two stacks) Good evening, sir. The yard is closed.'],
          ['caption', 'Then he shoots.'],
          ['ottoline', '(over a loudhailer, from somewhere high up and out of sight) Good evening, Mr Mercer. The scrapyard is closed for a private recycling event.'],
          ['jay', "I'm here to recycle."],
          ['ottoline', '(a pause) How lovely. Do mind the stacks.'],
        ],
      },
      {
        reward: { weapons: ['shotgun'] },
        say: [
          ['caption', 'One of the blazers has dropped something long and heavy in the dirt.'],
          ['jay', '(picking up a shotgun) This\'ll do.'],
        ],
      },
      {
        kill: 'group:yard_stacks',
        objective: 'Clear the way to the belt',
        say: [
          ['caption', 'Overhead, the scrap crane swings a whole car on its magnet, back and forth, like it can\'t decide who to drop it on.'],
          ['ottoline', '(loudhailer) We do apologise for the crane. It has a mind of its own. Unlike our staff.'],
          ['pip', '(shouting, from the gate) Jay! The belt\'s MOVING! I can hear it!'],
          ['ottoline', "(loudhailer) Your friend is quite right. You'll want to hurry. We'd hate for you to miss it."],
        ],
      },
      { spawnCar: 'dash_van', type: 'porter', at: 'crusher_belt', color: TV_PURPLE, name: "Lockwood's Lost Legends van" },
      { spawn: [Object.assign(driver('kit', 'dash_van', 'dash_van', 'ironside_railyard', 'lockwood_tv'), { char: 'kit' })] },
      {
        camera: 'crusher_belt', seconds: 4,
        say: [
          ['caption', 'The crusher\'s conveyor, already moving, grinding uphill towards the jaws. Lot 17\'s boxes riding up it, one behind another.'],
          ['caption', 'And out of the back gate, going fast, a purple van with a satellite dish. Kit is leaning out of the passenger... no, she\'s driving. Dash is leaning out.'],
          ['kit', '(over the engine, deadpan) For safekeeping! Mr Castellane\'s instructions!'],
          ['dash', "(waving a small wooden box out of the window) We're keeping it SAFE!"],
          ['caption', 'The van is gone round the stacks.'],
        ],
      },
      { music: 'action' },
      { timer: 60 },
      {
        collect: ['crusher_belt_foot', 'crusher_belt', 'crusher_belt_top'], item: 'box',
        objective: 'Grab the boxes off the belt before the jaws',
        say: [
          ['pip', "(on the phone, from the gate, where she can see the jaws over the stacks) It goes every forty seconds. I've timed it. Thirty. Twenty-nine."],
          ['pip', "Twenty-eight. Why am I counting? It doesn't help. It doesn't help AT ALL. Twenty-seven."],
          ['jay', 'Keep counting.'],
          ['pip', "(beat) ...Twenty-five. It's helping a bit. Twenty-four."],
          ['pip', "There's one right at the top. Jay. Right at the top. By the teeth. Don't— twenty— don't get your sleeve caught, those are good sleeves."],
        ],
      },
      { slowmo: 2, say: [['caption', 'The jaws close on an empty belt.'], ['jay', '(breathing hard, a box under each arm) Damn.']] },
      { music: 'off' },
      {
        scene: { at: 'crusher_belt', cast: ['pip'] },
        say: [
          ['caption', 'Quiet. The belt clanks round, carrying nothing. Pip comes up from the gate at a run now there\'s nobody left to shoot at her.'],
          ['caption', 'The boxes on the ground, lids off. The steering wheel. The bonnet bird, on its back like a beetle. The two headlamps, not a scratch.'],
          ['pip', '(counting them; then counting them again) Wheel. Bird. Lamps. (beat) The clock. Mum\'s carburettor.'],
          ['jay', 'Dash took them.'],
          ['pip', 'Same thing.'],
          ['jay', "No. Dash doesn't crush things. Dash keeps things."],
          ['jay', '(beat) On television.'],
          ['pip', '(a laugh that comes out wrong, and then right) ...On television.'],
          ['caption', 'On the crusher\'s control panel, tucked under the big red button, a printed card.'],
          ['caption', 'CASTELLANE GUEST SERVICES. "How would you rate our recycling service today? One to five."'],
          ['pip', "How many's that?"],
          ['jay', 'Six.'],
          ['pip', 'Are you going to answer one, ever?'],
          ['jay', "I'm waiting for the right one."],
          ['caption', 'He puts it in his jacket, for the glovebox.'],
        ],
      },
      gsCar('gs_car1', 'scrapyard_gate'),
      gsCar('gs_car2', 'scrapyard_gate'),
      gsCar('gs_car3', 'scrapyard_gate'),
      { spawnCar: 'gs_truck', type: 'bulwark', at: 'scrapyard_gate', color: GS_TRUCK },
      { spawn: [{ group: 'gate_line', faction: 'guest_services', at: 'scrapyard_gate', count: 6, weapon: 'pistol', behavior: 'guard', hostile: false }] },
      { music: 'tension' },
      {
        camera: 'scrapyard_gate', seconds: 5,
        say: [
          ['caption', 'The scrapyard gate. Three teal Sovereigns and a white truck parked nose to tail across it. A chain going round and round the bars.'],
          ['caption', 'A row of teal blazers standing in the headlights with their hands folded, like ushers at a wedding.'],
          ['ottoline', "(loudhailer) We'll wait, Mr Mercer. Take all the time you need. We have tea."],
        ],
      },
      {
        scene: { at: 'crusher_belt', cast: ['pip'] },
        say: [
          ['jay', 'One gate. Their gate.'],
          ['pip', "(already getting her phone out, a slow look coming over her face) I know a man with a car that looks exactly like the Firecrest."],
          ['jay', 'Who?'],
          ['pip', 'Who do you think?'],
          ['pip', "(into the phone) Chet? It's Pip. Pip. The banned one. Listen. How fast can you drive a lorry?"],
          ['caption', 'A tinny, happy voice on the other end, going on for some time.'],
          ['pip', '...No. Faster than that.'],
        ],
      },
    ],
  });

  // =====================================================================
  // d14 — The Decoy
  // =====================================================================
  D.missions.push({
    id: 'd14_decoy',
    act: 2,
    title: 'The Decoy',
    giver: 'chet',
    start: 'scrapyard_gate',
    time: 20.5,
    estMinutes: 10,
    summary: 'One Firecrest is fibreglass. Every Guest Services car in Ironside chases the wrong one.',
    reward: { money: 2000 },
    failIf: ['wrecked:replica', 'dead:chet'],
    steps: [
      { spawnCar: 'film_lowloader', type: 'hauler', at: 'scrapyard_gate', color: LOWLOADER_CREAM, name: 'the film unit\'s low-loader' },
      { spawnCar: 'replica', type: 'ironclad', at: 'scrapyard_gate', color: REPLICA_ORANGE, name: 'the replica Firecrest' },
      gsCar('gs_car1', 'scrapyard_gate'),
      gsCar('gs_car2', 'scrapyard_gate'),
      gsCar('gs_car3', 'scrapyard_gate'),
      { spawn: [{ id: 'chet', char: 'chet', at: 'scrapyard_gate', behavior: 'idle', hostile: false, health: 600 }] },
      { music: 'tension' },
      {
        camera: 'scrapyard_gate', seconds: 5,
        say: [
          ['caption', 'Ironside. Half past eight.'],
          ['caption', 'Headlights coming down the access road at exactly thirty. Not twenty-nine. Not thirty-one.'],
          ['caption', 'A cream film-unit low-loader, SUNREEL STUDIOS on the doors, with a sheet tied over something low and orange.'],
        ],
      },
      {
        scene: { at: 'scrapyard_gate', cast: ['chet', 'gs_staff'] },
        say: [
          ['caption', 'At the gate, a teal blazer steps into the headlights with one hand up. Then he sees who\'s driving, and the hand goes slowly down.'],
          ['gs_staff', '(starstruck) Mr Valiant! Loved the first one.'],
          ['chet', '(leaning out of the cab window, beaming) Thank you. There wasn\'t one. Thank you.'],
          ['gs_staff', "Are you... is this a shoot, sir? Nobody told us there's a shoot."],
          ['chet', "Kid, there's always a shoot. Open the gate, would you? I've got a delivery and a very bad back."],
          ['caption', 'They undo the chain. Nobody stops a film star. Nobody has ever stopped a film star.'],
        ],
      },
      {
        scene: { at: 'scrapyard_gate', cast: ['chet', 'pip'] },
        say: [
          ['chet', '(climbing down from the cab in the red racing jacket, one step at a time) Fenella said take whatever you need.'],
          ['chet', "She said 'It's for the movie' before I'd finished the sentence. I don't think she knows what movie. I don't think she cares."],
          ['chet', '(beat) Thirty miles an hour, kid. All the way from Sunreel. Fifty minutes.'],
          ['chet', 'I was overtaken on a bridge by a man on a bicycle. He waved. I waved back. It was a moment.'],
          ['jay', 'You came.'],
          ['chet', "The girl said 'faster than that.' Nobody's said that to me since nineteen-ninety. I had to come."],
          ['caption', 'Pip already has the knots undone. She whips the sheet off.'],
          ['caption', 'The film\'s replica Firecrest. Flame orange. Long bonnet, low roof, a gold bird on the nose that turns out, close up, to be painted on.'],
          ['pip', "Same colour. Same shape. From fifty metres it's her. From five it's a fridge, but it's dark."],
          ['pip', "They see this go out of the front gate, they ALL go after it. Every teal car in Ironside. I go out the back with the real parts."],
          ['jay', "You're banned."],
          ['pip', "It's a scrapyard. It's private land."],
          ['jay', "Then there's a road."],
          ['pip', "(beat) It's an emergency. I'll do forty. I've never done forty in my life."],
          ['chet', '(hand on heart) Forty? You\'re a wild woman.'],
          ['pip', '(already running for the back of the yard with the boxes) And DON\'T scratch it! It\'s not ours! (turning, running backwards) Actually do scratch it a bit. Make it look real!'],
        ],
      },
      { leave: ['pip'], vanish: true },
      {
        getIn: 'replica',
        objective: 'Get in the replica and let them see you',
        say: [
          ['chet', '(as Jay opens the door) Careful with the door, kid. It\'s mostly hope.'],
        ],
      },
      {
        wait: 2,
        say: [
          ['jay', "(to the replica, both hands on the wheel) You're not her. Nobody needs to know that for twenty minutes."],
          ['caption', 'He turns the key. The replica\'s engine makes a noise like a hairdryer in a bathroom.'],
          ['jay', '...Damn.'],
          ['chet', '(through the window, apologetic) It\'s dubbed in later.'],
        ],
      },
      { music: 'action', checkpoint: true },
      {
        spawn: [
          Object.assign(driver('gs_driver1', 'gs_car1', 'gs_car1', 'replica'), { weapon: 'pistol' }),
          Object.assign(driver('gs_driver2', 'gs_car2', 'gs_car2', 'replica'), { weapon: 'pistol' }),
          Object.assign(driver('gs_driver3', 'gs_car3', 'gs_car3', 'replica'), { weapon: 'pistol' }),
        ],
      },
      { text: 'pip', message: 'Out. Doing forty. Feels illegal.' },
      {
        goto: 'ironside_railyard', vehicle: 'replica', stop: false, radius: 35,
        objective: 'Lead them into the rail yard',
        say: [
          ['gs_staff', '(on a radio, somewhere behind, very excited for a man in a blazer) All units, the Firecrest is moving. Repeat, the FIRECREST is moving!'],
          ['gs_staff', '(radio) Ma\'am, it\'s heading for the rail yard. Ma\'am, it\'s quite loud. Like a... hairdryer?'],
          ['caption', 'Three teal Sovereigns pile out of the gate after him, nose to tail, hazard lights on, like a very angry wedding.'],
          ['jay', '(to the replica, as it bounces over the first crossing) Easy. You were built to sit still in front of a camera. I know. I\'m sorry.'],
          ['caption', 'Between the freight wagons: a gap one car wide, then a gap one car wide minus a wing mirror.'],
          ['jay', 'That was yours anyway.'],
        ],
      },
      { text: 'pip', message: "It IS illegal. Don't tell Mum." },
      { spawnCar: 'gs_suv', type: 'tern', at: 'ironside_pipes', color: GS_TEAL },
      { spawn: [Object.assign(driver('gs_driver4', 'gs_suv', 'gs_suv', 'replica'), { weapon: 'smg' })] },
      {
        phone: 'milo',
        say: [
          ['milo', 'Did you know a decoy duck can fool a real duck from forty metres? Pip texted me. She typed it all in capitals. Is she driving?'],
          ['jay', "She's banned."],
          ['milo', "So that's a yes. (beat) You're driving a fake Firecrest so they chase the wrong one."],
          ['milo', "That's what Dess did. She let everyone chase the wrong thing for fifty years. The bottom of the bay. Grandad's three books."],
          ['jay', "Milo. I'm busy."],
          ['milo', "I know. It's very good. Probably."],
          ['milo', "(as he goes) Grandad says to tell you the replica is 'historically illiterate'. He's watching you on the traffic camera website. He's quite upset about the bird."],
        ],
      },
      {
        goto: 'ironside_power', vehicle: 'replica', stop: false, radius: 40,
        objective: 'Round the power station',
        say: [
          ['caption', 'A teal Tern comes out of the pipe racks like it had been waiting there all its life.'],
          ['gs_staff', '(radio) Unit four joining. We\'d love the Firecrest to pull over. Please.'],
          ['jay', 'No.'],
          ['caption', 'Round the base of the chimneys, the replica\'s back end coming out on every corner. Something fibreglass falls off and skitters away. It doesn\'t look important.'],
          ['jay', "(to the replica) Don't look at it. We don't need it."],
        ],
      },
      {
        goto: 'ironside_pipes', vehicle: 'replica', stop: false, radius: 30,
        objective: 'Under the pipe racks',
        say: [
          ['caption', 'Under the pipe racks the noise is enormous: steam, engines, and every time a Sovereign touches the replica, a sound like somebody dropping a tray of glasses.'],
          ['jay', "Hold together. You're doing great."],
          ['jay', "(a teal bumper in the mirror, close enough to read the badge) You're doing better than a real one would."],
          ['gs_staff', "(radio) Ma'am, I've hit it four times and it keeps... bouncing. Is that normal for a classic car?"],
          ['ottoline', '(radio, calm as a library) Keep following it, Gerald. I\'m on my way.'],
        ],
      },
      {
        deliver: 'replica', to: 'scrapyard_gate', maxDamage: 0.6, radius: 12,
        objective: 'Bring the replica back to the low-loader in one piece (more or less)',
        say: [
          ['caption', 'Back down the access road, the whole teal convoy behind him, every one of them flashing its lights.'],
          ['jay', "(to the replica) Nearly home. Then you can go back to being a fridge."],
          ['chet', '(on the phone, from the low-loader, watching them come) Kid, you\'re doing a hundred! I can hear it! I\'m having palpitations! I\'m sitting down!'],
          ['jay', "You're already sitting down."],
          ['chet', "I'm sitting down MORE!"],
        ],
      },
      { music: 'tension' },
      { leave: ['gs_driver1', 'gs_driver2', 'gs_driver3', 'gs_driver4'], vanish: true },
      { spawn: [{ group: 'gate_blazers', faction: 'guest_services', at: 'scrapyard_gate', count: 4, weapon: 'pistol', behavior: 'guard', hostile: false }] },
      { spawn: [{ id: 'ottoline', char: 'ottoline', faction: 'guest_services', at: 'scrapyard_gate', behavior: 'idle', hostile: false }] },
      {
        scene: { at: 'scrapyard_gate', cast: ['ottoline', 'chet', 'gs_staff'] },
        say: [
          ['caption', 'The convoy stops all round the replica, doors opening, teal everywhere. Then everybody waits, because a sleek teal Sovereign is coming down the access road, slowly, indicating.'],
          ['caption', 'Ottoline Graves gets out. She walks once round the replica, all the way round, the way you would look at a house you have no intention of buying.'],
          ['caption', 'She taps its bonnet with one fingernail. It rings hollow.'],
          ['ottoline', '(tapping the fibreglass bonnet, smiling) Very good.'],
          ['gs_staff', "(very quietly, to another blazer) Is it not...?"],
          ['ottoline', "No, Gerald. It's not."],
          ['ottoline', '(to Jay, pleasantly) The real ones went out of the back gate twenty minutes ago, in a small white car, at precisely forty. We have it on camera. We have everything on camera.'],
          ['jay', 'Then why the chase?'],
          ['ottoline', "Because you went to so much trouble. It would have been rude not to."],
          ['ottoline', "Mr Castellane is very generous. (beat) I'm the part of Mr Castellane that isn't."],
          ['chet', '(stepping forward, in the full red jacket, in the full headlights) Madam. Is there a problem with my prop?'],
          ['ottoline', '(not even looking at him) Not tonight, Mr Valiant. Loved the first one.'],
          ['chet', '(automatically) Thank you. There wasn\'t one.'],
          ['caption', 'She takes a card from her blazer pocket and holds it out to Jay between two fingers.'],
          ['caption', 'CASTELLANE GUEST SERVICES. "How would you rate your experience of being chased in a fake car? One to five."'],
          ['jay', 'Four. The car was lovely.'],
          ['ottoline', "(writing it down, actually writing it down) Four. Thank you. We'll be in touch either way."],
          ['caption', 'A film star, a film prop, a TV crew somewhere in the dark with a camera: not a good night for assistance. She gets back in her car.'],
        ],
      },
      { leave: ['ottoline'], vanish: true },
      { music: 'off' },
      {
        blackout: [
          ['caption', 'The cab of the low-loader. The replica back on the trailer behind them, missing a wing mirror and some confidence.'],
          ['caption', 'Chet drives. Thirty miles an hour, exactly, both hands on the wheel at ten and two. Jay in the passenger seat, the shotgun across his knees.'],
          ['caption', 'Nobody says anything for a long time. The Ironside chimneys go by. Then the truck stop. Then nothing at all.'],
          ['chet', 'Kid.'],
          ['jay', 'Mm.'],
          ['chet', "This film. Champions Since Day One. You know who I'm playing?"],
          ['jay', 'Rex Castellane.'],
          ['chet', "Rex Castellane. The man who won the Southbay 500. I've got a scene where I lift the cup. Fenella's had me practise lifting a vase."],
          ['chet', '(a long pause; the indicator ticking for a turn he doesn\'t take) I read the girl\'s face tonight. And the old fella\'s. And yours.'],
          ['chet', 'This film. It isn\'t true, is it?'],
        ],
      },
      {
        choice: {
          prompt: 'Chet asks whether the film is true.',
          options: [
            {
              label: 'No. She won. They stole it.',
              flag: 'dlc_chet_told',
              then: [
                {
                  blackout: [
                    ['jay', 'No.'],
                    ['jay', "A girl called Dess Marlow won it by a car's length. The Castellanes said she drowned and put Rex's name up instead."],
                    ['jay', "There's a board at the Speedway. Her name's under the paint. Pip's seen it. So have I."],
                    ['caption', 'Chet doesn\'t say anything. The low-loader does thirty. A long way back, the replica\'s loose bumper taps the trailer, tap, tap, like a clock.'],
                    ['chet', '(at last, very quietly) I\'ve been playing the bad guy and nobody told me.'],
                    ['chet', "Forty years. Four racing drivers, two pilots and a submarine. And the one time it's a true story, I'm the villain."],
                    ['chet', '(beat; patting his jacket pockets) Have you got a pen? I\'m going to need a pen.'],
                    ['jay', 'Glovebox.'],
                    ['caption', 'He finds one, and the back of a call sheet, and starts writing in the margins at a red light. He keeps writing when it goes green. The lorry behind them is very patient.'],
                  ],
                },
                { music: 'hope' },
              ],
            },
            {
              label: "It's just a film, Chet. Stay out of it.",
              flag: 'dlc_chet_kept',
              then: [
                {
                  blackout: [
                    ['jay', "It's just a film, Chet. Stay out of it."],
                    ['chet', '(nodding too quickly) Right. Right. Just a film.'],
                    ['caption', 'He drives on. Thirty. He doesn\'t believe it.'],
                    ['caption', 'A minute later, to nobody, to the windscreen:'],
                    ['chet', '...Loved the first one.'],
                    ['caption', 'He says it to himself the way other people hum.'],
                    ['jay', "(looking out of the window) It's a good jacket."],
                    ['chet', '(touching the red sleeve) It is a good jacket. (beat) It\'s not mine.'],
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        phone: 'milo',
        say: [
          ['milo', 'Did you know you can tag an airport in a photo? (beat) Dash has just posted.'],
          ['milo', "A photo of himself at the Castellane charter desk at Vicehaven International, holding a metal case. 'Wheels up to Isla Paloma tomorrow, eleven-fifteen, with two incredible finds!'"],
          ['milo', '(beat) He tagged the airport. Who tags an airport?'],
          ['jay', 'Somebody who wants to be followed.'],
          ['milo', "Or somebody who isn't very good at this."],
          ['jay', 'Both.'],
          ['milo', '(beat) Jay. You know the clock and the carburettor are in that case.'],
          ['jay', 'I know.'],
          ['milo', "So what are you doing at eleven tomorrow?"],
          ['jay', 'Flying, apparently.'],
          ['chet', "(from the driver's seat, delighted) Kid, you fly too?"],
          ['jay', 'No.'],
        ],
      },
    ],
  });

  // =====================================================================
  // d15 — Departures
  // =====================================================================
  D.missions.push({
    id: 'd15_departures',
    act: 2,
    title: 'Departures',
    giver: 'milo',
    start: 'airport_terminal',
    time: 11,
    estMinutes: 10,
    summary: 'Dash is flying the clock and the carburettor to the island in Castellane\'s charter. Jay is on it. Jay is flying it.',
    reward: { money: 2000 },
    steps: [
      { music: 'tension' },
      {
        camera: 'airport_terminal', seconds: 4,
        say: [
          ['caption', 'Vicehaven International. Departures. Eleven o\'clock.'],
          ['caption', 'Wheelie cases, a queue for coffee that goes round a pillar twice, and a board that says DELAYED in four places and BOARDING in one.'],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', 'Did you know the security arches here go off at forty grams of metal? A pistol\'s about seven hundred. That\'s important. Definitely.'],
          ['jay', '"Definitely"? Not "probably"?'],
          ['milo', "I looked it up three times. I'm upgrading. (beat) The Castellane charter's on the remote stand, west of the gates. It leaves at eleven-fifteen. You have fifteen minutes."],
          ['jay', "I'm not leaving my gun in the car."],
          ['milo', 'Then you\'ll have to run very fast with a lot of people shouting.'],
          ['jay', 'Noted.'],
          ['milo', "Also you'll need a boarding pass."],
          ['jay', "I've got one."],
          ['milo', 'Where from?'],
          ['jay', "A man who wasn't using it."],
          ['milo', '(a pause) I\'m not going to ask. Grandad says if I don\'t ask I can\'t be a witness. He\'s read a lot of books.'],
        ],
      },
      {
        goto: 'terminal_security', vehicle: false, radius: 4,
        objective: 'Through security',
        say: [
          ['caption', 'Jay puts his things in a grey tray: keys, phone, belt. A small stack of printed cards.'],
          ['caption', 'The screener, a man who has seen everything twice, holds one up to the light.'],
          ['caption', '"Is this a... feedback card?"'],
          ['jay', 'I get a lot of them.'],
          ['caption', 'The screener reads it. Reads it again. Hands it back with the face of a man deciding not to have an opinion.'],
        ],
      },
      { spawn: [{ id: 'kit', char: 'kit', faction: 'lockwood_tv', hostile: false, at: 'terminal_concourse', behavior: 'idle' }] },
      {
        goto: 'terminal_concourse', vehicle: false, radius: 6,
        objective: 'Find the way to the remote stand',
        say: [
          ['caption', 'Airside. Perfume, neck pillows, a shop that sells nothing but small expensive chocolates. Gate numbers in both directions.'],
        ],
      },
      {
        scene: { at: 'terminal_concourse', cast: ['kit'] },
        say: [
          ['caption', 'Kit Ambrose, camera on her shoulder, filming the departures board with total concentration. It isn\'t doing anything.'],
          ['kit', '(without turning round) Morning.'],
          ['jay', "Which way's the Castellane charter?"],
          ['caption', 'Kit points, without looking, down the concourse towards Arrivals.'],
          ['caption', 'Jay looks at her. He doesn\'t move.'],
          ['kit', '(beat) Or that way.'],
          ['caption', 'She tips her chin the other way, towards the far gate and the apron beyond it. The right way.'],
          ['kit', "We're rolling. We're always rolling."],
          ['jay', 'Why are you helping?'],
          ['kit', "I'm not. I'm pointing. Pointing's not helping."],
          ['kit', '(still filming the board) Your kid\'s blog is better than our show.'],
          ['jay', "He's not my kid."],
          ['kit', '(the first thing she has ever said with a tiny bit of a smile in it) Sure.'],
        ],
      },
      { leave: ['kit'], vanish: true },
      { spawnCar: 'charter', type: 'albatross', at: 'charter_stand', color: CHARTER_TEAL, name: 'the Castellane charter' },
      {
        spawn: [
          { id: 'daventry', char: 'daventry', faction: 'guest_services', at: 'charter_stand', behavior: 'guard', weapon: 'pistol', hostile: false },
          { group: 'cabin_crew', faction: 'guest_services', at: 'charter_stand', count: 2, behavior: 'guard', hostile: false },
        ],
      },
      { checkpoint: true },
      { timer: 300 },
      {
        goto: 'charter_stand', vehicle: false, radius: 12,
        objective: 'Out through the gate and across the apron to the charter',
        say: [
          ['milo', "(on the phone, quietly, like he's in a library, because he's in a library) Eleven-oh-nine."],
          ['milo', "Eleven-ten. (beat) I'll stop. It doesn't help. Pip told me it doesn't help."],
          ['milo', 'Eleven-ten and a half.'],
          ['jay', 'Milo.'],
          ['milo', 'Sorry. (beat; whispering) Eleven-eleven.'],
          ['caption', 'Out through the gate door into the heat and the noise. Jet engines. A baggage train. A man with two orange bats waving at nobody.'],
          ['caption', 'West, alone on the remote stand: a teal Albatross with CASTELLANE down the side in gold letters, its stairs down, like a very large dog waiting by a door.'],
          ['milo', "(very quietly) Oh. It's quite big, isn't it."],
        ],
      },
      {
        scene: { at: 'charter_stand', cast: ['daventry'] },
        say: [
          ['caption', 'Captain Daventry stands at the top of the airstair. The hat. The epaulettes. An earpiece with a curly wire that no pilot has ever needed.'],
          ['daventry', "Good morning, sir. I'm afraid this is a private charter."],
          ['daventry', 'Would you like assistance leaving the apron?'],
          ['jay', "No. I'd like assistance getting on."],
          ['caption', 'Daventry opens his jacket just enough to show a pistol, the way other men show a watch.'],
          ['daventry', "Sir. I'm a Guest Services man in a pilot's hat."],
          ['daventry', '(pleasantly) I can do either job.'],
          ['jay', 'Can you do both at once?'],
          ['daventry', '(a tiny pause) I\'ve never been asked.'],
        ],
      },
      {
        getIn: 'charter',
        objective: 'Get on board and take the flight deck',
        say: [
          ['caption', 'Seat 1A. Sunglasses, a neck pillow shaped like a horseshoe, a cup of orange juice, and on his knees a shiny metal case. Dash Lockwood looks up.'],
          ['dash', '(blinking) Are you on this flight?'],
          ['jay', "I'm flying it."],
          ['dash', '(the TV voice falling right off him) Oh, crap. Crap, crap, crap.'],
          ['caption', 'He gets up, case and all, runs up the aisle the wrong way, and locks himself in the toilet. The little sign goes red: OCCUPIED.'],
          ['dash', '(muffled, through the door) This is a SECURE location!'],
          ['daventry', '(down the emergency slide, receding) Sir! SIR! We\'d love your feeeeedback—'],
          ['caption', 'A soft thump on the tarmac. Then two more, as the cabin crew follow him down, politely, one at a time.'],
          ['jay', '(sitting down in the left-hand seat, to the Albatross) Easy. You\'re very big and I\'ve never done this.'],
          ['jay', "Let's both be calm."],
          ['caption', 'Four hundred switches. He finds the one marked START. That seems like a good sign.'],
        ],
      },
      {
        camera: 'charter_stand', seconds: 4,
        say: [
          ['caption', 'An airport police car coming across the apron with its lights going. Two officers at the foot of the stairs, looking up.'],
          ['caption', 'Under them, the engines begin to spool up: a whine, then a roar.'],
        ],
      },
      {
        phone: 'milo',
        say: [
          ['milo', '(very small) Jay? Are you on a plane?'],
          ['jay', "I'm in a plane."],
          ['milo', 'Is there a difference?'],
          ['jay', 'Ask me in five minutes.'],
          ['dash', '(far off, through the toilet door) Who are you TALKING to? Is that the tower? Tell them I want to get off!'],
        ],
      },
      // d16 chains straight on, and a job won't start while the police are
      // after Jay (gun through the arches, the plane itself): d16 puts the
      // heat back on at the stairs.
      { heat: 0 },
    ],
  });

  // =====================================================================
  // d16 — Four Out of Ten (straight on from d15)
  // =====================================================================
  D.missions.push({
    id: 'd16_four_out_of_ten',
    act: 2,
    title: 'Four Out of Ten',
    giver: 'pip',
    start: 'chain',
    resumeAt: 'charter_stand',
    time: 11.2,
    estMinutes: 9,
    summary: 'Jay lands a 180-seat airliner on a runway built for a lawnmower with wings. A man with a clipboard has views.',
    reward: { money: 3000 },
    steps: [
      // In the chain Jay is already in the charter's left-hand seat. After a
      // quit or a failed attempt the marker waits at the remote stand, where
      // the airport's own flyable Albatross is parked, so any airliner does.
      { getIn: 'aircraft', objective: 'Back in the charter. Take the left-hand seat' },
      {
        heat: 2,
        say: [
          ['caption', 'Blue lights at the foot of the airstair. An officer starting up it, two steps at a time, and thinking better of it as the engines rise.'],
          ['jay', '(to the Albatross) Time to go.'],
        ],
      },
      {
        phone: 'pip',
        say: [
          ['pip', "Jay. JAY. Milo says you're on a PLANE. Right. Right. Okay. I've found a video."],
          ['jay', 'A video.'],
          ['pip', "A man in a flight simulator. In his bedroom. He's got two million views, he must be good. I've sped him up, he's very slow."],
          ['pip', "Right. The big levers. In the middle. Push them. All of them. He says 'gently' but he says everything gently, ignore him."],
          ['milo', '(on the same call) Rotate at a hundred and forty knots.'],
          ['pip', "What's a knot?"],
          ['milo', "It's a speed. One nautical mile per—"],
          ['pip', 'NOT NOW, Milo.'],
          ['milo', 'You ASKED!'],
          ['jay', 'Both of you. What does rotate mean?'],
          ['pip', "(beat) Pull the... wheel thing. Back. Towards your tummy. He says 'tummy'. He's very nice."],
        ],
      },
      { heat: 3 },
      { music: 'action', checkpoint: true },
      {
        fly: 'marina_lighthouse', height: 160, radius: 60,
        objective: 'Take off and head out over Coral Marina',
        say: [
          ['dash', "(through the toilet door, muffled) Is it bumpy? It feels bumpy. I've still got the case. I'm keeping the case."],
          ['jay', 'Keep it.'],
          ['dash', 'I will!'],
          ['dash', '(beat) Is that allowed?'],
          ['caption', 'A police helicopter comes up alongside, very close, a man in the door with a loudhailer. Then, looking at the size of what he\'s chasing, a little less close.'],
          ['pip', "(on the phone) There's a HELICOPTER on the news. Following a PLANE. Is that you? That's you. Wave."],
          ['jay', "I'm not waving."],
          ['caption', 'Below, on the end of the breakwater, a small white lighthouse goes by, and a tiny figure in a knitted hat looking up with a hand over his eyes.'],
        ],
      },
      {
        camera: 'wonder_wharf', seconds: 3,
        say: [
          ['caption', 'Across the water, on the island\'s west shore, the big wheel at Wonder Wharf turns in the sun, slow and white.'],
        ],
      },
      {
        fly: 'bridge_island_end', height: 120, radius: 60,
        objective: 'Follow the Paloma Bridge to the island',
        say: [
          ['milo', 'Did you know the Paloma Bridge is two point one kilometres? Follow it. Planes follow roads all the time. Probably.'],
          ['pip', '"Probably"?'],
          ['milo', "Mostly in films. It still counts."],
          ['caption', 'The bridge, long and thin, cars on it stopping one after another to look up at the teal airliner going over at the height of a pigeon with ambitions.'],
          ['dash', '(through the door) Viewers... I\'m in a toilet. In the sky. This is not the special I pitched.'],
        ],
      },
      {
        heat: 0,
        say: [
          ['caption', 'At the island end of the bridge the police helicopter banks away, all at once, and heads back over the water.'],
          ['milo', "The police helicopter's turned round. It's on the traffic map. Castellane's island has its own security. The police don't fly over it."],
          ['pip', "Well, that's handy."],
          ['milo', "It's not handy. It's suspicious."],
          ['milo', '(beat) It\'s handy AND suspicious.'],
        ],
      },
      { music: 'tension' },
      {
        camera: 'paloma_field', seconds: 4,
        say: [
          ['caption', 'Paloma Field. One short runway with grass at both ends. Three tin hangars. A windsock. A flagpole flying a green flag with a little propeller on it.'],
          ['pip', "Is that the runway? That's the runway. Jay, that's the RUNWAY."],
          ['jay', "That's not a runway, that's a driveway."],
        ],
      },
      {
        land: 'paloma_field', radius: 60,
        objective: 'Land on Paloma Field. All of it, if you can',
        say: [
          ['pip', 'Nose up!'],
          ['milo', 'Nose DOWN. Then up! Then down a bit! Then—'],
          ['pip', 'The video man says flaps! What are flaps? Milo, what are FLAPS?'],
          ['milo', "They're the... flappy bits!"],
          ['jay', 'Both of you. Quiet.'],
          ['caption', 'They are quiet. It is the quietest either of them has ever been.'],
          ['dash', '(the only one still talking, through the door) Viewers, if this is my last broadcast—'],
          ['jay', 'It isn\'t.'],
          ['dash', '(beat) ...Okay. Thank you. That\'s very reassuring. Who\'s flying?'],
          ['jay', 'Me.'],
          ['dash', '(beat) Less reassuring.'],
        ],
      },
      { music: 'hope' },
      {
        say: [
          ['caption', 'The Albatross stops with its nose over the grass at the very end of the runway, the engines winding down, the windsock folded flat under the left wing.'],
          ['jay', '(to the Albatross, one hand on the console) Good girl. You were very calm. I wasn\'t.'],
        ],
        wait: 3,
      },
      {
        spawn: [
          { id: 'hob', char: 'hob', faction: 'flying_club', at: 'field_apron', behavior: 'idle', hostile: false },
          { id: 'dash', char: 'dash', faction: 'lockwood_tv', at: 'field_apron', behavior: 'idle', hostile: false },
        ],
      },
      {
        scene: { at: 'field_apron', cast: ['hob'] },
        say: [
          ['caption', 'A man in a green flying-club jumper comes out of the nearest hangar with a clipboard in one hand and a mug in the other.'],
          ['caption', 'He walks the whole length of the airliner. He looks at the windsock. He looks at the airliner for a long time. He drinks some coffee. He writes something down.'],
          ['caption', 'Then he looks at Jay.'],
          ['hob', 'Four out of ten.'],
          ['hob', 'We walked away. You bent my windsock.'],
          ['hob', '(tapping the clipboard with his pen) Who taught you to fly?'],
          ['jay', 'You, in about a minute.'],
          ['hob', '(a long beat; then a laugh that comes all the way up from his boots) Crikey. Right then.'],
          ['caption', 'He hasn\'t agreed to anything. He has absolutely agreed.'],
          ['hob', "Hob Finnegan. Paloma Flying Club. Chief instructor. Only instructor. (beat) Also the cleaner."],
          ['hob', "Seen some landings on this strip, son. A plane full of chickens. A man in a deckchair with an engine. Never seen a bloody jumbo."],
          ['jay', "It's not a jumbo."],
          ['hob', "It is on my runway."],
        ],
      },
      {
        scene: { at: 'field_apron', cast: ['hob', 'dash'] },
        say: [
          ['caption', 'Behind them, a soft whump: the emergency slide unfolding. Dash Lockwood comes down it on his back, clutching the metal case to his chest, hat still on.'],
          ['caption', 'He sits on the grass for a moment. Then he gets up, walks over, and hands Jay the case without being asked.'],
          ['dash', 'Honestly, it\'s a relief.'],
          ['dash', "Mr Castellane said fly them over. Ottoline said 'Don't lose them, Mr Lockwood.' Very politely."],
          ['dash', '(beat) I hate it when she\'s polite to me.'],
          ['caption', 'Jay opens the case. Foam, cut to shape. The rally clock, ticking, eleven seconds slow. And June\'s carburettor, in a sandwich bag.'],
          ['jay', 'A sandwich bag.'],
          ['dash', "Kit packed it. Kit says it's 'archival'."],
          ['hob', '(looking Dash up and down) You look like a man who needs a doughnut.'],
          ['dash', "(automatically, the TV voice coming back) I don't eat carbs on camera."],
          ['hob', 'Camera\'s off, son.'],
          ['dash', '(a long, wobbly pause) ...Jam?'],
          ['hob', 'Jam. Right then. Club car.'],
          ['hob', "(going, over his shoulder to Jay) Leave that case in my hangar. Nobody looks in a hangar. Too many doughnuts. (beat) We'll talk about rent."],
          ['hob', "And we'll talk about my windsock."],
        ],
      },
      { leave: ['hob', 'dash'], vanish: true },
      { music: 'off' },
      {
        phone: 'milo',
        say: [
          ['milo', 'Did you know the Albatross weighs more than eighty elephants? I just thought you should know what you parked.'],
          ['milo', 'Score update. Team Firecrest five. The clock and the carburettor are out of custody.'],
        ],
      },
      {
        if: 'dlc_blog_on',
        then: [
          {
            phone: 'milo',
            say: [
              ['milo', 'Lockwood\'s Lost Legends nil, plus a tap, a spur, a minute hand, a gnome and a whistle. I\'m counting the airliner as a draw.'],
              ['milo', "And twelve thousand subscribers. TWELVE THOUSAND. Somebody on the beach filmed you landing."],
              ['milo', "The video's called 'MAN PARKS JUMBO IN GARDEN'. (beat) It's not a jumbo. I've left a comment."],
              ['jay', 'Crop the plane.'],
              ['milo', "(proudly) I already did. You can only see the wing. And Mr Finnegan's face. He's giving it a four."],
            ],
          },
        ],
        else: [
          {
            phone: 'milo',
            say: [
              ['milo', 'Lockwood\'s Lost Legends nil, plus a tap, a spur, a minute hand and a gnome. I\'m counting the airliner as a draw.'],
              ['milo', "I've drawn the plane on the wall. It's quite big. I had to move a poster."],
              ['milo', "(beat) And Grandad. I had to move Grandad. He was leaning on the wall. He's drawn a little windsock on it now. It's bent."],
              ['jay', 'Good.'],
              ['milo', "(beat) Exclusive. Nobody else has this. Nobody else has a wall."],
            ],
          },
        ],
      },
      { text: 'pip', message: 'Bringing the rest over tomorrow on the ferry. Banned from roads, not boats. And mind the road. Or the sky. Whatever you\'re on.' },
    ],
  });

  // =====================================================================
  // Ambient texts (bible, Appendix B)
  // =====================================================================
  D.texts.push(
    { after: 'd16_four_out_of_ten', from: 'hob', message: 'Windsock repaired. Invoice: $40 and one apology. Doughnuts Tuesday. Hob, Paloma Flying Club' },
  );
})();
