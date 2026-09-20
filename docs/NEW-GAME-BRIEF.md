# Making a different game on this engine

A brief to hand to Claude (the chat one, where a wide mix of expert voices is
cheap) so that what comes back is a **complete game's worth of content** that a
Claude Code session can apply to this repository mechanically, one file at a
time, without redesigning anything on the way in.

The engine here is not a call-centre engine. It is a tile-based, top-down,
no-build-step browser RPG engine that currently has a call centre in it. Most of
it — the levels, the streaming, the walking crowds, the traffic, the sky, the
renderer, the maps, the dialogue, the panels, the save — does not know what the
fiction is. A handful of systems do, and they are named in §4 so a new game can
decide to re-skin them or to ask for them to change.

**How to use this document**

1. Open a normal Claude chat. Paste everything between the `=== PROMPT ===`
   markers in §1. Attach or paste the appendices the prompt asks for (§5–§8);
   they are the data contracts and the engine inventory, and without them the
   output will not apply cleanly.
2. Answer the six questions it asks about the game you want. Everything else it
   proposes itself.
3. It comes back in numbered parts. Hand the parts to a Claude Code session on
   this repo in order, with the applying prompt in §9. Each part is a whole file
   or a whole named section, never a diff, because a diff against a file the
   chat has never read is the one thing that does not survive the trip.

---

## 1. The prompt

=== PROMPT ===

You are the design team for a new game. It will be built on an existing engine,
which is described below, and it will replace that engine's current content
entirely. I want the whole content layer designed and written: the world, the
people, the plot, the art sourcing, the maps, the economy, the encounters, the
endings.

Work as a team of specialists, and say which of you is speaking when it matters:

- a **narrative designer** for premise, cast, arc and endings;
- a **level designer** for the world map, the buildings and the routes through
  them, who thinks in tiles and sightlines;
- a **systems designer** for the loop, the numbers, the progression and the
  failure states;
- a **pixel-art director** who sources from OpenGameArt and knows licence
  compatibility is a design constraint, not paperwork;
- a **script editor** who writes the prose and enforces the house voice;
- a **QA/engineering reader** who checks every proposal against the engine's
  actual contracts and says plainly when something needs an engine change.

### What the engine already does (design to this)

Tile grid at 32px. Levels are data: a size, rooms carved out of solid, doors,
surfaces, furniture, arrival points, and links to other levels. Levels stream —
built lazily, kept in a small LRU cache, neighbours prefetched — so a world can
be dozens of places without a loading screen. One level can be *composed of
parts*: a town and a countryside stamped into an island at an offset, each part
authored independently.

On top of that, already written and content-agnostic: a walking crowd with
schedules, errands and a going-home routine; drivable cars with lanes,
junctions and traffic lights; pedestrians who use crossings; a day/night clock
with four seasons, sunrise/sunset per season, and weather that wets the ground
and falls past the camera; a renderer with wall occlusion, roofs, per-zone
palettes and a light grade; a minimap and a full map screen that draw any level
without knowing what it is; a dialogue system with branching, guards and
faces; an inventory/skills/jobs/achievements panel suite; turn-based encounters;
a save system; twin-stick touch controls, driving controls and a third control
for hand-held items; three arcade minigames behind one interface; and a level
editor that draws with the game's own renderer.

### What you must produce

Design the game first, in prose, and get my agreement before writing content.
Then produce the content in these parts, in this order, each part a complete
file or a complete named block, ready to drop in:

1. **The premise and the loop** — one page. What the player does in the first
   ten minutes, the first hour, and the tenth hour. What the failure state is.
   What the clock means in this world (the engine has a day that runs on a
   clock with a working window in it; say what that window is for you, or say
   it should go).
2. **The world map** — the places, as a level catalogue: every level with its
   size in tiles, its rooms, its doors, its links to other levels, and which
   one the player starts on. Draw each level as ASCII first and say what a
   player sees from the arrival point. Outdoor levels get streets, junctions
   and a coast or an edge; indoor levels get a sequence of rooms, never one
   hall. Follow Appendix A's level contract exactly.
3. **The cast** — every person: id, name, face, role, where they work, their
   schedule through the day, where they go at the end of it, what they say
   unprompted, and their full dialogue tree with branches and guards. Follow
   Appendix A's NPC contract exactly.
