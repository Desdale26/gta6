// pedCatalog.js — pure data: every pedestrian archetype in Vice Coast: Leonida.
//
// No imports, no side effects, no THREE, no DOM. Consumed by entities/ped.js
// (stats, health, speed), entities/pedBody.js (height/build/palette/outfit/props),
// entities/pedestrians.js (spawn weighting, schedules, hours), gameplay/wanted.js
// (cops, gangs) and ui/dialogs.js + audio (barks).
//
// Conventions:
//   weight      relative ambient spawn weight inside a matching district/hour
//   height      [min,max] metres, sampled per instance (contract band 1.45..2.05)
//   build       [min,max] 0.8 thin .. 1.35 heavy
//   speed       m/s; walk is the ambient stroll, jog is "late for something",
//               run is the full flee/chase gait
//   stats       0..1 — bravery (will they stand their ground), aggression (will they
//               start it), wealth (drop money / vehicle class), fitness (stamina,
//               climbing), awareness (how early they notice a gun or a car)
//   schedule    contiguous [from,to) hour bands that MUST tile 0..24 exactly
//   hours       spawn window, may wrap midnight (e.g. [20, 4])
//   districts   district *styles* they appear in; [] means anywhere
//
// Every name, brand, band, slogan and catchphrase here is invented parody.
// Any resemblance to a real person, company, song or trademark is coincidental.

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const PED_SEXES = Object.freeze(['m', 'f', 'x']);

export const PED_OUTFITS = Object.freeze([
  'casual', 'suit', 'beach', 'tourist', 'worker', 'jogger', 'biker', 'gang', 'cop', 'medic',
  'fire', 'chef', 'nurse', 'security', 'punk', 'skater', 'elder', 'rich', 'homeless',
  'lifeguard', 'dealer', 'military',
]);

export const PED_ACTS = Object.freeze([
  'home', 'work', 'shop', 'beach', 'gym', 'bar', 'park', 'wander', 'commute',
]);

export const PED_PROPS = Object.freeze([
  'phone', 'bag', 'umbrella', 'skateboard', 'coffee', 'briefcase', 'dog', 'camera', 'surfboard',
  'cane', 'backpack', 'toolbox', 'hardhat', 'clipboard', 'guitar', 'radio', 'tray', 'mop',
  'bucket', 'shoppingbag', 'helmet', 'bottle', 'towel', 'cooler', 'flashlight', 'baton',
  'medkit', 'axe', 'fishingrod', 'cart', 'leash', 'icecream', 'sunhat', 'yogamat', 'notepad',
  'keys', 'crate', 'net', 'balloon', 'lanyard', 'headphones', 'binoculars',
]);

export const PED_DISTRICT_STYLES = Object.freeze([
  'downtown', 'beach', 'suburb', 'industrial', 'docks', 'airport', 'hills', 'oldtown',
  'strip', 'trailer', 'mall', 'marina', 'financial', 'barrio', 'swamp', 'park',
]);

/** The three rival street crews of Leonida. Referenced by PedDef.gang. */
export const GANGS = Object.freeze([
  Object.freeze({
    id: 'sunset-vipers', name: 'Sunset Vipers', color: 0x9b2fbd, turf: ['strip', 'barrio', 'oldtown'],
    motto: 'Loud shirts, louder opinions.',
  }),
  Object.freeze({
    id: 'mangrove-saints', name: 'Mangrove Saints', color: 0x2f9b6a, turf: ['swamp', 'trailer', 'suburb'],
    motto: 'The water keeps our secrets.',
  }),
  Object.freeze({
    id: 'cayo-kings', name: 'Cayo Kings', color: 0xd4a017, turf: ['docks', 'industrial', 'marina'],
    motto: 'Everything on this pier has a price.',
  }),
]);

// ---------------------------------------------------------------------------
// Shared palettes — skin tones are a realistic spread, not a single family.
// ---------------------------------------------------------------------------

// Full population spread, deep to very fair.
const SKIN_BROAD = [
  0x3b2219, 0x4d2e1e, 0x5f3a24, 0x714628, 0x835430, 0x96653a, 0xa87848, 0xba8b5a,
  0xcc9e70, 0xdbb389, 0xe8c6a3, 0xf3d8bd,
];
// Outdoor workers / beach life — same spread, pushed warm and sun-darkened.
const SKIN_TANNED = [
  0x3f261a, 0x553420, 0x6b4226, 0x81512c, 0x976334, 0xad7740, 0xc08b52, 0xd09e68,
  0xdcb082, 0xe6c39b,
];
// Indoor / night-shift / office — same spread, cooler and lighter on average.
const SKIN_INDOOR = [
  0x42281d, 0x593726, 0x714733, 0x8a5b40, 0xa37353, 0xba8c6c, 0xcda386, 0xdcb89f,
  0xe9cbb6, 0xf4dcc9,
];
// Older skin — desaturated, more even.
const SKIN_AGED = [
  0x4a3226, 0x60422f, 0x77553c, 0x8e6b4d, 0xa5825f, 0xbb9a77, 0xcfb190, 0xe0c6aa,
  0xecd6bf,
];

const HAIR_NATURAL = [0x17110d, 0x241a12, 0x33231a, 0x4a3221, 0x63452a, 0x846035, 0xa9823f, 0xcda85e, 0x7d3a22, 0x9c4a28];
const HAIR_GREY = [0x5a5550, 0x77716a, 0x949089, 0xb2aea7, 0xcecac3, 0xe6e3dd, 0x3a342f, 0x8a8177];
const HAIR_DYED = [0x1b1410, 0xd42a6a, 0x2ec4b6, 0x7b3ff2, 0xf25c05, 0x18c964, 0xe8e8e8, 0xffd60a, 0x0a84ff];
const HAIR_BLEACH = [0xe9d9a8, 0xf1e6c0, 0xd9c48a, 0xc9a96b, 0x8a6a3a, 0x2a2118, 0xb8894a, 0xe8dcc8];

const SHOE_SNEAKER = [0xf2f2f2, 0x1c1c1e, 0xd3352f, 0x2f6fd3, 0xe8e2d0, 0x3fae6a, 0x7a4a2a, 0xf0a030];
const SHOE_DRESS = [0x1a1512, 0x2e2119, 0x3f2d1f, 0x5a3f2a, 0x101010, 0x6b4a2f, 0x23252b];
const SHOE_BOOT = [0x3a2a1c, 0x4d3722, 0x21201e, 0x5c4630, 0x2b2f33, 0x6a4a20, 0x141414];
const SHOE_SANDAL = [0x8a6a48, 0xc2a07a, 0x2a2a2a, 0xe0d6c4, 0x3f7fa0, 0xd0743f, 0xf0e8d8];

const PANTS_DENIM = [0x2b3f5c, 0x1e2b3f, 0x44597a, 0x6b7f9b, 0x1a1a1e, 0x89a0bd, 0x33383f];
const PANTS_NEUTRAL = [0x2a2a2e, 0x4a453d, 0x6b6459, 0x8b8375, 0xb5ab99, 0x1c1d21, 0x3d4247];

const freezeNums = (a) => Object.freeze(a.slice());

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/** Build a gapless schedule from [endHour, act] steps; the last endHour must be 24. */
const sch = (...steps) => {
  const out = [];
  let from = 0;
  for (const [to, act] of steps) {
    out.push({ from, to, act });
    from = to;
  }
  return out;
};

/** Bark bundle in fixed order: greet, panic, angry, hurt, idle. */
const bk = (greet, panic, angry, hurt, idle) => ({ greet, panic, angry, hurt, idle });

const pal = (p) => Object.freeze({
  skin: freezeNums(p.skin),
  hair: freezeNums(p.hair),
  top: freezeNums(p.top),
  bottom: freezeNums(p.bottom),
  shoes: freezeNums(p.shoes),
  accent: freezeNums(p.accent),
});

// Fills the optional half of the contract so every PedDef is shape-complete, then freezes.
const mk = (o) => Object.freeze({
  health: 100,
  armed: null,
  gang: null,
  desc: '',
  ...o,
  height: Object.freeze([...o.height]),
  build: Object.freeze([...o.build]),
  palette: pal(o.palette),
  props: Object.freeze([...(o.props || [])]),
  speed: Object.freeze({ ...o.speed }),
  stats: Object.freeze({ ...o.stats }),
  armed: o.armed ? Object.freeze({ ...o.armed }) : null,
  schedule: Object.freeze((o.schedule || []).map((s) => Object.freeze({ ...s }))),
  barks: Object.freeze({
    greet: freezeNums(o.barks.greet),
    panic: freezeNums(o.barks.panic),
    angry: freezeNums(o.barks.angry),
    hurt: freezeNums(o.barks.hurt),
    idle: freezeNums(o.barks.idle),
  }),
  districts: Object.freeze([...(o.districts || [])]),
  hours: Object.freeze([...(o.hours || [0, 24])]),
});

// ---------------------------------------------------------------------------
// WHITE COLLAR
// ---------------------------------------------------------------------------

const WHITE_COLLAR = [
  mk({
    id: 'business-exec', name: 'Corporate Executive', weight: 42, sex: 'x',
    desc: 'Owns a building they have never entered above the fourth floor.',
    height: [1.66, 1.90], build: [0.88, 1.14],
    palette: {
      skin: SKIN_INDOOR,
      hair: [0x1d1611, 0x33241a, 0x4f3724, 0x6d5133, 0x8b8177, 0xb2aea7, 0xa9823f],
      top: [0x1b1f2a, 0x2c3244, 0x3d4354, 0x5a6070, 0xe8e8ea, 0x7a2f38, 0x1a3a52],
      bottom: [0x151821, 0x232735, 0x3a3f4d, 0x4c5261, 0x2b2b2b],
      shoes: SHOE_DRESS,
      accent: [0x8c1c2b, 0xc9a227, 0x1f4f8f, 0x2f7a5a, 0xd4d4d8, 0x5b2a6b],
    },
    outfit: 'suit', props: ['phone', 'briefcase', 'coffee'],
    speed: { walk: 1.42, jog: 3.1, run: 5.4 },
    stats: { bravery: 0.34, aggression: 0.30, wealth: 0.95, fitness: 0.45, awareness: 0.52 },
    armed: null, health: 100,
    schedule: sch([6, 'home'], [7, 'commute'], [12, 'work'], [13, 'shop'], [18, 'work'],
      [19, 'commute'], [22, 'bar'], [24, 'home']),
    barks: bk(
      ['Make it quick, I am billing this conversation.', 'Morning. Love the energy. Do not touch me.',
        'You have got about nine seconds of my attention.', 'Walk and talk, walk and talk.',
        'If this is about the merger, talk to legal.', 'Do you know what my time costs per minute?'],
      ['My briefcase! Forget it, RUN!', 'Security! I pay for security!', 'Not the suit, not the suit!',
        'I have shareholders! I cannot die!', 'Somebody call my attorney and an ambulance!',
        'This is a four thousand dollar jacket and I am leaving it!'],
      ['I will have your entire block rezoned, you hear me?', 'Do you have any idea who I golf with?',
        'You just made a very expensive mistake.', 'I own the permit that says you cannot be here.',
        'I will sue you into a crater.', 'My lawyers eat people like you for breakfast meetings.'],
      ['That is going to require physio!', 'You are hitting a man with very good insurance!',
        'I am bleeding on imported wool!', 'Stop! I will write you a cheque!',
        'This is assault and I am a witness!', 'I did not schedule this!'],
      ['Push it to Thursday. All of it.', 'The quarter is fine. The quarter is fine.',
        'No, I said divest, not diversify.', 'Tell him the number and then stop talking.',
        'Whoever designed this sidewalk should be fired.', 'Coffee here tastes like a spreadsheet.',
        'Yes, I am still on hold. Twenty minutes.'],
    ),
    districts: ['financial', 'downtown', 'hills', 'marina'], hours: [6, 23],
  }),

  mk({
    id: 'office-worker', name: 'Office Worker', weight: 66, sex: 'x',
    desc: 'Lanyard on, soul lightly dented, three browser tabs of holiday deals.',
    height: [1.58, 1.86], build: [0.86, 1.22],
    palette: {
      skin: SKIN_INDOOR,
      hair: [0x1b1410, 0x2e2116, 0x46311f, 0x64472b, 0x93713c, 0xc2a05e, 0x8a8177, 0x9c4a28],
      top: [0xdfe4ea, 0xb8c6d6, 0x8ca3bd, 0x5d7590, 0xe9e2d6, 0xcfd4c8, 0x6f5f7a],
      bottom: [0x2c333d, 0x3d4650, 0x4f5a66, 0x1f242b, 0x5b5348],
      shoes: [0x241c15, 0x3a2c1f, 0x1a1a1c, 0x50402c, 0xf2f2f2, 0x2f3a46],
      accent: [0x2f6fd3, 0xd3352f, 0x3fae6a, 0xf0a030, 0x8a8fa0, 0xb04a86],
    },
    outfit: 'casual', props: ['lanyard', 'coffee', 'phone', 'bag'],
    speed: { walk: 1.30, jog: 2.9, run: 5.1 },
    stats: { bravery: 0.26, aggression: 0.20, wealth: 0.44, fitness: 0.40, awareness: 0.48 },
    schedule: sch([7, 'home'], [8, 'commute'], [12, 'work'], [13, 'shop'], [17, 'work'],
      [18, 'commute'], [20, 'shop'], [22, 'bar'], [24, 'home']),
    barks: bk(
      ['Hey! Sorry, I am on my lunch nine minutes late.', 'Morning. Is it Friday? Please say Friday.',
        'Do not ask me about the printer.', 'Hi! Yeah, no, I am fine, this is fine.',
        'You dropped this? No? Cool, cool.', 'I have a meeting at two I intend to ignore.'],
      ['I am not paid enough for this!', 'Somebody call somebody!', 'Is that real? That looked real!',
        'I am going back inside, I am going back inside!', 'My badge is in there! Keep it!',
        'Nope. Nope. Absolutely nope.'],
      ['Hey! I was in that line for twenty minutes!', 'Watch where you are going, seriously!',
        'You want my coffee? Take my coffee. Take it.', 'That is the third time today, man!',
        'I will absolutely file a complaint about you.', 'Unbelievable. Genuinely unbelievable.'],
      ['Ow! Why! Why me!', 'I am going to need a very long weekend!', 'I bruise easy, okay!',
        'That is a workers comp claim, that is!', 'Somebody tell my manager I tried!',
        'Stop, I already had a bad morning!'],
      ['Reply all. Ugh. Why.', 'Two more years and I can quit.', 'That is a synergy problem, apparently.',
        'Vending machine took my money again.', 'I should have gone to culinary school.',
        'If I get one more calendar invite I am swimming out to sea.',
        'They call it a restructure. It is a haircut.'],
    ),
    districts: ['downtown', 'financial', 'mall', 'oldtown'], hours: [6, 23],
  }),

  mk({
    id: 'rich-socialite', name: 'Rich Socialite', weight: 16, sex: 'x',
    desc: 'Third yacht, second facelift, first genuine opinion still pending.',
    height: [1.62, 1.84], build: [0.82, 1.02],
    palette: {
      skin: SKIN_TANNED,
      hair: [0xe6d3a0, 0xd9bd7a, 0x2a1c12, 0x5a3a22, 0xb2aea7, 0xd42a6a, 0xf1e6c0],
      top: [0xf2e9dc, 0xf6c9d8, 0xd9b3f0, 0xfff6cc, 0x1d1d20, 0x9ce0d8, 0xf0a8a0],
      bottom: [0xf4efe6, 0xe8dcc8, 0x1a1a1d, 0xd6c1a0, 0xc0a8d8],
      shoes: [0xf0e0c0, 0xd4af37, 0xf2f2f2, 0x1c1c1e, 0xe8b0c0, 0xb0a090],
      accent: [0xd4af37, 0xffd6e0, 0x9ce0d8, 0xf25c05, 0xe8e8e8, 0xc0a2e0],
    },
    outfit: 'rich', props: ['phone', 'bag', 'sunhat', 'dog', 'coffee'],
    speed: { walk: 1.18, jog: 2.6, run: 4.4 },
    stats: { bravery: 0.22, aggression: 0.34, wealth: 1.0, fitness: 0.52, awareness: 0.38 },
    schedule: sch([10, 'home'], [12, 'shop'], [15, 'beach'], [17, 'gym'], [19, 'home'],
      [23, 'bar'], [24, 'home']),
    barks: bk(
      ['You are darling. Are you anybody?', 'Oh, hello. Were we introduced at the gala?',
        'Love the whole thing you are doing. Very brave.', 'Be a dear and do not stand in my light.',
        'I adore locals. So authentic.', 'Are you photographing me? You may.'],
      ['Where is my driver! WHERE IS MY DRIVER!', 'Somebody protect the handbag!',
        'This does not happen in the hills!', 'I am too well-connected for this!',
        'Help! I will pay! I always pay!', 'My little dog! Somebody grab my little dog!'],
      ['I will have this entire street uninvited.', 'Do you know what my family funds in this city?',
        'You are being extraordinarily common right now.', 'I have never been spoken to like that. Ever.',
        'I am cancelling you socially. Consider it done.', 'Get away from me before I scream prettily.'],
      ['Not the face! Anything but the face!', 'Do you know what that procedure cost?',
        'I am going to faint, and it will be your fault!', 'Somebody bring me a doctor and a mirror!',
        'This dress is one of one!', 'Ow! Ow! Rude!'],
      ['The season is over. The season is so over.', 'She said it was vintage. It was just old.',
        'I only eat food with a provenance.', 'Marina prices are frankly an insult.',
        'I told him: buy the island or stop talking about the island.',
        'Charity gala tonight. The theme is, tragically, nautical.'],
    ),
    districts: ['hills', 'marina', 'financial', 'beach', 'strip'], hours: [9, 3],
  }),
];

