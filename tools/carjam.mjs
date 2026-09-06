/* NINE CARS, ONE TOWN, AND SOMEBODY IN THE WAY.
 *
 * Dev-time only, and not shipped: a way to find out whether the traffic can get
 * itself out of trouble, in numbers, without driving into it nine times and
 * watching.
 *
 * The thing that goes wrong out there is BEACHING. A route is a line somebody
 * drew down a lane; a car shoved off that line — by the player, mostly — steers
 * for its target from wherever it was left, and where it was left is frequently
 * the footway. On the footway it can only go forwards, and forwards is a shop
 * front. That is what this reproduces: four scenarios, a few seconds each, and
 * four numbers that say whether the recovery rules in engine/cars.js worked.
 *
 * It runs the REAL Cars, Peds, World and Collide on the REAL town out of
 * data/levels.js, with a stub of everything a car talks to that is not being
 * measured — the sound, the particles, the toasts, the colleagues upstairs.
 * Nothing here patches the driving; these are the shipped files.
 *
 *   node tools/carjam.mjs                     all four, the default seed
 *   SEED=7 node tools/carjam.mjs              a different set of shoves
 *   node tools/carjam.mjs path/to/cars.js     some other copy of the driving
 *
 * That last form is the point of the whole file: run it against the previous
 * engine/cars.js and the two columns are the argument.
 *
 * OFF THE ROAD is the number that matters — the share of car-frames spent with
 * a car's middle on something that is not tarmac — and STALLED is the giveaway,
 * because a car that is off the road and still moving is a lost driver and a
 * car that is off the road and stopped is furniture.
 *
 * The first scenario is the control and it is the one to watch when changing
 * any of this: undisturbed traffic should come out identical, to the lap. All
 * of the recovery in engine/cars.js is meant to be dead code until something
 * goes wrong, and a change that moves scenario 1 has changed the driving.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SEED = +(process.env.SEED || 12345);
const CARS_FILE = process.argv[2] || path.join(ROOT, 'engine', 'cars.js');

/* ---- the stub page --------------------------------------------------------
   A browser's worth of nothing. Everything below it is the real thing; this is
   only what engine/core.js reads on its way past — a document to query, a media
   query to answer — and none of it is what is being measured. */
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

/* One seeded generator for the whole run, INSIDE the sandbox, so the handful of
   places the engine reaches for a random number — a tile's texture seed, a
   car's wobble — land the same way every time and two runs are comparable. The
   host's own Math is untouched. */
vm.runInContext(`
  var __seed = ${SEED};
  Math.random = () => (__seed = (__seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
`, ctx);

const load = (rel, abs) =>
  vm.runInContext(fs.readFileSync(abs || path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });

/* ---- the code under test --------------------------------------------------
   Loaded as text into one shared global, which is the whole trick: engine/*.js
   are plain scripts that declare globals and read each other's, and a vm
   context is exactly that — a page without a page. In the order index.html
   loads them, because they depend on each other in that order. */
load('data/world.js');
load('data/levels.js');
load('engine/core.js');
load('engine/world.js');
load('engine/collide.js');
load('engine/cars.js', CARS_FILE);

/* Everything a car talks to and none of it the driving: the noise, the smoke,
   the toasts, the achievements, the twenty colleagues who are all upstairs. */
