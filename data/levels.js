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
     the streets they cross. */
  outside: {
    name: 'Outside',
    w: 114, h: 62,
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
      { z: 'street', r: [2, 14, 41, 23] },
      { z: 'high', r: [42, 14, 111, 23] },
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
      { z: 'fenn', r: [6, 32, 109, 41] },
      { z: 'corven', r: [6, 50, 109, 59] },
      /* And the car park, with its one gap, exactly as the forecourt has. */
      { z: 'retail', r: [18, 43, 55, 48] },
      { z: 'retail', r: [34, 42, 37, 42] }
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
      { s: 'tarmac', r: [2, 16, 111, 21] },
      /* Each north–south carriageway in ONE rectangle running the whole height
         of the map, straight through every pavement band it crosses. Stop one
         at a junction and the game lays a kerb across the road, for the same
         reason the crossover above needs carrying through the footway. */
      { s: 'tarmac', r: [8, 22, 13, 57] },
      { s: 'tarmac', r: [60, 22, 65, 57] },
      { s: 'tarmac', r: [102, 22, 107, 57] },
      { s: 'tarmac', r: [8, 34, 107, 39] },
      { s: 'tarmac', r: [8, 52, 107, 57] },
      /* The retail park and the way into it. */
      { s: 'tarmac', r: [34, 42, 37, 42] },
      { s: 'tarmac', r: [18, 43, 55, 48] },
      /* The drive-thru's own lane, carried across the footway to the window so
         that a car can pull level with it — which is the whole of what a
         drive-thru is, and without it the window is two tiles further away
         than anybody can reach from a driving seat. The kerb drops itself:
         R.kerbs() finds no boundary where the tarmac runs through. */
      { s: 'tarmac', r: [82, 50, 87, 51] }
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
      { p: 'dash', a: [2, 19], b: [8, 19] },
      { p: 'dash', a: [14, 19], b: [30, 19] },
      { p: 'dash', a: [34, 19], b: [60, 19] },
      { p: 'dash', a: [66, 19], b: [102, 19] },
      { p: 'dash', a: [108, 19], b: [112, 19] },
      { p: 'dash', a: [14, 37], b: [44, 37] },
      { p: 'dash', a: [48, 37], b: [60, 37] },
      { p: 'dash', a: [66, 37], b: [102, 37] },
      { p: 'dash', a: [14, 55], b: [60, 55] },
      { p: 'dash', a: [66, 55], b: [76, 55] },
      { p: 'dash', a: [80, 55], b: [102, 55] },
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
      { p: 'line', a: [60, 22], b: [66, 22] },
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
      { p: 'text', at: [86, 53.4], s: 'SLOW' }
    ],
    doors: [],
    /* In the walkway between the two banks of bays, facing away from the
       doors. Not in a bay: you come out of a building on foot. */
    entries: { doors: [20.5, 4.5] },
    links: [{ via: 'frontDoors', to: 'office', entry: 'lobby' }],
    /* The cars. Parked ones sit in bays and are scenery you can walk round and
       bump into; two of them are worth pressing E on and exactly one of them
       will let you in. The last four have a `route` instead of a bay, which is
       the whole of what makes them traffic — see engine/cars.js.

       Positions are in TILES and may be fractional, like `entries` above, and
       for the same reason: this file is data and loads before engine/core.js
       declares TILE. A bay is two tiles wide, so a car centred on a bay is
       centred on a whole number. */
    cars: [
      { x: 8, y: 4.1, face: 'n', model: 'hatch', name: 'A hatchback', use: 'someHatchback' },
      { x: 12, y: 4.1, face: 'n', model: 'estate', name: 'An estate car with a roof box', use: 'roofBox' },
      { x: 16, y: 4.1, face: 'n', model: 'pool', name: 'The pool car', use: 'poolCar', drive: true },
      /* x=18 is Nigel's, and it is empty. That is the joke and it only works
         if nothing is parked in it. */
      { x: 26, y: 4.1, face: 'n', model: 'small', name: 'A small blue car', use: 'someoneElsesCar' },
      /* On the line, across two of them, at the one time of day when the car
         park is full. Nobody has ever seen it arrive. */
      { x: 11, y: 11, face: 's', model: 'van', name: 'The contractor’s van', use: 'contractorVan' },
      { x: 20, y: 11, face: 's', model: 'saloon', name: 'A green saloon', use: 'someoneElsesCar' },
      { x: 24, y: 11, face: 's', model: 'small', name: 'A small blue car', use: 'someoneElsesCar' },
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
      { x: 22, y: 44.2, face: 'n', model: 'hatch', body: '#2f4a3a', roof: '#25392d', name: 'A green hatchback', use: 'someoneElsesCar' },
      { x: 28, y: 44.2, face: 'n', model: 'small', name: 'A small blue car', use: 'someoneElsesCar' },
      { x: 42, y: 44.2, face: 'n', model: 'estate', body: '#6d6f74', roof: '#54565a', name: 'A grey estate', use: 'someoneElsesCar' },
      { x: 48, y: 44.2, face: 'n', model: 'saloon', body: '#8a2f34', roof: '#6b242a', name: 'A red saloon', use: 'someoneElsesCar' },
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
        route: [[9.5, 17.5], [106.5, 17.5], [106.5, 56.5], [9.5, 56.5]] }
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
        route: [[31.5, 14.6], [44, 14.6, 4], [58, 14.6], [58, 22.6], [44, 22.6], [31.5, 22.6, 3], [31.5, 14.6]] },
      /* East of Cargate, where there is no zebra, so he crosses straight over
         at each end — well clear of both junctions, which is the difference
         between jaywalking and walking into a car. */
      { name: 'A man on the phone', use: 'pedPhone', sprite: 'colin', speed: 1.25, leg: 3, along: 6,
        route: [[68, 14.6], [80, 14.6], [92, 14.6, 5], [92, 22.6], [80, 22.6], [68, 22.6, 2]] },
      /* Outside the office, doing the thing everybody does outside an office. */
      { name: 'Two people not going back in yet', use: 'pedSmokers', sprite: 'gary', speed: 0.8, leg: 0, along: 2,
        route: [[24, 14.6, 9], [20, 14.6, 7], [16, 14.6, 5]] },
      /* Fenn Street, past the units and the car wash, over the zebra at the
         east end and straight across at the west. Stops short of Cargate. */
      { name: 'Somebody in a hi-vis', use: 'pedHiVis', sprite: 'tomasz', speed: 1.3, leg: 0, along: 14,
        route: [[18, 33.4], [45.5, 33.4, 3], [45.5, 40.6], [18, 40.6, 2]] },
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
        route: [[6.6, 44], [6.6, 30], [6.6, 22.6], [14.6, 22.6], [14.6, 30], [14.6, 44, 3]] },
      /* And one who is simply not moving very fast, outside the bookmakers. */
      { name: 'A man who has stopped', use: 'pedStopped', sprite: 'terry', speed: 0.7, leg: 0, along: 1,
        route: [[54, 14.6, 12], [50, 14.6, 8]] }
    ],
    furnish() {
      const A = o => this.add(o);
      /* The way back in. Scenery on the boundary wall, exactly like the way out
         is on the fourth floor: you press E on it, you do not walk through it.
         Two tiles, so the doorway art reads as double doors. */
      A({ x: 20, y: 2, e: '🚪', name: 'The way back in', kind: 'exit', solid: false, use: 'frontDoors' });
      A({ x: 21, y: 2, e: '🚪', name: 'The way back in', kind: 'exit', solid: false, use: 'frontDoors' });

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
      A({ x: 31, y: 9, e: '🕳️', name: 'The drain in the car park', kind: 'drain', solid: false, use: 'carParkDrain' });
      A({ x: 30, y: 6, e: '🛒', name: 'The trolley', kind: 'shoptrolley', solid: true, use: 'trolley' });

      /* ---- BELLHAVEN ROAD ---- */
      /* On the pavement at the kerb, where a bus stop is. It has no wall
         behind it to hang on, so it stands on its own post — which is what a
         bus stop does. */
      A({ x: 26, y: 15, e: '🚏', name: 'The bus stop', kind: 'sign', solid: true, use: 'busStop' });
      A({ x: 24, y: 15, e: '🪑', name: 'The bench', kind: 'bench', solid: true, use: 'bench' });
      A({ x: 40, y: 15, e: '🗑️', name: 'The council bin', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 29, y: 14, e: '🐦', name: 'A pigeon, possibly the same one', kind: 'pigeon', solid: false, use: 'pigeon' });
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
      A({ x: 31, y: 23, e: '🥐', name: 'Greggs', kind: 'shop', solid: true, use: 'greggs' });
      A({ x: 22, y: 23, e: '🏧', name: 'The cashpoint', kind: 'screen', solid: true, use: 'cashpoint' });
      A({ x: 40, y: 23, e: '🖍️', name: 'The hoarding', kind: 'poster', solid: true, use: 'hoarding' });

      /* ---- THE HIGH STREET ----
         Row 14, backing onto the parade: the one long wall in this level that
         the kit's shopfront art is drawn to be seen against. */
      A({ x: 46, y: 14, e: '💅', name: 'Nailed It', kind: 'shop', solid: true, use: 'nailedIt',
        furn: { sprite: 'shop.awning' } });
      A({ x: 48, y: 14, e: '🪧', name: 'The sign above Nailed It', kind: 'shopsign', solid: true, use: 'shopSign' });
      A({ x: 54, y: 14, e: '🎰', name: 'Bellhaven Bookmakers', kind: 'shop', solid: true, use: 'bookies',
        furn: { sprite: 'shop.awning.amber' } });
      A({ x: 60, y: 14, e: '🧦', name: 'The charity shop', kind: 'shop', solid: true, use: 'charityShop' });
      A({ x: 66, y: 14, e: '💨', name: 'Vapour Trail', kind: 'shop', solid: true, use: 'vapeShop' });
      A({ x: 72, y: 14, e: '🚧', name: 'The unit that is always being refitted', kind: 'shop', solid: true, use: 'refit',
        furn: { sprite: 'shop.awning.green' } });
      A({ x: 78, y: 14, e: '🪧', name: 'TO LET', kind: 'shopsign', solid: true, use: 'toLet' });
      A({ x: 56, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 76, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 62, y: 15, e: '🗑️', name: 'Bin, High Street', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 70, y: 22, e: '🪑', name: 'Another bench', kind: 'bench', solid: true, use: 'bench2' });

      /* ---- ALDERGATE RISE ----
         The west side of the block. Nothing has a front door on it, which is
         what makes it the side everything gets put out on. */
      A({ x: 15, y: 26, e: '♻️', name: 'The bottle bank', kind: 'box', solid: true, use: 'bottleBank' });
      A({ x: 15, y: 29, e: '🖍️', name: 'The wall on Aldergate Rise', kind: 'graf', solid: true, use: 'aldergateWall' });
      A({ x: 7, y: 27, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      /* Against the kerb rather than against the wall. The west pavement here
         is two tiles wide and this used to stand on the inner one, which left
         nothing for anybody walking up it to get past on and put every
         pedestrian who tried into the road. */
      A({ x: 7, y: 30, e: '🛒', name: 'Another trolley', kind: 'shoptrolley', solid: true, use: 'trolley' });

      /* ---- FENN STREET ----
         The units along the back of the block, on the one other north wall out
         here — so these are shopfronts that actually draw as shopfronts. */
      A({ x: 20, y: 32, e: '🛞', name: 'Bellhaven Tyre & Exhaust', kind: 'shop', solid: true, use: 'tyres',
        furn: { sprite: 'shop.awning.amber' } });
      A({ x: 30, y: 32, e: '🏋️', name: 'Unit 6', kind: 'shop', solid: true, use: 'unitSix' });
      A({ x: 40, y: 32, e: '🧼', name: 'The hand car wash', kind: 'shop', solid: true, use: 'carWash',
        furn: { sprite: 'shop.awning.green' } });
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
        furn: { sprite: 'shop.awning.amber' } });
      A({ x: 88, y: 14, e: '🪧', name: 'The pub sign', kind: 'shopsign', solid: true, use: 'pubSign' });
      A({ x: 92, y: 14, e: '🧺', name: 'The launderette', kind: 'shop', solid: true, use: 'launderette' });
      A({ x: 98, y: 14, e: '📮', name: 'The post office', kind: 'shop', solid: true, use: 'postOffice',
        furn: { sprite: 'shop.awning' } });
      A({ x: 104, y: 14, e: '🌯', name: 'Bellhaven Kebab', kind: 'shop', solid: true, use: 'kebab',
        furn: { sprite: 'shop.awning.green' } });
      A({ x: 109, y: 14, e: '📞', name: 'The phone box', kind: 'booth', solid: true, use: 'phoneBox' });
      A({ x: 90, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 100, y: 15, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 95, y: 15, e: '🗑️', name: 'Bin, High Street', kind: 'bin', solid: false, use: 'highStreetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 90, y: 22, e: '🪑', name: 'The third bench', kind: 'bench', solid: true, use: 'bench3' });
      A({ x: 96, y: 16, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });

      /* ---- FENN STREET, EAST OF CARGATE ----
         The second block's back, which is where its bins and its fire doors
         are, and — because the rent is lower on a back street — three of the
         four businesses on it. */
      A({ x: 72, y: 32, e: '🎱', name: 'The Working Men’s Club', kind: 'shop', solid: true, use: 'club',
        furn: { sprite: 'shop.awning' } });
      A({ x: 82, y: 32, e: '🌞', name: 'Sunseekers', kind: 'shop', solid: true, use: 'tanning' });
      A({ x: 92, y: 32, e: '📦', name: 'The cash and carry', kind: 'shop', solid: true, use: 'cashAndCarry',
        furn: { sprite: 'shop.awning.green' } });
      A({ x: 78, y: 33, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 96, y: 33, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 86, y: 33, e: '🗑️', name: 'Bin, Fenn Street', kind: 'bin', solid: false, use: 'streetBin',
        furn: { sprite: 'obj.wheeliebin', size: 26 } });
      A({ x: 80, y: 41, e: '🚧', name: 'The fence round the yard', kind: 'barrier', solid: true, use: 'yardFence' });
      A({ x: 68, y: 41, e: '🛒', name: 'Another trolley', kind: 'shoptrolley', solid: true, use: 'trolley' });

      /* ---- MARLOW STREET ----
         The far side of the second block. Nobody who works on the fourth floor
         has any business on it, which is exactly why the ones who cannot get a
         space leave the car here and walk. */
      A({ x: 100, y: 26, e: '🅿️', name: 'The multi-storey', kind: 'sign', solid: true, use: 'multiStorey' });
      A({ x: 101, y: 29, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 109, y: 28, e: '🖍️', name: 'The wall on Marlow Street', kind: 'graf', solid: true, use: 'marlowWall' });
      A({ x: 100, y: 45, e: '♻️', name: 'The bins on Marlow Street', kind: 'box', solid: true, use: 'marlowBins' });
      A({ x: 108, y: 46, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 106, y: 22, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });

      /* ---- CORVEN WAY ----
         The bottom of the town and the bottom of the market: everything down
         here is a shed with a sign on it, and the railway is behind the fence
         on the other side. The parade backs onto the retail park's own wall,
         which is the one long north wall the shopfront art has down here. */
      A({ x: 24, y: 50, e: '🛒', name: 'The superstore', kind: 'shop', solid: true, use: 'superstore',
        furn: { sprite: 'shop.awning' } });
      A({ x: 34, y: 50, e: '🔩', name: 'Screw & Fix', kind: 'shop', solid: true, use: 'screwfix',
        furn: { sprite: 'shop.awning.amber' } });
      A({ x: 44, y: 50, e: '🐕', name: 'The pet superstore', kind: 'shop', solid: true, use: 'petStore',
        furn: { sprite: 'shop.awning.green' } });
      A({ x: 52, y: 50, e: '🪧', name: 'BELLHAVEN RETAIL PARK', kind: 'shopsign', solid: true, use: 'retailSign' });
      A({ x: 74, y: 50, e: '🧶', name: 'The carpet warehouse', kind: 'shop', solid: true, use: 'carpets',
        furn: { sprite: 'shop.awning' } });
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
      A({ x: 96, y: 57, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 40, y: 59, e: '🚃', name: 'The railway', kind: 'view', solid: true, use: 'railway' });
      A({ x: 70, y: 59, e: '🕳️', name: 'The subway', kind: 'sign', solid: true, use: 'subway' });
      A({ x: 20, y: 59, e: '🖍️', name: 'The wall on Corven Way', kind: 'graf', solid: true, use: 'corvenWall' });
      A({ x: 88, y: 59, e: '🐦', name: 'More gulls', kind: 'pigeon', solid: false, use: 'gulls' });

      /* ---- THE RETAIL PARK ----
         Fifteen spaces, a lane down the middle and more tarmac than anywhere
         else on the map. Everything solid in here is at the ends of the aisle
         rather than in it: the whole point of the place is the space. */
      A({ x: 19, y: 47, e: '🛒', name: 'The trolley bay', kind: 'shoptrolley', solid: true, use: 'trolleyBay' });
      A({ x: 54, y: 47, e: '🛒', name: 'The trolley bay', kind: 'shoptrolley', solid: true, use: 'trolleyBay' });
      A({ x: 30, y: 48, e: '🛒', name: 'A trolley, at large', kind: 'shoptrolley', solid: true, use: 'trolley' });
      A({ x: 52, y: 48, e: '♻️', name: 'The recycling point', kind: 'box', solid: true, use: 'recycling' });
      A({ x: 18, y: 46, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 55, y: 46, e: '💡', name: 'Lamppost', kind: 'lamp', solid: true, use: 'lamppost' });
      A({ x: 44, y: 42, e: '🪧', name: 'The retail park sign', kind: 'sign', solid: true, use: 'retailRules' });
    }
  }
};
