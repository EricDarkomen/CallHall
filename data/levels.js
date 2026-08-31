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
    rooms: ROOM_DEFS,
    doors: DOOR_DEFS,
    /* At the lobby waypoint, not Ron's desk tile: his schedule puts him on the
       door from nine, and a counter he is never behind is worse than none.
       Reception and security share a row — they are two halves of one front
       desk, and a row apart they read as one desk with a step in it. */
    counters: [
      { x: 24, y: 38, w: 3, label: 'RECEPTION' },
      { x: 29, y: 38, w: 4, label: 'SECURITY' },
    ],
    /* Visitors' side of the security counter, clear of it by a whole tile: the
       collision box is 26px tall, so a spawn on a tile boundary lands you in the
       tile above — which was inside Ron's desk once the counter became solid. */
    entries: {
      start: [31.5, 41.5],
      lobby: [31.5, 41.5],
      /* Beside the odd square of carpet, not on it: you climb out of the hatch,
         you do not materialise in it. */
      hatch: [4.5, 12.5],
    },
    links: [
      { via: 'hatch', to: 'basement', entry: 'ladder' },
      { via: 'exit', to: 'outside', entry: 'doors' },
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
      A({ x: 12, y: 3, e: '📇', name: 'The card index', kind: 'cab', solid: true, use: 'cardIndex', furn: { size: 30, sprite: 'obj.bookcase' } });

      /* ---- MANAGEMENT ---- */
      A({ x: 46, y: 3, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 46, y: 4, e: '🖥️', name: "Nigel’s monitor", kind: 'pc', solid: true, use: 'nigelPC' });
      A({ x: 50, y: 2, e: '📊', name: 'Performance charts', kind: 'chart', solid: true, use: 'charts' });
      A({ x: 53, y: 2, e: '📈', name: 'The Q3 graph', kind: 'chart', solid: true, use: 'q3' });
      A({ x: 56, y: 4, e: '🍽️', name: 'Meeting room table', kind: 'table', solid: true, use: 'meetingTable' });
      A({ x: 55, y: 4, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 57, y: 4, e: '🪑', name: 'Chair', kind: 'chair', solid: false, use: 'chair' });
      A({ x: 60, y: 3, e: '🖥️', name: 'THE SPREADSHEET', kind: 'spread', solid: true, use: 'spreadsheet' });
      A({ x: 61, y: 6, e: '🚪', name: 'Synergy Department', kind: 'door', solid: true, use: 'synergy' });
      A({ x: 45, y: 7, e: '🖨️', name: 'Management printer (works fine)', kind: 'printer', solid: true, use: 'mgmtPrinter' });
      A({ x: 48, y: 7, e: '🪴', name: 'Enormous healthy plant', kind: 'plant', solid: true, use: 'bigPlant' });

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

      /* ---- LOBBY ---- */
      A({ x: 31, y: 43, e: '🚪', name: 'The way out', kind: 'exit', solid: false, use: 'exit' });
      A({ x: 32, y: 43, e: '🚪', name: 'The way out', kind: 'exit', solid: false, use: 'exit' });
      A({ x: 26, y: 38, e: '🛎️', name: 'Reception desk', kind: 'recep', solid: true, use: 'reception' });
      A({ x: 25, y: 38, e: '🖥️', name: 'Reception monitor', kind: 'pc', solid: true, use: 'pc' });
      A({ x: 38, y: 38, e: '🛋️', name: 'Waiting sofa', kind: 'sofa', solid: true, use: 'sofa' });
      A({ x: 40, y: 38, e: '🪴', name: 'Lobby plant (thriving)', kind: 'plant', solid: true, use: 'plant' });
      A({ x: 22, y: 36, e: '🛗', name: 'Lift', kind: 'lift', solid: true, use: 'lift' });
      A({ x: 42, y: 36, e: '📋', name: 'Fire evacuation notice', kind: 'board', solid: true, use: 'fireNotice' });
      A({ x: 35, y: 42, e: '🗑️', name: 'Lobby bin', kind: 'bin', solid: false, use: 'bin' });
      /* On the reception counter, open, with the biro: it is the end of the
         recurring-meeting thread. Overridden because `book` means shelf
         everywhere else in the building. */
      A({ x: 24, y: 38, e: '📖', name: 'The visitors’ book', kind: 'book', solid: true, use: 'visitorsBook',
        furn: { art: 'ledger', size: 17, sprite: null } });
      A({ x: 28, y: 36, e: '🏢', name: 'Building directory', kind: 'board', solid: true, use: 'directory' });
      A({ x: 34, y: 36, e: '🥇', name: 'Award cabinet', kind: 'cab', solid: true, use: 'awards' });
      A({ x: 21, y: 42, e: '☂️', name: 'Lost umbrellas', kind: 'box', solid: true, use: 'umbrellas' });
      A({ x: 43, y: 40, e: '🚲', name: 'The bike nobody claims', kind: 'bike', solid: true, use: 'bike' });

      /* ---- CORRIDOR ---- */
      A({ x: 16, y: 10, e: '🛗', name: 'Lift (upper)', kind: 'lift', solid: true, use: 'lift' });
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

  /* ---- OUTSIDE --------------------------------------------------------
     The forecourt and the road, which is the only level with a sky over it.
     `indoors: false` is what the renderer reads: no strip lights, daylight
     rather than a ceiling, and the dark beyond the walls painted as sky.

     It exists because three separate acts already promised it — the way out
     talks about daylight and a bus stop, the Greggs has been a shop you could
     buy from without ever being a place you could stand, and the view off the
     fire escape looks down on this car park. */
  outside: {
    name: 'Outside',
    w: 40, h: 26,
    indoors: false,
    rooms: [
      { z: 'forecourt', r: [3, 3, 36, 13] },
      { z: 'street', r: [3, 14, 36, 22] }
    ],
    doors: [],
    /* In front of the doors, facing away from them. */
    entries: { doors: [19.5, 4.5] },
    links: [{ via: 'frontDoors', to: 'office', entry: 'lobby' }],
    furnish() {
      const A = o => this.add(o);
      /* The way back in. Scenery on the boundary wall, exactly like the way out
         is on the fourth floor: you press E on it, you do not walk through it.
         Two tiles, so the doorway art reads as double doors. */
      A({ x: 19, y: 2, e: '🚪', name: 'The way back in', kind: 'exit', solid: false, use: 'frontDoors' });
      A({ x: 20, y: 2, e: '🚪', name: 'The way back in', kind: 'exit', solid: false, use: 'frontDoors' });

      /* ---- THE CAR PARK ---- */
      A({ x: 6, y: 6, e: '🚗', name: 'The car park', kind: 'car', solid: true, use: 'carPark' });
      A({ x: 9, y: 6, e: '🚙', name: 'The car park', kind: 'car', solid: true, use: 'carPark' });
      A({ x: 12, y: 6, e: '🚐', name: 'The car park', kind: 'car', solid: true, use: 'carPark' });
      A({ x: 5, y: 9, e: '🪧', name: 'RESERVED — N. GRIMSHAW', kind: 'sign', solid: true, use: 'nigelSpace' });
      A({ x: 35, y: 8, e: '🚧', name: 'The barrier', kind: 'barrier', solid: true, use: 'barrier' });
      A({ x: 25, y: 7, e: '💧', name: 'The permanent puddle', kind: 'puddle', solid: false, use: 'puddle' });
      A({ x: 30, y: 4, e: '📦', name: 'Pallets, delivery bay', kind: 'box', solid: true, use: 'pallets' });
      /* The one thing out here that the fourth floor also has, which is the
         joke: it is the same bin and the same people are standing at it. */
      A({ x: 16, y: 4, e: '🚬', name: 'The bin everybody stands at', kind: 'bin', solid: false, use: 'smokingSpot' });

      /* ---- THE ROAD ---- */
      /* On the last row of the road with the wall below it, not standing on the
         wall itself: a wall-mounted thing needs a floor tile to stand on and a
         wall to hang against, and the south face is the far side of the road. */
      A({ x: 10, y: 22, e: '🥐', name: 'Greggs', kind: 'shop', solid: true, use: 'greggs' });
      A({ x: 28, y: 20, e: '🚏', name: 'The bus stop', kind: 'sign', solid: true, use: 'busStop' });
      A({ x: 24, y: 22, e: '🗑️', name: 'The council bin', kind: 'bin', solid: false, use: 'streetBin' });
      A({ x: 14, y: 20, e: '🪑', name: 'The bench', kind: 'bench', solid: true, use: 'bench' });
      A({ x: 26, y: 16, e: '🐦', name: 'A pigeon, possibly the same one', kind: 'pigeon', solid: false, use: 'pigeon' });
    }
  }
};
