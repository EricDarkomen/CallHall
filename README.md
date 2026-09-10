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
brake for corners, queue behind each other, stop for anybody on foot, and sound
the horn when they have been waiting a while. They are not scenery: drive into
one and both of you will know about it.

They also know where the road is, which sounds like the least a driver could do
and took a while to arrive. A route is a line somebody drew down a lane, and a
car shoved off that line — by you, mostly — used to go on steering for its
target from wherever it had been left, which was frequently the pavement, and on
the pavement it stayed, because forwards was a shop front and forwards was the
only direction it had. So they read the tarmac now: they steer away from a kerb
rather than up one, they reverse out of the things a route cannot know about,
they work out which leg of their route they are actually nearest before driving
back to it, and where two of them want the same junction the one with the other
on its right gives way. And after a few seconds behind something parked that is
plainly never going to move, one of them will pull out and go round it. Not for
a person: nothing out there ever does anything about a person except stop.

There are people, too. Eight of them, walking circuits of the pavements: up the
parade and over the zebra by the Greggs, along Fenn Street in a hi-vis, a trolley
back to the retail park, a dog on Corven Way, and two outside the office who are
not going back in yet. They cross at the crossings, go round a lamppost rather
than into it, and have no schedule, no memory and no name of their own — they are
somebody with a Greggs bag. Press `E` and you get a stranger's half-sentence.
Sound the horn at one and you get the entire British response to being honked at.

Going round a lamppost is a lean. Going round a skip is most of a right angle,
and that is what the man on the phone outside the unit that is always being
refitted found out: the footway there is two tiles wide, the skip took one row
and a lamppost took the other, and eleven pixels is not a person. He walked into
it on the first lap of the first shift and stood there for the rest of the day.
The skip is at the kerb now, where a skip goes and where the lorry can get a
chain on it, and the lane in front of the windows is clear the length of the
parade. And nobody can be pinned like that again by any arrangement of street
furniture anybody thinks of next: a stranger who finds no way round at any angle,
or who has not got any closer to where they are going for three seconds, turns
round and walks the loop the other way, which is what a person does and which is
one sign flip on a route that was always a ring.

They are also the other half of the traffic rule. Cars have always stopped for
anybody on foot; until there was somebody on foot, that only ever applied to you.

There is a drive-thru on Corven Way. It will not serve you on foot.

Five achievements are out there. One of them is parking straight.

The roads are the kit's — the tarmac, the paving, the drains and the awnings are
all Liberated Pixel Cup art, fetched and licence-checked by the sprite build like
everything else. The cars are not, and could not be: the set this game pins is
mediaeval-through-Victorian and the only wheeled things in the whole repository
are a wheelchair and a shopping trolley. They are drawn by the renderer instead,
which is also what lets one turn through any angle rather than through the eight
a sprite sheet would give it — and what lets the eight models come out of a table
of numbers and colours rather than out of eight drawings.

They are also the size of cars, which they were not. A hatchback used to be a
tile and three quarters long — very slightly longer than a person is tall — so
the street read as a street with toys parked on it, and standing next to the 41
you were about a fifth of its length rather than a tenth. Everything on four
wheels is half as long again and a third wider now, which is roughly a person to
a third of a car, and that is what a person next to a car looks like. The bays
they park in are three tiles deep and a car very nearly fills one, which is also
what a car in a bay looks like; the contractor's van does not fit in one at all
and sticks out into the aisle, which is the most accurate thing on this map.

Two things in the driving had to be told about it, and both were wrong before and
only got away with it because a car was nearly as wide as it was long. Working
out whether there is room to get past something in front measured that something
by its WIDTH, whichever way round it was lying — so a car abandoned broadside
across a lane, which is its own length wide to anybody coming up behind it, was
measured as a car's width and the town queued behind it until five. And the
pull-out itself always went a flat tile and a half sideways, however far out the
check had said there was room: a car would prove it could get round something and
then steer into it. It goes as far over as the check said, now, and the check
measures the obstacle the way the thing that found it always did.

