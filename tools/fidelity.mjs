/* WHAT THE BUILDER MADE, TO THE TILE, AS ONE NUMBER PER LEVEL.
 *
 * Dev-time only, and not shipped. This is the harness you run either side of a
 * change that is not supposed to change anything: a refactor of how the map is
 * STORED rather than of what is on it.
 *
 * Every other harness here measures behaviour and reports numbers that move —
 * crossings, car-seconds, stalls. This one reports a number that must NOT move.
 * It builds every level with the real builder and digests everything downstream
 * reads off it: the walls, the zones, the surfaces, the contact shadows, every
 * object and what the build worked out about it, the doorways, the worktops,
 * the counters and the desks — and, because the roof is derived from the mass
 * and nothing else, the plot, the roof plane and the material of every tile of
 * it.
 *
 *   node tools/fidelity.mjs                 print a digest per level
 *   node tools/fidelity.mjs --save a.json   write it
 *   node tools/fidelity.mjs --check a.json  compare against one, and say where
 *
 * --check exits 1 on any difference and names the first few tiles or objects
 * that differ, which is the difference between "something moved" and knowing
 * what. Math.random() is seeded here, so two runs of the same code agree
 * exactly; a digest that moves is the code, not the dice.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const MODE = process.argv[2] || '';
const FILE = process.argv[3] || '';

/* ---- the stub page — the same browser's worth of nothing the others use --- */
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
/* SEEDED, and that is the whole reason a digest means anything: World.build()
   fills a random number per tile, so two runs of identical code would otherwise
   disagree about every level. */
vm.runInContext(`
  var __seed = 12345;
  Math.random = () => (__seed = (__seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
`, ctx);

