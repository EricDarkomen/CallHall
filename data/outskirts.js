'use strict';
/* CALLHALL — THE OUTSKIRTS, and it is not written down.
 *
 * Every other level in this game is authored tile by tile. data/levels.js is
 * three and a half thousand lines for a town of 0.0137 km², which is the right
 * way to build a place the player is meant to know — the archive, the fourth
 * floor, the lane behind the Greggs — and is the wrong way to build the twenty
 * minutes of housing estate, wood and field between one town and the next.
 * Nobody hand-places four hundred trees.
 *
 * So this one is DERIVED, the way R.roofPlots() derives a townscape out of the
 * mass and R.kerbs() derives a kerb out of where two surfaces meet: a handful
 * of rules, a hash for the variation, and a level def at the end of it. The
 * builder that reads it is the same builder, the collision is the same
 * collision, and the roofs are the roofs — a semi is two units sharing a party
 * wall because that is what the mass says, and nothing here had to tell it.
 *
 * It is east of the town, because Corven Way has run off the east edge of
 * `outside` since it was drawn and a road that leaves ought to arrive.
 *
 * WHAT IS IN IT, from the road in:
 *
 *   MARLEY ROAD, the continuation, straight across the middle. A distributor:
 *   two lanes, a pavement either side, a centre line, and the only road here
 *   that carries anybody who is not going to a house on it.
 *
 *   THE ESTATE, north-west of it: A LOOP ROAD WITH SIX STREETS OFF IT, and
 *   seven rows of semi-detached pairs between them, each with a pavement, a
 *   front garden, a drive, a back garden and a shed. Two of the six streets
 *   stop, in a hammerhead and a bulb, and the land that would have fronted the
 *   rest of them takes the garages and the green.
 *
 *   IT WAS SEVEN PARALLEL AVENUES JOINED TO NOTHING. Not a figure of speech:
 *   a flood fill of the carriageway came back with seven components, six of
 *   them serving a hundred and twelve houses and reachable from nowhere, and
 *   there was no piece of road anywhere on this level that a car could drive
 *   from Marley Road onto any of them. The layout comes out of
 *   data/roads.js now — the widths, the markings, the lighting, the junction
 *   radii, the give-way lines and the turning heads all follow from what each
 *   road is FOR — and tools/levelcheck.mjs asks Roads.faults() of it on every
 *   run. Read the note at the top of that file before moving anything here.
 *
 *   EVERY HOUSE FACES SOUTH, and that is not decoration — the wall band only
 *   draws the tall face of a wall with floor below it, so a building whose
 *   street is to the north is a building seen from the back. It is also why
 *   the streets that carry frontage run east-west and the legs of the loop run
 *   north-south with no frontage at all, which is what a spine road is for.
 *   The whole town obeys this; so does this.
 *
 *   PRIOR'S WOOD, east of the estate: grass, and six hundred trees on it at a
 *   density that thins at the edges, which is what a wood does. The trees are
 *   jittered off the lattice they are generated on, because a wood in ranks is
 *   an orchard.
 *
 *   THE HAMLET, further east along the road: eight detached cottages standing
 *   on their own in their own gardens, because a map of nothing but terraces
 *   is a map of one idea.
 *
 *   THE FIELDS, south of the road, walled off from each other in dry stone with
 *   a gate through every wall, and a farm in the middle of them: a yard, a
 *   farmhouse, two sheds and the machinery, because a field with nothing in it
 *   is a car park with grass on it.
 *
 * The size is one constant. At 384 by 384 this is eleven times the town and
 * builds in about ten milliseconds in a browser; the arithmetic below does not
 * care what the number is. (Ten in a browser and two hundred under the node
 * harnesses in tools/ — a vm context does not get the same optimisation, and
 * it is about twenty times out. Measure in the browser.)
 */
