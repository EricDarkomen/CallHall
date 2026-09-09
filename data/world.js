'use strict';
/* CALLHALL — the building. Zones and their colours, the furniture catalogue,
 * the room and door definitions, and the waypoints NPC schedules steer by.
 * engine/world.js turns these into a map; nothing here is code.
 */

/* `surf`/`wsurf` are what a room's floor and walls are made of, and `tile`/
   `wtile` name the kit sprite. The difference between thirteen rooms and one
   room in thirteen colours. Baked once — see R.floorTile(). */
const ZONES = {
  lobby:    { name: 'Reception',        floor: '#333c4a', alt: '#2e3643', wall: '#1c2330', tint: '#4da3ff', surf: 'stone'  , tile: 'floor.diamond', wtile: 'wall.drywall' },
  main:     { name: 'Main Floor',       floor: '#2f3a4d', alt: '#2a3445', wall: '#1a212e', tint: '#4da3ff'  , tile: 'floor.carpet', wtile: 'wall.drywall' },
  corridor: { name: 'The Corridor',     floor: '#2b3140', alt: '#262c3a', wall: '#181e29', tint: '#8d9bb5'  , tile: 'floor.carpet.dim', wtile: 'wall.drywall' },
  brk:      { name: 'Break Room',       floor: '#3b3728', alt: '#353124', wall: '#231f16', tint: '#ffb347', surf: 'vinyl'  , tile: 'floor.wood', wtile: 'wall.drywall' },
  training: { name: 'Training Room',    floor: '#2a3a33', alt: '#25342e', wall: '#17231e', tint: '#5ad48a'  , tile: 'floor.carpet.grn', wtile: 'wall.drywall' },
  archive:  { name: 'The Archive',      floor: '#332b3d', alt: '#2e2737', wall: '#1e1826', tint: '#b48cff', surf: 'vinyl'  , tile: 'floor.sub', wtile: 'wall.drywall' },
  manage:   { name: 'Management Floor', floor: '#3d2b2e', alt: '#372629', wall: '#25181a', tint: '#ff5f56'  , tile: 'floor.herring', wtile: 'wall.drywall' },
  /* The one room whose walls are LIGHTER than its floor, because that is what a
     tiled washroom is and because the kit wall is multiplied through this
     colour — at #151f26 the cream tile came out as black rectangles and the
     whole reason for shipping LICENSE part 3 was invisible. The edge of the
     room still reads: it is contrast that matters, not which way round. */
  toilet:   { name: 'The Toilets',      floor: '#26363f', alt: '#223039', wall: '#6e7c82', tint: '#4da3ff', surf: 'tile', wsurf: 'tile'  , tile: 'floor.tile', wtile: 'loo.wall' },
  it:       { name: 'IT & Server Room', floor: '#22323a', alt: '#1e2d34', wall: '#131d22', tint: '#5ad48a', surf: 'raised'  , tile: 'floor.tile.dark', wtile: 'wall.drywall' },
  meet:     { name: 'Meeting Room 2',   floor: '#343044', alt: '#2f2b3e', wall: '#1f1c2b', tint: '#b48cff'  , tile: 'floor.carpet.vio', wtile: 'wall.drywall' },
  well:     { name: 'The Wellbeing Room', floor: '#2c3b3c', alt: '#273536', wall: '#182324', tint: '#5ad48a'  , tile: 'floor.carpet.cyn', wtile: 'wall.drywall' },
  fire:     { name: 'Fire Escape',      floor: '#3a3a38', alt: '#343432', wall: '#1e1e1d', tint: '#ffb347', surf: 'concrete', wsurf: 'block'  },
  secret:   { name: '████████',         floor: '#1d2230', alt: '#191d29', wall: '#0d1017', tint: '#b48cff', surf: 'concrete', wsurf: 'block'  },
  /* Outdoors. Lighter than anything inside the building, because they are lit
     by the sky rather than by a strip light — see LEVELS.outside, which is the
     one level the renderer does not put a ceiling on. All of them are breeze
     block at the boundary: out here that is a car park wall rather than a
     plant room.

     A zone out here is a PLACE, not a material. Every one of them is paving
     slabs by default — `tile` is the one flagstone from art/sprites/town.png,
     reused exactly as the office's rooms share world.png's kit — and the
     carriageway running through the middle of each is laid over the top of it
     by SURFACES below, because a road and the pavement beside it are one
     street with one name and two surfaces, and a zone can only carry one of
     those two facts.

     That is also why there is one of them per street: the zone name is what
     UI.zone() puts on screen as you cross into it, so a street with its own
     name has to be its own zone. Driving the network announces each road as
     you turn into it, which is the entire reason the network is a network. */
  forecourt: { name: 'The Forecourt',   floor: '#4a4e56', alt: '#45494f', wall: '#33373d', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' },
  street:    { name: 'Bellhaven Road',  floor: '#4a4e56', alt: '#45494f', wall: '#33373d', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' },
  high:      { name: 'The High Street', floor: '#4b4f57', alt: '#464a50', wall: '#35393f', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' },
  aldergate: { name: 'Aldergate Rise',  floor: '#484c54', alt: '#43474d', wall: '#32363c', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' },
  cargate:   { name: 'Cargate Lane',    floor: '#474b53', alt: '#42464c', wall: '#31353b', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' },
  marlow:    { name: 'Marlow Street',   floor: '#494d55', alt: '#44484e', wall: '#33373d', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' },
  fenn:      { name: 'Fenn Street',     floor: '#464a52', alt: '#41454b', wall: '#30343a', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' },
  corven:    { name: 'Corven Way',      floor: '#454951', alt: '#40444a', wall: '#2f3339', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' },
  /* INSIDE A BUSINESS. The first interior out here that is not this company's
     own building: warm where the office is cold, and lit like an operating
     theatre, which is what the act has always said about it from across the
     road. Vinyl underfoot because that is what a place that mops at close
     has. */
  greggs:    { name: 'Greggs',          floor: '#4a4136', alt: '#453c32', wall: '#2b241d', tint: '#ffb347', surf: 'vinyl', tile: 'floor.tile', wtile: 'wall.drywall' },
  /* The other three units with a floor behind them. Each one takes its colours
     from what the act across the road already said about it: the pub is the
     carpet that has seen things, the bookies is the warmest building on the
     street, and the launderette is lit like a fridge and always has been. */
  pub:       { name: 'The Bellhaven Arms', floor: '#4a2f2b', alt: '#452b27', wall: '#2a1a17', tint: '#ffb347', tile: 'floor.carpet', wtile: 'wall.drywall' },
  bookies:   { name: 'Bellhaven Bookmakers', floor: '#3a3550', alt: '#35304a', wall: '#221f33', tint: '#b48cff', tile: 'floor.carpet.vio', wtile: 'wall.drywall' },
  laund:     { name: 'The launderette',  floor: '#414a4e', alt: '#3c4549', wall: '#242b2e', tint: '#4da3ff', surf: 'vinyl', tile: 'floor.tile', wtile: 'wall.drywall' },
  /* Four more, and each one's colours are an argument the act outside it has
     already made: the post office is municipal and always has been, the
     charity shop is lit like a church hall because it is staffed like one,
     the kebab shop is a room you only ever see at night, and Vapour Trail is
     three shops wearing each other's flooring. */
  postoff:   { name: 'The post office',  floor: '#3f4738', alt: '#3a4234', wall: '#232a1f', tint: '#5ad48a', surf: 'vinyl', tile: 'floor.tile', wtile: 'wall.drywall' },
  charity:   { name: 'The charity shop', floor: '#4a4638', alt: '#454133', wall: '#2b2820', tint: '#ffb347', tile: 'floor.carpet.dim', wtile: 'wall.drywall' },
  kebab:     { name: 'Bellhaven Kebab',  floor: '#4c4234', alt: '#473d30', wall: '#2a231b', tint: '#ffb347', surf: 'tile', tile: 'floor.tile', wtile: 'loo.wall' },
  vapour:    { name: 'Vapour Trail',     floor: '#3c4650', alt: '#37414b', wall: '#212831', tint: '#b48cff', surf: 'vinyl', tile: 'floor.diamond', wtile: 'wall.drywall' },
  /* And five behind Fenn Street, which is the cheap side of the block and
     looks it. Same rule as the four above — the colours are an argument the
     act outside already made — but these are not shops, and none of them is
     lit like one. A nail bar is lit like a dental surgery because it is doing
     dentistry to a hand; a tyre bay has one bulb and a window in the roller
     shutter; Unit 6 is whatever the last tenant left the lights as; a club is
     the last room in England still lit at the brightness of 1974; and
     Sunseekers is a corridor with no daylight in it at all, which is the
     entire point of the business. */
  nails:     { name: 'Nailed It',        floor: '#4c3f49', alt: '#473a44', wall: '#2c2229', tint: '#ff5f56', surf: 'vinyl', tile: 'floor.tile', wtile: 'wall.drywall' },
  tyre:      { name: 'Bellhaven Tyre & Exhaust', floor: '#3e4045', alt: '#393b40', wall: '#232529', tint: '#ffb347', surf: 'concrete', wsurf: 'block', tile: 'floor.tile.dark', wtile: 'wall.brick' },
  unitsix:   { name: 'Unit 6',           floor: '#454749', alt: '#404244', wall: '#28292b', tint: '#9fb3c8', surf: 'vinyl', tile: 'floor.sub', wtile: 'wall.drywall' },
  club:      { name: 'The Working Men\u2019s Club', floor: '#4a3328', alt: '#452f24', wall: '#2a1d16', tint: '#ffb347', tile: 'floor.carpet', wtile: 'wall.drywall' },
  tan:       { name: 'Sunseekers',       floor: '#4d4534', alt: '#484030', wall: '#2c271d', tint: '#ffb347', surf: 'vinyl', tile: 'floor.diamond', wtile: 'wall.drywall' },
  /* Not a street: a walled car park with one way in, like the forecourt at the
     other end of town, and the only place out here big enough to find out what
     the pool car does above thirty. */
  retail:    { name: 'Bellhaven Retail Park', floor: '#484c53', alt: '#43474e', wall: '#32363c', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' }
};

/* What a tile is MADE of, where that is not what its zone is made of. A level
   declares rectangles of these in `surfaces:` and World.build() paints them
   into World.surf; R.floorTile() reads one in preference to the zone's own
   floor, and R.kerbs() draws a kerb along every edge where one meets ground of
   a different surface. Nothing else knows: the zone still says where you are,
   the room still says what is walkable, and a tile with no surface over it is
   exactly what it always was.

   `floor` and `alt` are TINTS, not colours — the kit tile is multiplied
   through them, same as a zone's are, so the number written here is lighter
   than what ends up on screen and is picked by looking at the result. `map` is
   the one colour that is a colour: the minimap paints flat rectangles with no
   texture to tint, so it needs to be told. */
const SURFACES = {
  /* Roads and the car park. Cold, dark and unpatterned, which is what makes
     the paving beside it read as paving and the white lines read as paint. */
  /* `alt` is the SAME as `floor`, and that is the road being poured rather
     than laid. Every other surface alternates its tint a shade on the odd
     tiles, which is what stops a floor reading as wallpaper — but the modern
     road tile is a flat, even sheet of asphalt with no grain to hide behind,
     and on that the alternation stopped being a texture and became a
     chequerboard you could count the squares of. */
  tarmac: { tile: 'terrain.road', floor: '#a6acb5', alt: '#a6acb5', map: '#2c2f38' },
  /* Grass, and the one surface in the game that is not the same thing twice.
     `tiles` rather than `tile`: the LPC terrain sheets ship the same square in
     four seasons at the same pixel, so this is one crop taken four times and
     R.floorTile() asks Sky.season() which of them today is. `maps` is the same
     idea for the minimap, which paints flat colour and has no texture to tint.

     There is not much of it — a strip behind the bays, the bit round the
     retail park sign, the verge nobody has ever cut — and that is the point.
     It is the only thing outside this building that knows what month it is,
     which is roughly the correct amount of nature for a business park. */
  grass: {
    tiles: { spring: 'terrain.grass.spring', summer: 'terrain.grass.summer',
             autumn: 'terrain.grass.autumn', winter: 'terrain.grass.winter' },
    floor: '#b9c0bd', alt: '#b2b9b6',
    maps: { spring: '#4a6a34', summer: '#3f5c2c', autumn: '#6b5a2a', winter: '#b9cdd4' },
    map: '#4a6a34'
  }
};

/* The cars. One entry per model, keyed by `model` on a car in a level's own
   `cars:` list — the same arrangement as FURN below, and for the same reason:
   what a hatchback IS belongs in one place, and which hatchback is parked in
   bay 9 belongs to the level.

     len/wid   the body, in pixels. A person is 58px tall on the same floor.
     top       top speed, px/s. Walking is TILE * 3.45, which is 110.
     acc       how briskly it gets there, px/s².
     grip      how much it refuses to slide sideways, per second. Lower slides.
     turn      radians/s at speed, before the speed taper in Cars.drive().
     body/roof/trim   its colours. Everything else is drawn from these.

   Handling numbers, not personality: a car that is slow because it is a
   twenty-year-old pool car is slow HERE, in one number, and reads as itself
   without anything in engine/cars.js knowing which car it is. */
const CARS = {
  /* The pool car. The only one in the county with a magnetic door sign that
     has slid, and the only one in this car park you are allowed to move. */
  pool:  { len: 56, wid: 27, top: 232, acc: 150, grip: 5.5, turn: 2.5, body: '#b9bec4', roof: '#8d949c', trim: '#33383e' },
  hatch: { len: 52, wid: 26, top: 265, acc: 190, grip: 6.2, turn: 2.9, body: '#7d2f34', roof: '#5e2327', trim: '#2b2f33' },
  estate:{ len: 62, wid: 28, top: 245, acc: 160, grip: 5.2, turn: 2.3, body: '#2f4a6b', roof: '#243a54', trim: '#2b2f33' },
  van:   { len: 70, wid: 30, top: 210, acc: 120, grip: 4.4, turn: 2.0, body: '#d8d5cc', roof: '#c2bfb5', trim: '#3a3a38' },
  /* Traffic. Ordinary cars in ordinary colours, so that what goes past the
     Greggs is not obviously the same car eight times. */
  saloon:{ len: 56, wid: 27, top: 220, acc: 150, grip: 5.5, turn: 2.4, body: '#3f5a44', roof: '#31462f', trim: '#2b2f33' },
  taxi:  { len: 56, wid: 27, top: 230, acc: 165, grip: 5.5, turn: 2.5, body: '#c9a227', roof: '#a8871f', trim: '#2b2f33' },
  small: { len: 46, wid: 25, top: 250, acc: 200, grip: 6.5, turn: 3.1, body: '#5a5f8a', roof: '#464a6b', trim: '#2b2f33' },
  /* The 41A. Long enough that it has to slow right down for a corner and take
     the whole width of the junction to get round one, which is the point of
     having one on the network at all — and it does not stop at the bus stop,
     which is the thing the bus stop has said about the 41A since long before
     there was a road for it to not stop on. */
  bus:   { len: 96, wid: 32, top: 175, acc: 95, grip: 3.6, turn: 1.9, body: '#8d3a3f', roof: '#f0ece2', trim: '#2b2f33' }
};

/* How each kind of object is furnished, keyed by `kind`.

     mount 'wall'    — hung on the face of the wall it stands against
     mount 'surface' — stood on a worktop, which is drawn under it
     (default)       — standing on the floor

   `size` is the emoji size; `art` names a shape the renderer draws instead, for
   the things whose emoji is worse than nothing. Anything not listed keeps the
   old 27px on the floor, so adding a kind is opt-in.

   An object may overrule its kind with its own `furn:`, merged over this and
   cached as o.fdef. That is the point, not a loophole: no rule keyed on `kind`
   can know which fire extinguisher is propping the fire door open.

   `ground` is how much FLOOR a solid one of these actually takes up, in
   fractions of a tile — [width] or [width, depth] — and it is read by
   engine/collide.js and by nothing else. Everything gets a footprint the size
   it is DRAWN rather than the whole square it stands in, worked out from
   `size`; this is the override for the ones whose drawn size lies about their
   feet. A lamppost is three metres of nothing on top of a post you could get a
   shopping trolley past, and for a year it took the same square out of the
   pavement as a skip. Nothing here is ever bigger than a whole tile: every
   footprint is a subset of what the tile model already claimed, so this can
   only ever open the world up, never close a route. */
const FURN = {
  /* On the wall. Sizes vary because a fire extinguisher and a picture window
     are not the same object at all. */
  poster: { mount: 'wall', size: 22, art: 'poster' },
  board: { mount: 'wall', size: 21, art: 'board' },
  chart: { mount: 'wall', size: 21, art: 'chart' },
  window: { mount: 'wall', size: 25, art: 'window' },
  screen: { mount: 'wall', size: 17, art: 'screen' },
  roll: { mount: 'wall', size: 16, art: 'roll' },
  sign: { mount: 'wall', size: 18, art: 'sign' },
  clock: { mount: 'wall', size: 19 }, mirror: { mount: 'wall', size: 20 },
  view: { mount: 'wall', size: 26 },
  dryer: { mount: 'wall', size: 17, art: 'dryer' }, fire: { mount: 'wall', size: 19 },
  graf: { mount: 'wall', size: 15 },
  aircon: { mount: 'wall', size: 19 }, therm: { mount: 'wall', size: 15 },
  tv: { mount: 'wall', size: 23 },
  /* A pigeon on a wall is a pigeon on a ledge, which is the one thing on this
     list that is exactly where it ought to be. */
  pigeon: { mount: 'wall', size: 16 },
  module: { mount: 'surface', size: 16 },
  /* Off the wall: a projector aimed at the wall it is bolted to projects onto
     its own bracket, a flipchart is an easel, and a card that is circulating is
     never in one place long enough to hang. */
  proj: { mount: 'surface', size: 19 },
  flip: { size: 22 }, card: { size: 17 },

  /* On a worktop. The break-room row and the toilet row become one continuous
     counter rather than four things balanced on the carpet. */
  kettle: { mount: 'surface', size: 17 }, tin: { mount: 'surface', size: 16 },
  sink: { mount: 'surface', size: 17 }, micro: { mount: 'surface', size: 18 },
  jug: { mount: 'surface', size: 16 }, biscuits: { mount: 'surface', size: 15 },
  confphone: { mount: 'surface', size: 17 }, tray: { mount: 'surface', size: 15 },
  mugs: { mount: 'surface', size: 16 }, paper: { mount: 'surface', size: 15 },
  cake: { mount: 'surface', size: 16 }, coffee: { mount: 'surface', size: 20 },
  /* Small things that were sitting on the carpet. A bottle of hand cream and a
     charity pot are objects you put down ON something, and the renderer draws
     that something under them — a one-tile worktop, exactly as it already did
     for the birthday cake. */
  misc: { mount: 'surface', size: 17 },

  /* Furniture, at furniture size. A 27px sofa next to a 58px person was the
     single thing that most made the two art styles argue with each other. */
  sofa: { size: 38 }, beanbag: { size: 29 }, bike: { size: 42 },
  lift: { size: 33 }, vend: { size: 31 }, fridge: { size: 29 },
  server: { size: 28 }, cab: { size: 26 }, cooler: { size: 25 },
  printer: { size: 25 }, booth: { size: 25 }, trolley: { size: 23 },
  step: { size: 23 }, oldpc: { size: 22 }, spread: { size: 22 },
  heap: { size: 20 }, recep: { size: 19 },

  /* Drawn as real furniture by the renderer, so the emoji would be a second
     table sitting on the first. A cubicle draws its own stall; the pan inside
     it is drawn too, because 🚽 at 19px in a room of tiled art was the last
     emoji in the toilets that still read as an emoji. */
  table: { drawn: true }, loo: { size: 24, sprite: 'loo.pan', art: 'loo' },

  /* `sprite` names a rect in the world atlas. The emoji stays underneath as
     the fallback for a page opened without art/, and as the face in the
     dialogue box — a printer you are talking to is allowed to be 🖨️. Listed
     last so they win the merge. */
  printer: { size: 24, sprite: 'obj.printer' },
  cooler: { size: 24, sprite: 'obj.cooler' },
  fridge: { size: 29, sprite: 'obj.fridge' },
  /* Smaller than the square it stands in, everywhere in the game. */
  bin: { size: 20, sprite: 'obj.bin', ground: [0.62] },
  coffee: { size: 20, sprite: 'obj.coffee' },
  pc: { size: 20, sprite: 'obj.laptop' },
  /* The desk phone stays emoji: the kit's is a rotary phone, and ☎️ reads as a
     desk phone at a glance. Kit art is not automatically an upgrade — but pick
     a cell before writing an asset off. The planter was dismissed here on
     column 0 (a wooden trough); column 4 is a spider plant in a pot. */
  plant: { size: 24, sprite: 'obj.planter', ground: [0.62] },
  vend: { size: 31, sprite: 'obj.vend' },
  box: { size: 22, sprite: 'obj.boxes' },
  cupboard: { size: 26, sprite: 'obj.cabinet' },
  paper: { mount: 'surface', size: 15, sprite: 'obj.paper' },
  chair: { sprite: 'obj.chair' },
  cab: { size: 26, sprite: 'obj.cabinet' },
  book: { size: 20, sprite: 'obj.shelf' },
  sink: { mount: 'surface', size: 17, sprite: 'obj.sink' },
  /* A rectangle of kit art that was packed into the atlas and then never asked
     for: 🪞 at 20px is an oval, and this one is a mirror. (Its neighbour
     `wall.graffiti` is a spray-painted tag, and the graffiti in this building
     is biro — see the act. Drawn instead, and the kit's stays unused.) */
  mirror: { mount: 'wall', size: 20, sprite: 'wall.mirror' },
  /* Still drawn rather than sprited, and deliberately: the graffiti in this
     BUILDING is biro on a cubicle door — see the act — and a spray-painted tag
     is the wrong instrument for it. The three walls out on the streets say
     otherwise one at a time, with a `furn` of their own carrying a tag off
     town.png and the `paint` flag that lets it hang on a wall you are not
     looking square at. See LEVELS.outside. */
  graf: { mount: 'wall', size: 20, art: 'graf' },
  sofa: { size: 38, sprite: 'obj.sofa' },
  mugs: { mount: 'surface', size: 16, sprite: 'obj.mug' },
  trolley: { size: 26, sprite: 'obj.trolley' },
  beanbag: { size: 30, sprite: 'obj.ottoman' },
  cake: { mount: 'surface', size: 18, sprite: 'obj.cake' },
  /* The one wall-mounted thing in here that is a machine rather than a flat
     picture, so it keeps its mount and takes a sprite like the mirror does. */
  tv: { mount: 'wall', size: 25, sprite: 'wall.tv' },

  /* Outdoors. A puddle is flat and lies under everything; the shopfront hangs
     on the wall behind it, which out here is the front of the parade rather
     than a partition.
     There is no `car` here any more and that is the point: a car is not
     furniture. It has a heading, a speed and somebody in it, it is on the map
     at a pixel rather than on a tile, and it lives in a level's `cars:` list
     and in engine/cars.js. What was three emoji standing in a car park is now
     three cars parked in one. */
  /* A bench is longer than it is deep, and a barrier is a pole across a gap:
     both are things you get round the end of rather than square blocks. */
  bench: { size: 30, ground: [0.86, 0.4] }, barrier: { size: 26, ground: [0.8, 0.34] },
  puddle: { size: 22 },
  shop: { mount: 'wall', size: 27 },
  /* THE GLASS. Not the shop — the shop is the sign over the door and it keeps
     the emoji that says which shop it is, because a sash window does not tell
     you whether you are outside a launderette or a bookmaker's. This is the
     frontage either side of it: a window in the wall, and the same window lit
     from inside once the streetlights come on, which R.spriteOf() swaps in.
     Walk back up the High Street at half four in December and the parade is
     lit. Scenery, so it never blocks the pavement. */
  shopwin: { mount: 'wall', size: 20, sprite: 'shop.window', lit: 'shop.window.lit' },
  /* Redeclared from the wall-mounted block at the top of this table, and only
     to add a footprint: a sign with a wall behind it hangs on the wall, and a
     sign with nothing behind it — a bus stop, a car park sign — stands on a
     post, and the post is the only part of it on the floor. */
  sign: { mount: 'wall', size: 18, art: 'sign', ground: [0.36] },
  /* Real kit art, same town.png as the ground and the wall it stands
     against. A wheelie bin is not the world atlas's `obj.bin` — that one is
     the small kitchen-sized pedal bin every indoor room already uses, and
     doubling it up outdoors would put the same object in two sizes on
     screen at once. */
  /* A post. Three metres of it, and you could walk a trolley round it. */
  lamp: { size: 34, sprite: 'obj.lamppost', ground: [0.34] },
  /* A hanging board, for a shopfront that finally has a wall to hang it on —
     see LEVELS.outside's High Street room. */
  shopsign: { mount: 'wall', size: 24, sprite: 'sign.board' },
  /* A gully in the kerb. Flat, walkable, driveable, and drawn UNDER the
     kerb line rather than over it — R.kerbs() runs after the floor and before
     anything that stands on it, which is where a drain belongs. */
  drain: { size: 20, sprite: 'obj.drain' },
  /* A tree, and the only thing that STANDS in this game that knows what month
     it is. `sprites` rather than `sprite`, resolved through Sky.season() by
     R.spriteOf() exactly as SURFACES.grass's `tiles` are resolved by
     R.floorTile(): blossom in spring, green in summer, red in autumn, and bare
     with snow lying along the branches in winter — before the weather has
     drawn a flake of its own over the top of it.

     The footprint is the lamppost's, and for the lamppost's reason: what is in
     your way is a trunk eleven pixels wide, not the three tiles of canopy over
     it. A tree you had to walk around the shadow of would be a hedge. */
  tree: {
    size: 34, ground: [0.34],
    sprites: { spring: 'obj.tree.spring', summer: 'obj.tree.summer',
               autumn: 'obj.tree.autumn', winter: 'obj.tree.winter' }
  },
  /* A GIVE WAY sign on its post. Standing in its own right rather than hung on
     anything, so it keeps a post's footprint and not a sign's: what is in your
     way is 4 pixels of galvanised tube. */
  roadsign: { size: 24, sprite: 'sign.giveway', ground: [0.28] },
  /* Tyres nobody is coming back for. */
  tyres: { size: 26, sprite: 'obj.tyres', ground: [0.72, 0.5] },
  /* The green one, which goes out on a different day. */
  recycling: { size: 24, sprite: 'obj.recycling', ground: [0.55] },
  /* A cone. Not a barrier — a barrier is a pole across a gap and you get round
     the end of it; a cone is a thing on the ground you walk round, and there
     is usually more than one of them and no sign of anybody working. */
  cone: { size: 20, sprite: 'obj.cone', ground: [0.5] },
  /* A manhole cover. Flat, walkable, driveable and drawn with the drains,
     which is where anything set INTO the road belongs. */
  manhole: { size: 20, sprite: 'obj.manhole' },
  /* Its own kind rather than another `trolley`: this table is a literal and
     the last key wins, so reusing the name would quietly turn the fourth
     floor's tea trolley into a supermarket one. */
  shoptrolley: { size: 26, sprite: 'obj.shoptrolley', ground: [0.7, 0.5] },
  /* `fromCar` is read by Interact.scan and by nothing else: it means this is a
     thing you are meant to reach WITHOUT getting out, so while you are driving
     it takes the E key off the door handle. One flag rather than the engine
     learning what a drive-thru is, so the next one — a car wash, a barrier
     with an intercom — is a furnishing and not a special case. */
  drivethru: { mount: 'wall', size: 26, art: 'sign', fromCar: true },
};

const ROOM_DEFS = [
  { z: 'corridor', r: [14, 10, 62, 13] },
  { z: 'main',     r: [14, 15, 49, 34] },
  { z: 'brk',      r: [2, 16, 12, 27] },
  { z: 'training', r: [2, 29, 12, 40] },
  { z: 'archive',  r: [2, 3, 12, 13] },
  { z: 'manage',   r: [44, 2, 62, 8] },
  { z: 'meet',     r: [16, 2, 27, 8] },
  { z: 'well',     r: [31, 2, 42, 8] },
  { z: 'toilet',   r: [51, 15, 62, 24] },
  { z: 'it',       r: [51, 26, 62, 34] },
  { z: 'lobby',    r: [20, 36, 43, 42] },
  { z: 'fire',     r: [14, 36, 18, 42] }
  /* The secret room used to be here, at [54,37,62,42]: a sealed nine-by-six in
     the corner of this grid that nothing could walk to, which is exactly the
     fifty-one tiles the flood fill could never account for. It is LEVELS.
     basement now — a place you go down to rather than a hole in this floor. */
];

const DOOR_DEFS = [
  { x: 13, y: 21, z: 'brk',      name: 'Break Room' },
  { x: 13, y: 34, z: 'training', name: 'Training Room' },
  { x: 13, y: 11, z: 'archive',  name: 'Archive' },
  { x: 50, y: 19, z: 'toilet',   name: 'Toilets' },
  { x: 50, y: 30, z: 'it',       name: 'IT & Server Room' },
  { x: 20, y: 14, z: 'corridor', name: 'Corridor' },
  { x: 21, y: 14, z: 'corridor', name: 'Corridor' },
  { x: 30, y: 35, z: 'main',     name: 'Main Floor' },
  { x: 31, y: 35, z: 'main',     name: 'Main Floor' },
  { x: 21, y: 9,  z: 'meet',     name: 'Meeting Room 2' },
  { x: 36, y: 9,  z: 'well',     name: 'The Wellbeing Room' },
  { x: 19, y: 39, z: 'fire',     name: 'Fire Escape' },
  { x: 52, y: 9,  z: 'manage',   name: 'Management Floor', locked: 'keycard' }
];

/* named spots used by NPC schedules */
const WP = {
  coffee: [3, 18], fridge: [8, 18], vend: [11, 19], breakTable: [4, 22], breakTable2: [8, 22],
  /* In front of the sink, not on it — a waypoint on a solid tile leaves whoever
     is walking to it shuffling into the basin until the stuck timer gives up
     and stands them in it. */
  looDoor: [52, 17], looSink: [52, 23], printer: [48, 17], board: [15, 16],
  /* Behind the security counter, which moved up a row to line up with
     reception. A waypoint inside a counter is a waypoint nobody reaches. */
  lobby: [30, 37], reception: [26, 39], corridor: [30, 12], lift: [22, 37],
  training: [7, 31], archive: [6, 8], serverRoom: [54, 31], mgmt: [50, 5], synergy: [60, 6],
  water: [15, 33], stationery: [48, 15],
  /* added with the new rooms */
  meetRoom: [22, 5], meetHead: [24, 4], wellRoom: [36, 5], beanbag: [34, 4],
  fireEsc: [16, 40], step: [17, 40], suggestionBox: [40, 3],
  booth: [11, 40], wallboard: [28, 33], goodChair: [40, 31], tin: [9, 18],
  hrCorner: [26, 12], trolleyPark: [60, 12], kettle: [5, 18]
};
