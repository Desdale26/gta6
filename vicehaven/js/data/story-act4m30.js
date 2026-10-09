/*
 * data/story-act4m30.js — m30 SALT AND IRON (Finale III), Act 4 of "Ten and Two".
 *
 * Half past three in the morning, straight on from m29: the van is inside
 * Kostas Salvage, the doors are chained, and Halberd and Horne's loyalists
 * have the yard. Rourke reads everybody's file out over a loudhailer. The
 * crew holds the doors; Rourke brings a fuel tanker; the barricade at the
 * gate goes (Dex rams it, or Dex rams it and drives away, or Jay blows it).
 * Jay breaks out in Lulu at heat four and five, takes Crane Row under the
 * orange gantry (Stavros's crane, where the rifle that killed Augie sat),
 * and Mae lets the whole city hear her brother say "I'm not armed". The
 * front was a feint: Rourke's back-door team takes the Tally out of Kostas
 * while Ansel stands up for Mae and Noor. On the walkway forty metres up a
 * handrail Rourke skimmed the bolts for lets go of him. In bay 14 Horne is
 * arrested by Calder (trusted_calder), or runs, is wrecked, and is chained
 * to the Tidewater gate with his own cuffs (refused_calder). Then Noor:
 * Voss came to Saltmarsh himself for the book, and he's heading for the pier.
 *
 * Flags read: trusted_calder / refused_calder, saved_teo / chased_rourke,
 * dex_forgiven / dex_banished / dex_to_calder, solace_done, nightshift_done.
 * Flags set: none (the walkway choice only changes lines).
 *
 * Invented here that later acts may lean on: Voss collected the Tally in
 * person from a Halberd runner on Harbor Road behind the fish market (the
 * first time he has set foot in Saltmarsh in decades), so in m31 he has the
 * book and Rhea still has the thirty million in the van at Kostas. Halberd
 * held the port maintenance contract and billed $140,000 for crane bolts
 * nobody fitted (Rourke's skim, on his phone with chased_rourke). Rourke's
 * ring is his late wife's; Jay ends the night with it in his jacket pocket.
 * Ansel is shot through and through, high in the left shoulder, and put two
 * men down without killing either. Kostya fetched Lulu from Harbor Point on
 * the flatbed and paid an $11 ticket on her. The dashcam tape went out on
 * every Southside channel at 03:58 (and on Radio Free Vicehaven with
 * solace_done). With dex_forgiven, Birdie's JUNIOR DEPUTY sticker ends up
 * on Horne's chest; with refused_calder, Horne's second phone is taped over
 * his badge with 0211 written on the tape.
 *
 * Engine notes: the crew at Kostas are spawned at the top level so a
 * checkpoint retry rebuilds them. The crane walkway cannot be stood on, so
 * the climb and the duel are a blackout (the house style for climbs, as in
 * m18 and m20) and the fight before it is on the quay under the gantry.
 * Every blackout comes after the area is clear and the heat is zero, so
 * nobody shoots a frozen Jay. Horne rides back to the gate as crew with his
 * fists (he is cuffed), so he really is in Lulu's back seat. The mission
 * ends with the heat at zero so m31 can chain.
 */
