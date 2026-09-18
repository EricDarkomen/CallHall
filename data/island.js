'use strict';
/* CALLHALL — THE ISLAND, which is the town and the country round it as ONE MAP.
 *
 * They were two levels with a signpost between them: `outside`, the town,
 * hand-drawn tile by tile, and `outskirts`, eleven times the size of it and
 * derived from eight hundred lines of rules. Driving east out of Bellhaven
 * meant pressing E at a signpost, reading two paragraphs and being put down on
 * a different map — which is the correct way to go through a door and the wrong
 * way to go along a road. A road that leaves ought to arrive, and now it does:
 * Corven Way runs east out of the town, becomes Marley Road at the parish
 * boundary, and carries on past the estate to the fields without the screen
 * ever fading.
 *
 * WHAT IS NEW HERE IS NOT THE PLACES. The town is the same town, the estate is
 * the same estate, and neither of them was rewritten to be here — engine
 * world.js grew `parts:`, which stamps a level into another at an offset and
 * translates everything it declares on the way past. This file is the two
 * offsets, the piece of road between them, and a coast.
 *
 * AND IT IS AN ISLAND, which is the other half. A map with an edge is a map
 * that has to say what is past the edge, and the answer until now was "roofs",
 * because that is what the renderer draws over mass it cannot see the sides of.
 * Past the edge of this one is the sea. The land is the two built places plus
 * however much ground the coast rule gives them; everything beyond it is water,
 * and the line between the two is sand where the shore shelves and rock where
 * it does not.
 *
 * NOTHING ABOUT THE COAST IS DRAWN BY HAND EITHER. It is the outskirts' own
 * method one scale up: a hash of the coordinate for the variation, three
 * cosines of the bearing for the shape, and a rule for what happens at the
 * edge. Nobody placed a beach. What the rule is told is where the built land
 * is, how far the ground runs past it, and that the estuary at the bottom of
 * the town is the sea and has to be let in — which is the whole of why
 * Bellhaven has a harbour rather than a pond.
 */