4. **The things** — items, what they do, what they cost, what a shop sells;
   skills and what they unlock; jobs (quests) with steps and tracked targets;
   achievements. Appendix A has each contract.
5. **The encounters** — the engine's turn-based system is a conversation: the
   other party has a need and gives a tell each turn, the player picks a reply,
   a reply that answers the need lands and builds rapport, and enough rapport
   ends it well without reducing anything to zero. Re-author that as whatever
   your game's confrontation is — a negotiation, a diagnosis, an interrogation,
   a repair, a haggle — and give me the full cast of opponents and the full move
   list. If your game genuinely has no such confrontation, say so and say what
   replaces it, and expect that to be an engine change (§ engine changes below).
6. **The art** — every sprite sheet the game needs, sourced from OpenGameArt or
   another site whose licence you have actually read. For each sheet: the
   submission page URL, the file URL, the licence, every artist to credit, and
   the rectangles you want cropped from it. Licence compatibility is a hard
   constraint: sheets under a ShareAlike licence must be their own file and may
   not be packed with permissively licensed art. Prefer the LPC (Liberated Pixel
   Cup) ecosystem — it is 32px, it is internally consistent, and the existing
   art is already from it. Say what each sheet is FOR in the world, and what the
   fallback is if a crop turns out unusable (the engine can draw an emoji).
7. **The writing** — the ambient script: what people say on the radio/chat/
   noticeboard equivalent, the inspection text for scenery, the endings, and the
   opening. Every line in the house voice below.
8. **The engine changes you need** — see below. Last, because you can only know
   them once the design is settled.

### The house voice

This matters more than usual: the existing game's writing is its whole
character, and the repository's own comments are written the same way. Match it.

- British English. Curly apostrophes and quotes, always — `’` and `“ ”`, never
  `'` or `"` inside player-facing text. An automated check enforces this.
- Specific over general. Not "a worn chair" but "a chair nobody has sat in since
  the reshuffle". Detail carries the joke and the sadness at the same time.
- Deadpan. The funny line is delivered flat and never explained. No exclamation
  marks unless a character is genuinely shouting.
- Nobody is a villain. The institution is the antagonist; the people inside it
  are tired, kind, petty and trying. The one unforgivable tone is contempt for
  the people doing the work.
- Short sentences do the heavy lifting. A long one earns its length by being
  the one thing on the page that is allowed to run.
- Write to the reader who has been there. Assume they know what it is like.

### The engine changes you need

A separate section, and a list, ordered by how much of the design dies without
each one. For every item give:

- **What the game needs** in one sentence, as a player experiences it.
- **Why the engine cannot express it today**, naming the file and the system
  (Appendix B is the inventory).
- **The smallest change that would**, described as an interface rather than an
  implementation — "levels need to be able to declare X, and the loader needs to
  read it" beats a patch.
- **What it would break** in what is already there.
- **A fallback** if it is not built: the version of the design that works on
  today's engine.

Do not propose a rewrite. This engine is ~33,000 lines of heavily documented
JavaScript and its constraints are load-bearing. Propose seams.

### Output rules, so this can be applied without rework

- One part per message unless I ask otherwise. Stop at the end of each part.
- Content goes in fenced code blocks, as complete file contents, with the target
  path as the first line comment. Never a diff, never an ellipsis, never
  "...and so on for the other twelve".
- Every id is lowercase, no spaces, and stable: ids are referenced across files
  and a rename in one place is a silent break in another.
- Coordinates are in **tiles**, integers unless the contract says otherwise,
  and inside the level's own declared size.
- Everything you invent must be reachable: a room needs a door, an object needs
  a handler, a job needs a giver, a sheet needs a licence.
- If a contract in the appendices does not let you express something, say so in
  the engine-changes section instead of inventing syntax.

### What I need from you first

Before designing anything, ask me these six, and nothing else:

1. What is the setting, in one sentence?
2. What does the player DO, minute to minute?
3. What is the tone — the same deadpan institutional melancholy, or something
   else, and if something else, what?
4. How big is the world: one building, a village, a city, a coast?
5. Is there a clock, and does it matter?
6. What must survive from the current game, if anything — the cars, the
   weather, the crowd, the minigames, the editor?

