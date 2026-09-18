/* THE VIEW FROM ABOVE, EVERY LEVEL, WITHOUT LOOKING AT ONE.
 *
 * Dev-time only, and not shipped. The fifth harness watches the level cache;
 * this one watches the map — engine/map.js — and it is here because a map is
 * the one thing in this game that is WRONG QUIETLY. A level that cannot be
 * walked across fails tools/levelcheck.mjs. A level whose mass moved fails
 * tools/fidelity.mjs. A level whose map comes out blank, or squashed, or with
 * THE ARCHIVE written across the break room, fails nothing at all: the game
 * runs, the level is correct, and the only thing that is wrong is the picture
 * of it in the corner of the screen, which is exactly the thing nobody is
 * looking at while they are playing.
 *
 * So it asks the four questions the map has to get right, of every level:
 *
 *   IS THERE ANYTHING ON IT. How much of the level comes out as ground —
 *   floor, road, field, water, mass — rather than as nothing. A map that is
 *   nine tenths empty is a colour rule that has stopped matching the data.
 *
 *   IS IT TRUE. The projection, asked at a dozen canvas sizes per level: one
 *   scale for both axes, the window inside the map, the player inside the
 *   window, and a tile at the far corner landing inside the canvas. A map
 *   drawn with a scale per axis is the fault this file was written after —
 *   the town was drawn half as wide again as it is for a year.
 *
 *   IS THE NAME ON THE RIGHT THING. Every street and room label, tested
 *   against the zone it claims to name. A centre of mass is not necessarily
 *   inside the shape it is the centre of: a bent street, or the ring of
 *   pavement round the minster, has its centroid in the middle of a building.
 *
 *   AND CAN YOU SEE THE WAY OUT. Every link a level declares, matched against
 *   the thing on the map that offers it. A way out nothing on the map offers
 *   is a way out the player has to be told about by somebody.
 *
 *   node tools/mapjam.mjs            every level
 *   node tools/mapjam.mjs outside    one of them, in detail
 *
 * Exit code 1 on any of them, so scripts/release.sh can refuse.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const ONLY = process.argv[2] || null;

/* ---- the stub page ---------------------------------------------------------
   The same browser's worth of nothing the other harnesses use, plus the one
   thing this file cannot do without: a canvas that counts instead of drawing.
   Nothing here measures what the pixels look like — that is what the screen is
   for — but HOW MANY CALLS it takes to lay a level down is the whole argument
   for drawing it in runs, and that is a number. */
const ops = { fillRect: 0, canvas: 0 };
const fakeCtx = () => ({
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
  lineJoin: '', imageSmoothingEnabled: true,
  fillRect() { ops.fillRect++; },
  clearRect() {}, strokeRect() {}, drawImage() {}, beginPath() {}, arc() {}, fill() {},
  stroke() {}, moveTo() {}, lineTo() {}, save() {}, restore() {}, translate() {}, rotate() {},
  closePath() {}, fillText() {}, strokeText() {},
  measureText: t => ({ width: String(t).length * 6 })
});
const ctx = vm.createContext({ console });
ctx.window = ctx;
ctx.document = {
  querySelector: () => null,
  body: { classList: { toggle() {} } },
  createElement: () => { ops.canvas++; return { width: 0, height: 0, style: {}, getContext: fakeCtx }; }
};
ctx.matchMedia = () => ({ matches: false });
ctx.addEventListener = () => {};
ctx.requestAnimationFrame = () => {};
ctx.requestIdleCallback = () => {};
ctx.localStorage = { getItem: () => null, setItem() {} };
vm.runInContext(`
  var __seed = 12345;
  Math.random = () => (__seed = (__seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
`, ctx);