// ---------------------------------------------------------------------------
// VISITORS & LEISURE
// ---------------------------------------------------------------------------

const LEISURE = [
  mk({
    id: 'tourist', name: 'Tourist', weight: 70, sex: 'x',
    desc: 'Two cameras, one map held upside down, sunburn shaped like a tank top.',
    height: [1.55, 1.88], build: [0.92, 1.30],
    palette: {
      skin: [0xf3d8bd, 0xe8c6a3, 0xdbb389, 0xcc9e70, 0xf0b8a0, 0xba8b5a, 0x96653a, 0x714628],
      hair: [0x2e2116, 0x4a3221, 0x846035, 0xcda85e, 0x8a8177, 0xcecac3, 0x9c4a28],
      top: [0xf25c05, 0x18c964, 0x0a84ff, 0xffd60a, 0xff7ab8, 0xffffff, 0x2ec4b6, 0xff4d3d],
      bottom: [0xd8cfc0, 0xf0e8d8, 0x3f7fa0, 0xbfae8e, 0xe08a5a, 0x5a6a4a],
      shoes: [0xf2f2f2, 0xe0d6c4, 0x8a6a48, 0x2a2a2a, 0xd0743f, 0x3fae6a],
      accent: [0xffd60a, 0xff4d3d, 0x0a84ff, 0xffffff, 0x18c964, 0xf25c05],
    },
    outfit: 'tourist', props: ['camera', 'bag', 'sunhat', 'phone', 'icecream', 'backpack'],
    speed: { walk: 1.02, jog: 2.4, run: 4.3 },
    stats: { bravery: 0.18, aggression: 0.12, wealth: 0.58, fitness: 0.38, awareness: 0.22 },
    schedule: sch([8, 'home'], [12, 'wander'], [14, 'shop'], [17, 'beach'], [19, 'wander'],
      [23, 'bar'], [24, 'home']),
    barks: bk(
      ['Excuse me! Is this the way to the big pink hotel?', 'Would you take our picture? Just one! Or nine!',
        'Hi! We flew in Tuesday! It is so warm here!', 'Is the water always that colour? Is it safe?',
        'They said the sunset here is famous. Is it famous?', 'Do you accept cards? Nobody accepts cards!'],
      ['This was not in the brochure!', 'Marla! MARLA! Get to the bus!',
        'We are going home, we are going home right now!', 'Where is the consulate! Where is it!',
        'I told you we should have gone to the mountains!', 'Somebody grab the kids and the cooler!'],
      ['The hotel said there would be a shuttle!', 'Forty dollars for a smoothie is criminal!',
        'I am writing a review and it will be devastating.', 'You cut in front of my whole family!',
        'That parking sign is deliberately confusing!', 'I want to speak to whoever runs this beach!'],
      ['Owww! The travel insurance does not cover this!', 'My camera! And also my arm!',
        'I want to go home! I want to go home now!', 'Is there a hospital? A clean one?',
        'This is our honeymoon!', 'Help! We are not from here!'],
      ['Six dollars for water. Six.', 'The map says we are in the ocean.',
        'Is that a real palm tree or a phone tower?', 'I am getting burnt through the sunscreen.',
        'Everything here is either neon or lizard.', 'We should have rented the convertible.',
        'Take one more, I blinked. I always blink.'],
    ),
    districts: ['beach', 'strip', 'oldtown', 'marina', 'airport', 'mall', 'downtown'], hours: [7, 1],
  }),

  mk({
    id: 'jogger', name: 'Jogger', weight: 46, sex: 'x',
    desc: 'Splits printed on the soul. Will absolutely tell you their pace.',
    height: [1.58, 1.90], build: [0.80, 1.00],
    palette: {
      skin: SKIN_TANNED,
      hair: [0x1b1410, 0x33231a, 0x4a3221, 0x846035, 0xcda85e, 0x9c4a28, 0x949089],
      top: [0x18c964, 0x0a84ff, 0xffd60a, 0xff4d3d, 0xffffff, 0x1c1c1e, 0xff7ab8, 0x2ec4b6],
      bottom: [0x1c1c1e, 0x2f3a46, 0x4a4f58, 0x6a2f6a, 0x1f4f3f, 0x3d3d42],
      shoes: [0xf2f2f2, 0x18c964, 0xff4d3d, 0x0a84ff, 0xffd60a, 0x1c1c1e, 0xff7ab8],
      accent: [0x18c964, 0xffd60a, 0xff4d3d, 0xffffff, 0x0a84ff, 0x2ec4b6],
    },
    outfit: 'jogger', props: ['headphones', 'phone', 'bottle'],
    speed: { walk: 1.55, jog: 4.1, run: 7.2 },
    stats: { bravery: 0.42, aggression: 0.22, wealth: 0.52, fitness: 0.94, awareness: 0.44 },
    schedule: sch([5, 'home'], [8, 'park'], [9, 'home'], [12, 'work'], [13, 'gym'],
      [18, 'work'], [20, 'park'], [24, 'home']),
    barks: bk(
      ['Morning! On your left! On your LEFT!', 'Hey! Nice day for it! Keep moving!',
        'Coming through! Sorry! Coming through!', 'Great weather. Terrible humidity. Love it.',
        'You running? You should be running.', 'Half marathon in three weeks, no I am not nervous.'],
      ['I can outrun this! I can outrun this!', 'Go go go, this is what training is FOR!',
        'That is a gun! That is an actual gun!', 'Follow me, I know the seawall route!',
        'Not my knees, not today!', 'Everybody move, MOVE!'],
      ['This is a shared path! Shared!', 'You do not park across a running trail!',
        'I said on your left and you moved LEFT!', 'Some of us are training here!',
        'Leash your dog or I will file something!', 'Thanks for the near-death experience, buddy!'],
      ['My hamstring! My beautiful hamstring!', 'Twelve weeks of training, gone!',
        'Do not touch the ankle! Not the ankle!', 'I have a race! I HAVE A RACE!',
        'Ow! Right in the shin splints!', 'That is going to ruin my average pace!'],
      ['Four twenty a kilometre. Not bad.', 'Hydrate or die dramatically.',
        'Hills today. Hills are a choice I made.', 'Heart rate zone two. Perfect.',
        'The seawall is packed after six.', 'New shoes. Worth every dollar.',
        'Rest day tomorrow. Probably. Maybe.'],
    ),
    districts: ['beach', 'park', 'marina', 'suburb', 'hills', 'downtown'], hours: [5, 21],
  }),

  mk({
    id: 'beachgoer', name: 'Beach-Goer', weight: 58, sex: 'x',
    desc: 'Horizontal by profession. Owns nine towels and no shoes.',
    height: [1.54, 1.88], build: [0.84, 1.28],
    palette: {
      skin: SKIN_TANNED,
      hair: [0x1b1410, 0x3a2718, 0x6b4a28, 0xb8894a, 0xe9d9a8, 0x9c4a28, 0xd42a6a],
      top: [0xff4d3d, 0xffd60a, 0x2ec4b6, 0xff7ab8, 0xffffff, 0x0a84ff, 0xf25c05, 0x18c964],
      bottom: [0xff7ab8, 0x0a84ff, 0xffd60a, 0xffffff, 0x2ec4b6, 0xf25c05, 0x1c1c1e],
      shoes: SHOE_SANDAL,
      accent: [0xffd60a, 0xff4d3d, 0x2ec4b6, 0xffffff, 0xff7ab8, 0x0a84ff],
    },
    outfit: 'beach', props: ['towel', 'cooler', 'phone', 'sunhat', 'bottle', 'radio'],
    speed: { walk: 1.06, jog: 2.6, run: 4.8 },
    stats: { bravery: 0.26, aggression: 0.18, wealth: 0.40, fitness: 0.56, awareness: 0.26 },
    schedule: sch([9, 'home'], [11, 'commute'], [17, 'beach'], [19, 'shop'], [23, 'bar'], [24, 'home']),
    barks: bk(
      ['Hey! Water is perfect today. Perfect.', 'You want the spot? I am not using the spot.',
        'Sunscreen? I have got the good stuff.', 'Careful, the sand past noon will end you.',
        'Is that band still playing on the pier?', 'Do not tell anybody about this stretch, okay?'],
      ['Get off the sand! Everybody off the sand!', 'My cooler! Leave the cooler! RUN!',
        'This is supposed to be the nice beach!', 'Barefoot! I am barefoot! Ow! Ow!',
        'Somebody get the umbrella, somebody get the kid!', 'Into the water! They will not follow into the water!'],
      ['You kicked sand all over my entire life!', 'That is my towel. That has always been my towel.',
        'Turn that speaker down or turn it around!', 'Hey! This is a two-metre-gap beach, man!',
        'You parked on the dunes? Seriously?', 'Some of us were enjoying the quiet!'],
      ['Ow! And I just got comfortable!', 'There is sand in the wound! Sand!',
        'My whole day is ruined and now this!', 'Lifeguard! LIFEGUARD!',
        'I came here to relax!', 'Stop it! I am on vacation from problems!'],
      ['Tide is coming in. Five more minutes.', 'That cloud is going to ruin everything.',
        'I am going to flip over in about ten.', 'Pelican took a whole sandwich yesterday.',
        'Water is warmer than the air. Weird.', 'This is why I moved here, right here.',
        'Somebody left a shoe. Just one shoe.'],
    ),
    districts: ['beach', 'marina', 'strip', 'park'], hours: [8, 22],
  }),

  mk({
    id: 'surfer', name: 'Surfer', weight: 28, sex: 'x',
    desc: 'Sun-bleached, salt-cured, and philosophically opposed to schedules.',
    height: [1.62, 1.92], build: [0.84, 1.06],
    palette: {
      skin: SKIN_TANNED,
      hair: HAIR_BLEACH,
      top: [0x2ec4b6, 0xffd60a, 0xff4d3d, 0x1c1c1e, 0xffffff, 0x0a84ff, 0xf25c05],
      bottom: [0x1f4f5f, 0x2ec4b6, 0xffd60a, 0x1c1c1e, 0xff7ab8, 0xf0e8d8],
      shoes: SHOE_SANDAL,
      accent: [0x2ec4b6, 0xffd60a, 0xffffff, 0xf25c05, 0x18c964, 0x0a84ff],
    },
    outfit: 'beach', props: ['surfboard', 'towel', 'bottle', 'headphones'],
    speed: { walk: 1.12, jog: 2.9, run: 5.6 },
    stats: { bravery: 0.54, aggression: 0.20, wealth: 0.28, fitness: 0.86, awareness: 0.40 },
    schedule: sch([5, 'home'], [10, 'beach'], [12, 'wander'], [17, 'beach'], [19, 'shop'],
      [23, 'bar'], [24, 'home']),
    barks: bk(
      ['Swell is chest high and clean, my friend.', 'You surf? You should surf.',
        'Water is like glass out past the second bar.', 'Hey. Slow down. The ocean did not.',
        'Wax? I always have spare wax.', 'Tide turns in forty. Be in it or hear about it.'],
      ['Whoa, whoa, WHOA, that is not chill!', 'Board first! I am not leaving the board!',
        'Out of the water, everybody out!', 'This is so far past not okay!',
        'Paddle out! They cannot swim, nobody can swim!', 'Bad energy! Bad energy! Go!'],
      ['You dropped in on my wave. My wave.', 'Localism is real and you just invented it, buddy.',
        'That is a nine-foot board you just dinged!', 'Kook. Absolute kook.',
        'Learn the lineup or go to the pier!', 'You do not park on the dune path, man.'],
      ['Ahh! Right in the rib, brutal!', 'Not cool! So not cool!',
        'I have got a contest Saturday, come on!', 'Salt in that is going to sting for a week!',
        'Somebody grab my board before it drifts!', 'Ow! That is a bad vibe injury!'],
      ['Onshore wind. Whole day is done.', 'Saw a ray out there this morning. Big one.',
        'Forecast says overhead Thursday. We shall see.', 'Every year the pier break gets more crowded.',
        'I lost a leash and found a leash. Balance.', 'Sunrise session beats a paycheque.',
        'Water temp is perfect. Nobody believes me.'],
    ),
    districts: ['beach', 'marina', 'park'], hours: [5, 22],
  }),

  mk({
    id: 'skater', name: 'Skater', weight: 34, sex: 'x',
    desc: 'Knows every ledge, curb and security guard by first name.',
    height: [1.56, 1.84], build: [0.80, 1.00],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x1b1410, 0x2e2116, 0x4a3221, 0x7b3ff2, 0x18c964, 0xd42a6a, 0xe8e8e8, 0x846035],
      top: [0x1c1c1e, 0xffffff, 0xd3352f, 0x2f6fd3, 0xf25c05, 0x3fae6a, 0xffd60a, 0x6a2f6a],
      bottom: [0x2b3f5c, 0x1a1a1e, 0x4a453d, 0x6b7f9b, 0x33383f, 0x8b8375],
      shoes: [0x1c1c1e, 0xf2f2f2, 0xd3352f, 0x2f6fd3, 0x4a453d, 0xffd60a],
      accent: [0xf25c05, 0xffd60a, 0x18c964, 0xd42a6a, 0xffffff, 0x7b3ff2],
    },
    outfit: 'skater', props: ['skateboard', 'backpack', 'headphones', 'phone', 'bottle'],
    speed: { walk: 1.24, jog: 3.2, run: 6.1 },
    stats: { bravery: 0.58, aggression: 0.34, wealth: 0.22, fitness: 0.80, awareness: 0.60 },
    schedule: sch([9, 'home'], [12, 'park'], [14, 'wander'], [19, 'park'], [22, 'wander'], [24, 'home']),
    barks: bk(
      ['Yo! Watch the run-up, I am going for it!', 'You filming? Film this one, it is going down.',
        'Hey, you got a spare bearing? Long shot.', 'That ledge is waxed, it is beautiful.',
        'Security kicks us out at six. Clock is ticking.', 'First try. Probably. Historically no.'],
      ['Board! Grab the board! GO!', 'Nope, nope, we are out, we are out!',
        'Everybody scatter, meet at the bowl!', 'That is not a security guard problem!',
        'Run! No, skate! Skate is faster!', 'This spot is burned! Burned forever!'],
      ['You broke my deck! Do you know what decks cost?',
        'We were here first, man, the whole summer!', 'Do not touch my setup. Ever.',
        'You could have gone around. You chose this.', 'Stop kicking the cones into the line!',
        'Yeah, call the cops, we will be four blocks away!'],
      ['Aghh! Straight to the hip, classic!', 'That is worse than any slam, and I slam a lot!',
        'My wrist! I need that wrist!', 'Ow! I already ate it twice today!',
        'Come on, I am covered in road rash already!', 'Not the ankle, the ankle is held together by tape!'],
      ['Landed it bolts. Nobody saw. Typical.', 'Ground is too wet. Everything is too wet.',
        'They put skate stoppers on the good ledge.', 'Twenty tries. Twenty-one is the one.',
        'Griptape is basically sandpaper for the soul.', 'The marina has the smoothest concrete in town.',
        'I have snapped three decks this month.'],
    ),
    districts: ['downtown', 'oldtown', 'park', 'mall', 'barrio', 'beach'], hours: [9, 2],
  }),
];

// ---------------------------------------------------------------------------
// STREET CULTURE
// ---------------------------------------------------------------------------