=== END PROMPT ===

---

## 2. What to attach to that prompt

Paste Appendices A and B (§5, §6) into the same chat, after the prompt. They are
the difference between output that applies in an afternoon and output that has
to be renegotiated line by line.

If the chat has a file upload, the four files worth attaching whole are
`data/levels.js` (the level catalogue, so it can read a real one),
`data/npcs.js` (one full person, so it can match the shape and the voice),
`data/callers.js` (the encounter model) and `tools/sheets/wood.mjs` (what a
sourced art sheet declaration has to contain). They are large; the appendices
below are the distilled version if you would rather keep the context small.

---

## 3. What comes back, and in what order to apply it

Parts 1 and 8 are prose — read them, argue with them, do not apply them.
Parts 2–7 are files. Apply in this order, because each depends on the one
before:

| Order | Part | Lands in | Gate before moving on |
| --- | --- | --- | --- |
| 1 | World map | `data/world.js`, `data/levels.js` | `node tools/levelcheck.mjs` clean |
| 2 | Art sheets | `tools/sheets/*.mjs`, then `node tools/build-sprites.mjs` | the build re-checks every licence |
| 3 | Things | `data/items.js` | jobs' `track` targets resolve |
| 4 | Cast | `data/npcs.js` | `levelcheck` again — schedules name waypoints |
| 5 | Encounters | `data/callers.js` | a call runs end to end in the browser |
| 6 | Writing + handlers | `data/acts.js`, `data/office.js` | every `use:` has a handler |
| 7 | Engine changes | `engine/*.js` | the full suite, then a release |

---

## 4. Which parts of the engine know it is a call centre

The honest map of coupling, so the design knows what it is buying.

**Free — reusable as-is, knows nothing about the fiction.**
`core`, `controls`, `state`, `sky` (clock, seasons, weather, light), `world`
(map building), `collide`, `levels` (streaming, parts, links), `ui`, `dialogue`,
`npc` (schedules, crowds, pathing, going home), `sprites`, `faces`, `cars`,
`peds`, `signals`, `guns`, `render`, `map`, `panels`, `menus` (save/settings),
`arcade`, `look` (character creator), `title`, `input`, `boot`. Plus every tool
in `tools/` and the whole editor.

**Cheap to re-skin — the fiction is in the data, not the code.**
`progress` (XP, levels, jobs, achievements, relationships) reads `RANKS`,
`QUESTS`, `ACHS`, `SKILLS` from data. `items` is all data. The panel suite
renders whatever it is given. Rename the stats in `P.stats`
(empathy/knowledge/patience/bullshit/chaos) and the HUD follows.

**Genuinely call-centre, and the new game must decide.**

| System | Where | What it assumes |
| --- | --- | --- |
| The queue | `engine/office.js` — `Phones` | Work arrives as ringing objects of `kind: 'phone'` on a hub level, is claimed by pressing E, abandons on a timer, and only counts while you are on the employer's premises during a working window. |
| The encounter | `engine/combat.js` + `data/callers.js` | A two-sided conversation with Patience vs Frustration, a per-turn need/tell, rapport, and a "land it" finisher. |
| The office feed | `engine/office.js` — `Chat`, `Mail`, `EventSys` | Scripted messages on a clock and random workplace incidents. |
| The shift | `core.js` `DAY_START`/`DAY_END`, `Sky.working()`, `Levels.onSite()` | A 09:00–17:00 window and a set of levels that are "work". |
| The report | `engine/menus.js` `Report` + the Shift panel | A day is scored on calls handled and rated by a manager. |
| Premises | `site: true` in `data/levels.js` | Some levels are your employer's and some are not. |

A new game that is also about a job re-skins all six and changes almost no code.
A new game about something else keeps the *shape* — work arrives, you claim it,
you resolve it in a turn-based exchange, the day is scored — and renames it. A
new game with no such loop at all should say so up front, because that is the
one change that is genuinely structural.

---

## 5. Appendix A — the data contracts

Every file below is a plain `<script>`; its top-level `const`s land in the
global lexical scope and the engine reads them by bare name. No modules, no
exports, no `window.X`.

### Load order (fixed, in `index.html`)

