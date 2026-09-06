# Call of Duty: Customer Service

A call centre RPG. Answer the phones, survive the shift, and find out who writes
the numbers.

You are a new trainee at CALLHALL Services plc. There are thirteen rooms, twenty
colleagues, fourteen mugs, and a fourth floor that is not on the floor plan.
Difficult calls are turn-based: your **Patience** is your health, their
**Frustration** is what you are reducing.

Play it in a browser. A page, its content, and a directory of art — no build
step, no dependencies, no network calls.

## Running it

Open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Controls

|            | Keyboard                        | Touch                          |
| ---------- | ------------------------------- | ------------------------------ |
| Move       | `W A S D` or arrows             | thumb down anywhere bottom-left |
| Interact   | `E`                             | `E` button                     |
| Drive      | `W` go · `S` brake, then reverse · `A D` steer · `H` horn | **two sticks**: left steers, right is the throttle |
| Get out    | `E`                             | `OUT`                          |
| Dialogue   | `Space`, `1`–`9` to choose      | tap the box, tap a reply       |
| Panels     | `J I K C M P L`, `Esc` for menu | `☰`                            |
| Save/load  | `F5` / `F9`                     | `☰` · Menu                     |

On a phone the movement control is a floating analogue stick: it appears
wherever your thumb lands in the bottom-left of the screen, goes in every
direction rather than four, and how far you push it is how fast you walk. A
four-way d-pad is available instead, and the whole layout mirrors for
left-handers — both are in `☰ · Menu`, along with a fullscreen toggle. Starting
a shift asks for fullscreen on its own.

Get in a car and a **second stick** appears in the other corner, in amber: the
left one steers and the right one is the throttle — push it up to go, pull it
down to brake and then reverse. One stick could not do both. Steering meant
pushing sideways, pushing sideways took the forward component out of the same
vector, and less speed means less steering bite — so the harder you asked it to
turn, the less it turned. Two thumbs, two jobs, neither able to undo the other.
The button you have been pressing all along stays exactly where it is and says
`OUT`.

The game saves itself, and detects touch devices to show the right controls and
the right instructions.

## Outside

Press `E` on the way out and you are in the car park, and Bellhaven is a town.

Six streets on a grid: Bellhaven Road along the front of the building, becoming
the High Street once it reaches the shops; Fenn Street through the middle;
Corven Way along the bottom by the railway; and Aldergate Rise, Cargate Lane and
Marlow Street crossing all three. Nine junctions, four blocks of buildings, the
office car park at one end and the retail park at the other — which is the only
piece of tarmac out there wide enough to find out what a car does sideways.

A grid rather than a circuit, deliberately. A loop is a lap: you go round it and
you have seen it. A grid is a choice at every junction and two ways round to
everywhere.

The pool car is in the car park and the key has been in it since 2019. Press `E`
on it and get in. It steers like a car rather than like a person — the front
wheels only turn it while it is moving, the back end goes where it was already
going, and reversing out of a bay is its own small event. Everything else parked
out there is somebody's, and locked, and will say so.

There is traffic. Nine of them, including a learner and the 41A, running four
circuits through the same nine junctions on the correct side of the road. They
brake for corners, queue behind each other, give way to each other where their
circuits cross, stop for anybody on foot, and sound the horn when they have been
waiting a while. They are not scenery: drive into one and both of you will know
about it.

There is a drive-thru on Corven Way. It will not serve you on foot.

Five achievements are out there. One of them is parking straight.

The roads are the kit's — the tarmac, the paving, the drains and the awnings are
all Liberated Pixel Cup art, fetched and licence-checked by the sprite build like
everything else. The cars are not, and could not be: the set this game pins is
mediaeval-through-Victorian and the only wheeled things in the whole repository
are a wheelchair and a shopping trolley. They are drawn by the renderer instead,
which is also what lets one turn through any angle rather than through the eight
a sprite sheet would give it.

## Repository layout

This is the **private** repository: full history and staging. The public repo is
rebuilt from it as a single commit containing only the released files — see
`scripts/release.sh`. Nothing else here is ever published.