const SUBCULTURE = [
  mk({
    id: 'punk', name: 'Punk', weight: 22, sex: 'x',
    desc: 'Anti-everything, especially the new luxury condos on Third.',
    height: [1.56, 1.86], build: [0.80, 1.08],
    palette: {
      skin: SKIN_INDOOR,
      hair: HAIR_DYED,
      top: [0x14141a, 0x2a1030, 0x7a1020, 0x1c2a1c, 0x3a3a40, 0xd42a6a, 0x0f0f10],
      bottom: [0x121215, 0x2a2a30, 0x1e2b3f, 0x4a1a2a, 0x33383f],
      shoes: [0x0f0f10, 0x2a1a14, 0x7a1020, 0x3a2a1c, 0xd42a6a, 0x1c1c1e],
      accent: [0xd42a6a, 0x18c964, 0xf25c05, 0xc0c0c8, 0x7b3ff2, 0xffd60a],
    },
    outfit: 'punk', props: ['backpack', 'bottle', 'headphones', 'radio'],
    speed: { walk: 1.22, jog: 3.0, run: 5.5 },
    stats: { bravery: 0.66, aggression: 0.62, wealth: 0.14, fitness: 0.62, awareness: 0.58 },
    armed: { weaponId: 'brass-knuckles', chance: 0.12 }, health: 105,
    schedule: sch([11, 'home'], [14, 'wander'], [17, 'park'], [20, 'wander'], [24, 'bar']),
    barks: bk(
      ['Hey. Nice boots. You buy them or earn them?', 'Show is at the old laundry tonight. Bring cash.',
        'You look like you hate it here too. Respect.', 'Got a safety pin? Long story.',
        'We are flyering the whole block. Take one.', 'Do not trust anybody in a golf cart.'],
      ['Cops or worse! Scatter!', 'Alley! Take the alley!',
        'This city eats people, GO!', 'I am anti-authority, not anti-survival!',
        'Everybody out the back, now!', 'Nope! Not dying for a principle today!'],
      ['Sellout! You are what is wrong with this street!',
        'Another condo, another tower, another nothing!', 'Push me again. Go ahead. Push me again.',
        'You do not own this corner, nobody owns this corner!', 'Take your parking app and sink it!',
        'I have been arrested for better than you!'],
      ['Ha! Is that it? Is that all of it?', 'Ow! Fine! FINE! Worth it!',
        'You hit like a landlord!', 'That is going in the song, that one!',
        'Blood on the jacket. It was already the theme.', 'Come on then! I have had worse at shows!'],
      ['Rent went up again. Shocking. Truly shocking.', 'The venue closed. It is a juice bar now.',
        'Nothing sounds good since the drummer left.', 'I made this patch out of a bus seat.',
        'They put spikes on the benches. On BENCHES.', 'Three chords and a grudge, that is the whole deal.',
        'Somebody stole the flyers again.'],
    ),
    districts: ['oldtown', 'downtown', 'barrio', 'industrial', 'trailer'], hours: [11, 4],
  }),

  mk({
    id: 'biker', name: 'Biker', weight: 26, sex: 'x',
    desc: 'Chrome, leather, and a very specific opinion about exhaust pipes.',
    height: [1.68, 1.96], build: [1.02, 1.34],
    palette: {
      skin: SKIN_TANNED,
      hair: [0x1b1410, 0x33231a, 0x5a5550, 0x949089, 0x4a3221, 0xcecac3, 0x7d3a22],
      top: [0x14100e, 0x241a16, 0x3a2a24, 0x1c1c1e, 0x5a2018, 0x2a2a2e],
      bottom: [0x1a1a1e, 0x2b3f5c, 0x241a16, 0x33383f, 0x121215],
      shoes: [0x1a120c, 0x2e1f14, 0x141414, 0x3f2d1f, 0x4d3722],
      accent: [0xc0392b, 0xd4af37, 0xc0c0c8, 0xf25c05, 0x8a1f1f, 0xe8e8e8],
    },
    outfit: 'biker', props: ['helmet', 'keys', 'bottle', 'phone'],
    speed: { walk: 1.16, jog: 2.8, run: 4.9 },
    stats: { bravery: 0.80, aggression: 0.72, wealth: 0.36, fitness: 0.66, awareness: 0.58 },
    armed: { weaponId: 'crowbar', chance: 0.22 }, health: 130,
    schedule: sch([9, 'home'], [11, 'wander'], [16, 'work'], [18, 'wander'], [24, 'bar']),
    barks: bk(
      ['That your ride? Not bad. Not good, but not bad.',
        'Hey. Keep the rubber down, yeah?', 'Run to the coast Sunday. Six sharp. No excuses.',
        'You hear that pipe note? That is tuning, not noise.', 'Careful on the causeway, they resurfaced it wrong.',
        'Buy a helmet. I like your head where it is.'],
      ['Bike! I am not leaving the bike!', 'Everybody mount up, MOUNT UP!',
        'That is live rounds, that is live rounds!', 'Go west, split the traffic, GO!',
        'I have been in bar fights, not this!', 'Kickstand up, kickstand UP!'],
      ['You nearly took my mirror off, you clown!', 'Touch the tank one more time. I dare you.',
        'Cage drivers. Every single one of you.', 'That is a custom. You just scratched a custom.',
        'You want to do this in the street? Because I do.', 'Move the car. Move it now.'],
      ['Argh! I have laid down bikes worse than that!', 'You bent my pipe, that is unforgivable!',
        'Leather held. Ribs did not.', 'Is that blood or is that oil? Both. Great.',
        'You are going to pay for the fairing!', 'Come here! I am not done!'],
      ['Carb is running rich again.', 'Chain needs a link and a prayer.',
        'They banned us from three bars on this strip.', 'Nothing sounds like a big twin at night.',
        'Sold the truck. Never needed the truck.', 'Rode nine hundred kilometres last weekend. No music.',
        'Rain on the causeway is a death sentence.'],
    ),
    districts: ['industrial', 'trailer', 'docks', 'oldtown', 'strip', 'swamp'], hours: [8, 4],
  }),

  mk({
    id: 'cyclist', name: 'Road Cyclist', weight: 24, sex: 'x',
    desc: 'Shaved legs, carbon frame, and a running feud with every car door.',
    height: [1.60, 1.90], build: [0.80, 0.98],
    palette: {
      skin: SKIN_TANNED,
      hair: [0x1b1410, 0x33231a, 0x4a3221, 0x846035, 0xcda85e, 0x949089],
      top: [0xffd60a, 0x18c964, 0x0a84ff, 0xff4d3d, 0x1c1c1e, 0xff7ab8, 0xffffff],
      bottom: [0x1c1c1e, 0x2f3a46, 0x1f1f24, 0x3d3d42, 0x4a1a2a],
      shoes: [0xf2f2f2, 0x1c1c1e, 0xffd60a, 0x0a84ff, 0xff4d3d],
      accent: [0xffd60a, 0x18c964, 0xff4d3d, 0xffffff, 0x0a84ff, 0x2ec4b6],
    },
    outfit: 'jogger', props: ['helmet', 'bottle', 'phone', 'headphones'],
    speed: { walk: 1.34, jog: 3.6, run: 6.4 },
    stats: { bravery: 0.46, aggression: 0.40, wealth: 0.62, fitness: 0.92, awareness: 0.70 },
    schedule: sch([5, 'home'], [9, 'commute'], [12, 'work'], [13, 'gym'], [17, 'work'],
      [20, 'commute'], [24, 'home']),
    barks: bk(
      ['On your left! Thank you! Have a good one!', 'Morning! Watch the grate up ahead, it eats wheels.',
        'Group ride leaves the marina at six.', 'Hey, nice frame. Steel? Respect.',
        'Bike lane is finally paved. Miracle.', 'You need a light. Seriously, you need a light.'],
      ['Off the road! OFF THE ROAD!', 'I am clipped in, I am clipped in, hold on!',
        'Somebody get a number plate!', 'Down! Everybody down!',
        'Going full gas, do not follow me!', 'This is why I hate this intersection!'],
      ['Door zone! You opened into the DOOR ZONE!', 'That is a bike lane, not a loading bay!',
        'Three metres! The law says three metres!', 'You buzzed me at sixty, you maniac!',
        'Look up from the phone, I am a person!', 'Sound your horn again, I dare you!'],
      ['My collarbone! It is always the collarbone!', 'Carbon does not bend, it EXPLODES!',
        'That frame cost more than your car payment!', 'Road rash from hip to ankle, fantastic!',
        'Get me off the tarmac before something else hits me!', 'Ow! My season is over!'],
      ['Headwind the whole way out. Cruel.', 'Watts are up, weight is down, life is good.',
        'They repainted the lane straight into a hedge.', 'Two flats in one week. Glass everywhere.',
        'Causeway loop is eighty clicks if you go the long way.', 'Chain is singing. Perfect.',
        'I do not drive. I have not driven in years.'],
    ),
    districts: ['beach', 'park', 'marina', 'suburb', 'hills', 'downtown'], hours: [5, 21],
  }),

  mk({
    id: 'dog-walker', name: 'Dog Walker', weight: 30, sex: 'x',
    desc: 'Six leashes, six personalities, one genuinely awful little terrier.',
    height: [1.55, 1.84], build: [0.86, 1.16],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x1b1410, 0x2e2116, 0x4a3221, 0x846035, 0xcda85e, 0x949089, 0x9c4a28, 0x2ec4b6],
      top: [0x3fae6a, 0xf0a030, 0x5d7590, 0xe9e2d6, 0xd3352f, 0x7b6a8a, 0xffffff],
      bottom: [0x4a453d, 0x2b3f5c, 0x6b6459, 0x2a2a2e, 0x8b8375],
      shoes: SHOE_SNEAKER,
      accent: [0xf0a030, 0x3fae6a, 0xd3352f, 0x2f6fd3, 0xffd60a, 0xffffff],
    },
    outfit: 'casual', props: ['dog', 'leash', 'bag', 'phone', 'bottle'],
    speed: { walk: 1.14, jog: 2.7, run: 4.7 },
    stats: { bravery: 0.38, aggression: 0.22, wealth: 0.30, fitness: 0.70, awareness: 0.64 },
    schedule: sch([6, 'home'], [10, 'park'], [12, 'work'], [14, 'park'], [17, 'work'],
      [20, 'park'], [24, 'home']),
    barks: bk(
      ['He is friendly! Mostly friendly! Ninety percent!', 'Do not make eye contact with the small one.',
        'Hi! Sorry! They pull! They always pull!', 'Six dogs, one human. The maths is bad.',
        'You can pet her. Do not pet him.', 'We are doing the long loop today. Pray for me.'],
      ['Heel! HEEL! Oh, forget it, RUN!', 'Somebody help me with the leashes!',
        'The dogs are calmer than I am right now!', 'Come on, come on, come ON, move!',
        'They are barking at gunfire, that is a bad sign!', 'To the park! Everybody to the park!'],
      ['Leash your animal or I will, and I charge!', 'You let that thing off leash near MY dogs?',
        'That is the third time this week, Marlene!', 'Clean up after your dog like an adult!',
        'Hey! There are six dogs here, use your eyes!', 'Do not feed them! Do NOT feed them!'],
      ['Ow! Watch it, I have got live animals here!', 'You scared the whole pack, you jerk!',
        'Somebody grab the leads before they bolt!', 'I am bleeding and the terrier is loving it!',
        'This is a liability nightmare!', 'Ahh! My hand! My leash hand!'],
      ['Four walks down, five to go.', 'The retriever ate a whole flip-flop yesterday.',
        'Rich people name their dogs after wine.', 'Six clients, three of them tip.',
        'Rain days are the worst days.', 'He howls at the boat horns. Every time.',
        'I know this park better than the gardeners.'],
    ),
    districts: ['suburb', 'park', 'hills', 'marina', 'beach', 'downtown'], hours: [6, 21],
  }),

  mk({
    id: 'musician', name: 'Street Musician', weight: 22, sex: 'x',
    desc: 'Plays four songs perfectly and the fifth as a threat.',
    height: [1.56, 1.88], build: [0.82, 1.16],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x1b1410, 0x2e2116, 0x4a3221, 0x7d3a22, 0xd42a6a, 0x949089, 0xe8e8e8, 0x846035],
      top: [0x6a2f6a, 0xd3352f, 0x1c1c1e, 0xf0a030, 0x2f6fd3, 0xe9e2d6, 0x3fae6a],
      bottom: [0x2b3f5c, 0x1a1a1e, 0x4a453d, 0x33383f, 0x6b7f9b],
      shoes: [0x2e1f14, 0x1c1c1e, 0xd3352f, 0x4d3722, 0xf2f2f2],
      accent: [0xd4af37, 0xd42a6a, 0xf25c05, 0x2ec4b6, 0xffd60a, 0xc0c0c8],
    },
    outfit: 'casual', props: ['guitar', 'bag', 'radio', 'bottle', 'phone'],
    speed: { walk: 1.06, jog: 2.5, run: 4.6 },
    stats: { bravery: 0.44, aggression: 0.26, wealth: 0.18, fitness: 0.48, awareness: 0.54 },
    schedule: sch([10, 'home'], [13, 'work'], [15, 'wander'], [19, 'work'], [23, 'bar'], [24, 'work']),
    barks: bk(
      ['Any requests? I know four songs and two of them are good.',
        'Case is open, the rest is up to your conscience.', 'This next one is about a girl and a parking ticket.',
        'Hey, you look like someone who tips.', 'Card? No. Coins? Beautiful.',
        'I wrote this on the bus. It shows.'],
      ['My guitar! Not the guitar!', 'Somebody take the case, take the money, just GO!',
        'That is not part of the set!', 'I am a musician, not a hero!',
        'Get behind the amp, get behind the amp!', 'Everybody run, I will be right behind you!'],
      ['You put a button in my case. A BUTTON.', 'This is my pitch. Ten years, my pitch.',
        'Turn that speaker off, I am playing live here!', 'Do not touch the strings. Ever.',
        'You want free music, go to an elevator!', 'Kick my case again and see what happens!'],
      ['My hand! I need those fingers, all of them!', 'You cracked the body! Listen to it! Dead!',
        'Ow! And the crowd was finally growing!', 'That is my singing rib, that is!',
        'Somebody call somebody, gently!', 'I will still finish the song. Later. Much later.'],
      ['Made forty today. Tourists are generous when sunburnt.',
        'Third string is going and I know it.', 'The pier gives you better acoustics than any club.',
        'Cops move me on at nine. Every night, nine.', 'Someone requested a song I invented. Awkward.',
        'The seagulls have better timing than my last drummer.', 'One day, a real stage. One day.'],
    ),
    districts: ['oldtown', 'strip', 'beach', 'downtown', 'marina', 'mall'], hours: [10, 2],
  }),

  mk({
    id: 'photographer', name: 'Photographer', weight: 18, sex: 'x',
    desc: 'Chasing golden hour like it owes them money.',
    height: [1.58, 1.88], build: [0.84, 1.14],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x1b1410, 0x33231a, 0x4a3221, 0x846035, 0x949089, 0xcda85e, 0x2e2116],
      top: [0x1c1c1e, 0x3a4a3a, 0x4a453d, 0xe9e2d6, 0x2f3a46, 0x6b6459, 0x7a2f38],
      bottom: [0x3a3f32, 0x2a2a2e, 0x4a453d, 0x2b3f5c, 0x6b6459],
      shoes: [0x2e1f14, 0x1c1c1e, 0x4d3722, 0xf2f2f2, 0x3a2a1c],
      accent: [0xf25c05, 0xffd60a, 0xc0c0c8, 0x0a84ff, 0x1c1c1e, 0xd3352f],
    },
    outfit: 'casual', props: ['camera', 'backpack', 'phone', 'binoculars', 'bag'],
    speed: { walk: 1.10, jog: 2.8, run: 5.0 },
    stats: { bravery: 0.50, aggression: 0.24, wealth: 0.46, fitness: 0.58, awareness: 0.86 },
    schedule: sch([6, 'home'], [9, 'wander'], [12, 'work'], [16, 'wander'], [20, 'beach'],
      [23, 'wander'], [24, 'home']),
    barks: bk(
      ['Hold that. Hold that! Perfect, thank you.', 'The light right now is criminal. Absolutely criminal.',
        'Do you mind? It is for a series. Sort of.', 'Golden hour is twelve minutes. Twelve.',
        'That building at sunset? Unbelievable.', 'Smile or do not. Honestly, do not is better.'],
      ['I am getting this, I am getting this, then I am getting OUT!',
        'Camera in the bag, camera in the bag, GO!', 'That is front page and I want to live!',
        'Do not shoot, I am just shooting!', 'Behind the planter, behind the planter!',
        'Thirty grand of glass on my back, MOVE!'],
      ['You walked straight through a ten second exposure!',
        'Do not touch the lens. Do not even breathe on it.', 'This is a public street, I can shoot here!',
        'You knocked over the tripod, that is a rental!', 'Stop photobombing, it stopped being funny in the nineties!',
        'Delete it? No. Absolutely not. No.'],
      ['My lens! Is the lens okay! Forget me, the LENS!',
        'Ow! That is my shutter hand!', 'You cracked the filter, at least it was the filter!',
        'Somebody get the memory card, the card matters!', 'I have got a wedding Saturday!',
        'Argh! And the light was finally perfect!'],
      ['Overexposed. Again. Sensor hates this sun.', 'Two thousand frames, maybe three keepers.',
        'The neon down here does horrible things to white balance.', 'Client wants it moody. Everything is moody here.',
        'I have shot this pier four hundred times.', 'Battery at nine percent. Story of my life.',
        'Somebody parked a van in my composition.'],
    ),
    districts: ['beach', 'downtown', 'oldtown', 'marina', 'strip', 'park', 'swamp'], hours: [5, 2],
  }),
];

// ---------------------------------------------------------------------------
// GANGS — three rival crews, three very different attitudes
// ---------------------------------------------------------------------------