```
art/sprites/manifest.js
data/world.js      → ROOM_DEFS, DOOR_DEFS, ZONES, SURFACES, FLOORS, EXITS, WP
data/levels.js     → LEVELS            (MUST come after world.js: it names ROOM_DEFS)
data/<other world files>               (parts: composed levels)
data/npcs.js       → NPCS, CHAT_SCRIPT, MAIL_SCRIPT
data/items.js      → ITEMS, SKILLS, QUESTS, ACHS, RANKS-adjacent tables
data/callers.js    → CALLERS, MOVES, BOSSES
data/office.js     → EVENTS, ENDINGS, and other tables
data/acts.js       → Acts  (one function per `use:` on an object)
engine/*.js        (core first, boot last)
minigames/*.js
```

Data may not name anything from `engine/` at load time — that is why level
entry points are written in **tiles**, not pixels: `TILE` does not exist yet.

### A level

```js
LEVELS.someplace = {
  name: 'The Laundrette',        // shown on the map and the zone banner
  w: 15, h: 11,                  // tiles; the whole map starts solid
  hub: true,                     // optional: the one level the crowd lives on
  arrive: true,                  // optional: where a new game begins
  site: true,                    // optional: "the employer's premises"
  secret: 'a_hatch',             // optional: hidden from the map until this achievement
  indoors: false,                // outdoor levels get sky, weather and a light grade
  part: true,                    // optional: this level is stamped into another
  parts: [{ of: 'town', at: [x, y], hem: 2 }],   // …or is composed of others
  rooms:  [{ z: 'zonekey', r: [x1, y1, x2, y2] }],   // carves walkable floor
  doors:  [{ x, y, z: 'zonekey', name: 'The Back Room' }],
  surfaces: [{ s: 'tarmac', r: [x1, y1, x2, y2] }],
  paint:  [{ p: 'bays', r: [...], open: 's' }],       // road markings
  counters: [], cars: [], peds: [],
  entries: { door: [7.5, 7.5] },                      // TILES, may be fractional
  links:  [{ via: 'laundOut', to: 'outside', entry: 'laund' }],
  furnish() {                                          // `this` is World
    this.add({ x, y, e: '🚪', name: 'The door out', kind: 'exit',
               solid: false, use: 'laundOut',
               furn: { sprite: 'obj.door', size: 26, mount: 'wall' } });
  }
};
```

Rules the validator enforces: the walkable floor must be **one connected
piece**; every arrival point, every waypoint and every object carrying a `use:`
must be reachable from an arrival point; every `link.to` and `link.entry` must
exist; every `use:` must have a handler in `Acts`; every `sprite:` must be in
the manifest; every `z:` must be in `ZONES` and every `s:` in `SURFACES`.

### A zone and a surface

```js
ZONES.lobby = { name: 'Reception', floor: '#333c4a', alt: '#2e3643',
                wall: '#1c2330', tint: '#4da3ff', surf: 'stone',
                tile: 'floor.diamond', wtile: 'wall.drywall' };
SURFACES.tarmac = { /* what the ground is made of, per season where it matters */ };
```

### A person

```js
{
  id: 'dave', name: 'Dave', face: '🧔', role: 'Senior Agent · 17 years served',
  desk: [21, 19], colour: '#4da3ff',
  level: 'office',                       // omit for the hub
  home: { at: [6, 30], where: 'Aldergate Rise, twenty-two minutes on foot' },
  out: [{ from: 495, to: 540, level: 'greggs', tile: [7, 4], face: 0,
          lines: ["Same as yesterday."] }],          // where they are, when
  schedule: [[540,'desk'], [615,'coffee'], [630,'desk']],   // minute, waypoint
  lines: ["Mm.", "That’ll be the printer."],          // said unprompted
  entry() { return G.flags.metDave ? 'again' : 'first'; },  // which node opens
  nodes: { first: { text: [...], choices: [
    { t: 'What is this place?', to: 'explain',
      if: () => !G.flags.told,                        // guard
      do() { Rel.add('dave', 1); } } ] } }
}
```

A choice's `to` resolves as a node id or an object, **never** a function: a
branch that depends on state is two choices with the same `t` and mutually
exclusive `if:` guards.