The game is `index.html` — the engine — plus the files it loads:

| | |
| --- | --- |
| `data/*.js` | The content: people and dialogue, items, callers, the office, the streets, and what happens when you press E. |
| `art/sprites/*.png` | The character, world and street art. Third-party, separately licensed. |
| `art/sprites/manifest.js` | Generated: the rectangles that describe those PNGs. |
| `tools/build-sprites.mjs` | Builds the sheets and the manifest, and touches nothing else. |
| `editor.html`, `editor/` | A level editor. Not the game, and never published. |

They are plain scripts rather than ES modules on purpose. A module is fetched,
and a `file://` page cannot fetch — this way opening the page straight off disk
still works, which is a thing the test suite checks. Nothing reads pixels back
out of a canvas either, for the same reason.

Keep the folder together when you copy the game somewhere. `data/` is the game;
`art/` is required by the licence, and without it everybody in the office turns
back into an emoji.

```sh
cd tools && npm install                 # once, to fetch pngjs — dev-only, never shipped
cd .. && node tools/build-sprites.mjs         # rebuild every managed sheet and the manifest
node tools/build-sprites.mjs town        # rebuild one sheet
node tools/build-sprites.mjs --check     # fail if the committed output is stale
```

Two kinds of sheet, because there are two kinds of history. **Pinned** sheets —
`sanitary`, `world`, `revised`, the `parts-*` character layers — went through a
compositing and curation pass (layers stacked, recoloured, hand-picked seamless
crops) that predates this tool and was never captured as code. It cannot
rebuild them, so it doesn't try: `tools/lib/pinned.mjs` reads their entry
straight out of the committed manifest and carries it forward untouched, with
a checksum of the PNG as a tripwire — the build refuses outright if one of
those files ever changes on disk without this tool having done it.

**Managed** sheets are the rest — declared in `tools/sheets/*.mjs`, one file
per sheet, each sprite naming an upstream repo, a commit, a file, a crop rect
and the asset's display name in that project's own `Credits.txt`. Every build
fetches that PNG and that `Credits.txt` fresh, re-checks the licence is still
OGA-BY 3.0 or CC0, crops, packs, and refuses the whole sheet if a licence has
changed underneath it. Adding a sprite to the town, or anywhere else, means
adding an entry to one of these files — never hand-editing `manifest.js` or
`CREDITS.md`, both of which this regenerates and would just overwrite.
Picking the crop rect is still a human job: never take one off a contact
sheet without tiling it a few times over to check for a seam.

### What a level may declare

A level in `data/levels.js` is its size, its rooms, its doors, its arrival
points and the links out of it. Three more tables exist for the streets, and
they are all optional — a level that declares none of them is exactly the level
it always was.

| | |
| --- | --- |
| `surfaces:` | Rectangles of `SURFACES` (data/world.js) painted over the rooms. What a tile is MADE of, where that differs from what its room is made of: a street is one zone with one name and a carriageway down the middle. `R.kerbs()` derives the kerb from wherever two of them meet. |
| `paint:` | The markings. `dash`, `line`, `yellow`, `zebra`, `bays`, `text`, all in tiles, all drawn by `R.roadPaint()` rather than cropped — a marking is position-dependent and a tile is not. |
| `cars:` | What is parked, and what is driving. A car is not furniture: it is at a pixel, at an angle, at a speed, so it lives here and in `engine/cars.js` rather than in `furnish()`. `model:` names an entry in `CARS`; `body:`/`roof:` repaint that model for one car; `drive: true` lets you in; `route:` makes it traffic. |

Two flags on a furnishing are read by the engine and are worth knowing about:
`sprite:` names a rect in the atlas to draw instead of the emoji, and `fromCar:`
means the thing is meant to be reached without getting out — which is all a
drive-thru is, and all the next one will have to be.

The editor has no tools for any of the three and carries all three through
untouched, which is the next best thing — see `Doc.surfaces`.

## The level editor

Serve the folder and open `editor.html` — its own page, deliberately, so the game
itself is untouched and loads nothing from it. It draws the level with the game's
own renderer, so what you see is what the player gets.