const GANG_MEMBERS = [
  mk({
    id: 'gang-viper', name: 'Sunset Viper', weight: 20, sex: 'x',
    desc: 'Neon-purple silk, gold rings, and a grudge with everything east of the strip.',
    height: [1.64, 1.92], build: [0.92, 1.20],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x241a12, 0x33231a, 0x7b3ff2, 0xd42a6a, 0xe8e8e8, 0x4a3221],
      top: [0x9b2fbd, 0x6a1f8a, 0x2a1030, 0xd4a8f0, 0x1c1c1e, 0xc04ae0, 0x40104f],
      bottom: [0x1a1a1e, 0x2a1030, 0x121215, 0x3a2a44, 0x2b3f5c],
      shoes: [0xf2f2f2, 0x1c1c1e, 0x9b2fbd, 0xd4af37, 0xc0c0c8],
      accent: [0xd4af37, 0x9b2fbd, 0xe8e8e8, 0xd42a6a, 0xc0c0c8, 0x7b3ff2],
    },
    outfit: 'gang', props: ['phone', 'bottle', 'keys', 'headphones'],
    speed: { walk: 1.18, jog: 3.1, run: 5.8 },
    stats: { bravery: 0.78, aggression: 0.84, wealth: 0.46, fitness: 0.72, awareness: 0.70 },
    armed: { weaponId: 'pistol-9', chance: 0.55 }, health: 120,
    gang: 'sunset-vipers',
    schedule: sch([10, 'home'], [13, 'wander'], [18, 'work'], [21, 'wander'], [24, 'bar']),
    barks: bk(
      ['You lost? Because this is Viper blocks.', 'Walk slow through here. Slow and polite.',
        'Purple on the corner means you ask first.', 'You looking to buy, sell, or bleed?',
        'We run this strip from the arcade to the water.', 'Hey. Smile. You are on our street.'],
      ['They came heavy! Get to the cars!', 'Kings hit us! KINGS HIT US!',
        'Somebody get Reno, he is down!', 'Off the block, off the block, regroup at the arcade!',
        'This is a hit, this is a real hit!', 'Back inside, everybody back inside!'],
      ['You want to try the Vipers? Really? Today?',
        'Green colours on my street? Bad idea.', 'That is King territory talk and this is not King territory.',
        'Say it again. Louder. For the whole block.', 'You just disrespected six people at once.',
        'Nobody collects here but us.'],
      ['You are dead! You hear me? DEAD!', 'Argh! Somebody put him down!',
        'I am hit! I am hit, cover me!', 'This is nothing! I have had worse!',
        'You bled a Viper. Whole city will know.', 'Get me up! Get me up!'],
      ['Kings are moving product through the marina again.',
        'Saints do not come this far east. They know better.', 'New shipment Thursday. Keep the corner clean.',
        'Cops roll by twice a night. Clockwork.', 'Yo, that car has been circling for ten minutes.',
        'Purple sells here. Purple sells everywhere.', 'Do not stand under the light. Rookie mistake.'],
    ),
    districts: ['strip', 'barrio', 'oldtown', 'downtown'], hours: [11, 5],
  }),

  mk({
    id: 'gang-saint', name: 'Mangrove Saint', weight: 18, sex: 'x',
    desc: 'Swamp-green bandanas, airboat money, and a very long memory.',
    height: [1.66, 1.98], build: [0.98, 1.30],
    palette: {
      skin: SKIN_TANNED,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x63452a, 0x949089, 0x7d3a22, 0x1b1410],
      top: [0x2f9b6a, 0x1e6a48, 0x3a4a3a, 0x1c2a1c, 0x0f0f10, 0x4fbd8a, 0x2a3a2a],
      bottom: [0x3a3f32, 0x2b3f5c, 0x1a1a1e, 0x4a453d, 0x33383f],
      shoes: [0x3a2a1c, 0x1a120c, 0x4d3722, 0x2f9b6a, 0x141414],
      accent: [0x2f9b6a, 0xd4af37, 0xc0c0c8, 0x1e6a48, 0xe8e8e8, 0x8a6a30],
    },
    outfit: 'gang', props: ['phone', 'bottle', 'toolbox', 'flashlight'],
    speed: { walk: 1.12, jog: 2.9, run: 5.4 },
    stats: { bravery: 0.84, aggression: 0.76, wealth: 0.38, fitness: 0.76, awareness: 0.74 },
    armed: { weaponId: 'sawn-off-shotgun', chance: 0.45 }, health: 135,
    gang: 'mangrove-saints',
    schedule: sch([9, 'home'], [12, 'work'], [16, 'wander'], [20, 'work'], [23, 'bar'], [24, 'home']),
    barks: bk(
      ['You are a long way from the pretty part of town.',
        'Green bandana means you are already being watched.', 'Road ends at the water. So does everything else.',
        'We were out here before there was a road.', 'You want directions or you want trouble?',
        'Saints keep the swamp. Swamp keeps the Saints.'],
      ['Into the trees! They will not follow into the trees!',
        'Get the boat! GET THE BOAT!', 'Vipers found the camp! Move!',
        'Radio the others, radio them now!', 'Everybody to the channel, go!',
        'Somebody is bleeding out here, MOVE!'],
      ['You brought city problems to my water.',
        'Purple out here? That is a swimming lesson.', 'Turn that truck around. Last time I say it.',
        'You take one more photo and it goes in the mud.', 'Nobody asks the Saints twice.',
        'This whole channel belongs to us. Ask anyone who is left.'],
      ['That all? I have been bit worse by things in the water!',
        'Argh! You are going to regret every second of this!', 'I am down! Cover! COVER!',
        'Saints remember. We always remember.', 'Get me to the boat!',
        'You made it personal. Big mistake.'],
      ['Water is low. Easier to hide things, harder to move them.',
        'Kings want the dock route. They can want.', 'Gator took a whole crate last month. True story.',
        'City boys keep buying land they cannot stand on.', 'Airboat needs a new prop again.',
        'Storm coming. Good. Nobody patrols in a storm.', 'Quiet out here. Keep it that way.'],
    ),
    districts: ['swamp', 'trailer', 'suburb', 'industrial'], hours: [8, 4],
  }),

  mk({
    id: 'gang-king', name: 'Cayo King', weight: 18, sex: 'x',
    desc: 'Gold chains, dock manifests, and a cousin in customs.',
    height: [1.65, 1.94], build: [0.94, 1.26],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x241a12, 0x33231a, 0x4a3221, 0xd4a017, 0xe8e8e8, 0x1b1410],
      top: [0xd4a017, 0xb8860b, 0x1c1c1e, 0xf0d070, 0x2a2418, 0x8a6a10, 0xffffff],
      bottom: [0x1a1a1e, 0x2b3f5c, 0x33383f, 0x121215, 0x4a453d],
      shoes: [0xf2f2f2, 0xd4af37, 0x1c1c1e, 0xc0c0c8, 0x8a6a30],
      accent: [0xd4af37, 0xffd60a, 0xe8e8e8, 0xc0c0c8, 0xb8860b, 0x1c1c1e],
    },
    outfit: 'gang', props: ['phone', 'bag', 'keys', 'clipboard'],
    speed: { walk: 1.20, jog: 3.0, run: 5.6 },
    stats: { bravery: 0.74, aggression: 0.70, wealth: 0.66, fitness: 0.70, awareness: 0.80 },
    armed: { weaponId: 'machine-pistol', chance: 0.48 }, health: 125,
    gang: 'cayo-kings',
    schedule: sch([8, 'home'], [11, 'work'], [15, 'wander'], [19, 'work'], [22, 'bar'], [24, 'home']),
    barks: bk(
      ['Everything on this pier has a price. Including standing there.',
        'You are on the manifest or you are in the way.', 'Gold means we already counted you.',
        'Kings move the freight. All of it.', 'You need something? We have got everything.',
        'Container nine is not your business. Walk on.'],
      ['Crane cover! Get behind the crane!', 'Saints on the dock! Saints on the dock!',
        'Move the crates, move the CRATES!', 'Somebody kill the floodlights!',
        'Boat, boat, boat, go go go!', 'They are between us and the gate!'],
      ['You just stepped on a very expensive schedule.',
        'Green rag on my dock? You came here to swim.', 'Nobody counts our money but us.',
        'Say that again with the cameras off.', 'You touch the container, you join the container.',
        'This whole waterfront has our name under the paint.'],
      ['Ah! You are going to owe for that. With interest.',
        'Down! Kings down! Get the truck!', 'I bleed gold, you hear me?',
        'Argh! Somebody find who paid for this!', 'Not here. Not on my own pier.',
        'Patch me up, we are not finished.'],
      ['Customs shift changes at two. Always two.',
        'Vipers think the strip is the whole city. Cute.', 'Manifest says pineapples. It is not pineapples.',
        'Crane operator wants a bigger cut. He will get a smaller one.',
        'Watch the harbour patrol boat, it doubles back.', 'Tide schedule matters more than the clock out here.',
        'Everything ships out by Friday.'],
    ),
    districts: ['docks', 'industrial', 'marina', 'airport'], hours: [7, 4],
  }),

  mk({
    id: 'street-dealer', name: 'Corner Hustler', weight: 14, sex: 'x',
    desc: 'Sells watches, tips and directions, none of them reliable.',
    height: [1.60, 1.88], build: [0.86, 1.14],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x846035, 0xd42a6a, 0xe8e8e8],
      top: [0x1c1c1e, 0x3a3a40, 0x7a2f38, 0x2f6fd3, 0x4a453d, 0xf0a030],
      bottom: [0x1a1a1e, 0x2b3f5c, 0x33383f, 0x4a453d, 0x121215],
      shoes: [0xf2f2f2, 0x1c1c1e, 0xd3352f, 0xc0c0c8, 0x4d3722],
      accent: [0xd4af37, 0xc0c0c8, 0xf25c05, 0x2f6fd3, 0xe8e8e8, 0xd42a6a],
    },
    outfit: 'dealer', props: ['phone', 'bag', 'bottle', 'keys'],
    speed: { walk: 1.26, jog: 3.2, run: 6.0 },
    stats: { bravery: 0.48, aggression: 0.50, wealth: 0.42, fitness: 0.74, awareness: 0.90 },
    armed: { weaponId: 'combat-knife', chance: 0.30 }, health: 105,
    schedule: sch([12, 'home'], [15, 'wander'], [19, 'work'], [23, 'wander'], [24, 'work']),
    barks: bk(
      ['Watches, chains, whatever you need. Real. Mostly.',
        'Hey, friend. You look like a man with problems I can solve.',
        'Cash only. Obviously cash only.', 'You want a deal or you want the tourist price?',
        'Do not stand there, stand here. Camera sees there.',
        'I know a guy who knows a guy. I am also both guys.'],
      ['Cops! Everything in the bag, GO!', 'I was never here, I do not exist!',
        'Alley, alley, alley!', 'Drop it and walk, drop it and WALK!',
        'That is somebody else getting shot at, and I am leaving!',
        'Not tonight! Not with what I am carrying!'],
      ['You short-changed me, and I count fast.',
        'This is my corner, I pay rent on this corner. Sort of.',
        'You do not buy, you do not stand here.', 'Move along, you are killing my numbers.',
        'Talk to me like that again and see how the night goes.',
        'I remember faces. Every single one.'],
      ['Ahh! For what? For WHAT?', 'Take the money, just stop hitting!',
        'I am a businessman, not a soldier!', 'You broke my phone, that is my whole business!',
        'Somebody is going to hear about this!', 'Ow! I have got customers waiting!'],
      ['Slow night. Rain always kills it.', 'Undercover car, blue sedan, same guy every week.',
        'Everything is real if you do not look close.', 'Third tourist today bought a broken watch.',
        'I should have stayed in the phone shop.', 'Kings want a cut. Vipers want a cut. I want a holiday.',
        'Bus stop is the best office in the city.'],
    ),
    districts: ['strip', 'barrio', 'oldtown', 'downtown', 'industrial'], hours: [13, 5],
  }),
];

// ---------------------------------------------------------------------------
// WORKING CITY
// ---------------------------------------------------------------------------

