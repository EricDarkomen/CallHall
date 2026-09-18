/* EVERY LEVEL, EVERY TIME, WITHOUT OPENING ONE.
 *
 * Dev-time only, and not shipped. The editor already asks the questions in
 * here — editor/validate.js, on every edit — but it asks them of the ONE level
 * somebody has opened, and nobody opens twenty-four of them. So the faults it
 * is best at are exactly the ones that ship: a lobby whose lift lobby was cut
 * off from its own front door for eight releases, because the flood fill that
 * would have said so in half a second was never run on that level by anybody.
 *
 * It builds every entry in data/levels.js with the REAL engine/world.js and
 * asks each one:
 *
 *   IS IT ONE PLACE. How many separate pieces the walkable floor is in, and
 *   which arrival points are in which. Two pieces with an entry each is a
 *   building with a sealed room in it however you arrived; a piece with no
 *   entry in it is floor nobody can ever stand on.
 *
 *   CAN YOU GET TO THE THINGS. Every arrival point, every waypoint a colleague
 *   walks to, and every object carrying a `use:` — asked against what can be
 *   reached from an arrival point rather than against the map, because "there
 *   is floor next to it" and "there is floor next to it you can get to" are
 *   different questions and only the second one matters.
 *
 *   DOES THE CATALOGUE AGREE WITH ITSELF. Links that name a level or an
 *   arrival point that is not there, `use:` handlers that data/acts.js does
 *   not have, sprites that art/sprites/manifest.js does not describe, zones,
 *   surfaces and car models that data/world.js does not declare. Every one of
 *   those is a typo that costs nothing to make and shows up as a door that
 *   silently does nothing, or a thing drawn as an emoji nobody meant.
 *
 *   node tools/levelcheck.mjs            every level
 *   node tools/levelcheck.mjs ground     one of them
 *
 * Exit code 1 if anything is an ERROR, so scripts/release.sh can refuse.
 * Warnings are things that will bite later and do not stop a release.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const ONLY = process.argv[2] || null;

/* ---- the stub page --------------------------------------------------------
   The same browser's worth of nothing the other three harnesses use: a
   document to query and a media query to answer, because engine/core.js reads
   both on its way past and neither is what is being asked about. */
const ctx = vm.createContext({ console });
ctx.window = ctx;
ctx.document = {
  querySelector: () => null,
  body: { classList: { toggle() {} } },
  createElement: () => ({ getContext: () => ({}) })
};
ctx.matchMedia = () => ({ matches: false });
ctx.addEventListener = () => {};
ctx.requestAnimationFrame = () => {};
ctx.localStorage = { getItem: () => null, setItem() {} };
vm.runInContext(`
  var __seed = 12345;
  Math.random = () => (__seed = (__seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
`, ctx);

const load = rel => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });

/* In the order index.html loads them, because they read each other in that
   order. data/acts.js is here for its handler NAMES — nothing calls one. */
load('art/sprites/manifest.js');
load('data/world.js');
load('data/levels.js');
load('data/outskirts.js');
load('data/island.js');
load('data/npcs.js');
load('data/items.js');
load('engine/core.js');
load('engine/world.js');
load('engine/collide.js');
/* Everything a built level talks to and none of it what is being asked about:
   the noise, the particles, the toasts, the colleagues, the player. */
vm.runInContext(`
  var G = { state: 'play', flags: {}, quests: {} };
  var P = { x: -9999, y: -9999, dir: 2, moving: false };
  var NPCM = { list: [] };
  var Sprites = { dirOf: () => 0 };
  var Sfx = { on: false, horn(){}, thud(){}, scrape(){}, door(){}, deny(){}, engine(){}, bleep(){}, blip(){} };
  var FX = { motion: false, shake(){}, parts: [] };
  var UI = { toast(){}, objective(){} };
  var Ach = { get(){} };
  var Q = { active: () => false, has: () => false };
  var Item = { has: () => false };
  var Rel = { get: () => 0 };
  var Arcade = { cabinets: () => [] };
  var Dialogue = { say(){}, on: false };
  var Levels = { take(){}, links: () => null };
  var Lifts = { at: () => 'G', send(){} };
  var Sky = { working: () => true, dark: () => false, season: () => 'autumn', kind: () => ({}), lampsOn: () => false };
  var Keys = { up: 0, down: 0, left: 0, right: 0 };
  var Stick = { on: false, x: 0, y: 0 }, Throttle = { on: false, y: 0 };
  var Cam = { x: 0, y: 0, w: 800, h: 600, visible: () => false };
  function releaseSticks(){} function count(){} function playerFits(){ return true; } function zoneCheck(){}
  function clockStr(){ return ''; }
`, ctx);
load('engine/cars.js');
load('engine/peds.js');
load('engine/signals.js');
load('data/acts.js');

