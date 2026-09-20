'use strict';
/* CALLHALL — the level catalogue. One entry per place you can stand.
 *
 * A level is a map and everything needed to build one: its size, the rooms and
 * doors punched into it, the counters, the furniture, the points you arrive at
 * and the ways out of it. engine/world.js turns one of these into a map and
 * engine/levels.js decides which one is loaded; nothing here is engine.
 *
 * `links` is the important half. It is the ONLY place that says where a way out
 * goes, so an act says `Levels.take('hatch')` and never names a destination or a
 * coordinate — which is also what lets the loader prefetch what is next door and
 * work out which door to point at for something two levels away.
 *
 *   via   the `use` handler of the object you take: the hatch, the lift, a door
 *   to    the level it lands you on
 *   entry the name of the arrival point over there, from that level's `entries`
 *
 * Entries are in TILES, not pixels, and may be fractional — the loader
 * multiplies by TILE. They have to be, because this file is data and loads
 * before engine/core.js declares TILE at all.
 *
 * Adding a level means adding an entry here and a link pointing at it. Nothing
 * in engine/ needs to learn its name.
 */

const LEVELS = {

  /* ---- THE FOURTH FLOOR ----------------------------------------------
     The building, and the hub: it is pinned in the loader's cache and never
     evicted, because it is the one level with twenty colleagues walking a
     schedule and a queue of phones ringing on it. Its rooms and doors are in
     data/world.js, which is the floor plan proper. */
  office: {
    name: 'CALLHALL Services · Fourth Floor',
    w: 64, h: 44,
    hub: true,
    /* ON THE PREMISES. A fact about the level, like `hub` and `arrive`, and it
       exists because the game outgrew the building. For a year every level in
       the catalogue was a floor of this office and the question never came up:
       the queue was on while the shift was on, because there was nowhere else
       to be. There is now an island out there with a town on it, and a phone
       that goes on counting towards being abandoned while you are on the coast
       road is not a cost, it is a tax on the rest of the game.

       So four levels say they are this company's, and every other one in the
       catalogue says nothing — a Greggs is not your employer's premises and
       neither is a field. Read by Levels.onSite(), and through it by Phones
       and by EventSys. See engine/office.js. */
    site: true,
    /* Floor 4 of 3-5. It is still the hub — the level with twenty people and a
       queue of ringing phones on it — and it is no longer the level you arrive
       on: see `arrive` on LEVELS.ground, which is the lobby the building's own
       directory has said was down there since the day it was written. */
    rooms: ROOM_DEFS,
    doors: DOOR_DEFS,
    /* At the lobby waypoint, not Ron's desk tile: his schedule puts him on the
       door from nine, and a counter he is never behind is worse than none.
       Reception and security share a row — they are two halves of one front
       desk, and a row apart they read as one desk with a step in it. */
    /* The front desk went downstairs with the lobby it was the front of — see
       LEVELS.ground. A landing does not have a counter on it. */
    counters: [],
    /* Visitors' side of the security counter, clear of it by a whole tile: the
       collision box is 26px tall, so a spawn on a tile boundary lands you in the
       tile above — which was inside Ron's desk once the counter became solid. */
    entries: {
      /* Where you step out onto this floor, which is the square in front of the
         thing you stepped out of. `start` and `lobby` are kept, pointing at the
         landing, so that a shift saved before this building had three floors in
         it — and anything else that still asks this level for the way in —
         lands on carpet rather than nowhere. */
      lift: [22.5, 37.5],
      stairs: [19.5, 39.5],
      start: [22.5, 37.5],
      lobby: [22.5, 37.5],
      /* Beside the odd square of carpet, not on it: you climb out of the hatch,
         you do not materialise in it. */
      hatch: [4.5, 12.5],
    },
    links: [
      { via: 'hatch', to: 'basement', entry: 'ladder' },
      /* THE FOUR WAYS OFF THIS FLOOR, and between them they are the reason the
         building is a building rather than a plan.

         The LIFT serves the floors the directory lists; which button is which
         is FLOORS in data/world.js, and Acts.lift() reads that table and this
         one and nothing else. The STAIRS go one floor at a time, up and down,
         which is what stairs do.

         And the FIRE ESCAPE goes straight OUT. It is an external stair and
         always has been: `theView` has said since it was written that from it
         you can see the bins, a wall and a strip of car park, and the only
         thing you can see all three of at once from is a steel stair bolted to
         the back of a building. It is the one stair here that does not stop at
         the ground floor. It is also what the drill walks down — NPCM.drillPlan()
         finds an evacuation by looking for the level ONE DOOR AWAY with an
         assembly point standing on it, and this is that door. */
      { via: 'liftToG', to: 'ground', entry: 'lift' },
      { via: 'liftTo5', to: 'five', entry: 'lift' },
      { via: 'stairsDown', to: 'ground', entry: 'stairs' },
      { via: 'stairsUp', to: 'five', entry: 'stairs' },
      { via: 'fireExit', to: 'outside', entry: 'fireEscape' },
    ],
    furnish() {
      const A = o => this.add(o);
      /* ---- MAIN FLOOR: the sea of desks ---- */
      const rows = [18, 22, 26, 30], cols = [17, 21, 25, 29, 33, 37, 41, 45];
      /* The renderer draws a desk surface and a partition behind each of these,
         so the monitor and phone sit ON something instead of floating on carpet.
         Recorded here rather than inferred from the objects later — this is the
         one place that knows a desk is a monitor, a phone and a chair. */
      this.desks = [];
      let n = 0;
      rows.forEach(y => cols.forEach(x => {
        n++;
        this.desks.push({ x, y, w: 2, mine: (x === 25 && y === 26) });
        const isPlayer = (x === 25 && y === 26);
        A({ x, y, e: '🖥️', name: isPlayer ? 'Your workstation' : 'Workstation ' + n, kind: 'pc', solid: true, use: isPlayer ? 'playerDesk' : 'pc', deskId: 'd' + n });
        A({ x: x + 1, y, e: '☎️', name: isPlayer ? 'Your phone' : 'Desk phone ' + n, kind: 'phone', solid: true, use: 'phone', ringing: false, deskId: 'd' + n });
        /* At YOUR desk the chair carries the desk's act, not the chair's.
           Interact picks the nearest object and the chair is on the tile you
           stand on while the workstation is a tile away — and every desk is
           approached from the aisle BELOW it, which is the chair side. So
           pressing E at the one desk the game navigates you to offered "Use
           Chair" and nothing else, with the workstation reachable only by
           walking round to the far side of it. Sitting down is still there;
           it is a choice inside the desk now, because at your own desk sitting
           down and turning to the screen are the same motion. */
        A({ x, y: y + 1, e: '🪑', name: isPlayer ? 'Your desk' : 'Chair', kind: 'chair',
          solid: false, use: isPlayer ? 'playerDesk' : 'chair', deskId: 'd' + n });
        if (n % 5 === 0) A({ x: x + 1, y: y + 1, e: '🗑️', name: 'Bin', kind: 'bin', solid: false, use: 'bin' });
        if (n % 7 === 3) A({ x: x + 1, y: y + 1, e: '🪴', name: 'Office plant', kind: 'plant', solid: false, use: 'plant' });
      }));
      /* The one printer with a quest, a boss fight and an achievement gets the
         whole copier rather than the desk-printer crop the other three share. Two
         tiles wide; it overhangs the paper tray, which is art, not footprint. */
      A({ x: 48, y: 16, e: '🖨️', name: 'The Printer', kind: 'printer', solid: true, use: 'printer',
        furn: { size: 30, sprite: 'obj.mopier' } });
      A({ x: 47, y: 16, e: '📄', name: 'Paper tray', kind: 'paper', solid: false, use: 'paperTray' });
      A({ x: 15, y: 15, e: '📋', name: 'Noticeboard', kind: 'board', solid: true, use: 'noticeboard' });
      /* Three real pictures: the motivational canon is a mountain range, a lone
         sailboat and a beach, and the joke only lands if you can tell what it is.
         The noticeboards stay procedural — seeded per object, so one kit sprite
         across all of them would hang the same picture seven times. */
      A({ x: 16, y: 15, e: '🖼️', name: 'Motivational poster', kind: 'poster', solid: true, use: 'poster',
        furn: { sprite: 'wall.art.abs' } });
      A({ x: 49, y: 33, e: '🧯', name: 'Fire extinguisher', kind: 'fire', solid: true, use: 'extinguisher' });
      A({ x: 14, y: 33, e: '🚰', name: 'Water cooler', kind: 'cooler', solid: true, use: 'cooler' });
      A({ x: 14, y: 32, e: '🪴', name: 'Sad office plant', kind: 'plant', solid: true, use: 'sadPlant' });
      A({ x: 49, y: 15, e: '📦', name: 'Stationery cupboard', kind: 'cupboard', solid: true, use: 'stationery' });
      /* Nothing has ever been faxed from it and it has never been moved, which
         between them is how a machine ends up on its own little table against a
         wall for eleven years. */
      [[32, 34], [33, 34]].forEach(([x, y]) => A({ x, y, e: '🍽️', name: 'The fax table', kind: 'table', solid: true, use: 'faxTable' }));
      A({ x: 32, y: 34, e: '📠', name: 'The Fax Machine', kind: 'fax', solid: true, use: 'fax' });
      A({ x: 18, y: 34, e: '🗄️', name: 'Filing cabinet', kind: 'cab', solid: true, use: 'filing' });
      A({ x: 40, y: 31, e: '💺', name: 'The Good Chair', kind: 'chair', solid: false, use: 'goodChair' });
      /* On its bracket, where a first aid box is required to be. `box` is the
         kit's stack of cartons now, which here would be a pallet of packing cases
         screwed to the wall, so this one keeps its emoji. */
      A({ x: 20, y: 34, e: '🩹', name: 'First aid box', kind: 'box', solid: true, use: 'firstAid',
        furn: { mount: 'wall', size: 19, sprite: null } });
      A({ x: 24, y: 34, e: '🎂', name: 'The birthday card, circulating', kind: 'card', solid: false, use: 'birthdayCard' });
      A({ x: 28, y: 34, e: '📊', name: 'The wallboard', kind: 'chart', solid: true, use: 'wallboard' });
      A({ x: 36, y: 34, e: '🏆', name: 'Trophy shelf', kind: 'cab', solid: true, use: 'trophies' });
      A({ x: 44, y: 34, e: '🧊', name: 'Air conditioning unit', kind: 'aircon', solid: true, use: 'aircon' });
      A({ x: 46, y: 34, e: '🪟', name: 'The window', kind: 'window', solid: true, use: 'window' });
      A({ x: 17, y: 17, e: '🪧', name: 'HOT DESKING sign', kind: 'sign', solid: false, use: 'hotDesk' });
      A({ x: 36, y: 23, e: '🟥', name: "The red tray on Alan’s desk", kind: 'tray', solid: false, use: 'redTray' });
      A({ x: 42, y: 15, e: '🚪', name: 'Door to nowhere', kind: 'door', solid: true, use: 'doorNowhere' });

      /* ---- BREAK ROOM ---- */
      A({ x: 3, y: 16, e: '☕', name: 'Coffee machine', kind: 'coffee', solid: true, use: 'coffee' });
      A({ x: 4, y: 16, e: '🍵', name: "Marjorie’s mug shelf", kind: 'mugs', solid: true, use: 'mugs' });
      A({ x: 6, y: 16, e: '📻', name: 'Microwave', kind: 'micro', solid: true, use: 'microwave' });
      A({ x: 8, y: 16, e: '🧊', name: 'The Fridge', kind: 'fridge', solid: true, use: 'fridge' });
      A({ x: 11, y: 16, e: '🍫', name: 'Vending machine', kind: 'vend', solid: true, use: 'vending' });
      A({ x: 12, y: 16, e: '🥤', name: 'Vending machine (drinks)', kind: 'vend', solid: true, use: 'vending' });
      [[4, 21], [8, 21], [4, 25], [8, 25]].forEach(([x, y], i) => {
        A({ x, y, e: '🍽️', name: 'Break table', kind: 'table', solid: true, use: 'table' });
        A({ x: x - 1, y, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
        A({ x: x + 1, y, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
        /* On the table, not on the floor beside it. A birthday cake is the most
           table-shaped object in the building. */
        if (i === 1) A({ x, y, e: '🧁', name: 'Someone’s birthday cake', kind: 'cake', solid: false, use: 'cake' });
      });
      A({ x: 2, y: 27, e: '🗑️', name: 'Break room bin', kind: 'bin', solid: false, use: 'breakBin' });
      A({ x: 12, y: 27, e: '📋', name: 'Rota', kind: 'board', solid: true, use: 'rota' });
      A({ x: 2, y: 18, e: '🪴', name: 'Plant (plastic)', kind: 'plant', solid: true, use: 'plant' });
      A({ x: 9, y: 16, e: '🍪', name: 'The Biscuit Tin', kind: 'tin', solid: true, use: 'biscuitTin' });
      A({ x: 5, y: 16, e: '🫖', name: 'The kettle', kind: 'kettle', solid: true, use: 'kettle' });
      A({ x: 7, y: 16, e: '🧽', name: 'The washing up', kind: 'sink', solid: true, use: 'washingUp' });
      A({ x: 2, y: 20, e: '📋', name: 'Passive-aggressive notes', kind: 'board', solid: true, use: 'notes' });
      /* On the kitchen wall, not the side wall it used to be on. The kit draws
         its wall items face-on and there is no side-on television in it, so
         hung at x=12 it was a widescreen set seen edge-on — which the renderer
         now refuses to draw at all. Here it is bracketed on the wall past the
         end of the worktop, which is where a break-room telly actually goes. */
      A({ x: 10, y: 16, e: '📺', name: 'Break room television', kind: 'tv', solid: true, use: 'breakTV' });
      /* Both of these were on the carpet. Hand cream lives on a table and a
         charity pot lives on the end of the counter by the vending machines,
         where you pass it on the way to not putting anything in it. */
      A({ x: 4, y: 25, e: '🧴', name: 'Communal hand cream', kind: 'misc', solid: true, use: 'handCream' });
      A({ x: 10, y: 17, e: '🎣', name: 'The office charity pot', kind: 'misc', solid: false, use: 'charityPot',
        furn: { mount: 'surface', size: 16 } });

      /* ---- TRAINING ROOM ---- */
      A({ x: 7, y: 29, e: '📽️', name: 'Projector', kind: 'proj', solid: true, use: 'projector' });
      for (let i = 0; i < 4; i++) A({ x: 3 + i * 2, y: 30, e: '📜', name: 'Training module ' + (i + 1), kind: 'module', solid: true, use: 'module', mod: i });
      for (let y = 33; y <= 38; y += 2) for (let x = 3; x <= 11; x += 2)
        A({ x, y, e: '🪑', name: 'Training chair', kind: 'chair', solid: false, use: 'trainChair' });
      A({ x: 11, y: 29, e: '📊', name: 'Flipchart', kind: 'flip', solid: true, use: 'flipchart' });
      A({ x: 2, y: 40, e: '📦', name: 'Box of lanyards', kind: 'box', solid: true, use: 'lanyards' });
      A({ x: 12, y: 40, e: '🎧', name: 'The call-listening booth', kind: 'booth', solid: true, use: 'booth' });
      A({ x: 2, y: 29, e: '🖼️', name: 'Poster: THE ESCALATION LADDER', kind: 'poster', solid: true, use: 'ladderPoster' });
      A({ x: 12, y: 33, e: '📚', name: 'The Knowledge Base (printed)', kind: 'book', solid: true, use: 'knowledgeBase' });
      A({ x: 12, y: 36, e: '🎓', name: 'Certificates nobody collected', kind: 'board', solid: true, use: 'certificates' });

      /* ---- ARCHIVE ---- */
      for (let i = 0; i < 9; i++) A({ x: 2 + (i % 5) * 2, y: 4 + Math.floor(i / 5) * 3, e: '📦', name: 'Archive box', kind: 'box', solid: true, use: 'archiveBox', n: i });
      A({ x: 11, y: 4, e: '🖥️', name: 'Ancient computer', kind: 'oldpc', solid: true, use: 'ancientPC' });
      A({ x: 11, y: 6, e: '🗄️', name: 'Locked cabinet', kind: 'cab', solid: true, use: 'lockedCabinet' });
      A({ x: 11, y: 8, e: '🎧', name: 'Pile of dead headsets', kind: 'heap', solid: true, use: 'headsetPile' });
      A({ x: 4, y: 12, e: '🕳️', name: 'Odd square of carpet', kind: 'hatch', solid: false, use: 'hatch' });
      A({ x: 8, y: 13, e: '🖨️', name: 'Printer (deceased)', kind: 'printer', solid: true, use: 'oldPrinter' });
      A({ x: 2, y: 3, e: '🗃️', name: 'Personnel files', kind: 'cab', solid: true, use: 'personnel', furn: { size: 30, sprite: 'obj.bookcase' } });
      /* Not on (12,11). That is the tile immediately inside the archive door, and
         a solid box standing in it sealed the room: Terry, Priya and the keycard
         were all behind six boxes of tinsel, and the only reason nobody noticed
         is that the colleagues who work in there spawn inside. */
      A({ x: 12, y: 13, e: '🎄', name: 'Christmas decorations', kind: 'box', solid: true, use: 'xmas', furn: { sprite: null } });
      A({ x: 2, y: 10, e: '🖼️', name: 'The old company photograph', kind: 'poster', solid: true, use: 'oldPhoto' });
      A({ x: 6, y: 13, e: '📼', name: 'Training videos (VHS)', kind: 'box', solid: true, use: 'vhs', furn: { sprite: null } });
      A({ x: 10, y: 13, e: '🪑', name: 'The chair from 2011', kind: 'chair', solid: false, use: 'oldChair' });
      /* Marketing's, from the away day, and the only three things in this
         building you can point at anybody — see Acts.awayday(). In the middle
         of the room rather than against a wall, because it was put down where
         the coach unloaded it and nobody has moved it since; clear of the
         door, of the hatch and of the nine boxes the archive already has, so
         the room stays a room you can get across. */
      A({ x: 10, y: 10, e: '📦', name: 'The away-day box', kind: 'box', solid: true, use: 'awayday', furn: { sprite: null } });
      A({ x: 12, y: 3, e: '📇', name: 'The card index', kind: 'cab', solid: true, use: 'cardIndex', furn: { size: 30, sprite: 'obj.bookcase' } });

      /* Management used to be furnished here, in nineteen tiles across the
         corridor from the sea of desks. It is LEVELS.five. */

      /* ---- TOILETS ---- */
      for (let i = 0; i < 3; i++) A({ x: 52 + i * 2, y: 15, e: '🚽', name: 'Cubicle ' + (i + 1), kind: 'loo', solid: true, use: 'toilet', n: i });
      /* One vanity, three basins, one mirror over the lot — a row of sinks is
         what a toilet on a floor of forty people has, and a single basin in the
         corner read as somebody's downstairs loo. They share the one act: there
         is nothing to say about the middle one that is not true of all three. */
      for (let i = 0; i < 3; i++)
        A({ x: 51 + i, y: 24, e: '🚰', name: 'Sink', kind: 'sink', solid: true, use: 'sink' });
      /* On the tiled back wall, not over the basins. The kit mirror is drawn
         face-on and NORTH is the only wall face this projection shows you —
         over the vanity it hung on a south wall, which is the back of a wall,
         and it read as a dark smudge. The act only ever says "a work mirror";
         nothing in the writing puts it over a basin. */
      A({ x: 60, y: 15, e: '🪞', name: 'Mirror', kind: 'mirror', solid: true, use: 'mirror' });
      A({ x: 58, y: 24, e: '🖊️', name: 'Graffiti', kind: 'graf', solid: true, use: 'graffiti' });
      A({ x: 61, y: 15, e: '🧻', name: 'Suspiciously large supply cupboard', kind: 'box', solid: true, use: 'looCupboard', furn: { sprite: null } });
      A({ x: 56, y: 24, e: '🖐️', name: 'Hand dryer', kind: 'dryer', solid: true, use: 'handDryer' });
      A({ x: 62, y: 24, e: '🗑️', name: 'The toilets bin', kind: 'bin', solid: false, use: 'bin' });
      /* Hung on the wall it is a door in, not drawn as a stall standing in the
         middle of the floor: it is a room, and it is the only one with a lock
         that works. */
      A({ x: 60, y: 24, e: '🚪', name: 'The accessible toilet', kind: 'loo', solid: true, use: 'accessibleLoo',
        furn: { mount: 'wall', size: 25, art: null } });
      A({ x: 51, y: 21, e: '🪧', name: 'NOW WASH YOUR HANDS', kind: 'sign', solid: true, use: 'washHands' });
      A({ x: 58, y: 15, e: '🚽', name: 'Cubicle 4 (the good one)', kind: 'loo', solid: true, use: 'goodCubicle' });
      /* The listed one and the unlisted one. Between the stalls, on the wall,
         which for once is where the thing genuinely lives. */
      A({ x: 53, y: 15, e: '🧻', name: 'Toilet roll holder', kind: 'roll', solid: false, use: 'poopRoll' });
      A({ x: 57, y: 15, e: '🧻', name: 'Toilet roll holder (the other one)', kind: 'roll', solid: false, use: 'otherRoll' });

      /* ---- IT / SERVER ---- */
      A({ x: 52, y: 27, e: '💽', name: 'Server rack A', kind: 'server', solid: true, use: 'server' });
      A({ x: 54, y: 27, e: '💽', name: 'Server rack B', kind: 'server', solid: true, use: 'server' });
      A({ x: 56, y: 27, e: '🔌', name: 'Cable spaghetti', kind: 'cable', solid: true, use: 'cables' });
      A({ x: 60, y: 27, e: '📟', name: 'Call 000001 — status: ACTIVE', kind: 'oldcall', solid: true, use: 'oldCall' });
      A({ x: 53, y: 31, e: '🖥️', name: "Steve’s monitor", kind: 'pc', solid: true, use: 'stevePC' });
      A({ x: 53, y: 32, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 58, y: 32, e: '📦', name: 'Box of “fixed” laptops', kind: 'box', solid: true, use: 'laptops' });
      A({ x: 51, y: 34, e: '🌡️', name: 'The server room thermostat', kind: 'therm', solid: true, use: 'thermostat' });
      A({ x: 56, y: 31, e: '🧑‍🚀', name: 'Steve’s chair (reclined)', kind: 'chair', solid: false, use: 'steveChair' });
      A({ x: 61, y: 30, e: '🔦', name: 'Emergency torch', kind: 'misc', solid: true, use: 'torch' });
      A({ x: 51, y: 26, e: '💿', name: 'A tower of unlabelled discs', kind: 'box', solid: true, use: 'discs' });

      /* ---- THE LANDING ----
         Seven rows that used to be the ground-floor lobby, drawn on the fourth
         floor because for a year the building had one plan. Reception, the
         visitors' book, the awards cabinet, the sofa, the umbrellas and the
         bike nobody claims are all downstairs now, on LEVELS.ground, where a
         directory that says GROUND FLOOR on it has always put them.

         What is left is what is actually at the bottom of every floor of every
         office building in the country: a lift, a door to the stairs, a cooler,
         a noticeboard, and the bit of carpet everybody stands on while they
         wait. */
      A({ x: 22, y: 36, e: '🛗', name: 'The lift', kind: 'lift', solid: true, use: 'lift' });
      A({ x: 25, y: 36, e: '🔢', name: 'The floor indicator', kind: 'screen', solid: true, use: 'indicator' });
      A({ x: 42, y: 36, e: '📋', name: 'Fire evacuation notice', kind: 'board', solid: true, use: 'fireNotice' });
      A({ x: 35, y: 42, e: '🗑️', name: 'The bin on the landing', kind: 'bin', solid: false, use: 'bin' });
      A({ x: 28, y: 36, e: '📌', name: 'The noticeboard on the landing', kind: 'board', solid: true, use: 'landingBoard' });
      A({ x: 34, y: 36, e: '🚰', name: 'The cooler on the landing', kind: 'cooler', solid: true, use: 'landingCooler' });
      A({ x: 38, y: 38, e: '🪑', name: 'The chair on the landing', kind: 'chair', solid: true, use: 'landingChair' });
      A({ x: 40, y: 38, e: '🪴', name: 'The plant on the landing', kind: 'plant', solid: true, use: 'plant' });
      A({ x: 43, y: 40, e: '📦', name: 'The boxes on the landing', kind: 'box', solid: true, use: 'landingBoxes' });
      A({ x: 21, y: 42, e: '♻️', name: 'The recycling on the landing', kind: 'recycling', solid: true, use: 'landingRecycling' });
      /* THE SIGN IN THE LIFT LOBBY, which is the one piece of wayfinding in
         this building that is correct, and is correct because it is about this
         floor and this floor only. */
      A({ x: 20, y: 36, e: '🪧', name: 'FLOOR 4 · OPERATIONS', kind: 'sign', solid: true, use: 'floorFour' });

      /* ---- CORRIDOR ---- */
      /* THE GOODS LIFT, which is what the second lift on this plan turns out to
         have been all along. There were two of them thirty tiles apart on one
         floor, at opposite ends of a map that was secretly two floors, and the
         one at this end is not a passenger lift and has not run since the
         inspection. Nothing in FLOORS points at it and nothing ever will. */
      A({ x: 16, y: 10, e: '🛗', name: 'The goods lift', kind: 'lift', solid: true, use: 'goodsLift' });
      A({ x: 24, y: 10, e: '🖼️', name: 'Poster: TEAMWORK', kind: 'poster', solid: true, use: 'poster',
        furn: { sprite: 'wall.art.peaks', size: 26 } });
      A({ x: 34, y: 10, e: '🖼️', name: 'Poster: EXCELLENCE', kind: 'poster', solid: true, use: 'poster',
        furn: { sprite: 'wall.art.sail' } });
      A({ x: 44, y: 10, e: '🧯', name: 'Fire extinguisher', kind: 'fire', solid: true, use: 'extinguisher' });
      A({ x: 40, y: 13, e: '🪴', name: 'Corridor plant', kind: 'plant', solid: true, use: 'plant' });
      A({ x: 58, y: 10, e: '📋', name: 'Employee of the Month', kind: 'board', solid: true, use: 'eotm' });
      A({ x: 28, y: 10, e: '🖼️', name: 'The Wall of Values', kind: 'poster', solid: true, use: 'values' });
      A({ x: 30, y: 13, e: '🚰', name: 'Corridor water cooler', kind: 'cooler', solid: true, use: 'cooler' });
      A({ x: 48, y: 10, e: '🗺️', name: 'Floor plan (out of date)', kind: 'board', solid: true, use: 'floorPlan' });
      /* A window has to have somewhere to look. This one was on the corridor's
         south wall, which is the toilets on the other side. The systems suite
         steps two tiles through each window and fails if a room is behind it. */
      A({ x: 29, y: 10, e: '🪟', name: 'Corridor window', kind: 'window', solid: true, use: 'window' });
      A({ x: 19, y: 13, e: '📦', name: 'Boxes that have been there a year', kind: 'box', solid: true, use: 'corridorBoxes' });
      A({ x: 44, y: 13, e: '🪧', name: 'Sign: THIS WAY TO MANAGEMENT', kind: 'sign', solid: true, use: 'wayToMgmt' });
      A({ x: 61, y: 12, e: '🧽', name: "Bev’s trolley", kind: 'trolley', solid: true, use: 'trolley' });

      /* ---- MEETING ROOM 2: where quick words go to become long ones ---- */
      /* Five tiles, not four: the phone, the biscuits and the jug are on the
         table now, and a long table with nothing bare left on it is a table you
         can no longer inspect. */
      [[19, 4], [20, 4], [21, 4], [22, 4], [23, 4]].forEach(([x, y]) => A({ x, y, e: '🍽️', name: 'The long table', kind: 'table', solid: true, use: 'meetTable' }));
      [[20, 3], [22, 3], [20, 5], [22, 5], [24, 4]].forEach(([x, y]) => A({ x, y, e: '🪑', name: 'Meeting chair', kind: 'chair', solid: false, use: 'meetChair' }));
      A({ x: 18, y: 2, e: '🖍️', name: 'The whiteboard', kind: 'board', solid: true, use: 'whiteboard' });
      A({ x: 21, y: 2, e: '📽️', name: 'The HDMI cable', kind: 'cable', solid: true, use: 'hdmi' });
      A({ x: 24, y: 2, e: '🕰️', name: 'Meeting room clock', kind: 'clock', solid: true, use: 'meetClock' });
      A({ x: 27, y: 3, e: '📱', name: 'Room booking screen', kind: 'screen', solid: true, use: 'booking' });
      /* On the long table. A `surface` mount with no worktop under it gets a
         one-tile slab of its own, which is what these three used to be. */
      A({ x: 21, y: 4, e: '📞', name: 'The conference phone', kind: 'confphone', solid: true, use: 'confPhone' });
      A({ x: 22, y: 4, e: '🍪', name: 'Untouched meeting biscuits', kind: 'biscuits', solid: true, use: 'meetBiscuits' });
      A({ x: 19, y: 7, e: '🪑', name: 'The chair facing the wall', kind: 'chair', solid: false, use: 'wallChair' });
      A({ x: 23, y: 4, e: '🫙', name: 'Water jug', kind: 'jug', solid: true, use: 'waterJug' });
      A({ x: 23, y: 7, e: '🗑️', name: 'Meeting room bin', kind: 'bin', solid: false, use: 'bin' });

      /* ---- THE WELLBEING ROOM: procured, photographed, never used ---- */
      A({ x: 33, y: 4, e: '🛋️', name: 'The beanbag', kind: 'beanbag', solid: true, use: 'beanbag' });
      A({ x: 35, y: 4, e: '🧘', name: 'Rolled yoga mat', kind: 'mat', solid: true, use: 'yogaMat' });
      A({ x: 37, y: 4, e: '💆', name: 'Massage chair (out of order)', kind: 'chair', solid: true, use: 'massage' });
      /* The room had nothing to put anything on, so the diffuser and the
         colouring book were on the floor. It has a low table now, in the
         photograph and everything. */
      [[35, 7], [36, 7], [37, 7]].forEach(([x, y]) => A({ x, y, e: '🍽️', name: 'The low table', kind: 'table', solid: true, use: 'lowTable' }));
      A({ x: 37, y: 7, e: '🕯️', name: 'Aromatherapy diffuser', kind: 'diffuser', solid: true, use: 'diffuser' });
      A({ x: 32, y: 2, e: '🖼️', name: 'Poster: BE KIND TO YOURSELF', kind: 'poster', solid: true, use: 'wellPoster',
        furn: { sprite: 'wall.art.beach' } });
      A({ x: 36, y: 2, e: '📊', name: 'The Wellbeing Tracker', kind: 'screen', solid: true, use: 'tracker' });
      A({ x: 40, y: 2, e: '🗳️', name: 'The Suggestion Box', kind: 'box', solid: true, use: 'suggestions' });
      /* A book, not a bookcase: `book` means shelf everywhere else, and this is
         one paperback lying on a table. */
      A({ x: 36, y: 7, e: '🖍️', name: 'Mindfulness colouring book', kind: 'book', solid: false, use: 'colouring',
        furn: { size: 16, sprite: null } });
      A({ x: 38, y: 7, e: '📦', name: 'The Wellbeing Box', kind: 'box', solid: true, use: 'wellBox' });
      A({ x: 41, y: 6, e: '🪴', name: 'Wellbeing plant (dead)', kind: 'plant', solid: true, use: 'deadPlant' });
      A({ x: 31, y: 7, e: '📋', name: 'Wellbeing room usage log', kind: 'board', solid: true, use: 'usageLog' });

      /* ---- FIRE ESCAPE: the only honest room in the building ---- */
      /* On the wall, not free-standing in the middle of the fire escape — it is
         a screwed-up notice, not a sandwich board. */
      A({ x: 16, y: 36, e: '🚭', name: 'NO SMOKING WITHIN 5 METRES sign', kind: 'sign', solid: true, use: 'noSmoking' });
      A({ x: 15, y: 39, e: '🪣', name: 'The bin that is an ashtray', kind: 'bin', solid: true, use: 'ashtray' });
      A({ x: 17, y: 40, e: '🪜', name: 'The step everyone sits on', kind: 'step', solid: false, use: 'theStep' });
      A({ x: 16, y: 42, e: '🌆', name: 'The view', kind: 'view', solid: true, use: 'theView' });
      A({ x: 14, y: 36, e: '🐦', name: 'The pigeon', kind: 'pigeon', solid: false, use: 'pigeon' });
      A({ x: 18, y: 36, e: '📦', name: 'Wet cardboard', kind: 'box', solid: true, use: 'wetCardboard' });
      /* The only extinguisher in the building that is not on its bracket, which
         is the whole joke, so it must not be drawn on one. */
      A({ x: 14, y: 42, e: '🧯', name: 'Fire extinguisher (propping the door)', kind: 'fire', solid: true, use: 'propExtinguisher', furn: { mount: null, size: 24 } });
      /* AND THE STAIR ITSELF, which this room has been about since it was
         written and has never once had in it. Up to the fifth, down to the
         ground, and straight out at the bottom — three links on one object,
         because an external fire escape is one flight that does all three and
         it is the only stair in this building that does.

         At the top of the flight rather than in the middle of the landing: the
         step everybody sits on is at [17,40] and the whole point of that step
         is that it is out of the way of the stair. */
      A({ x: 18, y: 40, e: '🪜', name: 'The fire escape', kind: 'stairs', solid: true, use: 'stairs' });
      /* And the door at the bottom of it, which is its own object and not part
         of the stair, for one reason: NPCM.drillPlan() finds an evacuation by
         looking for an object whose `use` is the link's `via`, and a stair that
         is three links at once cannot be three objects at once. This is the one
         the four hundred of them go down. */
      A({ x: 18, y: 42, e: '🚪', name: 'The fire door', kind: 'exit', solid: false, use: 'fireExit' });
    }
  },

  /* ---- THE GROUND FLOOR -------------------------------------------------
     The lobby. It was drawn on the fourth floor's plan for a year — reception,
     the front doors, the visitors' book and the building's own directory, all
     seven tiles from the sea of desks — and the directory on the wall of it has
     said GROUND FLOOR on it the whole time.

     `arrive: true` is the one new flag and it says this is where a shift
     begins. It used to be a hard-coded 'office' in two places; it is a fact
     about the building and it lives with the building now. You come in through
     those doors, you sign nothing, nobody is on reception, and you find the
     lift. That is the first job the game gives you and until now there was
     nothing to find.

     Not the hub. The hub is the floor with the people on it, and that is still
     the fourth — the one man down here is Ron, and Ron has never been anywhere
     else. */
  ground: {
    name: 'CALLHALL Services · Ground Floor',
    w: 32, h: 20,
    arrive: true,
    /* The lobby is the building. Standing in it while the fourth floor rings is
       a choice about a staircase, not a journey. See `site` on LEVELS.office. */
    site: true,
    /* FOUR ROOMS, NOT ONE HALL.
       The first version of this level was a single thirty by sixteen rectangle
       with the furniture pushed out to the edges of it and a thirteen-tile
       square of nothing in the middle. That is not a lobby. A lobby is a
       sequence: a way in, a desk ACROSS the way in, and a lift lobby behind the
       desk that you are not meant to reach without passing it — which is the
       whole of what a security desk is for and is why Ron is worth putting in
       one. The post room is off it because the post has to go somewhere and
       because a door marked PRIVATE in a public lobby is a thing everybody has
       tried the handle of.

       Rooms are listed with the entrance first so the two openings into it
       belong to the rooms they lead to. */
    rooms: [
      /* Eight rows deep and not ten. At ten it had a ten-tile square of
         nothing in the middle of it, which is the same fault the whole level
         had before it was four rooms: a hall is a route from a door to a desk,
         and the part of it nobody walks through should not be there. */
      { z: 'entrance', r: [2, 10, 29, 17] },
      /* DOWN TO ROW 8, which is the staff side of the front desk and was a row
         of wall. The desk line is row 9 — the counters below say so — so a lift
         lobby that stopped at row 7 left TWO rows of wall between it and the
         hall, and the two gates punched through the first of them opened onto
         the second. Every tile of this room was floor nobody could ever stand
         on unless they arrived out of the lift: the flood fill in the editor
         says two pieces, 115 tiles and 255, and what that is on screen is a
         building whose lift you cannot walk to from its own front door.
         A desk across the way in has a floor behind it. This is that floor. */
      { z: 'liftlob',  r: [2, 2, 21, 8] },
      { z: 'postrm',   r: [24, 2, 29, 7] },
      /* The stairwell, which every floor of this building has in the same
         corner of it, because a stairwell goes up through a building in a
         straight line. */
      { z: 'stairwell', r: [24, 8, 29, 9] }
    ],
    doors: [
      /* The two ways through the desk line: the gate beside reception, and the
         one past security. Both are on row 9, because row 9 IS the desk line —
         the counters are on it and so is everything standing on them — and a
         gate is a gap in the thing it is a gate in. Beside the counters rather
         than inside them: reception runs to x8 and security to x17, and a
         hinged flap through the middle of somebody's desk is not a gate, it is
         a hole in a desk. */
      { x: 9, y: 9, z: 'liftlob', name: 'The gate beside reception' },
      { x: 18, y: 9, z: 'liftlob', name: 'Past security' },
      { x: 26, y: 8, z: 'postrm', name: 'The post room' }
    ],
    counters: [
      { x: 5, y: 9, w: 4, label: 'RECEPTION' },
      { x: 13, y: 9, w: 5, label: 'SECURITY' },
    ],
    /* The stairwell floor is a real flight — see SURFACES.stair. */
    surfaces: [{ s: 'stair', r: [27, 8, 29, 9] }],
    entries: {
      /* The visitors' side of the security counter, clear of it by a whole
         tile: the collision box is 26px tall and a spawn on a tile boundary
         lands you in the tile above, which was inside Ron's desk once the
         counter became solid. */
      start: [15.5, 11.5],
      doors: [15.5, 15.5],
      lift: [6.5, 5.5],
      stairs: [26.5, 9.5],
    },
    links: [
      { via: 'exit', to: 'outside', entry: 'doors' },
      { via: 'liftTo4', to: 'office', entry: 'lift' },
      { via: 'liftTo5', to: 'five', entry: 'lift' },
      { via: 'stairsUp', to: 'office', entry: 'stairs' },
    ],
    furnish() {
      const A = o => this.add(o);
      /* ---- the way in ---- */
      A({ x: 15, y: 18, e: '🚪', name: 'The way out', kind: 'exit', solid: false, use: 'exit' });
      A({ x: 16, y: 18, e: '🚪', name: 'The way out', kind: 'exit', solid: false, use: 'exit' });
      A({ x: 15, y: 16, e: '🧹', name: 'The mat', kind: 'view', solid: false, use: 'theMat', furn: { mount: null, size: 26 } });
      A({ x: 16, y: 16, e: '🧹', name: 'The mat', kind: 'view', solid: false, use: 'theMat', furn: { mount: null, size: 26 } });
      /* ---- the front desk, built into the wall line ---- */
      A({ x: 5, y: 9, e: '📖', name: 'The visitors’ book', kind: 'book', solid: true, use: 'visitorsBook',
        furn: { art: 'ledger', size: 17, sprite: null } });
      A({ x: 6, y: 9, e: '🖥️', name: 'Reception monitor', kind: 'pc', solid: true, use: 'pc' });
      A({ x: 8, y: 9, e: '🛎️', name: 'Reception desk', kind: 'recep', solid: true, use: 'reception' });
      A({ x: 4, y: 9, e: '🪴', name: 'The plant on reception', kind: 'plant', solid: true, use: 'plant' });
      A({ x: 13, y: 9, e: '🖥️', name: 'The security screen', kind: 'screen', solid: true, use: 'securityScreen' });
      A({ x: 17, y: 9, e: '🎫', name: 'The visitor passes', kind: 'card', solid: true, use: 'passes' });
      /* Behind the desk and not in front of it, which is where Ron stands and
         where the empty chair the other half of the day is. */
      A({ x: 10, y: 7, e: '💺', name: 'The chair nobody is in', kind: 'chair', solid: true, use: 'emptyChair' });
      /* ---- the entrance hall: waiting, and the things people leave ---- */
      A({ x: 3, y: 13, e: '🛋️', name: 'Waiting sofa', kind: 'sofa', solid: true, use: 'sofa' });
      A({ x: 6, y: 13, e: '🪴', name: 'Lobby plant (thriving)', kind: 'plant', solid: true, use: 'plant' });
      A({ x: 3, y: 16, e: '☂️', name: 'Lost umbrellas', kind: 'box', solid: true, use: 'umbrellas' });
      A({ x: 8, y: 16, e: '🗑️', name: 'Lobby bin', kind: 'bin', solid: false, use: 'bin' });
      A({ x: 28, y: 16, e: '🚲', name: 'The bike nobody claims', kind: 'bike', solid: true, use: 'bike' });
      A({ x: 25, y: 13, e: '🪑', name: 'The chairs by the window', kind: 'chair', solid: true, use: 'waitingChairs' });
      A({ x: 26, y: 13, e: '🪑', name: 'The chairs by the window', kind: 'chair', solid: true, use: 'waitingChairs' });
      A({ x: 29, y: 12, e: '🪟', name: 'The window onto the car park', kind: 'window', solid: true, use: 'lobbyWindow' });
      /* THE PLAIN WHITE BATTERY CLOCK, and it stays an emoji on purpose. The
         kit's clock is a cased wooden one — see tools/sheets/wood.mjs — and the
         act under this one has described it as “bought in a multipack” since it
         was written. Art that contradicts the writing is worse than no art, so
         this one says no, out loud, rather than by being hung on a wall the
         renderer happens not to draw sprites on. */
      A({ x: 20, y: 18, e: '🕰️', name: 'The clock in the lobby', kind: 'clock', solid: true, use: 'lobbyClock',
        furn: { sprite: null } });
      A({ x: 11, y: 18, e: '🚭', name: 'NO SMOKING sign', kind: 'sign', solid: true, use: 'noSmoking' });
      A({ x: 23, y: 18, e: '📋', name: 'Fire evacuation notice', kind: 'board', solid: true, use: 'fireNotice' });
      /* THE ISLAND. A run of planters down the middle of the hall, which is
         what every lobby of this size in the country has and which is there for
         the reason the troughs on Priorygate are there: to make a route out of
         a space. Walk in and you go left to reception or right to the chairs,
         and either way you have been steered. */
      A({ x: 18, y: 13, e: '🪴', name: 'The planters in the hall', kind: 'trough', solid: true, use: 'hallPlanters' });
      A({ x: 19, y: 13, e: '🪴', name: 'The planters in the hall', kind: 'trough', solid: true, use: 'hallPlanters' });
      A({ x: 20, y: 13, e: '🪴', name: 'The planters in the hall', kind: 'trough', solid: true, use: 'hallPlanters' });
      A({ x: 12, y: 13, e: '🪧', name: 'The A-board', kind: 'sign', solid: true, use: 'aBoard', furn: { mount: null } });
      /* ---- the lift lobby, behind the desk ---- */
      A({ x: 6, y: 2, e: '🛗', name: 'The lift', kind: 'lift', solid: true, use: 'lift' });
      A({ x: 5, y: 2, e: '🔢', name: 'The floor indicator', kind: 'screen', solid: true, use: 'indicator' });
      A({ x: 12, y: 2, e: '🏢', name: 'Building directory', kind: 'board', solid: true, use: 'directory' });
      A({ x: 16, y: 2, e: '🥇', name: 'Award cabinet', kind: 'cab', solid: true, use: 'awards' });
      A({ x: 20, y: 2, e: '🖼️', name: 'The photograph in the lift lobby', kind: 'poster', solid: true, use: 'liftPhoto',
        furn: { sprite: 'wall.art.peaks', size: 26 } });
      A({ x: 3, y: 6, e: '🪴', name: 'The plant in the lift lobby', kind: 'plant', solid: true, use: 'plant' });
      A({ x: 21, y: 6, e: '🗑️', name: 'The bin by the lift', kind: 'bin', solid: false, use: 'bin' });
      /* ---- the post room ---- */
      A({ x: 26, y: 2, e: '📬', name: 'The pigeonholes', kind: 'pigeonholes', solid: true, use: 'postTray' });
      A({ x: 24, y: 4, e: '📦', name: 'The parcels nobody has come down for', kind: 'box', solid: true, use: 'parcels' });
      A({ x: 29, y: 4, e: '🖨️', name: 'The franking machine', kind: 'printer', solid: true, use: 'franking' });
      A({ x: 26, y: 6, e: '📦', name: 'Flattened boxes', kind: 'box', solid: true, use: 'flatBoxes' });
      /* ---- the stairwell ---- */
      A({ x: 25, y: 9, e: '🪜', name: 'The stairs', kind: 'stairs', solid: true, use: 'stairs' });
      A({ x: 24, y: 8, e: '🧯', name: 'Fire extinguisher', kind: 'fire', solid: true, use: 'extinguisher' });
    }
  },

  /* ---- THE FIFTH FLOOR ---------------------------------------------------
     Management. It was nineteen tiles of the fourth floor's own plan with a
     keycard door on it, across a corridor from the sea of desks, and calling it
     the Management FLOOR while it shared a carpet with Operations was the
     single largest thing this building was lying about.

     AND IT IS NOT ONE ROOM EITHER. The first version of this level made the
     same mistake the lobby did one floor down: a single open rectangle with an
     Area Manager's desk standing in the middle of it. Nobody who has an Area
     Manager sits in the open plan. That is what being the Area Manager is FOR.
     So there is a corner office with a door, a boardroom with a door, and the
     bit in between — which is where Colin is, and which is the joke.

     There is no door to this floor from the fourth and there never will be.
     There is a button, and the button is the keycard's job now — see FLOORS in
     data/world.js and Acts.lift(). The stairs get you here too, and always
     will, because a fire escape that can be locked is not a fire escape. What
     the stairs cannot get you is a reason to be standing on this floor when
     somebody asks. */
  five: {
    name: 'CALLHALL Services · Fifth Floor',
    w: 32, h: 18,
    /* Management is still work, whatever it looks like from down there. */
    site: true,
    rooms: [
      { z: 'manage', r: [2, 9, 29, 15] },
      { z: 'corner', r: [2, 2, 10, 7] },
      { z: 'board',  r: [13, 2, 23, 7] },
      { z: 'stairwell', r: [26, 2, 29, 7] }
    ],
    doors: [
      { x: 6, y: 8, z: 'corner', name: 'The Area Manager’s office' },
      { x: 18, y: 8, z: 'board', name: 'The Boardroom' },
      { x: 27, y: 8, z: 'stairwell', name: 'The Stairwell' }
    ],
    surfaces: [{ s: 'stair', r: [27, 2, 29, 7] }],
    entries: { lift: [12.5, 12.5], stairs: [27.5, 8.5] },
    links: [
      { via: 'liftToG', to: 'ground', entry: 'lift' },
      { via: 'liftTo4', to: 'office', entry: 'lift' },
      { via: 'stairsDown', to: 'office', entry: 'stairs' },
    ],
    furnish() {
      const A = o => this.add(o);
      /* ---- the lift lobby, which up here is just the middle of the floor ---- */
      A({ x: 12, y: 9, e: '🛗', name: 'The lift', kind: 'lift', solid: true, use: 'lift' });
      A({ x: 11, y: 9, e: '🔢', name: 'The floor indicator', kind: 'screen', solid: true, use: 'indicator' });
      A({ x: 15, y: 9, e: '🪧', name: 'FLOOR 5 · MANAGEMENT', kind: 'sign', solid: true, use: 'floorFive' });
      A({ x: 9, y: 9, e: '🚰', name: 'The cooler that works', kind: 'cooler', solid: true, use: 'goodCooler' });
      A({ x: 7, y: 9, e: '☕', name: 'The coffee machine up here', kind: 'coffee', solid: true, use: 'goodCoffee' });
      A({ x: 20, y: 9, e: '🖨️', name: 'Management printer (works fine)', kind: 'printer', solid: true, use: 'mgmtPrinter' });
      A({ x: 23, y: 9, e: '🖼️', name: 'The photograph of the building', kind: 'poster', solid: true, use: 'buildingPhoto',
        furn: { sprite: 'wall.art.abs', size: 26 } });
      A({ x: 4, y: 14, e: '🛋️', name: 'The sofa up here', kind: 'sofa', solid: true, use: 'fifthSofa' });
      A({ x: 7, y: 14, e: '🪴', name: 'Enormous healthy plant', kind: 'plant', solid: true, use: 'bigPlant' });
      A({ x: 29, y: 11, e: '🪟', name: 'The window on the fifth floor', kind: 'window', solid: true, use: 'fifthWindow' });
      A({ x: 27, y: 14, e: '🗄️', name: 'The filing cabinet nobody opens', kind: 'cab', solid: true, use: 'fifthCabinet' });
      A({ x: 2, y: 11, e: '🪴', name: 'The other enormous healthy plant', kind: 'plant', solid: true, use: 'bigPlant' });
      /* COLIN. The Synergy Department is four people and a door, and the door is
         the only part of it anybody has ever seen — which is why it is a door
         in the open plan rather than a room, and why it stays a door. */
      A({ x: 24, y: 15, e: '🚪', name: 'Synergy Department', kind: 'door', solid: true, use: 'synergy' });
      A({ x: 24, y: 12, e: '🖥️', name: 'THE SPREADSHEET', kind: 'spread', solid: true, use: 'spreadsheet' });
      A({ x: 17, y: 15, e: '🗑️', name: 'The bin up here', kind: 'bin', solid: false, use: 'bin' });
      /* ---- the corner office ---- */
      A({ x: 5, y: 3, e: '🖥️', name: "Nigel’s desk", kind: 'deskbig', solid: true, use: 'nigelPC' });
      A({ x: 5, y: 5, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 3, y: 2, e: '📊', name: 'Performance charts', kind: 'chart', solid: true, use: 'charts' });
      A({ x: 8, y: 2, e: '📈', name: 'The Q3 graph', kind: 'chart', solid: true, use: 'q3' });
      A({ x: 10, y: 5, e: '🪟', name: 'The window in the corner office', kind: 'window', solid: true, use: 'cornerWindow' });
      A({ x: 2, y: 6, e: '🪴', name: 'The plant in the corner office', kind: 'plant', solid: true, use: 'bigPlant' });
      A({ x: 9, y: 7, e: '🗄️', name: 'The cabinet in the corner office', kind: 'cab', solid: true, use: 'fifthCabinet' });
      /* ---- the boardroom ---- */
      A({ x: 17, y: 4, e: '🍽️', name: 'The boardroom table', kind: 'table', solid: true, use: 'meetingTable' });
      A({ x: 18, y: 4, e: '🍽️', name: 'The boardroom table', kind: 'table', solid: true, use: 'meetingTable' });
      A({ x: 19, y: 4, e: '🍽️', name: 'The boardroom table', kind: 'table', solid: true, use: 'meetingTable' });
      A({ x: 16, y: 4, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 20, y: 4, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 17, y: 3, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 19, y: 3, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 17, y: 6, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 19, y: 6, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 14, y: 2, e: '📺', name: 'The screen in the boardroom', kind: 'tv', solid: true, use: 'boardScreen' });
      A({ x: 22, y: 2, e: '📝', name: 'The whiteboard in the boardroom', kind: 'board', solid: true, use: 'boardWhiteboard' });
      A({ x: 23, y: 6, e: '🪴', name: 'The plant in the boardroom', kind: 'plant', solid: true, use: 'plant' });
      /* ---- the stairwell ---- */
      A({ x: 26, y: 4, e: '🪜', name: 'The stairs', kind: 'stairs', solid: true, use: 'stairs' });
      A({ x: 26, y: 2, e: '🧯', name: 'Fire extinguisher', kind: 'fire', solid: true, use: 'extinguisher' });
    }
  },

  /* ---- UNDER THE ARCHIVE ---------------------------------------------
     The room at the bottom of the hatch. It used to be a corner of the office
     grid — nine tiles by six, walled off from everything, reached by teleport —
     which is why the office's own flood fill had fifty-one tiles it could not
     account for. It is a level now, so the office is a single connected floor
     and this is a separate place that you go DOWN to. */
  basement: {
    name: '████████',
    /* NOT ON THE FLOOR PLAN, and that is a fact about the level rather than
       about the carpet over it. The map draws every way off a level and names
       where it goes, which for one square of carpet in the archive would be
       telling the player the single thing this building is keeping from them.
       So a level may say it is a secret, and name the achievement that stops it
       being one — `a_hatch` is got by lifting the corner, in Acts.hatch(). Read
       by Atlas.waysOut() and by nothing else. */
    secret: 'a_hatch',
    /* Under the archive is still under the building, and that is the point of
       saying so: the one place a player is most tempted to disappear to for
       twenty minutes of a working day is the one place the queue should still
       be able to reach them. See `site` on LEVELS.office. */
    site: true,
    w: 14, h: 12,
    rooms: [{ z: 'secret', r: [2, 2, 11, 9] }],
    doors: [],
    entries: { ladder: [3.5, 4.5] },
    links: [{ via: 'ladderUp', to: 'office', entry: 'hatch' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 3, y: 3, e: '🪜', name: 'Ladder up', kind: 'hatch', solid: false, use: 'ladderUp' });
      A({ x: 8, y: 3, e: '💾', name: 'Server 0', kind: 'server', solid: true, use: 'server0' });
      A({ x: 4, y: 8, e: '☕', name: 'The secret coffee stash', kind: 'coffee', solid: true, use: 'secretCoffee' });
      A({ x: 9, y: 8, e: '📦', name: 'Box marked DO NOT OPEN', kind: 'box', solid: true, use: 'doNotOpen' });
    }
  },

  /* ---- GREGGS ---------------------------------------------------------
     The first place out here you can go INTO that is not this company's own
     building, and the reason it is this one is that the writing got there
     first: the act across the road has described the inside of it — lit like
     an operating theatre, permanently busy, the whole fourth floor's opinion
     of a day decided in here at about half eleven — since before there was a
     street to stand on.

     It is one room, which is what a unit on a parade is. The counter runs
     along the back, the queue is the width of the shop, and buying something
     is the same Shop panel it always was: this level did not replace the shop,
     it put a floor under it.

     Small on purpose. A unit like this is four metres wide and the tables are
     an afterthought by the window, and a level the size of the office would be
     a lie about what is behind that frontage. */
  greggs: {
    name: 'Greggs',
    w: 15, h: 11,
    rooms: [{ z: 'greggs', r: [2, 2, 12, 8] }],
    doors: [],
    entries: { door: [7.5, 7.5] },
    links: [{ via: 'greggsOut', to: 'outside', entry: 'greggs' }],
    furnish() {
      const A = o => this.add(o);
      /* The way back out, on the shop floor by the door. */
      A({ x: 7, y: 8, e: '\ud83d\udeaa', name: 'The door out', kind: 'exit', solid: false, use: 'greggsOut' });
      /* THE COUNTER, along the back wall. Three tiles of it, because the queue
         is the width of the shop and the shop is not wide. */
      A({ x: 5, y: 3, e: '\ud83e\uddfe', name: 'The counter', kind: 'cab', solid: true, use: 'greggsCounter' });
      A({ x: 6, y: 3, e: '\ud83e\uddfe', name: 'The counter', kind: 'cab', solid: true, use: 'greggsCounter' });
      A({ x: 7, y: 3, e: '\ud83d\udcb3', name: 'The till', kind: 'pc', solid: true, use: 'greggsTill' });
      A({ x: 8, y: 3, e: '\ud83e\uddfe', name: 'The counter', kind: 'cab', solid: true, use: 'greggsCounter' });
      /* The hot cabinet, which is the thing everybody is actually looking at. */
      A({ x: 9, y: 3, e: '\ud83e\udd50', name: 'The hot cabinet', kind: 'vend', solid: true, use: 'greggsCabinet' });
      A({ x: 10, y: 3, e: '\ud83e\uddca', name: 'The drinks fridge', kind: 'fridge', solid: true, use: 'greggsFridge' });
      /* The board nobody reads, because everybody already knows. */
      A({ x: 6, y: 2, e: '\ud83d\udccb', name: 'The menu board', kind: 'board', solid: true, use: 'greggsBoard' });
      A({ x: 9, y: 2, e: '\ud83d\udcc4', name: 'The allergen folder', kind: 'poster', solid: true, use: 'greggsAllergens' });
      /* BEHIND THE COUNTER, and the reason it is furnished at all: the strip
         between the counter and the back wall was floor, and it was floor with
         the counter across one side of it and the board and the folder sealing
         the other two — two tiles of room that nothing could ever stand on,
         which is the fault the level check calls an error and the one that
         parks a colleague for ever if anything ever nudges one in there.
         It is the counter's own handler, because that is what it is: you are
         served at a counter and the ovens behind it are part of the counter,
         exactly as the door on the parade and the sign over it are one shop.
         KINDS THAT ARE DRAWN rather than kinds that are the right word: `cab`
         and `book` carry kit sprites, and a back wall of units and shelving is
         what is behind a counter. `micro` and `heap` would have been nearer
         the noun and would have put a loose emoji on the wall — the name says
         what each one is, and nothing out here can be pressed to ask. */
      A({ x: 7, y: 2, e: '\ud83d\udd25', name: 'The ovens', kind: 'cab', solid: true, use: 'greggsCounter' });
      A({ x: 8, y: 2, e: '\ud83e\uddfa', name: 'The racks of trays', kind: 'book', solid: true, use: 'greggsCounter' });
      /* Two tables by the window, which is one more than anybody uses. */
      A({ x: 4, y: 6, e: '\ud83e\ude91', name: 'The table by the window', kind: 'table', solid: true, use: 'greggsTable' });
      A({ x: 4, y: 7, e: '\ud83e\ude91', name: 'The chair nobody has moved', kind: 'chair', solid: true, use: 'greggsTable' });
      A({ x: 11, y: 7, e: '\ud83d\uddd1\ufe0f', name: 'The bin', kind: 'bin', solid: true, use: 'greggsBin' });
      /* The queue barrier, which is a strip of tape on the floor and a sign. */
      /* On the SOUTH wall, because the street is south of this unit — which is
         also why the frontage outside has no sash window on it: you are looking
         at the back of that wall from out there. */
      A({ x: 10, y: 8, e: '\ud83e\ude9f', name: 'The window onto the High Street', kind: 'view', solid: false, use: 'greggsWindow' });
    }
  },

  /* ---- THE BELLHAVEN ARMS ---------------------------------------------
     Etched glass, a carpet that has seen things, and a chalkboard offering a
     pie and a pint for the price of a pie and a pint in 2014 — all of which
     the act across the road has said for as long as there has been a road. It
     is in here now.

     The bar runs along the back and the room is deeper than it is wide, which
     is what a pub on a parade is: a frontage the width of a shop and a room
     that goes back further than you expect. */
  pub: {
    name: 'The Bellhaven Arms',
    w: 15, h: 13,
    rooms: [{ z: 'pub', r: [2, 2, 12, 10] }],
    doors: [],
    entries: { door: [7.5, 9.5] },
    links: [{ via: 'pubOut', to: 'outside', entry: 'pub' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 7, y: 10, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'pubOut' });
      /* THE BAR. Four tiles of it, the pumps at the near end where a person
         stands, and the optics on the wall behind. */
      A({ x: 5, y: 3, e: '🍺', name: 'The bar', kind: 'cab', solid: true, use: 'pubBar' });
      A({ x: 6, y: 3, e: '🍺', name: 'The bar', kind: 'cab', solid: true, use: 'pubBar' });
      A({ x: 7, y: 3, e: '🍺', name: 'The pumps', kind: 'cab', solid: true, use: 'pubBar' });
      A({ x: 8, y: 3, e: '🍺', name: 'The bar', kind: 'cab', solid: true, use: 'pubBar' });
      A({ x: 10, y: 3, e: '🥃', name: 'The optics', kind: 'book', solid: true, use: 'pubOptics' });
      A({ x: 4, y: 2, e: '📝', name: 'The chalkboard', kind: 'board', solid: true, use: 'pubBoard' });
      A({ x: 9, y: 2, e: '📺', name: 'The telly', kind: 'tv', solid: true, use: 'pubTelly' });
      /* THE BACK BAR, for the Greggs' reason: the strip between the bar and
         the wall was four tiles of floor with the bar along one side and the
         chalkboard and the telly sealing the ends, so nobody could ever stand
         on any of it. It is the bar's own handler — the shelf behind a bar is
         the bar, and there are six colleagues in here at ten past five. */
      A({ x: 5, y: 2, e: '🧼', name: 'The glass washer', kind: 'cab', solid: true, use: 'pubBar' });
      A({ x: 6, y: 2, e: '🍾', name: 'The shelf of bottles', kind: 'book', solid: true, use: 'pubBar' });
      A({ x: 7, y: 2, e: '💳', name: 'The till', kind: 'cab', solid: true, use: 'pubBar' });
      A({ x: 8, y: 2, e: '🥔', name: 'The crisps on the card', kind: 'book', solid: true, use: 'pubBar' });
      /* The quiz corner, which is where the quiz is on a Tuesday and where
         nothing at all happens for the other six days. */
      A({ x: 4, y: 6, e: '🪑', name: 'A table', kind: 'table', solid: true, use: 'pubTable' });
      /* `solid: false`, for the reason the nail bar's three are: a chair nobody
         can stand on is a chair nobody can sit in, and anybody standing still
         on a chair tile is drawn sitting in it. There are people in here at ten
         past five now — see `out:` in data/npcs.js — and a pub in which all six
         of them are stood up is a bar, not a pub. */
      A({ x: 4, y: 7, e: '🪑', name: 'A chair', kind: 'chair', solid: false, use: 'pubTable' });
      A({ x: 11, y: 6, e: '🛋️', name: 'The bench along the wall', kind: 'sofa', solid: true, use: 'pubBench' });
      A({ x: 11, y: 9, e: '🎰', name: 'The fruit machine', kind: 'vend', solid: true, use: 'pubFruit' });
      A({ x: 3, y: 10, e: '🪟', name: 'The etched glass', kind: 'view', solid: false, use: 'pubGlass' });
    }
  },

  /* ---- BELLHAVEN BOOKMAKERS -------------------------------------------
     "The warmest building on this street and the only one with chairs you can
     sit in without buying anything, which is a fact about the high street and
     not about gambling." That sentence is the whole brief for this room, and
     the row of chairs facing the screens is the whole of the design. */
  bookies: {
    name: 'Bellhaven Bookmakers',
    w: 14, h: 11,
    rooms: [{ z: 'bookies', r: [2, 2, 11, 8] }],
    doors: [],
    entries: { door: [6.5, 7.5] },
    links: [{ via: 'bookiesOut', to: 'outside', entry: 'bookies' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 6, y: 8, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'bookiesOut' });
      /* THE SCREENS, along the wall, one of them Wolverhampton. */
      A({ x: 4, y: 2, e: '📺', name: 'The screens', kind: 'screen', solid: true, use: 'bookiesScreens' });
      A({ x: 6, y: 2, e: '📺', name: 'The screens', kind: 'screen', solid: true, use: 'bookiesScreens' });
      A({ x: 8, y: 2, e: '📺', name: 'Wolverhampton', kind: 'screen', solid: true, use: 'bookiesWolves' });
      /* THE CHAIRS. The point of the room, and `solid: false` is what finally
         makes them it: "the only building on this street with chairs you can
         sit in without buying anything" was, until this, four chairs nobody
         could sit in, including the player. They face the screens because a
         seated sprite takes its facing from the chair and not from the person
         — see R.drawNPC — and everybody in here is facing the screens. */
      for (let i = 0; i < 4; i++)
        A({ x: 4 + i, y: 5, e: '🪑', name: 'The chairs', kind: 'chair', solid: false, face: 0, use: 'bookiesChairs' });
      A({ x: 10, y: 3, e: '🧾', name: 'The counter', kind: 'cab', solid: true, use: 'bookiesCounter' });
      A({ x: 10, y: 4, e: '🖊️', name: 'The slips and the pens on strings', kind: 'paper', solid: true, use: 'bookiesSlips' });
      A({ x: 3, y: 7, e: '🗑️', name: 'The bin of torn slips', kind: 'bin', solid: true, use: 'bookiesBin' });
    }
  },

  /* ---- THE LAUNDERETTE ------------------------------------------------
     "Eight machines, four dryers, a bench, and a woman who has run it for
     nineteen years and knows more about this street than the council does."
     Eight machines, four dryers, a bench, and her. The act wrote the floor
     plan and this only lays it out. */
  laund: {
    name: 'The launderette',
    w: 16, h: 11,
    rooms: [{ z: 'laund', r: [2, 2, 13, 8] }],
    doors: [],
    entries: { door: [8.5, 7.5] },
    links: [{ via: 'laundOut', to: 'outside', entry: 'laund' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 8, y: 8, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'laundOut' });
      /* EIGHT MACHINES along the back wall. */
      for (let i = 0; i < 8; i++) {
        A({ x: 3 + i, y: 3, e: '🧺', name: 'A washing machine', kind: 'vend', solid: true, use: 'laundWasher' });
      }
      /* FOUR DRYERS down the side. */
      for (let i = 0; i < 4; i++) {
        A({ x: 12, y: 3 + i, e: '🌀', name: 'A dryer', kind: 'fridge', solid: true, use: 'laundDryer' });
      }
      /* THE BENCH, and her. */
      A({ x: 5, y: 6, e: '🛋️', name: 'The bench', kind: 'sofa', solid: true, use: 'laundBench' });
      A({ x: 9, y: 6, e: '🧾', name: 'The counter', kind: 'cab', solid: true, use: 'laundCounter' });
      A({ x: 3, y: 2, e: '📋', name: 'The price list', kind: 'board', solid: true, use: 'laundPrices' });
      A({ x: 11, y: 7, e: '🧺', name: 'The service washes', kind: 'box', solid: true, use: 'laundService' });
    }
  },

  /* ---- THE POST OFFICE ------------------------------------------------
     "A counter at the back of a shop that also sells greetings cards,
     stationery and, for reasons lost to everyone, kites. The queue is four
     people long at any hour of any day."

     So the room is built around the queue, which is the only object in this
     game that is four objects. The counter is at the BACK, past all the
     things you did not come in for, which is not an accident and is the whole
     design of every post office in the country. */
  postoff: {
    name: 'The post office',
    w: 15, h: 13,
    rooms: [{ z: 'postoff', r: [2, 2, 12, 10] }],
    doors: [],
    entries: { door: [7.5, 9.5] },
    links: [{ via: 'postoffOut', to: 'outside', entry: 'postoff' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 7, y: 10, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'postoffOut' });
      /* The counter, behind glass, at the back. */
      A({ x: 6, y: 3, e: '🏤', name: 'The counter', kind: 'cab', solid: true, use: 'postCounter' });
      A({ x: 7, y: 3, e: '🏤', name: 'The counter', kind: 'cab', solid: true, use: 'postCounter' });
      A({ x: 8, y: 3, e: '⚖️', name: 'The scales', kind: 'pc', solid: true, use: 'postScales' });
      A({ x: 5, y: 2, e: '🕐', name: 'The notice about 1 till 2', kind: 'poster', solid: true, use: 'postNotice' });
      /* THE QUEUE. Four of them, always. */
      /* FOUR PEOPLE, AND `mount: null` ON ALL FOUR. The kind is borrowed for
         its size — there is no FURN entry for a person, because a person is
         normally an NPC and these four are scenery with an act each — and
         every kind at that size hangs on a wall. A wall-mounted thing with no
         wall behind it is dropped to the floor, silently, which is the right
         picture arrived at by accident: it draws as somebody standing in a
         queue either way, and now it SAYS so. Same override, same reason, as
         the fire extinguisher propping the fire door. */
      const Q4 = { mount: null };
      A({ x: 7, y: 5, e: '🧍', name: 'First in the queue', kind: 'view', solid: true, use: 'postQueue1', furn: Q4 });
      A({ x: 7, y: 6, e: '🧍', name: 'Second in the queue', kind: 'view', solid: true, use: 'postQueue2', furn: Q4 });
      A({ x: 7, y: 7, e: '🧍', name: 'Third in the queue', kind: 'view', solid: true, use: 'postQueue3', furn: Q4 });
      A({ x: 7, y: 8, e: '🧍', name: 'Fourth in the queue', kind: 'view', solid: true, use: 'postQueue4', furn: Q4 });
      /* Everything you did not come in for. */
      A({ x: 3, y: 5, e: '💌', name: 'The card carousel', kind: 'book', solid: true, use: 'postCards' });
      A({ x: 3, y: 7, e: '📎', name: 'The stationery', kind: 'box', solid: true, use: 'postStationery' });
      A({ x: 11, y: 5, e: '🪁', name: 'The kites', kind: 'box', solid: true, use: 'postKites' });
      A({ x: 11, y: 7, e: '📦', name: 'The parcel shelf', kind: 'cab', solid: true, use: 'postParcels' });
      A({ x: 4, y: 9, e: '🖊️', name: 'The pen on a chain', kind: 'paper', solid: true, use: 'postPen' });
    }
  },

  /* ---- THE CHARITY SHOP -----------------------------------------------
     "Books, a shelf of mugs, and a rail of work shirts that have all been
     worn to the same job. Marjorie donated fourteen mugs here in 2016 and has
     bought four of them back since, twice knowingly."

     The shelf of mugs is therefore load-bearing and is placed where you cannot
     miss it. */
  charity: {
    name: 'The charity shop',
    w: 15, h: 12,
    rooms: [{ z: 'charity', r: [2, 2, 12, 9] }],
    doors: [],
    entries: { door: [7.5, 8.5] },
    links: [{ via: 'charityOut', to: 'outside', entry: 'charity' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 7, y: 9, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'charityOut' });
      A({ x: 6, y: 3, e: '🧾', name: 'The till', kind: 'cab', solid: true, use: 'charityTill' });
      /* Iris stands at (7,3) and she is a PERSON — see data/npcs.js. She was
         an emoji on a solid object here until the roster stopped being twenty
         one people long. */
      A({ x: 4, y: 2, e: '🚑', name: 'The air ambulance poster', kind: 'poster', solid: true, use: 'charityPoster' });
      /* THE SHELF OF MUGS, which is the reason this room exists. */
      A({ x: 10, y: 3, e: '☕', name: 'The shelf of mugs', kind: 'book', solid: true, use: 'charityMugs' });
      A({ x: 3, y: 5, e: '👔', name: 'The rail of work shirts', kind: 'cupboard', solid: true, use: 'charityShirts' });
      A({ x: 3, y: 7, e: '📚', name: 'The book table', kind: 'table', solid: true, use: 'charityBooks' });
      A({ x: 10, y: 6, e: '🧩', name: 'The jigsaw', kind: 'box', solid: true, use: 'charityJigsaw' });
      /* A heap of tellies in the middle of the shop rather than one on a
         bracket, so it does not want the wall its kind normally wants. */
      A({ x: 10, y: 8, e: '📺', name: 'The electricals corner', kind: 'tv', solid: true, use: 'charityElectrical', furn: { mount: null } });
      A({ x: 5, y: 6, e: '🕯️', name: 'The bric-a-brac', kind: 'misc', solid: true, use: 'charityBricabrac' });
    }
  },

  /* ---- BELLHAVEN KEBAB ------------------------------------------------
     "Shut. It is nine in the morning and this is a building that has never
     once been open at nine in the morning."

     Which is the joke, so the door only opens after five — see the act. This
     room exists to be a room you have only ever seen at night, and it is the
     only interior in the game you cannot get into during the shift. */
  kebab: {
    name: 'Bellhaven Kebab',
    w: 14, h: 11,
    rooms: [{ z: 'kebab', r: [2, 2, 11, 8] }],
    doors: [],
    entries: { door: [6.5, 7.5] },
    links: [{ via: 'kebabOut', to: 'outside', entry: 'kebab' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 6, y: 8, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'kebabOut' });
      A({ x: 5, y: 3, e: '🥙', name: 'The vertical spit', kind: 'vend', solid: true, use: 'kebabSpit' });
      A({ x: 6, y: 3, e: '🥗', name: 'The salad tray', kind: 'cab', solid: true, use: 'kebabSalad' });
      A({ x: 7, y: 3, e: '🧾', name: 'The counter', kind: 'cab', solid: true, use: 'kebabCounter' });
      A({ x: 9, y: 3, e: '🥤', name: 'The drinks fridge', kind: 'fridge', solid: true, use: 'kebabFridge' });
      A({ x: 4, y: 2, e: '🖼️', name: 'The photograph', kind: 'poster', solid: true, use: 'kebabPhoto' });
      A({ x: 9, y: 2, e: '🪧', name: 'UNDER NEW MANAGEMENT', kind: 'sign', solid: true, use: 'kebabSign' });
      /* `solid: false` since Nigel started sitting on one of them after four —
         see `out:` in data/npcs.js. The name is now, gloriously, wrong. */
      A({ x: 4, y: 6, e: '🪑', name: 'The two stools nobody sits on', kind: 'chair', solid: false, use: 'kebabStools' });
      A({ x: 10, y: 6, e: '🗑️', name: 'The bin by the door', kind: 'bin', solid: true, use: 'kebabBin' });
    }
  },

  /* ---- VAPOUR TRAIL ---------------------------------------------------
     "A vape shop that was a phone repair shop, which was a nail bar, which was
     a bakery that everybody still gives directions by."

     Nothing in here was ever taken out. The bakery's tiling is under the
     vinyl, the nail bar's basin is still plumbed into the wall, the phone
     repair counter is the counter, and the current business is a wall of
     bottles in front of all of it. A unit on a parade is a sediment. */
  vapour: {
    name: 'Vapour Trail',
    w: 14, h: 11,
    rooms: [{ z: 'vapour', r: [2, 2, 11, 8] }],
    doors: [],
    entries: { door: [6.5, 7.5] },
    links: [{ via: 'vapourOut', to: 'outside', entry: 'vapour' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 6, y: 8, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'vapourOut' });
      A({ x: 6, y: 3, e: '🧾', name: 'The counter', kind: 'cab', solid: true, use: 'vapourCounter' });
      A({ x: 7, y: 3, e: '🔧', name: 'The screwdriver mat', kind: 'paper', solid: true, use: 'vapourMat' });
      A({ x: 4, y: 2, e: '🧴', name: 'The wall of liquids', kind: 'chart', solid: true, use: 'vapourLiquids' });
      A({ x: 9, y: 2, e: '📱', name: 'The old sign showing through', kind: 'poster', solid: true, use: 'vapourGhostSign' });
      A({ x: 10, y: 4, e: '💅', name: 'The nail bar basin', kind: 'sink', solid: true, use: 'vapourBasin' });
      A({ x: 3, y: 6, e: '🍞', name: 'The bakery tiling', kind: 'misc', solid: false, use: 'vapourTiles' });
      A({ x: 9, y: 6, e: '🪑', name: 'The chair from the nail bar', kind: 'chair', solid: true, use: 'vapourChair' });
      /* The one thing in this game that is not anywhere: it is the middle of
         the room, so it hangs on nothing on purpose. */
      A({ x: 6, y: 6, e: '💨', name: 'The smell', kind: 'view', solid: false, use: 'vapourSmell', furn: { mount: null } });
    }
  },

  /* ---- NAILED IT ------------------------------------------------------
     "Half the fourth floor gets their lunch-break gel done in here. The other
     half pretends not to know that." The act outside has been saying that for
     as long as there has been a High Street, and this room is that sentence
     with a floor under it.

     THE SHAPE IS THE JOKE. Every other unit on this street is a counter you
     walk up to. This one is a corridor you walk DOWN, three stations along one
     wall, and there is no way to be in it without going past all three — which
     is the entire mechanism: you cannot get to the back of a nail bar without
     being seen by everybody already in it, and neither can they.

     Who is in the chairs is not decoration. It is Karen, who is in
     back-to-backs; Sarah, who is at her desk; and Gary, who has been leaving
     since 2022. Each of them has an act that changes once they know you have
     seen them, and once all three know, the room has a state and so do you.
     See nailsKaren and its two neighbours in data/acts.js. */
  nails: {
    name: 'Nailed It',
    w: 17, h: 9,
    rooms: [{ z: 'nails', r: [2, 2, 14, 6] }],
    doors: [],
    entries: { door: [8.5, 5.5] },
    links: [{ via: 'nailsOut', to: 'outside', entry: 'nails' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 8, y: 6, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'nailsOut' });
      /* The wall, which is entirely price list and evidence. */
      A({ x: 3, y: 2, e: '🎨', name: 'The wall of colours', kind: 'chart', solid: true, use: 'nailsColours' });
      A({ x: 6, y: 2, e: '📋', name: 'The price list', kind: 'poster', solid: true, use: 'nailsPrices' });
      A({ x: 9, y: 2, e: '📷', name: 'The photograph of a hand', kind: 'poster', solid: true, use: 'nailsPhoto' });
      A({ x: 12, y: 2, e: '📖', name: 'The appointment book', kind: 'board', solid: true, use: 'nailsBook' });
      /* THE THREE STATIONS, and they are CHAIRS rather than people, because the
         people are people: Karen, Sarah and Gary come here at lunch under
         `out:` in data/npcs.js and stand on these three tiles, and anybody
         standing still on a `chair` tile is drawn sitting in it — see
         Sprites.seatedAt(), which the fourth floor has used for its own desks
         since the day it had chairs.

         `solid: false` for the same reason the office's are: a chair nobody
         can stand on is a chair nobody can sit in. Between one and two they
         are three empty chairs, and the act says so. */
      /* `face: 2` — these three point INTO the room. A chair with no `face`
         is a desk chair pointing at a monitor, which is every other chair in
         this game; see the note in R.drawNPC. */
      A({ x: 4, y: 3, e: '🪑', name: 'The first chair', kind: 'chair', solid: false, face: 2, use: 'nailsChair' });
      A({ x: 7, y: 3, e: '🪑', name: 'The second chair', kind: 'chair', solid: false, face: 2, use: 'nailsChair' });
      A({ x: 10, y: 3, e: '🪑', name: 'The third chair', kind: 'chair', solid: false, face: 2, use: 'nailsChair' });
      A({ x: 13, y: 3, e: '🚰', name: 'The basin', kind: 'sink', solid: true, use: 'nailsBasin' });
      /* And the side of the room you are meant to wait on and nobody does. */
      /* Nothing on tile (8,5): that is the tile you arrive on, and a solid
         object standing on an arrival point is a room you spawn inside the
         furniture of. */
      A({ x: 4, y: 5, e: '🛋️', name: 'The bench you wait on', kind: 'sofa', solid: true, use: 'nailsBench' });
      A({ x: 6, y: 5, e: '📰', name: 'The magazines', kind: 'misc', solid: true, use: 'nailsMags' });
      A({ x: 11, y: 5, e: '🫙', name: 'The tip jar', kind: 'misc', solid: true, use: 'nailsTips' });
    }
  },

  /* ---- BELLHAVEN TYRE & EXHAUST ---------------------------------------
     The one interior on this map with NO COUNTER in it, and that is not an
     omission. A tyre bay is not a shop: it is a volume you reverse a car into,
     and the business is conducted standing up, next to the car, by somebody
     who is looking at the car and not at you. So this room is mostly floor —
     more empty tile than any other interior in the game — with the trade round
     the edges of it and the only thing worth looking at four feet above your
     head.

     THE OBJECT AT THE MIDDLE IS THE POOL CAR. It is up on the ramp, it is not
     yours, you cannot drive it, and the eleven invoices on the spike by the
     door are for this exact vehicle and none of them has been paid. That is
     the whole of what this room is about, and it is the one thing on this
     street the fourth floor owes rather than buys. */
  tyre: {
    name: 'Bellhaven Tyre & Exhaust',
    w: 19, h: 12,
    rooms: [{ z: 'tyre', r: [2, 2, 16, 9] }],
    doors: [],
    entries: { door: [9.5, 8.5] },
    links: [{ via: 'tyreOut', to: 'outside', entry: 'tyre' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 9, y: 9, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'tyreOut' });
      A({ x: 4, y: 2, e: '📊', name: 'The chart of tyre pressures', kind: 'chart', solid: true, use: 'tyreChart' });
      A({ x: 8, y: 2, e: '📅', name: 'The calendar from the parts supplier', kind: 'poster', solid: true, use: 'tyreCalendar' });
      A({ x: 13, y: 2, e: '📜', name: 'The certificates', kind: 'board', solid: true, use: 'tyreCerts' });
      /* THE RADIO. One station since the unit opened, and the only object in
         this game that says something different every single time and never
         says the same KIND of thing twice running — see tyreRadio, which walks
         a cycle rather than picking at random. */
      A({ x: 16, y: 3, e: '📻', name: 'The radio', kind: 'misc', solid: true, use: 'tyreRadio' });
      /* The stock, which is the walls. */
      A({ x: 3, y: 4, e: '🛞', name: 'The part-worns', kind: 'tyres', solid: true, use: 'tyrePartWorns' });
      A({ x: 3, y: 6, e: '🛞', name: 'The part-worns', kind: 'tyres', solid: true, use: 'tyrePartWorns' });
      /* The middle of the room, and the ceiling of it. */
      A({ x: 9, y: 4, e: '🚗', name: 'The pool car, up on the ramp', kind: 'lift', solid: true, use: 'tyreRamp' });
      /* By the door: the entire administrative apparatus of this business. */
      A({ x: 16, y: 5, e: '🧾', name: 'The invoice spike', kind: 'paper', solid: true, use: 'tyreSpike' });
      A({ x: 13, y: 7, e: '🌬️', name: 'The compressor', kind: 'server', solid: true, use: 'tyreCompressor' });
      A({ x: 6, y: 7, e: '📦', name: 'The bag of granules', kind: 'box', solid: true, use: 'tyreGranules' });
      A({ x: 15, y: 7, e: '🛢️', name: 'The oil drum', kind: 'bin', solid: true, use: 'tyreDrum' });
    }
  },

  /* ---- UNIT 6 ---------------------------------------------------------
     "The sign is always vinyl and always new. The unit is always the unit."

     There is nobody in here. That is the first thing about it and it is
     deliberate: every other interior in this game has somebody behind
     something, and this one has a folding table with a card reader taped to
     it. Whoever runs it is not here and will not be here, and the door was
     open.

     THE ROOM IS LAID OUT IN STRATA, back to front, and reading it from the
     door is reading it in reverse chronological order. The near end is the
     current business. The middle is the one before. The far end is the one
     before that. Nothing has ever been taken out of this unit; things have
     only ever been pushed further back into it, and the back wall is 2011. */
  unitsix: {
    name: 'Unit 6',
    w: 17, h: 14,
    rooms: [{ z: 'unitsix', r: [2, 2, 14, 11] }],
    doors: [],
    entries: { door: [8.5, 10.5] },
    links: [{ via: 'sixOut', to: 'outside', entry: 'unitsix' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 8, y: 11, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'sixOut' });
      /* The back wall carries all four businesses at once, left to right, and
         none of them has ever taken anything down. */
      A({ x: 3, y: 2, e: '🪟', name: 'The conservatory sample panel', kind: 'window', solid: true, use: 'sixConservatory' });
      A({ x: 6, y: 2, e: '📄', name: 'A laminated sheet', kind: 'poster', solid: true, use: 'sixLaminate' });
      A({ x: 9, y: 2, e: '🚪', name: 'The fire exit sign', kind: 'chart', solid: true, use: 'sixFireExit' });
      A({ x: 12, y: 2, e: '🗓️', name: 'The class timetable', kind: 'board', solid: true, use: 'sixTimetable' });
      /* 2011. Conservatories. */
      A({ x: 4, y: 4, e: '📦', name: 'The offcuts of double glazing', kind: 'box', solid: true, use: 'sixGlazing' });
      A({ x: 12, y: 4, e: '📕', name: 'The brochure stand', kind: 'flip', solid: true, use: 'sixBrochures' });
      /* 2017. Soft play. */
      A({ x: 5, y: 6, e: '🔵', name: 'One ball', kind: 'card', solid: false, use: 'sixBall' });
      A({ x: 11, y: 6, e: '🥅', name: 'The netting', kind: 'barrier', solid: true, use: 'sixNetting' });
      /* Now. A gym, allegedly. */
      A({ x: 3, y: 9, e: '🏋️', name: 'A dumbbell, 4kg', kind: 'card', solid: false, use: 'sixDumbbell' });
      A({ x: 5, y: 9, e: '🚣', name: 'The rowing machine', kind: 'bike', solid: true, use: 'sixRower' });
      A({ x: 11, y: 9, e: '🪑', name: 'The folding table', kind: 'table', solid: true, use: 'sixTable' });
      A({ x: 11, y: 10, e: '📋', name: 'The signing-in sheet', kind: 'paper', solid: true, use: 'sixSheet' });
    }
  },

  /* ---- THE WORKING MEN'S CLUB -----------------------------------------
     The biggest room in the game, and it is empty, because it is the middle of
     a Tuesday and this room does not start until seven.

     WHAT IT IS FOR is reading. Every other interior gives you people, or a
     transaction, or a clock. This one gives you a wall, and the wall is the
     minutes of a committee that has been the same six people since before the
     building you work in was built — the fixture list, the honours board, the
     banned list with one name on it, the raffle, and item 7, which has been
     carried forward to the next meeting since 2019.

     You cannot get in without a member signing you in. That gate is on the
     street, in Acts.club, and it is satisfied by naming absolutely anybody,
     because the doorman is not checking. The book by his elbow is the punch
     line and it is in here. */
  club: {
    name: 'The Working Men’s Club',
    w: 24, h: 17,
    rooms: [{ z: 'club', r: [2, 2, 21, 14] }],
    doors: [],
    entries: { door: [11.5, 13.5] },
    links: [{ via: 'clubOut', to: 'outside', entry: 'club' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 11, y: 14, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'clubOut' });
      /* THE WALL. Left to right, and in the order a committee would have
         wanted them: what we decided, who we are playing, who has won, who is
         barred, what we are raffling, and the meter. */
      A({ x: 4, y: 2, e: '📌', name: 'The committee minutes', kind: 'board', solid: true, use: 'clubMinutes' });
      A({ x: 7, y: 2, e: '🗓️', name: 'The fixture list', kind: 'chart', solid: true, use: 'clubFixtures' });
      A({ x: 10, y: 2, e: '🏆', name: 'The honours board', kind: 'poster', solid: true, use: 'clubHonours' });
      A({ x: 13, y: 2, e: '🚫', name: 'The banned list', kind: 'poster', solid: true, use: 'clubBanned' });
      A({ x: 16, y: 2, e: '🎟️', name: 'The raffle', kind: 'board', solid: true, use: 'clubRaffle' });
      A({ x: 19, y: 2, e: '🎛️', name: 'The meter for the light over table two', kind: 'therm', solid: true, use: 'clubMeter' });
      /* THE TABLES. Two tiles each, because a snooker table is not a square
         and one tile of it reads as a card table. */
      A({ x: 6, y: 6, e: '🎱', name: 'Table one', kind: 'table', solid: true, use: 'clubTableOne' });
      A({ x: 7, y: 6, e: '🎱', name: 'Table one', kind: 'table', solid: true, use: 'clubTableOne' });
      A({ x: 14, y: 6, e: '🎱', name: 'Table two', kind: 'table', solid: true, use: 'clubTableTwo' });
      A({ x: 15, y: 6, e: '🎱', name: 'Table two', kind: 'table', solid: true, use: 'clubTableTwo' });
      /* THE BAR, which is shut, which does not stop anybody. */
      A({ x: 3, y: 9, e: '🍺', name: 'The bar', kind: 'cab', solid: true, use: 'clubBar' });
      A({ x: 4, y: 9, e: '🍺', name: 'The bar', kind: 'cab', solid: true, use: 'clubBar' });
      A({ x: 5, y: 9, e: '💷', name: 'The till, which is a drawer', kind: 'pc', solid: true, use: 'clubTill' });
      /* Stan is at (7,9), with his back to the room, and Norman is at (12,13)
         beside his booth. Both are people now rather than furniture. */
      /* `solid: false`, same as the bookmaker's row and the pub's one: nobody
         moves them and, from half seven, somebody is sitting in one. */
      A({ x: 4, y: 11, e: '🪑', name: 'The chairs nobody moves', kind: 'chair', solid: false, face: 0, use: 'clubChairs' });
      A({ x: 5, y: 11, e: '🪑', name: 'The chairs nobody moves', kind: 'chair', solid: false, face: 0, use: 'clubChairs' });
      /* The far end: the function room, and everything waiting to go into it. */
      A({ x: 19, y: 11, e: '🚪', name: 'The function room', kind: 'sign', solid: true, use: 'clubFunction' });
      A({ x: 17, y: 12, e: '🪑', name: 'The stack of chairs', kind: 'heap', solid: true, use: 'clubStack' });
      A({ x: 11, y: 9, e: '🕺', name: 'The dance floor', kind: 'step', solid: false, use: 'clubFloor' });
      /* And the booth by the door you came past to get here. */
      A({ x: 13, y: 13, e: '🪟', name: 'The doorman’s booth', kind: 'booth', solid: true, use: 'clubBooth' });
      A({ x: 14, y: 13, e: '📖', name: 'The signing-in book', kind: 'paper', solid: true, use: 'clubBook' });
    }
  },

  /* ---- SUNSEEKERS -----------------------------------------------------
     A ROOM YOU CANNOT SEE. That is the design and it is the opposite of every
     other interior out here: there is nothing in Sunseekers to look at,
     because everything that happens in Sunseekers happens behind a door with a
     light over it.

     So it is a corridor. Three booths down one side, a desk at the end nobody
     is at, and a bell. The whole business is audible and none of it is
     visible, and the one thing you can do — go in a booth — takes the screen
     nowhere at all, spends twelve minutes, and gives you back a room you have
     already seen. It is the sparsest level in the game on purpose. */
  tan: {
    name: 'Sunseekers',
    w: 11, h: 16,
    rooms: [{ z: 'tan', r: [2, 2, 8, 13] }],
    doors: [],
    entries: { door: [5.5, 12.5] },
    links: [{ via: 'tanOut', to: 'outside', entry: 'tan' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 5, y: 13, e: '🚪', name: 'The door out', kind: 'exit', solid: false, use: 'tanOut' });
      A({ x: 3, y: 2, e: '⚠️', name: 'The warning notice', kind: 'poster', solid: true, use: 'tanWarning' });
      A({ x: 5, y: 2, e: '📋', name: 'The price list', kind: 'chart', solid: true, use: 'tanPrices' });
      A({ x: 7, y: 2, e: '🏝️', name: 'The photograph of a beach', kind: 'poster', solid: true, use: 'tanBeach' });
      /* THE THREE DOORS. Numbered from the far end, which is how they are
         numbered, which is why nobody can ever find booth one. */
      A({ x: 3, y: 4, e: '🚪', name: 'Booth one', kind: 'booth', solid: true, use: 'tanBoothOne' });
      A({ x: 3, y: 7, e: '🚪', name: 'Booth two', kind: 'booth', solid: true, use: 'tanBoothTwo' });
      A({ x: 3, y: 10, e: '🚪', name: 'Booth three', kind: 'booth', solid: true, use: 'tanBoothThree' });
      A({ x: 7, y: 7, e: '🧳', name: 'Somebody’s things outside booth two', kind: 'heap', solid: true, use: 'tanThings' });
      A({ x: 7, y: 9, e: '🗑️', name: 'The bin of used goggles', kind: 'bin', solid: true, use: 'tanGoggles' });
      A({ x: 6, y: 11, e: '🧾', name: 'The desk', kind: 'cab', solid: true, use: 'tanDesk' });
      A({ x: 7, y: 11, e: '🔔', name: 'The bell', kind: 'misc', solid: true, use: 'tanBell' });
    }
  },

  /* ---- THE FLATS ABOVE THE PARADE -------------------------------------
     The only interior out here that is somebody's HOME, and the reason there
     is one rather than twenty-six.

     Everybody in this game has a `home:` now — see data/npcs.js — and most of
     those homes are a direction and a sentence: the 41, the car park, west
     past the multi-storey, the subway under the railway. That is the honest
     amount of home for somebody you watch leave. Twenty-six visitable flats
     would be twenty-six of the same room, which is the exact thing this
     project keeps having to be told not to do.

     So there is ONE, and it is a landing rather than a flat: a corridor of
     numbered doors above shops you have walked past all game, three of which
     belong to people you know. What you can read is the OUTSIDE of a home —
     the mats, the post, what is on the door, what you can hear through it —
     which is the only part of anybody's home you are ever actually entitled
     to, and is a great deal more than nothing.

     The mechanism, and it is not one this game has used: the POST. There is a
     pile of it on the windowsill going back years, and reading it is reading
     the whole parade backwards — who moved out, who never told anybody, and
     which business is still being written to eleven years after it shut. */
  flats: {
    name: 'The flats above the parade',
    w: 17, h: 12,
    rooms: [{ z: 'flats', r: [2, 2, 14, 9] }],
    doors: [],
    entries: { door: [8.5, 8.5] },
    links: [{ via: 'flatsOut', to: 'outside', entry: 'flats' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 8, y: 9, e: '\ud83e\ude9c', name: 'The stairs down', kind: 'exit', solid: false, use: 'flatsOut' });
      /* SIX DOORS, along the one wall the landing has. Three of them are
         somebody's, and the other three are the parade. */
      A({ x: 3, y: 2, e: '\ud83d\udeaa', name: 'Flat 1', kind: 'view', solid: true, use: 'flat1' });
      A({ x: 5, y: 2, e: '\ud83d\udeaa', name: 'Flat 2', kind: 'view', solid: true, use: 'flat2' });
      A({ x: 7, y: 2, e: '\ud83d\udeaa', name: 'Flat 3', kind: 'view', solid: true, use: 'flat3' });
      A({ x: 9, y: 2, e: '\ud83d\udeaa', name: 'Flat 4', kind: 'view', solid: true, use: 'flat4' });
      A({ x: 11, y: 2, e: '\ud83d\udeaa', name: 'Flat 5', kind: 'view', solid: true, use: 'flat5' });
      A({ x: 13, y: 2, e: '\ud83d\udeaa', name: 'Flat 6', kind: 'view', solid: true, use: 'flat6' });
      /* The window at the end, which looks down on the street you came off. */
      A({ x: 14, y: 4, e: '\ud83e\ude9f', name: 'The window over the High Street', kind: 'view', solid: true, use: 'flatsWindow' });
      /* And the landing itself: the post nobody has claimed, the bike nobody
         owns, the meters, the timer, and the radiator. */
      A({ x: 12, y: 5, e: '\ud83d\udcec', name: 'The post on the windowsill', kind: 'paper', solid: true, use: 'flatsPost' });
      /* THE SIX BELLS, which the act on the door downstairs has described in
         words since it was written — "a door, between two shops, with six bells
         beside it and no sign saying what it is" — and which have never been a
         thing you could look at. A bank of steel pigeonholes off the kit's
         Mailboxes sheet is exactly what that is. */
      A({ x: 2, y: 2, e: '\ud83d\udcec', name: 'The bells, and the post', kind: 'pigeonholes', solid: true, use: 'flatsBells' });
      A({ x: 4, y: 5, e: '\ud83d\udeb2', name: 'The bike', kind: 'bike', solid: true, use: 'flatsBike' });
      A({ x: 3, y: 7, e: '\u26a1', name: 'The meters', kind: 'server', solid: true, use: 'flatsMeters' });
      /* The switch is on the wall; the LIGHT is the bulb on the landing, out
         in the middle of it, which is why this one hangs on nothing. */
      A({ x: 6, y: 7, e: '\ud83d\udd58', name: 'The light on the timer', kind: 'therm', solid: true, use: 'flatsTimer', furn: { mount: null } });
      A({ x: 11, y: 7, e: '\u2668\ufe0f', name: 'The radiator', kind: 'cooler', solid: true, use: 'flatsRad' });
      A({ x: 13, y: 8, e: '\ud83d\uddd1\ufe0f', name: 'The bin bags by the stairs', kind: 'bin', solid: true, use: 'flatsBags' });
    }
  },

  /* ================= THE OLD TOWN'S INTERIORS =================
     Five floors behind five of the frontages south of the railway. Same shape
     as the ten already in this file — a room, an arrival point, a way back out
     and a furnishing — and nothing in engine/ had to learn any of their names.

     They are here rather than scattered because they share a fact: all five are
     older than the building you work in, and three of them are older than the
     concept of the building you work in. */

  /* The one everybody finds first, because it is four doors from the North
     Gate and because it is the only shop on Priorygate with its lights on at
     half four in January. */
  bookshop: {
    name: 'The second-hand bookshop',
    w: 15, h: 14,
    rooms: [{ z: 'books', r: [2, 2, 12, 11] }],
    doors: [],
    entries: { door: [7.5, 10.5] },
    links: [{ via: 'booksOut', to: 'outside', entry: 'books' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 7, y: 11, e: '\ud83d\udeaa', name: 'The way out', kind: 'exit', solid: false, use: 'booksOut' });
      /* Shelves down both walls and two ranges through the middle, which is
         four more than the floor can take and is exactly how many there are. */
      A({ x: 3, y: 3, e: '\ud83d\udcda', name: 'Local history', kind: 'book', solid: true, use: 'shelfLocal' });
      A({ x: 5, y: 3, e: '\ud83d\udcda', name: 'Local history', kind: 'book', solid: true, use: 'shelfLocal' });
      A({ x: 7, y: 3, e: '\ud83d\udcda', name: 'Railways', kind: 'book', solid: true, use: 'shelfRail' });
      A({ x: 9, y: 3, e: '\ud83d\udcda', name: 'Maritime', kind: 'book', solid: true, use: 'shelfSea' });
      A({ x: 11, y: 3, e: '\ud83d\udcda', name: 'Everything else', kind: 'book', solid: true, use: 'shelfRest' });
      A({ x: 3, y: 6, e: '\ud83d\udcda', name: 'The paperbacks', kind: 'book', solid: true, use: 'shelfPaper' });
      A({ x: 3, y: 8, e: '\ud83d\udcda', name: 'The paperbacks', kind: 'book', solid: true, use: 'shelfPaper' });
      A({ x: 11, y: 6, e: '\ud83d\udcda', name: 'The ones behind the counter', kind: 'book', solid: true, use: 'shelfBack' });
      A({ x: 10, y: 9, e: '\ud83d\uddc2\ufe0f', name: 'The counter', kind: 'cupboard', solid: true, use: 'booksCounter' });
      A({ x: 6, y: 6, e: '\ud83d\udcd6', name: 'The table of things nobody has bought', kind: 'table', solid: true, use: 'booksTable' });
      A({ x: 7, y: 6, e: '\ud83d\udcd6', name: 'The table of things nobody has bought', kind: 'table', solid: true, use: 'booksTable' });
      A({ x: 8, y: 6, e: '\ud83d\udcd6', name: 'The table of things nobody has bought', kind: 'table', solid: true, use: 'booksTable' });
      A({ x: 5, y: 9, e: '\ud83d\udc08', name: 'The shop cat', kind: 'pigeon', solid: false, use: 'shopCat', furn: { mount: null } });
      A({ x: 12, y: 5, e: '\ud83e\ude9f', name: 'The window from inside', kind: 'view', solid: true, use: 'booksWindow' });
      A({ x: 2, y: 4, e: '\ud83e\ude9c', name: 'The stairs to the room upstairs', kind: 'view', solid: true, use: 'booksUpstairs' });
    }
  },

  /* The coffee place, which has been four businesses in nine years and is the
     only one of them anybody has liked. */
  caff: {
    name: 'The coffee place on Priorygate',
    w: 14, h: 13,
    rooms: [{ z: 'caff', r: [2, 2, 11, 10] }],
    doors: [],
    entries: { door: [6.5, 9.5] },
    links: [{ via: 'caffOut', to: 'outside', entry: 'caff' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 6, y: 10, e: '\ud83d\udeaa', name: 'The way out', kind: 'exit', solid: false, use: 'caffOut' });
      A({ x: 4, y: 2, e: '\u2615', name: 'The machine', kind: 'coffee', solid: true, use: 'caffMachine' });
      A({ x: 6, y: 2, e: '\ud83e\uddc1', name: 'The cabinet', kind: 'cupboard', solid: true, use: 'caffCabinet' });
      A({ x: 9, y: 2, e: '\ud83d\udcdd', name: 'The board', kind: 'board', solid: true, use: 'caffBoard' });
      A({ x: 7, y: 3, e: '\ud83e\uddfe', name: 'The counter', kind: 'cupboard', solid: true, use: 'caffCounter' });
      A({ x: 3, y: 6, e: '\ud83e\ude91', name: 'A table', kind: 'table', solid: true, use: 'caffTable' });
      A({ x: 4, y: 6, e: '\ud83e\ude91', name: 'A table', kind: 'table', solid: true, use: 'caffTable' });
      A({ x: 8, y: 6, e: '\ud83e\ude91', name: 'The table by the window', kind: 'table', solid: true, use: 'caffWindowTable' });
      A({ x: 9, y: 6, e: '\ud83e\ude91', name: 'The table by the window', kind: 'table', solid: true, use: 'caffWindowTable' });
      A({ x: 3, y: 8, e: '\ud83e\ude91', name: 'The wobbly table', kind: 'table', solid: true, use: 'caffWobble' });
      A({ x: 4, y: 8, e: '\ud83e\ude91', name: 'The wobbly table', kind: 'table', solid: true, use: 'caffWobble' });
      A({ x: 11, y: 4, e: '\ud83e\ude9f', name: 'The window from inside', kind: 'view', solid: true, use: 'caffWindow' });
      A({ x: 2, y: 9, e: '\ud83d\udebd', name: 'The toilet', kind: 'view', solid: true, use: 'caffLoo' });
      A({ x: 10, y: 9, e: '\ud83c\udf31', name: 'The plant', kind: 'plant', solid: true, use: 'caffPlant' });
    }
  },

  /* The Mitre, which has been a pub since something in the fourteenth century
     and has had eleven names. */
  mitre: {
    name: 'The Mitre',
    w: 16, h: 14,
    rooms: [{ z: 'mitre', r: [2, 2, 13, 11] }],
    doors: [],
    entries: { door: [7.5, 10.5] },
    links: [{ via: 'mitreOut', to: 'outside', entry: 'mitre' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 7, y: 11, e: '\ud83d\udeaa', name: 'The way out', kind: 'exit', solid: false, use: 'mitreOut' });
      A({ x: 5, y: 2, e: '\ud83c\udf7a', name: 'The bar', kind: 'woodcounter', solid: true, use: 'mitreBar' });
      A({ x: 6, y: 2, e: '\ud83c\udf7a', name: 'The bar', kind: 'woodcounter', solid: true, use: 'mitreBar' });
      A({ x: 7, y: 2, e: '\ud83c\udf7a', name: 'The bar', kind: 'woodcounter', solid: true, use: 'mitreBar' });
      A({ x: 9, y: 2, e: '\ud83d\udcdc', name: 'The list of landlords', kind: 'poster', solid: true, use: 'mitreLandlords' });
      A({ x: 3, y: 2, e: '\ud83c\udfc6', name: 'The shelf of trophies', kind: 'book', solid: true, use: 'mitreTrophies' });
      A({ x: 13, y: 3, e: '\ud83e\udded', name: 'The fireplace', kind: 'view', solid: true, use: 'mitreFire' });
      A({ x: 4, y: 5, e: '\ud83e\ude91', name: 'The table in the corner', kind: 'table', solid: true, use: 'mitreCorner' });
      A({ x: 5, y: 5, e: '\ud83e\ude91', name: 'The table in the corner', kind: 'table', solid: true, use: 'mitreCorner' });
      A({ x: 9, y: 5, e: '\ud83e\ude91', name: 'The long table', kind: 'table', solid: true, use: 'mitreLong' });
      A({ x: 10, y: 5, e: '\ud83e\ude91', name: 'The long table', kind: 'table', solid: true, use: 'mitreLong' });
      A({ x: 11, y: 5, e: '\ud83e\ude91', name: 'The long table', kind: 'table', solid: true, use: 'mitreLong' });
      A({ x: 2, y: 8, e: '\ud83c\udfaf', name: 'The dartboard', kind: 'view', solid: true, use: 'mitreDarts' });
      A({ x: 12, y: 8, e: '\ud83c\udfb0', name: 'The machine', kind: 'vend', solid: true, use: 'mitreMachine' });
      A({ x: 6, y: 8, e: '\ud83e\ude91', name: 'A table', kind: 'table', solid: true, use: 'mitreTable' });
      A({ x: 7, y: 8, e: '\ud83e\ude91', name: 'A table', kind: 'table', solid: true, use: 'mitreTable' });
      A({ x: 10, y: 11, e: '\ud83d\udebd', name: 'The gents', kind: 'view', solid: true, use: 'mitreGents' });
      A({ x: 2, y: 10, e: '\ud83d\udeaa', name: 'The door to the yard', kind: 'view', solid: true, use: 'mitreYard' });
    }
  },

  /* THE MARKET HALL. Not a shop: a roof over sixteen traders, half of whom
     are the same family, and the only building in this town that has done one
     job continuously since it was built. */
  markethall: {
    name: 'The Market Hall',
    w: 20, h: 15,
    rooms: [{ z: 'market', r: [2, 2, 17, 12] }],
    doors: [],
    entries: { door: [9.5, 11.5] },
    links: [{ via: 'marketOut', to: 'outside', entry: 'market' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 9, y: 12, e: '\ud83d\udeaa', name: 'The way out', kind: 'exit', solid: false, use: 'marketOut' });
      /* Two rows of stalls with an aisle down the middle, which is what the
         inside of every pannier market in the country is. */
      A({ x: 3, y: 2, e: '\ud83e\uddc0', name: 'The cheese stall', kind: 'shop', solid: true, use: 'stallCheese', furn: { mount: 'wall' } });
      A({ x: 6, y: 2, e: '\ud83e\udd69', name: 'The butcher', kind: 'shop', solid: true, use: 'stallButcher', furn: { mount: 'wall' } });
      A({ x: 9, y: 2, e: '\ud83c\udf5e', name: 'The bread stall', kind: 'shop', solid: true, use: 'stallBread', furn: { mount: 'wall' } });
      A({ x: 12, y: 2, e: '\ud83e\uddf6', name: 'The wool stall', kind: 'shop', solid: true, use: 'stallWool', furn: { mount: 'wall' } });
      A({ x: 15, y: 2, e: '\ud83d\udd27', name: 'The stall that mends things', kind: 'shop', solid: true, use: 'stallMender', furn: { mount: 'wall' } });
      A({ x: 3, y: 8, e: '\ud83e\ude94', name: 'The haberdashery', kind: 'woodcounter', solid: true, use: 'stallHaber' });
      A({ x: 6, y: 8, e: '\ud83d\udcc0', name: 'The record stall', kind: 'woodcounter', solid: true, use: 'stallRecords' });
      A({ x: 9, y: 8, e: '\u2615', name: 'The market caff', kind: 'coffee', solid: true, use: 'stallCaff' });
      A({ x: 12, y: 8, e: '\ud83e\uddf5', name: 'The stall with the buttons', kind: 'woodcounter', solid: true, use: 'stallButtons' });
      A({ x: 15, y: 8, e: '\ud83d\udce6', name: 'The empty pitch', kind: 'box', solid: true, use: 'stallEmpty' });
      A({ x: 10, y: 6, e: '\ud83e\ude91', name: 'The tables in the middle', kind: 'table', solid: true, use: 'marketTables' });
      A({ x: 11, y: 6, e: '\ud83e\ude91', name: 'The tables in the middle', kind: 'table', solid: true, use: 'marketTables' });
      A({ x: 17, y: 5, e: '\ud83d\udcdc', name: 'The market charter', kind: 'poster', solid: true, use: 'marketCharter' });
      /* Up onto the north gable, over the pitches. It was on the west wall,
         where a wall-anchored sprite is seen edge-on and the renderer falls back
         to the emoji — and this is the one clock in the game the kit's cased
         wooden one is exactly right for. A pannier market of 1872 has a wooden
         clock in it, wound by hand, and now it has one you can see. */
      A({ x: 10, y: 2, e: '\ud83d\udd70\ufe0f', name: 'The market clock', kind: 'clock', solid: true, use: 'marketClock' });
      A({ x: 17, y: 11, e: '\ud83d\uddd1\ufe0f', name: 'The bins at the back', kind: 'bin', solid: true, use: 'marketBins' });
    }
  },

  /* THE MINSTER. The largest interior in this game by some distance and the
     only one with nothing to buy in it, which between them are the point.
     Twenty-three by seventeen, most of it floor, because what a building like
     this actually gives you is the floor. */
  minster: {
    name: 'Bellhaven Minster',
    w: 25, h: 19,
    rooms: [{ z: 'minster', r: [2, 2, 22, 16] }],
    doors: [],
    entries: { door: [12.5, 15.5] },
    links: [{ via: 'minsterOut', to: 'outside', entry: 'minster' }],
    furnish() {
      const A = o => this.add(o);
      A({ x: 12, y: 16, e: '\ud83d\udeaa', name: 'The south door', kind: 'exit', solid: false, use: 'minsterOut' });
      /* The altar at the east end, which in here is the top of the screen,
         because a cathedral drawn with its east end anywhere else is a
         cathedral drawn by somebody who has not been in one. */
      A({ x: 12, y: 2, e: '\u271d\ufe0f', name: 'The east end', kind: 'view', solid: true, use: 'minsterAltar' });
      A({ x: 9, y: 2, e: '\ud83e\ude9f', name: 'The east window', kind: 'view', solid: true, use: 'minsterEastWindow' });
      A({ x: 15, y: 2, e: '\ud83e\ude9f', name: 'The east window', kind: 'view', solid: true, use: 'minsterEastWindow' });
      /* The nave: two blocks of chairs with an aisle between them. Chairs, not
         pews — the pews went in 2003 and there is still a letter about it in
         the parish magazine every spring. */
      for (let r = 6; r <= 12; r += 2) {
        for (let c = 8; c <= 10; c++) A({ x: c, y: r, e: '\ud83e\ude91', name: 'The chairs', kind: 'chair', solid: true, use: 'minsterChairs' });
        for (let c = 14; c <= 16; c++) A({ x: c, y: r, e: '\ud83e\ude91', name: 'The chairs', kind: 'chair', solid: true, use: 'minsterChairs' });
      }
      A({ x: 4, y: 4, e: '\ud83c\udfb9', name: 'The organ', kind: 'cupboard', solid: true, use: 'minsterOrgan' });
      A({ x: 20, y: 4, e: '\ud83d\udd6f\ufe0f', name: 'The candle stand', kind: 'misc', solid: true, use: 'minsterCandles' });
      A({ x: 2, y: 8, e: '\ud83e\udea6', name: 'The tombs along the aisle', kind: 'view', solid: true, use: 'minsterTombs' });
      A({ x: 2, y: 11, e: '\ud83e\udea6', name: 'The tombs along the aisle', kind: 'view', solid: true, use: 'minsterTombs' });
      /* Same refusal as the lobby's, for the opposite reason: this is a dial
         of 1484 with the earth in the middle of it and a fleur-de-lis for an
         hour hand, and the kit has a Victorian mantel clock. It stays where it
         is, on the wall over the door with the cat hole in it, as an emoji. */
      A({ x: 22, y: 8, e: '\ud83d\udd70\ufe0f', name: 'The astronomical clock', kind: 'clock', solid: true, use: 'minsterClock',
        furn: { sprite: null } });
      A({ x: 22, y: 11, e: '\ud83d\udcdc', name: 'The roll of incumbents', kind: 'poster', solid: true, use: 'minsterRoll' });
      A({ x: 6, y: 15, e: '\ud83d\udcda', name: 'The bookstall', kind: 'book', solid: true, use: 'minsterShop' });
      A({ x: 18, y: 15, e: '\u2615', name: 'The urn and the biscuits', kind: 'coffee', solid: true, use: 'minsterUrn' });
      A({ x: 3, y: 14, e: '\ud83d\udcb7', name: 'The box for the roof', kind: 'misc', solid: true, use: 'minsterRoofFund' });
      A({ x: 21, y: 14, e: '\ud83d\udd6f\ufe0f', name: 'The candles by the door', kind: 'misc', solid: true, use: 'minsterCandles' });
      A({ x: 12, y: 13, e: '\ud83d\udca7', name: 'The font', kind: 'sink', solid: true, use: 'minsterFont', furn: { mount: null } });
    }
  },

  /* ---- OUTSIDE --------------------------------------------------------
     The forecourt and the streets, which is the only level with a sky over it.
     `indoors: false` is what the renderer reads: no strip lights, daylight
     rather than a ceiling, and the dark beyond the walls painted as sky.

     It exists because three separate acts already promised it — the way out
     talks about daylight and a bus stop, the Greggs has been a shop you could
     buy from without ever being a place you could stand, and the view off the
     fire escape looks down on this car park.

     THE SHAPE OF IT. A grid: three streets running east–west — Bellhaven Road
     and the High Street along the top, Fenn Street through the middle, Corven
     Way along the bottom — crossed by three running north–south: Aldergate
     Rise, Cargate Lane and Marlow Street. Six roads, nine junctions, and four
     blocks of buildings in the holes between them.

     A grid rather than one loop, deliberately, and the reason is the driving.
     A single circuit is a lap: you go round it and you have seen it. A grid is
     a choice at every junction, two ways round to everywhere, and somewhere to
     be overtaken — and it is what lets four lots of traffic run four different
     circuits through the same nine junctions and have to give way to each
     other at them.

     The blocks are claimed by no room at all and so come out solid, which is
     what a terrace of buildings is from above: you cannot go in, and there is
     nothing in there to go into. The exception is the retail park, which is a
     walled car park with one way in off Fenn Street — the only place out here
     with room to find out what the pool car does above thirty.

     Every street is two things at once — a carriageway with a pavement either
     side of it — and a zone can only be one of them, so the zone is the PLACE
     (its name, which is what UI.zone announces as you cross into it) and
     `surfaces:` lays the tarmac over the middle of it. That is also why the
     rooms are listed in the order they are: they are painted in sequence and
     the later one wins, so the road zones claim their own junctions back off
     the streets they cross.

     ---- AND THEN IT DOUBLED ----
     Everything above describes the top half. The level is a hundred and
     fourteen tiles across and a hundred and twenty down now, and the seam
     between its two halves is the railway at row 60.

     NORTH OF THE LINE is the town described above: built between about 1968
     and 1994, a business park, a parade, a retail shed and a grid of roads
     laid out by somebody with a ruler. Right angles all the way and the whole
     of it blue-grey.

     SOUTH OF THE LINE is what was here before that. It is inside a wall, it
     has no cars in it, its main street was pedestrianised in 1988, and it
     falls away westward down a flight of steps to a river with a quay on it
     that stopped working in 1962. Everything down there is red stone, nothing
     down there is square to anything else, and the one building made of a
     different stone is the one somebody paid for.

     The two halves are joined by exactly three things, and between them those
     three are the whole shape of this map: two road bridges over the railway —
     Cargate Lane and Marlow Street — and one subway under it, which is a right
     of way, is the only way onto the closed station's platforms, and is why
     anybody walks anywhere down there at all.

     Nothing north of row 60 moved to do any of it. Every coordinate in the
     first half of this level is the coordinate it always was: the office's
     front doors are still at [20,2] and the Greggs is still at [31,23]. The
     town grew off the bottom of itself, the way one does. */
  /* THE TOWN, AND IT IS A PART RATHER THAN A LEVEL. Everything below is
     exactly what it was when this was `outside` and the only thing out of
     doors: the same rooms, the same parades, the same traffic and the same
     lights, at the same coordinates. What changed is where it sits — see
     data/island.js, which stamps it into a map with a coast round it at an
     offset, and engine/world.js's compose(), which does the stamping.

     `part: true` says one thing and it is a fact about the catalogue rather
     than about the town: nothing links here, Levels never loads it, and the
     only things that build it on its own are the editor and the harnesses,
     which is exactly what you want of a place you are drawing. */
  town: {
    name: 'Bellhaven',
    part: true,
    w: 114, h: 120,
    indoors: false,
    rooms: [
      /* The car park, and the one gap in its wall. Row 13 is claimed by
         nothing for its whole length except this, so the car park has a real
         wall along the road with a single way through it — which is what makes
         driving out of it an act rather than a drift. */
      { z: 'forecourt', r: [3, 3, 40, 12] },
      { z: 'forecourt', r: [34, 13, 37, 13] },
      /* Bellhaven Road, and then the same road under a different name once it
         reaches the shops, because that is what happens to roads. Pavement,
         carriageway and pavement, all of it one zone. */
      /* OUT TO THE EDGE OF THE MAP, both ends, and that is the whole of the
         fix for a road that used to stop. Bellhaven Road ran x 2..111 and Fenn
         and Corven ran x 8..107: six lanes of carriageway that came to an end
         two tiles short of the border and butted into the side of a building,
         with no junction, no turning head and no reason. Station Road and
         Weirbank Road have run off the east edge since they were drawn, and
         that is what a road at the edge of a map should do — the view stops,
         the town does not. These three now do the same. */
      { z: 'street', r: [0, 14, 41, 23] },
      { z: 'high', r: [42, 14, 113, 23] },
      /* The three north–south streets, each in two pieces: the stretch between
         Bellhaven and Fenn, and the stretch between Fenn and Corven. Two rects
         rather than one because the retail park's wall runs across between
         them, and a street that owned that row would own the wall as well. */
      { z: 'aldergate', r: [6, 24, 15, 31] },
      { z: 'aldergate', r: [6, 42, 15, 49] },
      { z: 'cargate', r: [58, 24, 67, 31] },
      { z: 'cargate', r: [58, 42, 67, 49] },
      { z: 'marlow', r: [100, 24, 109, 31] },
      { z: 'marlow', r: [100, 42, 109, 49] },
      /* The two long ones. Listed after the north–south streets so they lose
         the junctions to them — every crossing belongs to the street it is
         named after on the sign, and the sign is on the corner. */
      { z: 'fenn', r: [0, 32, 113, 41] },
      { z: 'corven', r: [0, 50, 113, 59] },
      /* And the car park, with its one gap, exactly as the forecourt has. */
      { z: 'retail', r: [18, 43, 55, 48] },
      { z: 'retail', r: [34, 42, 37, 42] },

      /* ================= SOUTH OF THE LINE =================
         Rows 60 to 119. Everything above this comment was here first and none
         of it has moved.

         THE RAILWAY comes first, and what is remarkable about it is how little
         of it is here: nine rows of `rail` surface in the list below and two
         painted tracks, and not one room, because a railway is not a place you
         can stand. What IS a room is the three things cut through it. */
      /* The subway. Nine rows of tiled tunnel from the verge on Corven Way to
         the pavement on Station Road, and the only way on foot between the two
         halves of this town. It is declared BEFORE the platforms so that where
         it passes them they win the tile: the middle of it is a tunnel and the
         two ends of it are the stairs up onto a platform, which is what that
         overlap means and is why the zone changes under your feet twice on the
         way through. */
      { z: 'subway', r: [78, 60, 80, 68] },
      /* The two platforms of a station that has not had a train stop at it
         since 1967 — see the act on the railway, which has said so since long
         before there was a platform here to say it about. They are three rows
         apart because a running line and a six-foot go between them, and they
         are only reachable from the subway, because the booking hall on the
         road side has been boarded since the year it shut. */
      { z: 'platform', r: [74, 61, 98, 62] },
      { z: 'platform', r: [74, 66, 98, 67] },
      /* THE TWO BRIDGES. A road over a railway in this projection is a strip of
         carriageway with ballast either side of it and nothing else — which is
         exactly what a bridge looks like from above, and is why neither of
         these needed a single line of engine to exist. Same zone as the street
         each one carries, because it is the same street. */
      { z: 'cargate', r: [58, 60, 67, 68] },
      { z: 'marlow', r: [100, 60, 109, 68] },

      /* THE NORTH–SOUTH STREETS of the new half, listed before the two long
         ones for the reason the first half gives: the crossings belong to the
         road named on the sign at the corner, and down here that is the road
         going east and west. */
      { z: 'quayrd', r: [7, 79, 16, 95] },
      { z: 'marlow', r: [100, 79, 109, 95] },
      /* THE TWO LONG ONES. Station Road runs the whole width under the railway
         embankment; Weirbank Road runs the whole width along the bottom of the
         wall. Between them is the old town, and the fact that you cannot drive
         from one to the other except round the outside is the whole of what
         makes the middle of this map walkable. */
      { z: 'stationrd', r: [7, 69, 113, 78] },
      { z: 'weirbank', r: [7, 96, 113, 105] },

      /* ---- THE OLD TOWN ----
         Inside the wall. The wall itself is not in this list and never will be:
         it is the mass BETWEEN these rooms, and what makes it a city wall
         rather than the back of a shop is one field on every zone down here —
         `wtile: 'wall.stone'`. Rubble, in the red the ground is, instead of the
         parade's brick.

         There are four ways in and they are worth knowing before you read the
         rectangles: the North Gate off Station Road, the East Gate onto Marlow
         Street, the Water Gate at the bottom of the Close, and Fishers Steps,
         which is not a gate at all but eight courses of steps down the hill.

         THE LANES first, so that where each crosses Priorygate the high street
         wins the tile — same rule as the junctions outside. */
      { z: 'coopers', r: [23, 80, 25, 94] },
      { z: 'drapers', r: [76, 80, 78, 94] },
      { z: 'pinfold', r: [90, 80, 92, 94] },
      /* PRIORYGATE, and the gate it is named after. The street is four rows
         deep and eighty across and there is not one tile of carriageway on it;
         the second rectangle is the gateway through the north wall, in the same
         zone because you are already on Priorygate when you are standing under
         the arch, which is what anybody who has walked through one will tell
         you. The third is the East Gate, which is one tile wide and is the
         reason Marlow Street has a queue on it at ten to nine. */
      { z: 'priory', r: [19, 84, 98, 87] },
      { z: 'priory', r: [50, 79, 52, 83] },
      { z: 'priory', r: [99, 85, 99, 86] },
      /* The market square. It is called the Shambles and there has not been a
         butcher on it since the seventies, which is the most ordinary fact
         about any market square in England. */
      { z: 'shambles', r: [28, 80, 46, 83] },
      /* THE GREEN, IN FOUR PIECES, AND THE MINSTER IN THE HOLE.
         A room is a rectangle and a rectangle cannot have a cathedral cut out
         of the middle of it, so the lawn is the two rects at the ends and the
         paved walk round the building is the four that box it in. What is left
         over — x 48 to 64, rows 90 to 92 — is covered by no room at all, which
         is how a thing this size gets to be solid: the minster is seventeen
         tiles of nothing, and the nothing is the building.

         Seventeen and not thirteen, which is what it was first drawn as. The
         one thing everybody knows about a building like this is that it is
         LONG — a nave is a corridor with a roof on it and the length is the
         whole of the effect — and at thirteen it read from Priorygate as a
         large shed made of the wrong stone.

         The walk is its own zone for one reason and it is the whole reason the
         old town looks the way it does: a wall takes its finish from the room
         that can see it, so the only way to say that this building is pale
         stone and everything else in the town is red is to give it its own
         pavement to be seen from. */
      { z: 'green', r: [38, 88, 45, 94] },
      { z: 'green', r: [67, 88, 72, 94] },
      { z: 'minster', r: [46, 88, 66, 89] },
      { z: 'minster', r: [46, 93, 66, 94] },
      { z: 'minster', r: [46, 90, 47, 92] },
      { z: 'minster', r: [65, 90, 66, 92] },
      /* The Close, and the Water Gate at the bottom of it. */
      { z: 'close', r: [30, 88, 37, 94] },
      { z: 'close', r: [31, 95, 33, 95] },
      /* The castle gardens, which are a lawn, a bandstand and a gatehouse with
         no castle behind it. */
      { z: 'castle', r: [82, 80, 98, 83] },
      /* FISHERS STEPS. Three tiles wide, eight rows long, from the west end of
         Priorygate down to Weirbank Road, and the only thing on this map that
         is not flat. There is no height in this game and there does not need to
         be: the ground is three treads to the tile all the way down it, and
         that is enough to tell anybody which way the town falls. */
      { z: 'steps', r: [18, 88, 20, 95] },

      /* ---- THE QUAY ----
         The apron along the water, the terrace of warehouses between it and the
         road — which, like every other block on this map, is simply the rows
         nothing claims — and the ramp down through them that a vehicle can
         actually get onto, because a quay you cannot drive onto is a
         promenade. */
      { z: 'quay', r: [24, 109, 113, 112] },
      { z: 'quay', r: [40, 106, 43, 108] }
    ],
    /* What the ground is MADE of, over the top of what it is. Everything out
       here is paving slabs by default; these are the bits that are not.
       See SURFACES in data/world.js, and R.kerbs(), which draws the kerb along
       every edge one of these meets ordinary ground on. */
    surfaces: [
      { s: 'tarmac', r: [3, 3, 40, 12] },
      /* The exit, carried across the pavement rather than stopping at it: a
         vehicle crossover is tarmac all the way to the carriageway, and the
         kerb is dropped for it. Draw the pavement through here instead and
         the game paints a six-inch kerb across the road you drive out of. */
      { s: 'tarmac', r: [34, 13, 37, 15] },
      { s: 'tarmac', r: [0, 16, 113, 21] },
      /* Each north–south carriageway in ONE rectangle running the whole height
         of the map, straight through every pavement band it crosses. Stop one
         at a junction and the game lays a kerb across the road, for the same
         reason the crossover above needs carrying through the footway. */
      { s: 'tarmac', r: [8, 22, 13, 57] },
      { s: 'tarmac', r: [60, 22, 65, 57] },
      { s: 'tarmac', r: [102, 22, 107, 57] },
      { s: 'tarmac', r: [0, 34, 113, 39] },
      { s: 'tarmac', r: [0, 52, 113, 57] },
      /* The retail park and the way into it. */
      { s: 'tarmac', r: [34, 42, 37, 42] },
      { s: 'tarmac', r: [18, 43, 55, 48] },
      /* The drive-thru's own lane, carried across the footway to the window so
         that a car can pull level with it — which is the whole of what a
         drive-thru is, and without it the window is two tiles further away
         than anybody can reach from a driving seat. The kerb drops itself:
         R.kerbs() finds no boundary where the tarmac runs through. */
      { s: 'tarmac', r: [82, 50, 87, 51] },
      /* The car wash's apron, off Fenn Street. Same shape and the same reason
         as the lane above: a hand car wash is a thing you drive ONTO, and
         without tarmac up to the frontage the game lays a kerb across the
         entrance six lads spend all day waving cars over. */
      { s: 'tarmac', r: [38, 32, 43, 33] },
      /* THE GRASS, and it is laid last because a surface declared later wins:
         these are strips OF the tarmac and the paving above, given back.

         There are four of them and there is a reason there are only four. This
         is the one surface in the game that knows what month it is — see
         SURFACES.grass, which carries a tile per season — so it wants to be
         somewhere the player passes daily rather than somewhere they would have
         to go and look, and it wants to be a strip rather than a field, because
         a business park has verges and does not have a park. Both edges of the
         car park, the strip under its wall on the road outside the front doors,
         and the long verge at the far side of Corven Way where the town stops
         and the railway starts. */
      { s: 'grass', r: [3, 3, 4, 12] },
      { s: 'grass', r: [38, 3, 40, 12] },
      /* Row 14 either side of the vehicle crossover: the crossover is tarmac
         all the way through and must stay that way, or the game lays a verge
         across the exit everybody drives out of. */
      { s: 'grass', r: [2, 14, 33, 14] },
      { s: 'grass', r: [38, 14, 41, 14] },
      { s: 'grass', r: [0, 59, 113, 59] },

      /* ================= SOUTH OF THE LINE =================
         THE RAILWAY. Nine rows of ballast the width of the map, and it is a
         SURFACE with no room under it — which is the whole trick and the one
         new idea in this half of the level. `rail` carries `open` (see
         SURFACES in data/world.js and World.open()), which means: solid, so
         nothing walks on it, and drawn as what it is made of rather than as the
         roof the renderer gives every other piece of wall mass. Without that
         flag the line through the middle of this town came out as four hundred
         tiles of slate.

         Laid FIRST of the new surfaces, so the three things cut through it are
         taken back off it below. */
      { s: 'rail', r: [0, 60, 113, 68] },
      /* AND TAKEN OFF AGAIN, which is what `s: null` is: a surface rectangle
         that says this ground is made of whatever its room says it is made of,
         which is the state every tile in this game starts in and the state
         there was no way back to until a surface covered the whole width of the
         map and four things stood on top of it.

         Nothing in the engine needed telling. World.build already writes
         `surf[y][x] = sf.s` and every reader already treats a null surface as
         "ask the zone" — it is the value 8,043 tiles of this level carry. What
         it buys is the difference between a platform and the ballast beside it,
         which is the single most important line on that half of the map.

         The two platforms, the subway between them, and the footways of the two
         bridges. The carriageways of the bridges get their tarmac at the very
         bottom of this list, after the grass, for the reason given down there. */
      { s: null, r: [74, 61, 98, 62] },
      { s: null, r: [74, 66, 98, 67] },
      { s: null, r: [78, 60, 80, 68] },
      { s: null, r: [58, 60, 67, 68] },
      { s: null, r: [100, 60, 109, 68] },
      /* THE WATER, and it is the other `open` one. An L: down the west edge
         from the embankment to the bottom of the map, and then east along the
         bottom as the basin and the cut. The town stops at it in exactly the
         way the first half of this map stops at the railway, and for the same
         reason — a map wants an edge that is a fact rather than a boundary.

         It starts at row 69 and not row 60 because the railway crosses it on an
         embankment, and an embankment seen from directly above is ballast, not
         a bridge. The river comes out from under it. */
      { s: 'water', r: [0, 69, 6, 119] },
      { s: 'water', r: [0, 106, 23, 119] },
      { s: 'water', r: [24, 113, 113, 119] },
      /* THE CARRIAGEWAYS of the new half. Same rule as the first: one rectangle
         per road, carried straight through every footway it crosses, because a
         carriageway that stops at a junction gets a kerb laid across it. */
      { s: 'tarmac', r: [9, 71, 113, 76] },
      { s: 'tarmac', r: [9, 98, 113, 103] },
      { s: 'tarmac', r: [10, 69, 15, 105] },
      /* The ramp down through the warehouses onto the quay, carried from
         Weirbank Road's kerb to the water's edge for the drive-thru's reason:
         stop it at the footway and the game lays a six-inch step across the one
         slope a vehicle can get down. */
      { s: 'tarmac', r: [40, 104, 43, 112] },
      /* And the quay's own parking, which is the only flat tarmac south of the
         line and is therefore where everybody in the old town leaves the car
         they are not supposed to have brought down here. */
      { s: 'tarmac', r: [56, 109, 80, 112] },
      /* THE GRASS in the old town: the two lawns of Minster Green either side
         of the cathedral, and the whole of the castle gardens. Seasonal, like
         every other blade on this map — which means the green in front of the
         minster is white in January, and that is the single best argument for
         having built the thing where you can see it from Priorygate. */
      { s: 'grass', r: [38, 88, 45, 94] },
      { s: 'grass', r: [67, 88, 72, 94] },
      { s: 'grass', r: [82, 80, 98, 83] },
      /* THE STEPS, and they are last of the ordinary surfaces because they
         cross the south wall's gateway and must win it. */
      { s: 'steps', r: [18, 88, 20, 95] },

      /* AND THE TWO BRIDGES, WHICH ARE LAST OF EVERYTHING.
         Cargate Lane and Marlow Street run south out of Corven Way, across its
         footway, over its verge, and onto the railway bridges. The verge is the
         problem: `grass` above is declared after the first half's tarmac and
         wins row 59 for the whole width of the map, so a carriageway drawn
         before it would have a strip of council grass laid across the one lane
         everybody drives over the railway on. These two go after the grass, and
         that is the only reason they are down here on their own. */
      { s: 'tarmac', r: [60, 58, 65, 70] },
      { s: 'tarmac', r: [102, 58, 107, 105] }
    ],
    /* WHAT THE TOWN IS ROOFED IN, which is the one thing that says from above
       what the whole of this map says from the ground: that the railway at row
       60 is a boundary between two different centuries.

       R.roofMatsAt() reads these and R.ROOF_MATS is what it falls back to, so
       everything NORTH of the railway gets the default bag — slate and lead
       with a fair amount of flat felt in it, which is what a town centre
       rebuilt between 1958 and 1971 is roofed in, and what the retail park and
       the multi-storey and the parades are.

       South of it is the old town, and the only thing that half of the map is
       for is being four hundred years older than the other half. Pantile,
       mostly, because that is what this coast roofs things in; some oxblood
       clay; slate where a Victorian filled a gap; one run of lead. NO FELT, and
       that is a joke rather than an oversight — there is a conservation area
       officer in this town who has never once approved a flat roof and whose
       whole job, as far as anybody on Priorygate can tell, is that.

       The minster gets its own line and its own material. A building that size
       is roofed in lead and nothing else, and it is seventeen tiles of nothing
       at x 48–64 rows 90–92 — see THE GREEN, IN FOUR PIECES above. It comes
       FIRST because the first rect that contains a plot wins, and the old town
       rect below contains this one. */
    roofs: [
      { m: ['lead'], r: [47, 89, 65, 93] },
      { m: ['pantile', 'pantile', 'pantile', 'pantile', 'oxblood', 'oxblood', 'slate', 'slate', 'lead'], r: [0, 61, 113, 119] }
    ],
    /* The paint. Position-dependent, so none of it is a tile — see the note in
       tools/sheets/town.mjs about why the atlas has one road surface in it and
       no markings at all. R.roadPaint() draws these; the vocabulary is six
       words wide and is documented there.

       All of it laid out lane by lane, because the lanes are real: traffic
       drives on the left out here, the routes in `cars:` below are written for
       the correct side, and a centre line down the wrong place would make
       every one of them look like a mistake. */
    paint: [
      /* THE CENTRE LINES. One per carriageway, broken at every junction and at
         every crossing rather than run straight through them — a centre line
         painted through a zebra or across a side road is the one marking error
         you can see from a moving car. Six-tile carriageways throughout, so
         each of these is three tiles in from either kerb. */
      { p: 'dash', a: [0, 19], b: [8, 19] },
      { p: 'dash', a: [14, 19], b: [30, 19] },
      { p: 'dash', a: [34, 19], b: [60, 19] },
      { p: 'dash', a: [66, 19], b: [91, 19] },
      { p: 'dash', a: [96, 19], b: [102, 19] },
      { p: 'dash', a: [108, 19], b: [114, 19] },
      { p: 'dash', a: [0, 37], b: [8, 37] },
      { p: 'dash', a: [14, 37], b: [17, 37] },
      { p: 'dash', a: [22, 37], b: [44, 37] },
      { p: 'dash', a: [48, 37], b: [60, 37] },
      { p: 'dash', a: [66, 37], b: [102, 37] },
      { p: 'dash', a: [108, 37], b: [114, 37] },
      { p: 'dash', a: [0, 55], b: [8, 55] },
      { p: 'dash', a: [14, 55], b: [60, 55] },
      { p: 'dash', a: [66, 55], b: [76, 55] },
      { p: 'dash', a: [80, 55], b: [102, 55] },
      { p: 'dash', a: [108, 55], b: [114, 55] },
      { p: 'dash', a: [11, 24], b: [11, 32] },
      { p: 'dash', a: [11, 42], b: [11, 50] },
      { p: 'dash', a: [63, 24], b: [63, 32] },
      { p: 'dash', a: [63, 42], b: [63, 50] },
      { p: 'dash', a: [105, 24], b: [105, 32] },
      { p: 'dash', a: [105, 42], b: [105, 50] },
      /* GIVE WAY. Every mouth where a north–south street meets one of the two
         long roads — twelve of them, which is what a grid costs. The traffic
         does actually yield at these, and to the right where two of them want
         the junction at once; see steerTraffic() in engine/cars.js. */
      { p: 'line', a: [8, 22], b: [14, 22] },
      { p: 'line', a: [8, 33.9], b: [14, 33.9] },
      { p: 'line', a: [8, 40.1], b: [14, 40.1] },
      { p: 'line', a: [8, 51.9], b: [14, 51.9] },
      /* EXCEPT AT CARGATE LANE, which has lights on it now. A give-way line
         is the thin one you may cross when the road is clear and a stop line
         is the fat one you may not cross at all, and putting the wrong one
         under a signal is the same class of error as the centre line painted
         through a zebra. The two on the High Street are new: until there were
         lights there was nothing to stop the main road, so the main road had
         no line. See `signals:` below. */
      { p: 'stop', a: [60, 22.2], b: [66, 22.2] },
      { p: 'stop', a: [59, 16], b: [59, 19] },
      { p: 'stop', a: [66, 19], b: [66, 22] },
      { p: 'line', a: [60, 33.9], b: [66, 33.9] },
      { p: 'line', a: [60, 40.1], b: [66, 40.1] },
      { p: 'line', a: [60, 51.9], b: [66, 51.9] },
      { p: 'line', a: [102, 22], b: [108, 22] },
      { p: 'line', a: [102, 33.9], b: [108, 33.9] },
      { p: 'line', a: [102, 40.1], b: [108, 40.1] },
      { p: 'line', a: [102, 51.9], b: [108, 51.9] },
      /* No parking outside the shops, which is where everybody parks. */
      { p: 'yellow', a: [42, 16.2], b: [112, 16.2] },
      /* Three crossings, each of them where people actually cross: between the
         bus stop and the Greggs, outside the units on Fenn Street, and by the
         drive-thru on Corven Way, which is the only one anybody uses correctly
         because the other side of it is a bin. */
      { p: 'zebra', r: [30, 16, 33, 21] },
      { p: 'zebra', r: [44, 34, 47, 39] },
      { p: 'zebra', r: [76, 52, 79, 57] },
      /* AND TWO THAT ARE NOT ZEBRAS. One word rather than two, because on the
         ground it is one marking: `pelican` draws the studs across the road
         and the zig-zags up both approaches, and between them they are how you
         know which kind of crossing you are looking at from further away than
         you can see a lamp.

         Both are exactly where somebody was already crossing without one. The
         man on the phone has walked over the High Street at this point every
         lap since the day there were people out here, and the hi-vis has
         crossed Fenn Street at that one — `peds:` below says as much, in a
         comment about the difference between jaywalking and walking into a
         car. A crossing goes where the desire line is or it goes nowhere. */
      { p: 'pelican', r: [92, 16, 95, 21] },
      { p: 'pelican', r: [18, 34, 21, 39] },
      /* Their stop lines, a tile back from the studs on each approach, which is
         where a stop line goes: far enough that a car at it is not standing on
         the crossing and near enough that the driver can still see the studs. */
      { p: 'stop', a: [91, 16], b: [91, 19] },
      { p: 'stop', a: [97, 19], b: [97, 22] },
      { p: 'stop', a: [17, 34], b: [17, 37] },
      { p: 'stop', a: [23, 37], b: [23, 40] },
      /* Twenty-two spaces at the office, and the writing has said twenty-two
         for months. Seven, then the walkway to the doors, then four; eleven
         along the south wall. The `open` side is the one you drive in from. */
      { p: 'bays', r: [5, 3, 18, 5], open: 's' },
      { p: 'bays', r: [23, 3, 30, 5], open: 's' },
      { p: 'bays', r: [5, 10, 26, 12], open: 'n' },
      /* And fifteen at the retail park, in two banks along the back wall with
         the lane you come in through between them and the whole rest of it
         left as aisle. That is what a retail park is, and it is also the only
         piece of open tarmac on this map wide enough to get a car properly
         sideways on. */
      { p: 'bays', r: [19, 43, 32, 45], open: 's' },
      { p: 'bays', r: [39, 43, 54, 45], open: 's' },
      { p: 'text', at: [20.5, 7.2], s: 'KEEP CLEAR' },
      { p: 'text', at: [35.5, 11], s: 'SLOW', turn: 1 },
      { p: 'text', at: [36.5, 47.4], s: 'MAX 5 MPH' },
      { p: 'text', at: [86, 53.4], s: 'SLOW' },

      /* ================= SOUTH OF THE LINE =================
         THE TWO RUNNING LINES, and they are in this list rather than in the
         atlas for precisely the reason the centre lines are: a track is
         linework laid on the ground at a position, and a track that came in
         32-pixel pieces would put a sleeper joint every metre. See the `rails`
         entry in R.roadPaint()'s vocabulary.

         The down line is the one the platform at row 61 serves and the up line
         the one at row 66, which is why they are three rows apart with the
         six-foot between them and not two rows apart with nothing. Both run the
         full width, over the embankment at the river and out of sight at both
         ends of the map, because that is what a main line does to a town it
         does not stop at.

         Three segments each, and the two gaps in them are the two bridges. A
         bridge deck is on TOP of the railway and a track painted across one is
         a track painted on a road, which is exactly what it looked like — drawn
         as one run — to anybody who stood in the middle of Cargate Lane and
         looked down at their own feet.

         The SUBWAY is not a gap and must not be, for the same reason from the
         other side: it goes UNDER, so the rails run straight over the top of
         it, and the pale strip of tunnel showing between them is the only thing
         on that whole embankment that tells you so. */
      { p: 'rails', a: [0, 63.5], b: [58, 63.5] },
      { p: 'rails', a: [68, 63.5], b: [100, 63.5] },
      { p: 'rails', a: [110, 63.5], b: [114, 63.5] },
      { p: 'rails', a: [0, 65.5], b: [58, 65.5] },
      { p: 'rails', a: [68, 65.5], b: [100, 65.5] },
      { p: 'rails', a: [110, 65.5], b: [114, 65.5] },
      /* STATION ROAD's centre line, broken at the crossing, at the two bridge
         mouths and at both junctions. */
      { p: 'dash', a: [7, 74], b: [10, 74] },
      { p: 'dash', a: [16, 74], b: [46, 74] },
      { p: 'dash', a: [50, 74], b: [60, 74] },
      { p: 'dash', a: [66, 74], b: [86, 74] },
      { p: 'dash', a: [90, 74], b: [102, 74] },
      { p: 'dash', a: [108, 74], b: [113, 74] },
      /* WEIRBANK ROAD's, the same, broken at its one crossing and at the ramp
         down to the quay. */
      { p: 'dash', a: [7, 101], b: [10, 101] },
      { p: 'dash', a: [16, 101], b: [36, 101] },
      { p: 'dash', a: [40, 101], b: [102, 101] },
      { p: 'dash', a: [108, 101], b: [113, 101] },
      /* The three north–south ones, each stopping short of the junction at
         either end of it. */
      { p: 'dash', a: [13, 79], b: [13, 96] },
      { p: 'dash', a: [105, 79], b: [105, 96] },
      { p: 'dash', a: [105, 60], b: [105, 69] },
      { p: 'dash', a: [63, 60], b: [63, 69] },
      /* GIVE WAY at every mouth where a north–south street meets one of the two
         long ones down here, the same six-tile line in the same place relative
         to the carriageway as the twelve upstairs: a shade outside the major
         road's tarmac, on the minor road, where the traffic actually yields. */
      { p: 'line', a: [10, 77.1], b: [16, 77.1] },
      { p: 'line', a: [10, 97.9], b: [16, 97.9] },
      { p: 'line', a: [102, 70.9], b: [108, 70.9] },
      { p: 'line', a: [102, 77.1], b: [108, 77.1] },
      { p: 'line', a: [102, 97.9], b: [108, 97.9] },
      /* Cargate Lane comes off the bridge and stops dead at Station Road, which
         is the only T-junction on this map and the reason the queue for the
         bridge backs up onto Corven Way every morning. */
      { p: 'line', a: [60, 70.9], b: [66, 70.9] },
      /* No parking outside the old town's two gates, which is where the taxis
         wait and where the delivery vans for the whole of Priorygate stop,
         because there is nowhere else and there never has been. */
      /* Double yellows go on the CARRIAGEWAY, hard against the kerb. These two
         were at 77.2 and 96.8, which is on the wrong side of the kerb line in
         both cases — two tenths of a tile up onto the footway, where no line is
         ever painted and where the van below was parked on top of them. Station
         Road's carriageway ends at y=77.0 and Weirbank's begins at y=98.0, so
         they belong just inside those, not just outside. */
      { p: 'yellow', a: [44, 76.8], b: [58, 76.8] },
      { p: 'yellow', a: [94, 98.2], b: [110, 98.2] },
      /* Three crossings, and all three are where somebody actually crosses:
         outside the North Gate, outside the Water Gate, and outside the station
         that shut in 1967, which still has more people crossing to it than the
         other two put together because of where the subway comes out. */
      { p: 'zebra', r: [46, 71, 49, 76] },
      { p: 'zebra', r: [86, 71, 89, 76] },
      { p: 'zebra', r: [36, 98, 39, 103] },
      /* Twelve on the quay, in one bank along the water. The open side faces
         the warehouses because that is the way you come in, and it means every
         car down there is parked nose-out over four feet of nothing, which is
         the correct amount of alarming. */
      { p: 'bays', r: [57, 110, 78, 112], open: 'n' },
      { p: 'text', at: [42, 107.4], s: 'RAMP' },
      { p: 'text', at: [67.5, 109.9], s: 'PAY & DISPLAY' },
      { p: 'text', at: [63, 67], s: 'SLOW', turn: 1 },

      /* ---------- KERBSIDE PARKING ----------
         Every carriageway on this map is six tiles across and every one of them
         is driven on four. That was not a decision, it was an accident of
         laying the town out as pavement-road-pavement and giving the road a
         generous middle: the traffic circuits in `cars` below run at 17.5 and
         20.5 on Bellhaven, 35.5 and 38.5 on Fenn, and so on down the map, which
         leaves the tile against each kerb permanently, structurally empty. A
         hundred and ten tiles of it, per side, per road. It read as a runway
         with a dashed line down it, and the only thing to do on it was cross it.

         So the outer tile on each side is parking, which is what a road that
         wide has ALWAYS been — the six tiles were never six lanes, they were
         two lanes and two rows of parked cars, and nobody had said so. Nothing
         about the traffic changes: not one route moves, and no parked car is
         within a tile of a lane a moving one uses.

         Where the runs stop is where a real one stops. Junction mouths, both
         sides of every zebra, the length of the double yellows on the north
         side of the High Street, and seven tiles round each bus stop. See
         tools' kerb pass in the commit that added these — every gap below was
         computed off the surfaces, the zebras and the yellows rather than
         eyeballed, and then broken further into stretches, because a kerb that
         is parking for sixty tiles without a break is as unreal as one that is
         empty for sixty. */
      /* Bellhaven Road, north kerb */
      { p: 'kerbside', r: [2, 16, 14, 16], side: 'n' },
      /* Bellhaven Road, south kerb */
      { p: 'kerbside', r: [2, 21, 7, 21], side: 's' },
      { p: 'kerbside', r: [14, 21, 26, 21], side: 's' },
      { p: 'kerbside', r: [34, 21, 46, 21], side: 's' },
      { p: 'kerbside', r: [52, 21, 59, 21], side: 's' },
      { p: 'kerbside', r: [66, 21, 78, 21], side: 's' },
      /* Cut at x=87: the new crossing's zig-zags start there, and the whole
         point of a zig-zag is that nothing may be left on one. */
      { p: 'kerbside', r: [84, 21, 86, 21], side: 's' },
      { p: 'kerbside', r: [0, 16, 1, 16], side: 'n' },
      { p: 'kerbside', r: [108, 21, 113, 21], side: 's' },
      /* Fenn Street, north kerb. The run that used to start at x=14 has gone
         entirely: the crossing and its zig-zags take thirteen of the fourteen
         tiles between the Aldergate junction and x=27, and a bay that is one
         tile long is a dropped kerb. */
      /* Fenn Street, north kerb */
      { p: 'kerbside', r: [32, 34, 37, 34], side: 'n' },
      { p: 'kerbside', r: [48, 34, 59, 34], side: 'n' },
      { p: 'kerbside', r: [66, 34, 78, 34], side: 'n' },
      { p: 'kerbside', r: [84, 34, 96, 34], side: 'n' },
      /* Fenn Street, south kerb — same stretch, gone for the same reason. */
      /* Fenn Street, south kerb */
      { p: 'kerbside', r: [32, 39, 43, 39], side: 's' },
      { p: 'kerbside', r: [48, 39, 59, 39], side: 's' },
      { p: 'kerbside', r: [66, 39, 78, 39], side: 's' },
      { p: 'kerbside', r: [84, 39, 96, 39], side: 's' },
      { p: 'kerbside', r: [0, 34, 6, 34], side: 'n' },
      { p: 'kerbside', r: [108, 34, 113, 34], side: 'n' },
      { p: 'kerbside', r: [0, 39, 6, 39], side: 's' },
      { p: 'kerbside', r: [108, 39, 113, 39], side: 's' },
      /* Corven Way, north kerb */
      { p: 'kerbside', r: [14, 52, 26, 52], side: 'n' },
      { p: 'kerbside', r: [32, 52, 44, 52], side: 'n' },
      { p: 'kerbside', r: [50, 52, 59, 52], side: 'n' },
      { p: 'kerbside', r: [66, 52, 75, 52], side: 'n' },
      { p: 'kerbside', r: [88, 52, 100, 52], side: 'n' },
      /* Corven Way, south kerb */
      { p: 'kerbside', r: [8, 57, 20, 57], side: 's' },
      { p: 'kerbside', r: [26, 57, 38, 57], side: 's' },
      { p: 'kerbside', r: [50, 57, 59, 57], side: 's' },
      { p: 'kerbside', r: [66, 57, 75, 57], side: 's' },
      { p: 'kerbside', r: [80, 57, 92, 57], side: 's' },
      { p: 'kerbside', r: [0, 52, 6, 52], side: 'n' },
      { p: 'kerbside', r: [108, 52, 113, 52], side: 'n' },
      { p: 'kerbside', r: [0, 57, 6, 57], side: 's' },
      { p: 'kerbside', r: [108, 57, 113, 57], side: 's' },
      /* Station Road, north kerb */
      { p: 'kerbside', r: [24, 71, 36, 71], side: 'n' },
      { p: 'kerbside', r: [50, 71, 59, 71], side: 'n' },
      { p: 'kerbside', r: [66, 71, 78, 71], side: 'n' },
      { p: 'kerbside', r: [92, 71, 101, 71], side: 'n' },
      /* Station Road, south kerb */
      { p: 'kerbside', r: [16, 76, 28, 76], side: 's' },
      { p: 'kerbside', r: [34, 76, 43, 76], side: 's' },
      { p: 'kerbside', r: [68, 76, 80, 76], side: 's' },
      { p: 'kerbside', r: [90, 76, 101, 76], side: 's' },
      /* Weirbank Road, north kerb */
      { p: 'kerbside', r: [16, 98, 28, 98], side: 'n' },
      { p: 'kerbside', r: [40, 98, 52, 98], side: 'n' },
      { p: 'kerbside', r: [58, 98, 70, 98], side: 'n' },
      { p: 'kerbside', r: [76, 98, 88, 98], side: 'n' },
      /* Weirbank Road, south kerb */
      { p: 'kerbside', r: [16, 103, 28, 103], side: 's' },
      { p: 'kerbside', r: [44, 103, 56, 103], side: 's' },
      { p: 'kerbside', r: [62, 103, 74, 103], side: 's' },
      { p: 'kerbside', r: [80, 103, 92, 103], side: 's' }
    ],

    /* ---------- THE LIGHTS ----------
       Three sets of them, which for a town this size is about right and is two
       more than Bellhaven had. What they DO is engine/signals.js; this is only
       where they are, and it is written the way every other table out here is
       written — in tiles, with the pixels worked out at build time.

       An arm is one approach. `at` is the tile the post stands on, and the post
       is real: World.build makes furniture of it, so it is solid, you walk
       round it, and on a crossing you can press it. `go` is the direction the
       traffic it holds is TRAVELLING, which is how the head knows which way to
       face and how a westbound signal knows to leave an eastbound car alone.
       `stop` is the point on the lane where the line is painted, and it is the
       only number here that is not a whole tile: a lane is half a tile off the
       grid and a stop line is painted across a lane, not across a square.
       `g` groups arms that get the road together.

       Every stop line below has a `{ p: 'stop', ... }` in `paint:` above at the
       same place, and they have to agree — the line is what the driver sees and
       this is what the driver obeys. They are two entries rather than one on
       purpose: what is painted on a road and what a signal is doing are
       different facts, and there is a set of lights on Station Road that has
       painted lines and no phases at all. */
    signals: [
      /* THE HIGH STREET AND CARGATE LANE, which is a T because Cargate Lane
         does not go north of the shops, and which is the busiest junction on
         this map: everything on four wheels that goes round the west block or
         the east block comes through it, and the two buses go straight over.

         It was a give way sign until today. What the sign could never do is the
         thing you can now stand on the corner and watch: a car coming up
         Cargate in the gap between the 41 and the 41A used to wait for both of
         them, because giving way means waiting for a gap and there is no gap on
         the High Street between ten past nine and four. The lights make one.

         `rest: 0` is the High Street, and it is the whole of the difference
         between these and a fixed cycle. A junction that rests on the side
         street is a junction that stops the main road at three in the morning
         for a lane with nothing in it — so this one sits green to the High
         Street and only ever changes because something has come up Cargate and
         asked. See Signals.nextGroup(). */
      /* `green` is the MINIMUM. It holds the road for nine seconds whatever is
         waiting on Cargate Lane, then goes at the first gap in its own traffic
         — and if there is no gap, at twenty-six. See Signals.junctionTick(). */
      { id: 'cargate', kind: 'junction', green: 9, rest: 0,
        arms: [
          { g: 0, at: [59, 15], go: 'e', stop: [59, 17.5] },
          { g: 0, at: [66, 22], go: 'w', stop: [66, 20.5] },
          { g: 1, at: [59, 22], go: 'n', stop: [61.5, 22.4] }
        ] },

      /* THE CROSSING ON THE HIGH STREET. A pelican, with the button, the WAIT
         plate, the green man, the bleeper and the five seconds of flashing
         amber at the end that are the only aspect in this game meaning "go if
         you can" — and which need no code at all, because a car in Bellhaven
         has stopped for anybody in front of it since long before there was a
         crossing to do it on.

         Two poles, diagonally opposite, each carrying the head that holds the
         traffic on its own side and the man facing back across the road. That
         is not a simplification: it is the layout of every pelican in the
         country, and the reason the button you press is never the one on the
         side you are going to. */
      { id: 'highcross', kind: 'pelican', over: [92, 16, 95, 21],
        arms: [
          { g: 0, at: [91, 15], go: 'e', stop: [91, 17.5] },
          { g: 0, at: [97, 22], go: 'w', stop: [97, 20.5] }
        ] },

      /* AND THE ONE ON FENN STREET, which is four tiles from the mouth of
         Aldergate Rise and is therefore too close to the junction. It is too
         close to the junction because that is where people cross: the hi-vis
         has walked over Fenn Street at this point every lap since the day there
         were people out here, and a crossing put somewhere tidier would be a
         crossing nobody uses and a desire line still worn across the road forty
         yards away. Every highway authority in England has had this argument
         and most of them have lost it in the same direction. */
      { id: 'fenncross', kind: 'pelican', over: [18, 34, 21, 39],
        arms: [
          { g: 0, at: [17, 33], go: 'e', stop: [17, 35.5] },
          { g: 0, at: [23, 40], go: 'w', stop: [23, 38.5] }
        ] }
    ],
    doors: [],
    /* In the walkway between the two banks of bays, facing away from the
       doors. Not in a bay: you come out of a building on foot. */
    entries: {
      doors: [20.5, 4.5], fireEscape: [26.5, 3.5], greggs: [31.5, 22.5],
      /* On the pavement outside each one, which is where you are standing when
         you come back out of it. */
      pub: [86.5, 15.5], bookies: [54.5, 15.5], laund: [92.5, 15.5],
      postoff: [98.5, 15.5], charity: [60.5, 15.5], kebab: [104.5, 15.5], vapour: [66.5, 15.5],
      nails: [46.5, 15.5],
      /* Back off Marley Road, on the south pavement of Corven Way where the
         signpost is. */
      corvenEast: [110.5, 58.5],
      /* The door between the launderette and the post office, which is where
         the door to the flats above a parade always is. */
      flats: [96.5, 15.5],
      /* And five on Fenn Street, where the pavement is row 33 rather than row
         15 because the parade faces the other way round the block. */
      tyre: [20.5, 33.5], unitsix: [30.5, 33.5], club: [72.5, 33.5], tan: [82.5, 33.5],
      /* And five in the old town, where the frontages are on row 84 of
         Priorygate and the rule is the parade's: you come out of a shop one row
         below its sign, standing on the street. */
      books: [54.5, 85.5], caff: [58.5, 85.5], mitre: [48.5, 85.5],
      market: [30.5, 81.5],
      /* The minster is the one frontage on this map whose door faces SOUTH, for
         the reason its own comment gives down in `furnish` — so you come out of
         it onto the walk on the south side and the building is behind you. */
      minster: [56.5, 94.5],
    },
    links: [
      /* THE FRONT DOORS GO TO THE GROUND FLOOR, which is where front doors go.
         They pointed at the fourth for a year because the fourth floor had a
         reception drawn on it. */
      { via: 'frontDoors', to: 'ground', entry: 'doors' },
      /* East, out of the town altogether — see data/outskirts.js, which is the
         one level here nobody wrote down. */
      { via: 'outskirtsRoad', to: 'outskirts', entry: 'road' },
      /* And the foot of the fire escape, which is a way back IN and exists so
         that four hundred people can come back off the tarmac after a drill —
         see the note on the fourth floor's links. */
      { via: 'fireEscape', to: 'office', entry: 'stairs' },
      /* The four shopfronts on this street with a floor behind them. */
      { via: 'greggsDoor', to: 'greggs', entry: 'door' },
      { via: 'pubDoor', to: 'pub', entry: 'door' },
      { via: 'bookiesDoor', to: 'bookies', entry: 'door' },
      { via: 'laundDoor', to: 'laund', entry: 'door' },
      { via: 'postoffDoor', to: 'postoff', entry: 'door' },
      { via: 'charityDoor', to: 'charity', entry: 'door' },
      { via: 'kebabDoor', to: 'kebab', entry: 'door' },
      { via: 'vapourDoor', to: 'vapour', entry: 'door' },
      { via: 'nailsDoor', to: 'nails', entry: 'door' },
      { via: 'flatsDoor', to: 'flats', entry: 'door' },
      /* The back of the block. The car wash is deliberately not among them:
         it has no door, because it is not a building you go into — see the
         `fromCar` furnishing on its frontage below. */
      { via: 'tyreDoor', to: 'tyre', entry: 'door' },
      { via: 'sixDoor', to: 'unitsix', entry: 'door' },
      { via: 'clubDoor', to: 'club', entry: 'door' },
      { via: 'tanDoor', to: 'tan', entry: 'door' },
      /* And the old town's five. Ten frontages on Priorygate and five of them
         have a floor behind them, which is a better hit rate than the parade
         manages and is meant to be: the difference between a high street that
         works and one that does not is how many of the doors open. */
      { via: 'bookDoor', to: 'bookshop', entry: 'door' },
      { via: 'caffDoor', to: 'caff', entry: 'door' },
      { via: 'mitreDoor', to: 'mitre', entry: 'door' },
      { via: 'marketDoor', to: 'markethall', entry: 'door' },
      { via: 'minsterDoor', to: 'minster', entry: 'door' },
    ],
    /* The cars. Parked ones sit in bays and are scenery you can walk round and
       bump into; two of them are worth pressing E on and exactly one of them
       will let you in. The last four have a `route` instead of a bay, which is
       the whole of what makes them traffic — see engine/cars.js.

       Positions are in TILES and may be fractional, like `entries` above, and
       for the same reason: this file is data and loads before engine/core.js
       declares TILE. A bay is two tiles wide, so a car centred on a bay is
       centred on a whole number.

       DOWN THE BAY is the other half of that, and it moved when the vehicles
       did. A bay is three tiles deep and a car used to be a tile and three
       quarters long, so where it sat in one barely mattered; at full size it
       very nearly fills one, and the same numbers put its nose in the car park
       wall. These are the middle of the bay rather than the head of it, which
       is where a parked car is. */
    cars: [
      { x: 8, y: 4.5, face: 'n', model: 'hatch', name: 'A hatchback', use: 'someHatchback' },
      { x: 12, y: 4.5, face: 'n', model: 'estate', name: 'An estate car with a roof box', use: 'roofBox' },
      { x: 16, y: 4.5, face: 'n', model: 'pool', name: 'The pool car', use: 'poolCar', drive: true },
      /* x=18 is Nigel's, and it is empty. That is the joke and it only works
         if nothing is parked in it. */
      { x: 26, y: 4.5, face: 'n', model: 'small', name: 'A small blue car', use: 'someoneElsesCar' },
      /* On the line, across two of them, at the one time of day when the car
         park is full. Nobody has ever seen it arrive. */
      { x: 11, y: 11.35, face: 's', model: 'van', name: 'The contractor’s van', use: 'contractorVan' },
      { x: 20, y: 11.5, face: 's', model: 'saloon', name: 'A green saloon', use: 'someoneElsesCar' },
      { x: 24, y: 11.5, face: 's', model: 'small', name: 'A small blue car', use: 'someoneElsesCar' },
      /* Two wheels up on the pavement outside the nail bar, which is why the
         lane past it is clear and the footway is not. Deliberate, on both
         counts: it keeps the traffic moving, and it is a more accurate
         portrait of the man than parking neatly would be. Facing east because
         the north kerb is the eastbound side — see the lane table below. */
      { x: 44, y: 15.7, face: 'e', model: 'estate', body: '#9ba1a8', roof: '#7c828a',
        name: 'A silver estate, half on the pavement', use: 'nigelsCar' },
      /* ---- the retail park ----
         Four in the bays and one across two of them, because that is a retail
         park car park at any hour of any day. */
      { x: 22, y: 44.5, face: 'n', model: 'hatch', body: '#2f4a3a', roof: '#25392d', name: 'A green hatchback', use: 'someoneElsesCar' },
      { x: 28, y: 44.5, face: 'n', model: 'small', name: 'A small blue car', use: 'someoneElsesCar' },
      { x: 42, y: 44.5, face: 'n', model: 'estate', body: '#6d6f74', roof: '#54565a', name: 'A grey estate', use: 'someoneElsesCar' },
      { x: 48, y: 44.5, face: 'n', model: 'saloon', body: '#8a2f34', roof: '#6b242a', name: 'A red saloon', use: 'someoneElsesCar' },
      { x: 48, y: 47.6, face: 'w', model: 'van', name: 'A van, waiting', use: 'waitingVan' },

      /* ---- TRAFFIC ----
         WHICH SIDE OF THE ROAD. Face east and north is on your left, so the
         eastbound carriageway is the northern one; face west and it is the
         southern one; northbound keeps to the west lane and southbound to the
         east. Every route below is written to that table and the paint above
         agrees with it, which between them are the only two things making this
         look like a country rather than a car park.

           eastbound   Bellhaven y 17.5   Fenn y 35.5   Corven y 53.5
           westbound   Bellhaven y 20.5   Fenn y 38.5   Corven y 56.5
           northbound  Aldergate x 9.5    Cargate x 61.5   Marlow x 103.5
           southbound  Aldergate x 12.5   Cargate x 64.5   Marlow x 106.5

         Four circuits through nine junctions, and they genuinely cross: the
         west block one way, the west block the other way, the east block, and
         a long one round the outside of the lot. Where two of them want the
         same junction at the same moment one of them waits, which is the whole
         reason for having four rather than one going round faster.
         `leg`/`along` are where each starts — which side, and how far along. */
      { model: 'saloon', name: 'A car, passing', use: 'passingCar', traffic: true, cruise: 150, leg: 0, along: 8,
        route: [[9.5, 17.5], [64.5, 17.5], [64.5, 38.5], [9.5, 38.5]] },
      { model: 'taxi', name: 'A taxi, passing', use: 'passingCar', traffic: true, cruise: 165, leg: 2, along: 14,
        route: [[9.5, 17.5], [64.5, 17.5], [64.5, 38.5], [9.5, 38.5]] },
      { model: 'small', name: 'A car, passing', use: 'passingCar', traffic: true, cruise: 140, leg: 0, along: 20,
        route: [[61.5, 20.5], [12.5, 20.5], [12.5, 35.5], [61.5, 35.5]] },
      { model: 'van', name: 'A delivery van, passing', use: 'passingCar', traffic: true, cruise: 120, leg: 2, along: 30,
        route: [[61.5, 20.5], [12.5, 20.5], [12.5, 35.5], [61.5, 35.5]] },
      /* The east block. */
      { model: 'hatch', name: 'A car, passing', use: 'passingCar', traffic: true, cruise: 155, leg: 0, along: 12,
        route: [[61.5, 17.5], [106.5, 17.5], [106.5, 38.5], [61.5, 38.5]] },
      { model: 'saloon', body: '#2f3d5a', roof: '#25304a', name: 'A car, passing', use: 'passingCar', traffic: true, cruise: 135, leg: 2, along: 20,
        route: [[61.5, 17.5], [106.5, 17.5], [106.5, 38.5], [61.5, 38.5]] },
      /* The long way round: Fenn Street, Marlow, Corven Way, Aldergate. */
      { model: 'small', body: '#7a5f2f', roof: '#5e4924', name: 'A car, passing', use: 'passingCar', traffic: true, cruise: 145, leg: 1, along: 6,
        route: [[9.5, 35.5], [106.5, 35.5], [106.5, 56.5], [9.5, 56.5]] },
      /* Learner. Doing thirty-eight in a forty and entirely within its rights,
         and the reason there is ever a queue on Corven Way. */
      { model: 'small', body: '#d8d5cc', roof: '#c2bfb5', name: 'A driving school car', use: 'learner', traffic: true, cruise: 78, leg: 3, along: 22,
        route: [[9.5, 35.5], [106.5, 35.5], [106.5, 56.5], [9.5, 56.5]] },
      /* The 41A, which does not stop at the bus stop. That is not an oversight
         and never has been: it is the first thing the bus stop's own sign has
         said about it since long before there was a road here to not stop on. */
      { model: 'bus', name: 'The 41A', use: 'theBus', traffic: true, cruise: 128, leg: 0, along: 40,
        route: [[9.5, 17.5], [106.5, 17.5], [106.5, 56.5], [9.5, 56.5]] },
      /* AND THE 41, WHICH STOPS. The same route, to the tile, because that is
         what the bus stop's sign has always said about the pair of them — the
         41A is the same route as the 41 except that it does not stop here. One
         of them has `stops:` and the other does not, and that one field is the
         whole of the difference between two buses that a town has argued about
         for years.

         A different green so you can tell which is coming from the far end of
         Bellhaven Road, because six people's evening depends on knowing that
         and so, now, does yours.

         The two stops are the ones with poles on the pavement beside them:
         outside this building, and down on Corven Way by the railway. It
         serves them in that order going round, which means the walk is four
         minutes and the bus is eleven, and everybody takes the bus. */
      { model: 'bus', body: '#2f5d43', roof: '#f0ece2', name: 'The 41', use: 'theFortyOne',
        traffic: true, cruise: 120, leg: 2, along: 30,
        route: [[9.5, 17.5], [106.5, 17.5], [106.5, 56.5], [9.5, 56.5]],
        stops: [{ at: [26.5, 17.5], secs: 7 }, { at: [46.5, 56.5], secs: 7 }] },
      /* TWO OF THEM, because a route with one bus on it is not a route, it is
         a lay-by with a timetable. A lap of this network is the better part of
         a minute and a half, which is a very long time to stand at a pole in
         the rain watching a game not happen; half of that is a wait, and a
         wait is what a bus stop is for. Started half a loop apart. */
      { model: 'bus', body: '#2f5d43', roof: '#f0ece2', name: 'The 41', use: 'theFortyOne',
        traffic: true, cruise: 120, leg: 0, along: 62,
        route: [[9.5, 17.5], [106.5, 17.5], [106.5, 56.5], [9.5, 56.5]],
        stops: [{ at: [26.5, 17.5], secs: 7 }, { at: [46.5, 56.5], secs: 7 }] },

      /* ================= SOUTH OF THE LINE =================
         Parked first. The old town has no cars in it at all, which leaves
         exactly three places down here anybody can leave one: the quay's
         pay-and-display, the yellow lines outside the North Gate that nobody
         has ever been ticketed on, and Weirbank Road. */
      { x: 60, y: 111, face: 'n', model: 'hatch', body: '#2d3f52', roof: '#233246', name: 'A blue hatchback', use: 'someoneElsesCar' },
      { x: 64, y: 111, face: 'n', model: 'small', name: 'A small blue car', use: 'someoneElsesCar' },
      { x: 70, y: 111, face: 'n', model: 'estate', body: '#57624f', roof: '#434d3d', name: 'An olive estate', use: 'someoneElsesCar' },
      { x: 76, y: 111, face: 'n', model: 'van', body: '#7b4f3a', roof: '#63402f', name: 'The chandler’s van', use: 'chandlerVan' },
      /* On the double yellows outside the North Gate, on its hazards, with
         nobody in it, delivering to a street no vehicle is allowed up. It is
         there every morning and it is the reason the queue for the bridge is
         what it is. */
      { x: 52, y: 76.5, face: 'e', model: 'van', body: '#d8d5cc', roof: '#c2bfb5',
        name: 'A van on the yellows, hazards going', use: 'yellowsVan' },

      /* ---------- THE CARS THAT ARE NOT GOING ANYWHERE ----------
         Twenty-nine of them, one in every other stretch of kerbside paint above
         and never two stretches running, because a kerb with a car in every bay
         is a car park and a kerb with none is a road nobody lives on. They have
         no `route`, so nothing in engine/cars.js ever looks at them twice; they
         are scenery with a bonnet, and the act on them says as much. */
      { x: 4, y: 16.5, face: 'e', model: 'saloon', body: '#8a2f34', roof: '#6b242a', name: 'A red saloon', use: 'parkedCar' },
      { x: 13, y: 16.5, face: 'w', model: 'hatch', body: '#2d3f52', roof: '#233246', name: 'A blue hatchback', use: 'parkedCar' },
      { x: 16, y: 21.5, face: 'e', model: 'hatch', body: '#6b3350', roof: '#552840', name: 'A plum hatchback', use: 'parkedCar' },
      { x: 54, y: 21.5, face: 'e', model: 'estate', body: '#57624f', roof: '#434d3d', name: 'An olive estate', use: 'parkedCar' },
      { x: 86, y: 21.5, face: 'e', model: 'small', name: 'A small blue car', use: 'parkedCar' },
      /* ON THE ZIG-ZAGS, which is the only thing this van was ever going to
         do. It used to be at x=95, in a bay; x=95 is the middle of the new
         crossing, so it had to move, and this is where it moved to. Nothing
         about it is in a live lane and nothing about it is legal. */
      { x: 89, y: 21.5, face: 'w', model: 'van', body: '#d8d5cc', roof: '#c2bfb5', name: 'A white van on the zig-zags', use: 'zigzagVan' },
      { x: 34, y: 34.5, face: 'e', model: 'small', body: '#7d6a4f', roof: '#63543f', name: 'A beige runabout', use: 'parkedCar' },
      { x: 68, y: 34.5, face: 'e', model: 'saloon', body: '#8a2f34', roof: '#6b242a', name: 'A red saloon', use: 'parkedCar' },
      /* Two came off this stretch with the paint: the crossing on Fenn Street
         is where they were parked. Twenty-nine became twenty-seven, and the
         twenty-eighth is on the zig-zags on the High Street above. */
      { x: 50, y: 39.5, face: 'e', model: 'estate', body: '#57624f', roof: '#434d3d', name: 'An olive estate', use: 'parkedCar' },
      { x: 86, y: 39.5, face: 'e', model: 'small', name: 'A small blue car', use: 'parkedCar' },
      { x: 34, y: 52.5, face: 'e', model: 'small', body: '#7d6a4f', roof: '#63543f', name: 'A beige runabout', use: 'parkedCar' },
      { x: 43, y: 52.5, face: 'w', model: 'hatch', body: '#2f4a3a', roof: '#25392d', name: 'A green hatchback', use: 'parkedCar' },
      { x: 68, y: 52.5, face: 'e', model: 'saloon', body: '#8a2f34', roof: '#6b242a', name: 'A red saloon', use: 'parkedCar' },
      { x: 10, y: 57.5, face: 'e', model: 'hatch', body: '#6b3350', roof: '#552840', name: 'A plum hatchback', use: 'parkedCar' },
      { x: 52, y: 57.5, face: 'e', model: 'estate', body: '#57624f', roof: '#434d3d', name: 'An olive estate', use: 'parkedCar' },
      { x: 82, y: 57.5, face: 'e', model: 'small', name: 'A small blue car', use: 'parkedCar' },
      { x: 52, y: 71.5, face: 'e', model: 'small', body: '#7d6a4f', roof: '#63543f', name: 'A beige runabout', use: 'parkedCar' },
      { x: 94, y: 71.5, face: 'e', model: 'saloon', body: '#8a2f34', roof: '#6b242a', name: 'A red saloon', use: 'parkedCar' },
      { x: 36, y: 76.5, face: 'e', model: 'hatch', body: '#6b3350', roof: '#552840', name: 'A plum hatchback', use: 'parkedCar' },
      { x: 70, y: 76.5, face: 'e', model: 'estate', body: '#57624f', roof: '#434d3d', name: 'An olive estate', use: 'parkedCar' },
      { x: 18, y: 98.5, face: 'e', model: 'small', name: 'A small blue car', use: 'parkedCar' },
      { x: 27, y: 98.5, face: 'w', model: 'van', body: '#d8d5cc', roof: '#c2bfb5', name: 'A white van', use: 'parkedCar' },
      { x: 60, y: 98.5, face: 'e', model: 'small', body: '#7d6a4f', roof: '#63543f', name: 'A beige runabout', use: 'parkedCar' },
      { x: 46, y: 103.5, face: 'e', model: 'hatch', body: '#6b3350', roof: '#552840', name: 'A plum hatchback', use: 'parkedCar' },
      { x: 55, y: 103.5, face: 'w', model: 'saloon', body: '#3b3f48', roof: '#2e323a', name: 'A grey saloon', use: 'parkedCar' },
      { x: 82, y: 103.5, face: 'e', model: 'estate', body: '#57624f', roof: '#434d3d', name: 'An olive estate', use: 'parkedCar' },

      /* ---- TRAFFIC, SOUTH ----
         Four more circuits, and the two halves of the table they are written to
         are the same two as upstairs, extended:

           eastbound   Station Road y 72.5   Weirbank y 99.5
           westbound   Station Road y 75.5   Weirbank y 102.5
           northbound  Quay Road x 11.5   Cargate x 61.5   Marlow x 103.5
           southbound  Quay Road x 14.5   Cargate x 64.5   Marlow x 106.5

         Two of these go round the old town and stay south of the line. The
         other two are the reason the bridges exist: one drops down Cargate and
         comes back up Marlow, the other does it the other way round, and
         between them every vehicle you ever see cross that railway is on one or
         the other. */
      { model: 'saloon', body: '#4a4f58', roof: '#3a3e46', name: 'A car, passing', use: 'passingCar', traffic: true, cruise: 148, leg: 0, along: 24,
        route: [[11.5, 72.5], [106.5, 72.5], [106.5, 102.5], [11.5, 102.5]] },
      { model: 'small', body: '#8a6a3a', roof: '#6d532d', name: 'A car, passing', use: 'passingCar', traffic: true, cruise: 138, leg: 1, along: 12,
        route: [[14.5, 75.5], [14.5, 99.5], [103.5, 99.5], [103.5, 75.5]] },
      /* DOWN CARGATE AND UP MARLOW. It crosses the railway twice a lap on two
         different bridges, which is a thing you can stand on Corven Way and
         watch happen, and is the closest this map comes to having a view. */
      { model: 'hatch', name: 'A car, passing', use: 'passingCar', traffic: true, cruise: 152, leg: 0, along: 6,
        route: [[64.5, 56.5], [64.5, 72.5], [103.5, 72.5], [103.5, 56.5]] },
      /* And the same circuit the other way about, which is what makes the two
         bridge mouths busy rather than one-way. */
      { model: 'taxi', name: 'A taxi, passing', use: 'passingCar', traffic: true, cruise: 160, leg: 2, along: 18,
        route: [[106.5, 53.5], [106.5, 75.5], [61.5, 75.5], [61.5, 53.5]] },
      /* THE 12, and it is not the 41. The 41 has run the same four roads round
         the new town since before the old town had a bus at all; the 12 is the
         one that crosses the line. Two stops, both of them where somebody
         needs one — the pavement outside the boarded-up station, which is the
         joke and is also the truth about why anybody down here owns a car, and
         the verge on Corven Way at the mouth of the subway.
         A red one, because the 41 and the 41A are both green and a town that
         cannot tell its buses apart from the far end of a street has failed at
         the one thing a bus route is for. */
      { model: 'bus', body: '#7e3b3f', roof: '#f0ece2', name: 'The 12', use: 'theTwelve',
        traffic: true, cruise: 118, leg: 1, along: 10,
        route: [[64.5, 56.5], [64.5, 72.5], [103.5, 72.5], [103.5, 56.5]],
        stops: [{ at: [88.5, 72.5], secs: 8 }, { at: [70.5, 56.5], secs: 6 }] }
    ],
    /* THE PEOPLE. Not the twenty colleagues — those are NPCM's, they are all
       upstairs, and they have schedules and opinions. These are strangers, and
       they exist because a town with nine cars and nobody in it is a car park
       with shops painted on it. See engine/peds.js.

       A route is a loop of pavement, in tiles, and a third number on a point is
       how many seconds to stand there — looking in a window, waiting for
       somebody, reading a phone. Never on tarmac: the traffic gives way to
       people, so somebody who stopped in a live lane would hold up Bellhaven
       Road until five, and the rule that stops that is in Peds.walk().

       Where a route crosses a carriageway it does it AT A CROSSING, because
       that is where the paint is and because the cars are already written to
       stop for anybody in front of them. That rule was in engine/cars.js before
       there was a single pedestrian to apply it to; this is what finally gives
       it somebody to stop for. */
    /* ---- WHICH ROW THEY WALK ----
       Two of these used to walk the kerb-side row of the pavement and now walk
       the frontage-side row, one tile back: 22.6 became 23.4 on Bellhaven Road
       and 40.6 became 41.4 on Fenn Street.

       Because that is what the two rows ARE. A footway has a furniture strip at
       the kerb — lamp columns, bins, trees, planters, the bench — and a clear
       walking strip against the shops, and Station Road and Weirbank Road have
       been built that way since they were drawn. Bellhaven and Fenn had it the
       other way round, which is why their kerb rows were the empty ones: they
       were empty because somebody was walking down them. Furnishing those rows
       without moving these two would have been putting eleven lampposts in a
       pedestrian's way and calling it a street. */
    peds: [
      /* Routes are rectangles: two runs along a pavement and two crossings of
         the road between them. Where there is a zebra the crossing is ON it —
         that is what the paint is for and a street where nobody uses it is a
         street with decoration rather than markings. Where there is not, the
         crossing is a straight line across at a point clear of a junction,
         because that is what people do and because crossing a carriageway at
         an angle puts somebody in a live lane for twice as long.

         The one rule that is not negotiable: no leg runs ALONG a road. Three
         of these did in the first draft — up the middle of Cargate, down
         Marlow, and a diagonal across the High Street — which looks exactly
         like what it is, a person who has not noticed the road. */

      /* The High Street: up the parade, over the zebra by the Greggs, back
         along the south side, and over again at the far end. The one anybody
         watching the street for thirty seconds will see do a full circuit. */
      { name: 'Somebody with a Greggs bag', use: 'pedGreggs', sprite: 'bev', speed: 1.05, leg: 0, along: 6,
        route: [[31.5, 14.6], [44, 14.6, 4], [58, 14.6], [58, 23.4], [44, 23.4], [31.5, 23.4, 3], [31.5, 14.6]] },
      /* East of Cargate, where there is no zebra, so he crosses straight over
         at each end — well clear of both junctions, which is the difference
         between jaywalking and walking into a car. */
      { name: 'A man on the phone', use: 'pedPhone', sprite: 'colin', speed: 1.25, leg: 3, along: 6,
        route: [[68, 14.6], [80, 14.6], [93.5, 14.6, 5], [93.5, 23.4], [80, 23.4], [68, 23.4, 2]] },
      /* Outside the office, doing the thing everybody does outside an office. */
      { name: 'Two people not going back in yet', use: 'pedSmokers', sprite: 'gary', speed: 0.8, leg: 0, along: 2,
        route: [[24, 14.6, 9], [20, 14.6, 7], [16, 14.6, 5]] },
      /* Fenn Street, past the units and the car wash, over the zebra at the
         east end and straight across at the west. Stops short of Cargate. */
      { name: 'Somebody in a hi-vis', use: 'pedHiVis', sprite: 'tomasz', speed: 1.3, leg: 0, along: 14,
        route: [[19.5, 33.4], [45.5, 33.4, 3], [45.5, 41.4], [19.5, 41.4, 2]] },
      /* Corven Way and the retail park, which is where the trolleys come from. */
      { name: 'Somebody pushing a trolley', use: 'pedTrolley', sprite: 'marjorie', speed: 0.85, leg: 0, along: 4,
        route: [[26, 51.4], [40, 51.4, 4], [56, 51.4], [56, 58.6], [40, 58.6], [26, 58.6, 3]] },
      /* The east end of Corven, over its zebra, out to the retail park and
         back. Turns short of Marlow Road rather than walking down it. */
      { name: 'A woman with a dog', use: 'pedDog', sprite: 'sarah', speed: 1.2, leg: 0, along: 8,
        route: [[77.5, 51.4], [98, 51.4, 3], [98, 58.6], [77.5, 58.6, 4]] },
      /* Aldergate Rise, where the overflow parks and walks round. Both sides
         of it, so the crossings are the two ends rather than the middle. */
      { name: 'Somebody walking in from Aldergate', use: 'pedCommuter', sprite: 'mo', speed: 1.35, leg: 0, along: 5,
        route: [[6.6, 44], [6.6, 30], [6.6, 23.4], [14.6, 23.4], [14.6, 30], [14.6, 44, 3]] },
      /* And one who is simply not moving very fast, outside the bookmakers. */
      { name: 'A man who has stopped', use: 'pedStopped', sprite: 'terry', speed: 0.7, leg: 0, along: 1,
        route: [[54, 14.6, 12], [50, 14.6, 8]] },

      /* ================= SOUTH OF THE LINE =================
         Seven more, and the rule they are written to has not changed: no leg
         runs along a road, and where one crosses a carriageway it does it at a
         crossing if there is one and straight over at a point clear of a
         junction if there is not.

         What HAS changed is that most of the old town is not a road at all, so
         four of these are simply people walking about — which is the whole
         difference between a pedestrianised street and a street with nobody
         driving down it, and is the thing the old town is for. */
      /* Station Road: up the railway side, over the zebra outside the North
         Gate, back along the wall, and straight over again at a point well
         clear of both bridges. */
      { name: 'Somebody off the 12', use: 'pedBus', sprite: 'kevin', speed: 1.15, leg: 0, along: 8,
        route: [[36, 69.6], [47.5, 69.6, 4], [47.5, 78.6], [80, 78.6, 3], [80, 69.6]] },
      /* Weirbank Road, over its zebra at the Water Gate and back over at the
         ramp, which is the one other place on that road where a person can get
         across without a fifty-yard walk. */
      { name: 'Somebody with a carrier bag', use: 'pedCarrier', sprite: 'janet', speed: 1.0, leg: 0, along: 14,
        route: [[24, 96.6], [37.5, 96.6, 3], [37.5, 104.6], [70, 104.6, 4], [70, 96.6]] },
      /* PRIORYGATE, and this is the one that makes the old town read as a town:
         four rows of street with nothing on them but people, walking up one
         side and down the other and stopping at things. */
      { name: 'Two people walking slowly', use: 'pedPriory', sprite: 'sandra', speed: 0.78, leg: 0, along: 20,
        route: [[24, 85.4], [50, 85.4, 6], [90, 85.4], [90, 86.6], [50, 86.6, 4], [24, 86.6]] },
      { name: 'Somebody late for something', use: 'pedLate', sprite: 'priya', speed: 1.45, leg: 2, along: 10,
        route: [[28, 86.6], [74, 86.6], [74, 85.4], [28, 85.4, 2]] },
      /* Minster Green, which is a lawn with a cathedral on it and is therefore
         the only route on this map that is not a rectangle for any practical
         reason at all. */
      { name: 'Somebody having their lunch outside', use: 'pedGreen', sprite: 'fiona', speed: 0.72, leg: 0, along: 3,
        route: [[41, 89.4, 9], [41, 94.4], [69, 94.4, 7], [69, 89.4, 5]] },
      /* The Quay, up the water and back along the warehouses. */
      { name: 'Somebody looking at the water', use: 'pedQuay', sprite: 'alan', speed: 0.9, leg: 0, along: 12,
        route: [[30, 110.6], [44, 110.6, 6], [52, 110.6], [52, 111.6], [44, 111.6, 4], [30, 111.6]] },
      /* And one in the subway, down one side and back up the other, which is
         the only way to loop a tunnel three tiles wide. Whoever it is has been
         doing it since the station shut. */
      { name: 'Somebody using the subway', use: 'pedSubway', sprite: 'marcus', speed: 1.3, leg: 0, along: 4,
        route: [[78.6, 59.6], [78.6, 68.6, 2], [79.6, 68.6], [79.6, 59.6, 2]] }
    ],
    furnish() {
      const A = o => this.add(o);
      /* The way back in. Scenery on the boundary wall, exactly like the way out
         is on the fourth floor: you press E on it, you do not walk through it.
         Two tiles, so the doorway art reads as double doors. */
      A({ x: 20, y: 2, e: '🚪', name: 'The way back in', kind: 'exit', solid: false, use: 'frontDoors' });
      A({ x: 21, y: 2, e: '🚪', name: 'The way back in', kind: 'exit', solid: false, use: 'frontDoors' });
      /* THE FOOT OF THE FIRE ESCAPE, on the same face of the building as the
         doors and six tiles along it. A steel stair down the outside of a
         building, landing on the tarmac by the bins — which is the thing
         `theView` on the fourth floor has been describing from the top of since
         the day it was written. */
      A({ x: 26, y: 2, e: '🪜', name: 'The foot of the fire escape', kind: 'stairs', solid: false, use: 'fireEscape' });

      /* ---- THE CAR PARK ---- */
      /* At the head of the last bay before the walkway, which is the one
         nearest the door, which is the whole of what the sign is about. */
      A({ x: 18, y: 3, e: '🪧', name: 'RESERVED — N. GRIMSHAW', kind: 'sign', solid: true, use: 'nigelSpace' });
      A({ x: 37, y: 13, e: '🚧', name: 'The barrier', kind: 'barrier', solid: true, use: 'barrier' });
      /* On a post beside the way out, which is where a car park's own sign
         goes and where somebody driving out will read it. Nothing hangs it on
         a wall: all four neighbours are open tarmac. */
      A({ x: 33, y: 11, e: '🪧', name: 'The car park', kind: 'sign', solid: true, use: 'carPark' });
      A({ x: 28, y: 8, e: '💧', name: 'The permanent puddle', kind: 'puddle', solid: false, use: 'puddle' });
      /* WHERE THE FLOOR STANDS WHEN THE ALARM IS NOT A TEST, and the one piece
         of fire safety signage in this building that is true. The notice
         upstairs still sends you to Point B, which was sold in 2021 and is a
         Greggs; this is a laminated sheet somebody put up in the meantime, on
         the back wall, on the only corner of the tarmac that is not a bay.
         engine/npc.js finds the drill's assembly point by this `use` and by
         nothing else — move it and the drill moves with it. */
      A({ x: 31, y: 3, e: '🪧', name: 'Assembly point', kind: 'sign', solid: true, use: 'assemblyPoint' });
      A({ x: 35, y: 4, e: '📦', name: 'Pallets, delivery bay', kind: 'box', solid: true, use: 'pallets' });
      /* The one thing out here that the fourth floor also has, which is the
         joke: it is the same bin and the same people are standing at it. In the
         walkway rather than in a bay, because the walkway is the bit of a car
         park people are allowed to stand in. */
      A({ x: 22, y: 4, e: '🚬', name: 'The bin everybody stands at', kind: 'bin', solid: false, use: 'smokingSpot',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      /* Real kit lampposts, at the ends of the aisle rather than standing in
         the one lane cars actually use. */
      A({ x: 3, y: 7, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 40, y: 7, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      /* FOUR TREES, one at each end of each verge — the two strips of grass
         down the sides of the car park, which are the only ground out here
         nobody has tarmacked. They are the first thing in this game that
         stands up and still knows what month it is: the verge under them has
         changed colour with the season since there was a season, and now the
         thing growing out of it does too. See FURN.tree in data/world.js.

         Off the aisle and hard against the wall, for the lamppost's reason —
         a car park plants its trees where a car cannot get at them, and every
         one of these is a trunk you could walk a trolley past. */
      A({ x: 4, y: 4, e: '🌳', name: 'The tree by the west wall', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 4, y: 11, e: '🌳', name: 'The tree by the west wall', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 39, y: 4, e: '🌳', name: 'The tree by the east wall', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 39, y: 11, e: '🌳', name: 'The tree by the east wall', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 31, y: 9, e: '🕳️', name: 'The drain in the car park', kind: 'drain', solid: false, use: 'carParkDrain' });
      A({ x: 30, y: 6, e: '🛒', name: 'The trolley', kind: 'shoptrolley', solid: true, use: 'strayTrolley' });

      /* ---- BELLHAVEN ROAD ---- */
      /* On the pavement at the kerb, where a bus stop is. It has no wall
         behind it to hang on, so it stands on its own post — which is what a
         bus stop does. */
      A({ x: 26, y: 15, e: '🚏', name: 'The bus stop', kind: 'sign', solid: true, use: 'busStop' });
      /* GIVE WAY, above the kerb at last. One at the top of each of the three
         north-south streets, on the left of the approach, where the painted
         line already is and where the traffic already yields. */
      /* THE GIVE-WAY SIGNS, on the pavement at the corner rather than in the
         road. All three of these stood on row 21, which is the southern KERB
         LANE of Bellhaven Road — a sign on a post, in the carriageway, a metre
         out from the kerb, on the side of the road the traffic now parks
         against. The line they belong to is painted across the mouth of the
         side street at row 22 and has always been in the right place; the post
         is now beside it, on the footway, where a post goes. */
      A({ x: 14, y: 22, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      /* x=66 y=22 was a give way sign until Cargate Lane got lights. The
         pole that stands there now is the westbound signal head, and it is
         added by World.build off the `signals:` table rather than here — one
         declaration, so a set of lights and the posts holding it up cannot
         drift apart. */
      A({ x: 108, y: 22, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      /* NORTH OF THE LINE THE BENCHES ARE PAINTED IRON. The wooden settle in
         art/sprites/wood.png stays where it belongs — the churchyard, the
         green, Priorygate, the quay — and everything on the modern side of the
         railway gets the municipal red-and-green one instead. It is the same
         object, the same act and the same tile; only the sprite is chosen by
         which half of the town it is standing in. */
      A({ x: 24, y: 15, e: '🪑', name: 'The bench', kind: 'bench', solid: true, use: 'bench',
        furn: { sprite: 'obj.bench.iron' } });
      A({ x: 40, y: 15, e: '🗑️', name: 'The council bin', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 29, y: 14, e: '🐦', name: 'A pigeon, possibly the same one', kind: 'pigeon', solid: false, use: 'pigeon' });
      A({ x: 18, y: 18, e: '⚫', name: 'A manhole cover', kind: 'manhole', solid: false, use: 'manhole' });
      /* The one on the strip outside the front doors, which is the tree
         everybody in the building sees twice a day and nobody has looked at. */
      A({ x: 20, y: 14, e: '🌳', name: 'The tree outside the front doors', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 12, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 38, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 20, y: 16, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 52, y: 21, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      /* Stays emoji, and this is still the reason: the kit's wall art is drawn
         face-on and only reads right against a north wall (see render.js's
         `edgeOn`). Greggs is on the SOUTH side of the road, backing onto the
         block, so a mounted sprite here would silently fall back to the emoji
         anyway. Kit art is not automatically an upgrade; there is still no
         wall on this side of the road that it would work on. */
      /* `via` with no door object under it: this is the one frontage on the
         map that is a shop and not a doorway — it is across the road, not in
         the parade's wall — so the sign IS the way in, and it says which link
         it is exactly as the fourteen doors do. Nothing turns it into a
         doorway (that is `kind`, and this is a `shop`); what reads it is the
         tracker, pinning the way to a job two levels away. */
      A({ x: 31, y: 23, e: '🥐', name: 'Greggs', kind: 'shop', solid: true, use: 'greggs', via: 'greggsDoor' });
      A({ x: 22, y: 23, e: '🏧', name: 'The cashpoint', kind: 'screen', solid: true, use: 'cashpoint' });
      A({ x: 40, y: 23, e: '🖍️', name: 'The hoarding', kind: 'poster', solid: true, use: 'hoarding' });

      /* ---- THE HIGH STREET ----
         Row 14, backing onto the parade: the one long wall in this level that
         the kit's shopfront art is drawn to be seen against. */
      /* FOUR AWNINGS ON THE WHOLE MAP, and there used to be fourteen — one on
         very nearly every frontage, which is not a street, it is a pattern.
         They are also opaque: an awning REPLACES the frontage's emoji, so
         fourteen of them meant fourteen units identified by nothing but the
         colour of their canopy. These four are the ones that would actually
         have one — a nail bar, a charity shop, a pub and a takeaway — and
         everything else has its sign back. A tyre bay has a roller shutter, a
         working men's club has a door, and a retail shed has a fascia the size
         of a bus. None of them has a canopy. */
      A({ x: 46, y: 14, e: '💅', name: 'Nailed It', kind: 'shop', solid: true, use: 'nailedIt',
        furn: { sprite: 'shop.awning' } });
      A({ x: 48, y: 14, e: '🪧', name: 'The sign above Nailed It', kind: 'shopsign', solid: true, use: 'shopSign' });
      A({ x: 54, y: 14, e: '🎰', name: 'Bellhaven Bookmakers', kind: 'shop', solid: true, use: 'bookies' });
      A({ x: 60, y: 14, e: '🧦', name: 'The charity shop', kind: 'shop', solid: true, use: 'charityShop',
        furn: { sprite: 'shop.awning.amber' } });
      A({ x: 66, y: 14, e: '💨', name: 'Vapour Trail', kind: 'shop', solid: true, use: 'vapeShop' });
      A({ x: 72, y: 14, e: '🚧', name: 'The unit that is always being refitted', kind: 'shop', solid: true, use: 'refit' });
      A({ x: 78, y: 14, e: '🪧', name: 'TO LET', kind: 'shopsign', solid: true, use: 'toLet' });
      /* THE SKIP, at the KERB, and the row it is on is the whole of the fix.
         It stood at 76,14 — the back half of the footway, against the
         shopfronts — and 76,15 is a lamppost and 75,15 is the tyres. Three
         things, two rows, and a two-tile pavement: between the skip and the
         lamppost there were eleven pixels and a person is nineteen wide, so
         the High Street was SHUT between the refit and the launderette. A man
         on the phone walked into it on the first lap of the first shift and
         stood there for the rest of the day, which is what the pavement was
         asking him to do.
         A skip goes at the kerb anyway — that is the side the lorry gets a
         chain on it from — and the kerb side is where every other thing out
         here already is. That leaves row 14 clear the length of the parade,
         which is the lane in front of the windows and the one everybody walks.
         The footprint is its own, because the emoji is a lorry and the thing
         is a skip: a shade under a tile long and two thirds of one deep, which
         is a skip, rather than the whole square a `box` claims by default. */
      A({ x: 78, y: 15, e: '🚛', name: 'The skip', kind: 'box', solid: true, use: 'refitSkip',
        furn: { ground: [0.94, 0.62] } });
      /* The cones outside the unit that is always being refitted. Three of
         them, no work, no van, and nobody has moved them since the spring. */
      A({ x: 71, y: 15, e: '🚧', name: 'The cones', kind: 'cone', solid: true, use: 'cones' });
      A({ x: 72, y: 15, e: '🚧', name: 'The cones', kind: 'cone', solid: true, use: 'cones' });
      A({ x: 73, y: 15, e: '🚧', name: 'The cones', kind: 'cone', solid: true, use: 'cones' });
      A({ x: 75, y: 15, e: '🛞', name: 'The tyres', kind: 'tyres', solid: true, use: 'streetTyres' });
      A({ x: 56, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 76, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 62, y: 15, e: '🗑️', name: 'Bin, High Street', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 70, y: 22, e: '🪑', name: 'Another bench', kind: 'bench', solid: true, use: 'bench2',
        furn: { sprite: 'obj.bench.iron' } });

      /* ---- ALDERGATE RISE ----
         The west side of the block. Nothing has a front door on it, which is
         what makes it the side everything gets put out on. */
      A({ x: 15, y: 26, e: '♻️', name: 'The bottle bank', kind: 'box', solid: true, use: 'bottleBank' });
      A({ x: 15, y: 27, e: '🗑️', name: 'The recycling', kind: 'recycling', solid: true, use: 'streetRecycling' });
      A({ x: 15, y: 29, e: '🖍️', name: 'The wall on Aldergate Rise', kind: 'graf', solid: true, use: 'aldergateWall',
        furn: { sprite: 'wall.graf.nice', paint: true } });
      A({ x: 7, y: 27, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      /* Against the kerb rather than against the wall. The west pavement here
         is two tiles wide and this used to stand on the inner one, which left
         nothing for anybody walking up it to get past on and put every
         pedestrian who tried into the road. */
      A({ x: 7, y: 30, e: '🛒', name: 'Another trolley', kind: 'shoptrolley', solid: true, use: 'strayTrolley' });

      /* ---- FENN STREET ----
         The units along the back of the block, on the one other north wall out
         here — so these are shopfronts that actually draw as shopfronts. */
      A({ x: 20, y: 32, e: '🛞', name: 'Bellhaven Tyre & Exhaust', kind: 'shop', solid: true, use: 'tyres' });
      A({ x: 30, y: 32, e: '🏋️', name: 'Unit 6', kind: 'shop', solid: true, use: 'unitSix' });
      /* The second `fromCar` thing on this map, and the one FURN.drivethru's
         note said would come: a car wash is not a shop you walk into, it is a
         lane you drive onto and stay in. On foot it is six lads looking at
         you; from the pool car it is a transaction. Furnished rather than
         given a kind of its own — see Object.assign in World.build. */
      A({ x: 40, y: 32, e: '🧼', name: 'The hand car wash', kind: 'shop', solid: true, use: 'carWash',
        furn: { fromCar: true } });
      A({ x: 50, y: 32, e: '🥪', name: 'The sandwich van’s pitch', kind: 'sign', solid: true, use: 'sandwichVan' });
      A({ x: 16, y: 33, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 36, y: 33, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 58, y: 33, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 26, y: 41, e: '🐦', name: 'Gulls', kind: 'pigeon', solid: false, use: 'gulls' });

      /* ---- CARGATE LANE ----
         The back of the parade: bins, a fire door and the smell of a bakery
         from the wrong side of it. */
      A({ x: 58, y: 26, e: '🗑️', name: 'The bins behind the Greggs', kind: 'bin', solid: true, use: 'greggsBins',
        furn: { sprite: 'obj.wheeliebin', size: 30 } });
      A({ x: 58, y: 28, e: '🗑️', name: 'The bins behind the Greggs', kind: 'bin', solid: true, use: 'greggsBins',
        furn: { sprite: 'obj.wheeliebin', size: 30 } });
      A({ x: 58, y: 30, e: '📦', name: 'Flattened boxes', kind: 'box', solid: true, use: 'flatBoxes' });
      A({ x: 67, y: 27, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 60, y: 24, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });

      /* ---- THE HIGH STREET, EAST END ----
         Past the last of the shops the parade keeps going, because a high
         street does. Same north wall the rest of it hangs on. */
      A({ x: 86, y: 14, e: '🍺', name: 'The Bellhaven Arms', kind: 'shop', solid: true, use: 'thePub',
        furn: { sprite: 'shop.awning' } });
      A({ x: 88, y: 14, e: '🪧', name: 'The pub sign', kind: 'shopsign', solid: true, use: 'pubSign' });
      A({ x: 92, y: 14, e: '🧺', name: 'The launderette', kind: 'shop', solid: true, use: 'launderette' });
      /* THE OTHER KIND OF DOOR ON A HIGH STREET, and there is one on every
         parade in the country: not a shop at all, just a door, between two
         shops, with six bells beside it and no sign saying what it is. */
      A({ x: 96, y: 14, e: '\ud83d\udeaa', name: 'The door beside the launderette', kind: 'shop', solid: true, use: 'flatsDoorway' });
      A({ x: 98, y: 14, e: '📮', name: 'The post office', kind: 'shop', solid: true, use: 'postOffice' });
      A({ x: 104, y: 14, e: '🌯', name: 'Bellhaven Kebab', kind: 'shop', solid: true, use: 'kebab',
        furn: { sprite: 'shop.awning.green' } });
      A({ x: 109, y: 14, e: '📞', name: 'The phone box', kind: 'booth', solid: true, use: 'phoneBox' });
      A({ x: 90, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 100, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 95, y: 15, e: '🗑️', name: 'Bin, High Street', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 90, y: 22, e: '🪑', name: 'The third bench', kind: 'bench', solid: true, use: 'bench3',
        furn: { sprite: 'obj.bench.iron' } });
      A({ x: 96, y: 16, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });

      /* ---- FENN STREET, EAST OF CARGATE ----
         The second block's back, which is where its bins and its fire doors
         are, and — because the rent is lower on a back street — three of the
         four businesses on it. */
      A({ x: 72, y: 32, e: '🎱', name: 'The Working Men’s Club', kind: 'shop', solid: true, use: 'club' });
      A({ x: 82, y: 32, e: '🌞', name: 'Sunseekers', kind: 'shop', solid: true, use: 'tanning' });
      A({ x: 92, y: 32, e: '📦', name: 'The cash and carry', kind: 'shop', solid: true, use: 'cashAndCarry' });
      A({ x: 78, y: 33, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 96, y: 33, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 86, y: 33, e: '🗑️', name: 'Bin, Fenn Street', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 80, y: 41, e: '🚧', name: 'The fence round the yard', kind: 'barrier', solid: true, use: 'yardFence' });
      A({ x: 68, y: 41, e: '🛒', name: 'Another trolley', kind: 'shoptrolley', solid: true, use: 'strayTrolley' });

      /* ---- MARLOW STREET ----
         The far side of the second block. Nobody who works on the fourth floor
         has any business on it, which is exactly why the ones who cannot get a
         space leave the car here and walk. */
      A({ x: 100, y: 26, e: '🅿️', name: 'The multi-storey', kind: 'sign', solid: true, use: 'multiStorey' });
      A({ x: 101, y: 29, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 109, y: 28, e: '🖍️', name: 'The wall on Marlow Street', kind: 'graf', solid: true, use: 'marlowWall',
        furn: { sprite: 'wall.graf.sport', paint: true } });
      A({ x: 100, y: 45, e: '♻️', name: 'The bins on Marlow Street', kind: 'box', solid: true, use: 'marlowBins' });
      A({ x: 108, y: 46, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 106, y: 22, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });

      /* ---- CORVEN WAY ----
         The bottom of the town and the bottom of the market: everything down
         here is a shed with a sign on it, and the railway is behind the fence
         on the other side. The parade backs onto the retail park's own wall,
         which is the one long north wall the shopfront art has down here. */
      A({ x: 24, y: 50, e: '🛒', name: 'The superstore', kind: 'shop', solid: true, use: 'superstore' });
      A({ x: 34, y: 50, e: '🔩', name: 'Screw & Fix', kind: 'shop', solid: true, use: 'screwfix' });
      A({ x: 44, y: 50, e: '🐕', name: 'The pet superstore', kind: 'shop', solid: true, use: 'petStore' });
      A({ x: 52, y: 50, e: '🪧', name: 'BELLHAVEN RETAIL PARK', kind: 'shopsign', solid: true, use: 'retailSign' });
      A({ x: 74, y: 50, e: '🧶', name: 'The carpet warehouse', kind: 'shop', solid: true, use: 'carpets' });
      /* The one thing out here you are meant to reach WITHOUT getting out —
         see `fromCar` in data/world.js and Interact.scan. Press E at the
         window from behind the wheel and it serves you; walk up to it on foot
         and it will tell you what it thinks of that. */
      A({ x: 84, y: 50, e: '☕', name: 'The drive-thru', kind: 'drivethru', solid: true, use: 'driveThru' });
      A({ x: 30, y: 51, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 56, y: 51, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 92, y: 51, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 68, y: 51, e: '🗑️', name: 'Bin, Corven Way', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 26, y: 52, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 46, y: 55, e: '⚫', name: 'A manhole cover', kind: 'manhole', solid: false, use: 'manhole' });
      /* The other end of the 41. A pole, a timetable, and a bench that is not
         a bench — see the act. It is here because a route with one stop on it
         is not a route, it is a lay-by. */
      A({ x: 46, y: 58, e: '🚏', name: 'The stop on Corven Way', kind: 'sign', solid: true, use: 'corvenStop' });
      A({ x: 96, y: 57, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 40, y: 59, e: '🚃', name: 'The railway', kind: 'view', solid: true, use: 'railway' });
      /* The subway used to stand here, at x 70, and it has moved four tiles
         east. It was a sign on a verge pointing at nothing for a year — there
         was no other side of the railway to go to — and the column it stood in
         was arbitrary the whole time. It is at 79 now, because 78 to 80 is
         where the tunnel is, and the tunnel is where it is because that is
         where the platforms it was built to serve are. See the south half of
         this furnishing. */
      /* THE ROAD OUT. Corven Way has run off the east edge of this map since it
         was drawn — see the note on the rooms about a road at the edge of a
         map doing what a road does — and there is something on the other side
         of it now. A signpost rather than a door, because that is what a road
         out of a town has. */
      A({ x: 112, y: 58, e: '🛣️', name: 'The road east out of Bellhaven',
        kind: 'sign', solid: false, use: 'outskirtsRoad', via: 'outskirtsRoad' });
      A({ x: 20, y: 59, e: '🖍️', name: 'The wall on Corven Way', kind: 'graf', solid: true, use: 'corvenWall',
        furn: { sprite: 'wall.graf.squad', paint: true } });
      /* Three along the far verge, where the town stops and the railway
         starts. Spaced so that driving the length of Corven Way passes one
         about every twenty seconds, which is the only reason this verge is
         a hundred tiles long and has anything on it at all. */
      A({ x: 30, y: 59, e: '🌳', name: 'The trees along the railway', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 56, y: 59, e: '🌳', name: 'The trees along the railway', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 100, y: 59, e: '🌳', name: 'The trees along the railway', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 88, y: 59, e: '🐦', name: 'More gulls', kind: 'pigeon', solid: false, use: 'gulls' });

      /* THE DOORS, one to each frontage, and the reason they are a block of
         their own is that until they existed this town had none. There was
         glass, there were awnings, there were signs and there was a way in
         that worked — press E on the sign — and there was nowhere on any of
         the four parades that LOOKED like a way in. A high street is doors.
         Somebody standing on the pavement outside fourteen businesses could
         not see one of them.

         On the WALL ROW, never on the pavement: the row above each frontage is
         the front of the building, it is the one course this projection shows
         you the face of, and a door drawn anywhere else is a door lying on the
         ground. The same row the glass beside it hangs on, one row up. That is
         also why there is nothing here for the Greggs — it is on the south
         side of Bellhaven Road, backing onto the block, and you are looking at
         the back of its front wall. It has no face to put a door in, which is
         the same reason it has no window and no awning.

         `via` is the LINK, not the destination: the link table above says where
         each one goes and this says which link it is, so a shop that moves
         moves in one place. World.behind() reads it to find the floor you can
         see through the opening — see R.thresholds().

         `solid` is the difference between a door and a shut door, and it is
         the honest one: a unit with a floor behind it stands open, and a unit
         with nothing behind it is shut, because a door you cannot go through
         is a door that is shut rather than a door that is missing. The empty
         unit, the cash and carry and the four sheds on Corven Way are shut.
         They are still doors, and a parade where every third unit has no door
         at all reads as a rendering fault rather than as a street.

         The `use` is the frontage's own handler, so pressing E on the door and
         pressing E on the sign over it are the same act — which they are: it
         is one shop. */
      /* The High Street, west of Cargate. */
      A({ x: 46, y: 13, e: '🚪', name: 'Nailed It', kind: 'exit', solid: false, use: 'nailedIt', via: 'nailsDoor' });
      A({ x: 54, y: 13, e: '🚪', name: 'Bellhaven Bookmakers', kind: 'exit', solid: false, use: 'bookies', via: 'bookiesDoor' });
      A({ x: 60, y: 13, e: '🚪', name: 'The charity shop', kind: 'exit', solid: false, use: 'charityShop', via: 'charityDoor' });
      A({ x: 66, y: 13, e: '🚪', name: 'Vapour Trail', kind: 'exit', solid: false, use: 'vapeShop', via: 'vapourDoor' });
      A({ x: 72, y: 13, e: '🚪', name: 'The unit that is always being refitted', kind: 'exit', solid: true, use: 'refit' });
      /* And east of it, where the parade keeps going because a high street
         does. The door beside the launderette is the one with no shop on it,
         and it is a door in exactly the way the other eight are. */
      A({ x: 86, y: 13, e: '🚪', name: 'The Bellhaven Arms', kind: 'exit', solid: false, use: 'thePub', via: 'pubDoor' });
      A({ x: 92, y: 13, e: '🚪', name: 'The launderette', kind: 'exit', solid: false, use: 'launderette', via: 'laundDoor' });
      A({ x: 96, y: 13, e: '🚪', name: 'The door beside the launderette', kind: 'exit', solid: false, use: 'flatsDoorway', via: 'flatsDoor' });
      A({ x: 98, y: 13, e: '🚪', name: 'The post office', kind: 'exit', solid: false, use: 'postOffice', via: 'postoffDoor' });
      A({ x: 104, y: 13, e: '🚪', name: 'Bellhaven Kebab', kind: 'exit', solid: false, use: 'kebab', via: 'kebabDoor' });
      /* Fenn Street, at the back of both blocks. The car wash is not among
         them and never will be: it has no door, because it is not a building
         you go into — see its `fromCar` furnishing. */
      A({ x: 20, y: 31, e: '🚪', name: 'Bellhaven Tyre & Exhaust', kind: 'exit', solid: false, use: 'tyres', via: 'tyreDoor' });
      A({ x: 30, y: 31, e: '🚪', name: 'Unit 6', kind: 'exit', solid: false, use: 'unitSix', via: 'sixDoor' });
      A({ x: 72, y: 31, e: '🚪', name: 'The Working Men’s Club', kind: 'exit', solid: false, use: 'club', via: 'clubDoor' });
      A({ x: 82, y: 31, e: '🚪', name: 'Sunseekers', kind: 'exit', solid: false, use: 'tanning', via: 'tanDoor' });
      A({ x: 92, y: 31, e: '🚪', name: 'The cash and carry', kind: 'exit', solid: true, use: 'cashAndCarry' });
      /* Corven Way, against the retail park's own back wall. Four sheds, four
         shut doors, and the drive-thru is not one of them for the car wash's
         reason: a hatch in a wall is not a way in. */
      A({ x: 24, y: 49, e: '🚪', name: 'The superstore', kind: 'exit', solid: true, use: 'superstore' });
      A({ x: 34, y: 49, e: '🚪', name: 'Screw & Fix', kind: 'exit', solid: true, use: 'screwfix' });
      A({ x: 44, y: 49, e: '🚪', name: 'The pet superstore', kind: 'exit', solid: true, use: 'petStore' });
      A({ x: 74, y: 49, e: '🚪', name: 'The carpet warehouse', kind: 'exit', solid: true, use: 'carpets' });

      /* THE GLASS, one pane beside each frontage. Scenery: it is the window
         of the unit whose sign is next to it.
         PLATE glass now, which is what a shop has, rather than the sash it was
         drawn with until this — see FURN.shopwin. A sash is a house window and
         it read as one every time: the parade looked like a terrace somebody
         had cut doors into. It was tried on the course above as the flats over
         the shops, which is where a sash belongs, and it does not fit: the
         drawn wall is two courses tall and a sash is nearly all of it, so the
         parade came out as a wall of windows with a shopfront squeezed under
         them. One storey of glass, at street level, where the shop is. */
      A({ x: 48, y: 14, e: '\ud83e\ude9f', name: 'The window of Nailed It', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 56, y: 14, e: '\ud83e\ude9f', name: 'The window of Bellhaven Bookmakers', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 62, y: 14, e: '\ud83e\ude9f', name: 'The window of The charity shop', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 68, y: 14, e: '\ud83e\ude9f', name: 'The window of Vapour Trail', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 74, y: 14, e: '\ud83e\ude9f', name: 'The window of The unit that is always being refitted', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 88, y: 14, e: '\ud83e\ude9f', name: 'The window of The Bellhaven Arms', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 94, y: 14, e: '\ud83e\ude9f', name: 'The window of The launderette', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 100, y: 14, e: '\ud83e\ude9f', name: 'The window of The post office', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 106, y: 14, e: '\ud83e\ude9f', name: 'The window of Bellhaven Kebab', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 22, y: 32, e: '\ud83e\ude9f', name: 'The window of Bellhaven Tyre & Exhaust', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 32, y: 32, e: '\ud83e\ude9f', name: 'The window of Unit 6', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 42, y: 32, e: '\ud83e\ude9f', name: 'The window of The hand car wash', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 74, y: 32, e: '\ud83e\ude9f', name: 'The window of The Working Men’s Club', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 84, y: 32, e: '\ud83e\ude9f', name: 'The window of Sunseekers', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 94, y: 32, e: '\ud83e\ude9f', name: 'The window of The cash and carry', kind: 'shopwin', solid: false, use: 'shopWindow' });

      /* ---- THE RETAIL PARK ----
         Fifteen spaces, a lane down the middle and more tarmac than anywhere
         else on the map. Everything solid in here is at the ends of the aisle
         rather than in it: the whole point of the place is the space. */
      A({ x: 19, y: 47, e: '🛒', name: 'The trolley bay', kind: 'shoptrolley', solid: true, use: 'trolleyBay' });
      A({ x: 54, y: 47, e: '🛒', name: 'The trolley bay', kind: 'shoptrolley', solid: true, use: 'trolleyBay' });
      A({ x: 30, y: 48, e: '🛒', name: 'A trolley, at large', kind: 'shoptrolley', solid: true, use: 'strayTrolley' });
      A({ x: 52, y: 48, e: '♻️', name: 'The recycling point', kind: 'box', solid: true, use: 'recycling' });
      A({ x: 18, y: 46, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 55, y: 46, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 44, y: 42, e: '🪧', name: 'The retail park sign', kind: 'sign', solid: true, use: 'retailRules' });

      /* ==================== SOUTH OF THE LINE ====================
         Everything from here down is on the other side of the railway, and the
         one rule that governs all of it is the rule that governs the parade:
         the kit's shopfront art is drawn face-on and only reads against a NORTH
         wall, so every frontage below hangs on the top row of the street it is
         on. That is why the whole of Priorygate faces south and why the minster
         — the one building on this map you go INTO from its own churchyard —
         has its great door on the south side. A cathedral with a south porch is
         not an invention; a cathedral drawn edge-on would be. */

      /* ---- THE RAILWAY AND THE OLD STATION ----
         Two platforms, a subway, and a station that has not had a train stop at
         it since 1967. The act on the railway has said that for as long as
         there has been a railway to say it about; this is the first time
         anybody has been able to walk down there and find out it is true. */
      /* The mouth on the verge. It MOVED: it was at [70,59] for a year, which
         was the right row and the wrong column, and the subway is at 78–80
         because that is where the platforms it serves are. */
      A({ x: 81, y: 59, e: '🕳️', name: 'The subway', kind: 'sign', solid: true, use: 'subway' });
      A({ x: 81, y: 69, e: '🕳️', name: 'The subway, south end', kind: 'sign', solid: true, use: 'subwaySouth' });
      /* Inside it. The mural is on the wall of the one place out here that has
         walls — see the `subway` zone, which is finished in the toilets' glazed
         brick, because that is what a subway is finished in. */
      A({ x: 80, y: 64, e: '🖍️', name: 'The mural in the subway', kind: 'graf', solid: true, use: 'subwayMural' });
      A({ x: 80, y: 61, e: '💡', name: 'The light in the subway', kind: 'lamp', solid: true, use: 'subwayLight' });
      A({ x: 80, y: 67, e: '💡', name: 'The light in the subway', kind: 'lamp', solid: true, use: 'subwayLight' });
      /* THE PLATFORMS. The name board is the whole joke and it is worth having
         it be the first thing you meet coming up the steps. */
      A({ x: 76, y: 61, e: '🪧', name: 'The name board', kind: 'sign', solid: true, use: 'nameBoard' });
      A({ x: 84, y: 61, e: '🪑', name: 'The platform bench', kind: 'bench', solid: true, use: 'platformBench',
        furn: { sprite: 'obj.bench.iron' } });
      A({ x: 90, y: 61, e: '🕰️', name: 'The platform clock', kind: 'sign', solid: true, use: 'platformClock' });
      A({ x: 96, y: 62, e: '💡', name: 'A platform lamp', kind: 'lamp', solid: true, use: 'platformLamp' });
      A({ x: 82, y: 62, e: '🐦', name: 'Pigeons under the canopy', kind: 'pigeon', solid: false, use: 'stationPigeons' });
      /* The edge, and the two lines past it. Not a fence and not a barrier: a
         white line and a hundred years of everybody standing behind it. */
      A({ x: 92, y: 62, e: '🚃', name: 'The line', kind: 'view', solid: true, use: 'theLine' });
      A({ x: 88, y: 67, e: '🪧', name: 'The poster cases', kind: 'poster', solid: true, use: 'stationPosters' });
      A({ x: 74, y: 67, e: '🚪', name: 'The booking hall', kind: 'shop', solid: true, use: 'bookingHall' });
      A({ x: 94, y: 66, e: '🌿', name: 'The buddleia', kind: 'tree', solid: true, use: 'buddleia' });
      A({ x: 98, y: 67, e: '🌿', name: 'The buddleia', kind: 'tree', solid: true, use: 'buddleia' });

      /* The parapets. Two objects on a bridge ninety feet long, which is not an
         attempt to draw a parapet — the kerb between the carriageway and the
         ballast does that already — but a thing to stand at and look over,
         because standing on a bridge looking down at a railway is most of what
         a bridge over a railway has ever been for. */
      A({ x: 59, y: 64, e: '🧱', name: 'The parapet on Cargate Lane', kind: 'fence', solid: true, use: 'parapet' });
      A({ x: 66, y: 64, e: '🧱', name: 'The parapet on Cargate Lane', kind: 'fence', solid: true, use: 'parapet' });
      A({ x: 101, y: 64, e: '🧱', name: 'The parapet on Marlow Street', kind: 'fence', solid: true, use: 'parapet' });
      A({ x: 108, y: 64, e: '🧱', name: 'The parapet on Marlow Street', kind: 'fence', solid: true, use: 'parapet' });

      /* ---- STATION ROAD ----
         The road under the embankment, and the only one on this map with a
         railway along one side of it and a city wall along the other. Lamps on
         the kerb rows — 70 and 77 — because rows 69 and 78 are the ones people
         walk on and a lamppost in the middle of a two-tile footway is the fault
         the skip on the High Street was moved for. */
      A({ x: 16, y: 70, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 40, y: 70, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 68, y: 70, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 96, y: 70, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 28, y: 77, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 84, y: 77, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 110, y: 77, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 74, y: 70, e: '🪧', name: 'BELLHAVEN STATION', kind: 'sign', solid: true, use: 'stationSign' });
      A({ x: 88, y: 70, e: '🚏', name: 'The stop for the 12', kind: 'sign', solid: true, use: 'stationStop' });
      A({ x: 24, y: 70, e: '🗑️', name: 'Bin, Station Road', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 104, y: 70, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 34, y: 77, e: '⚫', name: 'A manhole cover', kind: 'manhole', solid: false, use: 'manhole' });
      /* Five tiles east, onto the pavement. x=12 is the middle of Quay Road's
         carriageway where it meets Station Road: this was a mature tree growing
         out of the give-way line of a junction. */
      A({ x: 17, y: 69, e: '🌳', name: 'The tree at the end of Station Road', kind: 'tree', solid: true, use: 'streetTree' });
      /* GIVE WAY at the two bridge mouths and the two junctions, on the left of
         each approach, exactly as the three upstairs are. */
      A({ x: 66, y: 70, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      A({ x: 108, y: 70, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      A({ x: 9, y: 77, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      /* THE HOLE, THE CONES AND THE LIGHTS, and they are the one set of signals
         on this map. Fixed on red — see the sprite's own note in
         tools/sheets/streets.mjs — and honest about it: the lane behind them is
         coned off, no route in this level goes down it, and nothing has come
         the other way since March. */
      A({ x: 59, y: 77, e: '🚧', name: 'The cones on Station Road', kind: 'cone', solid: true, use: 'roadworks' });
      A({ x: 60, y: 77, e: '🚧', name: 'The cones on Station Road', kind: 'cone', solid: true, use: 'roadworks' });
      A({ x: 61, y: 77, e: '🚧', name: 'The cones on Station Road', kind: 'cone', solid: true, use: 'roadworks' });
      A({ x: 62, y: 77, e: '🚦', name: 'The temporary lights', kind: 'signals', solid: true, use: 'tempLights' });
      A({ x: 63, y: 77, e: '🕳️', name: 'The hole', kind: 'drain', solid: false, use: 'theHole' });
      A({ x: 92, y: 78, e: '🖍️', name: 'The wall under the embankment', kind: 'graf', solid: true, use: 'embankmentWall',
        furn: { sprite: 'wall.graf.squad', paint: true } });

      /* ---- THE BITS OF ROAD NOTHING WAS EVER PUT ON ----
         Six stretches that the audit found with nothing standing on them at
         all: the southern block of Aldergate Rise and of Cargate Lane, both of
         which were laid when the grid was and never furnished; the long empty
         middle of Station Road and Weirbank Road; Quay Road; and Marlow Street
         south of the wall. A road with nothing on it is not a quiet road, it is
         an unfinished one — you can see the join.

         Everything here is on the row nearest the kerb or nearest the wall, and
         nothing is on the two rows the pedestrian routes walk. */
      /* Aldergate Rise, the south block: the overflow parking nobody polices,
         the wall the bins go against, and the alley cat. */
      A({ x: 7, y: 44, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 14, y: 46, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 15, y: 43, e: '🗑️', name: 'The bins on Aldergate Rise', kind: 'bin', solid: true, use: 'laneBins',
        furn: { sprite: 'obj.wheeliebin', size: 30 } });
      A({ x: 15, y: 45, e: '♻️', name: 'The recycling on Aldergate Rise', kind: 'recycling', solid: true, use: 'streetRecycling' });
      A({ x: 6, y: 47, e: '🪧', name: 'PERMIT HOLDERS ONLY', kind: 'sign', solid: true, use: 'permitSign' });
      A({ x: 15, y: 48, e: '🖍️', name: 'The wall at the bottom of Aldergate', kind: 'graf', solid: true, use: 'aldergateWall',
        furn: { sprite: 'wall.graf.squad', paint: true } });
      A({ x: 6, y: 42, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      /* Cargate Lane, the south block: the back of the retail park and the
         loading bay everything for it comes through. */
      A({ x: 58, y: 44, e: '📦', name: 'Pallets, retail park delivery', kind: 'box', solid: true, use: 'pallets' });
      A({ x: 58, y: 46, e: '📦', name: 'Pallets, retail park delivery', kind: 'box', solid: true, use: 'pallets' });
      A({ x: 67, y: 45, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 58, y: 48, e: '🛒', name: 'Another trolley', kind: 'shoptrolley', solid: true, use: 'strayTrolley' });
      A({ x: 67, y: 42, e: '🪧', name: 'The loading bay sign', kind: 'sign', solid: true, use: 'loadingBay' });
      A({ x: 66, y: 48, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      /* Marlow Street, south of the wall: the coach drop, and the back of the
         castle gardens. */
      A({ x: 100, y: 82, e: '🪧', name: 'The coach drop', kind: 'sign', solid: true, use: 'coachDrop' });
      A({ x: 109, y: 86, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 100, y: 90, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 109, y: 92, e: '🗑️', name: 'Bin, Marlow Street', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 100, y: 94, e: '🌳', name: 'The trees on Marlow Street', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 109, y: 80, e: '🖍️', name: 'The wall behind the gardens', kind: 'graf', solid: true, use: 'marlowWall',
        furn: { sprite: 'wall.graf.nice', paint: true } });
      /* Quay Road: the hill, the wall holding it up, and the works. */
      A({ x: 8, y: 86, e: '🚧', name: 'The cones on Quay Road', kind: 'cone', solid: true, use: 'roadworks' });
      A({ x: 8, y: 87, e: '🚧', name: 'The cones on Quay Road', kind: 'cone', solid: true, use: 'roadworks' });
      A({ x: 16, y: 81, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 16, y: 89, e: '🛒', name: 'Another trolley', kind: 'shoptrolley', solid: true, use: 'strayTrolley' });
      A({ x: 8, y: 92, e: '🌳', name: 'The trees on Quay Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 16, y: 79, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      /* Station Road's long middle, which was a hundred tiles of nothing
         between the North Gate and the bridge. */
      A({ x: 20, y: 70, e: '🚏', name: 'The stop outside the wall', kind: 'sign', solid: true, use: 'wallStop' });
      /* One row north, onto the embankment. A `poster` is a wall mount and
         there was no wall on row 70 to mount it on — it was a laminated town
         map hanging in mid-air on a footway. Row 69 has the railway embankment
         behind it, which is the only wall Station Road has and is where a town
         map goes. */
      A({ x: 32, y: 69, e: '🪧', name: 'The town map', kind: 'poster', solid: true, use: 'townMap' });

      /* ---------- THE TWO ENDS THAT ARE NOT ROADS TO NOWHERE ----------
         Station Road and Weirbank Road stop at x=9 at their western ends and
         they are RIGHT to: the river is there. What was missing was anything
         saying so. Six tiles of carriageway ran up to the bank and ended, with
         nothing between the nearside lane and forty feet of water — no
         parapet, no barrier, no sign, just tarmac and then river.

         There is a parapet now, on both, and a sign on each saying what is
         behind it. Which is also the reason those two roads do not run off the
         edge of the map the way Bellhaven, Fenn and Corven now do: a road that
         stops at a river has a reason, and a reason is all a dead end ever
         needed. */
      for (let ry = 71; ry <= 76; ry++) {
        A({ x: 8, y: ry, e: '🧱', name: 'The parapet at the end of Station Road', kind: 'fence', solid: true, use: 'riverParapet' });
      }
      A({ x: 7, y: 74, e: '🪧', name: 'The sign at the parapet', kind: 'sign', solid: true, use: 'riverEnd' });
      A({ x: 56, y: 70, e: '🗑️', name: 'Bin, Station Road', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 44, y: 77, e: '🪑', name: 'The bench outside the gate', kind: 'bench', solid: true, use: 'gateBench' });
      A({ x: 58, y: 77, e: '🌳', name: 'The trees on Station Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 64, y: 77, e: '🌳', name: 'The trees on Station Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 36, y: 77, e: '⚫', name: 'A manhole cover', kind: 'manhole', solid: false, use: 'manhole' });
      A({ x: 26, y: 77, e: '🐦', name: 'The pigeons under the embankment', kind: 'pigeon', solid: false, use: 'pigeon' });
      /* Onto the embankment, which is the only wall down here there is anything
         to paint. This tag was the one piece of graffiti on the map with no
         wall on any of its four sides: `graf` is `paint: true`, so it is drawn
         flat ON the tile rather than propped in front of it, and a flat tag on
         a tile with nothing solid touching it is a tag lying face up on a
         pavement. */
      A({ x: 98, y: 69, e: '🖍️', name: 'The wall by the bridge', kind: 'graf', solid: true, use: 'embankmentWall',
        furn: { sprite: 'wall.graf.sport', paint: true } });
      /* And Weirbank Road, which was the same. */
      A({ x: 26, y: 97, e: '🌳', name: 'The trees on Weirbank Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 46, y: 97, e: '🌳', name: 'The trees on Weirbank Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 74, y: 97, e: '🌳', name: 'The trees on Weirbank Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 34, y: 105, e: '🪑', name: 'The bench on Weirbank Road', kind: 'bench', solid: true, use: 'weirbankBench',
        furn: { sprite: 'obj.bench.iron' } });
      A({ x: 82, y: 105, e: '🪑', name: 'The bench on Weirbank Road', kind: 'bench', solid: true, use: 'weirbankBench',
        furn: { sprite: 'obj.bench.iron' } });
      A({ x: 96, y: 105, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 58, y: 97, e: '🐦', name: 'Gulls, Weirbank Road', kind: 'pigeon', solid: false, use: 'gulls' });
      A({ x: 68, y: 105, e: '🚧', name: 'The fence round the site', kind: 'barrier', solid: true, use: 'yardFence' });
      A({ x: 20, y: 105, e: '🪧', name: 'The hoarding on Weirbank Road', kind: 'poster', solid: true, use: 'hoarding' });
      /* Minster Green's east lawn and the walk along the north side of the
         minster, both of which were bare. */
      A({ x: 69, y: 91, e: '🪑', name: 'A bench on the green', kind: 'bench', solid: true, use: 'greenBench' });
      A({ x: 71, y: 93, e: '🌳', name: 'The trees on Minster Green', kind: 'tree', solid: true, use: 'greenTree' });
      A({ x: 55, y: 88, e: '🪦', name: 'The tombs along the north walk', kind: 'view', solid: true, use: 'northWalkTombs', furn: { mount: null } });
      A({ x: 60, y: 88, e: '🕯️', name: 'The candles by the north door', kind: 'misc', solid: true, use: 'minsterCandles' });

      /* ---- THE NORTH GATE ----
         Five rows of gateway through the wall, and the point where the town
         stops being 1994 and starts being everything before it. */
      A({ x: 49, y: 80, e: '🏛️', name: 'The North Gate', kind: 'view', solid: true, use: 'northGate' });
      A({ x: 53, y: 81, e: '🪧', name: 'The plaque on the gate', kind: 'poster', solid: true, use: 'gatePlaque' });
      A({ x: 50, y: 83, e: '⛔', name: 'NO ENTRY — pedestrian zone', kind: 'noentry', solid: true, use: 'noEntry' });
      A({ x: 52, y: 79, e: '💡', name: 'The lamp in the gateway', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 50, y: 77, e: '🪧', name: 'The fingerpost', kind: 'sign', solid: true, use: 'fingerpost' });

      /* ---- PRIORYGATE ----
         Eighty tiles of street with no carriageway on it. The ten frontages are
         all on row 84 against the north wall, for the reason at the top of this
         block; everything else is on row 87, because rows 85 and 86 are the
         two lanes everybody walks up and down and a bench in the middle of them
         would shut the street.

         Five of the ten open. That is a deliberately better hit rate than the
         parade's four out of fourteen, and it is the whole difference between
         a high street that works and one that is a row of shut doors with
         somebody's name still over them. */
      A({ x: 20, y: 84, e: '🥖', name: 'The bakery on Priorygate', kind: 'shop', solid: true, use: 'oldBakery' });
      A({ x: 26, y: 84, e: '🕯️', name: 'The gift shop', kind: 'shop', solid: true, use: 'giftShop',
        furn: { sprite: 'shop.awning.amber' } });
      A({ x: 48, y: 84, e: '🍺', name: 'The Mitre', kind: 'shop', solid: true, use: 'theMitre',
        furn: { sprite: 'shop.awning' } });
      A({ x: 54, y: 84, e: '📚', name: 'The second-hand bookshop', kind: 'shop', solid: true, use: 'bookshop' });
      A({ x: 58, y: 84, e: '☕', name: 'The coffee place on Priorygate', kind: 'shop', solid: true, use: 'coffeePlace',
        furn: { sprite: 'shop.awning.green' } });
      A({ x: 62, y: 84, e: '🧀', name: 'The delicatessen', kind: 'shop', solid: true, use: 'deli' });
      A({ x: 66, y: 84, e: '👞', name: 'The shoe shop', kind: 'shop', solid: true, use: 'shoeShop' });
      A({ x: 70, y: 84, e: '💈', name: 'The barber on Priorygate', kind: 'shop', solid: true, use: 'barber' });
      A({ x: 74, y: 84, e: '🏦', name: 'The old bank', kind: 'shop', solid: true, use: 'oldBank' });
      A({ x: 80, y: 84, e: '🎣', name: 'The tackle shop', kind: 'shop', solid: true, use: 'tackleShop' });
      /* The glass beside each of them, the parade's plate rather than a sash,
         for the reason FURN.shopwin gives. */
      A({ x: 22, y: 84, e: '\ud83e\ude9f', name: 'The window of the bakery', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 27, y: 84, e: '\ud83e\ude9f', name: 'The window of the gift shop', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 49, y: 84, e: '\ud83e\ude9f', name: 'The window of The Mitre', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 56, y: 84, e: '\ud83e\ude9f', name: 'The window of the bookshop', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 60, y: 84, e: '\ud83e\ude9f', name: 'The window of the coffee place', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 64, y: 84, e: '\ud83e\ude9f', name: 'The window of the delicatessen', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 68, y: 84, e: '\ud83e\ude9f', name: 'The window of the shoe shop', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 72, y: 84, e: '\ud83e\ude9f', name: 'The window of the barber', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 75, y: 84, e: '\ud83e\ude9f', name: 'The window of the old bank', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 81, y: 84, e: '\ud83e\ude9f', name: 'The window of the tackle shop', kind: 'shopwin', solid: false, use: 'shopWindow' });
      /* The doors, on the wall row above each frontage. Five of them are open
         because five of them have a floor behind them; the other five are shut
         for the honest reason the parade's are — a door you cannot go through
         is a door that is shut, not a door that is missing. */
      A({ x: 48, y: 83, e: '🚪', name: 'The Mitre', kind: 'exit', solid: false, use: 'theMitre', via: 'mitreDoor' });
      A({ x: 54, y: 83, e: '🚪', name: 'The second-hand bookshop', kind: 'exit', solid: false, use: 'bookshop', via: 'bookDoor' });
      A({ x: 58, y: 83, e: '🚪', name: 'The coffee place on Priorygate', kind: 'exit', solid: false, use: 'coffeePlace', via: 'caffDoor' });
      A({ x: 20, y: 83, e: '🚪', name: 'The bakery on Priorygate', kind: 'exit', solid: true, use: 'oldBakery' });
      A({ x: 26, y: 83, e: '🚪', name: 'The gift shop', kind: 'exit', solid: true, use: 'giftShop' });
      A({ x: 62, y: 83, e: '🚪', name: 'The delicatessen', kind: 'exit', solid: true, use: 'deli' });
      A({ x: 66, y: 83, e: '🚪', name: 'The shoe shop', kind: 'exit', solid: true, use: 'shoeShop' });
      A({ x: 70, y: 83, e: '🚪', name: 'The barber on Priorygate', kind: 'exit', solid: true, use: 'barber' });
      A({ x: 74, y: 83, e: '🚪', name: 'The old bank', kind: 'exit', solid: true, use: 'oldBank' });
      A({ x: 80, y: 83, e: '🚪', name: 'The tackle shop', kind: 'exit', solid: true, use: 'tackleShop' });
      /* THE STREET ITSELF, all of it on row 87. Troughs, because a town centre
         puts troughs down a street the day it stops letting cars up it, and
         then everybody has to walk round them for thirty years. */
      A({ x: 30, y: 87, e: '🪴', name: 'A council trough', kind: 'trough', solid: true, use: 'trough' });
      A({ x: 44, y: 87, e: '🪴', name: 'A council trough', kind: 'trough', solid: true, use: 'trough' });
      A({ x: 68, y: 87, e: '🪴', name: 'A council trough', kind: 'trough', solid: true, use: 'trough' });
      A({ x: 86, y: 87, e: '🪴', name: 'A council trough', kind: 'trough', solid: true, use: 'trough' });
      A({ x: 34, y: 87, e: '🪑', name: 'A bench on Priorygate', kind: 'bench', solid: true, use: 'prioryBench' });
      A({ x: 72, y: 87, e: '🪑', name: 'A bench on Priorygate', kind: 'bench', solid: true, use: 'prioryBench' });
      A({ x: 40, y: 87, e: '🎸', name: 'The busker', kind: 'sign', solid: false, use: 'busker' });
      A({ x: 60, y: 87, e: '📋', name: 'Somebody with a clipboard', kind: 'sign', solid: false, use: 'clipboard' });
      /* ---------- THE OLD TOWN'S OWN IRONWORK ----------
         A pillar box, a fluted litter bin and a public clock, all off the
         Victorian sheet, all standing on a street that has been furnished out
         of the same catalogue as the retail park since it was drawn. The clock
         is the thing everybody arranges to meet at and nobody can tell you what
         it commemorates; there is a plate on it, and the plate has been painted
         over four times. */
      A({ x: 46, y: 84, e: '🕰️', name: 'The Priorygate clock', kind: 'streetclock', solid: true, use: 'prioryClock' });
      A({ x: 30, y: 84, e: '📮', name: 'The pillar box', kind: 'postbox', solid: true, use: 'pillarBox' });
      A({ x: 92, y: 84, e: '📮', name: 'The pillar box', kind: 'postbox', solid: true, use: 'pillarBox' });
      A({ x: 52, y: 87, e: '🗑️', name: 'Bin, Priorygate', kind: 'ironbin', solid: false, use: 'prioryBin' });
      A({ x: 78, y: 87, e: '🗑️', name: 'Bin, Priorygate', kind: 'ironbin', solid: false, use: 'prioryBin' });
      A({ x: 94, y: 87, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 38, y: 84, e: '🐦', name: 'The Priorygate pigeons', kind: 'pigeon', solid: false, use: 'pigeon' });
      /* THE EAST GATE, which is one tile wide, is the way out onto Marlow
         Street, and is the reason there is a queue on Marlow Street at ten to
         nine every morning of the world. */
      A({ x: 99, y: 84, e: '🏛️', name: 'The East Gate', kind: 'view', solid: true, use: 'eastGate' });
      /* The sign is on MARLOW STREET and not in the gateway, because a no entry
         sign is for the person who might drive through it: it faces the traffic
         on the outside of the wall, where somebody at the wheel can read it in
         time to not be in the gate. */
      A({ x: 100, y: 84, e: '⛔', name: 'NO ENTRY — pedestrian zone', kind: 'noentry', solid: true, use: 'noEntry' });

      /* ---- THE SHAMBLES ----
         The market square, on the other side of the wall from Station Road.
         There has not been a butcher on it since 1974, which is the most
         ordinary fact about any market square in England. */
      A({ x: 36, y: 81, e: '⛲', name: 'The fountain', kind: 'fountain', solid: true, use: 'theFountain' });
      A({ x: 30, y: 80, e: '🏛️', name: 'The Market Hall', kind: 'shop', solid: true, use: 'marketHall' });
      A({ x: 30, y: 79, e: '🚪', name: 'The Market Hall', kind: 'exit', solid: false, use: 'marketHall', via: 'marketDoor' });
      A({ x: 32, y: 80, e: '\ud83e\ude9f', name: 'The window of the Market Hall', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 40, y: 80, e: '🥬', name: 'The greengrocer’s', kind: 'shop', solid: true, use: 'greengrocer',
        furn: { sprite: 'shop.awning.green' } });
      A({ x: 44, y: 80, e: '🐟', name: 'The fish stall', kind: 'shop', solid: true, use: 'fishStall' });
      A({ x: 33, y: 83, e: '🪧', name: 'The market rules', kind: 'sign', solid: true, use: 'marketRules' });
      A({ x: 29, y: 82, e: '📦', name: 'Crates, behind the stalls', kind: 'crate', solid: true, use: 'marketCrates' });
      A({ x: 45, y: 82, e: '📦', name: 'Crates, behind the stalls', kind: 'crate', solid: true, use: 'marketCrates' });
      A({ x: 42, y: 82, e: '🐦', name: 'The Shambles pigeons', kind: 'pigeon', solid: false, use: 'marketPigeons' });
      A({ x: 38, y: 83, e: '🗑️', name: 'Bin, The Shambles', kind: 'ironbin', solid: false, use: 'prioryBin' });
      A({ x: 46, y: 81, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });

      /* ---- THE LANES ----
         Cooper’s, Drapers and Pinfold. Three tiles wide, cut straight through
         the block, and between them the whole of what the old town has instead
         of a service road: everything that gets put out gets put out here. */
      A({ x: 23, y: 82, e: '🖍️', name: 'The wall in Cooper’s Lane', kind: 'graf', solid: true, use: 'lanesWall',
        furn: { sprite: 'wall.graf.nice', paint: true } });
      A({ x: 25, y: 90, e: '🗑️', name: 'The bins in Cooper’s Lane', kind: 'bin', solid: true, use: 'laneBins',
        furn: { sprite: 'obj.wheeliebin', size: 30 } });
      A({ x: 25, y: 92, e: '🗑️', name: 'The bins in Cooper’s Lane', kind: 'bin', solid: true, use: 'laneBins',
        furn: { sprite: 'obj.wheeliebin', size: 30 } });
      A({ x: 23, y: 88, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 76, y: 82, e: '🚲', name: 'The bike racks', kind: 'bike', solid: true, use: 'bikeRacks' });
      A({ x: 78, y: 92, e: '⚫', name: 'A manhole cover', kind: 'manhole', solid: false, use: 'manhole' });
      A({ x: 76, y: 90, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 90, y: 91, e: '🪧', name: 'The fire mark', kind: 'poster', solid: true, use: 'fireMark' });
      A({ x: 92, y: 91, e: '🐈', name: 'The cat in Pinfold Lane', kind: 'pigeon', solid: false, use: 'laneCat' });
      A({ x: 90, y: 89, e: '📦', name: 'Flattened boxes', kind: 'box', solid: true, use: 'flatBoxes' });
      A({ x: 92, y: 80, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });

      /* ---- THE MINSTER AND ITS GREEN ----
         The building is seventeen tiles of nothing in the middle of the walk
         round it — see the rooms above — and it is the only thing on this map
         built out of a different stone, which is a fact about who paid for it.

         The door is on the SOUTH side, and that is not an affectation: the
         renderer draws a frontage face-on and it only reads against a north
         wall, so the one wall of this building the art can hang on is the one
         seen from the churchyard. Every English cathedral has a working porch
         that is not the west door anyway. */
      A({ x: 56, y: 93, e: '⛪', name: 'Bellhaven Minster', kind: 'shop', solid: true, use: 'minster', via: 'minsterDoor' });
      A({ x: 56, y: 92, e: '🚪', name: 'Bellhaven Minster', kind: 'exit', solid: false, use: 'minster', via: 'minsterDoor' });
      /* FOUR WINDOWS IN THE SOUTH WALL, and they are the minster's own now
         rather than a shop window borrowed off the High Street. `shopwin` is a
         mirror sprite doing an impression of glass in a modern frontage, which
         is the right answer for a bookmaker's and has never been the right one
         for a fourteenth-century wall. These are two tiles of pointed arch in a
         stone surround — see tools/sheets/town.mjs — and there are four of them
         because a wall with two windows in it is a bungalow. */
      A({ x: 48, y: 93, e: '\ud83e\ude9f', name: 'The minster windows', kind: 'gothicwin', solid: false, use: 'minsterGlass' });
      A({ x: 52, y: 93, e: '\ud83e\ude9f', name: 'The minster windows', kind: 'gothicwin', solid: false, use: 'minsterGlass' });
      A({ x: 60, y: 93, e: '\ud83e\ude9f', name: 'The minster windows', kind: 'gothicwin', solid: false, use: 'minsterGlass' });
      A({ x: 64, y: 93, e: '\ud83e\ude9f', name: 'The minster windows', kind: 'gothicwin', solid: false, use: 'minsterGlass' });
      A({ x: 50, y: 89, e: '🪧', name: 'The notice board at the minster', kind: 'poster', solid: true, use: 'minsterNotices' });
      /* IRON RAILINGS along the north side of the churchyard, in three panels
         of two tiles. They stop where the notice board and the candles start
         rather than running the whole face, because a churchyard railing is a
         boundary with a way in, and this is the side the way in is on.
         Deliberately NOT on the row below: pedGreen walks y=94.4 from one end
         of the green to the other, and a fence across a route is a route that
         no longer exists. */
      for (const rx of [48, 50, 52]) {
        A({ x: rx, y: 88, e: '🚧', name: 'The churchyard railings', kind: 'railing', solid: true, use: 'churchRailings' });
      }
      A({ x: 62, y: 88, e: '🪑', name: 'A bench on the green', kind: 'bench', solid: true, use: 'greenBench' });
      /* Standing on grass rather than hung on anything: a `view` is mounted on a
         wall by default and there is no wall in the middle of a lawn, which is
         the whole point of a lawn. */
      A({ x: 44, y: 91, e: '🪦', name: 'The churchyard', kind: 'view', solid: true, use: 'churchyard', furn: { mount: null } });
      /* Two beds on each half of the green, clear of the column pedGreen walks
         up and the row it walks along. Somebody plants these and somebody else
         has opinions about what they plant — see the act. */
      A({ x: 44, y: 89, e: '🌸', name: 'The bedding on the green', kind: 'flowers', solid: false, use: 'greenBedding' });
      A({ x: 44, y: 93, e: '🌸', name: 'The bedding on the green', kind: 'flowers', solid: false, use: 'greenBedding',
        furn: { sprite: 'obj.flowers.red' } });
      A({ x: 67, y: 89, e: '🌸', name: 'The bedding on the green', kind: 'flowers', solid: false, use: 'greenBedding',
        furn: { sprite: 'obj.flowers.red' } });
      A({ x: 67, y: 93, e: '🌸', name: 'The bedding on the green', kind: 'flowers', solid: false, use: 'greenBedding' });
      A({ x: 38, y: 94, e: '🪧', name: 'The war memorial', kind: 'sign', solid: true, use: 'warMemorial' });
      A({ x: 40, y: 92, e: '🌳', name: 'The trees on Minster Green', kind: 'tree', solid: true, use: 'greenTree' });
      A({ x: 70, y: 90, e: '🌳', name: 'The trees on Minster Green', kind: 'tree', solid: true, use: 'greenTree' });
      A({ x: 66, y: 92, e: '🪑', name: 'A bench on the green', kind: 'bench', solid: true, use: 'greenBench' });
      A({ x: 42, y: 88, e: '🗑️', name: 'Bin, Minster Green', kind: 'bin', solid: false, use: 'prioryBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 68, y: 88, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });

      /* ---- THE CLOSE AND THE WATER GATE ----
         Eight tiles of lane with the backs of the minster’s own buildings on
         one side of it, and the way out to the bottom road at the end. Nothing
         in here hangs on a north wall, so it is all emoji and drawn art, which
         is the honest answer rather than shopfronts pointed the wrong way. */
      A({ x: 31, y: 90, e: '🚪', name: 'The door in the Close', kind: 'booth', solid: true, use: 'deanery' });
      A({ x: 30, y: 93, e: '🪧', name: 'The notices in the Close', kind: 'poster', solid: true, use: 'closeNotices' });
      A({ x: 36, y: 91, e: '🌳', name: 'The tree in the Close', kind: 'tree', solid: true, use: 'greenTree' });
      A({ x: 33, y: 88, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 34, y: 94, e: '🏛️', name: 'The Water Gate', kind: 'view', solid: true, use: 'waterGate' });
      A({ x: 30, y: 94, e: '🗑️', name: 'The bins in the Close', kind: 'bin', solid: true, use: 'laneBins',
        furn: { sprite: 'obj.wheeliebin', size: 30 } });

      /* ---- CASTLE GARDENS ----
         A lawn, a bandstand, a gatehouse, and no castle. There has not been a
         castle behind that gate since the seventeenth century and the gate is
         still called the castle gate, which is the whole of how this town works
         and is on a plaque nobody reads. */
      A({ x: 88, y: 80, e: '🏰', name: 'The castle gate', kind: 'view', solid: true, use: 'castleGate' });
      A({ x: 91, y: 82, e: '🎪', name: 'The bandstand', kind: 'booth', solid: true, use: 'bandstand' });
      A({ x: 84, y: 81, e: '🌳', name: 'The trees in the gardens', kind: 'tree', solid: true, use: 'gardenTree' });
      A({ x: 95, y: 82, e: '🌳', name: 'The trees in the gardens', kind: 'tree', solid: true, use: 'gardenTree' });
      A({ x: 86, y: 83, e: '🪑', name: 'A bench in the gardens', kind: 'bench', solid: true, use: 'gardenBench' });
      A({ x: 96, y: 80, e: '🪑', name: 'A bench in the gardens', kind: 'bench', solid: true, use: 'gardenBench' });
      /* THE BEDDING, and there is more than one bed of it now. `plant` is the
         kit's planter — a tub — which is what stands outside a shop; what a
         municipal garden has is beds, planted in two colours alternately
         because one colour the whole length of a border reads as a stamp. Not
         solid: a flower bed is ankle high, and the parks department would
         rather you did not, but you can. */
      A({ x: 93, y: 80, e: '🌸', name: 'The bedding', kind: 'flowers', solid: false, use: 'bedding' });
      A({ x: 90, y: 80, e: '🌸', name: 'The bedding', kind: 'flowers', solid: false, use: 'bedding',
        furn: { sprite: 'obj.flowers.red' } });
      A({ x: 91, y: 80, e: '🌸', name: 'The bedding', kind: 'flowers', solid: false, use: 'bedding' });
      A({ x: 89, y: 82, e: '🌸', name: 'The bedding', kind: 'flowers', solid: false, use: 'bedding',
        furn: { sprite: 'obj.flowers.red' } });
      A({ x: 94, y: 82, e: '🌸', name: 'The bedding', kind: 'flowers', solid: false, use: 'bedding' });
      /* And railings along the back of the lawn, where the gardens stop and the
         backs of Marlow Street begin. Three panels, west of the castle gate;
         east of it is the bandstand and the beds, and railings round those
         would be railings round a lawn nobody is allowed on. */
      for (const rx of [82, 84, 86]) {
        A({ x: rx, y: 80, e: '🚧', name: 'The garden railings', kind: 'railing', solid: true, use: 'gardenRailings' });
      }
      A({ x: 83, y: 83, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 98, y: 83, e: '🪧', name: 'The gardens sign', kind: 'sign', solid: true, use: 'gardensSign' });

      /* ---- FISHERS STEPS ----
         Eight courses between a town on a hill and a river at the bottom of it.
         The ground is `steps` — see SURFACES — and it is the only thing in this
         game that tells you which way is down. The handrail is on the west side
         because the west side is the drop. */
      A({ x: 19, y: 88, e: '🪧', name: 'The sign at the top of the steps', kind: 'sign', solid: true, use: 'stepsSign' });
      A({ x: 18, y: 90, e: '🧱', name: 'The handrail', kind: 'fence', solid: true, use: 'stepsRail' });
      A({ x: 18, y: 92, e: '🧱', name: 'The handrail', kind: 'fence', solid: true, use: 'stepsRail' });
      A({ x: 18, y: 94, e: '🧱', name: 'The handrail', kind: 'fence', solid: true, use: 'stepsRail' });
      A({ x: 20, y: 91, e: '💡', name: 'The lamp on the steps', kind: 'lamp', solid: true, use: 'lamppost' });

      /* ---- QUAY ROAD AND WEIRBANK ROAD ----
         The two roads round the outside of the wall, which between them are the
         entire reason there are no cars in the middle of this town. */
      A({ x: 9, y: 82, e: '🌳', name: 'The trees on Quay Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 9, y: 90, e: '🌳', name: 'The trees on Quay Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 16, y: 86, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 16, y: 94, e: '🖍️', name: 'The wall on Quay Road', kind: 'graf', solid: true, use: 'quayRoadWall',
        furn: { sprite: 'wall.graf.sport', paint: true } });
      A({ x: 8, y: 94, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 22, y: 97, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 56, y: 97, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 88, y: 97, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 44, y: 105, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 76, y: 105, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 108, y: 105, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 30, y: 97, e: '🗑️', name: 'Bin, Weirbank Road', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 66, y: 97, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 50, y: 105, e: '⚫', name: 'A manhole cover', kind: 'manhole', solid: false, use: 'manhole' });
      A({ x: 100, y: 97, e: '🪧', name: 'The park and ride sign', kind: 'sign', solid: true, use: 'parkAndRide' });
      /* Same again, at the foot of Marlow Street: x=102 is the first tile of
         that street's carriageway, so this sign was standing in the mouth of
         the junction it was warning about. One tile west puts it on the
         corner. */
      A({ x: 101, y: 96, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      A({ x: 16, y: 96, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      /* And the same at the bottom of the town, where Weirbank Road runs out
         of bank. Same parapet, same reason, and the sign on this one is the
         older of the two by about a century. */
      for (let ry = 98; ry <= 103; ry++) {
        A({ x: 8, y: ry, e: '🧱', name: 'The parapet at the end of Weirbank Road', kind: 'fence', solid: true, use: 'riverParapet' });
      }
      A({ x: 7, y: 101, e: '🪧', name: 'The sign at the parapet', kind: 'sign', solid: true, use: 'riverEnd' });
      /* Beside the ramp, not down it. The ramp is the tarmac at x 40..43 and
         this stood in the middle of it, which is a bollard, not a sign. */
      A({ x: 39, y: 105, e: '🪧', name: 'The sign at the top of the ramp', kind: 'sign', solid: true, use: 'rampSign' });
      A({ x: 94, y: 105, e: '🛒', name: 'Another trolley', kind: 'shoptrolley', solid: true, use: 'strayTrolley' });
      A({ x: 62, y: 105, e: '🖍️', name: 'The wall on Weirbank Road', kind: 'graf', solid: true, use: 'weirbankWall',
        furn: { sprite: 'wall.graf.nice', paint: true } });

      /* ---- THE QUAY ----
         The bottom of the town and the bottom of the map. Five frontages along
         the warehouse terrace, on row 109, which is a north wall and is
         therefore the last piece of proper shopfront art on this level. */
      A({ x: 30, y: 109, e: '⚓', name: 'The chandlery', kind: 'shop', solid: true, use: 'chandlery' });
      A({ x: 36, y: 109, e: '🍺', name: 'The Ferryman', kind: 'shop', solid: true, use: 'ferryman',
        furn: { sprite: 'shop.awning' } });
      A({ x: 50, y: 109, e: '🏺', name: 'The antiques warehouse', kind: 'shop', solid: true, use: 'antiques' });
      A({ x: 88, y: 109, e: '🍦', name: 'The kiosk on the quay', kind: 'shop', solid: true, use: 'kiosk',
        furn: { sprite: 'shop.awning.amber' } });
      A({ x: 100, y: 109, e: '🚣', name: 'The boat hire', kind: 'shop', solid: true, use: 'boatHire' });
      A({ x: 32, y: 109, e: '\ud83e\ude9f', name: 'The window of the chandlery', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 38, y: 109, e: '\ud83e\ude9f', name: 'The window of The Ferryman', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 52, y: 109, e: '\ud83e\ude9f', name: 'The window of the antiques warehouse', kind: 'shopwin', solid: false, use: 'shopWindow' });
      A({ x: 102, y: 109, e: '\ud83e\ude9f', name: 'The window of the boat hire', kind: 'shopwin', solid: false, use: 'shopWindow' });
      /* All five shut, and this is the one parade on the map where that is the
         point rather than a compromise: the chandlery opens at weekends, the
         pub opens at six, the antiques warehouse opens when the man is in, and
         the kiosk opens in July. Between them they are open for about eleven
         hours of the week you are ever down here. */
      A({ x: 30, y: 108, e: '🚪', name: 'The chandlery', kind: 'exit', solid: true, use: 'chandlery' });
      A({ x: 36, y: 108, e: '🚪', name: 'The Ferryman', kind: 'exit', solid: true, use: 'ferryman' });
      A({ x: 50, y: 108, e: '🚪', name: 'The antiques warehouse', kind: 'exit', solid: true, use: 'antiques' });
      A({ x: 88, y: 108, e: '🚪', name: 'The kiosk on the quay', kind: 'exit', solid: true, use: 'kiosk' });
      A({ x: 100, y: 108, e: '🚪', name: 'The boat hire', kind: 'exit', solid: true, use: 'boatHire' });
      /* The goods. Nothing on this quay has gone anywhere by water since 1962
         and there are still barrels on it, which is the most honest thing about
         the place: it is a working wharf that stopped working and nobody has
         yet found a reason to take the last of it away. */
      /* All four of them at the ends of the apron rather than down the middle
         of it, which is the skip's lesson from the High Street: the walkable
         part of a quay is the two rows between the warehouse doors and the
         edge, and a barrel in the middle of them is a barrel everybody has to
         go round for thirty years. */
      A({ x: 25, y: 110, e: '🛢️', name: 'The barrels on the quay', kind: 'barrels', solid: true, use: 'quayBarrels' });
      A({ x: 84, y: 110, e: '🛢️', name: 'The barrels on the quay', kind: 'barrels', solid: true, use: 'quayBarrels' });
      A({ x: 27, y: 110, e: '📦', name: 'A crate on the quay', kind: 'crate', solid: true, use: 'quayCrate' });
      A({ x: 86, y: 110, e: '📦', name: 'A crate on the quay', kind: 'crate', solid: true, use: 'quayCrate' });
      /* The rail along the edge, in four bays with the gaps where the steps
         down to the water are. A quay with a continuous fence along it is a
         promenade; a quay with four bays of rail and a gap you could walk
         straight off is a quay. */
      A({ x: 32, y: 112, e: '🧱', name: 'The rail along the quay', kind: 'fence', solid: true, use: 'quayRail' });
      A({ x: 33, y: 112, e: '🧱', name: 'The rail along the quay', kind: 'fence', solid: true, use: 'quayRail' });
      A({ x: 34, y: 112, e: '🧱', name: 'The rail along the quay', kind: 'fence', solid: true, use: 'quayRail' });
      A({ x: 90, y: 112, e: '🧱', name: 'The rail along the quay', kind: 'fence', solid: true, use: 'quayRail' });
      A({ x: 91, y: 112, e: '🧱', name: 'The rail along the quay', kind: 'fence', solid: true, use: 'quayRail' });
      A({ x: 92, y: 112, e: '🧱', name: 'The rail along the quay', kind: 'fence', solid: true, use: 'quayRail' });
      A({ x: 42, y: 112, e: '🕳️', name: 'The slipway', kind: 'drain', solid: false, use: 'slipway' });
      A({ x: 54, y: 112, e: '⚓', name: 'The mooring rings', kind: 'barrier', solid: true, use: 'mooring' });
      A({ x: 82, y: 112, e: '⚓', name: 'The mooring rings', kind: 'barrier', solid: true, use: 'mooring' });
      A({ x: 52, y: 112, e: '🛥️', name: 'The boat that has not moved', kind: 'view', solid: true, use: 'theBoat' });
      A({ x: 96, y: 112, e: '🦢', name: 'The swans', kind: 'pigeon', solid: false, use: 'swans' });
      A({ x: 24, y: 110, e: '🪧', name: 'The basin', kind: 'sign', solid: true, use: 'theBasin' });
      A({ x: 30, y: 112, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 66, y: 112, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 98, y: 112, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 96, y: 110, e: '🪑', name: 'The bench on the quay', kind: 'bench', solid: true, use: 'quayBench' });
      A({ x: 80, y: 109, e: '🪧', name: 'The pay and display', kind: 'sign', solid: true, use: 'payAndDisplay' });
      /* Standing on the quay rather than hung on it. A `view` is a wall mount by
         default and there is no wall at the water's edge — the same note the
         churchyard carries, for the same reason. */
      A({ x: 106, y: 111, e: '🌊', name: 'The river', kind: 'view', solid: true, use: 'theRiver',
        furn: { mount: null } });
      A({ x: 70, y: 109, e: '🗑️', name: 'Bin, the Quay', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });

      /* ---------- THE OTHER PAVEMENT ----------
         Every road on this map is pavement, carriageway, pavement — and on four
         of the five, ONE of those two pavements had everything on it and the
         other had nothing at all. Fenn Street's southern footway ran a hundred
         and four tiles with not one object on it; Station Road's had one;
         Weirbank's had two. They were not quiet, they were unbuilt: a strip of
         paving with a wall on one side and a kerb on the other and a hundred
         metres of nothing in between.

         So: lamp, tree, bin, planter, bench, roughly every nine tiles, which is
         about the spacing a real one has and is close enough to regular that
         the eye stops counting. Placed against the surfaces rather than by
         hand — nothing here is on tarmac, in a junction mouth, or within a tile
         of something that was already standing there.

         The benches are the painted iron ones off the Victorian sheet rather
         than the wooden settle the old town sits on. Two benches for two halves
         of a town, and the line between them is the railway. */
      /* Fenn Street, the side of it nothing has ever stood on. */
      A({ x: 19, y: 40, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 28, y: 40, e: '🗑️', name: 'Bin, Fenn Street', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 37, y: 40, e: '🌳', name: 'A street tree, Fenn Street', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 46, y: 40, e: '🪴', name: 'A planter, Fenn Street', kind: 'plant', solid: true, use: 'streetPlanter' });
      A({ x: 55, y: 40, e: '🪑', name: 'A bench on Fenn Street', kind: 'bench', solid: true, use: 'streetBench',
        furn: { sprite: 'obj.bench.iron' } });
      A({ x: 66, y: 40, e: '🌳', name: 'A street tree, Fenn Street', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 73, y: 40, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 82, y: 40, e: '🗑️', name: 'Bin, Fenn Street', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 91, y: 40, e: '🌳', name: 'A street tree, Fenn Street', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 100, y: 40, e: '🪴', name: 'A planter, Fenn Street', kind: 'plant', solid: true, use: 'streetPlanter' });

      /* Bellhaven Road, the side of it nothing has ever stood on. */
      A({ x: 3, y: 22, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 21, y: 22, e: '🌳', name: 'A street tree, Bellhaven Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 30, y: 22, e: '🗑️', name: 'Bin, Bellhaven Road', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 39, y: 22, e: '🪑', name: 'A bench on Bellhaven Road', kind: 'bench', solid: true, use: 'streetBench',
        furn: { sprite: 'obj.bench.iron' } });
      A({ x: 48, y: 22, e: '🌳', name: 'A street tree, Bellhaven Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 57, y: 22, e: '🪴', name: 'A planter, Bellhaven Road', kind: 'plant', solid: true, use: 'streetPlanter' });
      A({ x: 68, y: 22, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 75, y: 22, e: '🌳', name: 'A street tree, Bellhaven Road', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 84, y: 22, e: '🗑️', name: 'Bin, Bellhaven Road', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 93, y: 22, e: '🪑', name: 'A bench on Bellhaven Road', kind: 'bench', solid: true, use: 'streetBench',
        furn: { sprite: 'obj.bench.iron' } });
      A({ x: 101, y: 22, e: '🌳', name: 'A street tree, Bellhaven Road', kind: 'tree', solid: true, use: 'streetTree' });

      /* Corven Way's verge. Not its pavement: row 58 is the only footway on
         that side and it is the one people walk down, so the trees and the
         planters go on the grass behind it, which is what a verge is for. */
      A({ x: 10, y: 59, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 19, y: 59, e: '🌳', name: 'A street tree, Corven Way', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 28, y: 59, e: '🗑️', name: 'Bin, Corven Way', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 37, y: 59, e: '🪴', name: 'A planter, Corven Way', kind: 'plant', solid: true, use: 'streetPlanter' });
      A({ x: 48, y: 59, e: '🌳', name: 'A street tree, Corven Way', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 55, y: 59, e: '🗑️', name: 'Bin, Corven Way', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 66, y: 59, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 73, y: 59, e: '🌳', name: 'A street tree, Corven Way', kind: 'tree', solid: true, use: 'streetTree' });
      A({ x: 82, y: 59, e: '🗑️', name: 'Bin, Corven Way', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 91, y: 59, e: '🪴', name: 'A planter, Corven Way', kind: 'plant', solid: true, use: 'streetPlanter' });
      A({ x: 97, y: 59, e: '🌳', name: 'A street tree, Corven Way', kind: 'tree', solid: true, use: 'streetTree' });
    }
  }
};