const Outskirts = {
  W: 384, H: 384,

  /* ---- the dice ----------------------------------------------------------
     A hash of the coordinate rather than Math.random(), for the reason every
     derived thing in this engine uses one: the level is built afresh every
     time it is loaded, and a wood that is somewhere else when you walk back
     into it is not a wood. */
  hash(a, b, salt) {
    let h = 2166136261 ^ (salt || 0);
    h = Math.imul(h ^ a, 16777619); h = Math.imul(h ^ b, 16777619);
    h ^= h >>> 13; h = Math.imul(h, 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  },
  rnd(a, b, salt) { return this.hash(a, b, salt) / 4294967296; },
  pick(list, a, b, salt) { return list[this.hash(a, b, salt) % list.length]; },

  /* ---- the layout, in one place ------------------------------------------
     Everything below is derived from these, so moving the road moves the
     estate, the wood and the fields with it.

     A STREET IS NO LONGER A CONSTANT IN HERE, and that is the change. It was
     ten deep everywhere — two of pavement, six of carriageway, two of pavement
     — which made Marley Road and the avenues off it the same kind of thing, and
     that was the fault rather than the tidiness: a road that carries the
     traffic of a county and a road that serves fourteen houses are not the same
     kind of thing, and laying them out as though they were is how this estate
     ended up as seven parallel stripes of six-metre carriageway with no
     junction anywhere on it. The widths, the markings, the lighting, the kerb
     radii and the turning heads all come out of data/roads.js now, keyed off
     what each road is FOR. See the note at the top of that file. */
  get ROAD() { return { y: Math.floor(this.H / 2) - 5, h: 10 }; },   /* Marley Road */
  FRONT: 3,          /* front garden: a path, a bin and a shrub */
  /* SEVEN DEEP, and the number is a roof rather than a room. The wall band
     draws the bottom two rows of any mass as its tall south face, and the roof
     pass puts a mitred coping round the edge of what is left — so a house five
     deep had three rows of roof, all three of them edge, and read as a grey
     tray with one stripe of slate in it. Seven gives five, and five gives
     three of field between the copings, which is a roof. */
  HOUSE_H: 7,
  BACK: 5,           /* back garden, with a shed at the bottom of it */
  PAIR_W: 14,        /* a semi-detached pair; two sevens sharing a wall */
  PITCH: 18,         /* the pair plus the drive and the side passage beside it */
  /* THE BAND, which is the one number the whole estate is set out on: a front
     garden, a house, a back garden and the next street. Twenty-three metres,
     and it went from twenty-five to twenty-three the day the avenues stopped
     being distributors — an access road is eight deep where a six-lane
     carriageway with footways is ten, and the two metres came back as a band
     and then as a seventh row of houses. */
  get BAND() { return this.FRONT + this.HOUSE_H + this.BACK + 8; },
  /* Where the pairs run, between the two legs of the loop. Both are set by the
     loop and not the other way round: the west leg's band ends at 30 and the
     east leg's begins at 160. */
  EX1: 32, EX2: 158,

  /* ---- THE ROADS, AS A NETWORK -------------------------------------------
     A LOOP WITH SIX STREETS OFF IT, which is the smallest arrangement that is
     honestly an estate. It has two ways in off Marley Road rather than one, so
     a car parked across a junction mouth is a nuisance rather than a siege; it
     has a spine that fronts nothing much and access roads that front houses,
     which is the hierarchy doing the one thing a hierarchy is for; and every
     junction on it is a T, because the alternative at six streets crossing a
     spine is six crossroads and nobody builds those any more.
     tools/levelcheck.mjs asks Roads.faults() of this, every run.

     WHY THE LEGS RUN NORTH-SOUTH AND THE STREETS EAST-WEST, and it is not a
     preference either: the wall band only draws the tall face of a wall with
     floor below it, so a house has to face SOUTH or it is a house seen from
     the back for the whole of its life. Houses therefore front an east-west
     street, so the streets they front run east-west and the roads that join
     them up run the other way. The legs of the loop carry no frontage at all,
     which is what a spine road is supposed to do.

     The avenue centre lines come off the band arithmetic above rather than
     being written down, so moving a house moves the road in front of it. */
  av(k) { return this.ROAD.y - 19 - k * this.BAND; },
  /* The two legs and the top of the loop. LEGN is the last band's back wall
     less the twenty tiles a spine's band and its kerb line take. */
  LEGW: 26, LEGE: 164,
  get LEGN() { return this.ROAD.y - 6 * this.BAND - 20; },
  BANDS: 7,
  /* One entry per street off the loop, northward: its zone, its class, and
     which band of houses fronts it. THE TWO CLOSES ARE THE TWO THAT STOP, and
     Sycamore Close is one of them because it was already called a close while
     being a through road — which is the kind of thing that goes unnoticed
     until something that knows what a close is lays the roads out. */
  STREETS: [
    { zone: 'ashfield', cls: 'access' },
    { zone: 'elmtree',  cls: 'access' },
    { zone: 'sycamore', cls: 'cul', stop: 90, head: 'hammer' },
    { zone: 'lindens',  cls: 'access' },
    { zone: 'chestnut', cls: 'access' },
    /* This one is a close from the OTHER end, so it runs west off Rowan Drive
       and the bulb is at the far end of it. `headAt: 'from'` is how a link says
       which of its two ends is the dead one. */
    { zone: 'laburnum', cls: 'cul', begin: 100, head: 'bulb', headAt: 'from' }
  ],

  /* The network itself, built once and kept: every other thing in this file
     asks it where the roads are, and a second copy of this arithmetic is how
     a kerb ends up half a tile out. */
  plan() {
    if (this._plan) return this._plan;
    const R = this.ROAD, W = this.W;
    const wc = Roads.geom({ cls: 'spine', at: this.LEGW }), ec = Roads.geom({ cls: 'spine', at: this.LEGE });
    const links = [
      /* Marley Road, straight across and off both edges of the map. */
      { id: 'marley', zone: 'marley', cls: 'distributor', axis: 'x', at: R.y + R.h / 2, from: 0, to: W - 1 },
      /* The loop: up the west side, along the top, down the east side. All
         three are one class, because they are one road that changes its name
         twice, which is what a loop road on an estate always does. */
      { id: 'hazel', zone: 'hazel', cls: 'spine', axis: 'y', at: this.LEGW, from: this.LEGN, to: R.y + 7 },
      { id: 'beechway', zone: 'beechway', cls: 'spine', axis: 'x', at: this.LEGN, from: wc.c1, to: this.LEGE },
      { id: 'rowan', zone: 'rowan', cls: 'spine', axis: 'y', at: this.LEGE, from: this.LEGN, to: R.y + 7 }
    ];
    this.STREETS.forEach((st, k) => links.push({
      id: st.zone, zone: st.zone, cls: st.cls, axis: 'x', at: this.av(k),
      from: st.begin === undefined ? wc.c1 : st.begin,
      to: st.stop === undefined ? ec.c2 : st.stop,
      head: st.head || null, headAt: st.headAt || null
    }));
    return (this._plan = Roads.net(links, { w: this.W, h: this.H }));
  },

  make() {
    const W = this.W, H = this.H, R = this.ROAD;
    const rooms = [], surfaces = [], paint = [];
    const solids = [], objects = [], cars = [];
    const room = (z, x1, y1, x2, y2) => rooms.push({ z, r: [x1, y1, x2, y2] });
    const surf = (s, x1, y1, x2, y2) => surfaces.push({ s, r: [x1, y1, x2, y2] });
    const add = o => objects.push(o);
    /* ORDER OF OPERATIONS, and there is one thing in this file that needs it.
       The fields go in before the water does, because the water follows the
       shape of the fields — and a lone oak or a hedgerow tree is SOLID, so one
       dropped where the brook will later run seals a tile or two behind it
       against a wall. Nobody would ever have walked into them; levelcheck
       reports them, and it is right to. So anything solid that is scattered
       across a field is put on `later` instead of straight into the list, the
       water writes every tile it takes into `wet`, and the flush at the end
       drops whatever landed in it or beside it. */
    const wet = new Set(), later = [];
    const addLate = o => later.push(o);
    const soak = (x, y) => wet.add(y * this.W + x);
    const damp = (x, y) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
        if (wet.has((y + dy) * this.W + (x + dx))) return true;
      return false;
    };
    const box = (x1, y1, x2, y2) => solids.push([x1, y1, x2, y2]);

    /* ---- the land ---------------------------------------------------------
       Open country first, and everything else laid over it. A two-tile hem of
       mass round the outside is the rest of the world: the renderer roofs it,
       which is what you are looking at when you look past the last field. */
    room('field', 2, 2, W - 3, H - 3);
    surf('grass', 2, 2, W - 3, H - 3);

    /* ---- THE ROADS --------------------------------------------------------
       All of them, in one call, before anything stands on one. Roads.stamp()
       puts the rooms, the paving, the carriageways, the kerb radii at every
       junction, the turning heads, the centre lines, the give-way lines and
       the yellows at every junction mouth onto the three lists below — and the
       ORDER it does it in is the whole reason it is one call rather than one
       per road: a surface declared later wins, so every band's paving has to
       go down before any carriageway does or the second road's pavement is
       laid across the first road's tarmac at every junction, and R.kerbs()
       then draws a six-inch step across the middle of a road. See the note
       over Roads.stamp(). */
    const net = this.plan();
    const heads = Roads.heads(net);
    Roads.stamp(net, { rooms, surfaces, paint });

    /* ---- Marley Road ------------------------------------------------------
       The road itself is in the network above; what is left here is the three
       things standing on its pavement. */
    add({ x: 2, y: R.y + 1, e: '🛣️', name: 'The road back into town',
          kind: 'sign', solid: false, use: 'backToTown', via: 'townRoad' });   /* a sign, now that the road itself goes there — see Acts.backToTown */
    add({ x: Math.floor(W * .46), y: R.y - 1, e: '🚏', name: 'The bus stop on Marley Road',
          kind: 'sign', solid: true, use: 'marleyStop' });
    add({ x: Math.floor(W * .46) + 2, y: R.y - 1, e: '📮', name: 'A postbox',
          kind: 'bin', solid: true, use: 'marleyPost', furn: { sprite: 'obj.postbox', size: 24 } });

    /* ---- the estate -------------------------------------------------------
       Bands northward from Marley Road. Each band is a row of pairs, its front
       gardens and its back gardens, and every one of them belongs to the
       street it FRONTS — which is the whole of what an address is.

       WHAT CHANGED HERE IS WHERE THE STREETS COME FROM. This loop used to lay
       one as it went, at the bottom of each band, ten deep and from one end of
       the estate to the other: seven of them, parallel, and not one piece of
       road joining any two. It reads them off the network above instead, which
       is a loop road with six streets off it, and the difference is not the
       look of it — it is that you can drive from Marley Road to any house on
       the estate, which you could not.

       `pave` is the row of paving the houses in this band look at, and it is
       the northern edge of the band of the street below them. Band 0 looks at
       Marley Road's own north pavement, which is why the estate starts on the
       main road rather than one street back from it. */
    const EX1 = this.EX1, EX2 = this.EX2;
    /* WHAT THE HOUSES MUST KEEP OFF, and both halves of it come out of
       data/roads.js rather than being written down here.

       The TURNING HEADS, because a hammerhead is sixteen metres across the bar
       and a bulb is fifteen across the circle — both of them wider than the
       street they finish, so both eat into the plots either side. That is what
       happens round a real close as well: the houses at the head of one stand
       further back and there are fewer of them.

       The VISIBILITY SPLAYS, because a driver waiting to come out of one of
       these streets has to be able to see along the road they are coming out
       onto, and a semi-detached pair with a hedge and a wheelie bin in front
       of it is exactly what stops them. Nothing solid goes in one. */
    const keepRoad = heads.map(h => h.bbox).concat(Roads.splays(net));
    const offRoad = (x1, y1, x2, y2) =>
      !keepRoad.some(r => x1 <= r[2] && x2 >= r[0] && y1 <= r[3] && y2 >= r[1]);
    for (let band = 0; band < this.BANDS; band++) {
      const pave = R.y - band * this.BAND;
      const hy2 = pave - this.FRONT - 1;             /* the front wall */
      const hy1 = hy2 - this.HOUSE_H + 1;
      const back = hy1 - this.BACK;                  /* the far end of the garden */
      /* The street this row looks at, and how far along it the carriageway
         actually goes: a close stops, and a house with no road in front of it
         is not a house, it is a mistake you can walk to. Band 0 looks at
         Marley Road, which runs the width of the map. */
      const st = band === 0
        ? Roads.byId(net, 'marley')
        : Roads.byId(net, this.STREETS[band - 1].zone);
      const z = st.zone;
      room(z, EX1 - 1, back, EX2 + 1, pave - 1);

      /* THE ROW JOGS, and this is the single biggest thing standing between an
         estate and a spreadsheet. Laid from the same EX1 every band, seven
         rows of pairs line up column for column all the way up the map, which
         no estate on earth does — the roads were set out first and the plots
         were fitted into what was left, so every row starts somewhere slightly
         different and runs out somewhere slightly different too. One hash per
         band buys the whole of that. */
      const jog = this.hash(band, 7, 131) % this.PITCH;
      const pitch = this.PITCH + (this.hash(band, 9, 133) % 3);
      let first = null, last = null;
      for (let x = EX1 + jog; x + this.PAIR_W <= EX2; x += pitch) {
        /* A hash decides which pairs are there at all, so a run of houses has
           a gap in it where somebody never built — and that gap is what makes
           the terrace either side of it read as a terrace. */
        if (this.rnd(x, hy1, 11) < .08) continue;
        /* AND THE ROAD DECIDES THE REST. No pair where the street in front of
           it has run out, none in a turning head, and none in a visibility
           splay. This is the line that turns a close into a close: the plots
           stop where the tarmac does, and the land behind them becomes the
           thing an estate puts on land it did not build houses on. */
        if (x < st.from || x + this.PAIR_W - 1 > st.to) continue;
        if (!offRoad(x, hy1, x + this.PAIR_W - 1, pave - 1)) continue;
        box(x, hy1, x + this.PAIR_W - 1, hy2);
        if (first === null) first = x;
        last = x + this.PAIR_W - 1;

        /* Two front doors, one either side of the party wall, each with its
           own path to the pavement. The doors are what the roof cuts on — see
           R.roofPlots() — so a pair comes out as two units under one roof with
           a party wall drawn on it, without anybody saying so. */
        for (const dx of [2, this.PAIR_W - 3]) {
          add({ x: x + dx, y: hy2, e: '🚪', name: 'A front door',
                kind: 'exit', solid: false, use: 'frontDoor' });
          surf('slab', x + dx, hy2 + 1, x + dx, pave - 1);     /* the path */
        }
        /* THE DRIVE, in the gap between this pair and the next, and a car on
           it about half the time. Two tiles of hardstanding is what the gap
           between two semis is for.

           THE DROPPED KERB IS NOT DRAWN AND DOES NOT NEED TO BE: the drive is
           `slab` up to the pavement and the pavement is `slab`, so R.kerbs()
           finds no boundary to lay a kerb along and the crossover is flush,
           which is what a crossover is. The same rule the town's own vehicle
           accesses work by — see the note over the car wash apron in
           data/levels.js. */
        const dv = x + this.PAIR_W;
        if (dv + 2 < EX2 && dv + 2 < x + pitch && dv + 2 <= st.to && offRoad(dv, hy2 + 1, dv + 2, pave - 1)) {
          surf('slab', dv, hy2 + 1, dv + 2, pave - 1);
          if (this.rnd(x, hy1, 21) < .5)
            cars.push({ x: dv + 1.5, y: hy2 + 2.5, face: 's', model: this.pick(['hatch', 'small', 'saloon', 'estate'], x, hy1, 23),
                        name: 'Somebody’s car on the drive', use: 'someoneElsesCar' });
        }
        /* The bin out, the shrub by the gate, and a shed at the bottom of the
           garden — which is mass, and is therefore roofed like everything else
           that is mass, which is how you get a hundred little felt roofs for
           nothing. */
        if (this.rnd(x, hy1, 31) < .7)
          add({ x: x + this.PAIR_W - 1, y: pave - 1, e: '🗑️', name: 'A wheelie bin',
                kind: 'bin', solid: false, use: 'wheelieBin' });
        if (this.rnd(x, hy1, 41) < .45)
          add({ x: x + 5, y: pave - 1, e: '🌳', name: 'A tree in a front garden',
                kind: 'tree', solid: true, use: 'gardenTree' });
        if (this.rnd(x, hy1, 51) < .6)
          box(x + 3, back + 1, x + 5, back + 3);
        if (this.rnd(x, hy1, 61) < .5)
          add({ x: x + this.PAIR_W - 4, y: back + 2, e: '🌳', name: 'A tree in a back garden',
                kind: 'tree', solid: true, use: 'gardenTree' });
      }

      /* THE BACK WALL of the gardens, along the far end of them, with a gate
         per plot in it. Without it the back gardens run straight out onto the
         pavement of the street behind and the estate reads as houses standing
         in a park — a garden is a garden because somebody drew a line round
         it. One tile of mass, which is the same thing the field walls are and
         is drawn the same way.

         ACROSS THE GARDENS AND NO FURTHER. It used to run the whole width of
         the estate and a bit past it, which was harmless while every band had
         houses from one end to the other; with two closes in the layout there
         are pockets of land now with no gardens in them, and a garden wall
         across open ground is a wall somebody would have to walk round for no
         reason anybody could see. */
      if (first !== null)
        for (let x = first - 1; x <= last + 1; x++)
          if ((x - EX1 + 400) % 9 > 1 && offRoad(x, back, x, back)) box(x, back, x, back);
    }

    /* ---- what else is on an estate ----------------------------------------
       THE LEFT-OVER LAND, and it is left over for a reason rather than left
       out. Two of the six streets are closes, so the plots that would have
       fronted the rest of them are not there — which leaves two pockets in the
       middle of the estate with nothing on them, and what an estate puts on
       land like that is a row of lock-up garages and a bit of green.

       Neither is decoration. The garages are a long run of shallow mass, which
       the roof pass cuts into eight units under one unbroken roof and is the
       clearest example in the game of a terrace that is not a terrace of
       houses; and the green is the thing an estate has instead of a square —
       the bit nobody built on, with a tree on it and the goalposts long gone.

       Both are FOUND rather than placed: the pocket is wherever the close's
       carriageway stopped, and the two of them move if the closes do. */
    {
      const syc = Roads.byId(net, 'sycamore'), lab = Roads.byId(net, 'laburnum');
      const sycHead = heads.find(h => h.link === syc), labHead = heads.find(h => h.link === lab);
      /* THE GARAGES, in the pocket east of Sycamore Close's hammerhead: a
         block of eight, backing onto the gardens, with their own apron in
         front of them to get a car off the close and onto one. */
      const gx = sycHead.bbox[2] + 5, gy = syc.at - 12;
      if (gx + 25 < EX2) {
        box(gx, gy, gx + 23, gy + 4);
        for (let i = 0; i < 8; i++)
          add({ x: gx + 1 + i * 3, y: gy + 4, e: '🚪', name: 'A lock-up garage',
                kind: 'exit', solid: false, use: 'lockUp' });
        room('sycamore', gx - 3, gy - 2, gx + 26, gy + 11);
        surf('slab', gx - 3, gy + 5, gx + 26, gy + 11);
      }
      /* THE GREEN, in the pocket west of Laburnum Close's bulb, which is the
         top corner of the estate and the one part of it with room to stand
         about in. */
      const px = EX1, py = lab.at - 16, pw = labHead.bbox[0] - 4;
      room('laburnum', px, py, pw, lab.at + 4);
      for (let i = 0; i < 7; i++) {
        const tx = px + 2 + (this.hash(i, 7, 111) % Math.max(2, pw - px - 3));
        const ty = py + 1 + (this.hash(i, 9, 113) % 14);
        add({ x: tx, y: ty, e: '🌳', name: 'A tree on the green', kind: 'tree', solid: true, use: 'gardenTree' });
      }
      add({ x: px + 4, y: lab.at - 2, e: '🪑', name: 'A bench on the green', kind: 'bench', solid: true, use: 'greenBench' });
      add({ x: px + 8, y: lab.at - 2, e: '🗑️', name: 'A litter bin', kind: 'bin', solid: true, use: 'greenBin' });
      /* And the tree in the middle of the bulb, which is two thirds of the
         reason a bulb is better to look at than a hammerhead: the island in
         the middle of it has something on it for the road to go round. */
      if (labHead.hole)
        add({ x: Math.round(labHead.centre[0]), y: Math.round(labHead.centre[1]),
              e: '🌳', name: 'The tree in the turning head', kind: 'tree', solid: true, use: 'gardenTree' });
    }

    /* ---- THE LIGHTING -----------------------------------------------------
       Off the network, at the spacing each class asks for, alternating sides,
       and never in a junction mouth or a visibility splay. It used to be one
       lamp every twenty tiles down one side of every avenue, which is a street
       with a dark stripe along it. */
    Roads.lamps(net).forEach(add);

    /* ---- the parade -------------------------------------------------------
       Two units on Marley Road at the west end, which is the only reason
       anybody on this estate walks anywhere. They are ONE run of mass with two
       doors in it, so the roof pass cuts them into two units under one roof
       with a party wall between — a parade is a terrace that sells things, and
       nothing here had to say so. The glass and the sign over each door are
       the same `shopwin` and `shop` kinds the High Street uses; out here there
       are two of them instead of sixteen, which is the difference. */
    {
      /* EAST of Rowan Drive, in the gap between the estate and the hamlet. It
         has to be clear of the houses rather than among them: the parade is
         mass and the first row of semis is mass, and mass that touches mass is
         ONE plot as far as the roof pass is concerned — put at the west end it
         merged into the terrace behind it and came out as one long jagged
         slate roof with the shop notched into it. Six tiles of air is the
         whole fix, and they are measured off the east leg of the loop rather
         than off the last pair, because the road is the thing that is not
         going to move. */
      const sx = Roads.geom(Roads.byId(net, 'rowan')).b2 + 6, sy = R.y - this.FRONT - 5;
      box(sx, sy, sx + 21, sy + 4);
      room('marley', sx - 3, sy - 3, sx + 24, R.y - 1);
      surf('slab', sx - 3, sy + 5, sx + 24, R.y - 1);
      const units = [
        [4, '🏪', 'The Marley Road Stores', 'cornerShop', 'The window of the Stores'],
        [16, '🍺', 'The Cross Keys', 'estatePub', 'The window of the Cross Keys']
      ];
      for (const [dx, e, name, use, win] of units) {
        add({ x: sx + dx, y: sy + 4, e: '🚪', name: 'The door of ' + name, kind: 'exit', solid: false, use });
        add({ x: sx + dx, y: sy + 4, e, name, kind: 'shop', solid: false, use });
        add({ x: sx + dx + 3, y: sy + 4, e: '🪟', name: win, kind: 'shopwin', solid: false, use: 'shopWindow' });
        add({ x: sx + dx - 3, y: sy + 4, e: '🪟', name: win, kind: 'shopwin', solid: false, use: 'shopWindow' });
      }
      add({ x: sx + 10, y: R.y - 2, e: '🗑️', name: 'A litter bin', kind: 'bin', solid: true, use: 'greenBin' });
      add({ x: sx + 20, y: R.y - 2, e: '💡', name: 'A street light', kind: 'lamp', solid: true, use: 'streetLamp' });
      add({ x: sx + 1, y: R.y - 2, e: '💡', name: 'A street light', kind: 'lamp', solid: true, use: 'streetLamp' });
    }

    /* ---- Prior's Wood -----------------------------------------------------
       Trees on grass, thinning towards the edge so it has a shape rather than
       a boundary, and JITTERED off the lattice they are counted on: a tree
       every other tile on the nose is an orchard, and nobody planted this. */
    const wx1 = Math.floor(W * .56), wx2 = W - 10, wy1 = 12, wy2 = R.y - 24;
    const cx = (wx1 + wx2) / 2, cy = (wy1 + wy2) / 2;
    const rx = (wx2 - wx1) / 2, ry = (wy2 - wy1) / 2;
    room('wood', wx1 - 3, wy1 - 3, wx2 + 3, wy2 + 3);
    surf('grass', wx1 - 3, wy1 - 3, wx2 + 3, wy2 + 3);
    /* The track through it, because a wood with no way through is scenery, and
       it runs from the road to the north edge so it is a way somewhere. */
    /* THE TRACK WANDERS, because a footpath through a wood is a line drawn by
       feet going round things and not by anybody setting it out. Three cosines
       at different rates, which is the cheapest curve that does not repeat. */
    const trackX = y => Math.round(cx + Math.sin(y * .043) * 9 + Math.sin(y * .011 + 2) * 14);
    for (let y = wy1 - 3; y <= R.y - 1; y++) {
      const t = trackX(y);
      room('wood', t - 1, y, t + 1, y);
      surf('track', t - 1, y, t + 1, y);
    }
    const tk = trackX(Math.floor(cy));
    /* AND THE EDGE IS RAGGED. A wood thins out where the ground turns or the
       plough got closer, so the radius it thins at is a slow function of the
       bearing from the middle rather than a constant — which is the difference
       between a wood and a roundabout. */
    const treed = new Set();
    for (let y = wy1; y <= wy2; y += 2) for (let x = wx1; x <= wx2; x += 2) {
      const th = Math.atan2((y - cy) / ry, (x - cx) / rx);
      const lobe = 1 + Math.sin(th * 3) * .13 + Math.sin(th * 5 + 1.3) * .09 + Math.sin(th * 2 - .6) * .11;
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry) / lobe;
      if (d > 1) continue;
      if (this.rnd(x, y, 71) > .74 - d * .5) continue;
      const jx = x + (this.hash(x, y, 72) % 3) - 1;
      const jy = y + (this.hash(x, y, 73) % 3) - 1;
      if (Math.abs(jx - trackX(jy)) <= 2) continue;          /* keep the track clear */
      const k = jy * W + jx;
      if (treed.has(k)) continue;
      treed.add(k);
      add({ x: jx, y: jy, e: '🌳', name: 'A tree in Prior’s Wood', kind: 'tree', solid: true, use: 'woodTree' });
    }
    /* A bench at the top of the track, facing back down it. Somebody's mother
       is on a plaque on it and the game has never said whose. */
    add({ x: tk + 3, y: Math.floor(cy) + 1, e: '🪑', name: 'A bench in the wood',
          kind: 'bench', solid: true, use: 'woodBench' });

    /* ---- the hamlet -------------------------------------------------------
       Detached cottages along the north side of the road east of the wood, and
       on the south side west of the farm track: each on its own, each with a
       garden wall round it, and each a plot of one unit — which is the whole
       point of them. A roofscape of nothing but terraces is a roofscape of one
       idea. */
    const HAM = [];
    for (let i = 0; i < 6; i++) {
      const x = EX2 + 26 + i * 30 + (this.hash(i, 3, 141) % 9), y = R.y - 11 - (this.hash(i, 5, 143) % 4);
      if (x + 15 > W - 8) break;
      /* THE CHURCH, in the middle of the six, and the one building on this map
         with a plan that is not a rectangle: a nave, a chancel narrower than
         it, and a tower on the west end. Which matters because the roof pass
         does not know what a church is — it floods the mass and copes what it
         finds, so the tower comes out as its own little plot with a coping all
         the way round and the nave comes out as one long one, and the step
         between them is drawn because it is there. Every inner corner on it is
         a tile off the same thirteen. */
      if (i === 3) {
        HAM.push([x - 9, y - 11, x + 17, R.y - 1]);
        box(x - 1, y - 4, x + 10, y + 3);                  /* the nave */
        box(x + 11, y - 2, x + 15, y + 1);                 /* the chancel */
        box(x - 5, y - 6, x - 2, y + 3);                   /* the tower */
        add({ x: x - 3, y: y + 3, e: '⛪', name: 'St Cuthbert’s, Marley', kind: 'exit', solid: false, use: 'church' });
        room('church', x - 9, y - 9, x + 17, R.y - 1);
        surf('grass', x - 9, y - 9, x + 17, R.y - 1);
        surf('slab', x - 3, y + 4, x - 3, R.y - 1);
        /* The churchyard wall, with the lychgate left out of it. */
        for (let gx = x - 9; gx <= x + 17; gx++) if (gx !== x - 3) box(gx, R.y - 1, gx, R.y - 1);
        for (let gy = y - 9; gy < R.y - 1; gy++) { box(x - 9, gy, x - 9, gy); box(x + 17, gy, x + 17, gy); }
        for (let gx = x - 9; gx <= x + 17; gx++) box(gx, y - 9, gx, y - 9);
        for (const [tx, ty] of [[x - 7, y - 7], [x + 14, y - 6], [x - 7, y + 6], [x + 13, y + 7]])
          add({ x: tx, y: ty, e: '🌳', name: 'A yew in the churchyard', kind: 'tree', solid: true, use: 'churchYew' });
        /* No sprite, which is deliberate: there is no headstone on any sheet
           in this repository and the nearest thing to one is a packing crate.
           A `barrier` carries no sprite of its own, so what gets drawn is the
           emoji, and the emoji is a headstone. */
        for (const [gx, gy] of [[x + 1, y + 6], [x + 3, y + 7], [x + 6, y + 6], [x + 8, y + 8], [x - 1, y + 8]])
          add({ x: gx, y: gy, e: '🪦', name: 'The graves', kind: 'barrier', solid: true, use: 'churchGraves' });
        add({ x: x + 7, y: y + 7, e: '🪑', name: 'A bench in the churchyard', kind: 'bench', solid: true, use: 'churchBench' });
        add({ x: x - 6, y: R.y - 2, e: '🪧', name: 'The noticeboard', kind: 'sign', solid: true, use: 'churchBoard' });
        continue;
      }
      /* NORTH of the road, because a cottage has to face south — the wall band
         only draws the tall face of a wall with floor below it, so a house put
         on the other side of the road would be a house seen from the back for
         the whole of its life. Everything in this level obeys that; so does
         the town. */
      HAM.push([x - 7, y - 7, x + 15, R.y - 1]);
      box(x, y, x + 8, y + 5);
      room('marley', x - 5, y - 5, x + 13, R.y - 1);
      add({ x: x + 4, y: y + 5, e: '🚪', name: 'A cottage door', kind: 'exit', solid: false, use: 'frontDoor' });
      surf('slab', x + 4, y + 6, x + 4, R.y - 1);
      /* A garden wall on the pavement, with the gateway the path goes through
         left out of it, and returns up either side. */
      for (let gx = x - 5; gx <= x + 13; gx++) if (gx !== x + 4) box(gx, R.y - 1, gx, R.y - 1);
      for (let gy = y - 5; gy < R.y - 1; gy++) { box(x - 5, gy, x - 5, gy); box(x + 13, gy, x + 13, gy); }
      if (this.rnd(x, y, 81) < .7)
        add({ x: x - 2, y: R.y - 2, e: '🌳', name: 'A tree in a cottage garden', kind: 'tree', solid: true, use: 'gardenTree' });
      add({ x: x + 7, y: R.y - 2, e: '🗑️', name: 'A wheelie bin', kind: 'bin', solid: false, use: 'wheelieBin' });
      add({ x: x + 1, y: R.y - 3, e: '💐', name: 'A flower bed', kind: 'bin', solid: false,
            use: 'cottageFlowers', furn: { sprite: this.pick(['obj.flowers.red', 'obj.flowers.white'], x, i, 85), size: 26 } });
      if (this.rnd(x, y, 87) < .5)
        add({ x: x + 11, y: y + 7, e: '🌳', name: 'A tree in a cottage garden', kind: 'tree', solid: true, use: 'gardenTree' });
    }

    /* ---- the fields -------------------------------------------------------
       South of the road, walled off from each other in dry stone. A wall here
       is one tile of mass, which the roof pass draws as a party wall down both
       sides because that is exactly what a one-deep run is — and it is why the
       field boundaries read as walls rather than as buildings.

       EVERY WALL HAS A GATE IN IT, which is not decoration: a field you cannot
       get out of is a room, and the player would find that out the hard way. */
    const fy1 = R.y + R.h + 8, fy2 = H - 12;
    const GATEW = 3;
    const wallRow = [], wallCol = [];
    /* UNEVEN, and for the same reason the estate jogs: a field is whatever was
       left over when the last one was walled off, and eight identical squares
       is an allotment. The step is a hash rather than a constant, which costs
       nothing and is the whole difference from the air. */
    for (let y = fy1; y < fy2; y += 26 + this.hash(y, 1, 151) % 18) wallRow.push(y);
    for (let x = 26; x < W - 24; x += 34 + this.hash(x, 2, 153) % 26) wallCol.push(x);
    /* THE FARM first, so the walls can be told to keep off it — and off the
       cottage gardens as well. A field wall laid through somebody's garden
       cuts the garden in half and leaves half of it unreachable, which is the
       kind of thing a derived level does to you if you let it and which is
       exactly what tools/levelcheck.mjs is for. */
    const fx = 120, fyy = fy1 + 24;
    const farmBox = [fx - 9, fyy - 7, fx + 31, fyy + 19];
    const keepOff = [farmBox].concat(HAM);
    const clearOfFarm = (x, y) =>
      !keepOff.some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);

    for (const y of wallRow) {
      for (let x = 10; x <= W - 11; x++) {
        if (!clearOfFarm(x, y)) continue;
        if (this.hash(Math.floor(x / 26), y, 91) % 26 < GATEW && x % 26 >= 11 && x % 26 < 11 + GATEW) continue;
        box(x, y, x, y);
      }
      /* A tree in the hedgerow every so often, which is the only thing that
         stops a wall being a line. */
      for (let x = 14; x < W - 14; x += 9)
        if (this.rnd(x, y, 93) < .3 && clearOfFarm(x, y - 1))
          addLate({ x, y: y - 1, e: '🌳', name: 'A tree in the hedgerow', kind: 'tree', solid: true, use: 'woodTree' });
    }
    for (const x of wallCol) {
      for (let i = 0; i + 1 < wallRow.length; i++) {
        const y1 = wallRow[i], y2 = wallRow[i + 1];
        const gate = y1 + 8 + this.hash(x, y1, 95) % Math.max(1, (y2 - y1 - 18));
        for (let y = y1; y <= y2; y++) {
          if (y >= gate && y < gate + GATEW) continue;
          if (!clearOfFarm(x, y)) continue;
          box(x, y, x, y);
        }
      }
    }
    /* Half the fields are ploughed and half are down to grass, decided per
       field rather than per tile, which is what makes them fields. */
    for (let i = 0; i + 1 < wallRow.length; i++) {
      for (let j = 0; j + 1 < wallCol.length; j++) {
        if (this.rnd(wallCol[j], wallRow[i], 97) > .5) continue;
        const x1 = wallCol[j] + 1, y1 = wallRow[i] + 1;
        const x2 = wallCol[j + 1] - 1, y2 = wallRow[i + 1] - 1;
        if (!clearOfFarm(x1, y1) || !clearOfFarm(x2, y2)) continue;
        surf('track', x1, y1, x2, y2);
      }
    }
    /* And the things that are in a field: a trough, a stack of bales, a lone
       oak somebody's grandfather left standing when the hedge came out. */
    for (let i = 0; i + 1 < wallRow.length; i++) for (let j = 0; j + 1 < wallCol.length; j++) {
      /* Three throws per field rather than one, at three points in it, because
         a field with one thing in the exact middle of it is a diagram. */
      for (const [ox, oy, salt] of [[.34, .3, 99], [.68, .55, 101], [.45, .78, 103]]) {
        const mx = Math.round(wallCol[j] + (wallCol[j + 1] - wallCol[j]) * ox);
        const my = Math.round(wallRow[i] + (wallRow[i + 1] - wallRow[i]) * oy);
        if (!clearOfFarm(mx, my)) continue;
        const r = this.rnd(mx, my, salt);
        if (r < .26) addLate({ x: mx, y: my, e: '🌳', name: 'A lone oak', kind: 'tree', solid: true, use: 'woodTree' });
        else if (r < .44) addLate({ x: mx, y: my, e: '🚧', name: 'A run of hurdles', kind: 'barrier', solid: true,
                                use: 'fieldHurdles', furn: { sprite: 'obj.railing', size: 34 } });
        else if (r < .62) addLate({ x: mx, y: my, e: '📦', name: 'A stack of bales', kind: 'bin', solid: true,
                                use: 'fieldBales', furn: { sprite: 'obj.crate', size: 30 } });
        else if (r < .72) addLate({ x: mx, y: my, e: '🚜', name: 'A length of fencing', kind: 'barrier', solid: true,
                                use: 'fieldFence', furn: { sprite: 'obj.fence', size: 32 } });
        else if (r < .80) addLate({ x: mx, y: my, e: '🛢️', name: 'A row of blue barrels', kind: 'bin', solid: true,
                                use: 'farmDrums', furn: { sprite: 'obj.barrels', size: 32 } });
      }
    }

    /* ---- the farm ---------------------------------------------------------
       A yard, a farmhouse and two sheds round three sides of it, and the lane
       up to the road, so the farm is on the way to somewhere. */
    room('yard', farmBox[0], farmBox[1], farmBox[2], farmBox[3]);
    surf('track', farmBox[0], farmBox[1], farmBox[2], farmBox[3]);
    surf('slab', fx - 4, fyy + 7, fx + 26, fyy + 15);
    box(fx, fyy, fx + 9, fyy + 4);                       /* the big shed */
    box(fx + 14, fyy, fx + 23, fyy + 4);                 /* the other one */
    box(fx - 7, fyy + 2, fx - 3, fyy + 10);              /* the farmhouse, gable on */
    add({ x: fx + 4, y: fyy + 4, e: '🚪', name: 'The big shed', kind: 'exit', solid: false, use: 'farmShed' });
    add({ x: fx + 18, y: fyy + 4, e: '🚪', name: 'The other shed', kind: 'exit', solid: false, use: 'farmShed' });
    add({ x: fx - 5, y: fyy + 10, e: '🚪', name: 'The farmhouse door', kind: 'exit', solid: false, use: 'farmHouse' });
    add({ x: fx + 11, y: fyy + 9, e: '🚜', name: 'A tractor', kind: 'barrier', solid: true, use: 'tractor', furn: { size: 40 } });
    add({ x: fx + 20, y: fyy + 8, e: '🛢️', name: 'A stack of oil drums', kind: 'bin', solid: true,
          use: 'farmDrums', furn: { sprite: 'obj.barrels', size: 34 } });
    add({ x: fx + 24, y: fyy + 11, e: '🛞', name: 'A heap of old tyres', kind: 'bin', solid: true,
          use: 'farmTyres', furn: { sprite: 'obj.tyres', size: 28 } });
    add({ x: fx - 1, y: fyy + 12, e: '📦', name: 'A stack of bales', kind: 'bin', solid: true,
          use: 'fieldBales', furn: { sprite: 'obj.crate', size: 30 } });
    /* The lane, from the yard to the road. */
    const lane = fx + 11;
    room('yard', lane - 1, R.y + R.h, lane + 1, farmBox[1] - 1);
    surf('track', lane - 1, R.y + R.h, lane + 1, farmBox[1] - 1);
    add({ x: lane + 2, y: R.y + R.h + 1, e: '🪧', name: 'A sign at the top of the farm lane',
          kind: 'sign', solid: true, use: 'farmSign' });

    /* ---- what is in the corner of a field ---------------------------------
       Two copses and a pond, put where the walls are not. The bottom right of
       this map was four hundred yards of nothing until these went in, which is
       what happens when you lay a place out in rules and never look at the
       whole of it: the rules were all obeyed and there was still nothing
       there. A pond is `water` — the surface with `open` on it — so it is
       solid and you can see what it is, which is the only reason that flag
       exists. See SURFACES in data/world.js. */
    const onWall = (x, y) => wallRow.some(w => Math.abs(w - y) < 3) || wallCol.some(w => Math.abs(w - x) < 3);
    for (const [px, py, pr, sp] of [[292, 262, 11, 161], [74, 316, 9, 163]]) {
      room('field', px - pr - 2, py - pr - 2, px + pr + 2, py + pr + 2);
      /* On the lattice and then jittered off it, exactly as the wood is, and
         for one reason beyond the look of it: a tree is solid, and a tree on
         every tile of a circle is a circle of mass with the odd single tile of
         grass trapped inside it that nothing can ever reach. The gaps a jitter
         leaves are what makes a copse walkable. tools/levelcheck.mjs found
         seven of those pockets the first time this went in. */
      for (let y = py - pr; y <= py + pr; y += 2) for (let x = px - pr; x <= px + pr; x += 2) {
        const d = Math.hypot((x - px) / pr, (y - py) / pr);
        if (d > 1) continue;
        if (this.rnd(x, y, sp) > .78 - d * .5) continue;
        const jx = x + (this.hash(x, y, sp + 1) % 3) - 1;
        const jy = y + (this.hash(x, y, sp + 2) % 3) - 1;
        if (onWall(jx, jy) || !clearOfFarm(jx, jy)) continue;
        add({ x: jx, y: jy, e: '🌳', name: 'A tree in the copse', kind: 'tree', solid: true, use: 'woodTree' });
      }
    }
    {
      /* THE POND, in the corner of the field it is in, with the willows that
         are the only reason anybody ever finds it. */
      const px = 214, py = 322, rxp = 13, ryp = 8;
      for (let y = py - ryp; y <= py + ryp; y++) for (let x = px - rxp; x <= px + rxp; x++) {
        const d = Math.hypot((x - px) / rxp, (y - py) / ryp);
        const wob = 1 + Math.sin(Math.atan2(y - py, x - px) * 3) * .12;
        if (d > wob || onWall(x, y)) continue;
        surf('water', x, y, x, y); soak(x, y);
        /* AND THE WATER IS MASS. Everything out here is standing on one room
           the size of the map, so every tile of it has already been carved
           walkable — and a pond you can stroll across is not a pond. Putting
           it back into the solids is all it takes: `water` carries `open`, so
           World.open() tells the renderer to draw what is there rather than
           roof it, which is the whole of why that flag exists and is how the
           estuary at the bottom of the town works. */
        box(x, y, x, y);
      }
      for (const [tx, ty] of [[px - rxp - 2, py - 3], [px - rxp - 1, py + 4], [px + rxp + 2, py - 1], [px + 2, py - ryp - 2]])
        if (!onWall(tx, ty) && !onWall(tx - 2, ty) && !onWall(tx + 2, ty) && !onWall(tx, ty - 2) && !onWall(tx, ty + 2))
          add({ x: tx, y: ty, e: '🌳', name: 'A willow by the pond', kind: 'tree', solid: true, use: 'pondWillow' });
      add({ x: px - 2, y: py + ryp + 2, e: '🪧', name: 'A sign by the pond', kind: 'sign', solid: true, use: 'pondSign' });

      /* ---- THE BROOK, which is the reason the pond is where it is ----------
         In from the east edge and down to the water, two tiles wide and
         wandering, because water does. It is mass with `water` on it, exactly
         as the pond is, so you can see it and not cross it.

         EXCEPT AT THE FORDS. A brook laid straight across four fields cuts
         every one of them in half and strands whatever is on the far side —
         which is precisely the class of fault a derived level produces and an
         authored one cannot, and precisely what tools/levelcheck.mjs is for.
         There are three places it can be crossed, they are `track` rather than
         water, and they are where the walls already have their gates. */
      /* It comes in high at the east edge and falls to the pond, which is the
         one thing about a watercourse that is not decoration: water arrives
         somewhere. The centre line interpolates from one to the other and the
         two sines put the meander on top of it. */
      const EASTY = py - 52;
      const brookY = x => {
        const t = Math.max(0, Math.min(1, (x - px) / (W - 4 - px)));
        return Math.round(py + (EASTY - py) * t + Math.sin(x * .031) * 7 + Math.sin(x * .0115 + 1.1) * 11);
      };
      const fords = [W - 34, 330, 300, 270, 242];
      const wide = x => 3 + (x - px > 70 ? 0 : 1);      /* it widens as it falls */
      /* NO STAIRCASE. A brook two tiles wide laid one column at a time comes
         out as a ziggurat: the centre line drops most of a tile per column, so
         each column's span clears the last one and what you see from above is
         a flight of steps with water in it. So each column fills from the
         SHALLOWER of its own top and the previous column's to the DEEPER of
         the two bottoms — the spans overlap, the notches close, and it reads
         as a diagonal ribbon instead.

         TWO PASSES, and the order is the other half of it. Pass one lays a
         trodden bank one tile deep either side; pass two lays the water over
         the top of it and puts that back into the solids. Surfaces are ordered
         and the later one wins, so where a bank and the water land on the same
         tile the water takes it, and everywhere else there is a continuous
         walkable margin up both sides. */
      const cen = {};
      for (let x = px - 2; x <= W - 4; x++) cen[x] = brookY(x);
      const span = x => {
        const a = cen[x], b = cen[x + 1] === undefined ? a : cen[x + 1];
        return [Math.min(a, b), Math.max(a, b) + wide(x) - 1];
      };
      for (let x = W - 4; x > px - 2; x--) {
        const [t, b] = span(x);
        for (const y of [t - 1, b + 1])
          if (y >= 4 && y <= H - 5) surf('track', x, y, x, y);
      }
      for (let x = W - 4; x > px - 2; x--) {
        const [t, b] = span(x);
        const ford = fords.some(f => Math.abs(x - f) <= 2);
        for (let y = t; y <= b; y++) {
          if (y < 4 || y > H - 5) continue;
          if (ford) { surf('track', x, y, x, y); continue; }
          surf('water', x, y, x, y); box(x, y, x, y); soak(x, y);
        }
      }
      /* Willows follow a brook the way they follow every brook. */
      for (let x = px + 14; x < W - 6; x += 17) {
        const wy = brookY(x) - 3;
        /* CLEAR OF THE WALLS, and this is not fussiness. A willow is solid, and
           a solid thing dropped into the notch where a wall meets the bank
           seals a tile or two behind it — which levelcheck reports and nobody
           would ever have walked into. Two tiles of margin either side and the
           notch stays open. */
        if (this.rnd(x, 3, 167) >= .6) continue;
        if (onWall(x, wy) || onWall(x - 2, wy) || onWall(x + 2, wy)) continue;
        add({ x, y: wy, e: '🌳', name: 'A willow on the brook', kind: 'tree', solid: true, use: 'pondWillow' });
      }
    }

    /* ---- the back lane ----------------------------------------------------
       Along the bottom of the fields, west to east, with a second farmstead on
       it. The south third of this map was four hundred yards of nothing until
       this went in — every rule above was obeyed and there was still nothing
       there, which is the failure mode of building a place out of rules and
       never looking at the whole of it from above.

       It is `track` and it goes THROUGH the walls: a gap is punched wherever it
       crosses one, because a lane that stops at a wall is not a lane. */
    {
      const ly = H - 22;
      room('field', 4, ly - 1, W - 5, ly + 2);
      surf('track', 4, ly - 1, W - 5, ly + 2);
      /* And the hedge along the north side of it, which is what gives a lane
         its shape from the air, with the gateways left out. */
      for (let x = 8; x < W - 8; x++)
        if ((x + 5) % 31 > 3 && !damp(x, ly - 3)) box(x, ly - 3, x, ly - 3);
      for (let x = 14; x < W - 14; x += 23)
        if (this.rnd(x, ly, 171) < .45 && !damp(x, ly - 4))
          add({ x, y: ly - 4, e: '🌳', name: 'A tree in the hedgerow', kind: 'tree', solid: true, use: 'woodTree' });

      /* HOLLOWAY FARM: a house, a barn and a yard, on the lane rather than off
         it, which is the older of the two arrangements and is why this one is
         a farmhouse with a barn beside it and the other is a yard with sheds
         round it. */
      const hx = 96, hy = ly - 18;
      room('yard', hx - 6, hy - 3, hx + 30, ly - 1);
      surf('track', hx - 6, hy - 3, hx + 30, ly - 1);
      surf('slab', hx - 2, hy + 8, hx + 26, hy + 13);
      box(hx, hy, hx + 10, hy + 6);                      /* the house */
      box(hx + 15, hy + 1, hx + 28, hy + 6);             /* the barn */
      add({ x: hx + 5, y: hy + 6, e: '🚪', name: 'Holloway Farm', kind: 'exit', solid: false, use: 'farmHouse' });
      add({ x: hx + 21, y: hy + 6, e: '🚪', name: 'The barn', kind: 'exit', solid: false, use: 'farmShed' });
      add({ x: hx + 13, y: hy + 10, e: '🚜', name: 'A tractor', kind: 'barrier', solid: true, use: 'tractor', furn: { size: 40 } });
      add({ x: hx + 26, y: hy + 10, e: '📦', name: 'A stack of bales', kind: 'bin', solid: true,
            use: 'fieldBales', furn: { sprite: 'obj.crate', size: 30 } });
      add({ x: hx - 3, y: hy + 5, e: '🌳', name: 'A tree in the farmyard', kind: 'tree', solid: true, use: 'gardenTree' });
      add({ x: hx + 30, y: ly - 4, e: '🪧', name: 'The sign at the end of the lane', kind: 'sign', solid: true, use: 'farmSign' });
      /* The way up to Marley Road, past the west end of the fields. */
      room('field', 8, ly - 30, 11, ly - 1);
      surf('track', 8, ly - 30, 11, ly - 1);
    }

    /* The flush: everything that was scattered across a field before the water
       knew where it was going, minus whatever the water took. */
    for (const o of later) if (!damp(o.x, o.y)) add(o);

    /* ---- somebody out in it -----------------------------------------------
       Derived like everything else: one circuit per avenue, up one pavement,
       across at the end, back down the other. The one rule engine/peds.js
       cares about is that no leg of a route runs ALONG a carriageway — a
       pavement is fine and a lane is not — which is why every long leg here is
       on `avY + .6` or `avY + 9.4`, the middle of the paving either side, and
       the only legs on tarmac are the two that cross it. */
    const WHO = [
      ['Somebody walking a dog', 'pedEstateDog', 'sarah', 1.15],
      ['A postman', 'pedPostie', 'tomasz', 1.3],
      ['Somebody with two bags of shopping', 'pedShopping', 'marjorie', .85],
      ['A kid on the way to nowhere', 'pedKid', 'kevin', 1.4],
      ['Somebody who has stopped to talk', 'pedTalking', 'janet', .7],
      ['A man doing his steps', 'pedSteps', 'ron', 1.45]
    ];
    /* ONE CIRCUIT PER STREET, off the network. Roads.footfall() returns the
       four corners of the ring — up one footway, straight across at the end,
       back down the other — and it is the network's own walk() that says where
       a footway's middle is, so the route and the pavement cannot disagree
       about which tile is which. That was the fault waiting to happen in the
       version this replaces: the long legs were written as `avY + .6` and
       `avY + 9.4` by hand, correct for a ten-deep street and off the paving by
       a tile the moment a street was eight. */
    const peds = net.links
      .filter(l => l.cls === 'access' || l.cls === 'cul')
      .map((l, i) => {
        const w = WHO[i % WHO.length];
        const ring = Roads.footfall(net, l.id, 4 + (this.hash(l.at, i, 121) % 7));
        return { name: w[0], use: w[1], sprite: w[2], speed: w[3], leg: i % 4, along: 4 + (i % 7),
                 route: [ring[0], ring[1].concat(2 + (i % 4)), ring[2], ring[3].concat(3)] };
      });
    /* And two on Marley Road, which is the one street here with a pavement on
       both sides of it all the way across the map. */
    peds.push({ name: 'Somebody waiting for the 41', use: 'pedBusStop', sprite: 'bev', speed: .9, leg: 0, along: 10,
                route: [[Math.floor(W * .46) - 8.5, R.y + .6], [Math.floor(W * .46) + .5, R.y + .6, 22],
                        [Math.floor(W * .46) + 9.5, R.y + .6, 4]] });
    peds.push({ name: 'A woman in walking boots', use: 'pedWalker', sprite: 'fiona', speed: 1.2, leg: 0, along: 6,
                route: [[tk + .5, R.y - 1.5], [tk + .5, Math.floor(cy) + .5, 5],
                        [tk + .5, wy1 + .5, 3], [tk + .5, R.y - 1.5]] });

    /* ---- THE TRAFFIC ------------------------------------------------------
       THERE WAS NONE, and that is the plainest measure of what was wrong with
       the old layout: a route has to be tarmac all the way round (see
       `car.tarmac` in engine/cars.js) and there was no circuit of tarmac on
       this level to put one on. Seven parallel stripes with no junctions
       cannot be driven round; a loop can.

       Roads.circuit() takes the legs in the order they are driven and puts
       every point on the LEFT-HAND LANE of its own leg, so a car that follows
       it keeps left all the way round and takes each corner where a car that
       keeps left actually takes it. Get that by hand and you get it wrong at
       one junction in four, for ever. */
    const drive = (legs, o) => cars.push(Object.assign({
      x: 0, y: 0, face: 's', use: 'passingCar', traffic: true,
      route: Roads.circuit(net, legs)
    }, o));
    /* Round the loop, anticlockwise: up Hazel Way, along Beech Way, down Rowan
       Drive and back west along Marley Road. `leg` and `along` put each one
       somewhere different on its own circuit, or all four pull away from the
       same corner in convoy. */
    drive([{ id: 'hazel', dir: -1 }, { id: 'beechway', dir: 1 },
           { id: 'rowan', dir: 1 }, { id: 'marley', dir: -1 }],
          { model: 'hatch', name: 'A car, passing', cruise: 150, leg: 0, along: 30 });
    /* And two that actually use an avenue, so the streets with the houses on
       them have something going down them — one each way round, or the estate
       is a one-way procession. */
    drive([{ id: 'marley', dir: 1 }, { id: 'rowan', dir: -1 },
           { id: 'elmtree', dir: -1 }, { id: 'hazel', dir: 1 }],
          { model: 'small', name: 'A car, passing', cruise: 120, leg: 1, along: 40 });
    drive([{ id: 'marley', dir: -1 }, { id: 'hazel', dir: -1 },
           { id: 'lindens', dir: 1 }, { id: 'rowan', dir: 1 }],
          { model: 'estate', name: 'Somebody looking for a number', cruise: 105, leg: 2, along: 25 });
    /* THE 41A, and it is a bus with no `stops:` on purpose. A `stops:` list
       would pull it up at the bus stop on Marley Road — and the 41A not
       stopping at that stop is a thing this game has said in three places
       since before there was a road here for it to not stop on. See CARS.bus
       in data/world.js and Acts.theBus. */
    drive([{ id: 'marley', dir: 1 }, { id: 'rowan', dir: -1 },
           { id: 'beechway', dir: -1 }, { id: 'hazel', dir: 1 }],
          { model: 'bus', name: 'The 41A', use: 'theBus', cruise: 120, leg: 0, along: 90 });

    const MASS = solids.slice();
    return {
      name: 'Marley Road and Prior’s Wood',
      /* A PART, like the town beside it: this is the country east of Bellhaven
         and it is built into the island rather than stood on. Nothing else
         about it changed — see data/island.js. */
      part: true,
      w: W, h: H,
      indoors: false,
      /* THE NETWORK TRAVELS WITH THE LEVEL, so that something other than this
         file can ask whether it is one. tools/levelcheck.mjs runs
         Roads.faults() over it on every run — that is where the rules in
         data/roads.js stop being a comment, and it is the check that would
         have caught seven avenues joined to nothing on the day they were
         written rather than a year later. Local coordinates, like everything
         else a part declares; the host translates the rooms, the surfaces and
         the markings on the way in and has no use for this. */
      net,
      rooms, surfaces, paint, cars, peds,
      /* Out here the estate is post-war and the farm is not. Two palettes, and
         the line between them is the road, which is what a map like this
         actually looks like: an estate built all at once in one decade is
         roofed in one thing, and the fields behind it were roofed whenever the
         roof last went. */
      /* NO FELT AND NO LEAD out here, and that is the difference between a
         town and an estate rather than a preference. Both of those are flat
         roofs — felt is a bitumen deck seen from above, lead is a valley
         gutter — and they belong on the backs of the shops on the High Street,
         which is where the default bag puts them. Every house here has a
         pitched roof, because every house anywhere has a pitched roof, and a
         felted semi read from the air as a house with solar panels on it. */
      roofs: [
        { m: ['slate', 'slate', 'slate', 'slate', 'pantile', 'oxblood'], r: [0, 0, W - 1, R.y - 1] },
        { m: ['pantile', 'pantile', 'oxblood', 'slate'], r: [0, R.y, W - 1, H - 1] }
      ],
      counters: [],
      entries: {
        /* On the road you arrive on, in the westbound lane's own pavement. */
        road: [4.5, R.y + R.h - 1.5],
        estate: [EX1 + 2.5, R.y - 1.5],
        farm: [lane + .5, R.y + R.h + 2.5]
      },
      links: [{ via: 'townRoad', to: 'outside', entry: 'corvenEast' }],
      furnish() {
        /* THE BUILDINGS, and they are the one thing here that is not a room.
           A room carves walkable floor out of a map that starts solid; a house
           is the opposite — mass standing in the middle of a garden — and there
           is no such thing as an un-room. So the land is carved first and the
           mass is put back here, which is the only place with the map in front
           of it. Nothing else in the engine needs to know: World.isSolid() is
           the same question, the wall band draws the same faces, and the roof
           pass floods the same mass. */
        for (const [x1, y1, x2, y2] of MASS)
          for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++)
            if (x >= 0 && y >= 0 && x < W && y < H) this.solid[y][x] = 1;
        objects.forEach(o => this.add(Object.assign({}, o)));
      }
    };
  }
};

LEVELS.outskirts = Outskirts.make();
LEVELS.outskirts.id = 'outskirts';