const BLUE_COLLAR = [
  mk({
    id: 'construction-worker', name: 'Construction Worker', weight: 40, sex: 'x',
    desc: 'Twelfth tower this year. None of them affordable.',
    height: [1.64, 1.96], build: [0.98, 1.32],
    palette: {
      skin: SKIN_TANNED,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x63452a, 0x949089, 0x7d3a22],
      top: [0xf2a900, 0xff6a00, 0xd7f205, 0x2f6fd3, 0xe8e2d6, 0x8a8f96, 0xd3352f],
      bottom: [0x2b3f5c, 0x4a453d, 0x6b6459, 0x33383f, 0x8b8375],
      shoes: SHOE_BOOT,
      accent: [0xf2a900, 0xd7f205, 0xff6a00, 0xc0c0c8, 0x1c1c1e, 0xd3352f],
    },
    outfit: 'worker', props: ['hardhat', 'toolbox', 'clipboard', 'bottle', 'coffee', 'phone'],
    speed: { walk: 1.20, jog: 2.9, run: 5.0 },
    stats: { bravery: 0.58, aggression: 0.44, wealth: 0.34, fitness: 0.82, awareness: 0.62 },
    armed: { weaponId: 'sledgehammer', chance: 0.08 }, health: 125,
    schedule: sch([5, 'home'], [6, 'commute'], [11, 'work'], [12, 'shop'], [16, 'work'],
      [17, 'commute'], [21, 'bar'], [24, 'home']),
    barks: bk(
      ['Hardhat area, friend. That head is not rated.',
        'Morning! Mind the rebar, it does not mind you.', 'We are pouring at seven, stay off the slab.',
        'Yeah, it will be luxury. No, I could not afford a cupboard in it.',
        'Watch the crane swing, it does not stop for anybody.', 'Coffee break is nine minutes. I take twelve.'],
      ['GET OFF THE SITE! Everybody off!', 'Hard hats will not stop THAT!',
        'Behind the mixer, behind the mixer!', 'Kill the crane! Somebody kill the crane!',
        'Man down! We have got a man down!', 'Out the gate, out the gate, count heads at the truck!'],
      ['Read the sign! It is a big orange sign!',
        'You drove through a closed lane, you absolute genius!', 'Move the car or I move it with the loader!',
        'Touch my tools one more time!', 'Nobody walks under a live load, NOBODY!',
        'That is forty tons above your head, use your brain!'],
      ['Ahh! Straight through the boot!', 'Twenty years, never had a day off. Until now!',
        'Get the first aid kit off the trailer!', 'That is coming out of somebody paycheque!',
        'Ow! I have got a mortgage and one back!', 'Site foreman! SITE FOREMAN!'],
      ['Concrete is late again. Always late.', 'They changed the plans. Third time this month.',
        'Forty degrees on that roof deck. Brutal.', 'Inspector comes Friday, so we hide everything Thursday.',
        'This whole block was houses ten years ago.', 'Nail gun jammed twice before lunch.',
        'Two more floors and we top out.'],
    ),
    districts: ['downtown', 'industrial', 'suburb', 'financial', 'mall', 'oldtown'], hours: [5, 19],
  }),

  mk({
    id: 'dock-worker', name: 'Dock Worker', weight: 30, sex: 'x',
    desc: 'Moves the whole city sideways, one container at a time.',
    height: [1.66, 1.98], build: [1.02, 1.35],
    palette: {
      skin: SKIN_TANNED,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x5a5550, 0x949089, 0x63452a],
      top: [0x2f4f7a, 0xd7f205, 0xf2a900, 0x3a4a3a, 0x8a8f96, 0xd3352f, 0x1c2a3a],
      bottom: [0x2b3f5c, 0x33383f, 0x4a453d, 0x1e2b3f, 0x6b6459],
      shoes: SHOE_BOOT,
      accent: [0xd7f205, 0xf2a900, 0xc0c0c8, 0x2f6fd3, 0xd3352f, 0x1c1c1e],
    },
    outfit: 'worker', props: ['hardhat', 'clipboard', 'radio', 'toolbox', 'crate', 'coffee'],
    speed: { walk: 1.14, jog: 2.8, run: 4.8 },
    stats: { bravery: 0.62, aggression: 0.48, wealth: 0.36, fitness: 0.84, awareness: 0.66 },
    armed: { weaponId: 'crowbar', chance: 0.10 }, health: 130,
    schedule: sch([4, 'home'], [5, 'commute'], [12, 'work'], [13, 'shop'], [18, 'work'],
      [19, 'commute'], [22, 'bar'], [24, 'home']),
    barks: bk(
      ['Yellow line, friend. Stay behind the yellow line.',
        'Forklift has right of way. Always. Forever.', 'You with the shipping office? No? Then out.',
        'Third shift is the good shift. Nobody watching.', 'Mind the chains, they snap without an apology.',
        'Everything you own came through a gate like this one.'],
      ['Clear the apron! CLEAR THE APRON!', 'Get behind a container, they stop anything!',
        'Kings are shooting on the pier! Again!', 'Somebody hit the alarm, somebody hit it!',
        'Under the crane, under the crane, go!', 'Do not run toward the water, you will get pinned!'],
      ['That container is sealed for a reason!', 'You are standing in a live lane, move!',
        'Who signed this manifest? Because it is wrong!', 'Do not touch my straps!',
        'Hey! This is a restricted dock, read a sign!', 'You break it on my shift, you own it.'],
      ['Argh! Right where the strap got me last year!', 'Somebody call it in! Injury on pier four!',
        'That is two tons of nothing compared to you!', 'I have been crushed by better!',
        'Ow! Get me off the concrete!', 'I am fine! I am not fine! Get help!'],
      ['Ship is six hours late and nobody called.', 'Half these boxes never get opened here.',
        'Crane number two is groaning again.', 'Salt eats everything. Trucks, tools, boots, me.',
        'Overtime pays for the boat. The boat pays for nothing.', 'Fog rolls in, whole port stops.',
        'Somebody is running something through gate nine. Not my business.'],
    ),
    districts: ['docks', 'industrial', 'marina', 'airport'], hours: [4, 23],
  }),

  mk({
    id: 'mechanic', name: 'Mechanic', weight: 24, sex: 'x',
    desc: 'Can diagnose your engine from three lanes away and will charge you for it.',
    height: [1.60, 1.92], build: [0.94, 1.28],
    palette: {
      skin: SKIN_TANNED,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x846035, 0x949089, 0x7d3a22, 0xd42a6a],
      top: [0x2f4f7a, 0x8a2f2f, 0x3a4a3a, 0x4a453d, 0x1c1c1e, 0xd3352f, 0x2a3a4a],
      bottom: [0x2b3f5c, 0x33383f, 0x1a1a1e, 0x4a453d, 0x6b6459],
      shoes: SHOE_BOOT,
      accent: [0xd3352f, 0xf2a900, 0xc0c0c8, 0x2f6fd3, 0xffffff, 0x1c1c1e],
    },
    outfit: 'worker', props: ['toolbox', 'clipboard', 'coffee', 'keys', 'phone'],
    speed: { walk: 1.12, jog: 2.7, run: 4.7 },
    stats: { bravery: 0.52, aggression: 0.42, wealth: 0.40, fitness: 0.72, awareness: 0.64 },
    armed: { weaponId: 'crowbar', chance: 0.14 }, health: 120,
    schedule: sch([7, 'home'], [8, 'commute'], [12, 'work'], [13, 'shop'], [18, 'work'],
      [20, 'wander'], [23, 'bar'], [24, 'home']),
    barks: bk(
      ['That noise? That is money. Your money.',
        'Pop the hood, I will look for free. The looking is free.', 'Whatever it is, it is the gearbox. It is always the gearbox.',
        'You hear that ticking? Do not drive on that.', 'Parts are two weeks out. Everything is two weeks out.',
        'Nice motor. Somebody ruined it, but nice motor.'],
      ['Get out from under the lift! GET OUT!', 'There is fuel on the floor, no sparks, no sparks!',
        'Roll the door down! Roll it down!', 'Take the truck, keys are in it, GO!',
        'Everybody behind the ramps!', 'This shop is not bulletproof, move!'],
      ['You drove it here like THAT? On purpose?',
        'I told you three weeks ago. Three weeks.', 'Do not touch the torque wrench, that is calibrated!',
        'Pay the invoice or the car sleeps here.', 'You put the wrong oil in it. I can smell it.',
        'Block my bay again, I will have you towed.'],
      ['Ahh! That is my good hand, the wrench hand!', 'You are going to pay for the bodywork AND the body!',
        'Get me a rag, a real one!', 'I have had cars fall on me, and that hurt less!',
        'Ow! Somebody kill the compressor!', 'Not the knee! I need that for the clutch pedal!'],
      ['Timing belt. Everybody skips the timing belt.', 'This whole city drives on bald tyres.',
        'Rebuilt a whole block by hand last winter.', 'The salt air rots the brake lines out here.',
        'Customer says it makes a noise. It makes forty noises.', 'Coffee, coolant, same colour by Friday.',
        'If it is electrical, I am going home.'],
    ),
    districts: ['industrial', 'suburb', 'trailer', 'oldtown', 'docks', 'barrio'], hours: [7, 22],
  }),

  mk({
    id: 'cleaner', name: 'Cleaner', weight: 26, sex: 'x',
    desc: 'Sees the whole building at 4 AM and knows exactly who is lying.',
    height: [1.50, 1.80], build: [0.88, 1.22],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x846035, 0x949089, 0xcecac3, 0x1b1410],
      top: [0x3f8ac0, 0x2f9b6a, 0xe9e2d6, 0x8a8f96, 0xb0b8c0, 0x6b6459, 0xd0d8e0],
      bottom: [0x2f3a46, 0x4a453d, 0x33383f, 0x2b3f5c, 0x6b6459],
      shoes: [0xf2f2f2, 0x1c1c1e, 0x4a453d, 0x2f3a46, 0xc0c0c8],
      accent: [0xffd60a, 0x3f8ac0, 0xd3352f, 0xffffff, 0x2f9b6a, 0xf2a900],
    },
    outfit: 'worker', props: ['mop', 'bucket', 'cart', 'lanyard', 'radio', 'bag'],
    speed: { walk: 1.00, jog: 2.4, run: 4.2 },
    stats: { bravery: 0.40, aggression: 0.24, wealth: 0.20, fitness: 0.66, awareness: 0.78 },
    schedule: sch([6, 'home'], [8, 'commute'], [14, 'work'], [16, 'home'], [22, 'work'],
      [23, 'commute'], [24, 'home']),
    barks: bk(
      ['Careful, floor is wet. I put a sign. Nobody reads the sign.',
        'Morning. Or night. In here it is the same light.', 'You want the bathroom? It is closed. I just did it.',
        'Do not step there. Please. Just do not.', 'Twenty floors tonight. Twenty.',
        'I clean up after this whole city. Literally.'],
      ['I am not paid for gunfire! Not paid for this!',
        'Behind the cart! Get behind the cart!', 'Service stairs! I know the service stairs!',
        'Somebody hit the fire alarm!', 'I have got grandchildren, I am going!',
        'Out! Out! Leave the mop, leave everything!'],
      ['You walked right across it. On purpose!', 'Who does this? Who leaves this?',
        'Pick that up. I am not your mother and I am not doing it.',
        'Every night. Every single night the same mess.', 'That bin is two metres away. Two!',
        'I will tell the building manager and I will enjoy it.'],
      ['Ow! I have got a bad shoulder already!', 'Why me? Why always me?',
        'Somebody call somebody, my phone is in the cart!', 'I am sixty-one years old!',
        'Do not knock the chemicals over, that is worse than me!', 'Ahh! And I have got six floors left!'],
      ['Somebody spilled coffee in the elevator again.', 'The executives are the messiest, every time.',
        'Night shift pays more. Not enough more.', 'I found a wallet in the stairwell. Handed it in. Nothing.',
        'This floor has never once been thanked.', 'Machine takes the card but never gives the drink.',
        'Two hours to go and then the bus.'],
    ),
    districts: ['downtown', 'financial', 'mall', 'hills', 'oldtown', 'airport'], hours: [5, 3],
  }),

  mk({
    id: 'valet', name: 'Valet', weight: 18, sex: 'x',
    desc: 'Has driven every supercar in Leonida for exactly ninety seconds each.',
    height: [1.58, 1.88], build: [0.84, 1.08],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x846035, 0x1b1410, 0x63452a],
      top: [0x7a1020, 0x1c1c1e, 0x1f3a5c, 0x2a2a2e, 0x6a2f6a, 0x0f3a2a],
      bottom: [0x1a1a1e, 0x23252b, 0x2f3a46, 0x121215, 0x33383f],
      shoes: SHOE_DRESS,
      accent: [0xd4af37, 0xe8e8e8, 0xc0c0c8, 0x7a1020, 0xffd60a, 0x1c1c1e],
    },
    outfit: 'suit', props: ['keys', 'lanyard', 'phone', 'notepad'],
    speed: { walk: 1.36, jog: 3.4, run: 6.2 },
    stats: { bravery: 0.36, aggression: 0.24, wealth: 0.26, fitness: 0.78, awareness: 0.82 },
    schedule: sch([10, 'home'], [12, 'commute'], [16, 'work'], [17, 'shop'], [23, 'work'], [24, 'home']),
    barks: bk(
      ['Keys, sir? I will treat it better than you do.',
        'Welcome back! Silver coupe, bay four, two minutes.', 'Leave it running, I have got it.',
        'Ticket please. No ticket, no car, no exceptions.', 'She drives beautiful. I mean, I would not know.',
        'Give me ninety seconds and a clear ramp.'],
      ['Take your car! Take it and GO!', 'Everybody into the garage, lower level!',
        'Do not run through the ramp, cars come fast!', 'Keys! Grab all the keys!',
        'I am not dying over somebody convertible!', 'Manager! MANAGER!'],
      ['That is a valet lane, not a parking space!', 'You threw the keys AT me!',
        'I parked it perfect and you know it.', 'No tip? Four times now. Four.',
        'The dent was there. It was absolutely there.', 'Back up. You are blocking the whole hotel.'],
      ['Ow! Watch it, I have got somebody keys!', 'Not in front of the guests!',
        'Somebody is going to lose a very nice car over this!', 'My shoulder! That is my steering arm!',
        'I just work here! I just park things!', 'Argh! Call the front desk!'],
      ['Drove a thousand-horsepower thing today. For forty metres.',
        'Ramp three has a blind corner. Somebody will learn the hard way.',
        'Twelve hour shift, three hours of it running.', 'Rich people cannot parallel park. Not one of them.',
        'I know every scratch on every car here.', 'Somebody left a whole suitcase of cash. Probably not cash.',
        'If I owned one of these I would never hand the keys over.'],
    ),
    districts: ['strip', 'hills', 'marina', 'downtown', 'financial'], hours: [11, 4],
  }),

  mk({
    id: 'fisherman', name: 'Fisherman', weight: 20, sex: 'x',
    desc: 'Out before the sun, back with two fish and eleven opinions.',
    height: [1.58, 1.92], build: [0.94, 1.30],
    palette: {
      skin: SKIN_TANNED,
      hair: [0x2e2116, 0x4a3221, 0x5a5550, 0x949089, 0xcecac3, 0x7d3a22, 0x63452a],
      top: [0x3a4a3a, 0x2f4f7a, 0xf2a900, 0xe9e2d6, 0x8a8f96, 0x6b6459, 0x1c2a3a],
      bottom: [0x3a3f32, 0x2b3f5c, 0x4a453d, 0x6b6459, 0x33383f],
      shoes: SHOE_BOOT,
      accent: [0xf2a900, 0xd7f205, 0xc0c0c8, 0x2f6fd3, 0xe8e8e8, 0x8a6a30],
    },
    outfit: 'worker', props: ['fishingrod', 'cooler', 'net', 'sunhat', 'radio', 'bucket'],
    speed: { walk: 1.02, jog: 2.4, run: 4.2 },
    stats: { bravery: 0.56, aggression: 0.34, wealth: 0.24, fitness: 0.68, awareness: 0.72 },
    schedule: sch([4, 'home'], [11, 'work'], [13, 'shop'], [17, 'work'], [20, 'bar'], [24, 'home']),
    barks: bk(
      ['They are biting off the second piling. Do not tell anybody.',
        'Four in the morning is the only honest hour.', 'You need bait? I have got too much bait.',
        'Tide turns at eleven. After that, forget it.', 'Caught a snapper this long. Yes, this long.',
        'Mind the line, friend, that hook has a mind of its own.'],
      ['Cut the line, cut the line, we are going!', 'Everybody off the pier!',
        'Leave the cooler! LEAVE IT!', 'Into the boat! Untie it, untie it!',
        'I have been out in hurricanes calmer than this!', 'Down behind the rail!'],
      ['You cast right across my line, you clown!', 'That is my spot. Been my spot since before you were born.',
        'Do not throw trash in my water!', 'Rev that engine one more time and scare every fish here!',
        'Cut my net and I will cut something of yours.', 'Whole pier and you stand THERE?'],
      ['Ahh! I have been hooked worse by my own rod!', 'You are going to answer to the harbourmaster!',
        'Somebody grab the rod before it goes in!', 'Salt water in that is going to be a nightmare!',
        'Ow! I am seventy in March!', 'Get me to the jetty!'],
      ['Water is warm. Fish are lazy. Simple as that.',
        'Nets came up half empty again. Third week.', 'Big boats took everything, left us the tourists.',
        'Storm out past the reef. You can smell it.', 'Motor needs a rebuild, so does my back.',
        'Somebody dumped something in the channel. Fish know.', 'Never sell the boat. Ever.'],
    ),
    districts: ['docks', 'marina', 'beach', 'swamp', 'trailer'], hours: [4, 22],
  }),

  mk({
    id: 'street-vendor', name: 'Street Vendor', weight: 32, sex: 'x',
    desc: 'Cart, umbrella, and a running commentary on everyone who walks past.',
    height: [1.52, 1.84], build: [0.90, 1.26],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x949089, 0xcecac3, 0x846035, 0x1b1410],
      top: [0xd3352f, 0xf2a900, 0x2f9b6a, 0xe9e2d6, 0x2f6fd3, 0xf25c05, 0xffffff],
      bottom: [0x2b3f5c, 0x4a453d, 0x1a1a1e, 0x6b6459, 0x33383f],
      shoes: [0xf2f2f2, 0x4d3722, 0x1c1c1e, 0x8a6a48, 0x2f3a46],
      accent: [0xffd60a, 0xd3352f, 0x2f9b6a, 0xf25c05, 0xffffff, 0xf2a900],
    },
    outfit: 'worker', props: ['cart', 'umbrella', 'tray', 'bag', 'radio', 'bottle'],
    speed: { walk: 0.98, jog: 2.3, run: 4.1 },
    stats: { bravery: 0.44, aggression: 0.36, wealth: 0.22, fitness: 0.58, awareness: 0.80 },
    schedule: sch([7, 'home'], [9, 'commute'], [15, 'work'], [16, 'shop'], [22, 'work'], [24, 'home']),
    barks: bk(
      ['Fresh! Cheap! Two for one if you look hungry!',
        'Best on the block, and the block agrees.', 'Hey! You! Yes you! You need this!',
        'Cash, card, whatever, just take one.', 'Tourist price, local price. Which are you?',
        'Everybody who walks past regrets it. Everybody.'],
      ['The cart! Somebody help me with the cart!',
        'Down behind the wheels, down!', 'Not again! Second time this month!',
        'I am closing, I am closing, I am GONE!', 'Take the food, take everything, just go!',
        'Somebody call the police, I have got no phone!'],
      ['You ate it and now you have no money? Beautiful.',
        'That is my pitch! I have got a permit! Somewhere!', 'Do not lean on the cart, it tips!',
        'You knocked over the whole tray!', 'Complain to who? I am the manager, the cook and the cleaner!',
        'Go buy it from the chain store then, see how you like it!'],
      ['Ahh! My knee! I stand all day on that knee!',
        'You cost me the whole lunch rush!', 'The cart, is the cart okay? Never mind me!',
        'Somebody hold the umbrella!', 'I have been robbed twice, this is worse!',
        'Ow! Twelve hours out here for this!'],
      ['Lunch rush is twenty minutes of chaos and six hours of nothing.',
        'Health inspector likes me. I feed him.', 'Rain. Perfect. No rain today they said.',
        'Cart has a bad wheel. Costs more than a new cart to fix.',
        'That new place charges nine dollars for the same thing.', 'Forty years my family sold on this corner.',
        'You want it spicy? Nobody wants it as spicy as I make it.'],
    ),
    districts: ['strip', 'oldtown', 'downtown', 'beach', 'barrio', 'mall', 'marina', 'park'], hours: [6, 2],
  }),
];

// ---------------------------------------------------------------------------
// HOSPITALITY
// ---------------------------------------------------------------------------