const load = rel => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
load('art/sprites/manifest.js');
load('data/world.js');
load('data/levels.js');
load('data/outskirts.js');
load('data/npcs.js');
load('data/items.js');
load('engine/core.js');
load('engine/world.js');
load('engine/collide.js');
vm.runInContext(`
  var G = { state: 'play', flags: {}, quests: {}, achievements: {}, rel: {} };
  var P = { x: 0, y: 0, dir: 2, moving: false };
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
  var Sky = { working: () => true, dark: () => false, season: () => 'autumn', kind: () => ({}), lampsOn: () => false };
  var Keys = { up: 0, down: 0, left: 0, right: 0 };
  var Stick = { on: false, x: 0, y: 0 }, Throttle = { on: false, y: 0 };
  var Cam = { x: 0, y: 0, w: 800, h: 600, visible: () => false, snap(){} };
  var Guide = { tx: null, ty: null, onLevel(){} };
  var R = { levelChanged(){}, questMark: () => false };
  var Panels = { on: false, tab: '' };
  var Game = { overlayUp: () => false };
  var MAP_FAMILY = 'sans-serif';
  function releaseSticks(){} function count(){} function playerFits(){ return true; } function zoneCheck(){}
  function clockStr(){ return ''; }
`, ctx);
load('engine/cars.js');
load('engine/peds.js');
load('engine/signals.js');
load('engine/levels.js');
load('engine/map.js');
load('data/acts.js');

const g = n => vm.runInContext(n, ctx);
const { LEVELS, World, Atlas, ZONES } = { LEVELS: g('LEVELS'), World: g('World'), Atlas: g('Atlas'), ZONES: g('ZONES') };
const P = g('P');
const setSize = (w, h) => vm.runInContext(`MAPW = ${w}; MAPH = ${h};`, ctx);

for (const id in LEVELS) LEVELS[id].id = id;
const ids = ONLY ? [ONLY] : Object.keys(LEVELS);
if (ONLY && !LEVELS[ONLY]) { console.error('no level ' + ONLY); process.exit(1); }

/* The canvas sizes a map is actually asked for: the minimap on a phone and on
   a desktop at both pixel ratios, and the map screen in a panel on each. A
   projection that is true at one size and false at another is a projection. */
const SIZES = [[168, 118], [336, 236], [700, 520], [1400, 1040], [320, 240], [240, 420]];

let errors = 0, warnings = 0;
const rows = [];

