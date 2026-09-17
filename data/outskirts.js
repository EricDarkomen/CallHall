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
 *   MARLEY ROAD, the continuation, straight across the middle. Two lanes, a
 *   pavement either side, and the only thing here anybody would call a road.
 *
 *   THE ESTATE, north-west of it: seven avenues of semi-detached pairs, each
 *   with a pavement, a front garden, a drive, a back garden and a shed. Every
 *   house faces SOUTH onto its own street, and that is not decoration — the
 *   wall band only draws the tall face of a wall with floor below it, so a
 *   building whose street is to the north is a building seen from the back.
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
 * builds in about twenty-five milliseconds; the arithmetic below does not care
 * what the number is.
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

     A STREET is ten deep everywhere in this level — two of pavement, six of
     carriageway, two of pavement — so that Marley Road and the avenues off it
     are the same kind of thing and a kerb is drawn the same way along both. */
  get ROAD() { return { y: Math.floor(this.H / 2) - 5, h: 10 }; },   /* Marley Road */
  STREET: 10,        /* 2 pavement + 6 carriageway + 2 pavement */
  FRONT: 3,          /* front garden: a path, a bin and a shrub */
  /* SEVEN DEEP, and the number is a roof rather than a room. The wall band
     draws the bottom two rows of any mass as its tall south face, and the roof
     pass puts a mitred coping round the edge of what is left — so a house five
     deep had three rows of roof, all three of them edge, and read as a grey
     tray with one stripe of slate in it. Seven gives five, and five gives
     three of field between the copings, which is a roof. */
  HOUSE_H: 7,
  BACK: 6,           /* back garden, with a shed at the bottom of it */
  PAIR_W: 14,        /* a semi-detached pair; two sevens sharing a wall */
  PITCH: 18,         /* the pair plus the drive and the side passage beside it */

  /* The streets of the estate, in the order you meet them walking north. Each
     is a zone of its own — see ZONES — so crossing into one announces it. */
  AVENUES: ['ashfield', 'elmtree', 'sycamore', 'hazel', 'lindens', 'beechway', 'rowan'],

  make() {
    const W = this.W, H = this.H, R = this.ROAD;
    const rooms = [], surfaces = [], paint = [];
    const solids = [], objects = [], cars = [];
    const room = (z, x1, y1, x2, y2) => rooms.push({ z, r: [x1, y1, x2, y2] });
    const surf = (s, x1, y1, x2, y2) => surfaces.push({ s, r: [x1, y1, x2, y2] });
    const add = o => objects.push(o);
    const box = (x1, y1, x2, y2) => solids.push([x1, y1, x2, y2]);

    /* A STREET, laid the same way every time: the room, the paving, the
       carriageway over the middle of it and a centre line down that. `z` is
       the zone, which out here is the street's own name. */
    const street = (z, x1, y1, x2) => {
      const y2 = y1 + this.STREET - 1;
      room(z, x1, y1, x2, y2);
      surf('slab', x1, y1, x2, y2);
      surf('tarmac', x1, y1 + 2, x2, y2 - 2);
      paint.push({ p: 'dash', a: [x1, y1 + this.STREET / 2], b: [x2 + 1, y1 + this.STREET / 2] });
      return y2;
    };

    /* ---- the land ---------------------------------------------------------
       Open country first, and everything else laid over it. A two-tile hem of
       mass round the outside is the rest of the world: the renderer roofs it,
       which is what you are looking at when you look past the last field. */
    room('field', 2, 2, W - 3, H - 3);
    surf('grass', 2, 2, W - 3, H - 3);

    /* ---- Marley Road ------------------------------------------------------
       Straight through, kerb to kerb. */
    street('marley', 0, R.y, W - 1);
    add({ x: 2, y: R.y + 1, e: '🛣️', name: 'The road back into town',
          kind: 'sign', solid: false, use: 'backToTown', via: 'townRoad' });
    add({ x: Math.floor(W * .46), y: R.y - 1, e: '🚏', name: 'The bus stop on Marley Road',
          kind: 'sign', solid: true, use: 'marleyStop' });
    add({ x: Math.floor(W * .46) + 2, y: R.y - 1, e: '📮', name: 'A postbox',
          kind: 'bin', solid: true, use: 'marleyPost', furn: { sprite: 'obj.postbox', size: 24 } });

    /* ---- the estate -------------------------------------------------------
       Bands northward from the road. Each band is a row of pairs, its front
       gardens, its back gardens and the street the NEXT row up will face, and
       every one of them belongs to the street it fronts — which is the whole
       of what an address is.

       `pave` is the row of paving the houses in this band look at. Band 0 looks
       at Marley Road's own north pavement, which is why the estate starts on
       the main road rather than one street back from it. */
    const EX1 = 18, EX2 = EX1 + Math.floor((W * .49 - EX1) / this.PITCH) * this.PITCH;
    let pave = R.y, avenues = 0, topPave = R.y;
    const avStreets = [];
    for (let band = 0; band < this.AVENUES.length + 1; band++) {
      const hy2 = pave - this.FRONT - 1;             /* the front wall */
      const hy1 = hy2 - this.HOUSE_H + 1;
      const back = hy1 - this.BACK;                  /* the far end of the garden */
      if (back < 12) break;
      /* The zone of this band is the street it fronts: Marley Road for the
         first row, and thereafter the avenue laid by the band before it. */
      const z = band === 0 ? 'marley' : this.AVENUES[band - 1];
      room(z, EX1 - 8, back, EX2 + 8, pave - 1);

      /* THE ROW JOGS, and this is the single biggest thing standing between an
         estate and a spreadsheet. Laid from the same EX1 every band, seven
         rows of pairs line up column for column all the way up the map, which
         no estate on earth does — the roads were set out first and the plots
         were fitted into what was left, so every row starts somewhere slightly
         different and runs out somewhere slightly different too. One hash per
         band buys the whole of that. */
      const jog = this.hash(band, 7, 131) % this.PITCH;
      const pitch = this.PITCH + (this.hash(band, 9, 133) % 3);
      for (let x = EX1 + jog; x + this.PAIR_W <= EX2; x += pitch) {
        /* A hash decides which pairs are there at all, so a run of houses has
           a gap in it where somebody never built — and that gap is what makes
           the terrace either side of it read as a terrace. */
        if (this.rnd(x, hy1, 11) < .08) continue;
        box(x, hy1, x + this.PAIR_W - 1, hy2);

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
           between two semis is for. */
        const dv = x + this.PAIR_W;
        if (dv + 2 < EX2 && dv + 2 < x + pitch) {
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
         is drawn the same way. */
      for (let x = EX1 - 8; x <= EX2 + 8; x++)
        if ((x - EX1 + 400) % 9 > 1) box(x, back, x, back);

      /* The street that serves the NEXT row up — and only if there IS a next
         row up. An avenue with houses down one side and the edge of the world
         down the other is not a street, it is a mistake you can walk to. */
      const avY = back - this.STREET;
      const nextBack = avY - this.FRONT - this.HOUSE_H - this.BACK;
      if (avY < 10 || nextBack < 12 || avenues >= this.AVENUES.length) break;
      street(this.AVENUES[avenues], EX1 - 8, avY, EX2 + 8);
      avStreets.push(avY);
      for (let x = EX1; x < EX2; x += 20)
        add({ x, y: avY + 1, e: '💡', name: 'A street light', kind: 'lamp', solid: true, use: 'streetLamp' });
      avenues++;
      pave = avY;              /* the next row faces this street from the north */
      topPave = avY;
    }

    /* ---- what else is on an estate ----------------------------------------
       A row of lock-up garages and a patch of green. Neither is decoration:
       the garages are a long run of shallow mass, which the roof pass cuts
       into eight units under one unbroken roof and is the clearest example in
       the game of a terrace that is not a terrace of houses; and the green is
       the thing an estate has instead of a square — the bit nobody built on,
       with a tree on it and the goalposts long gone. */
    if (avenues >= 2) {
      const gy = Math.round((R.y + topPave) / 2 / 1) - 3;
      const gx = EX2 + 4;
      box(gx, gy, gx + 23, gy + 4);
      for (let i = 0; i < 8; i++)
        add({ x: gx + 1 + i * 3, y: gy + 4, e: '🚪', name: 'A lock-up garage',
              kind: 'exit', solid: false, use: 'lockUp' });
      room('marley', gx - 3, gy - 2, gx + 26, gy + 9);
      surf('slab', gx - 3, gy + 5, gx + 26, gy + 9);
    }
    {
      /* The green, in the gap the pairs leave at the west end of the estate. */
      const px = 4, py = R.y - this.FRONT - this.HOUSE_H - this.BACK - 2;
      room('marley', px, py, EX1 - 2, R.y - 1);
      for (let i = 0; i < 7; i++) {
        const tx = px + 2 + (this.hash(i, 7, 111) % (EX1 - px - 5));
        const ty = py + 1 + (this.hash(i, 9, 113) % (R.y - py - 3));
        add({ x: tx, y: ty, e: '🌳', name: 'A tree on the green', kind: 'tree', solid: true, use: 'gardenTree' });
      }
      add({ x: px + 4, y: R.y - 3, e: '🪑', name: 'A bench on the green', kind: 'bench', solid: true, use: 'greenBench' });
      add({ x: px + 8, y: R.y - 3, e: '🗑️', name: 'A litter bin', kind: 'bin', solid: true, use: 'greenBin' });
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
      add({ x: jx, y: jy, e: '🌳', name: "A tree in Prior's Wood", kind: 'tree', solid: true, use: 'woodTree' });
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
          add({ x, y: y - 1, e: '🌳', name: 'A tree in the hedgerow', kind: 'tree', solid: true, use: 'woodTree' });
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
        if (r < .26) add({ x: mx, y: my, e: '🌳', name: 'A lone oak', kind: 'tree', solid: true, use: 'woodTree' });
        else if (r < .44) add({ x: mx, y: my, e: '🚧', name: 'A run of hurdles', kind: 'barrier', solid: true,
                                use: 'fieldHurdles', furn: { sprite: 'obj.railing', size: 34 } });
        else if (r < .62) add({ x: mx, y: my, e: '📦', name: 'A stack of bales', kind: 'bin', solid: true,
                                use: 'fieldBales', furn: { sprite: 'obj.crate', size: 30 } });
        else if (r < .72) add({ x: mx, y: my, e: '🚜', name: 'A length of fencing', kind: 'barrier', solid: true,
                                use: 'fieldFence', furn: { sprite: 'obj.fence', size: 32 } });
        else if (r < .80) add({ x: mx, y: my, e: '🛢️', name: 'A row of blue barrels', kind: 'bin', solid: true,
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
        surf('water', x, y, x, y);
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
        if (!onWall(tx, ty)) add({ x: tx, y: ty, e: '🌳', name: 'A willow by the pond', kind: 'tree', solid: true, use: 'pondWillow' });
      add({ x: px - 2, y: py + ryp + 2, e: '🪧', name: 'A sign by the pond', kind: 'sign', solid: true, use: 'pondSign' });
    }

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
    const peds = avStreets.map((avY, i) => {
      const w = WHO[i % WHO.length];
      const x1 = EX1 - 2 + (this.hash(avY, i, 121) % 8);
      const x2 = EX2 - 4 - (this.hash(avY, i, 123) % 8);
      return { name: w[0], use: w[1], sprite: w[2], speed: w[3], leg: i % 4, along: 4 + (i % 7),
               route: [[x1 + .5, avY + .6], [x2 + .5, avY + .6, 2 + (i % 4)],
                       [x2 + .5, avY + 9.4], [x1 + .5, avY + 9.4, 3]] };
    });
    /* And two on Marley Road, which is the one street here with a pavement on
       both sides of it all the way across the map. */
    peds.push({ name: 'Somebody waiting for the 41', use: 'pedBusStop', sprite: 'bev', speed: .9, leg: 0, along: 10,
                route: [[Math.floor(W * .46) - 8.5, R.y + .6], [Math.floor(W * .46) + .5, R.y + .6, 22],
                        [Math.floor(W * .46) + 9.5, R.y + .6, 4]] });
    peds.push({ name: 'A woman in walking boots', use: 'pedWalker', sprite: 'fiona', speed: 1.2, leg: 0, along: 6,
                route: [[tk + .5, R.y - 1.5], [tk + .5, Math.floor(cy) + .5, 5],
                        [tk + .5, wy1 + .5, 3], [tk + .5, R.y - 1.5]] });

    const MASS = solids.slice();
    return {
      name: "Marley Road and Prior's Wood",
      w: W, h: H,
      indoors: false,
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
