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
 * NOTHING ABOUT THE COAST IS DRAWN BY HAND EITHER, and it is no longer a
 * MARGIN. It was: the distance from a tile to the nearer of the two built
 * places, against how far the land was allowed to run past them here. Which
 * draws a coastline at a fixed offset from the outline of the built land — and
 * that outline is two rectangles, so what came out was a rounded rectangle
 * with a wave on it, and the offset was clamped besides, so several hundred
 * tiles of that coast sat at exactly the clamp and were a perfect offset
 * curve. The whole north coast was one.
 *
 * It is a FIELD now: one number per tile, positive on land, negative at sea,
 * zero at the waterline, out of domain-warped fractal noise and a radial term.
 * The coastline is the level set, so it is not an offset of anything and there
 * is nothing to clamp. Where the shore is, whether it is sand or rock, and
 * whether there is an islet out there all fall out of the same field and its
 * gradient. See the long note over the constants below, which is where the
 * reasoning and the measured numbers are.
 *
 * What the rule is still TOLD, rather than working out, is where the built land
 * is and that the estuary at the bottom of the town is the sea and has to be
 * let in — which is the whole of why Bellhaven has a harbour rather than a
 * pond.
 */
const Island = {
  /* The map. Six hundred and twelve by four hundred and ninety-six is 303,552
     tiles — twice the outskirts on its own, and a shade over three tenths of a
     square kilometre at a tile to the metre. See the note in the README about
     what a map this size costs: four bytes a tile, and a build that happens
     once and is kept.

     IT IS NOT BIGGER, and that is a decision rather than an oversight. The
     built land is five hundred by three hundred and eighty of it, so the coast
     has about fifty tiles to work in on every side, and an island that big and
     that built reads as a big built island whatever the rule is. Growing the
     map is the obvious fix and it is the wrong one: this level already costs
     between fifty and ninety milliseconds to build in a browser and it is
     built inside an idle callback, so a third more map is a third more of a
     hitch for a shape nobody would call natural anyway. What the field below
     buys instead is that all fifty tiles are USED — the sea comes to the wall
     in places and the land runs seventy out in others. */
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

  /* ---- THE COAST, AND WHY IT IS A FIELD RATHER THAN A MARGIN --------------
     It used to be a margin, and that is what was wrong with it. The rule was:
     find the distance from this tile to the nearer of the two built places,
     work out how far the land is allowed to run past them here, and call
     everything beyond it sea. Which draws a coastline at a fixed offset from
     the outline of the built land — and the outline of the built land is TWO
     RECTANGLES, so what came out was a rounded rectangle with a wave on it.

     Worse, and this is the part that actually did the damage: the offset was
     `PAD + SWELL·swell + three sines`, up to seventy tiles, and then clamped
     at forty-four. The sum cleared the clamp over most of the compass, so
     long stretches of that coast sat at exactly forty-four tiles out — a
     perfect offset curve, hundreds of tiles long, in a game where every other
     derived thing in the world is careful not to draw a straight line. The
     whole north coast was one.

     WHAT IS HERE INSTEAD is a signed field: one number per tile that is
     positive on land, negative at sea, and zero at the waterline, built the
     way terrain is built everywhere — fractal noise, DOMAIN WARPED, plus a
     radial term that makes the middle land and the edge sea. The coastline is
     the level set, so it is not an offset of anything and there is no clamp to
     flatten.

     THE WARP IS THE WHOLE TRICK and is worth the paragraph. Fractal noise on
     its own gives a lumpy outline: lobes, all about the same size, all about
     as round as each other. Sampling that noise at a position that has itself
     been displaced by more noise shears the lobes into each other, and what
     comes out has the one quality a coast has and a lump does not — it looks
     eroded. Headlands come out asymmetric, bays come out with a narrow mouth
     and a wide back, and the same rule produces both.

     THREE THINGS FALL OUT OF IT FOR FREE, and each of them was a rule of its
     own before:

       WHERE THE SHORE IS. The distance from a tile to the waterline is the
       field divided by its own gradient, which is a first-order estimate and
       is good to well under a tile at this scale. So the beach is a band of
       constant WIDTH in tiles rather than a band of constant field value,
       which is what stops it being four tiles wide on a headland and thirty
       across the back of a bay.

       WHETHER IT IS SAND OR ROCK. The gradient again: a steep field is a
       coast that drops away, which is rock, and a shallow one is a coast that
       shelves, which is sand. That is not a metaphor — it is the same
       arithmetic — and it puts the beaches in the bays and the rock on the
       headlands without either being named. The old rule was a hash and a
       bearing, so a beach could and did land on the nose of a headland.

       AND THE ISLETS. A field can be positive somewhere the mainland is not,
       which a margin can never be: skerries off the headlands, where the noise
       clears the water on its own. Anything the flood fill in strand() cannot
       reach from the land becomes rock, which is what an islet you cannot get
       to IS — so they arrive as outcrops rather than as ground nobody can
       stand on, and nothing had to be written to make that happen.

     WHAT IT CANNOT FIX: the built land is five hundred tiles by three hundred
     and eighty in a map six hundred by five hundred, so the coast has about
     fifty tiles to work in on every side. An island that big and that built is
     going to read as a big built island whatever the rule is. The change is
     that the fifty tiles are all used — the sea comes to the wall in places
     and runs out ninety in others — rather than thirty of them being a
     constant. */

  /* The field, in the units it is measured in: about ±1 from the noise, and
     the radial term scaled so that it swamps the noise at the edge and is
     swamped by it in the middle. */
  FS: 76, OCT: 5,            /* the feature scale of the coastline, and its detail */
  AMP: 1.05,                  /* the noise's share of it */
  WARP: 44, WS: 128,         /* the domain warp: how far, and at what scale */
  /* THE RADIAL TERM, and the two numbers are the island's size and how hard
     its edge is. LIFT is where it crosses zero, as a fraction of the way from
     the middle of the map to the edge of it — so .95 is an island inscribed in
     the map with the corners left as sea, which is what an ellipse in a
     rectangle gives you and is the right answer here.

     PULL AGAINST AMP IS THE WHOLE SHAPE. A big PULL makes a coast that is
     nearly a curve; a big AMP makes one that is nearly a fractal, with
     skerries and lagoons and no clear line anywhere. 3.4 against .85 puts the
     transition band at about forty tiles wide, which on this map means the sea
     comes to the wall in places and the land runs ninety tiles out in others,
     and a handful of islets off the headlands where the noise clears the water
     on its own. The first version had PULL 2.2 against LIFT .82 — the crossing
     was inside the built land, so the shape was NEGATIVE everywhere past it
     and the guard below was drawing the whole coastline. Which is the old rule
     back again, with noise on it. */
  LIFT: .95, PULL: 2.9,
  /* SEA AT THE EDGE OF THE MAP, ALWAYS. A map with an edge has to say what is
     past the edge and the answer here is the sea, so the outermost dozen tiles
     are pushed under whatever the noise wanted. Without it the field is free
     to come up positive at the border and the island is a rectangle again in
     the one place it would be most obvious. */
  RIM: 13,
  /* THE GUARD: the land runs at least MARGIN past the last thing built on it,
     and the field takes over again over the FEATHER beyond that. GUARD is how
     hard it pushes and has to beat the noise outright, or a bay bites into
     somebody's garden. Both distances are small on purpose — this map has
     fifty tiles of margin and a guard that filled it would be the old rule
     with extra steps. */
  /* NARROW AND STEEP, both on purpose. A wide feather is a wide band in which
     the guard's own linear falloff is the largest gradient in the field — and
     the gradient is what decides where the shore is and whether it is sand, so
     a wide feather is the box outline deciding the coast a second time. Six
     and ten put it inside sixteen tiles of anything built, where it belongs. */
  MARGIN: 6, FEATHER: 10, GUARD: 2.5,
  /* How wide the shore is, in tiles, measured from the waterline. */
  BEACH: 9,
  /* How steep a coast has to be to be rock rather than sand, in field units
     per tile. MEASURED off the finished shape rather than chosen — the whole
     coastline's gradients run from .008 in the backs of the bays to .035 on
     the noses of the headlands, with the median at .021 — and set so that the
     median comes out about even between the two. Re-measure it after changing
     AMP, PULL or FS: it is a threshold on a distribution, and moving the
     distribution without moving the threshold gives an island that is all
     beach or all cliff. */
  CLIFF: .034,

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
  /* KEPT, and that is not a micro-optimisation. reach() is asked of every tile
     on the map — three hundred thousand of them — and this built three arrays
     every time it was called, which is a million allocations inside the one
     pass in this game that touches every tile. It was two thirds of the cost
     of building the level. */
  boxes() {
    if (this._boxes) return this._boxes;
    const [tx, ty] = this.TOWN, [ox, oy] = this.OUT, m = this.HEM;
    return (this._boxes = [
      [tx, ty, tx + this.TW - 1, ty + this.TH - 1],
      [ox + m, oy + m, ox + this.OW - 1 - m, oy + this.OH - 1 - m],
      /* AND THE SEAFRONT IS BUILT LAND TOO. The road down the shore, the three
         stubs that reach it and the car park at the end are laid by this file
         rather than by either part, so they were not in this list and the
         coast rule was free to put the sea round three sides of them. It never
         did, because the rule could not reach that far in — and the moment the
         coastline was given room to bite properly it turned the car park into
         an island with a bus stop on it. */
      [tx - 22, ty + 8, tx - 1, ty + 68]
    ]);
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

  /* ---- THE NOISE ---------------------------------------------------------
     Value noise, on the same hash everything else derived in this game uses,
     with a smoothstep between the lattice points because linear interpolation
     leaves a visible diamond at every one of them. Then fBm: octaves at
     doubling frequency and halving amplitude, which is the only kind of noise
     a coastline wants — detail at every scale from the whole island down to
     about eight tiles, and none finer, because a coast that wiggles per tile
     is not a coast, it is a dither. */
  vnoise(x, y, salt) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = this.rnd(xi, yi, salt), b = this.rnd(xi + 1, yi, salt);
    const c = this.rnd(xi, yi + 1, salt), d = this.rnd(xi + 1, yi + 1, salt);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  },
  /* Normalised to 0..1 whatever the octave count, so changing OCT changes the
     detail and not the sea level. */
  fbm(x, y, salt, oct) {
    let v = 0, amp = .5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      v += amp * this.vnoise(x * f, y * f, salt + i * 101);
      norm += amp; amp *= .5; f *= 2;
    }
    return v / norm;
  },

  /* ---- THE FIELD ---------------------------------------------------------
     Positive on land, negative at sea, zero at the waterline. Four terms and
     they are in the order they matter:

       THE NOISE, domain warped — the shape of the coast.
       THE RADIAL TERM — what makes the middle of the map land and the outside
         of it sea, and therefore what makes this an island rather than a
         texture. Elliptical rather than circular, because the map is.
       THE GUARD — the land the built places are standing on.
       THE RIM AND THE WATER — sea at the edge of the map, and the two places
         the water is let in on purpose.

     Asked once every STEP tiles and read off a lattice in between: this is
     eleven noise lookups and forty-four hashes a sample, and asking it of
     three hundred thousand tiles rather than thirty-four thousand is most of a
     second for a curve that cannot bend faster than about six tiles. The
     lattice is also where the gradient comes from, which is what decides the
     shore and the rock — and could not be read off a per-tile version any more
     cheaply anyway. */
  STEP: 3,
  /* THE SHAPE: the noise and the radial term, and nothing that is a
     constraint. It is separated from the constraints below for one reason and
     it is not tidiness — THE GRADIENT IS TAKEN OFF THIS AND NOT OFF THE FIELD.
     The guard falls off at a quarter of a unit per tile, the rim at seven
     tenths, and both of those are an order of magnitude steeper than anything
     the noise does: measured off the finished field, the steepest coast in the
     game was the coast hugging the town, because that is where the guard is.
     Which is backwards — a coast that hugs the built land is where the sea has
     bitten IN, and a bay is the one place sand actually accumulates. So the
     gradient comes off the geography and the constraints are left out of it. */
  shapeAt(x, y) {
    /* The warp. Two independent noise fields, one per axis, at a longer scale
       than the coast's own detail — a warp at the same scale as the thing it
       is warping is just more noise. */
    const wx = x + this.WARP * (this.fbm(x / this.WS, y / this.WS, 11, 3) - .5) * 2;
    const wy = y + this.WARP * (this.fbm(x / this.WS + 37.3, y / this.WS + 13.7, 23, 3) - .5) * 2;
    const n = (this.fbm(wx / this.FS, wy / this.FS, 71, this.OCT) - .5) * 2;
    const cx = this.W / 2, cy = this.H / 2;
    const ex = (x - cx) / cx, ey = (y - cy) / cy;
    return this.AMP * n + (this.LIFT - Math.sqrt(ex * ex + ey * ey)) * this.PULL;
  },
  /* And the constraints: where the land has to be whatever the shape says, and
     where the water has to be. */
  bindAt(x, y) {
    let f = 0;
    /* THE GUARD. Full strength over anything built and for MARGIN past it,
       then off over the FEATHER — so the coast can come within six tiles of
       the last field on the estate and no closer, and from there out it is the
       shape's business. */
    const d = this.reach(x, y);
    if (d < this.MARGIN + this.FEATHER)
      f += this.GUARD * (1 - Math.max(0, d - this.MARGIN) / this.FEATHER);
    /* THE RIM: sea at the edge of the map, always. */
    const m = Math.min(x, y, this.W - 1 - x, this.H - 1 - y);
    if (m < this.RIM) f -= (this.RIM - m) * .7;
    /* THE HARBOUR, and it is the one place the rule is overruled. The bottom
       six rows of the town are an estuary with a quay along it, drawn when the
       water had to stop somewhere because the map did. The water it stops in
       is this water. So the land south of the town gives up almost at once and
       the tide comes to the wall, which is why Bellhaven is a port — and the
       pull has to beat the GUARD outright, because the guard is at full
       strength right up against the town and would otherwise hold the tide off
       it.

       FEATHERED AT ITS OWN EDGES, which the first version was not: a hard
       rectangle of "this is sea" leaves three straight lines in the coast
       where it stops, and one of them ran a hundred tiles. `soft` is how far
       inside the rectangle this tile is, over ten tiles, so the estuary opens
       into the sea instead of ending in a corner. */
    const [tx, ty] = this.TOWN;
    const soft = (x1, y1, x2, y2) => {
      const q = Math.min(x - x1, x2 - x, y - y1, y2 - y);
      return q < 0 ? 0 : Math.min(1, q / 10);
    };
    /* AND BOTH RECTANGLES REACH INSIDE THE TOWN, which is what makes the
       feather work at the end that matters. Feathered from the town's own
       edge, the pull was nothing AT that edge and full strength ten tiles out
       — so the ten tiles between the quay wall and the open sea were land,
       which is a dam across the mouth of the estuary. The tiles it reaches in
       over are inside the town's box and the coast pass skips those, so
       extending it there costs nothing and the pull is at full strength by the
       time it is somebody's business. */
    f -= (this.GUARD + 4) * soft(tx + 8, ty + this.TH - 14, tx + this.TW + 10, this.H + 12);
    /* And the river that runs down the west side of the town goes the same
       way: it is the same water, and it has to reach it. The town's own water
       comes out of its west edge from row 262 to the bottom of it. */
    f -= (this.GUARD + 3.5) * soft(-14, ty + 69, tx + 8, ty + this.TH + 18);
    return f;
  },
  fieldAt(x, y) { return this.shapeAt(x, y) + this.bindAt(x, y); },

  /* THREE LATTICES, BUILT TOGETHER. The field is read per tile and
     interpolated; the GRADIENT of the shape and the WEATHER BIAS are read per
     tile as well, and both were being worked out per tile — a square root and
     an arctangent and a cosine, three hundred thousand times, which cost more
     than the field itself. Neither can change faster than the lattice they are
     derived from, so both are cells. */
  lattice() {
    if (this._grid) return this._grid;
    const S = this.STEP, gw = Math.ceil(this.W / S) + 2, gh = Math.ceil(this.H / S) + 2;
    const g = new Float32Array(gw * gh), sh = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const k = j * gw + i, v = this.shapeAt(i * S, j * S);
      sh[k] = v; g[k] = v + this.bindAt(i * S, j * S);
    }
    const grad = new Float32Array(gw * gh), bias = new Float32Array(gw * gh);
    const cx = this.W / 2, cy = this.H / 2;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const i0 = Math.max(1, Math.min(gw - 2, i)), j0 = Math.max(1, Math.min(gh - 2, j));
      const dx = (sh[j0 * gw + i0 + 1] - sh[j0 * gw + i0 - 1]) / (2 * S);
      const dy = (sh[(j0 + 1) * gw + i0] - sh[(j0 - 1) * gw + i0]) / (2 * S);
      grad[j * gw + i] = Math.sqrt(dx * dx + dy * dy);
      const b = Math.atan2(j * S - cy, i * S - cx);
      bias[j * gw + i] = (Math.cos(b + .6) + 1) / 2;       /* 1 to the west-north-west */
    }
    return (this._grid = { g, grad, bias, gw, gh, S });
  },
  field(x, y) {
    const { g, gw, S } = this.lattice();
    const fx = x / S, fy = y / S, i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j;
    const a = g[j * gw + i], b = g[j * gw + i + 1], c = g[(j + 1) * gw + i], d = g[(j + 1) * gw + i + 1];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  },
  /* HOW FAST THE FIELD IS CHANGING, in field units per tile, off the lattice
     it is stored on. Two things read it and both of them are the coast: how
     far this tile is from the waterline (the field over the gradient), and
     whether the coast here shelves or drops (the gradient itself). */
  slope(x, y) {
    const { grad, gw, S } = this.lattice();
    return grad[((y / S) | 0) * gw + ((x / S) | 0)];
  },

  /* Sand or rock, at this stretch of coast.

     THE GRADIENT DECIDES, which is the change: a steep field is a coast that
     drops into the water and a shallow one is a coast that shelves into it,
     and those are rock and sand respectively. So the beaches land in the bays
     and the rock on the headlands, because a bay IS the flat part of the
     field. It used to be a hash and a bearing, which put beaches on the noses
     of headlands about a third of the time.

     Two things are kept from the old rule and both earn it. The PATCH HASH, at
     twenty-one tiles, so a beach is a beach for as long as a beach is rather
     than alternating with rock tile by tile where the gradient sits near the
     threshold. And the WEATHER, which comes from the west-north-west: a coast
     that takes the weather is a coast with no sand left on it. */
  rocky(x, y, g) {
    const { bias, gw, S } = this.lattice();
    const steep = Math.min(1.2, g / this.CLIFF);
    const weather = bias[((y / S) | 0) * gw + ((x / S) | 0)];
    return this.rnd(Math.floor(x / 21), Math.floor(y / 21), 31) * .40
      + steep * .52 + weather * .30 > .68;
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
    /* THE LATTICE IS HOISTED, and so is the arithmetic that reads it. Three
       hundred thousand tiles is the one place in this game where the cost of
       a property lookup is worth writing differently: field(), slope() and
       rocky() each ask lattice() for the grid and destructure it, so the
       readable version asked three times a tile and was most of a second.
       They are still the API — the diagnostics and the scatter use them, and
       they are what this arithmetic means — but this loop does it with the
       grid in a local. */
    const L = this.lattice(), g = L.g, grad = L.grad, bias = L.bias, gw = L.gw, S = L.S;
    const BEACH = this.BEACH, CLIFF = this.CLIFF;
    for (let y = 0; y < this.H; y++) {
      const solid = world.solid[y], zone = world.zone[y], surf = world.surf[y];
      const fy = y / S, j = fy | 0, ty2 = fy - j, row = j * gw, row2 = (j + 1) * gw;
      const cell = ((y / S) | 0) * gw;
      for (let x = 0; x < this.W; x++) {
        if (x >= tx && x < tx + this.TW && y >= ty && y < ty + this.TH) continue;
        if (x >= ox + this.HEM && x < ox + this.OW - this.HEM && y >= oy + this.HEM && y < oy + this.OH - this.HEM) continue;
        if (zone[x]) continue;
        const fx = x / S, i = fx | 0, tx2 = fx - i;
        const a = g[row + i], b = g[row + i + 1], c = g[row2 + i], d = g[row2 + i + 1];
        const f = (a + (b - a) * tx2) * (1 - ty2) + (c + (d - c) * tx2) * ty2;
        if (f <= 0) { surf[x] = sSea; continue; }                /* the sea, and it is solid */
        /* HOW FAR THIS TILE IS FROM THE WATERLINE: the field over its own
           gradient, which is where the zero crossing is to first order and is
           good to well under a tile at this scale. It is what makes the beach
           a band of constant WIDTH rather than of constant field value — the
           back of a bay is flat, so a fixed value there would be thirty tiles
           of sand where a headland got four. */
        const k = cell + ((x / S) | 0);
        const sl = grad[k];
        if (sl > 1e-4 && f / sl <= BEACH) {
          /* THE SHORE. Rock is the edge of the land standing up out of the
             water; sand is the edge of it lying down in the water, and the
             difference on a map with no height in it is whether you can walk
             on it. See rocky(), which this is the inlined half of. */
          const steep = sl / CLIFF > 1.2 ? 1.2 : sl / CLIFF;
          if (this.rnd((x / 21) | 0, (y / 21) | 0, 31) * .40 + steep * .52 + bias[k] * .30 > .68) {
            surf[x] = sRock; continue;
          }
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
    /* THE HUTS, on the nearest stretch of sand to the car park above the beach
       that is wide enough to stand a row of them on — because a beach hut on
       its own is a shed, and because a row of them a mile from the only place
       you can park is a row of sheds.

       SEARCHED RATHER THAN SITED, and that is the whole of why this is not
       twelve lines shorter. It used to look in one fixed rectangle south-west
       of the town, which was the right rectangle for one coastline: the moment
       the coast rule was given room to bite properly, the river mouth moved
       into it and the band came back with ONE walkable tile of sand in it, so
       the huts silently stopped existing. Nothing failed and nothing said so —
       which is exactly the failure mode of a derived place with a hand-written
       coordinate in it. It asks the map where the sand is instead.

       What makes a spot: a walkable tile of shore in the BODY of a beach rather
       than on a spit of one — three of its four neighbours walkable — with
       nothing already standing on it. A hut wants its back to the dunes, and
       three neighbours out of four is the cheap way of asking for that without
       having to know which way this stretch of coast faces, which on an island
       is all four ways.

       Sorted by how far it is from the car park, because a row of huts a mile
       from the only place you can leave a car is a row of sheds. Then taken
       three apart and within a few rows of the first, because six huts spread
       along a headland are six sheds and six in a line are a row. */
    const cpx = this.TOWN[0] - 12, cpy = this.TOWN[1] + 62;      /* the pay and display */
    const open = (x, y) => !world.solid[y][x];
    const spots = [];
    for (let y = Math.max(2, cpy - 110); y < Math.min(this.H - 2, cpy + 110); y++)
      for (let x = Math.max(2, cpx - 110); x < Math.min(this.W - 2, cpx + 110); x++) {
        if (world.solid[y][x] || world.zone[y][x] !== zShore) continue;
        if (world.byTile.has(x + ',' + y)) continue;
        const n = open(x - 1, y) + open(x + 1, y) + open(x, y - 1) + open(x, y + 1);
        if (n < 3) continue;
        spots.push([Math.hypot(x - cpx, y - cpy), x, y]);
      }
    /* AND THE STRETCH IS CHOSEN, not the first tile. Taking the nearest spot
       and then everything within a few rows of it put ONE hut on the beach:
       the nearest tile of sand to the car park happened to be on a row with
       nothing else on it, and the row was then the constraint. So the thing
       looked for is a LINE OF SIX — six candidates three apart, along the row
       or down the column, because a west-facing beach runs the other way —
       and of all the lines that exist the one whose near end is closest to the
       car park wins. Which is the original intent of this block, said in a way
       that cannot come back with one hut and no complaint. */
    const cand = new Set(spots.map(sp => sp[1] + ',' + sp[2]));
    let best = null;
    for (const [d, x, y] of spots) {
      for (const [dx, dy] of [[3, 0], [0, 3]]) {
        let ok = true;
        for (let i = 1; i < 6 && ok; i++) ok = cand.has((x + dx * i) + ',' + (y + dy * i));
        if (ok && (!best || d < best.d)) best = { d, x, y, dx, dy };
      }
    }
    if (best) for (let i = 0; i < 6; i++)
      world.add({ x: best.x + best.dx * i, y: best.y + best.dy * i,
                  e: '🏠', name: 'A beach hut', kind: 'hut', solid: true, use: 'beachHut' });
  }
};

/* Composed here rather than by the builder, so that what the catalogue holds is
   an ordinary level from the moment it holds it — see composeLevel() at the
   bottom of data/world.js. */
LEVELS.outside = composeLevel(Island.make());
LEVELS.outside.id = 'outside';
