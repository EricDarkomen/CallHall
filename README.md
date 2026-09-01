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
| Dialogue   | `Space`, `1`–`9` to choose      | tap the box, tap a reply       |
| Panels     | `J I K C M P L`, `Esc` for menu | `☰`                            |
| Save/load  | `F5` / `F9`                     | `☰` · Menu                     |

On a phone the movement control is a floating analogue stick: it appears
wherever your thumb lands in the bottom-left of the screen, goes in every
direction rather than four, and how far you push it is how fast you walk. A
four-way d-pad is available instead, and the whole layout mirrors for
left-handers — both are in `☰ · Menu`, along with a fullscreen toggle. Starting
a shift asks for fullscreen on its own.

The game saves itself, and detects touch devices to show the right controls and
the right instructions.

## Repository layout

This is the **private** repository: full history and staging. The public repo is
rebuilt from it as a single commit containing only the released files — see
`scripts/release.sh`. Nothing else here is ever published.

The game is `index.html` — the engine — plus the files it loads:

| | |
| --- | --- |
| `data/*.js` | The content: people and dialogue, items, callers, the office, and what happens when you press E. |
| `art/sprites/*.png` | The character and world art. Third-party, separately licensed. |
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
node tools/build-sprites.mjs            # rebuild every sheet and the manifest
node tools/build-sprites.mjs office     # rebuild one sheet
node tools/build-sprites.mjs --check    # fail if the committed output is stale
```

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

**The character sprites** are not ours. They are pixel art from the
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
