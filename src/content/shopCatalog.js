// shopCatalog.js — every storefront you can shop at, and every till you can empty.
//
// Robbery economics are tiered on purpose: a corner store is pocket money and one star,
// a bank vault is a proper job with a long timer, guards and four stars.

export const SHOP_TYPES = Object.freeze([
  {
    type: 'convenience', label: 'Convenience Store',
    signWords: ['Mini Mart', '24/7', 'Corner Store', 'Quick Stop', 'Sun Mart'],
    signColor: 0xff3b30, neonColor: 0xff2d95, awningColor: 0xd93a2b,
    footprint: [11, 9], height: 4.4,
    inventory: [
      { id: 'snack', label: 'Soda & Snacks', kind: 'health', price: 12, value: 15 },
      { id: 'sandwich', label: 'Cuban Sandwich', kind: 'health', price: 28, value: 40 },
      { id: 'medkit-s', label: 'First Aid Kit', kind: 'health', price: 120, value: 100 },
      { id: 'ammo-pistol', label: 'Pistol Rounds x24', kind: 'ammo', price: 60, weaponId: 'pistol-9', amount: 24 },
      { id: 'phone-charger', label: 'Burner Phone', kind: 'service', price: 90 },
    ],
    robbery: { possible: true, tillCash: [180, 900], safeCash: [0, 0], grabTime: 4.5, safeTime: 0,
               alarmChance: 0.55, clerkArmed: 0.18, guards: 0, wanted: 1, panicRadius: 22, payoutMultiplier: 1 },
    hours: [0, 24], interiorStyle: 'small', shelves: 6, tills: 1, restockHours: 6,
  },
  {
    type: 'liquor', label: 'Liquor Store',
    signWords: ['Liquor', 'Wine & Spirits', 'Bottle Shop', 'Package Store'],
    signColor: 0xffc93c, neonColor: 0xffc93c, awningColor: 0x2c5f3a,
    footprint: [10, 8], height: 4.2,
    inventory: [
      { id: 'beer', label: 'Six Pack', kind: 'health', price: 22, value: 20 },
      { id: 'rum', label: 'Island Rum', kind: 'health', price: 65, value: 45 },
      { id: 'cigars', label: 'Hand-Rolled Cigars', kind: 'service', price: 140 },
    ],
    robbery: { possible: true, tillCash: [220, 1100], safeCash: [0, 0], grabTime: 4.0, safeTime: 0,
               alarmChance: 0.5, clerkArmed: 0.34, guards: 0, wanted: 1, panicRadius: 20, payoutMultiplier: 1.1 },
    hours: [10, 3], interiorStyle: 'small', shelves: 7, tills: 1, restockHours: 8,
  },
  {
    type: 'gunstore', label: 'Gun Shop',
    signWords: ['Armory', 'Gun & Ammo', 'Firearms', 'Munitions'],
    signColor: 0xe0e0e0, neonColor: 0xff7a29, awningColor: 0x3a3a3a,
    footprint: [14, 11], height: 4.8,
    inventory: [
      { id: 'w-pistol-9', label: 'Compact 9mm', kind: 'weapon', weaponId: 'pistol-9', price: 700 },
      { id: 'w-combat-pistol', label: 'Combat Pistol', kind: 'weapon', weaponId: 'combat-pistol', price: 1400 },
      { id: 'w-heavy-revolver', label: 'Heavy Revolver', kind: 'weapon', weaponId: 'heavy-revolver', price: 3200 },
      { id: 'w-micro-smg', label: 'Micro SMG', kind: 'weapon', weaponId: 'micro-smg', price: 2600 },
      { id: 'w-smg', label: 'SMG', kind: 'weapon', weaponId: 'smg', price: 4200 },
      { id: 'w-pump-shotgun', label: 'Pump Shotgun', kind: 'weapon', weaponId: 'pump-shotgun', price: 3600 },
      { id: 'w-sawn-off', label: 'Sawn-Off Shotgun', kind: 'weapon', weaponId: 'sawn-off-shotgun', price: 2900 },
      { id: 'w-carbine', label: 'Carbine Rifle', kind: 'weapon', weaponId: 'carbine-rifle', price: 9800 },
      { id: 'w-assault', label: 'Assault Rifle', kind: 'weapon', weaponId: 'assault-rifle', price: 11500 },
      { id: 'w-marksman', label: 'Marksman Rifle', kind: 'weapon', weaponId: 'marksman-rifle', price: 14000 },
      { id: 'w-sniper', label: 'Sniper Rifle', kind: 'weapon', weaponId: 'sniper-rifle', price: 22000 },
      { id: 'w-machete', label: 'Machete', kind: 'weapon', weaponId: 'machete', price: 380 },
      { id: 'w-bat', label: 'Baseball Bat', kind: 'weapon', weaponId: 'baseball-bat', price: 160 },
      { id: 'w-knife', label: 'Combat Knife', kind: 'weapon', weaponId: 'combat-knife', price: 420 },
      { id: 'w-grenade', label: 'Grenades x4', kind: 'weapon', weaponId: 'grenade', price: 2400, amount: 4 },
      { id: 'w-molotov', label: 'Molotovs x5', kind: 'weapon', weaponId: 'molotov', price: 900, amount: 5 },
      { id: 'armor-l', label: 'Body Armour', kind: 'armor', price: 900, value: 100 },
      { id: 'armor-m', label: 'Light Vest', kind: 'armor', price: 420, value: 50 },
      { id: 'ammo-all', label: 'Full Ammo Refill', kind: 'ammo', price: 850, amount: -1 },
    ],
    robbery: { possible: true, tillCash: [900, 3600], safeCash: [2500, 7000], grabTime: 6, safeTime: 16,
               alarmChance: 0.85, clerkArmed: 0.95, guards: 1, wanted: 3, panicRadius: 26, payoutMultiplier: 1.3 },
    hours: [9, 21], interiorStyle: 'medium', shelves: 10, tills: 1, restockHours: 12,
  },
  {
    type: 'jewelry', label: 'Jewellers',
    signWords: ['Jewellers', 'Gold & Gems', 'Fine Jewellery', 'Diamond House'],
    signColor: 0xffd970, neonColor: 0xffc93c, awningColor: 0x1c1c28,
    footprint: [12, 10], height: 4.6,
    inventory: [
      { id: 'watch', label: 'Gold Watch', kind: 'clothing', price: 9500 },
      { id: 'chain', label: 'Heavy Chain', kind: 'clothing', price: 4200 },
      { id: 'ring', label: 'Signet Ring', kind: 'clothing', price: 2200 },
    ],
    robbery: { possible: true, tillCash: [3000, 12000], safeCash: [8000, 26000], grabTime: 9, safeTime: 22,
               alarmChance: 0.95, clerkArmed: 0.25, guards: 2, wanted: 3, panicRadius: 30, payoutMultiplier: 1.5 },
    hours: [10, 19], interiorStyle: 'medium', shelves: 8, tills: 2, restockHours: 24,
  },
  {
    type: 'bank', label: 'Bank',
    signWords: ['Leonida Trust', 'First Coastal', 'Meridian Savings', 'Bayside Bank'],
    signColor: 0x22e3ff, neonColor: 0x22e3ff, awningColor: 0x1a2a3a,
    footprint: [20, 16], height: 8.5,
    inventory: [
      { id: 'deposit', label: 'Deposit Cash', kind: 'service', price: 0 },
      { id: 'withdraw', label: 'Withdraw Cash', kind: 'service', price: 0 },
    ],
    robbery: { possible: true, tillCash: [6000, 18000], safeCash: [40000, 140000], grabTime: 11, safeTime: 42,
               alarmChance: 1.0, clerkArmed: 0.1, guards: 3, wanted: 4, panicRadius: 38, payoutMultiplier: 2.0 },
    hours: [9, 17], interiorStyle: 'vault', shelves: 4, tills: 4, restockHours: 48,
  },
  {
    type: 'pharmacy', label: 'Pharmacy',
    signWords: ['Pharmacy', 'Drugstore', 'Chemist', 'Wellness'],
    signColor: 0x4dff9e, neonColor: 0x4dff9e, awningColor: 0x1e6b48,
    footprint: [12, 10], height: 4.4,
    inventory: [
      { id: 'medkit', label: 'Medical Kit', kind: 'health', price: 250, value: 100 },
      { id: 'painkillers', label: 'Painkillers', kind: 'health', price: 75, value: 45 },
      { id: 'bandage', label: 'Bandages', kind: 'health', price: 35, value: 25 },
      { id: 'adrenaline', label: 'Adrenaline Shot', kind: 'upgrade', price: 600 },
    ],
    robbery: { possible: true, tillCash: [400, 1800], safeCash: [1200, 3600], grabTime: 5, safeTime: 12,
               alarmChance: 0.7, clerkArmed: 0.12, guards: 0, wanted: 2, panicRadius: 22, payoutMultiplier: 1.1 },
    hours: [8, 22], interiorStyle: 'medium', shelves: 9, tills: 2, restockHours: 10,
  },
  {
    type: 'clothing', label: 'Clothing Store',
    signWords: ['Threads', 'Boutique', 'Styles', 'Outfitters', 'Wardrobe'],
    signColor: 0xff2d95, neonColor: 0xff2d95, awningColor: 0x5c2a52,
    footprint: [14, 11], height: 5.0,
    inventory: [
      { id: 'outfit-casual', label: 'Beach Casual', kind: 'clothing', price: 320 },
      { id: 'outfit-suit', label: 'Linen Suit', kind: 'clothing', price: 1800 },
      { id: 'outfit-street', label: 'Street Fit', kind: 'clothing', price: 650 },
      { id: 'outfit-tactical', label: 'Tactical Gear', kind: 'clothing', price: 2400 },
      { id: 'outfit-disguise', label: 'Ski Mask', kind: 'clothing', price: 180 },
    ],
    robbery: { possible: true, tillCash: [350, 1600], safeCash: [900, 2800], grabTime: 5, safeTime: 11,
               alarmChance: 0.6, clerkArmed: 0.08, guards: 0, wanted: 1, panicRadius: 22, payoutMultiplier: 1 },
    hours: [10, 21], interiorStyle: 'medium', shelves: 12, tills: 2, restockHours: 10,
  },
  {
    type: 'electronics', label: 'Electronics',
    signWords: ['Electronics', 'Tech Depot', 'Circuit City', 'Gadget Bay'],
    signColor: 0x22e3ff, neonColor: 0x22e3ff, awningColor: 0x14344a,
    footprint: [15, 12], height: 5.2,
    inventory: [
      { id: 'phone-up', label: 'Phone Upgrade', kind: 'upgrade', price: 1200 },
      { id: 'camera', label: 'Camera', kind: 'service', price: 800 },
      { id: 'radio-up', label: 'Car Audio Kit', kind: 'upgrade', price: 1600 },
      { id: 'jammer', label: 'Signal Jammer', kind: 'upgrade', price: 5400 },
    ],
    robbery: { possible: true, tillCash: [700, 2900], safeCash: [2400, 6800], grabTime: 6, safeTime: 15,
               alarmChance: 0.78, clerkArmed: 0.1, guards: 1, wanted: 2, panicRadius: 26, payoutMultiplier: 1.2 },
    hours: [10, 21], interiorStyle: 'large', shelves: 14, tills: 3, restockHours: 14,
  },
  {
    type: 'pawn', label: 'Pawn Shop',
    signWords: ['Pawn', 'Cash Loans', 'We Buy Gold', 'Trade Post'],
    signColor: 0xffc93c, neonColor: 0xff7a29, awningColor: 0x4a3a1c,
    footprint: [11, 9], height: 4.4,
    inventory: [
      { id: 'w-knuckles', label: 'Brass Knuckles', kind: 'weapon', weaponId: 'brass-knuckles', price: 210 },
      { id: 'w-crowbar', label: 'Crowbar', kind: 'weapon', weaponId: 'crowbar', price: 140 },
      { id: 'w-pistol-used', label: 'Used 9mm', kind: 'weapon', weaponId: 'pistol-9', price: 480 },
      { id: 'sell-loot', label: 'Fence Stolen Goods', kind: 'service', price: 0 },
      { id: 'armor-cheap', label: 'Second-Hand Vest', kind: 'armor', price: 280, value: 45 },
    ],
    robbery: { possible: true, tillCash: [500, 2400], safeCash: [1800, 5200], grabTime: 5.5, safeTime: 14,
               alarmChance: 0.45, clerkArmed: 0.7, guards: 0, wanted: 2, panicRadius: 22, payoutMultiplier: 1.25 },
    hours: [9, 20], interiorStyle: 'small', shelves: 9, tills: 1, restockHours: 12,
  },
  {
    type: 'gasstation', label: 'Gas Station',
    signWords: ['Fuel', 'Gas & Go', 'Pump Stop', 'Petrol'],
    signColor: 0xff7a29, neonColor: 0xff7a29, awningColor: 0xe8e4d8,
    footprint: [16, 14], height: 4.6,
    inventory: [
      { id: 'refuel', label: 'Refuel Vehicle', kind: 'service', price: 90 },
      { id: 'repair-light', label: 'Quick Repair', kind: 'service', price: 450 },
      { id: 'snack2', label: 'Energy Drink', kind: 'health', price: 15, value: 18 },
      { id: 'jerrycan', label: 'Jerry Can', kind: 'weapon', weaponId: 'molotov', price: 260, amount: 2 },
    ],
    robbery: { possible: true, tillCash: [250, 1200], safeCash: [0, 0], grabTime: 4.5, safeTime: 0,
               alarmChance: 0.5, clerkArmed: 0.22, guards: 0, wanted: 1, panicRadius: 24, payoutMultiplier: 1 },
    hours: [0, 24], interiorStyle: 'openair', shelves: 5, tills: 1, restockHours: 6,
  },
  {
    type: 'diner', label: 'Diner',
    signWords: ['Diner', 'Cafe', 'Grill', 'Eatery', 'Taqueria', 'Noodle Bar'],
    signColor: 0xff2d95, neonColor: 0xff2d95, awningColor: 0xc8342f,
    footprint: [13, 10], height: 4.4,
    inventory: [
      { id: 'burger', label: 'Double Burger', kind: 'health', price: 32, value: 45 },
      { id: 'tacos', label: 'Street Tacos', kind: 'health', price: 24, value: 35 },
      { id: 'coffee', label: 'Cortadito', kind: 'health', price: 9, value: 12 },
      { id: 'feast', label: 'The Whole Menu', kind: 'health', price: 110, value: 100 },
    ],
    robbery: { possible: true, tillCash: [200, 950], safeCash: [0, 0], grabTime: 4.5, safeTime: 0,
               alarmChance: 0.45, clerkArmed: 0.1, guards: 0, wanted: 1, panicRadius: 24, payoutMultiplier: 1 },
    hours: [6, 24], interiorStyle: 'medium', shelves: 4, tills: 1, restockHours: 6,
  },
  {
    type: 'barber', label: 'Barber Shop',
    signWords: ['Barber', 'Cuts', 'Salon', 'Fade Shop'],
    signColor: 0x22e3ff, neonColor: 0x22e3ff, awningColor: 0x1c3a4a,
    footprint: [9, 8], height: 4.2,
    inventory: [
      { id: 'cut-fade', label: 'Fresh Fade', kind: 'clothing', price: 65 },
      { id: 'cut-long', label: 'Grow It Out', kind: 'clothing', price: 45 },
      { id: 'cut-beard', label: 'Beard Trim', kind: 'clothing', price: 35 },
    ],
    robbery: { possible: true, tillCash: [120, 620], safeCash: [0, 0], grabTime: 4, safeTime: 0,
               alarmChance: 0.35, clerkArmed: 0.14, guards: 0, wanted: 1, panicRadius: 18, payoutMultiplier: 1 },
    hours: [9, 19], interiorStyle: 'small', shelves: 3, tills: 1, restockHours: 8,
  },
  {
    type: 'tattoo', label: 'Tattoo Parlour',
    signWords: ['Tattoo', 'Ink', 'Needle Works', 'Skin Art'],
    signColor: 0x8a5cff, neonColor: 0x8a5cff, awningColor: 0x241638,
    footprint: [9, 8], height: 4.2,
    inventory: [
      { id: 'tat-sleeve', label: 'Full Sleeve', kind: 'clothing', price: 900 },
      { id: 'tat-back', label: 'Back Piece', kind: 'clothing', price: 1600 },
      { id: 'tat-small', label: 'Small Piece', kind: 'clothing', price: 240 },
    ],
    robbery: { possible: true, tillCash: [180, 900], safeCash: [0, 0], grabTime: 4, safeTime: 0,
               alarmChance: 0.38, clerkArmed: 0.4, guards: 0, wanted: 1, panicRadius: 18, payoutMultiplier: 1 },
    hours: [12, 2], interiorStyle: 'small', shelves: 4, tills: 1, restockHours: 8,
  },
  {
    type: 'casino', label: 'Casino',
    signWords: ['Casino', 'Lucky Palm', 'Golden Flamingo', 'High Tide Club'],
    signColor: 0xffc93c, neonColor: 0xffc93c, awningColor: 0x3a1c2a,
    footprint: [24, 20], height: 11,
    inventory: [
      { id: 'bet-small', label: 'Play the Tables ($250)', kind: 'service', price: 250 },
      { id: 'bet-big', label: 'High Roller ($2,500)', kind: 'service', price: 2500 },
      { id: 'bet-whale', label: 'Whale Table ($25,000)', kind: 'service', price: 25000 },
    ],
    robbery: { possible: true, tillCash: [8000, 24000], safeCash: [30000, 90000], grabTime: 12, safeTime: 36,
               alarmChance: 1.0, clerkArmed: 0.3, guards: 4, wanted: 4, panicRadius: 40, payoutMultiplier: 1.8 },
    hours: [0, 24], interiorStyle: 'large', shelves: 6, tills: 4, restockHours: 36,
  },
  {
    type: 'autoshop', label: 'Auto Shop',
    signWords: ['Auto', 'Garage', 'Custom Works', 'Motors', 'Tuning'],
    signColor: 0xff7a29, neonColor: 0xff7a29, awningColor: 0x2a2a2e,
    footprint: [18, 15], height: 5.6,
    inventory: [
      { id: 'repair-full', label: 'Full Repair & Respray', kind: 'service', price: 900 },
      { id: 'tune-engine', label: 'Engine Tune', kind: 'upgrade', price: 6500 },
      { id: 'tune-brakes', label: 'Race Brakes', kind: 'upgrade', price: 3200 },
      { id: 'tune-grip', label: 'Sport Tyres', kind: 'upgrade', price: 2800 },
      { id: 'tune-nitro', label: 'Nitrous Kit', kind: 'upgrade', price: 9000 },
      { id: 'respray', label: 'Respray', kind: 'service', price: 500 },
    ],
    robbery: { possible: true, tillCash: [400, 2000], safeCash: [1500, 4800], grabTime: 5, safeTime: 13,
               alarmChance: 0.5, clerkArmed: 0.35, guards: 0, wanted: 2, panicRadius: 24, payoutMultiplier: 1.1 },
    hours: [8, 20], interiorStyle: 'large', shelves: 6, tills: 1, restockHours: 12,
  },
  {
    type: 'supermarket', label: 'Supermarket',
    signWords: ['Supermarket', 'Food Hall', 'Grocers', 'Market'],
    signColor: 0x4dff9e, neonColor: 0x4dff9e, awningColor: 0x2c6b3e,
    footprint: [24, 18], height: 6.4,
    inventory: [
      { id: 'groceries', label: 'Week of Groceries', kind: 'health', price: 85, value: 80 },
      { id: 'snack3', label: 'Protein Bar', kind: 'health', price: 8, value: 10 },
      { id: 'firstaid', label: 'First Aid Box', kind: 'health', price: 180, value: 100 },
    ],
    robbery: { possible: true, tillCash: [900, 3800], safeCash: [3000, 9000], grabTime: 7, safeTime: 18,
               alarmChance: 0.8, clerkArmed: 0.06, guards: 1, wanted: 2, panicRadius: 32, payoutMultiplier: 1.15 },
    hours: [7, 23], interiorStyle: 'large', shelves: 18, tills: 5, restockHours: 8,
  },
]);

