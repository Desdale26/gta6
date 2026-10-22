/*
 * ui-wheel.js — the radial weapon wheel (hold Tab, or LB on a gamepad).
 *
 *   const wheel = new VH.WeaponWheel(parentElement)
 *   wheel.open(state)      show it (see "State" below). Calling open() again
 *                          while open refreshes the contents without moving
 *                          the highlight.
 *   wheel.move(dx, dy)     mouse deltas in pixels (pointer lock friendly)
 *   wheel.stick(x, y)      a gamepad stick, -1..1
 *   wheel.cycle(dir)       next / previous weapon inside the highlighted slot
 *                          (owned ones only; a slot with nothing owned lets you
 *                          browse what is still locked)
 *   wheel.close()          → { slot, weaponId } for an owned weapon, or null
 *   wheel.isOpen
 *   wheel.onChange         optional callback({ slot, weaponId, reason: 'slot' | 'cycle' })
 *   VH.WeaponWheel.icon(id)      SVG markup string for a slot id or a weapon id
 *   VH.WeaponWheel.statBars(def) [{ label, value 0..1 }] for a weapon definition
 *                                (the wheel's info card and the gun shop)
 *
 * State (combat.wheelState()); every field but slots is optional:
 *   slots      [{ slot, weapons, current }] in wheel order (VH.Data.weaponSlots)
 *     weapons  [{ id, name, ammo, mag, owned, price, locked, unlock, driveby }]
 *              ammo = spare rounds, mag = rounds loaded; owned defaults to
 *              true; a weapon that is not owned is locked. Owned weapons come
 *              first, then locked ones. unlock says how to get it ("After
 *              'Signal Fire'", 'Bayline Arms · $1,500'); driveby: usable from
 *              a car window (falls back to the definition's drivebyAllowed).
 *     current  index of the weapon in hand among the OWNED weapons
 *   selected   slot id to highlight on opening
 *   keys       [label] the quick-select key per slot, in the order of `slots`
 *              (number badges on the ring; hidden for a gamepad)
 *   gamepad    true: gamepad hints, no key badges
 *   inVehicle  true: weapons that can't be fired from a car are dimmed
 *   key        label of the key that opens the wheel (default: the binding)
 *
 * The ring has one segment per VH.Data.weaponSlots entry (DEFAULT_SLOTS if
 * that is missing), with the icons scaled to fit however many there are. An
 * info card beside it (below it on narrow screens) describes the highlighted
 * weapon: description, stat bars, ammo, how to unlock it.
 *
 * The wheel never takes focus and never listens to the DOM: the game feeds
 * it input, so it works under pointer lock. Highlight changes play the
 * audio engine's wheelTick() (through VH.game.audio when present) and emit
 * 'wheel:change' on VH.events.
 */