const load = rel => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
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
vm.runInContext(`
  var G = { state: 'play', flags: {}, quests: {} };
  var P = { x: -9999, y: -9999, dir: 2, moving: false };
  var NPCM = { list: [] };
  var Sprites = { dirOf: () => 0, seatedAt: () => null, ready: false };
  var Sfx = { on: false, horn(){}, thud(){}, scrape(){}, door(){}, deny(){}, engine(){}, bleep(){}, blip(){} };
  var FX = { motion: false, shake(){}, parts: [] };
  var UI = { toast(){}, objective(){} };
  var Ach = { get(){} };
  var Q = { active: () => false, has: () => false, restand(){} };
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
/* THE ROOF IS PART OF THE MAP as far as this is concerned: it is derived from
   the mass and from nothing else, so a change to how the mass is stored can
   move it, and moving it is exactly the kind of thing this exists to catch.
   engine/render.js wants a canvas it will never get here — only the parts that
   decide are asked, never the parts that draw. */
vm.runInContext(`
  var Tiles = { ready: false, rects: {}, anchors: {}, has: () => false, imgFor: () => null,
                draw: () => false, floor: () => false, centre: (n, x, y) => ({ x, y }) };
  var Phones = { ringing: [] }, Guns = { shots: [] }, Peds2 = null;
  var Combat = { E: null }, Panels = { on: false }, Look = {}, Menu = {};
`, ctx);
load('engine/render.js');

const g = name => vm.runInContext(name, ctx);
const { LEVELS, World, R } = { LEVELS: g('LEVELS'), World: g('World'), R: g('R') };

/* ---- the digest -----------------------------------------------------------
   FNV-1a over a string built from everything read downstream, in a fixed
   order. A hash rather than the data itself because the point is a yes or no,
   and the data is four hundred thousand tiles. */
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const hex = n => n.toString(16).padStart(8, '0');

/* Everything the build worked out about an object, in the order add() made
   them. `fdef` is the merge of its kind and its own `furn`, and is what the
   renderer and the collision both read. */
const objLine = (o, i) => {
  const f = o.fdef || {};
  return [i, o.x, o.y, o.kind, o.name || '', o.use || '', o.via || '', o.solid ? 1 : 0,
    o.mount || '', o.wallSide || '', o.art || '', o.noEmoji ? 1 : 0,
    o.onCounter ? 1 : 0, o.onTop ? 1 : 0, o.onTable ? 1 : 0,
    f.sprite || '', f.size ?? '', f.high ?? '', f.mount || '',
    (o._foot || []).join('/')].join('');
};

function digest(id) {
  const def = LEVELS[id];
  def.id = id;
  World.build(def);
  const W = def.w, H = def.h;
  const part = {};

  /* THE MAP ITSELF, one row at a time. isSolid() rather than solid[][] for the
     walls, because isSolid is the question everything actually asks and it
     folds in the blocked counters as well. */
  const rows = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) r += World.isSolid(x, y) ? '#' : (World.solid[y][x] ? '+' : '.');
    rows.push(r);
  }
  part.walls = fnv(rows.join('\n'));

  const zrows = [];
  for (let y = 0; y < H; y++) {
    const r = [];
    for (let x = 0; x < W; x++) r.push(World.zoneAt(x, y) || '');
    zrows.push(r.join(','));
  }
  part.zones = fnv(zrows.join('\n'));

  const srows = [];
  for (let y = 0; y < H; y++) {
    const r = [];
    for (let x = 0; x < W; x++) r.push(World.surfAt(x, y) || '');
    srows.push(r.join(','));
  }
  part.surfaces = fnv(srows.join('\n'));

  const arows = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) r += ((World.ao && World.ao[y] && World.ao[y][x]) || 0).toString(16);
    arows.push(r);
  }
  part.ao = fnv(arows.join('\n'));

  /* The per-tile noise, quantised. It is a random number per tile and the point
     is not the exact double — it is that the same tiles come out light and dark
     as before, which is what every reader of it thresholds on. */
  const nrows = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) r += Math.floor(((World.seed[y] && World.seed[y][x]) || 0) * 64).toString(36);
    nrows.push(r);
  }
  part.noise = fnv(nrows.join('\n'));

  part.objects = fnv(World.objects.map(objLine).join('\n'));
  part.doorways = fnv((World.doorways || []).map(d => [d.x, d.y, d.axis, d.kind || '', d.into || '', d.shop ? 1 : 0].join('')).join('\n'));
  part.furniture = fnv(JSON.stringify({
    worktops: World.worktops, tables: World.tables, counters: World.counters,
    desks: World.desks, openings: [...(World.openings || [])].sort(),
    blocked: [...(World.blocked || [])].sort()
  }));
  part.cars = fnv((World.cars || []).map(c => [c.id, Math.round(c.x), Math.round(c.y), c.model || '', (c.a || 0).toFixed(4)].join('')).join('\n'));
  part.peds = fnv((World.peds || []).map(q => [Math.round(q.x), Math.round(q.y)].join('')).join('\n'));
  part.signals = fnv(JSON.stringify((World.signals || []).map(s => ({ kind: s.kind, arms: s.arms.map(a => [a.tx, a.ty, a.go, a.g]) }))));

  /* AND THE ROOF, which is derived from the mass and is therefore the most
     sensitive thing on this list to a change in how the mass is stored. */
  if (def.indoors === false && R && R.roofPlots) {
    R.rebake();
    const plots = R.roofPlots();
    const prows = [];
    for (let y = 0; y < H; y++) {
      const r = [];
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        r.push(plots.id[i] ? (plots.id[i] + ':' + plots.grp[i] + ':' + (plots.mat.get(plots.id[i]) || '')) : '');
      }
      prows.push(r.join(','));
    }
    part.roofs = fnv(prows.join('\n'));
  }

  let all = '';
  for (const k of Object.keys(part).sort()) all += k + '=' + hex(part[k]) + ';';
  return { level: id, size: W + 'x' + H, objects: World.objects.length, part, all: hex(fnv(all)) };
}

const out = {};
for (const id of Object.keys(LEVELS)) {
  try { out[id] = digest(id); }
  catch (e) { out[id] = { level: id, error: e.message }; }
}

/* ---- A PART, IN THE LEVEL IT IS BUILT INTO, IS THE PART ---------------------
   The other thing this file is for, and the one that is not a number to compare
   against last week's: a level may be assembled out of others — see
   composeLevel() in data/world.js — and the question that asks is whether the
   assembly changed any of them. Not "is it the same as it was" but "is it, HERE,
   what it is THERE": the same walls, the same rooms, the same ground and the
   same things standing on it, at the same coordinates plus the offset.

   It is checked tile by tile rather than by hash, because the two are not
   hashable against each other — a zone is an index into a table the level owns,
   so the same room is a different number in a different level. Names, then, and
   the object list translated. Two hundred thousand comparisons, and it runs in
   under a second.

   This is the check that says the town is still the town. */
const partFaults = [];
for (const id of Object.keys(LEVELS)) {
  const def = LEVELS[id];
  if (!def.parts) continue;
  /* The whole, then each part on its own, and the part is rebuilt after the
     whole so that World is holding the small one — the comparison reads the
     big one out of a copy taken first. */
  World.build(def);
  const host = {
    solid: World.solid.map(r => Array.from(r)),
    zone: [], surf: [], objects: World.objects.map(o => o.x + ',' + o.y + ',' + (o.use || o.kind || ''))
  };
  for (let y = 0; y < def.h; y++) {
    const zr = [], sr = [];
    for (let x = 0; x < def.w; x++) { zr.push(World.zoneAt(x, y) || ''); sr.push(World.surfAt(x, y) || ''); }
    host.zone.push(zr); host.surf.push(sr);
  }
  const hostObjects = new Set(host.objects);
  for (const p of def.parts) {
    const src = LEVELS[p.of];
    if (!src) { partFaults.push(id + ': names a part that is not there, ' + p.of); continue; }
    World.build(src);
    const dx = p.at[0], dy = p.at[1];
    let tiles = 0, zones = 0, surfs = 0, missing = 0;
    /* EXCEPT THE HEM. A part may declare that its outermost tiles belong to
       whatever it is built into — the outskirts drew two tiles of mass round
       itself standing for the rest of the world, and on an island the rest of
       the world is the dunes. Everything inside it is the part's and is checked
       to the tile. */
    const hem = p.hem || 0;
    for (let y = hem; y < src.h - hem; y++) for (let x = hem; x < src.w - hem; x++) {
      const hx = x + dx, hy = y + dy;
      if (World.solid[y][x] !== host.solid[hy][hx]) tiles++;
      if ((World.zoneAt(x, y) || '') !== host.zone[hy][hx]) zones++;
      if ((World.surfAt(x, y) || '') !== host.surf[hy][hx]) surfs++;
    }
    for (const o of World.objects) {
      if (o.x < hem || o.y < hem || o.x >= src.w - hem || o.y >= src.h - hem) continue;
      if (!hostObjects.has((o.x + dx) + ',' + (o.y + dy) + ',' + (o.use || o.kind || ''))) missing++;
    }
    if (tiles || zones || surfs || missing) {
      partFaults.push(id + ' ← ' + p.of + ' at ' + p.at.join(',') + ': '
        + [tiles && tiles + ' walls', zones && zones + ' rooms', surfs && surfs + ' surfaces',
           missing && missing + ' objects'].filter(Boolean).join(', ') + ' differ');
    } else if (MODE !== '--save' && MODE !== '--check') {
      console.log((p.of + ' in ' + id).padEnd(24) + 'identical, ' + ((src.w - 2 * (p.hem || 0)) * (src.h - 2 * (p.hem || 0))) + ' tiles and '
        + World.objects.length + ' objects, offset ' + p.at.join(','));
    }
  }
}
if (partFaults.length) {
  partFaults.forEach(f => console.log('PART  ' + f));
  if (MODE !== '--save') process.exit(1);
}

if (MODE === '--save') {
  fs.writeFileSync(FILE, JSON.stringify(out, null, 1));
  console.log('fidelity: wrote ' + Object.keys(out).length + ' levels to ' + FILE);
  process.exit(0);
}

if (MODE === '--check') {
  const was = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  let bad = 0;
  for (const id of Object.keys(out)) {
    const a = was[id], b = out[id];
    if (!a) { console.log(id + ': NEW level, nothing to compare'); continue; }
    if (a.all === b.all) continue;
    bad++;
    console.log('\n' + id + ' DIFFERS (' + b.size + ')');
    for (const k of Object.keys(b.part)) {
      const x = a.part && a.part[k], y = b.part[k];
      if (x === y) continue;
      console.log('   ' + k.padEnd(10) + hex(x === undefined ? 0 : x) + ' -> ' + hex(y));
    }
    for (const k of Object.keys((a.part || {}))) if (!(k in b.part)) console.log('   ' + k.padEnd(10) + 'GONE');
  }
  for (const id of Object.keys(was)) if (!out[id]) { console.log(id + ': level is GONE'); bad++; }
  console.log('\n' + (bad ? bad + ' level(s) differ' : 'all ' + Object.keys(out).length + ' levels identical'));
  process.exit(bad ? 1 : 0);
}

for (const id of Object.keys(out)) {
  const d = out[id];
  if (d.error) { console.log(id.padEnd(12) + 'FAILED: ' + d.error); continue; }
  console.log(id.padEnd(12) + d.size.padStart(8) + '  ' + String(d.objects).padStart(4) + ' objects  ' + d.all);
}