for (const id of ids) {
  const def = LEVELS[id];
  setSize(def.w, def.h);
  World.build(def);
  World.level = id;
  Atlas.rasters.clear(); Atlas._labels = null; Atlas._labelsFor = null;

  /* ---- is there anything on it ---- */
  let ground = 0;
  for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) if (Atlas.colourAt(x, y)) ground++;
  const share = ground / (def.w * def.h);

  /* ---- what it costs to lay down ---- */
  ops.fillRect = 0; ops.canvas = 0;
  const t0 = process.hrtime.bigint();
  Atlas.raster();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const runs = ops.fillRect;
  /* And again, to prove it is kept rather than made twice. */
  ops.canvas = 0; Atlas.raster();
  const rebuilt = ops.canvas;

  /* ---- is it true ---- */
  const corners = [[0, 0], [def.w - .01, 0], [0, def.h - .01], [def.w - .01, def.h - .01], [def.w / 2, def.h / 2]];
  let bad = null;
  for (const [w, h] of SIZES) {
    for (const [px, py] of corners) {
      P.x = px * 32; P.y = py * 32;
      const whole = Atlas.whole(w, h);
      const k = whole >= Atlas.WHOLE ? whole : Atlas.DETAIL;
      const f = Atlas.fit(w, h, k, px, py);
      const eps = 1e-6;
      if (f.vx < -eps || f.vy < -eps || f.vx + f.vw > def.w + eps || f.vy + f.vh > def.h + eps)
        bad = bad || `window ${f.vx.toFixed(1)},${f.vy.toFixed(1)} ${f.vw.toFixed(1)}x${f.vh.toFixed(1)} is not inside ${def.w}x${def.h} at ${w}x${h}`;
      /* The player has to be on their own map. It is the one thing a minimap
         is for, and a clamp that is out by a window's width puts them off it. */
      if (px < f.vx - eps || px > f.vx + f.vw + eps || py < f.vy - eps || py > f.vy + f.vh + eps)
        bad = bad || `player at ${px.toFixed(1)},${py.toFixed(1)} is outside the window at ${w}x${h}`;
      const a = Atlas.at(f, f.vx, f.vy), b = Atlas.at(f, f.vx + f.vw, f.vy + f.vh);
      if (a.x < -eps || a.y < -eps || b.x > w + eps || b.y > h + eps)
        bad = bad || `the window is drawn outside the canvas at ${w}x${h}`;
    }
  }
  if (bad) { errors++; console.log(`ERROR ${id}: ${bad}`); }

  /* ---- is the name on the right thing ---- */
  const labels = Atlas.labels();
  let offZone = 0;
  for (const z of labels) {
    const at = World.zoneAt(Math.floor(z.x), Math.floor(z.y));
    if (at !== z.z) {
      offZone++; errors++;
      console.log(`ERROR ${id}: the label for ${z.z} sits on ${at || 'nothing'} at ${z.x},${z.y}`);
    }
    if (z.x0 > z.x1 || z.y0 > z.y1) { errors++; console.log(`ERROR ${id}: ${z.z} has no extent`); }
  }

  /* ---- can you see the way out ---- */
  const links = def.links || [];
  const shown = Atlas.waysOut();
  const named = new Set();
  for (const o of World.objects) {
    for (const l of links) if (l.via === o.via || l.via === o.use) named.add(l.via);
    const ex = g('EXITS').find(e => e.kind === o.kind);
    if (ex) for (const l of links) if (ex.vias.indexOf(l.via) >= 0) named.add(l.via);
  }
  const missing = links.filter(l => !named.has(l.via)).map(l => l.via);

  if (!ground) { errors++; console.log(`ERROR ${id}: nothing on the map at all`); }
  else if (share < 0.25) { warnings++; console.log(`WARN  ${id}: only ${(share * 100).toFixed(0)}% of the level is drawn`); }
  if (rebuilt) { errors++; console.log(`ERROR ${id}: the raster was built twice for one level`); }
  if (missing.length) { warnings++; console.log(`WARN  ${id}: nothing on the map offers ${missing.join(', ')}`); }

  rows.push({ id, w: def.w, h: def.h, share, runs, ms, labels: labels.length, offZone, exits: shown.length, links: links.length, missing });
}

if (ONLY) {
  const r = rows[0];
  console.log(`\n${r.id} — ${r.w}×${r.h} tiles`);
  console.log(`  ground        ${(r.share * 100).toFixed(1)}% of the map is drawn`);
  console.log(`  raster        ${r.runs} fills for ${r.w * r.h} tiles (${(r.w * r.h / Math.max(1, r.runs)).toFixed(1)} tiles a call), ${r.ms.toFixed(1)} ms`);
  console.log(`  names         ${r.labels} places, ${r.offZone} of them on the wrong one`);
  console.log(`  ways out      ${r.exits} shown, ${r.links} declared` + (r.missing.length ? ` — nothing offers ${r.missing.join(', ')}` : ''));
  const list = Atlas.waysOut();
  for (const e of list) console.log(`                ${String(e.x | 0).padStart(3)},${String(e.y | 0).padEnd(3)} ${e.name}`);
} else {
  const worst = rows.slice().sort((a, b) => b.ms - a.ms).slice(0, 4);
  console.log('\n  the big ones: what a level costs to draw from above');
  for (const r of worst) {
    console.log(`    ${r.id.padEnd(12)} ${String(r.w + '×' + r.h).padStart(9)} → ` +
      `${String(r.runs).padStart(6)} fills (${(r.w * r.h / Math.max(1, r.runs)).toFixed(1)} tiles a call), ${r.ms.toFixed(1).padStart(5)} ms, ` +
      `${r.labels} names, ${r.exits} ways out`);
  }
  console.log(`\n${rows.length} levels mapped · ${errors} errors · ${warnings} warnings`);
}
process.exit(errors ? 1 : 0);
