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
      A({ x: 7, y: 5, e: '🧍', name: 'First in the queue', kind: 'view', solid: true, use: 'postQueue1' });
      A({ x: 7, y: 6, e: '🧍', name: 'Second in the queue', kind: 'view', solid: true, use: 'postQueue2' });
      A({ x: 7, y: 7, e: '🧍', name: 'Third in the queue', kind: 'view', solid: true, use: 'postQueue3' });
      A({ x: 7, y: 8, e: '🧍', name: 'Fourth in the queue', kind: 'view', solid: true, use: 'postQueue4' });
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
      A({ x: 10, y: 8, e: '📺', name: 'The electricals corner', kind: 'tv', solid: true, use: 'charityElectrical' });
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
      A({ x: 6, y: 6, e: '💨', name: 'The smell', kind: 'view', solid: false, use: 'vapourSmell' });
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
      A({ x: 4, y: 5, e: '\ud83d\udeb2', name: 'The bike', kind: 'bike', solid: true, use: 'flatsBike' });
      A({ x: 3, y: 7, e: '\u26a1', name: 'The meters', kind: 'server', solid: true, use: 'flatsMeters' });
      A({ x: 6, y: 7, e: '\ud83d\udd58', name: 'The light on the timer', kind: 'therm', solid: true, use: 'flatsTimer' });
      A({ x: 11, y: 7, e: '\u2668\ufe0f', name: 'The radiator', kind: 'cooler', solid: true, use: 'flatsRad' });
      A({ x: 13, y: 8, e: '\ud83d\uddd1\ufe0f', name: 'The bin bags by the stairs', kind: 'bin', solid: true, use: 'flatsBags' });
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
      { s: 'grass', r: [6, 59, 109, 59] }
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
    entries: {
      doors: [20.5, 4.5], greggs: [31.5, 22.5],
      /* On the pavement outside each one, which is where you are standing when
         you come back out of it. */
      pub: [86.5, 15.5], bookies: [54.5, 15.5], laund: [92.5, 15.5],
      postoff: [98.5, 15.5], charity: [60.5, 15.5], kebab: [104.5, 15.5], vapour: [66.5, 15.5],
      nails: [46.5, 15.5],
      /* The door between the launderette and the post office, which is where
         the door to the flats above a parade always is. */
      flats: [96.5, 15.5],
      /* And five on Fenn Street, where the pavement is row 33 rather than row
         15 because the parade faces the other way round the block. */
      tyre: [20.5, 33.5], unitsix: [30.5, 33.5], club: [72.5, 33.5], tan: [82.5, 33.5],
    },
    links: [
      { via: 'frontDoors', to: 'office', entry: 'lobby' },
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
    ],
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
        stops: [{ at: [26.5, 17.5], secs: 7 }, { at: [46.5, 56.5], secs: 7 }] }
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
      A({ x: 14, y: 21, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      A({ x: 66, y: 21, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      A({ x: 108, y: 21, e: '⚠️', name: 'Give way', kind: 'roadsign', solid: true, use: 'giveWay' });
      A({ x: 24, y: 15, e: '🪑', name: 'The bench', kind: 'bench', solid: true, use: 'bench' });
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
      A({ x: 70, y: 22, e: '🪑', name: 'Another bench', kind: 'bench', solid: true, use: 'bench2' });

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
      A({ x: 20, y: 32, e: '🛞', name: 'Bellhaven Tyre & Exhaust', kind: 'shop', solid: true, use: 'tyres',
        furn: { sprite: 'shop.awning.amber' } });
      A({ x: 30, y: 32, e: '🏋️', name: 'Unit 6', kind: 'shop', solid: true, use: 'unitSix' });
      /* The second `fromCar` thing on this map, and the one FURN.drivethru's
         note said would come: a car wash is not a shop you walk into, it is a
         lane you drive onto and stay in. On foot it is six lads looking at
         you; from the pool car it is a transaction. Furnished rather than
         given a kind of its own — see Object.assign in World.build. */
      A({ x: 40, y: 32, e: '🧼', name: 'The hand car wash', kind: 'shop', solid: true, use: 'carWash',
        furn: { sprite: 'shop.awning.green', fromCar: true } });
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
      /* THE OTHER KIND OF DOOR ON A HIGH STREET, and there is one on every
         parade in the country: not a shop at all, just a door, between two
         shops, with six bells beside it and no sign saying what it is. */
      A({ x: 96, y: 14, e: '\ud83d\udeaa', name: 'The door beside the launderette', kind: 'shop', solid: true, use: 'flatsDoorway' });
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
      A({ x: 46, y: 55, e: '⚫', name: 'A manhole cover', kind: 'manhole', solid: false, use: 'manhole' });
      /* The other end of the 41. A pole, a timetable, and a bench that is not
         a bench — see the act. It is here because a route with one stop on it
         is not a route, it is a lay-by. */
      A({ x: 46, y: 58, e: '🚏', name: 'The stop on Corven Way', kind: 'sign', solid: true, use: 'corvenStop' });
      A({ x: 96, y: 57, e: '🕳️', name: 'A drain', kind: 'drain', solid: false, use: 'streetDrain' });
      A({ x: 40, y: 59, e: '🚃', name: 'The railway', kind: 'view', solid: true, use: 'railway' });
      A({ x: 70, y: 59, e: '🕳️', name: 'The subway', kind: 'sign', solid: true, use: 'subway' });
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

      /* THE GLASS, one pane beside each frontage. Scenery: it is the
         window of the unit whose sign is next to it, and after dark it is
         the only thing on this parade that is on. */
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
    }
  }
};