const HOSPITALITY = [
  mk({
    id: 'chef', name: 'Chef', weight: 18, sex: 'x',
    desc: 'Twelve burns, one knife roll, zero patience for the front of house.',
    height: [1.58, 1.92], build: [0.92, 1.30],
    palette: {
      skin: SKIN_INDOOR,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x949089, 0x846035, 0xd42a6a, 0x1b1410],
      top: [0xf4f2ec, 0xe8e4da, 0x1c1c1e, 0xd8d4cc, 0x2a2a2e, 0xf8f8f4],
      bottom: [0x2a2a2e, 0x1a1a1e, 0x4a4a52, 0x33383f, 0x6b6459],
      shoes: [0x1c1c1e, 0xf2f2f2, 0x2f3a46, 0x4a453d, 0x141414],
      accent: [0xd3352f, 0x1c1c1e, 0xc0c0c8, 0xf2a900, 0xffffff, 0x2f9b6a],
    },
    outfit: 'chef', props: ['tray', 'notepad', 'coffee', 'bottle'],
    speed: { walk: 1.28, jog: 3.0, run: 5.2 },
    stats: { bravery: 0.56, aggression: 0.62, wealth: 0.38, fitness: 0.70, awareness: 0.74 },
    armed: { weaponId: 'combat-knife', chance: 0.16 }, health: 115,
    schedule: sch([9, 'home'], [10, 'shop'], [15, 'work'], [16, 'home'], [23, 'work'], [24, 'bar']),
    barks: bk(
      ['Behind you! Always say behind you!', 'Kitchen is closed. The kitchen is always closed to you.',
        'You want it well done? In my restaurant? Fine. Fine!',
        'Hot pan coming through, move or wear it.', 'The special is whatever I bought too much of.',
        'Taste this. No, taste it. Good, yes?'],
      ['Kill the gas! Somebody kill the gas!', 'Out the back, past the bins, GO!',
        'Everybody out of my kitchen, out!', 'There is oil at two hundred degrees in here!',
        'I have got twelve covers and a gunfight!', 'Down behind the pass!'],
      ['Send it back one more time. One more time!',
        'Who let front of house in my kitchen?', 'You touched my knives. Nobody touches my knives.',
        'Table nine wants ketchup. Tell table nine no.', 'The supplier sent me rubbish again!',
        'I have been cooking since before you could read a menu!'],
      ['Ahh! I have burned myself worse on a Tuesday!',
        'Not the wrist! That is the pan wrist!', 'Somebody take over the pass!',
        'This is worse than the fryer incident!', 'Get me a towel and get me out of here!',
        'Ow! Service is ruined, RUINED!'],
      ['Fish came in beautiful today. Beautiful.', 'Two of my line cooks quit. On a Friday.',
        'Prices went up again. The menu will not.', 'Sixteen hours and I still dream about the pass.',
        'The critic came in. I did not recognise him. Good.', 'Everything is better with more salt. Everything.',
        'I opened this place with nothing but debt and spite.'],
    ),
    districts: ['strip', 'oldtown', 'downtown', 'marina', 'mall', 'barrio'], hours: [9, 3],
  }),

  mk({
    id: 'waiter', name: 'Waiter', weight: 24, sex: 'x',
    desc: 'Six tables, one memorised specials speech, and a smile on a timer.',
    height: [1.56, 1.88], build: [0.82, 1.10],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x846035, 0xcda85e, 0x1b1410, 0xd42a6a],
      top: [0xf4f2ec, 0x1c1c1e, 0x2f3a46, 0xe8e4da, 0x7a1020, 0x1f3a5c],
      bottom: [0x1a1a1e, 0x23252b, 0x2a2a2e, 0x121215, 0x33383f],
      shoes: SHOE_DRESS,
      accent: [0x7a1020, 0xd4af37, 0x1c1c1e, 0xe8e8e8, 0x2f9b6a, 0xc0c0c8],
    },
    outfit: 'chef', props: ['tray', 'notepad', 'lanyard', 'phone'],
    speed: { walk: 1.32, jog: 3.1, run: 5.4 },
    stats: { bravery: 0.32, aggression: 0.26, wealth: 0.24, fitness: 0.72, awareness: 0.84 },
    schedule: sch([10, 'home'], [11, 'commute'], [15, 'work'], [17, 'home'], [23, 'work'], [24, 'bar']),
    barks: bk(
      ['Table for one? Right by the window, the good window.',
        'Still or sparkling? It is the same tap, honestly.', 'I will be right with you. I will not, but I will.',
        'The specials are on the board and also in my memory. Barely.',
        'Everything okay here? Great. Great.', 'Kitchen is slammed, be gentle with me.'],
      ['Everyone under the tables! UNDER THE TABLES!',
        'Out through the kitchen, follow me!', 'Leave the bill! LEAVE THE BILL!',
        'I am dropping the tray, I am dropping everything!', 'Somebody lock the front door!',
        'This is not what they trained us for!'],
      ['Eighteen percent. It is printed on the menu!', 'You cannot sit there, that is a reserved table!',
        'I have said sorry four times, that is my limit!', 'Do not snap your fingers at me. Ever.',
        'You changed your order three times!', 'The kitchen makes the food. I just carry it!'],
      ['Ow! Hot plates, hot plates, still hot!', 'That is a whole table of food on the floor!',
        'I do not get paid enough for a bruise!', 'My back! I carry things for a living!',
        'Somebody take the tray!', 'Ahh! And I was about to finish my shift!'],
      ['Table twelve tipped in coins. On purpose.', 'Double shift and the bus stops at midnight.',
        'The chef threw a pan again. Normal Tuesday.', 'Tourists always want the sunset table.',
        'I have got an audition Thursday. Do not tell the manager.',
        'Somebody left a phone, a hat and a small dog.', 'Rent is due and the tips are thin.'],
    ),
    districts: ['strip', 'oldtown', 'downtown', 'marina', 'beach', 'mall'], hours: [10, 3],
  }),

  mk({
    id: 'bartender', name: 'Bartender', weight: 20, sex: 'x',
    desc: 'Knows your drink, your ex, and exactly when to cut you off.',
    height: [1.58, 1.90], build: [0.86, 1.18],
    palette: {
      skin: SKIN_INDOOR,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0xd42a6a, 0x7b3ff2, 0x846035, 0xe8e8e8],
      top: [0x1c1c1e, 0x2a1030, 0x7a1020, 0xf4f2ec, 0x1f3a5c, 0x0f3a2a, 0x3a3a40],
      bottom: [0x1a1a1e, 0x121215, 0x2b3f5c, 0x23252b, 0x33383f],
      shoes: [0x1c1c1e, 0x2e1f14, 0xf2f2f2, 0x141414, 0x4d3722],
      accent: [0xd42a6a, 0xd4af37, 0x2ec4b6, 0xf25c05, 0xe8e8e8, 0x9b2fbd],
    },
    outfit: 'casual', props: ['bottle', 'tray', 'phone', 'notepad'],
    speed: { walk: 1.24, jog: 2.9, run: 5.1 },
    stats: { bravery: 0.54, aggression: 0.38, wealth: 0.34, fitness: 0.66, awareness: 0.88 },
    armed: { weaponId: 'baseball-bat', chance: 0.18 }, health: 115,
    schedule: sch([12, 'home'], [16, 'shop'], [18, 'home'], [24, 'work']),
    barks: bk(
      ['What are we drinking? And be honest about it.',
        'First one is on the house. The second one is on you.', 'You look like a long story. I have got all night.',
        'Tab or cash? Tab is a commitment.', 'House special is strong and blue. Do not ask why.',
        'Last call is two. I mean it at two-thirty.'],
      ['Everybody behind the bar! Behind it!', 'Lights on, doors open, OUT!',
        'Not in my bar, not tonight!', 'Somebody grab the register and run!',
        'Down! Glass everywhere, stay down!', 'I am calling it in from the cellar!'],
      ['You are done. Do not argue, you are done.',
        'Take it outside. Outside means outside.', 'Throw one more glass and see what I keep under here.',
        'You have been cut off at three bars on this street.', 'Pay the tab. Right now. In front of me.',
        'Do not shout at my staff. Shout at me, I am better at it.'],
      ['Ahh! Right over the bar, classic!', 'You broke the good bottle! The GOOD one!',
        'Somebody grab him before he does it twice!', 'Glass in my hand, glass everywhere!',
        'Ow! I have been doing this fifteen years and still!', 'Call it in! Call it in!'],
      ['Slow night. Full moon, they always say, and it is always wrong.',
        'Wiped this bar ten thousand times.', 'Somebody proposed here Tuesday. She said no. Rough.',
        'Ice machine is dying. It knows it.', 'Everybody tells me everything. Everybody.',
        'The band plays at eleven, so I turn the speakers down at ten fifty-nine.',
        'Two hours to close. Then two hours of cleaning.'],
    ),
    districts: ['strip', 'downtown', 'oldtown', 'marina', 'beach', 'barrio', 'trailer'], hours: [16, 6],
  }),
];

// ---------------------------------------------------------------------------
// MEDICAL & RESCUE
// ---------------------------------------------------------------------------

const MEDICAL = [
  mk({
    id: 'nurse', name: 'Nurse', weight: 22, sex: 'x',
    desc: 'Thirteenth hour of a twelve hour shift, still the calmest person in the room.',
    height: [1.54, 1.86], build: [0.86, 1.20],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x846035, 0x949089, 0xcda85e, 0x1b1410],
      top: [0x3fa9b8, 0x4a7fc0, 0x6ab98a, 0xe8e4da, 0x9b7fc0, 0x3f8ac0, 0x5fbfa0],
      bottom: [0x3fa9b8, 0x4a7fc0, 0x6ab98a, 0x2f3a46, 0x9b7fc0],
      shoes: [0xf2f2f2, 0xe8e8e8, 0x1c1c1e, 0xd0d8e0, 0x3fa9b8],
      accent: [0xffffff, 0x3fa9b8, 0xd3352f, 0x4a7fc0, 0xffd60a, 0x6ab98a],
    },
    outfit: 'nurse', props: ['clipboard', 'lanyard', 'phone', 'coffee', 'medkit'],
    speed: { walk: 1.34, jog: 3.2, run: 5.5 },
    stats: { bravery: 0.66, aggression: 0.22, wealth: 0.38, fitness: 0.74, awareness: 0.88 },
    health: 110,
    schedule: sch([7, 'home'], [8, 'commute'], [13, 'work'], [14, 'shop'], [20, 'work'],
      [21, 'commute'], [24, 'home']),
    barks: bk(
      ['You alright? You do not look alright. Sit down.',
        'Excuse me, coming through, this is urgent.', 'Have you eaten today? Genuinely, have you?',
        'Do not tell me it is nothing. Everybody says nothing.', 'Yes I am on a break. My first one. It is four.',
        'Keep pressure on it and stop moving.'],
      ['Everybody back! Give me room and give me quiet!',
        'Call it in! Two casualties, maybe three!', 'I need hands, not phones!',
        'We are getting these people out, now!', 'Do not move him! Do NOT move him!',
        'Clear the street, the ambulance cannot get in!'],
      ['I said give him space! Back up!', 'Put the phone away and help or leave!',
        'Do not you dare drive off, you hit somebody!', 'This is the fourth one tonight from the same corner!',
        'Who moved him? Who moved him!', 'I have got two hands and eleven patients!'],
      ['Ow! I am the one who patches people up!',
        'Fine, fine, I am fine, check on him first!', 'Watch it, I am carrying sharps!',
        'That is going to need stitches and I know because I do stitches!',
        'Somebody take over compressions!', 'Argh! Not now, not in the middle of this!'],
      ['Fourteen hours. Two coffees. One sandwich.', 'The ward is full. It is always full.',
        'Somebody came in with a fish hook through a thumb. Again.',
        'Full moon, festival weekend and a heatwave. Wonderful.', 'I have not sat down since Tuesday.',
        'They cut the budget and added beds. Genius.', 'Wash your hands. I mean everyone. Everyone.'],
    ),
    districts: ['downtown', 'suburb', 'oldtown', 'barrio', 'mall'], hours: [5, 2],
  }),

  mk({
    id: 'doctor', name: 'Doctor', weight: 12, sex: 'x',
    desc: 'Composed, exhausted, and mentally still on rounds.',
    height: [1.58, 1.92], build: [0.84, 1.16],
    palette: {
      skin: SKIN_INDOOR,
      hair: [0x1b1410, 0x33231a, 0x4a3221, 0x8a8177, 0xb2aea7, 0xcecac3, 0x63452a],
      top: [0xf4f2ec, 0xffffff, 0xe8e4da, 0xdfe4ea, 0xf8f8f4, 0xd0d8e0],
      bottom: [0x2c333d, 0x3d4650, 0x1f242b, 0x4f5a66, 0x33383f],
      shoes: SHOE_DRESS,
      accent: [0x3fa9b8, 0x1f4f8f, 0xd3352f, 0xffffff, 0xc0c0c8, 0x2f9b6a],
    },
    outfit: 'medic', props: ['clipboard', 'lanyard', 'phone', 'medkit', 'coffee'],
    speed: { walk: 1.30, jog: 3.0, run: 5.2 },
    stats: { bravery: 0.62, aggression: 0.18, wealth: 0.78, fitness: 0.60, awareness: 0.90 },
    health: 105,
    schedule: sch([6, 'home'], [7, 'commute'], [13, 'work'], [14, 'shop'], [19, 'work'],
      [20, 'commute'], [22, 'home'], [24, 'work']),
    barks: bk(
      ['Look at me. Follow my finger. Good.', 'How long has it been like that? Be honest.',
        'Sit. You are about to fall over and I do not catch people.',
        'It is probably nothing. Probably. Come in Monday.', 'I have seen worse before breakfast.',
        'Drink water. Sleep. That is most of medicine.'],
      ['I need this area cleared immediately!', 'Triage! Worst first, nobody argues!',
        'Get me an airway and get me light!', 'Everyone who is walking, walk away!',
        'Two critical! Where is that ambulance!', 'I am a doctor, let me through!'],
      ['I told you to stay off it for six weeks!', 'Do not diagnose yourself at me.',
        'Move the car, that is an emergency bay!', 'Whoever discharged this patient was wrong.',
        'I have been awake for thirty hours, test my patience.', 'This was entirely preventable. Entirely.'],
      ['Ow. Noted. That is a fracture. My own fracture.',
        'Treat the others first. That is an order.', 'I can talk you through what you need to do. Listen.',
        'Interesting. Extremely painful, but interesting.', 'Pressure. Firm pressure. On me. Now.',
        'Argh! And I have surgery at six!'],
      ['Three hours of sleep and a double espresso.', 'The ER has seen forty people today. Forty.',
        'Half of them could have stayed home.', 'The heat brings out the worst in this city.',
        'I keep telling them: helmets. Nobody listens.', 'Paperwork takes longer than the surgery.',
        'One more chart and then I am genuinely leaving.'],
    ),
    districts: ['downtown', 'hills', 'suburb', 'financial', 'oldtown'], hours: [6, 2],
  }),

  mk({
    id: 'paramedic', name: 'Paramedic', weight: 16, sex: 'x',
    desc: 'Arrives in ninety seconds, leaves with everybody still breathing.',
    height: [1.60, 1.94], build: [0.92, 1.24],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x846035, 0x949089, 0x1b1410],
      top: [0x1f6f3f, 0xd7f205, 0x2f6fd3, 0x1c3a2a, 0xf2a900, 0x0f4f2a],
      bottom: [0x1c3a2a, 0x2f3a46, 0x1a1a1e, 0x33383f, 0x1f6f3f],
      shoes: SHOE_BOOT,
      accent: [0xd7f205, 0xffd60a, 0xd3352f, 0xffffff, 0x2f6fd3, 0xf2a900],
    },
    outfit: 'medic', props: ['medkit', 'radio', 'clipboard', 'flashlight', 'lanyard'],
    speed: { walk: 1.40, jog: 3.6, run: 6.2 },
    stats: { bravery: 0.86, aggression: 0.20, wealth: 0.34, fitness: 0.86, awareness: 0.92 },
    health: 130,
    schedule: sch([6, 'home'], [7, 'commute'], [14, 'work'], [15, 'shop'], [22, 'work'], [24, 'home']),
    barks: bk(
      ['Stay with me. Eyes on me. What is your name?',
        'Coming through, medical, coming through!', 'You are going to be fine. I do this all day.',
        'Do not stand up. Whatever you do, do not stand up.', 'Somebody hold this. Yes, you. Hold it.',
        'Breathe slow. Slower than that. Good.'],
      ['Scene is not safe! Pull back! PULL BACK!',
        'Get the rig moving, we load and go!', 'Shots fired, we need units before we go in!',
        'Grab the bag and grab the patient!', 'Everybody behind the ambulance, use it as cover!',
        'Dispatch, we are taking fire, repeat, taking fire!'],
      ['Move your car! People die because of parked cars!',
        'Back up! I will not say it again!', 'You called us for THAT? Somebody is dying across town!',
        'Get the crowd off him, now!', 'Stop filming and start helping!',
        'That is the third time you have blocked the bay!'],
      ['I am hit, I am hit, keep working on him!',
        'Argh! Bag me a dressing, I can do it myself!', 'I am fine, the patient is not, priorities!',
        'Somebody take the radio and call it in!', 'Not my shoulder, I need that to lift!',
        'Ow! Twenty years and first time for this!'],
      ['Six calls since midnight. Two were real.', 'That corner takes a life a month. Nobody fixes it.',
        'Ambulance smells like disinfectant and old coffee. Home.',
        'Traffic here does not move for sirens. Never has.', 'Restocked the rig twice today.',
        'If people just wore seatbelts I would be unemployed.', 'Quiet night. Do not say the Q word.'],
    ),
    districts: [], hours: [0, 24],
  }),

  mk({
    id: 'firefighter', name: 'Firefighter', weight: 12, sex: 'x',
    desc: 'Runs toward the thing everyone else is filming.',
    height: [1.68, 1.98], build: [1.02, 1.34],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x63452a, 0x949089, 0x7d3a22],
      top: [0x2a2a2e, 0xd7b04a, 0x8a2f10, 0x1c1c1e, 0xd3352f, 0x4a3a24],
      bottom: [0x2a2a2e, 0x1c1c1e, 0x4a3a24, 0x33383f, 0x8a2f10],
      shoes: [0x141414, 0x1a120c, 0x2e1f14, 0x21201e, 0x3a2a1c],
      accent: [0xd7b04a, 0xffd60a, 0xd3352f, 0xc0c0c8, 0xf25c05, 0xffffff],
    },
    outfit: 'fire', props: ['axe', 'helmet', 'radio', 'flashlight'],
    speed: { walk: 1.24, jog: 3.2, run: 5.6 },
    stats: { bravery: 0.96, aggression: 0.30, wealth: 0.36, fitness: 0.94, awareness: 0.88 },
    health: 160,
    schedule: sch([8, 'home'], [9, 'commute'], [12, 'work'], [13, 'gym'], [20, 'work'], [24, 'home']),
    barks: bk(
      ['Back behind the tape, please. All the way back.',
        'Is anybody still inside? Think. Anybody?', 'We have got it. Let us work.',
        'Move the vehicle, we need the hydrant.', 'Everybody out and stay out.',
        'Yes, it is hot. Yes, I noticed.'],
      ['Structure is going! Everybody out, OUT!',
        'Charge the line! Charge it now!', 'Mayday, mayday, we have a collapse!',
        'Get the civilians back another fifty metres!', 'That is a gas line, clear the block!',
        'Two of ours are still inside, move!'],
      ['You parked on the hydrant. On the HYDRANT.',
        'Get that drone out of my airspace!', 'This is an active scene, not a show!',
        'Somebody lit this on purpose and I will find out who.',
        'Move the crowd or I turn the hose on the crowd. Kidding. Mostly.',
        'Do not go back in for a photo album!'],
      ['I am alright! Get the line back up!',
        'Argh! Somebody take the nozzle!', 'Burn on the arm, nothing new!',
        'Ceiling caught me, keep going!', 'Get me outside and get me water!',
        'I have walked out of worse than this!'],
      ['Four calls today. Two were smoke alarms with dead batteries.',
        'Old town buildings go up like kindling.', 'We repainted the truck. She looks good.',
        'Dry season is coming. Everybody is careless.', 'Kids came by the station today. Best part of the week.',
        'The hills catch every summer. Every single one.', 'Check your alarms. Please. Just check them.'],
    ),
    districts: [], hours: [0, 24],
  }),

  mk({
    id: 'lifeguard', name: 'Lifeguard', weight: 16, sex: 'x',
    desc: 'Whistle, zinc, and a permanent scan of the second sandbar.',
    height: [1.62, 1.92], build: [0.84, 1.08],
    palette: {
      skin: SKIN_TANNED,
      hair: HAIR_BLEACH,
      top: [0xd3352f, 0xffd60a, 0xf25c05, 0xffffff, 0xd3352f, 0xff6a00],
      bottom: [0xd3352f, 0x1c1c1e, 0xffd60a, 0x2f3a46, 0xf25c05],
      shoes: SHOE_SANDAL,
      accent: [0xffd60a, 0xd3352f, 0xffffff, 0xf25c05, 0x0a84ff, 0x1c1c1e],
    },
    outfit: 'lifeguard', props: ['binoculars', 'radio', 'bottle', 'towel', 'sunhat'],
    speed: { walk: 1.30, jog: 3.8, run: 6.6 },
    stats: { bravery: 0.88, aggression: 0.26, wealth: 0.26, fitness: 0.96, awareness: 0.94 },
    health: 120,
    schedule: sch([7, 'home'], [8, 'commute'], [13, 'work'], [14, 'beach'], [19, 'work'],
      [21, 'beach'], [24, 'home']),
    barks: bk(
      ['Swim between the flags! That is what they are for!',
        'Rip current past the second bar today. Stay in close.',
        'You are a strong swimmer? Everybody is, until they are not.',
        'Sunscreen. Now. You are going pink already.', 'No glass on the sand, please.',
        'Water is twenty-six and beautiful. Behave in it.'],
      ['Everybody OUT of the water! Out, now!',
        'Clear the beach! Move up past the dunes!', 'I have got a swimmer down, I have got a swimmer down!',
        'Radio the tower! Radio it!', 'Get the kids first! Kids first!',
        'This is not a drill, MOVE!'],
      ['I blew the whistle four times! Four!',
        'That is a no-swim zone and you can read!', 'Get the jet ski away from the swimmers!',
        'Do not dive off the pier. People die doing that.', 'You let a six year old out to the bar alone?',
        'Fins, board, flags. Learn them or leave.'],
      ['Ahh! Keep watching the water! Somebody watch the water!',
        'I am fine, there are people out there!', 'Get me to the tower, I can still call it!',
        'Salt and blood, great combination!', 'Ow! Do not let the swimmers drift!',
        'Somebody take the binoculars!'],
      ['Three rescues before noon. Tourists.', 'That sandbar moves every storm.',
        'Jellyfish season. Nobody believes me until they meet one.',
        'The tower gets to fifty degrees by two.', 'Same guy swims out too far every Sunday.',
        'Flags go up at eight, come down at six.', 'Best office in the world. Worst pay in the world.'],
    ),
    districts: ['beach', 'marina', 'park'], hours: [7, 21],
  }),
];