Each of them is built in layers, and that is what stops a car in plan view being
a lozenge with two dark windows in it. Underneath: a cast shadow that goes soft
at the edge instead of being a copy of the car in black, and a tight contact
shadow under the sills that is what actually puts it on the road. Over the paint:
wheel arches, flanks that fall away from the crown, the panel gaps — a bonnet, a
boot and two doors a side, each a dark line with a lit one against it — and one
raking highlight down the length that comes up hard when the paint is wet,
because the polish is the one part of a car that knows what the weather is doing.
Then the glass, which is a gradient with the sky in the top of it rather than a
flat dark shape, and side windows down each flank so there is a cabin between the
screens.

All of it is baked. Twenty paths per vehicle per frame is the arithmetic that
decides whether this runs on a phone, so a model's body is drawn once into a
small canvas and blitted after that, exactly as the floor tiles are. What is
still drawn live is the four things that actually move: the wheels, because the
front pair steer; the lights, because they come on; the indicators, because they
blink; and whoever is in it. The layered car costs less per frame than the flat
one did.

## Fourteen doors, and who is behind them

Fourteen of those frontages open. A Greggs, a pub, a bookmaker's, a launderette,
a post office, a charity shop, a kebab shop, a vape shop, a nail bar, a tyre
place, an empty unit, a working men's club, a tanning salon — and a door between
the launderette and the post office with six bells and no sign, which is the
stairs up to the flats above the parade.

**And you can see them now.** For a long time every frontage out here was a brick
wall with a sign hanging on it: the glass was there, the awnings were there, the
way in worked — press `E` — and there was not a door anywhere on any of the four
parades. Somebody standing on the pavement outside fourteen businesses could not
see one. There is a door in every frontage now, cut into the wall course above
it, with the sign moved up onto the fascia where a sign over a door goes. The
ones with a floor behind them stand open; the empty unit, the cash and carry and
the four sheds on Corven Way are shut, because a door you cannot go through is a
shut door rather than a missing one.

A shut one is set into the wall exactly as far as an open one is. It was not, at
first: only the openings got the jambs carrying the wall in and the frame round
them, so the shut ones were a leaf drawn flat on the brick — a door stuck on
rather than a door shut, and next to the ajar ones the difference was the only
thing you could see. They all get the reveal now. The only part an opening keeps
to itself is the threshold, because a threshold is the floor of it and a shut
door has no floor to show.

And when you look through an open one you see the room. A doorway cut into wall
mass has brick under it, so what showed between the jambs was brick — the front
doors of your own office were two leaves hung on a car park wall with the same
car park wall behind them. The catalogue already knows where every door goes, so
the renderer asks it, and paints that room's own floor in the gap with the head
of the opening in shadow above it: a foot of dark and then a floor, seen from a
street at noon.

Six people work out there and are not your colleagues, which the profile panel is
careful about. Pat has run the launderette for nineteen years and knows more
about this street than the council does. Iris is in the charity shop on Tuesdays
and Fridays and is not paid. Norman has been on the club door since 2006 and
Stan is at the end of its bar. Jules is the hand in the photograph in the nail
bar. Wes has your pool car up on a ramp and eleven unpaid invoices for it on a
spike by the door. They keep their own hours rather than the call centre's: a
launderette opens at eight and a club does not start until noon.

**And your colleagues go out.** A person's day may have windows in it — an hour
somewhere that is not the fourth floor — and there are thirty-seven of them
across twelve of those rooms. Karen, Sarah and Gary are in the nail bar at noon,
each having told the floor something different about where they are. Marjorie is
in front of the shelf of mugs she donated in 2016, losing an argument with
herself. Priya's favourite part of her day is being fourth in a queue in the post
office, because for nine minutes nobody asks her anything. Nigel is in the tyre
place putting it on an account that does not exist. Terry is in the bookmaker's
at lunch and has not put a bet on since 1998 — it is the warmest building on that
street and the only one with chairs you can sit in without buying anything. And
Bev, who has been in since six, takes her break in a Greggs at twenty to eight
with nobody else in it.

They say different things in different rooms, and that is the whole reason the
rooms are worth walking to: six colleagues in a pub still talking about the
printer are six colleagues at their desks.

