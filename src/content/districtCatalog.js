// districtCatalog.js — the neighbourhoods of Leonida.
//
// The map is a coastal metropolis: ocean to the east (x > 1150), hills to the west,
// a canal running roughly north–south through the middle. Districts are resolved with a
// weighted Voronoi so their edges blend instead of snapping.
//
// Every id in here is a reference into a sibling catalogue, and validateDistricts
// at the bottom resolves all of them. These four imports are what makes that
// possible; all four are leaf modules that import nothing, so there is no cycle.
import { getPed } from './pedCatalog.js';
import { vehiclesByClass, VEHICLE_CLASSES } from './vehicleCatalog.js';
import { getShopType } from './shopCatalog.js';
import { getStation } from './radioCatalog.js';

export const DISTRICT_STYLES = ['downtown', 'beach', 'suburb', 'industrial', 'docks', 'airport',
  'hills', 'oldtown', 'strip', 'trailer', 'mall', 'marina', 'financial', 'barrio', 'park'];

// Facade names buildings.js knows how to material. Anything else falls through to
// plain concrete without complaint, which is a district quietly losing its look.
export const FACADE_KINDS = ['glass', 'office', 'apartment', 'artdeco',
  'shopfront', 'brick', 'stucco', 'warehouse', 'concrete'];

// The prop dials worldgen reads off `district.props`. A missing key is not a zero:
// the generator multiplies it through, gets NaN, and that prop silently never
// appears anywhere in the district.
export const DISTRICT_PROP_KEYS = ['palms', 'streetlights', 'billboards',
  'benches', 'trees', 'hydrants', 'bins', 'parkedCars', 'powerlines', 'neon'];

const P = {
  neonPink: 0xff2d95, neonCyan: 0x22e3ff, neonGold: 0xffc93c, neonLime: 0x4dff9e,
  neonViolet: 0x8a5cff, neonOrange: 0xff7a29,
};