(function () {
  'use strict';

  const VH = window.VH;

  const DEFAULT_SLOTS = [
    { id: 'unarmed', name: 'Unarmed' },
    { id: 'melee', name: 'Melee' },
    { id: 'pistol', name: 'Pistol' },
    { id: 'smg', name: 'SMG' },
    { id: 'shotgun', name: 'Shotgun' },
    { id: 'rifle', name: 'Rifle' },
    { id: 'sniper', name: 'Sniper' },
    { id: 'thrown', name: 'Thrown' },
    { id: 'heavy', name: 'Heavy' },
  ];
  const DEADZONE = 22; // px of mouse travel before the highlight follows
  const MAX_TRAVEL = 96; // the virtual cursor is clamped to this radius
  const STICK_DEADZONE = 0.4;

  // Geometry in SVG units (viewBox -250..250).
  const R_OUT = 234;
  const R_IN = 112;
  const R_ICON = 173;
  const R_KEY = 213; // key badges sit in each segment's outer corner
  const GAP = 5;
  const ITEM_W = 21; // icon width, % of the ring, for eight slots

  // ------------------------------------------------------------------ icons
  // All icons share a 96 x 48 box, barrel to the right, filled with currentColor.
  const f = (n) => +n.toFixed(2);
  const rect = (x, y, w, h, r) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r || 0) + '"/>';
  const poly = (pts) => '<polygon points="' + pts + '"/>';
  const path = (d, evenodd) => '<path d="' + d + '"' + (evenodd ? ' fill-rule="evenodd"' : '') + '/>';
  const line = (d, w) => '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + (w || 2.2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  const bar = (d, w, extra) => '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linejoin="round"' + (extra || '') + '/>';
  const ring = (cx, cy, r, w) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="currentColor" stroke-width="' + (w || 1.8) + '"/>';
  const dot = (cx, cy, r) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
  /** A circle as a sub-path, so several can punch rings and holes in one evenodd path. */
  const circ = (cx, cy, r) => 'M' + f(cx - r) + ' ' + cy + ' a' + r + ' ' + r + ' 0 1 0 ' + f(2 * r) + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + f(-2 * r) + ' 0 Z';

  /** Pineapple segments: grid cells pulled onto an ellipse, with grooves between them. */
  function pineapple(cx, cy, rx, ry) {
    const cols = [cx - rx, cx - rx * 0.34, cx + rx * 0.34, cx + rx];
    const rows = [cy - ry, cy - ry * 0.5, cy, cy + ry * 0.5, cy + ry];
    const g = 0.75;
    let out = '';
    const clampToEllipse = (x, y) => {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.hypot(dx, dy);
      return d > 1 ? [cx + (dx / d) * rx, cy + (dy / d) * ry] : [x, y];
    };
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        const x0 = cols[i] + g, x1 = cols[i + 1] - g, y0 = rows[j] + g, y1 = rows[j + 1] - g;
        const pts = [];
        const edge = (ax, ay, bx, by) => {
          for (let s = 0; s < 8; s++) {
            const t = s / 8;
            pts.push(clampToEllipse(ax + (bx - ax) * t, ay + (by - ay) * t));
          }
        };
        edge(x0, y0, x1, y0);
        edge(x1, y0, x1, y1);
        edge(x1, y1, x0, y1);
        edge(x0, y1, x0, y0);
        out += poly(pts.map((p) => f(p[0]) + ',' + f(p[1])).join(' '));
      }
    }
    return out;
  }

  const ICONS = {
    fist: [
      // Four knuckles, the back of the hand with the thumb line, and a cuff.
      rect(29, 13, 8.4, 15, 3.8), rect(38.3, 10.5, 8.4, 17, 3.8), rect(47.6, 10.5, 8.4, 17, 3.8), rect(56.9, 12.5, 8.4, 15, 3.8),
      path('M29 26 H65.3 V35 Q65.3 41.5 58.5 41.5 H36 Q29 41.5 29 35 Z M33 31.2 H55 Q57 31.2 57 32.2 Q57 33.2 55 33.2 H33 Z', true),
      rect(35.5, 43, 24, 4.5, 1.2),
    ],
    bat: [
      '<g transform="rotate(-14 48 24)">',
      dot(8.5, 24, 3.3),
      path('M10.5 22.7 L40 22.3 C57 21.1 66 19 83.5 18.4 Q90.5 18.4 91 24 Q90.5 29.6 83.5 29.6 C66 29 57 26.9 40 25.7 L10.5 25.3 Z M17 22.4 H18.2 V25.6 H17 Z M23 22.4 H24.2 V25.6 H23 Z M29 22.3 H30.2 V25.7 H29 Z', true),
      '</g>',
    ],
    knife: [
      path('M9 20.5 H32 V28.6 Q29.6 30.4 27 28.8 Q24.4 30.4 21.8 28.8 Q19.2 30.4 16.6 28.8 Q14 30.4 11.5 28.8 H9 Q5.5 28.6 5.5 24.5 Q5.5 20.5 9 20.5 Z'),
      rect(32, 16.5, 3.4, 16, 1.3),
      path('M35.4 20.6 H69 L78.5 22.6 L91 24.8 Q82.5 29.8 69 29.3 L35.4 28.6 Z M40 23.6 H63.5 V24.8 H40 Z', true),
    ],
    golfclub: [
      // Ridged rubber grip and a tapering steel shaft down to a lofted iron
      // head sitting flat, as if lined up on a ball.
      '<g transform="rotate(18 6 12)">',
      path('M6.4 9.6 H25.6 V14.4 H6.4 Q4 14.4 4 12 Q4 9.6 6.4 9.6 Z M10 10.8 H11 V13.2 H10 Z M15 10.8 H16 V13.2 H15 Z M20 10.8 H21 V13.2 H20 Z', true),
      poly('25.4,10.6 79,11.4 79,12.6 25.4,13.4'),
      '</g>',
      path('M75.6 32 L79.8 33.2 H88.6 Q93.8 33.4 93.8 37.6 Q93.8 41.6 89.6 41.6 H76.4 Q73.4 41.6 73.8 38.6 L74.4 34 Z M79.4 35.8 H90.4 V36.7 H79.4 Z M79.4 38.4 H90.4 V39.3 H79.4 Z', true),
    ],
    crowbar: [
      // A hex bar with a gooseneck claw at one end and a bent chisel at the other.
      bar('M11.6 31.4 L16 29.2 L70 21.4 C80.4 19.8 87 15.4 86.6 9.8 C86.2 5.6 81.4 4.2 78.6 6.6', 4.6),
      poly('81.24,7.38 78.24,3.88 73.6,10.8'),
      poly('14.43,32.56 12.37,28.44 5.2,31.4 5.8,33.6'),
    ],
    pistol: [
      rect(23, 10, 54, 9.5, 1.6), rect(72, 7.6, 2.8, 3, 0.6), rect(24.5, 8, 4.6, 2.6, 0.6),
      rect(35, 19, 37, 4.8, 1),
      poly('26,19 39,19 37.4,26 34.8,40.6 33.4,42.6 21.8,42.6 20.6,41 24,27.5 23.6,21.5'),
      line('M38.6 23.8 L39 29.4 Q39.4 31.6 41.6 31.6 L50 31.6 Q52.2 31.6 52.2 29.4 L52.2 23.8'),
      line('M43.6 24.2 Q45.6 26.6 44.2 29.2', 1.7),
    ],
    revolver: [
      rect(40, 11.6, 45, 6.6, 1.2), rect(40, 17.6, 42, 5, 1.6), poly('78,11.8 83.6,11.8 83.6,8.6 80.6,8.6'),
      poly('21.5,11 41,11 41,24.5 35,26.5 27.5,26.5 21.5,21'),
      rect(26, 9.2, 14.5, 16.4, 3.4),
      poly('22.6,12.4 17.6,6.6 13.8,7.2 19.6,15.6'),
      path('M22.4 19.5 C19.4 26.5 15.4 33.5 14.2 41.2 Q13.8 45 17.6 45 L25 45 Q28.6 45 28.6 41.5 C28.6 35 29.5 29 32.5 24.2 Z'),
      line('M31.2 25 Q30.4 33.4 37 33.4 Q42.4 33.4 42.4 25'),
      line('M35.4 25.4 Q37.4 27.8 36 30.4', 1.7),
    ],
    taser: [
      // A boxy stun gun with a lightning bolt on its side, the dart cartridge
      // out front and a spark jumping between the probes.
      path('M24.4 12 H61 Q63 12 63 14 V24.4 Q63 26.4 61 26.4 H24.4 Q22.4 26.4 22.4 24.4 V14 Q22.4 12 24.4 12 Z M43.4 14.2 L36.6 20.4 H41.2 L38 25 L46.6 18 H42 L45.8 14.2 Z', true),
      path('M65.6 10.6 H76.4 Q78.4 10.6 78.4 12.6 V25.8 Q78.4 27.8 76.4 27.8 H65.6 Q64 27.8 64 26.2 V12.2 Q64 10.6 65.6 10.6 Z M67.4 18.4 H76 V20 H67.4 Z', true),
      rect(78.2, 13.2, 3.4, 2.4, 0.6), rect(78.2, 22.8, 3.4, 2.4, 0.6),
      line('M84 13.4 L87.6 17 L84.6 19.2 L88.6 24', 1.6),
      poly('25.6,25.6 37.4,25.6 35.8,32.4 33.6,42 32.2,44 21.4,44 20.2,42.4 23.8,31.4'),
      line('M38 26.4 L38.4 30.4 Q38.8 32.4 41 32.4 L48.4 32.4 Q50.4 32.4 50.4 30.4 L50.4 26.4'),
      line('M42.8 26.8 Q44.8 29 43.4 31.4', 1.7),
    ],
    smg: [
      rect(26, 12, 46, 10.5, 1.6), rect(31.5, 9.4, 35, 3, 0.6), rect(32.5, 6.8, 3.2, 3, 0.6), rect(62.5, 6.8, 2.8, 3, 0.6),
      rect(68, 13, 10.5, 9.5, 1.6), rect(78, 15.4, 6.5, 4.4, 0.6), rect(84, 14, 6, 7, 1.2),
      poly('33.8,22 44.2,22 43.2,31.5 35,31.5'), poly('35.2,32.6 42.8,32.6 41.8,45.4 34.4,45.4'),
      line('M44.4 22.4 L44.8 27.4 Q45.2 29.4 47.2 29.4 L54 29.4 Q56 29.4 56 27.4 L56 22.4'),
      poly('61.5,22 68,22 66.2,27.6 63.2,27.6'),
      line('M25 14.2 H12.5 M25 20.4 H12.5', 2),
      rect(8.6, 11, 4.6, 13, 1.8),
    ],
    pdw: [
      // Bullpup: the magazine lies flat along the top with a window in it, a
      // reflex sight, and a thumbhole front grip.
      path('M12.4 16 H70.4 L77.6 20 V25.6 L71.2 29.4 L67.8 38.4 Q67 40.4 64.8 40.4 H19.6 Q11 40.4 10.4 33 L9.6 19 Q9.6 16 12.4 16 Z ' +
        'M25.4 28.4 H43.4 Q45.6 28.4 45.2 30.6 L44.6 33.4 Q44.2 35.2 42.2 35.2 H26.4 Q22.6 35.2 22.6 31.8 Q22.6 28.4 25.4 28.4 Z ' +
        'M52.8 29.4 H65 L63 35.8 H52.2 Z', true),
      path('M21 10.2 H68 Q70 10.2 70 12.2 V15.2 H19 V12.2 Q19 10.2 21 10.2 Z M28 12 H58 V13.6 H28 Z', true),
      path('M58.6 4.4 H68.2 V9.6 H58.6 Z M60.2 5.8 V8.2 H66.6 V5.8 Z', true),
      rect(76, 21, 9, 3.8, 0.6), rect(84.4, 19.6, 5.6, 6.6, 1.2),
    ],
    shotgun: [
      rect(40, 14, 52, 3.8, 0.9), rect(40, 18.6, 44, 3.2, 1.2), dot(90, 13, 1.1),
      path('M52 16.6 H72 Q74.6 16.6 74.6 19.2 V21 Q74.6 23.6 72 23.6 H52 Q49.4 23.6 49.4 21 V19.2 Q49.4 16.6 52 16.6 Z M55 17.8 H56.2 V22.4 H55 Z M59.2 17.8 H60.4 V22.4 H59.2 Z M63.4 17.8 H64.6 V22.4 H63.4 Z M67.6 17.8 H68.8 V22.4 H67.6 Z', true),
      rect(29.6, 12, 12.4, 11.4, 1.8),
      poly('31,12.6 6.2,15 4.4,16.2 4.4,29.2 6,30.4 16.5,26.4 25.2,22.6 24,27.6 27.6,28.2 31,23.2'),
      line('M33 23.4 Q33 28 36 28 L38.6 28 Q41 28 41 23.4', 2),
    ],
    sawnoff: [
      // Side-by-side barrels cut short, exposed hammers and a stubby grip.
      rect(40, 12.6, 40, 4.2, 1), rect(40, 17.6, 40, 4.2, 1), rect(77.6, 11.8, 2.8, 10.8, 0.8),
      path('M46 21 H64 Q66.6 21 66.6 23.4 Q66.6 26 64 26 H50 Q46 26 46 22.4 Z'),
      rect(28.4, 11.6, 13.4, 12.8, 2),
      poly('30.4,12.2 26.4,6.6 28.6,5.6 33.4,11.6'), poly('34.2,12.2 31,7.4 33.2,6.6 37,11.6'),
      path('M29.6 13.4 L18.6 17.6 Q10.4 21.6 9 31.6 Q8.6 36 12.4 36 L17.6 36 Q20.4 36 21 33 Q22.4 27.2 30.6 24.2 Z'),
      line('M33.4 24.4 Q33.4 29.4 36.4 29.4 L39 29.4 Q41.4 29.4 41.4 24.4', 2),
    ],
    autoshotgun: [
      // Boxy receiver, a drum magazine, a vented heat shield over the barrel.
      rect(64, 16, 22, 3.8, 0.8), rect(85.2, 14.4, 6.6, 7, 1.2),
      path('M60 11.2 H82.6 Q84.6 11.2 84.6 13.2 V15.6 H60 Z M64 12.6 H67 V14.2 H64 Z M69.4 12.6 H72.4 V14.2 H69.4 Z M74.8 12.6 H77.8 V14.2 H74.8 Z', true),
      rect(24, 9.6, 38.4, 14.4, 2.2),
      rect(30, 6.4, 26, 2.4, 0.6), rect(31, 5, 3, 2, 0.4), rect(52.6, 5, 3, 2, 0.4),
      path(circ(50, 31.4, 9) + ' ' + circ(50, 31.4, 6.6) + ' ' + circ(50, 31.4, 5.2) + ' ' + circ(50, 31.4, 1.8), true),
      poly('30,23.4 38,23.4 36.2,36.6 29.2,36.6'),
      line('M38.2 24.2 L38.6 28 Q39 30 40.8 30 L41.4 30', 2),
      poly('24.6,10.8 8.4,12.6 6,14 6,26.2 8.4,27.6 12.4,27.6 24.6,22.6'),
    ],
    rifle: [
      rect(30, 10.6, 46, 2.8, 0.6), rect(30, 12.6, 24.5, 7.8, 1.2),
      path('M56.6 12 H75.4 Q78 12 78 14.6 V18.6 Q78 21.2 75.4 21.2 H56.6 Q54 21.2 54 18.6 V14.6 Q54 12 56.6 12 Z M58 15.8 H63 V17.4 H58 Z M65.4 15.8 H70.4 V17.4 H65.4 Z', true),
      rect(78, 15.2, 8, 2.8, 0.6), rect(85.4, 13.8, 7, 5.6, 1.2),
      rect(31, 19.8, 20.5, 5, 1),
      path('M38 4.6 H46.6 Q48 4.6 48 6 V10.6 H36.6 V6 Q36.6 4.6 38 4.6 Z M39.2 6.2 V9.2 H45.4 V6.2 Z', true),
      path('M44.2 24.6 L50.6 24.6 Q51.2 33.2 55.2 40 L48.6 42.2 Q45 34.4 44.2 24.6 Z'),
      poly('33,24.6 39.4,24.6 37.4,35.4 31.4,35.4'),
      line('M39.6 24.8 L40 27.8 L44 27.8', 1.8),
      rect(18, 14, 13, 4.4, 1),
      poly('22.4,12 8.4,12.6 6.8,13.6 6.8,26 8.4,27 11.4,27 22.4,20.4'),
      rect(4.6, 12.2, 2.8, 15.4, 1),
    ],
    lmg: [
      // Belt-fed: a box magazine under the receiver, a carry handle, a finned
      // barrel sleeve and the bipod legs down.
      rect(58, 15.2, 28, 3.6, 0.6), rect(85.4, 13.8, 7, 6.4, 1.2),
      path('M58 13.2 H76 V20.8 H58 Z M60.4 14.6 H61.6 V19.4 H60.4 Z M63.4 14.6 H64.6 V19.4 H63.4 Z M66.4 14.6 H67.6 V19.4 H66.4 Z M69.4 14.6 H70.6 V19.4 H69.4 Z M72.4 14.6 H73.6 V19.4 H72.4 Z', true),
      rect(24.4, 10.4, 34, 11.4, 1.6), rect(28, 7.6, 24, 3.4, 1),
      line('M50.6 7.8 V5.6 Q50.6 3.6 52.6 3.6 H60.4 Q62.4 3.6 62.4 5.6 V13', 2.2),
      path('M43 21 H54.6 Q56 21 56 22.4 V31.6 Q56 33 54.6 33 H43 Q41.6 33 41.6 31.6 V22.4 Q41.6 21 43 21 Z M43.6 26 H54 V27.2 H43.6 Z', true),
      poly('29.6,21.4 36,21.4 34.4,33.4 28.2,33.4'),
      line('M36.2 21.8 L36.6 25.6 Q37 27.6 39 27.6 L41.4 27.6', 1.8),
      line('M74.4 20.8 L69.8 33.4 M74.4 20.8 L80.6 33', 1.8),
      poly('24.8,11.4 8.6,12.6 5.6,14 5.6,26 7.8,27.4 12.4,27.4 24.8,21.4'),
      rect(3.4, 12.6, 2.8, 15, 1),
    ],
    sniper: [
      poly('44,16.8 90,17.8 90,19.8 44,21.2'), rect(88.4, 16.3, 6, 5.2, 1.2),
      rect(34, 15.6, 14.6, 6.4, 2.6),
      rect(30, 8, 27, 4.2, 2), poly('56,8.4 62,5.4 66.4,5.4 66.4,14.8 62,14.8 56,11.8'),
      poly('30.6,8.3 25,6.6 21.6,6.6 21.6,13.6 25,13.6 30.6,11.9'), rect(40.4, 4.4, 5, 4.2, 0.8),
      rect(34.2, 12, 3, 4, 0.4), rect(50, 12, 3, 4.6, 0.4),
      path('M50 19 L70.5 19.6 L70.5 23.4 L48.4 24.6 L44.4 25 L40.4 33.6 L33.6 33.6 L34.6 26.2 L22 28.2 L8.4 33.2 L5 33.2 L3.8 32 L3.8 17.6 L8 16 L30 16 L34 19 Z M34.2 20.4 L22.4 20.8 Q20.2 24 22.4 25.8 L33.2 24.2 Z', true),
      line('M40.4 21.2 L37.4 25.4', 1.8), dot(36.8, 26.2, 1.9),
      line('M60 25 L76 25', 1.4),
    ],
    dmr: [
      // Marksman rifle: a compact 3x scope, a long slotted handguard, a short
      // straight magazine, a muzzle brake and an adjustable stock.
      rect(76, 15.4, 9.6, 2.6, 0.6), rect(85, 13.8, 7.4, 5.8, 1.2),
      path('M52.4 12.6 H74.6 Q77 12.6 77 15 V18.2 Q77 20.6 74.6 20.6 H52.4 Z M56 15.8 H60.4 V17.4 H56 Z M62.6 15.8 H67 V17.4 H62.6 Z M69.2 15.8 H73.6 V17.4 H69.2 Z', true),
      rect(28, 12.6, 25.6, 8.4, 1.2),
      rect(30.4, 6.2, 19, 3.8, 1.8), poly('48.8,6.4 53.4,4.4 57,4.4 57,11.8 53.4,11.8 48.8,9.8'), poly('31,6.6 27,5.4 24.4,5.4 24.4,10.8 27,10.8 31,9.6'),
      rect(33.6, 9.6, 2.8, 3.4, 0.4), rect(45.2, 9.6, 2.8, 3.4, 0.4),
      poly('41,20.6 48.4,20.6 49.4,31.4 42,32.2'),
      poly('30.6,20.6 37,20.6 35,32 29,32'),
      line('M37.2 21 L37.6 24.6 L41 24.6', 1.8),
      path('M28.6 13.2 H13 Q10.4 13.2 9 14.6 L6.4 24.6 Q6.2 26.4 8 26.4 H11.4 L19.6 21.6 H28.6 Z M12.6 17 H22 V19 H12.6 Z', true),
    ],
    rpg: [
      // Launch tube with the rocket's warhead loaded, a flared back end, a
      // heat shield, a pistol grip, a front grip and a small optic.
      path('M66 18.4 H72.2 L76 14.6 Q78 13 80.2 13.2 L84.2 14.4 Q91.8 17.8 93 20.8 Q91.8 23.8 84.2 27.2 L80.2 28.4 Q78 28.6 76 27 L72.2 23.2 H66 Z'),
      rect(13, 18.4, 55, 5, 1), rect(28, 16.8, 18, 8.2, 1.6),
      poly('3.6,15.2 14.4,17.8 14.4,23.6 3.6,26.2'),
      rect(38, 11.4, 11, 4.2, 1.2), rect(42, 15, 3, 2.4, 0.4),
      poly('38.2,24.4 44.2,24.4 42.6,35.4 36.8,35.4'),
      line('M44.4 25 L44.8 28.2 Q45.2 30 47 30 L49.6 30', 1.8),
      poly('56,23 61.4,23 60.4,32 56.6,32'),
    ],
    glauncher: [
      // A revolving six-shot cylinder, a short fat barrel, a top rail, a front
      // grip and a folding wire stock.
      rect(60, 13.6, 23, 8.4, 1.4), rect(82, 12.2, 5.6, 11.2, 1.4),
      path('M38.4 11.6 H58 Q61.4 11.6 61.4 15 V25.4 Q61.4 28.8 58 28.8 H38.4 Q35 28.8 35 25.4 V15 Q35 11.6 38.4 11.6 Z M37.6 15.2 H58.8 V16.4 H37.6 Z M37.6 19.6 H58.8 V20.8 H37.6 Z M37.6 24 H58.8 V25.2 H37.6 Z', true),
      rect(30, 8.4, 46, 2.6, 0.6), rect(46, 5, 9, 3.6, 1),
      rect(25.4, 10.6, 10.4, 12, 1.6),
      poly('26.6,22 33,22 31,33.6 25,33.6'),
      line('M33.2 22.4 L33.6 26 Q34 27.8 35.8 27.8 L37 27.8', 1.8),
      poly('66,22 71.6,22 70.6,31.4 66.6,31.4'),
      line('M25.4 13.4 H11.4 M25.4 20.4 L12 23.4', 2.2),
      rect(7.2, 11.2, 4.6, 14.6, 1.8),
    ],
    minigun: [
      // Six barrels (three show) in two clamps, the motor housing with a
      // carry handle, the rear grip and the ammo belt feeding in from below.
      rect(48, 12.8, 38.6, 2.8, 0.6), rect(48, 17.2, 40, 2.8, 0.6), rect(48, 21.6, 38.6, 2.8, 0.6),
      rect(62, 11.2, 3.2, 14.8, 0.8), rect(81.6, 11.4, 3.6, 14.4, 0.8),
      rect(44.8, 10.4, 4.6, 16.4, 1.2),
      rect(21.4, 10.4, 24, 16.4, 3),
      line('M25.6 10.4 V6 Q25.6 4 27.6 4 H40 Q42 4 42 6 V10.4', 2.4),
      poly('21.6,22 28.6,22 26.4,34 19.8,34'),
      bar('M36 26.4 Q36.4 37.4 27.6 41.4 L12.6 42', 3.6, ' stroke-dasharray="1.6 0.8"'),
    ],
    grenade: [
      pineapple(47, 29, 12.2, 14.8),
      rect(43, 7.6, 8.4, 6.4, 1.2),
      path('M51.2 8.2 L57.6 9.4 Q62.4 12.6 62.2 23 L59.8 23 Q59.8 14.2 56.4 11.8 L51.2 11 Z'),
      ring(38.8, 10.4, 3.9, 1.7), line('M42.6 10.6 L44 10.8', 1.4),
    ],
    molotov: [
      path('M40.4 44 L40.4 27 Q40.4 21.6 45.6 17.8 L45.6 10 L50.8 10 L50.8 17.8 Q56 21.6 56 27 L56 44 Q56 46.2 53.8 46.2 L42.6 46.2 Q40.4 46.2 40.4 44 Z M42 30.6 H54.4 V32 H42 Z M42 34 H54.4 V40.4 H42 Z', true),
      path('M46 10 Q43.6 6 46.8 3.8 Q50.2 1.8 52 5 Q53.6 7.6 51 10 Z'),
      path('M50.4 9 Q55.4 10.6 56 17 L54.2 17.4 Q53.4 12.2 49.6 10.8 Z'),
    ],
    limpet: [
      // A magnetic puck seen from just above: keypad and a light on top, an
      // antenna, and the magnets underneath.
      path('M26 26.4 Q26 18.8 48 18.8 Q70 18.8 70 26.4 V32.4 Q70 39 48 39 Q26 39 26 32.4 Z ' +
        'M27.8 27 Q27.8 32.6 48 32.6 Q68.2 32.6 68.2 27 Q68.2 31.2 48 31.2 Q27.8 31.2 27.8 27 Z ' +
        'M37 22.4 H40.2 V24.4 H37 Z M41.6 22.4 H44.8 V24.4 H41.6 Z M46.2 22.4 H49.4 V24.4 H46.2 Z ' +
        'M37 25.6 H40.2 V27.6 H37 Z M41.6 25.6 H44.8 V27.6 H41.6 Z M46.2 25.6 H49.4 V27.6 H46.2 Z ' + circ(57.6, 25, 1.8), true),
      line('M61.6 22 L67.4 7.6', 1.6), dot(67.8, 6.6, 2.1),
      rect(30.6, 38.6, 7.6, 3.4, 1), rect(44.2, 39.6, 7.6, 3.4, 1), rect(57.8, 38.6, 7.6, 3.4, 1),
    ],
  };

  const SLOT_ICON = {
    unarmed: 'fist', melee: 'bat', pistol: 'pistol', smg: 'smg', shotgun: 'shotgun',
    rifle: 'rifle', sniper: 'sniper', thrown: 'grenade', heavy: 'rpg',
  };
  const WEAPON_ICON = {
    fists: 'fist', bat: 'bat', knife: 'knife', golfclub: 'golfclub', crowbar: 'crowbar',
    pistol: 'pistol', revolver: 'revolver', taser: 'taser',
    smg: 'smg', pdw: 'pdw',
    shotgun: 'shotgun', sawnoff: 'sawnoff', autoshotgun: 'autoshotgun',
    rifle: 'rifle', lmg: 'lmg',
    sniper: 'sniper', dmr: 'dmr',
    grenade: 'grenade', molotov: 'molotov', limpet: 'limpet',
    rpg: 'rpg', glauncher: 'glauncher', minigun: 'minigun',
  };
  const svgCache = {};

  /**
   * SVG markup string for a weapon id ('knife', 'molotov' ...) or a slot id
   * ('pistol', 'heavy' ...). An unknown weapon falls back to its slot's icon.
   */
  function icon(id) {
    let key = WEAPON_ICON[id] || (ICONS[id] ? id : SLOT_ICON[id]);
    if (!key) {
      const d = VH.Data && VH.Data.weaponsById ? VH.Data.weaponsById[id] : null;
      key = (d && SLOT_ICON[d.slot]) || 'fist';
    }
    if (!svgCache[key]) {
      svgCache[key] = '<svg class="vh-wicon vh-wicon-' + key + '" viewBox="0 0 96 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        '<g fill="currentColor">' + ICONS[key].join('') + '</g></svg>';
    }
    return svgCache[key];
  }

  /** A small padlock for locked weapons. */
  const LOCK = '<svg class="vhw-lock" viewBox="0 0 12 14" aria-hidden="true" focusable="false">' +
    '<path d="M3.2 6.4 V4.6 a2.8 2.8 0 0 1 5.6 0 V6.4" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<rect x="1.4" y="6" width="9.2" height="7.2" rx="1.6" fill="currentColor"/></svg>';

  // ------------------------------------------------------------ stat bars
  const clamp01 = (v) => f(Math.max(0, Math.min(1, v || 0)));

  /**
   * The stat bars for a weapon definition, [{ label, value 0..1 }], on one
   * scale for the whole arsenal so any two weapons compare:
   *   melee        Damage, Speed, Reach
   *   thrown       Damage (a molotov counts a few seconds of burning), Blast, Range
   *   launchers    Damage, Fire rate, Range, Blast, Magazine
   *   other guns   Damage (all the pellets of a shell), Fire rate, Range
   *                (where the falloff ends), Accuracy, Magazine
   * Accuracy has no field of its own: it grows with how far a gun holds full
   * damage and how much its sight zooms, and drops for automatics and shotguns.
   */
  function statBars(def) {
    if (!def) return [];
    const dmg = (d) => Math.sqrt(Math.max(0, d) / 240);
    if (def.kind === 'melee') {
      return [
        { label: 'Damage', value: clamp01(dmg(def.damage)) },
        { label: 'Speed', value: clamp01(def.fireRate / 2.6) },
        { label: 'Reach', value: clamp01(def.range / 2.1) },
      ];
    }
    if (def.kind === 'thrown') {
      return [
        { label: 'Damage', value: clamp01(dmg(def.damage + (def.burnDps || 0) * Math.min(def.fireDuration || 0, 4))) },
        { label: 'Blast', value: clamp01((def.blastRadius || 0) / 8) },
        { label: 'Range', value: clamp01(def.range / 40) },
      ];
    }
    const out = [
      { label: 'Damage', value: clamp01(dmg(def.damage * (def.pellets || 1))) },
      { label: 'Fire rate', value: clamp01(Math.log(1 + def.fireRate) / Math.log(31)) },
      { label: 'Range', value: clamp01(Math.sqrt((def.falloff ? def.falloff.end : def.range) / 450)) },
    ];
    if (def.kind === 'projectile' || (def.blastRadius && !def.falloff)) {
      out.push({ label: 'Blast', value: clamp01((def.blastRadius || 0) / 8) });
    } else {
      const holds = def.falloff ? def.falloff.start : def.range;
      const acc = 0.2 + 0.6 * Math.sqrt(holds / 300) + (1 - (def.zoom || 1)) * 0.4 - (def.auto ? 0.1 : 0) - ((def.pellets || 1) > 1 ? 0.15 : 0);
      out.push({ label: 'Accuracy', value: clamp01(acc) });
    }
    out.push({ label: 'Magazine', value: clamp01(Math.log(1 + (def.magSize || 1)) / Math.log(301)) });
    return out;
  }

  // -------------------------------------------------------------- geometry
  const pt = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return f(Math.sin(a) * r) + ' ' + f(-Math.cos(a) * r);
  };

  /** Where a point at radius r, `deg` clockwise from the top, sits on the ring, in % (left, top). */
  const pos = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return [f(50 + (Math.sin(a) * r) / 5) + '%', f(50 - (Math.cos(a) * r) / 5) + '%'];
  };

  /** An annular sector centred on `deg` (clockwise from the top), with constant-width gaps. */
  function sector(deg, rIn, rOut, half, gap) {
    const dOut = (Math.asin(gap / 2 / rOut) * 180) / Math.PI;
    const dIn = (Math.asin(gap / 2 / rIn) * 180) / Math.PI;
    const a0 = deg - half, a1 = deg + half;
    return 'M' + pt(rOut, a0 + dOut) + ' A' + rOut + ' ' + rOut + ' 0 0 1 ' + pt(rOut, a1 - dOut) +
      ' L' + pt(rIn, a1 - dIn) + ' A' + rIn + ' ' + rIn + ' 0 0 0 ' + pt(rIn, a0 + dIn) + ' Z';
  }

  function arc(deg, r, half) {
    return 'M' + pt(r, deg - half) + ' A' + r + ' ' + r + ' 0 0 1 ' + pt(r, deg + half);
  }

  let uid = 0;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  // ----------------------------------------------------------------- wheel
  class WeaponWheel {
    constructor(parent) {
      this.parent = parent || document.body;
      this.isOpen = false;
      this.onChange = null;
      const defs = VH.Data && Array.isArray(VH.Data.weaponSlots) && VH.Data.weaponSlots.length ? VH.Data.weaponSlots : DEFAULT_SLOTS;
      this.slotIds = defs.map((s) => s.id || s);
      this.slotNames = {};
      for (const s of DEFAULT_SLOTS) this.slotNames[s.id] = s.name;
      for (const s of defs) if (s && s.id && s.name) this.slotNames[s.id] = s.name;
      this.slots = this.slotIds.map((id) => ({ id, weapons: [], current: 0, key: '' }));
      this.sel = 0;
      this.gamepad = false;
      this.inVehicle = false;
      this._vx = 0;
      this._vy = 0;
      this._hlDeg = 0;
      this._build();
    }

    _build() {
      const id = 'vhw' + ++uid;
      this.root = el('div', 'vhw');
      this.root.setAttribute('aria-hidden', 'true');
      this.root.append(el('div', 'vhw-backdrop'));
      const stack = el('div', 'vhw-stack');
      const ringEl = (this.ringEl = el('div', 'vhw-ring'));
      ringEl.append(el('div', 'vhw-glass'));

      const n = this.slotIds.length;
      const step = 360 / n;
      let svg = '<svg class="vhw-svg" viewBox="-250 -250 500 500" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
        '<defs>' +
        '<linearGradient id="' + id + '-hl" x1="0" y1="0" x2="1" y2="0.35"><stop offset="0" stop-color="#ffb347"/><stop offset="0.45" stop-color="#ff7a59"/><stop offset="1" stop-color="#ff4f8b"/></linearGradient>' +
        '<linearGradient id="' + id + '-rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff5f9a"/></linearGradient>' +
        '<radialGradient id="' + id + '-sheen" cx="0" cy="0" r="' + R_OUT + '" gradientUnits="userSpaceOnUse"><stop offset="' + f(R_IN / R_OUT) + '" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.07"/></radialGradient>' +
        '</defs>' +
        '<circle class="vhw-track" r="' + (R_OUT + 7) + '"/>';
      for (let i = 0; i < n; i++) {
        svg += '<path class="vhw-seg" data-i="' + i + '" d="' + sector(i * step, R_IN, R_OUT, step / 2, GAP) + '" fill="url(#' + id + '-sheen)"/>';
      }
      svg += '<g class="vhw-hl">' +
        '<path class="vhw-hl-fill" d="' + sector(0, R_IN, R_OUT, step / 2, GAP) + '" fill="url(#' + id + '-hl)"/>' +
        '<path class="vhw-hl-rim" d="' + arc(0, R_OUT + 8, step / 2 - 2.5) + '" stroke="url(#' + id + '-rim)"/>' +
        '</g>' +
        '<circle class="vhw-inner" r="' + (R_IN - 5) + '"/>' +
        '<g class="vhw-pointer"><path d="M-7 ' + -(R_IN - 9) + ' L0 ' + -(R_IN + 1) + ' L7 ' + -(R_IN - 9) + ' Z"/></g>' +
        '</svg>';
      ringEl.insertAdjacentHTML('beforeend', svg);
      this.svg = ringEl.querySelector('svg');
      this.segEls = Array.from(this.svg.querySelectorAll('.vhw-seg'));
      this.hlEl = this.svg.querySelector('.vhw-hl');
      this.pointerEl = this.svg.querySelector('.vhw-pointer');

      // Icons, ammo and pips around the ring, shrunk to the chord between
      // neighbouring slots when there are more than eight; a key badge in
      // each segment's outer corner.
      const fit = Math.min(1, Math.sin(Math.PI / n) / Math.sin(Math.PI / 8));
      const keyDeg = step / 2 - (16 / R_KEY) * (180 / Math.PI);
      this.itemEls = [];
      for (let i = 0; i < n; i++) {
        const item = el('div', 'vhw-item');
        [item.style.left, item.style.top] = pos(R_ICON, i * step);
        item.style.width = f(ITEM_W * fit) + '%';
        const ic = el('div', 'vhw-icon');
        const count = el('div', 'vhw-count');
        const pips = el('div', 'vhw-dots');
        item.append(ic, count, pips);
        const key = el('div', 'vhw-key');
        [key.style.left, key.style.top] = pos(R_KEY, i * step - keyDeg);
        ringEl.append(item, key);
        this.itemEls.push({ item, ic, count, pips, key, iconKey: null, countHtml: null });
      }

      // Centre readout.
      const c = (this.centre = el('div', 'vhw-center'));
      this.cSlot = el('div', 'vhw-slot');
      this.cName = el('div', 'vhw-name');
      this.cAmmo = el('div', 'vhw-ammo');
      this.cNote = el('div', 'vhw-note');
      this.cCycle = el('div', 'vhw-cycle');
      c.append(this.cSlot, this.cName, this.cAmmo, this.cNote, this.cCycle);
      ringEl.append(c);

      // Info card for the highlighted weapon.
      const info = (this.info = el('div', 'vhw-info'));
      this.iSlot = el('div', 'vhw-info-slot');
      this.iName = el('div', 'vhw-info-name');
      this.iStatus = el('div', 'vhw-info-status');
      this.iDesc = el('p', 'vhw-info-desc');
      this.iStats = el('div', 'vhw-stats');
      this.iAmmo = el('div', 'vhw-info-ammo');
      info.append(this.iSlot, this.iName, this.iStatus, this.iDesc, this.iStats, this.iAmmo);
      this.statRows = [];

      this.hint = el('div', 'vhw-hint');
      stack.append(ringEl, info, this.hint);
      this.root.append(stack);
      this.parent.appendChild(this.root);
    }

    // ------------------------------------------------------------- state
    _ingest(state) {
      const list = (state && Array.isArray(state.slots) && state.slots) || [];
      const keys = (state && Array.isArray(state.keys) && state.keys) || [];
      const bySlot = {};
      const keyBySlot = {};
      list.forEach((s, i) => {
        if (!s) return;
        bySlot[s.slot] = s;
        if (keys[i] !== undefined && keys[i] !== null && keys[i] !== '—') keyBySlot[s.slot] = String(keys[i]);
      });
      this.slots = this.slotIds.map((id) => {
        const s = bySlot[id];
        const weapons = s && Array.isArray(s.weapons) ? s.weapons.map((w) => {
          const o = Object.assign({ owned: true }, w);
          o.owned = !!o.owned;
          o.locked = !o.owned;
          return o;
        }) : [];
        if (id === 'unarmed' && !weapons.some((w) => w.owned)) weapons.unshift({ id: 'fists', name: 'Fists', ammo: 0, mag: 0, owned: true, locked: false });
        // `current` counts owned weapons only; with nothing owned, show the first locked one.
        const owned = weapons.map((w, i) => (w.owned ? i : -1)).filter((i) => i >= 0);
        const want = s && Number.isInteger(s.current) ? s.current : 0;
        const current = owned.length ? owned[want >= 0 && want < owned.length ? want : 0] : 0;
        return { id, name: this.slotNames[id] || id, weapons, current, key: keyBySlot[id] || '' };
      });
      this.gamepad = !!(state && state.gamepad);
      this.inVehicle = !!(state && state.inVehicle);
      this.keyLabel = (state && state.key) || this._bindingLabel();
    }

    _bindingLabel() {
      try {
        const inp = VH.game && VH.game.input;
        if (inp && inp.labelFor) return inp.labelFor('weaponWheel');
      } catch (err) {
        // Fall through to the default.
      }
      return 'Tab';
    }

    _owned(slot) {
      return slot.weapons.filter((w) => w.owned);
    }

    /** The weapons cycling steps through: the owned ones, or every locked one when nothing is owned. */
    _cyclable(slot) {
      const owned = slot.weapons.map((w, i) => (w.owned ? i : -1)).filter((i) => i >= 0);
      return owned.length ? owned : slot.weapons.map((w, i) => i);
    }

    _def(id) {
      return VH.Data && VH.Data.weaponsById ? VH.Data.weaponsById[id] || null : null;
    }

    _kind(id) {
      const d = this._def(id);
      return d ? d.kind : id === 'fists' ? 'melee' : 'hitscan';
    }

    /** Whether a weapon can't be used from a car (fists never count: that's just holstering). */
    _noCar(w) {
      if (!this.inVehicle || !w || w.id === 'fists') return false;
      if (w.driveby !== undefined) return !w.driveby;
      const d = this._def(w.id);
      return d ? !d.drivebyAllowed : false;
    }

    // ---------------------------------------------------------- open / close
    open(state) {
      this._ingest(state);
      this.root.classList.toggle('pad', this.gamepad);
      this.root.classList.toggle('in-car', this.inVehicle);
      if (!this.isOpen) {
        this.isOpen = true;
        this._vx = 0;
        this._vy = 0;
        const i = this.slotIds.indexOf(state && state.selected);
        this._setHighlight(i >= 0 ? i : 0, true);
        this._pointer(0, 0);
        this.root.classList.add('visible');
      }
      this._render();
    }

    close() {
      if (!this.isOpen) return null;
      this.isOpen = false;
      this.root.classList.remove('visible');
      const slot = this.slots[this.sel];
      const w = slot && slot.weapons[slot.current];
      return w && w.owned ? { slot: slot.id, weaponId: w.id } : null;
    }

    // ----------------------------------------------------------------- input
    move(dx, dy) {
      if (!this.isOpen) return;
      this._vx += dx || 0;
      this._vy += dy || 0;
      const len = Math.hypot(this._vx, this._vy);
      if (len > MAX_TRAVEL) {
        this._vx *= MAX_TRAVEL / len;
        this._vy *= MAX_TRAVEL / len;
      }
      this._aim(this._vx, this._vy, Math.min(len, MAX_TRAVEL) >= DEADZONE);
    }

    stick(x, y) {
      if (!this.isOpen) return;
      const len = Math.hypot(x, y);
      if (len < STICK_DEADZONE) return;
      this._vx = (x / len) * MAX_TRAVEL;
      this._vy = (y / len) * MAX_TRAVEL;
      this._aim(x, y, true);
    }

    cycle(dir) {
      if (!this.isOpen || !dir) return;
      const slot = this.slots[this.sel];
      const list = this._cyclable(slot);
      if (list.length < 2) return;
      const at = Math.max(0, list.indexOf(slot.current));
      slot.current = list[(at + (dir > 0 ? 1 : -1) + list.length) % list.length];
      this._render();
      for (const n of [this.centre, this.info]) {
        n.classList.remove('bump');
        void n.offsetWidth; // restart the animation
        n.classList.add('bump');
      }
      this._changed('cycle');
    }

    _aim(x, y, active) {
      this._pointer(x, y);
      if (!active) return;
      const n = this.slotIds.length;
      const deg = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
      const i = Math.round(deg / (360 / n)) % n;
      if (i !== this.sel) {
        this._setHighlight(i);
        this._render();
        this._changed('slot');
      }
    }

    _pointer(x, y) {
      const len = Math.hypot(x, y);
      const deg = (Math.atan2(x, -y) * 180) / Math.PI;
      this.pointerEl.style.transform = 'rotate(' + f(deg) + 'deg)';
      this.pointerEl.style.opacity = String(f(Math.min(1, len / DEADZONE) * 0.9));
    }

    _setHighlight(i, snap) {
      const step = 360 / this.slotIds.length;
      const target = i * step;
      const cur = ((this._hlDeg % 360) + 360) % 360;
      const delta = ((target - cur + 540) % 360) - 180;
      this._hlDeg = snap ? target : this._hlDeg + delta;
      this.sel = i;
      if (snap) {
        this.hlEl.style.transition = 'none';
        this.hlEl.style.transform = 'rotate(' + f(this._hlDeg) + 'deg)';
        void this.hlEl.getBoundingClientRect();
        this.hlEl.style.transition = '';
      } else {
        this.hlEl.style.transform = 'rotate(' + f(this._hlDeg) + 'deg)';
      }
    }

    _changed(reason) {
      const slot = this.slots[this.sel];
      const w = slot.weapons[slot.current];
      const info = { slot: slot.id, weaponId: w && w.owned ? w.id : null, reason };
      try {
        const audio = VH.game && VH.game.audio;
        if (audio && audio.wheelTick) audio.wheelTick();
      } catch (err) {
        // Sound is optional.
      }
      if (this.onChange) this.onChange(info);
      if (VH.events) VH.events.emit('wheel:change', info);
    }

    // ---------------------------------------------------------------- render
    _ammoText(w) {
      const kind = this._kind(w.id);
      if (kind === 'melee') return '';
      if (kind === 'thrown') return '×' + ((w.mag || 0) + (w.ammo || 0));
      return String((w.mag || 0) + (w.ammo || 0));
    }

    _render() {
      const n = this.slotIds.length;
      for (let i = 0; i < n; i++) {
        const slot = this.slots[i];
        const e = this.itemEls[i];
        const w = slot.weapons[slot.current];
        const owned = this._owned(slot);
        const locked = !!w && !w.owned;
        const key = w ? w.id : slot.id;
        if (e.iconKey !== key) {
          e.ic.innerHTML = icon(key);
          e.iconKey = key;
        }
        const countHtml = locked ? LOCK : w ? this._ammoText(w) : '';
        if (e.countHtml !== countHtml) {
          e.count.innerHTML = countHtml;
          e.countHtml = countHtml;
        }
        e.item.classList.toggle('empty', !w);
        e.item.classList.toggle('locked', locked);
        e.item.classList.toggle('nocar', !locked && this._noCar(w));
        e.item.classList.toggle('on', i === this.sel);
        e.item.classList.toggle('low', !!(w && w.owned && this._kind(w.id) !== 'melee' && (w.mag || 0) + (w.ammo || 0) === 0));
        this.segEls[i].classList.toggle('empty', owned.length === 0);
        this.segEls[i].classList.toggle('on', i === this.sel);
        // One pip per weapon in the slot: filled if owned, hollow if locked.
        let dots = '';
        if (slot.weapons.length > 1) {
          for (const o of slot.weapons) {
            const cls = (o.owned ? '' : 'off') + (o === w ? ' on' : '');
            dots += '<i' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + '></i>';
          }
        }
        if (e.pips.innerHTML !== dots) e.pips.innerHTML = dots;
        e.key.textContent = slot.key;
        e.key.hidden = !slot.key || this.gamepad;
        e.key.classList.toggle('on', i === this.sel);
      }

      const slot = this.slots[this.sel];
      const owned = this._owned(slot);
      const w = slot.weapons[slot.current];
      const locked = !!w && !w.owned;
      const noCar = !locked && this._noCar(w);
      this.root.classList.toggle('sel-empty', owned.length === 0);
      this.root.classList.toggle('sel-locked', locked);
      this.root.classList.toggle('sel-nocar', noCar);
      this.cSlot.textContent = slot.name;
      if (!w) {
        this.cName.textContent = 'Empty';
        this.cAmmo.innerHTML = '<span class="vhw-none">No weapon</span>';
      } else if (locked) {
        this.cName.textContent = w.name || w.id;
        this.cAmmo.innerHTML = '<span class="vhw-none">' + LOCK + 'Not owned</span>';
      } else {
        this.cName.textContent = w.name || w.id;
        const kind = this._kind(w.id);
        if (kind === 'melee') this.cAmmo.innerHTML = '';
        else if (kind === 'thrown') this.cAmmo.innerHTML = '<b>' + ((w.mag || 0) + (w.ammo || 0)) + '</b><span>left</span>';
        else this.cAmmo.innerHTML = '<b' + (w.mag ? '' : ' class="out"') + '>' + (w.mag || 0) + '</b><span>/ ' + (w.ammo || 0) + '</span>';
      }
      this.cNote.textContent = noCar ? 'Not from a car' : '';
      const list = this._cyclable(slot).map((k) => slot.weapons[k]);
      if (list.length > 1) {
        this.cCycle.innerHTML = '<em>‹</em>' + (list.indexOf(w) + 1) + ' of ' + list.length + '<em>›</em>';
        this.cCycle.hidden = false;
      } else {
        this.cCycle.textContent = '';
        this.cCycle.hidden = true;
      }
      this._renderInfo(slot, w, noCar);

      if (this.gamepad) {
        this.hint.innerHTML = '<span><kbd>LB</kbd> Hold</span>' +
          '<span><kbd>R stick</kbd> Point</span>' +
          '<span><kbd>D-pad ◂ ▸</kbd> Cycle</span>' +
          '<span>Release to equip</span>';
      } else {
        this.hint.innerHTML = '<span><kbd>' + (this.keyLabel || 'Tab') + '</kbd> Hold</span>' +
          '<span>Mouse Point</span>' +
          '<span><kbd>Wheel</kbd> Cycle</span>' +
          '<span>Release to equip</span>';
      }
    }

    /** The info card: name, description, stat bars, ammo, and why it can't be used right now. */
    _renderInfo(slot, w, noCar) {
      const def = w ? this._def(w.id) : null;
      const locked = !!w && !w.owned;
      this.info.classList.toggle('locked', locked);
      this.info.classList.toggle('empty', !w);
      this.iSlot.textContent = slot.name + (slot.key && !this.gamepad ? ' · ' + slot.key : '');
      this.iName.textContent = w ? w.name || (def && def.name) || w.id : 'Empty slot';

      this.iStatus.replaceChildren();
      if (locked) {
        const b = el('b', 'vhw-tag lock');
        b.innerHTML = LOCK;
        b.append('Not owned');
        this.iStatus.append(b);
        if (w.unlock) this.iStatus.append(el('span', 'vhw-unlock', w.unlock));
      } else if (noCar) {
        this.iStatus.append(el('b', 'vhw-tag car', 'Not from a car'));
      }
      this.iStatus.hidden = !this.iStatus.firstChild;

      this.iDesc.textContent = def ? def.desc || '' : w ? '' : 'Nothing for this slot yet. Find one, or buy one at Bayline Arms.';
      this.iDesc.hidden = !this.iDesc.textContent;

      const bars = def ? statBars(def) : [];
      while (this.statRows.length < bars.length) {
        const row = el('div', 'vhw-stat');
        const label = el('span');
        const track = el('i');
        const fill = el('b');
        track.append(fill);
        row.append(label, track);
        this.iStats.append(row);
        this.statRows.push({ row, label, fill });
      }
      this.statRows.forEach((r, k) => {
        const b = bars[k];
        r.row.hidden = !b;
        if (!b) return;
        r.label.textContent = b.label;
        r.fill.style.width = Math.round(b.value * 100) + '%';
      });
      this.iStats.hidden = !bars.length;

      // 'mag / spare 9 mm rounds', or what it would take while it's locked.
      const pool = def && def.ammoType && VH.Data.ammoTypes ? VH.Data.ammoTypes[def.ammoType] : null;
      const poolName = pool ? pool.name : '';
      this.iAmmo.replaceChildren();
      if (w && def && def.kind !== 'melee') {
        if (locked) {
          if (poolName) this.iAmmo.append('Takes ' + poolName);
        } else if (def.kind === 'thrown') {
          this.iAmmo.append(el('b', '', String((w.mag || 0) + (w.ammo || 0))), ' ' + (poolName || 'left'));
        } else {
          const mag = el('b', w.mag ? '' : 'out', String(w.mag || 0));
          this.iAmmo.append(mag, ' / ' + (w.ammo || 0) + (poolName ? ' ' + poolName : ''));
        }
      }
      this.iAmmo.hidden = !this.iAmmo.firstChild;
    }
  }

  WeaponWheel.icon = icon;
  WeaponWheel.statBars = statBars;
  WeaponWheel.ICON_IDS = Object.keys(ICONS);
  VH.WeaponWheel = WeaponWheel;
})();