(function () {
  'use strict';
  const S = window.VH.Data.story;

  // ------------------------------------------------------------ colours
  const LULU_TEAL = 0x1f6f6a;
  const HALBERD = 0x3a3f45;
  const MUSTARD = 0xc9a227;
  const CALDER_GREEN = 0x2f4a3a;

  // ------------------------------------------------------------ helpers
  const lulu = (at, extra) => Object.assign({ spawnCar: 'lulu', type: 'lowrider', at, color: LULU_TEAL }, extra || {});
  const halberdSuv = (id, at, extra) => Object.assign({ spawnCar: id, type: 'ironclad', at, color: HALBERD }, extra || {});
  const halberdVan = (id, at, extra) => Object.assign({ spawnCar: id, type: 'bulwark', at, color: HALBERD }, extra || {});

  // Between the legs of the orange gantry on the quay (outskirts.js: the
  // orange gantry straddles x 404-420, z 539-553; the Pier 9 yard and bay 14
  // are just west of it, which is why the rifle on this crane could see
  // Augie).
  const ORANGE_FOOT = { name: 'The foot of the orange gantry', x: 410, z: 546, yaw: -Math.PI / 2 };

  // ------------------------------------------- Dex and the junior deputy
  // With dex_forgiven, wherever Horne ends up in handcuffs.
  const STICKER = { if: 'dex_forgiven', then: [
    { scene: { at: 'horne', cast: ['horne', 'dex'] }, say: [
      ['caption', '(Dex Calloway steps up in front of Captain Wade Horne. His hands are shaking. He lets them.)'],
      ['horne', '(the old smile, tired round the edges) Dexter. How\'s the junior deputy?'],
      ['dex', '(peeling something small and gold off the inside of his coverall pocket) She gave it back.'],
      ['caption', '(A VPD JUNIOR DEPUTY sticker, the gold gone soft at the corners. Dex presses it onto Horne\'s chest under the badge and smooths it flat with his thumb, the way you do it for a kid.)'],
      ['dex', "She says when somebody stops being your friend, you give them their sticker back. She's eight. She knows the rules."],
      ['horne', '(looking down at it) ...Calloway.'],
      ['dex', "(stepping back, to Jay, barely a voice) Can we go? I'd like to go now. I'd like to go and be sick somewhere that isn't here."],
    ] },
  ] };

  S.missions.push({
    id: 'm30_salt_and_iron',
    act: 4,
    title: 'Salt and Iron',
    giver: 'jay',
    start: 'chain',
    time: 3.5,
    estMinutes: 12,
    summary: 'Halberd and Southside come for the money, and Jay finishes it with Horne where it began.',
    failIf: ['wrecked:lulu', 'dead:mae', 'dead:noor', 'dead:ansel'],
    steps: [
      { music: 'off' },
      lulu('kostas_salvage'),
      { spawn: [
        { char: 'noor', at: 'kostas_salvage', offset: [3, 4], behavior: 'idle', health: 3000 },
        { char: 'mae', at: 'kostas_salvage', offset: [6, 5], behavior: 'idle', health: 3000 },
        { char: 'ansel', at: 'kostas_salvage', offset: [4, 7], behavior: 'idle', health: 3000 },
        { char: 'rhea', at: 'kostas_salvage', offset: [1, 3], behavior: 'idle', health: 1500 },
        { char: 'kostya', at: 'kostas_salvage', offset: [8, 7], behavior: 'cower', health: 900 },
        { char: 'deb', at: 'kostas_salvage', offset: [7, 9], behavior: 'cower', health: 900 },
      ] },
      halberdVan('barricade_a', 'kostas_salvage', { offset: [10, 8] }),
      halberdVan('barricade_b', 'kostas_salvage', { offset: [14, 12] }),
      halberdSuv('siege_suv', 'kostas_salvage', { offset: [18, 16], locked: true }),
      { spawnCar: 'siege_cruiser', type: 'interceptor', at: 'kostas_salvage', offset: [22, 18], police: true, locked: true },
      { camera: 'kostas_salvage', seconds: 6, say: [
        ['caption', 'Kostas Marine Salvage. 03:31.'],
        ['caption', '(Outside the rolled-down doors, every floodlight in the yard comes on at once: charcoal vans nose to nose across the gate, men in polos with rifles, and behind them a row of Southside cruisers with their lights off.)'],
      ] },
      { scene: { at: 'kostas_salvage', cast: ['rhea', 'noor', 'ansel', 'mae', 'kostya', 'deb'] }, say: [
        ['caption', "(Inside, under the work lights: an armoured van with its back doors cut open, thirty million dollars in grey cases, and on Rhea's pallet desk, in a clear plastic bag, a green leather book.)"],
        ['caption', "(On a camping stove by the propellers, Rhea's kettle starts to whistle.)"],
        ['rourke', '(on a loudhailer, outside, unhurried) Good morning, Kostas Salvage. This is Kessler Rourke, Halberd Security. I\'ll keep this short. I bill by the hour.'],
        ['rhea', '(taking the kettle off the flame) Of course he does.'],
        ['rourke', 'There is a vehicle in your building that belongs to my client. Open the doors, walk out with your hands empty, and everyone goes home.'],
        ['noor', "(at four screens on a pallet, not looking up) “Everyone goes home” is what they say right before nobody goes home. It's in every film. I have a list. It has sub-headings."],
        ['rourke', "Ms. Haddad. Your father's shift at the Voss superstore starts at six. Aisle nine, tinned goods. He builds a very good pyramid."],
        ['caption', "(Noor's hands stop on the keyboard.)"],
        ['rourke', 'Mr. Boateng. The Harbor Point Scholarship Fund. Post-office box four-one-one. That\'s a lovely thing you do.'],
        ['caption', '(Ansel, on an upturned crate with his bandaged palms open on his knees, goes very still. It is not his usual stillness.)'],
        ['mae', '(to Jay, low) How does he know that?'],
        ['jay', 'He plans for people. It\'s his whole thing.'],
        ['rourke', "Ms. Reyes. I don't have anything on you. I looked. You may be the only honest person in that building. I'd stand away from the others."],
        ['mae', "(to the doors, loud) Thanks. I'm good."],
        ['rourke', 'Mr. Mercer. Nothing personal. You have ten minutes.'],
        ['rhea', '(pouring tea into five chipped mugs without spilling a drop) Ten minutes. Augie would have spent nine of them on a speech.'],
        ['noor', "Is there a plan? Please say there's a plan. I'd take a bad plan. I'd take a list with one thing on it."],
        ['jay', '(looking at the doors, the van, the book) We hold the doors. When he runs out of men, he tries something else. When he tries something else, we go out the front.'],
        ['noor', "That's not a plan. That's a weather forecast."],
        ['jay', "Augie's notebook. Rule one: plans fail."],
        ['mae', 'And rule two?'],
        ['jay', "People don't have to."],
        ['caption', '(Nobody says anything. Rhea puts a mug in his hand. Ansel looks at his.)'],
        ['kostya', '(from behind a forklift) I fetched your car from the boardwalk. On the flatbed. She had a parking ticket.'],
        ['jay', 'Thanks, Kostya.'],
        ['kostya', 'I paid it. Eleven dollars. I want it back.'],
        ['deb', 'He wants it back tonight. In case you die.'],
        ['kostya', "I didn't say that part out loud, Deb."],
        ['rhea', "(her eyes on the gap under the doors) He's put men up the orange crane again. Stavros's crane. Same as the thirtieth."],
        ['rhea', 'The handrails up there have been rotten since spring. Halberd took the port maintenance contract. Billed a hundred and forty thousand for new bolts.'],
        ['kostya', 'Nobody came.'],
        ['rhea', "Nobody ever comes. (She racks Stavros's shotgun.) Drink your tea, Mercer. Then hold my door."],
        ['mae', "(dropping her bag behind a block of rust-red iron the size of a car) This is my corner. Stavros's counterweight, off number four."],
        ['mae', "Nobody gets hit. If you get hit, you crawl to me. If you can't crawl, you shout. If you can't shout, I come and get you, and then I'm angry."],
        ['ansel', '(quietly, to his hands) He knows the box number.'],
        ['noor', 'Ansel.'],
        ['ansel', "It's all right, Noor. (He folds the bandaged hands together, slowly, like a letter.) It's only a box."],
      ] },
    ],
  });
})();