Three rooms are deliberately empty and stay that way. There is nobody in Unit 6,
and that is the first thing about Unit 6. Sunseekers is a room you cannot see,
because everything that happens in Sunseekers happens behind a door with a light
over it. And Colin does not go anywhere, ever, which is Colin.

## The day, the night, and the weather

The shift runs 09:00 to 17:00. The day does not.

At five o'clock the report goes up, and when you dismiss it you are standing
exactly where you were standing at 16:59. Nothing moves you, nothing is rebuilt,
and nothing is handed back to you: the clock carries on running into the
evening, the phones stop, the light starts going, everybody around you starts
leaving, and the day changes at midnight, like a day. Your patience and your
energy come back across the small hours instead of arriving full at nine, which
means walking round town all night has a price and going home does not.

Time after five is compressed — the hour the floor empties in less so, the small
hours most of all — so the whole of 17:00 to 09:00 is about ninety seconds of
real time. Long enough to walk out to the car park and watch the streetlights
come on; short enough that nobody is sitting through it.

The light is one grade over the finished frame: a multiply colour and a strength,
interpolated along the sun's own arc, and nothing that draws knows what time it
is. Outdoors it goes the whole way; indoors it goes about half, because the
fourth floor has strip lights on a timer nobody has ever found and never goes
fully dark — it just goes gloomy, and at three in the morning it should. The
streetlights come on at dusk and put light back where there is a lamp, one of
them in eight flickers, and anything being driven has headlights.

The weather picks itself each morning out of the season's own bag and drifts
during the day. It dims the light and takes the colour out of it, it falls past
the camera, it wets the road — puddles gather in the same places every time it
rains and dry slowly after it stops — and in winter it lies. Fog is scaled by how
much light there is to catch, because fog at midday is a white sheet and fog at
two in the morning is whatever the lamppost makes of it. Indoors you get none of
it except on the one window on the fourth floor, which is exactly how much of the
weather anybody at that desk sees.

**And the year turns.** A fortnight a season, starting in autumn. The grass
outside is the payoff: the LPC terrain sheets ship the same square of ground in
four seasons at the same pixel, so one crop taken four times gives a verge that
is green in April, gold in October and under snow in January without a line of
the level changing. There is not much of it — both edges of the car park, the
strip under its wall on the road outside the doors, the long verge at the far
side of Corven Way — and that is the correct amount of nature for a business
park.

The season also decides when the sun is up, and that is where it stops being
decoration. In summer it is light until half nine. In winter the sun sets at
16:05 and the shift has fifty-five minutes left to run, so you arrive in the
dark and you leave in the dark, which is the single most accurate thing this
game says about working indoors.

**The floor empties, and the town fills up.** At five they go, and they go at
their own pace and in their own order — the same people first every time, the
same people last. They walk to the lobby, and then out onto the street and off in
their own direction: the bus stop, their own car in the bays, the subway under
the railway, a door above the shops, west past the multi-storey in no hurry
whatsoever. Stand in the car park at five past five and twenty people come out of
that building and go twenty different ways. Six of them wait at the stop, because
the 41 is a bus that stops, and they get on it when it comes and not before.

Not all of them go home. From ten past five there are six in the Bellhaven Arms,
one of them in the only chair; Marjorie is in the launderette with a service wash
on the way to her bus; Steve and Mo are on their own landing above the parade,
one sorting post addressed to people who left years ago and the other stood
outside his own front door for a minute before he goes in. Later there is a man
in the working men's club who was at the meeting where item seven was first
carried forward, and a man in the kebab shop waiting for the last bus, which he
catches every night and has never once caught the first of. When an evening
finishes they go home from where they are — out of that door, onto that pavement
— rather than from a desk they left hours ago.

Between quarter past eight and nine the next morning they come back the same way
and walk to their desks. Two of them never leave: Ron is on the desk, and Bev has
been here since six and will be here at six tomorrow. An empty building is a set;
an empty building with two people still in it is this building.

## Faces

Everybody blinks.

That is the whole of it, most of the time, and it is the thing that stops
twenty-one composited people from reading as furniture with legs. It comes from
the same Liberated Pixel Cup kit as the rest of them: the LPC Revised heads are
drawn with twelve expressions each — eyes closing, closed, looking left, looking
right, rolling, shocked, angry, sad, happy, blushing, ashamed — and the sprite
build brings all eleven of the non-neutral ones in.

