// campaign.js — Acts II to VI of the Leonida story, plus the second wave of side work.
//
// Act I lives in missionCatalog.js: Rey Delgado gets off a bus, drives for Mona
// Castellanos and Tito Barrow, burns the Marlin brothers, cracks Meridian Financial,
// and puts Tito on a plane while Mona takes the seat that was meant for him.
//
// Everything here is what happens to a man who stayed. The city keeps handing him
// bigger rooms and worse company: Elena Sandoval and the cold chain through Port
// Esperanza; Aurelio Vance pouring laundered concrete over Cypress Park; a casino
// boat full of other people's money; a federal agent who cannot be bought; and,
// eventually, Mona again, because she was always coming back.
//
// Missions are pure data — gameplay/missions.js is the interpreter. Dialogue is
// written out in full: `briefing` plays on start, an objective's `say` plays when
// that objective begins, and `debrief` plays on the payout.

// ---------------------------------------------------------------------------
// Shape helpers
//
// These exist so the prose stays readable. Every mission below is still a plain
// frozen object with exactly the fields the interpreter and validator expect.
// ---------------------------------------------------------------------------
const mission = (o) => Object.freeze({
  requires: [],
  rewardRep: Math.max(6, Math.round(o.reward / 900)),
  ...o,
  fail: Object.freeze({ onDeath: true, ...(o.fail || {}) }),
  briefing: Object.freeze([...(o.briefing || [])]),
  debrief: Object.freeze([...(o.debrief || [])]),
  objectives: Object.freeze((o.objectives || []).map((x) => Object.freeze({
    ...x,
    say: x.say ? Object.freeze([...x.say]) : null,
  }))),
});

const at = (text, x, z, radius = 12, say = null) => ({ kind: 'goto', text, x, z, radius, marker: 'goto', say });
const drive = (text, x, z, radius = 15, say = null) => ({ kind: 'deliver', text, x, z, radius, inVehicle: true, marker: 'dropoff', say });
const drop = (text, x, z, radius = 12, say = null) => ({ kind: 'deliver', text, x, z, radius, marker: 'dropoff', say });
const lift = (text, x, z, radius = 26, say = null) => ({ kind: 'steal', text, x, z, radius, marker: 'pickup', say });
const hit = (text, count, extra = {}) => ({ kind: 'kill', text, count, marker: 'kill', ...extra });
const sweep = (text, x, z, count, radius = 45, say = null) => ({ kind: 'killAll', text, x, z, radius, count, marker: 'kill', say });
// `extra` carries targetClass / targetVehicle when the text promises a
// particular kind of thing to wreck, so the spawner puts boats in the water
// rather than saloons on the quay.
const wreck = (text, count, say = null, extra = {}) => ({ kind: 'destroy', text, count, marker: 'kill', say, ...extra });
const wreckBoats = (text, count, say = null) => wreck(text, count, say, { targetClass: 'boat' });
const find = (text, count, extra = {}) => ({ kind: 'collect', text, count, radius: 6, marker: 'pickup', ...extra });
const hold = (text, seconds, x, z, radius = 40, say = null) => ({ kind: 'survive', text, seconds, x, z, radius, marker: 'kill', say });
const bolt = (text, seconds, say = null) => ({ kind: 'escape', text, seconds, say });
const cool = (text, seconds = 120, say = null) => ({ kind: 'losewanted', text, seconds, say });
const idle = (text, seconds, x, z, radius = 20, say = null) => ({ kind: 'wait', text, seconds, x, z, radius, marker: 'goto', say });
const tail = (text, x, z, radius = 16, say = null) => ({ kind: 'chase', text, x, z, radius, inVehicle: true, marker: 'kill', say });
const guard = (text, seconds, say = null) => ({ kind: 'protect', text, seconds, marker: 'goto', say });
const till = (text, x, z, radius = 13, say = null) => ({ kind: 'rob', text, x, z, radius, marker: 'goto', say });
const snap = (text, x, z, radius = 18, say = null) => ({ kind: 'photo', text, x, z, radius, marker: 'goto', say });
const lap = (text, checkpoints, say = null) => ({ kind: 'race', text, inVehicle: true, marker: 'checkpoint', checkpoints, laps: 1, say });
const lap2 = (text, laps, checkpoints, say = null) => ({ kind: 'race', text, inVehicle: true, marker: 'checkpoint', checkpoints, laps, say });
const air = (text, extra = {}) => ({ kind: 'stunt', text, marker: 'checkpoint', ...extra });