export const DISTRICTS = Object.freeze([
  {
    id: 'vice-sands', name: 'Vice Sands', style: 'beach',
    center: [960, 60], radius: 340, influence: 1.15,
    heightRange: [8, 26], density: 0.34, blockSize: [80, 130], roadWidth: 9, sidewalkWidth: 4.2,
    palette: { wall: [0xf4e7d2, 0xf8d9b8, 0xffe9c9, 0xe9f0f4], roof: [0xd8c0a0, 0xe0e6ea],
               accent: [0x22e3ff, 0xff9ec4], neon: [P.neonCyan, P.neonPink, P.neonGold], ground: 0xd9c495 },
    facade: ['artdeco', 'stucco', 'shopfront'],
    props: { palms: 1.0, streetlights: 0.7, billboards: 0.3, benches: 0.8, trees: 0.2,
             hydrants: 0.5, bins: 0.7, parkedCars: 0.5, powerlines: 0.1, neon: 0.8 },
    trafficDensity: 0.55, pedDensity: 1.0,
    pedMix: [{ id: 'beachgoer', w: 4 }, { id: 'surfer', w: 3 }, { id: 'tourist', w: 3 },
             { id: 'jogger', w: 2 }, { id: 'lifeguard', w: 1 }, { id: 'skater', w: 2 },
             { id: 'photographer', w: 1 }, { id: 'street-vendor', w: 1 }],
    vehicleMix: [{ cls: 'sports', w: 3 }, { cls: 'coupe', w: 2 }, { cls: 'compact', w: 2 },
                 { cls: 'suv', w: 2 }, { cls: 'motorcycle', w: 2 }, { cls: 'exotic', w: 1 }],
    crime: 0.25, policePresence: 0.45, waterfront: true, elevation: 2.2,
    shopTypes: [{ type: 'convenience', w: 3 }, { type: 'clothing', w: 2 }, { type: 'diner', w: 3 },
                { type: 'barber', w: 1 }, { type: 'tattoo', w: 1 }, { type: 'liquor', w: 2 }],
    radio: 'wave-98',
  },
  {
    id: 'ocean-mile', name: 'Ocean Mile', style: 'strip',
    center: [820, -320], radius: 300, influence: 1.1,
    heightRange: [10, 34], density: 0.62, blockSize: [70, 110], roadWidth: 11, sidewalkWidth: 4.5,
    palette: { wall: [0xf2dfc6, 0xffd5e8, 0xd9f2f7, 0xffe8b0], roof: [0xe2cdb0, 0xcfe3ea],
               accent: [P.neonPink, P.neonCyan], neon: [P.neonPink, P.neonCyan, P.neonViolet, P.neonGold], ground: 0xb4b2ac },
    facade: ['artdeco', 'shopfront', 'stucco'],
    props: { palms: 0.9, streetlights: 1.0, billboards: 0.8, benches: 0.6, trees: 0.1,
             hydrants: 0.7, bins: 0.9, parkedCars: 0.9, powerlines: 0.1, neon: 1.0 },
    trafficDensity: 0.95, pedDensity: 1.0,
    pedMix: [{ id: 'tourist', w: 4 }, { id: 'rich-socialite', w: 2 }, { id: 'musician', w: 2 },
             { id: 'bartender', w: 1 }, { id: 'punk', w: 1 }, { id: 'photographer', w: 2 },
             { id: 'valet', w: 1 }, { id: 'street-dealer', w: 1 }],
    vehicleMix: [{ cls: 'exotic', w: 2 }, { cls: 'super', w: 1 }, { cls: 'sports', w: 3 },
                 { cls: 'lowrider', w: 2 }, { cls: 'coupe', w: 2 }, { cls: 'motorcycle', w: 2 }],
    crime: 0.42, policePresence: 0.55, waterfront: true, elevation: 2.6,
    shopTypes: [{ type: 'casino', w: 1 }, { type: 'clothing', w: 3 }, { type: 'diner', w: 2 },
                { type: 'jewelry', w: 2 }, { type: 'liquor', w: 2 }, { type: 'tattoo', w: 1 },
                { type: 'electronics', w: 1 }],
    radio: 'neon-drive',
  },
  {
    id: 'centro', name: 'Centro', style: 'downtown',
    center: [340, -140], radius: 330, influence: 1.2,
    heightRange: [40, 180], density: 0.88, blockSize: [55, 85], roadWidth: 12, sidewalkWidth: 4.0,
    palette: { wall: [0x8d8b84, 0x6f7b86, 0x9aa2a8, 0x5c6670], roof: [0x4a4e54, 0x3a3e44],
               accent: [0x22e3ff, 0xffc93c], neon: [P.neonCyan, P.neonGold, P.neonPink], ground: 0x9b9b9e },
    facade: ['glass', 'office', 'concrete'],
    props: { palms: 0.2, streetlights: 1.0, billboards: 0.9, benches: 0.7, trees: 0.4,
             hydrants: 1.0, bins: 1.0, parkedCars: 1.0, powerlines: 0.0, neon: 0.7 },
    trafficDensity: 1.0, pedDensity: 1.0,
    pedMix: [{ id: 'business-exec', w: 4 }, { id: 'office-worker', w: 4 }, { id: 'student', w: 2 },
             { id: 'cop-patrol', w: 1 }, { id: 'homeless', w: 1 }, { id: 'cleaner', w: 1 },
             { id: 'security-guard', w: 1 }, { id: 'cyclist', w: 1 }],
    vehicleMix: [{ cls: 'sedan', w: 4 }, { cls: 'compact', w: 3 }, { cls: 'suv', w: 2 },
                 { cls: 'van', w: 1 }, { cls: 'service', w: 2 }, { cls: 'bus', w: 1 }, { cls: 'coupe', w: 2 }],
    crime: 0.38, policePresence: 0.72, waterfront: false, elevation: 4.5,
    shopTypes: [{ type: 'electronics', w: 2 }, { type: 'convenience', w: 3 }, { type: 'bank', w: 2 },
                { type: 'clothing', w: 2 }, { type: 'pharmacy', w: 2 }, { type: 'diner', w: 2 }],
    radio: 'kult-fm',
  },
  {
    id: 'meridian', name: 'Meridian Financial', style: 'financial',
    center: [230, 200], radius: 250, influence: 1.15,
    heightRange: [60, 220], density: 0.92, blockSize: [50, 78], roadWidth: 12, sidewalkWidth: 4.4,
    palette: { wall: [0x2b3a46, 0x44515c, 0x7d8a92, 0x1f2a33], roof: [0x2a2f35, 0x3c444c],
               accent: [0x22e3ff, 0xffffff], neon: [P.neonCyan, 0xffffff], ground: 0xa2a2a4 },
    facade: ['glass', 'office'],
    props: { palms: 0.1, streetlights: 1.0, billboards: 0.5, benches: 0.5, trees: 0.5,
             hydrants: 1.0, bins: 0.9, parkedCars: 0.9, powerlines: 0.0, neon: 0.5 },
    trafficDensity: 0.92, pedDensity: 0.95,
    pedMix: [{ id: 'business-exec', w: 5 }, { id: 'office-worker', w: 4 }, { id: 'security-guard', w: 2 },
             { id: 'cop-detective', w: 1 }, { id: 'cleaner', w: 1 }, { id: 'waiter', w: 1 }],
    vehicleMix: [{ cls: 'sedan', w: 5 }, { cls: 'suv', w: 3 }, { cls: 'coupe', w: 2 },
                 { cls: 'utility', w: 1 }, { cls: 'service', w: 1 }],
    crime: 0.2, policePresence: 0.9, waterfront: false, elevation: 5.0,
    shopTypes: [{ type: 'bank', w: 4 }, { type: 'jewelry', w: 2 }, { type: 'electronics', w: 1 },
                { type: 'convenience', w: 2 }, { type: 'diner', w: 1 }],
    radio: 'the-signal',
  },
  {
    id: 'little-habana', name: 'Little Habana', style: 'oldtown',
    center: [560, 470], radius: 280, influence: 1.05,
    heightRange: [9, 22], density: 0.72, blockSize: [45, 75], roadWidth: 8.5, sidewalkWidth: 3.0,
    palette: { wall: [0xe8b866, 0xd97b58, 0xa8c8a0, 0xe8d9a8, 0xc4657a], roof: [0x8f4a32, 0xa8583c],
               accent: [0xffc93c, 0xff7a29], neon: [P.neonGold, P.neonOrange, P.neonLime], ground: 0xb0aba0 },
    facade: ['stucco', 'brick', 'shopfront'],
    props: { palms: 0.6, streetlights: 0.7, billboards: 0.3, benches: 0.6, trees: 0.5,
             hydrants: 0.8, bins: 0.8, parkedCars: 1.0, powerlines: 0.8, neon: 0.7 },
    trafficDensity: 0.7, pedDensity: 1.0,
    pedMix: [{ id: 'elder', w: 3 }, { id: 'street-vendor', w: 3 }, { id: 'musician', w: 2 },
             { id: 'chef', w: 2 }, { id: 'gang-saint', w: 2 }, { id: 'mechanic', w: 1 },
             { id: 'student', w: 2 }, { id: 'waiter', w: 2 }],
    vehicleMix: [{ cls: 'classic', w: 3 }, { cls: 'lowrider', w: 3 }, { cls: 'compact', w: 3 },
                 { cls: 'pickup', w: 2 }, { cls: 'van', w: 1 }, { cls: 'motorcycle', w: 1 }],
    crime: 0.55, policePresence: 0.4, waterfront: false, elevation: 3.4,
    shopTypes: [{ type: 'diner', w: 3 }, { type: 'convenience', w: 3 }, { type: 'barber', w: 2 },
                { type: 'liquor', w: 2 }, { type: 'pawn', w: 2 }, { type: 'autoshop', w: 1 },
                { type: 'supermarket', w: 1 }],
    radio: 'radio-calor',
  },
  {
    id: 'marina-del-sol', name: 'Marina del Sol', style: 'marina',
    center: [880, -680], radius: 260, influence: 1.0,
    heightRange: [6, 16], density: 0.42, blockSize: [85, 130], roadWidth: 9, sidewalkWidth: 3.4,
    palette: { wall: [0xf0efe8, 0xdfe8ee, 0xfdf6e6], roof: [0x3a5a72, 0x5d7b8c],
               accent: [0x22e3ff, 0xffffff], neon: [P.neonCyan, 0xffffff], ground: 0xbdb9ae },
    facade: ['stucco', 'glass'],
    props: { palms: 0.8, streetlights: 0.8, billboards: 0.2, benches: 0.9, trees: 0.4,
             hydrants: 0.6, bins: 0.6, parkedCars: 0.7, powerlines: 0.1, neon: 0.4 },
    trafficDensity: 0.5, pedDensity: 0.7,
    pedMix: [{ id: 'rich-socialite', w: 3 }, { id: 'fisherman', w: 2 }, { id: 'tourist', w: 2 },
             { id: 'security-guard', w: 1 }, { id: 'dog-walker', w: 2 }, { id: 'valet', w: 1 }],
    vehicleMix: [{ cls: 'exotic', w: 2 }, { cls: 'suv', w: 3 }, { cls: 'sports', w: 2 },
                 { cls: 'sedan', w: 2 }, { cls: 'pickup', w: 1 }],
    crime: 0.18, policePresence: 0.6, waterfront: true, elevation: 2.0,
    shopTypes: [{ type: 'diner', w: 2 }, { type: 'convenience', w: 2 }, { type: 'clothing', w: 2 },
                { type: 'jewelry', w: 1 }, { type: 'gasstation', w: 1 }],
    radio: 'blue-horizon',
  },
  {
    id: 'port-esperanza', name: 'Port Esperanza', style: 'docks',
    center: [620, -1010], radius: 300, influence: 1.05,
    heightRange: [6, 20], density: 0.48, blockSize: [110, 170], roadWidth: 11, sidewalkWidth: 0,
    palette: { wall: [0x8f9490, 0x6e7a7c, 0xa08d72], roof: [0x5a5f60, 0x46494a],
               accent: [0xff7a29, 0xffc93c], neon: [P.neonOrange], ground: 0x8a8880 },
    facade: ['warehouse', 'concrete'],
    props: { palms: 0.0, streetlights: 0.6, billboards: 0.2, benches: 0.05, trees: 0.02,
             hydrants: 0.5, bins: 0.4, parkedCars: 0.5, powerlines: 0.9, neon: 0.15 },
    trafficDensity: 0.5, pedDensity: 0.35,
    pedMix: [{ id: 'dock-worker', w: 5 }, { id: 'construction-worker', w: 2 }, { id: 'fisherman', w: 2 },
             { id: 'mechanic', w: 1 }, { id: 'security-guard', w: 2 }, { id: 'gang-king', w: 1 }],
    vehicleMix: [{ cls: 'truck', w: 4 }, { cls: 'van', w: 3 }, { cls: 'pickup', w: 3 },
                 { cls: 'utility', w: 2 }, { cls: 'service', w: 1 }],
    crime: 0.68, policePresence: 0.32, waterfront: true, elevation: 2.4,
    shopTypes: [{ type: 'convenience', w: 2 }, { type: 'liquor', w: 2 }, { type: 'pawn', w: 2 },
                { type: 'gunstore', w: 1 }, { type: 'autoshop', w: 2 }, { type: 'gasstation', w: 2 }],
    radio: 'iron-lung',
  },
  {
    id: 'foundry-flats', name: 'Foundry Flats', style: 'industrial',
    center: [160, -860], radius: 300, influence: 1.0,
    heightRange: [8, 24], density: 0.55, blockSize: [100, 160], roadWidth: 10.5, sidewalkWidth: 2.6,
    palette: { wall: [0x7f8480, 0x9a8f7e, 0x6b6f70, 0xa8613f], roof: [0x4c5052, 0x5c4a3a],
               accent: [0xff7a29], neon: [P.neonOrange, P.neonGold], ground: 0x86847e },
    facade: ['warehouse', 'brick', 'concrete'],
    props: { palms: 0.0, streetlights: 0.6, billboards: 0.4, benches: 0.1, trees: 0.1,
             hydrants: 0.6, bins: 0.5, parkedCars: 0.6, powerlines: 1.0, neon: 0.2 },
    trafficDensity: 0.6, pedDensity: 0.3,
    pedMix: [{ id: 'construction-worker', w: 5 }, { id: 'mechanic', w: 3 }, { id: 'dock-worker', w: 2 },
             { id: 'gang-viper', w: 2 }, { id: 'homeless', w: 1 }, { id: 'security-guard', w: 1 }],
    vehicleMix: [{ cls: 'truck', w: 3 }, { cls: 'van', w: 3 }, { cls: 'pickup', w: 3 },
                 { cls: 'utility', w: 2 }, { cls: 'muscle', w: 1 }, { cls: 'offroad', w: 1 }],
    crime: 0.7, policePresence: 0.3, waterfront: false, elevation: 3.8,
    shopTypes: [{ type: 'autoshop', w: 3 }, { type: 'gunstore', w: 2 }, { type: 'convenience', w: 2 },
                { type: 'liquor', w: 2 }, { type: 'pawn', w: 2 }, { type: 'gasstation', w: 2 }],
    radio: 'iron-lung',
  },
  {
    id: 'leonida-intl', name: 'Leonida International', style: 'airport',
    center: [-420, -1090], radius: 330, influence: 1.1,
    heightRange: [6, 18], density: 0.28, blockSize: [150, 230], roadWidth: 13, sidewalkWidth: 3.0,
    palette: { wall: [0xb4bcc0, 0x9aa4ac, 0xdfe3e6], roof: [0x5c646a],
               accent: [0x22e3ff, 0xffc93c], neon: [P.neonCyan], ground: 0x9d9d9c },
    facade: ['glass', 'concrete', 'warehouse'],
    props: { palms: 0.3, streetlights: 0.9, billboards: 0.4, benches: 0.4, trees: 0.15,
             hydrants: 0.5, bins: 0.6, parkedCars: 0.7, powerlines: 0.3, neon: 0.3 },
    trafficDensity: 0.7, pedDensity: 0.45,
    pedMix: [{ id: 'tourist', w: 4 }, { id: 'business-exec', w: 3 }, { id: 'security-guard', w: 3 },
             { id: 'cleaner', w: 2 }, { id: 'cop-patrol', w: 1 }, { id: 'dock-worker', w: 1 }],
    vehicleMix: [{ cls: 'sedan', w: 3 }, { cls: 'van', w: 3 }, { cls: 'bus', w: 2 },
                 { cls: 'service', w: 3 }, { cls: 'utility', w: 2 }, { cls: 'truck', w: 1 }],
    crime: 0.22, policePresence: 0.8, waterfront: false, elevation: 2.8,
    shopTypes: [{ type: 'convenience', w: 3 }, { type: 'diner', w: 2 }, { type: 'clothing', w: 1 },
                { type: 'pharmacy', w: 1 }, { type: 'gasstation', w: 2 }],
    radio: 'the-signal',
  },
  {
    id: 'palmview', name: 'Palmview', style: 'suburb',
    center: [-160, -430], radius: 300, influence: 1.0,
    heightRange: [5, 11], density: 0.5, blockSize: [75, 120], roadWidth: 8, sidewalkWidth: 2.8,
    palette: { wall: [0xf0e4cc, 0xdce8dc, 0xe8d8c8, 0xd4dce8], roof: [0x8a6a4e, 0x6a7a80, 0x9a7458],
               accent: [0x4dff9e], neon: [P.neonLime], ground: 0x9fb07a },
    facade: ['stucco', 'brick'],
    props: { palms: 0.5, streetlights: 0.6, billboards: 0.05, benches: 0.3, trees: 1.0,
             hydrants: 0.9, bins: 0.6, parkedCars: 0.8, powerlines: 0.7, neon: 0.05 },
    trafficDensity: 0.45, pedDensity: 0.5,
    pedMix: [{ id: 'dog-walker', w: 3 }, { id: 'jogger', w: 3 }, { id: 'student', w: 2 },
             { id: 'elder', w: 2 }, { id: 'office-worker', w: 2 }, { id: 'cyclist', w: 2 },
             { id: 'cleaner', w: 1 }],
    vehicleMix: [{ cls: 'sedan', w: 4 }, { cls: 'suv', w: 4 }, { cls: 'compact', w: 3 },
                 { cls: 'pickup', w: 2 }, { cls: 'van', w: 1 }],
    crime: 0.2, policePresence: 0.5, waterfront: false, elevation: 5.5,
    shopTypes: [{ type: 'convenience', w: 3 }, { type: 'supermarket', w: 2 }, { type: 'pharmacy', w: 2 },
                { type: 'gasstation', w: 2 }, { type: 'barber', w: 1 }, { type: 'diner', w: 1 }],
    radio: 'wave-98',
  },
  {
    id: 'south-glades', name: 'South Glades', style: 'suburb',
    center: [-120, 660], radius: 300, influence: 1.0,
    heightRange: [5, 12], density: 0.48, blockSize: [75, 125], roadWidth: 8, sidewalkWidth: 2.8,
    palette: { wall: [0xeee0c8, 0xd8e4e8, 0xf4e8d4, 0xdcd4c0], roof: [0x7a6450, 0x5f7078],
               accent: [0xffc93c], neon: [P.neonGold], ground: 0x9cae78 },
    facade: ['stucco', 'brick'],
    props: { palms: 0.55, streetlights: 0.6, billboards: 0.06, benches: 0.35, trees: 0.95,
             hydrants: 0.9, bins: 0.6, parkedCars: 0.8, powerlines: 0.75, neon: 0.05 },
    trafficDensity: 0.45, pedDensity: 0.5,
    pedMix: [{ id: 'dog-walker', w: 3 }, { id: 'elder', w: 3 }, { id: 'student', w: 2 },
             { id: 'jogger', w: 2 }, { id: 'nurse', w: 1 }, { id: 'mechanic', w: 1 }, { id: 'cyclist', w: 2 }],
    vehicleMix: [{ cls: 'sedan', w: 4 }, { cls: 'suv', w: 3 }, { cls: 'compact', w: 3 },
                 { cls: 'pickup', w: 3 }, { cls: 'classic', w: 1 }],
    crime: 0.26, policePresence: 0.44, waterfront: false, elevation: 4.2,
    shopTypes: [{ type: 'convenience', w: 3 }, { type: 'supermarket', w: 2 }, { type: 'pharmacy', w: 1 },
                { type: 'gasstation', w: 2 }, { type: 'autoshop', w: 1 }, { type: 'liquor', w: 1 }],
    radio: 'kult-fm',
  },
  {
    id: 'saint-mercy', name: 'Saint Mercy', style: 'barrio',
    center: [430, 900], radius: 290, influence: 1.0,
    heightRange: [5, 13], density: 0.6, blockSize: [55, 90], roadWidth: 8, sidewalkWidth: 2.4,
    palette: { wall: [0xd8c8a8, 0xc08a70, 0xa8b098, 0xd0a860], roof: [0x7a5a44, 0x6a6050],
               accent: [0xff2d95, 0xffc93c], neon: [P.neonPink, P.neonGold, P.neonLime], ground: 0x9a968c },
    facade: ['stucco', 'brick', 'shopfront'],
    props: { palms: 0.4, streetlights: 0.5, billboards: 0.3, benches: 0.4, trees: 0.4,
             hydrants: 0.8, bins: 0.9, parkedCars: 1.0, powerlines: 1.0, neon: 0.5 },
    trafficDensity: 0.6, pedDensity: 0.85,
    pedMix: [{ id: 'gang-king', w: 3 }, { id: 'gang-saint', w: 3 }, { id: 'street-dealer', w: 2 },
             { id: 'student', w: 2 }, { id: 'elder', w: 2 }, { id: 'mechanic', w: 2 },
             { id: 'homeless', w: 2 }, { id: 'street-vendor', w: 2 }],
    vehicleMix: [{ cls: 'lowrider', w: 3 }, { cls: 'muscle', w: 2 }, { cls: 'compact', w: 3 },
                 { cls: 'pickup', w: 2 }, { cls: 'van', w: 2 }, { cls: 'classic', w: 2 }],
    crime: 0.85, policePresence: 0.35, waterfront: false, elevation: 3.0,
    shopTypes: [{ type: 'liquor', w: 3 }, { type: 'pawn', w: 3 }, { type: 'convenience', w: 3 },
                { type: 'gunstore', w: 2 }, { type: 'tattoo', w: 2 }, { type: 'autoshop', w: 2 },
                { type: 'barber', w: 1 }],
    radio: 'radio-calor',
  },
  {
    id: 'mirador-hills', name: 'Mirador Hills', style: 'hills',
    center: [-940, 60], radius: 420, influence: 1.25,
    heightRange: [6, 15], density: 0.24, blockSize: [120, 200], roadWidth: 8, sidewalkWidth: 0,
    palette: { wall: [0xf4efe4, 0xe4dccc, 0xffffff, 0xd8cfc0], roof: [0x8a6a4e, 0x5a6a70],
               accent: [0xffc93c], neon: [P.neonGold, 0xffffff], ground: 0x8fa066 },
    facade: ['stucco', 'glass'],
    props: { palms: 0.3, streetlights: 0.35, billboards: 0.02, benches: 0.15, trees: 1.0,
             hydrants: 0.4, bins: 0.3, parkedCars: 0.4, powerlines: 0.4, neon: 0.05 },
    trafficDensity: 0.28, pedDensity: 0.22,
    pedMix: [{ id: 'rich-socialite', w: 3 }, { id: 'jogger', w: 3 }, { id: 'dog-walker', w: 2 },
             { id: 'security-guard', w: 1 }, { id: 'cleaner', w: 1 }, { id: 'cyclist', w: 2 }],
    vehicleMix: [{ cls: 'exotic', w: 3 }, { cls: 'super', w: 2 }, { cls: 'suv', w: 3 },
                 { cls: 'sports', w: 3 }, { cls: 'sedan', w: 1 }, { cls: 'motorcycle', w: 1 }],
    crime: 0.1, policePresence: 0.55, waterfront: false, elevation: 22,
    shopTypes: [{ type: 'convenience', w: 2 }, { type: 'gasstation', w: 1 }, { type: 'diner', w: 1 }],
    radio: 'blue-horizon',
  },
  {
    id: 'cypress-park', name: 'Cypress Park', style: 'park',
    center: [-580, 520], radius: 280, influence: 0.95,
    heightRange: [3, 9], density: 0.14, blockSize: [140, 220], roadWidth: 7.5, sidewalkWidth: 3.4,
    palette: { wall: [0xd8cdb4, 0xc4b89c], roof: [0x6a7a4a, 0x7a6a4a],
               accent: [0x4dff9e], neon: [P.neonLime], ground: 0x6f9048 },
    facade: ['brick', 'stucco'],
    props: { palms: 0.5, streetlights: 0.5, billboards: 0.02, benches: 1.0, trees: 1.0,
             hydrants: 0.4, bins: 0.8, parkedCars: 0.25, powerlines: 0.1, neon: 0.05 },
    trafficDensity: 0.25, pedDensity: 0.8,
    pedMix: [{ id: 'jogger', w: 4 }, { id: 'dog-walker', w: 3 }, { id: 'skater', w: 3 },
             { id: 'student', w: 3 }, { id: 'musician', w: 2 }, { id: 'elder', w: 2 },
             { id: 'photographer', w: 1 }, { id: 'homeless', w: 1 }, { id: 'cyclist', w: 3 }],
    vehicleMix: [{ cls: 'compact', w: 3 }, { cls: 'sedan', w: 2 }, { cls: 'suv', w: 2 }, { cls: 'service', w: 1 }],
    crime: 0.3, policePresence: 0.4, waterfront: false, elevation: 4.0,
    shopTypes: [{ type: 'convenience', w: 2 }, { type: 'diner', w: 1 }],
    radio: 'blue-horizon',
  },
  {
    id: 'grand-vista', name: 'Grand Vista Mall', style: 'mall',
    center: [-720, -560], radius: 270, influence: 1.0,
    heightRange: [10, 20], density: 0.4, blockSize: [120, 190], roadWidth: 10, sidewalkWidth: 3.6,
    palette: { wall: [0xd8d4c8, 0xc8ccd0, 0xe4dccc], roof: [0x60646a],
               accent: [0xff2d95, 0x22e3ff], neon: [P.neonPink, P.neonCyan, P.neonGold], ground: 0xa4a29c },
    facade: ['concrete', 'glass', 'shopfront'],
    props: { palms: 0.4, streetlights: 0.9, billboards: 0.7, benches: 0.7, trees: 0.5,
             hydrants: 0.7, bins: 0.9, parkedCars: 1.0, powerlines: 0.2, neon: 0.8 },
    trafficDensity: 0.7, pedDensity: 0.9,
    pedMix: [{ id: 'student', w: 4 }, { id: 'office-worker', w: 2 }, { id: 'security-guard', w: 2 },
             { id: 'skater', w: 2 }, { id: 'punk', w: 2 }, { id: 'elder', w: 1 }, { id: 'valet', w: 1 }],
    vehicleMix: [{ cls: 'compact', w: 4 }, { cls: 'sedan', w: 3 }, { cls: 'suv', w: 3 },
                 { cls: 'van', w: 2 }, { cls: 'motorcycle', w: 1 }],
    crime: 0.4, policePresence: 0.5, waterfront: false, elevation: 4.4,
    shopTypes: [{ type: 'clothing', w: 3 }, { type: 'electronics', w: 3 }, { type: 'supermarket', w: 2 },
                { type: 'pharmacy', w: 2 }, { type: 'diner', w: 2 }, { type: 'jewelry', w: 1 },
                { type: 'convenience', w: 2 }],
    radio: 'neon-drive',
  },
  {
    id: 'rust-row', name: 'Rust Row', style: 'trailer',
    center: [-1050, -820], radius: 300, influence: 0.95,
    heightRange: [4, 10], density: 0.3, blockSize: [90, 150], roadWidth: 7, sidewalkWidth: 0,
    palette: { wall: [0xb8ae98, 0xa89878, 0xc0b8a8, 0x9a8f78], roof: [0x7a6a52, 0x8a7a5a],
               accent: [0xff7a29], neon: [P.neonOrange, P.neonGold], ground: 0x9c8b64 },
    facade: ['stucco', 'warehouse'],
    props: { palms: 0.15, streetlights: 0.3, billboards: 0.2, benches: 0.1, trees: 0.4,
             hydrants: 0.3, bins: 0.6, parkedCars: 0.9, powerlines: 1.0, neon: 0.2 },
    trafficDensity: 0.3, pedDensity: 0.4,
    pedMix: [{ id: 'mechanic', w: 3 }, { id: 'homeless', w: 3 }, { id: 'biker', w: 3 },
             { id: 'gang-viper', w: 2 }, { id: 'elder', w: 2 }, { id: 'construction-worker', w: 2 },
             { id: 'street-dealer', w: 1 }],
    vehicleMix: [{ cls: 'pickup', w: 4 }, { cls: 'offroad', w: 3 }, { cls: 'muscle', w: 2 },
                 { cls: 'motorcycle', w: 3 }, { cls: 'van', w: 2 }, { cls: 'classic', w: 1 }],
    crime: 0.75, policePresence: 0.2, waterfront: false, elevation: 6.5,
    shopTypes: [{ type: 'liquor', w: 3 }, { type: 'gunstore', w: 2 }, { type: 'autoshop', w: 3 },
                { type: 'pawn', w: 2 }, { type: 'convenience', w: 2 }, { type: 'gasstation', w: 2 }],
    radio: 'iron-lung',
  },
]);