vm.runInContext(`
  var G = { state: 'play' };
  var P = { x: -9999, y: -9999, dir: 2, moving: false };
  var NPCM = { list: [] };
  var Sprites = { dirOf: (x, y) => Math.abs(x) > Math.abs(y) ? (x > 0 ? 1 : 3) : (y > 0 ? 2 : 0) };
  var Sfx = { on: false, horn(){}, thud(){}, scrape(){}, door(){}, deny(){}, engine(){} };
  var FX = { motion: false, shake(){}, parts: [] };
  var UI = { toast(){} };
  var Ach = { get(){} };
  var Keys = { up: 0, down: 0, left: 0, right: 0 };
  var Stick = { on: false, x: 0, y: 0 }, Throttle = { on: false, y: 0 };
  /* The camera is real, because rejoin() will not move a car anybody can see
     and a harness that leaves Cam undefined is a harness testing the easy
     branch. Parked on the player, as Cam.follow would leave it. */
  var Cam = { x: 0, y: 0, w: 800, h: 600,
    visible(x, y) { return x > this.x - 60 && x < this.x + this.w + 60
                      && y > this.y - 60 && y < this.y + this.h + 60; } };
  function releaseSticks(){}
  function count(){}
  function playerFits(){ return true; }
  function zoneCheck(){}
`, ctx);
load('engine/peds.js');

const g = name => vm.runInContext(name, ctx);
const { LEVELS, Cars, World, Peds, Keys, Cam, P, TILE } = {
  LEVELS: g('LEVELS'), Cars: g('Cars'), World: g('World'), Peds: g('Peds'),
  Keys: g('Keys'), Cam: g('Cam'), P: g('P'), TILE: g('TILE')
};

/* The town is whichever level has traffic in it, rather than a level named
   here: a second one with a route in it should be measurable without editing
   this file. */
const town = Object.values(LEVELS).find(l => (l.cars || []).some(c => c.route));
if (!town) { console.error('carjam: no level in data/levels.js has any traffic in it'); process.exit(1); }

/* Every scenario starts from a freshly built town and a re-seeded generator.
   That matters more than it looks: run them end to end on one world and each
   one starts from wherever the last one left the cars, so two versions of the
   driving are being asked different questions by the time the third one
   begins — and the comparison this file exists for is worthless. */
function reset() {
  if (Cars.getOutQuietly) Cars.getOutQuietly();
  vm.runInContext('__seed = ' + SEED, ctx);
  seed = SEED ^ 0x5f3759df;
  World.build(town);
  P.x = -9999; P.y = -9999;
  Keys.up = Keys.down = Keys.left = Keys.right = 0;
}

const traffic = () => World.cars.filter(c => c.traffic);
const driveable = () => World.cars.find(c => c.canDrive);
/* Asked of World rather than of Cars.onRoad(), so that an older engine/cars.js
   that has no such method is judged by exactly the same measure. */
const onRoad = c => World.surfAt(Math.floor(c.x / TILE), Math.floor(c.y / TILE)) === 'tarmac';

let seed = SEED ^ 0x5f3759df;   /* the harness's own, for the shoves */
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

/* ---- the loop -------------------------------------------------------------
   What engine/boot.js does per frame, minus everything that is not the traffic:
   the cars, the people they stop for, and a camera that follows whoever is
   driving. `each` is the scenario's chance to interfere. */
const dt = 1 / 60;
function run(secs, each) {
  const seen = new Map();
  for (const c of traffic()) seen.set(c, { x: c.x, y: c.y, still: 0, worst: 0, off: 0, legs: 0, leg: c.leg });
  let frames = 0, offFrames = 0;
  for (let f = 0; f < secs * 60; f++) {
    if (each) each(f);
    Cars.update(dt);
    Peds.update(dt);
    Cam.x = P.x - Cam.w / 2; Cam.y = P.y - Cam.h / 2;
    for (const c of traffic()) {
      const s = seen.get(c);
      frames++;
      if (!onRoad(c)) { offFrames++; s.off++; }
      if (c.leg !== s.leg) { s.legs++; s.leg = c.leg; }
      if (Math.hypot(c.x - s.x, c.y - s.y) < 2) { s.still += dt; s.worst = Math.max(s.worst, s.still); }
      else { s.x = c.x; s.y = c.y; s.still = 0; }
    }
  }
  const all = [...seen.values()];
  return {
    off: 100 * offFrames / (frames || 1),
    beached: all.reduce((a, s) => a + s.off, 0) / 60,
    stalled: all.filter(s => s.worst > 12).length,
    held: Math.max(...all.map(s => s.worst)),
    legs: all.reduce((a, s) => a + s.legs, 0),
    stranded: traffic().filter(c => !onRoad(c)).length,
    rolling: traffic().filter(c => Math.abs(c.fwd) > 8).length
  };
}
const say = (title, r, ...extra) => {
  console.log(title);
  console.log('    off the road      ' + r.off.toFixed(2) + '% of car-frames'
    + '  (' + r.beached.toFixed(0) + ' car-seconds)');
  console.log('    stalled over 12s  ' + r.stalled + '/' + traffic().length
    + '   longest hold-up ' + r.held.toFixed(0) + 's');
  console.log('    at the end        ' + r.rolling + '/' + traffic().length + ' rolling, '
    + r.stranded + ' still off the road');
  for (const line of extra) console.log('    ' + line);
};