### An item, a skill, a job, an achievement

All four are object literals in `data/items.js`.

```js
ITEMS.pen  = { n: 'Corporate Pen', e: '🖊️', d: '…', v: 0.4, r: 'common',
               slot: 'trinket', eff: { bullshit: 2 } };      // or use: 'drinkCoffee'
SKILLS.knowledge = { name: '🧠 Knowledge', colour: '#4da3ff',
  list: { product: { n: 'Product Knowledge', d: '…', max: 3 } } };
QUESTS.q_printer = { n: 'Printer of Doom', giver: 'Priya',
  steps: ['Inspect the printer.', 'Ask Steve in IT.'],
  track: [{ obj: 'printer' }, { npc: 'steve' }],   // or { wp: 'breakTable' }
  rw: { xp: 90, money: 5, item: 'tape' } };
ACHS.a_first = { n: 'First Day', e: '🏆', d: 'Survive an entire shift.' };
```

`r:` is one of common/rare/legendary. `eff:` keys are the player's stats.
`use:` names a function in `Uses` (engine/progress.js) — a new consumable needs
one line there.

### An opponent and a move

Both are array literals — entries, not `push` calls.

```js
const CALLERS = [
  { id: 'angry', name: 'Absolutely Livid Caller', face: '😡',
    w: 18,            // weight in the random draw
    frus: 85,         // what you are reducing
    agg: 14,          // how hard they hit your patience
    pat: 70,          // how long they will stay on
    issues: ['THREE DAYS of waiting'],                  // what it is about
    open: [...], mid: [...], hot: [...], win: [...] },  // lines, by temperature
];

const MOVES = [
  { id: 'land', e: '🤝', n: 'Land it.', d: '…',
    show: E => (E.rap || 0) >= 70,     // when the button appears
    cost: { patience: 4 },
    run(E) { return { dmg: 12, win: false, txt: '…' }; } },
];
```

`TURN_LIMIT` is 18 for ordinary opponents; bosses are multi-phase and do not
time out.

### An art sheet

A sheet is declared in `tools/sheets/<name>.mjs` and built by
`node tools/build-sprites.mjs`, which fetches the upstream file, verifies its
sha256, crops the rectangles, packs the sheet, regenerates
`art/sprites/manifest.js`, and rewrites `art/CREDITS.md`. It refuses to mix
incompatible licences into one PNG.

```js
const url = 'https://opengameart.org/sites/default/files/layers.zip';
const sha256 = '4c604c…';                   // pinned; a re-upload stops the build
const page = 'https://opengameart.org/content/lpc-wooden-furniture';
const assetName = 'LPC Wooden Furniture';
const artists = ['bluecarrot16', 'Baŝto', '…'];        // every one the page names
const licences = ['CC-BY-SA 3.0', 'CC-BY-SA 4.0', 'GPL 3.0'];   // as offered
const details = 'One sentence for CREDITS.md saying what was taken and what was not.';

export default {
  id: 'wood',
  cell: 32,
  part: 3,              // which LICENSE part covers it — ShareAlike art is its own part
  title: assetName,
  sprites: [
    { name: 'obj.bench',            // this is what `sprite:` on furniture names
      anchor: 'floor',              // 'floor' | 'wall' | 'surface'
      source: { url, sha256, page, assetName, artists, licences, details,
                entry: 'layers/dark_wood.png',   // path inside a zip, if it is one
                size: [64, 29],
                layers: [ { rect: [99, 803, 32, 29], at: [0, 0] },
                          { rect: [157, 803, 32, 29], at: [32, 0] } ] } },
  ],
};
```

So what a new game's art part must deliver, per sheet: the page URL, the file
URL, its sha256, the licences as offered, every artist named on the page, a
sentence of `details`, and then per sprite a name, an anchor, a final `size` and
the `layers` — one or more source rectangles and where each is stamped. Layers
are how a piece gets spliced from more than one crop or stacked from more than
one upstream layer file. The names are what `sprite:` on furniture refers to.

Two rules that are enforced rather than trusted: a sheet's `part` decides which
`LICENSE` part covers it, and art under ShareAlike terms is packed into a PNG of
its own — the build refuses to mix it with the permissive sheets.

---