const byId = new Map(DISTRICTS.map((d) => [d.id, d]));
export function getDistrict(id) { return byId.get(id); }

/**
 * Weighted-Voronoi district lookup: pure, fast and deterministic.
 * Distance is divided by influence so a "stronger" district reaches further.
 */
export function districtAt(x, z) {
  let best = DISTRICTS[0], bestScore = Infinity;
  for (let i = 0; i < DISTRICTS.length; i++) {
    const d = DISTRICTS[i];
    const dx = x - d.center[0], dz = z - d.center[1];
    const score = Math.sqrt(dx * dx + dz * dz) / (d.influence || 1);
    if (score < bestScore) { bestScore = score; best = d; }
  }
  return best;
}

/** How strongly a point belongs to its district (1 at the centre, 0 at the rim). */
export function districtStrength(x, z, d) {
  const dx = x - d.center[0], dz = z - d.center[1];
  return Math.max(0, 1 - Math.sqrt(dx * dx + dz * dz) / d.radius);
}

export function validateDistricts() {
  const problems = [];
  const seen = new Set();
  for (const d of DISTRICTS) {
    if (seen.has(d.id)) problems.push(`duplicate id ${d.id}`);
    seen.add(d.id);
    if (!DISTRICT_STYLES.includes(d.style)) problems.push(`${d.id}: unknown style ${d.style}`);
    if (d.heightRange[0] >= d.heightRange[1]) problems.push(`${d.id}: bad heightRange`);
    if (!(d.density > 0 && d.density <= 1)) problems.push(`${d.id}: density out of range`);

    // Every reference has to resolve. Checking only that these lists are
    // non-empty passes a district whose entire ped mix is misspelled: the
    // spawner falls back to something generic and the district loses its
    // character with nothing in the log to say so.
    if (!d.pedMix.length) problems.push(`${d.id}: empty pedMix`);
    for (const e of d.pedMix) {
      if (!getPed(e.id)) problems.push(`${d.id}: pedMix references unknown archetype ${e.id}`);
      if (!(e.w > 0)) problems.push(`${d.id}: pedMix weight for ${e.id} is ${e.w}`);
    }

    if (!d.vehicleMix.length) problems.push(`${d.id}: empty vehicleMix`);
    for (const e of d.vehicleMix) {
      if (!VEHICLE_CLASSES.includes(e.cls)) {
        problems.push(`${d.id}: vehicleMix references unknown class ${e.cls}`);
      } else if (!vehiclesByClass(e.cls).some((v) => v.spawnWeight > 0 && !v.tags.includes('police'))) {
        // The class exists but nothing in it can appear in traffic, so the
        // spawner silently falls through to "any civilian car".
        problems.push(`${d.id}: no spawnable civilian vehicle in class ${e.cls}`);
      }
      if (!(e.w > 0)) problems.push(`${d.id}: vehicleMix weight for ${e.cls} is ${e.w}`);
    }

    if (!d.shopTypes.length) problems.push(`${d.id}: empty shopTypes`);
    for (const e of d.shopTypes) {
      if (!getShopType(e.type)) problems.push(`${d.id}: shopTypes references unknown shop ${e.type}`);
      if (!(e.w > 0)) problems.push(`${d.id}: shopTypes weight for ${e.type} is ${e.w}`);
    }

    if (!getStation(d.radio)) problems.push(`${d.id}: radio references unknown station ${d.radio}`);

    if (!d.facade || !d.facade.length) problems.push(`${d.id}: empty facade list`);
    for (const f of d.facade || []) {
      if (!FACADE_KINDS.includes(f)) problems.push(`${d.id}: unknown facade ${f}`);
    }

    // Prop dials: present, numeric and in range. A missing key reads back as
    // undefined and turns the generator's probability into NaN.
    for (const k of DISTRICT_PROP_KEYS) {
      const v = d.props ? d.props[k] : undefined;
      if (!Number.isFinite(v)) problems.push(`${d.id}: props.${k} is ${v}`);
      else if (v < 0 || v > 1) problems.push(`${d.id}: props.${k} is ${v}, outside 0..1`);
    }
    for (const k of Object.keys(d.props || {})) {
      if (!DISTRICT_PROP_KEYS.includes(k)) problems.push(`${d.id}: props.${k} is not a dial anything reads`);
    }

    // Palettes are picked from by index, so an empty band throws at generation time.
    for (const band of ['wall', 'roof', 'accent', 'neon']) {
      const arr = d.palette && d.palette[band];
      if (!Array.isArray(arr) || !arr.length) problems.push(`${d.id}: palette.${band} is empty`);
    }
    if (!Number.isFinite(d.palette && d.palette.ground)) problems.push(`${d.id}: palette.ground is missing`);
  }
  // spacing
  for (let i = 0; i < DISTRICTS.length; i++) {
    for (let j = i + 1; j < DISTRICTS.length; j++) {
      const a = DISTRICTS[i], b = DISTRICTS[j];
      const dist = Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]);
      if (dist < 280) problems.push(`${a.id} and ${b.id} are only ${dist.toFixed(0)} m apart`);
    }
  }
  // coverage: every land sample must land within some district's radius
  let uncovered = 0;
  for (let i = 0; i < 64; i++) {
    for (let j = 0; j < 64; j++) {
      const x = -1550 + (i / 63) * (1100 + 1550);
      const z = -1550 + (j / 63) * 3100;
      const d = districtAt(x, z);
      const dist = Math.hypot(x - d.center[0], z - d.center[1]);
      if (dist > d.radius * 2.6) uncovered++;
    }
  }
  // The far map corners are deliberately outskirts — scrub, water and highway shoulder —
  // so a modest number of distant samples is expected.
  if (uncovered > 420) problems.push(`${uncovered}/4096 land samples are far from any district centre`);
  return problems;
}
