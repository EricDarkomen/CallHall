/* TWO CROWDS, ONE DOORWAY.
 *
 * Dev-time only, and not shipped: a way to watch the thing that goes wrong at a
 * door go wrong, in numbers, without standing in the break room at lunchtime
 * waiting for it.
 *
 * A doorway is one square wide and holds one person, so two groups walking
 * through it in opposite directions are the hard case: somebody gets onto the
 * sill, the square they need is the square somebody coming the other way is
 * standing on waiting for the sill, and the pair of them cork the only way
 * through until the errand clock gives up on them both. That deadlock is what
 * this reproduces — twenty rooms of it in a few seconds — and what the doorway
 * rules in engine/npc.js are for.
 *
 * It runs the REAL Nav and NPCM out of engine/npc.js with a stub floor around
 * them: a wall with one hole in it, six people going each way, and a made-up
 * World, player and renderer, because none of that is what is being measured.
 *
 *   node tools/doorjam.mjs                    one run, the default seed
 *   SEED=7 SECS=300 node tools/doorjam.mjs    a different crowd, for longer
 *   node tools/doorjam.mjs path/to/npc.js     some other copy of the walk
 *
 * Crossings is the number that matters — a person changing sides is a person
 * the door actually passed — and the freeze is the giveaway: a door that has
 * deadlocked freezes the entire floor, not one walk.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TILE = 16, MAPW = 21, MAPH = 21;
const WALLY = 10, DOORX = 10;                   /* the wall, and the hole in it */
const SECS = +(process.env.SECS || 180);
const SEED = +(process.env.SEED || 12345);

/* ---- the stub floor -------------------------------------------------------
   A room, a wall across it, one square of doorway, and a corridor below. */
const solid = [];
for (let y = 0; y < MAPH; y++) {
  solid.push([]);
  for (let x = 0; x < MAPW; x++)
    solid[y][x] = (x === 0 || y === 0 || x === MAPW - 1 || y === MAPH - 1
      || (y === WALLY && x !== DOORX)) ? 1 : 0;
}
const World = {
  level: 'office', solid, objects: [],
  openings: new Set([DOORX + ',' + WALLY]),
  isSolid: (x, y) => (x < 0 || y < 0 || x >= MAPW || y >= MAPH) ? true : !!solid[y][x],
  isOpening(x, y) { return this.openings.has(x + ',' + y); },
  at: () => [],
  zoneAt: (x, y) => y < WALLY ? 'room' : 'hall'
};
/* Not playing: there is no player in this, and 'title' is what every read of
   P in the walk is guarded by. */
const G = { state: 'title', minutes: 600, flags: {} };
const P = { x: -999, y: -999, moving: false };
const Sprites = {
  dirOf: (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0),
  seatedAt: () => null
};
const Dialogue = { on: false, npc: null };
const Phones = { ringing: [] };
const Rel = { get: () => 0 };

let seed = SEED;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const rnd = (a, b) => a + rand() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(rand() * a.length)];
const chance = p => rand() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---- the code under test --------------------------------------------------
   Loaded as text and run with the stubs above in scope, which is the whole
   trick: engine/*.js are plain scripts and a plain script is a function body
   with globals in it. Nothing here patches the walk; it is the shipped file. */
const file = process.argv[2] || path.join(HERE, '..', 'engine', 'npc.js');
const src = fs.readFileSync(file, 'utf8').replace("'use strict';", '');
const { NPCM } = new Function('TILE', 'MAPW', 'MAPH', 'World', 'G', 'P', 'Sprites', 'Dialogue',
  'Phones', 'Rel', 'NPCS', 'WP', 'rnd', 'ri', 'pick', 'chance', 'clamp', 'lerp',
  src + '\nreturn { Nav, NPCM };')(
  TILE, MAPW, MAPH, World, G, P, Sprites, Dialogue, Phones, Rel, [], {},
  rnd, ri, pick, chance, clamp, lerp);

/* ---- the crowd ------------------------------------------------------------
   Six each way, going somewhere on the far side of the wall and standing there
   a few seconds before setting off back, which is what a break is. */
const spot = room => [3 + Math.floor(rand() * 15),
  room ? 2 + Math.floor(rand() * 7) : 12 + Math.floor(rand() * 7)];
