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
  /* THE LANDING, and it is the seven rows the lobby used to be drawn on.
     The building directory in the lobby has said FLOOR 3-5: CALLHALL SERVICES
     since the day it was written, and the lobby was on the same plan as the
     fourth floor, four tiles from the sea of desks, with a lift in it that did
     nothing. The lobby is the ground floor now — it is its own level — and what
     is left at the bottom of this floor is what is actually at the bottom of
     every floor of every office building in the country: a landing with a lift
     in it, a door to the stairs, a water cooler, and a noticeboard nobody
     reads. Same carpet as the corridor, because it is the same carpet. */
  landing:  { name: 'The Landing',      floor: '#2d333f', alt: '#282e39', wall: '#1a1f28', tint: '#8d9bb5', tile: 'floor.carpet.dim', wtile: 'wall.drywall' },
  /* THE STAIRWELL, on every floor, and it is one zone rather than three because
     it is one stairwell: you can tell which floor you are on by what is through
     the door, and a stairwell that announced a different name on each landing
     would be three stairwells. Bare block and concrete — the one finish in this
     building nobody chose, because nobody was ever meant to see it. */
  stairwell: { name: 'The Stairwell',   floor: '#33373c', alt: '#2f3338', wall: '#1c1f23', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block' },
  /* The three rooms the ground floor is actually made of. It was one thirty by
     sixteen hall with the furniture round the edges and a thirteen-tile square
     of nothing in the middle of it, which is not a lobby, it is a car park with
     a sofa in it. A lobby is a way in, a desk across the way in, and a lift
     lobby behind the desk that you are not supposed to reach without passing
     it. */
  entrance: { name: 'Reception',        floor: '#333c4a', alt: '#2e3643', wall: '#1c2330', tint: '#4da3ff', surf: 'stone', tile: 'floor.diamond', wtile: 'wall.drywall' },
  liftlob:  { name: 'The Lift Lobby',   floor: '#303a48', alt: '#2b3441', wall: '#1a212d', tint: '#4da3ff', surf: 'stone', tile: 'floor.diamond', wtile: 'wall.drywall' },
  postrm:   { name: 'The Post Room',    floor: '#343a36', alt: '#2f3531', wall: '#1d2220', tint: '#5ad48a', surf: 'vinyl', tile: 'floor.sub', wtile: 'wall.drywall' },
  /* And the two the fifth floor is made of. The Area Manager does not sit in
     an open-plan office; that is the whole of what being the Area Manager is
     for, and drawing him a desk in the middle of one was the same category
     error as drawing his floor next to yours. */
  corner:   { name: 'The Corner Office', floor: '#43292c', alt: '#3d2427', wall: '#281618', tint: '#ff5f56', tile: 'floor.herring', wtile: 'wall.drywall' },
  board:    { name: 'The Boardroom',    floor: '#3a2c3e', alt: '#352738', wall: '#221926', tint: '#b48cff', tile: 'floor.carpet.vio', wtile: 'wall.drywall' },
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
  /* NOT A SHOP. The landing of the flats above the parade, and the only room
     out here that is somebody's home rather than somebody's trade — so it is
     the one interior with a carpet that was chosen by a landlord, lit by a
     bulb on a timer that is eleven seconds too short, and painted the colour
     every communal stairwell in England is painted, which is a colour with no
     name that everybody would recognise instantly. */
  flats:     { name: 'The flats above the parade', floor: '#4a4a44', alt: '#454540', wall: '#2a2a26', tint: '#ffb347', tile: 'floor.carpet.dim', wtile: 'wall.drywall' },
  /* Not a street: a walled car park with one way in, like the forecourt at the
     other end of town, and the only place out here big enough to find out what
     the pool car does above thirty. */
  retail:    { name: 'Bellhaven Retail Park', floor: '#484c53', alt: '#43474e', wall: '#32363c', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.brick' },

  /* ---- THE OTHER SIDE OF THE LINE ----------------------------------------
     Everything below is south of the railway, and the reason it is a block of
     its own is that it is a different town. The half you start in was built
     between 1968 and about 1994 and it is a business park, a parade and a
     retail shed; this half was here first. The difference is in two fields and
     they are the same two every time:

       wtile  'wall.stone' rather than 'wall.brick'. The mass between these
              streets is random-coursed rubble in the red the ground round here
              actually is, and it is the whole of why a lane down there reads as
              something cut through a town rather than as a gap between units.
       tile   still 'terrain.slab', because the council relaid the lot in 1997
              and the paving is the same paving as the parade's. That is not a
              shortcut, it is the joke: the one thing the two halves of this
              town have in common is the slabs.

     They are also a shade WARMER than anything north of the line — the whole
     northern half is blue-grey, and these carry a little of the stone. */
  stationrd: { name: 'Station Road',      floor: '#4b4d52', alt: '#46484d', wall: '#34363a', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.stone' },
  /* The platforms, and they are a zone rather than scenery because you can
     stand on them. Darker than a street: nobody has replaced a light down there
     since the line stopped calling. */
  platform:  { name: 'The old platforms', floor: '#43443f', alt: '#3e3f3a', wall: '#2a2b27', tint: '#ffb347', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.stone' },
  /* The one interior on this map that is not inside anything: a tiled tunnel
     under a railway, lit, on a level the sky cannot reach. The glazed tile is
     the toilets' — it is the only other place in this game finished in it, and
     it is finished in it for the same reason a subway is.
     Darker than the platforms it comes up onto, and that is doing the only
     work available: `wtile` is declared and is never drawn, because what is
     either side of this tunnel is not a wall of it, it is the ballast it goes
     under, and an open surface is skipped by the renderer's wall pass. So the
     one thing that can say UNDER is the floor, and it says it. */
  subway:    { name: 'The Subway',        floor: '#262b31', alt: '#22272d', wall: '#6e7c82', tint: '#4da3ff', surf: 'tile', wsurf: 'tile', tile: 'floor.tile', wtile: 'loo.wall' },
  /* THE OLD TOWN. Five places and no carriageway on any of them: this is the
     bit inside the wall, it was pedestrianised in 1988, and the signs at both
     ends say so — see the NO ENTRY furnishing. */
  priory:    { name: 'Priorygate',        floor: '#4e4d4a', alt: '#494845', wall: '#353431', tint: '#ffb347', surf: 'concrete', tile: 'terrain.slab', wtile: 'wall.stone' },
  shambles:  { name: 'The Shambles',      floor: '#4c4b46', alt: '#474641', wall: '#33322e', tint: '#ffb347', surf: 'concrete', tile: 'terrain.slab', wtile: 'wall.stone' },
  coopers:   { name: 'Cooper’s Lane', floor: '#47464a', alt: '#424145', wall: '#2f2e32', tint: '#8d9bb5', surf: 'concrete', tile: 'terrain.slab', wtile: 'wall.stone' },
  drapers:   { name: 'Drapers Lane',      floor: '#46454a', alt: '#414045', wall: '#2e2d32', tint: '#8d9bb5', surf: 'concrete', tile: 'terrain.slab', wtile: 'wall.stone' },
  pinfold:   { name: 'Pinfold Lane',      floor: '#454449', alt: '#403f44', wall: '#2d2c31', tint: '#8d9bb5', surf: 'concrete', tile: 'terrain.slab', wtile: 'wall.stone' },
  /* The two green ones, and they are green because a SURFACE says so — the
     same four-season grass the verge outside the building is laid in. What
     these two carry is the WALL either side of it, which is the point of
     having them at all. */
  green:     { name: 'Minster Green',     floor: '#4a4c46', alt: '#454741', wall: '#31332e', tint: '#5ad48a', surf: 'concrete', tile: 'terrain.slab', wtile: 'wall.stone' },
  castle:    { name: 'Castle Gardens',    floor: '#484a45', alt: '#434540', wall: '#2f312d', tint: '#5ad48a', surf: 'concrete', tile: 'terrain.slab', wtile: 'wall.stone' },
  /* THE ONE BUILDING ON THIS MAP MADE OF SOMETHING ELSE. A cathedral is not
     built out of the stone the wall round the town is built out of — it is
     built out of the stone somebody paid to have brought in — and the paved
     ring round it is a zone of its own for exactly one reason: a wall takes its
     finish from the room it faces, so the only way to say that the minster is
     pale and everything else is red is to give the minster its own pavement to
     be seen from. See the walk round it in LEVELS.outside. */
  minster:   { name: 'The Minster',       floor: '#51504b', alt: '#4c4b46', wall: '#373632', tint: '#ffb347', surf: 'stone', tile: 'terrain.slab', wtile: 'wall.stone.pale' },
  close:     { name: 'The Close',         floor: '#4a4944', alt: '#45443f', wall: '#31302c', tint: '#ffb347', surf: 'concrete', tile: 'terrain.slab', wtile: 'wall.stone' },
  /* Not a street and not a room: eight courses of steps between a town on a
     hill and a river at the bottom of it, and the only ground in this game
     that tells you which way is up. */
  steps:     { name: 'Fishers Steps',     floor: '#494b50', alt: '#44464b', wall: '#303237', tint: '#9fb3c8', surf: 'stone', tile: 'terrain.slab', wtile: 'wall.stone' },
  /* The two roads round the outside of the wall, which between them are the
     whole reason the old town has no cars in it. */
  quayrd:    { name: 'Quay Road',         floor: '#474951', alt: '#42444c', wall: '#2f3139', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.stone' },
  weirbank:  { name: 'Weirbank Road',     floor: '#464850', alt: '#41434b', wall: '#2e3038', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block', tile: 'terrain.slab', wtile: 'wall.stone' },
  /* The bottom of the town and the bottom of the map. Everything on it faces
     the water, which is the one thing on this map nobody built. */
  quay:      { name: 'The Quay',          floor: '#4c4a45', alt: '#474540', wall: '#33312d', tint: '#ffb347', surf: 'concrete', tile: 'terrain.slab', wtile: 'wall.stone' },

  /* FOUR INTERIORS, AND THEY NEEDED FOUR ZONES OF THEIR OWN.
     The first draft of the old town's shops borrowed the parade's: the
     bookshop stood on the bookmakers' violet carpet and the coffee place on
     the break room's wood, which cost nothing to look at and cost everything
     the moment you walked in — a zone's `name` is what UI.zone() puts across
     the screen, so the second-hand bookshop announced itself as BELLHAVEN
     BOOKMAKERS and the Market Hall as THE CHARITY SHOP. A room may share a
     floor with another room. It may not share its name.
     (The minster does not need one: it already has a zone, because the paved
     walk round the outside of it is that zone, and the inside and the outside
     of a cathedral being the same place is correct.) */
  books:     { name: 'The second-hand bookshop', floor: '#463c2e', alt: '#41372a', wall: '#2a231b', tint: '#ffb347', surf: 'vinyl', tile: 'floor.wood', wtile: 'wall.drywall' },
  caff:      { name: 'The coffee place', floor: '#4a3f33', alt: '#453a2f', wall: '#2b241d', tint: '#ffb347', tile: 'floor.herring', wtile: 'wall.drywall' },
  /* Carpet, red, and the darkest interior in the game that is not the
     basement: one bar, a beam at five foot ten, and a floor that is not level
     in any direction. */
  mitre:     { name: 'The Mitre',          floor: '#432a26', alt: '#3e2622', wall: '#281713', tint: '#ffb347', tile: 'floor.carpet', wtile: 'wall.stone' },
  /* Iron columns, a glazed roof and a stone floor, which is the one interior
     out here with daylight in it: it is finished in the ground the market
     square outside is finished in, because it is the market square with a
     roof on it. */
  market:    { name: 'The Market Hall',    floor: '#4e4c46', alt: '#494741', wall: '#343230', tint: '#ffb347', surf: 'stone', tile: 'terrain.slab', wtile: 'wall.stone' }
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
  },

  /* ---- GROUND YOU CANNOT STAND ON ----------------------------------------
     `open` is the whole of what makes these two different from everything
     above, and it is read by World.open() and by the three loops in
     engine/render.js that call it. Every other surface in this table lies over
     a room and a room is walkable; these lie over nothing at all, which until
     they existed meant a tile the renderer treated as the wall of a building
     and roofed. A river with slates on it was the entire reason for the flag.

     They are still solid. Nothing about collision changed, nothing about
     isSolid() changed, and you can no more walk into the water than you could
     walk into the car park wall — the difference is only that you can SEE what
     it is, which for half the bottom of this map is the point. */
  water: {
    tile: 'terrain.water',
    /* `alt` is the same as `floor`, for the road's reason and more so: the
       kit's water is a flat, even sheet, and a shade of alternation on it is
       not a ripple, it is a chessboard the size of the estuary. */
    floor: '#495c54', alt: '#495c54', map: '#22383a', open: true
  },
  rail: {
    tile: 'terrain.ballast',
    /* Granite chippings and a hundred years of brake dust. The tile is brown
       on the sheet and this is what takes it grey; it keeps a shade of
       alternation because unlike the road it HAS a grain, and the grain is
       what stops four hundred tiles of it reading as a car park. */
    floor: '#74787c', alt: '#6e7276', map: '#33302b', open: true
  },
  /* And two that are neither: steps are ground you walk on. Flat tints, like
     the road — three or four treads to the tile is pattern enough without every
     other tile of the flight being a different grey.

     `steps` is the outdoor one and is what Fishers Steps is laid in. `stair` is
     the indoor one: four concrete treads to the tile, tileable straight down a
     column, and laid in the stairwell of every floor of this building so that a
     flight reads as a flight instead of as one object standing on carpet. */
  steps: { tile: 'terrain.steps', floor: '#c2c8d0', alt: '#c2c8d0', map: '#6a717b' },
  stair: { tile: 'terrain.stair', floor: '#b8bec8', alt: '#b8bec8', map: '#50565f' }
};

/* THE BUILDING, VERTICALLY — what is behind the buttons in the lift car.
 *
 * This table exists because the lobby's own building directory has said
 *
 *     FLOOR 1-2: a dental practice, NORTHGATE and a Greggs
 *     FLOOR 3-5: CALLHALL SERVICES
 *     FLOOR 6:   (adhesive residue, unreadable, ends in a Y)
 *
 * since long before there was more than one floor to stand on. For a year the
 * whole of it — the reception you walk in through, the floor you work on, and
 * the Management Floor with a keycard on the door — was drawn on one plan, side
 * by side, seven tiles apart, and the first job the game ever gives you is
 * "Find the fourth floor". You could see it from where you were standing.
 *
 * They are three levels now and this is the order of the buttons.
 *
 *   b     what is written on the button
 *   via   the LINK to take, exactly as every other way out of a room does it —
 *         the link table in data/levels.js is still the only thing that says
 *         where anything goes, so a floor that moves moves in one place
 *   name  what the directory calls it
 *   key   a flag on G.flags without which the button lights and nothing happens
 *   dead  a button that is not connected to anything, with the reason
 *
 * A button whose `via` resolves to no link on the level you are standing on is
 * the floor you are already on, and is drawn as such. That is why there is no
 * "which floor am I on" field: the link table already knows. */
const FLOORS = [
  { b: '5', via: 'liftTo5', name: 'Management', key: 'keycard' },
  { b: '4', via: 'liftTo4', name: 'Operations' },
  /* THE THIRD FLOOR. CallHall has had it since 2009 and gave it up in the
     restructure, which is the same restructure reception has been unstaffed
     since. The button is still in the car with a strip of DYMO tape over it,
     because taking a button out of a lift is a job for a lift engineer and
     putting tape on one is a job for anybody. */
  { b: '3', via: null, name: 'CallHall Services', dead: 'taped over' },
  { b: 'G', via: 'liftToG', name: 'Reception' },
];

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
/* `shape` names an entry in R.CARSHAPES and decides the silhouette: a bus is
   not a long car and a van is not a wide one, and drawing all three from one
   outline was why the 41 read as a saloon somebody had stretched. Saying
   nothing means `car`, which is seven of the nine.

   `trim` is the bumpers. It has been on every entry here since the table
   existed and was read by nothing at all until now.

   `sign` and `roofSign` are two details the writing had already committed to:
   the pool car's magnetic door sign that has slid, described in its own
   comment below, and the light on a taxi. */
const CARS = {
  /* The pool car. The only one in the county with a magnetic door sign that
     has slid, and the only one in this car park you are allowed to move. */
  pool:  { len: 84, wid: 35, top: 232, acc: 150, grip: 5.5, turn: 2.5, body: '#b9bec4', roof: '#8d949c', trim: '#33383e', sign: true },
  hatch: { len: 78, wid: 34, top: 265, acc: 190, grip: 6.2, turn: 2.9, body: '#7d2f34', roof: '#5e2327', trim: '#2b2f33' },
  estate:{ len: 93, wid: 36, top: 245, acc: 160, grip: 5.2, turn: 2.3, body: '#2f4a6b', roof: '#243a54', trim: '#2b2f33' },
  van:   { len: 105, wid: 39, top: 210, acc: 120, grip: 4.4, turn: 2.0, body: '#d8d5cc', roof: '#c2bfb5', trim: '#3a3a38', shape: 'van' },
  /* Traffic. Ordinary cars in ordinary colours, so that what goes past the
     Greggs is not obviously the same car eight times. */
  saloon:{ len: 84, wid: 35, top: 220, acc: 150, grip: 5.5, turn: 2.4, body: '#3f5a44', roof: '#31462f', trim: '#2b2f33' },
  taxi:  { len: 84, wid: 35, top: 230, acc: 165, grip: 5.5, turn: 2.5, body: '#c9a227', roof: '#a8871f', trim: '#2b2f33', roofSign: true },
  small: { len: 69, wid: 33, top: 250, acc: 200, grip: 6.5, turn: 3.1, body: '#5a5f8a', roof: '#464a6b', trim: '#2b2f33' },
  /* The 41A. Long enough that it has to slow right down for a corner and take
     the whole width of the junction to get round one, which is the point of
     having one on the network at all — and it does not stop at the bus stop,
     which is the thing the bus stop has said about the 41A since long before
     there was a road for it to not stop on. */
  bus:   { len: 144, wid: 42, top: 175, acc: 95, grip: 3.6, turn: 1.9, body: '#8d3a3f', roof: '#f0ece2', trim: '#2b2f33', shape: 'bus' }
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
  /* The clock is a cased wall clock now rather than a mantel-clock emoji, and
     the hands on it do not move. See tools/sheets/wood.mjs: the game tells
     the time in four other places and a clock on a wall is a thing in a
     room. It is the one sprite in this file that is not part 2 — its own
     sheet, its own licence, and nothing here has to know that. */
  clock: { mount: 'wall', size: 19, sprite: 'wall.clock' }, mirror: { mount: 'wall', size: 20 },
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
  vend: { size: 31 }, fridge: { size: 29 },
  server: { size: 28 }, cab: { size: 26 }, cooler: { size: 25 },
  printer: { size: 25 }, booth: { size: 25 }, trolley: { size: 23 },
  step: { size: 23 }, oldpc: { size: 22 }, spread: { size: 22 },
  heap: { size: 20 }, recep: { size: 19 },

  /* THE LIFT AND THE STAIRS, both drawn — see the two cases in R's art
     switch. A lift is a recess with two steel leaves, a seam, a call plate and
     a light showing where the car is, and the kit this game pins has none of
     those five things in it because the kit is mediaeval. The light is the part
     that is not decoration: it reads Lifts.at(), and the car really is on a
     floor.
     Both hang on nothing and stand on the floor: a lift is a hole in a wall but
     what is in your way is the doorway, which is most of a tile. */
  lift: { size: 34, art: 'lift', ground: [0.86, 0.34] },
  /* THE STAIRS, and they are kit art now rather than three rectangles and a
     rail drawn in a canvas context. The search for stair art stopped the first
     time at `Short Steps A`, which is the outdoor step Fishers Steps is laid
     in; `Cement Stairs A` was in the same folder and is a concrete flight, four
     treads to the tile, which is what the inside of an office stairwell is.
     The flight underfoot is the same crop laid as a SURFACE — see
     SURFACES.stair — so the object is the top of a real flight rather than a
     picture of one standing on carpet. */
  stairs: { size: 32, sprite: 'terrain.stair', ground: [0.86, 0.6] },
  /* Nine steel pigeonholes on a wall. Both banks of these in the game were an
     emoji: the post on the ground floor, and the six bells beside the door to
     the flats over the parade. */
  pigeonholes: { mount: 'wall', size: 26, sprite: 'wall.pigeonholes' },
  /* The single pedestal desk somebody has because they are not on a bank of
     them. There are two in this building and R.desks() draws neither: it draws
     the thirty-two on the fourth floor, properly, and should go on doing it. */
  deskbig: { size: 40, sprite: 'obj.desk.office', ground: [0.94, 0.62] },
  /* A timber counter, for the two places in this game with one: the bar of The
     Mitre and the pitches in the Market Hall. */
  woodcounter: { size: 30, sprite: 'obj.counter.wood', ground: [0.94, 0.5] },

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
  bench: { size: 30, sprite: 'obj.bench', ground: [0.86, 0.4] },
  barrier: { size: 26, ground: [0.8, 0.34] },
  puddle: { size: 22 },
  /* THE SIGN OVER THE DOOR, which is what a shop's emoji has always been and
     what `high` finally says out loud. It hangs on the fascia rather than at
     handle height, because there is a door under it now — see LEVELS.outside's
     doors and the `high` test in R's object pass. Before those, the whole
     frontage was this emoji and it could hang wherever it liked. */
  shop: { mount: 'wall', size: 27, high: 1.78 },
  /* THE GLASS, and it is a shopfront at last — see tools/sheets/frontage.mjs.

     This has been wrong twice. It was the office's `wall.mirror`, thirty-two by
     twenty-three of landscape pane with a diagonal across it, which on a
     two-tile wall read as exactly what it was. Then it was `shop.window`, a
     tall sash off a castle-window sheet, which filled the wall and read as the
     front of a terraced house — because a sash is the front of a terraced
     house. Neither kit had a shopfront in it.

     One does now: two tiles across, mullioned, on a stall riser, with a painted
     timber frame and a lintel, in four colourways picked off the tile. `tones`
     rather than `sprite` is what does the picking — see R.spriteOf() — and it
     is the same hash the doors use, so a unit's glass and its door were painted
     by the same person in the same decade.

     No `lit` any more, and that is the other half of it. The parade used to
     come on at dusk by swapping every window for a second copy of itself with
     yellow behind the panes: one brightness, no falloff, and a sheet carrying
     two of everything so one of them could be on. It is drawn now, in
     R.lamps(), as what a lit window actually is — a warm room seen through
     glass, brightest at the middle of the pane. Which works on any window in
     any colourway, and let three of the four arrive for free. */
  shopwin: { mount: 'wall', size: 20, high: 1.5,
    tones: ['shop.win.maroon', 'shop.win.cream', 'shop.win.gold', 'shop.win.slate'] },
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

  /* ---- THE OLD TOWN AND THE QUAY ----------------------------------------
     Seven kinds, seven sprites, all of them from the two street sheets and all
     of them here for the same reason the lamppost and the tree are: the half
     of this map south of the railway is made of things the half north of it
     has none of, and an emoji is a poor sixteenth of a drinking fountain.

     Every one of them takes a footprint smaller than the square it stands in,
     which is the rule at the top of this table and matters more down there
     than anywhere else on the map: the lanes in the old town are three tiles
     wide and two of those are usually the only way through. */
  /* Two tiles of basin and a metre of nothing above it. What is in your way is
     the plinth, which is about two thirds of a tile. */
  fountain: { size: 46, sprite: 'obj.fountain', ground: [0.68, 0.5] },
  /* Three of them stacked, which is goods rather than scenery. Wider than deep
     for the same reason a bench is: you go round the end of a stack. */
  barrels: { size: 32, sprite: 'obj.barrels', ground: [0.82, 0.58] },
  crate: { size: 24, sprite: 'obj.crate', ground: [0.68] },
  /* The municipal trough. A town centre puts these down the middle of a street
     the day it stops letting cars up it, and then the street has to be walked
     round them ever afterwards, which is why the footprint is nearly the whole
     tile across and half of it deep. */
  trough: { size: 30, sprite: 'obj.trough', ground: [0.8, 0.46] },
  /* Post and rail. A run of fence is the length of the tile and no depth at
     all, and the depth is the number that matters: a fence you had to walk a
     tile's width around would be a hedge. */
  fence: { size: 30, sprite: 'obj.fence', ground: [0.96, 0.26] },
  /* Two more signs on two more posts, and both keep the give way's footprint,
     because what is in your way is four pixels of galvanised tube. */
  noentry: { size: 24, sprite: 'sign.noentry', ground: [0.28] },
  signals: { size: 34, sprite: 'sign.signals', ground: [0.24] },
  /* WROUGHT IRON, two tiles of it at a time. Same argument as the fence above
     and then one further: railings go round things, so they are laid in runs
     of two tiles and the sprite is cut to join to itself at that pitch — see
     tools/sheets/town.mjs. The footprint is one tile's worth of nothing much,
     because what is in your way is a row of bars. */
  railing: { size: 30, sprite: 'obj.railing', ground: [0.96, 0.22] },
  /* THREE THINGS OFF THE VICTORIAN SHEET, which is LICENSE part 4 and its own
     PNG and nothing here has to know either fact. They are all for the old
     town: a pillar box, a fluted cast-iron litter bin and a public clock on a
     post. The modern half keeps the wheelie bins it deserves. */
  postbox: { size: 28, sprite: 'obj.postbox', ground: [0.5] },
  ironbin: { size: 26, sprite: 'obj.bin.iron', ground: [0.62] },
  streetclock: { size: 34, sprite: 'obj.streetclock', ground: [0.3] },
  /* A minster window: two tiles tall, in stone, and pointed. Hung like every
     other thing on a wall, which means the north face and nowhere else — the
     renderer falls back to the emoji on the other three sides, and there is
     nothing to fall back to here, so these go on north walls only. */
  gothicwin: { mount: 'wall', size: 30, sprite: 'wall.window.stone', high: 1.9 },
  /* A clump of bedding plants. White by default and red where a bed says so —
     one colour laid the whole length of a border is a stamp, and two alternated
     is a border. Nothing to walk into: a flower bed is ankle high and the
     ground under it is the ground. */
  flowers: { size: 26, sprite: 'obj.flowers.white' },
};

/* THE FOURTH FLOOR'S OWN ROOMS, and Management is not among them any more.
   It was [44,2,62,8] — nineteen tiles of Management Floor with a keycard door
   on it, across a corridor from the sea of desks — and it is LEVELS.five now.
   What the corridor points at is a lift. */
const ROOM_DEFS = [
  { z: 'corridor', r: [14, 10, 62, 13] },
  { z: 'main',     r: [14, 15, 49, 34] },
  { z: 'brk',      r: [2, 16, 12, 27] },
  { z: 'training', r: [2, 29, 12, 40] },
  { z: 'archive',  r: [2, 3, 12, 13] },
  { z: 'meet',     r: [16, 2, 27, 8] },
  { z: 'well',     r: [31, 2, 42, 8] },
  { z: 'toilet',   r: [51, 15, 62, 24] },
  { z: 'it',       r: [51, 26, 62, 34] },
  { z: 'landing',  r: [20, 36, 43, 42] },
  { z: 'fire',     r: [14, 36, 18, 42] }
  /* The secret room used to be here, at [54,37,62,42]: a sealed nine-by-six in
     the corner of this grid that nothing could walk to, which is exactly the
     fifty-one tiles the flood fill could never account for. It is LEVELS.
     basement now — a place you go down to rather than a hole in this floor. */
];

/* The keycard door into Management is gone from this list and is not coming
   back: Management is the FIFTH FLOOR now, which is what the directory in the
   lobby has always said, and you do not get to it through a door in a wall on
   the fourth. The keycard still gates it — it gates the button in the lift.
   See FLOORS above and Acts.lift(). */
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
  { x: 19, y: 39, z: 'fire',     name: 'Fire Escape' }
];

/* NAMED SPOTS USED BY NPC SCHEDULES, and now by three people who have to get
   in a lift to reach theirs.

   A waypoint is [x, y] on the hub — the fourth floor — exactly as it always
   was. A waypoint on ANOTHER FLOOR is [x, y, levelId], and the third element is
   the whole of the change: NPCM.wpLevel() reads it, the schedule handler
   notices when it is not the floor somebody is standing on, and they go and
   wait for the lift like anybody else. Everything else that reads this table
   takes w[0] and w[1] and never asked how long the array was.

   Two-element means the hub. That is not a default anybody has to remember: it
   is the state every one of these was already in. */
const WP = {
  coffee: [3, 18], fridge: [8, 18], vend: [11, 19], breakTable: [4, 22], breakTable2: [8, 22],
  /* In front of the sink, not on it — a waypoint on a solid tile leaves whoever
     is walking to it shuffling into the basin until the stuck timer gives up
     and stands them in it. */
  looDoor: [52, 17], looSink: [52, 23], printer: [48, 17], board: [15, 16],
  /* DOWNSTAIRS. Ron is on the door on the ground floor, which is a different
     level, so his waypoint says so. Behind the security counter rather than in
     it: a waypoint inside a counter is a waypoint nobody reaches. */
  lobby: [15, 7, 'ground'], reception: [11, 7, 'ground'],
  corridor: [30, 12], lift: [22, 37],
  training: [7, 31], archive: [6, 8], serverRoom: [54, 31],
  /* UPSTAIRS. The Management Floor is the fifth floor and always was — it is
     on the directory in the lobby. Two people work up there and one comes down
     twice a day, and all three of them now do it in the lift. */
  mgmt: [5, 5, 'five'], synergy: [24, 13, 'five'],
  water: [15, 33], stationery: [48, 15],
  /* added with the new rooms */
  meetRoom: [22, 5], meetHead: [24, 4], wellRoom: [36, 5], beanbag: [34, 4],
  fireEsc: [16, 40], step: [17, 40], suggestionBox: [40, 3],
  booth: [11, 40], wallboard: [28, 33], goodChair: [40, 31], tin: [9, 18],
  hrCorner: [26, 12], trolleyPark: [60, 12], kettle: [5, 18]
};
