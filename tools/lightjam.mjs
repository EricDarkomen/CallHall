/* THREE SETS OF LIGHTS, FOURTEEN VEHICLES, AND NOBODY WATCHING.
 *
 * Dev-time only, and not shipped. carjam.mjs asks whether the traffic can get
 * itself out of trouble; this asks the two questions a signal introduces, both
 * of which are invisible from a driving seat until the day they are not:
 *
 *   DOES ANYBODY RUN A RED. Measured properly — not "was a car past the line
 *   while the light was red", which every car that entered on a green and is
 *   still crossing would fail, but "did a car CROSS the line during a red it
 *   could have stopped for". Sampled every frame, per car, per arm.
 *
 *   DOES THE TOWN STILL MOVE. A signal is the only thing on this map that can
 *   stop a vehicle for fourteen seconds on purpose, which means every
 *   stuck-detector, deadlock-breaker and pull-round rule in engine/cars.js is
 *   now being fed a case it was never written for. If any of them fires at a
 *   red light the symptom is the same: a queue that creeps into itself, goes
 *   round itself down the oncoming lane, and sounds the horn about it. So the
 *   shunts, the pull-rounds and the horns are counted, and at a red they should
 *   all be nothing.
 *
 * And the third question, which is about the crossings rather than the cars:
 *
 *   DOES ANYBODY EVER GET ACROSS. Two of the three installations only ever do
 *   anything because a pedestrian asked. If the demand never lands, or lands
 *   and is never served, the crossings are scenery with a bleeper — so the man
 *   is counted going green, and the people held at the kerb are counted with
 *   him.
 *
 * It runs the REAL Signals, Cars, Peds, World and Collide on the REAL town out
 * of data/levels.js, with a stub of everything that is not being measured.
 * Nothing here patches any of it; these are the shipped files.
 *
 *   node tools/lightjam.mjs                    five minutes of Bellhaven
 *   MINS=20 node tools/lightjam.mjs            longer, for the rare ones
 *   node tools/lightjam.mjs path/to/signals.js some other copy of the lights
 *
 * That last form is the point of the whole file: run it against the previous
 * engine/signals.js and the two columns are the argument. A stub that answers
 * -1 to everything is the other useful comparison — it is the town as it was
 * before there were any lights in it, and it is how the figures in the README
 * were taken.
 *
 * SEED exists and is honest about doing very little. Unlike carjam.mjs, nothing
 * in here shoves anything: the scenario is a town left alone, so the only thing
 * the seed reaches is the cosmetic randomness in the build, and two seeds will
 * usually agree to the frame. It is here so that a future change which starts
 * reading Math.random somewhere that matters can be caught, not because the
 * numbers move today.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SEED = +(process.env.SEED || 12345);
const MINS = +(process.env.MINS || 5);
const SIG_FILE = process.argv[2] || path.join(ROOT, 'engine', 'signals.js');

/* ---- the stub page ---- */
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
  var __seed = ${SEED};
  Math.random = () => (__seed = (__seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
`, ctx);

const load = (rel, abs) =>
  vm.runInContext(fs.readFileSync(abs || path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });

load('data/world.js');
load('data/levels.js');
load('engine/core.js');
load('engine/world.js');
load('engine/collide.js');

/* Counted rather than silenced. A horn at a red light is a bug in the rules
   this file exists to check, so it has to be audible to the harness even
   though it is inaudible to everybody else. */
vm.runInContext(`
  var G = { state: 'play' };
  var P = { x: -9999, y: -9999, dir: 2, moving: false };
  var NPCM = { list: [] };
  var Sprites = { dirOf: (x, y) => Math.abs(x) > Math.abs(y) ? (x > 0 ? 1 : 3) : (y > 0 ? 2 : 0) };
  var TALLY = { horn: 0, bleep: 0 };
  var Sfx = { on: false, horn(){ TALLY.horn++; }, bleep(){ TALLY.bleep++; },
              thud(){}, scrape(){}, door(){}, deny(){}, blip(){}, engine(){} };
  var FX = { motion: false, shake(){}, parts: [] };
  var UI = { toast(){} };
  var Ach = { get(){} };
  var Keys = { up: 0, down: 0, left: 0, right: 0 };
  var Stick = { on: false, x: 0, y: 0 }, Throttle = { on: false, y: 0 };
  var Cam = { x: 0, y: 0, w: 800, h: 600,
    visible(x, y) { return x > this.x - 60 && x < this.x + this.w + 60
                      && y > this.y - 60 && y < this.y + this.h + 60; } };
  function releaseSticks(){}
  function count(){}
  function playerFits(){ return true; }
  function zoneCheck(){}
`, ctx);
load('engine/cars.js');
load('engine/peds.js');
load('engine/signals.js', SIG_FILE);

const g = name => vm.runInContext(name, ctx);
const LEVELS = g('LEVELS'), Cars = g('Cars'), World = g('World'),
      Peds = g('Peds'), Signals = g('Signals'), TALLY = g('TALLY'), TILE = g('TILE');

const town = Object.values(LEVELS).find(l => (l.signals || []).length);
if (!town) { console.error('lightjam: no level in data/levels.js has any signals in it'); process.exit(1); }
World.build(town);

/* THE CAMERA IS PARKED ON A CROSSING, and that is not decoration: the bleeper
   only sounds where somebody could hear it (see Signals.crossingTick), so a
   harness with its camera at the origin measures a crossing that never makes a
   noise. Put it on the first one and the metronome is on the record. */
const watched = Signals.list().find(i => i.kind === 'pelican');
if (watched) {
  const cam = g('Cam');
  cam.x = watched.arms[0].x - cam.w / 2;
  cam.y = watched.arms[0].y - cam.h / 2;
}

const traffic = () => World.cars.filter(c => c.traffic);

/* ---- where every car is relative to every arm ---------------------------
   One number per car per arm: how far in front of that arm's stop line the car
   is, along the direction that arm's traffic travels, or null for "this arm is
   nothing to do with this car". A sign change from positive to negative is a
   car crossing the line, and crossing it while the arm was red is the whole
   question.

   Measured here rather than asked of Signals, deliberately. A harness that
   asks the code under test whether the code under test is happy is not a
   harness — this is the geometry done again, from the arm's own numbers, by
   something that does not know what a latch is. */
const arms = [];
for (const inst of Signals.list()) for (const a of inst.arms) arms.push(a);

function offsets() {
  const out = new Map();
  for (const car of traffic()) {
    const row = [];
    for (const a of arms) {
      const c = Math.cos(car.a), s = Math.sin(car.a);
      if (c * a.gx + s * a.gy < 0.5) { row.push(null); continue; }
      const dx = a.sx - car.x, dy = a.sy - car.y;
      const across = Math.abs(dx * -a.gy + dy * a.gx);
      const along = dx * a.gx + dy * a.gy;
      row.push(across > a.reach || Math.abs(along) > TILE * 6 ? null : along);
    }
    out.set(car, row);
  }
  return out;
}

const dt = 1 / 60;
const SECS = MINS * 60;
let jumped = 0, jumpedOn = [], crossed = 0, shunts = 0, pulls = 0;
let heldRed = 0, heldFrames = 0, longestHold = 0;
let manGreen = 0, pedsHeld = 0, pressed = 0;
const holdStart = new Map();
const wasPed = new Map();
const wasMan = new Map();
const shuntWas = new Map(), pullWas = new Map();

let prev = offsets();
for (let f = 0; f < SECS * 60; f++) {
  /* What the lights were showing BEFORE this frame's cars moved, because that
     is the aspect a car crossing during this frame was looking at. */
  const aspects = arms.map(a => Signals.aspect(a));
  const calls = Signals.list().map(i => i.called);
  for (const c of traffic()) {
    shuntWas.set(c, c.shunt); pullWas.set(c, c.pull);
  }
  const pedStopped = new Map();
  for (const p of Peds.list()) pedStopped.set(p, { x: p.x, y: p.y });

  Signals.update(dt);
  Cars.update(dt);
  Peds.update(dt);

  const now = offsets();
  for (const car of traffic()) {
    const a = prev.get(car), b = now.get(car);
    if (!a || !b) continue;
    for (let i = 0; i < arms.length; i++) {
      if (a[i] === null || b[i] === null) continue;
      if (!(a[i] > 0 && b[i] <= 0)) continue;        /* not a crossing this frame */
      crossed++;
      const asp = aspects[i];
      /* Amber is allowed to be crossed by anything too close to stop, which is
         the rule in the Highway Code and the rule in Signals.go(). Only a red
         and a red-and-amber are offences, and only from a car that had room. */
      if (asp === 'red' || asp === 'redamber') { jumped++; jumpedOn.push(arms[i].id); }
    }
  }
  /* Holding, and for how long. A car standing at a red is the thing that is
     supposed to happen; a car standing at one for the better part of a minute
     is a phase that never came. */
  for (const car of traffic()) {
    if (car.atRed) {
      heldFrames++;
      if (!holdStart.has(car)) holdStart.set(car, f);
      longestHold = Math.max(longestHold, (f - holdStart.get(car)) / 60);
    } else holdStart.delete(car);
    if (car.atRed) {
      if (car.shunt !== shuntWas.get(car)) shunts++;
      if (car.pull > 0 && !(pullWas.get(car) > 0)) pulls++;
    }
  }
  heldRed += traffic().filter(c => c.atRed).length;
  /* The crossings. The man going green is the only evidence that the demand
     got through, and somebody standing still at a kerb with a red man is the
     only evidence that anybody is obeying it. */
  Signals.list().forEach((inst, i) => {
    if (inst.kind !== 'pelican') return;
    const m = Signals.man(inst);
    if (m === 'green' && wasMan.get(inst) !== 'green') manGreen++;
    wasMan.set(inst, m);
    if (!calls[i] && inst.called) pressed++;
  });
  for (const p of Peds.list()) {
    const was = pedStopped.get(p);
    if (!p.walking && Math.abs(p.x - was.x) < .01 && Math.abs(p.y - was.y) < .01) {
      for (const inst of Signals.list()) {
        if (inst.kind !== 'pelican' || Signals.man(inst) !== 'red') continue;
        if (Math.hypot(p.x - inst.arms[0].x, p.y - inst.arms[0].y) < TILE * 6
            || Math.hypot(p.x - inst.arms[1].x, p.y - inst.arms[1].y) < TILE * 6) {
          if (!wasPed.get(p)) { pedsHeld++; wasPed.set(p, true); }
        }
      }
    } else wasPed.set(p, false);
  }
  prev = now;
}

const n = traffic().length;
console.log('Bellhaven, ' + MINS + ' minutes, seed ' + SEED);
console.log('  ' + Signals.list().length + ' installations, ' + arms.length + ' arms, '
  + n + ' vehicles, ' + Peds.list().length + ' on foot');
console.log('');
console.log('  stop lines crossed   ' + crossed);
console.log('  ON A RED             ' + jumped
  + (jumped ? '   <-- ' + [...new Set(jumpedOn)].join(' ') : '   (nobody)'));
console.log('  car-seconds held     ' + (heldFrames / 60).toFixed(0)
  + '   longest single hold ' + longestHold.toFixed(1) + 's');
console.log('  at a red: shunts     ' + shunts + '   pull-rounds ' + pulls
  + '   horns anywhere ' + TALLY.horn);
console.log('  vehicles rolling     ' + traffic().filter(c => Math.abs(c.fwd) > 8).length + '/' + n);
console.log('');
console.log('  buttons pressed      ' + pressed);
console.log('  green man            ' + manGreen + '   bleeps ' + TALLY.bleep);
console.log('  people held at kerb  ' + pedsHeld);

/* The two that are faults rather than measurements. A red jumped is a car that
   drove through a signal, and a hold longer than a whole cycle is a phase that
   never arrived — either one makes this exit non-zero so a change to the lights
   cannot land quietly. */
const bad = [];
if (jumped) bad.push(jumped + ' vehicle(s) crossed a stop line on red');
if (longestHold > 75) bad.push('a vehicle was held for ' + longestHold.toFixed(0) + 's');
if (shunts || pulls) bad.push('a recovery rule fired at a red light');
if (!manGreen) bad.push('no crossing ever served anybody');
if (bad.length) { console.log('\nFAIL\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('\nOK');