const byType = new Map(SHOP_TYPES.map((s) => [s.type, s]));
export function getShopType(type) { return byType.get(type); }

export const SHOP_NAME_PARTS = Object.freeze({
  prefix: ['Sunset', 'Ocean', 'Palm', 'Flamingo', 'Neon', 'Coral', 'Vice', 'Bayside', 'Golden',
    'Silver', 'Midnight', 'Havana', 'Casa', 'El', 'La', 'Royal', 'Lucky', 'Blue', 'Red',
    'Tropic', 'Miramar', 'Costa', 'Del Sol', 'Star', 'Sandbar', 'Harbour', 'Downtown', 'Uptown'],
  core: ['Marlin', 'Iguana', 'Pelican', 'Gator', 'Mango', 'Coconut', 'Rum', 'Cigar', 'Pearl',
    'Anchor', 'Dolphin', 'Cobra', 'Panther', 'Bandit', 'Sabre', 'Domino', 'Orchid', 'Jasmine',
    'Comet', 'Lagoon', 'Reef', 'Boulevard', 'Avenue', 'Wave', 'Dune', 'Cactus', 'Heron'],
  suffix: ['& Co', 'Bros', 'Emporium', 'Supply', 'Trading', 'Outlet', 'House', 'Corner',
    'Express', 'Depot', 'Works', 'Hut', 'Room', 'Club', 'Lounge', 'Spot', 'Plaza', 'Exchange'],
});