It is published beside the game, at
<https://ericdarkomen.github.io/CallHall/editor.html>.

Draw rooms, place doors and counters, move the furniture, turn it a quarter at a
time (`T`, or the four buttons in the inspector — art only, nothing about what
is solid or what `E` does), set the arrival points and the links between levels. It checks the level on every edit — the one that
matters counts how many separate pieces the walkable floor is in, which is the
class of fault you cannot see on screen and that has shipped here before. Then it
writes the source back out for you to paste into `data/levels.js` and
`data/world.js`.

What a room is MADE of is the Rooms tab: its colours, and the floor and wall
tiles laid over them. Both are picked as tiles rather than as names — each swatch
is the bitmap the renderer bakes, tinted through that room's own colours, so what
you are choosing between is what the room will be. A room selected on the map
shows its floor and its wall and opens the same page. `▶ Try it in the game`
opens the game in a new tab on a level the room type is painted on.

### Saving, and publishing from a phone

**Publish to GitHub**, on the whole-game sheet, is the one that works anywhere:
the finished files go straight into the repository the page was served from, as
a single commit, and the site rebuilds itself. On a phone there is no folder to
be given and nowhere to put a download, so this is the only way there is — and
it is the reason the editor is published beside the game at all.

It asks once for a repository and a token. On a Pages URL the first three
fields are already filled in — `owner.github.io/repo/editor.html` names both
halves — so the only thing to type is the token. Make a **fine-grained** one at
[github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):
**this repository only**, **Contents: read and write**, and an expiry date. It
is kept in that browser's storage and sent to `api.github.com` and nowhere else;
"Forget the token" is beside the button that uses it.

Each file is read from the branch it is about to land on rather than from the
served copy, so a deploy running a minute behind cannot put yesterday back. It
is one commit — blobs, a tree, a commit, then the ref moves — so there is no
state in which half a save is on the branch. Pages then takes a minute or two,
and the game may hand you a cached copy for a few minutes after that.

**Save to the game files** is the same work with a different destination: a
folder on the machine you are sitting at. Chrome and Edge ask for the game's
folder once and write there; Safari and Firefox have no folder picker, so it
prepares the same files and downloads them for you to drop into `data/` — and
settles nothing off the bench, because a browser cannot tell whether you moved
them.

Both write each table whole, including the fourth floor's own floor plan, which
lives in `data/world.js` as `ROOM_DEFS`, `DOOR_DEFS` and `WP` rather than in its
catalogue entry. What neither can write, they say by name: a procedural
`furnish()` is the file's, and the Export tab's change list is what to edit it
from. Nothing declined is taken off the bench.

```sh
python3 -m http.server 8000    # then http://localhost:8000/editor.html
```

## Licence

Two parts, because there are two kinds of thing here. See [LICENSE](LICENSE).

**The game** — code, writing, characters, design. Copyright © 2026 Grant van Zyl,
licensed [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) —
share and link it freely, but not commercially and not modified.

**The sprites** — the people, the office kit, the road surface, the pavement,
the awnings — are not ours. They are pixel art from the
[Liberated Pixel Cup](https://lpc.opengameart.org/) community, used under
[OGA-BY 3.0](https://static.opengameart.org/OGA-BY-3.0.txt) and **modified**
(composited, recoloured, cropped). Artists and sources are listed in
[art/CREDITS.md](art/CREDITS.md). That art is *not* covered by the game's
NonCommercial or NoDerivatives terms — the PNGs in `art/sprites/` are the clean
copies to take if you want them.

Only assets offered under OGA-BY 3.0 or CC0 were used, deliberately: neither
carries a ShareAlike term, so using them costs attribution and nothing else.
`tools/build-sprites.mjs` re-checks that against upstream's own licence data on
every build and refuses to produce a sheet if it stops being true.

A work of fiction; CALLHALL Services plc and everyone in it are invented.
"Call of Duty" is a trade mark of Activision Publishing, Inc. — this is an
unaffiliated parody about a call centre.
