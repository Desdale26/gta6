/*
 * data/districts.js — the districts of the Phase 1 test city, as data.
 *
 * Each district is a rectangle on the map (x: west→east, z: north→south,
 * -Z is north) plus the rules its buildings are generated from. Adding a
 * district, or tuning how one looks, is an edit here, not in the generator.
 *
 * Building archetypes (see buildings.js):
 *   tower     glass skyscraper on a podium, optional setbacks and crown
 *   office    mid-rise with punched or ribbon windows and a cornice
 *   shophouse low-rise with shopfronts, awnings and rooftop clutter
 *   apartment residential block with balconies
 *   hotel     tall pastel slab with vertical fins and a rooftop sign frame
 *   villa     two-storey house with a pitched roof and a garden wall
 */
(function () {
  'use strict';

  const VH = window.VH;
  VH.Data = VH.Data || {};

  VH.Data.districts = [
    {
      id: 'downtown',
      name: 'Downtown',
      tagline: 'Grand Avenue',
      rect: { minX: -200, maxX: 200, minZ: -392, maxZ: 105 },
      lot: { min: 22, max: 40 },
      alleyChance: 0.35,
      emptyLotChance: 0.04,
      archetypes: [
        { type: 'tower', weight: 6, floors: [16, 44] },
        { type: 'office', weight: 3, floors: [7, 15] },
        { type: 'hotel', weight: 1, floors: [12, 22] },
      ],
      // Taller towards the centre of downtown.
      heightFocus: { x: 20, z: -170, radius: 260, boost: 1.0 },
      palette: {
        walls: [0xb9bcc1, 0x98a1ab, 0x7e8896, 0xcdc4b3, 0x5f6b7a, 0xaab2bb, 0x8a9098, 0xc2b49c, 0x4d5866],
        roofs: [0x6b6e72, 0x5c5f63, 0x74777a],
        accents: [0x2d3440, 0xe8e2d6, 0x445566],
      },
      ambient: { crowd: 'business', traffic: 'heavy' },
    },
    {
      id: 'oldmarket',
      name: 'Old Market',
      tagline: 'Brick, bargains and back alleys',
      rect: { minX: -392, maxX: -200, minZ: -392, maxZ: 105 },
      lot: { min: 14, max: 24 },
      alleyChance: 0.8,
      emptyLotChance: 0.1,
      archetypes: [
        { type: 'shophouse', weight: 6, floors: [2, 5] },
        { type: 'office', weight: 1, floors: [4, 7] },
        { type: 'apartment', weight: 2, floors: [4, 7] },
      ],
      palette: {
        walls: [0x8a4b3a, 0x9c5a44, 0x7a3f33, 0xa8704f, 0xb88a62, 0x6e3b30, 0xc49a74, 0x8f6a52],
        roofs: [0x4f4a45, 0x5a524a, 0x3f3b38],
        accents: [0xe7dcc8, 0x2f5d50, 0x7a2f2a, 0x2b4a6b, 0xc9a227],
      },
      ambient: { crowd: 'market', traffic: 'medium' },
    },
    {
      id: 'palmcrescent',
      name: 'Palm Crescent',
      tagline: 'Quiet streets, loud money',
      rect: { minX: -392, maxX: 200, minZ: -9, maxZ: 392 },
      lot: { min: 18, max: 30 },
      alleyChance: 0.1,
      emptyLotChance: 0.06,
      archetypes: [
        { type: 'apartment', weight: 5, floors: [3, 9] },
        { type: 'villa', weight: 3, floors: [2, 2] },
        { type: 'office', weight: 1, floors: [3, 6] },
      ],
      palette: {
        walls: [0xf2e6d0, 0xf4d9c6, 0xe6efe9, 0xf1e3b3, 0xd9e8f0, 0xf6d4d2, 0xe8e0d0, 0xcfe3d4],
        roofs: [0xa4553c, 0x9a4e37, 0x7a6a5a, 0xb86446],
        accents: [0xffffff, 0x2f7f86, 0xd8795e, 0x3d6b8f],
      },
      ambient: { crowd: 'residential', traffic: 'light' },
    },
    {
      id: 'harborpoint',
      name: 'Harbor Point',
      tagline: 'Where the boardwalk meets the bay',
      rect: { minX: 200, maxX: 470, minZ: -392, maxZ: 392 },
      lot: { min: 20, max: 34 },
      alleyChance: 0.15,
      emptyLotChance: 0.12,
      archetypes: [
        { type: 'hotel', weight: 5, floors: [6, 18] },
        { type: 'apartment', weight: 2, floors: [5, 12] },
        { type: 'shophouse', weight: 2, floors: [2, 3] },
      ],
      palette: {
        walls: [0xf7c6c7, 0xa8e0d8, 0xf9e2a6, 0xc9d8f5, 0xf5f0e6, 0xffd3b0, 0xb9ead6, 0xe9c9f0],
        roofs: [0x8a8f94, 0x9a9da0],
        accents: [0xffffff, 0x1f8a8a, 0xff6f91, 0xf0a030],
      },
      ambient: { crowd: 'tourist', traffic: 'medium' },
    },
    {
      id: 'saltmarsh',
      name: 'Saltmarsh Docks',
      tagline: 'Cranes, containers and closed mouths',
      rect: { minX: -12, maxX: 470, minZ: 392, maxZ: 640 },
      lot: { min: 30, max: 60 },
      alleyChance: 0,
      emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0x8a8f96], roofs: [0x5a5f66], accents: [0xe06a1a] },
      ambient: { crowd: 'none', traffic: 'industrial' },
    },
    {
      id: 'crestline',
      name: 'Crestline Estates',
      tagline: 'Gates, lawns and very old money',
      rect: { minX: -640, maxX: -392, minZ: -392, maxZ: 392 },
      lot: { min: 40, max: 70 },
      alleyChance: 0,
      emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0xf4f1ea], roofs: [0x7a6a5a], accents: [0x2f7f86] },
      ambient: { crowd: 'none', traffic: 'light' },
    },
    // Beyond the old city limits: the new skyline north of downtown, the
    // airport out past it, and the army base west along Meridian Boulevard.
    {
      id: 'northgate',
      name: 'Northgate Heights',
      tagline: 'Glass, steel and somebody else\'s money',
      rect: { minX: -100, maxX: 300, minZ: -660, maxZ: -392.01 },
      lot: { min: 0, max: 0 },
      alleyChance: 0,
      emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0x9aa6b4], roofs: [0x6b6e72], accents: [0x2d3440] },
      ambient: { crowd: 'business', traffic: 'heavy' },
    },
    {
      id: 'airport',
      name: 'Vicehaven International',
      tagline: 'Departures, arrivals, and a fence you can climb',
      rect: { minX: -1110, maxX: 400, minZ: -1600, maxZ: -1100 },
      lot: { min: 0, max: 0 },
      alleyChance: 0,
      emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0xdfe3e6], roofs: [0x777777], accents: [0x1fa3a3] },
      ambient: { crowd: 'none', traffic: 'light' },
    },
    {
      id: 'fort',
      name: 'Fort Breakwater',
      tagline: 'Restricted area. They mean it',
      rect: { minX: -1540, maxX: -1090, minZ: -430, maxZ: 430 },
      lot: { min: 0, max: 0 },
      alleyChance: 0,
      emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0x6b6f4a], roofs: [0x4a4d3a], accents: [0xd8c070] },
      ambient: { crowd: 'none', traffic: 'none' },
    },
    // The roadside strips on the roads out of town (suburbs.js).
    {
      id: 'northroad',
      name: 'Grand Avenue North',
      tagline: 'Motels, diners and the last exit before departures',
      rect: { minX: -60, maxX: 60, minZ: -1095, maxZ: -655.01 },
      lot: { min: 0, max: 0 },
      alleyChance: 0,
      emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0xf7c6c7], roofs: [0x8a8f94], accents: [0x1f8a8a] },
      ambient: { crowd: 'light', traffic: 'heavy' },
    },
    {
      id: 'meridianwest',
      name: 'Meridian West',
      tagline: 'Yards, workshops and the long road to the fort',
      rect: { minX: -1078, maxX: -640.01, minZ: -55, maxZ: 55 },
      lot: { min: 0, max: 0 },
      alleyChance: 0,
      emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0x8a8f96], roofs: [0x5a5f66], accents: [0xe06a1a] },
      ambient: { crowd: 'light', traffic: 'medium' },
    },
    {
      id: 'outskirts',
      name: 'Vicehaven Outskirts',
      tagline: 'Where the city runs out of ideas',
      rect: { minX: -2000, maxX: 470, minZ: -2000, maxZ: 2000 },
      lot: { min: 30, max: 60 },
      alleyChance: 0,
      emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0xcccccc], roofs: [0x777777], accents: [0xffffff] },
      ambient: { crowd: 'none', traffic: 'light' },
    },
    {
      id: 'bay',
      name: 'Vicehaven Bay',
      tagline: 'Open water',
      rect: { minX: 470, maxX: 4000, minZ: -4000, maxZ: 4000 },
      lot: { min: 0, max: 0 },
      alleyChance: 0,
      emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0xcccccc], roofs: [0x777777], accents: [0xffffff] },
      ambient: { crowd: 'none', traffic: 'none' },
    },
  ];

  /**
   * Street names. Avenues run north–south (constant x), streets run
   * east–west (constant z). Keys are the grid line coordinate.
   */
  VH.Data.streetNames = {
    avenues: {
      '-384': 'Cypress Parkway',
      '-288': 'Tannery Avenue',
      '-192': 'Market Avenue',
      '-96': 'Coral Avenue',
      '0': 'Grand Avenue',
      '96': 'Bayshore Avenue',
      '192': 'Flamingo Avenue',
      '288': 'Pelican Avenue',
      '384': 'Seawall Drive',
    },
    streets: {
      '-384': 'Northgate Street',
      '-288': 'Anchor Street',
      '-192': 'Palisade Street',
      '-96': 'Lantern Street',
      '0': 'Meridian Boulevard',
      '96': 'Laurel Street',
      '192': 'Magnolia Street',
      '288': 'Heron Street',
      '384': 'Southshore Boulevard',
    },
  };

  /** Named places. The city generator builds these on the listed blocks. */
  VH.Data.landmarks = [
    { id: 'civic_plaza', name: 'Civic Plaza', block: [3, 4], kind: 'plaza' },
    { id: 'meridian_yard', name: 'Meridian Yard', block: [2, 4], kind: 'construction' },
    { id: 'founders_park', name: 'Founders Park', block: [1, 5], kind: 'park' },
    { id: 'vicehaven_tower', name: 'Vicehaven Tower', block: [4, 2], kind: 'tower' },
    { id: 'oceanview_pier', name: 'Oceanview Pier', kind: 'pier', x: 420, z: 0 },
    // The big places outside the old grid get a badge on the map and a "go"
    // point the GPS can reach by road (major: true; gx, gz).
    { id: 'northgate_heights', name: 'Northgate Heights', kind: 'skyline', x: 100, z: -520, major: true, short: 'Skyscrapers', gx: 22, gz: -498 },
    { id: 'vicehaven_international', name: 'Vicehaven International', kind: 'airport', x: -255, z: -1222, major: true, short: 'Airport', gx: -255, gz: -1190 },
    { id: 'fort_breakwater', name: 'Fort Breakwater', kind: 'fort', x: -1300, z: 0, major: true, short: 'Army base', gx: -1092, gz: 0 },
  ];

  // ===================================================================
  // VICEHAVEN 3.0: the bigger city. Twelve new districts round the old
  // city and on Isla Paloma across the bay. Everything below is strictly
  // additive: the old districts, roads and blocks above stay exactly as
  // they were. citygen.js turns this into roads, blocks (layout.blocks3)
  // and lots; docs/WORLD.md is the plan as built.
  // ===================================================================
  const NEW_DISTRICTS = [
    {
      id: 'sandpiper', name: 'Sandpiper Beach', tagline: 'Surf, sun and sandy floor mats',
      rect: { minX: 13, maxX: 470, minZ: 641, maxZ: 1190 },
      lot: { min: 18, max: 30 }, alleyChance: 0.15, emptyLotChance: 0.12,
      archetypes: [
        { type: 'lowrise', weight: 5, floors: [1, 2] },
        { type: 'shophouse', weight: 3, floors: [1, 2] },
        { type: 'hotel', weight: 1, floors: [4, 7] },
        { type: 'apartment', weight: 1, floors: [3, 5] },
      ],
      palette: {
        walls: [0xf7c6c7, 0xa8e0d8, 0xf9e2a6, 0xc9d8f5, 0xffd3b0, 0xb9ead6, 0xe9c9f0, 0xfff1d6],
        roofs: [0x8a8f94, 0x9a9da0, 0xc9b79c],
        accents: [0xffffff, 0x1f8a8a, 0xff6f91, 0xf0a030, 0x2a7de1],
      },
      trees: { type: 'palmTall', spacing: 22, chance: 0.9 },
      ambient: { crowd: 'tourist', traffic: 'medium', peds: 1.1, cars: 0.8 },
    },
    {
      id: 'vistaverde', name: 'Vista Verde', tagline: 'Lawns, lunchboxes and a mall',
      rect: { minX: -640, maxX: 12.99, minZ: 641, maxZ: 1190 },
      lot: { min: 22, max: 32 }, alleyChance: 0, emptyLotChance: 0.03,
      archetypes: [
        { type: 'house', weight: 12, floors: [1, 1] },
        { type: 'villa', weight: 2, floors: [2, 2] },
        { type: 'apartment', weight: 1, floors: [2, 3] },
      ],
      palette: {
        walls: [0xf2e6d0, 0xe6efe9, 0xf1e3b3, 0xd9e8f0, 0xcfe3d4, 0xe8d6c0, 0xd4dbe4, 0xf4d9c6],
        roofs: [0x7a6a5a, 0x5c5f63, 0xa4553c, 0x6b5848, 0x4f5a66],
        accents: [0xffffff, 0x2f7f86, 0xd8795e, 0x3d6b8f],
      },
      trees: { type: 'tree', spacing: 16, chance: 0.9 },
      ambient: { crowd: 'residential', traffic: 'light', peds: 0.7, cars: 0.6 },
    },
    {
      id: 'ironside', name: 'Ironside', tagline: 'Smoke, steel and the night shift',
      rect: { minX: -640, maxX: 0, minZ: 1190.01, maxZ: 1800 },
      lot: { min: 34, max: 64 }, alleyChance: 0, emptyLotChance: 0.25,
      archetypes: [
        { type: 'shed', weight: 8, floors: [1, 2] },
        { type: 'office', weight: 1, floors: [2, 3] },
      ],
      palette: {
        walls: [0x8a8f96, 0x9a968e, 0xa8a39a, 0x7d838a, 0xb8b6b0, 0x6e7378, 0x8f7a64],
        roofs: [0x5a5f66, 0x5d6168, 0x4a4d50],
        accents: [0xe06a1a, 0xd8c070, 0x2b4a6b, 0xb03a2e],
      },
      trees: { type: 'treeB', spacing: 40, chance: 0.5 },
      ambient: { crowd: 'industrial', traffic: 'industrial', peds: 0.35, cars: 0.7 },
    },
    {
      id: 'thebowl', name: 'The Bowl', tagline: 'Game day, every day',
      rect: { minX: 0.01, maxX: 470, minZ: 1190.01, maxZ: 1800 },
      lot: { min: 28, max: 44 }, alleyChance: 0, emptyLotChance: 0.35,
      archetypes: [
        { type: 'shophouse', weight: 3, floors: [1, 2] },
        { type: 'lowrise', weight: 2, floors: [1, 2] },
        { type: 'shed', weight: 1, floors: [2, 3] },
      ],
      palette: {
        walls: [0xdfe3e6, 0xc9d8f5, 0xf5f0e6, 0xb9c4cc, 0xe8d6c0, 0x2a5d8f],
        roofs: [0x777777, 0x8a8f94],
        accents: [0x1f5fa8, 0xf2b01e, 0xffffff, 0xd93b48],
      },
      trees: { type: 'palm', spacing: 30, chance: 0.8 },
      ambient: { crowd: 'tourist', traffic: 'medium', peds: 0.6, cars: 0.8 },
    },
    {
      id: 'sunreel', name: 'Sunreel Studios', tagline: 'Quiet on set',
      rect: { minX: -1080, maxX: -640.01, minZ: 55.01, maxZ: 680 },
      lot: { min: 34, max: 60 }, alleyChance: 0, emptyLotChance: 0.18,
      archetypes: [
        { type: 'shed', weight: 6, floors: [2, 3] },
        { type: 'office', weight: 2, floors: [2, 4] },
        { type: 'lowrise', weight: 1, floors: [1, 2] },
      ],
      palette: {
        walls: [0xe9e4da, 0xd8cdb8, 0xf2efe8, 0xc9b79c, 0xb9c4cc, 0xe6d4a6],
        roofs: [0x777777, 0x8a8f94, 0x6b6e72],
        accents: [0xc9a227, 0x7a2f2a, 0x2d3440, 0xffffff],
      },
      trees: { type: 'palm', spacing: 26, chance: 0.8 },
      ambient: { crowd: 'business', traffic: 'light', peds: 0.5, cars: 0.5 },
    },
    {
      id: 'cindercreek', name: 'Cinder Creek', tagline: 'Last stop for gas, films and storage',
      rect: { minX: -1080, maxX: -640.01, minZ: -700, maxZ: -55.01 },
      lot: { min: 28, max: 50 }, alleyChance: 0, emptyLotChance: 0.3,
      archetypes: [
        { type: 'shed', weight: 4, floors: [1, 1] },
        { type: 'lowrise', weight: 3, floors: [1, 1] },
        { type: 'shophouse', weight: 2, floors: [1, 1] },
      ],
      palette: {
        walls: [0xc9b79c, 0xb8a58a, 0xd8cdb8, 0x9a968e, 0xe6d4a6, 0xa8b0a0],
        roofs: [0x5a5f66, 0x6b5848, 0x7a6a5a],
        accents: [0xe06a1a, 0xc9a227, 0x7a2f2a, 0x2b4a6b],
      },
      trees: { type: 'treeB', spacing: 36, chance: 0.6 },
      ambient: { crowd: 'light', traffic: 'light', peds: 0.35, cars: 0.5 },
    },
    {
      id: 'halcyon', name: 'Halcyon University', tagline: 'Knowledge, coffee and parking permits',
      rect: { minX: -640, maxX: -80, minZ: -1100, maxZ: -670 },
      lot: { min: 30, max: 48 }, alleyChance: 0, emptyLotChance: 0.08,
      archetypes: [
        { type: 'office', weight: 5, floors: [3, 5] },
        { type: 'apartment', weight: 3, floors: [4, 6] },
        { type: 'shophouse', weight: 2, floors: [2, 3] },
      ],
      palette: {
        walls: [0x8a4b3a, 0x9c5a44, 0xa8704f, 0xb88a62, 0xc49a74, 0xd8cdb8, 0x7a3f33],
        roofs: [0x4f4a45, 0x5a524a, 0x3f4a3f],
        accents: [0xe7dcc8, 0x2f5d50, 0x7a2f2a, 0xc9a227],
      },
      trees: { type: 'tree', spacing: 18, chance: 0.95 },
      ambient: { crowd: 'market', traffic: 'light', peds: 1.0, cars: 0.6 },
    },
    {
      id: 'coralmarina', name: 'Coral Marina', tagline: 'Boats you can\'t afford, views you can',
      rect: { minX: 60.01, maxX: 470, minZ: -1100, maxZ: -661 },
      lot: { min: 26, max: 40 }, alleyChance: 0, emptyLotChance: 0.1,
      archetypes: [
        { type: 'apartment', weight: 5, floors: [6, 14] },
        { type: 'hotel', weight: 2, floors: [8, 14] },
        { type: 'shophouse', weight: 2, floors: [1, 2] },
      ],
      palette: {
        walls: [0xf5f0e6, 0xe6efe9, 0xd9e8f0, 0xf2e6d0, 0xc9d8f5, 0xffffff],
        roofs: [0x8a8f94, 0x9a9da0],
        accents: [0x1f5fa8, 0xffffff, 0x1f8a8a, 0xc9a227],
      },
      trees: { type: 'palmTall', spacing: 20, chance: 0.9 },
      ambient: { crowd: 'tourist', traffic: 'light', peds: 0.8, cars: 0.6 },
    },
    // Isla Paloma, across the bay.
    {
      id: 'neonstrand', name: 'Neon Strand', tagline: 'The lights never sleep, and neither do you',
      rect: { minX: 700, maxX: 1300, minZ: -288, maxZ: 180 },
      lot: { min: 30, max: 46 }, alleyChance: 0.2, emptyLotChance: 0.1,
      archetypes: [
        { type: 'hotel', weight: 6, floors: [10, 24] },
        { type: 'shophouse', weight: 2, floors: [1, 3] },
        { type: 'lowrise', weight: 1, floors: [2, 2] },
      ],
      palette: {
        walls: [0xf7c6c7, 0xa8e0d8, 0xe9c9f0, 0xc9d8f5, 0xffd3b0, 0xf5f0e6, 0xb9ead6, 0x2d3440],
        roofs: [0x8a8f94, 0x6b6e72],
        accents: [0xff6f91, 0x16a3a3, 0x8a3fd1, 0xf0a030, 0xffffff],
      },
      trees: { type: 'palmTall', spacing: 16, chance: 0.95 },
      ambient: { crowd: 'tourist', traffic: 'heavy', peds: 1.2, cars: 1.0 },
    },
    {
      id: 'oldpaloma', name: 'Old Paloma', tagline: 'Bells, boats and cobbles',
      rect: { minX: 700, maxX: 1300, minZ: 180.01, maxZ: 900 },
      lot: { min: 14, max: 24 }, alleyChance: 0.6, emptyLotChance: 0.06,
      archetypes: [
        { type: 'shophouse', weight: 6, floors: [2, 4] },
        { type: 'apartment', weight: 2, floors: [3, 4] },
      ],
      palette: {
        walls: [0xf2e6d0, 0xf1e3b3, 0xe8c9a0, 0xd8795e, 0xf4d9c6, 0xe6efe9, 0xc9a26a, 0xb8d4c8],
        roofs: [0xa4553c, 0x9a4e37, 0xb86446],
        accents: [0xffffff, 0x2f7f86, 0x3d6b8f, 0xc9a227],
      },
      trees: { type: 'palm', spacing: 26, chance: 0.6 },
      ambient: { crowd: 'market', traffic: 'light', peds: 1.0, cars: 0.5 },
    },
    {
      id: 'palomaheights', name: 'Paloma Heights', tagline: 'Behind the walls, the view',
      rect: { minX: 700, maxX: 1300, minZ: -700, maxZ: -288.01 },
      lot: { min: 34, max: 52 }, alleyChance: 0, emptyLotChance: 0.04,
      archetypes: [
        { type: 'villa', weight: 6, floors: [2, 2] },
        { type: 'house', weight: 1, floors: [1, 1] },
      ],
      palette: {
        walls: [0xf4f1ea, 0xf2e6d0, 0xe6efe9, 0xffffff, 0xe8e0d0, 0xd9e8f0],
        roofs: [0xa4553c, 0x7a6a5a, 0x5c5f63],
        accents: [0x2f7f86, 0xffffff, 0xc9a227],
      },
      trees: { type: 'palm', spacing: 18, chance: 0.95 },
      ambient: { crowd: 'residential', traffic: 'light', peds: 0.4, cars: 0.5 },
    },
    {
      id: 'palomafield', name: 'Paloma Field', tagline: 'Short runway, long lunches',
      rect: { minX: 1300.01, maxX: 1700, minZ: -700, maxZ: 900 },
      lot: { min: 0, max: 0 }, alleyChance: 0, emptyLotChance: 1,
      archetypes: [],
      palette: { walls: [0xdfe3e6], roofs: [0x777777], accents: [0x1fa3a3] },
      trees: { type: 'palm', spacing: 40, chance: 0.5 },
      ambient: { crowd: 'none', traffic: 'light', peds: 0.2, cars: 0.3 },
    },
  ];
  for (const d of NEW_DISTRICTS) d.v3 = true;
  // Before the catch-all outskirts and bay (districtAt takes the first match).
  {
    const list = VH.Data.districts;
    const at = list.findIndex((d) => d.id === 'outskirts');
    list.splice(at, 0, ...NEW_DISTRICTS);
  }

  /**
   * The new roads (layout.roads, flagged v3). Avenues run north-south (axis
   * 'z', coord = x), streets east-west (axis 'x', coord = z). Every road
   * starts and ends on another road, so there are no dead ends.
   * spans: other names along stretches of the road ([from, to, name]).
   * Old roads that now run further (Grand, Pelican, Coral, Seawall Drive,
   * Anchor and Heron Streets) are extended in citygen.js.
   */
  VH.Data.roads3 = [
    // The western bypass and the southern highway: the long way round, fast.
    { id: 'westgate', axis: 'z', coord: -636, from: -1070, to: 1760, width: 22, median: 2, name: 'Westgate Parkway' },
    { id: 'southcoast', axis: 'x', coord: 1760, from: -636, to: 330, width: 22, median: 2, name: 'South Coast Highway' },
    { id: 'sandpiper_dr', axis: 'z', coord: 330, from: 660, to: 1760, width: 18, median: 3, name: 'Sandpiper Drive' },
    // The south: Vista Verde, Sandpiper Beach, Ironside, The Bowl.
    { id: 'southbay_rd', axis: 'x', coord: 660, from: -1050, to: 330, width: 18, median: 3, name: 'Southbay Road' },
    { id: 'seabreeze', axis: 'x', coord: 790, from: -636, to: 980, width: 14, name: 'Seabreeze Street', spans: [[424, 780, 'Southbay Causeway']] },
    { id: 'dune_st', axis: 'x', coord: 920, from: -636, to: 330, width: 14, name: 'Dune Street' },
    { id: 'orchard_st', axis: 'x', coord: 1050, from: -636, to: 330, width: 14, name: 'Orchard Street' },
    { id: 'mariner_way', axis: 'x', coord: 1190, from: -636, to: 330, width: 18, median: 3, name: 'Mariner Way' },
    { id: 'foundry_rd', axis: 'x', coord: 1470, from: -636, to: 330, width: 14, name: 'Foundry Road' },
    { id: 'linden_ave', axis: 'z', coord: -480, from: 660, to: 1190, width: 14, name: 'Linden Avenue' },
    { id: 'birchwood', axis: 'z', coord: -320, from: 660, to: 1760, width: 14, name: 'Birchwood Avenue', spans: [[1190, 1760, 'Smelter Avenue']] },
    { id: 'hollyhock', axis: 'z', coord: -160, from: 660, to: 1190, width: 14, name: 'Hollyhock Avenue' },
    { id: 'surfrider', axis: 'z', coord: 160, from: 660, to: 1190, width: 14, name: 'Surfrider Avenue' },
    // The west: Sunreel Studios and Cinder Creek.
    { id: 'studio_rd', axis: 'x', coord: 200, from: -1050, to: -636, width: 14, name: 'Studio Road' },
    { id: 'klieg_st', axis: 'x', coord: 440, from: -1050, to: -636, width: 14, name: 'Klieg Street' },
    { id: 'backlot_ave', axis: 'z', coord: -1050, from: 200, to: 660, width: 14, name: 'Backlot Avenue' },
    { id: 'premiere_ave', axis: 'z', coord: -850, from: 200, to: 660, width: 14, name: 'Premiere Avenue' },
    { id: 'cinder_rd', axis: 'x', coord: -660, from: -1050, to: -636, width: 14, name: 'Cinder Road' },
    { id: 'starview_rd', axis: 'x', coord: -440, from: -1050, to: -636, width: 14, name: 'Starview Road' },
    { id: 'haulers_rd', axis: 'x', coord: -200, from: -1050, to: -636, width: 14, name: 'Haulers Road' },
    { id: 'dustbowl_ln', axis: 'z', coord: -1050, from: -660, to: -200, width: 14, name: 'Dustbowl Lane' },
    { id: 'juniper_ave', axis: 'z', coord: -850, from: -660, to: -200, width: 14, name: 'Juniper Avenue' },
    // The north: Halcyon University and Coral Marina.
    { id: 'college_rd', axis: 'x', coord: -1070, from: -636, to: -96, width: 14, name: 'College Road' },
    { id: 'varsity_rd', axis: 'x', coord: -760, from: -636, to: -96, width: 14, name: 'Varsity Road' },
    { id: 'chancellor', axis: 'z', coord: -360, from: -1070, to: -760, width: 14, name: 'Chancellor Avenue' },
    { id: 'marina_blvd', axis: 'x', coord: -750, from: 0, to: 384, width: 16, name: 'Marina Boulevard' },
    { id: 'lighthouse_rd', axis: 'x', coord: -1070, from: 288, to: 384, width: 14, name: 'Lighthouse Road' },
    // Isla Paloma. Anchor Street crosses the Paloma Bridge to Bayfront Drive.
    { id: 'mirador_rd', axis: 'x', coord: -470, from: 800, to: 1300, width: 14, name: 'Mirador Road' },
    { id: 'strand', axis: 'x', coord: -60, from: 800, to: 1300, width: 18, median: 3, name: 'The Strand' },
    { id: 'mission_st', axis: 'x', coord: 180, from: 800, to: 1300, width: 14, name: 'Mission Street' },
    { id: 'harbour_st', axis: 'x', coord: 420, from: 800, to: 1300, width: 14, name: 'Harbour Street' },
    { id: 'bayfront', axis: 'z', coord: 800, from: -470, to: 420, width: 14, name: 'Bayfront Drive' },
    { id: 'paloma_way', axis: 'z', coord: 980, from: -470, to: 790, width: 14, name: 'Paloma Way' },
    { id: 'lantana_ave', axis: 'z', coord: 1160, from: -470, to: 420, width: 14, name: 'Lantana Avenue' },
    { id: 'airfield_rd', axis: 'z', coord: 1300, from: -470, to: 420, width: 14, name: 'Airfield Road' },
  ];

  /**
   * Isla Paloma's land (y = 0 inside, the bay outside), the bridges onto it,
   * and the stretch of water each crosses.
   */
  VH.Data.island = {
    name: 'Isla Paloma',
    land: [
      { minX: 780, maxX: 1520, minZ: -580, maxZ: 580 },
      { minX: 780, maxX: 1160, minZ: 580, maxZ: 840 }, // the old town's spur, down to the fort
    ],
    bridges: [
      { id: 'paloma_bridge', name: 'Paloma Bridge', axis: 'x', coord: -288, from: 424, to: 780, width: 14, towers: [530, 674] },
      { id: 'southbay_causeway', name: 'Southbay Causeway', axis: 'x', coord: 790, from: 424, to: 780, width: 14, towers: [] },
    ],
  };

  /**
   * The new blocks, as cells between road (or shore) lines: [x0, x1, z0, z1].
   * An edge on a road line is kerbed back to the road's edge; any other edge
   * (the shore, open ground) is pulled in 3 m. `plot` reserves the whole
   * block for a landmark (no generic lots; a district builder builds it).
   * `kind` 'park' makes a lawn with trees.
   */
  VH.Data.cells3 = [
    // Vista Verde: 4 x 4 blocks of houses, the mall by Grand Avenue, the school.
    ...[[-636, -480], [-480, -320], [-320, -160], [-160, 0]].flatMap(([x0, x1]) => [[660, 790], [790, 920], [920, 1050], [1050, 1190]].map(([z0, z1]) => {
      const c = { d: 'vistaverde', r: [x0, x1, z0, z1] };
      if (x0 === -160 && z0 === 660) c.plot = 'verde_mall';
      if (x0 === -480 && z0 === 920) c.plot = 'vista_verde_school';
      if (x0 === -320 && z0 === 920) c.kind = 'park';
      return c;
    })),
    // Sandpiper Beach: two columns of blocks, then the beach east of Sandpiper Drive.
    ...[[0, 160], [160, 330]].flatMap(([x0, x1]) => [[660, 790], [790, 920], [920, 1050], [1050, 1190]].map(([z0, z1]) => {
      const c = { d: 'sandpiper', r: [x0, x1, z0, z1] };
      if (x0 === 160 && z0 === 920) c.plot = 'skate_park';
      return c;
    })),
    { d: 'sandpiper', r: [330, 424, 660, 790] },
    { d: 'sandpiper', r: [330, 424, 790, 1190], plot: 'sandpiper_beach' },
    // Ironside and The Bowl.
    { d: 'ironside', r: [-636, -320, 1190, 1470], plot: 'ironside_railyard' },
    { d: 'ironside', r: [-320, 0, 1190, 1470] },
    { d: 'ironside', r: [-636, -320, 1470, 1760], plot: 'ironside_scrapyard' },
    { d: 'ironside', r: [-320, 0, 1470, 1760], plot: 'ironside_power' },
    { d: 'thebowl', r: [0, 330, 1190, 1470], plot: 'mariner_stadium' },
    { d: 'thebowl', r: [0, 330, 1470, 1760], plot: 'southbay_speedway' },
    { d: 'thebowl', r: [330, 424, 1190, 1470], plot: 'expo_hall' },
    { d: 'thebowl', r: [330, 424, 1470, 1760] },
    // Sunreel Studios.
    { d: 'sunreel', r: [-1050, -850, 60, 200] },
    { d: 'sunreel', r: [-850, -636, 60, 200] },
    { d: 'sunreel', r: [-1050, -850, 200, 440], plot: 'sunreel_backlot' },
    { d: 'sunreel', r: [-850, -636, 200, 440], plot: 'sunreel_gate' },
    { d: 'sunreel', r: [-1050, -850, 440, 660], plot: 'sunreel_western_set' },
    { d: 'sunreel', r: [-850, -636, 440, 660] },
    // Cinder Creek.
    { d: 'cindercreek', r: [-1050, -850, -660, -440], plot: 'starview_drivein' },
    { d: 'cindercreek', r: [-850, -636, -660, -440] },
    { d: 'cindercreek', r: [-1050, -850, -440, -200], plot: 'cinder_storage' },
    { d: 'cindercreek', r: [-850, -636, -440, -200], plot: 'cinder_truckstop' },
    { d: 'cindercreek', r: [-1050, -850, -200, -60] },
    { d: 'cindercreek', r: [-850, -636, -200, -60] },
    // Halcyon University.
    { d: 'halcyon', r: [-636, -360, -1070, -760], plot: 'halcyon_library' },
    { d: 'halcyon', r: [-360, -96, -1070, -760], plot: 'halcyon_quad' },
    { d: 'halcyon', r: [-636, -360, -760, -680] },
    { d: 'halcyon', r: [-360, -96, -760, -680] },
    // Coral Marina (the stunt ramps' field, x 30..185, z -840..-765, stays open ground).
    { d: 'coralmarina', r: [60, 288, -1070, -850] },
    { d: 'coralmarina', r: [200, 288, -850, -750] },
    { d: 'coralmarina', r: [288, 384, -1070, -750], plot: 'yacht_club' },
    { d: 'coralmarina', r: [384, 424, -1070, -750], plot: 'coral_marina' },
    { d: 'coralmarina', r: [60, 288, -750, -664] },
    { d: 'coralmarina', r: [288, 384, -750, -664] },
    // Isla Paloma: Paloma Heights, Neon Strand, Old Paloma, Paloma Field.
    { d: 'palomaheights', r: [780, 980, -580, -470] },
    { d: 'palomaheights', r: [980, 1160, -580, -470] },
    { d: 'palomaheights', r: [1160, 1300, -580, -470] },
    { d: 'palomaheights', r: [800, 980, -470, -288], plot: 'paloma_estate' },
    { d: 'palomaheights', r: [980, 1160, -470, -288], plot: 'paloma_gardens' },
    { d: 'palomaheights', r: [1160, 1300, -470, -288], plot: 'paloma_observatory' },
    { d: 'neonstrand', r: [800, 980, -288, -60] },
    { d: 'neonstrand', r: [980, 1160, -288, -60], plot: 'paloma_convention' },
    { d: 'neonstrand', r: [1160, 1300, -288, -60] },
    { d: 'neonstrand', r: [800, 980, -60, 180], plot: 'wonder_wharf' },
    { d: 'neonstrand', r: [980, 1160, -60, 180] },
    { d: 'neonstrand', r: [1160, 1300, -60, 180] },
    { d: 'oldpaloma', r: [800, 980, 180, 420] },
    { d: 'oldpaloma', r: [980, 1160, 180, 420], plot: 'paloma_plaza' },
    { d: 'oldpaloma', r: [1160, 1300, 180, 420] },
    { d: 'oldpaloma', r: [780, 980, 420, 580] },
    { d: 'oldpaloma', r: [1160, 1300, 420, 580] },
    { d: 'oldpaloma', r: [780, 980, 580, 790], plot: 'paloma_harbour' },
    { d: 'oldpaloma', r: [780, 980, 790, 840] },
    { d: 'oldpaloma', r: [980, 1160, 420, 840], plot: 'paloma_fort' },
    { d: 'palomafield', r: [1300, 1520, -580, 580], plot: 'paloma_field' },
  ];

  /**
   * The named places of the new districts (built-in story places, map
   * badges). `plot` places sit on their reserved block; x, z is the spot a
   * scene plays at, gx, gz a point on the road the GPS drives to.
   * District builders replace the placeholder on each plot.
   */
  VH.Data.landmarks3 = [
    { id: 'sandpiper_beach', name: 'Sandpiper Beach', district: 'sandpiper', plot: 'sandpiper_beach', kind: 'beach', major: true, short: 'Beach' },
    { id: 'sandpiper_promenade', name: 'Sandpiper Promenade', district: 'sandpiper', kind: 'boardwalk', x: 346, z: 980, gx: 330, gz: 980 },
    { id: 'skate_park', name: 'Sandpiper Skate Park', district: 'sandpiper', plot: 'skate_park', kind: 'park' },
    { id: 'verde_mall', name: 'Verde Mall', district: 'vistaverde', plot: 'verde_mall', kind: 'mall', major: true, short: 'Mall' },
    { id: 'vista_verde_school', name: 'Vista Verde School', district: 'vistaverde', plot: 'vista_verde_school', kind: 'school' },
    { id: 'ironside_scrapyard', name: 'Ironside Scrapyard', district: 'ironside', plot: 'ironside_scrapyard', kind: 'scrapyard' },
    { id: 'ironside_power', name: 'Ironside Power Station', district: 'ironside', plot: 'ironside_power', kind: 'power', major: true, short: 'Power station' },
    { id: 'ironside_railyard', name: 'Ironside Rail Yard', district: 'ironside', plot: 'ironside_railyard', kind: 'railyard' },
    { id: 'mariner_stadium', name: 'Mariner Stadium', district: 'thebowl', plot: 'mariner_stadium', kind: 'stadium', major: true, short: 'Stadium' },
    { id: 'southbay_speedway', name: 'Southbay Speedway', district: 'thebowl', plot: 'southbay_speedway', kind: 'speedway', major: true, short: 'Speedway' },
    { id: 'expo_hall', name: 'Southbay Expo Hall', district: 'thebowl', plot: 'expo_hall', kind: 'hall' },
    { id: 'sunreel_gate', name: 'Sunreel Studios Gate', district: 'sunreel', plot: 'sunreel_gate', kind: 'gate', major: true, short: 'Film studio' },
    { id: 'sunreel_backlot', name: 'Sunreel Backlot', district: 'sunreel', plot: 'sunreel_backlot', kind: 'backlot' },
    { id: 'sunreel_western_set', name: 'The Western Set', district: 'sunreel', plot: 'sunreel_western_set', kind: 'set' },
    { id: 'starview_drivein', name: 'Starview Drive-In', district: 'cindercreek', plot: 'starview_drivein', kind: 'cinema', major: true, short: 'Drive-in' },
    { id: 'cinder_truckstop', name: 'Cinder Creek Truck Stop', district: 'cindercreek', plot: 'cinder_truckstop', kind: 'truckstop' },
    { id: 'cinder_storage', name: 'Cinder Creek Self Storage', district: 'cindercreek', plot: 'cinder_storage', kind: 'storage' },
    { id: 'halcyon_clocktower', name: 'Halcyon Clock Tower', district: 'halcyon', kind: 'tower', x: -228, z: -915, gx: -228, gz: -1070 },
    { id: 'halcyon_quad', name: 'The Quad', district: 'halcyon', plot: 'halcyon_quad', kind: 'quad', major: true, short: 'University' },
    { id: 'halcyon_library', name: 'Halcyon Library', district: 'halcyon', plot: 'halcyon_library', kind: 'library' },
    { id: 'coral_marina', name: 'Coral Marina', district: 'coralmarina', plot: 'coral_marina', kind: 'marina', major: true, short: 'Marina' },
    // The lighthouse stands on a breakwater out in the bay (water: the rectangle reserved for it); its place is at the shore end until the builder moves it out there.
    { id: 'marina_lighthouse', name: 'Marina Lighthouse', district: 'coralmarina', kind: 'lighthouse', x: 400, z: -1064, gx: 384, gz: -1070, water: [430, 600, -1092, -1048] },
    { id: 'yacht_club', name: 'Coral Yacht Club', district: 'coralmarina', plot: 'yacht_club', kind: 'club' },
    { id: 'wonder_wharf', name: 'Wonder Wharf', district: 'neonstrand', plot: 'wonder_wharf', kind: 'funfair', major: true, short: 'Funfair' },
    { id: 'neon_strand', name: 'The Neon Strand', district: 'neonstrand', kind: 'street', x: 1070, z: -48, gx: 1070, gz: -60 },
    { id: 'paloma_convention', name: 'Paloma Convention Centre', district: 'neonstrand', plot: 'paloma_convention', kind: 'hall' },
    { id: 'paloma_plaza', name: 'Plaza Paloma', district: 'oldpaloma', plot: 'paloma_plaza', kind: 'plaza' },
    { id: 'paloma_harbour', name: 'Paloma Harbour', district: 'oldpaloma', plot: 'paloma_harbour', kind: 'harbour' },
    { id: 'paloma_fort', name: 'Fort San Paloma', district: 'oldpaloma', plot: 'paloma_fort', kind: 'fort', major: true, short: 'Old fort' },
    { id: 'paloma_gardens', name: 'Paloma Botanical Gardens', district: 'palomaheights', plot: 'paloma_gardens', kind: 'park' },
    { id: 'paloma_observatory', name: 'Paloma Observatory', district: 'palomaheights', plot: 'paloma_observatory', kind: 'observatory' },
    { id: 'paloma_estate', name: 'The Paloma Estate', district: 'palomaheights', plot: 'paloma_estate', kind: 'mansion' },
    { id: 'paloma_field', name: 'Paloma Field', district: 'palomafield', plot: 'paloma_field', kind: 'airfield', major: true, short: 'Airfield' },
  ];
  // ===================================================================
  // VICEHAVEN 4.0: no empty spaces. Six more districts fill the countryside
  // round the city and the gaps between the old districts, and Paloma Cove
  // stands on a new islet south of Isla Paloma. Strictly additive again:
  // everything above stays exactly as it was. citygen.js builds the blocks
  // after the 3.0 ones (ids f_<district>_<n>, RNG 'vicehaven-4'); the
  // districts are flagged v3 too, so everything that knows about the new
  // districts (traffic, crowds, places, the maps) treats them alike.
  // ambient.mix is the traffic there ([vehicle type, weight]; a type that
  // doesn't exist yet, a bus or a tractor, is skipped until it does).
  // docs/WORLD.md has the plan as built.
  // ===================================================================
  const FILL_DISTRICTS = [
    {
      id: 'haverly', name: 'Haverly Farms', tagline: 'Fresh eggs, honesty box',
      // North of the airport, and the farmland west of it.
      rect: { minX: -1600, maxX: 470, minZ: -1800, maxZ: -1600.01 },
      rects: [{ minX: -1600, maxX: 470, minZ: -1800, maxZ: -1600.01 }, { minX: -1600, maxX: -1110.01, minZ: -1600, maxZ: -1180 }],
      lot: { min: 34, max: 60 }, alleyChance: 0, emptyLotChance: 0.3,
      archetypes: [
        { type: 'farmhouse', weight: 3, floors: [1, 2] },
        { type: 'barn', weight: 4, floors: [1, 1] },
        { type: 'silo', weight: 2, floors: [1, 1] },
      ],
      palette: {
        walls: [0xf2ead8, 0xe8dcc0, 0xa8432f, 0x9b3b2b, 0xd9cdb0, 0xb85a3c, 0xeee4cc],
        roofs: [0x5c5f63, 0x7a6a5a, 0x4f5a66, 0x8a8f94],
        accents: [0xffffff, 0x2f5d50, 0x7a2f2a, 0xe0b12e],
      },
      trees: { type: 'tree', spacing: 34, chance: 0.6 },
      ambient: { crowd: 'light', traffic: 'light', peds: 0.15, cars: 0.3, mix: [['mesa', 10], ['porter', 10], ['hauler', 8], ['beater', 8], ['scout', 6], ['halcyon', 8], ['pipit', 6], ['tractor', 12]] },
    },
    {
      id: 'gateway', name: 'Gateway Park', tagline: 'Cargo, car hire and a very long walk to the terminal',
      // The airport's back yard: west of Halcyon and Cinder Creek, north of the fort.
      rect: { minX: -1600, maxX: -640.01, minZ: -1180, maxZ: -700.01 },
      rects: [{ minX: -1600, maxX: -640.01, minZ: -1180, maxZ: -700.01 }, { minX: -1600, maxX: -1080.01, minZ: -700, maxZ: -430.01 }],
      lot: { min: 34, max: 60 }, alleyChance: 0, emptyLotChance: 0.3,
      archetypes: [
        { type: 'warehouse', weight: 5, floors: [1, 2] },
        { type: 'depot', weight: 3, floors: [1, 1] },
        { type: 'shed', weight: 2, floors: [1, 2] },
        { type: 'lowrise', weight: 1, floors: [1, 2] },
      ],
      palette: {
        walls: [0xb8bcc2, 0x9aa3ad, 0xd8d4cc, 0x7d838a, 0xc9c2b2, 0x8f979f, 0xe4e0d8],
        roofs: [0x5a5f66, 0x6b6e72, 0x4a4d50],
        accents: [0x1fa3a3, 0xe06a1a, 0x2b4a6b, 0xd8c070, 0xb03a2e],
      },
      trees: { type: 'treeB', spacing: 36, chance: 0.6 },
      ambient: { crowd: 'industrial', traffic: 'industrial', peds: 0.4, cars: 0.9, mix: [['hauler', 14], ['porter', 14], ['cab', 12], ['halcyon', 16], ['pipit', 8], ['mesa', 6], ['tern', 6], ['bus', 6]] },
    },
    {
      id: 'lantern', name: 'Lantern Heights', tagline: 'Corner shops, conkers and a lake with ducks',
      // Between Halcyon University and the old city's north edge.
      rect: { minX: -640, maxX: -96, minZ: -680, maxZ: -392.01 },
      rects: [{ minX: -640, maxX: -96, minZ: -680, maxZ: -392.01 }, { minX: -80, maxX: -60.01, minZ: -1100, maxZ: -655.01 }], // and the terraces along Coral Avenue
      lot: { min: 12, max: 22 }, alleyChance: 0.5, emptyLotChance: 0.05,
      archetypes: [
        { type: 'terrace', weight: 6, floors: [2, 3] },
        { type: 'apartment', weight: 3, floors: [4, 5] },
        { type: 'shophouse', weight: 3, floors: [2, 3] },
      ],
      palette: {
        walls: [0x8a4b3a, 0xb88a62, 0xd9c8a8, 0x9c5a44, 0xe8dcc8, 0x7a5a48, 0xc49a74, 0xd4dbe4],
        roofs: [0x4f4a45, 0x5a524a, 0x3f3b38, 0x5c5f63],
        accents: [0xe7dcc8, 0x2f5d50, 0x7a2f2a, 0x2b4a6b, 0xc9a227, 0xffffff],
      },
      trees: { type: 'tree', spacing: 16, chance: 0.85 },
      ambient: { crowd: 'residential', traffic: 'medium', peds: 1.2, cars: 0.8, mix: [['halcyon', 22], ['pipit', 18], ['cab', 10], ['tern', 8], ['vireo', 4], ['porter', 6], ['bus', 8]] },
    },
    {
      id: 'southgate', name: 'Southgate', tagline: 'Buses, bargains and the big screen',
      // South of Palm Crescent, west of Saltmarsh Docks, north of Vista Verde.
      rect: { minX: -640, maxX: -12.01, minZ: 392.01, maxZ: 640.99 },
      lot: { min: 20, max: 34 }, alleyChance: 0.3, emptyLotChance: 0.08,
      archetypes: [
        { type: 'apartment', weight: 5, floors: [5, 9] },
        { type: 'shophouse', weight: 3, floors: [2, 4] },
        { type: 'office', weight: 2, floors: [4, 7] },
      ],
      palette: {
        walls: [0xc9b8a0, 0xa8a39a, 0xd8cfc0, 0x8a8f96, 0xe2d6c2, 0x9c5a44, 0xb9bcc1, 0xcdc4b3],
        roofs: [0x5c5f63, 0x6b6e72, 0x4a4d50],
        accents: [0xffffff, 0xd8262e, 0x2a7de1, 0xe0b12e, 0x2f7f86],
      },
      trees: { type: 'treeB', spacing: 22, chance: 0.8 },
      ambient: { crowd: 'market', traffic: 'heavy', peds: 1.3, cars: 1.0, mix: [['halcyon', 20], ['pipit', 14], ['cab', 14], ['porter', 10], ['tern', 8], ['mesa', 6], ['bus', 14]] },
    },
    {
      id: 'redwater', name: 'Redwater', tagline: 'Fairways, ponies and a very slow tractor',
      // The countryside south-west: south of the fort, west of Sunreel, Vista Verde and Ironside.
      rect: { minX: -1600, maxX: -640.01, minZ: 680.01, maxZ: 1800 },
      rects: [{ minX: -1600, maxX: -640.01, minZ: 680.01, maxZ: 1800 }, { minX: -1600, maxX: -1080.01, minZ: 430.01, maxZ: 680 }],
      lot: { min: 26, max: 44 }, alleyChance: 0, emptyLotChance: 0.1,
      archetypes: [
        { type: 'house', weight: 5, floors: [1, 1] },
        { type: 'farmhouse', weight: 3, floors: [1, 2] },
        { type: 'shophouse', weight: 2, floors: [1, 2] },
        { type: 'barn', weight: 1, floors: [1, 1] },
      ],
      palette: {
        walls: [0xf2e6d0, 0xe8dcc0, 0xb85a3c, 0xd9cdb0, 0xcfe3d4, 0xf1e3b3, 0xa8432f],
        roofs: [0x7a6a5a, 0x5c5f63, 0xa4553c, 0x6b5848],
        accents: [0xffffff, 0x2f5d50, 0x7a2f2a, 0x3d6b8f],
      },
      trees: { type: 'tree', spacing: 24, chance: 0.8 },
      ambient: { crowd: 'light', traffic: 'light', peds: 0.3, cars: 0.4, mix: [['mesa', 12], ['scout', 10], ['porter', 8], ['halcyon', 12], ['pipit', 8], ['beater', 6], ['ironclad', 4], ['tractor', 8]] },
    },
    {
      id: 'palomacove', name: 'Paloma Cove', tagline: 'Toll paid, flip-flops on',
      // A new islet south of Isla Paloma, over the Cove Causeway from Sandpiper Drive.
      rect: { minX: 470.01, maxX: 1100, minZ: 1440, maxZ: 1800 },
      lot: { min: 18, max: 30 }, alleyChance: 0, emptyLotChance: 0.25,
      archetypes: [
        { type: 'lowrise', weight: 5, floors: [1, 2] },
        { type: 'shophouse', weight: 3, floors: [1, 2] },
      ],
      palette: {
        walls: [0xf7c6c7, 0xa8e0d8, 0xf9e2a6, 0xc9d8f5, 0xffd3b0, 0xb9ead6, 0xfff1d6],
        roofs: [0x8a8f94, 0x9a9da0, 0xc9b79c],
        accents: [0xffffff, 0x1f8a8a, 0xff6f91, 0xf0a030, 0x2a7de1],
      },
      trees: { type: 'palmTall', spacing: 20, chance: 0.9 },
      ambient: { crowd: 'tourist', traffic: 'light', peds: 0.9, cars: 0.4, mix: [['zephyr', 4], ['drifter', 3], ['pipit', 12], ['halcyon', 12], ['cab', 10], ['mesa', 6], ['tern', 8]] },
    },
  ];
  for (const d of FILL_DISTRICTS) {
    d.v3 = true;
    d.v4 = true;
  }
  {
    const list = VH.Data.districts;
    const at = list.findIndex((d) => d.id === 'outskirts');
    list.splice(at, 0, ...FILL_DISTRICTS);
  }

  /**
   * Archetype sets a 4.0 cell can ask for (cells4 `arch`) instead of its
   * district's own: a farmstead in Redwater, a row of airport hotels.
   * `yard` is what a lot left empty becomes ('dirt' farmyard, else a car park).
   */
  VH.Data.archSets4 = {
    farm: { lot: { min: 34, max: 60 }, emptyLotChance: 0.3, yard: 'dirt', archetypes: [{ type: 'farmhouse', weight: 3, floors: [1, 2] }, { type: 'barn', weight: 4, floors: [1, 1] }, { type: 'silo', weight: 2, floors: [1, 1] }] },
    hotels: { lot: { min: 40, max: 70 }, emptyLotChance: 0.25, archetypes: [{ type: 'hotel', weight: 4, floors: [5, 8] }, { type: 'lowrise', weight: 1, floors: [1, 1] }] },
    carhire: { lot: { min: 30, max: 50 }, emptyLotChance: 0.7, archetypes: [{ type: 'lowrise', weight: 3, floors: [1, 1] }, { type: 'depot', weight: 1, floors: [1, 1] }] },
    trade: { lot: { min: 50, max: 80 }, emptyLotChance: 0.1, archetypes: [{ type: 'bigbox', weight: 3, floors: [1, 1] }, { type: 'warehouse', weight: 2, floors: [1, 2] }] }, // a trade park
  };

  /**
   * The 4.0 roads (layout.roads, flagged v3 and v4). Country lanes are 10-12 m
   * (a lane each way, no parking); town streets 14 m. Every one starts and
   * ends on another road.
   */
  VH.Data.roads4 = [
    // Haverly Farms, and the lanes round the edge of the map.
    { id: 'haverly_ln', axis: 'x', coord: -1700, from: -1588, to: 384, width: 10, name: 'Haverly Lane' },
    { id: 'westfield_rd', axis: 'z', coord: -1588, from: -1700, to: 1760, width: 12, name: 'Westfield Road' },
    { id: 'mill_ln', axis: 'z', coord: -1300, from: -1700, to: -440, width: 12, name: 'Mill Lane' },
    { id: 'thresher_ln', axis: 'x', coord: -1560, from: -1588, to: -1300, width: 10, name: 'Thresher Lane' },
    { id: 'hayrick_ln', axis: 'x', coord: -1320, from: -1588, to: -1300, width: 10, name: 'Hayrick Lane' },
    // Gateway Park.
    { id: 'freight_rd', axis: 'x', coord: -870, from: -1588, to: -636, width: 14, name: 'Freight Road' },
    // Lantern Heights (Cinder Road carries on east as its top street).
    { id: 'school_ln', axis: 'z', coord: -510, from: -660, to: -530, width: 14, name: 'School Lane' },
    { id: 'lamplighter_st', axis: 'x', coord: -530, from: -636, to: -96, width: 14, name: 'Lamplighter Street' },
    // Southgate (Tramway Street stops either side of the market square).
    { id: 'tramway_w', axis: 'x', coord: 520, from: -384, to: -320, width: 14, name: 'Tramway Street' },
    { id: 'tramway_e', axis: 'x', coord: 520, from: -160, to: 0, width: 14, name: 'Tramway Street' },
    // Redwater.
    { id: 'redwater_high', axis: 'z', coord: -1300, from: 440, to: 660, width: 12, name: 'Redwater High Street' },
    { id: 'willow_ln', axis: 'z', coord: -1300, from: 1190, to: 1760, width: 10, name: 'Willow Lane' },
    { id: 'tipper_ln', axis: 'z', coord: -870, from: 1470, to: 1760, width: 14, name: 'Tipper Lane' },
    // Paloma Cove: over the Cove Causeway from Sandpiper Drive, then a loop round the islet.
    { id: 'cove_rd', axis: 'x', coord: 1784, from: 330, to: 940, width: 14, name: 'Cove Road', spans: [[424, 600, 'Cove Causeway']] },
    { id: 'lagoon_rd', axis: 'z', coord: 760, from: 1600, to: 1784, width: 14, name: 'Lagoon Road' },
    { id: 'shell_st', axis: 'x', coord: 1600, from: 760, to: 940, width: 14, name: 'Shell Street' },
    { id: 'dolphin_rd', axis: 'z', coord: 940, from: 1600, to: 1784, width: 14, name: 'Dolphin Road' },
  ];

  /**
   * Older roads that now run on into the 4.0 districts: [road id, new from,
   * new to] (null keeps that end). citygen.js remembers the old ends
   * (v3From / v3To; v2From / v2To for the pre-3.0 roads) so nothing laid out
   * against them moves.
   */
  VH.Data.extend4 = [
    ['ave384', -1700, null], //      Seawall Drive, north past the airport to Haverly Lane
    ['airport_rd', -1588, null], //  Airport Road, west to Westfield Road
    ['college_rd', -1588, null],
    ['cinder_rd', -1588, -96], //    west through Gateway Park, east as Lantern Heights' top street
    ['starview_rd', -1588, null], // along the fort's north fence
    ['dustbowl_ln', -1180, null],
    ['juniper_ave', -1180, null],
    ['ave-384', -660, 660], //       Cypress Parkway, north into Lantern Heights and south through Southgate
    ['ave-288', -660, null], //      Tannery Avenue
    ['ave-192', -660, null], //      Market Avenue
    ['ave-96', null, 520], //        Coral Avenue
    ['birchwood', 384, null], //     Birchwood and Hollyhock Avenues, north through Southgate
    ['hollyhock', 384, null],
    ['klieg_st', -1588, null], //    along the fort's south fence
    ['southbay_rd', -1588, null],
    ['dune_st', -1050, null],
    ['mariner_way', -1588, null],
    ['foundry_rd', -1588, null],
    ['southcoast', -1588, null],
    ['backlot_ave', null, 1760],
    ['sandpiper_dr', null, 1784], // to the Cove Causeway
  ];

  // Paloma Cove's islet (a land rectangle of its own: Isla Paloma's shore is
  // untouched) and its causeway from the mainland.
  VH.Data.island.land.push({ minX: 600, maxX: 1040, minZ: 1480, maxZ: 1796, name: 'Paloma Cove' });
  VH.Data.island.bridges.push({ id: 'cove_causeway', name: 'Cove Causeway', axis: 'x', coord: 1784, from: 424, to: 600, width: 14, towers: [] });

  /**
   * The 4.0 blocks: [x0, x1, z0, z1] between road (or open) lines, as cells3.
   * `kind`: 'fields' (crop strips, no lots), 'park' (a lawn with trees), else
   * buildings; `arch` picks an archetype set from archSets4; `plot` reserves
   * the block for a landmark (the FILL-COUNTRY and FILL-TOWN builders).
   */
  const C4 = (d, r, o) => Object.assign({ d, r }, o || {});
  VH.Data.cells4 = [
    // Haverly Farms: the farm heartland west of the airport, fields and the
    // wind farm north of it. Runway 09's approach (z -1505..-1395, the
    // approach lights at z -1450 from x -1360) stays low: fields and the maze,
    // no trees or lamps (`low`), and the lights stand in an open strip
    // (VH.Data.open4) between the field rows.
    C4('haverly', [-1588, -1300, -1800, -1700], { arch: 'farm' }),
    C4('haverly', [-1300, -1070, -1800, -1700], { kind: 'fields' }),
    C4('haverly', [-1070, 384, -1800, -1700], { plot: 'haverly_windfarm' }),
    C4('haverly', [-1588, -1300, -1700, -1560], { arch: 'farm' }),
    C4('haverly', [-1300, -1036, -1700, -1560], { kind: 'fields' }),
    C4('haverly', [-1036, -560, -1700, -1516], { kind: 'fields', low: [-1560, -1395] }), // down to the airport fence (z -1510)
    C4('haverly', [-560, -80, -1700, -1516], { kind: 'fields', low: [-1560, -1395] }),
    C4('haverly', [-80, 384, -1700, -1516], { kind: 'fields', low: [-1560, -1395] }),
    C4('haverly', [-1588, -1300, -1560, -1475], { kind: 'fields', low: [-1505, -1395] }),
    C4('haverly', [-1300, -1036, -1560, -1475], { kind: 'fields', low: [-1505, -1395] }), // east to the fence's west end (x -1030)
    C4('haverly', [-1588, -1300, -1425, -1320], { plot: 'corn_maze', low: [-1505, -1395] }),
    C4('haverly', [-1300, -1036, -1425, -1320], { kind: 'fields', low: [-1505, -1395] }),
    C4('haverly', [-1588, -1300, -1320, -1180], { plot: 'haverly_farm_shop' }),
    C4('haverly', [-1300, -1036, -1320, -1180], { arch: 'farm' }),
    // Gateway Park.
    C4('gateway', [-1588, -1300, -1180, -1070]),
    C4('gateway', [-1300, -1050, -1180, -1070], { arch: 'hotels' }),
    C4('gateway', [-1050, -850, -1180, -1070], { arch: 'carhire' }),
    C4('gateway', [-850, -760, -1180, -1070], { arch: 'carhire' }),
    C4('gateway', [-760, -636, -1134, -1070]), // behind the airport road's motels
    C4('gateway', [-1588, -1300, -1070, -870]),
    C4('gateway', [-1300, -1050, -1070, -870], { plot: 'longstay_parking' }),
    C4('gateway', [-1050, -850, -1070, -870], { plot: 'gateway_cargo' }),
    C4('gateway', [-850, -636, -1070, -870]),
    C4('gateway', [-1588, -1300, -870, -660], { plot: 'redline_mx' }),
    C4('gateway', [-1300, -1050, -870, -660], { arch: 'trade' }),
    C4('gateway', [-1050, -850, -870, -660]),
    C4('gateway', [-850, -636, -870, -660]),
    C4('gateway', [-1588, -1300, -660, -440], { plot: 'gateway_pound' }),
    C4('gateway', [-1300, -1050, -660, -440]),
    // Lantern Heights (the 'Outskirts rodeo' stunt ramp stands in Kingfisher Park).
    C4('lantern', [-636, -96, -686, -660], { kind: 'park' }), // a green between the university and Cinder Road
    C4('lantern', [-636, -510, -660, -530]),
    C4('lantern', [-510, -384, -660, -530], { plot: 'lantern_school' }),
    C4('lantern', [-384, -288, -660, -530]),
    C4('lantern', [-288, -192, -660, -530]),
    C4('lantern', [-192, -96, -660, -530]),
    C4('lantern', [-636, -384, -530, -392], { plot: 'kingfisher_park' }),
    C4('lantern', [-384, -288, -530, -384]),
    C4('lantern', [-288, -192, -530, -384]),
    C4('lantern', [-192, -96, -530, -384], { plot: 'lantern_fire_station' }),
    // Southgate (the 'Estate lawn' and 'The long field' ramps stand in the
    // retail park's car park, 'Hedge jumper' on the market square).
    C4('southgate', [-636, -384, 392, 660], { plot: 'southgate_retail' }),
    C4('southgate', [-384, -320, 384, 520]),
    C4('southgate', [-384, -320, 520, 660]),
    C4('southgate', [-320, -160, 384, 660], { plot: 'southgate_market' }),
    C4('southgate', [-160, -96, 384, 520]),
    C4('southgate', [-96, 0, 384, 520], { plot: 'southgate_cinema' }),
    C4('southgate', [-160, 0, 520, 660], { plot: 'southgate_depot' }),
    // Redwater: the village south of the fort, the golf course, the ranch,
    // the lake, the solar farm and the recycling centre by Ironside.
    C4('redwater', [-1588, -1300, 440, 660]),
    C4('redwater', [-1300, -1050, 440, 660]),
    C4('redwater', [-1588, -1050, 660, 1190], { plot: 'pelican_links' }),
    C4('redwater', [-1050, -636, 660, 920], { plot: 'redwater_ranch' }),
    C4('redwater', [-1050, -636, 920, 1190], { arch: 'farm' }),
    C4('redwater', [-1588, -1300, 1190, 1470], { plot: 'willow_lake' }),
    C4('redwater', [-1300, -1050, 1190, 1470], { arch: 'farm' }),
    C4('redwater', [-1050, -636, 1190, 1470]),
    C4('redwater', [-1588, -1300, 1470, 1760], { plot: 'redwater_solar' }),
    C4('redwater', [-1300, -1050, 1470, 1760], { kind: 'fields' }),
    C4('redwater', [-1050, -870, 1470, 1760]),
    C4('redwater', [-870, -636, 1470, 1760], { plot: 'redwater_recycling' }),
    // Paloma Cove.
    C4('palomacove', [600, 760, 1480, 1784], { plot: 'cove_campsite' }),
    C4('palomacove', [760, 940, 1480, 1600], { plot: 'cove_beach_club' }),
    C4('palomacove', [940, 1040, 1480, 1784], { plot: 'paloma_cove' }),
    C4('palomacove', [760, 940, 1600, 1784]),
    // The strips left between the old world and the edges (after the
    // districts above, so their block ids stay as they are). 'outskirts'
    // blocks are greens nobody's story uses; `low` keeps trees off the
    // runway's line (z range); `strip` keeps them out of where the maps put
    // a district's name.
    C4('outskirts', [-1588, -1503, -440, -150], { strip: true, kind: 'allotments' }), // Breakwater Allotments, up to the fort's west wall (x -1500)
    C4('outskirts', [-1588, -1503, -150, 150], { strip: true, kind: 'park' }),
    C4('outskirts', [-1588, -1503, 150, 440], { strip: true, kind: 'allotments' }),
    C4('redwater', [-1588, -1300, 1760, 1800], { strip: true, kind: 'park' }), //      the South Coast Greenway, south of the highway
    C4('redwater', [-1300, -870, 1760, 1800], { strip: true, kind: 'park' }),
    C4('redwater', [-870, -636, 1760, 1800], { strip: true, kind: 'park' }),
    C4('outskirts', [-636, -320, 1760, 1800], { strip: true, kind: 'park' }),
    C4('outskirts', [-320, 0, 1760, 1800], { strip: true, kind: 'park' }),
    C4('outskirts', [0, 330, 1760, 1800], { strip: true, kind: 'park' }),
    C4('haverly', [384, 424, -1800, -1076], { strip: true, kind: 'park', low: [-1570, -1330] }), // the Seawall Walk, past the airport
    C4('outskirts', [384, 424, -745, -390], { strip: true, kind: 'park' }),
    C4('outskirts', [288, 384, -664, -384], { strip: true, kind: 'park' }), //           Northgate Gardens
    C4('gateway', [-636, -410, -1134, -1070], { strip: true, arch: 'carhire' }), //      behind Airport Road, north of the university
    C4('gateway', [-410, -96, -1108, -1070], { strip: true, arch: 'carhire' }),
    C4('gateway', [-96, -50, -1162, -1070], { strip: true, arch: 'carhire' }),
    C4('gateway', [47, 288, -1134, -1070], { strip: true, arch: 'carhire' }),
    C4('gateway', [288, 384, -1134, -1070], { strip: true, arch: 'carhire' }),
    C4('lantern', [-96, -50, -1070, -660], { strip: true }), //                              terraces along Coral Avenue
    C4('outskirts', [-1088, -1050, -193, -46], { strip: true, kind: 'park' }), //       either side of the fort's road in
    C4('outskirts', [-1088, -1050, 46, 193], { strip: true, kind: 'park' }),
    C4('outskirts', [330, 424, 1760, 1784], { strip: true, kind: 'park' }), //           by the Cove Causeway
  ];

  // Open ground on purpose (tools/emptiness.mjs counts it as a place, see
  // VH.Districts.open): fill4.js declares these at load time.
  VH.Data.open4 = [
    { minX: -1582, maxX: -1039, minZ: -1478, maxZ: -1422, label: 'Runway 09 approach lights', track: true },
    { minX: 13, maxX: 200, minZ: -853, maxZ: -747, label: 'The stunt ramps field' },
    { minX: -630, maxX: -392, minZ: -382, maxZ: 382, label: 'Crestline estate gardens (walled lawns)' },
  ];

  // The 4.0 landmarks, after the 3.0 ones (so nothing there changes): built-in
  // places on their plots, map badges for the major ones.
  for (const lm of [
    { id: 'haverly_farm_shop', name: 'Haverly Farm Shop', district: 'haverly', plot: 'haverly_farm_shop', kind: 'farmshop', major: true, short: 'Farm shop' },
    { id: 'corn_maze', name: 'Haverly Corn Maze', district: 'haverly', plot: 'corn_maze', kind: 'maze', major: true, short: 'Corn maze' },
    { id: 'haverly_windfarm', name: 'Haverly Wind Farm', district: 'haverly', plot: 'haverly_windfarm', kind: 'windfarm' },
    { id: 'redline_mx', name: 'Redline MX', district: 'gateway', plot: 'redline_mx', kind: 'motocross', major: true, short: 'Motocross' },
    { id: 'gateway_cargo', name: 'Gateway Cargo Terminal', district: 'gateway', plot: 'gateway_cargo', kind: 'cargo' },
    { id: 'longstay_parking', name: 'Gateway Long Stay', district: 'gateway', plot: 'longstay_parking', kind: 'parking' },
    { id: 'gateway_pound', name: 'Gateway Vehicle Pound', district: 'gateway', plot: 'gateway_pound', kind: 'pound' },
    { id: 'kingfisher_park', name: 'Kingfisher Park', district: 'lantern', plot: 'kingfisher_park', kind: 'park', major: true, short: 'Park' },
    { id: 'lantern_fire_station', name: 'Lantern Heights Fire Station', district: 'lantern', plot: 'lantern_fire_station', kind: 'firestation' },
    { id: 'lantern_school', name: 'Lantern Heights Primary School', district: 'lantern', plot: 'lantern_school', kind: 'school' },
    { id: 'southgate_market', name: 'Southgate Market Hall', district: 'southgate', plot: 'southgate_market', kind: 'market', major: true, short: 'Market' },
    { id: 'southgate_depot', name: 'Southgate Bus and Tram Depot', district: 'southgate', plot: 'southgate_depot', kind: 'depot' },
    { id: 'southgate_retail', name: 'Southgate Retail Park', district: 'southgate', plot: 'southgate_retail', kind: 'retail' },
    { id: 'southgate_cinema', name: 'Southgate Multiplex', district: 'southgate', plot: 'southgate_cinema', kind: 'cinema' },
    { id: 'pelican_links', name: 'Pelican Links', district: 'redwater', plot: 'pelican_links', kind: 'golf', major: true, short: 'Golf' },
    { id: 'redwater_ranch', name: 'Redwater Ranch', district: 'redwater', plot: 'redwater_ranch', kind: 'ranch', major: true, short: 'Ranch' },
    { id: 'willow_lake', name: 'Willow Lake', district: 'redwater', plot: 'willow_lake', kind: 'lake', major: true, short: 'Lake' },
    { id: 'redwater_solar', name: 'Redwater Solar Farm', district: 'redwater', plot: 'redwater_solar', kind: 'solar' },
    { id: 'redwater_recycling', name: 'Redwater Recycling Centre', district: 'redwater', plot: 'redwater_recycling', kind: 'recycling' },
    { id: 'paloma_cove', name: 'Paloma Cove', district: 'palomacove', plot: 'paloma_cove', kind: 'beach', major: true, short: 'Beach' },
    { id: 'cove_beach_club', name: 'Cove Beach Club', district: 'palomacove', plot: 'cove_beach_club', kind: 'club' },
    { id: 'cove_campsite', name: 'Cove Campsite', district: 'palomacove', plot: 'cove_campsite', kind: 'campsite' },
    // The strips' names on the full map (points, no plot).
    { id: 'breakwater_allotments', name: 'Breakwater Allotments', district: 'outskirts', x: -1546, z: -296, kind: 'allotments' },
    { id: 'south_coast_greenway', name: 'South Coast Greenway', district: 'redwater', x: -760, z: 1784, kind: 'park' },
    { id: 'seawall_walk', name: 'Seawall Walk', district: 'haverly', x: 406, z: -1250, kind: 'park' },
    { id: 'northgate_gardens', name: 'Northgate Gardens', district: 'outskirts', x: 336, z: -526, kind: 'park' },
  ]) VH.Data.landmarks3.push(Object.assign(lm, { v4: true }));
})();
