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
     one level the renderer does not put a ceiling on. Both are breeze block at
     the boundary: out here that is a car park wall rather than a plant room. */
  forecourt: { name: 'The Forecourt',   floor: '#4a4e56', alt: '#45494f', wall: '#33373d', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block' },
  street:    { name: 'Bellhaven Road',  floor: '#42454c', alt: '#3d4046', wall: '#2e3137', tint: '#9fb3c8', surf: 'concrete', wsurf: 'block' }
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
   can know which fire extinguisher is propping the fire door open. */
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
  bin: { size: 20, sprite: 'obj.bin' },
  coffee: { size: 20, sprite: 'obj.coffee' },
  pc: { size: 20, sprite: 'obj.laptop' },
  /* The desk phone stays emoji: the kit's is a rotary phone, and ☎️ reads as a
     desk phone at a glance. Kit art is not automatically an upgrade — but pick
     a cell before writing an asset off. The planter was dismissed here on
     column 0 (a wooden trough); column 4 is a spider plant in a pot. */
  plant: { size: 24, sprite: 'obj.planter' },
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
  graf: { mount: 'wall', size: 20, art: 'graf' },
  sofa: { size: 38, sprite: 'obj.sofa' },
  mugs: { mount: 'surface', size: 16, sprite: 'obj.mug' },
  trolley: { size: 26, sprite: 'obj.trolley' },
  beanbag: { size: 30, sprite: 'obj.ottoman' },
  cake: { mount: 'surface', size: 18, sprite: 'obj.cake' },
  /* The one wall-mounted thing in here that is a machine rather than a flat
     picture, so it keeps its mount and takes a sprite like the mirror does. */
  tv: { mount: 'wall', size: 25, sprite: 'wall.tv' },

  /* Outdoors. A car is the largest object in the game and has to read as one
     next to a 58px person; a puddle is flat and lies under everything. The
     shopfront hangs on the wall opposite, which out here is the far side of
     the road rather than a partition. */
  car: { size: 40 }, bench: { size: 30 }, barrier: { size: 26 },
  puddle: { size: 22 }, shop: { mount: 'wall', size: 27 },
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