const g = name => vm.runInContext(name, ctx);
const { LEVELS, World, ZONES, SURFACES, CARS, FURN, WP, FLOORS, Acts, SPRITE_ATLAS } = {
  LEVELS: g('LEVELS'), World: g('World'), ZONES: g('ZONES'), SURFACES: g('SURFACES'),
  CARS: g('CARS'), FURN: g('FURN'), WP: g('WP'), FLOORS: g('FLOORS'),
  Acts: g('Acts'), SPRITE_ATLAS: g('SPRITE_ATLAS')
};

/* Every rect the atlas describes, by name. A sheet of CHARACTERS has no
   `sprites` on it — it is frames and rows — and nothing names one of those as
   a piece of furniture, so an absent table is an empty one. */
const SPRITES = new Set();
for (const sh of SPRITE_ATLAS.sheets) for (const k in (sh.sprites || {})) SPRITES.add(k);
/* The cases in R.wallArt(). A name that is not one of them draws nothing at
   all, which on screen is an object that is simply missing. */
const ART = ['poster', 'board', 'chart', 'window', 'screen', 'roll', 'sign',
  'dryer', 'loo', 'graf', 'lift', 'stairs', 'ledger'];
/* Two kinds stand up on their own — R.wallArt() draws a little stand under a
   `sign`, and a pigeon on the road is a pigeon. Same list as the editor's. */
const FREESTANDING = ['sign', 'pigeon'];

/* EVERY Levels.take('...') ANYBODY WRITES. A link is usually taken by an
   object whose handler is the link, but a frontage with no door object at all
   — the Greggs across the road — calls take() from inside its own act, and a
   scan for the literal is the only way to see that from here. Read off the
   text rather than the loaded object, because a call inside a function body
   has not run and never will here. */
const TAKEN = new Set();
for (const f of ['data/acts.js', 'data/npcs.js', 'data/office.js', 'data/items.js', 'data/callers.js']
  .concat(fs.readdirSync(path.join(ROOT, 'engine')).map(n => 'engine/' + n))) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of src.matchAll(/Levels\.take\(\s*'([^']+)'/g)) TAKEN.add(m[1]);
}

const faults = [];
const fault = (level, id, msg) => faults.push({ level, id, msg });
const err = (id, msg) => fault('error', id, msg);
const warn = (id, msg) => fault('warn', id, msg);

/* The hub is where a waypoint lives unless it says otherwise — see WP in
   data/world.js, and the three on other floors that carry a level name. */
const HUB = Object.keys(LEVELS).find(k => LEVELS[k].hub) || 'office';

const ids = ONLY ? [ONLY] : Object.keys(LEVELS);
if (ONLY && !LEVELS[ONLY]) {
  console.error('levelcheck: there is no level called ' + ONLY);
  process.exit(2);
}

