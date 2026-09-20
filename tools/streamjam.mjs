/* WHAT THE STREAMER BUILDS, AND HOW MANY TIMES IT BUILDS IT.
 *
 * Dev-time only, and not shipped. The fifth headless harness, and the one that
 * watches engine/levels.js rather than anything on screen: the level cache, the
 * trim that bounds it, and the prefetcher that fills it.
 *
 * It is here because that machinery fails silently and expensively. Nothing
 * about a level being built twice is visible — the level is correct, the player
 * is where they should be, every other number in this repository is unmoved —
 * and the whole cost of it is a frame, somewhere else, a moment later. The
 * fault this was written for was a prefetch loop that could not terminate: it
 * built a neighbour, the trim evicted one to make room, the next pass found
 * that one unbuilt and built it again, and round it went for as long as the
 * player stood still. On the fourth floor that was three small rooms and cost
 * a millisecond nobody could see. Outside, where the road east now leads to a
 * hundred and forty-seven thousand tiles, it was the outskirts rebuilt eleven
 * times a second, and it was reported as the driving being choppy.
 *
 * So the question is not "is the map right" — tools/levelcheck.mjs and
 * tools/fidelity.mjs both answer that — it is "how much work did standing
 * there cost", and the unit is a call to World.build().
 *
 *   node tools/streamjam.mjs                     stand on every level in turn
 *   node tools/streamjam.mjs outside             one of them, in detail
 *   node tools/streamjam.mjs path/to/levels.js   some other copy of the streamer
 *
 * IDLE TIME IS SIMULATED, and generously: requestIdleCallback is a queue that
 * this pumps two hundred times per level, which is about twenty seconds of a
 * game running at sixty frames a second. A prefetcher that has finished has
 * nothing to do with the other hundred and ninety.
 *
 * Exit code 1 if any level is built more than once while the player stands
 * still, or if the prefetcher is still asking for work when the pumping stops.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
/* A level id, a copy of engine/levels.js, or both — same as the other four:
   run it against the previous streamer and the two columns are the argument. */
const ARGS = process.argv.slice(2);
const FILE = ARGS.find(a => a.endsWith('.js')) || path.join(ROOT, 'engine', 'levels.js');
const ONLY = ARGS.find(a => !a.endsWith('.js')) || null;
/* Idle slots per level. Twenty seconds' worth at sixty frames a second, which
   is a great deal longer than anybody stands in a doorway. */
const SLOTS = 200;

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
/* THE IDLE QUEUE. The real one runs a callback when the browser has nothing
   better to do; this one runs it when asked, which is what makes "how many
   builds does standing still cost" a number rather than a stopwatch. */
const idleQ = [];
ctx.requestIdleCallback = fn => { idleQ.push(fn); return idleQ.length; };
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
/* Everything engine/levels.js talks to on its way through a door, and none of
   it what is being measured: who is standing there, what is drawn, the noise. */
vm.runInContext(`
  var G = { state: 'play', flags: {}, quests: {}, level: null };
  var P = { x: 0, y: 0, vx: 0, vy: 0, dir: 2, moving: false };
  var NPCM = { list: [], enter(){}, spawn(){} };
  var Sprites = { dirOf: () => 0 };
  var Sfx = { on: false, horn(){}, thud(){}, scrape(){}, door(){}, deny(){}, engine(){}, bleep(){}, blip(){}, select(){} };
  var FX = { motion: false, shake(){}, parts: [] };
  var UI = { toast(){}, objective(){}, zone(){} };
  var Ach = { get(){} };
  var Q = { active: () => false, has: () => false, restand(){} };
  var Item = { has: () => false };
  var Rel = { get: () => 0 };
  var Arcade = { cabinets: () => [] };
  var Dialogue = { say(){}, on: false };
  var Sky = { working: () => true, dark: () => false, season: () => 'autumn', kind: () => ({}), lampsOn: () => false };
  var Keys = { up: 0, down: 0, left: 0, right: 0 };
  var Stick = { on: false, x: 0, y: 0 }, Throttle = { on: false, y: 0 };
  var Cam = { x: 0, y: 0, w: 800, h: 600, visible: () => false, snap(){} };
  var Guide = { onLevel(){}, check(){}, setObject(){}, clear(){} };
  var R = { levelChanged(){} };
  function releaseSticks(){} function count(){} function playerFits(){ return true; } function zoneCheck(){}
  function clockStr(){ return ''; }
`, ctx);
load('engine/cars.js');
load('engine/peds.js');
load('engine/signals.js');
load('engine/guns.js');
vm.runInContext(fs.readFileSync(FILE, 'utf8'), ctx, { filename: path.relative(ROOT, FILE) });
load('data/acts.js');