const list = [];
const add = (id, x, y, gx, gy) => {
  const def = { id, name: id, face: '🙂', desk: [x, y], lines: [] };
  const t = NPCM.traits(def);
  list.push({
    def, id, name: id, face: '🙂', role: '', t, level: 'office',
    x: (x + .5) * TILE, y: (y + .5) * TILE, goal: [gx, gy], crossed: 0, side: null, turn: 0,
    step: 0, speed: TILE * t.pace, bob: 0, dir: 2, say: '', sayT: 0, nextSay: 1e9, stunTimer: 0,
    dest: 'x', destKey: '', stuck: 0, post: null, walking: false, chat: null, chatCool: 1e9,
    callOut: null, lookAt: null, lookT: 0, idleT: 1e9, evade: 0, evadeX: 0, evadeY: 0,
    hx: 0, hy: 1, next: null, nextFrom: '', best: 1e9, noProg: 0, gaveUp: null, errand: null,
    parked: false, waitDoor: 0, holdWant: null, holdFor: 0, lastAim: 'x', retry: 0,
    queued: 0, waitingFor: null, wayBack: null, wayFor: 0, squeeze: 0
  });
};
for (let i = 0; i < 6; i++) { const [x, y] = spot(false); add('in' + i, x, y, ...spot(true)); }
for (let i = 0; i < 6; i++) { const [x, y] = spot(true); add('out' + i, x, y, ...spot(false)); }
NPCM.all = list; NPCM.list = list;

/* ---- the loop -------------------------------------------------------------
   What engine/boot.js does with NPCM.update, minus everything that is not the
   walk: the standing-still map, the destination, and the arrive-or-walk test
   from update() itself. */
const dt = 1 / 60;
const tick = () => {
  NPCM.now += dt;
  NPCM.busyTiles.clear(); NPCM.stillTiles.clear();
  for (const n of list) if (!n.walking) {
    const k = Math.floor(n.x / TILE) + ',' + Math.floor(n.y / TILE);
    NPCM.busyTiles.add(k); NPCM.stillTiles.set(k, n);
  }
  NPCM.dynamics();
  for (const n of list) {
    if (n.squeeze > 0) n.squeeze -= dt;
    if (n.retry && NPCM.now > n.retry) { n.retry = 0; n.post = null; NPCM.repath(n); }
    const [dx, dy] = n.goal;
    const [tx, ty] = NPCM.post(n, dx, dy);
    const cx = n.x / TILE - .5, cy = n.y / TILE - .5;
    const near = Math.hypot(tx - cx, ty - cy);
    const onPost = Math.floor(n.x / TILE) === tx && Math.floor(n.y / TILE) === ty;
    if (n.parked && (near > 1.05 || (!onPost && near > .8))) n.parked = false;
    const there = n.parked || near <= (n.walking ? .34 : .62) || (onPost && n.noProg > 1.5);
    if (!there) { NPCM.walk(n, dt, tx, ty); continue; }
    if (n.walking) NPCM.repath(n);
    n.walking = false; n.parked = true; n.waitDoor = 0;
    NPCM.makeWay(n, false);
    NPCM.nestle(n, dt, tx, ty);
    /* Turn round and go back, but only from the far side: giving up and
       standing still where you are is not getting there. */
    const far = (Math.floor(n.y / TILE) < WALLY) === (n.goal[1] < WALLY);
    if (!far) n.turn = 0;
    else if (!n.turn) n.turn = NPCM.now + rnd(3, 7);
    else if (NPCM.now > n.turn) {
      n.goal = spot(!(n.goal[1] < WALLY));
      n.post = null; n.parked = false; n.turn = 0; NPCM.repath(n);
    }
  }
  /* A crossing is a change of SIDE. Arriving is not: somebody who gave up and
     took the square they were standing on has not been through the door. */
  for (const n of list) {
    const side = Math.floor(n.y / TILE) < WALLY ? 'room' : 'hall';
    if (n.side && n.side !== side) n.crossed++;
    n.side = side;
  }
};

let lastMove = 0, freeze = 0, prev = list.map(n => [n.x, n.y]);
for (let f = 0; f < 60 * SECS; f++) {
  tick();
  const moved = list.some((n, i) => Math.hypot(n.x - prev[i][0], n.y - prev[i][1]) > .05);
  prev = list.map(n => [n.x, n.y]);
  if (moved) lastMove = NPCM.now; else freeze = Math.max(freeze, NPCM.now - lastMove);
}
const through = list.reduce((a, n) => a + n.crossed, 0);
const never = list.filter(n => !n.crossed).length;
console.log(`seed ${SEED}, ${SECS}s: ${through} crossings`
  + ` | longest frozen stretch ${freeze.toFixed(1)}s`
  + ` | never got through ${never}/${list.length}`);