for (const id of ids) {
  const def = LEVELS[id];
  def.id = id;                                    /* Levels.init() does this */
  try { World.build(def); }
  catch (e) { err(id, 'will not build at all: ' + e.message); continue; }
  const W = def.w, H = def.h;

  /* ---- how many pieces is the floor in ----
     The one check that has found something every time it has been written. */
  const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !World.isSolid(x, y);
  const owner = new Map(), parts = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!walk(x, y) || owner.has(x + ',' + y)) continue;
    const part = { tiles: [], entries: [] }, mine = parts.length, queue = [[x, y]];
    owner.set(x + ',' + y, mine);
    while (queue.length) {
      const [cx, cy] = queue.pop();
      part.tiles.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny;
        if (owner.has(k) || !walk(nx, ny)) continue;
        owner.set(k, mine); queue.push([nx, ny]);
      }
    }
    parts.push(part);
  }
  const entries = def.entries || {};
  for (const k in entries) {
    const at = owner.get(Math.floor(entries[k][0]) + ',' + Math.floor(entries[k][1]));
    if (at !== undefined) parts[at].entries.push(k);
  }
  const landed = parts.filter(p => p.entries.length);
  const orphans = parts.filter(p => !p.entries.length);
  const reached = new Set();
  landed.forEach(p => p.tiles.forEach(t => reached.add(t[0] + ',' + t[1])));
  const standable = (x, y) => reached.has(x + ',' + y);

  if (!Object.keys(entries).length) err(id, 'declares no arrival points, so go() would refuse to load it');
  if (!landed.length) err(id, 'no arrival point lands on walkable floor — nothing on it can be reached');
  if (landed.length > 1) err(id, 'is in ' + landed.length + ' pieces you cannot walk between: '
    + landed.map(p => p.entries.join('/') + ' (' + p.tiles.length + ' tiles)').join(' · '));
  const marooned = orphans.reduce((n, p) => n + p.tiles.length, 0);
  if (marooned) warn(id, marooned + ' walkable tiles are cut off from every arrival point, in '
    + orphans.length + ' pocket' + (orphans.length === 1 ? '' : 's')
    + ' — e.g. ' + orphans.slice(0, 3).map(p => p.tiles[0].join(',')).join(', '));

  /* ---- the arrival points themselves ---- */
  for (const k in entries) {
    const e = entries[k], x = Math.floor(e[0]), y = Math.floor(e[1]);
    if (x < 0 || y < 0 || x >= W || y >= H) err(id, 'arrival point “' + k + '” is off the map');
    else if (World.isSolid(x, y)) err(id, 'arrival point “' + k + '” at ' + x + ',' + y + ' is inside something solid');
  }

  /* ---- the waypoints the colleagues walk to ----
     Greedy movement, not pathfinding: a waypoint has to be floor, and floor on
     the same piece of floor as everybody else, or whoever is sent there walks
     into whatever is on it until the stuck timer gives up on them. */
  for (const k in WP) {
    const w = WP[k];
    if ((w[2] || HUB) !== id) continue;
    const [x, y] = w;
    if (x < 0 || y < 0 || x >= W || y >= H) err(id, 'waypoint “' + k + '” is off the map');
    else if (World.isSolid(x, y)) err(id, 'waypoint “' + k + '” at ' + x + ',' + y + ' is inside something solid');
    else if (!standable(x, y)) err(id, 'waypoint “' + k + '” at ' + x + ',' + y + ' is on floor nobody can walk to');
  }

  /* ---- can you get to the things ----
     Per HANDLER, not per object: a shopfront's door and the sign over it carry
     the same `use` on purpose, and pressing E on either is the same act. */
  const reachableUse = new Set();
  for (const o of World.objects) {
    if (!o.use) continue;
    const sides = [[o.x, o.y - 1], [o.x, o.y + 1], [o.x - 1, o.y], [o.x + 1, o.y]];
    if (!o.solid) sides.push([o.x, o.y]);
    if (sides.some(([x, y]) => standable(x, y))) reachableUse.add(o.use);
  }
  const said = new Set();
  for (const o of World.objects) {
    if (!o.use || reachableUse.has(o.use) || said.has(o.use)) continue;
    said.add(o.use);
    err(id, '“' + (o.name || o.kind) + '” (' + o.use + ') at ' + o.x + ',' + o.y
      + ' has no tile beside it anybody can stand on');
  }

  /* ---- and does pressing E on them do anything ---- */
  const missing = new Set();
  for (const o of World.objects) {
    if (!o.use || typeof Acts[o.use] === 'function' || missing.has(o.use)) continue;
    missing.add(o.use);
    err(id, '“' + (o.name || o.kind) + '” has use:' + JSON.stringify(o.use) + ', which data/acts.js has no handler for');
  }

  /* ---- the link table ----
     Nothing outside data/levels.js names a destination, so a typo here is a
     door that silently does nothing rather than an error anybody sees. */
  const vias = new Set();
  for (const l of (def.links || [])) {
    if (vias.has(l.via)) err(id, 'declares the link “' + l.via + '” twice');
    vias.add(l.via);
    const dest = LEVELS[l.to];
    if (!dest) { err(id, 'link “' + l.via + '” goes to “' + l.to + '”, which is not a level'); continue; }
    if (l.entry && !(dest.entries || {})[l.entry])
      err(id, 'link “' + l.via + '” arrives at “' + l.entry + '”, which ' + l.to + ' does not declare');
    /* Three ways a link gets taken: an object whose handler IS the link, an
       object that names it with `via:` and keeps its own handler, and the lift,
       whose act reads FLOORS and takes whatever it finds there. */
    const byObject = World.objects.some(o => o.use === l.via || o.via === l.via);
    const byLift = FLOORS.some(f => f.via === l.via) && World.objects.some(o => o.use === 'lift');
    const byWriting = TAKEN.has(l.via);
    if (!byObject && !byLift && !byWriting)
      warn(id, 'link “' + l.via + '” has no object on this level with that use or via, and nothing '
        + 'calls Levels.take(' + JSON.stringify(l.via) + ') — there is no way to take it');
  }

  /* ---- what the level is made of ---- */
  for (const rm of (def.rooms || [])) {
    if (!ZONES[rm.z]) err(id, 'a room is zone “' + rm.z + '”, which data/world.js does not declare');
    const [x1, y1, x2, y2] = rm.r;
    if (x1 > x2 || y1 > y2) err(id, 'the ' + rm.z + ' rectangle ' + JSON.stringify(rm.r) + ' is inside out');
    else if (x1 < 0 || y1 < 0 || x2 >= W || y2 >= H)
      err(id, 'the ' + rm.z + ' rectangle ' + JSON.stringify(rm.r) + ' is outside the ' + W + '×' + H + ' map');
    else if (def.indoors !== false && (x1 < 1 || y1 < 1 || x2 > W - 2 || y2 > H - 2))
      warn(id, ((ZONES[rm.z] || {}).name || rm.z) + ' reaches the edge of the map, so it has no boundary wall');
  }
  for (const d of (def.doors || [])) {
    if (d.x < 0 || d.y < 0 || d.x >= W || d.y >= H) err(id, 'a door is off the map at ' + d.x + ',' + d.y);
    if (d.z && !ZONES[d.z]) err(id, 'a door belongs to zone “' + d.z + '”, which does not exist');
  }
  for (const s of (def.surfaces || []))
    if (s.s !== null && !SURFACES[s.s]) err(id, 'surface “' + s.s + '” is not in SURFACES');
  for (const c of (def.cars || []))
    if (c.model && !CARS[c.model]) err(id, 'a car is model “' + c.model + '”, which is not in CARS');

  /* ---- the art each object is asking for ---- */
  const wrong = new Set();
  for (const o of World.objects) {
    const f = o.fdef || {};
    const names = [f.sprite, f.lit].concat(f.tones || [], Object.values(f.sprites || {})).filter(Boolean);
    for (const n of names) {
      if (SPRITES.has(n) || wrong.has(n)) continue;
      wrong.add(n);
      err(id, '“' + (o.name || o.kind) + '” names the sprite “' + n + '”, which the atlas does not describe');
    }
    if (o.art && ART.indexOf(o.art) < 0 && !wrong.has(o.art)) {
      wrong.add(o.art);
      err(id, '“' + (o.name || o.kind) + '” names the art “' + o.art + '”, which R.wallArt() has no case for');
    }
    /* World.build() drops a wall-mounted thing to the floor when there is no
       wall on any of its four sides, and it does it quietly. */
    if (FREESTANDING.indexOf(o.kind) < 0 && (o.fdef || {}).mount === 'wall' && !o.wallSide)
      warn(id, '“' + (o.name || o.kind) + '” at ' + o.x + ',' + o.y + ' wants a wall and has none, so it is on the floor');
  }
}