const Island = {
  /* The map. Five hundred and ninety-six by four hundred and sixty-eight is
     303,552 tiles — twice the outskirts on its own, and a shade over three
     tenths of a square kilometre at a tile to the metre. See the note in the README
     about what a map this size costs: four bytes a tile, and a build that
     happens once and is kept. */
  W: 612, H: 496,

  /* WHERE THE TWO PLACES SIT, and the second number of each is the only one
     that is not free. The town's Corven Way is its rows 52 to 57; the
     outskirts' Marley Road is its rows 189 to 194; the two are the same road,
     so 193 + 52 and 56 + 189 have to be the same row, and they are — 245. Get
     this wrong and the road out of town arrives at somebody's front garden. */
  TOWN: [52, 193],
  OUT: [176, 56],
  TW: 114, TH: 120,      /* the town's own size, which the join is measured in */
  OW: 384, OH: 384,

  /* The ten tiles between them, which is the parish boundary and the only
     piece of road in this game that belongs to neither place. */
  get JOIN() { return { x1: this.TOWN[0] + this.TW, x2: this.OUT[0] - 1, y: this.TOWN[1] + 50 }; },

  /* ---- the coast ----------------------------------------------------------
     PAD is how far the ground runs past the last thing built on it, SWELL is
     how much that varies with the bearing, and BEACH is how much of what is
     left is shore rather than field. The three of them are the island's whole
     shape. */
  PAD: 30, SWELL: 16, BEACH: 8,
  /* And the most a coast may run past the built land, whatever the rule above
     works out: the map has to have sea in it at the edge, all the way round, or
     the island is a rectangle again. */
  MAXPAD: 44,

  hash(a, b, salt) {
    let h = 2166136261 ^ (salt || 0);
    h = Math.imul(h ^ a, 16777619); h = Math.imul(h ^ b, 16777619);
    h ^= h >>> 13; h = Math.imul(h, 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  },
  rnd(a, b, salt) { return this.hash(a, b, salt) / 4294967296; },

  /* The core: the two built places, and how far a tile is from the nearer of
     them. The outskirts is INSET BY TWO because its outermost two tiles are
     the hem of mass it drew round itself when it was the whole map — the rest
     of the world, as seen from the last field. It is not the rest of the world
     any more; it is the field before the dunes, so the coast pass is allowed
     to open it. */
  HEM: 2,
  boxes() {
    const [tx, ty] = this.TOWN, [ox, oy] = this.OUT, m = this.HEM;
    return [
      [tx, ty, tx + this.TW - 1, ty + this.TH - 1],
      [ox + m, oy + m, ox + this.OW - 1 - m, oy + this.OH - 1 - m]
    ];
  },
  /* Distance from a tile to the nearest built ground, in tiles. Zero inside. */
  reach(x, y) {
    let best = Infinity;
    for (const [x1, y1, x2, y2] of this.boxes()) {
      const dx = x < x1 ? x1 - x : x > x2 ? x - x2 : 0;
      const dy = y < y1 ? y1 - y : y > y2 ? y - y2 : 0;
      const d = dx && dy ? Math.hypot(dx, dy) : dx + dy;
      if (d < best) best = d;
    }
    return best;
  },

  /* HOW FAR THE LAND RUNS, at this tile. Three cosines of the bearing from the
     middle of the island, which is the outskirts' trick for giving a wood a
     ragged edge, used here on something forty times bigger: one term for the
     shape of the island, one for its headlands, one for the coves in them.
     Then a jitter at eight-tile scale, so no stretch of coast is a curve
     somebody could have drawn with a compass. */
  /* ONE SAMPLE EVERY FOUR TILES, AND A MIX IN BETWEEN. What is below is six
     trigonometric terms, and asking for them once per tile is asking for them
     one and three quarter million times — sixty of the ninety milliseconds this
     level used to take to build, for a curve that cannot bend faster than about
     forty tiles. So the smooth half is worked out on a lattice every STEP tiles
     and read off it bilinearly, which is four thousand samples instead of three
     hundred thousand and agrees with the exact answer to well under a tile. The
     jitter is not on the lattice and could not be: a jitter you interpolate is
     a wave. */
  STEP: 4,
  lattice() {
    if (this._grid) return this._grid;
    const S = this.STEP, gw = Math.ceil(this.W / S) + 2, gh = Math.ceil(this.H / S) + 2;
    const g = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) g[j * gw + i] = this.swellAt(i * S, j * S);
    this._grid = { g, gw, gh, S };
    return this._grid;
  },
  smooth(x, y) {
    const { g, gw, S } = this.lattice();
    const fx = x / S, fy = y / S, i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j;
    const a = g[j * gw + i], b = g[j * gw + i + 1], c = g[(j + 1) * gw + i], d = g[(j + 1) * gw + i + 1];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  },
  swellAt(x, y) {
    const cx = this.W / 2, cy = this.H / 2;
    const b = Math.atan2(y - cy, x - cx);
    const swell = (Math.cos(b * 1.7 + .9) + Math.cos(b * 2.9 - 2.1) + Math.cos(b * 4.1 + .3)) / 3;
    return this.PAD + this.SWELL * swell
      + 10 * Math.sin(x / 47 + 1.1) + 8 * Math.sin(y / 39 - .6) + 6 * Math.sin((x + y) / 29);
  },
  padAt(x, y) {
    let pad = this.smooth(x, y) + (this.rnd(x >> 3, y >> 3, 7) - .5) * 7;
    pad = Math.max(5, Math.min(this.MAXPAD, pad));
    /* THE HARBOUR, and it is the one place the rule is overruled. The bottom
       six rows of the town are an estuary with a quay along it, drawn when the
       water had to stop somewhere because the map did. The water it stops in is
       this water. So the land south of the town gives up almost at once and the
       tide comes to the wall, which is why Bellhaven is a port. */
    const [tx, ty] = this.TOWN;
    if (y > ty + this.TH - 1 && x > tx + 8 && x < tx + this.TW + 10)
      pad = Math.min(pad, 2 + this.rnd(x >> 2, 0, 19) * 3);
    /* And the river that runs down the west side of the town goes the same
       way: it is the same water, and it has to reach it. */
    if (x < tx && y > ty + 86 && y < ty + this.TH + 14)
      pad = Math.min(pad, 3 + this.rnd(0, y >> 2, 23) * 4);
    return pad;
  },

  /* Sand or rock, at this stretch of coast. Patches of about twenty tiles, so
     a beach is a beach for as long as a beach is, with the west and the north
     of the island biased towards rock: the weather comes from there, and a
     coast that takes the weather is a coast with no sand left on it. */
  rocky(x, y) {
    const cx = this.W / 2, cy = this.H / 2;
    const b = Math.atan2(y - cy, x - cx);
    const bias = (Math.cos(b + .6) + 1) / 2;          /* 1 to the west-north-west */
    return this.rnd(Math.floor(x / 23), Math.floor(y / 23), 31) * .78 + bias * .36 > .66;
  },

  make() {
    const W = this.W, H = this.H;
    const [tx, ty] = this.TOWN, [ox, oy] = this.OUT;
    const rooms = [], surfaces = [], paint = [], objects = [];
    const room = (z, x1, y1, x2, y2) => rooms.push({ z, r: [x1, y1, x2, y2] });
    const surf = (s, x1, y1, x2, y2) => surfaces.push({ s, r: [x1, y1, x2, y2] });
    const add = o => objects.push(o);

    /* ---- the road between the two ---------------------------------------
       Ten tiles of carriageway laid exactly as both ends of it are laid — two
       of pavement, six of tarmac, two of pavement — so that the kerb R.kerbs()
       derives runs through unbroken and there is no seam to see. */
    const J = this.JOIN;
    room('marley', J.x1, J.y, J.x2, J.y + 9);
    surf('slab', J.x1, J.y, J.x2, J.y + 9);
    surf('tarmac', J.x1, J.y + 2, J.x2, J.y + 7);
    paint.push({ p: 'dash', a: [J.x1, J.y + 5], b: [J.x2 + 1, J.y + 5] });
    /* The sign that used to be a door. It said MARLEY ROAD and a mileage
       somebody had shot at, and pressing E on it put you on another map; it
       says the same thing now and the road goes there instead. */
    add({ x: J.x1 + 4, y: J.y + 1, e: '🪧', name: 'The parish boundary', kind: 'sign',
          solid: true, use: 'parishSign' });

    /* ---- the two dead ends ----------------------------------------------
       Bellhaven Road and Fenn Street run off the east side of the town as well,
       and they always did — the town was drawn with roads that leave, which is
       what made joining it to anything possible at all. Neither of them is
       going anywhere: they end in a turning head, which is what about a third
       of the streets on any estate do and what both of these have to do now
       that there is somewhere on the other side to see them not reach. */
    [14, 32].forEach((row, i) => {
      const y = ty + row, x1 = tx + this.TW, x2 = x1 + 5;
      room('street', x1, y, x2 + 4, y + 9);
      surf('slab', x1, y, x2 + 4, y + 9);
      surf('tarmac', x1, y + 2, x2, y + 7);
      /* The head itself: a square of tarmac wider than the road, which is the
         whole of what a turning head is. */
      surf('tarmac', x2, y, x2 + 4, y + 9);
      paint.push({ p: 'dash', a: [x1, y + 5], b: [x2, y + 5] });
      add({ x: x2 + 2, y: y + (i ? 8 : 1), e: '🪧', name: 'The end of the road', kind: 'sign',
            solid: true, use: 'deadEnd' });
    });

    /* ---- the seafront ---------------------------------------------------
       The three roads that run off the WEST side of the town have the same
       problem and a better answer, because there is something over there: the
       sea. One road down the shore joins all three of them and ends in a car
       park above the beach, which is what the end of a road at the seaside is
       for. */
    const SF = tx - 16;                       /* the seafront, north to south */
    room('seafront', SF, ty + 8, SF + 9, ty + 66);
    surf('slab', SF, ty + 8, SF + 9, ty + 66);
    surf('tarmac', SF + 2, ty + 8, SF + 7, ty + 66);
    paint.push({ p: 'dash', a: [SF + 5, ty + 8], b: [SF + 5, ty + 66] });
    /* And the three stubs of the town's own roads, carried west to meet it. */
    [14, 32, 50].forEach(row => {
      const y = ty + row;
      room('seafront', SF + 8, y, tx - 1, y + 9);
      surf('slab', SF + 8, y, tx - 1, y + 9);
      surf('tarmac', SF + 8, y + 2, tx - 1, y + 7);
      paint.push({ p: 'dash', a: [SF + 8, y + 5], b: [tx, y + 5] });
    });
    /* The car park, at the south end of it, above the sand. */
    room('seafront', SF - 6, ty + 58, SF + 9, ty + 66);
    surf('tarmac', SF - 6, ty + 58, SF + 9, ty + 66);
    paint.push({ p: 'bays', r: [SF - 5, ty + 60, SF + 8, ty + 62], open: 's' });
    add({ x: SF - 4, y: ty + 59, e: '🅿️', name: 'The pay and display', kind: 'sign',
          solid: true, use: 'payDisplay' });
    add({ x: SF + 7, y: ty + 59, e: '🗑️', name: 'A bin the gulls have been at', kind: 'bin',
          solid: false, use: 'shoreBin', furn: { sprite: 'obj.wheeliebin', size: 26 } });
    add({ x: SF - 2, y: ty + 64, e: '🍦', name: 'The ice cream van', kind: 'sign',
          solid: true, use: 'iceCream' });
    add({ x: SF + 4, y: ty + 67, e: '🔭', name: 'The telescope on the front', kind: 'sign',
          solid: true, use: 'telescope' });
    add({ x: SF - 5, y: ty + 65, e: '🪑', name: 'A bench facing the sea', kind: 'bench',
          solid: true, use: 'shoreBench' });

    return {
      name: 'Bellhaven',
      w: W, h: H,
      indoors: false,
      /* THE TWO PLACES, and the offsets are the whole of what this line does.
         Everything either of them declares — its rooms, its markings, its
         traffic, its lights, the twenty-two doors along its parades and the
         arrival point behind each one — is translated by engine/world.js on the
         way in. Neither knows. */
      parts: [
        { of: 'town', at: this.TOWN },
        /* THE HEM, and it is the one thing a part is allowed to say about being
           part of something. The outskirts drew two tiles of solid mass round
           itself — the rest of the world, as seen from the last field, which is
           what the renderer roofs when it has nothing else to draw past the
           edge of a map. It is not the rest of the world any more; it is the
           field before the dunes. `hem: 2` is the part saying that its outer
           two tiles are the host's to take back, and it is read by the coast
           rule below and by tools/fidelity.mjs, which otherwise reports three
           thousand tiles of difference that are the point. */
        { of: 'outskirts', at: this.OUT, hem: 2 }
      ],
      rooms, surfaces, paint,
      /* The roof mix out here is the town's own, because the only roofs beyond
         the two parts are the beach huts. Each part brings its own. */
      entries: {
        /* Where a shift that starts out of doors starts, and where the ferry
           would put you down if there were one. The front door of the office
           is the town's own `doors`, which comes with it. */
        shore: [SF + 4.5, ty + 62.5]
      },
      links: [],
      furnish() {
        /* The coast first, because everything below it is standing on the
           coast: the scatter looks for ground that this pass has just made,
           and the seafront's own furniture is on tiles it carved. */
        Island.coast(this);
        Island.scatter(this);
        objects.forEach(o => this.add(Object.assign({}, o)));
      }
    };
  },

  /* ---- THE COAST, ONE TILE AT A TIME --------------------------------------
     The only pass in this game that looks at every tile of the map, and it is
     here rather than in a table because a coastline is a rule and not a list of
     rectangles. What it may touch is everything the two parts and the roads
     above have not already claimed: a tile inside either part is theirs, and a
     tile with a zone on it is somebody's room. Everything else is the edge of
     the island, and this decides which of the four things it is.

     Sea and rock are SOLID and OPEN — ground you can see and cannot stand on,
     which is the flag the river was given when the town got one, and the reason
     neither of them comes out roofed like a building. */
  coast(world) {
    const [tx, ty] = this.TOWN, [ox, oy] = this.OUT;
    const zHeath = world.zid('heath'), zShore = world.zid('shore');
    const sSea = world.sid('sea'), sSand = world.sid('sand'), sRock = world.sid('rock'), sGrass = world.sid('grass');
    for (let y = 0; y < this.H; y++) {
      const solid = world.solid[y], zone = world.zone[y], surf = world.surf[y];
      for (let x = 0; x < this.W; x++) {
        if (x >= tx && x < tx + this.TW && y >= ty && y < ty + this.TH) continue;
        if (x >= ox + this.HEM && x < ox + this.OW - this.HEM && y >= oy + this.HEM && y < oy + this.OH - this.HEM) continue;
        if (zone[x]) continue;
        const d = this.reach(x, y);
        /* OPEN SEA IS MOST OF WHAT IS LEFT, and none of it needs the rule: no
           coast can run further from the land than MAXPAD, so anything past
           that is water without asking. Two thirds of the tiles this pass
           reaches take this line and nothing else. */
        if (d > this.MAXPAD + 4) { surf[x] = sSea; continue; }
        const pad = this.padAt(x, y);
        if (d > pad) { surf[x] = sSea; continue; }               /* the sea, and it is solid */
        if (d > pad - this.BEACH) {
          /* THE SHORE. Rock is the edge of the land standing up out of the
             water; sand is the edge of it lying down in the water, and the
             difference on a map with no height in it is whether you can walk
             on it. */
          if (this.rocky(x, y)) { surf[x] = sRock; continue; }
          solid[x] = 0; zone[x] = zShore; surf[x] = sSand;
          continue;
        }
        solid[x] = 0; zone[x] = zHeath; surf[x] = sGrass;
      }
    }
    this.strand(world, zHeath, zShore, sRock);
  },

  /* GROUND YOU CANNOT GET TO IS NOT GROUND. A coastline drawn by a rule leaves
     pockets: a bay whose mouth the rock closed, a spit cut off behind a cliff,
     six tiles of grass on the wrong side of a headland. Nobody would ever have
     stood on one — but `levelcheck` counts the walkable floor in pieces, and it
     is right to, because a pocket is indistinguishable from a room you sealed
     by accident.

     So the last thing the coast does is ask which of it can be reached from the
     land: one flood fill out of the middle of the island, and everything the
     tide of it never touched becomes rock, which is what an unreachable ledge
     above the sea is. The fill is over the coast's own ground only — the two
     parts are walked by their own builders and are not this pass's business. */
  strand(world, zHeath, zShore, sRock) {
    const W = this.W, H = this.H;
    const mine = (x, y) => !world.solid[y][x] && (world.zone[y][x] === zHeath || world.zone[y][x] === zShore);
    const seen = new Uint8Array(W * H);
    /* From every tile of the island's own ground that touches something built:
       a beach reached from a road is reached, and so is the common behind it. */
    const queue = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!mine(x, y) || seen[y * W + x]) continue;
      if (world.solid[y][x - 1] && world.solid[y][x + 1] && world.solid[y - 1][x] && world.solid[y + 1][x]) continue;
      /* A tile of mine beside a tile that is walkable and NOT mine is a tile
         you can step onto from the town, the estate or a road. */
      const touches = (!world.solid[y][x - 1] && !mine(x - 1, y)) || (!world.solid[y][x + 1] && !mine(x + 1, y))
        || (!world.solid[y - 1][x] && !mine(x, y - 1)) || (!world.solid[y + 1][x] && !mine(x, y + 1));
      if (touches) { seen[y * W + x] = 1; queue.push(x, y); }
    }
    for (let i = 0; i < queue.length; i += 2) {
      const x = queue[i], y = queue[i + 1];
      const step = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !mine(nx, ny)) return;
        seen[ny * W + nx] = 1; queue.push(nx, ny);
      };
      step(x - 1, y); step(x + 1, y); step(x, y - 1); step(x, y + 1);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!mine(x, y) || seen[y * W + x]) continue;
      world.solid[y][x] = 1; world.zone[y][x] = 0; world.surf[y][x] = sRock;
    }
    /* AND THE NOTCHES. A tile of ground with rock on three sides of it is a
       slot one tile wide, and a person is twenty-six pixels across a
       thirty-two pixel tile: they do not fit down it, which makes it floor
       nobody can stand on — the same fault as a pocket and found the same way,
       by a harness rather than by anybody looking. Filling them in is what the
       sea would have done anyway. */
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!mine(x, y)) continue;
      const shut = world.solid[y][x - 1] + world.solid[y][x + 1] + world.solid[y - 1][x] + world.solid[y + 1][x];
      if (shut >= 3) { world.solid[y][x] = 1; world.zone[y][x] = 0; world.surf[y][x] = sRock; }
    }
  },

  /* ---- what is on it ------------------------------------------------------
     A scatter, at the same density and by the same method as the outskirts'
     trees: a hash per tile, a threshold, and nothing placed by anybody. Gorse
     and thrift on the common, rocks and driftwood along the tideline, and six
     beach huts in a row above the sand, because a beach hut on its own is a
     shed. */
  scatter(world) {
    const zHeath = world.zid('heath'), zShore = world.zid('shore');
    for (let y = 2; y < this.H - 2; y += 1) {
      const zone = world.zone[y], solid = world.solid[y];
      for (let x = 2; x < this.W - 2; x++) {
        if (solid[x]) continue;
        const z = zone[x];
        if (z !== zHeath && z !== zShore) continue;
        const r = this.rnd(x, y, 47);
        if (z === zHeath) {
          if (r > .992) world.add({ x, y, e: '🌿', name: 'Gorse', kind: 'gorse', solid: true, use: 'gorse' });
          else if (r > .9905) world.add({ x, y, e: '🪨', name: 'A boulder in the grass', kind: 'rock', solid: true, use: 'shoreRock' });
        } else if (r > .995) {
          world.add({ x, y, e: '🪵', name: 'Driftwood', kind: 'drift', solid: false, use: 'driftwood' });
        }
      }
    }
    /* The huts, on the first stretch of sand south-west of the town that is
       wide enough to stand a row of them on — found rather than placed, which
       is the same rule the rest of this file works by. */
    const [tx, ty] = this.TOWN;
    let put = 0;
    for (let y = ty + 72; y < ty + 96 && put < 6; y++) {
      for (let x = tx - 26; x < tx - 6 && put < 6; x++) {
        if (world.solid[y][x] || world.zone[y][x] !== world.zid('shore')) continue;
        if (world.solid[y - 1][x] || world.zone[y - 1][x] !== world.zid('shore')) continue;
        world.add({ x, y, e: '🏠', name: 'A beach hut', kind: 'hut', solid: true, use: 'beachHut' });
        put++; x += 2;
      }
    }
  }
};

/* Composed here rather than by the builder, so that what the catalogue holds is
   an ordinary level from the moment it holds it — see composeLevel() at the
   bottom of data/world.js. */
LEVELS.outside = composeLevel(Island.make());
LEVELS.outside.id = 'outside';
