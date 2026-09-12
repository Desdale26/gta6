// missionCatalog.js — the story arc and every side job in Leonida.
//
// The story follows Rey Delgado, freshly off a bus from nowhere, and the people who decide
// what he's worth: Mona Castellanos (fixer), Tito Barrow (chop shop), Detective Ruiz (a
// problem), and the Marlin brothers (a bigger problem).

export const MISSIONS = Object.freeze([
  // ───────────────────────────── story ─────────────────────────────
  {
    id: 's01-fresh-off-the-bus', name: 'Fresh Off the Bus', giver: 'Mona Castellanos', type: 'story',
    tier: 1, requires: [], reward: 1200, rewardRep: 10,
    blurb: 'Mona needs a car moved. No questions, no scratches.',
    briefing: [
      'MONA: You look like a man with no plan and no money. Good. Easier to talk to.',
      'MONA: There is a car on Ocean Mile. It is not mine. It is about to be.',
      'MONA: Take it to Tito at the Foundry. Do not stop for anything with lights on it.',
    ],
    start: { x: 806, z: -300, marker: 'M', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Find the car on Ocean Mile', x: 760, z: -360, radius: 8, marker: 'goto' },
      { kind: 'steal', text: 'Take the car', x: 760, z: -360, radius: 6, marker: 'pickup' },
      { kind: 'deliver', text: 'Deliver it to Tito at the Foundry', x: 170, z: -840, radius: 12, inVehicle: true, marker: 'dropoff' },
    ],
    fail: { onDeath: true, onVehicleDestroyed: true },
    music: 'neon-drive',
  },
  {
    id: 's02-tito-cut', name: "Tito's Cut", giver: 'Tito Barrow', type: 'story',
    tier: 1, requires: ['s01-fresh-off-the-bus'], reward: 2000, rewardRep: 14,
    blurb: 'Three cars, one night, one very impatient man.',
    briefing: [
      'TITO: Mona says you drive. Mona says a lot of things.',
      'TITO: Three cars on my list. Bring them here before the shift ends.',
      'TITO: Scratch them and I take it out of your share. Then out of you.',
    ],
    start: { x: 170, z: -840, marker: 'M', radius: 6 },
    objectives: [
      { kind: 'steal', text: 'Steal the first car in Centro', x: 320, z: -150, radius: 30, marker: 'pickup' },
      { kind: 'deliver', text: 'Drop it at the Foundry', x: 170, z: -840, radius: 12, inVehicle: true, marker: 'dropoff' },
      { kind: 'steal', text: 'Steal the second car in Palmview', x: -170, z: -420, radius: 30, marker: 'pickup' },
      { kind: 'deliver', text: 'Drop it at the Foundry', x: 170, z: -840, radius: 12, inVehicle: true, marker: 'dropoff' },
    ],
    fail: { onDeath: true, timeLimit: 420 },
    music: 'kult-fm',
  },
  {
    id: 's03-corner-office', name: 'Corner Office', giver: 'Mona Castellanos', type: 'story',
    tier: 2, requires: ['s02-tito-cut'], reward: 3500, rewardRep: 18,
    blurb: 'A convenience store owner stopped paying. Mona wants that corrected.',
    briefing: [
      'MONA: There is a man on Saint Mercy who has decided he is brave.',
      'MONA: I do not want him hurt. I want him reminded.',
      'MONA: Empty his till. Leave the shelves. He will understand.',
    ],
    start: { x: 430, z: 880, marker: 'M', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Get to the store in Saint Mercy', x: 448, z: 902, radius: 10, marker: 'goto' },
      { kind: 'rob', text: 'Rob the till', x: 448, z: 902, radius: 12, marker: 'goto' },
      { kind: 'losewanted', text: 'Lose the police', seconds: 90 },
    ],
    fail: { onDeath: true },
    wantedOnEnd: 0, music: 'radio-calor',
  },
  {
    id: 's04-the-marlin-problem', name: 'The Marlin Problem', giver: 'Tito Barrow', type: 'story',
    tier: 2, requires: ['s03-corner-office'], reward: 5200, rewardRep: 22,
    blurb: 'The Marlin brothers took a shipment that was not theirs.',
    briefing: [
      'TITO: Two crates came off a boat at Port Esperanza last night. Neither of them made it to me.',
      'TITO: The Marlins think they are untouchable because their uncle owns a marina.',
      'TITO: Go touch them.',
    ],
    start: { x: 620, z: -1000, marker: '!', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Reach the docks', x: 640, z: -1020, radius: 14, marker: 'goto' },
      { kind: 'killAll', text: 'Clear out the Marlin crew', x: 640, z: -1020, radius: 45, count: 6, marker: 'kill' },
      { kind: 'collect', text: 'Recover the crates', x: 664, z: -1038, radius: 10, count: 2, marker: 'pickup' },
      { kind: 'deliver', text: 'Get the crates back to Tito', x: 170, z: -840, radius: 12, inVehicle: true, marker: 'dropoff' },
    ],
    fail: { onDeath: true },
    music: 'iron-lung',
  },
  {
    id: 's05-detective-ruiz', name: 'Detective Ruiz', giver: 'Mona Castellanos', type: 'story',
    tier: 3, requires: ['s04-the-marlin-problem'], reward: 7000, rewardRep: 26,
    blurb: 'Someone has been photographing the Foundry. Find out who paid for the film.',
    briefing: [
      'MONA: A detective named Ruiz has been taking pictures of my business.',
      'MONA: He keeps a car outside Meridian. Inside it is a folder.',
      'MONA: Get the folder. Ruiz keeps his temper in the glovebox too, so be quick.',
    ],
    start: { x: 230, z: 200, marker: 'M', radius: 6 },
    objectives: [
      { kind: 'goto', text: "Find Ruiz's car in Meridian", x: 262, z: 168, radius: 10, marker: 'goto' },
      { kind: 'steal', text: "Take Ruiz's car", x: 262, z: 168, radius: 8, marker: 'pickup' },
      { kind: 'escape', text: 'Lose the tail', seconds: 75, marker: 'goto' },
      { kind: 'deliver', text: 'Bring the car to Mona', x: 820, z: -320, radius: 12, inVehicle: true, marker: 'dropoff' },
    ],
    fail: { onDeath: true, onVehicleDestroyed: true },
    wantedOnStart: 2, music: 'the-signal',
  },
  {
    id: 's06-night-shipment', name: 'Night Shipment', giver: 'Tito Barrow', type: 'story',
    tier: 3, requires: ['s05-detective-ruiz'], reward: 9000, rewardRep: 30,
    blurb: 'A truck is crossing the causeway at midnight. It should not reach the other side.',
    briefing: [
      'TITO: Armoured truck. Causeway. Midnight. It belongs to the Marlins now.',
      'TITO: I want it to belong to us by twelve-oh-five.',
      'TITO: Ram it, shoot it, ask it nicely. I do not care.',
    ],
    start: { x: 620, z: -1000, marker: 'M', radius: 6 },
    objectives: [
      { kind: 'chase', text: 'Catch the armoured truck', targetVehicle: 'armored-truck', x: 400, z: -700, radius: 20, marker: 'kill' },
      { kind: 'destroy', text: 'Stop the truck', count: 1, marker: 'kill' },
      { kind: 'collect', text: 'Grab the cash', count: 3, radius: 14, marker: 'pickup' },
      { kind: 'escape', text: 'Get clear', seconds: 90 },
    ],
    fail: { onDeath: true, timeLimit: 300 },
    wantedOnStart: 3, music: 'iron-lung',
  },
  {
    id: 's07-the-jeweller', name: 'The Jeweller', giver: 'Mona Castellanos', type: 'heist',
    tier: 4, requires: ['s06-night-shipment'], reward: 18000, rewardRep: 40,
    blurb: 'Ocean Mile jewellers. Four minutes inside, no longer.',
    briefing: [
      'MONA: Ocean Mile. Glass cases, two guards, one silent alarm.',
      'MONA: Four minutes from the door to the car. After that the response time stops being funny.',
      'MONA: Nobody dies unless they insist.',
    ],
    start: { x: 838, z: -290, marker: '$', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Get to the jewellers', x: 846, z: -302, radius: 10, marker: 'goto' },
      { kind: 'rob', text: 'Clear the cases and the safe', x: 846, z: -302, radius: 12, marker: 'goto' },
      { kind: 'escape', text: 'Get out of the district', seconds: 120, marker: 'goto' },
      { kind: 'deliver', text: 'Drop the take with Mona', x: 820, z: -320, radius: 12, marker: 'dropoff' },
    ],
    fail: { onDeath: true, timeLimit: 420 },
    wantedOnStart: 0, music: 'neon-drive',
  },
  {
    id: 's08-ruiz-returns', name: 'Ruiz Returns', giver: 'Mona Castellanos', type: 'story',
    tier: 4, requires: ['s07-the-jeweller'], reward: 12000, rewardRep: 34,
    blurb: 'Ruiz has a warrant, a car and a very short list of names. You are on it.',
    briefing: [
      'MONA: He has your name now. That was always going to happen.',
      'MONA: He is running a checkpoint on the causeway. Go through it, not around it.',
      'MONA: And Rey — he will not arrest you. Be ready for that.',
    ],
    start: { x: 400, z: -600, marker: '!', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Approach the checkpoint', x: 300, z: -640, radius: 20, marker: 'goto' },
      { kind: 'survive', text: 'Survive the ambush', seconds: 100, marker: 'kill' },
      { kind: 'losewanted', text: 'Lose the heat', seconds: 120 },
    ],
    fail: { onDeath: true },
    wantedOnStart: 4, music: 'iron-lung',
  },
  {
    id: 's09-marina-favour', name: 'A Favour at the Marina', giver: 'Tito Barrow', type: 'story',
    tier: 5, requires: ['s08-ruiz-returns'], reward: 15000, rewardRep: 38,
    blurb: "The Marlins' uncle keeps a boat. Tito would like it to be somewhere else.",
    briefing: [
      'TITO: Marina del Sol, berth nineteen. White speedboat, red stripe, ugly name.',
      'TITO: Take it south along the coast. I have people waiting.',
      'TITO: If you sink it, swim home. I mean that literally.',
    ],
    start: { x: 880, z: -680, marker: 'M', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Get to berth nineteen', x: 930, z: -700, radius: 10, marker: 'goto' },
      { kind: 'steal', text: 'Take the speedboat', x: 934, z: -706, radius: 8, marker: 'pickup' },
      { kind: 'deliver', text: 'Run the coast south', x: 1080, z: 420, radius: 22, inVehicle: true, marker: 'dropoff' },
    ],
    fail: { onDeath: true, onVehicleDestroyed: true },
    wantedOnStart: 2, music: 'blue-horizon',
  },
  {
    id: 's10-hostile-takeover', name: 'Hostile Takeover', giver: 'Mona Castellanos', type: 'story',
    tier: 5, requires: ['s09-marina-favour'], reward: 22000, rewardRep: 46,
    blurb: 'The Marlins are meeting in Little Habana. End the meeting.',
    briefing: [
      'MONA: All three brothers, one table, one room above a restaurant.',
      'MONA: This is the part where we stop being a business and start being a problem.',
      'MONA: Go and be a problem.',
    ],
    start: { x: 560, z: 470, marker: '!', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Reach Little Habana', x: 576, z: 486, radius: 14, marker: 'goto' },
      { kind: 'killAll', text: 'Take out the Marlin crew', x: 576, z: 486, radius: 50, count: 9, marker: 'kill' },
      { kind: 'escape', text: 'Get out before the response arrives', seconds: 110 },
    ],
    fail: { onDeath: true },
    wantedOnStart: 3, music: 'iron-lung',
  },
  {
    id: 's11-the-vault', name: 'The Vault', giver: 'Mona Castellanos', type: 'heist',
    tier: 6, requires: ['s10-hostile-takeover'], reward: 60000, rewardRep: 70,
    blurb: 'Meridian Financial. The big one. Nothing about this is clever — it is just loud.',
    briefing: [
      'MONA: Meridian Financial, ground floor vault, forty seconds on the drill if it behaves.',
      'MONA: Every unit in the city will come. That is not a risk, it is the schedule.',
      'MONA: Get in, get the vault, and be gone before the helicopter is in the air.',
    ],
    start: { x: 230, z: 200, marker: '$', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Enter Meridian Financial', x: 246, z: 214, radius: 10, marker: 'goto' },
      { kind: 'rob', text: 'Crack the vault', x: 246, z: 214, radius: 14, marker: 'goto' },
      { kind: 'escape', text: 'Escape the financial district', seconds: 150, marker: 'goto' },
      { kind: 'losewanted', text: 'Lose five stars', seconds: 180 },
    ],
    fail: { onDeath: true },
    wantedOnStart: 0, music: 'pulse-fm',
  },
  {
    id: 's12-last-bus-out', name: 'Last Bus Out', giver: 'Mona Castellanos', type: 'story',
    tier: 7, requires: ['s11-the-vault'], reward: 75000, rewardRep: 90,
    blurb: 'Ruiz found the Foundry. Mona has a plane. There is one seat.',
    briefing: [
      'MONA: Ruiz has the Foundry surrounded and Tito is not answering.',
      'MONA: There is a plane at Leonida International in eleven minutes.',
      'MONA: You can go and get Tito, or you can get on the plane. I already know which.',
    ],
    start: { x: 170, z: -840, marker: '!', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Get to the Foundry', x: 170, z: -845, radius: 14, marker: 'goto' },
      { kind: 'protect', text: 'Keep Tito alive', seconds: 120, marker: 'kill' },
      { kind: 'deliver', text: 'Drive Tito to the airport', x: -420, z: -1090, radius: 24, inVehicle: true, marker: 'dropoff' },
      { kind: 'losewanted', text: 'Lose the last of them', seconds: 120 },
    ],
    fail: { onDeath: true, timeLimit: 660 },
    wantedOnStart: 4, music: 'iron-lung',
  },

  // ───────────────────────────── side work ─────────────────────────────
  {
    id: 'x-taxi-shift', name: 'Taxi Shift', giver: 'Dispatch', type: 'taxi',
    tier: 1, requires: [], reward: 900, rewardRep: 4,
    blurb: 'Pick up fares, get them there, do not total the cab.',
    briefing: ['DISPATCH: Meter is running. Try not to make the passengers scream.'],
    start: { x: 392, z: -66, marker: '$', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Pick up the fare', x: 420, z: -30, radius: 8, marker: 'pickup' },
      { kind: 'deliver', text: 'Drop them at the marina', x: 880, z: -680, radius: 14, inVehicle: true, marker: 'dropoff' },
      { kind: 'goto', text: 'Pick up the next fare', x: 900, z: -600, radius: 8, marker: 'pickup' },
      { kind: 'deliver', text: 'Drop them in Palmview', x: -160, z: -430, radius: 14, inVehicle: true, marker: 'dropoff' },
    ],
    fail: { onDeath: true, timeLimit: 480 },
  },
  {
    id: 'x-delivery-run', name: 'Delivery Run', giver: 'Quick Freight', type: 'delivery',
    tier: 1, requires: [], reward: 1100, rewardRep: 5,
    blurb: 'Four drops across the city. The clock is the whole job.',
    briefing: ['FOREMAN: Four boxes, four addresses, one afternoon. Go.'],
    start: { x: 160, z: -860, marker: '$', radius: 6 },
    objectives: [
      { kind: 'deliver', text: 'Drop one: Centro', x: 340, z: -140, radius: 12, inVehicle: true, marker: 'dropoff' },
      { kind: 'deliver', text: 'Drop two: Vice Sands', x: 960, z: 60, radius: 12, inVehicle: true, marker: 'dropoff' },
      { kind: 'deliver', text: 'Drop three: Saint Mercy', x: 430, z: 900, radius: 12, inVehicle: true, marker: 'dropoff' },
      { kind: 'deliver', text: 'Drop four: Grand Vista', x: -720, z: -560, radius: 12, inVehicle: true, marker: 'dropoff' },
    ],
    fail: { onDeath: true, timeLimit: 540 },
  },
  {
    id: 'x-race-oceanmile', name: 'Ocean Mile Sprint', giver: 'Street Racers', type: 'race',
    tier: 2, requires: [], reward: 2600, rewardRep: 8,
    blurb: 'Point to point down the strip. No rules, obviously.',
    briefing: ['RACER: Neon to neon. First one to the pier keeps the pot.'],
    start: { x: 820, z: -320, marker: 'R', radius: 6 },
    objectives: [
      { kind: 'race', text: 'Win the sprint', inVehicle: true, marker: 'checkpoint',
        checkpoints: [[830, -240], [880, -120], [960, -20], [1010, 90], [1040, -180]] },
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 240 },
  },
  {
    id: 'x-race-hills', name: 'Mirador Descent', giver: 'Street Racers', type: 'race',
    tier: 3, requires: ['x-race-oceanmile'], reward: 4200, rewardRep: 12,
    blurb: 'Down the hill road. Brakes are a suggestion.',
    briefing: ['RACER: Twelve corners, no barriers, one ambulance on standby. Usually enough.'],
    start: { x: -940, z: 60, marker: 'R', radius: 6 },
    objectives: [
      { kind: 'race', text: 'Win the descent', inVehicle: true, marker: 'checkpoint',
        checkpoints: [[-880, 140], [-800, 260], [-700, 360], [-620, 470], [-560, 520]] },
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 260 },
  },
  {
    id: 'x-race-docks', name: 'Port Circuit', giver: 'Street Racers', type: 'race',
    tier: 3, requires: ['x-race-oceanmile'], reward: 3800, rewardRep: 11,
    blurb: 'Three laps between the containers.',
    briefing: ['RACER: Tight, dark, and full of forklifts. Have fun.'],
    start: { x: 620, z: -1000, marker: 'R', radius: 6 },
    objectives: [
      { kind: 'race', text: 'Three laps of the port', inVehicle: true, marker: 'checkpoint',
        checkpoints: [[700, -1040], [740, -940], [620, -900], [540, -980], [620, -1000]] },
    ],
    fail: { onDeath: true, timeLimit: 300 },
  },
  {
    id: 'x-race-airport', name: 'Runway Drag', giver: 'Street Racers', type: 'race',
    tier: 4, requires: ['x-race-hills'], reward: 6000, rewardRep: 15,
    blurb: 'Straight line. Top speed. That is the whole event.',
    briefing: ['RACER: Nobody lands here after dark. Probably.'],
    start: { x: -420, z: -1090, marker: 'R', radius: 6 },
    objectives: [
      { kind: 'race', text: 'Win the drag', inVehicle: true, marker: 'checkpoint',
        checkpoints: [[-300, -1140], [-120, -1180], [80, -1200]] },
    ],
    fail: { onDeath: true, timeLimit: 180 },
  },
  {
    id: 'x-rampage-foundry', name: 'Foundry Rampage', giver: 'Anonymous', type: 'rampage',
    tier: 3, requires: [], reward: 3400, rewardRep: 10,
    blurb: 'Someone left a crate of weapons and a grudge.',
    briefing: ['NOTE: Twelve of them. Two minutes. The crate is yours either way.'],
    start: { x: 200, z: -880, marker: '!', radius: 6 },
    objectives: [
      { kind: 'kill', text: 'Take out 12 targets in the time limit', count: 12, seconds: 120, marker: 'kill' },
    ],
    fail: { onDeath: true, timeLimit: 120 },
    wantedOnStart: 2,
  },
  {
    id: 'x-rampage-rustrow', name: 'Rust Row Rampage', giver: 'Anonymous', type: 'rampage',
    tier: 4, requires: ['x-rampage-foundry'], reward: 5000, rewardRep: 14,
    blurb: 'Same deal, worse neighbourhood, better weapon.',
    briefing: ['NOTE: Fifteen. Ninety seconds. Do not think about it too hard.'],
    start: { x: -1050, z: -820, marker: '!', radius: 6 },
    objectives: [
      { kind: 'kill', text: 'Take out 15 targets', count: 15, seconds: 90, marker: 'kill' },
    ],
    fail: { onDeath: true, timeLimit: 90 },
    wantedOnStart: 2,
  },
  {
    id: 'x-hit-broker', name: 'The Broker', giver: 'Unknown Client', type: 'assassination',
    tier: 4, requires: ['s05-detective-ruiz'], reward: 8000, rewardRep: 18,
    blurb: 'A man in Meridian sold the wrong information to the wrong people.',
    briefing: ['CLIENT: Grey suit, top floor, walks to lunch at one. Make it look like traffic.'],
    start: { x: 250, z: 150, marker: '!', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Get into position in Meridian', x: 268, z: 176, radius: 14, marker: 'goto' },
      { kind: 'kill', text: 'Eliminate the broker', count: 1, marker: 'kill' },
      { kind: 'escape', text: 'Leave the district', seconds: 90 },
    ],
    fail: { onDeath: true, onTargetEscaped: true },
  },
  {
    id: 'x-hit-marina', name: 'Berth Nineteen', giver: 'Unknown Client', type: 'assassination',
    tier: 5, requires: ['x-hit-broker'], reward: 11000, rewardRep: 22,
    blurb: 'A quiet job at the marina. Quiet is the requirement, not the suggestion.',
    briefing: ['CLIENT: He is on the boat until sunset. After that he is on a plane and not my problem.'],
    start: { x: 880, z: -680, marker: '!', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Reach the marina', x: 910, z: -700, radius: 12, marker: 'goto' },
      { kind: 'kill', text: 'Eliminate the target', count: 1, marker: 'kill' },
      { kind: 'escape', text: 'Disappear', seconds: 80 },
    ],
    fail: { onDeath: true, onTargetEscaped: true },
  },
  {
    id: 'x-chase-informant', name: 'The Informant', giver: 'Tito Barrow', type: 'chase',
    tier: 3, requires: ['s04-the-marlin-problem'], reward: 4400, rewardRep: 13,
    blurb: 'He is running. He is not running fast enough.',
    briefing: ['TITO: Blue hatchback, heading north. Bring him back or bring back the car. Either.'],
    start: { x: 340, z: -140, marker: '!', radius: 6 },
    objectives: [
      { kind: 'chase', text: 'Catch the informant', x: 200, z: -300, radius: 16, inVehicle: true, marker: 'kill' },
      { kind: 'destroy', text: 'Stop his car', count: 1, marker: 'kill' },
    ],
    fail: { onDeath: true, onTargetEscaped: true, timeLimit: 200 },
  },
  {
    id: 'x-escort-mona', name: 'Escort Duty', giver: 'Mona Castellanos', type: 'escort',
    tier: 4, requires: ['s06-night-shipment'], reward: 7500, rewardRep: 20,
    blurb: 'Mona has a meeting across town and a lot of enemies between here and there.',
    briefing: ['MONA: Drive. If anything follows us, deal with it at the next set of lights.'],
    start: { x: 820, z: -320, marker: 'M', radius: 6 },
    objectives: [
      { kind: 'protect', text: 'Keep Mona alive', seconds: 150, marker: 'goto' },
      { kind: 'deliver', text: 'Get her to Centro', x: 340, z: -140, radius: 14, inVehicle: true, marker: 'dropoff' },
    ],
    fail: { onDeath: true },
    wantedOnStart: 1,
  },
  {
    id: 'x-survive-docks', name: 'Held at the Port', giver: 'Tito Barrow', type: 'survival',
    tier: 5, requires: ['s09-marina-favour'], reward: 9500, rewardRep: 24,
    blurb: 'Hold the dock until the boat leaves. Three minutes.',
    briefing: ['TITO: The boat needs three minutes. You need to give it three minutes.'],
    start: { x: 640, z: -1020, marker: '!', radius: 6 },
    objectives: [
      { kind: 'survive', text: 'Hold the dock for 3 minutes', seconds: 180, x: 640, z: -1020, radius: 40, marker: 'kill' },
    ],
    fail: { onDeath: true },
    wantedOnStart: 3,
  },
  {
    id: 'x-stunt-tour', name: 'Stunt Tour', giver: 'Skate Crew', type: 'stunt',
    tier: 2, requires: [], reward: 3000, rewardRep: 9,
    blurb: 'Hit three named jumps in one run without wrecking.',
    briefing: ['SKATER: Canal ramp, pier launch, boardwalk wall. One run. Go.'],
    start: { x: -148, z: -60, marker: 'S', radius: 6 },
    objectives: [
      { kind: 'stunt', text: 'Land the Canal Megaramp', x: -148, z: -60, radius: 40, marker: 'checkpoint' },
      { kind: 'stunt', text: 'Land the Pier Launch', x: 1040, z: -180, radius: 40, marker: 'checkpoint' },
      { kind: 'stunt', text: 'Land the Boardwalk Wallride', x: 1008, z: 120, radius: 40, marker: 'checkpoint' },
    ],
    fail: { onDeath: true, onVehicleDestroyed: true, timeLimit: 420 },
  },
  {
    id: 'x-stunt-airtime', name: 'Air Miles', giver: 'Skate Crew', type: 'stunt',
    tier: 3, requires: ['x-stunt-tour'], reward: 4600, rewardRep: 13,
    blurb: 'Bank 12 seconds of total air time. Any ramp counts.',
    briefing: ['SKATER: Twelve seconds off the ground. Cumulative. Gravity is the only judge.'],
    start: { x: -560, z: 470, marker: 'S', radius: 6 },
    objectives: [
      { kind: 'stunt', text: 'Bank 12 seconds of air time', seconds: 12, count: 1, marker: 'checkpoint' },
    ],
    fail: { onDeath: true, timeLimit: 360 },
  },
  {
    id: 'x-collect-postcards', name: 'Postcards', giver: 'Curiosity', type: 'collect',
    tier: 1, requires: [], reward: 2500, rewardRep: 6,
    blurb: 'Someone scattered souvenir postcards across the city.',
    briefing: ['NOTE: Ten of them. They are where you would expect and three places you would not.'],
    start: { x: 960, z: 60, marker: '?', radius: 6 },
    objectives: [
      { kind: 'collect', text: 'Find 10 postcards', count: 10, radius: 4, marker: 'pickup' },
    ],
    fail: { onDeath: false },
  },
  {
    id: 'x-collect-parts', name: "Parts List", giver: 'Tito Barrow', type: 'collect',
    tier: 2, requires: ['s02-tito-cut'], reward: 3200, rewardRep: 8,
    blurb: 'Six specific parts. Six specific cars. Tito was very clear.',
    briefing: ['TITO: Six parts. I wrote them down because you will forget. Do not lose the list.'],
    start: { x: 170, z: -840, marker: '$', radius: 6 },
    objectives: [
      { kind: 'collect', text: 'Recover 6 parts', count: 6, radius: 5, marker: 'pickup' },
      { kind: 'deliver', text: 'Return them to the Foundry', x: 170, z: -840, radius: 12, marker: 'dropoff' },
    ],
    fail: { onDeath: true },
  },
  {
    id: 'x-heist-supermarket', name: 'Grand Vista Job', giver: 'Mona Castellanos', type: 'heist',
    tier: 3, requires: ['s03-corner-office'], reward: 6800, rewardRep: 16,
    blurb: 'Mall supermarket, end of day, five tills full of the weekend.',
    briefing: [
      'MONA: Sunday evening. Five tills. One security guard who does not get paid enough.',
      'MONA: Be out before the shutters come down or you are locked in with him.',
    ],
    start: { x: -720, z: -560, marker: '$', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Reach the supermarket', x: -734, z: -574, radius: 12, marker: 'goto' },
      { kind: 'rob', text: 'Clear the tills and the safe', x: -734, z: -574, radius: 14, marker: 'goto' },
      { kind: 'escape', text: 'Get out of Grand Vista', seconds: 100 },
    ],
    fail: { onDeath: true, timeLimit: 330 },
  },
  {
    id: 'x-photo-skyline', name: 'Postcard Perfect', giver: 'Photographer', type: 'side',
    tier: 2, requires: [], reward: 1800, rewardRep: 5,
    blurb: 'Four photos from four rooftops. Bring a car that climbs.',
    briefing: ['PHOTOGRAPHER: Four viewpoints, golden hour, no people in shot. Good luck with the last part.'],
    start: { x: 340, z: -140, marker: '?', radius: 6 },
    objectives: [
      { kind: 'photo', text: 'Photograph the Centro skyline', x: 330, z: -210, radius: 18, marker: 'checkpoint' },
      { kind: 'photo', text: 'Photograph the marina at dusk', x: 880, z: -680, radius: 18, marker: 'checkpoint' },
      { kind: 'photo', text: 'Photograph the hills road', x: -940, z: 60, radius: 18, marker: 'checkpoint' },
      { kind: 'photo', text: 'Photograph the pier', x: 1040, z: -180, radius: 18, marker: 'checkpoint' },
    ],
    fail: { onDeath: false, timeLimit: 600 },
  },
  {
    id: 'x-wait-stakeout', name: 'Stakeout', giver: 'Mona Castellanos', type: 'side',
    tier: 3, requires: ['s04-the-marlin-problem'], reward: 3600, rewardRep: 9,
    blurb: 'Sit outside a warehouse and watch who goes in. Bring a radio station you like.',
    briefing: ['MONA: Two minutes of nothing happening, then something happens. Be there for both.'],
    start: { x: 620, z: -1000, marker: '?', radius: 6 },
    objectives: [
      { kind: 'goto', text: 'Park across from the warehouse', x: 668, z: -1004, radius: 10, inVehicle: true, marker: 'goto' },
      { kind: 'wait', text: 'Watch the warehouse', seconds: 100, x: 668, z: -1004, radius: 22 },
      { kind: 'chase', text: 'Follow the van that leaves', x: 600, z: -900, radius: 18, inVehicle: true, marker: 'kill' },
    ],
    fail: { onDeath: true, onTargetEscaped: true },
  },
  {
    id: 'x-losewanted-drill', name: 'Heat Training', giver: 'Tito Barrow', type: 'side',
    tier: 2, requires: ['s02-tito-cut'], reward: 2200, rewardRep: 7,
    blurb: 'Tito wants to know you can shake a tail before he trusts you with anything expensive.',
    briefing: ['TITO: I am going to call in a stolen plate. Yours. Lose them and I will know you are worth paying.'],
    start: { x: 170, z: -840, marker: '?', radius: 6 },
    objectives: [
      { kind: 'losewanted', text: 'Shake three stars', seconds: 150 },
    ],
    fail: { onDeath: true },
    wantedOnStart: 3,
  },
]);