/* ---- the tables themselves, once, rather than per level ---- */
for (const k in ZONES) for (const n of [ZONES[k].tile, ZONES[k].wtile])
  if (n && !SPRITES.has(n)) err('data/world.js', 'ZONES.' + k + ' lays “' + n + '”, which the atlas does not describe');
for (const k in SURFACES) {
  const s = SURFACES[k];
  for (const n of [s.tile].concat(Object.values(s.tiles || {})))
    if (n && !SPRITES.has(n)) err('data/world.js', 'SURFACES.' + k + ' lays “' + n + '”, which the atlas does not describe');
}
for (const k in FURN) {
  const f = FURN[k];
  for (const n of [f.sprite, f.lit].concat(f.tones || [], Object.values(f.sprites || {})))
    if (n && !SPRITES.has(n)) err('data/world.js', 'FURN.' + k + ' names “' + n + '”, which the atlas does not describe');
  if (f.art && ART.indexOf(f.art) < 0) err('data/world.js', 'FURN.' + k + ' names the art “' + f.art + '”, which R.wallArt() has no case for');
}
for (const f of FLOORS) {
  if (!f.via) continue;
  const somewhere = Object.values(LEVELS).some(l => (l.links || []).some(k => k.via === f.via));
  if (!somewhere) warn('data/world.js', 'the lift\'s ' + f.b + ' button takes “' + f.via + '”, which no level links');
}

/* ---- report ---------------------------------------------------------------
   Grouped by level, because that is the file you are about to open. */
const errors = faults.filter(f => f.level === 'error');
const warnings = faults.filter(f => f.level === 'warn');
const order = [...new Set(faults.map(f => f.id))];
for (const id of order) {
  console.log('\n' + id);
  for (const f of faults.filter(f => f.id === id))
    console.log('  ' + (f.level === 'error' ? 'ERROR' : 'warn ') + '  ' + f.msg);
}
console.log('\n' + ids.length + ' level' + (ids.length === 1 ? '' : 's') + ' checked · '
  + errors.length + ' error' + (errors.length === 1 ? '' : 's') + ' · '
  + warnings.length + ' warning' + (warnings.length === 1 ? '' : 's'));
if (errors.length) process.exit(1);