/* ---- 1. the control -------------------------------------------------------
   Nobody interfering. Every number here should be nothing and the leg count
   should not move between two versions of the driving. */
reset();
say('1. three minutes, left alone', run(180));

/* ---- 2. shoved ------------------------------------------------------------
   The pool car put alongside a moving traffic car and driven into its flank,
   from whichever side keeps the shove pointing at the kerb, and LEANT ON — a
   player shoving a car off the road does not let go after half a second. This
   is the one that actually happens. */
reset();
const pool = driveable();
Cars.take(pool);
let victim = null;
const shoves = run(120, f => {
  if (f % (60 * 10) === 0) {
    victim = traffic()[Math.floor(rand() * traffic().length)];
    const c = Math.cos(victim.a), s = Math.sin(victim.a);
    /* Come at it from the side that is still road, so it is shoved towards a
       kerb rather than away from one. */
    const side = onRoad({ x: victim.x - s * TILE * 2.2, y: victim.y + c * TILE * 2.2 }) ? 1 : -1;
    const k = side * TILE * 2.2;
    pool.x = victim.x - s * k; pool.y = victim.y + c * k;
    pool.a = Math.atan2(victim.y - pool.y, victim.x - pool.x);
    pool.fwd = 230; pool.lat = 0;
  }
  Keys.up = 1;
  if (victim && Math.hypot(victim.x - pool.x, victim.y - pool.y) < TILE * 3.2 && f % (60 * 10) < 60 * 7)
    pool.a = Math.atan2(victim.y - pool.y, victim.x - pool.x);
});
Keys.up = 0;
if (Cars.driving) Cars.getOut();
say('2. twelve sustained shoves into a moving car', shoves);

/* ---- 3. abandoned ---------------------------------------------------------
   The player's car left across the eastbound lane of Bellhaven Road, which is
   what the pool car is for. Nothing is off the road here: the question is
   whether the town goes round it or queues behind it until five. */
reset();
const abandoned = driveable();
abandoned.x = 40 * TILE; abandoned.y = 17.5 * TILE; abandoned.a = Math.PI / 2;
abandoned.fwd = abandoned.lat = 0;
P.x = 20 * TILE; P.y = 30 * TILE;                 /* watching from a street away */
say('3. ninety seconds with a car left across a lane', run(90));

/* ---- 4. beached -----------------------------------------------------------
   The hard one, and the one that used to be permanent: up on the footway
   outside the shops, nose to the windows, with nothing in front of them and no
   way forward. Two of them are a whole block from any leg of their own route,
   which is the case nothing but rejoin() will ever get out of. */
reset();
P.x = 16 * TILE; P.y = 4 * TILE;                  /* over in the car park, not looking */
const kerbside = [30, 36, 42, 48, 54, 68, 74, 80, 86];
traffic().forEach((c, i) => {
  c.x = kerbside[i % kerbside.length] * TILE; c.y = 14.6 * TILE;
  c.a = -Math.PI / 2; c.fwd = c.lat = 0;
});
say('4. ninety seconds after all nine are put on the footway', run(90));

console.log('  seed ' + SEED + ', driving from '
  + path.relative(ROOT, CARS_FILE));