const byId = new Map(MISSIONS.map((m) => [m.id, m]));
export function getMission(id) { return byId.get(id); }

/** Missions whose prerequisites are all complete and which are not done yet. */
export function availableMissions(completedSet, stats = {}) {
  const done = completedSet instanceof Set ? completedSet : new Set(completedSet || []);
  return MISSIONS.filter((m) => {
    if (done.has(m.id)) return false;
    for (const r of m.requires) if (!done.has(r)) return false;
    if (m.minRep && (stats.rep || 0) < m.minRep) return false;
    return true;
  });
}

const OBJECTIVE_KINDS = new Set(['goto', 'kill', 'killAll', 'steal', 'deliver', 'survive', 'race',
  'destroy', 'rob', 'escape', 'protect', 'collect', 'wait', 'photo', 'chase', 'stunt', 'losewanted']);

export function validateMissions() {
  const problems = [];
  const ids = new Set();
  for (const m of MISSIONS) {
    if (ids.has(m.id)) problems.push(`duplicate mission ${m.id}`);
    ids.add(m.id);
  }
  for (const m of MISSIONS) {
    for (const r of m.requires) if (!ids.has(r)) problems.push(`${m.id}: unknown requirement ${r}`);
    if (m.start.x < -1500 || m.start.x > 1100 || m.start.z < -1500 || m.start.z > 1500) {
      problems.push(`${m.id}: start out of range`);
    }
    if (!m.objectives.length) problems.push(`${m.id}: no objectives`);
    if (!m.briefing.length) problems.push(`${m.id}: no briefing`);
    if (m.reward <= 0) problems.push(`${m.id}: non-positive reward`);
    for (const o of m.objectives) {
      if (!OBJECTIVE_KINDS.has(o.kind)) { problems.push(`${m.id}: unknown objective kind ${o.kind}`); continue; }
      if (!o.text) problems.push(`${m.id}: objective without text`);
      if (['goto', 'deliver'].includes(o.kind) && (o.x === undefined || o.z === undefined)) {
        problems.push(`${m.id}/${o.kind}: needs x,z`);
      }
      if (['survive', 'wait', 'escape', 'losewanted'].includes(o.kind) && !o.seconds) {
        problems.push(`${m.id}/${o.kind}: needs seconds`);
      }
      if (o.kind === 'race' && (!o.checkpoints || o.checkpoints.length < 2)) {
        problems.push(`${m.id}/race: needs at least 2 checkpoints`);
      }
      if (['kill', 'killAll', 'collect', 'destroy'].includes(o.kind) && !o.count) {
        problems.push(`${m.id}/${o.kind}: needs count`);
      }
      if (o.x !== undefined && (o.x < -1550 || o.x > 1150 || o.z < -1550 || o.z > 1550)) {
        problems.push(`${m.id}/${o.kind}: coordinate out of range`);
      }
    }
  }
  // DAG check via topological sort
  const indeg = new Map(MISSIONS.map((m) => [m.id, m.requires.length]));
  const dependents = new Map();
  for (const m of MISSIONS) for (const r of m.requires) {
    if (!dependents.has(r)) dependents.set(r, []);
    dependents.get(r).push(m.id);
  }
  const queue = MISSIONS.filter((m) => m.requires.length === 0).map((m) => m.id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift();
    visited++;
    for (const d of dependents.get(id) || []) {
      indeg.set(d, indeg.get(d) - 1);
      if (indeg.get(d) === 0) queue.push(d);
    }
  }
  if (visited !== MISSIONS.length) problems.push(`mission graph has a cycle (${visited}/${MISSIONS.length} reachable)`);

  const story = MISSIONS.filter((m) => m.type === 'story' || m.type === 'heist');
  if (story.length < 10) problems.push(`only ${story.length} story/heist missions`);
  if (MISSIONS.length < 24) problems.push(`only ${MISSIONS.length} missions`);
  // rewards should broadly rise with tier
  const byTier = new Map();
  for (const m of MISSIONS) {
    if (!byTier.has(m.tier)) byTier.set(m.tier, []);
    byTier.get(m.tier).push(m.reward);
  }
  const tiers = [...byTier.keys()].sort((a, b) => a - b);
  for (let i = 1; i < tiers.length; i++) {
    const prev = Math.max(...byTier.get(tiers[i - 1]));
    const cur = Math.max(...byTier.get(tiers[i]));
    if (cur < prev) problems.push(`tier ${tiers[i]} max reward (${cur}) below tier ${tiers[i - 1]} (${prev})`);
  }
  return problems;
}