An expression is a patch, not a face. Shipping a face per expression would be
two hundred and fifty-two more rows of character sheet, fourteen megapixels of
PNG for a change to somebody's eyebrows; so `tools/build-sprites.mjs` ships the
*difference* between a face and the same face at rest — twenty-two pixels by
ten, per head, per direction — and `engine/faces.js` draws it over the top of a
person who is already on the screen. The whole sheet is 68KB.

Two things had to be measured rather than assumed, and the build measures both
on every run and refuses to produce the sheet if either stops being true. A head
**moves**: it bobs through the walk, drops two pixels when somebody sits down
and rides four high through the run, so the sheet carries a table of where the
head is in every frame of every direction and the patch goes wherever the head
went. And a face belongs to a **person**: the build reads `revised.png` and works
out which of the three heads and which skin each colleague was composited from,
so Bev's mouth is Bev's mouth. The roster in `tools/sheets/faces.mjs` says who
it thinks they are and the build proves it against their own pixels — get one
wrong and nothing is built.

The cast's patches are also **masked against their own hair**, which is baked
into their sheet: nothing is kept that would land on Marjorie's fringe, so what
she can be seen wearing is what she wears. The player's cannot be — the hair is
chosen, not baked — and a heavy fringe takes a pixel or two of an eyebrow with
it, which nobody has ever noticed.

Where it shows:

- **In the dialogue box**, most of all, because that is where you look somebody
  in the eye. The portrait now blinks, and carries how they are with you — the
  same number `Rel.label` puts into words beside it. Only the ends of the scale
  show: the woman who is glad you are back, and the man who has told somebody
  about you. Say something they like and it lands on their face for a couple of
  seconds before handing the conversation back.
- **On the floor**, on anybody standing or walking. Not on a seated colleague:
  a seat faces its desk, and there is no face on the back of a head.
- **On you**, coming off a call. A call won, a call transferred, and a call that
  broke you are three different faces to be wearing on the way back to the desk.

Off with Animation — `Esc · Settings`, or the operating system's reduced-motion
setting — along with the breath and the walk. Nothing is said by a blink.

## The wallboard

Every call centre has one bolted above the desks: how many people are holding,
how long the oldest one has been holding, and how many of you are free to do
anything about it. It is the first thing you see when you walk in. So the title
screen is one.

It is live. Three calls are holding at 08:57 and one colleague is free, and
neither of those numbers is going to improve while you stand there reading them:
the queue grows on its own because nobody is answering it, the oldest call ages
in real time because it is a clock, and the count of people available goes to
nought within about ten seconds and mostly stays there. The service level
underneath degrades to match, and eventually stops being measured. Sitting on
the menu is the joke, and pressing **Start** is the punchline.

Behind it is the switchboard those calls are crossing — a drifting grid of
extensions with pulses routing over it, each one running a few hops and landing
on somebody's phone. The busier the board says it is, the more of them are in
the air, so the backdrop is the queue, drawn. Along the bottom, the noticeboard
by the lift, moving.

It is a menu you can walk now, which it never was: `W`/`S` or the arrows move
between the three buttons, `Enter` takes the one that is marked, and the marker
starts on whatever the buttons themselves say the default is — **Continue** with
a shift in progress, **Start** without one. Before this, the keyboard could do
exactly one thing to this screen, which was start a new shift over the top of
your save and then ask whether you had meant to.

Turn motion off — `Esc · Settings`, or the operating system's own
reduced-motion setting, which the game respects by default — and the drift, the
routing, the ringing handset, the failing strip light and the ticker all stop.
The board stops with them, holding the numbers it opened on. Nothing on this
screen is conveyed by movement alone, which is the test it has to pass. The
setting is read whenever the screen appears, so it is in force from the first
frame rather than switched off after you have already seen it move.