const g = name => vm.runInContext(name, ctx);
const { LEVELS, World, Levels } = { LEVELS: g('LEVELS'), World: g('World'), Levels: g('Levels') };

/* Every build, counted and timed, by wrapping the one function that makes a
   map. Everything the streamer does that costs anything goes through here. */
let builds = [];
const realBuild = World.build.bind(World);
World.build = def => {
  const t0 = process.hrtime.bigint();
  const r = realBuild(def);
  builds.push({ id: def && def.id, ms: Number(process.hrtime.bigint() - t0) / 1e6 });
  return r;
};

const pump = n => { for (let i = 0; i < n && idleQ.length; i++) (idleQ.shift())(); };

Levels.init();
const ids = ONLY ? [ONLY] : Levels.ids();
if (ONLY && !LEVELS[ONLY]) { console.error('no level ' + ONLY); process.exit(1); }

let errors = 0, warnings = 0;
const rows = [];
for (const id of ids) {
  /* A fresh arrival on a cold cache, which is the worst case and the one a
     player gets on the first walk through any door. */
  Levels.init();
  idleQ.length = 0;
  builds = [];
  Levels.start(id, 'start');
  const arrival = builds.length;                       /* the level itself */
  const arrivalMs = builds.reduce((a, b) => a + b.ms, 0);
  builds = [];
  pump(SLOTS);
  const left = idleQ.length;

  const per = new Map();
  for (const b of builds) per.set(b.id, (per.get(b.id) || 0) + 1);
  const twice = [...per].filter(([, n]) => n > 1);
  const ms = builds.reduce((a, b) => a + b.ms, 0);
  const links = ((LEVELS[id] || {}).links || []).length;

  rows.push({ id, links, arrival, arrivalMs, prefetched: builds.length, ms, twice, left, per });

  /* THE TWO FAULTS. Either is a prefetcher that has stopped streaming and
     started churning, and neither shows up anywhere else. */
  if (twice.length) {
    errors++;
    console.log(`ERROR ${id}: built again while standing still — ` +
      twice.map(([k, n]) => `${k} ×${n}`).join(', '));
  }
  if (left) {
    errors++;
    console.log(`ERROR ${id}: prefetcher still asking after ${SLOTS} idle slots (${left} queued)`);
  }
  /* Work that cannot be kept. Building a neighbour the cache has no room for
     is a build whose only effect is to evict the last one. */
  const kept = [...Levels.cache.keys()];
  const lost = [...per.keys()].filter(k => !kept.includes(k));
  if (lost.length) {
    warnings++;
    console.log(`WARN  ${id}: built and then dropped — ${lost.join(', ')}`);
  }
}

if (ONLY) {
  const r = rows[0];
  console.log(`\n${r.id} — ${r.links} link${r.links === 1 ? '' : 's'}, budget ${Levels.BUDGET}`);
  console.log(`  arriving      ${r.arrival} build${r.arrival === 1 ? '' : 's'}, ${r.arrivalMs.toFixed(1)} ms`);
  console.log(`  then standing ${r.prefetched} build${r.prefetched === 1 ? '' : 's'}, ${r.ms.toFixed(1)} ms` +
    (r.prefetched ? ' — ' + [...r.per].map(([k, n]) => k + (n > 1 ? ' ×' + n : '')).join(', ') : ''));
  console.log(`  cache holds   ${[...Levels.cache.keys()].join(', ')}`);
} else {
  const worst = rows.slice().sort((a, b) => b.ms - a.ms).slice(0, 5);
  console.log('\n  standing still, per level: builds and what they cost');
  for (const r of worst) {
    console.log(`    ${r.id.padEnd(12)} ${String(r.links).padStart(2)} links → ` +
      `${String(r.prefetched).padStart(2)} prefetched, ${r.ms.toFixed(1).padStart(6)} ms`);
  }
  const total = rows.reduce((a, r) => a + r.prefetched, 0);
  console.log(`\n${rows.length} levels stood on · ${total} prefetch builds · ${errors} errors · ${warnings} warnings`);
}
process.exit(errors ? 1 : 0);