// ---------------------------------------------------------------------------
// LAW & ORDER
// ---------------------------------------------------------------------------

const LAW = [
  mk({
    id: 'cop-patrol', name: 'Patrol Officer', weight: 26, sex: 'x',
    desc: 'Two years on the beat, one thermos, infinite paperwork.',
    height: [1.66, 1.96], build: [0.96, 1.26],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x63452a, 0x949089, 0x1b1410],
      top: [0x1c2a4a, 0x23304f, 0x2a3a5c, 0x18223a, 0x2f3a5f, 0x141c2e],
      bottom: [0x18223a, 0x1c2a4a, 0x141c2e, 0x23304f, 0x2a2f3a],
      shoes: [0x141414, 0x1a120c, 0x21201e, 0x2e1f14, 0x0f0f10],
      accent: [0xc0c0c8, 0xd4af37, 0x2f6fd3, 0xd3352f, 0xffffff, 0xffd60a],
    },
    outfit: 'cop', props: ['baton', 'radio', 'notepad', 'flashlight', 'coffee', 'lanyard'],
    speed: { walk: 1.28, jog: 3.3, run: 5.9 },
    stats: { bravery: 0.80, aggression: 0.58, wealth: 0.38, fitness: 0.82, awareness: 0.88 },
    armed: { weaponId: 'pistol-9', chance: 1.0 }, health: 150,
    schedule: sch([6, 'work'], [7, 'commute'], [14, 'work'], [15, 'shop'], [22, 'work'], [24, 'work']),
    barks: bk(
      ['Evening. Everything alright here?', 'Keep it moving, folks. Nothing to see.',
        'Got some ID on you? Just routine.', 'You did not see a purple sedan come through here?',
        'Slow down through the beach zone. It is thirty for a reason.',
        'Have a good night. Stay out of the alleys.'],
      ['Shots fired! Shots fired, requesting backup!',
        'Dispatch, ten-thirteen, officer needs assistance!', 'Get down, everybody down!',
        'He is armed! Suspect is armed!', 'Civilians clear the street, NOW!',
        'Taking cover behind the unit!'],
      ['Hands where I can see them! Now!', 'Do not run. Seriously. Do not run.',
        'You are making a bad night much worse.', 'Step away from the vehicle!',
        'That is obstruction and I will book you for it.', 'Last warning. I mean it this time.'],
      ['Officer down! Officer down!', 'Argh! Suspect is still moving, stay on him!',
        'Vest took most of it! Most of it!', 'I need medical at my location!',
        'You just shot a police officer. Think about that.', 'Ow! Do not let him reach the car!'],
      ['Quiet shift. Watch, I jinxed it.', 'Third stolen convertible this week. All white.',
        'Coffee here is the only reason I work this sector.', 'Dispatch keeps sending me to the same corner.',
        'Two more hours and it is somebody else problem.', 'The strip gets loud after midnight. Always.',
        'Paperwork on a chase takes longer than the chase.'],
    ),
    districts: [], hours: [0, 24],
  }),

  mk({
    id: 'cop-detective', name: 'Detective', weight: 8, sex: 'x',
    desc: 'Rumpled jacket, sharp eyes, a case board nobody else can read.',
    height: [1.64, 1.94], build: [0.92, 1.24],
    palette: {
      skin: SKIN_INDOOR,
      hair: [0x1b1410, 0x33231a, 0x4a3221, 0x8a8177, 0xb2aea7, 0x63452a],
      top: [0x3a4250, 0x4a4238, 0x2a2f3a, 0x5a5248, 0x1f242b, 0x6b6459],
      bottom: [0x2c333d, 0x1f242b, 0x3d4650, 0x33383f, 0x4a453d],
      shoes: SHOE_DRESS,
      accent: [0xd4af37, 0x8c1c2b, 0xc0c0c8, 0x1f4f8f, 0x2f9b6a, 0xe8e8e8],
    },
    outfit: 'cop', props: ['notepad', 'phone', 'briefcase', 'coffee', 'lanyard'],
    speed: { walk: 1.20, jog: 3.0, run: 5.4 },
    stats: { bravery: 0.82, aggression: 0.52, wealth: 0.48, fitness: 0.68, awareness: 0.96 },
    armed: { weaponId: 'combat-pistol', chance: 1.0 }, health: 145,
    schedule: sch([8, 'commute'], [13, 'work'], [14, 'shop'], [20, 'work'], [22, 'bar'], [24, 'work']),
    barks: bk(
      ['Got a minute? I only need one. Probably three.',
        'You were here Tuesday. Do not tell me you were not.', 'Anybody see a man in a green jacket?',
        'I am not interested in what you sell. I am interested in who you saw.',
        'Take my card. Call me when you remember something.',
        'Nice night. Terrible neighbourhood for it.'],
      ['Suspect is running! Cut him off at the alley!',
        'I need units, now, and I mean now!', 'Get these people out of the crossfire!',
        'He has got a rifle! Everybody down!', 'Do not lose him, do NOT lose him!',
        'Requesting air support, he is heading for the causeway!'],
      ['You lied to me. I hate being lied to.',
        'Every second you waste, he gets further away.', 'I can do this the polite way or the paperwork way.',
        'Do not touch that, it is evidence!', 'Somebody in this room knows and it is you.',
        'I have been doing this twenty years. Try again.'],
      ['Ah! Should have worn the vest. Never wear the vest.',
        'Go after him! I will live, he will not!', 'Argh! Get me a plate number!',
        'This jacket has survived four shootings. Not five.', 'I am hit, west side of the lot!',
        'Do not let him get to the water!'],
      ['Three cases, one desk, no sleep.', 'The dock thefts and the marina fires are the same guy.',
        'Nobody in this city ever saw anything. Amazing.',
        'The purple crew moved product through here last month.',
        'Captain wants results. Captain always wants results.', 'Coffee, cigarettes and a hunch.',
        'Case board looks like a spider had an idea.'],
    ),
    districts: ['downtown', 'oldtown', 'industrial', 'strip', 'barrio', 'docks', 'financial'], hours: [7, 4],
  }),

  mk({
    id: 'cop-swat', name: 'Tactical Officer', weight: 4, sex: 'x',
    desc: 'Only deploys when the situation is already very stupid.',
    height: [1.70, 2.00], build: [1.06, 1.34],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x241a12, 0x33231a, 0x4a3221, 0x5a5550, 0x1b1410],
      top: [0x1c2026, 0x141820, 0x23282f, 0x2a3038, 0x101318, 0x1a2a2a],
      bottom: [0x141820, 0x1c2026, 0x101318, 0x23282f, 0x2a3038],
      shoes: [0x0f0f10, 0x141414, 0x1a1a1c, 0x21201e, 0x2a2a2e],
      accent: [0xd3352f, 0xc0c0c8, 0xffd60a, 0x2f6fd3, 0xe8e8e8, 0x1c1c1e],
    },
    outfit: 'military', props: ['helmet', 'radio', 'flashlight', 'baton'],
    speed: { walk: 1.22, jog: 3.4, run: 6.0 },
    stats: { bravery: 0.98, aggression: 0.86, wealth: 0.40, fitness: 0.96, awareness: 0.94 },
    armed: { weaponId: 'carbine-rifle', chance: 1.0 }, health: 220,
    schedule: sch([8, 'work'], [12, 'gym'], [13, 'work'], [20, 'work'], [24, 'work']),
    barks: bk(
      ['Move back. This is a tactical perimeter.', 'Stay in your vehicle and keep your hands visible.',
        'Sir, this street is closed. No, not in a minute. Now.',
        'We have got the corner. Get your people inside.',
        'If you hear a bang, it is ours. Probably.', 'Nobody crosses this line. Nobody.'],
      ['Contact front! Contact front!', 'Breaching! Breaching, breaching!',
        'Man down, drag him back, cover me!', 'He has got an RPG! SCATTER!',
        'Fall back to the van, regroup at the van!', 'Civilians in the line of fire, hold, HOLD!'],
      ['Drop the weapon! Drop it or we drop you!',
        'On the ground! Face down! Hands out!', 'You had your chance. That was it.',
        'Do not reach. Do not even think about reaching.', 'Last warning, then we come in.',
        'Nowhere left to run, genius. Look around.'],
      ['Plate took it! Still up, still up!',
        'I am hit, still in the fight!', 'Argh! Somebody suppress that window!',
        'Medic, on me, keep the line!', 'That went through the armour. That should not go through the armour.',
        'Keep pushing, do not stop for me!'],
      ['Third callout today. City is losing it.', 'Stack up, check kit, wait. Mostly wait.',
        'Nine hours in this vest. Nine.', 'They gave us new optics. They work in the dark. Mostly.',
        'The bank job crew is getting bolder.', 'Nobody wants us here until they really want us here.',
        'Breach, clear, coffee. That is the job.'],
    ),
    districts: [], hours: [0, 24],
  }),
];

const SECURITY = [
  mk({
    id: 'security-guard', name: 'Security Guard', weight: 22, sex: 'x',
    desc: 'Authority of a traffic cone, attitude of a general.',
    height: [1.62, 1.96], build: [0.96, 1.32],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x5a5550, 0x949089, 0x63452a],
      top: [0x23282f, 0x2a3a5c, 0x1c1c1e, 0x3a4250, 0x2f3a46, 0x1a2a3a],
      bottom: [0x1c1c1e, 0x23282f, 0x2f3a46, 0x33383f, 0x141820],
      shoes: [0x141414, 0x1a120c, 0x21201e, 0x2e1f14, 0x0f0f10],
      accent: [0xffd60a, 0xc0c0c8, 0xd3352f, 0x2f6fd3, 0xe8e8e8, 0xd4af37],
    },
    outfit: 'security', props: ['radio', 'flashlight', 'baton', 'lanyard', 'coffee', 'clipboard'],
    speed: { walk: 1.14, jog: 2.8, run: 4.9 },
    stats: { bravery: 0.56, aggression: 0.54, wealth: 0.24, fitness: 0.62, awareness: 0.78 },
    armed: { weaponId: 'baton', chance: 0.0 }, health: 125,
    schedule: sch([7, 'home'], [8, 'commute'], [16, 'work'], [17, 'shop'], [23, 'work'], [24, 'work']),
    barks: bk(
      ['Can I help you? That was not really a question.',
        'Mall closes at nine. Nine means nine.', 'You cannot skate here. You know you cannot skate here.',
        'Loading bay is round the back, not through here.', 'Badge? No badge, no floor. Sorry.',
        'Evening. Camera four sees everything, by the way.'],
      ['I am unarmed! I am extremely unarmed!',
        'Calling it in! Somebody actually call the real police!', 'Behind the desk, everybody behind the desk!',
        'They are not paying me for this! Nowhere near!', 'Fire exit, follow me, I know the codes!',
        'Lock the shutters! Drop the shutters!'],
      ['Hey! Hey! You cannot take that through here!',
        'I have asked you four times to move along.', 'That is private property and I am the property.',
        'Do not make me use the radio. I will use the radio.',
        'You are on camera, smile for the lawsuit.', 'Off the planter! People sit there!'],
      ['Ow! For fourteen dollars an hour!', 'I only work here! I only WORK here!',
        'Somebody get the manager and an ambulance!', 'That is my radio arm!',
        'I am not trained for this, I did two days of training!', 'Ahh! I told them we needed two guards!'],
      ['Camera three has been broken since spring.', 'Ten hours of standing and one chair I am not allowed.',
        'Same kids, same corner, every single night.', 'Somebody left a suitcase by the fountain. Again.',
        'I applied for the academy twice. Twice.', 'Night shift is quiet. Too quiet, then too loud.',
        'This flashlight is the best thing they ever gave me.'],
    ),
    districts: ['mall', 'downtown', 'financial', 'industrial', 'docks', 'strip', 'hills', 'airport'],
    hours: [0, 24],
  }),
];