It lives in `css/title.css` and `engine/title.js`, and it animates on the
page's one loop rather than a `requestAnimationFrame` of its own — same `dt`,
same clamp, same stop when the tab goes away — for the same reason the arcade
cabinets do.

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
| `tools/carjam.mjs` | Dev-time only: the traffic put through the four things that used to beach it, headless, so a change to the driving can be measured rather than driven into. |
| `tools/doorjam.mjs` | Dev-time only: two crowds through one doorway, headless, so a change to the walk can be measured rather than watched. |
| `engine/faces.js` | What a person's face is doing: blinking, and the expression they are wearing. |
| `engine/sky.js` | The clock past five, the light, the weather and the season. Everything that draws asks it what time it is; nothing that draws knows. |
| `engine/title.js`, `css/title.css` | The title screen: the wallboard, the switchboard behind it, and the menu. |
| `scripts/release.sh` | Checks the build and moves the version string. Run it before you ship. |
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
per sheet, each sprite naming where its pixels come from and a crop rect.
Adding a sprite to the town, or anywhere else, means adding an entry to one of
these files — never hand-editing `manifest.js` or `CREDITS.md`, both of which
this regenerates and would just overwrite. Picking the crop rect is still a
human job: never take one off a contact sheet without tiling it a few times
over to check for a seam.

A sprite names its source in one of two ways, and a sheet may not mix them,
because a line in `CREDITS.md` names one source per sheet and has to stay true.

| | |
| --- | --- |
| a **repo** source | `repo`, `commit`, `path`, and the asset's display name in that project's own `Credits.txt`. Every build fetches the PNG and that `Credits.txt` fresh and re-checks the licence, so a licence changing upstream stops the build. The town and the faces are these. |
| a **file** source | `url`, `sha256`, `page`, and the credits written out in the sheet — for somewhere with no `Credits.txt` to read and no commit to pin, which is what an OpenGameArt submission is. There is nothing to re-parse there, so what is re-checked every build is the file's bytes: a re-upload under different terms stops the build instead of slipping through it. `CREDITS.md` marks those entries as reported by hand rather than read by the build, the same standing `LICENSE` part 3 already gives the sanitary sheet. |

Either way the licence is checked against what the sheet is allowed to contain,
and that depends on which **part** of `LICENSE` it belongs to. A part-2 sheet
takes OGA-BY 3.0 or CC0 and refuses ShareAlike. A sheet that says `part: 3`
takes CC-BY-SA 3.0 — and must be a sheet of its own, which is the whole point:
one ShareAlike crop packed in among OGA-BY ones would make the entire PNG an
Adaptation of a ShareAlike work and drag every other artist in it into a
licence they never chose. `assertOnePart()` in `tools/build-sprites.mjs` is
what refuses to write such a sheet. GPL 3.0 is not accepted in either: art
offered only under the GPL is refused rather than quietly taken, for the reason
`LICENSE` part 3 gives.

Two kinds of managed sheet, and a sheet says which it is with `kind:`. A sheet
of THINGS is crops — the town — and is what a sheet declares by saying nothing.
The expressions sheet is the other kind: it is measured against the pinned
character sheets rather than cropped, so it says `kind: 'faces'` and is built by
`tools/lib/buildFaces.mjs`. A third kind would be a line in
`tools/build-sprites.mjs` and nothing else; everything downstream of the build
takes the same five things back, whichever built them.

### What a level may declare

A level in `data/levels.js` is its size, its rooms, its doors, its arrival
points and the links out of it. Four more tables exist for the streets, and
they are all optional — a level that declares none of them is exactly the level
it always was.

| | |
| --- | --- |
| `surfaces:` | Rectangles of `SURFACES` (data/world.js) painted over the rooms. What a tile is MADE of, where that differs from what its room is made of: a street is one zone with one name and a carriageway down the middle. `R.kerbs()` derives the kerb from wherever two of them meet. |
| `paint:` | The markings. `dash`, `line`, `yellow`, `zebra`, `bays`, `text`, all in tiles, all drawn by `R.roadPaint()` rather than cropped — a marking is position-dependent and a tile is not. |
| `cars:` | What is parked, and what is driving. A car is not furniture: it is at a pixel, at an angle, at a speed, so it lives here and in `engine/cars.js` rather than in `furnish()`. `model:` names an entry in `CARS`; `body:`/`roof:` repaint that model for one car; `drive: true` lets you in; `route:` makes it traffic. |
| `peds:` | Who is walking about. Same shape as a traffic car and for the same reason — a pixel, a route, a speed — and deliberately not the machinery in `engine/npc.js`, which is twenty colleagues with schedules and a grudge about a doorway. A route is `[x, y]` waypoints in tiles, with an optional third number to stand there for that many seconds. See `engine/peds.js`. |