// ===========================================================================
// ACT II — SALT AND STATIC
//
// Mona's plane is gone and her phone rings out. Tito is alive, broke and
// furious. Into the gap comes Elena Sandoval, who moves cocaine in refrigerated
// fish trucks and speaks to everybody like they are already agreeing with her.
// Ruiz has lost his badge and kept all of the habits.
// ===========================================================================
const ACT_II = [
  mission({
    id: 'a01-dial-tone', name: 'Dial Tone', giver: 'Tito Barrow', type: 'story', act: 2,
    tier: 8, requires: ['s12-last-bus-out'], reward: 26000,
    blurb: "Mona's number rings out. Her apartment does not.",
    briefing: [
      'TITO: Four days. Four days I have been calling that woman and getting a tone.',
      'TITO: She kept a place above the laundrette on Ocean Mile. Second floor, blue door.',
      'TITO: She also kept a book. Names, numbers, who owes what to whom. That book is the only reason anybody in this city takes our calls.',
      'REY: And if somebody already took it?',
      'TITO: Then we find out who, and we take it back, and the city learns something about us.',
    ],
    start: { x: 806, z: -300, marker: 'M', radius: 6 },
    objectives: [
      at("Get to Mona's apartment on Ocean Mile", 826, -336, 12, [
        'REY: Door is open. That is never good news.',
      ]),
      find('Search the apartment for the book', 4, { radius: 14, x: 826, z: -336 }),
      sweep('Deal with whoever else came looking', 826, -336, 5, 40, [
        "REY: Tito. There are men here. They are not movers.",
        'TITO: Then they are the answer to my question. Ask them politely and then stop asking politely.',
      ]),
      drive('Take what you found back to the Foundry', 160, -860, 14),
    ],
    fail: { onDeath: true },
    debrief: [
      'TITO: Half a book. Somebody tore out the pages after M.',
      'REY: M for Marlin. M for Mona.',
      'TITO: M for we are going to have a very long year.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'a02-cold-chain', name: 'Cold Chain', giver: 'Elena Sandoval', type: 'story', act: 2,
    tier: 8, requires: ['a01-dial-tone'], reward: 29000,
    blurb: 'A refrigerated truck leaves Port Esperanza at nine. It needs a driver who does not ask what is under the ice.',
    briefing: [
      'ELENA: You are the one who kept the Foundry open. I like people who do not run when the running is sensible.',
      'ELENA: There is a truck at the port. Refrigerated. It carries snapper, grouper and a quantity of something that is neither.',
      'ELENA: Drive it to Little Habana. Do not open the back. Do not stop. If the engine light comes on, keep driving.',
      'REY: And if the police stop me?',
      'ELENA: Then you will have discovered what you are worth, and so will I.',
    ],
    start: { x: 620, z: -1010, marker: '$', radius: 6 },
    objectives: [
      lift('Take the refrigerated truck', 648, -1036, 24, [
        'ELENA: The keys are above the visor. They are always above the visor. It is the least imaginative industry on earth.',
      ]),
      drive('Run it to Little Habana without being stopped', 560, 470, 16, [
        'ELENA: Forty minutes of driving and a lifetime of not thinking about the cargo. You will be fine.',
      ]),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 480 },
    debrief: [
      'ELENA: Nothing thawed. Nothing spilled. Nothing said.',
      'ELENA: Come back tomorrow. I will have found something harder for you.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'a03-the-frequency', name: 'The Frequency', giver: 'Yaz Okonkwo', type: 'story', act: 2,
    tier: 8, requires: ['a01-dial-tone'], reward: 24000,
    blurb: 'A pirate radio engineer needs one part from a building that counts its paperclips.',
    briefing: [
      'YAZ: Okay. Hi. You do not know me, I know everything about you, we can skip a step.',
      'YAZ: I run a transmitter out of a trailer in Rust Row. I cover the whole coast on a good night and half of it on a bad one.',
      'YAZ: My final amplifier just died and the only one in Leonida is sitting in a broadcast rack on the eleventh floor of Meridian.',
      'REY: You want me to rob an office building for a radio part.',
      'YAZ: I want you to liberate an amplifier. And in return you get to hear what the police are saying about you before they say it.',
    ],
    start: { x: -1050, z: -820, marker: 'M', radius: 6 },
    objectives: [
      at('Get into the Meridian tower service entrance', 246, 214, 12),
      find('Find the amplifier in the broadcast rack', 3, { radius: 18, x: 246, z: 214, say: [
        'YAZ: Grey box, about the size of a microwave, hot enough to fry on. You will know it.',
      ] }),
      bolt('Get clear of the financial district', 90, [
        'YAZ: Security is calling it in. Go down the stairs. Do not be the man who waits for a lift while holding a stolen amplifier.',
      ]),
      drive('Take it to the trailer in Rust Row', -1050, -820, 16),
    ],
    fail: { onDeath: true },
    debrief: [
      'YAZ: It works. It works! Listen to that noise floor. That is nothing. That is beautiful nothing.',
      'YAZ: You are on the list now, Rey. My list is short and mostly imaginary but it is a list.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'a04-sunday-collection', name: 'Sunday Collection', giver: 'Father Amaro', type: 'story', act: 2,
    tier: 8, requires: ['a02-cold-chain'], reward: 27000,
    blurb: 'Three parishes, three envelopes, one priest who has made his peace with all of it.',
    briefing: [
      'AMARO: The roof of Saint Mercy has a hole in it the size of a car. The diocese has offered prayers.',
      'AMARO: Certain businesses in this city have offered money, on condition that the money takes a route nobody can draw on a map.',
      'AMARO: Three envelopes, three parishes. Bring them here and the roof gets fixed and God, I am told, looks the other way.',
      'REY: Does He?',
      'AMARO: He has been looking the other way over Leonida since 1926, son. I would not take it personally.',
    ],
    start: { x: 430, z: 900, marker: '$', radius: 6 },
    objectives: [
      at('Collect from the chapel in South Glades', -120, 660, 12),
      at('Collect from the mission house in Palmview', -160, -430, 12, [
        'AMARO: The woman at Palmview will want to talk about her son. Let her. It costs you four minutes and it costs her everything.',
      ]),
      at('Collect from the storefront church in Little Habana', 560, 470, 12),
      drive('Bring the collection back to Saint Mercy', 430, 900, 14),
    ],
    fail: { onDeath: true, timeLimit: 600 },
    debrief: [
      'AMARO: You did not open them.',
      'REY: Was I supposed to?',
      'AMARO: Everybody else did. That is why everybody else stopped getting asked.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'a05-the-suspension', name: 'The Suspension', giver: 'Tito Barrow', type: 'story', act: 2,
    tier: 8, requires: ['a03-the-frequency'], reward: 31000,
    blurb: 'Ruiz lost the badge and kept the file. He is driving it across town right now.',
    briefing: [
      'YAZ: Okay so the amplifier is already paying off. Police band, twenty minutes ago.',
      'YAZ: Detective Ruiz is suspended pending review. Handed in the badge, kept the car, and signed out a box from evidence he had no right to sign out.',
      'TITO: What was in the box?',
      'YAZ: Everything he built on the Foundry. Photographs. Your plates, Rey. Every plate.',
      'TITO: Then he does not get to keep driving with it.',
    ],
    start: { x: 340, z: -140, marker: '!', radius: 6 },
    objectives: [
      tail("Run down Ruiz's car", 300, -200, 16, [
        'RUIZ: I know that is you behind me, Delgado. I have known since Ocean Mile.',
        'RUIZ: You want to know the funny part? I am not even a policeman today. Today I am just a man with a very good memory.',
      ]),
      wreck('Stop the car', 1),
      find('Recover the file before it burns', 3, { radius: 16 }),
    ],
    fail: { onDeath: true, onTargetEscaped: true, timeLimit: 300 },
    debrief: [
      'REY: He walked away from it. Straight down the middle of the road, no hurry.',
      'TITO: Men who walk away slow are men who have another copy.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'a06-rust-row-auction', name: 'Rust Row Auction', giver: 'Tito Barrow', type: 'story', act: 2,
    tier: 8, requires: ['a05-the-suspension'], reward: 33000,
    blurb: "The bailiffs took Tito's tools. Somebody is selling them back to him in a scrapyard.",
    briefing: [
      'TITO: Thirty years of tools. My father bought me the first torch in that set.',
      'TITO: They went out of the door in a crate with a county seal on it and turned up in a scrap auction in Rust Row nine days later.',
      'TITO: I am not bidding for my own hands, Rey.',
      'REY: So it is not an auction.',
      'TITO: It was never an auction. Go and see who thought I would not notice.',
    ],
    start: { x: -1050, z: -820, marker: '!', radius: 6 },
    objectives: [
      at('Get to the scrapyard', -1020, -864, 14, [
        'REY: Tito. There are nine men here for a crate of welding gear.',
        'TITO: Then it was never about the gear. Be careful.',
      ]),
      sweep('Survive the ambush', -1020, -864, 8, 45),
      find("Recover Tito's tools", 4, { radius: 20, x: -1020, z: -864 }),
      drive('Get the crate back to the Foundry', 160, -860, 14),
    ],
    fail: { onDeath: true },
    wantedOnStart: 1,
    debrief: [
      'TITO: My father bought me this torch in nineteen seventy four.',
      'TITO: They put a county sticker on it. Look. Right there on the handle.',
      'REY: I can take it off.',
      'TITO: No. Leave it. I want to remember who tried.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'a07-eleven-boats', name: 'Eleven Boats', giver: 'Elena Sandoval', type: 'story', act: 2,
    tier: 8, requires: ['a06-rust-row-auction'], reward: 36000,
    blurb: 'What is left of the Marlin family keeps a fleet at Marina del Sol. Elena would like it to be a smaller fleet.',
    briefing: [
      'ELENA: The Marlin brothers are dead. You know this better than most.',
      'ELENA: Their cousins are not dead, and they have eleven boats, and every one of those boats is running my water.',
      'ELENA: I am not asking you to sink eleven boats. I am asking you to sink enough of them that the other seven decide to fish.',
    ],
    start: { x: 880, z: -680, marker: '!', radius: 6 },
    objectives: [
      at('Get down to the marina', 906, -708, 14),
      wreckBoats('Put four boats on the bottom', 4, [
        'ELENA: The blue hulls. The white ones belong to dentists.',
      ]),
      bolt('Be somewhere else when the coastguard arrives', 100),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2,
    debrief: [
      'ELENA: Seven boats went out fishing this morning. Actual fishing. With nets.',
      'ELENA: You have made honest men of them, Rey. God will be confused.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'a08-what-elena-wants', name: 'What Elena Wants', giver: 'Elena Sandoval', type: 'story', act: 2,
    tier: 8, requires: ['a07-eleven-boats'], reward: 34000,
    blurb: 'She wants to be driven from the port to the hills, slowly, so she can explain something.',
    briefing: [
      'ELENA: Today you drive and I talk. Slowly. Take the coast road, not the causeway.',
      'ELENA: I want you to understand what you are standing in the middle of before you decide where to stand.',
    ],
    start: { x: 620, z: -1010, marker: 'M', radius: 6 },
    objectives: [
      guard('Drive Elena along the coast road', 140, [
        'ELENA: My grandfather sold ice. Actual ice, from a cart, to people who had no refrigerator.',
        'ELENA: He understood something the men in Meridian never will: you do not sell the thing. You sell the cold.',
        'ELENA: Anyone can get product into Leonida. I am the only person who can keep it at four degrees from a boat to a bathroom in Vice Sands.',
        'ELENA: That is not crime, Rey. That is logistics. Crime is what the people at both ends do with it.',
      ]),
      drive('Take her up to Mirador Hills', -940, 60, 18, [
        'ELENA: Now look down. Every light you can see, somebody is being charged for.',
        'ELENA: Mona understood that. Mona also thought she could charge me. Think about that when you wonder where she went.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'REY: You knew her.',
      'ELENA: Everybody knew her. That was always going to be her problem.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'a09-the-roof-fund', name: 'The Roof Fund', giver: 'Father Amaro', type: 'story', act: 2,
    tier: 8, requires: ['a04-sunday-collection'], reward: 38000,
    blurb: 'The roof money is in a safe in a building that is about to be raided.',
    briefing: [
      'AMARO: I am going to ask you to steal from a church, and I am going to be the one who tells you where the safe is.',
      'AMARO: There is a raid coming. Somebody in the diocese finally read a bank statement.',
      'AMARO: If they open that safe, eleven people go to prison and none of them are me, which I find harder to live with than you might expect.',
      'REY: So I take it first.',
      'AMARO: You take it first, and the roof still gets fixed, and I go and explain myself to a bishop. That part is mine.',
    ],
    start: { x: 430, z: 900, marker: '$', radius: 6 },
    objectives: [
      at('Get inside before the raid', 452, 924, 12, [
        'AMARO: Sacristy. Behind the vestments. It is not subtle, it is just old.',
      ]),
      till('Empty the roof fund', 452, 924, 13),
      cool('Lose the units that turned up early', 140, [
        'AMARO: They came early. Of course they came early. Go, Rey. Go now.',
      ]),
      drive('Get the money to the Foundry', 160, -860, 14),
    ],
    fail: { onDeath: true },
    wantedOnEnd: 0,
    debrief: [
      'AMARO: The bishop was very understanding until about the fourth minute.',
      'AMARO: The roof gets fixed in March. Come and look at it. Stand under it. You paid for it as much as anyone.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'a10-static-sunday', name: 'Static Sunday', giver: 'Yaz Okonkwo', type: 'story', act: 2,
    tier: 8, requires: ['a09-the-roof-fund'], reward: 41000,
    blurb: 'Somebody triangulated the pirate station. Yaz has nine minutes and one pair of hands.',
    briefing: [
      'YAZ: They found me. They found me. There is a van on the access road with a loop antenna on the roof and it is not lost.',
      'YAZ: I can lose the trailer. I can lose the desk. I cannot lose that transmitter, Rey, it is the only one and you stole it for me.',
      'YAZ: Get here. Get it out. I will keep talking until the last second because that is what I do.',
    ],
    start: { x: -1050, z: -820, marker: '!', radius: 6 },
    objectives: [
      at('Get to the trailer in Rust Row', -1062, -848, 12),
      sweep('Clear the road crew off the access track', -1062, -848, 6, 40, [
        'YAZ: They are not police. Police knock. These men have a van with no plates and a lot of confidence.',
      ]),
      find('Get the transmitter and the tapes into the car', 4, { radius: 14, x: -1062, z: -848 }),
      drive('Move the station to the Foundry', 160, -860, 14, [
        'YAZ: Do not brake hard. That rack has one bolt and my entire personality in it.',
      ]),
    ],
    fail: { onDeath: true, timeLimit: 420 },
    debrief: [
      'YAZ: Back on air in forty minutes. From a chop shop. On a pirate frequency. With a stolen amplifier.',
      'YAZ: Honestly this is the most stable my life has ever been.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'a11-the-hook', name: 'The Hook', giver: 'Detective Ruiz', type: 'story', act: 2,
    tier: 8, requires: ['a10-static-sunday'], reward: 44000,
    blurb: 'Ruiz asks for a meeting in Cypress Park. It is not a meeting.',
    briefing: [
      'RUIZ: Delgado. One conversation. Neutral ground, park bench, daylight, no guns and no theatre.',
      'RUIZ: I am not a policeman any more. That should worry you more than it does.',
      'TITO: Do not go.',
      'REY: If I do not go, he keeps setting the terms.',
      'TITO: He is setting them right now. That is what a meeting is.',
    ],
    start: { x: -580, z: 520, marker: '!', radius: 6 },
    objectives: [
      at('Meet Ruiz in Cypress Park', -560, 548, 12, [
        'RUIZ: Sit down. You are taller than you look in the photographs.',
        'RUIZ: Here is the offer. Elena Sandoval. You give her to me and every file I have on the Foundry goes in the sea.',
        'REY: You are suspended. You cannot arrest a parking meter.',
        'RUIZ: I never said arrest.',
      ]),
      idle('Hear him out', 22, -560, 548, 22, [
        'RUIZ: Twelve years I worked this city honest. Do you know what honest bought me? A suspension and a storage unit.',
        'RUIZ: So now I am going to take something from somebody, and I am asking you, politely, to choose who.',
        'REY: And if I walk?',
        'RUIZ: Then you find out I did not come alone.',
      ]),
      sweep('Fight your way out of the park', -560, 548, 8, 50, [
        'REY: You brought eight men to a bench.',
        'RUIZ: I brought eleven. Three of them are still parking.',
      ]),
      bolt('Get out of Cypress Park', 110),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2,
    debrief: [
      'TITO: Well?',
      'REY: He wants Elena.',
      'TITO: Everybody wants Elena. The question is what he is willing to become to get her.',
      'REY: I think he already became it.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'a12-cold-storage', name: 'Cold Storage', giver: 'Tito Barrow', type: 'heist', act: 2,
    tier: 8, requires: ['a11-the-hook'], reward: 90000,
    blurb: "Elena's cash sits in a refrigerated warehouse at the port. Tito wants to stop being anybody's driver.",
    briefing: [
      'TITO: I have been working for other people since I was nineteen years old.',
      'TITO: Mona. The Marlins. Now a woman who sells cold. I am sixty one, Rey, and I have never once owned the room.',
      'TITO: There is a chiller at Port Esperanza. Unit nine. It holds fish, and behind the fish it holds every dollar Elena cannot put in a bank.',
      'REY: She will know it was us inside a day.',
      'TITO: She will know it was us inside an hour. And then we will find out whether we are men she deals with or men she removes.',
      'TITO: I am tired of not knowing.',
    ],
    start: { x: 620, z: -1010, marker: '$', radius: 6 },
    objectives: [
      at('Get to chiller unit nine', 664, -1044, 12, [
        'YAZ: Cameras are looping. You have about six minutes of being nowhere.',
      ]),
      sweep('Deal with the night crew', 664, -1044, 7, 40),
      till('Break open the cold store', 664, -1044, 14, [
        'TITO: Behind the pallets. Blue drums. Do not ask what the drums normally do.',
      ]),
      find('Load the cash', 6, { radius: 18, x: 664, z: -1044 }),
      drive('Run it out of the port', 160, -860, 16, [
        'YAZ: Every unit on the south side just got the same address. That address is you.',
      ]),
      cool('Lose them before you go anywhere near home', 180),
    ],
    fail: { onDeath: true },
    wantedOnStart: 3, wantedOnEnd: 0,
    debrief: [
      'ELENA: You took four hundred thousand dollars of mine out of a freezer.',
      'TITO: We did.',
      'ELENA: Good. I have been waiting two years for somebody in this city to do something interesting.',
      'ELENA: Keep it. Consider it the price of my attention. You will find it is expensive to hold.',
    ],
    music: 'pulse-fm',
  }),
];

// ===========================================================================
// ACT III — THE CONCRETE SEASON
//
// Aurelio Vance is turning Leonida into an artist's impression of itself.
// Cypress Park becomes "Cypress Quarter", Rust Row becomes a car park, and the
// money that pays for it arrives in cash from places it should not. His security
// chief, Kessler, is the first person in the story who is actually good at this.
// ===========================================================================
const ACT_III = [
  mission({
    id: 'b01-ground-lease', name: 'Ground Lease', giver: 'Tito Barrow', type: 'story', act: 3,
    tier: 9, requires: ['a12-cold-storage'], reward: 42000,
    blurb: 'Somebody has bought the ground under the Foundry. Find out who, before the letter becomes a bulldozer.',
    briefing: [
      'TITO: A letter came. Heavy paper. Nobody sends bad news on heavy paper unless they are enjoying it.',
      'TITO: The land under my building was sold in a bundle of forty two lots. Rust Row, half of Cypress Park, the whole of the flats.',
      'TITO: The buyer is a company owned by a company owned by an address in Meridian.',
      'YAZ: Vance Coastal Holdings. Aurelio Vance. He was on the news last week standing next to a model of a city that is not this one.',
      'REY: Then let us go and look at the model.',
    ],
    start: { x: 160, z: -860, marker: 'M', radius: 6 },
    objectives: [
      at('Get to the Vance sales suite in Meridian', 254, 186, 12),
      snap('Photograph the master plan on the wall', 254, 186, 16, [
        'YAZ: Get the whole board. The legend at the bottom especially — that is where the phasing is.',
      ]),
      find('Take the phasing documents', 3, { radius: 14, x: 254, z: 186 }),
      bolt('Leave before the receptionist finishes her call', 80),
    ],
    fail: { onDeath: true },
    debrief: [
      'YAZ: Phase one is the flats. Phase one starts in eleven weeks.',
      'TITO: Eleven weeks.',
      'YAZ: And phase four is a marina where Rust Row is. My trailer is a boat now, apparently.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'b02-the-councillor', name: 'The Councillor', giver: 'Yaz Okonkwo', type: 'story', act: 3,
    tier: 9, requires: ['b01-ground-lease'], reward: 44000,
    blurb: 'Councillor Nadia Brant votes the way Vance pays. Get proof, not gossip.',
    briefing: [
      'YAZ: Rezoning passed nine to two. The two were a retired teacher and a man who votes no to everything including lunch.',
      'YAZ: Nadia Brant chaired it. Nadia Brant also has a second home in Mirador Hills that costs more than her salary for thirty years.',
      'YAZ: She meets somebody in the multi-storey under Grand Vista every second Thursday. It is today and it is Thursday.',
      'REY: What am I getting?',
      'YAZ: Pictures. Not opinions. In this city an opinion is worth nothing and a photograph is worth a councillor.',
    ],
    start: { x: -720, z: -560, marker: '!', radius: 6 },
    objectives: [
      at('Get into the Grand Vista car park', -742, -586, 12),
      snap('Photograph the handover', -742, -586, 16, [
        'YAZ: That is not an envelope. That is a case. Get the case in frame with her face.',
      ]),
      tail('Follow the courier when he leaves', -700, -540, 18, [
        'YAZ: Do not crowd him. He is driving like a man who has done this before.',
      ]),
      snap('Photograph where the money goes', -580, -400, 18),
    ],
    fail: { onDeath: true, onTargetEscaped: true, timeLimit: 420 },
    debrief: [
      'YAZ: It goes to a print shop in Little Habana that has never printed anything.',
      'REY: A laundry.',
      'YAZ: A laundry with a councillor attached. Rey, this is the best Thursday I have ever had.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'b03-concrete-pour', name: 'Concrete Pour', giver: 'Tito Barrow', type: 'story', act: 3,
    tier: 9, requires: ['b01-ground-lease'], reward: 46000,
    blurb: 'Stop the first pour on the Cypress Park site. Not forever. Just long enough to be expensive.',
    briefing: [
      'TITO: You cannot fight a developer. You can only make him miss a window.',
      'TITO: Concrete is booked in slots. Miss the slot and the trucks leave and the whole programme slides three weeks and somebody in an office loses a bonus.',
      'TITO: There are eight trucks queued for Cypress Park at first light. Make them late.',
      'REY: How late?',
      'TITO: Late enough that the concrete goes off in the drum. That is a very loud kind of late.',
    ],
    start: { x: -580, z: 520, marker: '!', radius: 6 },
    objectives: [
      at('Get to the Cypress Park site before dawn', -604, 548, 14),
      wreck('Put the mixer trucks out of service', 5, [
        'TITO: Not the men. The trucks. If you take this out on the drivers we are just another gang and I did not sign up for that.',
      ]),
      hold('Keep the site shut until the slot closes', 120, -604, 548, 45, [
        'KESSLER: Site security. Everybody off the plot. I will say it once more and then I will stop saying things.',
      ]),
      bolt('Get off the site', 90),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2,
    debrief: [
      'YAZ: Programme slipped nineteen days. Vance Coastal put out a statement about "supply chain challenges".',
      'TITO: Nineteen days. Nineteen days is a whole life when you are sixty one.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'b04-model-home', name: 'Model Home', giver: 'Yaz Okonkwo', type: 'story', act: 3,
    tier: 9, requires: ['b02-the-councillor'], reward: 48000,
    blurb: 'The Palmview show home has a safe under the stairs and a guest list in the safe.',
    briefing: [
      'YAZ: Vance runs a show home in Palmview. Fake family photographs, fake books, a real safe.',
      'YAZ: Every investor who has ever been walked around that kitchen signed a visitor book, because rich people cannot resist signing things.',
      'YAZ: That book is a map of everybody putting cash into this.',
      'REY: And the safe?',
      'YAZ: Is under the stairs, next to a cupboard containing eleven identical throw cushions. I hate it there. Go anyway.',
    ],
    start: { x: -160, z: -430, marker: '$', radius: 6 },
    objectives: [
      at('Get into the Palmview show home', -136, -459, 12),
      till('Open the safe under the stairs', -136, -459, 13),
      find('Take the visitor book and the ledgers', 4, { radius: 12, x: -136, z: -459 }),
      drive('Get it to Yaz', 160, -860, 14),
    ],
    fail: { onDeath: true },
    debrief: [
      'YAZ: Forty one names. Nine of them are shell companies. Two of them are Sandoval.',
      'REY: Elena is paying for this?',
      'YAZ: Elena is washing money through the thing that is knocking down your friend house. Welcome to Leonida.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'b05-kessler', name: 'Kessler', giver: 'Tito Barrow', type: 'story', act: 3,
    tier: 9, requires: ['b03-concrete-pour', 'b04-model-home'], reward: 52000,
    blurb: "Vance's security chief has decided the Foundry is a problem he can solve on a Tuesday.",
    briefing: [
      'TITO: Somebody walked the yard last night. Did not take anything. Counted the doors.',
      'YAZ: That is Kessler. Ex-army, ran site security in three countries where sites needed that kind of security.',
      'YAZ: He does not threaten people, he surveys them. And then eight weeks later there is a fire and an insurance claim.',
      'TITO: We do not have eight weeks. We have tonight.',
    ],
    start: { x: 160, z: -860, marker: '!', radius: 6 },
    objectives: [
      hold('Hold the Foundry through the night', 180, 160, -860, 50, [
        'KESSLER: Mister Barrow. Aurelio would like the building empty and undamaged. I would like that too.',
        'KESSLER: What happens next depends entirely on which of us is more patient, and I have been doing this since Basra.',
      ]),
      sweep('Push the last of them off the lot', 160, -860, 6, 45),
      wreck('Wreck the vehicles they came in', 2, [
        'TITO: Leave them walking. Let him explain the taxi fare on an expenses form.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'KESSLER: You held. Noted.',
      'KESSLER: I am going to go away now and come back with a different kind of evening. Nothing personal, Mister Delgado.',
      'REY: It is a little personal.',
      'KESSLER: It never is. That is what makes me good at it.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'b06-permit-office', name: 'Permit Office', giver: 'Nadia Brant', type: 'story', act: 3,
    tier: 9, requires: ['b05-kessler'], reward: 55000,
    blurb: 'The councillor wants out. The price is one file drawer in the planning office.',
    briefing: [
      'BRANT: I am not going to pretend you are here to help me. You have photographs.',
      'BRANT: So let us be efficient. There is a drawer in the planning office on the fourth floor with every variation Vance has ever applied for.',
      'BRANT: My signature is on a lot of them. So is the signature of a man in the state office who is far more dangerous to me than you are.',
      'REY: You want me to burn your own paperwork.',
      'BRANT: I want you to take it. What you do with it afterwards is how I will find out what kind of man I am dealing with.',
    ],
    start: { x: 230, z: 200, marker: '$', radius: 6 },
    objectives: [
      at('Get into the planning office after hours', 212, 226, 12),
      find('Pull the Vance variation file', 5, { radius: 16, x: 212, z: 226, say: [
        'BRANT: Fourth drawer. The one that does not close properly. It has never closed properly.',
      ] }),
      bolt('Get out before the night sweep', 90),
      drop('Meet Brant at the park', -580, 520, 14, [
        'BRANT: You brought all of it.',
        'REY: I brought all of it.',
        'BRANT: Then you are either very stupid or you want something bigger than me. I hope it is the second one.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'BRANT: There is a meeting in eleven days. Vance, the state office, and four people whose names are not written anywhere.',
      'BRANT: I can get you the address. After that, Mister Delgado, I am going to be on a very long holiday.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'b07-the-crane', name: 'The Crane', giver: 'Tito Barrow', type: 'story', act: 3,
    tier: 9, requires: ['b06-permit-office'], reward: 58000,
    blurb: 'There is a tower crane over the flats. Tito would like there not to be.',
    briefing: [
      'TITO: They put the crane up on Sunday. Sunday, so nobody would complain about the noise.',
      'TITO: It stands over my roof. Every morning I open the shutter and there it is, waiting.',
      'REY: You want me to drop a crane.',
      'TITO: I want the crane to have an accident so expensive that the insurer sends a man in a helicopter.',
      'YAZ: I have read the manual. There is a slew brake, a counterweight cradle and a hoist limit. Disable two of the three and physics does the rest.',
    ],
    start: { x: 160, z: -860, marker: '!', radius: 6 },
    objectives: [
      at('Climb the crane compound fence', 132, -892, 12),
      sweep('Clear the night watch', 132, -892, 5, 35),
      find('Cut the slew brake and the hoist limiter', 3, { radius: 12, x: 132, z: -892, say: [
        'YAZ: Grey conduit for the brake. Red for the limiter. If you cut the yellow one you will find out what a sixty tonne pendulum sounds like from underneath.',
      ] }),
      bolt('Get well clear before it goes', 80, [
        'YAZ: Run. Rey. Run now, do not look, run.',
      ]),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2,
    debrief: [
      'TITO: I opened the shutter this morning and there was sky.',
      'TITO: Just sky. I stood there like an idiot for ten minutes.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'b08-show-home-rampage', name: 'Phase One', giver: 'Yaz Okonkwo', type: 'story', act: 3,
    tier: 9, requires: ['b07-the-crane'], reward: 56000,
    blurb: 'Kessler brought the different kind of evening. It is happening at Rust Row.',
    briefing: [
      'YAZ: Rey. Rey. There are trucks on the access road and they are not mixers.',
      'YAZ: Kessler is clearing Rust Row tonight. No notice, no bailiffs, no paperwork. Forty families.',
      'YAZ: Half of them have nowhere. The other half have a cousin in South Glades and one bag each.',
      'REY: How long have they got?',
      'YAZ: They have you. That is the whole answer.',
    ],
    start: { x: -1050, z: -820, marker: '!', radius: 6 },
    objectives: [
      at('Get to Rust Row', -1050, -820, 16),
      hold('Hold the road while people get out', 180, -1050, -820, 55, [
        'KESSLER: You have picked the least defensible position in the county, Mister Delgado.',
        'REY: It is not a position. It is where people live.',
        'KESSLER: That is the same sentence. You just said it slower.',
      ]),
      sweep('Break the clearance crew', -1050, -820, 9, 55),
      wreck('Wreck the clearance trucks', 3),
    ],
    fail: { onDeath: true },
    wantedOnStart: 3,
    debrief: [
      'YAZ: Thirty eight got out with their things. Two lost everything anyway.',
      'YAZ: I am supposed to say that is a win.',
      'REY: It is not a win. It is a Tuesday we survived.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'b09-brants-price', name: "Brant's Price", giver: 'Nadia Brant', type: 'story', act: 3,
    tier: 9, requires: ['b08-show-home-rampage'], reward: 60000,
    blurb: 'The councillor is leaving the country. Somebody has decided she should not.',
    briefing: [
      'BRANT: They found out. I do not know how and it does not matter how.',
      'BRANT: There is a car outside my house that has been there since four in the morning.',
      'BRANT: I have a flight at eight. I have my daughter. I do not have a plan.',
      'REY: You have me for about ninety minutes.',
      'BRANT: Then get me to the airport, and I will send you the address of that meeting from somewhere with better weather.',
    ],
    start: { x: -940, z: 60, marker: 'M', radius: 6 },
    objectives: [
      at("Get to Brant's house in Mirador Hills", -962, 88, 12),
      guard('Get her out of the house alive', 120, [
        'BRANT: They are in the garden. Oh God, they are in the garden.',
        'REY: Head down. Straight line to the car. Do not look at anything.',
      ]),
      drive('Drive her to Leonida International', -517, -1086, 22, [
        'BRANT: I chaired eleven rezonings. Eleven. Every one of them was a street where somebody lived.',
        'BRANT: I told myself it was inevitable. It is a very comfortable word, inevitable.',
      ]),
      cool('Lose whatever followed you', 140),
    ],
    fail: { onDeath: true, timeLimit: 540 },
    debrief: [
      'BRANT: The meeting is in eleven days at the Vance house on the ridge. Everybody who matters will be in one room.',
      'BRANT: Do not waste it being angry. Anger is what they expect from people like you.',
      'REY: People like me.',
      'BRANT: I know. I heard it too.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'b10-bulldozer', name: 'Bulldozer', giver: 'Tito Barrow', type: 'story', act: 3,
    tier: 9, requires: ['b09-brants-price'], reward: 64000,
    blurb: 'The demolition notice is real, the date is Friday, and Tito has stopped arguing.',
    briefing: [
      'TITO: Friday. Seven in the morning. Notice is properly served and everything, which is almost funny.',
      'TITO: So here is what we do. We do not defend it. We empty it.',
      'TITO: Every tool, every press, every drum of thinner, my father torch, and the sign. Especially the sign.',
      'REY: And then?',
      'TITO: And then on Friday morning they knock down a shed. And we are somewhere else being a problem.',
    ],
    start: { x: 160, z: -860, marker: '$', radius: 6 },
    objectives: [
      find('Load out the Foundry', 8, { radius: 24, x: 160, z: -860, say: [
        'TITO: Careful with the press. That press has outlived two wives and neither of them were mine.',
      ] }),
      drive('Move the first load to the port lock-up', 620, -1010, 16),
      drive('Move the second load to Little Habana', 560, 470, 16, [
        'TITO: Amaro says we can use the hall behind the church until we find somewhere.',
        'REY: A chop shop behind a church.',
        'TITO: He says God invented the internal combustion engine so people would have something to confess.',
      ]),
      at('Take the sign down last', 160, -860, 12, [
        'TITO: Leave me a minute, Rey.',
        'TITO: Thirty one years. Right. Put it in the truck.',
      ]),
    ],
    fail: { onDeath: true, timeLimit: 720 },
    debrief: [
      'TITO: They knocked it down at seven oh four on Friday. Yaz filmed it.',
      'TITO: I have watched it eleven times. I will watch it eleven more.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'b11-the-vance-collection', name: 'The Vance Collection', giver: 'Yaz Okonkwo', type: 'heist', act: 3,
    tier: 9, requires: ['b10-bulldozer'], reward: 130000,
    blurb: "Vance keeps his art in a climate-controlled room on the ridge. Insurance values it at eleven million.",
    briefing: [
      'YAZ: Aurelio Vance owns forty three paintings and cannot name nine of them.',
      'YAZ: They live in a temperature-controlled room behind his study, on the ridge in Mirador Hills, protected by Kessler and a system I have spent two weeks inside.',
      'TITO: Why paintings? We cannot sell paintings.',
      'YAZ: We do not sell them. We take them, and then his insurer audits the collection, and the audit finds that nine of the forty three were bought with money that came off a boat.',
      'REY: We are robbing a man to get him investigated.',
      'YAZ: I have been waiting my whole life to say a sentence like that out loud.',
    ],
    start: { x: -940, z: 60, marker: '$', radius: 6 },
    objectives: [
      at('Get up to the Vance house on the ridge', -988, 34, 12, [
        'YAZ: Gate camera is on a loop. You have eleven minutes before the loop repeats a seagull and somebody notices.',
      ]),
      sweep('Get past the house detail', -988, 34, 7, 40),
      till('Open the collection room', -988, 34, 14, [
        'YAZ: The door is not the problem. The humidity alarm is the problem. Open it fast and close it faster.',
      ]),
      find('Take the nine that matter', 9, { radius: 20, x: -988, z: 34 }),
      drive('Get them down off the ridge', 560, 470, 18, [
        'KESSLER: Every road off that ridge goes through one of two junctions, Mister Delgado. I am sitting at both.',
      ]),
      cool('Lose Kessler and the units he called', 180),
    ],
    fail: { onDeath: true },
    wantedOnStart: 3, wantedOnEnd: 0,
    debrief: [
      'YAZ: The insurer filed a suspicious activity report at nine this morning.',
      'YAZ: Federal financial crimes opened a file on Vance Coastal Holdings at eleven.',
      'TITO: So we won.',
      'YAZ: We opened a federal file in this city, Tito. Nobody wins those. They just get named in them.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'b12-groundbreaking', name: 'Groundbreaking', giver: 'Rey Delgado', type: 'story', act: 3,
    tier: 9, requires: ['b11-the-vance-collection'], reward: 72000,
    blurb: 'Everybody who paid for Phase One is in one room on the ridge. Brant kept her promise.',
    briefing: [
      'REY: Eleven days ago a woman I blackmailed gave me an address because she thought I would do something better with it than she did.',
      'YAZ: There are nineteen people in that house tonight. Vance, the state office, two Sandoval accountants and a man from a bank.',
      'TITO: And you want to walk in.',
      'REY: I want to walk in, take the contracts, and walk out with the whole of Phase One in a bag.',
      'TITO: And Kessler?',
      'REY: Kessler will be at the door. Kessler is always at the door.',
    ],
    start: { x: -940, z: 60, marker: '!', radius: 6 },
    objectives: [
      at('Get to the Vance house', -988, 34, 12),
      sweep('Get through the door detail', -988, 34, 8, 40, [
        'KESSLER: I told you it was never personal.',
        'REY: You keep saying that like it helps.',
        'KESSLER: It helps me.',
      ]),
      find('Take the Phase One contracts', 5, { radius: 18, x: -988, z: 34 }),
      hold('Hold the study while Yaz copies the drives', 120, -988, 34, 40, [
        'YAZ: Ninety seconds. Do not let anybody near that desk.',
      ]),
      bolt('Get off the ridge', 130),
      cool('Lose the response', 180),
    ],
    fail: { onDeath: true },
    wantedOnStart: 4, wantedOnEnd: 0,
    debrief: [
      'YAZ: Vance Coastal Holdings suspended trading this morning.',
      'YAZ: Phase One is dead. Cypress Park is still Cypress Park. Rust Row is still a dump, but it is our dump.',
      'TITO: And the money that was paying for it?',
      'YAZ: Is still out there. Still needs washing. And now it needs a new laundry.',
      'REY: Then we had better own the laundry.',
    ],
    music: 'neon-drive',
  }),
];

// ===========================================================================
// ACT IV — PAPER KINGDOM
//
// Having killed the laundry, Rey has to become one. The Aurora Kestrel is a
// casino boat at Marina del Sol with a gaming licence and a hole in the middle
// of its accounts. Special Agent Imani Rowe arrives, and she is the first person
// in four acts who cannot be bought, frightened or driven somewhere.
// ===========================================================================
const ACT_IV = [
  mission({
    id: 'c01-the-float', name: 'The Float', giver: 'Tito Barrow', type: 'story', act: 4,
    tier: 10, requires: ['b12-groundbreaking'], reward: 66000,
    blurb: 'A casino boat needs a cash float before it opens. Ours is going on board first.',
    briefing: [
      'TITO: The Aurora Kestrel. Sixty metres of casino tied to a jetty at Marina del Sol.',
      'TITO: Licensed, inspected, and losing four hundred thousand a year because the man who owns it cannot count.',
      'YAZ: His name is Desmond Ill. Genuinely. Spelled I-L-L. He inherited it and he hates it.',
      'REY: And he will sell?',
      'TITO: He will sell half. The half with the cash room in it. We just have to turn up with a float and look like people who do this.',
    ],
    start: { x: 160, z: -860, marker: '$', radius: 6 },
    objectives: [
      find('Pull the float together from the lock-ups', 5, { radius: 20, x: 620, z: -1010 }),
      drive('Get it to Marina del Sol', 880, -680, 16, [
        'TITO: Do not speed. A man doing forty in a loaded car is a delivery. A man doing ninety is a story.',
      ]),
      at('Take the float on board', 906, -708, 12, [
        'DESMOND: You are the gentlemen from the — sorry, from the?',
        'TITO: From the Foundry.',
        'DESMOND: I do not know what that is.',
        'TITO: You will.',
      ]),
      idle('Sit through the handover', 25, 906, -708, 20),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true },
    debrief: [
      'DESMOND: So I still own the boat.',
      'TITO: You still own the boat.',
      'DESMOND: And you own?',
      'TITO: The room in the middle of the boat where all the money is. Enjoy the boat, Desmond.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'c02-house-edge', name: 'House Edge', giver: 'Yaz Okonkwo', type: 'story', act: 4,
    tier: 10, requires: ['c01-the-float'], reward: 68000,
    blurb: 'Four dealers on the Kestrel are stealing. Find out which, without closing a table.',
    briefing: [
      'YAZ: Somebody on that boat is skimming and it is elegant. Chip fills, not cash.',
      'YAZ: I can see the hole in the numbers, I cannot see the hand doing it.',
      'REY: So I go and watch people play cards.',
      'YAZ: You go and photograph four specific tables at four specific times and I do the part that involves thinking.',
      'YAZ: And Rey — if you spot it, do nothing. Nothing at all. Walk past and buy a drink. We are a business now.',
    ],
    start: { x: 880, z: -680, marker: 'M', radius: 6 },
    objectives: [
      snap('Photograph table four during a chip fill', 900, -696, 14),
      snap('Photograph table nine at the shift change', 912, -704, 14, [
        'YAZ: There. He palms on the cut. It is genuinely lovely work. I am furious.',
      ]),
      snap('Photograph the cage during the count', 906, -712, 14),
      at('Walk off the boat like nothing happened', 880, -680, 14, [
        'REY: He is good.',
        'YAZ: He is excellent. That is why we are going to hire him properly instead of whatever the old owner would have done.',
      ]),
    ],
    fail: { onDeath: true, timeLimit: 420 },
    debrief: [
      'YAZ: His name is Marcus. He has a daughter at the university and eleven thousand dollars of our money.',
      'TITO: And?',
      'YAZ: And he now runs the cage on a salary that means he never has to do that again. Rey suggested it. I think Rey is getting soft.',
      'REY: I am getting cheaper. It is not the same thing.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'c03-marker-calls', name: 'Marker Calls', giver: 'Tito Barrow', type: 'story', act: 4,
    tier: 10, requires: ['c02-house-edge'], reward: 70000,
    blurb: "Six players owe the Kestrel money. Tito wants it collected the boring way.",
    briefing: [
      'TITO: Six markers outstanding. Two hundred and eighty thousand dollars between them.',
      'TITO: We are not breaking any fingers. Fingers are what people who are about to lose a casino do.',
      'TITO: You go, you sit down, you tell them the number, and you leave a card. If they pay, we are a business. If they do not, we find out who is protecting them.',
    ],
    start: { x: 880, z: -680, marker: '$', radius: 6 },
    objectives: [
      at('Call on the one in Vice Sands', 960, 60, 14),
      at('Call on the one in Centro', 340, -140, 14, [
        'REY: Eighty one thousand. There is no version of this where you keep pretending you did not hear me.',
      ]),
      at('Call on the one in Mirador Hills', -940, 60, 14),
      at('Call on the one in Little Habana', 560, 470, 14, [
        'REY: You are the fourth today and the first one who offered me coffee.',
      ]),
      drive('Take the collection back to the boat', 880, -680, 16),
    ],
    fail: { onDeath: true, timeLimit: 720 },
    debrief: [
      'TITO: Four paid. One cried. One told you to speak to a man in the state office.',
      'REY: The state office again.',
      'TITO: It is always the state office, Rey. Eventually everything in this city is one office with a very long corridor.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'c04-agent-rowe', name: 'Agent Rowe', giver: 'Yaz Okonkwo', type: 'story', act: 4,
    tier: 10, requires: ['c03-marker-calls'], reward: 74000,
    blurb: 'Federal financial crimes sent somebody. She has already been on the boat twice.',
    briefing: [
      'YAZ: Special Agent Imani Rowe. Came down from the financial crimes task force to work the Vance file.',
      'YAZ: She has been on the Kestrel twice. Played blackjack. Lost forty dollars. Tipped correctly.',
      'TITO: That is worse than a raid.',
      'YAZ: Much worse. A raid is a decision. This is her reading the room.',
      'REY: Then I want to read her. Where does she work out of?',
    ],
    start: { x: 230, z: 200, marker: '!', radius: 6 },
    objectives: [
      at('Find the task force office in Meridian', 244, 224, 12),
      snap('Photograph the case board through the window', 244, 224, 16, [
        'YAZ: That is Vance. That is Sandoval. That is — Rey, that is the Foundry sign. She has a photograph of Tito sign on a federal case board.',
      ]),
      tail("Follow Rowe's car when she leaves", 300, 160, 18, [
        'ROWE: You have been three cars back since Meridian. If you are going to do this, do it properly and get closer.',
      ]),
      at('Meet her where she stops', 960, 60, 14, [
        'ROWE: Rey Delgado. Sit down. The coffee here is terrible and I want you to suffer through it with me.',
        'ROWE: I am not going to threaten you. I am going to tell you exactly what I am doing, because it will not help you at all.',
        'ROWE: I am going to follow the money until it stops moving. That is the whole plan. It always works and it never works fast.',
      ]),
    ],
    fail: { onDeath: true, onTargetEscaped: true },
    debrief: [
      'REY: She knew I was there before I did.',
      'TITO: What did she want?',
      'REY: To be understood. I think she is lonely, Tito. I think that is the most dangerous thing about her.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'c05-the-wire', name: 'The Wire', giver: 'Yaz Okonkwo', type: 'story', act: 4,
    tier: 10, requires: ['c04-agent-rowe'], reward: 76000,
    blurb: 'There is a listening device on the Kestrel. Find it without letting whoever is listening know.',
    briefing: [
      'YAZ: There is a transmitter on that boat. I can hear it from Rust Row on a clear night, which is embarrassing for everybody.',
      'YAZ: If we rip it out, they know we found it. If we leave it, they hear everything.',
      'YAZ: So we find it, and then we start saying interesting and completely untrue things near it.',
      'REY: We feed it.',
      'YAZ: We feed it beautifully.',
    ],
    start: { x: 880, z: -680, marker: '!', radius: 6 },
    objectives: [
      find('Sweep the boat for the device', 4, { radius: 18, x: 900, z: -700, say: [
        'YAZ: Walk slow. When the tone in your ear goes flat, stop and look up.',
      ] }),
      at('Find where the feed goes', 946, -672, 12),
      sweep('Deal with the listening post', 946, -672, 5, 35, [
        'REY: They are not federal. Federal do not use a rented van with a beach towel over the window.',
      ]),
      find('Take their tapes', 3, { radius: 12, x: 946, z: -672 }),
    ],
    fail: { onDeath: true },
    debrief: [
      'YAZ: Private contractors. Billing a company that bills a company that bills the Sandoval fishing cooperative.',
      'TITO: Elena is listening to us.',
      'YAZ: Elena has been listening to us since the freezer, Tito. I think she considers it affection.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'c06-tito', name: 'Tito', giver: 'Yaz Okonkwo', type: 'story', act: 4,
    tier: 10, requires: ['c05-the-wire'], reward: 80000,
    blurb: 'Somebody shot Tito outside the church hall in Little Habana.',
    briefing: [
      'YAZ: Rey. Rey, pick up. It is Tito. Outside the hall. Two men on a bike.',
      'YAZ: He is alive. He is alive, he is talking, he is complaining about the ambulance, so he is definitely alive.',
      'YAZ: The bike went north. I have it on three cameras and I will have it on four in about ninety seconds.',
      'REY: Give me the road.',
      'YAZ: Go. Go now. I will talk you through it.',
    ],
    start: { x: 560, z: 470, marker: '!', radius: 6 },
    objectives: [
      tail('Run down the bike', 480, 340, 14, [
        'YAZ: North on the boulevard. He is filtering. Do not try to match him, cut the corner.',
      ]),
      wreck('Put them off the road', 1),
      hit('Finish it', 2, { say: [
        'REY: Who paid you.',
        'REY: Wrong answer.',
      ] }),
      bolt('Get away from it', 100),
      at('Get to the hospital', 430, 900, 16, [
        'TITO: Do not make that face. I have been shot before. Nineteen eighty eight, a man called Ruben, entirely my fault.',
        'REY: Who was it, Tito.',
        'TITO: It does not matter who held the gun.',
        'REY: It matters to me.',
        'TITO: I know. That is what worries me about you.',
      ]),
    ],
    fail: { onDeath: true, onTargetEscaped: true, timeLimit: 420 },
    debrief: [
      'YAZ: They were paid out of an account that Marcus in the cage recognised.',
      'YAZ: It is one of ours, Rey. Somebody paid to shoot Tito with money from our own boat.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'c07-chip-run', name: 'Chip Run', giver: 'Rey Delgado', type: 'story', act: 4,
    tier: 10, requires: ['c06-tito'], reward: 84000,
    blurb: 'Somebody on the inside is moving money out in chips. Follow the chips.',
    briefing: [
      'REY: Somebody on our own boat paid two men to shoot a sixty one year old.',
      'YAZ: The account moves in high denomination chips. Chips go off the boat, chips come back as cash, cash goes somewhere we cannot see.',
      'REY: Then we watch a chip all the way from the cage to wherever it sleeps.',
      'YAZ: That is going to take you across four districts and most of the night.',
      'REY: Good. I am not sleeping anyway.',
    ],
    start: { x: 880, z: -680, marker: '!', radius: 6 },
    objectives: [
      tail('Follow the courier off the marina', 850, -640, 18),
      snap('Photograph the first handover in Ocean Mile', 820, -320, 16),
      tail('Stay with the second courier', 700, -200, 18, [
        'YAZ: He is checking mirrors properly. Somebody trained him.',
      ]),
      snap('Photograph where the cash comes out', 340, -140, 16),
      at('Follow it to the end of the line', 230, 200, 14, [
        'REY: Meridian. It ends in Meridian, in an office building, at two in the morning.',
        'YAZ: Rey, that is the state office.',
      ]),
    ],
    fail: { onDeath: true, onTargetEscaped: true, timeLimit: 600 },
    debrief: [
      'REY: The money that paid for Tito went into a state government office.',
      'YAZ: Which means it did not come from Elena. Elena has never needed a government office in her life.',
      'REY: Then who is left?',
      'YAZ: The man who lost everything eleven days ago and still has a phone.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'c08-the-comptroller', name: 'The Comptroller', giver: 'Yaz Okonkwo', type: 'story', act: 4,
    tier: 10, requires: ['c07-chip-run'], reward: 88000,
    blurb: 'The state office has a comptroller who signs things at three in the morning.',
    briefing: [
      'YAZ: His name is Walter Sedge. Forty years in the state office. Signs every discretionary fund in the county.',
      'YAZ: He signed the Vance variations. He signs the port grants. He signed a consultancy payment nine days ago for exactly the amount those two men on the bike were paid.',
      'REY: So he is the corridor.',
      'YAZ: He is the whole building. And on Thursday nights he works late alone, because his wife died in March and he has nowhere to be.',
      'REY: ...Say the last part again.',
      'YAZ: I know. I did not enjoy finding that out either.',
    ],
    start: { x: 230, z: 200, marker: '!', radius: 6 },
    objectives: [
      at('Get into the state office after hours', 208, 232, 12),
      idle('Wait for Sedge to come back from the machine', 30, 208, 232, 18, [
        'SEDGE: Oh. Oh, you are not cleaning.',
        'REY: No.',
        'SEDGE: Right. Well. Would you like a coffee? The machine is terrible but it is free after nine.',
      ]),
      find('Take the discretionary fund files', 5, { radius: 14, x: 208, z: 232, say: [
        'SEDGE: Take the blue ones as well. Nobody ever takes the blue ones and the blue ones are where it actually is.',
        'REY: Why are you helping me?',
        'SEDGE: Because I am seventy one and I would quite like to stop.',
      ] }),
      bolt('Get out before the night sweep', 90),
    ],
    fail: { onDeath: true },
    debrief: [
      'SEDGE: The man you want gave me a number and I made it legal. That is the entire job. That was always the entire job.',
      'SEDGE: His name is Ruiz. He has no badge and a great deal of authority, which it turns out are not connected at all.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'c09-ruiz-talks', name: 'Ruiz Talks', giver: 'Special Agent Rowe', type: 'story', act: 4,
    tier: 10, requires: ['c08-the-comptroller'], reward: 90000,
    blurb: 'Rowe offers a trade. She wants Ruiz too, and she is prepared to say so out loud.',
    briefing: [
      'ROWE: I am going to say something that will get me fired if you record it, so please do not.',
      'ROWE: Julian Ruiz has been running a private intelligence operation out of a public salary for four years. Suspension did not stop it, it funded it.',
      'ROWE: I cannot touch him. Every file I open on him closes upstairs.',
      'REY: So you want me to do it.',
      'ROWE: I want you to bring me something I can put in front of a judge. I am not offering you immunity, Mister Delgado. I am offering you the order in which I get to people.',
      'REY: That is a terrible offer.',
      'ROWE: It is an honest one. I do not have any other kind.',
    ],
    start: { x: 960, z: 60, marker: 'M', radius: 6 },
    objectives: [
      at('Find the lock-up Ruiz uses in Foundry Flats', 186, -892, 12, [
        'YAZ: Unit fourteen. He pays for it in cash through a storage company that does not exist.',
      ]),
      sweep('Get past whoever he left watching it', 186, -892, 6, 35),
      find('Take the operation files', 5, { radius: 14, x: 186, z: -892 }),
      drive('Get them to Rowe', 960, 60, 16, [
        'RUIZ: Delgado. You have something of mine.',
        'REY: You shot Tito Barrow.',
        'RUIZ: I paid an invoice. Try to keep the accounting straight, it matters at trial.',
      ]),
      cool('Lose the cars he put on you', 150),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2, wantedOnEnd: 0,
    debrief: [
      'ROWE: This is enough for a warrant.',
      'REY: Then get one.',
      'ROWE: It will take nine weeks. And Mister Delgado — when this is over, I am coming for your boat.',
      'REY: I know.',
      'ROWE: I wanted to hear you say it. Now neither of us can pretend.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'c10-deposit-box', name: 'Deposit Box', giver: 'Tito Barrow', type: 'story', act: 4,
    tier: 10, requires: ['c09-ruiz-talks'], reward: 94000,
    blurb: 'Mona left a safe deposit box. The bank is about to hand it to the state.',
    briefing: [
      'TITO: I can walk. I walked to the shop and back and it only took forty minutes, which the doctor says is not a victory.',
      'TITO: Listen. A letter came to the Foundry address, forwarded four times. A dormancy notice.',
      'TITO: Mona kept a box at a bank in Meridian. Fifteen months untouched. In eleven days it goes to the state.',
      'REY: What is in it?',
      'TITO: The rest of the book, if there is a God. Her actual life, if there is not.',
    ],
    start: { x: 230, z: 200, marker: '$', radius: 6 },
    objectives: [
      at('Get into the bank vault floor', 238, 218, 12),
      till("Open Mona's box", 238, 218, 13, [
        'YAZ: Box four one one. You have about three minutes before the floor supervisor comes back from lunch and she is extremely punctual.',
      ]),
      find('Take everything in it', 4, { radius: 12, x: 238, z: 218 }),
      bolt('Get out of Meridian', 100),
      cool('Lose the response', 150),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2, wantedOnEnd: 0,
    debrief: [
      'TITO: Passports. Three of them. Different names, same face.',
      'TITO: Forty thousand in cash. A photograph of the Foundry from nineteen ninety.',
      'TITO: And a letter addressed to you. Dated four days after the plane.',
      'REY: ...She knew I would stay.',
      'TITO: Rey. She knew you would look for the box.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'c11-the-aurora-kestrel', name: 'The Aurora Kestrel', giver: 'Rey Delgado', type: 'heist', act: 4,
    tier: 10, requires: ['c10-deposit-box'], reward: 220000,
    blurb: 'Ruiz is going to raid our own boat using a warrant he has no right to. Empty it first.',
    briefing: [
      'YAZ: Ruiz has a warrant. It is not a real warrant but it has a real signature on it, and by the time a judge sorts that out it will be nine months and everything on that boat will be in an evidence locker.',
      'REY: When?',
      'YAZ: Dawn.',
      'TITO: Then we take our own casino apart tonight and leave him sixty metres of carpet.',
      'REY: Cage, count room, the safes under the bar, the book of markers, and Marcus and his daughter on a plane by four.',
      'YAZ: That is eleven hours of work.',
      'REY: Then stop talking to me.',
    ],
    start: { x: 880, z: -680, marker: '$', radius: 6 },
    objectives: [
      at('Get on board the Kestrel', 900, -700, 12, [
        'DESMOND: Are we being robbed? We are being robbed. Is this a robbery?',
        'TITO: Desmond, go and stand on the jetty and look sad. It will help.',
      ]),
      till('Empty the cage', 900, -700, 14),
      find('Clear the count room and the bar safes', 7, { radius: 20, x: 900, z: -700 }),
      drive('Move the first load off the marina', 560, 470, 18),
      drive('Move the second load to the port lock-up', 620, -1010, 18, [
        'YAZ: Ruiz just moved his people up. You have maybe forty minutes.',
      ]),
      sweep('Hold the jetty while the last load goes', 906, -708, 8, 45, [
        'RUIZ: You are stealing a casino from yourself. That is a new one, even here.',
        'REY: Come down the gangway and say it closer.',
      ]),
      bolt('Be gone before dawn', 140),
      cool('Lose every unit in the marina', 200),
    ],
    fail: { onDeath: true, timeLimit: 900 },
    wantedOnStart: 3, wantedOnEnd: 0,
    debrief: [
      'YAZ: He served the warrant at six. On an empty boat. With three news cameras there, because he had invited them.',
      'TITO: How much did we take off it?',
      'YAZ: One point four million and a man named Marcus who is currently in a different time zone with his daughter.',
      'REY: And Ruiz is on the television standing in an empty casino.',
      'TITO: He will not survive that. Not in this city. Being wrong is fine here. Being funny is fatal.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'c12-paper-kingdom', name: 'Paper Kingdom', giver: 'Rey Delgado', type: 'story', act: 4,
    tier: 10, requires: ['c11-the-aurora-kestrel'], reward: 110000,
    blurb: 'Ruiz has nothing left to lose and a list of everybody Rey loves.',
    briefing: [
      'YAZ: He has burned the storage unit. He has burned the car. He is not running, Rey, he is clearing his desk.',
      'YAZ: And an hour ago he pulled three addresses off the state system. The church hall. My trailer. The hospital.',
      'TITO: He is going after the people, not the money.',
      'REY: Then we get to them first and we end this tonight.',
    ],
    start: { x: 560, z: 470, marker: '!', radius: 6 },
    objectives: [
      at('Get to the church hall first', 578, 494, 12),
      sweep('Clear the men he sent to the hall', 578, 494, 6, 40, [
        'AMARO: I am fine. I hit one of them with a candle stand. I am not proud of it and I would do it again.',
      ]),
      drive('Get across to the trailer', -1050, -820, 18, [
        'YAZ: They are outside. They are outside right now, I can see the wheel arch through the blind.',
      ]),
      sweep('Clear Rust Row', -1050, -820, 7, 45),
      drive('Get to the hospital', 430, 900, 18),
      guard('Get Tito out of the building', 140, [
        'TITO: I am in a gown, Rey.',
        'REY: I know.',
        'TITO: I want it on the record that I am fleeing a gunfight in a gown.',
      ]),
      cool('Lose everything following you', 180),
    ],
    fail: { onDeath: true, timeLimit: 900 },
    wantedOnStart: 3, wantedOnEnd: 0,
    debrief: [
      'ROWE: Eleven people in custody. None of them Ruiz.',
      'ROWE: He has gone somewhere I cannot follow with paperwork, Mister Delgado, which I suspect means somewhere you can.',
      'REY: Where.',
      'ROWE: Elena Sandoval took him in this morning. He has spent four years chasing her and today he is her guest.',
      'REY: Then the war starts at the water.',
    ],
    music: 'iron-lung',
  }),
];

// ===========================================================================
// ACT V — THE LONG TIDE
//
// Elena Sandoval takes Ruiz in, because a man who knows every policeman in the
// county is worth more than a man who was one. Then the weather turns, the
// causeway floods, and Mona Castellanos comes back with a suitcase and a
// proposal that is, as always, extremely reasonable and completely poisoned.
// ===========================================================================
const ACT_V = [
  mission({
    id: 'd01-return-flight', name: 'Return Flight', giver: 'Mona Castellanos', type: 'story', act: 5,
    tier: 11, requires: ['c12-paper-kingdom'], reward: 96000,
    blurb: 'Fifteen months and one letter later, Mona lands at Leonida International.',
    briefing: [
      'MONA: Arrivals. Terminal two. Do not bring Tito, he will make a scene and he is entitled to.',
      'REY: You left him on a runway.',
      'MONA: I left him alive on a runway, which at the time was the premium option.',
      'MONA: Come and get me, Rey. I have been reading about you from a long way away and I would like to see whether the newspapers are exaggerating.',
    ],
    start: { x: -517, z: -1086, marker: 'M', radius: 6 },
    objectives: [
      at('Meet Mona at arrivals', -446, -1116, 12, [
        'MONA: You are heavier. That is not an insult, it means you eat now.',
        'REY: You have a suitcase.',
        'MONA: I have four. Three of them are yours, in the sense that you paid for what is in them.',
      ]),
      guard('Get her out of the terminal', 120, [
        'MONA: Do not look now, but the two men by the hire car desk have been standing for eleven minutes.',
        'REY: Sandoval?',
        'MONA: Sandoval. She knew my flight before I did. That is the whole problem with Elena, she reads everything.',
      ]),
      drive('Take her into the city', 560, 470, 18),
      cool('Lose the tail', 140),
    ],
    fail: { onDeath: true },
    debrief: [
      'MONA: So. A church hall.',
      'TITO: The Foundry is a car park.',
      'MONA: I know. I read it in an actual newspaper, in a country where nobody had heard of us, and I cried in a hotel bar like a lunatic.',
      'TITO: Fifteen months, Mona.',
      'MONA: I am not going to apologise. I am going to be useful, which you will find far more annoying.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'd02-red-tide', name: 'Red Tide', giver: 'Elena Sandoval', type: 'story', act: 5,
    tier: 11, requires: ['d01-return-flight'], reward: 100000,
    blurb: 'Elena calls a meeting at the port. She is not asking whether Rey will come.',
    briefing: [
      'ELENA: You have taken a freezer, a casino, a developer and a comptroller from this city in under two years.',
      'ELENA: I have watched all of it with something close to delight.',
      'ELENA: Now Julian Ruiz is sitting in my office drinking my coffee and telling me your shoe size, and I have to decide what you are.',
      'ELENA: Come to the port. Nobody will touch you on the way in. I make no promise about the way out.',
    ],
    start: { x: 620, z: -1010, marker: '!', radius: 6 },
    objectives: [
      at('Go to the meeting at Port Esperanza', 646, -1036, 12, [
        'ELENA: Sit. Julian, stand somewhere else, you are looming.',
        'RUIZ: I am not looming.',
        'ELENA: You are always looming. It is your one real talent.',
        'ELENA: Here is my offer, Rey. The cold chain is mine. The paper is yours. We never touch each other again and we both die old.',
      ]),
      idle('Hear the offer out', 26, 646, -1036, 20, [
        'REY: And Ruiz?',
        'ELENA: Julian stays with me. He is insurance.',
        'REY: He shot Tito Barrow.',
        'ELENA: He paid an invoice, which I understand is a distinction you have already refused once.',
      ]),
      sweep('Fight your way off the dock', 646, -1036, 9, 50, [
        'ELENA: That is a shame. That is a genuine shame, Rey, I liked you.',
      ]),
      bolt('Get out of the port', 130),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2,
    debrief: [
      'MONA: You said no to Elena Sandoval on her own dock.',
      'REY: I did.',
      'MONA: Then we have about six days before this becomes the worst week of our lives. I suggest we spend them well.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'd03-the-list', name: 'The List', giver: 'Mona Castellanos', type: 'story', act: 5,
    tier: 11, requires: ['d02-red-tide'], reward: 104000,
    blurb: 'Mona wants the other half of her book back. It has been sitting in a bad place for fifteen months.',
    briefing: [
      'MONA: The pages after M. Somebody tore them out of my flat while I was over the Atlantic.',
      'MONA: I know who. I have known for a year. I have simply been on the wrong continent to be annoyed about it properly.',
      'MONA: They are in a house in South Glades belonging to a man who used to drive for the Marlins and now sells conservatories.',
      'REY: Conservatories.',
      'MONA: Everyone in this story has a second act, Rey. Most of them are worse.',
    ],
    start: { x: -120, z: 660, marker: '$', radius: 6 },
    objectives: [
      at('Get to the house in South Glades', -142, 688, 12),
      find('Find the missing pages', 4, { radius: 14, x: -142, z: 688, say: [
        'MONA: Check the loft. Men like him always use the loft and are always very pleased with themselves about it.',
      ] }),
      sweep('Deal with the welcoming committee', -142, 688, 6, 40),
      drive('Get the book back to Mona', 560, 470, 16),
    ],
    fail: { onDeath: true },
    debrief: [
      'MONA: Complete. For the first time since the plane.',
      'MONA: Nine hundred and four names, Rey. Every favour anybody in this county owes anybody else.',
      'TITO: And what do you intend to do with it?',
      'MONA: Call all of them. On the same day. And see what falls over.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'd04-nine-names', name: 'Nine Names', giver: 'Mona Castellanos', type: 'story', act: 5,
    tier: 11, requires: ['d03-the-list'], reward: 108000,
    blurb: 'Nine people in the book owe enough to matter. Go and call in all nine in one day.',
    briefing: [
      'MONA: Nine names. One day. Every one of them owes something that predates Elena Sandoval owning the water.',
      'MONA: A harbourmaster. Two customs officers. A dispatcher. A judge who is going to pretend not to know me.',
      'MONA: You do not threaten them. You remind them. There is an enormous difference and the difference is the whole business.',
    ],
    start: { x: 560, z: 470, marker: '$', radius: 6 },
    objectives: [
      at('The harbourmaster at Port Esperanza', 620, -1010, 14),
      at('The customs shed at the airport', -517, -1086, 14, [
        'REY: Mona Castellanos says hello.',
        'REY: You have gone a very strange colour.',
      ]),
      at('The dispatcher in Foundry Flats', 160, -860, 14),
      at('The judge in Mirador Hills', -940, 60, 14, [
        'REY: She said to tell you it was nineteen ninety six, and that you would remember the rest.',
      ]),
      at('The last four in Little Habana', 560, 470, 16),
    ],
    fail: { onDeath: true, timeLimit: 840 },
    debrief: [
      'MONA: By Thursday, Elena Sandoval will not be able to land a boat, clear a container, or get a warrant signed in this county.',
      'TITO: And by Friday?',
      'MONA: By Friday she will be very, very angry. I did say we should spend the six days well.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'd05-storm-warning', name: 'Storm Warning', giver: 'Yaz Okonkwo', type: 'story', act: 5,
    tier: 11, requires: ['d04-nine-names'], reward: 112000,
    blurb: 'A category three is coming up the coast and Elena is going to move everything under cover of it.',
    briefing: [
      'YAZ: Landfall in about nine hours. Everybody in Leonida is boarding up windows.',
      'YAZ: Everybody except sixteen refrigerated trucks that just left Port Esperanza heading inland.',
      'MONA: She is emptying the cold chain before the surge. Every gram she owns is on a road right now.',
      'REY: Then every gram she owns is outside for the first time in two years.',
      'MONA: I knew you would enjoy this part.',
    ],
    start: { x: 620, z: -1010, marker: '!', radius: 6 },
    objectives: [
      tail('Catch the convoy on the port road', 540, -940, 20, [
        'YAZ: Rain is coming in sideways. Watch the standing water on the causeway, it will take the front end straight off you.',
      ]),
      wreck('Break the convoy up', 4),
      lift('Take one of the trucks', 400, -880, 26),
      drive('Run it inland before the surge closes the road', -720, -560, 18, [
        'YAZ: Bridge is closing in four minutes. Four. Rey, they close it with or without you on it.',
      ]),
    ],
    fail: { onDeath: true, timeLimit: 600 },
    wantedOnStart: 2,
    debrief: [
      'MONA: One truck out of sixteen.',
      'REY: The storm got the other fifteen. The road went under at eleven.',
      'MONA: So the weather took more from Elena Sandoval in an evening than we managed in a year. I find that unbearable.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'd06-water-rising', name: 'Water Rising', giver: 'Father Amaro', type: 'story', act: 5,
    tier: 11, requires: ['d05-storm-warning'], reward: 116000,
    blurb: 'Saint Mercy is under a metre of water and the shelter buses never came.',
    briefing: [
      'AMARO: The hall is flooded. The new roof held and the floor did not, which is the funniest thing God has done to me yet.',
      'AMARO: There are forty people in the upstairs room and the county buses have been redirected to Vice Sands, because of course they have.',
      'AMARO: I am not going to pretend this is your kind of work, Rey.',
      'REY: Where do they need to be?',
      'AMARO: South Glades. High ground, dry hall, a woman called Rosa with two hundred sandwiches and no patience.',
    ],
    start: { x: 430, z: 900, marker: 'M', radius: 6 },
    objectives: [
      at('Get to Saint Mercy through the flooding', 452, 924, 14),
      guard('Get the first group out of the hall', 130, [
        'AMARO: Slowly. Slowly. Half of them cannot swim and all of them are proud.',
      ]),
      drive('Take them to the shelter in South Glades', -120, 660, 20),
      drive('Go back for the rest', 430, 900, 20, [
        'YAZ: Water is over the axles on the boulevard. Take the ridge road, it adds four minutes and subtracts drowning.',
      ]),
      guard('Bring out the last of them', 130),
      drive('Get everyone to high ground', -120, 660, 20),
    ],
    fail: { onDeath: true, timeLimit: 900 },
    debrief: [
      'AMARO: Forty one. Rosa counted twice and shouted at me both times.',
      'AMARO: You did not ask what was in it for you. I noticed. I notice everything, it is the only useful part of the job.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'd07-the-glades', name: 'The Glades', giver: 'Mona Castellanos', type: 'story', act: 5,
    tier: 11, requires: ['d06-water-rising'], reward: 120000,
    blurb: "Elena's people are moving the salvaged product through the flooded south while the roads are empty.",
    briefing: [
      'MONA: The storm has given her one gift: nobody is looking at anything.',
      'MONA: Whatever she pulled out of the water is going south through the Glades on back roads in unmarked vans.',
      'MONA: If it gets to the state line, she rebuilds in a month. If it does not, she is finished this year.',
      'REY: How many vans?',
      'MONA: Enough that I would like you to take somebody with you, and I know you will not.',
    ],
    start: { x: -120, z: 660, marker: '!', radius: 6 },
    objectives: [
      at('Get ahead of them on the Glades road', -180, 760, 16),
      hold('Hold the junction until they commit', 90, -180, 760, 45, [
        'YAZ: Three vans and a chase car. They have seen you. They are not stopping.',
      ]),
      wreck('Stop the vans', 3),
      find('Take what they were carrying', 5, { radius: 20, x: -180, z: 760 }),
      bolt('Get off the Glades road', 120),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2,
    debrief: [
      'MONA: That was the last of it.',
      'TITO: Then it is over?',
      'MONA: No. Now it is personal, and personal is the only kind of war Elena has never fought. She is going to be terrible at it.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'd08-elenas-daughter', name: "Elena's Daughter", giver: 'Elena Sandoval', type: 'story', act: 5,
    tier: 11, requires: ['d07-the-glades'], reward: 124000,
    blurb: 'Somebody has taken Elena Sandoval\'s daughter, and Elena has called the one person in Leonida who did not do it.',
    briefing: [
      'ELENA: I am going to speak and you are going to let me finish.',
      'ELENA: My daughter is nineteen. She studies marine biology at the university and she has never met anybody I work with.',
      'ELENA: She was taken from a car park at six this morning by men who used my own protocol to do it.',
      'REY: Ruiz.',
      'ELENA: Julian has been in my house for three weeks learning how I move people. Yes. Ruiz.',
      'ELENA: I have two hundred men and I cannot use one of them, because every one of them might be his. So I am calling the man who said no to me on my own dock.',
      'REY: Where.',
      'ELENA: Thank you.',
    ],
    start: { x: 620, z: -1010, marker: '!', radius: 6 },
    objectives: [
      at('Find the car they used, in Vice Sands', 960, 60, 14),
      find('Work out where they went', 3, { radius: 14, x: 960, z: 60, say: [
        'YAZ: Parking stub. Fuel receipt. And a wrapper from a place that only exists in Rust Row. She is in Rust Row, Rey.',
      ] }),
      at('Get to Rust Row', -1050, -820, 16),
      sweep('Clear the building', -1050, -820, 8, 45, [
        'RUIZ: You are early. I had a whole speech.',
        'REY: Say it to her mother.',
      ]),
      guard('Get her out', 120, [
        'CAMILA: Are you one of my mother people?',
        'REY: No.',
        'CAMILA: Good. Then drive faster.',
      ]),
      drive('Take her to the port', 620, -1010, 20),
    ],
    fail: { onDeath: true, timeLimit: 780 },
    debrief: [
      'ELENA: You could have traded her.',
      'REY: Yes.',
      'ELENA: Julian would have. Mona would have, and she would have been charming about it.',
      'ELENA: I am not going to thank you. I am going to do something far more expensive: I am going to owe you.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'd09-cut-the-power', name: 'Cut the Power', giver: 'Yaz Okonkwo', type: 'story', act: 5,
    tier: 11, requires: ['d08-elenas-daughter'], reward: 128000,
    blurb: "Ruiz is running the whole city's camera network from a substation. Take it off him.",
    briefing: [
      'YAZ: He has the traffic network. All of it. Every junction camera, every plate reader, the lot.',
      'YAZ: He is running it out of a substation compound in Foundry Flats on a maintenance contract that a dead comptroller signed.',
      'YAZ: While he has that, he sees us and we do not see him. So we blind him.',
      'REY: For how long?',
      'YAZ: Four days if we are clever. About forty minutes if we are us.',
    ],
    start: { x: 160, z: -860, marker: '!', radius: 6 },
    objectives: [
      at('Get into the substation compound', 194, -896, 12),
      sweep('Clear the contractors', 194, -896, 7, 40),
      find('Pull the network hardware', 4, { radius: 14, x: 194, z: -896, say: [
        'YAZ: The racks in the middle. Not the ones on the wall, those are the actual electricity and I would like you to survive.',
      ] }),
      wreck('Take out the relay masts', 2),
      bolt('Get clear before the utility crews arrive', 110),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2,
    debrief: [
      'YAZ: Camera network down across nine districts. The city thinks it is storm damage.',
      'YAZ: And I have four days of his own traffic logs, which show a very interesting car going to a very interesting address every Wednesday.',
      'REY: Where.',
      'YAZ: Where do you think, Rey. The ridge. Vance house has been empty for a year and somebody has been paying the electricity.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'd10-monas-angle', name: "Mona's Angle", giver: 'Tito Barrow', type: 'story', act: 5,
    tier: 11, requires: ['d09-cut-the-power'], reward: 132000,
    blurb: 'Tito has been watching Mona work and he does not like the shape of it.',
    briefing: [
      'TITO: I am going to say something and you are going to be angry with me.',
      'TITO: She called nine names in one day and every one of them made Elena weaker and none of them made us stronger.',
      'TITO: And two of those names have since been to see a lawyer about a company that is not ours.',
      'REY: You think she is building something on the side.',
      'TITO: I think she came back with four suitcases and a plan, and I think we are in the plan, and I do not think we are the good part.',
      'TITO: Go and look. If I am wrong I will say so in front of Yaz, which you know costs me more than money.',
    ],
    start: { x: 560, z: 470, marker: '$', radius: 6 },
    objectives: [
      tail('Follow Mona when she leaves the hall', 500, 380, 18, [
        'YAZ: She is driving like somebody who checks mirrors. She has always driven like that. It proves nothing.',
      ]),
      snap('Photograph who she meets', 230, 200, 16, [
        'REY: That is a bank. That is a lawyer, a bank officer, and a man I have never seen.',
        'YAZ: I have. That is a Sandoval accountant. That is one of the two on the Vance list.',
      ]),
      idle('Stay on it', 24, 230, 200, 20),
      at('Confront her', 560, 470, 14, [
        'MONA: You followed me.',
        'REY: Yes.',
        'MONA: Good. I was starting to worry you had gone soft.',
        'MONA: I am buying the cold chain, Rey. Elena is finished, somebody is going to own that infrastructure by March, and I would rather it was a person who has met you.',
        'REY: Without telling us.',
        'MONA: With telling you, eventually, at the moment where you could not say no. I have never pretended to be a nice woman. I have only ever promised to be on your side, and I am, at a price.',
      ]),
    ],
    fail: { onDeath: true, onTargetEscaped: true, timeLimit: 600 },
    debrief: [
      'TITO: Well?',
      'REY: You were right.',
      'TITO: I take no pleasure in that.',
      'REY: You take some.',
      'TITO: I take a little. I am not a saint, I am a man in a church hall.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'd11-the-salt-vault', name: 'The Salt Vault', giver: 'Mona Castellanos', type: 'heist', act: 5,
    tier: 11, requires: ['d10-monas-angle'], reward: 350000,
    blurb: "Everything Elena has left is in a hardened store under the salt works. So is the money to buy it.",
    briefing: [
      'MONA: Under the old salt works at the port there is a room the Sandovals have used since before Elena was born.',
      'MONA: Concrete, one door, no windows, and eleven million dollars of other people money.',
      'REY: Elena owes me.',
      'MONA: Elena owes you her daughter, which she will honour, and eleven million dollars, which she will not.',
      'TITO: And if we take it?',
      'MONA: Then there is nothing left to fight over, and every man with a gun in this city goes home, and that is the closest thing to peace anybody has offered Leonida in forty years.',
      'YAZ: That was genuinely persuasive and I hate that.',
    ],
    start: { x: 620, z: -1010, marker: '$', radius: 6 },
    objectives: [
      at('Get down to the salt works', 682, -1048, 12, [
        'YAZ: Two men on the gate, four inside, and a camera I cannot reach because somebody took the network off Ruiz and it was me.',
      ]),
      sweep('Clear the works', 682, -1048, 9, 45),
      till('Cut the vault door', 682, -1048, 14, [
        'TITO: Eleven minutes on the thermite if the hinges are what I think they are. Do not stand where I told you not to stand.',
      ]),
      find('Load everything', 8, { radius: 22, x: 682, z: -1048 }),
      hold('Hold the yard while the second truck loads', 120, 682, -1048, 45, [
        'ELENA: Rey. Rey, listen to me. Whatever she has told you about March, ask her who signs.',
      ]),
      drive('Run it out of the port', 560, 470, 18),
      cool('Lose everything behind you', 200),
    ],
    fail: { onDeath: true },
    wantedOnStart: 4, wantedOnEnd: 0,
    debrief: [
      'YAZ: Eleven point four million.',
      'TITO: And where is it?',
      'MONA: In an account.',
      'TITO: Whose account, Mona.',
      'MONA: ...A holding company. Registered Tuesday. I am the sole signatory, because a company with four signatories is a company that cannot move by Friday.',
      'REY: Get out.',
      'MONA: Rey —',
      'REY: Out.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'd12-the-long-tide', name: 'The Long Tide', giver: 'Elena Sandoval', type: 'story', act: 5,
    tier: 11, requires: ['d11-the-salt-vault'], reward: 150000,
    blurb: 'Elena calls one last time. Not to fight. To tell Rey what he has actually been building.',
    briefing: [
      'ELENA: Do not come armed. I could not care less if you do, I am simply telling you it is unnecessary.',
      'ELENA: I am at the marina. I am selling boats. Actual boats, to actual dentists.',
      'ELENA: Come and let an old woman explain what has been done to you, and then you can go and do something about it or not.',
    ],
    start: { x: 880, z: -680, marker: 'M', radius: 6 },
    objectives: [
      at('Meet Elena at the marina', 906, -708, 12, [
        'ELENA: Sit. Look at the water. It does this for about forty minutes a day and then it is grey again.',
        'ELENA: Fifteen months ago Mona Castellanos got on a plane one hour before a raid that only four people knew about.',
        'REY: You are saying she gave up the Foundry.',
        'ELENA: I am saying she gave up Tito Barrow, to Julian Ruiz, for a seat. And then she spent a year abroad building the company that now owns everything you took from me.',
      ]),
      idle('Let her finish', 28, 906, -708, 22, [
        'ELENA: I am not doing this to hurt her. I am doing it because in about six days she will need one more thing to be signed, and the last signature she needs is Tito.',
        'ELENA: Not yours, Rey. Tito. He is the only one of you old enough to be on the original lease.',
        'ELENA: Whatever happens after that, he does not need to be alive for.',
      ]),
      guard('Get Elena clear when the cars arrive', 140, [
        'YAZ: Rey, four cars just came off the coast road and none of them belong to dentists.',
        'ELENA: Julian. He has been waiting for me to talk to you for a fortnight.',
      ]),
      sweep('Break the ambush on the jetty', 906, -708, 9, 50),
      drive('Get her out of Marina del Sol', 560, 470, 18),
    ],
    fail: { onDeath: true },
    wantedOnStart: 2,
    debrief: [
      'ELENA: Do not come to my funeral, it will be enormous and full of liars.',
      'ELENA: And Rey — the old man. Whatever else you do this week. The old man.',
      'REY: I know.',
      'ELENA: Good. Then I have finally taught somebody in this city something useful.',
    ],
    music: 'iron-lung',
  }),
];

// ===========================================================================
// ACT VI — LEONIDA
//
// Everything narrows. Rowe has her warrant, Ruiz has nothing left, Mona needs
// one signature, and Tito Barrow is the only man in Leonida old enough to be on
// the original lease. Eight missions, and then the causeway.
// ===========================================================================
const ACT_VI = [
  mission({
    id: 'e01-everything-on-the-table', name: 'Everything on the Table', giver: 'Tito Barrow', type: 'story', act: 6,
    tier: 12, requires: ['d12-the-long-tide'], reward: 160000,
    blurb: 'Rey tells Tito what Elena said. Tito tells Rey what he already knew.',
    briefing: [
      'TITO: Sit down. No, in the chair, you loom worse than Ruiz.',
      'REY: Elena says Mona traded you for the seat on that plane.',
      'TITO: I know.',
      'REY: You know.',
      'TITO: I have known for eleven months. A man in the county lock-up told me in exchange for cigarettes.',
      'REY: And you said nothing.',
      'TITO: Because you needed somebody in this city to be on your side, and if I had taken her away from you in that first year you would not have survived it. So I carried it. That is what old men are for.',
    ],
    start: { x: 560, z: 470, marker: 'M', radius: 6 },
    objectives: [
      at('Go and get the original lease from the lock-up', 620, -1010, 14, [
        'TITO: Grey tube, behind the press. It has been in a grey tube since nineteen ninety two.',
      ]),
      find('Find the lease documents', 4, { radius: 16, x: 620, z: -1010 }),
      sweep('Deal with the men Mona sent for the same thing', 620, -1010, 7, 40, [
        'YAZ: Rey. The car outside the lock-up is one of ours. It is literally one of ours, I bought it.',
      ]),
      drive('Get the lease somewhere she cannot reach it', 430, 900, 18, [
        'AMARO: You want me to put it in the church safe.',
        'REY: I want you to put it somewhere a woman with nine hundred names cannot reach.',
        'AMARO: Then the safe is no good. Give it to Rosa. Nobody has ever got anything past Rosa.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'TITO: So now she cannot finish it.',
      'REY: Not without you.',
      'TITO: Then she will come for me, and you will be somewhere else, because that is how she has done everything since the day we met her.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'e02-rowes-warrant', name: "Rowe's Warrant", giver: 'Special Agent Rowe', type: 'story', act: 6,
    tier: 12, requires: ['e01-everything-on-the-table'], reward: 170000,
    blurb: 'Nine weeks are up. Rowe has the warrant and one professional courtesy left to spend.',
    briefing: [
      'ROWE: I said nine weeks. It was eleven, because a judge went on holiday, which is the single most Leonida sentence I have ever had to say out loud.',
      'ROWE: The warrant names Julian Ruiz, Mona Castellanos and a holding company registered eleven days ago.',
      'ROWE: It does not name you. Not because you are innocent. Because you are the only person in this whose money I cannot follow, and that is going to keep me up for years.',
      'REY: What do you want?',
      'ROWE: I want to arrest Ruiz standing up. He has forty armed men and a substation full of my own surveillance kit. So I am going to ask you for something disgraceful.',
      'ROWE: I want you to take his people away from him. And I am going to stand here and pretend I do not know how.',
    ],
    start: { x: 960, z: 60, marker: '!', radius: 6 },
    objectives: [
      at('Hit the first of his crews in Ocean Mile', 820, -320, 16),
      sweep('Break them', 820, -320, 8, 45),
      drive('Get across to Centro', 340, -140, 18, [
        'YAZ: Second crew is already moving. They know. They have a radio and I gave it to them eighteen months ago.',
      ]),
      sweep('Break the second crew', 340, -140, 8, 45),
      drive('Last of them, Foundry Flats', 160, -860, 18),
      sweep('Finish it', 160, -860, 9, 45),
      cool('Lose the units before Rowe has to notice', 180),
    ],
    fail: { onDeath: true },
    wantedOnStart: 3, wantedOnEnd: 0,
    debrief: [
      'ROWE: Twenty six arrests this morning. Not one of them by me.',
      'ROWE: Do you know what I did for eleven years before this city? Securities fraud. Spreadsheets. Nobody ever bled on a spreadsheet.',
      'REY: Do you want an apology?',
      'ROWE: I want to go home, Mister Delgado. And I want to be able to.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'e03-the-last-favour', name: 'The Last Favour', giver: 'Yaz Okonkwo', type: 'story', act: 6,
    tier: 12, requires: ['e02-rowes-warrant'], reward: 180000,
    blurb: 'Yaz wants one thing before the end: the station back on air, loud, on every frequency in the county.',
    briefing: [
      'YAZ: Everybody in this is about to do something enormous and stupid and I would like to do mine first.',
      'YAZ: There is a transmitter mast on the ridge that covers three counties. It has been dark since the storm.',
      'YAZ: Give me four hours on that mast and I will put every recording we have made in two years out over the whole coast. Ruiz. Mona. The comptroller. All of it.',
      'REY: That burns us too.',
      'YAZ: It burns everybody. That is the point. A city where everybody knows is a city where none of this works any more.',
      'REY: Then let us go and turn the lights on.',
    ],
    start: { x: -940, z: 60, marker: '!', radius: 6 },
    objectives: [
      at('Get up to the ridge mast', -1012, 96, 12),
      sweep('Clear the compound', -1012, 96, 8, 40),
      find('Get the feed hardware into the shack', 4, { radius: 14, x: -1012, z: 96 }),
      hold('Hold the mast while it goes out', 180, -1012, 96, 50, [
        'YAZ: We are live. Three counties. Rey, the police band has gone completely silent, they are all listening.',
        'YAZ: Mona Castellanos, nineteenth of March, on the subject of Tito Barrow. Go on. Play it.',
      ]),
      bolt('Get off the ridge', 130),
    ],
    fail: { onDeath: true },
    wantedOnStart: 3,
    debrief: [
      'YAZ: Four hours and eleven minutes.',
      'YAZ: I have wanted to do that since I was seventeen years old in a bedroom in Rust Row with a broken car radio.',
      'TITO: Was it worth it?',
      'YAZ: Tito, I am going to prison and I would do it again tomorrow.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'e04-ruiz', name: 'Ruiz', giver: 'Rey Delgado', type: 'story', act: 6,
    tier: 12, requires: ['e03-the-last-favour'], reward: 200000,
    blurb: 'No crews, no network, no warrant to hide behind. Julian Ruiz is in an empty house on the ridge.',
    briefing: [
      'YAZ: He has been paying the electricity on the Vance house for a year. That is where he is.',
      'TITO: Alone?',
      'YAZ: Alone. He has eleven dollars in a current account and a county pension he will never collect.',
      'REY: Then I am going to go and finish it.',
      'TITO: Rey. Come back. That is the whole instruction. Come back.',
    ],
    start: { x: -940, z: 60, marker: '!', radius: 6 },
    objectives: [
      at('Get up to the Vance house', -988, 34, 12, [
        'RUIZ: The gate is open. It has been open since Tuesday. I have been sitting here wondering which of you it would be.',
      ]),
      sweep('Get through what is left of him', -988, 34, 6, 40, [
        'RUIZ: Twelve years. Twelve years of doing it properly and a city that ate every single one of them.',
        'REY: You shot a sixty one year old man outside a church.',
        'RUIZ: I know exactly what I did, Delgado. That is the difference between us. You are still telling yourself a story.',
      ]),
      hit('End it', 1),
      find('Take everything he kept on us', 4, { radius: 16, x: -988, z: 34 }),
      bolt('Get off the ridge before Rowe arrives', 120, [
        'ROWE: I am eleven minutes out, Mister Delgado. I would very much like to arrive to a scene rather than a conversation.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'ROWE: He had a file on every one of you. Mine was the thickest.',
      'ROWE: He had me down as compromised. Me. Because I bought you a coffee in Vice Sands and he could not think of another reason.',
      'REY: Was he wrong?',
      'ROWE: Ask me on the causeway.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'e05-leonida-international', name: 'Leonida International', giver: 'Mona Castellanos', type: 'heist', act: 6,
    tier: 12, requires: ['e04-ruiz'], reward: 600000,
    blurb: "Mona's money is in a bonded cargo facility at the airport, waiting for a plane. Again.",
    briefing: [
      'YAZ: Eleven point four million in a bonded warehouse at Leonida International. Manifested as machine parts. Flying out Thursday.',
      'TITO: To where?',
      'YAZ: Does it matter? Somewhere with better weather.',
      'REY: She did this exact thing fifteen months ago and we let her.',
      'TITO: We did not let her. We were not invited.',
      'REY: Then let us be extremely rude.',
    ],
    start: { x: -517, z: -1086, marker: '$', radius: 6 },
    objectives: [
      at('Get airside at the cargo facility', -466, -1126, 12, [
        'YAZ: Perimeter gate three. The reader still takes the card I cloned in Act One and I have never been prouder of anything.',
      ]),
      sweep('Clear the bonded warehouse', -466, -1126, 9, 45),
      till('Break the bonded cage', -466, -1126, 14),
      find('Load the pallets', 8, { radius: 22, x: -466, z: -1126 }),
      drive('Get it off the airfield', -135, -1038, 20, [
        'MONA: Rey. Rey, whatever you think this is —',
        'REY: I think it is Thursday, Mona. Same as last time.',
      ]),
      bolt('Get away from the airport', 140),
      cool('Lose every unit in the county', 220),
    ],
    fail: { onDeath: true },
    wantedOnStart: 4, wantedOnEnd: 0,
    debrief: [
      'TITO: Eleven point four million dollars in a church hall in Little Habana.',
      'AMARO: I want it noted that I have objected.',
      'TITO: You have objected.',
      'AMARO: Loudly. And now I would like to know what the roof fund gets.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'e06-the-causeway', name: 'The Causeway', giver: 'Mona Castellanos', type: 'story', act: 6,
    tier: 12, requires: ['e05-leonida-international'], reward: 260000,
    blurb: 'Mona has taken Tito. She wants one signature and the causeway is closed at both ends.',
    briefing: [
      'MONA: I have him. He is unhurt, he is furious, and he has already broken one of my phones.',
      'MONA: Causeway. Middle span. He signs the lease transfer, I get on a boat, and every one of you keeps everything else.',
      'REY: You traded him to Ruiz for a seat.',
      'MONA: Yes.',
      'REY: You did not even pause.',
      'MONA: What would a pause have got either of us, Rey? Come to the causeway. Bring the lease. Let us finish being what we are.',
    ],
    start: { x: 620, z: -1010, marker: '!', radius: 6 },
    objectives: [
      at('Get the lease back from Rosa', 430, 900, 14, [
        'AMARO: She kept it in a biscuit tin under a statue of Saint Anthony.',
        'REY: Saint Anthony.',
        'AMARO: Patron of lost things. She thought it was funny. It is funny.',
      ]),
      drive('Get to the causeway', 700, -900, 20),
      sweep('Clear the north span', 700, -900, 9, 50, [
        'MONA: Those are not mine. Rey, listen to me, those men are not mine.',
        'YAZ: They are Sandoval. Elena is on the causeway.',
      ]),
      guard('Get to Tito and hold the span', 150, [
        'TITO: Took your time.',
        'REY: There was a biscuit tin.',
        'TITO: There always is.',
      ]),
      drive('Get everybody off the bridge', 560, 470, 20),
      cool('Lose the county', 200),
    ],
    fail: { onDeath: true, timeLimit: 900 },
    wantedOnStart: 3, wantedOnEnd: 0,
    debrief: [
      'MONA: I could have let them take him and I did not.',
      'REY: You also put him there.',
      'MONA: Yes. Both things. That has been the entire arrangement since the day you got off that bus and I decided you were useful.',
    ],
    music: 'iron-lung',
  }),
  mission({
    id: 'e07-mona', name: 'Mona', giver: 'Rey Delgado', type: 'story', act: 6,
    tier: 12, requires: ['e06-the-causeway'], reward: 320000,
    blurb: 'One conversation, at the laundrette on Ocean Mile, where all of this started.',
    briefing: [
      'MONA: Above the laundrette. Where you found the half a book.',
      'MONA: No men, no boat, no plane. Just the two of us and whatever you have decided.',
      'TITO: You do not have to go.',
      'REY: I have gone to every other one of these, Tito. This is the only one that was ever going to matter.',
    ],
    start: { x: 820, z: -320, marker: 'M', radius: 6 },
    objectives: [
      at('Go up to the flat on Ocean Mile', 826, -336, 12, [
        'MONA: You have been standing in that doorway for a while.',
        'REY: I was looking at the room.',
        'MONA: It is a terrible room. It was always a terrible room. I kept it because it was the only thing in Leonida that was actually mine.',
      ]),
      idle('Have the conversation', 34, 826, -336, 20, [
        'MONA: I have eleven point four million dollars in a church, a federal warrant with my name on it, and no aeroplane.',
        'MONA: So here is the last offer I will ever make you. Half. Half of everything, and I walk into the water and you never see me again, and Tito gets the lease and the hall and whatever peace is left.',
        'REY: And if I say no?',
        'MONA: Then you take all of it and I still walk into the water. The difference is only what you have to live with.',
        'REY: You always do this. You always make the cruel thing sound like arithmetic.',
        'MONA: It is arithmetic, Rey. I just say it out loud. That is the whole crime.',
      ]),
      guard('Get her out when they come up the stairs', 140, [
        'YAZ: Rey, there are four cars on Ocean Mile and a helicopter over the strip. That is not Elena and it is not Sandoval.',
        'ROWE: Mona Castellanos. Federal warrant. Come to the window where I can see your hands.',
      ]),
      bolt('Get off Ocean Mile', 130),
    ],
    fail: { onDeath: true },
    wantedOnStart: 3,
    debrief: [
      'ROWE: She walked out of the front door on her own, with her hands up, in front of nine cameras.',
      'ROWE: Nobody does that. In eleven years nobody has ever done that.',
      'REY: She did it so you would have to take her instead of following the money.',
      'ROWE: ...Yes. I worked that out at about two this morning.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'e08-leonida', name: 'Leonida', giver: 'Tito Barrow', type: 'story', act: 6,
    tier: 12, requires: ['e07-mona'], reward: 900000,
    blurb: 'The last run: get everyone out of the county before the indictments land, or stay and be the man who stayed.',
    briefing: [
      'ROWE: Indictments come down at six tomorrow morning. Forty one names.',
      'ROWE: Yours is not on it. Yaz Okonkwo is. Tito Barrow is, on a lease from nineteen ninety two, which is the single stupidest charge in the document and it will still stick.',
      'ROWE: I am telling you this in a car park at midnight because I have decided I would rather be a person than an agent for about four hours.',
      'REY: Why?',
      'ROWE: Because you went and got a nineteen year old girl out of Rust Row for a woman who had tried to kill you, and I have been unable to file that anywhere.',
      'TITO: So we run.',
      'REY: So we drive. One more time. All of us. And then we see who wants to come back.',
    ],
    start: { x: 560, z: 470, marker: '!', radius: 6 },
    objectives: [
      at('Get everyone to the hall', 578, 494, 14, [
        'YAZ: I am not running. I want that on the record. I am being driven.',
        'AMARO: Nobody is running. We are all simply going to South Glades at four in the morning for reasons.',
      ]),
      find('Load the money and the lease', 8, { radius: 20, x: 578, z: 494 }),
      drive('Get Yaz to the airfield', -517, -1086, 20, [
        'YAZ: Rey. Two years ago you stole an amplifier for me.',
        'REY: I remember.',
        'YAZ: That was the best day of my life. I want you to know that the rest of it has been the second best day of my life, repeatedly, in a trailer.',
      ]),
      drive('Get the money to the church in South Glades', -120, 660, 20),
      sweep('Deal with what is waiting on the Glades road', -120, 660, 9, 50, [
        'YAZ: Last of Ruiz men. Nobody told them it was over.',
        'TITO: Then tell them.',
      ]),
      guard('Get Tito to the county line', 160, [
        'TITO: Pull over.',
        'REY: We are eleven miles out.',
        'TITO: Pull over, Rey.',
        'TITO: I am sixty three years old and I have lived in this county my entire life. I am not going to die in a different one to prove a point to a federal prosecutor.',
        'TITO: Take the money to Amaro. Take the lease to Rosa. And then come back and get me, because I will be at the hall, and I will have made coffee.',
      ]),
      drive('Take the last of it back into Leonida', 560, 470, 20),
    ],
    fail: { onDeath: true, timeLimit: 1200 },
    debrief: [
      'ROWE: Thirty nine arrests. Two men in another country. One man in a church hall in Little Habana making coffee.',
      'ROWE: I could take you. I want you to know I could take you, right now, today.',
      'REY: I know.',
      'ROWE: Instead I am going to go back to securities fraud, where nobody bleeds, and I am going to think about this city for the rest of my life.',
      'TITO: Sit down, Rey. It is done. You are twenty nine years old, you own a church hall, and for the first time since you got off that bus nobody in Leonida wants anything from you.',
      'REY: What do I do now?',
      'TITO: Now? Now you drink the coffee. It is terrible. I am very proud of it.',
    ],
    music: 'radio-calor',
  }),
];

// ===========================================================================
// SIDE WORK — SECOND WAVE
//
// Freelance jobs that open up as Rey's reputation grows. None of them touch the
// story; all of them are the reason Leonida feels like somewhere people live.
// ===========================================================================
const SIDE_WORK = [
  // ---- driving for money ---------------------------------------------------
  mission({
    id: 'y-ambulance-shift', name: 'Ambulance Shift', giver: 'County EMS', type: 'ambulance',
    tier: 1, reward: 1400,
    blurb: 'Four pickups, four hospitals, one siren and no patience.',
    briefing: [
      'DISPATCH: You are covering a shift for a man who is himself now a patient. Do not think about that.',
      'DISPATCH: Four calls on the board. The clock is what they pay you for.',
    ],
    start: { x: 392, z: -66, marker: '$', radius: 6 },
    objectives: [
      at('Collect the first patient in Centro', 366, -110, 10),
      drive('Get them to Saint Mercy', 430, 900, 16),
      at('Second call: Vice Sands boardwalk', 960, 60, 10),
      drive('Back to Saint Mercy', 430, 900, 16, [
        'DISPATCH: He says he is fine. He is not fine. Keep driving.',
      ]),
    ],
    fail: { onDeath: true, timeLimit: 540 },
    debrief: ['DISPATCH: Four for four. Come back Thursday, the man you covered for is still a patient.'],
  }),
  mission({
    id: 'y-tow-shift', name: 'Hook and Chain', giver: "Dobbs Towing", type: 'tow',
    tier: 2, reward: 2400,
    blurb: 'Three cars, three impound tickets, three very upset owners.',
    briefing: [
      'DOBBS: Repossession is a legal process conducted by professionals. We are not those.',
      'DOBBS: Three vehicles. Bring them to the yard. If the owner is standing next to it, that is a conversation, not a cancellation.',
    ],
    start: { x: 160, z: -860, marker: '$', radius: 6 },
    objectives: [
      lift('First one, parked in Palmview', -160, -430),
      drive('Drop it at the yard', 160, -860, 14),
      lift('Second one, Ocean Mile', 820, -320),
      drive('Yard again', 160, -860, 14),
      lift('Third one, Mirador Hills', -940, 60),
      drive('And back', 160, -860, 14, ['DOBBS: That last one belongs to a judge. Drive normally.']),
    ],
    fail: { onDeath: true, timeLimit: 720 },
    debrief: ['DOBBS: Three for three and no lawsuits. That is a record for a Tuesday.'],
  }),
  mission({
    id: 'y-food-truck', name: 'Lunch Rush', giver: 'La Marea Truck', type: 'delivery',
    tier: 1, reward: 1200,
    blurb: 'A food truck, six stops, and a generator that has opinions.',
    briefing: [
      'ROSA: You drive, I cook, nobody dies. That is the arrangement.',
      'ROSA: Six stops. If you brake hard the fryer goes over and then we both die.',
    ],
    start: { x: 560, z: 470, marker: '$', radius: 6 },
    objectives: [
      drive('Pitch at the Centro building site', 340, -140, 14),
      drive('Pitch at the port gate', 620, -1010, 14, ['ROSA: The dockers tip in coins. Bring the bucket.']),
      drive('Pitch at Cypress Park', -580, 520, 14),
      drive('Pitch outside the mall', -720, -560, 14),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 600 },
    debrief: ['ROSA: Eleven hundred dollars and one broken fryer. You are hired until you are not.'],
  }),
  mission({
    id: 'y-airport-run', name: 'Airport Run', giver: 'Dispatch', type: 'taxi',
    tier: 2, reward: 2200,
    blurb: 'Three fares to the airport, all of them late, all of them certain it is your fault.',
    briefing: ['DISPATCH: Three airport runs. All three think their flight is the only flight.'],
    start: { x: 820, z: -320, marker: '$', radius: 6 },
    objectives: [
      at('Pick up on Ocean Mile', 844, -294, 9),
      drive('Terminal two', -517, -1086, 20),
      at('Pick up in Meridian', 230, 200, 9),
      drive('Terminal two again', -517, -1086, 20, [
        'FARE: If I miss this I lose the account. If I lose the account I lose the house.',
      ]),
    ],
    fail: { onDeath: true, timeLimit: 600 },
    debrief: ['DISPATCH: Both made it. One tipped. Guess which.'],
  }),
  mission({
    id: 'y-smuggle-run', name: 'Night Freight', giver: 'Elena Sandoval', type: 'delivery',
    tier: 8, requires: ['a02-cold-chain'], reward: 34000,
    blurb: 'Four pallets out of the port before the shift change, on roads that are not roads.',
    briefing: [
      'ELENA: The shift changes at two. Between one fifty and two ten the gate is a suggestion.',
      'ELENA: Four pallets, two vehicles, one trip each. Do not use the causeway.',
    ],
    start: { x: 620, z: -1010, marker: '$', radius: 6 },
    objectives: [
      lift('Take the first van', 648, -1040),
      drive('Run it to Little Habana', 560, 470, 16),
      lift('Second van', 648, -1040),
      drive('Same place, different road', 560, 470, 16, ['ELENA: Not the same road. I will know.']),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 660 },
    debrief: ['ELENA: On time, off the books, off the causeway. You listen. That is rarer than courage.'],
  }),

  // ---- racing --------------------------------------------------------------
  mission({
    id: 'y-race-causeway', name: 'Causeway Run', giver: 'Street Racers', type: 'race',
    tier: 3, requires: ['x-race-oceanmile'], reward: 5200,
    blurb: 'Four miles of open bridge with nothing on either side but water.',
    briefing: ['RACER: No corners. No excuses. Just you and whatever is under the bonnet.'],
    start: { x: 700, z: -900, marker: 'R', radius: 6 },
    objectives: [
      lap('Win the causeway run', [[640, -960], [560, -1020], [440, -1000], [340, -940], [240, -880]]),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 220 },
    debrief: ['RACER: Nobody has done that under two minutes. Nobody sensible.'],
  }),
  mission({
    id: 'y-race-glades', name: 'Glades Loop', giver: 'Street Racers', type: 'race',
    tier: 3, requires: ['x-race-oceanmile'], reward: 5000,
    blurb: 'Two laps of the back roads south of the city. Watch for standing water.',
    briefing: ['RACER: It is flat, it is wet and it is full of things that do not move out of the way.'],
    start: { x: -120, z: 660, marker: 'R', radius: 6 },
    objectives: [
      lap2('Two laps of the Glades', 2, [[-132, 743], [80, 800], [-129, 879], [-200, 820], [-120, 660]]),
    ],
    fail: { onDeath: true, timeLimit: 280 },
    debrief: ['RACER: You hit a heron. It is fine. It was a draw.'],
  }),
  mission({
    id: 'y-race-centro', name: 'Centro Night Circuit', giver: 'Street Racers', type: 'race',
    tier: 4, requires: ['y-race-causeway'], reward: 8600,
    blurb: 'Three laps of the downtown grid at two in the morning. There is still traffic.',
    briefing: ['RACER: Red lights are decorative after midnight. Buses are not.'],
    start: { x: 340, z: -140, marker: 'R', radius: 6 },
    objectives: [
      lap2('Three laps of Centro', 3, [[420, -80], [480, -180], [380, -260], [280, -200], [340, -140]]),
    ],
    fail: { onDeath: true, timeLimit: 320 },
    debrief: ['RACER: Fastest lap and you only lost one mirror.'],
  }),
  mission({
    id: 'y-race-ridge', name: 'Ridge Climb', giver: 'Street Racers', type: 'race',
    tier: 5, requires: ['y-race-centro'], reward: 14000,
    blurb: 'From the valley floor to the mast on the ridge. Uphill, all of it.',
    briefing: ['RACER: Nine hundred feet of climb. Whatever you brought, it is not enough.'],
    start: { x: -800, z: 200, marker: 'R', radius: 6 },
    objectives: [
      lap('Climb to the mast', [[-860, 160], [-920, 110], [-970, 70], [-1010, 96]]),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 260 },
    debrief: ['RACER: You can see the whole county from up here. Most people never bother.'],
  }),
  mission({
    id: 'y-race-port', name: 'Container Sprint', giver: 'Street Racers', type: 'race',
    tier: 5, requires: ['y-race-centro'], reward: 13000,
    blurb: 'A course laid out between stacked containers by people with no regard for anything.',
    briefing: ['RACER: If the gap looks too small it is too small. If it looks fine it is also too small.'],
    start: { x: 620, z: -1010, marker: 'R', radius: 6 },
    objectives: [
      lap2('Run the container course', 2, [[680, -1060], [720, -980], [620, -920], [540, -1000], [620, -1010]]),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 240 },
    debrief: ['RACER: Three cars started. One car finished. You are the one car.'],
  }),
  mission({
    id: 'y-race-grandprix', name: 'The Leonida Grand', giver: 'Street Racers', type: 'race',
    tier: 9, requires: ['y-race-ridge', 'y-race-port'], reward: 60000,
    blurb: 'Every racer in the county, one lap of the whole city, no rules whatsoever.',
    briefing: [
      'RACER: Once a year. Everybody. One lap of Leonida, coast to hills to port to coast.',
      'RACER: Last year two people finished. The year before, none.',
    ],
    start: { x: 820, z: -320, marker: 'R', radius: 6 },
    objectives: [
      lap('One lap of Leonida', [[960, 60], [560, 470], [-120, 660], [-940, 60], [-720, -560],
        [-517, -1086], [160, -860], [620, -1010], [880, -680], [820, -320]]),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 900 },
    debrief: ['RACER: Winner of the Leonida Grand. There is no trophy. There has never been a trophy.'],
  }),

  // ---- stunts --------------------------------------------------------------
  mission({
    id: 'y-stunt-rooftops', name: 'Rooftop Gap', giver: 'Skate Crew', type: 'stunt',
    tier: 4, requires: ['x-stunt-tour'], reward: 7200,
    blurb: 'There is a ramp on a car park roof in Centro and a building on the other side of the street.',
    briefing: ['SKATER: Somebody built it at night. Nobody knows who. Everybody knows it works.'],
    start: { x: 340, z: -140, marker: 'S', radius: 6 },
    objectives: [
      air('Make the rooftop gap', { x: 366, z: -168, radius: 40 }),
      air('Stay airborne for four seconds', { seconds: 4 }),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 300 },
    debrief: ['SKATER: Six people have made that. Four of them are still walking.'],
  }),
  mission({
    id: 'y-stunt-canal', name: 'Canal Run', giver: 'Skate Crew', type: 'stunt',
    tier: 4, requires: ['x-stunt-tour'], reward: 6800,
    blurb: 'Down the drainage canal, off the spillway, land on the road. In theory.',
    briefing: ['SKATER: The canal is dry until it is not. Check the sky before you commit.'],
    start: { x: -148, z: -60, marker: 'S', radius: 6 },
    objectives: [
      air('Hit the spillway', { x: -148, z: -60, radius: 45 }),
      air('Land it and keep going', { x: -60, z: 60, radius: 45 }),
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 300 },
    debrief: ['SKATER: That was clean. Genuinely clean. I am annoyed about it.'],
  }),
  mission({
    id: 'y-stunt-marathon', name: 'Twenty Seconds', giver: 'Skate Crew', type: 'stunt',
    tier: 6, requires: ['x-stunt-airtime', 'y-stunt-rooftops'], reward: 26000,
    blurb: 'Twenty cumulative seconds off the ground. Anywhere, anything, any way.',
    briefing: ['SKATER: Twenty seconds. It sounds like nothing. It is four minutes of terror in instalments.'],
    start: { x: 1040, z: -180, marker: 'S', radius: 6 },
    objectives: [air('Bank twenty seconds of air time', { seconds: 20, count: 1 })],
    fail: { onDeath: true, timeLimit: 600 },
    debrief: ['SKATER: Twenty seconds. You spent twenty seconds of your life not touching the earth.'],
  }),

  // ---- hits and rampages ---------------------------------------------------
  mission({
    id: 'y-hit-architect', name: 'The Architect', giver: 'Unknown Client', type: 'assassination',
    tier: 9, requires: ['b04-model-home'], reward: 42000,
    blurb: 'A man who drew a neighbourhood that does not exist yet, over one that does.',
    briefing: ['CLIENT: He eats alone in Meridian at one. He has eaten alone at one for nine years.'],
    start: { x: 230, z: 200, marker: '!', radius: 6 },
    objectives: [
      at('Get into position', 254, 226, 12),
      hit('Take the shot', 1),
      bolt('Leave the district', 90),
    ],
    fail: { onDeath: true, onTargetEscaped: true },
    debrief: ['CLIENT: Clean. Quiet. Nobody rebuilt Cypress Park this year.'],
  }),
  mission({
    id: 'y-hit-auditor', name: 'The Auditor', giver: 'Unknown Client', type: 'assassination',
    tier: 10, requires: ['c03-marker-calls'], reward: 58000,
    blurb: 'She has been through eleven sets of books and she is on the twelfth.',
    briefing: ['CLIENT: Grand Vista car park, level four, every evening at six twenty. She is extremely punctual.'],
    start: { x: -720, z: -560, marker: '!', radius: 6 },
    objectives: [
      at('Get to level four', -742, -586, 12),
      hit('Finish it', 1),
      bolt('Get out of the mall', 100),
    ],
    fail: { onDeath: true, onTargetEscaped: true },
    debrief: ['CLIENT: Twelve sets of books and she never got to the thirteenth. Payment attached.'],
  }),
  mission({
    id: 'y-hit-pair', name: 'Two at the Marina', giver: 'Unknown Client', type: 'assassination',
    tier: 10, requires: ['y-hit-auditor'], reward: 72000,
    blurb: 'Two men, one boat, one window of about forty seconds.',
    briefing: ['CLIENT: They are only ever together on Sundays. This is Sunday.'],
    start: { x: 880, z: -680, marker: '!', radius: 6 },
    objectives: [
      at('Get down to berth nine', 906, -704, 12),
      hit('Both of them', 2),
      bolt('Be gone', 90),
    ],
    fail: { onDeath: true, onTargetEscaped: true, timeLimit: 300 },
    debrief: ['CLIENT: Both. In one window. I will be using you again.'],
  }),
  mission({
    id: 'y-rampage-mall', name: 'Grand Vista Rampage', giver: 'Anonymous', type: 'rampage',
    tier: 5, requires: ['x-rampage-foundry'], reward: 16000,
    blurb: 'A crate in the loading bay and eighteen very bad ideas.',
    briefing: ['NOTE: Eighteen. Two minutes. The mall closes early anyway.'],
    start: { x: -720, z: -560, marker: '!', radius: 6 },
    objectives: [hit('Eighteen targets in two minutes', 18, { seconds: 120 })],
    fail: { onDeath: true, timeLimit: 120 },
    wantedOnStart: 3,
    debrief: ['NOTE: Eighteen. The crate is yours. So is the helicopter overhead, in a sense.'],
  }),
  mission({
    id: 'y-rampage-port', name: 'Port Rampage', giver: 'Anonymous', type: 'rampage',
    tier: 8, requires: ['x-rampage-rustrow'], reward: 38000,
    blurb: 'Twenty two, ninety seconds, containers everywhere.',
    briefing: ['NOTE: Twenty two in ninety seconds. Use the containers. They are why this is possible.'],
    start: { x: 620, z: -1010, marker: '!', radius: 6 },
    objectives: [hit('Twenty two targets', 22, { seconds: 90 })],
    fail: { onDeath: true, timeLimit: 90 },
    wantedOnStart: 3,
    debrief: ['NOTE: Twenty two. Somebody is going to have a very confusing morning.'],
  }),
  mission({
    id: 'y-rampage-ridge', name: 'Ridge Rampage', giver: 'Anonymous', type: 'rampage',
    tier: 10, requires: ['y-rampage-port'], reward: 80000,
    blurb: 'Thirty. Two minutes. Up where the rich people live and the roads only go one way.',
    briefing: ['NOTE: Thirty in two minutes on the ridge. There is one road down. Bear that in mind.'],
    start: { x: -940, z: 60, marker: '!', radius: 6 },
    objectives: [hit('Thirty targets', 30, { seconds: 120 })],
    fail: { onDeath: true, timeLimit: 120 },
    wantedOnStart: 4,
    debrief: ['NOTE: Thirty. On the ridge. In two minutes. I did not think it was possible.'],
  }),

  // ---- chases, escorts, sieges --------------------------------------------
  mission({
    id: 'y-chase-bail', name: 'Skipped Bail', giver: 'Ortega Bonds', type: 'chase',
    tier: 3, requires: [], reward: 6400,
    blurb: 'He posted forty thousand of somebody else money and then went for a drive.',
    briefing: ['ORTEGA: White estate car, four hours head start, and a mother in South Glades he visits every Sunday.'],
    start: { x: -120, z: 660, marker: '!', radius: 6 },
    objectives: [
      tail('Catch the skip', 67, 631, 16),
      wreck('Stop the car', 1),
    ],
    fail: { onDeath: true, onTargetEscaped: true, timeLimit: 240 },
    debrief: ['ORTEGA: Forty thousand recovered, one estate car written off. Net positive. Barely.'],
  }),
  mission({
    id: 'y-chase-courier', name: 'The Courier', giver: 'Yaz Okonkwo', type: 'chase',
    tier: 9, requires: ['b02-the-councillor'], reward: 46000,
    blurb: 'A bag goes from Meridian to the ridge every Friday. Not this Friday.',
    briefing: ['YAZ: He does not stop, he does not speed, and he never takes the same road twice. Except today, because I moved a roadworks sign.'],
    start: { x: 230, z: 200, marker: '!', radius: 6 },
    objectives: [
      tail('Intercept the courier', 120, 120, 16),
      wreck('Force him off', 1),
      find('Take the bag', 2, { radius: 12 }),
    ],
    fail: { onDeath: true, onTargetEscaped: true, timeLimit: 300 },
    debrief: ['YAZ: Four hundred thousand in a gym bag. He had a squash racket on top of it. A squash racket.'],
  }),
  mission({
    id: 'y-escort-witness', name: 'The Witness', giver: 'Nadia Brant', type: 'escort',
    tier: 9, requires: ['b06-permit-office'], reward: 50000,
    blurb: 'A planning clerk is going to testify, if she gets to the courthouse.',
    briefing: ['BRANT: She typed every variation. She kept copies. Three people have already visited her at home.'],
    start: { x: -160, z: -430, marker: 'M', radius: 6 },
    objectives: [
      guard('Get her out of Palmview', 140),
      drive('Take her to the courthouse in Centro', 340, -140, 16),
    ],
    fail: { onDeath: true, timeLimit: 420 },
    wantedOnStart: 1,
    debrief: ['BRANT: She testified for six hours. Vance Coastal will be in court for eleven years.'],
  }),
  mission({
    id: 'y-escort-doctor', name: 'House Call', giver: 'Father Amaro', type: 'escort',
    tier: 7, requires: ['a09-the-roof-fund'], reward: 30000,
    blurb: 'A doctor who treats people with no papers needs to get to three houses tonight.',
    briefing: ['AMARO: She does not ask names and she does not file anything, which makes her a criminal and a saint.'],
    start: { x: 430, z: 900, marker: 'M', radius: 6 },
    objectives: [
      guard('Take the doctor on her rounds', 130),
      drive('First house, Little Habana', 560, 470, 16),
      drive('Second house, Saint Mercy', 430, 900, 16),
      drive('Last one, South Glades', -120, 660, 16, [
        'DOCTOR: This one is nine years old and has been walking on it for a week.',
      ]),
    ],
    fail: { onDeath: true, timeLimit: 720 },
    debrief: ['AMARO: Three houses. She will do it again on Thursday whether anyone drives her or not.'],
  }),
  mission({
    id: 'y-survive-hall', name: 'Siege at the Hall', giver: 'Tito Barrow', type: 'survival',
    tier: 10, requires: ['c06-tito'], reward: 64000,
    blurb: 'Somebody has decided the church hall is a soft target. Four minutes says otherwise.',
    briefing: ['TITO: They think because it is a church hall there is nobody in it who has done this before.'],
    start: { x: 560, z: 470, marker: '!', radius: 6 },
    objectives: [hold('Hold the hall for four minutes', 240, 578, 494, 45)],
    fail: { onDeath: true },
    wantedOnStart: 2,
    debrief: ['TITO: Nobody is going to try that twice. Amaro is furious about the windows.'],
  }),
  mission({
    id: 'y-survive-lockup', name: 'The Lock-Up', giver: 'Yaz Okonkwo', type: 'survival',
    tier: 11, requires: ['d05-storm-warning'], reward: 96000,
    blurb: 'Everything we own is in one unit at the port and everyone knows it.',
    briefing: ['YAZ: Five minutes until the second truck gets here. Five minutes is a very long time.'],
    start: { x: 620, z: -1010, marker: '!', radius: 6 },
    objectives: [hold('Hold the lock-up for five minutes', 300, 648, -1040, 45)],
    fail: { onDeath: true },
    wantedOnStart: 3,
    debrief: ['YAZ: Five minutes and eleven seconds. I counted every one of them out loud.'],
  }),

  // ---- collecting and looking ---------------------------------------------
  mission({
    id: 'y-collect-signs', name: 'Neon Salvage', giver: 'Tito Barrow', type: 'collect',
    tier: 3, requires: ['x-collect-parts'], reward: 7400,
    blurb: 'Twelve dead neon signs across the city. Tito wants them all.',
    briefing: ['TITO: Every one of those signs is somebody who gave up. I am going to put them on a wall.'],
    start: { x: 820, z: -320, marker: '?', radius: 6 },
    objectives: [find('Recover 12 signs', 12, { radius: 5 })],
    fail: { onDeath: false },
    debrief: ['TITO: Twelve signs. Twelve businesses. Four of them I drank in.'],
  }),
  mission({
    id: 'y-collect-tapes', name: 'The Tape Hunt', giver: 'Yaz Okonkwo', type: 'collect',
    tier: 8, requires: ['a10-static-sunday'], reward: 34000,
    blurb: 'Fourteen master tapes scattered when the station moved. Yaz wants every one.',
    briefing: ['YAZ: Fourteen tapes. Two of them are the only recordings of a band that broke up in a car park in 1991.'],
    start: { x: -1050, z: -820, marker: '?', radius: 6 },
    objectives: [find('Recover 14 tapes', 14, { radius: 5 })],
    fail: { onDeath: false },
    debrief: ['YAZ: All fourteen. I am going to play the car park band at three in the morning and cry.'],
  }),
  mission({
    id: 'y-collect-shrines', name: 'Roadside Shrines', giver: 'Father Amaro', type: 'collect',
    tier: 4, requires: [], reward: 9000,
    blurb: 'Nine roadside shrines need their candles replaced before the anniversary.',
    briefing: ['AMARO: Nine places where somebody stopped being alive on a road. The families still come.'],
    start: { x: 430, z: 900, marker: '?', radius: 6 },
    objectives: [find('Visit all nine shrines', 9, { radius: 5 })],
    fail: { onDeath: false },
    debrief: ['AMARO: Nine. Thank you. That is not a small thing, whatever you tell yourself.'],
  }),
  mission({
    id: 'y-photo-tour', name: 'Postcard Set', giver: 'Curiosity', type: 'photo',
    tier: 2, requires: ['x-collect-postcards'], reward: 4200,
    blurb: 'Somebody wants photographs of the six places Leonida puts on its postcards.',
    briefing: ['NOTE: Six views. Everybody has seen them. Almost nobody has stood in them.'],
    start: { x: 960, z: 60, marker: '?', radius: 6 },
    objectives: [
      snap('The Vice Sands boardwalk', 990, 86, 20),
      snap('Ocean Mile at the neon', 844, -294, 20),
      snap('The Centro skyline from the bridge', 300, -200, 20),
      snap('Little Habana at the church steps', 578, 494, 20),
      snap('The ridge over Mirador Hills', -962, 88, 20),
      snap('The port cranes at dusk', 646, -1036, 20),
    ],
    fail: { onDeath: false, timeLimit: 900 },
    debrief: ['NOTE: Six for six. You have now seen more of this city than most people who were born here.'],
  }),
  mission({
    id: 'y-photo-wrecks', name: 'Salvage Survey', giver: 'Dobbs Towing', type: 'photo',
    tier: 5, requires: ['y-tow-shift'], reward: 15000,
    blurb: 'Five wrecks nobody has claimed. Photograph them for the insurers before somebody strips them.',
    briefing: ['DOBBS: Insurance wants pictures. I want the cars. Take the pictures and we will discuss the cars.'],
    start: { x: 160, z: -860, marker: '?', radius: 6 },
    objectives: [
      snap('The wreck in the canal', -148, -60, 20),
      snap('The one on the Glades road', -180, 760, 20),
      snap('The one behind the mall', -742, -586, 20),
      snap('The one at the port fence', 682, -1048, 20),
      snap('The one on the ridge hairpin', -1012, 96, 20),
    ],
    fail: { onDeath: false, timeLimit: 780 },
    debrief: ['DOBBS: Five claims, five cheques, five cars in my yard. I love this business.'],
  }),

  // ---- shop work -----------------------------------------------------------
  mission({
    id: 'y-rob-circuit', name: 'The Circuit', giver: 'Anonymous', type: 'side',
    tier: 6, requires: ['s03-corner-office'], reward: 24000,
    blurb: 'Four tills in one night, four districts, and the response time gets worse each time.',
    briefing: ['NOTE: Four. One night. By the fourth they will be waiting, which is the entire point of the exercise.'],
    start: { x: 960, z: 60, marker: '$', radius: 6 },
    objectives: [
      till('Vice Sands', 984, 84),
      till('Ocean Mile', 844, -294, 13, ['YAZ: Two units moving your way already. That was quick.']),
      till('Centro', 366, -168),
      till('Little Habana', 578, 494, 13, ['YAZ: Every car in the county has your description. Last one.']),
      cool('Lose all of it', 200),
    ],
    fail: { onDeath: true, timeLimit: 720 },
    wantedOnEnd: 0,
    debrief: ['NOTE: Four for four. Nobody has done the circuit in one night since the eighties.'],
  }),
  mission({
    id: 'y-protection-round', name: 'Protection Round', giver: 'Tito Barrow', type: 'side',
    tier: 8, requires: ['a06-rust-row-auction'], reward: 32000,
    blurb: 'Six businesses pay us now. Two of them have stopped. Find out which and why.',
    briefing: [
      'TITO: I hate this part. I have always hated this part.',
      'TITO: But six people pay us because it is cheaper than what happens otherwise, and two have stopped, and if we do nothing then next month it is six.',
      'REY: And if they have a reason?',
      'TITO: Then we find out whose reason it is, and we go and talk to them instead.',
    ],
    start: { x: 560, z: 470, marker: '$', radius: 6 },
    objectives: [
      at('Call on the bakery in Little Habana', 578, 494, 12),
      at('Call on the garage in Saint Mercy', 430, 900, 12, [
        'REY: Who told you to stop paying?',
        'REY: Say the name again. Slowly.',
      ]),
      drive('Go and find them in Rust Row', -1050, -820, 16),
      sweep('Settle it', -1050, -820, 6, 40),
    ],
    fail: { onDeath: true },
    debrief: ['TITO: Both back on the books, and neither of them had to be frightened by us to do it. I will take that.'],
  }),
  mission({
    id: 'y-shop-run', name: 'Shopping List', giver: 'Yaz Okonkwo', type: 'side',
    tier: 7, requires: ['a03-the-frequency'], reward: 28000,
    blurb: 'Seven pieces of electronics that nobody in Leonida sells legally.',
    briefing: ['YAZ: Seven items. None of them are illegal. All seven together are extremely illegal. I love this country.'],
    start: { x: -1050, z: -820, marker: '$', radius: 6 },
    objectives: [
      find('Source the parts across the city', 7, { radius: 5 }),
      drive('Get them to the trailer', -1050, -820, 14),
    ],
    fail: { onDeath: true, timeLimit: 780 },
    debrief: ['YAZ: With this I can hear a police radio in the next county. Do not ask me why I want that.'],
  }),
];

// ===========================================================================
// INTERLUDES
//
// One optional scene per act, unlocked partway through it. No heists, no
// shooting if you drive well: just the people in this story sitting in cars
// talking to each other. They are how you find out who anybody is.
// ===========================================================================
const INTERLUDES = [
  mission({
    id: 'i02-the-long-way-round', name: 'The Long Way Round', giver: 'Tito Barrow', type: 'story', act: 2,
    tier: 8, requires: ['a05-the-suspension'], reward: 22000,
    blurb: 'Tito wants to be driven past four buildings that are not there any more.',
    briefing: [
      'TITO: No job. Put the gun in the glovebox and drive.',
      'TITO: I want to see four places and I do not want to talk about why until we are at the second one.',
    ],
    start: { x: 160, z: -860, marker: 'M', radius: 6 },
    objectives: [
      drive('The lot in Foundry Flats', 160, -860, 16, [
        'TITO: There was a body shop here. Cordova and Sons. The son was me for about four years.',
      ]),
      drive('The corner in Little Habana', 560, 470, 18, [
        'TITO: My mother had a window above that shop. She used to hang a green towel out when it was safe to come home.',
        'REY: Safe from what?',
        'TITO: My father, mostly. He got better. Then he got worse. Then he got dead, which fixed it.',
      ]),
      drive('The bus depot in Centro', 340, -140, 18, [
        'TITO: This is where you got off. Nineteen months ago, ten past six in the evening, with a bag.',
        'REY: You were not there.',
        'TITO: Mona was. Mona is always at the bus. That is the entire business plan.',
      ]),
      drive('The water at Marina del Sol', 880, -680, 20, [
        'TITO: And this is where I am going to be buried, in the sense that this is where I intend to be standing.',
        'TITO: I am sixty one, Rey. I have done one thing my whole life and I was good at it and it is a car park now.',
        'REY: We will get another building.',
        'TITO: I know. I am not sad. I just wanted somebody to have seen the first one.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'TITO: Thank you for not asking questions.',
      'REY: I asked two.',
      'TITO: You asked two. Mona would have asked nine and they would all have been about money.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'i03-the-quiet-hour', name: 'The Quiet Hour', giver: 'Yaz Okonkwo', type: 'story', act: 3,
    tier: 9, requires: ['b05-kessler'], reward: 28000,
    blurb: 'Yaz does a two-hour show every Sunday at four in the morning. Tonight there is a passenger.',
    briefing: [
      'YAZ: Every Sunday, four in the morning, two hours, no adverts and no talking except mine.',
      'YAZ: Tonight I am doing it from a car, because somebody keeps blowing up my buildings.',
      'YAZ: You drive, I broadcast. And Rey — nobody listens at four in the morning. That is the whole point of four in the morning.',
    ],
    start: { x: -1050, z: -820, marker: 'M', radius: 6 },
    objectives: [
      drive('Drive the coast while the show goes out', 880, -680, 20, [
        'YAZ: Good morning to the eleven of you. This is the quiet hour on ninety two point four and nothing at all is going to happen for two hours.',
      ]),
      drive('Keep going north', 620, -1010, 20, [
        'YAZ: I started this when I was seventeen. From my mother house in Rust Row. She thought I was asleep for a year and a half.',
        'REY: Did she find out?',
        'YAZ: She called in. On air. In nineteen ninety nine. Told me to come downstairs and eat something.',
      ]),
      drive('Up into the hills', -940, 60, 20, [
        'YAZ: I know what you are all doing out there. You are driving, or you cannot sleep, or you are working a night that will not end.',
        'YAZ: This next one is for a man in a chop shop who has had a very bad year.',
      ]),
      idle('Sit at the overlook until the show ends', 40, -940, 60, 24, [
        'YAZ: That is the quiet hour. Same time next week, if there is a next week, which lately is not rhetorical.',
        'REY: Eleven people.',
        'YAZ: Eleven people at four in the morning is a congregation, Rey. Amaro would tell you the same thing.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'YAZ: You did not talk once for two hours.',
      'REY: You told me not to.',
      'YAZ: Everybody talks. Everybody. You are the first person who just listened, and I am going to think about that for a while.',
    ],
    music: 'pulse-fm',
  }),
  mission({
    id: 'i04-confession', name: 'Confession', giver: 'Father Amaro', type: 'story', act: 4,
    tier: 10, requires: ['c06-tito'], reward: 36000,
    blurb: 'Amaro asks Rey to drive him to a hospice in South Glades. He does not say who for.',
    briefing: [
      'AMARO: There is a woman in a hospice in South Glades who has asked for a priest and been sent me.',
      'AMARO: I cannot drive since March. The diocese knows and is being tactful, which is worse.',
      'REY: I will take you.',
      'AMARO: You will wait outside. What happens in that room is not yours and I am not going to pretend otherwise.',
    ],
    start: { x: 560, z: 470, marker: 'M', radius: 6 },
    objectives: [
      drive('Take Amaro to South Glades', -120, 660, 20, [
        'AMARO: Forty one years. Do you know what I have learned? Nothing that fits in a car journey.',
        'AMARO: People think a priest hears secrets. Mostly I hear people apologising for things that were not their fault and refusing to mention the ones that were.',
      ]),
      idle('Wait outside the hospice', 60, -120, 660, 24, [
        'AMARO: Her name was Isabel. She ran a laundrette on Ocean Mile for thirty years.',
        'REY: ...The laundrette.',
        'AMARO: The one under the flat, yes. She kept the key for a girl who had nowhere and never once asked her what she did for money.',
      ]),
      drive('Take him back to Little Habana', 560, 470, 20, [
        'AMARO: She wanted somebody told that she was not angry. I said I would find the person.',
        'REY: Mona is not in the country.',
        'AMARO: I know. So I have told you, and now it is your problem, which is roughly how the whole church works.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'AMARO: You have that look.',
      'REY: I never asked Mona where she was from.',
      'AMARO: No. That is the one nobody ever asks. It is always the one that mattered.',
    ],
    music: 'radio-calor',
  }),
  mission({
    id: 'i05-the-university', name: 'The University', giver: 'Elena Sandoval', type: 'story', act: 5,
    tier: 11, requires: ['d08-elenas-daughter'], reward: 44000,
    blurb: "Elena's daughter wants to go back to her lectures. Elena will not let her go alone.",
    briefing: [
      'ELENA: Camila is going back to the university on Monday and she has informed me, not asked me.',
      'ELENA: I cannot send anybody of mine. She would see them, and she would be right to be insulted.',
      'REY: So you send me.',
      'ELENA: I send the man who came and got her. Which she will also see. But she will allow it, because she liked you, which she has told me twice and I have found unbearable.',
    ],
    start: { x: 620, z: -1010, marker: 'M', radius: 6 },
    objectives: [
      drive('Take Camila across the city', 230, 200, 20, [
        'CAMILA: You are not going to ask me if I am okay.',
        'REY: Do you want me to?',
        'CAMILA: No. Everybody asks. You are the only person who has not, and it is the only reason I got in the car.',
      ]),
      guard('Wait for her between lectures', 150, [
        'CAMILA: Do you know what I study? Coastal ecology. Sea grass, mostly.',
        'CAMILA: My mother moves cocaine in refrigerated trucks and I count sea grass. We do not talk about it. We have never once talked about it.',
        'REY: What would you say if you did?',
        'CAMILA: That the water she uses is dying, and she would say she knows, and then we would both have to do something. So we do not.',
      ]),
      drive('Take her home', 620, -1010, 20, [
        'CAMILA: She will be standing at the window. She has stood at that window since I was four.',
        'CAMILA: Tell her I will come to dinner. Do not tell her I said thank you, she will use it.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'ELENA: She said she would come to dinner.',
      'REY: She did.',
      'ELENA: Did she say anything else?',
      'REY: No.',
      'ELENA: ...You are a poor liar, Rey Delgado, and I am grateful for it.',
    ],
    music: 'neon-drive',
  }),
  mission({
    id: 'i06-the-hall', name: 'The Hall', giver: 'Tito Barrow', type: 'story', act: 6,
    tier: 12, requires: ['e02-rowes-warrant'], reward: 56000,
    blurb: 'The night before the last week. Everybody in one room, one last time.',
    briefing: [
      'TITO: No job tomorrow. Tonight there is food and Amaro has found wine from somewhere he will not discuss.',
      'TITO: Go and get everybody. That is the whole job. Go and get everybody and bring them here.',
    ],
    start: { x: 560, z: 470, marker: 'M', radius: 6 },
    objectives: [
      drive('Fetch Yaz from Rust Row', -1050, -820, 20, [
        'YAZ: I have been invited to a dinner. Me. I have not been invited to anything since a wedding in 2011 and I did not go to that.',
      ]),
      drive('Fetch the doctor from Saint Mercy', 430, 900, 20, [
        'DOCTOR: I have done nineteen hours. If there is wine I am going to be a problem.',
      ]),
      drive('Fetch Rosa and the pans from South Glades', -120, 660, 20, [
        'ROSA: Two hundred people I have fed out of that hall. Two hundred. And not one of you has ever washed up.',
      ]),
      drive('Get everybody back to Little Habana', 560, 470, 20),
      idle('Stay for the evening', 70, 578, 494, 24, [
        'AMARO: To the roof, which is fixed, and to everyone under it, which is a longer list than it was.',
        'YAZ: To the amplifier.',
        'TITO: To the amplifier.',
        'ROSA: I do not know what the amplifier is and I am drinking to it anyway.',
        'TITO: Rey. Say something.',
        'REY: ...I got off a bus.',
        'TITO: That will do. Sit down. Eat.',
      ]),
    ],
    fail: { onDeath: true },
    debrief: [
      'TITO: Two in the morning and Amaro is asleep in a plastic chair.',
      'TITO: Whatever happens this week, that happened. Nobody gets to take that off the board.',
    ],
    music: 'radio-calor',
  }),

  // ---- long jobs -----------------------------------------------------------
  mission({
    id: 'y-gangwar-habana', name: 'Corner by Corner', giver: 'Tito Barrow', type: 'side',
    tier: 9, requires: ['y-protection-round'], reward: 52000,
    blurb: 'Five corners in Little Habana have changed hands. Change them back, one at a time.',
    briefing: [
      'TITO: Five corners. They took them in a week while we were busy being important.',
      'TITO: You do not do all five at once. You do one, you wait, you see who comes to complain, and then you do the next one.',
    ],
    start: { x: 560, z: 470, marker: '!', radius: 6 },
    objectives: [
      sweep('Take the first corner', 596, 506, 5, 35),
      idle('Wait and see who turns up', 40, 596, 506, 26),
      sweep('Take the second corner', 524, 442, 6, 35),
      sweep('And the third', 588, 428, 6, 35, ['YAZ: They are consolidating. Last two will be together.']),
      sweep('Finish the last two together', 540, 512, 8, 45),
      cool('Let the neighbourhood settle', 160),
    ],
    fail: { onDeath: true, timeLimit: 900 },
    wantedOnStart: 1, wantedOnEnd: 0,
    debrief: ['TITO: Five corners and the bakery is open again on Sunday. That is what it was ever about.'],
  }),
  mission({
    id: 'y-boat-salvage', name: 'Salvage Rights', giver: 'Dobbs Towing', type: 'collect',
    tier: 9, requires: ['y-photo-wrecks'], reward: 48000,
    blurb: 'Eleven crates went over the side in the storm and the coastguard has stopped looking.',
    briefing: [
      'DOBBS: Eleven crates. Somewhere between the causeway and the marina.',
      'DOBBS: Salvage law in this county is four hundred years old and extremely relaxed, which is my favourite kind of law.',
    ],
    start: { x: 880, z: -680, marker: '?', radius: 6 },
    objectives: [
      find('Recover 11 crates from the shoreline', 11, { radius: 6 }),
      drive('Bring them to the yard', 160, -860, 16),
    ],
    fail: { onDeath: false, timeLimit: 1200 },
    debrief: ['DOBBS: Eleven for eleven. Two of them had somebody else name on and I have painted over it.'],
  }),
  mission({
    id: 'y-prep-crew', name: 'Putting a Crew Together', giver: 'Mona Castellanos', type: 'side',
    tier: 11, requires: ['d03-the-list'], reward: 88000,
    blurb: 'Four people, four districts, four very different arguments.',
    briefing: [
      'MONA: A driver, a technician, a face and somebody who is good at the part nobody talks about.',
      'MONA: I know all four. Three of them are not speaking to me. Go and be charming.',
    ],
    start: { x: 560, z: 470, marker: '$', radius: 6 },
    objectives: [
      at('The driver, in Ocean Mile', 820, -320, 14, ['REY: Mona sent me.', 'REY: I know. I said that badly.']),
      at('The technician, in Rust Row', -1050, -820, 14),
      at('The face, in Vice Sands', 960, 60, 14, ['REY: It is one night and a very large number.']),
      at('The last one, in Port Esperanza', 620, -1010, 14),
      drive('Bring them all to the hall', 560, 470, 18),
    ],
    fail: { onDeath: true, timeLimit: 900 },
    debrief: ['MONA: Four for four. Two of them still hate me. That is a better ratio than I deserve.'],
  }),
  mission({
    id: 'y-prep-plates', name: 'Clean Plates', giver: 'Tito Barrow', type: 'side',
    tier: 10, requires: ['c02-house-edge'], reward: 66000,
    blurb: 'Six vehicles, six sets of paperwork, none of it real and all of it convincing.',
    briefing: [
      'TITO: Six cars. Nothing flashy, nothing that anybody would look at twice.',
      'TITO: I want them all in the shop by tonight so they are somebody else by Friday.',
    ],
    start: { x: 560, z: 470, marker: '$', radius: 6 },
    objectives: [
      lift('One from Palmview', -160, -430),
      drive('To the hall', 560, 470, 16),
      lift('One from Vice Sands', 960, 60),
      drive('Back to the hall', 560, 470, 16),
      lift('One from Grand Vista', -720, -560),
      drive('And back', 560, 470, 16, ['TITO: Three more tomorrow. Do not fall asleep in the car again.']),
    ],
    fail: { onDeath: true, timeLimit: 1080 },
    debrief: ['TITO: Six cars, six identities, and not one of them will be looked at until nineteen ninety nine.'],
  }),
  mission({
    id: 'y-blackout-run', name: 'Blackout Run', giver: 'Yaz Okonkwo', type: 'delivery',
    tier: 11, requires: ['d09-cut-the-power'], reward: 92000,
    blurb: 'Nine districts, no cameras, four hours. Everything we cannot move in daylight moves now.',
    briefing: [
      'YAZ: The camera network is down and it stays down for about four days if nobody pokes it.',
      'YAZ: So tonight everything that has been sitting in a lock-up because it could not cross a junction goes across every junction in Leonida.',
    ],
    start: { x: 620, z: -1010, marker: '$', radius: 6 },
    objectives: [
      lift('Load the first van at the port', 648, -1040),
      drive('Run it to Saint Mercy', 430, 900, 18),
      drive('Second drop, Grand Vista', -720, -560, 18),
      drive('Third drop, Cypress Park', -580, 520, 18, ['YAZ: Still dark. Still nothing. This is the best night of my career.']),
      drive('Last one, the hall', 560, 470, 18),
    ],
    fail: { onDeath: true, timeLimit: 1080 },
    debrief: ['YAZ: Forty one kilometres across nine districts and there is not one frame of any of it anywhere.'],
  }),
  mission({
    id: 'y-hit-contractor', name: 'The Contractor', giver: 'Unknown Client', type: 'assassination',
    tier: 11, requires: ['y-hit-pair'], reward: 110000,
    blurb: 'A man who does exactly what you do, for someone else, and is currently better at it.',
    briefing: [
      'CLIENT: He has killed four of my people in nine weeks and I cannot find where he sleeps.',
      'CLIENT: What I can do is tell you where he will be at eleven tonight, because he is going to be there for me.',
    ],
    start: { x: -720, z: -560, marker: '!', radius: 6 },
    objectives: [
      at('Get to the meeting point', -742, -586, 12),
      hold('Survive the first three minutes', 180, -742, -586, 45, [
        'CLIENT: He knows. Of course he knows. He has known since you parked.',
      ]),
      hit('Finish it', 2),
      bolt('Get out of Grand Vista', 110),
    ],
    fail: { onDeath: true },
    debrief: ['CLIENT: Nine weeks and four people. Thank you. I will not be contacting you again, for both our sakes.'],
  }),
  mission({
    id: 'y-survive-ridge', name: 'The Long Night', giver: 'Elena Sandoval', type: 'survival',
    tier: 11, requires: ['d12-the-long-tide'], reward: 120000,
    blurb: 'Six minutes on the ridge with everything Ruiz has left coming up one road.',
    briefing: [
      'ELENA: They will come up the one road, because there is only the one road.',
      'ELENA: I need six minutes. After six minutes there is a helicopter and I stop being anybody problem.',
    ],
    start: { x: -940, z: 60, marker: '!', radius: 6 },
    objectives: [hold('Hold the ridge for six minutes', 360, -1012, 96, 50)],
    fail: { onDeath: true },
    wantedOnStart: 3,
    debrief: ['ELENA: Six minutes and eleven seconds. You are the only person who has ever given me more than I asked for.'],
  }),
  mission({
    id: 'y-final-circuit', name: 'The Whole City', giver: 'Yaz Okonkwo', type: 'collect',
    tier: 12, requires: ['e03-the-last-favour'], reward: 180000,
    blurb: 'Sixteen caches, one in every district, put there over two years for exactly this week.',
    briefing: [
      'YAZ: Sixteen. One in every district. I have been burying them since the week I met you.',
      'YAZ: Cash, papers, a gun in a bag in Cypress Park that I would like back before a dog finds it.',
      'REY: You have been planning to run since the beginning.',
      'YAZ: I have been planning to be able to run since the beginning. It is not the same thing and I would like you to remember the difference.',
    ],
    start: { x: -1050, z: -820, marker: '?', radius: 6 },
    objectives: [
      find('Dig up all sixteen caches', 16, { radius: 6 }),
      drive('Bring everything to the hall', 560, 470, 18),
    ],
    fail: { onDeath: false, timeLimit: 1500 },
    debrief: [
      'YAZ: Sixteen for sixteen. Two years of being frightened, in a bag, on a table in a church hall.',
      'TITO: And now?',
      'YAZ: Now I am not frightened, and I have nowhere to put any of it, which is somehow worse.',
    ],
  }),
];

// ---------------------------------------------------------------------------
export const CAMPAIGN_MISSIONS = Object.freeze([
  ...ACT_II, ...ACT_III, ...ACT_IV, ...ACT_V, ...ACT_VI, ...INTERLUDES, ...SIDE_WORK,
]);

/** Act titles, for the story menu and the pause screen. */
export const ACTS = Object.freeze({
  1: 'Act I — Coming Ashore',
  2: 'Act II — Salt and Static',
  3: 'Act III — The Concrete Season',
  4: 'Act IV — Paper Kingdom',
  5: 'Act V — The Long Tide',
  6: 'Act VI — Leonida',
});