/** Deterministic, plausible shop name. */
export function generateShopName(rng, type) {
  const t = getShopType(type);
  const p = SHOP_NAME_PARTS;
  const roll = rng.float();
  const word = t ? rng.pick(t.signWords) : 'Store';
  if (roll < 0.34) return `${rng.pick(p.prefix)} ${word}`;
  if (roll < 0.62) return `${rng.pick(p.core)} ${word}`;
  if (roll < 0.82) return `${rng.pick(p.prefix)} ${rng.pick(p.core)}`;
  return `${rng.pick(p.core)} ${rng.pick(p.suffix)}`;
}

export function validateShops() {
  const problems = [];
  const seen = new Set();
  for (const s of SHOP_TYPES) {
    if (seen.has(s.type)) problems.push(`duplicate type ${s.type}`);
    seen.add(s.type);
    if (!s.inventory.length) problems.push(`${s.type}: empty inventory`);
    for (const it of s.inventory) {
      if (typeof it.price !== 'number' || it.price < 0) problems.push(`${s.type}/${it.id}: bad price`);
      if (!['weapon', 'ammo', 'health', 'armor', 'food', 'clothing', 'upgrade', 'service'].includes(it.kind)) {
        problems.push(`${s.type}/${it.id}: bad kind ${it.kind}`);
      }
      if (it.kind === 'weapon' && !it.weaponId) problems.push(`${s.type}/${it.id}: weapon without weaponId`);
    }
    const r = s.robbery;
    if (r.tillCash[0] > r.tillCash[1]) problems.push(`${s.type}: tillCash reversed`);
    if (r.safeCash[0] > r.safeCash[1]) problems.push(`${s.type}: safeCash reversed`);
    if (r.wanted < 1 || r.wanted > 5) problems.push(`${s.type}: wanted out of range`);
    if (r.grabTime <= 0) problems.push(`${s.type}: grabTime must be positive`);
    if (r.safeCash[1] > 0 && r.safeTime <= 0) problems.push(`${s.type}: safe with no safeTime`);
    if (s.footprint[0] <= 0 || s.footprint[1] <= 0) problems.push(`${s.type}: bad footprint`);
  }
  return problems;
}