Two flags on a furnishing are read by the engine and are worth knowing about:
`sprite:` names a rect in the atlas to draw instead of the emoji, and `fromCar:`
means the thing is meant to be reached without getting out — which is all a
drive-thru is, and all the next one will have to be.

The editor has no tools for any of the four and carries all four through
untouched, which is the next best thing — see `Doc.surfaces`.

### What collides with what

`engine/collide.js` is the one place that answers "can this be here", and it
answers it with three shapes rather than with the tile grid.

**Feet** decide where you can stand: a small box on the ground, tested against
walls (which really are tiles) and against other things' *footprints*, which are
the size of the thing that is drawn and not of the square it stands in. A
lamppost is a post you can walk a trolley round; a poster is flat against the
wall and you can walk along in front of it. `ground` in `FURN` is the override,
in fractions of a tile, and the default is still the whole tile — opt-in kind by
kind, so nothing that was walkable stopped being walkable.

**Bodies** decide what you can touch: a capsule, with a radius that also comes
from the drawn size, and the reach for an event is measured surface to surface.
That is why a copier is reachable from a step further back than a mug. Which one
you get is still ranked by distance between tile centres, because a size-aware
ranking hands every tie to the biggest thing in the room.

**Depenetration** is the rule the old system did not have. Anything already
inside anything else is told the shortest way out and shuffles that way. Being
stuck is a state the collision system has to end, not one it is allowed to
enforce — which is what a car wedged against a wall at an angle used to be,
permanently, because every candidate move was refused including the ones going
the right way.

`World.isSolid` is untouched and still thinks in whole tiles. That is on
purpose: it is what colleagues' pathfinding, the waypoint checks and the
editor's flood fill ask, and a route planned on tiles is still a route a walker
can follow, because the fine shape is always inside the coarse one.

### Shipping

```sh
./scripts/release.sh --check     # parse every script, check the atlas, change nothing
./scripts/release.sh --commit    # ...then move the version string and commit it
```

Every script and stylesheet is loaded with a `?v=` on it, and that string is the
only thing between a player and a cached copy of last week's game. Moving it is
the one thing a release has to do that nothing else does — ship without moving
it and a returning browser serves whichever of the old files it still happens to
have, which is not all of them and not none of them: a new engine reading an old
level, for ten minutes, silently. One string for the whole release, deliberately,
because a per-file hash is what would let a browser hold a mixed set in the first
place.

It also parses every shipped script, refuses if the sprite atlas or `CREDITS.md`
is stale, and refuses if a page references a file that is not there. It does not
publish: the public repository is built from this one and its remote is not
recorded here.

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

Three parts, because there are three kinds of thing here. See [LICENSE](LICENSE).

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

Every sheet listed above uses only assets offered under OGA-BY 3.0 or CC0,
deliberately: neither carries a ShareAlike term, so using them costs
attribution and nothing else. `tools/build-sprites.mjs` re-checks that against
upstream's own licence data on every build and refuses to produce a sheet if it
stops being true.

ShareAlike art is not banned outright — it is kept in a file of its own.
`art/sprites/sanitary.png` has always been that: one CC-BY-SA 3.0 tileset, in a
sheet nothing else is packed into, under its own terms in `LICENSE` part 3. A
sheet may declare `part: 3` and take CC-BY-SA art on the same footing, and the
build refuses to mix the two in one PNG — mixing would make the whole sheet an
Adaptation of a ShareAlike work and place a term on other artists' work that is
not ours to place. See `LICENSE`, and the build section above.

A work of fiction; CALLHALL Services plc and everyone in it are invented.
"Call of Duty" is a trade mark of Activision Publishing, Inc. — this is an
unaffiliated parody about a call centre.