## 6. Appendix B — engine inventory

Twenty-nine files in `engine/`, ~33k lines with the data. What each owns:

| File | Owns |
| --- | --- |
| `core` | Constants: `TILE`, `MAPW/H`, `DAY_START/END`, `MS_PER_GAME_MIN`, `TURN_LIMIT`, `SAVE_KEY`, `TOUCH`. |
| `state` | `P` (the player) and `G` (the run). Anything in `G` is saved automatically. |
| `sky` | The clock past five, seasons, sunrise/set, weather, the light grade, `newDay()`. |
| `world` | Turns a level definition into a map: solids, zones, surfaces, furniture, derived tables. |
| `collide` | Capsule collision, reach, what a doorway is. |
| `levels` | The catalogue, the LRU cache, the prefetcher, transitions, `hub()`, `first()`, `onSite()`, composed parts. |
| `npc` | Twenty people: schedules, routes, queueing at doorways, errands, going home, the guide pin. |
| `cars` / `peds` / `signals` | Traffic with lanes and junctions, pedestrians, and the lights both obey. |
| `combat` | The turn-based encounter: needs, tells, rapport, moves, bosses. |
| `dialogue` | Branching conversation, guards, typing, faces. |
| `render` / `sprites` / `faces` / `map` | Drawing: walls and occlusion, roofs, sprite composition, expressions, minimap and map screen. |
| `progress` | XP, levels, ranks, items, skills, jobs, achievements, relationships, the tracker. |
| `office` | **Fiction-bound**: the phone queue, office chat, email, random events. |
| `panels` / `menus` / `ui` | The portal, the save system, settings, HUD, toasts. |
| `arcade` + `minigames/` | Three games behind one interface; costs clock time. |
| `guns` | The away-day box: things you carry, aim and fire. |
| `look` | The character creator, composing a sprite from parts. |
| `input` / `controls` / `title` / `boot` | Keyboard, twin-stick touch, the title wallboard, the loop. |

Known seams worth knowing about when proposing changes:

- `G.flags.*` is the universal state bag and is saved; new content should use it
  rather than new globals.
- `Acts` is one function per `use:` and is where most writing lives.
- Anything drawn asks `Sky` what time it is; nothing that draws knows.
- The editor (`editor/`) reads the same catalogue and can write levels back out.

---

## 7. Appendix C — the gates

Nothing is "done" until these pass. They are cheap and they have all caught real
faults.

```sh
node tools/levelcheck.mjs      # every level built and walked; links, acts, sprites, zones
node tools/mapjam.mjs          # every level's map drawn and measured
node tools/streamjam.mjs       # the cache and prefetcher, no churn
node tools/fidelity.mjs        # composed parts match the parts built alone
node tools/doorjam.mjs         # crowds through one doorway
node tools/carjam.mjs          # traffic through the five things that break it
node tools/lightjam.mjs        # nobody runs a red
node tools/build-sprites.mjs --check    # atlas and CREDITS.md current
bash scripts/release.sh --check         # all of the above plus parse + stamp
node test/run.js                        # 23 browser suites, ~880 checks
```

---

## 8. Appendix D — the house rules that bite

- Plain scripts and plain stylesheets. A module is *fetched* and `file://`
  forbids a fetch, so the game must keep opening off disk. No `type="module"`,
  no `fetch()` of a local file, ever.
- `'use strict'` at the top of every file; it is per-script.
- Nothing is assigned to `window`; the test suite fails if it is.
- Curly apostrophes in everything the player reads.
- Comments in this repo explain **why**, at length, including what was tried and
  what broke. A new content file with no such comments will look wrong beside
  the others.
- Ids never change after anything references them.

---

## 9. Appendix E — the applying prompt

Give this to a Claude Code session on the repo, with one part pasted after it:

> Apply the attached part to this repository. It is content for the engine, not
> a design discussion: write the files as given, keeping the ids exactly as
> written. Do not redesign. Where the part conflicts with a contract in
> `docs/NEW-GAME-BRIEF.md`, stop and tell me rather than inventing syntax.
> When the files are in, run the gates in Appendix C of that document that apply
> to what changed, fix whatever they catch, and report what you ran, what it
> said, and what you changed. Do not commit until the gates pass.