// ---------------------------------------------------------------------------
// CIVIC LIFE
// ---------------------------------------------------------------------------

const CIVIC = [
  mk({
    id: 'elder', name: 'Retiree', weight: 36, sex: 'x',
    desc: 'Moved here in the seventies and has commentary on every change since.',
    height: [1.48, 1.78], build: [0.86, 1.24],
    palette: {
      skin: SKIN_AGED,
      hair: HAIR_GREY,
      top: [0xe9e2d6, 0xd6c1a0, 0x9bbcd0, 0xc0d0b0, 0xf0d8c0, 0xb0a8c0, 0xe0e8ea],
      bottom: [0x8b8375, 0x6b6459, 0xb5ab99, 0x4a453d, 0x9aa0a8],
      shoes: [0xe0d6c4, 0x4d3722, 0xf2f2f2, 0x8a6a48, 0x2e1f14, 0xc0c0c8],
      accent: [0xd4af37, 0x9bbcd0, 0xd3352f, 0xe8e8e8, 0xc0a060, 0x2f9b6a],
    },
    outfit: 'elder', props: ['cane', 'bag', 'sunhat', 'shoppingbag', 'umbrella', 'dog'],
    speed: { walk: 0.92, jog: 1.9, run: 3.2 },
    stats: { bravery: 0.44, aggression: 0.30, wealth: 0.50, fitness: 0.22, awareness: 0.56 },
    health: 70,
    schedule: sch([7, 'home'], [9, 'park'], [11, 'shop'], [13, 'home'], [17, 'park'],
      [19, 'shop'], [24, 'home']),
    barks: bk(
      ['Hello dear. You look like you are in a hurry. Everyone is.',
        'This was all sand when we moved here. All of it.', 'You want the bus? It never comes. Sit with me.',
        'My knees forecast the weather better than the news.', 'Careful crossing. They drive like lunatics now.',
        'Have you eaten? You look like you have not eaten.'],
      ['Oh my! Oh my goodness!', 'Where is the nearest door? Any door!',
        'I lived through worse but I was faster then!', 'Somebody help me, I cannot move quickly!',
        'My heart! My heart cannot take this!', 'Get behind the bench, get down!'],
      ['In my day you would have been ashamed!',
        'That is a footpath, not a racetrack, young man!', 'They tore down a beautiful building for THAT.',
        'You nearly knocked me over and you did not even look!', 'Turn that music down! It is not music!',
        'Forty years I have walked this street. Forty!'],
      ['Oh! Oh, my hip!', 'Somebody call my daughter! And an ambulance! In that order!',
        'I am eighty-two years old!', 'Where is my cane? I need my cane!',
        'You should be ashamed of yourself!', 'Ahh! Help! Somebody!'],
      ['Coffee was ten cents when I got here. Ten.', 'The pier used to have a carousel, you know.',
        'My grandson never calls. Busy, he says.', 'Doctor says walk more. So I walk. And I complain.',
        'They built another tower and blocked the sunset.', 'Hurricane in sixty-eight took the whole boardwalk.',
        'Bingo is at four. I have never won. Not once.'],
    ),
    districts: ['suburb', 'oldtown', 'beach', 'park', 'trailer', 'mall', 'marina', 'hills'],
    hours: [6, 22],
  }),

  mk({
    id: 'student', name: 'Student', weight: 40, sex: 'x',
    desc: 'Three jobs, one degree, and a permanent state of nearly asleep.',
    height: [1.54, 1.88], build: [0.80, 1.10],
    palette: {
      skin: SKIN_BROAD,
      hair: [0x14100c, 0x2e2116, 0x4a3221, 0x846035, 0xd42a6a, 0x2ec4b6, 0x7b3ff2, 0xcda85e],
      top: [0x2f6fd3, 0xd3352f, 0x1c1c1e, 0x3fae6a, 0xf0a030, 0xe9e2d6, 0x6a2f6a, 0xffffff],
      bottom: [0x2b3f5c, 0x1a1a1e, 0x4a453d, 0x6b7f9b, 0x33383f, 0x1e2b3f],
      shoes: SHOE_SNEAKER,
      accent: [0xffd60a, 0x2f6fd3, 0xd42a6a, 0x18c964, 0xf25c05, 0xffffff],
    },
    outfit: 'casual', props: ['backpack', 'phone', 'coffee', 'headphones', 'bag', 'skateboard'],
    speed: { walk: 1.24, jog: 3.1, run: 5.7 },
    stats: { bravery: 0.34, aggression: 0.26, wealth: 0.14, fitness: 0.72, awareness: 0.48 },
    schedule: sch([8, 'home'], [9, 'commute'], [13, 'work'], [14, 'shop'], [18, 'work'],
      [20, 'park'], [23, 'bar'], [24, 'home']),
    barks: bk(
      ['Hey! Do you know where the science building is? Anyone?',
        'Sorry, sorry, late, always late.', 'Is there free food at that thing? There is always free food.',
        'I have an exam in forty minutes and I have read nothing.',
        'Can I borrow a pen? A charger? Anything?', 'Yeah I am fine. I have had five coffees.'],
      ['Nope! Nope! I have student debt to outlive!',
        'Everybody to the library, it locks from inside!', 'Is that real? Tell me that is not real!',
        'Running! I am running! I am bad at running!', 'My laptop is in there! Forget it! FORGET IT!',
        'Call somebody! Anybody! I have no credit!'],
      ['I paid tuition for a class taught by a video!',
        'You took my bike, I know you took my bike.', 'Rent for that? For a cupboard with a window?',
        'Move, some of us are genuinely going to fail!', 'That was my table. My books are ON it.',
        'Stop parking in the cycle racks!'],
      ['Ow! I cannot afford a hospital! I cannot afford a bandaid!',
        'Not the laptop! My whole thesis!', 'I have a group project due, this is not allowed!',
        'Somebody tell my professor I have a genuine excuse!', 'Ahh! Why is this my life!',
        'I just wanted a cheap sandwich!'],
      ['Three hours sleep, four shifts, one exam.', 'Everything I own fits in this backpack. Depressing.',
        'The library has air conditioning. That is why I study.',
        'I changed my major twice. Maybe a third time.', 'Instant noodles are a food group now.',
        'The professor reads straight off the slides.', 'Graduate, then what? Nobody tells you that part.'],
    ),
    districts: ['downtown', 'oldtown', 'barrio', 'park', 'beach', 'mall', 'suburb'], hours: [7, 3],
  }),

  mk({
    id: 'homeless', name: 'Rough Sleeper', weight: 24, sex: 'x',
    desc: 'Knows every warm grate, every overhang, every cop who is decent about it.',
    height: [1.52, 1.90], build: [0.80, 1.18],
    palette: {
      skin: SKIN_AGED,
      hair: [0x2e2116, 0x4a3221, 0x5a5550, 0x77716a, 0x949089, 0x33231a, 0xcecac3],
      top: [0x4a4238, 0x3a3a30, 0x5a5248, 0x2a2f28, 0x6b6459, 0x7a6a50, 0x3f4a52],
      bottom: [0x3a3a30, 0x2b3f5c, 0x4a453d, 0x33383f, 0x5a5248],
      shoes: [0x3a2a1c, 0x4d3722, 0x2a2a2e, 0x6b6459, 0x21201e],
      accent: [0x8a6a48, 0x6b6459, 0x9aa0a8, 0x4a4238, 0xb5ab99, 0x3f4a52],
    },
    outfit: 'homeless', props: ['cart', 'bag', 'bottle', 'cane', 'radio', 'crate'],
    speed: { walk: 0.96, jog: 2.2, run: 3.9 },
    stats: { bravery: 0.48, aggression: 0.30, wealth: 0.04, fitness: 0.40, awareness: 0.82 },
    health: 80,
    schedule: sch([7, 'home'], [10, 'wander'], [14, 'shop'], [18, 'wander'], [21, 'park'], [24, 'home']),
    barks: bk(
      ['Spare anything? Coins, food, conversation. Any of it.',
        'Hey friend. Not asking for much. Just asking.', 'You got the time? I like to know the time.',
        'There is shelter under the flyover if it rains.', 'I used to fix boats. Good at it too.',
        'Do not sleep by the marina. They hose it down at five.'],
      ['Not again! Move the cart, move the cart!',
        'I have got nothing! I have got NOTHING!', 'Under the overpass, come on!',
        'They shoot and we are the ones who have nowhere to go!', 'Leave me be! Leave me be!',
        'Somebody call somebody, my bag is all I have!'],
      ['I was sitting here first. I am always sitting here.',
        'Do not kick my things. They are my things.', 'You walked past me four times today, four!',
        'I am a person. Say something or say nothing, but see me.',
        'They took my cart last month. Just took it.', 'Keep your change and keep your face too.'],
      ['Why? What did I have that you wanted?',
        'Ow! I have not eaten since yesterday!', 'Everyone just watches. Everyone always watches.',
        'Somebody help! Please, somebody!', 'My leg was bad before this!',
        'I have got nothing left to take!'],
      ['Slept behind the laundromat. Warm vents.', 'The diner gives me the leftovers at close. Good people.',
        'Used to have a boat. Used to have a lot.', 'Nobody looks up. Nobody looks anywhere.',
        'Rain is coming. Feel it in the air before the sky knows.',
        'The library lets me stay till six. Best six hours.', 'I know this city better than the mayor does.'],
    ),
    districts: ['downtown', 'oldtown', 'industrial', 'barrio', 'docks', 'trailer', 'park'],
    hours: [0, 24],
  }),
];

// ---------------------------------------------------------------------------
// The catalog
// ---------------------------------------------------------------------------

export const PED_ARCHETYPES = Object.freeze([
  ...WHITE_COLLAR,
  ...LEISURE,
  ...SUBCULTURE,
  ...GANG_MEMBERS,
  ...BLUE_COLLAR,
  ...HOSPITALITY,
  ...MEDICAL,
  ...LAW,
  ...SECURITY,
  ...CIVIC,
]);

// ---------------------------------------------------------------------------
// Names — used for wanted posters, phone contacts, mission chatter and gravestones.
// Invented/common given names only; no public figures.
// ---------------------------------------------------------------------------

export const FIRST_NAMES = Object.freeze([
  'Adriana', 'Alejo', 'Amari', 'Anders', 'Anika', 'Arlen', 'Aurelio', 'Bexley', 'Bianca', 'Boyd',
  'Brielle', 'Calder', 'Camila', 'Carlita', 'Cass', 'Cedric', 'Celeste', 'Chandra', 'Cruz', 'Dahlia',
  'Damaris', 'Darnell', 'Deion', 'Delphine', 'Desmond', 'Dionne', 'Drexel', 'Eartha', 'Elio', 'Elodie',
  'Emiliano', 'Enzo', 'Esperanza', 'Ezra', 'Fabiola', 'Faron', 'Felicity', 'Fidelia', 'Fitz', 'Florian',
  'Gaby', 'Gideon', 'Ginevra', 'Griselda', 'Hadley', 'Halston', 'Hattie', 'Hollis', 'Horace', 'Idalia',
  'Ignacio', 'Imani', 'Ines', 'Isidro', 'Jacinta', 'Jamari', 'Javi', 'Jolene', 'Jonas', 'Jovita',
  'Kacey', 'Kalani', 'Kendrix', 'Kiara', 'Lazaro', 'Leandra', 'Lenny', 'Lisandro', 'Lorca', 'Lucero',
  'Mabel', 'Maceo', 'Magnolia', 'Marisol', 'Marlon', 'Mateo', 'Maury', 'Mireya', 'Moses', 'Nadia',
  'Nestor', 'Nia', 'Octavio', 'Odalys', 'Ophelia', 'Orson', 'Paloma', 'Pascal', 'Perla', 'Quincy',
  'Rafaela', 'Ramiro', 'Reba', 'Renata', 'Rhett', 'Rocio', 'Roscoe', 'Rowan', 'Salvador', 'Selena',
  'Shiloh', 'Sonny', 'Soraya', 'Tavares', 'Thalia', 'Theo', 'Tomasa', 'Tova', 'Ulises', 'Valentina',
  'Vance', 'Vero', 'Wendell', 'Winsome', 'Xiomara', 'Yara', 'Yusef', 'Zadie', 'Zephyr', 'Zora',
]);

export const LAST_NAMES = Object.freeze([
  'Abelard', 'Acosta', 'Alvear', 'Amador', 'Bascomb', 'Batista', 'Beauchene', 'Bellweather', 'Bonilla', 'Bracken',
  'Cabral', 'Caldera', 'Camacho', 'Carrow', 'Castellan', 'Cayetano', 'Chastain', 'Cifuentes', 'Colquitt', 'Cordero',
  'Crenshaw', 'Delacroix', 'Delgado', 'Desroches', 'Dominguez', 'Doverly', 'Duquesne', 'Eastcott', 'Echeverria', 'Escobedo',
  'Estrella', 'Fallowell', 'Farro', 'Fenwick', 'Ferreira', 'Fontaine', 'Frelinghuys', 'Gaitan', 'Galvez', 'Garrity',
  'Gaultier', 'Gilliam', 'Grimaldi', 'Guzman', 'Halloway', 'Hartsfield', 'Havelock', 'Hidalgo', 'Hollings', 'Ibarra',
  'Jandreau', 'Jessup', 'Joubert', 'Kearsley', 'Kirkaldy', 'Laborde', 'Lanier', 'Larkspur', 'Leconte', 'Lindqvist',
  'Lozano', 'Maldonado', 'Marchetti', 'Mazzeo', 'Mendive', 'Merriweather', 'Montalvo', 'Moreau', 'Narvaez', 'Nocera',
  'Okonkwo', 'Oquendo', 'Palomino', 'Pardo', 'Pennington', 'Petrossian', 'Pichardo', 'Quiroga', 'Rambeau', 'Ravenel',
  'Redondo', 'Renteria', 'Ricasso', 'Rizzolo', 'Saldivar', 'Sandoval', 'Sarmiento', 'Saucedo', 'Schuyler', 'Sedgwick',
  'Solano', 'Sorrentino', 'Stallworth', 'Tavernier', 'Thibodeaux', 'Tremaine', 'Trujillo', 'Ubeda', 'Valdivia', 'Vance',
  'Vasquez', 'Veracruz', 'Villareal', 'Voclain', 'Wadsworth', 'Wexler', 'Whitlock', 'Yarborough', 'Zaragoza', 'Zeller',
]);

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const BY_ID = new Map(PED_ARCHETYPES.map((p) => [p.id, p]));

/** Archetype by id, or undefined. */
export const getPed = (id) => BY_ID.get(id);

/** True when `hour` (0..24 float) falls inside a possibly-midnight-wrapping window. */
export const pedHourMatches = (hours, hour) => {
  const [a, b] = hours;
  if (a === b) return true;
  if (a <= b) return hour >= a && hour < b;
  return hour >= a || hour < b;
};

/** True when this archetype can appear in a district *style* (empty list = anywhere). */
export const pedFitsDistrict = (def, style) =>
  !style || def.districts.length === 0 || def.districts.includes(style);

/** Every archetype that can spawn in the given district style at the given hour. */
export function pedsFor(districtStyle, hour) {
  const h = typeof hour === 'number' ? ((hour % 24) + 24) % 24 : null;
  return PED_ARCHETYPES.filter(
    (p) => pedFitsDistrict(p, districtStyle) && (h === null || pedHourMatches(p.hours, h)),
  );
}

/**
 * Weighted ambient spawn pick. Falls back to ignoring the hour, then the district,
 * so the streets are never empty no matter how exotic the query is.
 */
export function randomPedId(rng, districtStyle, hour) {
  let pool = pedsFor(districtStyle, hour);
  if (pool.length === 0) pool = pedsFor(districtStyle, undefined);
  if (pool.length === 0) pool = pedsFor(undefined, hour);
  if (pool.length === 0) pool = PED_ARCHETYPES.slice();
  return rng.weighted(pool, (p) => p.weight).id;
}

/** A throwaway civilian name, e.g. "Marisol Thibodeaux". */
export const randomPedName = (rng) => `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;

/** All archetypes belonging to a gang id. */
export const pedsByGang = (gangId) => PED_ARCHETYPES.filter((p) => p.gang === gangId);

/** Gang record by id, or undefined. */
export const getGang = (gangId) => GANGS.find((g) => g.id === gangId);

/** Pick one bark line of `kind` for an archetype; '' when the archetype is unknown. */
export function pedBark(rng, id, kind) {
  const def = BY_ID.get(id);
  if (!def) return '';
  const lines = def.barks[kind];
  if (!lines || lines.length === 0) return '';
  return rng.pick(lines);
}

/** The scheduled activity for an archetype at a given hour. */
export function pedActivityAt(id, hour) {
  const def = BY_ID.get(id);
  if (!def) return 'wander';
  const h = ((hour % 24) + 24) % 24;
  for (const band of def.schedule) if (h >= band.from && h < band.to) return band.act;
  return def.schedule[def.schedule.length - 1].act;
}
